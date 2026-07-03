import SwiftUI

struct AboutView: View {
    var body: some View {
        List {
            Section {
                VStack(spacing: 12) {
                    ZStack {
                        Circle()
                            .fill(Theme.reflectionGradient)
                            .frame(width: 84, height: 84)
                        Image(systemName: "bird.fill")
                            .font(.system(size: 38))
                            .foregroundStyle(.white)
                    }

                    Text("The Cardinal's Companion")
                        .font(.title2.weight(.bold))

                    Text("Resources and tools for healing")
                        .font(.subheadline.italic())
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
                .listRowBackground(Color.clear)
            }

            Section("Why the cardinal?") {
                Text("In many families it's said that when a cardinal appears, a loved one is near. This app borrows that red bird as its emblem: a reminder to pause, remember, and keep a gentle connection with the people we miss — while taking real, practical care of ourselves.")
                    .font(.subheadline)
                    .padding(.vertical, 4)
            }

            Section("Your privacy") {
                Text("Everything you write — journal entries, mood check-ins — stays on this device. There is no account, no analytics, and nothing is sent anywhere.")
                    .font(.subheadline)
                    .padding(.vertical, 4)
            }

            Section("A note of care") {
                Text("The Cardinal's Companion offers comfort and self-care tools. It is not therapy, medical advice, or a substitute for professional mental-health care. If grief feels unmanageable, or you're having thoughts of harming yourself, please reach out — the support lines in the Resources tab are staffed around the clock, and you deserve that help.")
                    .font(.subheadline)
                    .padding(.vertical, 4)
            }

            Section {
                HStack {
                    Spacer()
                    VStack(spacing: 2) {
                        Text("The Cardinal's Companion")
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
        .navigationBarTitleDisplayMode(.inline)
    }
}

#Preview {
    NavigationStack {
        AboutView()
    }
    .tint(Theme.cardinal)
}
