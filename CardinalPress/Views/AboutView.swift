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
                        Image("CardinalEmblem")
                            .resizable()
                            .scaledToFit()
                            .frame(width: 68, height: 68)
                            .accessibilityHidden(true)
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

            Section("Mission") {
                Text("To help families avoid unnecessary suffering by understanding the healthcare system before a crisis forces them to. If this toolkit helps one family make one better decision, it has done its job.")
                    .font(.subheadline.italic())
                    .padding(.vertical, 4)
            }

            Section("About") {
                Text("This app accompanies The Caregiver's Cardinal Toolkit by Rob Brizzi, Certified Dementia Practitioner, with Hope Brizzi, PharmD — part of the Cardinal's Promise Series. Its checklists, articles, and phone numbers come from the handbook, organized by the book's color system: red means act today, purple means watch closely, blue means plan ahead.")
                    .font(.subheadline)
                    .padding(.vertical, 4)
                if let url = URL(string: "https://thecardinalspromise.com") {
                    Link(destination: url) {
                        HStack {
                            Image(systemName: "globe")
                                .foregroundStyle(Theme.cardinal)
                            Text("thecardinalspromise.com")
                                .font(.subheadline)
                                .foregroundStyle(.primary)
                            Spacer()
                            Image(systemName: "arrow.up.right")
                                .font(.caption)
                                .foregroundStyle(.tertiary)
                        }
                    }
                }
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
                        Text("\"Take the next right step.\"")
                            .italic()
                        Text("The Cardinal's Toolkit · Version 1.0")
                        Text("Rob Brizzi, CDP · with Hope Brizzi, PharmD")
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
