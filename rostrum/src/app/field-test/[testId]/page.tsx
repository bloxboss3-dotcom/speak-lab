'use client'

import { useParams, useRouter } from 'next/navigation'
import { useCallback, useMemo, useState } from 'react'
import { FIELD_TEST_BY_ID } from '@/content/fieldTests'
import { scenario as findScenario } from '@/content/scenarios'
import { evaluateOpenChallenge } from '@/lib/coach'
import { completeFieldTest, knownTechniqueIds, recordAttempt } from '@/lib/progress'
import type { AttemptOutcome } from '@/lib/progress'
import { useStore } from '@/lib/store'
import { Coaching, Working } from '@/components/Coaching'
import { Perform, type Performance } from '@/components/Perform'
import { Card, Eyebrow } from '@/components/ui'
import type { CoachEvaluation } from '@/lib/types'

/**
 * A Field Test.
 *
 * Nothing is named. No technique appears on this screen before the learner
 * speaks, and the brief is deliberately just the situation — the entire value
 * of the exercise is finding out what they reach for on their own.
 */

type Stage = 'brief' | 'perform' | 'working' | 'coaching'

export default function FieldTestPage() {
  const params = useParams<{ testId: string }>()
  const router = useRouter()
  const { progress, update } = useStore()

  const test = params?.testId ? FIELD_TEST_BY_ID.get(params.testId) : undefined
  const scenario = findScenario(test?.scenarioId)

  const [stage, setStage] = useState<Stage>('brief')
  const [evaluation, setEvaluation] = useState<CoachEvaluation>()
  const [outcome, setOutcome] = useState<AttemptOutcome>()
  const [scores, setScores] = useState<number[]>([])

  const known = useMemo(() => knownTechniqueIds(progress), [progress])

  const run = useCallback(
    async (performance: Performance) => {
      if (!test || !scenario) return
      setStage('working')

      const result = await evaluateOpenChallenge({
        scenarioId: scenario.id,
        transcript: performance.transcript,
        knownTechniqueIds: known,
      })

      let captured: AttemptOutcome | undefined
      update((current) => {
        const next = recordAttempt(current, {
          sourceKind: 'field-test',
          sourceId: test.id,
          scenarioId: scenario.id,
          techniqueId: null,
          attemptNumber: scores.length + 1,
          transcript: performance.transcript,
          durationSeconds: performance.durationSeconds,
          durationMeasured: performance.durationMeasured,
          evaluation: result,
        })
        captured = next
        return completeFieldTest(next.progress, test.id).progress
      })

      setEvaluation(result)
      setOutcome(captured)
      setScores((current) => [...current, result.techniqueScore])
      setStage('coaching')
    },
    [test, scenario, known, scores.length, update],
  )

  if (!test || !scenario) {
    return (
      <main className="screen stack">
        <p className="body">That field test is missing its scenario.</p>
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
        autoTranscribe={progress.profile.autoTranscribe}
        onDone={(performance) => void run(performance)}
        onCancel={() => setStage('brief')}
      />
    )
  }

  if (stage === 'working') return <Working label="Looking at what you reached for" />

  if (stage === 'coaching' && evaluation) {
    return (
      <Coaching
        evaluation={evaluation}
        {...(outcome ? { outcome } : {})}
        attemptScores={scores}
        onContinue={() => router.push('/')}
        continueLabel="Done"
      />
    )
  }

  return (
    <main className="screen stack-lg enter">
      <div className="row-between">
        <Eyebrow amber>Field test</Eyebrow>
        <button type="button" className="btn-quiet" onClick={() => router.push('/')}>
          Leave
        </button>
      </div>

      <div className="stack-sm">
        <h1 className="display">{test.title}</h1>
        <p className="body muted">{scenario.situation}</p>
      </div>

      <Card variant="amber">
        <div className="stack-sm">
          <Eyebrow amber>Mission</Eyebrow>
          <p className="heading">{scenario.mission}</p>
          <p className="caption">
            {scenario.prepSeconds} seconds to think, {scenario.speakSeconds} seconds to speak.
          </p>
        </div>
      </Card>

      <Card variant="quiet">
        <div className="stack-sm">
          <Eyebrow>No technique named</Eyebrow>
          <p className="caption">
            You will not be told what to use. Afterwards the app checks what you actually reached
            for against everything you have learned — and if you retrieved something unprompted and
            used it properly, that is worth more than any lesson.
          </p>
        </div>
      </Card>

      <button type="button" className="btn btn-block" onClick={() => setStage('perform')}>
        Take it
      </button>
    </main>
  )
}
