import SwiftData
import SwiftUI

/// Settings, privacy controls, and AI configuration.
///
/// The privacy section is deliberately near the top and written plainly: what
/// is stored, what leaves the device, and how to delete it. Those are the
/// questions someone recording their own voice actually has.
struct SettingsView: View {

    @EnvironmentObject private var services: AppServices
    @Environment(\.modelContext) private var context
    @Query private var profiles: [ProfileRecord]

    @State private var proxyURL = ""
    @State private var proxySecret = ""
    @State private var developmentKey = ""
    @State private var configError: String?
    @State private var showDeleteConfirmation = false
    @State private var showDeleteEverythingConfirmation = false
    @State private var savedMessage: String?

    private var store: ProgressStore { ProgressStore(context: context) }
    private var profile: ProfileRecord? { profiles.first }

    var body: some View {
        NavigationStack {
            ZStack {
                ScreenBackground()
                ScrollView {
                    VStack(alignment: .leading, spacing: Theme.Space.l) {
                        practiceSection
                        privacySection
                        aiSection
                        dataSection
                        aboutSection
                    }
                    .padding(Theme.Space.l)
                    .padding(.bottom, Theme.Space.xl)
                }
            }
            .navigationTitle("Settings")
            .onAppear(perform: loadConfig)
        }
    }

    // MARK: - Practice

    private var practiceSection: some View {
        Card {
            VStack(alignment: .leading, spacing: Theme.Space.m) {
                SectionLabel(text: "Practice")

                Stepper(
                    "Weekly goal: \(profile?.weeklyTarget ?? 4) sessions",
                    value: Binding(
                        get: { profile?.weeklyTarget ?? 4 },
                        set: { store.setWeeklyTarget($0) }
                    ),
                    in: 1...14
                )
                .font(Theme.Font.body(15))

                Toggle("Ask how anxious I feel", isOn: Binding(
                    get: { profile?.trackAnxiety ?? true },
                    set: { profile?.trackAnxiety = $0; store.save() }
                ))
                .font(Theme.Font.body(15))

                // Hand-rolled bindings: `synthesizer` and `haptics` are `let`
                // properties, so `$services.synthesizer…` has no writable key path.
                Toggle("Speak the other person's lines aloud", isOn: Binding(
                    get: { services.synthesizer.isEnabled },
                    set: { services.synthesizer.isEnabled = $0 }
                ))
                .font(Theme.Font.body(15))

                Toggle("Haptics", isOn: Binding(
                    get: { services.haptics.isEnabled },
                    set: { services.haptics.isEnabled = $0 }
                ))
                .font(Theme.Font.body(15))
            }
        }
    }

    // MARK: - Privacy

    private var privacySection: some View {
        Card {
            VStack(alignment: .leading, spacing: Theme.Space.m) {
                SectionLabel(text: "Privacy")

                Text(Branding.privacySummary)
                    .font(Theme.Font.body(14))
                    .foregroundStyle(Theme.Palette.inkMuted)
                    .lineSpacing(3)

                Toggle("Keep recordings after analysis", isOn: Binding(
                    get: { profile?.keepRecordings ?? false },
                    set: { profile?.keepRecordings = $0; store.save() }
                ))
                .font(Theme.Font.body(15))

                Text((profile?.keepRecordings ?? false)
                     ? "Recordings stay on this device so you can listen back. Delete them any time below."
                     : "Recordings are deleted as soon as they've been transcribed and measured. Only the transcript is kept.")
                    .font(Theme.Font.caption(12))
                    .foregroundStyle(Theme.Palette.inkFaint)

                Divider().overlay(Theme.Palette.hairline)

                whatGetsSent

                if AudioStore.count() > 0 {
                    Text("\(AudioStore.count()) recording\(AudioStore.count() == 1 ? "" : "s") stored, about \(formattedBytes) on disk.")
                        .font(Theme.Font.caption(12))
                        .foregroundStyle(Theme.Palette.inkMuted)
                }
            }
        }
    }

