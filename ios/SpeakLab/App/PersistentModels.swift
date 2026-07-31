import Foundation
import SwiftData

/// SwiftData models.
///
/// The graph is deliberately shallow — one relationship, everything else stored
/// as a scalar or as JSON-encoded `Data` of a `Codable` type from Core. Rich
/// value types (metrics, feedback, conversation turns) live in Core where they
/// are unit-tested; persisting them as JSON keeps the schema stable when those
/// types gain fields, and sidesteps the transformable-property sharp edges in
/// early SwiftData.

@Model
final class ProfileRecord {
    var totalXP: Int = 0
    var createdAt: Date = Date()

    // Streak
    var streakCurrent: Int = 0
    var streakBest: Int = 0
    var lastPracticeDay: Date?
    var freezesRemaining: Int = 1
    var freezeWeekStart: Date?

    // Weekly goal
    var weeklyTarget: Int = 4
    var weeklyCompleted: Int = 0
    var weekStart: Date = Date()

    /// Golden nuggets already shown, so the library isn't repeated at people.
    var seenNuggetIDs: [String] = []

    var baselineCompletedAt: Date?
    var lastReassessmentAt: Date?

    /// Privacy default: recordings are deleted once analysis finishes.
    var keepRecordings: Bool = false
    /// Whether to ask for an anxiety rating before and after a session.
    var trackAnxiety: Bool = true

    init() {}

    var streakState: StreakState {
        get {
            StreakState(
                current: streakCurrent,
                best: streakBest,
                lastPracticeDay: lastPracticeDay,
                freezesRemaining: freezesRemaining,
                freezeWeekStart: freezeWeekStart
            )
        }
        set {
            streakCurrent = newValue.current
            streakBest = newValue.best
            lastPracticeDay = newValue.lastPracticeDay
            freezesRemaining = newValue.freezesRemaining
            freezeWeekStart = newValue.freezeWeekStart
        }
    }

    var weeklyGoal: WeeklyGoal {
        get { WeeklyGoal(target: weeklyTarget, completed: weeklyCompleted, weekStart: weekStart) }
        set {
            weeklyTarget = newValue.target
            weeklyCompleted = newValue.completed
            weekStart = newValue.weekStart
        }
    }

    var level: Int { LevelCurve.level(forXP: totalXP) }
    var title: TitleLadder.Title { TitleLadder.title(forLevel: level) }
}

@Model
final class PracticeSessionRecord {
    var id: UUID = UUID()
    var scenarioID: String = ""
    var skillID: String = ""
    var modeRaw: String = PracticeMode.speaking.rawValue
    var startedAt: Date = Date()
    var completedAt: Date?
    var xpAwarded: Int = 0
    /// Whether the retry actually moved the targeted behaviour.
    var targetImproved: Bool = false
    /// True when this session was scheduled by spaced review.
    var isReview: Bool = false
    /// True when this was a baseline or re-baseline measurement.
    var isBaseline: Bool = false
    var anxietyBefore: Int?
    var anxietyAfter: Int?
    /// Set when the learner reports having used the skill for real.
    var realWorldReflection: String?
    var realWorldReportedAt: Date?

    @Relationship(deleteRule: .cascade, inverse: \AttemptRecord.session)
    var attempts: [AttemptRecord] = []

    init(scenarioID: String, skillID: String, mode: PracticeMode) {
        self.scenarioID = scenarioID
        self.skillID = skillID
        self.modeRaw = mode.rawValue
    }

    var mode: PracticeMode { PracticeMode(rawValue: modeRaw) ?? .speaking }
    var scenario: Scenario? { ScenarioLibrary.scenario(id: scenarioID) }
    var skill: MicroSkill? { Curriculum.skill(id: skillID) }
    var orderedAttempts: [AttemptRecord] { attempts.sorted { $0.index < $1.index } }
}

@Model
final class AttemptRecord {
    var id: UUID = UUID()
    /// 0 = first attempt, 1 = retry, and so on.
    var index: Int = 0
    var createdAt: Date = Date()
    var transcript: String = ""
    /// Filename inside the app's recordings directory. Nil once deleted.
    var audioFileName: String?
    var durationSeconds: Double = 0

    /// JSON of `SpeakingMetrics`.
    var metricsData: Data?
    /// JSON of `CoachFeedback`.
    var feedbackData: Data?
    /// JSON of `[ConversationTurn]` for conversation attempts.
    var conversationData: Data?
    /// JSON of `AttemptComparison`, present on retries.
    var comparisonData: Data?
    /// True when the feedback came from the on-device engine rather than Claude.
    var feedbackWasLocal: Bool = false
    /// False when the model's evidence quote could not be found in the transcript.
    var evidenceVerified: Bool = true

