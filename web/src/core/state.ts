import {
  EMPTY_STREAK,
  LevelCurve,
  ReviewScheduler,
  computeMastery,
  registerPractice,
  rolledForward,
  startOfWeek,
  titleForLevel,
  weeklyGoalIsMet,
  xpAward,
  type MasteryBand,
  type ReviewState,
  type SkillEvidence,
  type StreakOutcome,
  type StreakState,
  type Title,
  type WeeklyGoal,
} from './progression'
import { MASTERY_BAND_ORDER } from './progression'
import type {
  AttemptComparison,
  CoachFeedback,
  ConversationTurn,
  GoldenNugget,
  PracticeMode,
  RubricRating,
  Scenario,
  SpeakingMetrics,
} from './types'

/**
 * Persisted state and the reward rules that write it.
 *
 * Every mutation lives here as a pure function so the rules are auditable in
 * one file and testable without a browser — the same reason the iOS build funnels
 * everything through `ProgressStore`.
 */

export const STATE_VERSION = 1

export interface Profile {
  totalXP: number
  streak: StreakState
  weeklyTarget: number
  weeklyGoal: WeeklyGoal
  seenNuggetIDs: string[]
  baselineCompletedAt?: string
  /** Ask for a 1–5 nerves rating before and after a session. */
  trackAnxiety: boolean
  /** Speak the simulated character's lines out loud. */
  speakCharacterAloud: boolean
  /** Attempt browser speech recognition during recording. */
  autoTranscribe: boolean
  /** Base URL of a coaching proxy, if the learner has set one up. */
  proxyURL?: string
  sharedSecret?: string
}

export interface SkillProgress {
  skillID: string
  xp: number
  evidence: SkillEvidence[]
  reviewState?: ReviewState
  lastPracticedAt?: string
}

export interface AttemptRecord {
  index: number
  transcript: string
  durationSeconds: number
  metrics: SpeakingMetrics
  feedback?: CoachFeedback
  comparison?: AttemptComparison
  feedbackWasLocal: boolean
  evidenceVerified: boolean
  conversationTurns?: ConversationTurn[]
  /** True when word placement inside phrases was estimated rather than measured. */
  timingsEstimated: boolean
}

export interface SessionRecord {
  id: string
  scenarioID: string
  skillID: string
  mode: PracticeMode
  startedAt: string
  completedAt?: string
  isReview: boolean
  isBaseline: boolean
  isTransfer: boolean
  targetImproved?: boolean
  xpAwarded: number
  attempts: AttemptRecord[]
  anxietyBefore?: number
  anxietyAfter?: number
}

export interface Mission {
  id: string
  skillID: string
  prompt: string
  assignedAt: string
  completedAt?: string
  reflection?: string
  selfRating?: number
}

export interface UnlockedNugget {
  nuggetID: string
  unlockedAt: string
}

export interface AppState {
  version: number
  profile: Profile
  skillProgress: Record<string, SkillProgress>
  sessions: SessionRecord[]
  missions: Mission[]
  unlockedNuggets: UnlockedNugget[]
}

export function emptyState(now = new Date()): AppState {
  return {
    version: STATE_VERSION,
    profile: {
      totalXP: 0,
      streak: { ...EMPTY_STREAK },
      weeklyTarget: 4,
      weeklyGoal: { target: 4, completed: 0, weekStart: startOfWeek(now).toISOString() },
      seenNuggetIDs: [],
      trackAnxiety: false,
      speakCharacterAloud: true,
      autoTranscribe: true,
    },
    skillProgress: {},
    sessions: [],
    missions: [],
    unlockedNuggets: [],
  }
}

// MARK: - Derived reads

export function level(state: AppState): number {
  return LevelCurve.level(state.profile.totalXP)
}

export function currentTitle(state: AppState): Title {
  return titleForLevel(level(state))
}

export function skillProgressFor(state: AppState, skillID: string): SkillProgress {
  return state.skillProgress[skillID] ?? { skillID, xp: 0, evidence: [] }
}

export function completedSessions(state: AppState): SessionRecord[] {
  return state.sessions.filter((session) => session.completedAt !== undefined)
}

/** Skills whose spaced review has come due, soonest first. */
export function dueReviews(state: AppState, on = new Date()): SkillProgress[] {
  return Object.values(state.skillProgress)
    .filter((progress) => progress.reviewState && ReviewScheduler.isDue(progress.reviewState, on))
    .sort((a, b) => {
      const left = a.reviewState ? new Date(a.reviewState.dueDate).getTime() : Infinity
      const right = b.reviewState ? new Date(b.reviewState.dueDate).getTime() : Infinity
      return left - right
    })
}

export function openMissions(state: AppState): Mission[] {
  return state.missions
    .filter((mission) => mission.completedAt === undefined)
    .sort((a, b) => b.assignedAt.localeCompare(a.assignedAt))
}

