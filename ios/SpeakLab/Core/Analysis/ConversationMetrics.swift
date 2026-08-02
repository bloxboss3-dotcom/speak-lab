import Foundation

public enum ConversationSpeaker: String, Codable, Hashable, Sendable {
    case user
    case character
}

public struct ConversationTurn: Codable, Hashable, Sendable, Identifiable {
    public let id: String
    public let speaker: ConversationSpeaker
    public let text: String
    /// Measured for the learner (we recorded it). For the simulated character
    /// this is an estimate from word count, and `durationIsEstimated` says so.
    public let duration: TimeInterval
    public let durationIsEstimated: Bool
    public let segments: [SpeechSegment]

    public init(
        id: String = UUID().uuidString,
        speaker: ConversationSpeaker,
        text: String,
        duration: TimeInterval,
        durationIsEstimated: Bool,
        segments: [SpeechSegment] = []
    ) {
        self.id = id
        self.speaker = speaker
        self.text = text
        self.duration = duration
        self.durationIsEstimated = durationIsEstimated
        self.segments = segments
    }

    /// Estimates how long a synthesised line takes to speak.
    public static func estimatedDuration(forWordCount words: Int) -> TimeInterval {
        // AVSpeechSynthesizer at the default rate lands near 150 wpm.
        guard words > 0 else { return 0 }
        return Double(words) / 150.0 * 60.0
    }
}

public enum QuestionKind: String, Codable, Hashable, Sendable, CaseIterable {
    /// Cannot be answered yes/no — the kind that produces new information.
    case open
    /// Yes/no or forced-choice.
    case closed
    /// Checks understanding: "so you're saying…?"
    case clarifying

    public var displayName: String {
        switch self {
        case .open: return "Open"
        case .closed: return "Closed"
        case .clarifying: return "Clarifying"
        }
    }
}

public struct DetectedQuestion: Codable, Hashable, Sendable {
    public let text: String
    public let kind: QuestionKind
    /// Index of the turn it appeared in, so the UI can jump to it.
    public let turnIndex: Int

    public init(text: String, kind: QuestionKind, turnIndex: Int) {
        self.text = text
        self.kind = kind
        self.turnIndex = turnIndex
    }
}

/// Objective measures for a simulated conversation.
public struct ConversationMetrics: Codable, Hashable, Sendable {
    public let turnCount: Int
    public let userTurnCount: Int
    public let characterTurnCount: Int

    public let userSpeakingSeconds: TimeInterval
    /// Estimated from the character's word count, never measured.
    public let characterSpeakingSecondsEstimated: TimeInterval
    /// 0…1. Above ~0.65 in a discovery conversation usually means the learner
    /// talked when they should have been listening.
    public let userTalkShare: Double

    public let questions: [DetectedQuestion]
    public let openQuestionCount: Int
    public let closedQuestionCount: Int
    public let clarifyingQuestionCount: Int
    /// Turns containing more than one question — the "stacked question" habit.
    public let stackedQuestionTurns: Int

    public let acknowledgmentCount: Int
    public let averageUserTurnWords: Double
    public let longestUserTurnWords: Int

    /// Always false in this app: turns are push-to-talk, so the learner
    /// physically cannot speak over the character. Reporting an interruption
    /// count here would be inventing data.
    public let interruptionsMeasurable: Bool

    /// Aggregate delivery metrics across everything the learner said.
    public let userSpeech: SpeakingMetrics

