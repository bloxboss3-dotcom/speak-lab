import SwiftUI

/// The feedback screen, in the order the brief specified: what worked, the one
/// priority, the evidence, why it matters, and the instruction for the retry.
///
/// Everything else — the full rubric, the measured numbers, the transcript — is
/// collapsed. A learner about to try again needs one thing in their head, not
/// twelve.
struct SessionFeedbackView: View {

    @ObservedObject var model: SessionViewModel
    @State private var showObservations = false
    @State private var showTranscript = false
    @State private var showMetrics = false

    private var feedback: CoachFeedback? { model.feedback }
    private var attempt: SessionViewModel.AttemptState? { model.firstAttempt }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Theme.Space.l) {
                if let feedback {
                    outcomeLine(feedback)
                    safetyFlags(feedback)
                    whatWorked(feedback)
                    priority(feedback)
                    if let nugget = feedback.optionalGoldenNugget {
                        GoldenNuggetCard(nugget: nugget, isNew: true)
                    }
                    bonusObjectives
                    disclosures(feedback)
                } else {
                    NoticeCard(
                        title: "No feedback yet",
                        message: "Something went wrong reading that attempt.",
                        systemImage: "exclamationmark.triangle"
                    )
                }
                provenanceNote
            }
            .padding(Theme.Space.l)
            .padding(.bottom, 110)
        }
        .safeAreaInset(edge: .bottom) { retryBar }
    }

    // MARK: - Sections

    private func outcomeLine(_ feedback: CoachFeedback) -> some View {
        VStack(alignment: .leading, spacing: Theme.Space.s) {
            SectionLabel(text: "What happened")
            Text(feedback.scenarioOutcome)
                .font(Theme.Font.title(21))
                .foregroundStyle(Theme.Palette.ink)
                .lineSpacing(3)
        }
    }

    @ViewBuilder
    private func safetyFlags(_ feedback: CoachFeedback) -> some View {
        if !feedback.safetyFlags.isEmpty {
            Card {
                VStack(alignment: .leading, spacing: Theme.Space.s) {
                    Label("Worth noting", systemImage: "hand.raised")
                        .font(Theme.Font.heading(15))
                        .foregroundStyle(Theme.Palette.caution)
                    ForEach(feedback.safetyFlags, id: \.self) { flag in
                        Text(flag)
                            .font(Theme.Font.body(14))
                            .foregroundStyle(Theme.Palette.inkMuted)
                    }
                    Text("This app trains communication. It isn't therapy or mental-health support.")
                        .font(Theme.Font.caption(11))
                        .foregroundStyle(Theme.Palette.inkFaint)
                }
            }
        }
    }

    private func whatWorked(_ feedback: CoachFeedback) -> some View {
        Card {
            VStack(alignment: .leading, spacing: Theme.Space.m) {
                SectionLabel(text: "What worked", accent: Theme.Palette.positive)
                ForEach(feedback.strengths, id: \.self) { strength in
                    HStack(alignment: .top, spacing: Theme.Space.s) {
                        Image(systemName: "checkmark")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundStyle(Theme.Palette.positive)
                            .padding(.top, 3)
                        Text(strength)
                            .font(Theme.Font.body(15))
                            .foregroundStyle(Theme.Palette.ink)
                    }
                }
                if feedback.strengths.isEmpty {
                    Text("You completed the attempt.")
                        .font(Theme.Font.body(15))
                        .foregroundStyle(Theme.Palette.inkMuted)
                }
            }
        }
    }

    private func priority(_ feedback: CoachFeedback) -> some View {
        Card(raised: true) {
            VStack(alignment: .leading, spacing: Theme.Space.m) {
                SectionLabel(text: "Your one priority", accent: Theme.Palette.accent)

                Text(feedback.primaryTarget)
                    .font(Theme.Font.title(22))
                    .foregroundStyle(Theme.Palette.ink)

                EvidenceQuote(
                    quote: feedback.evidenceQuote,
                    verified: model.evidenceVerified,
                    timestamp: quoteTimestamp(feedback.evidenceQuote)
                )

                Text(feedback.explanation)
                    .font(Theme.Font.body(15))
                    .foregroundStyle(Theme.Palette.inkMuted)
                    .lineSpacing(4)

                Divider().overlay(Theme.Palette.hairline)

                VStack(alignment: .leading, spacing: 4) {
                    SectionLabel(text: "On the retry")
                    Text(feedback.retryInstruction)
                        .font(Theme.Font.heading(17))
                        .foregroundStyle(Theme.Palette.ink)
                }
            }
        }
    }

    /// Bonus objectives are claimed by the learner, not judged by the app.
    ///
    /// Most of them ("finish inside the limit", "end on a callback") aren't
    /// something a transcript can settle, and a wrong automatic verdict would
    /// be worse than an honest self-report.
    @ViewBuilder
    private var bonusObjectives: some View {
        let bonuses = model.scenario.bonusObjectives
        if !bonuses.isEmpty {
            Card(padding: Theme.Space.m) {
                VStack(alignment: .leading, spacing: Theme.Space.s) {
                    SectionLabel(text: "Bonus objectives")
                    ForEach(bonuses) { objective in
                        Button {
                            if model.claimedBonusObjectives.contains(objective.id) {
                                model.claimedBonusObjectives.remove(objective.id)
                            } else {
                                model.claimedBonusObjectives.insert(objective.id)
                            }
                        } label: {
                            HStack(alignment: .top, spacing: Theme.Space.s) {
                                Image(systemName: model.claimedBonusObjectives.contains(objective.id)
                                      ? "checkmark.square.fill" : "square")
                                    .foregroundStyle(model.claimedBonusObjectives.contains(objective.id)
                                                     ? Theme.Palette.accent : Theme.Palette.inkFaint)
                                Text(objective.text)
                                    .font(Theme.Font.body(14))
                                    .foregroundStyle(Theme.Palette.ink)
                                    .multilineTextAlignment(.leading)
                                Spacer()
                            }
                        }
                        .buttonStyle(.plain)
                    }
                    Text("Your call — tick the ones you actually managed.")
                        .font(Theme.Font.caption(11))
                        .foregroundStyle(Theme.Palette.inkFaint)
                }
            }
        }
    }

    @ViewBuilder
    private func disclosures(_ feedback: CoachFeedback) -> some View {
        VStack(spacing: Theme.Space.m) {
            if !feedback.rubricObservations.isEmpty {
                DisclosureCard(
                    title: "Other observations",
                    subtitle: "\(feedback.rubricObservations.count) more",
                    isExpanded: $showObservations
                ) {
                    VStack(alignment: .leading, spacing: Theme.Space.m) {
                        ForEach(feedback.rubricObservations) { observation in
                            RubricRow(observation: observation)
                        }
                    }
                }
            }

            if let metrics = attempt?.metrics {
                DisclosureCard(
                    title: "Measured on device",
                    subtitle: "Numbers, not opinions",
                    isExpanded: $showMetrics
                ) {
                    MetricsGrid(metrics: metrics)
                }
            }

            if let attempt, !attempt.transcript.isEmpty {
                DisclosureCard(
                    title: "Transcript",
                    subtitle: "\(attempt.metrics.wordCount) words",
                    isExpanded: $showTranscript
                ) {
                    TranscriptHighlightView(
                        transcript: attempt.transcript,
                        highlight: feedback.evidenceQuote
                    )
                }
            }
        }
    }

    @ViewBuilder
    private var provenanceNote: some View {
        VStack(alignment: .leading, spacing: Theme.Space.xs) {
            if let note = model.coachNote {
                Label(note, systemImage: "info.circle")
                    .font(Theme.Font.caption(12))
                    .foregroundStyle(Theme.Palette.inkFaint)
            }
            if let note = attempt?.transcriptionNote {
                Label(note, systemImage: "waveform")
                    .font(Theme.Font.caption(12))
                    .foregroundStyle(Theme.Palette.inkFaint)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var retryBar: some View {
        VStack(spacing: Theme.Space.s) {
            PrimaryButton(title: "Try it again", systemImage: "arrow.clockwise") {
                model.beginRetry()
            }
            QuietButton(title: "Skip the retry") {
                model.skipRetry()
            }
            Text("The retry is where the change actually happens.")
                .font(Theme.Font.caption(11))
                .foregroundStyle(Theme.Palette.inkFaint)
        }
        .padding(Theme.Space.l)
        .background(.ultraThinMaterial)
    }

    private func quoteTimestamp(_ quote: String) -> TimeInterval? {
        guard let sentences = attempt?.metrics.sentences else { return nil }
        return TranscriptGrounding.locate(quote: quote, in: sentences)?.start
    }
}

// MARK: - Pieces

/// The quoted moment. When the quote couldn't be found word-for-word in the
/// transcript it is labelled a paraphrase rather than presented as a record.
struct EvidenceQuote: View {
    let quote: String
    let verified: Bool
    var timestamp: TimeInterval?

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: Theme.Space.s) {
                if let timestamp {
                    Pill(text: PromptBuilder.timestamp(timestamp), systemImage: "clock")
                }
                if !verified {
                    Pill(
                        text: "Paraphrase",
                        foreground: Theme.Palette.caution,
                        background: Theme.Palette.cautionSoft,
                        systemImage: "quote.closing"
                    )
                }
            }

            HStack(alignment: .top, spacing: Theme.Space.s) {
                Rectangle()
                    .fill(Theme.Palette.accent)
                    .frame(width: 3)
                Text("\u{201C}\(quote)\u{201D}")
                    .font(Theme.Font.body(16))
                    .italic()
                    .foregroundStyle(Theme.Palette.ink)
                    .lineSpacing(3)
            }
            .fixedSize(horizontal: false, vertical: true)
        }
    }
}

