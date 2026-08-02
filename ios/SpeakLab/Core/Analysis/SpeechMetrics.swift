import Foundation

/// One recognised chunk of speech with its position in the recording.
///
/// Produced on iOS from `SFTranscriptionSegment`. Kept as a plain value type so
/// the whole metrics pipeline can be exercised in tests without a microphone.
public struct SpeechSegment: Codable, Hashable, Sendable {
    public let text: String
    public let start: TimeInterval
    public let duration: TimeInterval

    public init(text: String, start: TimeInterval, duration: TimeInterval) {
        self.text = text
        self.start = start
        self.duration = duration
    }

    public var end: TimeInterval { start + duration }
}

/// A sentence reconstructed from segments, with timings.
///
/// This is what lets feedback say "your first point arrived at 0:24" and lets
/// the UI highlight the exact moment a quote came from.
public struct TimedSentence: Codable, Hashable, Sendable {
    public let text: String
    public let start: TimeInterval
    public let end: TimeInterval
    public let wordCount: Int

    public init(text: String, start: TimeInterval, end: TimeInterval, wordCount: Int) {
        self.text = text
        self.start = start
        self.end = end
        self.wordCount = wordCount
    }
}

public struct FillerHit: Codable, Hashable, Sendable {
    public let token: String
    public let count: Int

    public init(token: String, count: Int) {
        self.token = token
        self.count = count
    }
}

public struct RepeatedPhrase: Codable, Hashable, Sendable {
    public let phrase: String
    public let count: Int

    public init(phrase: String, count: Int) {
        self.phrase = phrase
        self.count = count
    }
}

public struct LongPause: Codable, Hashable, Sendable {
    public let start: TimeInterval
    public let duration: TimeInterval
    /// Word index in the transcript that the pause follows.
    public let afterWordIndex: Int

    public init(start: TimeInterval, duration: TimeInterval, afterWordIndex: Int) {
        self.start = start
        self.duration = duration
        self.afterWordIndex = afterWordIndex
    }
}

/// Everything measured locally from a recording, with no model involved.
///
/// Every field here is either counted from the transcript or derived from
/// recogniser timings. Nothing in this struct is an inference about the
/// speaker — that separation is deliberate and is preserved all the way to
/// the feedback screen.
public struct SpeakingMetrics: Codable, Hashable, Sendable {
    // Timing
    public let totalDuration: TimeInterval
    /// Duration minus pauses longer than `Thresholds.articulationPauseGap`.
    public let speakingDuration: TimeInterval
    public let leadingSilence: TimeInterval

    // Volume of speech
    public let wordCount: Int
    /// Words per minute over the whole recording, pauses included.
    public let wordsPerMinute: Double
    /// Words per minute while actually talking. Higher than `wordsPerMinute`.
    public let articulationRate: Double

    // Verbal habits
    public let fillers: [FillerHit]
    public let fillerCount: Int
    /// Fillers per 100 words — comparable across recordings of different lengths.
    public let fillerRate: Double
    /// Hedges are reported separately from fillers because "actually" and
    /// "just" are frequently legitimate words; calling them errors would be wrong.
    public let hedges: [FillerHit]
    public let hedgeCount: Int
    public let repeatedPhrases: [RepeatedPhrase]

    // Pausing and pace
    public let longPauses: [LongPause]
    public let longestPause: TimeInterval
    /// Standard deviation of windowed pace divided by mean pace. 0 = perfectly
    /// even delivery. Around 0.15+ indicates deliberate variation.
    public let paceVariation: Double
    public let slowestWindowWPM: Double
    public let fastestWindowWPM: Double

    // Structure
    public let sentences: [TimedSentence]
    public let averageSentenceWordCount: Double
    public let longestSentenceWordCount: Int

    // Constraint
    public let timeLimit: TimeInterval?
    public let withinTimeLimit: Bool?

