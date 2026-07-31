import { useMemo, useState } from 'react'
import { useSpeakLab } from '../app/store'
import {
  Button,
  Card,
  ChoiceRow,
  Meter,
  Pill,
  SectionLabel,
  Stat,
  TierPill,
  formatDueDate,
  formatRelativeDay,
} from '../design/components'
import {
  baselineScenarios,
  browsableScenarios,
  scenario as findScenario,
  skill as findSkill,
  scenariosForSkill,
  unlockedPaths,
} from '../core/content'
import { LevelCurve, titleForLevel, nextTitleAfter, weeklyGoalProgress } from '../core/progression'
import {
  completedSessions,
  dueReviews,
  openMissions,
  reportRealWorldUse,
  rolledForwardGoal,
} from './todayHelpers'
import type { Scenario } from '../core/types'

/**
 * The entry screen.
 *
 * It answers one question — "what should I do right now?" — and gets out of the
 * way. Everything on it is either the next rep, evidence that reps are
 * happening, or something the learner owes themselves from a previous session.
 */
export function Today({
  onStart,
}: {
  onStart: (scenario: Scenario, options?: { isReview?: boolean }) => void
}) {
  const { state, update } = useSpeakLab()
  const [reportingMission, setReportingMission] = useState<string>()

  const xp = state.profile.totalXP
  const level = LevelCurve.level(xp)
  const title = titleForLevel(level)
  const nextTitle = nextTitleAfter(level)
  const goal = rolledForwardGoal(state)
  const reviews = dueReviews(state)
  const missions = openMissions(state)
  const done = completedSessions(state)

  const recommendation = useMemo(() => recommend(state, reviews), [state, reviews])

  return (
    <div className="screen stack stack--loose">
      <header className="stack stack--tight">
        <SectionLabel>SpeakLab</SectionLabel>
        <h1 className="display">{greeting()}</h1>
        <div className="stack stack--tight">
          <div className="row row--between">
            <span className="caption">
              Level {level} · {title.name}
            </span>
            <span className="caption">
              {LevelCurve.xpIntoCurrentLevel(xp)} / {LevelCurve.increment(level)} XP
            </span>
          </div>
          <Meter value={LevelCurve.progress(xp)} />
          {nextTitle ? (
            <p className="caption">
              Next title at level {nextTitle.level}: {nextTitle.name}
            </p>
          ) : null}
        </div>
      </header>

      {recommendation ? (
        <Card variant="accent">
          <div className="stack">
            <div className="stack stack--tight">
              <div className="row row--wrap">
                <SectionLabel>{recommendation.reason}</SectionLabel>
              </div>
              <h2 className="title">{recommendation.scenario.title}</h2>
              <p className="body">{recommendation.scenario.hook}</p>
              <div className="row row--wrap">
                <TierPill tier={recommendation.scenario.tier} />
                <Pill>
                  {recommendation.scenario.mode === 'speaking' ? 'Speaking' : 'Conversation'}
                </Pill>
                <Pill>
                  {recommendation.scenario.timeLimitSeconds
                    ? `${recommendation.scenario.timeLimitSeconds}s`
                    : 'Untimed'}
                </Pill>
              </div>
            </div>
            <Button
              block
              onClick={() =>
                onStart(recommendation.scenario, { isReview: recommendation.isReview })
              }
            >
              Start — about 6 minutes
            </Button>
          </div>
        </Card>
      ) : null}

      <div className="grid-3">
        <Card variant="plain">
          <Stat
            value={state.profile.streak.current}
            label="Day streak"
            {...(state.profile.streak.best > state.profile.streak.current
              ? { hint: `best ${state.profile.streak.best}` }
              : {})}
          />
        </Card>
        <Card variant="plain">
          <Stat value={done.length} label="Sessions" />
        </Card>
        <Card variant="plain">
          <Stat
            value={done.filter((session) => session.targetImproved).length}
            label="Targets hit"
          />
        </Card>
      </div>

      <Card>
        <div className="stack stack--tight">
          <div className="row row--between">
            <SectionLabel>This week</SectionLabel>
            <span className="caption">
              {goal.completed} of {goal.target}
            </span>
          </div>
          <Meter value={weeklyGoalProgress(goal)} />
          <p className="caption">
            {goal.completed >= goal.target
              ? 'Weekly goal met. Anything else this week is a bonus.'
              : `${goal.target - goal.completed} more session${goal.target - goal.completed === 1 ? '' : 's'} to hit your goal.`}
          </p>
          {state.profile.streak.freezesRemaining > 0 ? (
            <p className="caption">
              You have a rest day in hand — miss a day and the streak survives.
            </p>
          ) : null}
        </div>
      </Card>

      {reviews.length > 0 ? (
        <section className="stack stack--tight">
          <SectionLabel>Due for review</SectionLabel>
          {reviews.slice(0, 3).map((progress) => {
            const skill = findSkill(progress.skillID)
            const scenario = scenariosForSkill(progress.skillID)[0]
            if (!skill || !scenario) return null
            return (
              <Card key={progress.skillID} variant="plain">
                <div className="row row--between">
                  <div className="stack" style={{ gap: 2 }}>
                    <span className="body">{skill.name}</span>
                    <span className="caption">
                      {progress.reviewState ? formatDueDate(progress.reviewState.dueDate) : ''} ·
                      last practised{' '}
                      {progress.lastPracticedAt
                        ? formatRelativeDay(progress.lastPracticedAt).toLowerCase()
                        : 'a while ago'}
                    </span>
                  </div>
                  <Button variant="secondary" onClick={() => onStart(scenario, { isReview: true })}>
                    Review
                  </Button>
                </div>
              </Card>
            )
          })}
        </section>
      ) : null}

      {missions.length > 0 ? (
        <section className="stack stack--tight">
          <SectionLabel>Out in the world</SectionLabel>
          {missions.slice(0, 2).map((mission) => (
            <Card key={mission.id}>
              <div className="stack stack--tight">
                <p className="body">{mission.prompt}</p>
                <p className="caption">
                  Assigned {formatRelativeDay(mission.assignedAt).toLowerCase()}
                </p>
                {reportingMission === mission.id ? (
                  <MissionReport
                    onCancel={() => setReportingMission(undefined)}
                    onSubmit={(reflection, selfRating) => {
                      update((current) => reportRealWorldUse(current, {
                        missionID: mission.id,
                        reflection,
                        selfRating,
                      }))
                      setReportingMission(undefined)
                    }}
                  />
                ) : (
                  <Button variant="secondary" onClick={() => setReportingMission(mission.id)}>
                    I did it — tell SpeakLab what happened
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </section>
      ) : null}

      {state.profile.baselineCompletedAt === undefined && done.length >= 3 ? (
        <Card variant="sunken">
          <div className="stack stack--tight">
            <SectionLabel>Set a baseline</SectionLabel>
            <p className="body">
              A one-off recording SpeakLab keeps aside so later sessions have something honest to
              compare against. It isn't coached and it isn't scored.
            </p>
            {baselineScenarios[0] ? (
              <Button variant="secondary" onClick={() => onStart(baselineScenarios[0] as Scenario)}>
                Record the baseline
              </Button>
            ) : null}
          </div>
        </Card>
      ) : null}

      {done.length === 0 ? (
        <Card variant="plain">
          <div className="stack stack--tight">
            <SectionLabel>How a session goes</SectionLabel>
            <ol className="bullets body">
              <li>You read a short brief and one skill to work on.</li>
              <li>You plan for a few seconds — bullets, not a script.</li>
              <li>You record, or talk to a simulated person.</li>
              <li>You get one thing to change, with your own words as evidence.</li>
              <li>You do it again straight away, and the two are compared.</li>
            </ol>
            <p className="caption">
              Recording is always visible, audio never leaves this browser, and nothing is sent
              anywhere unless you connect a coaching server yourself.
            </p>
          </div>
        </Card>
      ) : null}
    </div>
  )
}

function MissionReport({
  onSubmit,
  onCancel,
}: {
  onSubmit: (reflection: string, selfRating: number) => void
  onCancel: () => void
}) {
  const [reflection, setReflection] = useState('')
  const [rating, setRating] = useState(3)
  return (
    <div className="stack stack--tight">
      <textarea
        className="field"
        value={reflection}
        onChange={(event) => setReflection(event.target.value)}
        placeholder="What actually happened? One or two lines is plenty."
        aria-label="What happened"
      />
      <SectionLabel>How did it go?</SectionLabel>
      <ChoiceRow
        ariaLabel="How did it go"
        value={rating}
        onChange={setRating}
        options={[1, 2, 3, 4, 5].map((n) => ({ value: n, label: String(n) }))}
      />
      <div className="row">
        <Button onClick={() => onSubmit(reflection.trim(), rating)}>Log it (+60 XP)</Button>
        <Button variant="quiet" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

function greeting(now = new Date()): string {
  const hour = now.getHours()
  if (hour < 5) return 'Still up.'
  if (hour < 12) return 'Morning rep.'
  if (hour < 18) return 'Afternoon rep.'
  return 'Evening rep.'
}

interface Recommendation {
  scenario: Scenario
  reason: string
  isReview: boolean
}

/**
 * Picks the next scenario.
 *
 * Order of preference: a skill that has come due for review, then the first
 * scenario in an unlocked path the learner hasn't touched, then the least
 * recently practised one. Never a random pick — the point of a curriculum is
 * that it knows what comes next.
 */
function recommend(
  state: ReturnType<typeof useSpeakLab>['state'],
  reviews: ReturnType<typeof dueReviews>,
): Recommendation | undefined {
  const firstReview = reviews[0]
  if (firstReview) {
    const scenario = scenariosForSkill(firstReview.skillID)[0]
    if (scenario) return { scenario, reason: 'Due for review', isReview: true }
  }

  const level = LevelCurve.level(state.profile.totalXP)
  const available = new Set(unlockedPaths(level).map((path) => path.id))
  const attempted = new Set(state.sessions.map((session) => session.scenarioID))

  const candidates = browsableScenarios.filter((scenario) => available.has(scenario.pathID))
  const fresh = candidates
    .filter((scenario) => !attempted.has(scenario.id))
    .sort((a, b) => a.tier - b.tier)[0]
  if (fresh) {
    return {
      scenario: fresh,
      reason: attempted.size === 0 ? 'Start here' : 'Next up',
      isReview: false,
    }
  }

  const lastAttemptAt = new Map<string, string>()
  for (const session of state.sessions) {
    const existing = lastAttemptAt.get(session.scenarioID)
    if (!existing || session.startedAt > existing) lastAttemptAt.set(session.scenarioID, session.startedAt)
  }
  const stalest = [...candidates].sort((a, b) =>
    (lastAttemptAt.get(a.id) ?? '').localeCompare(lastAttemptAt.get(b.id) ?? ''),
  )[0]
  if (stalest) return { scenario: stalest, reason: 'Worth another run', isReview: false }

  const fallback = findScenario(browsableScenarios[0]?.id)
  return fallback ? { scenario: fallback, reason: 'Next up', isReview: false } : undefined
}
