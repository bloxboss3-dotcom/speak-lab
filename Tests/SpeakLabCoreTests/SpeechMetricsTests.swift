import XCTest
@testable import SpeakLabCore

final class SpeechMetricsTests: XCTestCase {

    // MARK: - Helpers

    /// Builds segments at a steady rate so timing-derived metrics are predictable.
    private func segments(_ pieces: [(String, TimeInterval, TimeInterval)]) -> [SpeechSegment] {
        pieces.map { SpeechSegment(text: $0.0, start: $0.1, duration: $0.2) }
    }

    // MARK: - Word counting and pace

    func testWordsPerMinuteUsesTotalDuration() {
        let input = SpeechAnalysisInput(
            transcript: "one two three four five six seven eight nine ten",
            totalDuration: 30
        )
        let metrics = SpeechMetricsCalculator.metrics(for: input)

        XCTAssertEqual(metrics.wordCount, 10)
        XCTAssertEqual(metrics.wordsPerMinute, 20, accuracy: 0.01)
    }

    func testArticulationRateExcludesLongPauses() {
        // Ten words spread over 30s, but 20s of that is one silent gap.
        let input = SpeechAnalysisInput(
            transcript: "one two three four five six seven eight nine ten",
            segments: segments([
                ("one two three four five", 0, 5),
                ("six seven eight nine ten", 25, 5)
            ]),
            totalDuration: 30
        )
        let metrics = SpeechMetricsCalculator.metrics(for: input)

        XCTAssertEqual(metrics.wordsPerMinute, 20, accuracy: 0.01)
        // Speaking time is 10s once the 20s gap is removed.
        XCTAssertEqual(metrics.speakingDuration, 10, accuracy: 0.01)
        XCTAssertEqual(metrics.articulationRate, 60, accuracy: 0.01)
    }

    func testApostrophesKeepWordsIntact() {
        let tokens = SpeechMetricsCalculator.normalizedTokens(in: "Don't. It's Sam's — really.")
        XCTAssertEqual(tokens, ["don't", "it's", "sam's", "really"])
    }

    // MARK: - Fillers

    func testHardFillersAreCounted() {
        let input = SpeechAnalysisInput(
            transcript: "Um, so we are, uh, starting on Monday. Um, bring a friend.",
            totalDuration: 12
        )
        let metrics = SpeechMetricsCalculator.metrics(for: input)

        XCTAssertEqual(metrics.fillerCount, 3)
        XCTAssertEqual(metrics.fillers.first?.token, "um")
        XCTAssertEqual(metrics.fillers.first?.count, 2)
    }

    func testFillerPhrasesAreCountedAndDoNotDoubleCount() {
        // "you know what i mean" must not also register as "you know".
        let input = SpeechAnalysisInput(
            transcript: "It is, you know what I mean, a bit tricky. You know, quite tricky.",
            totalDuration: 10
        )
        let metrics = SpeechMetricsCalculator.metrics(for: input)

        let longPhrase = metrics.fillers.first { $0.token == "you know what i mean" }
        let shortPhrase = metrics.fillers.first { $0.token == "you know" }
        XCTAssertEqual(longPhrase?.count, 1)
        XCTAssertEqual(shortPhrase?.count, 1, "The standalone 'you know' should count once, not twice")
    }

    func testHedgesAreReportedSeparatelyFromFillers() {
        // "just" and "actually" are legitimate words; calling them errors would be wrong.
        let input = SpeechAnalysisInput(
            transcript: "I just actually think this is basically right.",
            totalDuration: 6
        )
        let metrics = SpeechMetricsCalculator.metrics(for: input)

        XCTAssertEqual(metrics.fillerCount, 0)
        XCTAssertEqual(metrics.hedgeCount, 3)
    }

