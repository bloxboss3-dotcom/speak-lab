'use client'

import { useRouter, useParams } from 'next/navigation'
import { useCallback, useMemo, useState } from 'react'
import { lesson as findLesson } from '@/content/lessons'
import { master } from '@/content/masters'
import { scenario as findScenario } from '@/content/scenarios'
import { technique as findTechnique } from '@/content/techniques'
import { evaluateTechniqueAttempt } from '@/lib/coach'
import { completeLesson, introduceTechnique, knownTechniqueIds, recordAttempt } from '@/lib/progress'
import type { AttemptOutcome } from '@/lib/progress'
import { useStore } from '@/lib/store'
import { Coaching, Working } from '@/components/Coaching'
import { Perform, type Performance } from '@/components/Perform'
import { Blueprint } from '@/components/Blueprint'
import { TakenApart } from '@/components/TakenApart'
import { Examples } from '@/components/Examples'
import { Card, Chip, Eyebrow, Portrait } from '@/components/ui'
import type { CoachEvaluation } from '@/lib/types'

/**
 * The daily lesson.
 *
 * Five screens, in this order and no other: meet the technique, understand why
 * it works, take an example apart, assemble one with scaffolding, then use it
 * on a real situation with no scaffolding at all. Each step removes support,
 * which is the whole reason the sequence exists — dropping someone straight
 * into performance produces a bad attempt and teaches nothing.
 */

type Stage = 'hook' | 'lesson' | 'decode' | 'build' | 'perform' | 'working' | 'coaching'

