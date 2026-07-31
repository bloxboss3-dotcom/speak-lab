import AVFoundation
import Foundation

/// Records a single attempt to a file in the app's container.
///
/// Recording is always explicit and foreground-only: it starts on a tap, the
/// UI shows an unmistakable recording state throughout, and `stop` is called
/// when the app leaves the foreground. There is no path in this class that
/// starts the microphone without the learner asking.
@MainActor
final class AudioRecorder: NSObject, ObservableObject {

    enum PermissionState {
        case unknown
        case granted
        case denied
    }

    @Published private(set) var isRecording = false
    @Published private(set) var elapsed: TimeInterval = 0
    /// Normalised 0…1 input level, for the waveform.
    @Published private(set) var level: Double = 0
    @Published private(set) var permission: PermissionState = .unknown
    @Published private(set) var lastError: String?

    /// Recent level samples, newest last. Drives the recording visualisation.
    @Published private(set) var levelHistory: [Double] = []

    private var recorder: AVAudioRecorder?
    private var meterTimer: Timer?
    private var currentURL: URL?

    private let maximumHistory = 60

    // MARK: - Permissions

    func refreshPermission() {
        switch AVAudioApplication.shared.recordPermission {
        case .granted: permission = .granted
        case .denied: permission = .denied
        default: permission = .unknown
        }
    }

    func requestPermission() async -> Bool {
        let granted = await AVAudioApplication.requestRecordPermission()
        permission = granted ? .granted : .denied
        return granted
    }

    // MARK: - Recording

    @discardableResult
    func start() async -> Bool {
        guard !isRecording else { return true }
        lastError = nil

        if permission != .granted {
            let granted = await requestPermission()
            guard granted else {
                lastError = "Microphone access is off. Turn it on in Settings to record."
                return false
            }
        }

        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playAndRecord, mode: .spokenAudio, options: [.defaultToSpeaker, .allowBluetooth])
            try session.setActive(true, options: [])

            let url = AudioStore.newRecordingURL()
            let settings: [String: Any] = [
                AVFormatIDKey: Int(kAudioFormatMPEG4AAC),
                AVSampleRateKey: 44_100.0,
                AVNumberOfChannelsKey: 1,
                AVEncoderAudioQualityKey: AVAudioQuality.high.rawValue
            ]

            let recorder = try AVAudioRecorder(url: url, settings: settings)
            recorder.isMeteringEnabled = true
            recorder.delegate = self
            guard recorder.record() else {
                lastError = "The recorder wouldn't start. Try again."
                return false
            }

            self.recorder = recorder
            currentURL = url
            isRecording = true
            elapsed = 0
            levelHistory = []
            startMetering()
            return true
        } catch {
            lastError = "Couldn't start recording: \(error.localizedDescription)"
            return false
        }
    }

    struct Recording {
        let url: URL
        let duration: TimeInterval
    }

    /// Stops and returns the finished file. Nil if nothing usable was captured.
    @discardableResult
    func stop() -> Recording? {
        guard isRecording, let recorder else { return nil }
        let duration = recorder.currentTime
        recorder.stop()
        stopMetering()
        isRecording = false
        level = 0
        deactivateSession()

        guard let url = currentURL else { return nil }
        self.recorder = nil
        currentURL = nil
        elapsed = duration
        return Recording(url: url, duration: duration)
    }

    /// Stops and throws the file away — used when the learner backs out.
    func cancel() {
        guard isRecording else { return }
        recorder?.stop()
        stopMetering()
        isRecording = false
        level = 0
        if let url = currentURL { AudioStore.delete(url) }
        recorder = nil
        currentURL = nil
        elapsed = 0
        deactivateSession()
    }

    private func deactivateSession() {
        try? AVAudioSession.sharedInstance().setActive(false, options: [.notifyOthersOnDeactivation])
    }

    // MARK: - Metering

    private func startMetering() {
        meterTimer?.invalidate()
        let timer = Timer(timeInterval: 0.05, repeats: true) { [weak self] _ in
            Task { @MainActor in self?.tick() }
        }
        RunLoop.main.add(timer, forMode: .common)
        meterTimer = timer
    }

    private func stopMetering() {
        meterTimer?.invalidate()
        meterTimer = nil
    }

    private func tick() {
        guard let recorder, recorder.isRecording else { return }
        recorder.updateMeters()
        elapsed = recorder.currentTime

        // Average power is in dBFS (-160…0). Map to a perceptually useful 0…1.
        let decibels = Double(recorder.averagePower(forChannel: 0))
        let floor = -50.0
        let normalized = decibels <= floor ? 0 : (decibels - floor) / (0 - floor)
        let shaped = pow(min(1, max(0, normalized)), 0.6)

        // Smooth, so the waveform reads as breath rather than static.
        level = level * 0.6 + shaped * 0.4
        levelHistory.append(level)
        if levelHistory.count > maximumHistory { levelHistory.removeFirst() }
    }
}

extension AudioRecorder: AVAudioRecorderDelegate {
    nonisolated func audioRecorderEncodeErrorDidOccur(_ recorder: AVAudioRecorder, error: Error?) {
        Task { @MainActor in
            self.lastError = error?.localizedDescription ?? "Recording failed."
            self.isRecording = false
            self.stopMetering()
        }
    }
}

/// Where recordings live, and how they get deleted.
///
/// Everything is inside the app's own Application Support directory and marked
/// as excluded from backup: audio of the learner's voice should not be silently
/// copied into iCloud backups.
enum AudioStore {

    static var directory: URL {
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        var folder = base.appendingPathComponent("Recordings", isDirectory: true)
        if !FileManager.default.fileExists(atPath: folder.path) {
            try? FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
            var values = URLResourceValues()
            values.isExcludedFromBackup = true
            try? folder.setResourceValues(values)
        }
        return folder
    }

    static func newRecordingURL() -> URL {
        directory.appendingPathComponent("\(UUID().uuidString).m4a")
    }

    static func url(forFileName name: String) -> URL {
        directory.appendingPathComponent(name)
    }

    static func exists(fileName: String) -> Bool {
        FileManager.default.fileExists(atPath: url(forFileName: name(from: fileName)).path)
    }

    static func delete(_ url: URL) {
        try? FileManager.default.removeItem(at: url)
    }

    static func delete(fileName: String) {
        delete(url(forFileName: name(from: fileName)))
    }

    /// Removes every stored recording. Used by "delete all recordings".
    static func deleteAll() {
        guard let contents = try? FileManager.default.contentsOfDirectory(
            at: directory,
            includingPropertiesForKeys: nil
        ) else { return }
        for file in contents { try? FileManager.default.removeItem(at: file) }
    }

    static func totalBytes() -> Int64 {
        guard let contents = try? FileManager.default.contentsOfDirectory(
            at: directory,
            includingPropertiesForKeys: [.fileSizeKey]
        ) else { return 0 }
        return contents.reduce(Int64(0)) { total, url in
            let size = (try? url.resourceValues(forKeys: [.fileSizeKey]).fileSize) ?? 0
            return total + Int64(size)
        }
    }

    static func count() -> Int {
        (try? FileManager.default.contentsOfDirectory(at: directory, includingPropertiesForKeys: nil))?.count ?? 0
    }

    private static func name(from fileName: String) -> String {
        URL(fileURLWithPath: fileName).lastPathComponent
    }
}
