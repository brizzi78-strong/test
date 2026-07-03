import SwiftUI

struct JournalView: View {
    @EnvironmentObject private var store: CompanionStore
    @State private var editingEntry: JournalEntry?
    @State private var isCreating = false

    var body: some View {
        NavigationStack {
            Group {
                if store.sortedEntries.isEmpty {
                    ContentUnavailableView {
                        Label("Your journal is empty", systemImage: "book.closed")
                    } description: {
                        Text("Writing to — or about — someone you miss is one of the oldest tools for healing. Everything you write stays on this device.")
                    } actions: {
                        Button("Write your first entry") { isCreating = true }
                            .buttonStyle(.borderedProminent)
                    }
                } else {
                    entryList
                }
            }
            .navigationTitle("Journal")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        isCreating = true
                    } label: {
                        Image(systemName: "square.and.pencil")
                    }
                    .accessibilityLabel("New entry")
                }
            }
            .sheet(isPresented: $isCreating) {
                JournalEditorView(entry: nil)
            }
            .sheet(item: $editingEntry) { entry in
                JournalEditorView(entry: entry)
            }
        }
    }

    private var entryList: some View {
        List {
            Section {
                ForEach(store.sortedEntries) { entry in
                    Button {
                        editingEntry = entry
                    } label: {
                        JournalRow(entry: entry)
                    }
                    .buttonStyle(.plain)
                }
                .onDelete { offsets in
                    let entries = store.sortedEntries
                    for index in offsets {
                        store.deleteEntry(entries[index])
                    }
                }
            } footer: {
                Text("Entries are stored only on this device.")
            }
        }
        .listStyle(.insetGrouped)
    }
}

private struct JournalRow: View {
    let entry: JournalEntry

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: entry.mood.symbolName)
                .font(.callout)
                .foregroundStyle(Theme.moodColor(entry.mood))
                .frame(width: 28, height: 28)
                .background(Theme.moodColor(entry.mood).opacity(0.15), in: Circle())

            VStack(alignment: .leading, spacing: 3) {
                Text(entry.title.isEmpty ? "Untitled" : entry.title)
                    .font(.subheadline.weight(.semibold))
                Text(entry.text)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
                Text(entry.date, format: .dateTime.month(.abbreviated).day().year())
                    .font(.caption2)
                    .foregroundStyle(.tertiary)
            }
        }
        .padding(.vertical, 2)
    }
}

struct JournalEditorView: View {
    @EnvironmentObject private var store: CompanionStore
    @Environment(\.dismiss) private var dismiss

    /// Pass an existing entry to edit it, or nil to create a new one.
    let entry: JournalEntry?

    @State private var mood: Mood = .okay
    @State private var title = ""
    @State private var text = ""

    var body: some View {
        NavigationStack {
            Form {
                Section("How does your heart feel?") {
                    Picker("Mood", selection: $mood) {
                        ForEach(Mood.allCases) { mood in
                            Label(mood.rawValue, systemImage: mood.symbolName)
                                .tag(mood)
                        }
                    }
                    .pickerStyle(.menu)
                }

                Section("Entry") {
                    TextField("Title (optional)", text: $title)
                    TextEditor(text: $text)
                        .frame(minHeight: 180)
                }

                if entry == nil {
                    Section("Need a place to start?") {
                        ForEach(SeedData.journalPrompts.prefix(4), id: \.self) { prompt in
                            Button {
                                if text.isEmpty {
                                    text = prompt + "\n\n"
                                } else {
                                    text += "\n\n" + prompt + "\n\n"
                                }
                            } label: {
                                HStack {
                                    Image(systemName: "quote.opening")
                                        .font(.caption)
                                        .foregroundStyle(Theme.cardinal)
                                    Text(prompt)
                                        .font(.subheadline)
                                        .foregroundStyle(.primary)
                                }
                            }
                        }
                    }
                }
            }
            .navigationTitle(entry == nil ? "New Entry" : "Edit Entry")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") { save() }
                        .disabled(text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
            .onAppear {
                if let entry {
                    mood = entry.mood
                    title = entry.title
                    text = entry.text
                }
            }
        }
    }

    private func save() {
        if var existing = entry {
            existing.mood = mood
            existing.title = title
            existing.text = text
            store.updateEntry(existing)
        } else {
            store.addEntry(JournalEntry(date: Date(), mood: mood, title: title, text: text))
        }
        dismiss()
    }
}

#Preview {
    JournalView()
        .environmentObject(CompanionStore())
        .tint(Theme.cardinal)
}
