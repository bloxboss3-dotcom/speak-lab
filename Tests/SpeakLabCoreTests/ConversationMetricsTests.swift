import XCTest
@testable import SpeakLabCore

final class ConversationMetricsTests: XCTestCase {

    private func userTurn(_ text: String, seconds: TimeInterval = 6) -> ConversationTurn {
        ConversationTurn(speaker: .user, text: text, duration: seconds, durationIsEstimated: false)
    }

    private func characterTurn(_ text: String) -> ConversationTurn {
        let words = SpeechMetricsCalculator.normalizedTokens(in: text).count
        return ConversationTurn(
            speaker: .character,
            text: text,
            duration: ConversationTurn.estimatedDuration(forWordCount: words),
            durationIsEstimated: true
        )
    }

    // MARK: - Question classification

    func testOpenQuestionsAreClassified() {
        let found = ConversationMetricsCalculator.detectQuestions(
            in: "What made you look for a class right now?",
            turnIndex: 0
        )
        XCTAssertEqual(found.count, 1)
        XCTAssertEqual(found[0].kind, .open)
    }

    func testClosedQuestionsAreClassified() {
        let found = ConversationMetricsCalculator.detectQuestions(in: "Did you enjoy the class?", turnIndex: 0)
        XCTAssertEqual(found[0].kind, .closed)
    }

    func testClarifyingQuestionsAreClassifiedAheadOfClosed() {
        // "Do you mean…" starts with a closed word but is a comprehension check.
        let found = ConversationMetricsCalculator.detectQuestions(
            in: "Do you mean the Thursday class specifically?",
            turnIndex: 0
        )
        XCTAssertEqual(found[0].kind, .clarifying)
    }

    func testQuestionWithoutQuestionMarkIsStillDetected() {
        // Speech recognition often drops the question mark entirely.
        let found = ConversationMetricsCalculator.detectQuestions(
            in: "What are you hoping he gets out of it",
            turnIndex: 0
        )
        XCTAssertEqual(found.count, 1)
        XCTAssertEqual(found[0].kind, .open)
    }

    func testStatementsAreNotCountedAsQuestions() {
        let found = ConversationMetricsCalculator.detectQuestions(
            in: "We run classes on Tuesday and Thursday. It suits most families.",
            turnIndex: 0
        )
        XCTAssertTrue(found.isEmpty)
    }

    // MARK: - Aggregate metrics

    func testStackedQuestionsAreCounted() {
        let turns = [
            userTurn("What are you hoping for? Is it confidence, or is it the fitness side?")
        ]
        let metrics = ConversationMetricsCalculator.metrics(for: turns)
        XCTAssertEqual(metrics.stackedQuestionTurns, 1)
        XCTAssertGreaterThan(metrics.questions.count, 1)
    }

    func testTalkShareUsesMeasuredAndEstimatedTime() {
        let turns = [
            userTurn("A fairly long explanation of the programme.", seconds: 60),
            characterTurn("Okay.")
        ]
        let metrics = ConversationMetricsCalculator.metrics(for: turns)

        XCTAssertGreaterThan(metrics.userTalkShare, 0.9)
        XCTAssertEqual(metrics.userSpeakingSeconds, 60, accuracy: 0.001)
        XCTAssertGreaterThan(metrics.characterSpeakingSecondsEstimated, 0)
    }

    func testAcknowledgmentPhrasesAreCounted() {
        let turns = [
            userTurn("That makes sense. I hear you, and that's fair.")
        ]
        let metrics = ConversationMetricsCalculator.metrics(for: turns)
        XCTAssertEqual(metrics.acknowledgmentCount, 3)
    }

    func testInterruptionsAreExplicitlyNotMeasured() {
        // The simulation is turn-based, so any interruption count would be invented.
        let metrics = ConversationMetricsCalculator.metrics(for: [userTurn("Hello")])
        XCTAssertFalse(metrics.interruptionsMeasurable)
    }

    func testUserSpeechAggregatesAcrossTurns() {
        let turns = [
            ConversationTurn(
                speaker: .user,
                text: "um hello there",
                duration: 4,
                durationIsEstimated: false,
                segments: [SpeechSegment(text: "um hello there", start: 0, duration: 4)]
            ),
            characterTurn("Hi."),
            ConversationTurn(
                speaker: .user,
                text: "um right so",
                duration: 4,
                durationIsEstimated: false,
                segments: [SpeechSegment(text: "um right so", start: 0, duration: 4)]
            )
        ]
        let metrics = ConversationMetricsCalculator.metrics(for: turns)

        XCTAssertEqual(metrics.userSpeech.fillerCount, 2, "Fillers from both user turns should aggregate")
        XCTAssertEqual(metrics.userSpeech.wordCount, 6)
    }

    func testEmptyConversationProducesZeroedMetrics() {
        let metrics = ConversationMetricsCalculator.metrics(for: [])
        XCTAssertEqual(metrics.turnCount, 0)
        XCTAssertEqual(metrics.userTalkShare, 0)
        XCTAssertTrue(metrics.questions.isEmpty)
    }

    func testTurnCountsSplitBySpeaker() {
        let turns = [userTurn("Hi"), characterTurn("Hello"), userTurn("How are you finding it?")]
        let metrics = ConversationMetricsCalculator.metrics(for: turns)

        XCTAssertEqual(metrics.turnCount, 3)
        XCTAssertEqual(metrics.userTurnCount, 2)
        XCTAssertEqual(metrics.characterTurnCount, 1)
    }
}
