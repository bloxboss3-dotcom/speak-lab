import SwiftUI

/// Conversation mode.
///
/// Deliberately not styled as a chat app: the other person's lines are set in
/// serif on the page like a script, and the learner's own turns are quiet and
/// secondary. The interface should feel like being in a room with someone, not
/// like texting a bot.
struct ConversationView: View {

    @StateObject private var model: ConversationViewModel
    @EnvironmentObject private var services: AppServices
    @Environment(\.dismiss) private var dismiss
    @State private var showAbandon = false
    @State private var isTyping = false

    init(scenario: Scenario, skill: MicroSkill, services: AppServices, store: ProgressStore) {
        _model = StateObject(wrappedValue: ConversationViewModel(
            scenario: scenario,
            skill: skill,
            services: services,
            store: store
        ))
    }

    var body: some View {
        ZStack {
            ScreenBackground()
            content
        }
        .navigationBarBackButtonHidden(model.stage != .brief)
        .toolbar { toolbar }
        .confirmationDialog("Leave this conversation?", isPresented: $showAbandon, titleVisibility: .visible) {
            Button("Leave", role: .destructive) {
                model.abandon()
                dismiss()
            }
            Button("Stay", role: .cancel) {}
        }
    }

    @ViewBuilder
    private var content: some View {
        switch model.stage {
        case .brief:
            ConversationBriefView(model: model)
        case .conversing:
            ConversationTranscriptView(model: model, isTyping: $isTyping)
        case .analyzing:
            SessionWorkingView(
                title: "Reading the conversation back",
                subtitle: "Counting questions, talking time, and what you did with their concern"
            )
        case .feedback:
            ConversationFeedbackView(model: model)
        case .comparing:
            SessionWorkingView(
                title: "Comparing both conversations",
                subtitle: "Checking whether the target behaviour actually changed"
            )
        case .comparison:
            ConversationComparisonView(model: model)
        case .summary:
            ConversationSummaryView(model: model, onDone: { dismiss() })
        }
    }

    @ToolbarContentBuilder
    private var toolbar: some ToolbarContent {
        ToolbarItem(placement: .topBarLeading) {
            if model.stage != .summary {
                Button {
                    if model.stage == .brief { dismiss() } else { showAbandon = true }
                } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(Theme.Palette.inkMuted)
                }
                .accessibilityLabel("Close conversation")
            }
        }
        ToolbarItem(placement: .topBarTrailing) {
            if model.stage == .conversing {
                Button {
                    services.synthesizer.isEnabled.toggle()
                    if !services.synthesizer.isEnabled { services.synthesizer.stop() }
                } label: {
                    Image(systemName: services.synthesizer.isEnabled ? "speaker.wave.2" : "speaker.slash")
                        .foregroundStyle(Theme.Palette.inkMuted)
                }
                .accessibilityLabel(services.synthesizer.isEnabled ? "Mute their voice" : "Unmute their voice")
            }
        }
    }
}

// MARK: - Brief

