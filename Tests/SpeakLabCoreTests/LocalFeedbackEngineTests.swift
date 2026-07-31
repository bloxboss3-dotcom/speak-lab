import XCTest
@testable import SpeakLabCore

/// The offline coach has to be *useful*, not just non-crashing: it is what the
/// learner sees whenever the network or the proxy is unavailable.
final class LocalFeedbackEngineTests: XCTestCase {

    private var scenario: Scenario { ScenarioLibrary.scenario(id: "spk-buddy-week")! }
    private var skill: MicroSkill { Curriculum.skill(id: "bottom-line-first")! }

    private func metrics(
        transcript: String,
        duration: TimeInterval,
        limit: TimeInterval? = 60,
        segments: [SpeechSegment] = []
    ) -> SpeakingMetrics {
        SpeechMetricsCalculator.metrics(
            for: SpeechAnalysisInput(
                transcript: transcript,
                segments: segments,
                totalDuration: duration,
                timeLimit: limit
            )
        )
    }

    // MARK: - Target selection

    func testOverrunningTheTimeLimitOutranksEverythingElse() {
        let transcript = "Um, um, um, so basically we have Buddy Week and it is on Monday and you should come."
        let feedback = LocalFeedbackEngine.feedback(
            scenario: scenario,
            skill: skill,
            transcript: transcript,
            metrics: metrics(transcript: transcript, duration: 95, limit: 60)
        )

        XCTAssertTrue(feedback.primaryTarget.lowercased().contains("time"))
        XCTAssertTrue(feedback.explanation.contains("35 seconds past"))
    }

    func testHeavyFillerUseBecomesTheTarget() {
        let transcript = """
        Um so um we have um Buddy Week um coming up and uh it is on Monday. \
        Please um bring a friend with you to the class on the day.
        """
        let feedback = LocalFeedbackEngine.feedback(
            scenario: scenario,
            skill: skill,
            transcript: transcript,
            metrics: metrics(transcript: transcript, duration: 20)
        )

        XCTAssertTrue(feedback.primaryTarget.lowercased().contains("filler"))
        XCTAssertEqual(feedback.targetSkillID, "deliberate-pause")
        XCTAssertTrue(feedback.retryInstruction.lowercased().contains("close your mouth"))
    }

    func testLongOpeningSentenceBecomesTheTarget() {
        let opening = "So before everyone heads off today I just wanted to very quickly mention something that we have been thinking about for quite a while now and which we are finally ready to talk about properly."
        let transcript = opening + " Buddy Week is on Monday."
        let feedback = LocalFeedbackEngine.feedback(
            scenario: scenario,
            skill: skill,
            transcript: transcript,
            metrics: metrics(transcript: transcript, duration: 18)
        )

        XCTAssertEqual(feedback.targetSkillID, "bottom-line-first")
        XCTAssertTrue(feedback.evidenceQuote.hasPrefix("So before everyone"))
    }

    func testCleanAttemptFallsBackToTheScenarioSkill() {
        let transcript = "Buddy Week runs from the fourteenth. Bring one friend. Sheet is by the door."
        let feedback = LocalFeedbackEngine.feedback(
            scenario: scenario,
            skill: skill,
            transcript: transcript,
            metrics: metrics(transcript: transcript, duration: 22)
        )

        XCTAssertEqual(feedback.targetSkillID, skill.id)
        XCTAssertEqual(feedback.retryInstruction, skill.retryCue)
    }

    // MARK: - Evidence quality

    func testEvidenceQuoteAlwaysComesFromTheTranscript() {
        let samples: [(String, TimeInterval)] = [
            ("Um um um um so we have a thing on Monday and you should probably come along to it.", 20),
            ("Buddy Week is next week. Bring a friend. Sign up by the door before you leave today.", 25),
            ("So before everyone heads off I wanted to mention something we have been planning for a while now and it is finally ready.", 40)
        ]

        for (transcript, duration) in samples {
            let computed = metrics(transcript: transcript, duration: duration)
            let feedback = LocalFeedbackEngine.feedback(
                scenario: scenario,
                skill: skill,
                transcript: transcript,
                metrics: computed
            )
            guard !feedback.evidenceQuote.isEmpty else { continue }
            let grounding = TranscriptGrounding.verify(quote: feedback.evidenceQuote, in: transcript)
            XCTAssertTrue(
                grounding.verified,
                "Local feedback quoted something not in the transcript: \(feedback.evidenceQuote)"
            )
        }
    }

    func testFeedbackAlwaysHasAllRequiredParts() {
        let transcript = "Buddy Week is on Monday and you should bring a friend along with you."
        let feedback = LocalFeedbackEngine.feedback(
            scenario: scenario,
            skill: skill,
            transcript: transcript,
            metrics: metrics(transcript: transcript, duration: 15)
        )

        XCTAssertFalse(feedback.scenarioOutcome.isEmpty)
        XCTAssertFalse(feedback.strengths.isEmpty)
        XCTAssertFalse(feedback.primaryTarget.isEmpty)
        XCTAssertFalse(feedback.explanation.isEmpty)
        XCTAssertFalse(feedback.retryInstruction.isEmpty)
        XCTAssertFalse(feedback.rubricObservations.isEmpty)
    }

