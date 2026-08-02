import Foundation

/// Orchestrates coaching: build the prompt, call the service, validate the
/// response, check it against the transcript, and fall back to the on-device
/// engine when any of that fails.
///
/// Callers never see a failure. They get feedback plus honest provenance —
/// whether it came from Claude or from the device, and whether the quoted
/// evidence was actually found in what the learner said.
@MainActor
final class Coach: ObservableObject {

    struct FeedbackResult {
        var feedback: CoachFeedback
        /// True when this came from the on-device engine rather than the model.
        var wasLocal: Bool
        /// False when the evidence quote could not be located in the transcript.
        var evidenceVerified: Bool
        /// Shown to the learner when something degraded, so nothing is silent.
        var note: String?
    }

    struct ComparisonResult {
        var comparison: AttemptComparison
        var wasLocal: Bool
        var note: String?
    }

    private let serviceProvider: @MainActor () -> CoachingService

    init(serviceProvider: @escaping @MainActor () -> CoachingService) {
        self.serviceProvider = serviceProvider
    }

    var isConnected: Bool { serviceProvider().isConfigured }

    // MARK: - Speaking attempt

    func analyzeAttempt(
        scenario: Scenario,
        skill: MicroSkill,
        transcript: String,
        metrics: SpeakingMetrics,
        attemptNumber: Int,
        previousTargetSkillID: String? = nil
    ) async -> FeedbackResult {
        let localFallback = {
            LocalFeedbackEngine.feedback(
                scenario: scenario,
                skill: skill,
                transcript: transcript,
                metrics: metrics
            )
        }

        guard !transcript.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            return FeedbackResult(
                feedback: localFallback(),
                wasLocal: true,
                evidenceVerified: true,
                note: "No speech was recognised, so this is based on the recording's timing only."
            )
        }

        let request = PromptBuilder.attemptFeedbackRequest(
            scenario: scenario,
            skill: skill,
            transcript: transcript,
            metrics: metrics,
            attemptNumber: attemptNumber,
            previousTargetSkillID: previousTargetSkillID
        )

        do {
            let data = try await serviceProvider().run(request)
            let feedback = try CoachingDecoder.decodeFeedback(from: data)
            let grounding = TranscriptGrounding.verify(quote: feedback.evidenceQuote, in: transcript)

            // The quote is kept either way; `evidenceVerified` is what stops the
            // UI presenting an unverified one as a verbatim record.
            return FeedbackResult(
                feedback: feedback,
                wasLocal: false,
                evidenceVerified: grounding.verified,
                note: grounding.verified ? nil : "The quoted moment is a paraphrase — it wasn't found word-for-word in your transcript."
            )
        } catch {
            return FeedbackResult(
                feedback: localFallback(),
                wasLocal: true,
                evidenceVerified: true,
                note: Self.degradedNote(for: error)
            )
        }
    }

    // MARK: - Conversation debrief

    func debriefConversation(
        scenario: Scenario,
        skill: MicroSkill,
        turns: [ConversationTurn],
        metrics: ConversationMetrics,
        attemptNumber: Int
    ) async -> FeedbackResult {
        let localFallback = {
            LocalFeedbackEngine.conversationFeedback(
                scenario: scenario,
                skill: skill,
                metrics: metrics,
                turns: turns
            )
        }

        let request = PromptBuilder.conversationDebriefRequest(
            scenario: scenario,
            skill: skill,
            turns: turns,
            metrics: metrics,
            attemptNumber: attemptNumber
        )

        let learnerText = turns.filter { $0.speaker == .user }.map { $0.text }.joined(separator: " ")

        do {
            let data = try await serviceProvider().run(request)
            let feedback = try CoachingDecoder.decodeFeedback(from: data)
            let grounding = TranscriptGrounding.verify(quote: feedback.evidenceQuote, in: learnerText)
            return FeedbackResult(
                feedback: feedback,
                wasLocal: false,
                evidenceVerified: grounding.verified,
                note: grounding.verified ? nil : "The quoted moment is a paraphrase rather than your exact words."
            )
        } catch {
            return FeedbackResult(
                feedback: localFallback(),
                wasLocal: true,
                evidenceVerified: true,
                note: Self.degradedNote(for: error)
            )
        }
    }

    // MARK: - Retry comparison

    func compareAttempts(
        scenario: Scenario,
        skill: MicroSkill,
        target: String,
        targetSkillID: String?,
        retryInstruction: String,
        first: (transcript: String, metrics: SpeakingMetrics),
        second: (transcript: String, metrics: SpeakingMetrics)
    ) async -> ComparisonResult {
        let request = PromptBuilder.comparisonRequest(
            scenario: scenario,
            skill: skill,
            target: target,
            retryInstruction: retryInstruction,
            firstTranscript: first.transcript,
            firstMetrics: first.metrics,
            secondTranscript: second.transcript,
            secondMetrics: second.metrics
        )

        do {
            let data = try await serviceProvider().run(request)
            let comparison = try CoachingDecoder.decodeComparison(from: data)
            return ComparisonResult(comparison: comparison, wasLocal: false, note: nil)
        } catch {
            return ComparisonResult(
                comparison: LocalFeedbackEngine.compare(
                    target: target,
                    targetSkillID: targetSkillID,
                    first: first.metrics,
                    second: second.metrics
                ),
                wasLocal: true,
                note: Self.degradedNote(for: error)
            )
        }
    }

    // MARK: - Conversation turns

    /// The simulated person's next line.
    ///
    /// Unlike feedback, this has no honest offline equivalent from the model, so
    /// the caller is told when a scripted stand-in was used.
    func characterTurn(
        scenario: Scenario,
        history: [ConversationTurn],
        turnBudget: Int
    ) async -> (turn: CharacterTurnResponse, wasScripted: Bool) {
        let request = PromptBuilder.characterTurnRequest(
            scenario: scenario,
            history: history,
            turnBudget: turnBudget
        )
        do {
            let data = try await serviceProvider().run(request)
            let turn = try CoachingDecoder.decodeCharacterTurn(from: data)
            return (turn, false)
        } catch {
            return (ScriptedCharacter.reply(scenario: scenario, history: history, turnBudget: turnBudget), true)
        }
    }

    // MARK: - Helpers

    private static func degradedNote(for error: Error) -> String {
        if let serviceError = error as? CoachingServiceError {
            switch serviceError {
            case .notConfigured:
                return "Coached on device. Connect a coaching server in Settings for deeper feedback."
            case .offline:
                return "You're offline, so this was coached on device."
            case .refused:
                return "The coach declined to analyse this one, so this is on-device feedback."
            default:
                return "\(serviceError.localizedDescription) Coached on device instead."
            }
        }
        if error is CoachingDecodingError {
            return "The coach's reply didn't arrive in one piece, so this was coached on device."
        }
        return "Coached on device."
    }
}