struct ConversationBriefView: View {
    @ObservedObject var model: ConversationViewModel

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Theme.Space.l) {
                VStack(alignment: .leading, spacing: Theme.Space.s) {
                    HStack(spacing: Theme.Space.s) {
                        Pill(
                            text: model.scenario.tier.displayName,
                            foreground: Theme.Palette.accent,
                            background: Theme.Palette.accentSoft
                        )
                        Pill(text: "Conversation", systemImage: "bubble.left.and.bubble.right")
                    }
                    Text(model.scenario.title)
                        .font(Theme.Font.display(30))
                        .foregroundStyle(Theme.Palette.ink)
                    Text(model.scenario.briefing)
                        .font(Theme.Font.body(17))
                        .foregroundStyle(Theme.Palette.inkMuted)
                        .lineSpacing(4)
                }

                Card {
                    VStack(alignment: .leading, spacing: Theme.Space.m) {
                        SectionLabel(text: "What you're trying to do")
                        ForEach(model.scenario.objectives) { objective in
                            HStack(alignment: .top, spacing: Theme.Space.s) {
                                Image(systemName: objective.isBonus ? "star" : "circle")
                                    .font(.system(size: 13, weight: .semibold))
                                    .foregroundStyle(objective.isBonus ? Theme.Palette.accent : Theme.Palette.inkFaint)
                                    .padding(.top, 2)
                                Text(objective.text)
                                    .font(Theme.Font.body(15))
                                    .foregroundStyle(Theme.Palette.ink)
                            }
                        }
                    }
                }

                Card(raised: true) {
                    VStack(alignment: .leading, spacing: Theme.Space.s) {
                        SectionLabel(text: "Today's one thing", accent: Theme.Palette.accent)
                        Text(model.skill.name)
                            .font(Theme.Font.title(20))
                            .foregroundStyle(Theme.Palette.ink)
                        Text(model.skill.summary)
                            .font(Theme.Font.body(16))
                            .foregroundStyle(Theme.Palette.ink)
                        Text(model.skill.whyItMatters)
                            .font(Theme.Font.body(15))
                            .foregroundStyle(Theme.Palette.inkMuted)
                    }
                }

                HStack(alignment: .top, spacing: Theme.Space.m) {
                    Image(systemName: "eye.slash")
                        .foregroundStyle(Theme.Palette.inkMuted)
                    Text("You won't be told what they want. Find out by asking — that's the whole exercise.")
                        .font(Theme.Font.body(14))
                        .foregroundStyle(Theme.Palette.inkMuted)
                }
                .padding(Theme.Space.m)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Theme.Palette.surfaceRaised)
                .clipShape(RoundedRectangle(cornerRadius: Theme.Radius.medium, style: .continuous))

                if model.shouldAskAnxiety {
                    Card {
                        VStack(alignment: .leading, spacing: Theme.Space.m) {
                            SectionLabel(text: "Before you start")
                            Text("How anxious do you feel about this one?")
                                .font(Theme.Font.body(15))
                                .foregroundStyle(Theme.Palette.ink)
                            AnxietyScale(value: $model.anxietyBefore)
                        }
                    }
                }
            }
            .padding(Theme.Space.l)
            .padding(.bottom, 100)
        }
        .safeAreaInset(edge: .bottom) {
            PrimaryButton(title: "Begin", systemImage: "arrow.right") {
                Task { await model.begin() }
            }
            .padding(Theme.Space.l)
            .background(.ultraThinMaterial)
        }
    }
}

// MARK: - The conversation itself

struct ConversationTranscriptView: View {

    @ObservedObject var model: ConversationViewModel
    @EnvironmentObject private var services: AppServices
    @Binding var isTyping: Bool
    @FocusState private var inputFocused: Bool

    private var recorder: AudioRecorder { services.recorder }

    var body: some View {
        VStack(spacing: 0) {
            if model.isScriptedFallback { scriptedBanner }

            ScrollViewReader { proxy in
                ScrollView {
                    VStack(alignment: .leading, spacing: Theme.Space.l) {
                        ForEach(model.turns) { turn in
                            ConversationTurnRow(
                                turn: turn,
                                characterName: model.scenario.character?.name ?? "Them"
                            )
                            .id(turn.id)
                        }
                        if model.isCharacterThinking {
                            HStack { ThinkingDots(); Spacer() }
                                .id("thinking")
                        }
                        if model.conversationEnded { endedCard }
                    }
                    .padding(Theme.Space.l)
                    .padding(.bottom, Theme.Space.xl)
                }
                .onChange(of: model.turns.count) { _, _ in
                    guard let lastID = model.turns.last?.id else { return }
                    withAnimation(Theme.Motion.standard) {
                        proxy.scrollTo(lastID, anchor: .bottom)
                    }
                }
            }

            inputBar
        }
    }

