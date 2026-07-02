import Foundation

enum Genre: String, CaseIterable, Identifiable, Codable {
    case fiction = "Fiction"
    case poetry = "Poetry"
    case essays = "Essays"
    case translation = "In Translation"
    case youngReaders = "Young Readers"

    var id: String { rawValue }

    var symbolName: String {
        switch self {
        case .fiction: return "book"
        case .poetry: return "quote.opening"
        case .essays: return "doc.text"
        case .translation: return "globe"
        case .youngReaders: return "sparkles"
        }
    }
}

struct Book: Identifiable, Hashable {
    let id: String
    let title: String
    let author: String
    let genre: Genre
    let synopsis: String
    let excerpt: String
    let pages: Int
    let isbn: String
    let publicationYear: Int
    let price: Decimal
    let isForthcoming: Bool

    var formattedPrice: String {
        price.formatted(.currency(code: "USD"))
    }
}

struct NewsItem: Identifiable, Hashable {
    let id: String
    let date: Date
    let headline: String
    let body: String
}
