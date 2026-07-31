import SwiftUI

/// Debrief for a conversation. Same shape as the speaking feedback screen —
/// what worked, one priority, evidence, why, retry instruction — plus the
/// conversation-specific numbers and the character's hidden brief, revealed
/// only now so the learner can check their read of the room.
struct ConversationFeedbackView: View {

    @ObservedObject var model: ConversationViewModel
    @State private var showObservations = false
    @State private var showNumbers = false
    @State private var showBrief = false
    @State private var showTranscript = false

    private var feedback: CoachFeedback? { model.feedback }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Theme.Space.l) {
                if let feedback {
                    VStack(alignment: .leading, spacing: Theme.Space.s) {
                        SectionLabel(text: "How it went")
                        Text(feedback.scenarioOutcome)
                            .font(Theme.Font.title(21))
                            .foregroundStyle(Theme.Palette.ink)
                            .lineSpacing(3)
                    }

                    if !model.observedMoves.isEmpty { observedMovesCard }

                    Card {
                        VStack(alignment: .leading, spacing: Theme.Space.m) {
                            SectionLabel(text: "What worked", accent: Theme.Palette.positive)
                            ForEach(feedback.strengths, id: \.self) { strength in
                                BulletRow(text: strength, symbol: "checkmark", tint: Theme.Palette.positive)
                            }
                        }
                    }

                    Card(raised: true) {
                        VStack(alignment: .leading, spacing: Theme.Space.m) {
                            SectionLabel(text: "Your one priority", accent: Theme.Palette.accent)
                            Text(feedback.primaryTarget)
                                .font(Theme.Font.title(22))
                                .foregroundStyle(Theme.Palette.ink)
                            EvidenceQuote(quote: feedback.evidenceQuote, verified: model.evidenceVerified)
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

                    if let nugget = feedback.optionalGoldenNugget {
                        GoldenNuggetCard(nugget: nugget, isNew: true)
                    }

                    disclosures(feedback)
                }

                if let note = model.coachNote {
                    Label(note, systemImage: "info.circle")
                        .font(Theme.Font.caption(12))
                        .foregroundStyle(Theme.Palette.inkFaint)
                }
            }
            .padding(Theme.Space.l)
            .padding(.bottom, 110)
        }
        .safeAreaInset(edge: .bottom) {
            VStack(spacing: Theme.Space.s) {
                PrimaryButton(title: "Run it again", systemImage: "arrow.clockwise") {
                    model.beginRetry()
                }
                QuietButton(title: "Skip the retry") { model.skipRetry() }
            }
            .padding(Theme.Space.l)
            .background(.ultraThinMaterial)
        }
    }

    private var observedMovesCard: some View {
        Card(padding: Theme.Space.m) {
            VStack(alignment: .leading, spacing: Theme.Space.s) {
                SectionLabel(text: "What they noticed")
                ForEach(model.observedMoves, id: \.self) { move in
                    BulletRow(text: move, symbol: "eye", tint: Theme.Palette.inkMuted)
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
                        ForEach(feedback.rubricObservations) { RubricRow(observation: $0) }
                    }
                }
            }

            DisclosureCard(
                title: "Measured on device",
                subtitle: "Questions, talking time, turns",
                isExpanded: $showNumbers
            ) {
                ConversationMetricsGrid(metrics: model.metrics)
            }

            if let character = model.scenario.character {
                DisclosureCard(
                    title: "Who you were actually talking to",
                    subtitle: "Revealed after the fact",
                    isExpanded: $showBrief
                ) {
                    CharacterRevealView(character: character)
                }
            }

            DisclosureCard(
                title: "Full transcript",
                subtitle: "\(model.turns.count) turns",
                isExpanded: $showTranscript
            ) {
                VStack(alignment: .leading, spacing: Theme.Space.m) {
                    ForEach(model.turns) { turn in
                        ConversationTurnRow(
                            turn: turn,
                            characterName: model.scenario.character?.name ?? "Them"
                        )
                    }
                }
            }
        }
    }
}

/// The hidden brief, shown only in the debrief.
struct CharacterRevealView: View {
    let character: CharacterBrief

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.Space.m) {
            revealRow("Who", character.name + " — " + character.role)
            revealRow("How they felt", character.emotionalState)
            revealRow("What they actually wanted", character.hiddenGoal)
            revealRow("Their real concern", character.objection)
            Text("You weren't shown any of this beforehand. Compare it to what you assumed.")
                .font(Theme.Font.caption(11))
                .foregroundStyle(Theme.Palette.inkFaint)
        }
    }

    private func revealRow(_ label: String, _ value: String) -> some View {
        VStack(alignment: .leading, spacing: 3) {
            SectionLabel(text: label)
            Text(value)
                .font(Theme.Font.body(15))
                .foregroundStyle(Theme.Palette.ink)
                .lineSpacing(3)
        }
    }
}

struct ConversationMetricsGrid: View {
    let metrics: ConversationMetrics

