import SwiftUI

/// Guided breathing: inhale 4s, hold 4s, exhale 6s, rest 2s.
/// The long exhale is what signals the nervous system to settle.
struct BreathingView: View {
    private enum Phase: CaseIterable {
        case inhale, hold, exhale, rest

        var label: String {
            switch self {
            case .inhale: return "Breathe in"
            case .hold: return "Hold"
            case .exhale: return "Breathe out"
            case .rest: return "Rest"
            }
        }

        var duration: Double {
            switch self {
            case .inhale: return 4
            case .hold: return 4
            case .exhale: return 6
            case .rest: return 2
            }
        }

        var targetScale: CGFloat {
            switch self {
            case .inhale, .hold: return 1.0
            case .exhale, .rest: return 0.62
            }
        }
    }

    @State private var isBreathing = false
    @State private var phase: Phase = .inhale
    @State private var scale: CGFloat = 0.62
    @State private var completedCycles = 0

    var body: some View {
        VStack(spacing: 36) {
            Spacer()

            ZStack {
                Circle()
                    .stroke(Theme.sky.opacity(0.25), lineWidth: 2)
                    .frame(width: 280, height: 280)

                Circle()
                    .fill(Theme.toolGradient(Theme.sky))
                    .frame(width: 260, height: 260)
                    .scaleEffect(scale)
                    .opacity(0.9)

                Text(isBreathing ? phase.label : "Ready when you are")
                    .font(.title3.weight(.medium))
                    .foregroundStyle(.white)
                    .contentTransition(.opacity)
            }
            .accessibilityElement(children: .ignore)
            .accessibilityLabel(isBreathing ? phase.label : "Breathing exercise, not started")

            VStack(spacing: 6) {
                Text("In for 4 · hold for 4 · out for 6")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                if completedCycles > 0 {
                    Text(completedCycles == 1 ? "1 breath completed" : "\(completedCycles) breaths completed")
                        .font(.caption)
                        .foregroundStyle(.tertiary)
                }
            }

            Button {
                toggle()
            } label: {
                Label(isBreathing ? "Pause" : "Begin", systemImage: isBreathing ? "pause.fill" : "play.fill")
                    .frame(maxWidth: 220)
            }
            .buttonStyle(.borderedProminent)
            .tint(Theme.sky)
            .controlSize(.large)

            Spacer()
        }
        .padding()
        .navigationTitle("Breathe")
        .navigationBarTitleDisplayMode(.inline)
        .task(id: isBreathing) {
            guard isBreathing else { return }
            while !Task.isCancelled {
                for current in Phase.allCases {
                    phase = current
                    withAnimation(.easeInOut(duration: current.duration)) {
                        scale = current.targetScale
                    }
                    do {
                        try await Task.sleep(nanoseconds: UInt64(current.duration * 1_000_000_000))
                    } catch {
                        return
                    }
                }
                completedCycles += 1
            }
        }
        .onDisappear {
            isBreathing = false
        }
    }

    private func toggle() {
        isBreathing.toggle()
        if !isBreathing {
            withAnimation(.easeInOut(duration: 0.6)) {
                scale = Phase.rest.targetScale
                phase = .inhale
            }
        }
    }
}

#Preview {
    NavigationStack {
        BreathingView()
    }
    .tint(Theme.cardinal)
}
