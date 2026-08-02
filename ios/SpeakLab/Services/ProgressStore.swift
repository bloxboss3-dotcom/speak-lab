import Foundation
import SwiftData

/// One itemised award, shown on the summary screen.
struct RewardLine: Identifiable {
    let id = UUID()
    let label: String
    let xp: Int
}

/// Everything that changes when a session finishes.
struct SessionRewards {
    var lines: [RewardLine] = []
    var totalXP: Int = 0
    var leveledUp = false
    var newLevel: Int = 1
    var newTitle: TitleLadder.Title?
    var streakOutcome: StreakOutcome = .sameDay
    var streakCurrent: Int = 0
    var masteryBandBefore: MasteryBand = .learning
    var masteryBandAfter: MasteryBand = .learning
    var unlockedNugget: GoldenNugget?
    var reviewDueDate: Date?
    var weeklyGoalJustMet = false

    var masteryImproved: Bool { masteryBandAfter > masteryBandBefore }
}

/// The single place that writes progression state.
///
/// Keeping every mutation here means the reward rules are auditable in one
/// file, and the views never have to know how XP or spaced review work.
@MainActor
final class ProgressStore {

    private let context: ModelContext
    private var calendar: Calendar

    init(context: ModelContext, calendar: Calendar = .current) {
        self.context = context
        self.calendar = calendar
    }

    // MARK: - Fetching

    func profile() -> ProfileRecord {
        let descriptor = FetchDescriptor<ProfileRecord>()
        if let existing = try? context.fetch(descriptor).first {
            return existing
        }
        let created = ProfileRecord()
        created.weekStart = StreakEngine.startOfWeek(for: Date(), calendar: calendar)
        context.insert(created)
        try? context.save()
        return created
    }

    func skillProgress(for skillID: String) -> SkillProgressRecord {
        let descriptor = FetchDescriptor<SkillProgressRecord>(
            predicate: #Predicate { $0.skillID == skillID }
        )
        if let existing = try? context.fetch(descriptor).first {
            return existing
        }
        let created = SkillProgressRecord(skillID: skillID)
        context.insert(created)
        return created
    }

    func allSkillProgress() -> [SkillProgressRecord] {
        (try? context.fetch(FetchDescriptor<SkillProgressRecord>())) ?? []
    }

    func recentSessions(limit: Int = 50) -> [PracticeSessionRecord] {
        var descriptor = FetchDescriptor<PracticeSessionRecord>(
            sortBy: [SortDescriptor(\.startedAt, order: .reverse)]
        )
        descriptor.fetchLimit = limit
        return (try? context.fetch(descriptor)) ?? []
    }

    func completedSessions() -> [PracticeSessionRecord] {
        recentSessions(limit: 500).filter { $0.completedAt != nil }
    }

    /// Skills whose spaced review has come due.
    func dueReviews(on date: Date = Date()) -> [SkillProgressRecord] {
        allSkillProgress()
            .filter { record in
                guard let state = record.reviewState else { return false }
                return ReviewScheduler.isDue(state, on: date)
            }
            .sorted { ($0.reviewDueDate ?? .distantFuture) < ($1.reviewDueDate ?? .distantFuture) }
    }

    func openRealWorldMissions() -> [RealWorldMissionRecord] {
        let descriptor = FetchDescriptor<RealWorldMissionRecord>(
            sortBy: [SortDescriptor(\.assignedAt, order: .reverse)]
        )
        return ((try? context.fetch(descriptor)) ?? []).filter { !$0.isComplete }
    }

    func unlockedNuggets() -> [UnlockedNuggetRecord] {
        let descriptor = FetchDescriptor<UnlockedNuggetRecord>(
            sortBy: [SortDescriptor(\.unlockedAt, order: .reverse)]
        )
        return (try? context.fetch(descriptor)) ?? []
    }

    // MARK: - Session lifecycle

    func startSession(scenario: Scenario, skillID: String, isReview: Bool = false) -> PracticeSessionRecord {
        let record = PracticeSessionRecord(
            scenarioID: scenario.id,
            skillID: skillID,
            mode: scenario.mode
        )
        record.isReview = isReview
        record.isBaseline = scenario.tags.contains("baseline")
        context.insert(record)
        try? context.save()
        return record
    }

    func addAttempt(to session: PracticeSessionRecord, index: Int) -> AttemptRecord {
        let attempt = AttemptRecord(index: index)
        attempt.session = session
        session.attempts.append(attempt)
        context.insert(attempt)
        return attempt
    }

