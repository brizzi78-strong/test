import SwiftUI

struct ToolsView: View {
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 12) {
                    NavigationLink {
                        BreathingView()
                    } label: {
                        ToolCard(
                            title: "Breathe",
                            description: "Slow, guided breathing to settle a racing heart. Follow the circle: in, hold, and a long breath out.",
                            symbolName: "wind",
                            color: Theme.sky
                        )
                    }

                    NavigationLink {
                        GroundingView()
                    } label: {
                        ToolCard(
                            title: "Come Back to Now",
                            description: "The 5-4-3-2-1 exercise walks you through your five senses to gently anchor you in the present.",
                            symbolName: "leaf",
                            color: Theme.sage
                        )
                    }

                    NavigationLink {
                        AffirmationsView()
                    } label: {
                        ToolCard(
                            title: "Gentle Words",
                            description: "A deck of affirmations written for caregiving's hardest days. Swipe through until one lands.",
                            symbolName: "heart.text.square",
                            color: Theme.dusk
                        )
                    }

                    footerNote
                }
                .padding()
                .buttonStyle(PressableStyle())
            }
            .navigationTitle("Tools")
        }
    }

    private var footerNote: some View {
        Text("These tools are for comfort and self-care. They aren't a substitute for professional support — see the Resources tab if you need more.")
            .font(.caption)
            .foregroundStyle(.secondary)
            .multilineTextAlignment(.center)
            .padding(.top, 12)
            .padding(.horizontal)
    }
}

private struct ToolCard: View {
    let title: String
    let description: String
    let symbolName: String
    let color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: symbolName)
                    .font(.title2)
                    .foregroundStyle(.white)
                    .frame(width: 48, height: 48)
                    .background(Theme.toolGradient(color), in: RoundedRectangle(cornerRadius: 14))
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.tertiary)
            }

            Text(title)
                .font(.headline)
                .foregroundStyle(.primary)

            Text(description)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.leading)
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 18))
        .cardShadow()
    }
}

#Preview {
    ToolsView()
        .environmentObject(CompanionStore())
        .tint(Theme.cardinal)
}
