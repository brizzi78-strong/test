import SwiftUI

/// A generated cover: genre-colored gradient, framed title and author.
/// Stands in for cover artwork until a catalog service provides images.
struct BookCoverView: View {
    let book: Book

    var body: some View {
        GeometryReader { proxy in
            let base = proxy.size.width
            ZStack {
                RoundedRectangle(cornerRadius: base * 0.05)
                    .fill(Theme.coverGradient(for: book.genre))

                RoundedRectangle(cornerRadius: base * 0.03)
                    .strokeBorder(.white.opacity(0.55), lineWidth: max(1, base * 0.008))
                    .padding(base * 0.07)

                VStack(spacing: base * 0.06) {
                    Text(book.title)
                        .font(.system(size: base * 0.09, weight: .semibold, design: .serif))
                        .multilineTextAlignment(.center)
                        .minimumScaleFactor(0.6)

                    Rectangle()
                        .fill(.white.opacity(0.55))
                        .frame(width: base * 0.18, height: 1)

                    Text(book.author)
                        .font(.system(size: base * 0.06, design: .serif))
                        .multilineTextAlignment(.center)
                        .minimumScaleFactor(0.6)
                }
                .foregroundStyle(.white)
                .padding(base * 0.14)
            }
        }
        .aspectRatio(2 / 3, contentMode: .fit)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(book.title) by \(book.author)")
    }
}

#Preview {
    BookCoverView(book: SeedData.books[0])
        .frame(width: 200)
        .padding()
}
