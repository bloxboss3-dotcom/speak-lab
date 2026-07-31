import { describe, expect, it } from 'vitest'
import {
  EMPTY_STREAK,
  LevelCurve,
  ReviewScheduler,
  addDays,
  computeMastery,
  nextTitleAfter,
  registerPractice,
  rolledForward,
  startOfWeek,
  titleForLevel,
  weeklyGoalIsMet,
  weeklyGoalProgress,
  xpAward,
  type SkillEvidence,
  type StreakState,
} from './progression'

// Mirrors Tests/SpeakLabCoreTests/ProgressionTests.swift.

describe('experience', () => {
  it('pays more for applying feedback than for attempting or retrying', () => {
    const improved = xpAward({ kind: 'targetImproved', tier: 1 })
    expect(improved).toBeGreaterThan(xpAward({ kind: 'attemptCompleted', tier: 1 }))
    expect(improved).toBeGreaterThan(xpAward({ kind: 'retryCompleted', tier: 1 }))
  })

  it('pays more at harder tiers', () => {
    expect(xpAward({ kind: 'attemptCompleted', tier: 4 })).toBeGreaterThan(
      xpAward({ kind: 'attemptCompleted', tier: 1 }),
    )
  })

  it('still pays something for attempting hard work', () => {
    expect(xpAward({ kind: 'attemptCompleted', tier: 3 })).toBeGreaterThan(0)
  })

  it('rewards reporting real-world use above in-app repetition', () => {
    // Only the hardest tiers of applying feedback or transferring a skill are
    // allowed to out-earn actually using it with a real person.
    const realWorld = xpAward({ kind: 'realWorldMissionReported' })
    expect(realWorld).toBeGreaterThanOrEqual(xpAward({ kind: 'targetImproved', tier: 2 }))
    expect(realWorld).toBeGreaterThan(xpAward({ kind: 'spacedReviewCompleted' }))
    expect(realWorld).toBeGreaterThan(xpAward({ kind: 'attemptCompleted', tier: 4 }))
    expect(realWorld).toBeGreaterThan(xpAward({ kind: 'retryCompleted', tier: 4 }))
  })
})

describe('levels', () => {
  it('is monotonic and self-consistent', () => {
    let previous = 0
    for (let level = 1; level <= 25; level += 1) {
      const total = LevelCurve.totalXP(level)
      expect(total).toBeGreaterThanOrEqual(previous)
      previous = total
      expect(LevelCurve.level(total)).toBe(level)
    }
  })

  it('places boundaries exactly at the totals', () => {
    for (let level = 1; level <= 12; level += 1) {
      const total = LevelCurve.totalXP(level)
      expect(LevelCurve.level(total)).toBe(level)
      if (level > 1) expect(LevelCurve.level(total - 1)).toBe(level - 1)
    }
  })

  it('reports zero progress at a level boundary', () => {
    expect(LevelCurve.progress(LevelCurve.totalXP(4))).toBeCloseTo(0, 6)
    expect(LevelCurve.xpIntoCurrentLevel(LevelCurve.totalXP(4))).toBe(0)
  })

  it('resolves a title for any level', () => {
    for (const level of [1, 2, 7, 15, 40, 400]) {
      expect(titleForLevel(level).name.length).toBeGreaterThan(0)
    }
    expect(nextTitleAfter(1)?.level).toBe(3)
    expect(nextTitleAfter(99)).toBeUndefined()
  })
})

describe('mastery', () => {
  const date = new Date('2026-03-01T10:00:00Z').toISOString()

  function evidence(scenarioID: string, improved: boolean, tier: 1 | 2 | 3 | 4): SkillEvidence {
    return { scenarioID, tier, improved, rubricRating: improved ? 'strong' : 'needsWork', date }
  }

  it('reports learning with no evidence', () => {
    const result = computeMastery([])
    expect(result.band).toBe('learning')
    expect(result.score).toBe(0)
  })

  it('cannot reach fluent by repeating one scenario', () => {
    const repeated = Array.from({ length: 8 }, () => evidence('spk-buddy-week', true, 2))
    expect(computeMastery(repeated).band).not.toBe('fluent')
  })

  it('reaches fluent with breadth and consistency', () => {
    const result = computeMastery([
      evidence('a', true, 2),
      evidence('b', true, 3),
      evidence('c', true, 3),
      evidence('d', true, 4),
      evidence('e', true, 3),
    ])
    expect(result.band).toBe('fluent')
    expect(result.distinctScenarios).toBe(5)
  })

  it('holds the band down when attempts fail', () => {
    const result = computeMastery([
      evidence('a', false, 2),
      evidence('b', false, 2),
      evidence('c', false, 2),
      evidence('d', true, 2),
    ])
    expect(['learning', 'practising']).toContain(result.band)
  })

  it('never exceeds a score of one', () => {
    const perfect = Array.from({ length: 12 }, (_, index) => evidence(`s${index}`, true, 4))
    expect(computeMastery(perfect).score).toBeLessThanOrEqual(1)
  })

  it('always gives an actionable next requirement', () => {
    for (const sample of [
      [],
      [evidence('a', true, 1)],
      [evidence('a', true, 1), evidence('b', true, 2), evidence('c', true, 2)],
    ]) {
      expect(computeMastery(sample).nextRequirement.length).toBeGreaterThan(10)
    }
  })
})

