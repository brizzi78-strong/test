import SwiftUI

/// The person's real medication list — the one to hand to an ER or a new
/// doctor. Editable and stored on-device. The handbook's rule: "bring the
/// list, not just the bottles."
struct MedicationsView: View {
    @EnvironmentObject private var store: CompanionStore
    @State private var editingMedication: Medication?
    @State private var isCreating = false

    var body: some View {
        Group {
            if store.medications.isEmpty {
                ContentUnavailableView {
                    Label("No medications yet", systemImage: "pills")
                } description: {
                    Text("Add each medication — name, dose, when, why, and who prescribed it. Keep it current, and you'll have the one thing every doctor and ER asks for. Everything you enter stays on this device.")
                } actions: {
                    Button("Add a medication") { isCreating = true }
                        .buttonStyle(.borderedProminent)
                }
            } else {
                medicationList
            }
        }
        .navigationTitle("Medications")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button {
                    isCreating = true
                } label: {
                    Image(systemName: "plus")
                }
                .accessibilityLabel("Add medication")
            }
            if !store.medications.isEmpty {
                ToolbarItem(placement: .topBarLeading) {
                    ShareLink(item: store.medicationsShareText()) {
                        Image(systemName: "square.and.arrow.up")
                    }
                    .accessibilityLabel("Share medication list")
                }
                ToolbarItem(placement: .topBarTrailing) {
                    EditButton()
                }
            }
        }
        .sheet(isPresented: $isCreating) {
            MedicationEditorView(medication: nil)
        }
        .sheet(item: $editingMedication) { medication in
            MedicationEditorView(medication: medication)
        }
    }

    private var medicationList: some View {
        List {
            Section {
                ForEach(store.medications) { medication in
                    Button {
                        editingMedication = medication
                    } label: {
                        MedicationRow(medication: medication)
                    }
                    .buttonStyle(.plain)
                }
                .onDelete { store.deleteMedications(at: $0) }
                .onMove { store.moveMedication(from: $0, to: $1) }
            } header: {
                Text("Bring the list, not just the bottles.")
                    .textCase(nil)
            } footer: {
                Text("Include allergies and reactions, vitamins, and over-the-counter drugs. Confirm with the pharmacy before relying on it. Stored only on this device.")
            }
        }
        .listStyle(.insetGrouped)
    }
}

private struct MedicationRow: View {
    let medication: Medication

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: "pills.fill")
                .font(.callout)
                .foregroundStyle(Theme.cardinal)
                .frame(width: 28, height: 28)
                .background(Theme.cardinal.opacity(0.14), in: Circle())

            VStack(alignment: .leading, spacing: 3) {
                HStack(spacing: 6) {
                    Text(medication.name.isEmpty ? "Unnamed" : medication.name)
                        .font(.subheadline.weight(.semibold))
                    if !medication.dose.isEmpty {
                        Text(medication.dose)
                            .font(.caption.weight(.medium))
                            .foregroundStyle(Theme.cardinal)
                    }
                }
                if !medication.schedule.isEmpty {
                    Text(medication.schedule)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                if !medication.purpose.isEmpty || !medication.prescriber.isEmpty {
                    Text([medication.purpose.isEmpty ? nil : "for \(medication.purpose)",
                          medication.prescriber.isEmpty ? nil : medication.prescriber]
                            .compactMap { $0 }.joined(separator: " · "))
                        .font(.caption2)
                        .foregroundStyle(.tertiary)
                }
            }
        }
        .padding(.vertical, 2)
    }
}

struct MedicationEditorView: View {
    @EnvironmentObject private var store: CompanionStore
    @Environment(\.dismiss) private var dismiss

    /// Pass an existing medication to edit it, or nil to add a new one.
    let medication: Medication?

    @State private var name = ""
    @State private var dose = ""
    @State private var schedule = ""
    @State private var purpose = ""
    @State private var prescriber = ""

    var body: some View {
        NavigationStack {
            Form {
                Section("Medication") {
                    TextField("Name", text: $name)
                    TextField("Dose (e.g. 10 mg)", text: $dose)
                }
                Section("Details") {
                    TextField("When (e.g. Morning, with food)", text: $schedule)
                    TextField("Why (e.g. Blood pressure)", text: $purpose)
                    TextField("Prescribed by", text: $prescriber)
                }
            }
            .navigationTitle(medication == nil ? "Add Medication" : "Edit Medication")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") { save() }
                        .disabled(name.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
            .onAppear {
                if let medication {
                    name = medication.name
                    dose = medication.dose
                    schedule = medication.schedule
                    purpose = medication.purpose
                    prescriber = medication.prescriber
                }
            }
        }
    }

    private func save() {
        let trimmed = name.trimmingCharacters(in: .whitespaces)
        if var existing = medication {
            existing.name = trimmed
            existing.dose = dose
            existing.schedule = schedule
            existing.purpose = purpose
            existing.prescriber = prescriber
            store.updateMedication(existing)
        } else {
            store.addMedication(Medication(name: trimmed, dose: dose, schedule: schedule,
                                           purpose: purpose, prescriber: prescriber))
        }
        dismiss()
    }
}

#Preview {
    NavigationStack {
        MedicationsView()
            .environmentObject(CompanionStore())
    }
    .tint(Theme.cardinal)
}