    public init(
        totalDuration: TimeInterval,
        speakingDuration: TimeInterval,
        leadingSilence: TimeInterval,
        wordCount: Int,
        wordsPerMinute: Double,
        articulationRate: Double,
        fillers: [FillerHit],
        fillerCount: Int,
        fillerRate: Double,
        hedges: [FillerHit],
        hedgeCount: Int,
        repeatedPhrases: [RepeatedPhrase],
        longPauses: [LongPause],
        longestPause: TimeInterval,
        paceVariation: Double,
        slowestWindowWPM: Double,
        fastestWindowWPM: Double,
        sentences: [TimedSentence],
        averageSentenceWordCount: Double,
        longestSentenceWordCount: Int,
        timeLimit: TimeInterval?,
        withinTimeLimit: Bool?
    ) {
        self.totalDuration = totalDuration
        self.speakingDuration = speakingDuration
        self.leadingSilence = leadingSilence
        self.wordCount = wordCount
        self.wordsPerMinute = wordsPerMinute
        self.articulationRate = articulationRate
        self.fillers = fillers
        self.fillerCount = fillerCount
        self.fillerRate = fillerRate
        self.hedges = hedges
        self.hedgeCount = hedgeCount
        self.repeatedPhrases = repeatedPhrases
        self.longPauses = longPauses
        self.longestPause = longestPause
        self.paceVariation = paceVariation
        self.slowestWindowWPM = slowestWindowWPM
        self.fastestWindowWPM = fastestWindowWPM
        self.sentences = sentences
        self.averageSentenceWordCount = averageSentenceWordCount
        self.longestSentenceWordCount = longestSentenceWordCount
        self.timeLimit = timeLimit
        self.withinTimeLimit = withinTimeLimit
    }

    public static let empty = SpeakingMetrics(
        totalDuration: 0, speakingDuration: 0, leadingSilence: 0,
        wordCount: 0, wordsPerMinute: 0, articulationRate: 0,
        fillers: [], fillerCount: 0, fillerRate: 0,
        hedges: [], hedgeCount: 0, repeatedPhrases: [],
        longPauses: [], longestPause: 0,
        paceVariation: 0, slowestWindowWPM: 0, fastestWindowWPM: 0,
        sentences: [], averageSentenceWordCount: 0, longestSentenceWordCount: 0,
        timeLimit: nil, withinTimeLimit: nil
    )
}

/// Tunables for the metrics pipeline, kept in one place so they can be
/// adjusted (and tested) without hunting through the algorithms.
public enum Thresholds {
    /// A gap at least this long counts as a "long pause" worth reporting.
    public static let longPause: TimeInterval = 1.2
    /// Gaps above this are excluded when computing articulation rate.
    public static let articulationPauseGap: TimeInterval = 0.3
    /// A gap at least this long ends a sentence when punctuation is absent.
    public static let sentenceBreakPause: TimeInterval = 0.7
    /// Width of the window used for pace-variation analysis.
    public static let paceWindow: TimeInterval = 10
    /// Shortest n-gram considered for repetition.
    public static let minRepeatedPhraseWords = 3
    public static let maxRepeatedPhraseWords = 6
    /// Comfortable conversational range, used only for describing pace.
    public static let comfortablePaceRange: ClosedRange<Double> = 125...165
}

/// Words that are fillers in essentially every context.
public enum FillerLexicon {
    public static let hardFillers: Set<String> = [
        "um", "umm", "ummm", "uh", "uhh", "uhhh", "er", "erm", "ah", "ahh",
        "mm", "mmm", "hmm", "eh", "uhm"
    ]

    /// Multi-word fillers, matched as consecutive tokens.
    public static let fillerPhrases: [[String]] = [
        ["you", "know"],
        ["i", "mean"],
        ["sort", "of"],
        ["kind", "of"],
        ["you", "know", "what", "i", "mean"],
        ["and", "stuff"],
        ["or", "whatever"],
        ["if", "that", "makes", "sense"]
    ]

    /// Words that weaken a sentence when overused but are often legitimate.
    /// Reported separately and never called an error on their own.
    public static let hedges: Set<String> = [
        "just", "actually", "basically", "literally", "obviously", "really",
        "maybe", "probably", "somewhat", "quite", "perhaps"
    ]
}
