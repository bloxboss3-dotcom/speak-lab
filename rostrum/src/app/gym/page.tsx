'use client'

import Link from 'next/link'
import { useCallback, useMemo, useState } from 'react'
import { technique as findTechnique } from '@/content/techniques'
import { generateSpeechGymFeedback, recommendTechniques } from '@/lib/coach'
import { equippedTechniqueIds } from '@/lib/loadout'
import { knownTechniqueIds, recordAttempt } from '@/lib/progress'
import type { AttemptOutcome } from '@/lib/progress'
import { xpFor } from '@/lib/progression'
import { useStore } from '@/lib/store'
import { Coaching, Working } from '@/components/Coaching'
import { Perform, type Performance } from '@/components/Perform'
import { Card, Chip, Eyebrow } from '@/components/ui'
import type { CoachEvaluation, GymSession, Scenario } from '@/lib/types'

/**
 * Speech Gym.
 *
 * Not a lesson — preparation for something the learner genuinely has to say
 * this week. It recommends techniques from their own Arsenal and then makes
 * them rehearse. It will not write the talk: the help button gives structure
 * and prompts, never finished sentences, because a speech the app wrote is a
 * speech the learner cannot give twice.
 */

type Stage = 'need' | 'questions' | 'plan' | 'perform' | 'working' | 'coaching'

const NEEDS = [
  'Motivate my class',
  'Address the leadership team',
  'A devotional',
  'A parent conversation',
  'A presentation',
  'A difficult conversation',
  'A speech',
  'Something else',
]

