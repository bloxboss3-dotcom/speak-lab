import {
  RUBRIC_RATING_WEIGHT,
  TIER_XP_MULTIPLIER,
  type DifficultyTier,
  type RubricRating,
} from './types'

/**
 * Progression, mastery, spaced review and streaks.
 *
 * Ported from ios/SpeakLab/Core/Progression/Progression.swift. The one
 * deliberate difference is calendar handling: this build uses ISO weeks
 * (Monday start) so that streak-freeze behaviour is deterministic across
 * locales and testable without a system calendar.
 */

// MARK: - Experience

export type XPEvent =
  | { kind: 'attemptCompleted'; tier: DifficultyTier }
  | { kind: 'retryCompleted'; tier: DifficultyTier }
  /** The one that pays best: the targeted behaviour genuinely changed. */
  | { kind: 'targetImproved'; tier: DifficultyTier }
  | { kind: 'bonusObjectiveMet' }
  | { kind: 'transferCompleted'; tier: DifficultyTier }
  | { kind: 'spacedReviewCompleted' }
  | { kind: 'realWorldMissionReported' }
  | { kind: 'baselineCompleted' }

function scaled(base: number, tier: DifficultyTier): number {
  return Math.round(base * TIER_XP_MULTIPLIER[tier])
}

/**
 * Note what is absent: opening the app, viewing a lesson and scrolling the
 * skill tree earn nothing. Every event here requires the learner to have
 * actually spoken, or to have reported doing so in real life.
 */
export function xpAward(event: XPEvent): number {
  switch (event.kind) {
    case 'attemptCompleted':
      return scaled(20, event.tier)
    case 'retryCompleted':
      return scaled(15, event.tier)
    case 'targetImproved':
      return scaled(45, event.tier)
    case 'bonusObjectiveMet':
      return 10
    case 'transferCompleted':
      return scaled(35, event.tier)
    case 'spacedReviewCompleted':
      return 30
    case 'realWorldMissionReported':
      return 60
    case 'baselineCompleted':
      return 25
  }
}

// MARK: - Levels

export const LevelCurve = {
  /** Experience needed to go from `level` to `level + 1`. */
  increment(level: number): number {
    if (level < 1) return 150
    return 150 + 75 * (level - 1)
  },

  totalXP(level: number): number {
    if (level <= 1) return 0
    let total = 0
    for (let current = 1; current < level; current += 1) total += LevelCurve.increment(current)
    return total
  },

  level(xp: number): number {
    if (xp <= 0) return 1
    let level = 1
    let consumed = 0
    while (consumed + LevelCurve.increment(level) <= xp) {
      consumed += LevelCurve.increment(level)
      level += 1
      if (level > 500) break
    }
    return level
  },

  /** Progress through the current level, 0…1. */
  progress(xp: number): number {
    const level = LevelCurve.level(xp)
    const floorXP = LevelCurve.totalXP(level)
    const needed = LevelCurve.increment(level)
    if (needed <= 0) return 0
    return Math.min(1, Math.max(0, (xp - floorXP) / needed))
  },

  xpIntoCurrentLevel(xp: number): number {
    return xp - LevelCurve.totalXP(LevelCurve.level(xp))
  },
}

export interface Title {
  level: number
  name: string
  blurb: string
}

/**
 * Earned names, not cosmetic junk. Each marks a real change in what the learner
 * can do, and each is only reachable by practising.
 */
export const TITLES: Title[] = [
  { level: 1, name: 'First Rep', blurb: 'You recorded your voice on purpose. Most people never do.' },
  { level: 3, name: 'Straight Talker', blurb: 'You can get to the point without a run-up.' },
  { level: 5, name: 'Room Reader', blurb: 'You ask before you answer.' },
  { level: 8, name: 'Steady Under Fire', blurb: 'You stayed in the room when it got warm.' },
  { level: 12, name: 'Honest Persuader', blurb: 'You move people without pushing them.' },
  { level: 16, name: 'The One They Ask For', blurb: 'Difficult conversations get routed to you now.' },
  { level: 22, name: 'Quiet Authority', blurb: "You don't raise your voice. You don't need to." },
]

export function titleForLevel(level: number): Title {
  let found = TITLES[0] as Title
  for (const title of TITLES) if (title.level <= level) found = title
  return found
}

export function nextTitleAfter(level: number): Title | undefined {
  return TITLES.find((title) => title.level > level)
}

// MARK: - Mastery

export type MasteryBand = 'learning' | 'practising' | 'proficient' | 'fluent'

