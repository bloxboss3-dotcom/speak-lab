import AVFoundation
import Foundation

/// Speaks the simulated character's lines.
///
/// Voice and rate are chosen from the scenario's `voiceHint` so different
/// characters don't all sound identical — a brisk, low voice for the practical
/// parent, a brighter one for the teenager. This is cosmetic: nothing in the
/// coaching depends on it.
@MainActor
final class SpeechSynthesizer: NSObject, ObservableObject {

    @Published private(set) var isSpeaking = false
    /// Set false to keep conversation practice silent (headphones, quiet room).
    @Published var isEnabled = true

    private let synthesizer = AVSpeechSynthesizer()

    override init() {
        super.init()
        synthesizer.delegate = self
    }

    func speak(_ text: String, voiceHint: String?) {
        guard isEnabled, !text.trimmingCharacters(in: .whitespaces).isEmpty else { return }
        configureSessionForPlayback()

        let utterance = AVSpeechUtterance(string: text)
        utterance.voice = Self.voice(for: voiceHint)
        utterance.rate = Self.rate(for: voiceHint)
        utterance.pitchMultiplier = Self.pitch(for: voiceHint)
        utterance.preUtteranceDelay = 0.15
        utterance.postUtteranceDelay = 0.1

        synthesizer.stopSpeaking(at: .immediate)
        synthesizer.speak(utterance)
        isSpeaking = true
    }

    func stop() {
        synthesizer.stopSpeaking(at: .immediate)
        isSpeaking = false
    }

    private func configureSessionForPlayback() {
        let session = AVAudioSession.sharedInstance()
        try? session.setCategory(.playback, mode: .spokenAudio, options: [.duckOthers])
        try? session.setActive(true, options: [])
    }

    // MARK: - Voice selection

    private static func voice(for hint: String?) -> AVSpeechSynthesisVoice? {
        let language = AVSpeechSynthesisVoice.currentLanguageCode()
        let available = AVSpeechSynthesisVoice.speechVoices().filter { $0.language == language }

        // Prefer an enhanced voice where one is installed; they are markedly
        // less robotic, which matters for a believable simulated person.
        let enhanced = available.filter { $0.quality != .default }
        let pool = enhanced.isEmpty ? available : enhanced
        guard !pool.isEmpty else { return AVSpeechSynthesisVoice(language: language) }

        // Deterministic pick per hint, so a character sounds the same every time.
        let index = abs((hint ?? "default").hashValue) % pool.count
        return pool[index]
    }

    private static func rate(for hint: String?) -> Float {
        let base = AVSpeechUtteranceDefaultSpeechRate
        guard let hint else { return base }
        if hint.contains("brisk") { return base * 1.08 }
        if hint.contains("flat") { return base * 0.96 }
        if hint.contains("firm") { return base * 0.98 }
        return base
    }

    private static func pitch(for hint: String?) -> Float {
        guard let hint else { return 1.0 }
        if hint.contains("high") { return 1.12 }
        if hint.contains("low") { return 0.9 }
        return 1.0
    }
}

extension SpeechSynthesizer: AVSpeechSynthesizerDelegate {
    nonisolated func speechSynthesizer(
        _ synthesizer: AVSpeechSynthesizer,
        didFinish utterance: AVSpeechUtterance
    ) {
        Task { @MainActor in self.isSpeaking = false }
    }

    nonisolated func speechSynthesizer(
        _ synthesizer: AVSpeechSynthesizer,
        didCancel utterance: AVSpeechUtterance
    ) {
        Task { @MainActor in self.isSpeaking = false }
    }
}

/// Plays a recorded attempt back.
@MainActor
final class AudioPlayer: NSObject, ObservableObject {

    @Published private(set) var isPlaying = false
    @Published private(set) var currentTime: TimeInterval = 0
    @Published private(set) var duration: TimeInterval = 0

    private var player: AVAudioPlayer?
    private var timer: Timer?

    func play(url: URL, from start: TimeInterval = 0) {
        stop()
        let session = AVAudioSession.sharedInstance()
        try? session.setCategory(.playback, mode: .spokenAudio, options: [])
        try? session.setActive(true, options: [])

        guard let player = try? AVAudioPlayer(contentsOf: url) else { return }
        player.delegate = self
        player.currentTime = max(0, min(start, player.duration))
        duration = player.duration
        guard player.play() else { return }

        self.player = player
        isPlaying = true
        startTimer()
    }

    func togglePlay(url: URL) {
        if isPlaying { stop() } else { play(url: url) }
    }

    func stop() {
        player?.stop()
        player = nil
        isPlaying = false
        currentTime = 0
        timer?.invalidate()
        timer = nil
    }

    private func startTimer() {
        timer?.invalidate()
        let timer = Timer(timeInterval: 0.05, repeats: true) { [weak self] _ in
            Task { @MainActor in
                guard let self, let player = self.player else { return }
                self.currentTime = player.currentTime
            }
        }
        RunLoop.main.add(timer, forMode: .common)
        self.timer = timer
    }
}

extension AudioPlayer: AVAudioPlayerDelegate {
    nonisolated func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
        Task { @MainActor in self.stop() }
    }
}
