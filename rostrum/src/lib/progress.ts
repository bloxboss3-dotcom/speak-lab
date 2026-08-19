import { ACHIEVEMENTS } from '@/content/fieldTests'
import { LESSONS_IN_ORDER, lesson as findLesson } from '@/content/lessons'
import { scenario as findScenario } from '@/content/scenarios'
import { technique as findTechnique } from '@/content/techniques'
import {
  DELAYED_RETRIEVAL_DAYS,
  SUCCESS_THRESHOLD,
  dayKey,
  daysBetween,
  firstReview,
  isDue,
  levelFromXp,
  masteryScore,
  nextReview,
  registerTraining,
  stageFor,
  stageIndex,
  xpFor,
} from './progression'
import {
  MASTERY_STAGES,
  type Achievement,
  type CoachEvaluation,
  type DetectedTechnique,
  type MasteryStage,
  type PracticeAttempt,
  type Progress,
  type SkillBranch,
  type TechniqueMastery,
} from './types'

/**
 * Every mutation the app makes to a learner's record, as pure functions.
 *
 * Keeping them here rather than inside components means the reward rules are
 * auditable in one file and testable without a browser — and it means the
 * question "why did I get 200 XP" always has an answer somebody can read.
 */

export const PROGRESS_VERSION = 1

export function emptyProgress(): Progress {
  return {
    version: PROGRESS_VERSION,
    profile: { goals: [], audiences: [], autoTranscribe: true },
    xp: 0,
    streak: { current: 0, best: 0, freezes: 0 },
    mastery: {},
    attempts: [],
    completedLessonIds: [],
    completedFieldTestIds: [],
    completedPrincipleIds: [],
    gymSessions: [],
    unlockedAchievementIds: [],
    loadout: {},
    rungsCleared: {},
  }
}

// ---------------------------------------------------------------- Reads

/** Techniques the learner has met — the pool for detection and the Arsenal. */
export function knownTechniqueIds(progress: Progress): string[] {
  return Object.keys(progress.mastery)
}

export function masteryFor(progress: Progress, techniqueId: string): TechniqueMastery | undefined {
  return progress.mastery[techniqueId]
}

export function dueReviewTechniqueIds(progress: Progress, now: Date): string[] {
  return Object.values(progress.mastery)
    .filter((entry) => isDue(entry.nextReviewAt, now))
    .sort((a, b) => (a.nextReviewAt ?? '').localeCompare(b.nextReviewAt ?? ''))
    .map((entry) => entry.techniqueId)
}

/** The next lesson in the curriculum, or undefined once they are all done. */
export function nextLesson(progress: Progress) {
  const done = new Set(progress.completedLessonIds)
  return LESSONS_IN_ORDER.find((entry) => !done.has(entry.id))
}

export function trainedToday(progress: Progress, now: Date): boolean {
  return progress.streak.lastTrainedOn === dayKey(now)
}

/** 0–100 per branch, from the mastery of every technique in it. */
export function branchScores(progress: Progress): Record<SkillBranch, number> {
  const totals: Partial<Record<SkillBranch, { sum: number; count: number }>> = {}
  for (const entry of Object.values(progress.mastery)) {
    const technique = findTechnique(entry.techniqueId)
    if (!technique) continue
    const bucket = totals[technique.branch] ?? { sum: 0, count: 0 }
    bucket.sum += entry.score
    bucket.count += 1
    totals[technique.branch] = bucket
  }
  const out = {} as Record<SkillBranch, number>
  for (const branch of [
    'clarity',
    'presence',
    'storytelling',
    'emotional-connection',
    'persuasion',
    'motivation',
    'teaching',
    'leadership',
    'improvisation',
  ] as SkillBranch[]) {
    const bucket = totals[branch]
    out[branch] = bucket && bucket.count > 0 ? Math.round(bucket.sum / bucket.count) : 0
  }
  return out
}

export function coldRetrievalCount(progress: Progress): number {
  return Object.values(progress.mastery).reduce((sum, entry) => sum + entry.coldRetrievals, 0)
}

export function countAtStageOrAbove(progress: Progress, stage: MasteryStage): number {
  const floor = stageIndex(stage)
  return Object.values(progress.mastery).filter((entry) => stageIndex(entry.stage) >= floor).length
}

// ---------------------------------------------------------------- Writes

export interface RewardLine {
  label: string
  xp: number
}