    public init(
        turnCount: Int,
        userTurnCount: Int,
        characterTurnCount: Int,
        userSpeakingSeconds: TimeInterval,
        characterSpeakingSecondsEstimated: TimeInterval,
        userTalkShare: Double,
        questions: [DetectedQuestion],
        openQuestionCount: Int,
        closedQuestionCount: Int,
        clarifyingQuestionCount: Int,
        stackedQuestionTurns: Int,
        acknowledgmentCount: Int,
        averageUserTurnWords: Double,
        longestUserTurnWords: Int,
        interruptionsMeasurable: Bool,
        userSpeech: SpeakingMetrics
    ) {
        self.turnCount = turnCount
        self.userTurnCount = userTurnCount
        self.characterTurnCount = characterTurnCount
        self.userSpeakingSeconds = userSpeakingSeconds
        self.characterSpeakingSecondsEstimated = characterSpeakingSecondsEstimated
        self.userTalkShare = userTalkShare
        self.questions = questions
        self.openQuestionCount = openQuestionCount
        self.closedQuestionCount = closedQuestionCount
        self.clarifyingQuestionCount = clarifyingQuestionCount
        self.stackedQuestionTurns = stackedQuestionTurns
        self.acknowledgmentCount = acknowledgmentCount
        self.averageUserTurnWords = averageUserTurnWords
        self.longestUserTurnWords = longestUserTurnWords
        self.interruptionsMeasurable = interruptionsMeasurable
        self.userSpeech = userSpeech
    }
}

public enum ConversationMetricsCalculator {

    private static let openStarters: Set<String> = [
        "what", "how", "why", "describe", "tell", "walk", "when", "where", "which"
    ]

    private static let closedStarters: Set<String> = [
        "is", "are", "was", "were", "do", "does", "did", "can", "could", "will",
        "would", "have", "has", "had", "should", "shall", "may", "might", "am"
    ]

    private static let clarifyingOpeners: [[String]] = [
        ["so", "you're", "saying"],
        ["so", "you", "are", "saying"],
        ["if", "i've", "got", "that", "right"],
        ["have", "i", "got", "that"],
        ["let", "me", "make", "sure"],
        ["so", "it's", "less", "about"],
        ["do", "you", "mean"],
        ["am", "i", "right", "in", "thinking"],
        ["just", "to", "check"]
    ]

    private static let acknowledgmentPhrases: [[String]] = [
        ["that", "makes", "sense"],
        ["that's", "fair"],
        ["i", "hear", "you"],
        ["i", "can", "see", "why"],
        ["that's", "a", "real"],
        ["i", "understand"],
        ["you're", "right"],
        ["fair", "enough"],
        ["i", "get", "that"],
        ["thanks", "for", "telling", "me"],
        ["that", "sounds", "hard"],
        ["i", "appreciate", "you"]
    ]

    public static func metrics(for turns: [ConversationTurn]) -> ConversationMetrics {
        let userTurns = turns.filter { $0.speaker == .user }
        let characterTurns = turns.filter { $0.speaker == .character }

        let userSeconds = userTurns.reduce(0) { $0 + $1.duration }
        let characterSeconds = characterTurns.reduce(0) { $0 + $1.duration }
        let totalSeconds = userSeconds + characterSeconds
        let share = totalSeconds > 0 ? userSeconds / totalSeconds : 0

        var questions: [DetectedQuestion] = []
        var stacked = 0
        var acknowledgments = 0

        for (index, turn) in turns.enumerated() where turn.speaker == .user {
            let found = detectQuestions(in: turn.text, turnIndex: index)
            if found.count > 1 { stacked += 1 }
            questions.append(contentsOf: found)
            acknowledgments += countAcknowledgments(in: turn.text)
        }

        let userWordCounts = userTurns.map { SpeechMetricsCalculator.normalizedTokens(in: $0.text).count }
        let averageWords = userWordCounts.isEmpty
            ? 0
            : Double(userWordCounts.reduce(0, +)) / Double(userWordCounts.count)

        return ConversationMetrics(
            turnCount: turns.count,
            userTurnCount: userTurns.count,
            characterTurnCount: characterTurns.count,
            userSpeakingSeconds: userSeconds,
            characterSpeakingSecondsEstimated: characterSeconds,
            userTalkShare: share,
            questions: questions,
            openQuestionCount: questions.filter { $0.kind == .open }.count,
            closedQuestionCount: questions.filter { $0.kind == .closed }.count,
            clarifyingQuestionCount: questions.filter { $0.kind == .clarifying }.count,
            stackedQuestionTurns: stacked,
            acknowledgmentCount: acknowledgments,
            averageUserTurnWords: averageWords,
            longestUserTurnWords: userWordCounts.max() ?? 0,
            interruptionsMeasurable: false,
            userSpeech: aggregateUserSpeech(userTurns)
        )
    }

