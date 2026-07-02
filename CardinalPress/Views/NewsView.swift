import SwiftUI

struct NewsView: View {
    @EnvironmentObject private var store: BookStore

    var body: some View {
        NavigationStack {
            List(store.news) { item in
                VStack(alignment: .leading, spacing: 8) {
                    Text(item.date, format: .dateTime.month(.wide).day().year())
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(Theme.cardinal)
                        .textCase(.uppercase)

                    Text(item.headline)
                        .font(.headline)

                    Text(item.body)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                .padding(.vertical, 6)
            }
            .listStyle(.plain)
            .navigationTitle("News")
        }
    }
}

#Preview {
    NewsView()
        .environmentObject(BookStore())
        .tint(Theme.cardinal)
}
