'use client'

import { useParams, useRouter } from 'next/navigation'
import { master } from '@/content/masters'
import { scenario as findScenario } from '@/content/scenarios'
import { technique as findTechnique } from '@/content/techniques'
import { masteryFor } from '@/lib/progress'
import { nextMasteryRequirement } from '@/lib/progression'
import { useStore } from '@/lib/store'
import { HearIt } from '@/components/HearIt'
import { Card, Eyebrow, NotYet, Ring, StageBadge, relativeDay, stageColour } from '@/components/ui'
import { SKILL_CATEGORY_NAMES } from '@/lib/types'

/** One technique: what it is, and everything this learner has done with it. */
export default function TechniqueScreen() {
  const params = useParams<{ techniqueId: string }>()
  const router = useRouter()
  const { progress } = useStore()

  const technique = findTechnique(params?.techniqueId)
  if (!technique) {
    return (
      <main className="screen stack">
        <p className="body">No such technique.</p>
        <button type="button" className="btn" onClick={() => router.push('/arsenal')}>
          Back to the Arsenal
        </button>
      </main>
    )
  }

  const mastery = masteryFor(progress, technique.id)
  const owner = master(technique.masterId)
  const history = progress.attempts.filter((attempt) => attempt.techniqueId === technique.id)

  return (
    <main className="screen stack-lg">
      <button type="button" className="btn-quiet" onClick={() => router.back()}>
        ‹ Back
      </button>

      <div className="row" style={{ alignItems: 'flex-start', gap: 16 }}>
        {mastery ? (
          <Ring value={mastery.score} size={72} stroke={6} colour={stageColour(mastery.stage)}>
            <span className="numeral" style={{ fontSize: 18 }}>
              {mastery.score}
            </span>
          </Ring>
        ) : null}
        <div className="stack-sm">
          <h1 className="title">{technique.name}</h1>
          <p className="caption">
            {owner ? `${owner.name} · ` : ''}
            {SKILL_CATEGORY_NAMES[technique.category]}
          </p>
          {mastery ? <StageBadge stage={mastery.stage} /> : <span className="caption faint">Not met yet</span>}
        </div>
      </div>

      {mastery ? (
        <Card variant="amber">
          <div className="stack-sm">
            <Eyebrow amber>To reach the next stage</Eyebrow>
            <p className="body">{nextMasteryRequirement(mastery, mastery.stage)}</p>
          </div>
        </Card>
      ) : null}

      <div className="stack-sm">
        <Eyebrow>What it is</Eyebrow>
        <p className="body">{technique.summary}</p>
        <Eyebrow>Why it works</Eyebrow>
        <p className="body muted">{technique.why}</p>
      </div>

      <div className="stack-sm">
        <Eyebrow amber>The shape</Eyebrow>
        <Card variant="sunken">
          <ol className="list-reset stack-sm">
            {technique.structure.map((step, index) => (
              <li key={step} className="row" style={{ alignItems: 'flex-start', gap: 12 }}>
                <span className="numeral faint" style={{ fontSize: 12, width: 16, paddingTop: 3 }}>
                  {index + 1}
                </span>
                <span className="body">{step}</span>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      {technique.clips?.length ? <HearIt clips={technique.clips} /> : null}

      <Card variant="quiet">
        <div className="stack-sm">
          <Eyebrow>Use it when</Eyebrow>
          <p className="caption">{technique.whenToUse}</p>
          <Eyebrow>Do not use it when</Eyebrow>
          <p className="caption">{technique.whenNotToUse}</p>
        </div>
      </Card>

      {mastery?.bestLine ? (
        <Card variant="amber">
          <div className="stack-sm">
            <Eyebrow amber>Your best line with it</Eyebrow>
            <p className="spoken-lg">“{mastery.bestLine}”</p>
            <p className="caption">Scored {mastery.bestScore}.</p>
          </div>
        </Card>
      ) : null}

      {mastery ? (
        <Card>
          <div className="stack-sm">
            <Eyebrow>Record</Eyebrow>
            <div className="row-between">
              <span className="caption">Attempts</span>
              <span className="numeral">{mastery.totalAttempts}</span>
            </div>
            <div className="row-between">
              <span className="caption">Cleared the bar</span>
              <span className="numeral">{mastery.successfulUses}</span>
            </div>
            <div className="row-between">
              <span className="caption">Unprompted retrievals</span>
              <span className="numeral" style={{ color: 'var(--color-amber)' }}>
                {mastery.coldRetrievals}
              </span>
            </div>
            <div className="row-between">
              <span className="caption">Different situations</span>
              <span className="numeral">{mastery.contextsUsed.length}</span>
            </div>
            <div className="row-between">
              <span className="caption">Met</span>
              <span className="caption">{relativeDay(mastery.introducedAt)}</span>
            </div>
            {mastery.nextReviewAt ? (
              <div className="row-between">
                <span className="caption">Next review</span>
                <span className="caption">{mastery.nextReviewAt}</span>
              </div>
            ) : null}
          </div>
        </Card>
      ) : (
        <NotYet>You have not met this one yet. It arrives in the curriculum.</NotYet>
      )}

      {history.length > 0 ? (
        <div className="stack-sm">
          <Eyebrow>Your attempts</Eyebrow>
          {history.slice(0, 6).map((attempt) => (
            <Card key={attempt.id} variant="quiet">
              <div className="stack-sm" style={{ gap: 5 }}>
                <div className="row-between">
                  <span className="caption">
                    {findScenario(attempt.scenarioId)?.title ?? attempt.scenarioId}
                  </span>
                  <span className="numeral">{attempt.techniqueScore}</span>
                </div>
                {attempt.strongestLine ? (
                  <p className="spoken muted" style={{ fontSize: 15 }}>
                    “{attempt.strongestLine}”
                  </p>
                ) : null}
                <p className="caption faint">{relativeDay(attempt.createdAt)}</p>
              </div>
            </Card>
          ))}
        </div>
      ) : null}
    </main>
  )
}