    /// Combines every user turn into one delivery profile.
    ///
    /// Segment timings are rebased so each turn follows the previous one, which
    /// keeps pace analysis meaningful without pretending the character's
    /// speaking time was silence from the learner.
    private static func aggregateUserSpeech(_ userTurns: [ConversationTurn]) -> SpeakingMetrics {
        var segments: [SpeechSegment] = []
        var offset: TimeInterval = 0
        var transcriptPieces: [String] = []

        for turn in userTurns {
            for segment in turn.segments {
                segments.append(
                    SpeechSegment(
                        text: segment.text,
                        start: segment.start + offset,
                        duration: segment.duration
                    )
                )
            }
            transcriptPieces.append(turn.text)
            offset += turn.duration
        }

        return SpeechMetricsCalculator.metrics(
            for: SpeechAnalysisInput(
                transcript: transcriptPieces.joined(separator: " "),
                segments: segments,
                totalDuration: offset,
                timeLimit: nil
            )
        )
    }

    // MARK: - Question detection

    /// Splits a turn into sentences and classifies the interrogative ones.
    ///
    /// Transcription does not always produce a question mark, so a sentence
    /// that opens with an interrogative word is treated as a question too.
    public static func detectQuestions(in text: String, turnIndex: Int) -> [DetectedQuestion] {
        var results: [DetectedQuestion] = []
        for sentence in splitSentences(text) {
            let tokens = SpeechMetricsCalculator.normalizedTokens(in: sentence)
            guard let first = tokens.first else { continue }
            let hasMark = sentence.contains("?")
            let startsInterrogative = openStarters.contains(first) || closedStarters.contains(first)
            guard hasMark || startsInterrogative else { continue }

            let kind: QuestionKind
            if matchesAnyPrefix(tokens, clarifyingOpeners) {
                kind = .clarifying
            } else if openStarters.contains(first) {
                // "tell me about…" and "walk me through…" behave as open questions.
                kind = .open
            } else if closedStarters.contains(first) {
                kind = .closed
            } else {
                kind = .closed
            }
            results.append(
                DetectedQuestion(
                    text: sentence.trimmingCharacters(in: .whitespacesAndNewlines),
                    kind: kind,
                    turnIndex: turnIndex
                )
            )
        }
        return results
    }

    private static func countAcknowledgments(in text: String) -> Int {
        let tokens = SpeechMetricsCalculator.normalizedTokens(in: text)
        var count = 0
        for phrase in acknowledgmentPhrases {
            guard phrase.count <= tokens.count else { continue }
            for index in 0...(tokens.count - phrase.count) {
                if Array(tokens[index..<(index + phrase.count)]) == phrase { count += 1 }
            }
        }
        return count
    }

    private static func matchesAnyPrefix(_ tokens: [String], _ prefixes: [[String]]) -> Bool {
        for prefix in prefixes where prefix.count <= tokens.count {
            if Array(tokens[0..<prefix.count]) == prefix { return true }
        }
        return false
    }

    public static func splitSentences(_ text: String) -> [String] {
        var sentences: [String] = []
        var current = ""
        for character in text {
            current.append(character)
            if character == "." || character == "!" || character == "?" {
                let trimmed = current.trimmingCharacters(in: .whitespacesAndNewlines)
                if !trimmed.isEmpty { sentences.append(trimmed) }
                current = ""
            }
        }
        let trimmed = current.trimmingCharacters(in: .whitespacesAndNewlines)
        if !trimmed.isEmpty { sentences.append(trimmed) }
        return sentences
    }
}