    /// Applies every reward rule for a finished session and returns what changed.
    ///
    /// The ordering of the reward lines matters: applying feedback is listed
    /// first and pays most, because that is the behaviour the app is trying to
    /// produce. Simply showing up earns nothing.
    func completeSession(
        _ session: PracticeSessionRecord,
        scenario: Scenario,
        targetSkillID: String,
        improved: Bool,
        bonusObjectivesMet: Int,
        rubricRating: RubricRating?,
        isTransfer: Bool,
        suggestedNugget: GoldenNugget?,
        now: Date = Date()
    ) -> SessionRewards {
        var rewards = SessionRewards()
        let profile = profile()
        let skill = skillProgress(for: targetSkillID)
        rewards.masteryBandBefore = skill.mastery.band

        func award(_ label: String, _ event: XPEvent) {
            let points = XPRules.award(for: event)
            rewards.lines.append(RewardLine(label: label, xp: points))
            rewards.totalXP += points
        }

        if session.isBaseline {
            award("Baseline recorded", .baselineCompleted)
        } else {
            award("Attempt completed", .attemptCompleted(scenario.tier))
        }

        if session.orderedAttempts.count > 1 {
            award("Retry completed", .retryCompleted(scenario.tier))
        }
        if improved {
            award("Applied the feedback", .targetImproved(scenario.tier))
        }
        for _ in 0..<max(0, bonusObjectivesMet) {
            award("Bonus objective", .bonusObjectiveMet)
        }
        if isTransfer {
            award("Transfer scenario", .transferCompleted(scenario.tier))
        }
        if session.isReview {
            award("Spaced review", .spacedReviewCompleted)
        }

        // Persist session outcome.
        session.completedAt = now
        session.targetImproved = improved
        session.xpAwarded = rewards.totalXP

        // Profile: XP, level, streak, weekly goal.
        let levelBefore = profile.level
        profile.totalXP += rewards.totalXP
        rewards.newLevel = profile.level
        rewards.leveledUp = profile.level > levelBefore
        if rewards.leveledUp {
            let title = TitleLadder.title(forLevel: profile.level)
            if title.level > TitleLadder.title(forLevel: levelBefore).level {
                rewards.newTitle = title
            }
        }

        let streak = StreakEngine.register(practiceOn: now, state: profile.streakState, calendar: calendar)
        profile.streakState = streak.state
        rewards.streakOutcome = streak.outcome
        rewards.streakCurrent = streak.state.current

        var goal = profile.weeklyGoal.rolledForward(to: now, calendar: calendar)
        let wasMet = goal.isMet
        goal.completed += 1
        rewards.weeklyGoalJustMet = !wasMet && goal.isMet
        profile.weeklyGoal = goal

        if session.isBaseline, profile.baselineCompletedAt == nil {
            profile.baselineCompletedAt = now
        }

        // Skill: evidence, mastery, spaced review.
        skill.xp += rewards.totalXP
        skill.lastPracticedAt = now
        var evidence = skill.evidence
        evidence.append(
            SkillEvidence(
                scenarioID: scenario.id,
                tier: scenario.tier,
                improved: improved,
                rubricRating: rubricRating,
                date: now
            )
        )
        skill.evidence = evidence
        rewards.masteryBandAfter = skill.mastery.band

        if let existing = skill.reviewState {
            skill.reviewState = ReviewScheduler.next(after: existing, success: improved, on: now)
        } else {
            skill.reviewState = ReviewScheduler.firstReview(from: now)
        }
        rewards.reviewDueDate = skill.reviewDueDate

        // Nuggets unlock once and stay in the collection.
        if let nugget = suggestedNugget, !profile.seenNuggetIDs.contains(nugget.id) {
            profile.seenNuggetIDs.append(nugget.id)
            context.insert(UnlockedNuggetRecord(nuggetID: nugget.id))
            rewards.unlockedNugget = nugget
        }

        try? context.save()
        return rewards
    }

    /// The learner reports having used the skill for real. This is the highest
    /// single award in the app, because transfer into real life is the point.
    func recordRealWorldReport(
        mission: RealWorldMissionRecord,
        reflection: String,
        selfRating: Int,
        now: Date = Date()
    ) -> Int {
        mission.completedAt = now
        mission.reflection = reflection
        mission.selfRating = selfRating

        let points = XPRules.award(for: .realWorldMissionReported)
        let profile = profile()
        profile.totalXP += points

        let skill = skillProgress(for: mission.skillID)
        skill.xp += points
        try? context.save()
        return points
    }

    func assignRealWorldMission(skillID: String, prompt: String) {
        let existing = openRealWorldMissions().first { $0.skillID == skillID }
        guard existing == nil else { return }
        context.insert(RealWorldMissionRecord(skillID: skillID, prompt: prompt))
        try? context.save()
    }

    func setWeeklyTarget(_ target: Int) {
        let profile = profile()
        profile.weeklyTarget = max(1, min(14, target))
        try? context.save()
    }

    func save() {
        try? context.save()
    }

    // MARK: - Privacy

    /// Removes every recording from disk, keeping transcripts and progress.
    func deleteAllRecordings() {
        AudioStore.deleteAll()
        for session in recentSessions(limit: 1000) {
            for attempt in session.attempts {
                attempt.audioFileName = nil
            }
        }
        try? context.save()
    }

    /// Removes recordings and transcripts, keeping only progression totals.
    func deleteAllTranscripts() {
        deleteAllRecordings()
        for session in recentSessions(limit: 1000) {
            for attempt in session.attempts {
                attempt.transcript = ""
                attempt.conversationData = nil
            }
        }
        try? context.save()
    }

    /// The full reset: every recording, transcript, session and progress row.
    func deleteEverything() {
        AudioStore.deleteAll()
        try? context.delete(model: AttemptRecord.self)
        try? context.delete(model: PracticeSessionRecord.self)
        try? context.delete(model: SkillProgressRecord.self)
        try? context.delete(model: UnlockedNuggetRecord.self)
        try? context.delete(model: RealWorldMissionRecord.self)
        try? context.delete(model: ProfileRecord.self)
        try? context.save()
    }
}