    private var whatGetsSent: some View {
        VStack(alignment: .leading, spacing: Theme.Space.s) {
            Text("What leaves this device")
                .font(Theme.Font.heading(14))
                .foregroundStyle(Theme.Palette.ink)

            bullet("Your audio never leaves the device. Transcription runs on-device where the hardware supports it; when it doesn't, iOS sends the audio to Apple and the app tells you so at the time.")
            bullet("When you ask for coaching, the transcript, the scenario, and the measured numbers are sent to your own coaching server — not the audio.")
            bullet("Nothing is sent for advertising, training, or analytics. There is no analytics SDK in this app.")

            if case .offline = services.config.backend {
                bullet("Right now nothing is being sent anywhere: no coaching server is configured, so feedback is generated on this device.")
            }
        }
    }

    private func bullet(_ text: String) -> some View {
        HStack(alignment: .top, spacing: Theme.Space.s) {
            Circle()
                .fill(Theme.Palette.inkFaint)
                .frame(width: 4, height: 4)
                .padding(.top, 7)
            Text(text)
                .font(Theme.Font.body(13))
                .foregroundStyle(Theme.Palette.inkMuted)
                .lineSpacing(2)
        }
    }

    private var formattedBytes: String {
        ByteCountFormatter.string(fromByteCount: AudioStore.totalBytes(), countStyle: .file)
    }

    // MARK: - AI

    private var aiSection: some View {
        Card {
            VStack(alignment: .leading, spacing: Theme.Space.m) {
                SectionLabel(text: "AI coaching")

                HStack(spacing: Theme.Space.s) {
                    Circle()
                        .fill(services.config.backend.isConfigured ? Theme.Palette.positive : Theme.Palette.inkFaint)
                        .frame(width: 8, height: 8)
                    Text(services.config.statusDescription)
                        .font(Theme.Font.body(14))
                        .foregroundStyle(Theme.Palette.ink)
                }

                Text("Without a server, the app still coaches you using measurements taken on this device. With one, you also get contextual feedback on what you actually said.")
                    .font(Theme.Font.caption(12))
                    .foregroundStyle(Theme.Palette.inkMuted)

                Divider().overlay(Theme.Palette.hairline)

                VStack(alignment: .leading, spacing: Theme.Space.s) {
                    Text("Coaching server URL")
                        .font(Theme.Font.heading(14))
                        .foregroundStyle(Theme.Palette.ink)
                    TextField("https://your-proxy.example.com", text: $proxyURL)
                        .textFieldStyle(.roundedBorder)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .keyboardType(.URL)

                    Text("Shared secret (optional)")
                        .font(Theme.Font.heading(14))
                        .foregroundStyle(Theme.Palette.ink)
                    SecureField("x-speaklab-key", text: $proxySecret)
                        .textFieldStyle(.roundedBorder)

                    HStack(spacing: Theme.Space.m) {
                        Button("Save") { saveProxy() }
                            .font(Theme.Font.heading(15))
                            .foregroundStyle(Theme.Palette.accent)
                        Button("Clear") {
                            services.config.clearProxy()
                            proxyURL = ""
                            proxySecret = ""
                            savedMessage = "Cleared."
                        }
                        .font(Theme.Font.caption())
                        .foregroundStyle(Theme.Palette.inkMuted)
                    }

                    if let configError {
                        Text(configError)
                            .font(Theme.Font.caption(12))
                            .foregroundStyle(Theme.Palette.caution)
                    }
                    if let savedMessage {
                        Text(savedMessage)
                            .font(Theme.Font.caption(12))
                            .foregroundStyle(Theme.Palette.positive)
                    }
                }

                Divider().overlay(Theme.Palette.hairline)

                DisclosureGroup {
                    VStack(alignment: .leading, spacing: Theme.Space.s) {
                        Text("An API key on a phone is a key you can't rotate if the device is lost, and anyone with the device can use it. Use this only while testing, and prefer a server.")
                            .font(Theme.Font.caption(12))
                            .foregroundStyle(Theme.Palette.caution)
                        SecureField("sk-ant-...", text: $developmentKey)
                            .textFieldStyle(.roundedBorder)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                        HStack(spacing: Theme.Space.m) {
                            Button("Save key") {
                                services.config.setDevelopmentKey(developmentKey)
                                developmentKey = ""
                                savedMessage = "Development key stored in the Keychain."
                            }
                            .font(Theme.Font.caption())
                            .foregroundStyle(Theme.Palette.accent)
                            Button("Remove key") {
                                services.config.setDevelopmentKey("")
                                savedMessage = "Development key removed."
                            }
                            .font(Theme.Font.caption())
                            .foregroundStyle(Theme.Palette.inkMuted)
                        }
                    }
                    .padding(.top, Theme.Space.s)
                } label: {
                    Text("Development: use an API key directly")
                        .font(Theme.Font.caption())
                        .foregroundStyle(Theme.Palette.inkMuted)
                }
            }
        }
    }

