import SwiftUI

/// Shared colors and styling for The Cardinal's Toolkit,
/// drawn from the handbook's cover: cardinal red, deep navy,
/// antique gold, and warm cream.
enum Theme {
    /// Cardinal red — the app's signature color.
    static let cardinal = Color(red: 196 / 255, green: 30 / 255, blue: 58 / 255)

    /// Deep navy from the book's title type.
    static let navy = Color(red: 0.13, green: 0.19, blue: 0.31)

    /// Antique gold from the cover accents.
    static let gold = Color(red: 0.69, green: 0.54, blue: 0.24)

    /// A darker shade used in gradients.
    static let cardinalDark = Color(red: 128 / 255, green: 16 / 255, blue: 37 / 255)

    /// Soft dusk plum, used for calm/tool surfaces.
    static let dusk = Color(red: 0.36, green: 0.26, blue: 0.48)

    /// Muted sage green, used for grounding.
    static let sage = Color(red: 0.33, green: 0.49, blue: 0.38)

    /// Soft sky blue, used for breathing.
    static let sky = Color(red: 0.27, green: 0.44, blue: 0.60)

    /// Warm paper tone used behind reading surfaces.
    static let paper = Color(red: 247 / 255, green: 243 / 255, blue: 234 / 255)

    /// Fixed dark ink for text set on `paper`, which stays light in dark mode.
    static let ink = Color(red: 0.16, green: 0.13, blue: 0.11)

    /// The warm gradient behind the daily reflection card.
    static let reflectionGradient = LinearGradient(
        colors: [cardinal, cardinalDark],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    static func toolGradient(_ base: Color) -> LinearGradient {
        LinearGradient(
            colors: [base, base.opacity(0.65)],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }

    /// The handbook's color system: red = act today, purple = watch
    /// closely, blue = plan ahead.
    static func tierColor(_ tier: ChecklistTier) -> Color {
        switch tier {
        case .actToday: return cardinal
        case .watchClosely: return dusk
        case .planAhead: return sky
        }
    }

    /// Color associated with each mood, from heavy to light.
    static func moodColor(_ mood: Mood) -> Color {
        switch mood {
        case .struggling: return Color(red: 0.42, green: 0.36, blue: 0.58)
        case .heavy: return Color(red: 0.45, green: 0.49, blue: 0.60)
        case .okay: return sky
        case .hopeful: return Color(red: 0.79, green: 0.55, blue: 0.23)
        case .peaceful: return sage
        }
    }
}