export default function TrainScreen() {
  const params = useParams<{ lessonId: string }>()
  const router = useRouter()
  const { progress, update } = useStore()

  const lesson = findLesson(params?.lessonId)
  const technique = findTechnique(lesson?.techniqueId)
  const scenario = findScenario(lesson?.scenarioId)
  const owner = master(technique?.masterId)

  const [stage, setStage] = useState<Stage>('hook')
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [built, setBuilt] = useState('')
  const [attempt, setAttempt] = useState(1)
  const [scores, setScores] = useState<number[]>([])
  const [evaluation, setEvaluation] = useState<CoachEvaluation>()
  const [outcome, setOutcome] = useState<AttemptOutcome>()

  const known = useMemo(() => knownTechniqueIds(progress), [progress])

  const runCoaching = useCallback(
    async (performance: Performance) => {
      if (!lesson || !technique || !scenario) return
      setStage('working')

      const result = await evaluateTechniqueAttempt({
        techniqueId: technique.id,
        scenarioId: scenario.id,
        transcript: performance.transcript,
        attemptNumber: attempt,
        ...(evaluation?.nextRepInstruction ? { previousInstruction: evaluation.nextRepInstruction } : {}),
        knownTechniqueIds: known.includes(technique.id) ? known : [...known, technique.id],
      })

      const previousBest = scores.length > 0 ? Math.max(...scores) : undefined
      let captured: AttemptOutcome | undefined

      update((current) => {
        const seeded = introduceTechnique(current, technique.id, new Date())
        const next = recordAttempt(seeded, {
          sourceKind: 'lesson',
          sourceId: lesson.id,
          scenarioId: scenario.id,
          techniqueId: technique.id,
          attemptNumber: attempt,
          transcript: performance.transcript,
          durationSeconds: performance.durationSeconds,
          durationMeasured: performance.durationMeasured,
          evaluation: result,
          ...(previousBest === undefined ? {} : { previousBest }),
        })
        captured = next
        return next.progress
      })

      setEvaluation(result)
      setOutcome(captured)
      setScores((current) => [...current, result.techniqueScore])
      setStage('coaching')
    },
    [lesson, technique, scenario, attempt, evaluation, known, scores, update],
  )

  const finish = useCallback(() => {
    if (lesson) update((current) => completeLesson(current, lesson.id).progress)
    router.push('/')
  }, [lesson, router, update])

  if (!lesson || !technique || !scenario) {
    return (
      <main className="screen stack">
        <p className="body">That lesson is missing its content.</p>
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
        {...(attempt > 1 && evaluation ? { cue: evaluation.nextRepInstruction } : {})}
        onDone={(performance) => void runCoaching(performance)}
        onCancel={() => setStage('build')}
      />
    )
  }

  if (stage === 'working') return <Working label="Coaching your attempt" />

  if (stage === 'coaching' && evaluation) {
    return (
      <Coaching
        evaluation={evaluation}
        {...(outcome ? { outcome } : {})}
        attemptScores={scores}
        onRetry={
          attempt < 3
            ? () => {
                setAttempt((value) => value + 1)
                setStage('perform')
              }
            : undefined
        }
        onContinue={finish}
        retryLabel="Run it again with that change"
        continueLabel={scores.length > 1 ? 'Finish the lesson' : 'Finish without a retry'}
      />
    )
  }

  return (
    <main className="screen stack-lg">
      <div className="row-between">
        <Eyebrow>{stageLabel(stage)}</Eyebrow>
        <button type="button" className="btn-quiet" onClick={() => router.push('/')}>
          Leave
        </button>
      </div>

      {stage === 'hook' ? (
        <div className="stack-lg enter">
          <div className="stack">
            <div className="row" style={{ alignItems: 'flex-start', gap: 14 }}>
              {owner ? <Portrait initials={owner.initials} accent={owner.accent} size={64} /> : null}
              <div className="stack-sm">
                <Eyebrow amber>{owner ? 'Master study' : 'Technique'}</Eyebrow>
                <p className="heading">{owner?.name ?? 'Craft tradition'}</p>
                {owner ? <p className="caption">{owner.role}</p> : null}
              </div>
            </div>

            <h1 className="display">{technique.name}</h1>
            <p className="body muted">{lesson.promise}</p>
          </div>

          {owner ? (
            <Card variant="quiet">
              <div className="stack-sm">
                <Eyebrow>What they did to language</Eyebrow>
                <p className="body">{owner.study}</p>
                <hr className="rule" style={{ margin: '4px 0' }} />
                <p className="caption">
                  <strong style={{ color: 'var(--color-amber)' }}>Take the principle, not the
                  personality.</strong>{' '}
                  {owner.caution}
                </p>
              </div>
            </Card>
          ) : null}

          <button type="button" className="btn btn-block" onClick={() => setStage('lesson')}>
            Begin
          </button>
        </div>
      ) : null}

      {stage === 'lesson' ? (
        <div className="stack-lg enter">
          <div className="stack-sm">
            <h1 className="title">{technique.name}</h1>
            <p className="body">{technique.summary}</p>
          </div>

          {/* The teaching happens here: a line that works, then what every part
              of it is doing. The abstract description of the shape used to live
              on this screen and taught nobody how to make one. */}
          {technique.breakdown ? (
            <TakenApart breakdown={technique.breakdown} />
          ) : (
            <Examples technique={technique} />
          )}

          <Blueprint lines={technique.blueprint} />

          <details className="disclosure">
            <summary className="caption">Why this works, and when not to use it</summary>
            <div className="stack-sm" style={{ marginTop: 12 }}>
              <p className="caption">{technique.why}</p>
              <p className="caption">
                <strong>Use it when:</strong> {technique.whenToUse}
              </p>
              <p className="caption">
                <strong>Not when:</strong> {technique.whenNotToUse}
              </p>
            </div>
          </details>

          <button type="button" className="btn btn-block" onClick={() => setStage('decode')}>
            Spot it in another one
          </button>
        </div>
      ) : null}

      {stage === 'decode' ? (
        <div className="stack-lg enter">
          <div className="stack-sm">
            <h1 className="title">Decode it</h1>
            <p className="caption">{lesson.decodeExample.setting}</p>
          </div>

          <Card variant="sunken">
            <div className="stack-sm">
              {lesson.decodeExample.lines.map((line, index) => (
                <p key={line} className="spoken">
                  <span className="numeral faint" style={{ fontSize: 11, marginRight: 10 }}>
                    {index + 1}
                  </span>
                  {line}
                </p>
              ))}
            </div>
          </Card>

          {lesson.decodeQuestions.map((question) => {
            const chosen = answers[question.id]
            return (
              <div key={question.id} className="stack-sm">
                <p className="heading">{question.prompt}</p>
                {question.options.map((option, index) => {
                  const picked = chosen === index
                  const correct = index === question.answer
                  const answered = chosen !== undefined
                  return (
                    <button
                      key={option}
                      type="button"
                      className="card-quiet"
                      onClick={() =>
                        setAnswers((current) => ({ ...current, [question.id]: index }))
                      }
                      style={{
                        textAlign: 'left',
                        cursor: 'pointer',
                        borderColor: answered && correct
                          ? 'var(--color-verify)'
                          : picked
                            ? 'var(--color-live)'
                            : 'var(--color-hairline)',
                        opacity: answered && !correct && !picked ? 0.5 : 1,
                      }}
                    >
                      <span className="body">{option}</span>
                    </button>
                  )
                })}
                {chosen !== undefined ? (
                  <Card variant="sunken">
                    <p className="caption enter">{question.because}</p>
                  </Card>
                ) : null}
              </div>
            )
          })}

          <button
            type="button"
            className="btn btn-block"
            disabled={Object.keys(answers).length < lesson.decodeQuestions.length}
            onClick={() => setStage('build')}
          >
            Build one
          </button>
        </div>
      ) : null}

      {stage === 'build' ? (
        <div className="stack-lg enter">
          <div className="stack-sm">
            <h1 className="title">Build it</h1>
            <p className="body muted">{lesson.build.instruction}</p>
          </div>

          <Card variant="sunken">
            <div className="stack-sm">
              {lesson.build.frame.map((line) => (
                <p key={line} className="spoken muted">
                  {line}
                </p>
              ))}
            </div>
          </Card>

          <textarea
            className="field"
            value={built}
            onChange={(event) => setBuilt(event.target.value)}
            placeholder="Fill in the frame…"
            aria-label="Your version"
          />

          <p className="caption faint">{lesson.build.hint}</p>

          <Card variant="quiet">
            <div className="stack-sm">
              <Eyebrow amber>Then, out loud</Eyebrow>
              <p className="body">{scenario.situation}</p>
              <p className="heading">{scenario.mission}</p>
              <div className="row" style={{ gap: 8 }}>
                <Chip>{scenario.prepSeconds}s to prepare</Chip>
                <Chip>{scenario.speakSeconds}s to speak</Chip>
              </div>
            </div>
          </Card>

          <button
            type="button"
            className="btn btn-block"
            disabled={built.trim().length < 10}
            onClick={() => setStage('perform')}
          >
            Perform it
          </button>
          <p className="caption faint" style={{ textAlign: 'center' }}>
            Written work stays here. Only what you say out loud gets coached.
          </p>
        </div>
      ) : null}
    </main>
  )
}

function stageLabel(stage: Stage): string {
  switch (stage) {
    case 'hook':
      return 'Master study'
    case 'lesson':
      return 'The technique'
    case 'decode':
      return 'Decode'
    case 'build':
      return 'Build'
    default:
      return 'Training'
  }
}
