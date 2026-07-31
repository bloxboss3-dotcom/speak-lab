import Foundation

/// Rule-based coaching that runs entirely on device.
///
/// This is not a stand-in for the model — it is the app's floor. When there is
/// no network, no proxy configured, or the model call fails, the learner still
/// gets a specific, evidenced target rather than a spinner and an apology.
/// Every observation it makes is derived from a number it can point at.
public enum LocalFeedbackEngine {

    // Thresholds are named so the reasoning is legible at the call site.
    private enum Limits {
        static let highFillerRate = 3.0          // per 100 words
        static let fastPace = 185.0              // wpm
        static let slowPace = 105.0              // wpm
        static let monotonePaceVariation = 0.08
        static let longSentenceWords = 42
        // An opening sentence past ~30 words has almost certainly buried the point.
        static let longOpeningWords = 32
        static let heavyRepetitionCount = 3
        static let dominatingTalkShare = 0.62
    }

    // MARK: - Speaking

    public static func feedback(
        scenario: Scenario,
        skill: MicroSkill,
        transcript: String,
        metrics: SpeakingMetrics
    ) -> CoachFeedback {
        let strengths = speakingStrengths(metrics: metrics, scenario: scenario)
        let finding = speakingFinding(scenario: scenario, skill: skill, metrics: metrics)

        return CoachFeedback(
            scenarioOutcome: outcomeLine(scenario: scenario, metrics: metrics),
            strengths: strengths,
            primaryTarget: finding.target,
            evidenceQuote: finding.quote,
            explanation: finding.explanation,
            retryInstruction: finding.retryInstruction,
            optionalGoldenNugget: NuggetLibrary.suggest(forSkill: finding.skillID, alreadySeen: []),
            rubricObservations: speakingRubric(metrics: metrics, scenario: scenario),
            safetyFlags: [],
            transferScenario: nil,
            targetSkillID: finding.skillID
        )
    }

    private struct Finding {
        let target: String
        let quote: String
        let explanation: String
        let retryInstruction: String
        let skillID: String
    }

