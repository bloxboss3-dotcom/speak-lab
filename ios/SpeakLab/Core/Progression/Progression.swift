import Foundation

/// Things a learner can do that are worth experience.
///
/// Note what is absent: opening the app, viewing a lesson, and scrolling the
/// skill tree earn nothing. Every case here requires the learner to have
/// actually spoken, or to have reported doing so in real life.
public enum XPEvent: Hashable, Sendable {
    case attemptCompleted(DifficultyTier)
    case retryCompleted(DifficultyTier)
    /// The one that pays best: the targeted behaviour genuinely changed.
    case targetImproved(DifficultyTier)
    case bonusObjectiveMet
    case transferCompleted(DifficultyTier)
    case spacedReviewCompleted
    case realWorldMissionReported
    case baselineCompleted
}

public enum XPRules {

    public static func award(for event: XPEvent) -> Int {
        switch event {
        case .attemptCompleted(let tier):
            return scaled(20, tier)
        case .retryCompleted(let tier):
            return scaled(15, tier)
        case .targetImproved(let tier):
            // Deliberately the largest single award: applying feedback is the
            // behaviour the whole app is trying to produce.
            return scaled(45, tier)
        case .bonusObjectiveMet:
            return 10
        case .transferCompleted(let tier):
            return scaled(35, tier)
        case .spacedReviewCompleted:
            return 30
        case .realWorldMissionReported:
            return 60
        case .baselineCompleted:
            return 25
        }
    }

    private static func scaled(_ base: Int, _ tier: DifficultyTier) -> Int {
        Int((Double(base) * tier.xpMultiplier).rounded())
    }
}

/// Account level derived from total experience.
public enum LevelCurve {

    /// Experience needed to go from `level` to `level + 1`.
    public static func increment(forLevel level: Int) -> Int {
        guard level >= 1 else { return 150 }
        return 150 + 75 * (level - 1)
    }

    public static func totalXP(forLevel level: Int) -> Int {
        guard level > 1 else { return 0 }
        return (1..<level).reduce(0) { $0 + increment(forLevel: $1) }
    }

    public static func level(forXP xp: Int) -> Int {
        guard xp > 0 else { return 1 }
        var level = 1
        var consumed = 0
        while consumed + increment(forLevel: level) <= xp {
            consumed += increment(forLevel: level)
            level += 1
            if level > 500 { break }
        }
        return level
    }

    /// Progress through the current level, 0…1.
    public static func progress(forXP xp: Int) -> Double {
        let level = level(forXP: xp)
        let floorXP = totalXP(forLevel: level)
        let needed = increment(forLevel: level)
        guard needed > 0 else { return 0 }
        return min(1, max(0, Double(xp - floorXP) / Double(needed)))
    }

    public static func xpIntoCurrentLevel(_ xp: Int) -> Int {
        xp - totalXP(forLevel: level(forXP: xp))
    }
}

/// Earned names, not cosmetic junk. Each one marks a real change in what the
/// learner can do, and each is only reachable by practising.
public enum TitleLadder {

    public struct Title: Hashable, Sendable {
        public let level: Int
        public let name: String
        public let blurb: String
    }

    public static let titles: [Title] = [
        Title(level: 1, name: "First Rep", blurb: "You recorded your voice on purpose. Most people never do."),
        Title(level: 3, name: "Straight Talker", blurb: "You can get to the point without a run-up."),
        Title(level: 5, name: "Room Reader", blurb: "You ask before you answer."),
        Title(level: 8, name: "Steady Under Fire", blurb: "You stayed in the room when it got warm."),
        Title(level: 12, name: "Honest Persuader", blurb: "You move people without pushing them."),
        Title(level: 16, name: "The One They Ask For", blurb: "Difficult conversations get routed to you now."),
        Title(level: 22, name: "Quiet Authority", blurb: "You don't raise your voice. You don't need to.")
    ]

    public static func title(forLevel level: Int) -> Title {
        titles.last { $0.level <= level } ?? titles[0]
    }

    public static func nextTitle(forLevel level: Int) -> Title? {
        titles.first { $0.level > level }
    }
}

// MARK: - Mastery

public enum MasteryBand: String, Codable, Sendable, CaseIterable, Comparable {
    case learning
    case practising
    case proficient
    case fluent

    private var order: Int {
        switch self {
        case .learning: return 0
        case .practising: return 1
        case .proficient: return 2
        case .fluent: return 3
        }
    }

    public static func < (lhs: MasteryBand, rhs: MasteryBand) -> Bool { lhs.order < rhs.order }

    public var displayName: String {
        switch self {
        case .learning: return "Learning"
        case .practising: return "Practising"
        case .proficient: return "Proficient"
        case .fluent: return "Fluent"
        }
    }
}

/// One recorded piece of evidence that a skill was practised.
public struct SkillEvidence: Codable, Hashable, Sendable {
    public let scenarioID: String
    public let tier: DifficultyTier
    /// Whether the targeted behaviour actually changed on the retry.
    public let improved: Bool
    public let rubricRating: RubricRating?
    public let date: Date

