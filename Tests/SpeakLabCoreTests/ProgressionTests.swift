import XCTest
// The same test suite runs in two places: `swift test` compiles Core as the
// SpeakLabCore package, while the Xcode test target compiles those files into
// the app module. This picks whichever exists.
#if canImport(SpeakLabCore)
@testable import SpeakLabCore
#else
@testable import SpeakLab
#endif

final class ProgressionTests: XCTestCase {

    private var utcCalendar: Calendar = {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(secondsFromGMT: 0)!
        return calendar
    }()

    private func day(_ offset: Int, from base: Date = Date(timeIntervalSince1970: 1_700_000_000)) -> Date {
        base.addingTimeInterval(TimeInterval(offset) * 86_400)
    }

    // MARK: - XP

    func testApplyingFeedbackPaysMoreThanAttemptingOrRetrying() {
        let attempt = XPRules.award(for: .attemptCompleted(.applied))
        let retry = XPRules.award(for: .retryCompleted(.applied))
        let improved = XPRules.award(for: .targetImproved(.applied))

        XCTAssertGreaterThan(improved, attempt)
        XCTAssertGreaterThan(improved, retry)
    }

    func testHarderTiersPayMore() {
        XCTAssertGreaterThan(
            XPRules.award(for: .attemptCompleted(.boss)),
            XPRules.award(for: .attemptCompleted(.foundation))
        )
    }

    func testAttemptingHardWorkStillPaysSomething() {
        // A failed attempt at a boss scenario should still be worth more than nothing.
        XCTAssertGreaterThan(XPRules.award(for: .attemptCompleted(.boss)), 0)
    }

    func testRealWorldReportIsTheHighestSingleAward() {
        let realWorld = XPRules.award(for: .realWorldMissionReported)
        XCTAssertGreaterThanOrEqual(realWorld, XPRules.award(for: .targetImproved(.applied)))
        XCTAssertGreaterThan(realWorld, XPRules.award(for: .spacedReviewCompleted))
    }

    // MARK: - Levels

    func testLevelCurveIsMonotonicAndConsistent() {
        var lastLevel = 1
        for xp in stride(from: 0, through: 5000, by: 25) {
            let level = LevelCurve.level(forXP: xp)
            XCTAssertGreaterThanOrEqual(level, lastLevel, "Level must never go down as XP rises")
            lastLevel = level
        }
    }

    func testLevelBoundariesMatchTotals() {
        for level in 1...20 {
            let floorXP = LevelCurve.totalXP(forLevel: level)
            XCTAssertEqual(LevelCurve.level(forXP: floorXP), level)
            if level > 1 {
                XCTAssertEqual(LevelCurve.level(forXP: floorXP - 1), level - 1)
            }
        }
    }

    func testProgressIsZeroAtLevelBoundary() {
        let floorXP = LevelCurve.totalXP(forLevel: 4)
        XCTAssertEqual(LevelCurve.progress(forXP: floorXP), 0, accuracy: 0.0001)
        XCTAssertEqual(LevelCurve.xpIntoCurrentLevel(floorXP), 0)
    }

    func testTitleLadderResolvesForAnyLevel() {
        XCTAssertEqual(TitleLadder.title(forLevel: 1).name, "First Rep")
        XCTAssertEqual(TitleLadder.title(forLevel: 4).name, "Straight Talker")
        XCTAssertEqual(TitleLadder.title(forLevel: 999).name, TitleLadder.titles.last?.name)
        XCTAssertNil(TitleLadder.nextTitle(forLevel: 999))
    }

    // MARK: - Mastery

    private func evidence(
        scenario: String,
        improved: Bool,
        tier: DifficultyTier = .applied,
        rating: RubricRating? = .strong
    ) -> SkillEvidence {
        SkillEvidence(scenarioID: scenario, tier: tier, improved: improved, rubricRating: rating, date: Date())
    }

    func testNoEvidenceMeansLearning() {
        let result = MasteryEngine.mastery(from: [])
        XCTAssertEqual(result.band, .learning)
        XCTAssertEqual(result.score, 0)
    }