export interface AttemptOutcome {
  progress: Progress
  rewards: RewardLine[]
  xpAwarded: number
  leveledUp: boolean
  newLevel: number
  /** Techniques whose mastery stage moved up as a result of this attempt. */
  stageUps: Array<{ techniqueId: string; from: MasteryStage; to: MasteryStage }>
  /** Unprompted retrievals credited by this attempt — the headline event. */
  coldRetrievals: DetectedTechnique[]
  newAchievements: Achievement[]
}

/**
 * Introduces a technique, so it appears in the Arsenal and becomes a candidate
 * for detection and review. Idempotent.
 */
export function introduceTechnique(progress: Progress, techniqueId: string, now: Date): Progress {
  if (progress.mastery[techniqueId]) return progress
  const review = firstReview(now)
  const record: TechniqueMastery = {
    techniqueId,
    stage: 'discovered',
    score: 0,
    introducedAt: dayKey(now),
    totalAttempts: 0,
    successfulUses: 0,
    coldRetrievals: 0,
    failedRetrievals: 0,
    contextsUsed: [],
    bestScore: 0,
    reviewIntervalDays: review.intervalDays,
    reviewEase: review.ease,
    nextReviewAt: review.nextReviewAt,
  }
  return { ...progress, mastery: { ...progress.mastery, [techniqueId]: record } }
}

/**
 * The central write. Everything that happens when the learner speaks.
 */
export function recordAttempt(
  progress: Progress,
  input: {
    sourceKind: PracticeAttempt['sourceKind']
    sourceId: string
    scenarioId: string
    techniqueId: string | null
    attemptNumber: number
    transcript: string
    durationSeconds: number
    durationMeasured: boolean
    evaluation: CoachEvaluation
    /** The best score on a previous attempt in this same sitting. */
    previousBest?: number
  },
  now: Date = new Date(),
): AttemptOutcome {
  let next: Progress = { ...progress }
  const rewards: RewardLine[] = []
  const stageUps: AttemptOutcome['stageUps'] = []
  const coldRetrievals: AttemptOutcome['coldRetrievals'] = []

  const award = (label: string, xp: number) => {
    if (xp <= 0) return
    rewards.push({ label, xp })
  }

  // The attempt itself.
  const attempt: PracticeAttempt = {
    id: `a-${now.getTime()}-${next.attempts.length + 1}`,
    sourceKind: input.sourceKind,
    sourceId: input.sourceId,
    scenarioId: input.scenarioId,
    techniqueId: input.techniqueId,
    attemptNumber: input.attemptNumber,
    transcript: input.transcript,
    durationSeconds: input.durationSeconds,
    durationMeasured: input.durationMeasured,
    techniqueScore: input.evaluation.techniqueScore,
    overallScore: input.evaluation.overallScore,
    strongestLine: input.evaluation.strongestLine,
    createdAt: now.toISOString(),
    wasOffline: input.evaluation.wasOffline,
  }
  next = { ...next, attempts: [attempt, ...next.attempts].slice(0, 400) }
  award('Attempt completed', xpFor({ kind: 'attempt' }))

  // Applying feedback pays in proportion to how much actually moved.
  if (input.previousBest !== undefined && input.evaluation.techniqueScore > input.previousBest) {
    const delta = input.evaluation.techniqueScore - input.previousBest
    award(`Improved by ${delta}`, xpFor({ kind: 'improved', delta }))
  }

  // The technique that was being trained.
  if (input.techniqueId) {
    next = introduceTechnique(next, input.techniqueId, now)
    next = updateMastery(next, input.techniqueId, {
      scenarioId: input.scenarioId,
      score: input.evaluation.techniqueScore,
      line: input.evaluation.strongestLine,
      now,
    })
  }

  // Unprompted retrieval — only in a Field Test, only for techniques the
  // learner was not told to use, and only above the confidence bar.
  if (input.sourceKind === 'field-test') {
    for (const detected of input.evaluation.detectedTechniques) {
      if (detected.techniqueId === input.techniqueId) continue
      if (!detected.appropriateUse || detected.confidence < 0.7) continue
      const existing = next.mastery[detected.techniqueId]
      if (!existing) continue

      next = {
        ...next,
        mastery: {
          ...next.mastery,
          [detected.techniqueId]: {
            ...existing,
            coldRetrievals: existing.coldRetrievals + 1,
            contextsUsed: addContext(existing.contextsUsed, input.scenarioId),
          },
        },
      }
      // Passed through whole so the screen can report how the detection was
      // reached — marker counts offline, a model's confidence otherwise.
      coldRetrievals.push(detected)
      award('Unprompted retrieval', xpFor({ kind: 'cold-retrieval' }))
    }
  }

  // Recompute stages after every mastery change, and pay for genuine movement.
  for (const [id, record] of Object.entries(next.mastery)) {
    const previous = progress.mastery[id]?.stage ?? 'discovered'
    const stage = stageFor(record, now)
    const score = masteryScore(record)
    if (stage !== record.stage || score !== record.score) {
      next = { ...next, mastery: { ...next.mastery, [id]: { ...record, stage, score } } }
    }
    if (stageIndex(stage) > stageIndex(previous)) {
      stageUps.push({ techniqueId: id, from: previous, to: stage })
      award(`${findTechnique(id)?.name ?? id} → ${stage}`, xpFor({ kind: 'mastery-stage-up', stage }))
    }
  }

  // One streak advance per calendar day, on the first thing they say.
  const streak = registerTraining(next.streak, now)
  next = { ...next, streak: streak.state }

  const xpAwarded = rewards.reduce((sum, line) => sum + line.xp, 0)
  const levelBefore = levelFromXp(next.xp)
  next = { ...next, xp: next.xp + xpAwarded }
  const newLevel = levelFromXp(next.xp)

  const unlocked = evaluateAchievements(next)
  const newAchievements = unlocked.filter((entry) => !progress.unlockedAchievementIds.includes(entry.id))
  if (newAchievements.length > 0) {
    next = {
      ...next,
      unlockedAchievementIds: [...new Set([...next.unlockedAchievementIds, ...unlocked.map((a) => a.id)])],
    }
  }

  return {
    progress: next,
    rewards,
    xpAwarded,
    leveledUp: newLevel > levelBefore,
    newLevel,
    stageUps,
    coldRetrievals,
    newAchievements,
  }
}

