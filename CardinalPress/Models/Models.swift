import Foundation

/// How the reader's heart feels right now. Ordered from heaviest to lightest.
enum Mood: String, CaseIterable, Identifiable, Codable {
    case struggling = "Struggling"
    case heavy = "Heavy"
    case okay = "Okay"
    case hopeful = "Hopeful"
    case peaceful = "Peaceful"

    var id: String { rawValue }

    var symbolName: String {
        switch self {
        case .struggling: return "cloud.heavyrain.fill"
        case .heavy: return "cloud.fill"
        case .okay: return "cloud.sun.fill"
        case .hopeful: return "sun.min.fill"
        case .peaceful: return "sun.max.fill"
        }
    }
}

/// A private journal entry. Stored only on this device.
struct JournalEntry: Identifiable, Codable, Hashable {
    var id: UUID = UUID()
    var date: Date
    var mood: Mood
    var title: String
    var text: String
}

/// A lightweight "how is your heart today?" check-in.
struct MoodCheckIn: Identifiable, Codable, Hashable {
    var id: UUID = UUID()
    var date: Date
    var mood: Mood
}

/// One medication on the person's list. The handbook's rule is "bring the
/// list, not just the bottles" — this is that list, kept on-device.
struct Medication: Identifiable, Codable, Hashable {
    var id: UUID = UUID()
    var name: String
    var dose: String        // e.g. "10 mg"
    var schedule: String    // when — e.g. "Morning, with food"
    var purpose: String     // why — e.g. "Blood pressure"
    var prescriber: String  // who prescribed it

    /// One-line summary for sharing/export, skipping empty fields.
    var summaryLine: String {
        var parts = [name]
        if !dose.isEmpty { parts.append(dose) }
        if !schedule.isEmpty { parts.append(schedule) }
        var line = parts.joined(separator: " · ")
        if !purpose.isEmpty { line += " — for \(purpose)" }
        if !prescriber.isEmpty { line += " (\(prescriber))" }
        return line
    }
}

/// A short daily reflection shown on the Today screen.
struct Reflection: Identifiable, Hashable {
    let id: String
    let text: String
    let attribution: String?
}

/// An in-app article: short, gentle reading about grief and healing.
struct Article: Identifiable, Hashable {
    let id: String
    let title: String
    let subtitle: String
    let symbolName: String
    /// Paragraphs separated by blank lines.
    let body: String
}

/// A phone/text support line or an external organization.
struct SupportResource: Identifiable, Hashable {
    let id: String
    let name: String
    let detail: String
    let actionLabel: String
    let symbolName: String
    let url: String
}

/// The handbook's color system: how urgent is this page?
enum ChecklistTier: String, Hashable {
    case actToday = "Act Today"         // red — crisis, urgent safety
    case watchClosely = "Watch Closely" // purple — something has changed
    case planAhead = "Plan Ahead"       // blue — documents, money, conversations
}

/// A planning checklist from the handbook. Item completion is stored
/// on-device (see CompanionStore.checkedItemIDs).
struct Checklist: Identifiable, Hashable {
    let id: String
    let title: String
    let subtitle: String
    let symbolName: String
    let tier: ChecklistTier
    let items: [ChecklistItem]
}

struct ChecklistItem: Identifiable, Hashable {
    let id: String
    let text: String
    let detail: String?

    init(_ id: String, _ text: String, detail: String? = nil) {
        self.id = id
        self.text = text
        self.detail = detail
    }
}