describe('spaced review', () => {
  const start = new Date('2026-03-01T09:00:00Z')

  it('schedules the first review two days out', () => {
    const state = ReviewScheduler.firstReview(start)
    expect(state.intervalDays).toBe(2)
    expect(new Date(state.dueDate).getTime()).toBe(addDays(start, 2).getTime())
  })

  it('lengthens the interval after successful reviews', () => {
    let state = ReviewScheduler.firstReview(start)
    const first = state.intervalDays
    state = ReviewScheduler.next(state, true, start)
    expect(state.intervalDays).toBeGreaterThan(first)
    expect(state.reviewCount).toBe(1)
  })

  it('resets the interval and records a lapse on failure', () => {
    let state = ReviewScheduler.firstReview(start)
    state = ReviewScheduler.next(state, true, start)
    state = ReviewScheduler.next(state, false, start)
    expect(state.intervalDays).toBe(1)
    expect(state.lapses).toBe(1)
  })

  it('keeps ease within bounds', () => {
    let state = ReviewScheduler.firstReview(start)
    for (let index = 0; index < 40; index += 1) state = ReviewScheduler.next(state, true, start)
    expect(state.ease).toBeLessThanOrEqual(ReviewScheduler.maximumEase)
    for (let index = 0; index < 40; index += 1) state = ReviewScheduler.next(state, false, start)
    expect(state.ease).toBeGreaterThanOrEqual(ReviewScheduler.minimumEase)
  })

  it('caps the interval at a year', () => {
    let state = ReviewScheduler.firstReview(start)
    for (let index = 0; index < 30; index += 1) state = ReviewScheduler.next(state, true, start)
    expect(state.intervalDays).toBeLessThanOrEqual(365)
  })

  it('detects when a review is due', () => {
    const state = ReviewScheduler.firstReview(start)
    expect(ReviewScheduler.isDue(state, addDays(start, 1))).toBe(false)
    expect(ReviewScheduler.isDue(state, addDays(start, 2))).toBe(true)
  })
})

describe('streaks', () => {
  const monday = new Date('2026-03-02T09:00:00')

  it('starts a streak on the first practice', () => {
    const { state, outcome } = registerPractice(monday, EMPTY_STREAK)
    expect(outcome).toBe('started')
    expect(state.current).toBe(1)
    expect(state.best).toBe(1)
  })

  it('does not double count a second session on the same day', () => {
    const first = registerPractice(monday, EMPTY_STREAK).state
    const { state, outcome } = registerPractice(
      new Date('2026-03-02T20:00:00'),
      first,
    )
    expect(outcome).toBe('sameDay')
    expect(state.current).toBe(1)
  })

  it('extends the streak on consecutive days', () => {
    let state = registerPractice(monday, EMPTY_STREAK).state
    const result = registerPractice(addDays(monday, 1), state)
    state = result.state
    expect(result.outcome).toBe('extended')
    expect(state.current).toBe(2)
  })

  it('covers one missed day with a freeze', () => {
    const state = registerPractice(monday, EMPTY_STREAK).state
    const result = registerPractice(addDays(monday, 2), state)
    expect(result.outcome).toBe('savedByFreeze')
    expect(result.state.current).toBe(2)
    expect(result.state.freezesRemaining).toBe(0)
  })

  it('resets after a long gap but keeps the personal best', () => {
    let state: StreakState = registerPractice(monday, EMPTY_STREAK).state
    state = registerPractice(addDays(monday, 1), state).state
    state = registerPractice(addDays(monday, 2), state).state
    expect(state.current).toBe(3)

    const result = registerPractice(addDays(monday, 20), state)
    expect(result.outcome).toBe('reset')
    expect(result.state.current).toBe(1)
    expect(result.state.best).toBe(3)
  })

  it('restores the freeze in a new week', () => {
    const spent = registerPractice(addDays(monday, 2), registerPractice(monday, EMPTY_STREAK).state)
    expect(spent.state.freezesRemaining).toBe(0)
    const nextWeek = registerPractice(addDays(monday, 8), spent.state)
    expect(nextWeek.state.freezesRemaining).toBe(1)
  })
})

describe('weekly goal', () => {
  const monday = new Date('2026-03-02T09:00:00')

  it('reports progress and completion', () => {
    const goal = { target: 4, completed: 2, weekStart: startOfWeek(monday).toISOString() }
    expect(weeklyGoalProgress(goal)).toBeCloseTo(0.5, 6)
    expect(weeklyGoalIsMet(goal)).toBe(false)
    expect(weeklyGoalIsMet({ ...goal, completed: 4 })).toBe(true)
    expect(weeklyGoalProgress({ ...goal, completed: 9 })).toBe(1)
  })

  it('rolls over into a new week', () => {
    const goal = { target: 4, completed: 3, weekStart: startOfWeek(monday).toISOString() }
    expect(rolledForward(goal, addDays(monday, 2)).completed).toBe(3)
    const rolled = rolledForward(goal, addDays(monday, 8))
    expect(rolled.completed).toBe(0)
    expect(rolled.target).toBe(4)
  })
})