    var session: PracticeSessionRecord?

    init(index: Int) {
        self.index = index
    }

    var metrics: SpeakingMetrics? {
        get { CodableStore.decode(SpeakingMetrics.self, from: metricsData) }
        set { metricsData = CodableStore.encode(newValue) }
    }

    var feedback: CoachFeedback? {
        get { CodableStore.decode(CoachFeedback.self, from: feedbackData) }
        set { feedbackData = CodableStore.encode(newValue) }
    }

    var conversationTurns: [ConversationTurn]? {
        get { CodableStore.decode([ConversationTurn].self, from: conversationData) }
        set { conversationData = CodableStore.encode(newValue) }
    }

    var comparison: AttemptComparison? {
        get { CodableStore.decode(AttemptComparison.self, from: comparisonData) }
        set { comparisonData = CodableStore.encode(newValue) }
    }
}

@Model
final class SkillProgressRecord {
    var skillID: String = ""
    var xp: Int = 0
    var lastPracticedAt: Date?
    /// JSON of `[SkillEvidence]`.
    var evidenceData: Data?

    // Spaced review state
    var reviewIntervalDays: Int = 0
    var reviewEase: Double = ReviewScheduler.initialEase
    var reviewDueDate: Date?
    var reviewLapses: Int = 0
    var reviewCount: Int = 0

    init(skillID: String) {
        self.skillID = skillID
    }

    var evidence: [SkillEvidence] {
        get { CodableStore.decode([SkillEvidence].self, from: evidenceData) ?? [] }
        set { evidenceData = CodableStore.encode(newValue) }
    }

    var mastery: MasteryResult { MasteryEngine.mastery(from: evidence) }

    var reviewState: ReviewState? {
        get {
            guard let dueDate = reviewDueDate else { return nil }
            return ReviewState(
                intervalDays: reviewIntervalDays,
                ease: reviewEase,
                dueDate: dueDate,
                lapses: reviewLapses,
                reviewCount: reviewCount
            )
        }
        set {
            reviewIntervalDays = newValue?.intervalDays ?? 0
            reviewEase = newValue?.ease ?? ReviewScheduler.initialEase
            reviewDueDate = newValue?.dueDate
            reviewLapses = newValue?.lapses ?? 0
            reviewCount = newValue?.reviewCount ?? 0
        }
    }

    var skill: MicroSkill? { Curriculum.skill(id: skillID) }
}

@Model
final class UnlockedNuggetRecord {
    var nuggetID: String = ""
    var unlockedAt: Date = Date()

    init(nuggetID: String) {
        self.nuggetID = nuggetID
    }

    var nugget: GoldenNugget? { NuggetLibrary.nugget(id: nuggetID) }
}

/// A commitment to use a skill in real life, and the reflection afterwards.
@Model
final class RealWorldMissionRecord {
    var id: UUID = UUID()
    var skillID: String = ""
    var prompt: String = ""
    var assignedAt: Date = Date()
    var completedAt: Date?
    var reflection: String?
    /// The learner's own read of how it went, 1–5. Self-reported by design:
    /// the app cannot observe real conversations and should not pretend to.
    var selfRating: Int?

    init(skillID: String, prompt: String) {
        self.skillID = skillID
        self.prompt = prompt
    }

    var skill: MicroSkill? { Curriculum.skill(id: skillID) }
    var isComplete: Bool { completedAt != nil }
}

/// JSON helpers for the `Data`-backed properties above.
enum CodableStore {
    private static let encoder = JSONEncoder()
    private static let decoder = JSONDecoder()

    static func encode<T: Encodable>(_ value: T?) -> Data? {
        guard let value else { return nil }
        return try? encoder.encode(value)
    }

    static func decode<T: Decodable>(_ type: T.Type, from data: Data?) -> T? {
        guard let data else { return nil }
        return try? decoder.decode(type, from: data)
    }
}

enum SpeakLabSchema {
    /// The single definition of the store's shape, used by the container.
    ///
    /// Deletion is done with explicit per-type calls rather than iterating this
    /// list: `ModelContext.delete(model:)` is generic, and handing it an
    /// existential metatype does not compile.
    static let schema = Schema([
        ProfileRecord.self,
        PracticeSessionRecord.self,
        AttemptRecord.self,
        SkillProgressRecord.self,
        UnlockedNuggetRecord.self,
        RealWorldMissionRecord.self
    ])
}
