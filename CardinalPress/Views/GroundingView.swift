import SwiftUI

/// The 5-4-3-2-1 grounding exercise: name things you can see, touch,
/// hear, smell, and taste to return attention to the present moment.
struct GroundingView: View {
    private struct Step {
        let count: Int
        let sense: String
        let symbolName: String
        let prompt: String
    }

    private static let steps: [Step] = [
        Step(count: 5, sense: "things you can see", symbolName: "eye",
             prompt: "Look around slowly. Name five things you can see — the smaller and more ordinary, the better. The grain of a table. A shadow on the wall."),
        Step(count: 4, sense: "things you can touch", symbolName: "hand.raised",
             prompt: "Notice four things you can feel: your feet on the floor, the fabric of your sleeve, the temperature of the air, the weight of this phone in your hand."),
        Step(count: 3, sense: "things you can hear", symbolName: "ear",
             prompt: "Close your eyes if it helps. Find three sounds — near ones and far ones. Traffic. A hum. Your own breath."),
        Step(count: 2, sense: "things you can smell", symbolName: "nose",
             prompt: "Find two scents, or simply take two slow breaths through your nose and notice whatever is there."),
        Step(count: 1, sense: "thing you can taste", symbolName: "mouth",
             prompt: "Notice one taste — a sip of water counts. Let it be the only thing you're doing for a moment."),
    ]

    @State private var stepIndex = 0
    @State private var isFinished = false

    var body: some View {
        VStack(spacing: 28) {
            if isFinished {
                finishedView
            } else {
                stepView
            }
        }
        .padding(24)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .navigationTitle("Come Back to Now")
        .navigationBarTitleDisplayMode(.inline)
    }

    private var stepView: some View {
        let step = Self.steps[stepIndex]
        return VStack(spacing: 28) {
            ProgressView(value: Double(stepIndex), total: Double(Self.steps.count))
                .tint(Theme.sage)

            Spacer()

            Image(systemName: step.symbolName)
                .font(.system(size: 44))
                .foregroundStyle(.white)
                .frame(width: 96, height: 96)
                .background(Theme.toolGradient(Theme.sage), in: Circle())

            VStack(spacing: 8) {
                Text("\(step.count)")
                    .font(.system(size: 56, weight: .bold, design: .rounded))
                    .foregroundStyle(Theme.sage)
                Text(step.sense)
                    .font(.title3.weight(.medium))
            }

            Text(step.prompt)
                .font(.body)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .lineSpacing(3)

            Spacer()

            Button {
                advance()
            } label: {
                Text(stepIndex == Self.steps.count - 1 ? "Finish" : "Next")
                    .frame(maxWidth: 220)
            }
            .buttonStyle(.borderedProminent)
            .tint(Theme.sage)
            .controlSize(.large)
        }
    }

    private var finishedView: some View {
        VStack(spacing: 20) {
            Spacer()
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 60))
                .foregroundStyle(Theme.sage)
            Text("You're here.")
                .font(.title2.weight(.semibold))
            Text("Well done. Whenever the world feels far away or too loud, this exercise will be right here.")
                .font(.body)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
            Spacer()
            Button {
                withAnimation(.snappy) {
                    stepIndex = 0
                    isFinished = false
                }
            } label: {
                Text("Start Again")
                    .frame(maxWidth: 220)
            }
            .buttonStyle(.bordered)
            .controlSize(.large)
        }
    }

    private func advance() {
        withAnimation(.snappy) {
            if stepIndex == Self.steps.count - 1 {
                isFinished = true
            } else {
                stepIndex += 1
            }
        }
    }
}

#Preview {
    NavigationStack {
        GroundingView()
    }
    .tint(Theme.cardinal)
}
