import { MASTERY_STAGES, type MasteryStage, type TechniqueMastery } from './types'

/**
 * XP, levels, streaks, mastery and spaced review.
 *
 * Two rules govern everything here. Nothing is awarded for opening the app or
 * reading anything — every point requires the learner to have spoken. And the
 * highest-value events are the ones that indicate durable skill rather than
 * activity: applying feedback on a retry, and retrieving a technique cold, days
 * later, without being told which one to use.
 */

// ---------------------------------------------------------------- XP

export type XpEvent =
  | { kind: 'lesson-completed' }
  | { kind: 'attempt' }
  /** Scaled by how much the score moved, so a real improvement pays. */
  | { kind: 'improved'; delta: number }
  | { kind: 'field-test-completed' }
  /** The best award in the app, by a distance. */
  | { kind: 'cold-retrieval' }
  | { kind: 'review-passed' }
  | { kind: 'gym-session' }
  | { kind: 'principle-completed' }
  | { kind: 'mastery-stage-up'; stage: MasteryStage }

export function xpFor(event: XpEvent): number {
  switch (event.kind) {
    case 'lesson-completed':
      return 40
    case 'attempt':
      return 15
    case 'improved':
      // 2 XP per point gained, capped — a jump from 30 to 90 is worth more than
      // a jump from 84 to 86, but neither should dwarf a cold retrieval.
      return Math.max(0, Math.min(80, Math.round(event.delta * 2)))
    case 'field-test-completed':
      return 50
    case 'cold-retrieval':
      return 200
    case 'review-passed':
      return 60
    case 'gym-session':
      return 45
    case 'principle-completed':
      return 40
    case 'mastery-stage-up':
      return STAGE_XP[event.stage]
  }
}

const STAGE_XP: Record<MasteryStage, number> = {
  discovered: 0,
  learning: 10,
  practiced: 30,
  reliable: 120,
  integrated: 250,
  mastered: 500,
}

// ---------------------------------------------------------------- Levels

/**
 * Each level costs a little more than the last. Tuned so a daily lesson plus a
 * retry moves the bar visibly, and so level 10 is roughly a month of real use
 * rather than a week of grinding.
 */
export function xpForLevel(level: number): number {
  if (level < 1) return 0
  return 120 + 60 * (level - 1)
}

export function totalXpToReach(level: number): number {
  let total = 0
  for (let current = 1; current < level; current += 1) total += xpForLevel(current)
  return total
}

export function levelFromXp(xp: number): number {
  if (xp <= 0) return 1
  let level = 1
  let consumed = 0
  while (consumed + xpForLevel(level) <= xp) {
    consumed += xpForLevel(level)
    level += 1
    if (level > 300) break
  }
  return level
}

export function xpIntoLevel(xp: number): number {
  return xp - totalXpToReach(levelFromXp(xp))
}

export function levelProgress(xp: number): number {
  const level = levelFromXp(xp)
  const needed = xpForLevel(level)
  return needed <= 0 ? 0 : Math.min(1, Math.max(0, xpIntoLevel(xp) / needed))
}

export interface Rank {
  level: number
  name: string
  blurb: string
}

/**
 * Ranks name a capability the learner has actually demonstrated by the time
 * they arrive, rather than flattering them ahead of the evidence.
 */
export const RANKS: Rank[] = [
  { level: 1, name: 'Apprentice', blurb: 'You have started saying things on purpose.' },
  { level: 3, name: 'Speaker', blurb: 'You can hold a room for ninety seconds.' },
  { level: 5, name: 'Communicator', blurb: 'You get to the point before people stop listening.' },
  { level: 8, name: 'Orator', blurb: 'You build a passage instead of assembling sentences.' },
  { level: 12, name: 'Persuader', blurb: 'You argue with the strong version, not the easy one.' },
  { level: 16, name: 'The Teacher', blurb: 'Difficult ideas leave your mouth simple.' },
  { level: 21, name: 'Voice of the Room', blurb: 'People wait to hear what you make of it.' },
  { level: 27, name: 'The One They Send', blurb: 'The hard conversations get routed to you now.' },
  { level: 34, name: 'Master Communicator', blurb: 'You choose the technique without noticing you chose.' },
]

