import XCTest
@testable import SpeakLabCore

final class TranscriptGroundingTests: XCTestCase {

    private let transcript = """
    So, um, before everyone heads off — I just wanted to quickly mention that we've got \
    Buddy Week coming up. It's the fourteenth to the eighteenth. Bring a friend along.
    """

    func testExactQuoteIsVerified() {
        let result = TranscriptGrounding.verify(quote: "Bring a friend along", in: transcript)
        XCTAssertTrue(result.verified)
        XCTAssertEqual(result.similarity, 1.0)
        XCTAssertNotNil(result.matchedRange)
    }

    func testQuoteIsMatchedCaseAndPunctuationInsensitively() {
        let result = TranscriptGrounding.verify(quote: "bring a friend along!", in: transcript)
        XCTAssertTrue(result.verified)
    }

    func testTidiedQuoteStillVerifies() {
        // Models routinely drop the "um" when quoting. That should still count.
        let result = TranscriptGrounding.verify(
            quote: "before everyone heads off I just wanted to quickly mention",
            in: transcript
        )
        XCTAssertTrue(result.verified)
        XCTAssertGreaterThan(result.similarity, TranscriptGrounding.verificationThreshold)
    }

    func testFabricatedQuoteIsNotVerified() {
        let result = TranscriptGrounding.verify(
            quote: "Our programme builds tremendous discipline and character",
            in: transcript
        )
        XCTAssertFalse(result.verified)
        XCTAssertNil(result.matchedRange)
    }

    func testEmptyQuoteIsNotVerified() {
        XCTAssertFalse(TranscriptGrounding.verify(quote: "   ", in: transcript).verified)
    }

    func testQuoteLongerThanTranscriptIsNotVerified() {
        let result = TranscriptGrounding.verify(quote: transcript + " and more words here", in: "short")
        XCTAssertFalse(result.verified)
    }

    func testMatchedRangeIndexesTheOriginalTranscript() {
        let result = TranscriptGrounding.verify(quote: "Buddy Week coming up", in: transcript)
        let matched = result.matchedRange.map { String(transcript[$0]) }
        XCTAssertEqual(matched, "Buddy Week coming up")
    }

    func testLocateFindsTheSentenceAQuoteCameFrom() {
        let sentences = [
            TimedSentence(text: "So, um, before everyone heads off.", start: 0, end: 3, wordCount: 6),
            TimedSentence(text: "It's the fourteenth to the eighteenth.", start: 3.2, end: 6, wordCount: 6),
            TimedSentence(text: "Bring a friend along.", start: 6.2, end: 8, wordCount: 4)
        ]
        let located = TranscriptGrounding.locate(quote: "the fourteenth to the eighteenth", in: sentences)
        XCTAssertEqual(located?.start, 3.2)
    }

    func testLocateReturnsNilForUnrelatedQuote() {
        let sentences = [TimedSentence(text: "Bring a friend along.", start: 0, end: 2, wordCount: 4)]
        XCTAssertNil(TranscriptGrounding.locate(quote: "completely different words entirely", in: sentences))
    }
}

final class PromptBuilderTests: XCTestCase {

    private var scenario: Scenario {
        ScenarioLibrary.scenario(id: "cnv-trial-welcome")!
    }

    private var speakingScenario: Scenario {
        ScenarioLibrary.scenario(id: "spk-buddy-week")!
    }

    func testFeedbackPromptCarriesTheGroundRules() {
        let request = PromptBuilder.attemptFeedbackRequest(
            scenario: speakingScenario,
            skill: Curriculum.skill(id: "bottom-line-first")!,
            transcript: "Buddy Week is next Monday.",
            metrics: .empty,
            attemptNumber: 1
        )

        XCTAssertTrue(request.system.contains("Never assess personality"))
        XCTAssertTrue(request.system.contains("You have NOT heard the audio"))
        XCTAssertTrue(request.system.contains("Exactly one primary target"))
        XCTAssertEqual(request.task, .attemptFeedback)
    }

    func testFeedbackPromptOffersOnlyRealSkillIDs() {
        let request = PromptBuilder.attemptFeedbackRequest(
            scenario: speakingScenario,
            skill: Curriculum.skill(id: "bottom-line-first")!,
            transcript: "x",
            metrics: .empty,
            attemptNumber: 1
        )

        // Every ID offered to the model must exist, or progression can't map it back.
        let listed = PromptBuilder.availableSkillIDs(for: speakingScenario)
            .components(separatedBy: ", ")
        XCTAssertFalse(listed.isEmpty)
        for id in listed {
            XCTAssertNotNil(Curriculum.skill(id: id), "Prompt offered unknown skill ID \(id)")
        }
        XCTAssertTrue(request.system.contains("bottom-line-first"))
    }

