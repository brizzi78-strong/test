import SwiftUI

struct AboutView: View {
    var body: some View {
        NavigationStack {
            List {
                Section {
                    VStack(spacing: 12) {
                        ZStack {
                            Circle()
                                .fill(Theme.coverGradient(for: .fiction))
                                .frame(width: 84, height: 84)
                            Image(systemName: "bird.fill")
                                .font(.system(size: 38))
                                .foregroundStyle(.white)
                        }

                        Text("Cardinal Press")
                            .font(.title2.weight(.bold))

                        Text("Small books that stay.")
                            .font(.subheadline.italic())
                            .foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .listRowBackground(Color.clear)
                }

                Section("Who we are") {
                    Text("Cardinal Press is an independent literary publisher founded in 2015. We publish a small list each year — fiction, poetry, essays, work in translation, and books for young readers — chosen for the long shelf, not the front table. Our books are printed on recycled paper and distributed through independent bookstores.")
                        .font(.subheadline)
                        .padding(.vertical, 4)
                }

                Section("Submissions") {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("We read unagented submissions during our annual open window each June. Send a query letter, a synopsis, and the first twenty pages as a single PDF. We respond to everything, eventually — we're a small flock.")
                            .font(.subheadline)
                        Text("Translators: we welcome pitches year-round for works not previously published in English.")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                    .padding(.vertical, 4)
                }

                Section("Get in touch") {
                    LinkRow(symbol: "envelope", title: "Email us", detail: "hello@cardinalpress.example", url: "mailto:hello@cardinalpress.example")
                    LinkRow(symbol: "globe", title: "Website", detail: "cardinalpress.example", url: "https://cardinalpress.example")
                    LinkRow(symbol: "storefront", title: "Find a local bookstore", detail: "IndieBound", url: "https://www.indiebound.org")
                }

                Section {
                    HStack {
                        Spacer()
                        VStack(spacing: 2) {
                            Text("Cardinal Press for iPhone")
                            Text("Version 1.0")
                        }
                        .font(.caption)
                        .foregroundStyle(.tertiary)
                        Spacer()
                    }
                    .listRowBackground(Color.clear)
                }
            }
            .navigationTitle("About")
        }
    }
}

private struct LinkRow: View {
    let symbol: String
    let title: String
    let detail: String
    let url: String

    var body: some View {
        if let destination = URL(string: url) {
            Link(destination: destination) {
                HStack {
                    Image(systemName: symbol)
                        .foregroundStyle(Theme.cardinal)
                        .frame(width: 28)
                    VStack(alignment: .leading, spacing: 1) {
                        Text(title)
                            .foregroundStyle(.primary)
                        Text(detail)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    Spacer()
                    Image(systemName: "arrow.up.right")
                        .font(.caption)
                        .foregroundStyle(.tertiary)
                }
            }
        }
    }
}

#Preview {
    AboutView()
        .tint(Theme.cardinal)
}