export function rankFor(level: number): Rank {
  let found = RANKS[0] as Rank
  for (const rank of RANKS) if (rank.level <= level) found = rank
  return found
}

export function nextRankAfter(level: number): Rank | undefined {
  return RANKS.find((rank) => rank.level > level)
}

// ---------------------------------------------------------------- Streak

export interface StreakInput {
  current: number
  best: number
  lastTrainedOn?: string
  freezes: number
  lastFreezeGrantWeek?: string
}

export type StreakOutcome = 'started' | 'extended' | 'same-day' | 'saved' | 'reset'

/**
 * Records a day of training.
 *
 * Missing a day costs a freeze if one is available, and a freeze is granted for
 * every seven days trained. There is no punishment path and no message telling
 * the learner they have failed — a lapsed streak simply restarts at one.
 */
export function registerTraining(
  state: StreakInput,
  now: Date,
): { state: StreakInput; outcome: StreakOutcome } {
  const today = dayKey(now)
  const updated: StreakInput = { ...state }

  if (!updated.lastTrainedOn) {
    updated.current = 1
    updated.best = Math.max(updated.best, 1)
    updated.lastTrainedOn = today
    return { state: grantFreeze(updated), outcome: 'started' }
  }

  const gap = daysBetween(updated.lastTrainedOn, today)
  if (gap <= 0) return { state: updated, outcome: 'same-day' }

  if (gap === 1) {
    updated.current += 1
    updated.best = Math.max(updated.best, updated.current)
    updated.lastTrainedOn = today
    return { state: grantFreeze(updated), outcome: 'extended' }
  }

  // A freeze covers any single missed stretch, spending one per day missed.
  const missed = gap - 1
  if (updated.freezes >= missed && missed <= 2) {
    updated.freezes -= missed
    updated.current += 1
    updated.best = Math.max(updated.best, updated.current)
    updated.lastTrainedOn = today
    return { state: updated, outcome: 'saved' }
  }

  updated.current = 1
  updated.best = Math.max(updated.best, 1)
  updated.lastTrainedOn = today
  return { state: grantFreeze(updated), outcome: 'reset' }
}

/** One freeze per seven consecutive days, capped at three in hand. */
function grantFreeze(state: StreakInput): StreakInput {
  if (state.current > 0 && state.current % 7 === 0 && state.freezes < 3) {
    return { ...state, freezes: state.freezes + 1 }
  }
  return state
}

// ---------------------------------------------------------------- Mastery

/** A technique attempt clears the bar at this score. */
export const SUCCESS_THRESHOLD = 70

/**
 * Days that must pass between meeting a technique and a retrieval that counts
 * toward `mastered`. Retrieving something you learned an hour ago is recall,
 * not mastery.
 */
export const DELAYED_RETRIEVAL_DAYS = 10

/**
 * Derives the stage from the evidence.
 *
 * `reliable` and above cannot be reached without at least one unprompted
 * retrieval in a Field Test, and `mastered` additionally requires one of those
 * retrievals to have happened well after the technique was introduced. That is
 * the whole point of the app expressed as four lines of arithmetic.
 */
export function stageFor(mastery: TechniqueMastery, now: Date): MasteryStage {
  const contexts = mastery.contextsUsed.length
  const daysKnown = mastery.introducedAt ? daysBetween(mastery.introducedAt, dayKey(now)) : 0
  const successRate =
    mastery.totalAttempts > 0 ? mastery.successfulUses / mastery.totalAttempts : 0

  if (
    mastery.coldRetrievals >= 3 &&
    contexts >= 3 &&
    mastery.totalAttempts >= 8 &&
    daysKnown >= DELAYED_RETRIEVAL_DAYS &&
    successRate >= 0.6
  ) {
    return 'mastered'
  }
  if (mastery.coldRetrievals >= 2 && contexts >= 3 && mastery.totalAttempts >= 5 && successRate >= 0.5) {
    return 'integrated'
  }
  if (mastery.coldRetrievals >= 1 && contexts >= 2 && mastery.totalAttempts >= 3) {
    return 'reliable'
  }
  if (mastery.totalAttempts >= 2 && mastery.bestScore >= SUCCESS_THRESHOLD) return 'practiced'
  if (mastery.totalAttempts >= 1) return 'learning'
  return 'discovered'
}

