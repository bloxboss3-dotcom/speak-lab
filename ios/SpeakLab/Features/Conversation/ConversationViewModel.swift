import Foundation
import SwiftUI

/// Drives a multi-turn simulated conversation.
///
/// The learner speaks (or types) one turn at a time; the simulated person
/// replies in character and out loud. The character's hidden brief never
/// reaches this side of the wire — it lives in the system prompt — so the
/// learner has to work out what the other person wants by listening.
@MainActor
final class ConversationViewModel: ObservableObject {

    enum Stage: Equatable {
        case brief
        case conversing
        case analyzing
        case feedback
        case comparing
        case comparison
        case summary
    }

    @Published private(set) var stage: Stage = .brief
    @Published private(set) var scenario: Scenario
    @Published private(set) var skill: MicroSkill

    @Published private(set) var turns: [ConversationTurn] = []
    @Published private(set) var isCharacterThinking = false
    @Published private(set) var isScriptedFallback = false
    @Published private(set) var conversationEnded = false
    @Published private(set) var endReason: String?
    @Published private(set) var objectiveMet = false

    @Published private(set) var feedback: CoachFeedback?
    @Published private(set) var feedbackWasLocal = false
    @Published private(set) var evidenceVerified = true
    @Published private(set) var coachNote: String?
    @Published private(set) var comparison: AttemptComparison?
    @Published private(set) var rewards: SessionRewards?

    @Published private(set) var runIndex = 0
    /// The learner's turns from the first run, kept for the comparison.
    private var firstRunTurns: [ConversationTurn] = []

    @Published var typedReply: String = ""
    @Published var anxietyBefore: Int?
    @Published var anxietyAfter: Int?
    @Published private(set) var errorMessage: String?

    /// Observed moves the character noticed, surfaced in the debrief.
    @Published private(set) var observedMoves: [String] = []

    let turnBudget = 8

    private let services: AppServices
    private let store: ProgressStore
    private var sessionRecord: PracticeSessionRecord?
    private let keepRecordings: Bool

    init(scenario: Scenario, skill: MicroSkill, services: AppServices, store: ProgressStore) {
        self.scenario = scenario
        self.skill = skill
        self.services = services
        self.store = store
        self.keepRecordings = store.profile().keepRecordings
    }

    var isRetry: Bool { runIndex > 0 }

    var learnerTurnCount: Int { turns.filter { $0.speaker == .user }.count }

    var metrics: ConversationMetrics { ConversationMetricsCalculator.metrics(for: turns) }

    var shouldAskAnxiety: Bool { store.profile().trackAnxiety }

    var canSend: Bool {
        !isCharacterThinking && !conversationEnded && stage == .conversing
    }

    // MARK: - Lifecycle

    func begin() async {
        sessionRecord = store.startSession(scenario: scenario, skillID: skill.id)
        stage = .conversing
        await characterOpens()
    }

    private func characterOpens() async {
        isCharacterThinking = true
        defer { isCharacterThinking = false }

        let result = await services.coach.characterTurn(
            scenario: scenario,
            history: [],
            turnBudget: turnBudget
        )
        isScriptedFallback = result.wasScripted
        appendCharacter(result.turn)
    }

    // MARK: - Learner turns