    private static func speakingFinding(
        scenario: Scenario,
        skill: MicroSkill,
        metrics: SpeakingMetrics
    ) -> Finding {
        // Ordered by how much the problem damages the listener's experience.
        if let limit = metrics.timeLimit, metrics.withinTimeLimit == false {
            let over = Int((metrics.totalDuration - limit).rounded())
            return Finding(
                target: "Finish inside the time you were given",
                quote: lastSentenceText(metrics) ,
                explanation: "You ran \(over) seconds past the \(Int(limit))-second limit. In this scenario the limit is not arbitrary — the room empties. Everything after the limit was said to fewer people than everything before it.",
                retryInstruction: "Cut one whole section before you start, and stop at \(Int(limit)) seconds even if you have more to say.",
                skillID: "cut-the-runway"
            )
        }

        if metrics.fillerRate >= Limits.highFillerRate, metrics.fillerCount >= 4 {
            let top = metrics.fillers.first
            let detail = top.map { "\"\($0.token)\" appeared \($0.count) times" } ?? "fillers appeared throughout"
            return Finding(
                target: "Replace filler words with silence",
                quote: sentenceWithMostFillers(metrics),
                explanation: "\(detail), which is \(String(format: "%.1f", metrics.fillerRate)) per 100 words. Fillers do not make the pause shorter — they make it audible. A closed mouth reads as thinking; \"um\" reads as searching.",
                retryInstruction: "Every time you reach for a filler, close your mouth and count one instead.",
                skillID: "deliberate-pause"
            )
        }

        if let opening = metrics.sentences.first, opening.wordCount >= Limits.longOpeningWords {
            return Finding(
                target: "Get to the point in your first sentence",
                quote: opening.text,
                explanation: "Your opening sentence ran \(opening.wordCount) words and took \(Int((opening.end - opening.start).rounded())) seconds before it finished. Attention is highest in the first few seconds and you spent it on setup.",
                retryInstruction: "Say the single most important sentence first. Context comes second.",
                skillID: "bottom-line-first"
            )
        }

        if metrics.wordsPerMinute >= Limits.fastPace, metrics.wordCount > 40 {
            return Finding(
                target: "Slow down enough to be followed",
                quote: longestSentenceText(metrics),
                explanation: "You averaged \(Int(metrics.wordsPerMinute.rounded())) words per minute. Comfortable listening sits nearer \(Int(Thresholds.comfortablePaceRange.lowerBound))–\(Int(Thresholds.comfortablePaceRange.upperBound)). At this speed a listener who misses one sentence cannot catch back up.",
                retryInstruction: "Deliberately pause for one second at every full stop.",
                skillID: "deliberate-pause"
            )
        }

        if let repeated = metrics.repeatedPhrases.first, repeated.count >= Limits.heavyRepetitionCount {
            return Finding(
                target: "Vary the phrase you keep returning to",
                quote: sentenceContaining(repeated.phrase, in: metrics) ?? repeated.phrase,
                explanation: "\"\(repeated.phrase)\" appeared \(repeated.count) times. Repetition that isn't deliberate reads as a verbal habit rather than emphasis, and it makes the surrounding material sound less considered.",
                retryInstruction: "Say \"\(repeated.phrase)\" at most once.",
                skillID: "plain-words"
            )
        }

        if metrics.longestSentenceWordCount >= Limits.longSentenceWords {
            return Finding(
                target: "Break long sentences into separate ideas",
                quote: longestSentenceText(metrics),
                explanation: "Your longest sentence ran \(metrics.longestSentenceWordCount) words. A listener has to hold every clause in memory until the sentence resolves — and most of them stop trying before it does.",
                retryInstruction: "One idea per sentence. Full stop, breathe, next idea.",
                skillID: "one-idea-per-sentence"
            )
        }

        if metrics.paceVariation <= Limits.monotonePaceVariation, metrics.totalDuration >= 40 {
            return Finding(
                target: "Change pace on the sentence that matters most",
                quote: longestSentenceText(metrics),
                explanation: "Measured pace stayed within a narrow band throughout (variation index \(String(format: "%.2f", metrics.paceVariation))). This is a timing measurement, not a judgement of your voice — but it does mean nothing in the delivery marked out which sentence was the important one.",
                retryInstruction: "Pick your one key sentence and say it noticeably slower than everything else.",
                skillID: "pace-shift"
            )
        }

        if metrics.wordsPerMinute > 0, metrics.wordsPerMinute <= Limits.slowPace, metrics.wordCount > 30 {
            return Finding(
                target: "Lift the pace so the energy carries",
                quote: firstSentenceText(metrics),
                explanation: "You averaged \(Int(metrics.wordsPerMinute.rounded())) words per minute, below the \(Int(Thresholds.comfortablePaceRange.lowerBound))–\(Int(Thresholds.comfortablePaceRange.upperBound)) comfortable range. At this speed listeners have spare capacity, and spare capacity is where minds wander.",
                retryInstruction: "Say it as if you only have half the time.",
                skillID: "land-the-line"
            )
        }

        // Nothing measurable stood out — fall back to the scenario's own skill.
        return Finding(
            target: skill.name,
            quote: firstSentenceText(metrics),
            explanation: "Nothing in the measurements stood out as a problem, which means the next gain is in the skill this scenario is built around. \(skill.whyItMatters)",
            retryInstruction: skill.retryCue,
            skillID: skill.id
        )
    }

    private static func speakingStrengths(metrics: SpeakingMetrics, scenario: Scenario) -> [String] {
        var strengths: [String] = []
        if metrics.withinTimeLimit == true, let limit = metrics.timeLimit {
            strengths.append("You finished in \(Int(metrics.totalDuration.rounded()))s, inside the \(Int(limit))s limit.")
        }
        if metrics.fillerCount == 0, metrics.wordCount > 25 {
            strengths.append("No filler words at all across \(metrics.wordCount) words.")
        } else if metrics.fillerRate < 1.5, metrics.wordCount > 40 {
            strengths.append("Filler rate stayed low at \(String(format: "%.1f", metrics.fillerRate)) per 100 words.")
        }
        if Thresholds.comfortablePaceRange.contains(metrics.wordsPerMinute) {
            strengths.append("Pace sat at \(Int(metrics.wordsPerMinute.rounded())) words per minute — comfortable to follow.")
        }
        if metrics.paceVariation > 0.15 {
            strengths.append("Your pace changed noticeably across the recording, which gives the listener signposts.")
        }
        if !metrics.longPauses.isEmpty, metrics.fillerRate < 2 {
            strengths.append("You used real pauses rather than filling them.")
        }
        if strengths.isEmpty {
            strengths.append("You recorded a complete attempt at \"\(scenario.title)\" — that is the rep that counts.")
        }
        return Array(strengths.prefix(3))
    }