    func testFillerRateIsPerHundredWords() {
        let words = Array(repeating: "word", count: 96).joined(separator: " ")
        let input = SpeechAnalysisInput(transcript: "um um um um " + words, totalDuration: 60)
        let metrics = SpeechMetricsCalculator.metrics(for: input)

        XCTAssertEqual(metrics.wordCount, 100)
        XCTAssertEqual(metrics.fillerRate, 4.0, accuracy: 0.001)
    }

    // MARK: - Repetition

    func testRepeatedPhrasesAreDetected() {
        let input = SpeechAnalysisInput(
            transcript: "at the end of the day it works. at the end of the day it works too.",
            totalDuration: 15
        )
        let metrics = SpeechMetricsCalculator.metrics(for: input)

        XCTAssertFalse(metrics.repeatedPhrases.isEmpty)
        let top = metrics.repeatedPhrases[0]
        XCTAssertTrue(top.phrase.contains("end of the day"))
        XCTAssertGreaterThanOrEqual(top.count, 2)
    }

    func testShorterPhraseSubsumedByLongerIsNotAlsoReported() {
        let input = SpeechAnalysisInput(
            transcript: "one two three four five one two three four five",
            totalDuration: 10
        )
        let metrics = SpeechMetricsCalculator.metrics(for: input)

        // "one two three" is inside "one two three four five" — only the longer survives.
        XCTAssertEqual(metrics.repeatedPhrases.count, 1)
        XCTAssertEqual(metrics.repeatedPhrases[0].phrase, "one two three four five")
    }

    func testNoRepetitionInShortDistinctSpeech() {
        let input = SpeechAnalysisInput(transcript: "hello there everyone", totalDuration: 3)
        XCTAssertTrue(SpeechMetricsCalculator.metrics(for: input).repeatedPhrases.isEmpty)
    }

    // MARK: - Pauses and sentences

    func testLongPausesDetectedBetweenSegments() {
        let input = SpeechAnalysisInput(
            transcript: "first part second part",
            segments: segments([
                ("first part", 0, 2),
                ("second part", 4.5, 2)
            ]),
            totalDuration: 6.5
        )
        let metrics = SpeechMetricsCalculator.metrics(for: input)

        XCTAssertEqual(metrics.longPauses.count, 1)
        XCTAssertEqual(metrics.longPauses[0].duration, 2.5, accuracy: 0.001)
        XCTAssertEqual(metrics.longestPause, 2.5, accuracy: 0.001)
    }

    func testShortGapsAreNotReportedAsLongPauses() {
        let input = SpeechAnalysisInput(
            transcript: "a b",
            segments: segments([("a", 0, 1), ("b", 1.4, 1)]),
            totalDuration: 2.4
        )
        XCTAssertTrue(SpeechMetricsCalculator.metrics(for: input).longPauses.isEmpty)
    }

    func testSentencesSplitOnPunctuation() {
        let input = SpeechAnalysisInput(
            transcript: "Buddy Week starts Monday. Bring one friend.",
            segments: segments([
                ("Buddy Week starts Monday.", 0, 3),
                ("Bring one friend.", 3.1, 2)
            ]),
            totalDuration: 5.1
        )
        let metrics = SpeechMetricsCalculator.metrics(for: input)

        XCTAssertEqual(metrics.sentences.count, 2)
        XCTAssertEqual(metrics.sentences[0].wordCount, 4)
        XCTAssertEqual(metrics.sentences[1].start, 3.1, accuracy: 0.001)
    }

    func testSentencesSplitOnLongPauseWhenPunctuationIsMissing() {
        let input = SpeechAnalysisInput(
            transcript: "buddy week starts monday bring one friend",
            segments: segments([
                ("buddy week starts monday", 0, 3),
                ("bring one friend", 4.0, 2)
            ]),
            totalDuration: 6
        )
        let metrics = SpeechMetricsCalculator.metrics(for: input)
        XCTAssertEqual(metrics.sentences.count, 2, "A 1s gap should end a sentence when punctuation is absent")
    }

