import SwiftUI

/// Shared colors and styling for the Cardinal Press brand.
enum Theme {
    /// Cardinal red, the press's signature color.
    static let cardinal = Color(red: 196 / 255, green: 30 / 255, blue: 58 / 255)

    /// A darker shade used for gradients and pressed states.
    static let cardinalDark = Color(red: 128 / 255, green: 16 / 255, blue: 37 / 255)

    /// Warm paper tone used behind covers and cards.
    static let paper = Color(red: 247 / 255, green: 243 / 255, blue: 234 / 255)

    /// Fixed dark ink for text set on `paper`, which stays light in dark mode.
    static let ink = Color(red: 0.16, green: 0.13, blue: 0.11)

    /// Gradient palette for generated book covers, keyed by genre.
    static func coverGradient(for genre: Genre) -> LinearGradient {
        let colors: [Color]
        switch genre {
        case .fiction:
            colors = [cardinal, cardinalDark]
        case .poetry:
            colors = [Color(red: 0.36, green: 0.22, blue: 0.55), Color(red: 0.18, green: 0.10, blue: 0.32)]
        case .essays:
            colors = [Color(red: 0.13, green: 0.42, blue: 0.45), Color(red: 0.05, green: 0.23, blue: 0.27)]
        case .translation:
            colors = [Color(red: 0.80, green: 0.52, blue: 0.15), Color(red: 0.52, green: 0.30, blue: 0.05)]
        case .youngReaders:
            colors = [Color(red: 0.20, green: 0.55, blue: 0.35), Color(red: 0.08, green: 0.32, blue: 0.20)]
        }
        return LinearGradient(colors: colors, startPoint: .topLeading, endPoint: .bottomTrailing)
    }
}