    private static func speakingRubric(metrics: SpeakingMetrics, scenario: Scenario) -> [RubricObservation] {
        var observations: [RubricObservation] = []

        if let limit = metrics.timeLimit {
            observations.append(
                RubricObservation(
                    dimension: .concision,
                    rating: metrics.withinTimeLimit == true ? .strong : .needsWork,
                    observation: "\(Int(metrics.totalDuration.rounded()))s against a \(Int(limit))s limit."
                )
            )
        }

        if metrics.wordCount > 20 {
            let clarityRating: RubricRating
            if metrics.fillerRate < 1.5 && metrics.longestSentenceWordCount < 30 {
                clarityRating = .strong
            } else if metrics.fillerRate < 3.5 {
                clarityRating = .adequate
            } else {
                clarityRating = .needsWork
            }
            observations.append(
                RubricObservation(
                    dimension: .clarity,
                    rating: clarityRating,
                    observation: "\(metrics.fillerCount) fillers, longest sentence \(metrics.longestSentenceWordCount) words."
                )
            )
        }

        if let opening = metrics.sentences.first {
            observations.append(
                RubricObservation(
                    dimension: .opening,
                    rating: opening.wordCount <= 22 ? .strong : .needsWork,
                    observation: "Opening sentence was \(opening.wordCount) words."
                )
            )
        }

        observations.append(
            RubricObservation(
                dimension: .organization,
                rating: metrics.sentences.count >= 3 ? .adequate : .needsWork,
                observation: "\(metrics.sentences.count) sentences, average \(Int(metrics.averageSentenceWordCount.rounded())) words."
            )
        )

        return observations
    }

    private static func outcomeLine(scenario: Scenario, metrics: SpeakingMetrics) -> String {
        let length = Int(metrics.totalDuration.rounded())
        if metrics.wordCount == 0 {
            return "No speech was recognised in this recording."
        }
        return "You delivered \(metrics.wordCount) words in \(length) seconds for \"\(scenario.title)\"."
    }

    // MARK: - Conversation

    public static func conversationFeedback(
        scenario: Scenario,
        skill: MicroSkill,
        metrics: ConversationMetrics,
        turns: [ConversationTurn]
    ) -> CoachFeedback {
        let finding = conversationFinding(skill: skill, metrics: metrics, turns: turns)
        var strengths: [String] = []

        if metrics.openQuestionCount > 0 {
            strengths.append("You asked \(metrics.openQuestionCount) open question\(metrics.openQuestionCount == 1 ? "" : "s") — the kind that produce new information.")
        }
        if metrics.acknowledgmentCount > 0 {
            strengths.append("You acknowledged what they said \(metrics.acknowledgmentCount) time\(metrics.acknowledgmentCount == 1 ? "" : "s") before responding.")
        }
        if metrics.userTalkShare < 0.5, metrics.turnCount >= 4 {
            strengths.append("You held your share of talking time to \(Int((metrics.userTalkShare * 100).rounded()))%, which left room for them.")
        }
        if strengths.isEmpty {
            strengths.append("You stayed in the conversation for \(metrics.turnCount) turns rather than closing it down early.")
        }

        return CoachFeedback(
            scenarioOutcome: "The conversation ran \(metrics.turnCount) turns; you spoke for about \(Int(metrics.userSpeakingSeconds.rounded())) seconds.",
            strengths: Array(strengths.prefix(3)),
            primaryTarget: finding.target,
            evidenceQuote: finding.quote,
            explanation: finding.explanation,
            retryInstruction: finding.retryInstruction,
            optionalGoldenNugget: NuggetLibrary.suggest(forSkill: finding.skillID, alreadySeen: []),
            rubricObservations: conversationRubric(metrics: metrics),
            safetyFlags: [],
            transferScenario: nil,
            targetSkillID: finding.skillID
        )
    }

