import SwiftUI

struct ContentView: View {
    var body: some View {
        TabView {
            CatalogView()
                .tabItem {
                    Label("Catalog", systemImage: "books.vertical")
                }

            NewsView()
                .tabItem {
                    Label("News", systemImage: "newspaper")
                }

            ReadingListView()
                .tabItem {
                    Label("Reading List", systemImage: "bookmark")
                }

            AboutView()
                .tabItem {
                    Label("About", systemImage: "bird")
                }
        }
    }
}

#Preview {
    ContentView()
        .environmentObject(BookStore())
        .tint(Theme.cardinal)
}