    func testEmptyRecordingIsHandledHonestly() {
        let feedback = LocalFeedbackEngine.feedback(
            scenario: scenario,
            skill: skill,
            transcript: "",
            metrics: metrics(transcript: "", duration: 5)
        )
        XCTAssertTrue(feedback.scenarioOutcome.contains("No speech"))
    }

    func testStrengthsAreCappedAndNeverEmpty() {
        let transcript = "Buddy Week is Monday. Bring one friend. The sheet is by the door."
        let feedback = LocalFeedbackEngine.feedback(
            scenario: scenario,
            skill: skill,
            transcript: transcript,
            metrics: metrics(transcript: transcript, duration: 20)
        )
        XCTAssertLessThanOrEqual(feedback.strengths.count, 3)
        XCTAssertGreaterThan(feedback.strengths.count, 0)
    }

    // MARK: - Conversation

    func testNoOpenQuestionsBecomesTheConversationTarget() {
        let turns = [
            ConversationTurn(speaker: .character, text: "So how does it work?", duration: 2, durationIsEstimated: true),
            ConversationTurn(speaker: .user, text: "Did you enjoy it? We run Tuesdays and Thursdays.", duration: 6, durationIsEstimated: false),
            ConversationTurn(speaker: .character, text: "Right.", duration: 1, durationIsEstimated: true),
            ConversationTurn(speaker: .user, text: "Is that any good for you?", duration: 4, durationIsEstimated: false)
        ]
        let feedback = LocalFeedbackEngine.conversationFeedback(
            scenario: ScenarioLibrary.scenario(id: "cnv-trial-welcome")!,
            skill: Curriculum.skill(id: "open-question")!,
            metrics: ConversationMetricsCalculator.metrics(for: turns),
            turns: turns
        )

        XCTAssertEqual(feedback.targetSkillID, "open-question")
        XCTAssertTrue(feedback.primaryTarget.lowercased().contains("open"))
    }

    func testDominatingTheConversationBecomesTheTarget() {
        let longSpeech = String(repeating: "We run a really excellent programme here. ", count: 12)
        let turns = [
            ConversationTurn(speaker: .character, text: "How does it work?", duration: 2, durationIsEstimated: true),
            ConversationTurn(speaker: .user, text: "What brings you in? " + longSpeech, duration: 120, durationIsEstimated: false),
            ConversationTurn(speaker: .character, text: "I see.", duration: 1, durationIsEstimated: true),
            ConversationTurn(speaker: .user, text: "How does that sound?", duration: 3, durationIsEstimated: false)
        ]
        let feedback = LocalFeedbackEngine.conversationFeedback(
            scenario: ScenarioLibrary.scenario(id: "cnv-trial-welcome")!,
            skill: Curriculum.skill(id: "open-question")!,
            metrics: ConversationMetricsCalculator.metrics(for: turns),
            turns: turns
        )

        XCTAssertTrue(feedback.primaryTarget.lowercased().contains("less"))
    }

    // MARK: - Comparison

    func testFillerReductionCountsAsImprovementForThePauseSkill() {
        let before = metrics(transcript: "um um um um so we have a thing on Monday coming up soon", duration: 20)
        let after = metrics(transcript: "We have a thing on Monday coming up soon and it is good", duration: 20)

        let comparison = LocalFeedbackEngine.compare(
            target: "Replace filler words with silence",
            targetSkillID: "deliberate-pause",
            first: before,
            second: after
        )
        XCTAssertTrue(comparison.targetImproved)
        XCTAssertTrue(comparison.countsAsImprovement)
    }

    func testRewordingWithoutBehaviourChangeIsNotRewarded() {
        let before = metrics(transcript: "um um um so we have um a thing on Monday and you should come", duration: 20)
        let after = metrics(transcript: "um um um so there is um a thing on Tuesday and you should attend", duration: 20)

        let comparison = LocalFeedbackEngine.compare(
            target: "Replace filler words with silence",
            targetSkillID: "deliberate-pause",
            first: before,
            second: after
        )
        XCTAssertFalse(comparison.countsAsImprovement, "Same fillers, different words — must not count")
    }

    func testUnmappedSkillDoesNotClaimImprovement() {
        let before = metrics(transcript: "one two three four five", duration: 10)
        let after = metrics(transcript: "six seven eight nine ten", duration: 10)

        let comparison = LocalFeedbackEngine.compare(
            target: "Something we cannot measure",
            targetSkillID: "warmth-we-cannot-measure",
            first: before,
            second: after
        )
        XCTAssertFalse(comparison.targetImproved, "Unmeasurable targets must not produce a fake win")
    }

    func testShorterOpeningCountsForBottomLineFirst() {
        let longOpening = "So before everyone heads off today I just wanted to very quickly mention a thing that we have been planning. Buddy Week is Monday."
        let shortOpening = "Buddy Week is Monday. Bring a friend with you on the day."

        let comparison = LocalFeedbackEngine.compare(
            target: "Get to the point",
            targetSkillID: "bottom-line-first",
            first: metrics(transcript: longOpening, duration: 25),
            second: metrics(transcript: shortOpening, duration: 20)
        )
        XCTAssertTrue(comparison.targetImproved)
    }
}
