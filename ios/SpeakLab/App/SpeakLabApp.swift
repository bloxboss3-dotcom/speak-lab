import SwiftData
import SwiftUI

@main
struct SpeakLabApp: App {

    @StateObject private var services = AppServices()
    @Environment(\.scenePhase) private var scenePhase

    private let container: ModelContainer

    init() {
        let schema = SpeakLabSchema.schema
        do {
            let configuration = ModelConfiguration(schema: schema, isStoredInMemoryOnly: false)
            container = try ModelContainer(for: schema, configurations: [configuration])
        } catch {
            // A corrupt or unreadable store should not brick the app. Fall back
            // to an in-memory store so the learner can still practise today.
            let fallback = ModelConfiguration(schema: schema, isStoredInMemoryOnly: true)
            // swiftlint:disable:next force_try
            container = try! ModelContainer(for: schema, configurations: [fallback])
        }
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(services)
                // Injected separately so only the recording views redraw when
                // the level meter ticks; see the note in AppServices.
                .environmentObject(services.recorder)
                .tint(Theme.Palette.accent)
                .onAppear { services.refreshPermissions() }
        }
        .modelContainer(container)
        .onChange(of: scenePhase) { _, phase in
            // Recording must never continue once the app is out of the
            // foreground. This is the backstop for that promise.
            if phase != .active {
                services.recorder.cancel()
                services.synthesizer.stop()
                services.player.stop()
            }
        }
    }
}
