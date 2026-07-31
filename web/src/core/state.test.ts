import { describe, expect, it } from 'vitest'
import {
  assignMission,
  completeSession,
  deleteAllTranscripts,
  deleteEverything,
  deleteHistory,
  dueReviews,
  emptyState,
  level,
  openMissions,
  reportRealWorldUse,
  setWeeklyTarget,
  skillProgressFor,
  startSession,
  upsertSession,
  type AppState,
  type AttemptRecord,
  type SessionRecord,
} from './state'
import { addDays } from './progression'
import { scenario as findScenario } from './content'
import { EMPTY_METRICS, type Scenario } from './types'

// Covers the reward rules and the persistence shape: the two places where a
// quiet bug would silently corrupt someone's history.

function requireScenario(id: string): Scenario {
  const found = findScenario(id)
  if (!found) throw new Error(`missing scenario ${id}`)
  return found
}

const scenario = requireScenario('spk-buddy-week')
const now = new Date('2026-03-02T09:00:00')

function attempt(index: number): AttemptRecord {
  return {
    index,
    transcript: `attempt ${index}`,
    durationSeconds: 30,
    metrics: EMPTY_METRICS,
    feedbackWasLocal: true,
    evidenceVerified: true,
    timingsEstimated: true,
  }
}

function withAttempts(session: SessionRecord, count: number): SessionRecord {
  return { ...session, attempts: Array.from({ length: count }, (_, index) => attempt(index)) }
}

function finish(
  state: AppState,
  session: SessionRecord,
  improved: boolean,
  at = now,
  overrides: Partial<Parameters<typeof completeSession>[1]> = {},
) {
  return completeSession(
    state,
    {
      session,
      scenario,
      targetSkillID: scenario.primarySkillID,
      improved,
      bonusObjectivesMet: 0,
      ...overrides,
    },
    at,
  )
}

describe('session lifecycle', () => {
  it('records a session and awards the attempt', () => {
    const started = startSession(emptyState(now), { scenario, skillID: scenario.primarySkillID }, now)
    const session = withAttempts(started.session, 1)
    const { state, rewards } = finish(upsertSession(started.state, session), session, false)

    expect(rewards.totalXP).toBeGreaterThan(0)
    expect(rewards.lines.map((line) => line.label)).toContain('Attempt completed')
    expect(state.profile.totalXP).toBe(rewards.totalXP)
    expect(state.sessions[0]?.completedAt).toBeDefined()
  })

  it('pays most for applying the feedback', () => {
    const started = startSession(emptyState(now), { scenario, skillID: scenario.primarySkillID }, now)
    const session = withAttempts(started.session, 2)
    const base = upsertSession(started.state, session)

    const withoutImprovement = finish(base, session, false).rewards.totalXP
    const withImprovement = finish(base, session, true).rewards.totalXP
    expect(withImprovement).toBeGreaterThan(withoutImprovement)

    const line = finish(base, session, true).rewards.lines.find(
      (entry) => entry.label === 'Applied the feedback',
    )
    expect(line?.xp).toBeGreaterThan(0)
  })

  it('awards nothing for merely opening the app', () => {
    const state = emptyState(now)
    expect(state.profile.totalXP).toBe(0)
    expect(level(state)).toBe(1)
  })

  it('counts each bonus objective the learner claims', () => {
    const started = startSession(emptyState(now), { scenario, skillID: scenario.primarySkillID }, now)
    const session = withAttempts(started.session, 1)
    const base = upsertSession(started.state, session)
    const none = finish(base, session, false, now, { bonusObjectivesMet: 0 }).rewards.totalXP
    const two = finish(base, session, false, now, { bonusObjectivesMet: 2 }).rewards.totalXP
    expect(two - none).toBe(20)
  })

  it('records evidence and schedules the first review', () => {
    const started = startSession(emptyState(now), { scenario, skillID: scenario.primarySkillID }, now)
    const session = withAttempts(started.session, 2)
    const { state, rewards } = finish(upsertSession(started.state, session), session, true)

    const progress = skillProgressFor(state, scenario.primarySkillID)
    expect(progress.evidence).toHaveLength(1)
    expect(progress.evidence[0]?.improved).toBe(true)
    expect(progress.reviewState?.intervalDays).toBe(2)
    expect(rewards.reviewDueDate).toBeDefined()

    expect(dueReviews(state, now)).toHaveLength(0)
    expect(dueReviews(state, addDays(now, 3))).toHaveLength(1)
  })

  it('advances the streak and the weekly goal exactly once per session', () => {
    const started = startSession(emptyState(now), { scenario, skillID: scenario.primarySkillID }, now)
    const session = withAttempts(started.session, 1)
    const { state, rewards } = finish(upsertSession(started.state, session), session, false)
    expect(rewards.streakCurrent).toBe(1)
    expect(state.profile.weeklyGoal.completed).toBe(1)
  })

  it('unlocks a nugget only once', () => {
    const nugget = {
      id: 'signpost-frees-attention',
      title: 'Signposting frees their attention',
      insight: 'Two words buy the whole talk.',
      category: 'structure' as const,
    }
    const started = startSession(emptyState(now), { scenario, skillID: scenario.primarySkillID }, now)
    const session = withAttempts(started.session, 1)
    const first = finish(upsertSession(started.state, session), session, false, now, {
      suggestedNugget: nugget,
    })
    expect(first.rewards.unlockedNugget?.id).toBe(nugget.id)

    const second = finish(first.state, session, false, now, { suggestedNugget: nugget })
    expect(second.rewards.unlockedNugget).toBeUndefined()
    expect(second.state.unlockedNuggets).toHaveLength(1)
  })

  it('reports a level-up and a new title when the threshold is crossed', () => {
    let state = emptyState(now)
    let leveled = false
    for (let index = 0; index < 12 && !leveled; index += 1) {
      const started = startSession(state, { scenario, skillID: scenario.primarySkillID }, now)
      const session = withAttempts(started.session, 2)
      const result = finish(upsertSession(started.state, session), session, true, now)
      state = result.state
      leveled = leveled || result.rewards.leveledUp
    }
    expect(leveled).toBe(true)
    expect(level(state)).toBeGreaterThan(1)
  })
})