    private var columns: [GridItem] {
        [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())]
    }

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.Space.m) {
            LazyVGrid(columns: columns, alignment: .leading, spacing: Theme.Space.m) {
                StatTile(
                    value: "\(Int((metrics.userTalkShare * 100).rounded()))%",
                    label: "Your talking time",
                    caption: "estimate",
                    tint: metrics.userTalkShare > 0.62 ? Theme.Palette.caution : Theme.Palette.ink
                )
                StatTile(value: "\(metrics.openQuestionCount)", label: "Open questions")
                StatTile(value: "\(metrics.closedQuestionCount)", label: "Closed questions")
                StatTile(value: "\(metrics.acknowledgmentCount)", label: "Acknowledgments")
                StatTile(value: "\(metrics.userTurnCount)", label: "Your turns")
                StatTile(
                    value: "\(Int(metrics.averageUserTurnWords.rounded()))",
                    label: "Words per turn",
                    caption: "longest \(metrics.longestUserTurnWords)"
                )
            }

            if metrics.stackedQuestionTurns > 0 {
                Text("\(metrics.stackedQuestionTurns) turn\(metrics.stackedQuestionTurns == 1 ? "" : "s") contained more than one question.")
                    .font(Theme.Font.body(13))
                    .foregroundStyle(Theme.Palette.inkMuted)
            }

            Text("Interruptions aren't measured — turns are taken one at a time here, so you couldn't talk over them. Their speaking time is estimated from word count.")
                .font(Theme.Font.caption(11))
                .foregroundStyle(Theme.Palette.inkFaint)
        }
    }
}

struct ConversationComparisonView: View {

    @ObservedObject var model: ConversationViewModel

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Theme.Space.l) {
                if let comparison = model.comparison {
                    HStack(spacing: Theme.Space.s) {
                        Image(systemName: comparison.countsAsImprovement ? "checkmark.seal.fill" : "circle.dashed")
                            .font(.system(size: 26))
                            .foregroundStyle(comparison.countsAsImprovement ? Theme.Palette.positive : Theme.Palette.caution)
                        Text(comparison.countsAsImprovement ? "The target moved" : "The target didn't move yet")
                            .font(Theme.Font.title(22))
                            .foregroundStyle(Theme.Palette.ink)
                    }

                    Text(comparison.summary)
                        .font(Theme.Font.body(16))
                        .foregroundStyle(Theme.Palette.inkMuted)
                        .lineSpacing(3)

                    AttemptQuoteCard(
                        label: "First conversation",
                        quote: comparison.evidenceBefore,
                        tint: Theme.Palette.inkMuted
                    )
                    AttemptQuoteCard(
                        label: "Second conversation",
                        quote: comparison.evidenceAfter,
                        tint: comparison.countsAsImprovement ? Theme.Palette.positive : Theme.Palette.accent
                    )

                    if !comparison.whatChanged.isEmpty {
                        Card {
                            VStack(alignment: .leading, spacing: Theme.Space.s) {
                                SectionLabel(text: "What changed", accent: Theme.Palette.positive)
                                ForEach(comparison.whatChanged, id: \.self) {
                                    BulletRow(text: $0, symbol: "arrow.up.right", tint: Theme.Palette.positive)
                                }
                            }
                        }
                    }
                }
            }
            .padding(Theme.Space.l)
            .padding(.bottom, 100)
        }
        .safeAreaInset(edge: .bottom) {
            PrimaryButton(title: "Continue", systemImage: "arrow.right") {
                model.continueFromComparison()
            }
            .padding(Theme.Space.l)
            .background(.ultraThinMaterial)
        }
    }
}

struct ConversationSummaryView: View {

    @ObservedObject var model: ConversationViewModel
    let onDone: () -> Void

    var body: some View {
        ScrollView {
            VStack(spacing: Theme.Space.l) {
                VStack(spacing: Theme.Space.s) {
                    Image(systemName: "bubble.left.and.bubble.right.fill")
                        .font(.system(size: 38))
                        .foregroundStyle(Theme.Palette.accent)
                    Text("Conversation complete")
                        .font(Theme.Font.display(26))
                        .foregroundStyle(Theme.Palette.ink)
                    Text(model.scenario.title)
                        .font(Theme.Font.caption())
                        .foregroundStyle(Theme.Palette.inkMuted)
                }
                .frame(maxWidth: .infinity)
                .padding(.top, Theme.Space.l)

                if let rewards = model.rewards {
                    Card {
                        VStack(alignment: .leading, spacing: Theme.Space.m) {
                            HStack {
                                SectionLabel(text: "Experience earned")
                                Spacer()
                                Text("+\(rewards.totalXP)")
                                    .font(Theme.Font.metric(26))
                                    .foregroundStyle(Theme.Palette.accent)
                            }
                            ForEach(rewards.lines) { line in
                                HStack {
                                    Text(line.label)
                                        .font(Theme.Font.body(14))
                                        .foregroundStyle(Theme.Palette.inkMuted)
                                    Spacer()
                                    Text("+\(line.xp)")
                                        .font(Theme.Font.caption(13))
                                        .foregroundStyle(Theme.Palette.ink)
                                }
                            }
                        }
                    }

                    if let nugget = rewards.unlockedNugget {
                        GoldenNuggetCard(nugget: nugget, isNew: true)
                    }
                }

                if model.shouldAskAnxiety {
                    Card {
                        VStack(alignment: .leading, spacing: Theme.Space.m) {
                            SectionLabel(text: "How do you feel now?")
                            AnxietyScale(value: $model.anxietyAfter)
                        }
                    }
                }
            }
            .padding(Theme.Space.l)
            .padding(.bottom, 100)
        }
        .safeAreaInset(edge: .bottom) {
            PrimaryButton(title: "Done", systemImage: "checkmark") { onDone() }
                .padding(Theme.Space.l)
                .background(.ultraThinMaterial)
        }
    }
}
