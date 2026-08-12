'use client'

import { technique as findTechnique } from '@/content/techniques'
import { MASTERY_STAGE_NAMES } from '@/lib/types'
import type { CoachEvaluation } from '@/lib/types'
import type { AttemptOutcome } from '@/lib/progress'
import { Card, Chip, Eyebrow, ScoreRing } from './ui'

/**
 * The feedback screen.
 *
 * The score is always attached to a named thing — this technique, this rubric —
 * and never to the person. Underneath it sits the basis line, which says
 * exactly what the number was computed from, because a score whose provenance
 * is hidden is a score nobody should trust.
 */

export function Coaching({
  evaluation,
  outcome,
  attemptScores,
  onRetry,
  onContinue,
  retryLabel = 'Try it again',
  continueLabel = 'Continue',
}: {
  evaluation: CoachEvaluation
  outcome?: AttemptOutcome
  /** Technique score for each attempt in this sitting, in order. */
  attemptScores: number[]
  onRetry?: () => void
  onContinue: () => void
  retryLabel?: string
  continueLabel?: string
}) {
  const target = findTechnique(evaluation.targetTechniqueId)
  const improved =
    attemptScores.length > 1 &&
    (attemptScores[attemptScores.length - 1] ?? 0) > (attemptScores[0] ?? 0)

  return (
    <div className="screen stack-lg enter">
      {evaluation.safetyFlags.length > 0 ? (
        <Card variant="sunken">
          <div className="stack-sm">
            <Eyebrow>Worth a second look</Eyebrow>
            {evaluation.safetyFlags.map((flag) => (
              <p key={flag} className="body">
                {flag}
              </p>
            ))}
          </div>
        </Card>
      ) : null}

      <div className="row" style={{ gap: 18 }}>
        <ScoreRing score={evaluation.techniqueScore} label={target ? 'technique' : 'response'} />
        <div className="stack-sm">
          <p className="title">{target?.name ?? 'Your response'}</p>
          <p className="caption">{evaluation.basis}</p>
          {evaluation.wasOffline ? <Chip>Offline coaching</Chip> : null}
        </div>
      </div>

      {evaluation.strengths.length > 0 ? (
        <div className="stack-sm">
          <Eyebrow>What worked</Eyebrow>
          {evaluation.strengths.map((item) => (
            <p key={item} className="body">
              <span style={{ color: 'var(--color-verify)' }}>✓</span> {item}
            </p>
          ))}
        </div>
      ) : null}

      {evaluation.improvements.length > 0 ? (
        <div className="stack-sm">
          <Eyebrow>What did not land</Eyebrow>
          {evaluation.improvements.map((item) => (
            <p key={item} className="body muted">
              <span style={{ color: 'var(--color-amber)' }}>△</span> {item}
            </p>
          ))}
        </div>
      ) : null}

      {evaluation.strongestLine ? (
        <Card variant="amber">
          <div className="stack-sm">
            <Eyebrow>Your strongest line</Eyebrow>
            <p className="spoken-lg">“{evaluation.strongestLine}”</p>
          </div>
        </Card>
      ) : null}

      {outcome?.coldRetrievals.length ? (
        <div className="stack-sm">
          {outcome.coldRetrievals.map((retrieval) => {
            const entry = findTechnique(retrieval.techniqueId)
            return (
              <Card key={retrieval.techniqueId} variant="amber" className="count-up">
                <div className="stack-sm">
                  <Eyebrow amber>⚡ Technique detected</Eyebrow>
                  <p className="title">{entry?.name ?? retrieval.techniqueId}</p>
                  {/* Offline detection is marker coverage, not certainty about
                      intent, so it says what it counted. A model's judgement is
                      a different claim and keeps its percentage. */}
                  <p className="caption">
                    You used it without being told to.{' '}
                    {retrieval.markersTotal
                      ? `${retrieval.markersPresent} of ${retrieval.markersTotal} markers for it are in what you said.`
                      : `The coach put its confidence at ${Math.round(retrieval.confidence * 100)}%.`}
                  </p>
                  {retrieval.evidence ? (
                    <p className="spoken muted">“{retrieval.evidence}”</p>
                  ) : null}
                  <p className="numeral" style={{ color: 'var(--color-amber)' }}>
                    +200 XP
                  </p>
                </div>
              </Card>
            )
          })}
        </div>
      ) : null}

      {attemptScores.length > 1 ? (
        <Card>
          <div className="stack-sm">
            <Eyebrow>This sitting</Eyebrow>
            {attemptScores.map((score, index) => (
              <div key={index} className="row-between">
                <span className="caption">Attempt {index + 1}</span>
                <span className="numeral">{score}</span>
              </div>
            ))}
            {improved ? (
              <p className="caption" style={{ color: 'var(--color-verify)' }}>
                +{(attemptScores[attemptScores.length - 1] ?? 0) - (attemptScores[0] ?? 0)} on the retry.
                That is the point of the exercise.
              </p>
            ) : null}
          </div>
        </Card>
      ) : null}

      <Card variant="sunken">
        <div className="stack-sm">
          <Eyebrow amber>Next rep</Eyebrow>
          <p className="heading">{evaluation.nextRepInstruction}</p>
        </div>
      </Card>

      {outcome && outcome.rewards.length > 0 ? (
        <Card>
          <div className="stack-sm">
            <div className="row-between">
              <Eyebrow>Earned</Eyebrow>
              <span className="numeral" style={{ color: 'var(--color-amber)' }}>
                +{outcome.xpAwarded} XP
              </span>
            </div>
            {outcome.rewards.map((line, index) => (
              <div key={`${line.label}-${index}`} className="row-between">
                <span className="caption">{line.label}</span>
                <span className="numeral caption">+{line.xp}</span>
              </div>
            ))}
            {outcome.stageUps.map((stage) => (
              <p key={stage.techniqueId} className="caption" style={{ color: 'var(--color-amber)' }}>
                {findTechnique(stage.techniqueId)?.name} is now{' '}
                {MASTERY_STAGE_NAMES[stage.to]}.
              </p>
            ))}
            {outcome.leveledUp ? (
              <p className="caption" style={{ color: 'var(--color-amber)' }}>
                Level {outcome.newLevel}.
              </p>
            ) : null}
            {outcome.newAchievements.map((achievement) => (
              <p key={achievement.id} className="caption" style={{ color: 'var(--color-amber)' }}>
                Achievement — {achievement.name}: {achievement.description}
              </p>
            ))}
          </div>
        </Card>
      ) : null}

      <div className="stack-sm">
        {onRetry ? (
          <button type="button" className="btn btn-block" onClick={onRetry}>
            {retryLabel}
          </button>
        ) : null}
        <button
          type="button"
          className={onRetry ? 'btn btn-ghost btn-block' : 'btn btn-block'}
          onClick={onContinue}
        >
          {continueLabel}
        </button>
      </div>
    </div>
  )
}

export function Working({ label }: { label: string }) {
  return (
    <div className="screen stack enter" style={{ paddingTop: 80 }}>
      <Eyebrow amber>{label}</Eyebrow>
      <div className="meter">
        <div className="meter-fill" style={{ width: '45%' }} />
      </div>
      <p className="caption">Reading what you actually said.</p>
    </div>
  )
}