    func testRepeatingOneScenarioCannotReachFluent() {
        // Six perfect runs of the *same* scenario proves memorisation, not skill.
        let repeated = (0..<6).map { _ in evidence(scenario: "same-one", improved: true) }
        let result = MasteryEngine.mastery(from: repeated)

        XCTAssertNotEqual(result.band, .fluent)
        XCTAssertEqual(result.distinctScenarios, 1)
    }

    func testBreadthAndConsistencyReachFluent() {
        let varied = [
            evidence(scenario: "a", improved: true, tier: .applied),
            evidence(scenario: "b", improved: true, tier: .applied),
            evidence(scenario: "c", improved: true, tier: .pressure),
            evidence(scenario: "d", improved: true, tier: .pressure),
            evidence(scenario: "e", improved: true, tier: .boss)
        ]
        XCTAssertEqual(MasteryEngine.mastery(from: varied).band, .fluent)
    }

    func testFailedAttemptsHoldTheBandDown() {
        let mixed = [
            evidence(scenario: "a", improved: false, rating: .needsWork),
            evidence(scenario: "b", improved: false, rating: .needsWork),
            evidence(scenario: "c", improved: false, rating: .needsWork),
            evidence(scenario: "d", improved: false, rating: .needsWork),
            evidence(scenario: "e", improved: false, rating: .needsWork)
        ]
        XCTAssertLessThan(MasteryEngine.mastery(from: mixed).band, .proficient)
    }

    func testMasteryScoreNeverExceedsOne() {
        let perfect = (0..<12).map { evidence(scenario: "s\($0)", improved: true, tier: .boss) }
        XCTAssertLessThanOrEqual(MasteryEngine.mastery(from: perfect).score, 1.0)
    }

    func testNextRequirementIsAlwaysActionable() {
        for band in MasteryBand.allCases {
            let count = band == .learning ? 0 : 3
            let sample = (0..<count).map { evidence(scenario: "s\($0)", improved: true) }
            XCTAssertFalse(MasteryEngine.mastery(from: sample).nextRequirement.isEmpty)
        }
    }

    // MARK: - Spaced review

    func testFirstReviewIsScheduledTwoDaysOut() {
        let now = day(0)
        let state = ReviewScheduler.firstReview(from: now)
        XCTAssertEqual(state.intervalDays, 2)
        XCTAssertEqual(state.dueDate.timeIntervalSince(now), 2 * 86_400, accuracy: 1)
    }

    func testSuccessfulReviewsLengthenTheInterval() {
        var state = ReviewScheduler.firstReview(from: day(0))
        let firstInterval = state.intervalDays

        state = ReviewScheduler.next(after: state, success: true, on: day(2))
        XCTAssertGreaterThan(state.intervalDays, firstInterval)

        let second = state.intervalDays
        state = ReviewScheduler.next(after: state, success: true, on: day(2 + second))
        XCTAssertGreaterThan(state.intervalDays, second)
    }

    func testFailedReviewResetsIntervalAndRecordsLapse() {
        var state = ReviewScheduler.firstReview(from: day(0))
        state = ReviewScheduler.next(after: state, success: true, on: day(2))
        state = ReviewScheduler.next(after: state, success: false, on: day(8))

        XCTAssertEqual(state.intervalDays, 1)
        XCTAssertEqual(state.lapses, 1)
        XCTAssertLessThan(state.ease, ReviewScheduler.initialEase)
    }

    func testEaseStaysWithinBounds() {
        var state = ReviewScheduler.firstReview(from: day(0))
        for index in 0..<40 {
            state = ReviewScheduler.next(after: state, success: true, on: day(index))
        }
        XCTAssertLessThanOrEqual(state.ease, ReviewScheduler.maximumEase)

        for index in 0..<40 {
            state = ReviewScheduler.next(after: state, success: false, on: day(index))
        }
        XCTAssertGreaterThanOrEqual(state.ease, ReviewScheduler.minimumEase)
    }

    func testIntervalIsCappedAtAYear() {
        var state = ReviewScheduler.firstReview(from: day(0))
        for index in 0..<50 {
            state = ReviewScheduler.next(after: state, success: true, on: day(index))
        }
        XCTAssertLessThanOrEqual(state.intervalDays, 365)
    }