export const MASTERY_BAND_NAMES: Record<MasteryBand, string> = {
  learning: 'Learning',
  practising: 'Practising',
  proficient: 'Proficient',
  fluent: 'Fluent',
}

export const MASTERY_BAND_ORDER: MasteryBand[] = ['learning', 'practising', 'proficient', 'fluent']

export interface SkillEvidence {
  scenarioID: string
  tier: DifficultyTier
  /** Whether the targeted behaviour actually changed on the retry. */
  improved: boolean
  rubricRating?: RubricRating
  /** ISO 8601. */
  date: string
}

export interface MasteryResult {
  score: number
  band: MasteryBand
  distinctScenarios: number
  evidenceCount: number
  /** Plain-language description of what would move the band up. */
  nextRequirement: string
}

/**
 * Mastery is deliberately hard to fake: it requires the behaviour to have held
 * across several *different* scenarios, because repeating one rehearsed
 * scenario proves memorisation, not skill.
 */
export function computeMastery(evidence: SkillEvidence[]): MasteryResult {
  if (evidence.length === 0) {
    return {
      score: 0,
      band: 'learning',
      distinctScenarios: 0,
      evidenceCount: 0,
      nextRequirement: 'Practise this skill once to start tracking it.',
    }
  }

  const distinct = new Set(evidence.map((entry) => entry.scenarioID)).size
  const successRate = evidence.filter((entry) => entry.improved).length / evidence.length

  // Breadth saturates at four different scenarios — beyond that, variety stops
  // being the limiting factor.
  const breadth = Math.min(1, distinct / 4)

  const rated = evidence
    .map((entry) => entry.rubricRating)
    .filter((rating): rating is RubricRating => rating !== undefined)
  const ratingScore =
    rated.length === 0
      ? successRate
      : rated.reduce((total, rating) => total + RUBRIC_RATING_WEIGHT[rating], 0) / rated.length

  const averageTier = evidence.reduce((total, entry) => total + entry.tier, 0) / evidence.length
  const tierFactor = Math.min(1, (averageTier - 1) / 3)

  const score = Math.min(
    1,
    0.4 * successRate + 0.25 * breadth + 0.25 * ratingScore + 0.1 * tierFactor,
  )

  const band = masteryBand(score, evidence.length, distinct)
  return {
    score,
    band,
    distinctScenarios: distinct,
    evidenceCount: evidence.length,
    nextRequirement: masteryRequirement(band, evidence.length, distinct),
  }
}

function masteryBand(score: number, evidenceCount: number, distinct: number): MasteryBand {
  // Gates come before the score so a single lucky session can never produce a
  // high band.
  if (evidenceCount >= 5 && distinct >= 3 && score >= 0.75) return 'fluent'
  if (evidenceCount >= 3 && distinct >= 2 && score >= 0.55) return 'proficient'
  if (evidenceCount >= 2 && score >= 0.3) return 'practising'
  return 'learning'
}

function masteryRequirement(band: MasteryBand, evidenceCount: number, distinct: number): string {
  switch (band) {
    case 'learning':
      return 'Complete two sessions on this skill, applying the feedback on the retry.'
    case 'practising':
      if (distinct < 2) return 'Try this skill in a different scenario.'
      return 'Land the target behaviour in one more session.'
    case 'proficient':
      if (distinct < 3) return 'Prove it in a third, different scenario.'
      if (evidenceCount < 5) return 'Two more successful sessions to reach Fluent.'
      return 'Hold the behaviour under pressure to reach Fluent.'
    case 'fluent':
      return 'Keep it alive with spaced review.'
  }
}

// MARK: - Spaced review

export interface ReviewState {
  intervalDays: number
  ease: number
  /** ISO 8601. */
  dueDate: string
  lapses: number
  reviewCount: number
}

export const ReviewScheduler = {
  initialEase: 2.2,
  minimumEase: 1.4,
  maximumEase: 2.8,

  /** First scheduling after a skill is learned. */
  firstReview(from: Date): ReviewState {
    return {
      intervalDays: 2,
      ease: ReviewScheduler.initialEase,
      dueDate: addDays(from, 2).toISOString(),
      lapses: 0,
      reviewCount: 0,
    }
  },

  /**
   * Next scheduling after a review attempt.
   *
   * Full SM-2 grades recall on five levels; here there are only two outcomes
   * (the behaviour held, or it didn't), so the ease adjustment is coarser.
   */
  next(state: ReviewState, success: boolean, on: Date): ReviewState {
    let { ease, intervalDays: interval, lapses } = state

    if (success) {
      ease = Math.min(ReviewScheduler.maximumEase, ease + 0.1)
      interval = Math.max(2, Math.round(Math.max(1, interval) * ease))
    } else {
      ease = Math.max(ReviewScheduler.minimumEase, ease - 0.3)
      interval = 1
      lapses += 1
    }

    // A year is long enough that anything beyond it is noise.
    interval = Math.min(interval, 365)

    return {
      intervalDays: interval,
      ease,
      dueDate: addDays(on, interval).toISOString(),
      lapses,
      reviewCount: state.reviewCount + 1,
    }
  },

  isDue(state: ReviewState, on: Date): boolean {
    return new Date(state.dueDate).getTime() <= on.getTime()
  },
}

