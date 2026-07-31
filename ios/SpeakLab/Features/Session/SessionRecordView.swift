import SwiftUI
import UIKit

/// The recording screen.
///
/// Recording state is unmistakable: the whole screen changes colour, a live
/// waveform moves, and a red dot pulses. That is a privacy feature, not a
/// flourish — a person should never be unsure whether the microphone is live.
struct SessionRecordView: View {

    @ObservedObject var model: SessionViewModel
    @EnvironmentObject private var services: AppServices
    /// Observed directly rather than through `services` so the level meter's
    /// twenty-times-a-second updates only redraw this screen.
    @EnvironmentObject private var recorder: AudioRecorder
    @State private var hasStarted = false
    @State private var didAutoStop = false

    private var limit: TimeInterval? { model.timeLimit }

    private var remaining: TimeInterval? {
        guard let limit else { return nil }
        return max(0, limit - recorder.elapsed)
    }

    var body: some View {
        VStack(spacing: Theme.Space.l) {
            header
            Spacer()
            timerBlock
            WaveformView(levels: recorder.levelHistory, isActive: recorder.isRecording)
                .frame(height: 88)
                .padding(.horizontal, Theme.Space.l)
            Spacer()
            cueCard
            controls
        }
        .padding(Theme.Space.l)
        .background(recorder.isRecording ? Theme.Palette.recording.opacity(0.06) : Color.clear)
        .animation(Theme.Motion.gentle, value: recorder.isRecording)
        .task {
            guard !hasStarted else { return }
            hasStarted = true
            let started = await recorder.start()
            if started { services.haptics.recordingStarted() }
        }
        .onChange(of: recorder.elapsed) { _, elapsed in
            guard let limit, !didAutoStop, recorder.isRecording, elapsed >= limit else { return }
            didAutoStop = true
            Task { await stopAndAnalyze() }
        }
        .onDisappear {
            if recorder.isRecording { recorder.cancel() }
        }
    }

    private var header: some View {
        VStack(spacing: Theme.Space.xs) {
            HStack(spacing: Theme.Space.s) {
                if recorder.isRecording {
                    RecordingDot()
                    Text("RECORDING")
                        .font(Theme.Font.label(11))
                        .tracking(1.6)
                        .foregroundStyle(Theme.Palette.recording)
                } else {
                    Text(recorder.permission == .denied ? "MICROPHONE OFF" : "READY")
                        .font(Theme.Font.label(11))
                        .tracking(1.6)
                        .foregroundStyle(Theme.Palette.inkFaint)
                }
            }
            Text(model.isRetry ? "Attempt 2" : "Attempt 1")
                .font(Theme.Font.caption())
                .foregroundStyle(Theme.Palette.inkMuted)
        }
    }

    private var timerBlock: some View {
        VStack(spacing: Theme.Space.xs) {
            if let remaining {
                Text(Format.duration(remaining))
                    .font(Theme.Font.metric(58))
                    .foregroundStyle(remaining <= 10 ? Theme.Palette.recording : Theme.Palette.ink)
                Text("remaining")
                    .font(Theme.Font.caption(12))
                    .foregroundStyle(Theme.Palette.inkFaint)
            } else {
                Text(Format.duration(recorder.elapsed))
                    .font(Theme.Font.metric(58))
                    .foregroundStyle(Theme.Palette.ink)
                Text("untimed")
                    .font(Theme.Font.caption(12))
                    .foregroundStyle(Theme.Palette.inkFaint)
            }
        }
        .accessibilityElement(children: .combine)
    }

