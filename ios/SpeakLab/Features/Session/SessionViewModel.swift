import Foundation
import SwiftData
import SwiftUI

/// Drives one practice session end to end.
///
/// The stage machine is the training loop from the brief: introduce one
/// micro-skill, plan briefly, record, analyse, give exactly one target, retry
/// immediately, compare honestly, then offer a changed scenario. Every stage
/// transition is explicit so the loop can't silently skip the retry — which is
/// the step that produces the learning.
@MainActor
final class SessionViewModel: ObservableObject {

    enum Stage: Equatable {
        case brief
        case plan
        case recording
        case analyzing
        case feedback
        case comparing
        case comparison
        case transfer
        case summary
    }

    struct AttemptState {
        var transcript: String = ""
        var metrics: SpeakingMetrics = .empty
        var audioFileName: String?
        var duration: TimeInterval = 0
        var transcriptionNote: String?
    }

    // MARK: - Published state

    @Published private(set) var stage: Stage = .brief
    @Published private(set) var scenario: Scenario
    @Published private(set) var skill: MicroSkill
    @Published private(set) var attemptIndex = 0

    @Published private(set) var attempts: [AttemptState] = []
    @Published private(set) var feedback: CoachFeedback?
    @Published private(set) var feedbackWasLocal = false
    @Published private(set) var evidenceVerified = true
    @Published private(set) var coachNote: String?
    @Published private(set) var comparison: AttemptComparison?
    @Published private(set) var comparisonWasLocal = false
    @Published private(set) var rewards: SessionRewards?
    @Published private(set) var transferScenario: Scenario?

    @Published var planNotes: String = ""
    @Published var anxietyBefore: Int?
    @Published var anxietyAfter: Int?
    @Published private(set) var errorMessage: String?
    @Published private(set) var isBusy = false

    /// Bonus objectives the learner ticks off themselves — the app cannot
    /// verify most of them, and pretending otherwise would be dishonest.
    @Published var claimedBonusObjectives: Set<String> = []

    let isReview: Bool
    let isTransferRun: Bool

    // MARK: - Dependencies

    private let services: AppServices
    private let store: ProgressStore
    private var sessionRecord: PracticeSessionRecord?

    /// Read lazily rather than in `init`: `profile()` inserts a row the first
    /// time it runs, and doing that while SwiftUI is building a view is asking
    /// for "modifying state during view update".
    private var keepRecordings: Bool { store.profile().keepRecordings }

    init(
        scenario: Scenario,
        skill: MicroSkill,
        services: AppServices,
        store: ProgressStore,
        isReview: Bool = false,
        isTransferRun: Bool = false
    ) {
        self.scenario = scenario
        self.skill = skill
        self.services = services
        self.store = store
        self.isReview = isReview
        self.isTransferRun = isTransferRun
    }

    // MARK: - Derived

    var timeLimit: TimeInterval? {
        scenario.timeLimitSeconds.map(TimeInterval.init)
    }

    var isRetry: Bool { attemptIndex > 0 }

    var currentAttempt: AttemptState? {
        attempts.indices.contains(attemptIndex) ? attempts[attemptIndex] : attempts.last
    }

    var firstAttempt: AttemptState? { attempts.first }
    var secondAttempt: AttemptState? { attempts.count > 1 ? attempts[1] : nil }

    var shouldAskAnxiety: Bool { store.profile().trackAnxiety }

    // MARK: - Stage transitions

    func beginPlanning() {
        sessionRecord = store.startSession(scenario: scenario, skillID: skill.id, isReview: isReview)
        stage = .plan
    }

    func beginRecording() {
        stage = .recording
    }

    /// Called when the recorder produces a file — or fails to.
    func finishRecording(_ recording: AudioRecorder.Recording?) async {
        guard let recording else {
            errorMessage = "That recording didn't save. Nothing was lost — try again."
            stage = .plan
            return
        }

        stage = .analyzing
        isBusy = true
        errorMessage = nil
        defer { isBusy = false }

        var state = AttemptState()
        state.duration = recording.duration
        state.audioFileName = recording.url.lastPathComponent

        do {
            let result = try await services.transcriber.transcribe(url: recording.url)
            state.transcript = result.transcript
            if !result.ranOnDevice {
                state.transcriptionNote = "Transcribed using Apple's servers — on-device recognition isn't available here."
            }
            state.metrics = SpeechMetricsCalculator.metrics(
                for: SpeechAnalysisInput(
                    transcript: result.transcript,
                    segments: result.segments,
                    totalDuration: recording.duration,
                    timeLimit: timeLimit
                )
            )
        } catch {
            // A failed transcription still leaves timing data worth keeping.
            state.transcript = ""
            state.metrics = SpeechMetricsCalculator.metrics(
                for: SpeechAnalysisInput(
                    transcript: "",
                    totalDuration: recording.duration,
                    timeLimit: timeLimit
                )
            )
            state.transcriptionNote = (error as? LocalizedError)?.errorDescription
                ?? "Couldn't transcribe that recording."
        }

        if attempts.count > attemptIndex {
            attempts[attemptIndex] = state
        } else {
            attempts.append(state)
        }

        persistAttempt(state)

        if attemptIndex == 0 {
            await requestFeedback(for: state)
        } else {
            await requestComparison()
        }
    }