    private static func conversationFinding(
        skill: MicroSkill,
        metrics: ConversationMetrics,
        turns: [ConversationTurn]
    ) -> Finding {
        let firstUserTurn = turns.first { $0.speaker == .user }?.text ?? ""
        let longestUserTurn = turns
            .filter { $0.speaker == .user }
            .max { $0.text.count < $1.text.count }?.text ?? firstUserTurn

        if metrics.openQuestionCount == 0, metrics.userTurnCount >= 2 {
            return Finding(
                target: "Ask one genuinely open question",
                quote: firstUserTurn,
                explanation: "Across \(metrics.userTurnCount) turns you asked \(metrics.closedQuestionCount) closed question\(metrics.closedQuestionCount == 1 ? "" : "s") and no open ones. Closed questions confirm what you already believe; open ones tell you the thing you were missing.",
                retryInstruction: "Ask one question starting with \"what\" or \"how\", then stop talking.",
                skillID: "open-question"
            )
        }

        if metrics.userTalkShare >= Limits.dominatingTalkShare, metrics.turnCount >= 4 {
            return Finding(
                target: "Take up less of the conversation",
                quote: longestUserTurn,
                explanation: "You accounted for about \(Int((metrics.userTalkShare * 100).rounded()))% of the talking time. In a conversation whose purpose is finding out what they want, that ratio means you were explaining when you could have been learning.",
                retryInstruction: "Keep every turn under three sentences, and end at least two of them with a question.",
                skillID: "hold-the-silence"
            )
        }

        if metrics.stackedQuestionTurns > 0 {
            return Finding(
                target: "Ask one question at a time",
                quote: longestUserTurn,
                explanation: "\(metrics.stackedQuestionTurns) of your turns contained more than one question. People answer the easiest one and quietly drop the rest — usually the one you actually needed.",
                retryInstruction: "One question per turn. Say nothing after the question mark.",
                skillID: "one-question-at-a-time"
            )
        }

        if metrics.acknowledgmentCount == 0, metrics.userTurnCount >= 3 {
            return Finding(
                target: "Acknowledge before you answer",
                quote: longestUserTurn,
                explanation: "No acknowledging phrase appeared in any of your turns. An answer that arrives before the other person feels heard is received as a rebuttal, however good the answer is.",
                retryInstruction: "Before your next answer, say their concern back to them in your own words.",
                skillID: "acknowledge-before-answer"
            )
        }

        return Finding(
            target: skill.name,
            quote: longestUserTurn,
            explanation: "The measurable patterns look healthy, so the next gain is in the skill this scenario is built around. \(skill.whyItMatters)",
            retryInstruction: skill.retryCue,
            skillID: skill.id
        )
    }

    private static func conversationRubric(metrics: ConversationMetrics) -> [RubricObservation] {
        var observations: [RubricObservation] = []

        observations.append(
            RubricObservation(
                dimension: .questionQuality,
                rating: metrics.openQuestionCount >= 2 ? .strong : (metrics.openQuestionCount == 1 ? .adequate : .needsWork),
                observation: "\(metrics.openQuestionCount) open, \(metrics.closedQuestionCount) closed, \(metrics.clarifyingQuestionCount) clarifying."
            )
        )

        observations.append(
            RubricObservation(
                dimension: .listeningAndAcknowledgment,
                rating: metrics.acknowledgmentCount >= 2 ? .strong : (metrics.acknowledgmentCount == 1 ? .adequate : .needsWork),
                observation: "\(metrics.acknowledgmentCount) acknowledging phrases detected; you held \(Int((metrics.userTalkShare * 100).rounded()))% of talking time."
            )
        )

        observations.append(
            RubricObservation(
                dimension: .concision,
                rating: metrics.averageUserTurnWords <= 45 ? .strong : .needsWork,
                observation: "Average turn \(Int(metrics.averageUserTurnWords.rounded())) words, longest \(metrics.longestUserTurnWords)."
            )
        )

        return observations
    }

    // MARK: - Comparison

