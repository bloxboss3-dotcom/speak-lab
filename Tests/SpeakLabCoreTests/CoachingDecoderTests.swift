import XCTest
// The same test suite runs in two places: `swift test` compiles Core as the
// SpeakLabCore package, while the Xcode test target compiles those files into
// the app module. This picks whichever exists.
#if canImport(SpeakLabCore)
@testable import SpeakLabCore
#else
@testable import SpeakLab
#endif

final class CoachingDecoderTests: XCTestCase {

    private func data(_ string: String) -> Data { Data(string.utf8) }

    private let validFeedback = """
    {
      "scenarioOutcome": "You announced Buddy Week but the dates arrived late.",
      "strengths": ["You named a specific action", "You finished in time"],
      "primaryTarget": "Lead with the point",
      "evidenceQuote": "so um before everyone heads off I just wanted to mention",
      "explanation": "Twenty-two seconds passed before the dates.",
      "retryInstruction": "Say the dates in your first sentence.",
      "optionalGoldenNugget": {
        "id": "signpost-frees-attention",
        "title": "Signposting frees their attention",
        "insight": "Telling people how many points are coming lets them relax.",
        "category": "structure"
      },
      "rubricObservations": [
        {"dimension": "opening", "rating": "needsWork", "observation": "38-word opening sentence."},
        {"dimension": "concision", "rating": "strong", "observation": "Finished in 48s of 60s."}
      ],
      "safetyFlags": [],
      "transferScenario": {
        "scenarioID": "spk-buddy-week-noise",
        "title": "Buddy Week, noisy room",
        "twist": "Less time, more noise."
      },
      "targetSkillID": "bottom-line-first"
    }
    """

    // MARK: - Happy path

    func testDecodesCompleteFeedback() throws {
        let feedback = try CoachingDecoder.decodeFeedback(from: data(validFeedback))

        XCTAssertEqual(feedback.primaryTarget, "Lead with the point")
        XCTAssertEqual(feedback.strengths.count, 2)
        XCTAssertEqual(feedback.rubricObservations.count, 2)
        XCTAssertEqual(feedback.optionalGoldenNugget?.category, .structure)
        XCTAssertEqual(feedback.transferScenario?.scenarioID, "spk-buddy-week-noise")
        XCTAssertEqual(feedback.targetSkillID, "bottom-line-first")
    }

    // MARK: - Malformed and hostile input

    func testMissingRequiredFieldThrows() {
        let json = """
        {"scenarioOutcome": "x", "primaryTarget": "y", "explanation": "z", "retryInstruction": "w"}
        """
        XCTAssertThrowsError(try CoachingDecoder.decodeFeedback(from: data(json))) { error in
            XCTAssertEqual(error as? CoachingDecodingError, .missingField("evidenceQuote"))
        }
    }

    func testWhitespaceOnlyRequiredFieldIsTreatedAsEmpty() {
        let json = """
        {
          "scenarioOutcome": "x", "strengths": [], "primaryTarget": "   ",
          "evidenceQuote": "q", "explanation": "z", "retryInstruction": "w"
        }
        """
        XCTAssertThrowsError(try CoachingDecoder.decodeFeedback(from: data(json))) { error in
            XCTAssertEqual(error as? CoachingDecodingError, .emptyField("primaryTarget"))
        }
    }

    func testNonJSONInputThrows() {
        XCTAssertThrowsError(try CoachingDecoder.decodeFeedback(from: data("I'm sorry, I can't help with that."))) { error in
            XCTAssertEqual(error as? CoachingDecodingError, .notJSON)
        }
    }

    func testMarkdownFencedJSONIsRecovered() throws {
        let fenced = "Here you go:\n```json\n" + validFeedback + "\n```\nHope that helps!"
        let feedback = try CoachingDecoder.decodeFeedback(from: data(fenced))
        XCTAssertEqual(feedback.primaryTarget, "Lead with the point")
    }

    func testBracesInsideStringsDoNotTruncateExtraction() throws {
        let json = """
        prose before {"scenarioOutcome": "a } brace", "strengths": [], "primaryTarget": "t",
        "evidenceQuote": "q", "explanation": "e", "retryInstruction": "r"} trailing prose
        """
        let feedback = try CoachingDecoder.decodeFeedback(from: data(json))
        XCTAssertEqual(feedback.scenarioOutcome, "a } brace")
    }

    // MARK: - Lenient degradation

    func testUnknownRubricDimensionIsDroppedRatherThanFailingWholeResponse() throws {
        let json = """
        {
          "scenarioOutcome": "x", "strengths": [], "primaryTarget": "t", "evidenceQuote": "q",
          "explanation": "e", "retryInstruction": "r",
          "rubricObservations": [
            {"dimension": "vibes", "rating": "strong", "observation": "nope"},
            {"dimension": "clarity", "rating": "strong", "observation": "yes"}
          ]
        }
        """
        let feedback = try CoachingDecoder.decodeFeedback(from: data(json))
        XCTAssertEqual(feedback.rubricObservations.count, 1)
        XCTAssertEqual(feedback.rubricObservations[0].dimension, .clarity)
    }

    func testUnknownRatingFallsBackToAdequate() throws {
        let json = """
        {
          "scenarioOutcome": "x", "strengths": [], "primaryTarget": "t", "evidenceQuote": "q",
          "explanation": "e", "retryInstruction": "r",
          "rubricObservations": [{"dimension": "clarity", "rating": "spectacular", "observation": "o"}]
        }
        """
        let feedback = try CoachingDecoder.decodeFeedback(from: data(json))
        XCTAssertEqual(feedback.rubricObservations[0].rating, .adequate)
    }