    func testDueDetection() {
        let state = ReviewScheduler.firstReview(from: day(0))
        XCTAssertFalse(ReviewScheduler.isDue(state, on: day(1)))
        XCTAssertTrue(ReviewScheduler.isDue(state, on: day(3)))
    }

    // MARK: - Streaks

    func testFirstPracticeStartsStreak() {
        let (state, outcome) = StreakEngine.register(practiceOn: day(0), state: StreakState(), calendar: utcCalendar)
        XCTAssertEqual(outcome, .started)
        XCTAssertEqual(state.current, 1)
    }

    func testSecondSessionSameDayDoesNotDoubleCount() {
        var (state, _) = StreakEngine.register(practiceOn: day(0), state: StreakState(), calendar: utcCalendar)
        let result = StreakEngine.register(
            practiceOn: day(0).addingTimeInterval(3600),
            state: state,
            calendar: utcCalendar
        )
        state = result.state
        XCTAssertEqual(result.outcome, .sameDay)
        XCTAssertEqual(state.current, 1)
    }

    func testConsecutiveDaysExtendStreak() {
        var state = StreakState()
        for index in 0..<4 {
            state = StreakEngine.register(practiceOn: day(index), state: state, calendar: utcCalendar).state
        }
        XCTAssertEqual(state.current, 4)
        XCTAssertEqual(state.best, 4)
    }

    func testOneMissedDayIsCoveredByAFreeze() {
        var state = StreakEngine.register(practiceOn: day(0), state: StreakState(), calendar: utcCalendar).state
        let result = StreakEngine.register(practiceOn: day(2), state: state, calendar: utcCalendar)
        state = result.state

        XCTAssertEqual(result.outcome, .savedByFreeze)
        XCTAssertEqual(state.current, 2, "The streak survives a single missed day")
        XCTAssertEqual(state.freezesRemaining, 0)
    }

    func testLongGapResetsStreakButKeepsPersonalBest() {
        var state = StreakState()
        for index in 0..<5 {
            state = StreakEngine.register(practiceOn: day(index), state: state, calendar: utcCalendar).state
        }
        let result = StreakEngine.register(practiceOn: day(20), state: state, calendar: utcCalendar)

        XCTAssertEqual(result.outcome, .reset)
        XCTAssertEqual(result.state.current, 1)
        XCTAssertEqual(result.state.best, 5, "A lapse must never erase the personal best")
    }

    func testFreezeIsRestoredInANewWeek() {
        var state = StreakEngine.register(practiceOn: day(0), state: StreakState(), calendar: utcCalendar).state
        state = StreakEngine.register(practiceOn: day(2), state: state, calendar: utcCalendar).state
        XCTAssertEqual(state.freezesRemaining, 0)

        // Practising a fortnight later lands in a new week and restores the freeze.
        state = StreakEngine.register(practiceOn: day(16), state: state, calendar: utcCalendar).state
        XCTAssertEqual(state.freezesRemaining, 1)
    }

    // MARK: - Weekly goal

    func testWeeklyGoalProgressAndCompletion() {
        let goal = WeeklyGoal(target: 3, completed: 2, weekStart: day(0))
        XCTAssertFalse(goal.isMet)
        XCTAssertEqual(goal.progress, 2.0 / 3.0, accuracy: 0.0001)

        let met = WeeklyGoal(target: 3, completed: 4, weekStart: day(0))
        XCTAssertTrue(met.isMet)
        XCTAssertEqual(met.progress, 1.0)
    }

    func testWeeklyGoalRollsOverIntoANewWeek() {
        let weekStart = StreakEngine.startOfWeek(for: day(0), calendar: utcCalendar)
        let goal = WeeklyGoal(target: 3, completed: 3, weekStart: weekStart)

        let sameWeek = goal.rolledForward(to: day(1), calendar: utcCalendar)
        XCTAssertEqual(sameWeek.completed, 3)

        let nextWeek = goal.rolledForward(to: day(9), calendar: utcCalendar)
        XCTAssertEqual(nextWeek.completed, 0)
        XCTAssertEqual(nextWeek.target, 3)
    }
}
