import { useMemo } from 'react'
import { useSpeakLab } from '../app/store'
import { Card, Pill, SectionLabel, Stat, formatRelativeDay } from '../design/components'
import { BarChart, NotYet, TrendChart, type SeriesPoint } from '../design/charts'
import { nugget as findNugget, skill as findSkill, skills } from '../core/content'
import { MASTERY_BAND_NAMES, computeMastery, startOfWeek } from '../core/progression'
import { completedSessions, skillProgressFor } from '../core/state'
import type { AppState, SessionRecord } from '../core/state'
import { Thresholds } from '../core/types'

/**
 * What has actually changed.
 *
 * Charts appear only when there is enough data for the shape to mean something,
 * and each one says what it measured. There is no composite "communication
 * score" anywhere in this app, because there is no honest way to compute one.
 */
export function Progress() {
  const { state } = useSpeakLab()
  const sessions = useMemo(
    () => completedSessions(state).slice().reverse(),
    [state],
  )

  const withMetrics = sessions.filter((session) => attemptOf(session)?.metrics.wordCount)
  const improvementRate = sessions.length
    ? sessions.filter((session) => session.targetImproved).length / sessions.length
    : 0

  const retries = sessions.filter((session) => session.attempts.length > 1).length

  return (
    <div className="screen stack stack--loose">
      <header className="stack stack--tight">
        <SectionLabel>Progress</SectionLabel>
        <h1 className="display">What's changed</h1>
      </header>

      <div className="grid-3">
        <Card variant="plain">
          <Stat value={sessions.length} label="Sessions" />
        </Card>
        <Card variant="plain">
          <Stat value={retries} label="Retries" />
        </Card>
        <Card variant="plain">
          <Stat
            value={sessions.length ? `${Math.round(improvementRate * 100)}%` : '—'}
            label="Target moved"
          />
        </Card>
      </div>

      <Card>
        <div className="stack stack--tight">
          <SectionLabel>Practice frequency</SectionLabel>
          {sessions.length >= 1 ? (
            <BarChart points={weeklyCounts(sessions)} />
          ) : (
            <NotYet need="Complete a session and this fills in." />
          )}
          <p className="caption">Sessions per week, most recent on the right.</p>
        </div>
      </Card>

      <Card>
        <div className="stack stack--tight">
          <SectionLabel>Filler words</SectionLabel>
          {withMetrics.length >= 3 ? (
            <>
              <TrendChart
                points={seriesOf(withMetrics, (session) => attemptOf(session)?.metrics.fillerRate ?? 0)}
                format={(value) => value.toFixed(1)}
              />
              <p className="caption">
                Per 100 words, first attempt of each session. Lower is usually better, but a
                genuinely thoughtful pause is not a filler.
              </p>
            </>
          ) : (
            <NotYet need="Three sessions with a transcript and this becomes a trend." />
          )}
        </div>
      </Card>

      <Card>
        <div className="stack stack--tight">
          <SectionLabel>Pace</SectionLabel>
          {withMetrics.length >= 3 ? (
            <>
              <TrendChart
                points={seriesOf(withMetrics, (session) => attemptOf(session)?.metrics.wordsPerMinute ?? 0)}
                band={{ low: Thresholds.comfortablePaceLow, high: Thresholds.comfortablePaceHigh }}
              />
              <p className="caption">
                Words per minute. The shaded band is the range most listeners follow comfortably —
                it is not a target to hit exactly.
              </p>
            </>
          ) : (
            <NotYet need="Three sessions with a transcript and this becomes a trend." />
          )}
        </div>
      </Card>

      <BaselineCard state={state} />

      <Card>
        <div className="stack stack--tight">
          <SectionLabel>Skills</SectionLabel>
          <MasterySummary state={state} />
        </div>
      </Card>

      <AnxietyCard sessions={sessions} />

      <Card>
        <div className="stack stack--tight">
          <SectionLabel>Golden nuggets</SectionLabel>
          {state.unlockedNuggets.length === 0 ? (
            <NotYet need="These unlock when a principle genuinely explains what just happened in a session." />
          ) : (
            state.unlockedNuggets.map((entry) => {
              const nugget = findNugget(entry.nuggetID)
              if (!nugget) return null
              return (
                <div key={entry.nuggetID} className="stack" style={{ gap: 2 }}>
                  <span className="body">{nugget.title}</span>
                  <span className="caption">{nugget.insight}</span>
                </div>
              )
            })
          )}
        </div>
      </Card>

      {sessions.length > 0 ? (
        <Card variant="plain">
          <div className="stack stack--tight">
            <SectionLabel>History</SectionLabel>
            {sessions
              .slice()
              .reverse()
              .slice(0, 12)
              .map((session) => {
                const skill = findSkill(session.skillID)
                return (
                  <div key={session.id} className="row row--between">
                    <div className="stack" style={{ gap: 0, minWidth: 0 }}>
                      <span className="body">{skill?.name ?? session.skillID}</span>
                      <span className="caption">
                        {session.completedAt ? formatRelativeDay(session.completedAt) : ''} ·{' '}
                        {session.attempts.length} attempt
                        {session.attempts.length === 1 ? '' : 's'}
                        {session.isReview ? ' · review' : ''}
                      </span>
                    </div>
                    <div className="row" style={{ flex: '0 0 auto' }}>
                      {session.targetImproved ? <Pill tone="accent">Moved</Pill> : null}
                      <span className="metric caption">+{session.xpAwarded}</span>
                    </div>
                  </div>
                )
              })}
          </div>
        </Card>
      ) : null}
    </div>
  )
}

