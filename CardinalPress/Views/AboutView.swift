import SwiftUI

struct AboutView: View {
    var body: some View {
        List {
            Section {
                VStack(spacing: 12) {
                    ZStack {
                        Circle()
                            .fill(Theme.paper)
                            .frame(width: 92, height: 92)
                            .overlay(Circle().strokeBorder(Theme.ink.opacity(0.08)))
                        CardinalMark()
                            .frame(width: 60, height: 60)
                    }

                    Text("The Cardinal's Toolkit")
                        .font(.title2.weight(.bold))
                        .foregroundStyle(Theme.navy)

                    Text("The North Carolina Family Caregiver Handbook — companion app")
                        .font(.subheadline.italic())
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
                .listRowBackground(Color.clear)
            }

            Section("About") {
                Text("This app accompanies The Cardinal's Toolkit workbook by Rob Brizzi — practical tools to help North Carolina families stay organized and prepared while caring for an aging parent. The four pillars of the book live here too: practical tools, planning and checklists, support and resources, and care at home.")
                    .font(.subheadline)
                    .padding(.vertical, 4)
            }

            Section("Why the cardinal?") {
                Text("The northern cardinal is North Carolina's state bird — it stays through every winter, bright against the gray. It's also long been a symbol that a loved one is near. Both meanings belong to caregiving: staying present through a hard season, for someone we love.")
                    .font(.subheadline)
                    .padding(.vertical, 4)
            }

            Section("Your privacy") {
                Text("Everything you enter — journal entries, mood check-ins, checklist progress — stays on this device. There is no account, no analytics, and nothing is sent anywhere.")
                    .font(.subheadline)
                    .padding(.vertical, 4)
            }

            Section("A note of care") {
                Text("The Cardinal's Toolkit offers organization and self-care support. It is not medical, legal, or financial advice — for those decisions, lean on your parent's doctors, an elder law attorney, and the professionals in the Resources tab. And if caregiving is overwhelming you, that page has people to call who understand.")
                    .font(.subheadline)
                    .padding(.vertical, 4)
            }

            Section {
                HStack {
                    Spacer()
                    VStack(spacing: 2) {
                        Text("The Cardinal's Toolkit")
                        Text("Version 1.0 · Rob Brizzi")
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