/**
 * A 0–100 figure for the ring on the technique card.
 *
 * Weighted toward the things that are hard to fake: retrieval and breadth
 * together outweigh raw score, so grinding one scenario cannot fill the ring.
 */
export function masteryScore(mastery: TechniqueMastery): number {
  const successRate =
    mastery.totalAttempts > 0 ? mastery.successfulUses / mastery.totalAttempts : 0
  const breadth = Math.min(1, mastery.contextsUsed.length / 4)
  const retrieval = Math.min(1, mastery.coldRetrievals / 3)
  const peak = Math.min(1, mastery.bestScore / 100)

  const score = 0.25 * successRate + 0.25 * breadth + 0.35 * retrieval + 0.15 * peak
  return Math.round(Math.min(1, score) * 100)
}

/** Plain language for what would move this technique up a stage. */
export function nextMasteryRequirement(mastery: TechniqueMastery, stage: MasteryStage): string {
  switch (stage) {
    case 'discovered':
      return 'Use it once in a scenario.'
    case 'learning':
      return `Clear ${SUCCESS_THRESHOLD} on an attempt to reach Practiced.`
    case 'practiced':
      return mastery.contextsUsed.length < 2
        ? 'Use it in a second, different scenario.'
        : 'Reach for it unprompted in a Field Test to reach Reliable.'
    case 'reliable':
      return mastery.contextsUsed.length < 3
        ? 'Use it in a third situation.'
        : 'One more unprompted retrieval to reach Integrated.'
    case 'integrated':
      return 'A third cold retrieval, at least ten days after you met it.'
    case 'mastered':
      return 'Keep it alive with spaced review.'
  }
}

export function stageIndex(stage: MasteryStage): number {
  return MASTERY_STAGES.indexOf(stage)
}

// ---------------------------------------------------------------- Review

export const INITIAL_EASE = 2.3
export const MIN_EASE = 1.4
export const MAX_EASE = 2.9

/** First review two days after the technique is introduced. */
export function firstReview(now: Date): { intervalDays: number; ease: number; nextReviewAt: string } {
  return { intervalDays: 2, ease: INITIAL_EASE, nextReviewAt: addDays(dayKey(now), 2) }
}

/**
 * A two-outcome variant of SM-2: the behaviour held, or it did not. Full SM-2
 * grades recall on five levels, which there is no honest way to collect here.
 */
export function nextReview(
  current: { intervalDays: number; ease: number },
  passed: boolean,
  now: Date,
): { intervalDays: number; ease: number; nextReviewAt: string } {
  let ease = current.ease
  let interval = current.intervalDays

  if (passed) {
    ease = Math.min(MAX_EASE, ease + 0.1)
    interval = Math.max(2, Math.round(Math.max(1, interval) * ease))
  } else {
    ease = Math.max(MIN_EASE, ease - 0.3)
    interval = 1
  }
  interval = Math.min(interval, 240)

  return { intervalDays: interval, ease, nextReviewAt: addDays(dayKey(now), interval) }
}

export function isDue(nextReviewAt: string | undefined, now: Date): boolean {
  if (!nextReviewAt) return false
  return nextReviewAt <= dayKey(now)
}

// ---------------------------------------------------------------- Dates

/** Local calendar day as YYYY-MM-DD. Comparisons are string comparisons. */
export function dayKey(value: Date | string): string {
  if (typeof value === 'string') return value.slice(0, 10)
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function addDays(key: string, days: number): string {
  const date = new Date(`${key}T12:00:00`)
  date.setDate(date.getDate() + days)
  return dayKey(date)
}

export function daysBetween(from: string, to: string): number {
  const a = new Date(`${dayKey(from)}T12:00:00`).getTime()
  const b = new Date(`${dayKey(to)}T12:00:00`).getTime()
  return Math.round((b - a) / 86_400_000)
}

export function isoWeekKey(date: Date): string {
  const copy = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = copy.getUTCDay() || 7
  copy.setUTCDate(copy.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(copy.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((copy.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7)
  return `${copy.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}