    func sendTyped() async {
        let text = typedReply.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }
        typedReply = ""
        appendLearner(text: text, duration: estimatedReadingDuration(text), segments: [], measured: false)
        await characterResponds()
    }

    func sendSpoken(_ recording: AudioRecorder.Recording?) async {
        guard let recording else {
            errorMessage = "That recording didn't save. Try again."
            return
        }

        var transcript = ""
        var segments: [SpeechSegment] = []
        do {
            let result = try await services.transcriber.transcribe(url: recording.url)
            transcript = result.transcript
            segments = result.segments
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription
                ?? "Couldn't transcribe that. You can type instead."
        }

        // The audio has served its purpose once transcribed.
        if !keepRecordings { AudioStore.delete(recording.url) }

        guard !transcript.isEmpty else { return }
        appendLearner(
            text: transcript,
            duration: recording.duration,
            segments: segments,
            measured: true
        )
        await characterResponds()
    }

    private func appendLearner(
        text: String,
        duration: TimeInterval,
        segments: [SpeechSegment],
        measured: Bool
    ) {
        turns.append(
            ConversationTurn(
                speaker: .user,
                text: text,
                duration: duration,
                durationIsEstimated: !measured,
                segments: segments
            )
        )
        errorMessage = nil
    }

    private func appendCharacter(_ response: CharacterTurnResponse) {
        let words = SpeechMetricsCalculator.normalizedTokens(in: response.speech).count
        turns.append(
            ConversationTurn(
                speaker: .character,
                text: response.speech,
                duration: ConversationTurn.estimatedDuration(forWordCount: words),
                durationIsEstimated: true
            )
        )
        if let move = response.observedMove, !observedMoves.contains(move) {
            observedMoves.append(move)
        }
        if response.objectiveMet { objectiveMet = true }
        if response.shouldEnd {
            conversationEnded = true
            endReason = response.endReason
        }
        services.synthesizer.speak(response.speech, voiceHint: scenario.character?.voiceHint)
    }

    private func characterResponds() async {
        guard !conversationEnded else { return }
        isCharacterThinking = true
        defer { isCharacterThinking = false }

        let result = await services.coach.characterTurn(
            scenario: scenario,
            history: turns,
            turnBudget: turnBudget
        )
        isScriptedFallback = result.wasScripted
        appendCharacter(result.turn)

        // A hard stop so a runaway simulation can't trap the learner.
        if learnerTurnCount >= turnBudget {
            conversationEnded = true
            endReason = endReason ?? "You've used the time available for this one."
        }
    }

    /// The learner ends it themselves. Always available — walking away is a
    /// legitimate outcome in a difficult conversation.
    func endConversation() {
        conversationEnded = true
        services.synthesizer.stop()
    }

    // MARK: - Debrief

    func requestDebrief() async {
        services.synthesizer.stop()
        stage = .analyzing

        let currentMetrics = metrics
        persistAttempt(turns: turns, metrics: currentMetrics)

        let result = await services.coach.debriefConversation(
            scenario: scenario,
            skill: skill,
            turns: turns,
            metrics: currentMetrics,
            attemptNumber: runIndex + 1
        )
        feedback = result.feedback
        feedbackWasLocal = result.wasLocal
        evidenceVerified = result.evidenceVerified
        coachNote = result.note

        if let record = sessionRecord, let attempt = record.orderedAttempts.last {
            attempt.feedback = result.feedback
            attempt.feedbackWasLocal = result.wasLocal
            attempt.evidenceVerified = result.evidenceVerified
            store.save()
        }

        if runIndex == 0 {
            stage = .feedback
        } else {
            await compareRuns()
        }
    }

    /// Restarts the same scenario so the learner can immediately apply the note.
    func beginRetry() {
        firstRunTurns = turns
        runIndex = 1
        turns = []
        conversationEnded = false
        endReason = nil
        objectiveMet = false
        observedMoves = []
        stage = .conversing
        Task { await characterOpens() }
    }

    func skipRetry() {
        finish()
    }

    private func compareRuns() async {
        stage = .comparing
        guard let feedback else {
            stage = .summary
            return
        }

        let before = learnerOnly(firstRunTurns)
        let after = learnerOnly(turns)

        let result = await services.coach.compareAttempts(
            scenario: scenario,
            skill: skill,
            target: feedback.primaryTarget,
            targetSkillID: feedback.targetSkillID ?? skill.id,
            retryInstruction: feedback.retryInstruction,
            first: (before.transcript, before.metrics),
            second: (after.transcript, after.metrics)
        )
        comparison = result.comparison
        if result.note != nil { coachNote = result.note }

        if let record = sessionRecord, let attempt = record.orderedAttempts.last {
            attempt.comparison = result.comparison
            store.save()
        }

        stage = .comparison
        if result.comparison.countsAsImprovement {
            services.haptics.success()
        }
    }

    /// Collapses the learner's side of a conversation into something the
    /// speaking-comparison prompt can work with.
    private func learnerOnly(_ turns: [ConversationTurn]) -> (transcript: String, metrics: SpeakingMetrics) {
        let conversationMetrics = ConversationMetricsCalculator.metrics(for: turns)
        let transcript = turns
            .filter { $0.speaker == .user }
            .map { $0.text }
            .joined(separator: " ")
        return (transcript, conversationMetrics.userSpeech)
    }

    func continueFromComparison() {
        finish()
    }

    func finish() {
        guard let record = sessionRecord else {
            stage = .summary
            return
        }
        let improved = comparison?.countsAsImprovement ?? false
        let targetSkillID = feedback?.targetSkillID ?? skill.id
        let rubricRating = feedback?.rubricObservations
            .first { $0.dimension == skill.rubricDimension }?
            .rating

        record.anxietyBefore = anxietyBefore
        record.anxietyAfter = anxietyAfter

        rewards = store.completeSession(
            record,
            scenario: scenario,
            targetSkillID: targetSkillID,
            improved: improved,
            bonusObjectivesMet: objectiveMet ? 1 : 0,
            rubricRating: rubricRating,
            isTransfer: false,
            suggestedNugget: feedback?.optionalGoldenNugget
        )

        if improved, let skill = Curriculum.skill(id: targetSkillID) {
            store.assignRealWorldMission(
                skillID: targetSkillID,
                prompt: "This week, use \"\(skill.name)\" in a real conversation. \(skill.retryCue)"
            )
        }

        stage = .summary
        services.haptics.reward()
    }

    func abandon() {
        services.synthesizer.stop()
        services.recorder.cancel()
    }

    // MARK: - Persistence

    private func persistAttempt(turns: [ConversationTurn], metrics: ConversationMetrics) {
        guard let record = sessionRecord else { return }
        let attempt = store.addAttempt(to: record, index: runIndex)
        attempt.transcript = turns
            .filter { $0.speaker == .user }
            .map { $0.text }
            .joined(separator: "\n")
        attempt.conversationTurns = turns
        attempt.metrics = metrics.userSpeech
        attempt.durationSeconds = metrics.userSpeakingSeconds
        store.save()
    }

    private func estimatedReadingDuration(_ text: String) -> TimeInterval {
        let words = SpeechMetricsCalculator.normalizedTokens(in: text).count
        return ConversationTurn.estimatedDuration(forWordCount: words)
    }
}
