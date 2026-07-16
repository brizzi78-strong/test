import SwiftUI

/// The handbook's planning pillar: interactive checklists whose
/// progress is saved on-device.
struct ChecklistsView: View {
    @EnvironmentObject private var store: CompanionStore

    var body: some View {
        NavigationStack {
            List {
                Section {
                    ForEach(SeedData.checklists) { checklist in
                        NavigationLink(value: checklist) {
                            ChecklistRow(checklist: checklist)
                        }
                    }
                } header: {
                    Text("From the handbook — red means act today, purple means watch closely, blue means plan ahead.")
                        .textCase(nil)
                } footer: {
                    Text("Progress is saved on this device. These lists organize the work — they aren't legal or medical advice.")
                }
            }
            .navigationTitle("Checklists")
            .navigationDestination(for: Checklist.self) { checklist in
                ChecklistDetailView(checklist: checklist)
            }
        }
    }
}

private struct ChecklistRow: View {
    @EnvironmentObject private var store: CompanionStore
    let checklist: Checklist

    var body: some View {
        let done = store.completedCount(in: checklist)
        let total = checklist.items.count
        let tierColor = Theme.tierColor(checklist.tier)
        HStack(spacing: 13) {
            ZStack {
                Circle()
                    .stroke(tierColor.opacity(0.2), lineWidth: 3.5)
                Circle()
                    .trim(from: 0, to: total == 0 ? 0 : CGFloat(done) / CGFloat(total))
                    .stroke(done == total ? Theme.gold : tierColor,
                            style: StrokeStyle(lineWidth: 3.5, lineCap: .round))
                    .rotationEffect(.degrees(-90))
                Image(systemName: done == total ? "checkmark" : checklist.symbolName)
                    .font(.system(size: 15))
                    .foregroundStyle(done == total ? Theme.gold : tierColor)
            }
            .frame(width: 42, height: 42)

            VStack(alignment: .leading, spacing: 3) {
                Text(checklist.tier.rawValue)
                    .font(.system(size: 10, weight: .bold))
                    .textCase(.uppercase)
                    .padding(.horizontal, 7)
                    .padding(.vertical, 2)
                    .background(tierColor.opacity(0.14), in: Capsule())
                    .foregroundStyle(tierColor)
                Text(checklist.title)
                    .font(.subheadline.weight(.semibold))
                Text(checklist.subtitle)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Text("\(done) of \(total) done")
                    .font(.caption2.weight(.medium))
                    .foregroundStyle(done == total ? Theme.gold : tierColor)
            }
        }
        .padding(.vertical, 3)
    }
}

struct ChecklistDetailView: View {
    @EnvironmentObject private var store: CompanionStore
    let checklist: Checklist

    var body: some View {
        let done = store.completedCount(in: checklist)
        List {
            Section {
                VStack(alignment: .leading, spacing: 8) {
                    Text(checklist.subtitle)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    ProgressView(value: Double(done), total: Double(checklist.items.count))
                        .tint(done == checklist.items.count ? Theme.gold : Theme.tierColor(checklist.tier))
                    if done == checklist.items.count {
                        Label("All done. Well handled.", systemImage: "checkmark.seal.fill")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(Theme.gold)
                    }
                }
                .padding(.vertical, 4)
                .listRowBackground(Color.clear)
                .listRowInsets(EdgeInsets(top: 4, leading: 4, bottom: 4, trailing: 4))
            }

            if checklist.id == "cl-medlist" {
                Section {
                    NavigationLink {
                        MedicationsView()
                    } label: {
                        Label("Open your medication list", systemImage: "pills.fill")
                            .foregroundStyle(Theme.cardinal)
                    }
                } footer: {
                    Text("This checklist is the reminder; your medication list is the real thing to fill in and hand over.")
                }
            }

            Section {
                ForEach(checklist.items) { item in
                    Button {
                        withAnimation(.snappy) { store.toggleChecked(item) }
                    } label: {
                        ChecklistItemRow(item: item, isChecked: store.isChecked(item))
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .navigationTitle(checklist.title)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Menu {
                    ShareLink(item: store.shareText(for: checklist)) {
                        Label("Share this checklist", systemImage: "square.and.arrow.up")
                    }
                    Button(role: .destructive) {
                        withAnimation(.snappy) { store.resetChecklist(checklist) }
                    } label: {
                        Label("Reset this checklist", systemImage: "arrow.counterclockwise")
                    }
                } label: {
                    Image(systemName: "ellipsis.circle")
                }
            }
        }
    }
}

private struct ChecklistItemRow: View {
    let item: ChecklistItem
    let isChecked: Bool

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: isChecked ? "checkmark.circle.fill" : "circle")
                .font(.title3)
                .foregroundStyle(isChecked ? Theme.gold : Color(.systemGray3))
                .padding(.top, 1)

            VStack(alignment: .leading, spacing: 3) {
                Text(item.text)
                    .font(.subheadline)
                    .foregroundStyle(isChecked ? .secondary : .primary)
                    .strikethrough(isChecked, color: .secondary)
                if let detail = item.detail {
                    Text(detail)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .padding(.vertical, 3)
        .contentShape(Rectangle())
        .accessibilityLabel("\(item.text), \(isChecked ? "done" : "not done")")
    }
}

#Preview {
    ChecklistsView()
        .environmentObject(CompanionStore())
        .tint(Theme.cardinal)
}