function addContext(contexts: string[], scenarioId: string): string[] {
  return contexts.includes(scenarioId) ? contexts : [...contexts, scenarioId]
}

function updateMastery(
  progress: Progress,
  techniqueId: string,
  input: { scenarioId: string; score: number; line: string; now: Date },
): Progress {
  const existing = progress.mastery[techniqueId]
  if (!existing) return progress

  const succeeded = input.score >= SUCCESS_THRESHOLD
  const isBest = input.score > existing.bestScore

  const updated: TechniqueMastery = {
    ...existing,
    totalAttempts: existing.totalAttempts + 1,
    successfulUses: existing.successfulUses + (succeeded ? 1 : 0),
    contextsUsed: addContext(existing.contextsUsed, input.scenarioId),
    lastPracticedAt: dayKey(input.now),
    bestScore: Math.max(existing.bestScore, input.score),
    ...(isBest && input.line ? { bestLine: input.line } : {}),
  }

  // A practice attempt also counts as a review of the technique.
  const review = nextReview(
    { intervalDays: existing.reviewIntervalDays, ease: existing.reviewEase },
    succeeded,
    input.now,
  )

  return {
    ...progress,
    mastery: {
      ...progress.mastery,
      [techniqueId]: {
        ...updated,
        reviewIntervalDays: review.intervalDays,
        reviewEase: review.ease,
        nextReviewAt: review.nextReviewAt,
      },
    },
  }
}

// ---------------------------------------------------------------- Completion

export function completeLesson(progress: Progress, lessonId: string, now: Date = new Date()): {
  progress: Progress
  xp: number
} {
  if (progress.completedLessonIds.includes(lessonId)) return { progress, xp: 0 }
  const entry = findLesson(lessonId)
  const xp = xpFor({ kind: 'lesson-completed' })
  let next: Progress = {
    ...progress,
    completedLessonIds: [...progress.completedLessonIds, lessonId],
    xp: progress.xp + xp,
    lastLessonOn: dayKey(now),
  }
  if (entry) next = introduceTechnique(next, entry.techniqueId, now)
  return { progress: next, xp }
}

export function completeFieldTest(progress: Progress, fieldTestId: string): { progress: Progress; xp: number } {
  if (progress.completedFieldTestIds.includes(fieldTestId)) return { progress, xp: 0 }
  const xp = xpFor({ kind: 'field-test-completed' })
  return {
    progress: {
      ...progress,
      completedFieldTestIds: [...progress.completedFieldTestIds, fieldTestId],
      xp: progress.xp + xp,
    },
    xp,
  }
}

export function completePrinciple(progress: Progress, principleId: string): { progress: Progress; xp: number } {
  if (progress.completedPrincipleIds.includes(principleId)) return { progress, xp: 0 }
  const xp = xpFor({ kind: 'principle-completed' })
  return {
    progress: {
      ...progress,
      completedPrincipleIds: [...progress.completedPrincipleIds, principleId],
      xp: progress.xp + xp,
    },
    xp,
  }
}

