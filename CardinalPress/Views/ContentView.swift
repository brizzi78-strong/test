import SwiftUI

struct ContentView: View {
    var body: some View {
        TabView {
            TodayView()
                .tabItem {
                    Label("Today", systemImage: "sunrise.fill")
                }

            ToolsView()
                .tabItem {
                    Label("Tools", systemImage: "leaf.fill")
                }

            JournalView()
                .tabItem {
                    Label("Journal", systemImage: "book.closed.fill")
                }

            ResourcesView()
                .tabItem {
                    Label("Resources", systemImage: "lifepreserver")
                }
        }
    }
}

#Preview {
    ContentView()
        .environmentObject(CompanionStore())
        .tint(Theme.cardinal)
}
