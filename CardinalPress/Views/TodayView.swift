import SwiftUI

struct TodayView: View {
    @EnvironmentObject private var store: CompanionStore

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    header
                    reflectionCard
                    moodSection
                    if !store.recentCheckIns.isEmpty {
                        weekStrip
                    }
                    quickTools
                }
                .padding(.horizontal)
                .padding(.bottom, 32)
            }
            .navigationTitle("Today")
        }
    }

    // MARK: - Header

    private var greeting: String {
        let hour = Calendar.current.component(.hour, from: Date())
        switch hour {
        case 0..<5: return "You're up late. Be gentle with yourself."
        case 5..<12: return "Good morning."
        case 12..<17: return "Good afternoon."
        default: return "Good evening."
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(Date(), format: .dateTime.weekday(.wide).month(.wide).day())
                .font(.caption.weight(.semibold))
                .foregroundStyle(Theme.cardinal)
                .textCase(.uppercase)
            Text(greeting)
                .font(.title3.weight(.medium))
        }
    }

    // MARK: - Reflection

    private var reflectionCard: some View {
        let reflection = store.reflection()
        return VStack(alignment: .leading, spacing: 14) {
            HStack {
                Image(systemName: "bird.fill")
                Text("Today's Reflection")
                    .font(.caption.weight(.bold))
                    .textCase(.uppercase)
                Spacer()
            }
            .foregroundStyle(.white.opacity(0.85))

            Text(reflection.text)
                .font(.system(.body, design: .serif))
                .lineSpacing(4)
                .foregroundStyle(.white)

            if let attribution = reflection.attribution {
                Text("— \(attribution)")
                    .font(.footnote.italic())
                    .foregroundStyle(.white.opacity(0.85))
            }
        }
        .padding(20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Theme.reflectionGradient, in: RoundedRectangle(cornerRadius: 20))
    }

    // MARK: - Mood check-in

    private var moodSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(store.todaysCheckIn == nil
                 ? "How is your heart today?"
                 : "Checked in. You can update it any time.")
                .font(.headline)

            HStack(spacing: 8) {
                ForEach(Mood.allCases) { mood in
                    moodButton(mood)
                }
            }
        }
    }

    private func moodButton(_ mood: Mood) -> some View {
        let isSelected = store.todaysCheckIn?.mood == mood
        return Button {
            withAnimation(.snappy) { store.checkIn(mood) }
        } label: {
            VStack(spacing: 6) {
                Image(systemName: mood.symbolName)
                    .font(.title3)
                    .foregroundStyle(isSelected ? .white : Theme.moodColor(mood))
                Text(mood.rawValue)
                    .font(.system(size: 10, weight: .medium))
                    .foregroundStyle(isSelected ? .white : .secondary)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 10)
            .background(
                isSelected ? Theme.moodColor(mood) : Color(.secondarySystemBackground),
                in: RoundedRectangle(cornerRadius: 12)
            )
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Check in as \(mood.rawValue)")
    }

    // MARK: - Week strip

    private var weekStrip: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Your week")
                .font(.headline)
            HStack(spacing: 10) {
                ForEach(store.recentCheckIns) { checkIn in
                    VStack(spacing: 5) {
                        Image(systemName: checkIn.mood.symbolName)
                            .font(.callout)
                            .foregroundStyle(Theme.moodColor(checkIn.mood))
                        Text(checkIn.date, format: .dateTime.weekday(.narrow))
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                    .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 10))
                }
            }
        }
    }

    // MARK: - Quick tools

    private var quickTools: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Take a moment")
                .font(.headline)

            VStack(spacing: 10) {
                NavigationLink {
                    BreathingView()
                } label: {
                    QuickToolRow(
                        title: "Breathe",
                        subtitle: "A guided minute of slow breathing",
                        symbolName: "wind",
                        color: Theme.sky
                    )
                }
                NavigationLink {
                    GroundingView()
                } label: {
                    QuickToolRow(
                        title: "Come Back to Now",
                        subtitle: "The 5-4-3-2-1 grounding exercise",
                        symbolName: "leaf",
                        color: Theme.sage
                    )
                }
                NavigationLink {
                    AffirmationsView()
                } label: {
                    QuickToolRow(
                        title: "Gentle Words",
                        subtitle: "Affirmations for heavy days",
                        symbolName: "heart.text.square",
                        color: Theme.dusk
                    )
                }
            }
        }
    }
}

struct QuickToolRow: View {
    let title: String
    let subtitle: String
    let symbolName: String
    let color: Color

    var body: some View {
        HStack(spacing: 14) {
            Image(systemName: symbolName)
                .font(.title3)
                .foregroundStyle(.white)
                .frame(width: 44, height: 44)
                .background(Theme.toolGradient(color), in: RoundedRectangle(cornerRadius: 12))

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.primary)
                Text(subtitle)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            Image(systemName: "chevron.right")
                .font(.caption.weight(.semibold))
                .foregroundStyle(.tertiary)
        }
        .padding(12)
        .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 16))
    }
}

#Preview {
    TodayView()
        .environmentObject(CompanionStore())
        .tint(Theme.cardinal)
}
