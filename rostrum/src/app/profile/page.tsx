'use client'

import Link from 'next/link'
import { ACHIEVEMENTS } from '@/content/fieldTests'
import { technique as findTechnique } from '@/content/techniques'
import {
  branchScores,
  coldRetrievalCount,
  countAtStageOrAbove,
  knownTechniqueIds,
  weeklyInsight,
} from '@/lib/progress'
import { levelFromXp, levelProgress, nextRankAfter, rankFor } from '@/lib/progression'
import { IS_STATIC_BUILD } from '@/lib/build'
import { clearStoredProgress, useStore } from '@/lib/store'
import { emptyProgress } from '@/lib/progress'
import { Card, Eyebrow, Meter, NotYet, Ring, Stat, relativeDay } from '@/components/ui'
import { SKILL_BRANCH_NAMES, type SkillBranch } from '@/lib/types'
import { useState } from 'react'

/**
 * Progress.
 *
 * Nothing here is a composite "speaking score". Each figure names exactly what
 * it counts, and any panel without enough practice behind it says so rather
 * than drawing a chart out of two data points.
 */
export default function ProfilePage() {
  const { progress, replace, storageFailed } = useStore()
  const [confirmWipe, setConfirmWipe] = useState(false)

  const level = levelFromXp(progress.xp)
  const rank = rankFor(level)
  const next = nextRankAfter(level)
  const known = knownTechniqueIds(progress)
  const scores = branchScores(progress)
  const insight = weeklyInsight(progress)
  const unlocked = new Set(progress.unlockedAchievementIds)

  const minutes = Math.round(
    progress.attempts.reduce((sum, attempt) => sum + attempt.durationSeconds, 0) / 60,
  )
  const bestAttempt = [...progress.attempts].sort((a, b) => b.techniqueScore - a.techniqueScore)[0]
  const bestLine = progress.attempts.find((attempt) => attempt.strongestLine)?.strongestLine

  return (
    <main className="screen stack-lg">
      <header className="row" style={{ gap: 18 }}>
        <Ring value={levelProgress(progress.xp) * 100} size={84} stroke={7}>
          <div>
            <div className="numeral" style={{ fontSize: 24, lineHeight: 1 }}>
              {level}
            </div>
            <div className="eyebrow" style={{ marginTop: 2 }}>
              level
            </div>
          </div>
        </Ring>
        <div className="stack-sm">
          <h1 className="title">{rank.name}</h1>
          <p className="caption">{rank.blurb}</p>
          {next ? <p className="caption faint">Next: {next.name} at level {next.level}</p> : null}
        </div>
      </header>

      {storageFailed ? (
        <Card variant="quiet">
          <p className="caption">
            This browser refused to save. Private browsing usually causes it — the session works,
            but progress will not survive a reload.
          </p>
        </Card>
      ) : null}

      <Card>
        <div className="stack-sm">
          <div className="row" style={{ gap: 20, flexWrap: 'wrap' }}>
            <Stat value={progress.attempts.length} label="Attempts" />
            <Stat value={minutes} label="Minutes spoken" />
            <Stat value={progress.streak.best} label="Best streak" />
          </div>
          <hr className="rule" style={{ margin: '6px 0' }} />
          <div className="row" style={{ gap: 20, flexWrap: 'wrap' }}>
            <Stat value={known.length} label="Techniques" />
            <Stat value={countAtStageOrAbove(progress, 'reliable')} label="Reliable+" />
            <Stat value={coldRetrievalCount(progress)} label="Cold retrievals" />
          </div>
        </div>
      </Card>

      <div className="stack-sm">
        <div className="row-between">
          <Eyebrow amber>Skill branches</Eyebrow>
          <Link href="/tree" className="link caption">
            Skill tree ›
          </Link>
        </div>
        {Object.entries(scores).every(([, value]) => value === 0) ? (
          <NotYet>These fill in as you practise. Nothing is estimated before then.</NotYet>
        ) : (
          <Card>
            <div className="stack-sm">
              {(Object.keys(scores) as SkillBranch[]).map((branch) => (
                <div key={branch} className="stack-sm" style={{ gap: 5 }}>
                  <div className="row-between">
                    <span className="caption">{SKILL_BRANCH_NAMES[branch]}</span>
                    <span className="numeral caption">{scores[branch]}</span>
                  </div>
                  <Meter value={scores[branch] / 100} label={SKILL_BRANCH_NAMES[branch]} />
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      <Card variant="quiet">
        <div className="stack-sm">
          <Eyebrow>This week</Eyebrow>
          <p className="caption">
            {insight.attemptsThisWeek} attempt{insight.attemptsThisWeek === 1 ? '' : 's'} in the last
            seven days.
          </p>
          {insight.strongest ? (
            <p className="caption">
              Strongest: {SKILL_BRANCH_NAMES[insight.strongest.branch]} at {insight.strongest.delta}.
            </p>
          ) : null}
          {insight.needsAttention ? (
            <p className="caption">
              Needs attention: {SKILL_BRANCH_NAMES[insight.needsAttention as SkillBranch]}.
            </p>
          ) : null}
          {insight.dueForReview ? (
            <p className="caption" style={{ color: 'var(--color-amber)' }}>
              Due for review: {findTechnique(insight.dueForReview)?.name}.
            </p>
          ) : null}
          {insight.attemptsThisWeek === 0 ? (
            <NotYet>No attempts yet this week, so there is nothing honest to report.</NotYet>
          ) : null}
        </div>
      </Card>

      {bestLine || bestAttempt ? (
        <div className="stack-sm">
          <Eyebrow amber>Personal bests</Eyebrow>
          {bestLine ? (
            <Card variant="amber">
              <div className="stack-sm">
                <Eyebrow amber>Strongest line</Eyebrow>
                <p className="spoken-lg">“{bestLine}”</p>
              </div>
            </Card>
          ) : null}
          {bestAttempt ? (
            <Card>
              <div className="row-between">
                <div className="stack-sm" style={{ gap: 2 }}>
                  <span className="caption">Best performance</span>
                  <span className="caption faint">
                    {findTechnique(bestAttempt.techniqueId)?.name ?? 'Open challenge'} ·{' '}
                    {relativeDay(bestAttempt.createdAt)}
                  </span>
                </div>
                <span className="numeral" style={{ fontSize: 22 }}>
                  {bestAttempt.techniqueScore}
                </span>
              </div>
            </Card>
          ) : null}
        </div>
      ) : null}

      <div className="stack-sm">
        <Eyebrow>Achievements</Eyebrow>
        <Card variant="quiet">
          <div className="stack-sm">
            {ACHIEVEMENTS.map((achievement) => {
              const has = unlocked.has(achievement.id)
              return (
                <div key={achievement.id} className="row-between">
                  <div className="stack-sm" style={{ gap: 1, minWidth: 0 }}>
                    <span className="body" style={{ color: has ? 'var(--color-amber)' : undefined }}>
                      {achievement.name}
                    </span>
                    <span className="caption faint">{achievement.description}</span>
                  </div>
                  <span className="caption faint">{has ? '✓' : '—'}</span>
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      <Card variant="quiet">
        <div className="stack-sm">
          <Eyebrow>Your data</Eyebrow>
          <p className="caption">
            Everything is stored in this browser. Audio is never saved and never uploaded.
          </p>
          {/* A static build has no server at all, so the transcript cannot go
              anywhere even in principle. Saying which build this is beats a
              conditional the reader has to evaluate for themselves. */}
          <p className="caption">
            {IS_STATIC_BUILD
              ? 'This build has no server, so nothing you say leaves this device and all coaching is done here in the browser.'
              : 'If a coaching key is configured on the server, transcripts are sent for analysis — never audio, never your history.'}
          </p>
          {confirmWipe ? (
            <div className="stack-sm">
              <p className="body">This erases every attempt, technique and level. It cannot be undone.</p>
              <div className="row">
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ color: 'var(--color-live)', borderColor: 'var(--color-live)' }}
                  onClick={() => {
                    clearStoredProgress()
                    replace(emptyProgress())
                    setConfirmWipe(false)
                  }}
                >
                  Erase everything
                </button>
                <button type="button" className="btn-quiet" onClick={() => setConfirmWipe(false)}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className="btn-quiet" onClick={() => setConfirmWipe(true)}>
              Erase everything
            </button>
          )}
        </div>
      </Card>

      <Card variant="quiet">
        <div className="stack-sm">
          <Eyebrow>What this app does not claim</Eyebrow>
          <p className="caption">
            Scores come from your transcript only. Nothing here measures tone of voice, pace,
            volume, body language, eye contact or confidence — the browser cannot observe any of
            them, and an app that scored them anyway would be guessing. Audio analysis could be
            added later; until it is, none of those words appear in your feedback.
          </p>
        </div>
      </Card>
    </main>
  )
}