    public init(
        scenarioID: String,
        tier: DifficultyTier,
        improved: Bool,
        rubricRating: RubricRating?,
        date: Date
    ) {
        self.scenarioID = scenarioID
        self.tier = tier
        self.improved = improved
        self.rubricRating = rubricRating
        self.date = date
    }
}

public struct MasteryResult: Hashable, Sendable {
    public let score: Double
    public let band: MasteryBand
    public let distinctScenarios: Int
    public let evidenceCount: Int
    /// Plain-language description of what would move the band up.
    public let nextRequirement: String

    public init(
        score: Double,
        band: MasteryBand,
        distinctScenarios: Int,
        evidenceCount: Int,
        nextRequirement: String
    ) {
        self.score = score
        self.band = band
        self.distinctScenarios = distinctScenarios
        self.evidenceCount = evidenceCount
        self.nextRequirement = nextRequirement
    }
}

/// Mastery is deliberately hard to fake.
///
/// It requires the behaviour to have held across several *different* scenarios,
/// because repeating one rehearsed scenario proves memorisation, not skill.
public enum MasteryEngine {

    public static func mastery(from evidence: [SkillEvidence]) -> MasteryResult {
        guard !evidence.isEmpty else {
            return MasteryResult(
                score: 0,
                band: .learning,
                distinctScenarios: 0,
                evidenceCount: 0,
                nextRequirement: "Practise this skill once to start tracking it."
            )
        }

        let distinct = Set(evidence.map { $0.scenarioID }).count
        let successRate = Double(evidence.filter { $0.improved }.count) / Double(evidence.count)

        // Breadth saturates at four different scenarios — beyond that, more
        // variety stops being the limiting factor.
        let breadth = min(1.0, Double(distinct) / 4.0)

        let ratingScore: Double
        let rated = evidence.compactMap { $0.rubricRating }
        if rated.isEmpty {
            ratingScore = successRate
        } else {
            ratingScore = rated.reduce(0.0) { $0 + $1.weight } / Double(rated.count)
        }

        let averageTier = evidence.reduce(0.0) { $0 + Double($1.tier.rawValue) } / Double(evidence.count)
        let tierFactor = min(1.0, (averageTier - 1) / 3.0)

        let score = min(1.0, 0.4 * successRate + 0.25 * breadth + 0.25 * ratingScore + 0.10 * tierFactor)

        let band = self.band(score: score, evidenceCount: evidence.count, distinct: distinct)
        return MasteryResult(
            score: score,
            band: band,
            distinctScenarios: distinct,
            evidenceCount: evidence.count,
            nextRequirement: requirement(for: band, evidenceCount: evidence.count, distinct: distinct)
        )
    }

    private static func band(score: Double, evidenceCount: Int, distinct: Int) -> MasteryBand {
        // Gates come before the score so that a single lucky session can never
        // produce a high band.
        if evidenceCount >= 5 && distinct >= 3 && score >= 0.75 { return .fluent }
        if evidenceCount >= 3 && distinct >= 2 && score >= 0.55 { return .proficient }
        if evidenceCount >= 2 && score >= 0.3 { return .practising }
        return .learning
    }

    private static func requirement(for band: MasteryBand, evidenceCount: Int, distinct: Int) -> String {
        switch band {
        case .learning:
            return "Complete two sessions on this skill, applying the feedback on the retry."
        case .practising:
            if distinct < 2 { return "Try this skill in a different scenario." }
            return "Land the target behaviour in one more session."
        case .proficient:
            if distinct < 3 { return "Prove it in a third, different scenario." }
            if evidenceCount < 5 { return "Two more successful sessions to reach Fluent." }
            return "Hold the behaviour under pressure to reach Fluent."
        case .fluent:
            return "Keep it alive with spaced review."
        }
    }
}

// MARK: - Spaced review

/// Scheduling state for one skill.
public struct ReviewState: Codable, Hashable, Sendable {
    public var intervalDays: Int
    public var ease: Double
    public var dueDate: Date
    public var lapses: Int
    public var reviewCount: Int

    public init(intervalDays: Int, ease: Double, dueDate: Date, lapses: Int = 0, reviewCount: Int = 0) {
        self.intervalDays = intervalDays
        self.ease = ease
        self.dueDate = dueDate
        self.lapses = lapses
        self.reviewCount = reviewCount
    }
}

/// A simplified spaced-repetition schedule.
///
/// Full SM-2 grades recall on five levels; here there are only two outcomes
/// (the behaviour held, or it didn't), so the ease adjustment is coarser.
public enum ReviewScheduler {

    public static let initialEase: Double = 2.2
    public static let minimumEase: Double = 1.4
    public static let maximumEase: Double = 2.8

    /// First scheduling after a skill is learned.
    public static func firstReview(from date: Date) -> ReviewState {
        ReviewState(
            intervalDays: 2,
            ease: initialEase,
            dueDate: addDays(2, to: date),
            lapses: 0,
            reviewCount: 0
        )
    }

