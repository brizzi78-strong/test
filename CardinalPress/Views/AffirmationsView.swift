import SwiftUI

/// A swipeable deck of affirmations written for grief's hardest days.
struct AffirmationsView: View {
    @State private var index = 0

    private let affirmations = SeedData.affirmations

    var body: some View {
        VStack(spacing: 24) {
            TabView(selection: $index) {
                ForEach(Array(affirmations.enumerated()), id: \.offset) { offset, text in
                    AffirmationCard(text: text)
                        .tag(offset)
                        .padding(.horizontal, 24)
                }
            }
            .tabViewStyle(.page(indexDisplayMode: .never))

            Text("\(index + 1) of \(affirmations.count)")
                .font(.caption)
                .foregroundStyle(.tertiary)

            HStack(spacing: 12) {
                Button {
                    withAnimation(.snappy) {
                        index = (index - 1 + affirmations.count) % affirmations.count
                    }
                } label: {
                    Image(systemName: "chevron.left")
                        .frame(width: 44)
                }
                .buttonStyle(.bordered)

                Button {
                    withAnimation(.snappy) {
                        index = (index + 1) % affirmations.count
                    }
                } label: {
                    Text("Another")
                        .frame(maxWidth: 160)
                }
                .buttonStyle(.borderedProminent)
                .tint(Theme.dusk)

                Button {
                    withAnimation(.snappy) {
                        index = (index + 1) % affirmations.count
                    }
                } label: {
                    Image(systemName: "chevron.right")
                        .frame(width: 44)
                }
                .buttonStyle(.bordered)
            }
            .controlSize(.large)
            .padding(.bottom, 24)
        }
        .navigationTitle("Gentle Words")
        .navigationBarTitleDisplayMode(.inline)
    }
}

private struct AffirmationCard: View {
    let text: String

    var body: some View {
        VStack(spacing: 24) {
            Image(systemName: "heart.fill")
                .font(.title3)
                .foregroundStyle(.white.opacity(0.8))

            Text(text)
                .font(.system(.title2, design: .serif))
                .multilineTextAlignment(.center)
                .lineSpacing(5)
                .foregroundStyle(.white)
                .minimumScaleFactor(0.7)
        }
        .padding(32)
        .frame(maxWidth: .infinity, minHeight: 280)
        .background(Theme.toolGradient(Theme.dusk), in: RoundedRectangle(cornerRadius: 24))
    }
}

#Preview {
    NavigationStack {
        AffirmationsView()
    }
    .tint(Theme.cardinal)
}
