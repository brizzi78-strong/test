import Foundation
import Combine

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

    private static let journalKey = "companion.journalEntries"
    private static let checkInsKey = "companion.moodCheckIns"
    private let defaults: UserDefaults

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
        self.journalEntries = Self.load([JournalEntry].self, key: Self.journalKey, from: defaults) ?? []
        self.checkIns = Self.load([MoodCheckIn].self, key: Self.checkInsKey, from: defaults) ?? []
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