    func testDuplicateRubricDimensionsAreCollapsed() throws {
        let json = """
        {
          "scenarioOutcome": "x", "strengths": [], "primaryTarget": "t", "evidenceQuote": "q",
          "explanation": "e", "retryInstruction": "r",
          "rubricObservations": [
            {"dimension": "clarity", "rating": "strong", "observation": "first"},
            {"dimension": "clarity", "rating": "needsWork", "observation": "second"}
          ]
        }
        """
        let feedback = try CoachingDecoder.decodeFeedback(from: data(json))
        XCTAssertEqual(feedback.rubricObservations.count, 1)
        XCTAssertEqual(feedback.rubricObservations[0].observation, "first")
    }

    func testStrengthsAreCappedAtThree() throws {
        let json = """
        {
          "scenarioOutcome": "x", "strengths": ["a","b","c","d","e"], "primaryTarget": "t",
          "evidenceQuote": "q", "explanation": "e", "retryInstruction": "r"
        }
        """
        let feedback = try CoachingDecoder.decodeFeedback(from: data(json))
        XCTAssertEqual(feedback.strengths.count, 3)
    }

    func testMissingOptionalArraysDefaultToEmpty() throws {
        let json = """
        {
          "scenarioOutcome": "x", "primaryTarget": "t", "evidenceQuote": "q",
          "explanation": "e", "retryInstruction": "r"
        }
        """
        let feedback = try CoachingDecoder.decodeFeedback(from: data(json))
        XCTAssertTrue(feedback.strengths.isEmpty)
        XCTAssertTrue(feedback.safetyFlags.isEmpty)
        XCTAssertNil(feedback.optionalGoldenNugget)
    }

    func testIncompleteNuggetIsDroppedRatherThanHalfRendered() throws {
        let json = """
        {
          "scenarioOutcome": "x", "primaryTarget": "t", "evidenceQuote": "q",
          "explanation": "e", "retryInstruction": "r",
          "optionalGoldenNugget": {"title": "Only a title"}
        }
        """
        let feedback = try CoachingDecoder.decodeFeedback(from: data(json))
        XCTAssertNil(feedback.optionalGoldenNugget)
    }

    // MARK: - Comparison

    func testDecodesComparison() throws {
        let json = """
        {
          "targetImproved": true, "changeWasSuperficial": false,
          "summary": "The dates arrived in the first sentence this time.",
          "evidenceBefore": "so um before everyone heads off",
          "evidenceAfter": "Buddy Week is the 14th to the 18th",
          "whatChanged": ["Opening went from 38 words to 11"],
          "whatDidNotChange": ["Still three fillers"],
          "nextStep": "Take it into the noisy room version."
        }
        """
        let comparison = try CoachingDecoder.decodeComparison(from: data(json))
        XCTAssertTrue(comparison.targetImproved)
        XCTAssertTrue(comparison.countsAsImprovement)
        XCTAssertEqual(comparison.whatChanged.count, 1)
    }

    func testSuperficialChangeDoesNotCountAsImprovement() throws {
        let json = """
        {
          "targetImproved": true, "changeWasSuperficial": true,
          "summary": "Reworded, same structure.", "nextStep": "Try again."
        }
        """
        let comparison = try CoachingDecoder.decodeComparison(from: data(json))
        XCTAssertTrue(comparison.targetImproved)
        XCTAssertFalse(comparison.countsAsImprovement, "A superficial change must not be rewarded")
    }

    func testComparisonMissingVerdictThrows() {
        let json = """
        {"summary": "Something happened", "nextStep": "Try again."}
        """
        XCTAssertThrowsError(try CoachingDecoder.decodeComparison(from: data(json))) { error in
            XCTAssertEqual(error as? CoachingDecodingError, .missingField("targetImproved"))
        }
    }

    // MARK: - Character turn

    func testDecodesCharacterTurn() throws {
        let json = """
        {
          "speech": "He seemed to enjoy it, I think.",
          "innerState": "Wary of being sold to.",
          "observedMove": "Asked an open question and waited.",
          "objectiveMet": false, "objectiveMissed": false, "shouldEnd": false
        }
        """
        let turn = try CoachingDecoder.decodeCharacterTurn(from: data(json))
        XCTAssertEqual(turn.speech, "He seemed to enjoy it, I think.")
        XCTAssertFalse(turn.shouldEnd)
        XCTAssertEqual(turn.observedMove, "Asked an open question and waited.")
    }

    func testCharacterTurnWithoutSpeechThrows() {
        XCTAssertThrowsError(try CoachingDecoder.decodeCharacterTurn(from: data("""
        {"innerState": "silent", "shouldEnd": true}
        """))) { error in
            XCTAssertEqual(error as? CoachingDecodingError, .missingField("speech"))
        }
    }

    func testCharacterTurnDefaultsMissingFlagsToFalse() throws {
        let turn = try CoachingDecoder.decodeCharacterTurn(from: data("""
        {"speech": "Okay."}
        """))
        XCTAssertFalse(turn.shouldEnd)
        XCTAssertFalse(turn.objectiveMet)
        XCTAssertEqual(turn.innerState, "")
    }
}