// MARK: - Session lifecycle

export interface RewardLine {
  id: string
  label: string
  xp: number
}

export interface SessionRewards {
  lines: RewardLine[]
  totalXP: number
  leveledUp: boolean
  newLevel: number
  newTitle?: Title
  streakOutcome: StreakOutcome
  streakCurrent: number
  masteryBandBefore: MasteryBand
  masteryBandAfter: MasteryBand
  masteryImproved: boolean
  unlockedNugget?: GoldenNugget
  reviewDueDate?: string
  weeklyGoalJustMet: boolean
}

let sessionCounter = 0

export function startSession(
  state: AppState,
  options: { scenario: Scenario; skillID: string; isReview?: boolean; isTransfer?: boolean },
  now = new Date(),
): { state: AppState; session: SessionRecord } {
  sessionCounter += 1
  const session: SessionRecord = {
    id: `s-${now.getTime()}-${sessionCounter}`,
    scenarioID: options.scenario.id,
    skillID: options.skillID,
    mode: options.scenario.mode,
    startedAt: now.toISOString(),
    isReview: options.isReview ?? false,
    isBaseline: (options.scenario.tags ?? []).includes('baseline'),
    isTransfer: options.isTransfer ?? false,
    xpAwarded: 0,
    attempts: [],
  }
  return { state: { ...state, sessions: [session, ...state.sessions] }, session }
}

export function upsertSession(state: AppState, session: SessionRecord): AppState {
  const index = state.sessions.findIndex((entry) => entry.id === session.id)
  const sessions = [...state.sessions]
  if (index >= 0) sessions[index] = session
  else sessions.unshift(session)
  return { ...state, sessions }
}

/**
 * Applies every reward rule for a finished session.
 *
 * The ordering of the lines matters: applying feedback is listed first and pays
 * most, because that is the behaviour the app is trying to produce. Simply
 * showing up earns nothing at all.
 */
export function completeSession(
  state: AppState,
  options: {
    session: SessionRecord
    scenario: Scenario
    targetSkillID: string
    improved: boolean
    bonusObjectivesMet: number
    rubricRating?: RubricRating
    suggestedNugget?: GoldenNugget
  },
  now = new Date(),
): { state: AppState; rewards: SessionRewards } {
  const { session, scenario, targetSkillID, improved, bonusObjectivesMet } = options

  const lines: RewardLine[] = []
  let totalXP = 0
  const award = (label: string, xp: number) => {
    lines.push({ id: `${lines.length}-${label}`, label, xp })
    totalXP += xp
  }

  if (session.isBaseline) {
    award('Baseline recorded', xpAward({ kind: 'baselineCompleted' }))
  } else {
    award('Attempt completed', xpAward({ kind: 'attemptCompleted', tier: scenario.tier }))
  }
  if (session.attempts.length > 1) {
    award('Retry completed', xpAward({ kind: 'retryCompleted', tier: scenario.tier }))
  }
  if (improved) {
    award('Applied the feedback', xpAward({ kind: 'targetImproved', tier: scenario.tier }))
  }
  for (let index = 0; index < Math.max(0, bonusObjectivesMet); index += 1) {
    award('Bonus objective', xpAward({ kind: 'bonusObjectiveMet' }))
  }
  if (session.isTransfer) {
    award('Transfer scenario', xpAward({ kind: 'transferCompleted', tier: scenario.tier }))
  }
  if (session.isReview) {
    award('Spaced review', xpAward({ kind: 'spacedReviewCompleted' }))
  }

  const profileBefore = state.profile
  const levelBefore = LevelCurve.level(profileBefore.totalXP)

  const before = skillProgressFor(state, targetSkillID)
  const masteryBandBefore = computeMastery(before.evidence).band

  const evidence: SkillEvidence[] = [
    ...before.evidence,
    {
      scenarioID: scenario.id,
      tier: scenario.tier,
      improved,
      ...(options.rubricRating ? { rubricRating: options.rubricRating } : {}),
      date: now.toISOString(),
    },
  ]
  const reviewState = before.reviewState
    ? ReviewScheduler.next(before.reviewState, improved, now)
    : ReviewScheduler.firstReview(now)
  const after: SkillProgress = {
    skillID: targetSkillID,
    xp: before.xp + totalXP,
    evidence,
    reviewState,
    lastPracticedAt: now.toISOString(),
  }
  const masteryBandAfter = computeMastery(evidence).band

  const streak = registerPractice(now, profileBefore.streak)
  const rolled = rolledForward(profileBefore.weeklyGoal, now)
  const goalWasMet = weeklyGoalIsMet(rolled)
  const weeklyGoal: WeeklyGoal = {
    ...rolled,
    target: profileBefore.weeklyTarget,
    completed: rolled.completed + 1,
  }

  const profile: Profile = {
    ...profileBefore,
    totalXP: profileBefore.totalXP + totalXP,
    streak: streak.state,
    weeklyGoal,
  }
  if (session.isBaseline && !profile.baselineCompletedAt) {
    profile.baselineCompletedAt = now.toISOString()
  }

  const rewards: SessionRewards = {
    lines,
    totalXP,
    leveledUp: LevelCurve.level(profile.totalXP) > levelBefore,
    newLevel: LevelCurve.level(profile.totalXP),
    streakOutcome: streak.outcome,
    streakCurrent: streak.state.current,
    masteryBandBefore,
    masteryBandAfter,
    masteryImproved:
      MASTERY_BAND_ORDER.indexOf(masteryBandAfter) > MASTERY_BAND_ORDER.indexOf(masteryBandBefore),
    reviewDueDate: reviewState.dueDate,
    weeklyGoalJustMet: !goalWasMet && weeklyGoalIsMet(weeklyGoal),
  }
  if (rewards.leveledUp) {
    const title = titleForLevel(rewards.newLevel)
    if (title.level > titleForLevel(levelBefore).level) rewards.newTitle = title
  }

  // Nuggets unlock once and stay in the collection.
  let unlockedNuggets = state.unlockedNuggets
  const nugget = options.suggestedNugget
  if (nugget && !profile.seenNuggetIDs.includes(nugget.id)) {
    profile.seenNuggetIDs = [...profile.seenNuggetIDs, nugget.id]
    unlockedNuggets = [{ nuggetID: nugget.id, unlockedAt: now.toISOString() }, ...unlockedNuggets]
    rewards.unlockedNugget = nugget
  }

  const finished: SessionRecord = {
    ...session,
    completedAt: now.toISOString(),
    targetImproved: improved,
    xpAwarded: totalXP,
  }

  return {
    state: upsertSession(
      {
        ...state,
        profile,
        skillProgress: { ...state.skillProgress, [targetSkillID]: after },
        unlockedNuggets,
      },
      finished,
    ),
    rewards,
  }
}