    // MARK: - Data

    private var dataSection: some View {
        Card {
            VStack(alignment: .leading, spacing: Theme.Space.m) {
                SectionLabel(text: "Your data")

                Button {
                    store.deleteAllRecordings()
                    savedMessage = "All recordings deleted."
                } label: {
                    Label("Delete all recordings", systemImage: "waveform.slash")
                        .font(Theme.Font.body(15))
                        .foregroundStyle(Theme.Palette.ink)
                }

                Button {
                    showDeleteConfirmation = true
                } label: {
                    Label("Delete recordings and transcripts", systemImage: "doc.badge.gearshape")
                        .font(Theme.Font.body(15))
                        .foregroundStyle(Theme.Palette.ink)
                }

                Button {
                    showDeleteEverythingConfirmation = true
                } label: {
                    Label("Delete everything", systemImage: "trash")
                        .font(Theme.Font.body(15))
                        .foregroundStyle(Theme.Palette.recording)
                }
            }
        }
        .confirmationDialog(
            "Delete recordings and transcripts?",
            isPresented: $showDeleteConfirmation,
            titleVisibility: .visible
        ) {
            Button("Delete", role: .destructive) {
                store.deleteAllTranscripts()
                savedMessage = "Recordings and transcripts deleted. Your progress is intact."
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("Your levels, streak and skill progress are kept. The words you said are removed.")
        }
        .confirmationDialog(
            "Delete everything?",
            isPresented: $showDeleteEverythingConfirmation,
            titleVisibility: .visible
        ) {
            Button("Delete everything", role: .destructive) {
                store.deleteEverything()
                Keychain.deleteAll()
                services.config.reload()
                proxyURL = ""
                proxySecret = ""
                savedMessage = "Everything deleted."
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("Recordings, transcripts, sessions, progress and saved server settings. This cannot be undone.")
        }
    }

    private var aboutSection: some View {
        VStack(alignment: .leading, spacing: Theme.Space.s) {
            Text("\(Branding.appName) — \(Branding.tagline)")
                .font(Theme.Font.caption())
                .foregroundStyle(Theme.Palette.inkMuted)
            Text("A training tool for communication skills. It is not therapy, coaching for mental health, or a diagnostic instrument, and it doesn't measure personality, charisma or confidence.")
                .font(Theme.Font.caption(11))
                .foregroundStyle(Theme.Palette.inkFaint)
                .lineSpacing(2)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    // MARK: - Actions

    private func loadConfig() {
        proxyURL = services.config.proxyURLString
    }

    private func saveProxy() {
        configError = nil
        savedMessage = nil
        do {
            try services.config.setProxy(urlString: proxyURL, secret: proxySecret.isEmpty ? nil : proxySecret)
            savedMessage = "Saved. \(services.config.statusDescription)"
            proxySecret = ""
        } catch {
            configError = (error as? LocalizedError)?.errorDescription ?? "Couldn't save that."
        }
    }
}