describe('real-world missions', () => {
  it('assigns at most one open mission per skill', () => {
    let state = assignMission(emptyState(now), 'bottom-line-first', 'Use it once for real.', now)
    state = assignMission(state, 'bottom-line-first', 'Use it again.', now)
    expect(openMissions(state)).toHaveLength(1)
  })

  it('pays the highest single award when the learner reports back', () => {
    const state = assignMission(emptyState(now), 'bottom-line-first', 'Use it once.', now)
    const mission = openMissions(state)[0]
    expect(mission).toBeDefined()
    const result = reportRealWorldUse(
      state,
      { missionID: mission?.id ?? '', reflection: 'Told my manager the answer first.', selfRating: 4 },
      now,
    )
    expect(result.xp).toBe(60)
    expect(result.state.profile.totalXP).toBe(60)
    expect(openMissions(result.state)).toHaveLength(0)
  })

  it('cannot be reported twice', () => {
    const state = assignMission(emptyState(now), 'bottom-line-first', 'Use it once.', now)
    const missionID = openMissions(state)[0]?.id ?? ''
    const first = reportRealWorldUse(state, { missionID, reflection: 'Did it.', selfRating: 4 }, now)
    const second = reportRealWorldUse(
      first.state,
      { missionID, reflection: 'Again.', selfRating: 5 },
      now,
    )
    expect(second.xp).toBe(0)
    expect(second.state.profile.totalXP).toBe(60)
  })
})

describe('settings and privacy', () => {
  it('clamps the weekly target to something achievable', () => {
    expect(setWeeklyTarget(emptyState(now), 0).profile.weeklyTarget).toBe(1)
    expect(setWeeklyTarget(emptyState(now), 99).profile.weeklyTarget).toBe(14)
    expect(setWeeklyTarget(emptyState(now), 5).profile.weeklyGoal.target).toBe(5)
  })

  it('deletes transcripts and coaching text but keeps progression', () => {
    const started = startSession(emptyState(now), { scenario, skillID: scenario.primarySkillID }, now)
    const session = withAttempts(started.session, 1)
    const { state } = finish(upsertSession(started.state, session), session, true)

    const stripped = deleteAllTranscripts(state)
    expect(stripped.sessions[0]?.attempts[0]?.transcript).toBe('')
    expect(stripped.sessions[0]?.attempts[0]?.feedback).toBeUndefined()
    expect(stripped.profile.totalXP).toBe(state.profile.totalXP)
    expect(Object.keys(stripped.skillProgress)).toHaveLength(1)
  })

  it('deletes history while keeping settings', () => {
    const started = startSession(emptyState(now), { scenario, skillID: scenario.primarySkillID }, now)
    const session = withAttempts(started.session, 1)
    let { state } = finish(upsertSession(started.state, session), session, true)
    state = setWeeklyTarget(state, 6)

    const cleared = deleteHistory(state)
    expect(cleared.sessions).toHaveLength(0)
    expect(cleared.missions).toHaveLength(0)
    expect(cleared.profile.weeklyTarget).toBe(6)
  })

  it('deletes everything back to a first-run state', () => {
    const fresh = deleteEverything(now)
    expect(fresh.profile.totalXP).toBe(0)
    expect(fresh.sessions).toHaveLength(0)
    expect(fresh.unlockedNuggets).toHaveLength(0)
    expect(fresh.profile.seenNuggetIDs).toHaveLength(0)
  })
})

describe('serialisation', () => {
  it('survives a round trip through JSON', () => {
    const started = startSession(emptyState(now), { scenario, skillID: scenario.primarySkillID }, now)
    const session = withAttempts(started.session, 2)
    const { state } = finish(upsertSession(started.state, session), session, true)

    const restored = JSON.parse(JSON.stringify(state)) as AppState
    expect(restored.profile.totalXP).toBe(state.profile.totalXP)
    expect(restored.sessions[0]?.attempts).toHaveLength(2)
    expect(skillProgressFor(restored, scenario.primarySkillID).evidence).toHaveLength(1)
    expect(dueReviews(restored, addDays(now, 5))).toHaveLength(1)
  })
})
