import SwiftUI

@main
struct CardinalPressApp: App {
    @StateObject private var store = BookStore()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(store)
                .tint(Theme.cardinal)
        }
    }
}
