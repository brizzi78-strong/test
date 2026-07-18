import Foundation
import Combine
import SwiftUI  // for Array.remove(atOffsets:) / move(fromOffsets:toOffset:)

/// The app's single source of truth: journal entries and mood check-ins
/// (persisted on-device), plus daily reflection selection. Nothing ever
/// leaves the device — there is no account and no network.
@MainActor
final class CompanionStore: ObservableObject {
    @Published private(set) var journalEntries: [JournalEntry] {
        didSet { persist(journalEntries, key: Self.journalKey) }
    }

    @Published private(set) var checkIns: [MoodCheckIn] {
        didSet { persist(checkIns, key: Self.checkInsKey) }
    }

    @Published private(set) var checkedItemIDs: Set<String> {
        didSet { defaults.set(Array(checkedItemIDs).sorted(), forKey: Self.checklistKey) }
    }

    @Published private(set) var medications: [Medication] {
        didSet { persist(medications, key: Self.medicationsKey) }
    }

    private static let journalKey = "companion.journalEntries"
    private static let checkInsKey = "companion.moodCheckIns"
    private static let checklistKey = "companion.checkedItems"
    private static let medicationsKey = "companion.medications"
    private let defaults: UserDefaults

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
        self.journalEntries = Self.load([JournalEntry].self, key: Self.journalKey, from: defaults) ?? []
        self.checkIns = Self.load([MoodCheckIn].self, key: Self.checkInsKey, from: defaults) ?? []
        self.checkedItemIDs = Set(defaults.stringArray(forKey: Self.checklistKey) ?? [])
        self.medications = Self.load([Medication].self, key: Self.medicationsKey, from: defaults) ?? []
    }

    // MARK: - Checklists

    func isChecked(_ item: ChecklistItem) -> Bool {
        checkedItemIDs.contains(item.id)
    }

    func toggleChecked(_ item: ChecklistItem) {
        if checkedItemIDs.contains(item.id) {
            checkedItemIDs.remove(item.id)
        } else {
            checkedItemIDs.insert(item.id)
        }
    }

    func completedCount(in checklist: Checklist) -> Int {
        checklist.items.filter { checkedItemIDs.contains($0.id) }.count
    }

    func resetChecklist(_ checklist: Checklist) {
        checkedItemIDs.subtract(checklist.items.map(\.id))
    }

    // MARK: - Daily reflection

    /// A reflection chosen deterministically for the given day, so it stays
    /// the same all day and changes overnight.
    func reflection(for date: Date = Date()) -> Reflection {
        let calendar = Calendar.current
        let day = calendar.ordinality(of: .day, in: .era, for: date) ?? 0
        let reflections = SeedData.reflections
        return reflections[day % reflections.count]
    }

    // MARK: - Mood check-ins

    var todaysCheckIn: MoodCheckIn? {
        checkIns.last { Calendar.current.isDateInToday($0.date) }
    }

    /// The most recent check-in for each of the last 7 days, oldest first.
    var recentCheckIns: [MoodCheckIn] {
        let calendar = Calendar.current
        let byDay = Dictionary(grouping: checkIns) { calendar.startOfDay(for: $0.date) }
        let latestPerDay = byDay.values
            .compactMap { $0.max { $0.date < $1.date } }
            .sorted { $0.date < $1.date }
        return Array(latestPerDay.suffix(7))
    }

    func checkIn(_ mood: Mood, on date: Date = Date()) {
        checkIns.append(MoodCheckIn(date: date, mood: mood))
        // Keep the history bounded; a year of daily check-ins is plenty.
        if checkIns.count > 400 {
            checkIns.removeFirst(checkIns.count - 400)
        }
    }

    // MARK: - Journal

    /// Entries sorted newest first.
    var sortedEntries: [JournalEntry] {
        journalEntries.sorted { $0.date > $1.date }
    }

    func addEntry(_ entry: JournalEntry) {
        journalEntries.append(entry)
    }

    func updateEntry(_ entry: JournalEntry) {
        guard let index = journalEntries.firstIndex(where: { $0.id == entry.id }) else { return }
        journalEntries[index] = entry
    }

    func deleteEntry(_ entry: JournalEntry) {
        journalEntries.removeAll { $0.id == entry.id }
    }

    // MARK: - Medications

    func addMedication(_ medication: Medication) {
        medications.append(medication)
    }

    func updateMedication(_ medication: Medication) {
        guard let index = medications.firstIndex(where: { $0.id == medication.id }) else { return }
        medications[index] = medication
    }

    func deleteMedication(_ medication: Medication) {
        medications.removeAll { $0.id == medication.id }
    }

    func deleteMedications(at offsets: IndexSet) {
        medications.remove(atOffsets: offsets)
    }

    func moveMedication(from source: IndexSet, to destination: Int) {
        medications.move(fromOffsets: source, toOffset: destination)
    }

    // MARK: - Sharing & export (all on-device; the user chooses where it goes)

    private static let dateStamp: DateFormatter = {
        let f = DateFormatter()
        f.dateStyle = .medium
        f.timeStyle = .none
        return f
    }()

    /// A plain-text rendering of one checklist and its progress, for the
    /// Share sheet — so a caregiver can send it to a sibling.
    func shareText(for checklist: Checklist) -> String {
        var lines = [checklist.title, checklist.subtitle]
        let done = completedCount(in: checklist)
        lines.append("\(done) of \(checklist.items.count) done")
        lines.append("")
        for item in checklist.items {
            lines.append("\(isChecked(item) ? "[x]" : "[ ]") \(item.text)")
        }
        lines.append("")
        lines.append("— The Cardinal's Toolkit")
        return lines.joined(separator: "\n")
    }

    /// A plain-text rendering of the medication list, for the Share sheet —
    /// the list to hand to an ER or a new doctor.
    func medicationsShareText() -> String {
        var lines = ["Medication List", "Exported \(Self.dateStamp.string(from: Date()))", ""]
        if medications.isEmpty {
            lines.append("(No medications added yet.)")
        } else {
            for med in medications {
                lines.append("• \(med.summaryLine)")
            }
        }
        lines.append("")
        lines.append("Confirm with the pharmacy or doctor before relying on this list.")
        lines.append("— The Cardinal's Toolkit")
        return lines.joined(separator: "\n")
    }

    /// A full plain-text backup of everything stored on this device:
    /// checklist progress, medications, and journal entries. The user can
    /// save, print, or email it — the app never sends anything itself.
    func fullExportText() -> String {
        var out = ["THE CARDINAL'S TOOLKIT — MY BACKUP",
                   "Exported \(Self.dateStamp.string(from: Date()))",
                   "Everything below was stored only on this device.",
                   ""]

        out.append("═══ CHECKLISTS ═══")
        for checklist in SeedData.checklists {
            let done = completedCount(in: checklist)
            out.append("")
            out.append("\(checklist.title) — \(done)/\(checklist.items.count)")
            for item in checklist.items {
                out.append("  \(isChecked(item) ? "[x]" : "[ ]") \(item.text)")
            }
        }

        out.append("")
        out.append("═══ MEDICATIONS ═══")
        if medications.isEmpty {
            out.append("(none)")
        } else {
            for med in medications {
                out.append("• \(med.summaryLine)")
            }
        }

        out.append("")
        out.append("═══ JOURNAL (\(journalEntries.count)) ═══")
        if sortedEntries.isEmpty {
            out.append("(none)")
        } else {
            for entry in sortedEntries {
                out.append("")
                let title = entry.title.isEmpty ? "Untitled" : entry.title
                out.append("\(Self.dateStamp.string(from: entry.date)) · \(entry.mood.rawValue) · \(title)")
                out.append(entry.text)
            }
        }

        out.append("")
        out.append("— Keep this somewhere safe. To restore, re-enter into a fresh install.")
        return out.joined(separator: "\n")
    }

    // MARK: - Persistence

    private func persist<T: Encodable>(_ value: T, key: String) {
        if let data = try? JSONEncoder().encode(value) {
            defaults.set(data, forKey: key)
        }
    }

    private static func load<T: Decodable>(_ type: T.Type, key: String, from defaults: UserDefaults) -> T? {
        guard let data = defaults.data(forKey: key) else { return nil }
        return try? JSONDecoder().decode(type, from: data)
    }
}