struct RubricRow: View {
    let observation: RubricObservation

    var body: some View {
        VStack(alignment: .leading, spacing: 5) {
            HStack {
                Text(observation.dimension.displayName)
                    .font(Theme.Font.heading(14))
                    .foregroundStyle(Theme.Palette.ink)
                Spacer()
                RatingChip(rating: observation.rating)
            }
            Text(observation.observation)
                .font(Theme.Font.body(14))
                .foregroundStyle(Theme.Palette.inkMuted)
        }
    }
}

/// Collapsible section. Everything secondary lives behind one of these.
struct DisclosureCard<Content: View>: View {
    let title: String
    var subtitle: String?
    @Binding var isExpanded: Bool
    @ViewBuilder var content: Content

    var body: some View {
        Card(padding: Theme.Space.m) {
            VStack(alignment: .leading, spacing: Theme.Space.m) {
                Button {
                    withAnimation(Theme.Motion.standard) { isExpanded.toggle() }
                } label: {
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(title)
                                .font(Theme.Font.heading(15))
                                .foregroundStyle(Theme.Palette.ink)
                            if let subtitle {
                                Text(subtitle)
                                    .font(Theme.Font.caption(12))
                                    .foregroundStyle(Theme.Palette.inkFaint)
                            }
                        }
                        Spacer()
                        Image(systemName: "chevron.down")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundStyle(Theme.Palette.inkMuted)
                            .rotationEffect(.degrees(isExpanded ? 180 : 0))
                    }
                }
                .buttonStyle(.plain)

                if isExpanded {
                    content
                        .transition(.opacity.combined(with: .move(edge: .top)))
                }
            }
        }
    }
}

