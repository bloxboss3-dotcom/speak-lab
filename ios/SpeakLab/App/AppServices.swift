import Combine
import Foundation
import SwiftUI
import UIKit

/// Container for the long-lived services, injected once at the root.
///
/// `ObservableObject` does not observe nested observable objects, so a change
/// inside `config`, `haptics` or `synthesizer` would never reach a view holding
/// only `AppServices`. Their notifications are forwarded here.
///
/// `recorder` is deliberately *not* forwarded: it publishes level meters twenty
/// times a second, and re-rendering every screen at that rate would be wasteful.
/// It is injected into the environment separately so only the two views that
/// draw it redraw.
@MainActor
final class AppServices: ObservableObject {

    let config: AppConfig
    let recorder: AudioRecorder
    let transcriber: SpeechTranscriber
    let synthesizer: SpeechSynthesizer
    let player: AudioPlayer
    let haptics: Haptics
    let coach: Coach

    private var cancellables = Set<AnyCancellable>()

    init() {
        let config = AppConfig()
        self.config = config
        self.recorder = AudioRecorder()
        self.transcriber = SpeechTranscriber()
        self.synthesizer = SpeechSynthesizer()
        self.player = AudioPlayer()
        self.haptics = Haptics()

        // Reads the current backend on every call, so changing settings takes
        // effect immediately without rebuilding anything.
        self.coach = Coach(serviceProvider: { [weak config] in
            guard let config else { return UnconfiguredCoachingService() }
            switch config.backend {
            case .proxy(let url, let secret):
                return ProxyCoachingService(baseURL: url, secret: secret)
            case .directKey(let key):
                return DirectCoachingService(apiKey: key)
            case .offline:
                return UnconfiguredCoachingService()
            }
        })

        for child in [config.objectWillChange.eraseToAnyPublisher(),
                      haptics.objectWillChange.eraseToAnyPublisher(),
                      synthesizer.objectWillChange.eraseToAnyPublisher()] {
            child
                .sink { [weak self] _ in self?.objectWillChange.send() }
                .store(in: &cancellables)
        }
    }

    func refreshPermissions() {
        recorder.refreshPermission()
        transcriber.refreshAvailability()
    }
}

/// Small wrapper so haptic intent is described in product terms rather than
/// scattered `UIImpactFeedbackGenerator` calls.
@MainActor
final class Haptics: ObservableObject {

    /// Backed by UserDefaults directly rather than `@AppStorage`: that wrapper
    /// only republishes inside a View, and this is a plain observable object.
    @Published var isEnabled: Bool {
        didSet { UserDefaults.standard.set(isEnabled, forKey: Self.defaultsKey) }
    }

    private static let defaultsKey = "speaklab.haptics.enabled"

    init() {
        if UserDefaults.standard.object(forKey: Self.defaultsKey) == nil {
            isEnabled = true
        } else {
            isEnabled = UserDefaults.standard.bool(forKey: Self.defaultsKey)
        }
    }

    private let impact = UIImpactFeedbackGenerator(style: .medium)
    private let soft = UIImpactFeedbackGenerator(style: .soft)
    private let notification = UINotificationFeedbackGenerator()

    func recordingStarted() {
        guard isEnabled else { return }
        impact.impactOccurred(intensity: 0.9)
    }

    func recordingStopped() {
        guard isEnabled else { return }
        soft.impactOccurred(intensity: 0.7)
    }

    func tick() {
        guard isEnabled else { return }
        soft.impactOccurred(intensity: 0.4)
    }

    func success() {
        guard isEnabled else { return }
        notification.notificationOccurred(.success)
    }

    func warning() {
        guard isEnabled else { return }
        notification.notificationOccurred(.warning)
    }

    func reward() {
        guard isEnabled else { return }
        notification.notificationOccurred(.success)
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.12) { [weak self] in
            guard let self, self.isEnabled else { return }
            self.impact.impactOccurred(intensity: 0.8)
        }
    }
}