    /// Compares two attempts without a model, using only measured change.
    ///
    /// It is deliberately conservative: when it cannot tell whether the target
    /// behaviour moved, it says so rather than guessing, because a false
    /// "improved!" is the single most damaging thing this app could tell someone.
    public static func compare(
        target: String,
        targetSkillID: String?,
        first: SpeakingMetrics,
        second: SpeakingMetrics
    ) -> AttemptComparison {
        var changed: [String] = []
        var unchanged: [String] = []

        let fillerDelta = first.fillerCount - second.fillerCount
        if abs(fillerDelta) >= 2 {
            changed.append(fillerDelta > 0
                ? "Filler words dropped from \(first.fillerCount) to \(second.fillerCount)."
                : "Filler words rose from \(first.fillerCount) to \(second.fillerCount).")
        } else {
            unchanged.append("Filler count was essentially the same (\(first.fillerCount) then \(second.fillerCount)).")
        }

        let durationDelta = first.totalDuration - second.totalDuration
        if abs(durationDelta) >= 5 {
            changed.append("Length changed by \(Int(abs(durationDelta).rounded()))s (\(Int(first.totalDuration.rounded()))s then \(Int(second.totalDuration.rounded()))s).")
        }

        if let firstOpening = first.sentences.first, let secondOpening = second.sentences.first {
            let delta = firstOpening.wordCount - secondOpening.wordCount
            if abs(delta) >= 6 {
                changed.append("Opening sentence went from \(firstOpening.wordCount) to \(secondOpening.wordCount) words.")
            } else {
                unchanged.append("The opening was about the same length both times.")
            }
        }

        if abs(first.wordsPerMinute - second.wordsPerMinute) >= 15 {
            changed.append("Pace moved from \(Int(first.wordsPerMinute.rounded())) to \(Int(second.wordsPerMinute.rounded())) words per minute.")
        }

        let improved = improvementHeuristic(targetSkillID: targetSkillID, first: first, second: second)

        return AttemptComparison(
            targetImproved: improved,
            changeWasSuperficial: !improved && !changed.isEmpty,
            summary: improved
                ? "The measurements moved in the direction of your target."
                : "The measurements do not show a clear change in the behaviour you were targeting.",
            evidenceBefore: first.sentences.first?.text ?? "",
            evidenceAfter: second.sentences.first?.text ?? "",
            whatChanged: changed,
            whatDidNotChange: unchanged,
            nextStep: improved
                ? "Take the same skill into a harder version of the scenario."
                : "Run it once more, holding only the one instruction in mind."
        )
    }

    /// Maps a target skill onto the measurement that would move if the learner
    /// actually did the thing. Anything unmapped returns false rather than
    /// guessing — an unearned "improved" is worse than a cautious "not shown".
    private static func improvementHeuristic(
        targetSkillID: String?,
        first: SpeakingMetrics,
        second: SpeakingMetrics
    ) -> Bool {
        switch targetSkillID {
        case "deliberate-pause":
            return second.fillerRate < first.fillerRate - 0.5
        case "cut-the-runway", "bottom-line-first":
            guard let a = first.sentences.first, let b = second.sentences.first else { return false }
            return b.wordCount < a.wordCount - 4
        case "one-idea-per-sentence":
            return second.longestSentenceWordCount < first.longestSentenceWordCount - 5
        case "pace-shift":
            return second.paceVariation > first.paceVariation + 0.04
        case "land-the-line":
            return second.wordsPerMinute > first.wordsPerMinute + 10
        case "plain-words":
            return second.repeatedPhrases.count < first.repeatedPhrases.count
        default:
            if let limit = first.timeLimit, first.withinTimeLimit == false {
                return second.totalDuration <= limit + 0.5
            }
            return false
        }
    }

    // MARK: - Small text helpers

    private static func firstSentenceText(_ metrics: SpeakingMetrics) -> String {
        metrics.sentences.first?.text ?? ""
    }

    private static func lastSentenceText(_ metrics: SpeakingMetrics) -> String {
        metrics.sentences.last?.text ?? ""
    }

    private static func longestSentenceText(_ metrics: SpeakingMetrics) -> String {
        metrics.sentences.max { $0.wordCount < $1.wordCount }?.text ?? firstSentenceText(metrics)
    }

    private static func sentenceWithMostFillers(_ metrics: SpeakingMetrics) -> String {
        var best: (text: String, count: Int)?
        for sentence in metrics.sentences {
            let tokens = SpeechMetricsCalculator.normalizedTokens(in: sentence.text)
            let count = tokens.filter { FillerLexicon.hardFillers.contains($0) }.count
            if count > (best?.count ?? 0) { best = (sentence.text, count) }
        }
        return best?.text ?? firstSentenceText(metrics)
    }

    private static func sentenceContaining(_ phrase: String, in metrics: SpeakingMetrics) -> String? {
        let needle = SpeechMetricsCalculator.normalizedTokens(in: phrase)
        guard !needle.isEmpty else { return nil }
        for sentence in metrics.sentences {
            let tokens = SpeechMetricsCalculator.normalizedTokens(in: sentence.text)
            guard tokens.count >= needle.count else { continue }
            for index in 0...(tokens.count - needle.count) where Array(tokens[index..<(index + needle.count)]) == needle {
                return sentence.text
            }
        }
        return nil
    }
}