/// The measured numbers, clearly separated from anything the model said.
struct MetricsGrid: View {
    let metrics: SpeakingMetrics

    private var columns: [GridItem] {
        [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())]
    }

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.Space.m) {
            LazyVGrid(columns: columns, alignment: .leading, spacing: Theme.Space.m) {
                StatTile(
                    value: Format.duration(metrics.totalDuration),
                    label: "Length",
                    caption: timeLimitCaption
                )
                StatTile(
                    value: "\(Int(metrics.wordsPerMinute.rounded()))",
                    label: "Words/min",
                    caption: paceCaption
                )
                StatTile(
                    value: "\(metrics.fillerCount)",
                    label: "Fillers",
                    caption: metrics.wordCount > 0
                        ? String(format: "%.1f per 100", metrics.fillerRate)
                        : nil
                )
                StatTile(value: "\(metrics.wordCount)", label: "Words")
                StatTile(
                    value: String(format: "%.2f", metrics.paceVariation),
                    label: "Pace variation",
                    caption: metrics.paceVariation < 0.08 ? "very even" : "varied"
                )
                StatTile(
                    value: metrics.longestPause > 0 ? String(format: "%.1fs", metrics.longestPause) : "—",
                    label: "Longest pause"
                )
            }

            if !metrics.repeatedPhrases.isEmpty {
                VStack(alignment: .leading, spacing: 4) {
                    SectionLabel(text: "Repeated")
                    ForEach(metrics.repeatedPhrases, id: \.phrase) { phrase in
                        Text("\u{201C}\(phrase.phrase)\u{201D} \u{00D7}\(phrase.count)")
                            .font(Theme.Font.body(13))
                            .foregroundStyle(Theme.Palette.inkMuted)
                    }
                }
            }

            Text("Measured on this device from the recording's timing and transcript. Nothing here is a judgement about you.")
                .font(Theme.Font.caption(11))
                .foregroundStyle(Theme.Palette.inkFaint)
        }
    }

    private var timeLimitCaption: String? {
        guard let limit = metrics.timeLimit else { return "untimed" }
        return metrics.withinTimeLimit == true ? "within \(Int(limit))s" : "over \(Int(limit))s"
    }

    private var paceCaption: String? {
        guard metrics.wordsPerMinute > 0 else { return nil }
        if Thresholds.comfortablePaceRange.contains(metrics.wordsPerMinute) { return "comfortable" }
        return metrics.wordsPerMinute > Thresholds.comfortablePaceRange.upperBound ? "fast" : "measured"
    }
}