/**
 * A real-world mission is only assigned once the behaviour has actually moved —
 * otherwise it is homework on something not yet learned.
 */
export function assignMission(
  state: AppState,
  skillID: string,
  prompt: string,
  now = new Date(),
): AppState {
  if (openMissions(state).some((mission) => mission.skillID === skillID)) return state
  const mission: Mission = {
    id: `m-${now.getTime()}-${skillID}`,
    skillID,
    prompt,
    assignedAt: now.toISOString(),
  }
  return { ...state, missions: [mission, ...state.missions] }
}

/**
 * The learner reports having used the skill for real. The highest single award
 * in the app, because transfer into real life is the entire point.
 */
export function reportRealWorldUse(
  state: AppState,
  options: { missionID: string; reflection: string; selfRating: number },
  now = new Date(),
): { state: AppState; xp: number } {
  const mission = state.missions.find((entry) => entry.id === options.missionID)
  if (!mission || mission.completedAt) return { state, xp: 0 }

  const xp = xpAward({ kind: 'realWorldMissionReported' })
  const missions = state.missions.map((entry) =>
    entry.id === options.missionID
      ? {
          ...entry,
          completedAt: now.toISOString(),
          reflection: options.reflection,
          selfRating: options.selfRating,
        }
      : entry,
  )
  const progress = skillProgressFor(state, mission.skillID)
  return {
    state: {
      ...state,
      missions,
      profile: { ...state.profile, totalXP: state.profile.totalXP + xp },
      skillProgress: {
        ...state.skillProgress,
        [mission.skillID]: { ...progress, xp: progress.xp + xp },
      },
    },
    xp,
  }
}

export function setWeeklyTarget(state: AppState, target: number): AppState {
  const clamped = Math.max(1, Math.min(14, Math.round(target)))
  return {
    ...state,
    profile: {
      ...state.profile,
      weeklyTarget: clamped,
      weeklyGoal: { ...state.profile.weeklyGoal, target: clamped },
    },
  }
}

// MARK: - Privacy

/** Strips transcripts and quoted evidence, keeping progression intact. */
export function deleteAllTranscripts(state: AppState): AppState {
  return {
    ...state,
    sessions: state.sessions.map((session) => ({
      ...session,
      attempts: session.attempts.map((attempt) => {
        const stripped: AttemptRecord = {
          ...attempt,
          transcript: '',
          conversationTurns: [],
        }
        delete stripped.feedback
        delete stripped.comparison
        return stripped
      }),
    })),
  }
}

/** Removes practice history but keeps settings, so the app stays usable. */
export function deleteHistory(state: AppState): AppState {
  return { ...state, sessions: [], missions: [] }
}

/** Everything goes: history, progression, unlocks. Settings are reset too. */
export function deleteEverything(now = new Date()): AppState {
  return emptyState(now)
}
