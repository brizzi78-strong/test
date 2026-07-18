import SwiftUI

@main
struct CardinalPressApp: App {
    @StateObject private var store = CompanionStore()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(store)
                .tint(Theme.cardinal)
        }
    }
}