/// A small scripted stand-in used when no coaching server is configured.
///
/// It is not trying to be Claude. It exists so the whole training loop —
/// including conversation mode — can be walked through on a device with no
/// setup at all, and it says plainly in the UI that it is a rehearsal.
enum ScriptedCharacter {

    static func reply(
        scenario: Scenario,
        history: [ConversationTurn],
        turnBudget: Int
    ) -> CharacterTurnResponse {
        guard let character = scenario.character else {
            return CharacterTurnResponse(speech: "Okay.", innerState: "", shouldEnd: true)
        }

        let userTurns = history.filter { $0.speaker == .user }

        if history.isEmpty {
            return CharacterTurnResponse(speech: character.opensWith, innerState: character.emotionalState)
        }

        let lastUserText = userTurns.last?.text ?? ""
        let questions = ConversationMetricsCalculator.detectQuestions(in: lastUserText, turnIndex: 0)
        let askedOpen = questions.contains { $0.kind == .open }

        // Enough exchanges have happened — wrap up.
        if userTurns.count >= max(3, turnBudget - 2) {
            return CharacterTurnResponse(
                speech: "Alright — let me have a think about it and I'll let you know.",
                innerState: "Neither convinced nor put off.",
                objectiveMet: false,
                objectiveMissed: false,
                shouldEnd: true,
                endReason: "The conversation reached its natural end."
            )
        }

        // A real question earns more information; anything else gets the objection again.
        if askedOpen {
            return CharacterTurnResponse(
                speech: opennessLine(for: character, turn: userTurns.count),
                innerState: "Starting to feel listened to.",
                observedMove: "Asked an open question."
            )
        }

        return CharacterTurnResponse(
            speech: guardedLine(for: character, turn: userTurns.count),
            innerState: "Not sure this person is listening yet.",
            observedMove: questions.isEmpty ? "Explained rather than asked." : "Asked a closed question."
        )
    }

    private static func opennessLine(for character: CharacterBrief, turn: Int) -> String {
        let lines = [
            "Honestly? \(character.hiddenGoal.prefix(1).lowercased() + character.hiddenGoal.dropFirst())",
            "I suppose what's really behind it is this — \(character.objection)",
            "That's a fair question. I hadn't really put it into words before."
        ]
        return lines[min(turn, lines.count - 1)]
    }

    private static func guardedLine(for character: CharacterBrief, turn: Int) -> String {
        let lines = [
            character.objection,
            "Right. I hear you, but it's still the same issue for me.",
            "Mm. I'm not sure that changes much, to be honest."
        ]
        return lines[min(turn, lines.count - 1)]
    }
}