    @ViewBuilder
    private var cueCard: some View {
        if model.isRetry, let instruction = model.feedback?.retryInstruction {
            VStack(alignment: .leading, spacing: 4) {
                SectionLabel(text: "The one change", accent: Theme.Palette.accent)
                Text(instruction)
                    .font(Theme.Font.heading(16))
                    .foregroundStyle(Theme.Palette.ink)
            }
            .padding(Theme.Space.m)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Theme.Palette.accentSoft)
            .clipShape(RoundedRectangle(cornerRadius: Theme.Radius.medium, style: .continuous))
        } else if !model.planNotes.isEmpty {
            Text(model.planNotes)
                .font(Theme.Font.body(15))
                .foregroundStyle(Theme.Palette.inkMuted)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    @ViewBuilder
    private var controls: some View {
        if recorder.permission == .denied {
            NoticeCard(
                title: "Microphone access is off",
                message: "SpeakLab can't record without it. Turn it on in the Settings app, then come back.",
                systemImage: "mic.slash",
                actionTitle: "Open Settings",
                action: openSystemSettings
            )
        } else if let error = recorder.lastError {
            NoticeCard(title: "Recording problem", message: error, systemImage: "exclamationmark.triangle")
        } else {
            VStack(spacing: Theme.Space.m) {
                Button {
                    Task { await stopAndAnalyze() }
                } label: {
                    ZStack {
                        Circle()
                            .fill(Theme.Palette.recording)
                            .frame(width: 78, height: 78)
                        RoundedRectangle(cornerRadius: 5, style: .continuous)
                            .fill(Color.white)
                            .frame(width: 26, height: 26)
                    }
                }
                .buttonStyle(.plain)
                .disabled(!recorder.isRecording)
                .opacity(recorder.isRecording ? 1 : 0.4)
                .accessibilityLabel("Stop recording and analyse")

                Text("Tap to finish")
                    .font(Theme.Font.caption(12))
                    .foregroundStyle(Theme.Palette.inkFaint)
            }
        }
    }

    private func stopAndAnalyze() async {
        let recording = recorder.stop()
        services.haptics.recordingStopped()
        await model.finishRecording(recording)
    }

    private func openSystemSettings() {
        guard let url = URL(string: UIApplication.openSettingsURLString) else { return }
        UIApplication.shared.open(url)
    }
}

/// The pulsing red dot. Deliberately the only place this colour is used.
struct RecordingDot: View {
    @State private var pulse = false

    var body: some View {
        Circle()
            .fill(Theme.Palette.recording)
            .frame(width: 10, height: 10)
            .scaleEffect(pulse ? 1.0 : 0.65)
            .opacity(pulse ? 1 : 0.6)
            .onAppear {
                withAnimation(.easeInOut(duration: 0.75).repeatForever(autoreverses: true)) {
                    pulse = true
                }
            }
            .accessibilityHidden(true)
    }
}

/// Live input visualisation. Bars scroll right to left as levels arrive.
struct WaveformView: View {
    let levels: [Double]
    let isActive: Bool

    private let barCount = 44

    var body: some View {
        GeometryReader { geometry in
            let width = geometry.size.width
            let height = geometry.size.height
            let barWidth = max(2, (width - CGFloat(barCount - 1) * 3) / CGFloat(barCount))
            let display = normalizedLevels()

            HStack(alignment: .center, spacing: 3) {
                ForEach(0..<barCount, id: \.self) { index in
                    Capsule()
                        .fill(isActive ? Theme.Palette.recording : Theme.Palette.hairline)
                        .frame(
                            width: barWidth,
                            height: max(3, CGFloat(display[index]) * height)
                        )
                        .opacity(isActive ? 0.45 + display[index] * 0.55 : 0.5)
                }
            }
            .frame(width: width, height: height, alignment: .center)
            .animation(.linear(duration: 0.06), value: levels.count)
        }
        .accessibilityHidden(true)
    }

    /// Pads or trims the history to a fixed bar count so the layout is stable.
    private func normalizedLevels() -> [Double] {
        guard !levels.isEmpty else { return Array(repeating: 0.04, count: barCount) }
        let tail = levels.suffix(barCount)
        var result = Array(tail)
        if result.count < barCount {
            result = Array(repeating: 0.04, count: barCount - result.count) + result
        }
        return result.map { max(0.04, min(1, $0)) }
    }
}