    /// Next scheduling after a review attempt.
    public static func next(after state: ReviewState, success: Bool, on date: Date) -> ReviewState {
        var ease = state.ease
        var interval = state.intervalDays
        var lapses = state.lapses

        if success {
            ease = min(maximumEase, ease + 0.1)
            interval = max(2, Int((Double(max(1, interval)) * ease).rounded()))
        } else {
            ease = max(minimumEase, ease - 0.3)
            interval = 1
            lapses += 1
        }

        // A year is long enough that anything beyond it is noise.
        interval = min(interval, 365)

        return ReviewState(
            intervalDays: interval,
            ease: ease,
            dueDate: addDays(interval, to: date),
            lapses: lapses,
            reviewCount: state.reviewCount + 1
        )
    }

    public static func isDue(_ state: ReviewState, on date: Date) -> Bool {
        state.dueDate <= date
    }

    private static func addDays(_ days: Int, to date: Date) -> Date {
        date.addingTimeInterval(TimeInterval(days) * 86_400)
    }
}

// MARK: - Streaks

public struct StreakState: Codable, Hashable, Sendable {
    public var current: Int
    public var best: Int
    public var lastPracticeDay: Date?
    /// Missing a day costs a freeze rather than the streak. One is granted
    /// each week — enough to survive real life, not enough to be meaningless.
    public var freezesRemaining: Int
    public var freezeWeekStart: Date?

    public init(
        current: Int = 0,
        best: Int = 0,
        lastPracticeDay: Date? = nil,
        freezesRemaining: Int = 1,
        freezeWeekStart: Date? = nil
    ) {
        self.current = current
        self.best = best
        self.lastPracticeDay = lastPracticeDay
        self.freezesRemaining = freezesRemaining
        self.freezeWeekStart = freezeWeekStart
    }
}

public enum StreakOutcome: Equatable, Sendable {
    case started
    case extended
    case sameDay
    case savedByFreeze
    case reset
}

public enum StreakEngine {

    /// Records a practice session and returns the new state.
    ///
    /// There is no punishment path here by design: a lapsed streak quietly
    /// restarts at one. Nothing in the app tells the learner they have failed
    /// for missing days.
    public static func register(
        practiceOn date: Date,
        state: StreakState,
        calendar: Calendar = .current
    ) -> (state: StreakState, outcome: StreakOutcome) {
        var updated = refreshFreezes(state: state, on: date, calendar: calendar)
        let today = calendar.startOfDay(for: date)

        guard let last = updated.lastPracticeDay.map({ calendar.startOfDay(for: $0) }) else {
            updated.current = 1
            updated.best = max(updated.best, 1)
            updated.lastPracticeDay = today
            return (updated, .started)
        }

        let days = calendar.dateComponents([.day], from: last, to: today).day ?? 0

        switch days {
        case ..<0:
            return (updated, .sameDay)
        case 0:
            return (updated, .sameDay)
        case 1:
            updated.current += 1
            updated.best = max(updated.best, updated.current)
            updated.lastPracticeDay = today
            return (updated, .extended)
        case 2 where updated.freezesRemaining > 0:
            updated.freezesRemaining -= 1
            updated.current += 1
            updated.best = max(updated.best, updated.current)
            updated.lastPracticeDay = today
            return (updated, .savedByFreeze)
        default:
            updated.current = 1
            updated.best = max(updated.best, 1)
            updated.lastPracticeDay = today
            return (updated, .reset)
        }
    }

    private static func refreshFreezes(
        state: StreakState,
        on date: Date,
        calendar: Calendar
    ) -> StreakState {
        var updated = state
        let weekStart = startOfWeek(for: date, calendar: calendar)
        if let existing = updated.freezeWeekStart {
            if !calendar.isDate(existing, inSameDayAs: weekStart) {
                updated.freezeWeekStart = weekStart
                updated.freezesRemaining = 1
            }
        } else {
            updated.freezeWeekStart = weekStart
            updated.freezesRemaining = max(updated.freezesRemaining, 1)
        }
        return updated
    }

    public static func startOfWeek(for date: Date, calendar: Calendar) -> Date {
        let components = calendar.dateComponents([.yearForWeekOfYear, .weekOfYear], from: date)
        return calendar.date(from: components) ?? calendar.startOfDay(for: date)
    }
}

// MARK: - Weekly goal

public struct WeeklyGoal: Codable, Hashable, Sendable {
    public var target: Int
    public var completed: Int
    public var weekStart: Date

    public init(target: Int, completed: Int, weekStart: Date) {
        self.target = target
        self.completed = completed
        self.weekStart = weekStart
    }

    public var isMet: Bool { completed >= target }
    public var progress: Double {
        guard target > 0 else { return 0 }
        return min(1, Double(completed) / Double(target))
    }

    /// Rolls the counter over when a new week starts.
    public func rolledForward(to date: Date, calendar: Calendar = .current) -> WeeklyGoal {
        let currentWeek = StreakEngine.startOfWeek(for: date, calendar: calendar)
        guard !calendar.isDate(currentWeek, inSameDayAs: weekStart) else { return self }
        return WeeklyGoal(target: target, completed: 0, weekStart: currentWeek)
    }
}
