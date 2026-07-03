import SwiftUI

struct ResourcesView: View {
    var body: some View {
        NavigationStack {
            List {
                crisisSection
                readingSection
                organizationsSection
                aboutSection
            }
            .navigationTitle("Resources")
            .navigationDestination(for: Article.self) { article in
                ArticleView(article: article)
            }
        }
    }

    private var crisisSection: some View {
        Section {
            ForEach(SeedData.crisisLines) { line in
                ResourceLinkRow(resource: line)
            }
        } header: {
            Text("If you need support right now")
        } footer: {
            Text("If you or someone else is in immediate danger, call your local emergency number (911 in the US).")
        }
    }

    private var readingSection: some View {
        Section("Gentle reading") {
            ForEach(SeedData.articles) { article in
                NavigationLink(value: article) {
                    HStack(spacing: 12) {
                        Image(systemName: article.symbolName)
                            .foregroundStyle(Theme.cardinal)
                            .frame(width: 28)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(article.title)
                                .font(.subheadline.weight(.semibold))
                            Text(article.subtitle)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                    .padding(.vertical, 2)
                }
            }
        }
    }

    private var organizationsSection: some View {
        Section {
            ForEach(SeedData.organizations) { org in
                ResourceLinkRow(resource: org)
            }
        } header: {
            Text("Organizations that can help")
        } footer: {
            Text("Local hospices also run free bereavement groups open to everyone in the community — not just hospice families.")
        }
    }

    private var aboutSection: some View {
        Section {
            NavigationLink {
                AboutView()
            } label: {
                HStack(spacing: 12) {
                    Image(systemName: "bird.fill")
                        .foregroundStyle(Theme.cardinal)
                        .frame(width: 28)
                    Text("About the Cardinal's Companion")
                        .font(.subheadline)
                }
            }
        }
    }
}

private struct ResourceLinkRow: View {
    let resource: SupportResource

    var body: some View {
        if let url = URL(string: resource.url) {
            Link(destination: url) {
                HStack(spacing: 12) {
                    Image(systemName: resource.symbolName)
                        .foregroundStyle(Theme.cardinal)
                        .frame(width: 28)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(resource.name)
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(.primary)
                        Text(resource.detail)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Text(resource.actionLabel)
                            .font(.caption.weight(.medium))
                            .foregroundStyle(Theme.cardinal)
                    }
                    Spacer()
                    Image(systemName: "arrow.up.right")
                        .font(.caption)
                        .foregroundStyle(.tertiary)
                }
                .padding(.vertical, 2)
            }
        }
    }
}

struct ArticleView: View {
    let article: Article

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Image(systemName: article.symbolName)
                    .font(.title)
                    .foregroundStyle(Theme.cardinal)

                VStack(alignment: .leading, spacing: 6) {
                    Text(article.title)
                        .font(.title2.weight(.bold))
                        .foregroundStyle(Theme.ink)
                    Text(article.subtitle)
                        .font(.subheadline.italic())
                        .foregroundStyle(Theme.ink.opacity(0.6))
                }

                Divider()

                Text(article.body)
                    .font(.system(.body, design: .serif))
                    .lineSpacing(6)
                    .foregroundStyle(Theme.ink)
            }
            .padding(24)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .background(Theme.paper)
        .navigationBarTitleDisplayMode(.inline)
    }
}

#Preview {
    ResourcesView()
        .tint(Theme.cardinal)
}
