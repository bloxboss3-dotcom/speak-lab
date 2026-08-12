'use client'

import { useParams, useRouter } from 'next/navigation'
import { useCallback, useMemo, useState } from 'react'
import { principle as findPrinciple } from '@/content/motivationLab'
import { scenario as findScenario } from '@/content/scenarios'
import { evaluatePrincipleAttempt } from '@/lib/coach'
import { completePrinciple, knownTechniqueIds, recordAttempt } from '@/lib/progress'
import type { AttemptOutcome } from '@/lib/progress'
import { useStore } from '@/lib/store'
import { Coaching, Working } from '@/components/Coaching'
import { Perform, type Performance } from '@/components/Perform'
import { Card, Eyebrow } from '@/components/ui'
import type { CoachEvaluation } from '@/lib/types'

/**
 * Motivation Lab.
 *
 * Why people act, rather than how to phrase it. The teaching half states what
 * the evidence actually supports — including where it is contested — and the
 * practice half is a micro mission scored against the principle's own rubric
 * rather than against rhetoric.
 */

type Stage = 'teach' | 'perform' | 'working' | 'coaching'

export default function LabPage() {
  const params = useParams<{ principleId: string }>()
  const router = useRouter()
  const { progress, update } = useStore()

  const entry = findPrinciple(params?.principleId)
  const scenario = findScenario(entry?.scenarioId)

  const [stage, setStage] = useState<Stage>('teach')
  const [scores, setScores] = useState<number[]>([])
  const [evaluation, setEvaluation] = useState<CoachEvaluation>()
  const [outcome, setOutcome] = useState<AttemptOutcome>()

  const known = useMemo(() => knownTechniqueIds(progress), [progress])

  const run = useCallback(
    async (performance: Performance) => {
      if (!entry || !scenario) return
      setStage('working')

      const result = await evaluatePrincipleAttempt({
        principle: entry,
        transcript: performance.transcript,
        knownTechniqueIds: known,
      })

      let captured: AttemptOutcome | undefined
      update((current) => {
        const next = recordAttempt(current, {
          sourceKind: 'motivation-lab',
          sourceId: entry.id,
          scenarioId: scenario.id,
          techniqueId: null,
          attemptNumber: scores.length + 1,
          transcript: performance.transcript,
          durationSeconds: performance.durationSeconds,
          durationMeasured: performance.durationMeasured,
          evaluation: result,
          ...(scores.length > 0 ? { previousBest: Math.max(...scores) } : {}),
        })
        captured = next
        return completePrinciple(next.progress, entry.id).progress
      })

      setEvaluation(result)
      setOutcome(captured)
      setScores((current) => [...current, result.techniqueScore])
      setStage('coaching')
    },
    [entry, scenario, known, scores, update],
  )

  if (!entry || !scenario) {
    return (
      <main className="screen stack">
        <p className="body">That principle is missing its scenario.</p>
        <button type="button" className="btn" onClick={() => router.push('/')}>
          Back to Today
        </button>
      </main>
    )
  }

  if (stage === 'perform') {
    return (
      <Perform
        scenario={scenario}
        missionOverride={scenario.mission}
        autoTranscribe={progress.profile.autoTranscribe}
        {...(evaluation ? { cue: evaluation.nextRepInstruction } : {})}
        onDone={(performance) => void run(performance)}
        onCancel={() => setStage('teach')}
      />
    )
  }

  if (stage === 'working') return <Working label="Checking it against the rubric" />

  if (stage === 'coaching' && evaluation) {
    return (
      <Coaching
        evaluation={evaluation}
        {...(outcome ? { outcome } : {})}
        attemptScores={scores}
        onRetry={scores.length < 3 ? () => setStage('perform') : undefined}
        onContinue={() => router.push('/')}
        retryLabel="Run it again"
        continueLabel="Done"
      />
    )
  }

  return (
    <main className="screen stack-lg enter">
      <div className="row-between">
        <Eyebrow amber>Motivation Lab</Eyebrow>
        <button type="button" className="btn-quiet" onClick={() => router.push('/')}>
          Leave
        </button>
      </div>

      <div className="stack-sm">
        <h1 className="display">{entry.name}</h1>
        <p className="caption">{entry.tradition}</p>
        <p className="body muted">{entry.summary}</p>
      </div>

      <Card>
        <div className="stack-sm">
          <Eyebrow>What the evidence actually says</Eyebrow>
          <p className="body">{entry.detail}</p>
        </div>
      </Card>

      <Card variant="amber">
        <div className="stack-sm">
          <Eyebrow amber>In the hall</Eyebrow>
          <p className="body">{entry.inPractice}</p>
        </div>
      </Card>

      <Card variant="quiet">
        <div className="stack-sm">
          <Eyebrow>The mistake it explains</Eyebrow>
          <p className="body">{entry.failureItExplains}</p>
        </div>
      </Card>

      <div className="stack-sm">
        <Eyebrow amber>Micro mission</Eyebrow>
        <Card variant="sunken">
          <div className="stack-sm">
            <p className="body">{scenario.situation}</p>
            <p className="heading">{scenario.mission}</p>
          </div>
        </Card>
        <p className="caption faint">You will be scored on:</p>
        <ul className="bullets caption">
          {entry.rubric.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <button type="button" className="btn btn-block" onClick={() => setStage('perform')}>
        Take it
      </button>
    </main>
  )
}