// ---------------------------------------------------------------- Achievements

export function evaluateAchievements(progress: Progress): Achievement[] {
  return ACHIEVEMENTS.filter((achievement) => passes(achievement, progress))
}

function passes(achievement: Achievement, progress: Progress): boolean {
  const test = achievement.test
  switch (test.kind) {
    case 'attempts':
      return progress.attempts.length >= test.min

    case 'improvement': {
      // Any sitting where a later attempt beat an earlier one by the margin.
      const bySource = new Map<string, PracticeAttempt[]>()
      for (const attempt of progress.attempts) {
        const key = `${attempt.sourceKind}:${attempt.sourceId}`
        bySource.set(key, [...(bySource.get(key) ?? []), attempt])
      }
      for (const list of bySource.values()) {
        const ordered = [...list].sort((a, b) => a.attemptNumber - b.attemptNumber)
        const first = ordered[0]
        if (!first) continue
        const best = Math.max(...ordered.map((entry) => entry.techniqueScore))
        if (best - first.techniqueScore >= test.minDelta) return true
      }
      return false
    }

    case 'cold-retrieval':
      return coldRetrievalCount(progress) >= test.min

    case 'category-attempts':
      return (
        progress.attempts.filter((attempt) => {
          const technique = findTechnique(attempt.techniqueId)
          return technique?.category === test.category
        }).length >= test.min
      )

    case 'scenario-category':
      return (
        progress.attempts.filter((attempt) => findScenario(attempt.scenarioId)?.category === test.category)
          .length >= test.min
      )

    case 'mastery-stage':
      return countAtStageOrAbove(progress, test.stage) >= test.min

    case 'streak':
      return progress.streak.best >= test.min

    case 'level':
      return levelFromXp(progress.xp) >= test.min

    case 'gym-sessions':
      return progress.gymSessions.length >= test.min
  }
}

// ---------------------------------------------------------------- Insight

export interface WeeklyInsight {
  strongest?: { branch: SkillBranch; delta: number }
  needsAttention?: string
  dueForReview?: string
  attemptsThisWeek: number
}

/**
 * The "this week" panel. Every line is derived from actual attempts, and any
 * line without enough data behind it is simply omitted rather than invented.
 */
export function weeklyInsight(progress: Progress, now: Date = new Date()): WeeklyInsight {
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000).toISOString()
  const recent = progress.attempts.filter((attempt) => attempt.createdAt >= weekAgo)

  const insight: WeeklyInsight = { attemptsThisWeek: recent.length }

  // Weakest branch that has been practised at all is the honest "needs work".
  const scores = branchScores(progress)
  const practised = Object.entries(scores).filter(([, value]) => value > 0)
  if (practised.length >= 2) {
    practised.sort((a, b) => a[1] - b[1])
    const weakest = practised[0]
    const strongest = practised[practised.length - 1]
    if (weakest) insight.needsAttention = weakest[0] as SkillBranch
    if (strongest) insight.strongest = { branch: strongest[0] as SkillBranch, delta: strongest[1] }
  }

  const due = dueReviewTechniqueIds(progress, now)[0]
  if (due) insight.dueForReview = due

  return insight
}

/**
 * Whether a technique is old enough for a retrieval to be meaningful, used to
 * decide which Field Test to offer.
 */
export function isRetrievalCandidate(mastery: TechniqueMastery, now: Date): boolean {
  const age = daysBetween(mastery.introducedAt, dayKey(now))
  return age >= 2 && stageIndex(mastery.stage) >= MASTERY_STAGES.indexOf('learning')
}

export { DELAYED_RETRIEVAL_DAYS, SUCCESS_THRESHOLD }

// ---------------------------------------------------------------- Moves

/** Rungs cleared on a move. 0 when it has been opened but nothing finished. */
export function rungsCleared(progress: Progress, moveId: string): number {
  return progress.rungsCleared[moveId] ?? 0
}

/**
 * Marks one more rung of a move as cleared.
 *
 * Only ever advances by one and never goes backwards, so re-doing a rung you
 * have already cleared is free practice rather than a way to inflate the ladder.
 */
export function clearRung(progress: Progress, moveId: string, rungIndex: number): Progress {
  const current = progress.rungsCleared[moveId] ?? 0
  if (rungIndex !== current) return progress
  return {
    ...progress,
    rungsCleared: { ...progress.rungsCleared, [moveId]: current + 1 },
  }
}

/** Total rungs cleared across every move. */
export function totalRungsCleared(progress: Progress): number {
  return Object.values(progress.rungsCleared).reduce<number>((sum, n) => sum + (n ?? 0), 0)
}