// MARK: - Streaks

export interface StreakState {
  current: number
  best: number
  /** ISO 8601 date of the last day practice was recorded. */
  lastPracticeDay?: string
  /**
   * Missing a day costs a freeze rather than the streak. One is granted each
   * week — enough to survive real life, not enough to be meaningless.
   */
  freezesRemaining: number
  freezeWeekStart?: string
}

export const EMPTY_STREAK: StreakState = { current: 0, best: 0, freezesRemaining: 1 }

export type StreakOutcome = 'started' | 'extended' | 'sameDay' | 'savedByFreeze' | 'reset'

/**
 * Records a practice session and returns the new state.
 *
 * There is no punishment path here by design: a lapsed streak quietly restarts
 * at one, and nothing in the app tells the learner they have failed.
 */
export function registerPractice(
  date: Date,
  state: StreakState,
): { state: StreakState; outcome: StreakOutcome } {
  const updated = refreshFreezes(state, date)
  const today = startOfDay(date)

  if (!updated.lastPracticeDay) {
    updated.current = 1
    updated.best = Math.max(updated.best, 1)
    updated.lastPracticeDay = today.toISOString()
    return { state: updated, outcome: 'started' }
  }

  const last = startOfDay(new Date(updated.lastPracticeDay))
  const days = Math.round((today.getTime() - last.getTime()) / 86_400_000)

  if (days <= 0) return { state: updated, outcome: 'sameDay' }

  if (days === 1) {
    updated.current += 1
    updated.best = Math.max(updated.best, updated.current)
    updated.lastPracticeDay = today.toISOString()
    return { state: updated, outcome: 'extended' }
  }

  if (days === 2 && updated.freezesRemaining > 0) {
    updated.freezesRemaining -= 1
    updated.current += 1
    updated.best = Math.max(updated.best, updated.current)
    updated.lastPracticeDay = today.toISOString()
    return { state: updated, outcome: 'savedByFreeze' }
  }

  updated.current = 1
  updated.best = Math.max(updated.best, 1)
  updated.lastPracticeDay = today.toISOString()
  return { state: updated, outcome: 'reset' }
}

function refreshFreezes(state: StreakState, date: Date): StreakState {
  const updated: StreakState = { ...state }
  const weekStart = startOfWeek(date).toISOString()
  if (updated.freezeWeekStart) {
    if (updated.freezeWeekStart !== weekStart) {
      updated.freezeWeekStart = weekStart
      updated.freezesRemaining = 1
    }
  } else {
    updated.freezeWeekStart = weekStart
    updated.freezesRemaining = Math.max(updated.freezesRemaining, 1)
  }
  return updated
}

// MARK: - Weekly goal

export interface WeeklyGoal {
  target: number
  completed: number
  /** ISO 8601 date of the Monday this week began. */
  weekStart: string
}

export function weeklyGoalProgress(goal: WeeklyGoal): number {
  if (goal.target <= 0) return 0
  return Math.min(1, goal.completed / goal.target)
}

export function weeklyGoalIsMet(goal: WeeklyGoal): boolean {
  return goal.completed >= goal.target
}

/** Rolls the counter over when a new week starts. */
export function rolledForward(goal: WeeklyGoal, date: Date): WeeklyGoal {
  const currentWeek = startOfWeek(date).toISOString()
  if (currentWeek === goal.weekStart) return goal
  return { target: goal.target, completed: 0, weekStart: currentWeek }
}

// MARK: - Calendar helpers

export function startOfDay(date: Date): Date {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}

/** Monday-start week, so freeze accounting is locale-independent. */
export function startOfWeek(date: Date): Date {
  const day = startOfDay(date)
  const weekday = (day.getDay() + 6) % 7 // Monday = 0
  day.setDate(day.getDate() - weekday)
  return day
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000)
}

export function daysBetween(from: Date, to: Date): number {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / 86_400_000)
}