/// Transcript with the quoted moment highlighted in place.
struct TranscriptHighlightView: View {
    let transcript: String
    let highlight: String

    var body: some View {
        Text(attributed)
            .font(Theme.Font.body(15))
            .foregroundStyle(Theme.Palette.ink)
            .lineSpacing(5)
            .textSelection(.enabled)
    }

    private var attributed: AttributedString {
        var result = AttributedString(transcript)
        let grounding = TranscriptGrounding.verify(quote: highlight, in: transcript)
        guard grounding.verified, let range = grounding.matchedRange,
              let lower = AttributedString.Index(range.lowerBound, within: result),
              let upper = AttributedString.Index(range.upperBound, within: result) else {
            return result
        }
        result[lower..<upper].backgroundColor = Theme.Palette.accentSoft
        result[lower..<upper].foregroundColor = Theme.Palette.ink
        return result
    }
}

struct GoldenNuggetCard: View {
    let nugget: GoldenNugget
    var isNew: Bool = false

    var body: some View {
        Card {
            VStack(alignment: .leading, spacing: Theme.Space.s) {
                HStack(spacing: Theme.Space.s) {
                    Image(systemName: "sparkle")
                        .foregroundStyle(Theme.Palette.accent)
                    SectionLabel(text: isNew ? "Golden nugget unlocked" : nugget.category.displayName, accent: Theme.Palette.accent)
                    Spacer()
                    if isNew { Pill(text: nugget.category.displayName) }
                }
                Text(nugget.title)
                    .font(Theme.Font.title(18))
                    .foregroundStyle(Theme.Palette.ink)
                Text(nugget.insight)
                    .font(Theme.Font.body(15))
                    .foregroundStyle(Theme.Palette.inkMuted)
                    .lineSpacing(3)
            }
        }
    }
}
