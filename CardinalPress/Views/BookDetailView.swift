import SwiftUI

struct BookDetailView: View {
    @EnvironmentObject private var store: BookStore
    let book: Book
    @State private var showingExcerpt = false

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                BookCoverView(book: book)
                    .frame(maxWidth: 220)
                    .shadow(color: .black.opacity(0.25), radius: 12, y: 8)
                    .padding(.top)

                VStack(spacing: 6) {
                    Text(book.title)
                        .font(.title2.weight(.bold))
                        .multilineTextAlignment(.center)
                    Text(book.author)
                        .font(.headline)
                        .foregroundStyle(.secondary)
                    HStack(spacing: 6) {
                        Image(systemName: book.genre.symbolName)
                        Text(book.genre.rawValue)
                        if book.isForthcoming {
                            Text("· Forthcoming \(String(book.publicationYear))")
                        }
                    }
                    .font(.subheadline)
                    .foregroundStyle(Theme.cardinal)
                }
                .padding(.horizontal)

                actionButtons

                VStack(alignment: .leading, spacing: 12) {
                    Text("About this book")
                        .font(.headline)
                    Text(book.synopsis)
                        .font(.body)
                        .foregroundStyle(.primary.opacity(0.85))
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal)

                detailGrid
                    .padding(.horizontal)
            }
            .padding(.bottom, 32)
        }
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $showingExcerpt) {
            ExcerptView(book: book)
        }
    }

    private var actionButtons: some View {
        HStack(spacing: 12) {
            Button {
                showingExcerpt = true
            } label: {
                Label("Read an Excerpt", systemImage: "text.book.closed")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)

            Button {
                withAnimation(.snappy) { store.toggleSaved(book) }
            } label: {
                Label(
                    store.isSaved(book) ? "Saved" : "Save",
                    systemImage: store.isSaved(book) ? "bookmark.fill" : "bookmark"
                )
                .frame(maxWidth: .infinity)
            }
            .buttonStyle(.bordered)
        }
        .padding(.horizontal)
    }

    private var detailGrid: some View {
        VStack(spacing: 0) {
            detailRow("Price", book.formattedPrice)
            Divider()
            detailRow("Pages", "\(book.pages)")
            Divider()
            detailRow("ISBN", book.isbn)
            Divider()
            detailRow(book.isForthcoming ? "Expected" : "Published", String(book.publicationYear))
        }
        .padding(.vertical, 4)
        .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 12))
    }

    private func detailRow(_ label: String, _ value: String) -> some View {
        HStack {
            Text(label)
                .foregroundStyle(.secondary)
            Spacer()
            Text(value)
                .fontWeight(.medium)
        }
        .font(.subheadline)
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
    }
}

private struct ExcerptView: View {
    @Environment(\.dismiss) private var dismiss
    let book: Book

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    Text("from \(book.title)")
                        .font(.subheadline.italic())
                        .foregroundStyle(Theme.ink.opacity(0.6))

                    Text(book.excerpt)
                        .font(.system(.title3, design: .serif))
                        .lineSpacing(6)
                        .foregroundStyle(Theme.ink)

                    Text("© \(String(book.publicationYear)) \(book.author). All rights reserved.")
                        .font(.caption)
                        .foregroundStyle(Theme.ink.opacity(0.45))
                        .padding(.top, 8)
                }
                .padding(24)
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .background(Theme.paper)
            .navigationTitle("Excerpt")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}

#Preview {
    NavigationStack {
        BookDetailView(book: SeedData.books[0])
    }
    .environmentObject(BookStore())
    .tint(Theme.cardinal)
}