    func testSentencesFallBackToProportionalTimingWithoutSegments() {
        let input = SpeechAnalysisInput(
            transcript: "One two three. Four five six.",
            totalDuration: 12
        )
        let metrics = SpeechMetricsCalculator.metrics(for: input)

        XCTAssertEqual(metrics.sentences.count, 2)
        XCTAssertEqual(metrics.sentences[0].start, 0, accuracy: 0.001)
        XCTAssertEqual(metrics.sentences[1].start, 6, accuracy: 0.01)
    }

    // MARK: - Pace variation

    func testEvenDeliveryProducesLowPaceVariation() {
        // Five words every 10s for 40s: perfectly flat.
        var pieces: [(String, TimeInterval, TimeInterval)] = []
        for window in 0..<4 {
            pieces.append(("one two three four five", Double(window) * 10, 9))
        }
        let input = SpeechAnalysisInput(
            transcript: Array(repeating: "one two three four five", count: 4).joined(separator: " "),
            segments: segments(pieces),
            totalDuration: 40
        )
        let metrics = SpeechMetricsCalculator.metrics(for: input)
        XCTAssertLessThan(metrics.paceVariation, 0.05)
    }

    func testVariedDeliveryProducesHigherPaceVariation() {
        let pieces: [(String, TimeInterval, TimeInterval)] = [
            ("one two three four five six seven eight nine ten eleven twelve", 0, 9),
            ("slow", 10, 9),
            ("one two three four five six seven eight nine ten eleven twelve", 20, 9),
            ("slow", 30, 9)
        ]
        let input = SpeechAnalysisInput(
            transcript: pieces.map { $0.0 }.joined(separator: " "),
            segments: segments(pieces),
            totalDuration: 40
        )
        let metrics = SpeechMetricsCalculator.metrics(for: input)
        XCTAssertGreaterThan(metrics.paceVariation, 0.3)
        XCTAssertGreaterThan(metrics.fastestWindowWPM, metrics.slowestWindowWPM)
    }

    // MARK: - Constraints and edge cases

    func testTimeLimitComplianceIsReported() {
        let under = SpeechMetricsCalculator.metrics(
            for: SpeechAnalysisInput(transcript: "hello there", totalDuration: 40, timeLimit: 60)
        )
        let over = SpeechMetricsCalculator.metrics(
            for: SpeechAnalysisInput(transcript: "hello there", totalDuration: 75, timeLimit: 60)
        )

        XCTAssertEqual(under.withinTimeLimit, true)
        XCTAssertEqual(over.withinTimeLimit, false)
    }

    func testNoTimeLimitLeavesComplianceUnknown() {
        let metrics = SpeechMetricsCalculator.metrics(
            for: SpeechAnalysisInput(transcript: "hello", totalDuration: 10)
        )
        XCTAssertNil(metrics.withinTimeLimit)
    }

    func testEmptyTranscriptDoesNotCrashOrInventNumbers() {
        let metrics = SpeechMetricsCalculator.metrics(
            for: SpeechAnalysisInput(transcript: "   ", totalDuration: 8, timeLimit: 60)
        )

        XCTAssertEqual(metrics.wordCount, 0)
        XCTAssertEqual(metrics.wordsPerMinute, 0)
        XCTAssertTrue(metrics.sentences.isEmpty)
        XCTAssertEqual(metrics.totalDuration, 8)
        XCTAssertEqual(metrics.withinTimeLimit, true)
    }

    func testTranscriptIsRecoveredFromSegmentsWhenMissing() {
        let input = SpeechAnalysisInput(
            transcript: "",
            segments: segments([("hello there", 0, 2)]),
            totalDuration: 2
        )
        XCTAssertEqual(SpeechMetricsCalculator.metrics(for: input).wordCount, 2)
    }

    func testLeadingSilenceIsMeasured() {
        let input = SpeechAnalysisInput(
            transcript: "late start",
            segments: segments([("late start", 3.5, 2)]),
            totalDuration: 5.5
        )
        XCTAssertEqual(SpeechMetricsCalculator.metrics(for: input).leadingSilence, 3.5, accuracy: 0.001)
    }
}
