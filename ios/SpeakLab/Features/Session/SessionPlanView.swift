import SwiftUI

/// A short, deliberately constrained planning step.
///
/// The countdown and the tiny text field are the point: scripting every word
/// produces a recital, not a conversation. The copy says so, and the field is
/// capped at a few words so it can only hold an intention.
struct SessionPlanView: View {
    @ObservedObject var model: SessionViewModel

    @State private var remaining: Int = 0
    @State private var timer: Timer?
    @FocusState private var noteFocused: Bool

    private let noteLimit = 90

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.Space.l) {
            countdown

            VStack(alignment: .leading, spacing: Theme.Space.s) {
                Text("Decide your first sentence.")
                    .font(Theme.Font.title(22))
                    .foregroundStyle(Theme.Palette.ink)
                Text("Don't script the whole thing — a scripted talk sounds like a recital and falls apart the moment someone interrupts. One intention is enough.")
                    .font(Theme.Font.body(15))
                    .foregroundStyle(Theme.Palette.inkMuted)
                    .lineSpacing(3)
            }

            Card {
                VStack(alignment: .leading, spacing: Theme.Space.s) {
                    SectionLabel(text: "Your intention (optional)")
                    TextField("e.g. dates first, then the ask", text: $model.planNotes, axis: .vertical)
                        .font(Theme.Font.body(16))
                        .lineLimit(2)
                        .focused($noteFocused)
                        .onChange(of: model.planNotes) { _, newValue in
                            if newValue.count > noteLimit {
                                model.planNotes = String(newValue.prefix(noteLimit))
                            }
                        }
                    Text("\(model.planNotes.count)/\(noteLimit)")
                        .font(Theme.Font.caption(11))
                        .foregroundStyle(Theme.Palette.inkFaint)
                }
            }

            reminderCard

            Spacer()

            PrimaryButton(title: "I'm ready — record", systemImage: "mic.fill") {
                stopTimer()
                noteFocused = false
                model.beginRecording()
            }
        }
        .padding(Theme.Space.l)
        .onAppear(perform: startTimer)
        .onDisappear(perform: stopTimer)
    }

    private var countdown: some View {
        HStack(alignment: .firstTextBaseline, spacing: Theme.Space.s) {
            Text("\(max(0, remaining))")
                .font(Theme.Font.metric(46))
                .foregroundStyle(remaining <= 5 ? Theme.Palette.accent : Theme.Palette.ink)
                .contentTransition(.numericText())
                .animation(Theme.Motion.quick, value: remaining)
            Text("seconds to think")
                .font(Theme.Font.body(15))
                .foregroundStyle(Theme.Palette.inkMuted)
            Spacer()
        }
        .accessibilityElement(children: .combine)
    }

    private var reminderCard: some View {
        HStack(alignment: .top, spacing: Theme.Space.m) {
            Image(systemName: "target")
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(Theme.Palette.accent)
                .padding(.top, 2)
            VStack(alignment: .leading, spacing: 3) {
                Text(model.skill.name)
                    .font(Theme.Font.heading(15))
                    .foregroundStyle(Theme.Palette.ink)
                Text(model.skill.retryCue)
                    .font(Theme.Font.body(14))
                    .foregroundStyle(Theme.Palette.inkMuted)
            }
        }
        .padding(Theme.Space.m)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Theme.Palette.accentSoft)
        .clipShape(RoundedRectangle(cornerRadius: Theme.Radius.medium, style: .continuous))
    }

    private func startTimer() {
        remaining = model.scenario.prepSeconds
        stopTimer()
        let created = Timer(timeInterval: 1, repeats: true) { _ in
            Task { @MainActor in
                guard remaining > 0 else {
                    stopTimer()
                    // Time is up, but nothing is forced — the learner still taps.
                    return
                }
                remaining -= 1
            }
        }
        RunLoop.main.add(created, forMode: .common)
        timer = created
    }

    private func stopTimer() {
        timer?.invalidate()
        timer = nil
    }
}
