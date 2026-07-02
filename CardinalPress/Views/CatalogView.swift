import SwiftUI

struct CatalogView: View {
    @EnvironmentObject private var store: BookStore
    @State private var searchText = ""
    @State private var selectedGenre: Genre?

    private var results: [Book] {
        store.books(in: selectedGenre, matching: searchText)
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    genreFilter

                    if results.isEmpty {
                        ContentUnavailableView.search(text: searchText)
                            .padding(.top, 40)
                    } else {
                        bookGrid
                    }
                }
                .padding(.horizontal)
            }
            .navigationTitle("Cardinal Press")
            .searchable(text: $searchText, prompt: "Title or author")
            .navigationDestination(for: Book.self) { book in
                BookDetailView(book: book)
            }
        }
    }

    private var genreFilter: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                genreChip(nil, label: "All")
                ForEach(Genre.allCases) { genre in
                    genreChip(genre, label: genre.rawValue)
                }
            }
            .padding(.vertical, 4)
        }
    }

    private func genreChip(_ genre: Genre?, label: String) -> some View {
        let isSelected = selectedGenre == genre
        return Button {
            withAnimation(.snappy) { selectedGenre = genre }
        } label: {
            Text(label)
                .font(.subheadline.weight(isSelected ? .semibold : .regular))
                .padding(.horizontal, 14)
                .padding(.vertical, 7)
                .background(isSelected ? Theme.cardinal : Color(.secondarySystemBackground), in: Capsule())
                .foregroundStyle(isSelected ? .white : .primary)
        }
        .buttonStyle(.plain)
    }

    private var bookGrid: some View {
        LazyVGrid(columns: [GridItem(.adaptive(minimum: 150), spacing: 16)], spacing: 24) {
            ForEach(results) { book in
                NavigationLink(value: book) {
                    BookGridCell(book: book)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.bottom, 24)
    }
}

private struct BookGridCell: View {
    @EnvironmentObject private var store: BookStore
    let book: Book

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            BookCoverView(book: book)
                .overlay(alignment: .topTrailing) {
                    if book.isForthcoming {
                        Text("Coming Soon")
                            .font(.caption2.weight(.bold))
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(.ultraThinMaterial, in: Capsule())
                            .padding(8)
                    }
                }

            VStack(alignment: .leading, spacing: 2) {
                Text(book.title)
                    .font(.subheadline.weight(.semibold))
                    .lineLimit(2)
                Text(book.author)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                HStack {
                    Text(book.formattedPrice)
                        .font(.caption.weight(.medium))
                    Spacer()
                    if store.isSaved(book) {
                        Image(systemName: "bookmark.fill")
                            .font(.caption)
                            .foregroundStyle(Theme.cardinal)
                    }
                }
            }
        }
    }
}

#Preview {
    CatalogView()
        .environmentObject(BookStore())
        .tint(Theme.cardinal)
}