function attemptOf(session: SessionRecord) {
  return session.attempts[0]
}

function seriesOf(sessions: SessionRecord[], pick: (session: SessionRecord) => number): SeriesPoint[] {
  return sessions.slice(-12).map((session) => ({
    label: session.completedAt
      ? new Date(session.completedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
      : '',
    value: pick(session),
  }))
}

function weeklyCounts(sessions: SessionRecord[]): SeriesPoint[] {
  const buckets = new Map<string, number>()
  const now = new Date()
  for (let index = 7; index >= 0; index -= 1) {
    const week = startOfWeek(new Date(now.getTime() - index * 7 * 86_400_000))
    buckets.set(week.toISOString().slice(0, 10), 0)
  }
  for (const session of sessions) {
    if (!session.completedAt) continue
    const key = startOfWeek(new Date(session.completedAt)).toISOString().slice(0, 10)
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1)
  }
  return [...buckets.entries()].map(([key, value]) => ({
    label: new Date(key).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
    value,
  }))
}

function MasterySummary({ state }: { state: AppState }) {
  const practised = skills
    .map((skill) => ({ skill, mastery: computeMastery(skillProgressFor(state, skill.id).evidence) }))
    .filter((entry) => entry.mastery.evidenceCount > 0)
    .sort((a, b) => b.mastery.score - a.mastery.score)

  if (practised.length === 0) {
    return <NotYet need="Practise a skill and its mastery band appears here." />
  }

  return (
    <div className="stack stack--tight">
      {practised.slice(0, 8).map(({ skill, mastery }) => (
        <div key={skill.id} className="row row--between">
          <div className="stack" style={{ gap: 0, minWidth: 0 }}>
            <span className="body">{skill.name}</span>
            <span className="caption">{mastery.nextRequirement}</span>
          </div>
          <Pill tone={mastery.band === 'fluent' ? 'accent' : undefined}>
            {MASTERY_BAND_NAMES[mastery.band]}
          </Pill>
        </div>
      ))}
      <p className="caption">
        Mastery needs the behaviour to hold across several <em>different</em> scenarios. Repeating
        one rehearsed scenario proves memorisation, not skill.
      </p>
    </div>
  )
}

function BaselineCard({ state }: { state: AppState }) {
  const baselines = completedSessions(state).filter((session) => session.isBaseline)
  if (baselines.length === 0) return null

  const first = baselines[baselines.length - 1]
  const latest = baselines[0]
  const firstMetrics = first ? attemptOf(first)?.metrics : undefined
  const latestMetrics = latest ? attemptOf(latest)?.metrics : undefined

  return (
    <Card>
      <div className="stack stack--tight">
        <SectionLabel>Baseline</SectionLabel>
        {baselines.length < 2 || !firstMetrics || !latestMetrics ? (
          <p className="caption">
            Baseline recorded{' '}
            {first?.completedAt ? formatRelativeDay(first.completedAt).toLowerCase() : ''}. Record
            the second baseline scenario later on and the two get compared here — comparable
            material, not the same script.
          </p>
        ) : (
          <>
            <div className="grid-2">
              <Stat
                value={Math.round(firstMetrics.wordsPerMinute)}
                label="Then · wpm"
                hint={`${firstMetrics.fillerCount} fillers`}
              />
              <Stat
                value={Math.round(latestMetrics.wordsPerMinute)}
                label="Now · wpm"
                hint={`${latestMetrics.fillerCount} fillers`}
              />
            </div>
            <p className="caption">
              Two different scenarios of similar difficulty, so this is a comparison rather than a
              rerun of something memorised.
            </p>
          </>
        )}
      </div>
    </Card>
  )
}

function AnxietyCard({ sessions }: { sessions: SessionRecord[] }) {
  const rated = sessions.filter(
    (session) => session.anxietyBefore !== undefined && session.anxietyAfter !== undefined,
  )
  if (rated.length < 2) return null

  const averageBefore =
    rated.reduce((total, session) => total + (session.anxietyBefore ?? 0), 0) / rated.length
  const averageAfter =
    rated.reduce((total, session) => total + (session.anxietyAfter ?? 0), 0) / rated.length

  return (
    <Card>
      <div className="stack stack--tight">
        <SectionLabel>How you felt</SectionLabel>
        <div className="grid-2">
          <Stat value={averageBefore.toFixed(1)} label="Before" />
          <Stat value={averageAfter.toFixed(1)} label="After" />
        </div>
        <p className="caption">
          Your own 1–5 ratings, averaged across {rated.length} sessions. This is a note you left
          yourself, not a measurement and not a diagnosis.
        </p>
      </div>
    </Card>
  )
}