export default function GymPage() {
  const { progress, update } = useStore()

  const [stage, setStage] = useState<Stage>('need')
  const [need, setNeed] = useState('')
  const [situation, setSituation] = useState('')
  const [belief, setBelief] = useState('')
  const [action, setAction] = useState('')
  const [helpOpen, setHelpOpen] = useState(false)
  const [scores, setScores] = useState<number[]>([])
  const [evaluation, setEvaluation] = useState<CoachEvaluation>()
  const [outcome, setOutcome] = useState<AttemptOutcome>()

  const known = useMemo(() => knownTechniqueIds(progress), [progress])
  const equipped = useMemo(() => equippedTechniqueIds(progress), [progress])

  /**
   * The plan. An equipped loadout leads it — that is what equipping buys — and
   * the situation-matched recommendations fill in behind, up to three in total.
   */
  const recommended = useMemo(() => {
    if (stage !== 'plan') return []
    const matched = recommendTechniques(need, situation, belief, action, known)
    const merged = [...equipped, ...matched.filter((id) => !equipped.includes(id))]
    return merged.slice(0, 3)
  }, [stage, need, situation, belief, action, known, equipped])

  /** The Gym builds its own scenario from the learner's answers. */
  const scenario: Scenario = useMemo(
    () => ({
      id: 'gym-session',
      title: need || 'Your talk',
      category: 'public-speaking',
      audience: 'adults',
      situation: situation || 'Your own situation.',
      mission: `They should believe: ${belief || '—'}. They should then: ${action || '—'}.`,
      prepSeconds: 30,
      speakSeconds: 120,
      intensity: 2,
    }),
    [need, situation, belief, action],
  )

  const run = useCallback(
    async (performance: Performance) => {
      setStage('working')
      const result = await generateSpeechGymFeedback({
        need,
        situation,
        belief,
        action,
        techniqueIds: recommended,
        transcript: performance.transcript,
        knownTechniqueIds: known,
      })

      let captured: AttemptOutcome | undefined
      update((current) => {
        const next = recordAttempt(current, {
          sourceKind: 'gym',
          sourceId: 'gym-session',
          scenarioId: 'gym-session',
          techniqueId: result.targetTechniqueId,
          attemptNumber: scores.length + 1,
          transcript: performance.transcript,
          durationSeconds: performance.durationSeconds,
          durationMeasured: performance.durationMeasured,
          evaluation: result,
          ...(scores.length > 0 ? { previousBest: Math.max(...scores) } : {}),
        })
        captured = next

        const session: GymSession = {
          id: `gym-${Date.now()}`,
          need,
          situation,
          belief,
          action,
          recommendedTechniqueIds: recommended,
          attempts: scores.length + 1,
          bestScore: Math.max(result.techniqueScore, ...scores, 0),
          createdAt: new Date().toISOString(),
          helpUsed: helpOpen,
        }
        return {
          ...next.progress,
          gymSessions: [session, ...next.progress.gymSessions].slice(0, 50),
          xp: next.progress.xp + (scores.length === 0 ? xpFor({ kind: 'gym-session' }) : 0),
        }
      })

      setEvaluation(result)
      setOutcome(captured)
      setScores((current) => [...current, result.techniqueScore])
      setStage('coaching')
    },
    [need, situation, belief, action, recommended, known, scores, helpOpen, update],
  )

  if (stage === 'perform') {
    return (
      <Perform
        scenario={scenario}
        autoTranscribe={progress.profile.autoTranscribe}
        {...(evaluation ? { cue: evaluation.nextRepInstruction } : {})}
        onDone={(performance) => void run(performance)}
        onCancel={() => setStage('plan')}
      />
    )
  }

  if (stage === 'working') return <Working label="Reading your draft" />

  if (stage === 'coaching' && evaluation) {
    return (
      <Coaching
        evaluation={evaluation}
        {...(outcome ? { outcome } : {})}
        attemptScores={scores}
        onRetry={() => setStage('perform')}
        onContinue={() => {
          setStage('need')
          setScores([])
          setEvaluation(undefined)
          setNeed('')
          setSituation('')
          setBelief('')
          setAction('')
          setHelpOpen(false)
        }}
        retryLabel="Run it again"
        continueLabel="Done for now"
      />
    )
  }

  return (
    <main className="screen stack-lg">
      <header className="stack-sm">
        <Eyebrow amber>Speech Gym</Eyebrow>
        <h1 className="display">What do you need to say?</h1>
        <p className="caption">
          Not an exercise — something you actually have to deliver. Answer three questions, get two
          or three techniques to aim with, then rehearse it here first.
        </p>
      </header>

      {stage === 'need' ? (
        <div className="stack-sm enter">
          {NEEDS.map((option) => (
            <button
              key={option}
              type="button"
              className="card-quiet"
              style={{ textAlign: 'left', cursor: 'pointer' }}
              onClick={() => {
                setNeed(option)
                setStage('questions')
              }}
            >
              <span className="body">{option}</span>
            </button>
          ))}
        </div>
      ) : null}

      {stage === 'questions' ? (
        <div className="stack-lg enter">
          <Chip tone="amber">{need}</Chip>

          <div className="stack-sm">
            <p className="heading">What is the situation?</p>
            <textarea
              className="field"
              value={situation}
              onChange={(event) => setSituation(event.target.value)}
              placeholder="What has happened, and who is in the room."
              aria-label="The situation"
            />
          </div>

          <div className="stack-sm">
            <p className="heading">What should they believe afterwards?</p>
            <textarea
              className="field"
              value={belief}
              onChange={(event) => setBelief(event.target.value)}
              placeholder="One sentence. If you cannot write it, the talk is not ready."
              aria-label="What they should believe"
              style={{ minHeight: 88 }}
            />
          </div>

          <div className="stack-sm">
            <p className="heading">What should they do?</p>
            <textarea
              className="field"
              value={action}
              onChange={(event) => setAction(event.target.value)}
              placeholder="One action, with a time attached."
              aria-label="What they should do"
              style={{ minHeight: 88 }}
            />
          </div>

          <button
            type="button"
            className="btn btn-block"
            disabled={!situation.trim() || !belief.trim() || !action.trim()}
            onClick={() => setStage('plan')}
          >
            Get my techniques
          </button>
        </div>
      ) : null}

      {stage === 'plan' ? (
        <div className="stack-lg enter">
          {known.length === 0 ? (
            <Card variant="quiet">
              <p className="caption">
                You have not learned any techniques yet, so there is nothing to recommend from your
                Arsenal. You can still rehearse and be coached on the draft.
              </p>
            </Card>
          ) : (
            <div className="stack-sm">
              <Eyebrow amber>Aim with these</Eyebrow>
              {recommended.map((id) => {
                const technique = findTechnique(id)
                if (!technique) return null
                return (
                  <Card key={id}>
                    <div className="stack-sm" style={{ gap: 5 }}>
                      <div className="row-between">
                        <p className="heading">{technique.name}</p>
                        {equipped.includes(id) ? <Chip tone="amber">Equipped</Chip> : null}
                      </div>
                      <p className="caption">{technique.summary}</p>
                      <p className="caption faint">{technique.structure.join(' → ')}</p>
                    </div>
                  </Card>
                )
              })}
              <Link href="/loadout" className="link caption">
                {equipped.length > 0 ? 'Change your loadout ›' : 'Set a loadout ›'}
              </Link>
            </div>
          )}

          <Card variant="sunken">
            <div className="stack-sm">
              <Eyebrow>Your brief</Eyebrow>
              <p className="caption">
                <strong>Situation:</strong> {situation}
              </p>
              <p className="caption">
                <strong>Believe:</strong> {belief}
              </p>
              <p className="caption">
                <strong>Do:</strong> {action}
              </p>
            </div>
          </Card>

          <button type="button" className="btn btn-block" onClick={() => setStage('perform')}>
            Start practice
          </button>

          {helpOpen ? (
            <Card variant="quiet">
              <div className="stack-sm">
                <Eyebrow>Structure, not sentences</Eyebrow>
                <ol className="bullets caption">
                  <li>Open inside a moment, not with an announcement of your topic.</li>
                  <li>Say the difficulty before you ask for anything.</li>
                  <li>Make your case once. Do not justify it twice.</li>
                  <li>Turn to what it means for the people in front of you.</li>
                  <li>Finish on the action, with a time attached: {action || '—'}</li>
                </ol>
                <p className="caption faint">
                  Deliberately no drafted lines. A talk written for you is one you cannot give
                  again next month.
                </p>
              </div>
            </Card>
          ) : (
            <button type="button" className="btn-quiet" onClick={() => setHelpOpen(true)}>
              Help me build it
            </button>
          )}
        </div>
      ) : null}

      {progress.gymSessions.length > 0 && stage === 'need' ? (
        <div className="stack-sm">
          <Eyebrow>Previously prepared</Eyebrow>
          {progress.gymSessions.slice(0, 4).map((session) => (
            <Card key={session.id} variant="quiet">
              <div className="row-between">
                <div className="stack-sm" style={{ gap: 2, minWidth: 0 }}>
                  <span className="body">{session.need}</span>
                  <span className="caption faint">{session.belief}</span>
                </div>
                <span className="numeral caption">{session.bestScore}</span>
              </div>
            </Card>
          ))}
        </div>
      ) : null}
    </main>
  )
}