    private var scriptedBanner: some View {
        HStack(spacing: Theme.Space.s) {
            Image(systemName: "exclamationmark.circle")
            Text("Rehearsal mode — no coaching server connected, so this character is scripted.")
                .font(Theme.Font.caption(12))
        }
        .foregroundStyle(Theme.Palette.caution)
        .padding(.horizontal, Theme.Space.l)
        .padding(.vertical, Theme.Space.s)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Theme.Palette.cautionSoft)
    }

    private var endedCard: some View {
        VStack(alignment: .leading, spacing: Theme.Space.s) {
            SectionLabel(text: "Conversation ended")
            if let reason = model.endReason {
                Text(reason)
                    .font(Theme.Font.body(15))
                    .foregroundStyle(Theme.Palette.inkMuted)
            }
            PrimaryButton(title: "See how it went", systemImage: "chart.bar.doc.horizontal") {
                Task { await model.requestDebrief() }
            }
            .padding(.top, Theme.Space.s)
        }
        .padding(Theme.Space.m)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Theme.Palette.surfaceRaised)
        .clipShape(RoundedRectangle(cornerRadius: Theme.Radius.medium, style: .continuous))
    }

    @ViewBuilder
    private var inputBar: some View {
        if model.conversationEnded {
            EmptyView()
        } else {
            VStack(spacing: Theme.Space.s) {
                if let error = model.errorMessage {
                    Text(error)
                        .font(Theme.Font.caption(12))
                        .foregroundStyle(Theme.Palette.caution)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }

                if isTyping {
                    HStack(spacing: Theme.Space.s) {
                        TextField("Type your reply", text: $model.typedReply, axis: .vertical)
                            .font(Theme.Font.body(16))
                            .lineLimit(1...4)
                            .focused($inputFocused)
                            .padding(Theme.Space.s + 2)
                            .background(Theme.Palette.surface)
                            .clipShape(RoundedRectangle(cornerRadius: Theme.Radius.small, style: .continuous))

                        Button {
                            Task { await model.sendTyped() }
                        } label: {
                            Image(systemName: "arrow.up.circle.fill")
                                .font(.system(size: 30))
                                .foregroundStyle(Theme.Palette.accent)
                        }
                        .disabled(!model.canSend || model.typedReply.isEmpty)
                        .opacity(model.canSend && !model.typedReply.isEmpty ? 1 : 0.4)
                    }
                } else {
                    talkButton
                }

                HStack {
                    Button(isTyping ? "Speak instead" : "Type instead") {
                        withAnimation(Theme.Motion.quick) {
                            isTyping.toggle()
                            inputFocused = isTyping
                        }
                    }
                    .font(Theme.Font.caption(12))
                    .foregroundStyle(Theme.Palette.inkMuted)

                    Spacer()

                    Button("End conversation") { model.endConversation() }
                        .font(Theme.Font.caption(12))
                        .foregroundStyle(Theme.Palette.inkMuted)
                }
            }
            .padding(Theme.Space.l)
            .background(.ultraThinMaterial)
        }
    }

    private var talkButton: some View {
        VStack(spacing: Theme.Space.xs) {
            Button {
                Task { await toggleRecording() }
            } label: {
                HStack(spacing: Theme.Space.s) {
                    if recorder.isRecording {
                        RecordingDot()
                        Text(Format.duration(recorder.elapsed))
                            .font(Theme.Font.metric(17))
                    } else {
                        Image(systemName: "mic.fill")
                        Text("Hold the floor")
                            .font(Theme.Font.heading())
                    }
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, Theme.Space.m)
                .background(recorder.isRecording ? Theme.Palette.recording : Theme.Palette.accent)
                .foregroundStyle(Theme.Palette.canvas)
                .clipShape(RoundedRectangle(cornerRadius: Theme.Radius.medium, style: .continuous))
            }
            .buttonStyle(.plain)
            .disabled(!model.canSend && !recorder.isRecording)
            .opacity(model.canSend || recorder.isRecording ? 1 : 0.5)

            Text(recorder.isRecording ? "Tap again when you've finished speaking" : "Tap to speak your turn")
                .font(Theme.Font.caption(11))
                .foregroundStyle(Theme.Palette.inkFaint)
        }
    }

    private func toggleRecording() async {
        if recorder.isRecording {
            let recording = recorder.stop()
            services.haptics.recordingStopped()
            await model.sendSpoken(recording)
        } else {
            services.synthesizer.stop()
            let started = await recorder.start()
            if started { services.haptics.recordingStarted() }
        }
    }
}

/// One line of the conversation. The character is set in serif on the page;
/// the learner's own words are quieter and indented.
struct ConversationTurnRow: View {
    let turn: ConversationTurn
    let characterName: String

    var body: some View {
        if turn.speaker == .character {
            VStack(alignment: .leading, spacing: 6) {
                Text(characterName.uppercased())
                    .font(Theme.Font.label(10))
                    .tracking(1.4)
                    .foregroundStyle(Theme.Palette.accent)
                Text(turn.text)
                    .font(Theme.Font.title(19))
                    .foregroundStyle(Theme.Palette.ink)
                    .lineSpacing(4)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        } else {
            VStack(alignment: .leading, spacing: 6) {
                Text("YOU")
                    .font(Theme.Font.label(10))
                    .tracking(1.4)
                    .foregroundStyle(Theme.Palette.inkFaint)
                Text(turn.text)
                    .font(Theme.Font.body(16))
                    .foregroundStyle(Theme.Palette.inkMuted)
                    .lineSpacing(3)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .padding(.leading, Theme.Space.l)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }
}