    private func requestFeedback(for state: AttemptState) async {
        let result = await services.coach.analyzeAttempt(
            scenario: scenario,
            skill: skill,
            transcript: state.transcript,
            metrics: state.metrics,
            attemptNumber: attemptIndex + 1
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

        stage = .feedback
        services.haptics.tick()
    }

    func beginRetry() {
        attemptIndex = 1
        stage = .recording
    }

    private func requestComparison() async {
        guard let first = firstAttempt, let second = secondAttempt, let feedback else {
            stage = .summary
            return
        }
        stage = .comparing

        let result = await services.coach.compareAttempts(
            scenario: scenario,
            skill: skill,
            target: feedback.primaryTarget,
            targetSkillID: feedback.targetSkillID ?? skill.id,
            retryInstruction: feedback.retryInstruction,
            first: (first.transcript, first.metrics),
            second: (second.transcript, second.metrics)
        )
        comparison = result.comparison
        comparisonWasLocal = result.wasLocal
        if result.note != nil { coachNote = result.note }

        if let record = sessionRecord, let attempt = record.orderedAttempts.last {
            attempt.comparison = result.comparison
            store.save()
        }

        stage = .comparison
        if result.comparison.countsAsImprovement {
            services.haptics.success()
        } else {
            services.haptics.tick()
        }
    }

    /// Skips the retry. Allowed — but it earns no improvement reward, and the
    /// UI says so rather than hiding it.
    func skipRetry() {
        finishSession()
    }

    func continueFromComparison() {
        if let suggestion = resolveTransferScenario() {
            transferScenario = suggestion
            stage = .transfer
        } else {
            finishSession()
        }
    }

    func declineTransfer() {
        finishSession()
    }

    /// Resolves the transfer offer, preferring the catalogue over an invented one.
    private func resolveTransferScenario() -> Scenario? {
        guard comparison?.countsAsImprovement == true else { return nil }
        if let id = feedback?.transferScenario?.scenarioID,
           let scenario = ScenarioLibrary.scenario(id: id),
           scenario.id != self.scenario.id {
            return scenario
        }
        return ScenarioLibrary.transferScenario(after: scenario)
    }

    // MARK: - Finishing

    func finishSession() {
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

        let result = store.completeSession(
            record,
            scenario: scenario,
            targetSkillID: targetSkillID,
            improved: improved,
            bonusObjectivesMet: claimedBonusObjectives.count,
            rubricRating: rubricRating,
            isTransfer: isTransferRun,
            suggestedNugget: feedback?.optionalGoldenNugget
        )
        rewards = result

        // A real-world mission is only assigned once the behaviour has actually
        // moved — otherwise it's homework on something not yet learned.
        if improved, let skill = Curriculum.skill(id: targetSkillID) {
            store.assignRealWorldMission(
                skillID: targetSkillID,
                prompt: realWorldPrompt(for: skill)
            )
        }

        cleanUpRecordingsIfNeeded()
        stage = .summary
        services.haptics.reward()
    }

    private func realWorldPrompt(for skill: MicroSkill) -> String {
        "This week, use \"\(skill.name)\" once for real. \(skill.retryCue) Come back and tell me what happened."
    }

    /// Honours the privacy default: recordings are deleted once they have been
    /// analysed, unless the learner has chosen to keep them.
    private func cleanUpRecordingsIfNeeded() {
        guard !keepRecordings else { return }
        for state in attempts {
            if let name = state.audioFileName { AudioStore.delete(fileName: name) }
        }
        if let record = sessionRecord {
            for attempt in record.attempts { attempt.audioFileName = nil }
        }
        store.save()
    }

    func abandon() {
        services.recorder.cancel()
        for state in attempts {
            if let name = state.audioFileName { AudioStore.delete(fileName: name) }
        }
        if let record = sessionRecord, record.completedAt == nil {
            // An abandoned session shouldn't pollute the history or the stats.
            store.save()
        }
    }

    // MARK: - Persistence

    private func persistAttempt(_ state: AttemptState) {
        guard let record = sessionRecord else { return }
        let attempt = store.addAttempt(to: record, index: attemptIndex)
        attempt.transcript = state.transcript
        attempt.durationSeconds = state.duration
        attempt.audioFileName = keepRecordings ? state.audioFileName : nil
        attempt.metrics = state.metrics
        store.save()
    }
}
