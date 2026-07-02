import Foundation
import Combine

/// The app's single source of truth: the catalog, news feed, and the
/// reader's saved reading list (persisted across launches).
@MainActor
final class BookStore: ObservableObject {
    @Published private(set) var books: [Book]
    @Published private(set) var news: [NewsItem]
    @Published private(set) var readingList: Set<String> {
        didSet { persistReadingList() }
    }

    private static let readingListKey = "cardinalpress.readingList"
    private let defaults: UserDefaults

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
        self.books = SeedData.books
        self.news = SeedData.news.sorted { $0.date > $1.date }
        let saved = defaults.stringArray(forKey: Self.readingListKey) ?? []
        self.readingList = Set(saved)
    }

    // MARK: - Reading list

    func isSaved(_ book: Book) -> Bool {
        readingList.contains(book.id)
    }

    func toggleSaved(_ book: Book) {
        if readingList.contains(book.id) {
            readingList.remove(book.id)
        } else {
            readingList.insert(book.id)
        }
    }

    var savedBooks: [Book] {
        books.filter { readingList.contains($0.id) }
    }

    // MARK: - Catalog queries

    func books(in genre: Genre?, matching query: String) -> [Book] {
        books.filter { book in
            let genreMatches = genre == nil || book.genre == genre
            guard genreMatches else { return false }
            guard !query.isEmpty else { return true }
            return book.title.localizedCaseInsensitiveContains(query)
                || book.author.localizedCaseInsensitiveContains(query)
        }
    }

    var forthcomingBooks: [Book] {
        books.filter(\.isForthcoming)
    }

    private func persistReadingList() {
        defaults.set(Array(readingList).sorted(), forKey: Self.readingListKey)
    }
}
