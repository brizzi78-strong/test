import SwiftUI

struct ReadingListView: View {
    @EnvironmentObject private var store: BookStore

    var body: some View {
        NavigationStack {
            Group {
                if store.savedBooks.isEmpty {
                    ContentUnavailableView(
                        "Your reading list is empty",
                        systemImage: "bookmark",
                        description: Text("Save books from the catalog and they'll be waiting for you here.")
                    )
                } else {
                    List {
                        ForEach(store.savedBooks) { book in
                            NavigationLink(value: book) {
                                ReadingListRow(book: book)
                            }
                        }
                        .onDelete(perform: remove)
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle("Reading List")
            .navigationDestination(for: Book.self) { book in
                BookDetailView(book: book)
            }
        }
    }

    private func remove(at offsets: IndexSet) {
        let saved = store.savedBooks
        for index in offsets {
            store.toggleSaved(saved[index])
        }
    }
}

private struct ReadingListRow: View {
    let book: Book

    var body: some View {
        HStack(spacing: 12) {
            BookCoverView(book: book)
                .frame(width: 48)

            VStack(alignment: .leading, spacing: 3) {
                Text(book.title)
                    .font(.subheadline.weight(.semibold))
                    .lineLimit(2)
                Text(book.author)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Text(book.formattedPrice)
                    .font(.caption.weight(.medium))
                    .foregroundStyle(Theme.cardinal)
            }
        }
        .padding(.vertical, 4)
    }
}

#Preview {
    ReadingListView()
        .environmentObject(BookStore())
        .tint(Theme.cardinal)
}
