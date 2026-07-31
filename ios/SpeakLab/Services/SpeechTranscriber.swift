import AVFoundation
import Foundation
import Speech

/// Turns a recording into a transcript plus per-word timings.
///
/// On-device recognition is requested whenever the device supports it, which
/// keeps the learner's audio off Apple's servers. When it isn't available the
/// app says so rather than silently uploading — that choice belongs to the
/// person whose voice it is.
@MainActor
final class SpeechTranscriber: ObservableObject {

    enum Availability {
        case unknown
        case authorized(onDevice: Bool)
        case denied
        case unavailable
    }

    struct Result {
        let transcript: String
        let segments: [SpeechSegment]
        /// False when recognition had to run on Apple's servers.
        let ranOnDevice: Bool
    }

    enum TranscriptionError: LocalizedError {
        case notAuthorized
        case recognizerUnavailable
        case noSpeechDetected
        case failed(String)

        var errorDescription: String? {
            switch self {
            case .notAuthorized:
                return "Speech recognition permission is off. You can turn it on in Settings."
            case .recognizerUnavailable:
                return "Speech recognition isn't available on this device right now."
            case .noSpeechDetected:
                return "No speech was recognised in that recording."
            case .failed(let detail):
                return "Transcription failed: \(detail)"
            }
        }
    }

    @Published private(set) var availability: Availability = .unknown

    private let recognizer = SFSpeechRecognizer(locale: Locale.current)
        ?? SFSpeechRecognizer(locale: Locale(identifier: "en_US"))

    func refreshAvailability() {
        guard let recognizer, recognizer.isAvailable else {
            availability = .unavailable
            return
        }
        switch SFSpeechRecognizer.authorizationStatus() {
        case .authorized:
            availability = .authorized(onDevice: recognizer.supportsOnDeviceRecognition)
        case .denied, .restricted:
            availability = .denied
        default:
            availability = .unknown
        }
    }

    func requestAuthorization() async -> Bool {
        let status = await withCheckedContinuation { continuation in
            SFSpeechRecognizer.requestAuthorization { continuation.resume(returning: $0) }
        }
        refreshAvailability()
        return status == .authorized
    }

    /// Whether transcription will stay on the device with current settings.
    var willRunOnDevice: Bool {
        recognizer?.supportsOnDeviceRecognition ?? false
    }

    func transcribe(url: URL) async throws -> Result {
        guard let recognizer, recognizer.isAvailable else {
            throw TranscriptionError.recognizerUnavailable
        }
        if SFSpeechRecognizer.authorizationStatus() != .authorized {
            let granted = await requestAuthorization()
            guard granted else { throw TranscriptionError.notAuthorized }
        }

        let request = SFSpeechURLRecognitionRequest(url: url)
        request.shouldReportPartialResults = false
        request.addsPunctuation = true
        request.taskHint = .dictation
        let onDevice = recognizer.supportsOnDeviceRecognition
        request.requiresOnDeviceRecognition = onDevice

        let recognition: SFSpeechRecognitionResult = try await withCheckedThrowingContinuation { continuation in
            var settled = false
            recognizer.recognitionTask(with: request) { result, error in
                // The callback can fire more than once; only resume once.
                guard !settled else { return }
                if let error {
                    settled = true
                    continuation.resume(throwing: TranscriptionError.failed(error.localizedDescription))
                    return
                }
                if let result, result.isFinal {
                    settled = true
                    continuation.resume(returning: result)
                }
            }
        }

        let best = recognition.bestTranscription
        let transcript = best.formattedString.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !transcript.isEmpty else { throw TranscriptionError.noSpeechDetected }

        let segments = best.segments.map { segment in
            SpeechSegment(
                text: segment.substring,
                start: segment.timestamp,
                duration: segment.duration
            )
        }

        return Result(transcript: transcript, segments: segments, ranOnDevice: onDevice)
    }

    /// Duration of a recorded file, used when transcription fails but the
    /// timing is still worth reporting.
    static func duration(of url: URL) async -> TimeInterval {
        let asset = AVURLAsset(url: url)
        if let duration = try? await asset.load(.duration) {
            return CMTimeGetSeconds(duration)
        }
        return 0
    }
}