    func testCharacterBriefStaysInSystemPromptAndOutOfTheVisibleTranscript() {
        let request = PromptBuilder.characterTurnRequest(scenario: scenario, history: [], turnBudget: 8)
        let hiddenGoal = scenario.character!.hiddenGoal

        XCTAssertTrue(request.system.contains(hiddenGoal))
        for message in request.messages {
            XCTAssertFalse(
                message.content.contains(hiddenGoal),
                "The hidden brief must never appear in the conversation the learner can see"
            )
        }
    }

    func testCharacterTurnMapsSpeakersToTheRightRoles() {
        let history = [
            ConversationTurn(speaker: .character, text: "So how does it all work?", duration: 2, durationIsEstimated: true),
            ConversationTurn(speaker: .user, text: "What made you look for a class?", duration: 3, durationIsEstimated: false)
        ]
        let request = PromptBuilder.characterTurnRequest(scenario: scenario, history: history, turnBudget: 8)

        XCTAssertEqual(request.messages.count, 2)
        XCTAssertEqual(request.messages[0].role, .assistant, "The character's own past lines are the assistant")
        XCTAssertEqual(request.messages[1].role, .user, "The learner is the user")
    }

    func testCharacterTurnSeedsAnOpeningWhenHistoryIsEmpty() {
        let request = PromptBuilder.characterTurnRequest(scenario: scenario, history: [], turnBudget: 8)
        XCTAssertEqual(request.messages.count, 1)
        XCTAssertEqual(request.messages[0].role, .user)
    }

    func testComparisonPromptForbidsRewardingSurfaceChange() {
        let request = PromptBuilder.comparisonRequest(
            scenario: speakingScenario,
            skill: Curriculum.skill(id: "bottom-line-first")!,
            target: "Lead with the point",
            retryInstruction: "Say the dates first.",
            firstTranscript: "a",
            firstMetrics: .empty,
            secondTranscript: "b",
            secondMetrics: .empty
        )
        XCTAssertTrue(request.system.contains("changeWasSuperficial"))
        XCTAssertTrue(request.system.lowercased().contains("do not reward"))
    }

    func testConversationDebriefTellsTheModelInterruptionsWereNotMeasured() {
        let request = PromptBuilder.conversationDebriefRequest(
            scenario: scenario,
            skill: Curriculum.skill(id: "open-question")!,
            turns: [],
            metrics: ConversationMetricsCalculator.metrics(for: []),
            attemptNumber: 1
        )
        XCTAssertTrue(request.system.contains("interruptions were not measured"))
    }

    func testTimestampFormatting() {
        XCTAssertEqual(PromptBuilder.timestamp(0), "0:00")
        XCTAssertEqual(PromptBuilder.timestamp(9), "0:09")
        XCTAssertEqual(PromptBuilder.timestamp(65), "1:05")
        XCTAssertEqual(PromptBuilder.timestamp(600), "10:00")
    }

    func testMetricsDigestLabelsEstimatedConversationData() {
        let turns = [
            ConversationTurn(speaker: .user, text: "Hello there", duration: 5, durationIsEstimated: false),
            ConversationTurn(speaker: .character, text: "Hi.", duration: 1, durationIsEstimated: true)
        ]
        let digest = MetricsDigest.conversation(ConversationMetricsCalculator.metrics(for: turns))

        XCTAssertTrue(digest.contains("ESTIMATED"))
        XCTAssertTrue(digest.contains("NOT MEASURED"))
    }

    func testSpeakingDigestReportsMeasurementProvenance() {
        let metrics = SpeechMetricsCalculator.metrics(
            for: SpeechAnalysisInput(
                transcript: "um hello there this is a test of the digest output",
                totalDuration: 20,
                timeLimit: 60
            )
        )
        let digest = MetricsDigest.speaking(metrics)

        XCTAssertTrue(digest.contains("Pace variation index"))
        XCTAssertTrue(digest.contains("Filler words"))
        XCTAssertTrue(digest.contains("within limit"))
    }
}
