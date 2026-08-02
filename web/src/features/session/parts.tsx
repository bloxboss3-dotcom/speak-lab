import { useState } from 'react'
import type { ReactNode } from 'react'
import {
  Button,
  Card,
  ChoiceRow,
  HighlightedTranscript,
  Meter,
  Pill,
  SectionLabel,
  Stat,
  TierPill,
  formatDuration,
} from '../../design/components'
import { verifyQuote } from '../../core/grounding'
import { NUGGET_CATEGORY_NAMES, RUBRIC_DIMENSION_NAMES, RUBRIC_RATING_NAMES } from '../../core/types'
import type {
  AttemptComparison,
  CoachFeedback,
  ConversationMetrics,
  MicroSkill,
  Scenario,
  SpeakingMetrics,
} from '../../core/types'
import { MASTERY_BAND_NAMES } from '../../core/progression'
import type { SessionRewards } from '../../core/state'

/** Screen furniture shared by the speaking and conversation session flows. */

/**
 * Wraps text in curly quotes, unless it already carries its own — several
 * curriculum examples are written as dialogue and quote themselves.
 */
export function quoted(text: string): string {
  const trimmed = text.trim()
  const alreadyQuoted =
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith('“') && trimmed.endsWith('”'))
  if (alreadyQuoted) return `“${trimmed.slice(1, -1)}”`
  return `“${trimmed}”`
}

export function SessionHeader({
  scenario,
  onQuit,
  stageLabel,
}: {
  scenario: Scenario
  onQuit: () => void
  stageLabel: string
}) {
  return (
    <div className="row row--between" style={{ marginBottom: 'var(--space-m)' }}>
      <div className="stack" style={{ gap: 2 }}>
        <SectionLabel>{stageLabel}</SectionLabel>
        <p className="caption">{scenario.title}</p>
      </div>
      <Button variant="quiet" onClick={onQuit}>
        Leave
      </Button>
    </div>
  )
}

export function ScenarioBrief({ scenario, skill }: { scenario: Scenario; skill: MicroSkill }) {
  return (
    <div className="stack">
      <div className="stack stack--tight">
        <div className="row row--wrap">
          <TierPill tier={scenario.tier} />
          <Pill>{scenario.mode === 'speaking' ? 'Speaking' : 'Conversation'}</Pill>
          {scenario.timeLimitSeconds ? (
            <Pill>{formatDuration(scenario.timeLimitSeconds)}</Pill>
          ) : (
            <Pill>Untimed</Pill>
          )}
        </div>
        <h1 className="display">{scenario.title}</h1>
        <p className="body body--muted">{scenario.briefing}</p>
      </div>

      <Card>
        <div className="stack stack--tight">
          <SectionLabel>What you are trying to do</SectionLabel>
          <ul className="bullets body">
            {scenario.objectives
              .filter((objective) => !objective.isBonus)
              .map((objective) => (
                <li key={objective.id}>{objective.text}</li>
              ))}
          </ul>
          {scenario.objectives.some((objective) => objective.isBonus) ? (
            <>
              <SectionLabel>Bonus</SectionLabel>
              <ul className="bullets caption">
                {scenario.objectives
                  .filter((objective) => objective.isBonus)
                  .map((objective) => (
                    <li key={objective.id}>{objective.text}</li>
                  ))}
              </ul>
            </>
          ) : null}
        </div>
      </Card>

      <SkillCard skill={skill} />
    </div>
  )
}

export function SkillCard({ skill }: { skill: MicroSkill }) {
  return (
    <Card variant="accent">
      <div className="stack stack--tight">
        <SectionLabel>Today's one skill</SectionLabel>
        <p className="title">{skill.name}</p>
        <p className="body">{skill.summary}</p>
        <p className="caption">{skill.whyItMatters}</p>
        <hr className="divider" style={{ margin: '6px 0' }} />
        <div className="stack stack--tight">
          <div>
            <SectionLabel>Strong</SectionLabel>
            <p className="quote">{quoted(skill.strongExample)}</p>
          </div>
          {skill.weakExample ? (
            <div>
              <SectionLabel>Weak</SectionLabel>
              <p className="quote" style={{ color: 'var(--ink-muted)' }}>
                {quoted(skill.weakExample)}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  )
}

export function AnxietyRating({
  title,
  value,
  onChange,
}: {
  title: string
  value?: number
  onChange: (value: number) => void
}) {
  return (
    <Card variant="sunken">
      <div className="stack stack--tight">
        <SectionLabel>{title}</SectionLabel>
        <ChoiceRow
          ariaLabel={title}
          value={value}
          onChange={onChange}
          options={[1, 2, 3, 4, 5].map((n) => ({ value: n, label: String(n) }))}
        />
        <p className="caption">
          1 = completely calm, 5 = very nervous. This is your own note to yourself — SpeakLab does
          not diagnose anything and is not treatment.
        </p>
      </div>
    </Card>
  )
}

export function ProvenanceNote({ children }: { children: ReactNode }) {
  return (
    <p className="caption" style={{ color: 'var(--ink-faint)' }}>
      {children}
    </p>
  )
}

/**
 * The feedback screen, in the order the brief specifies: what worked, the one
 * priority, the evidence, why it matters, and the instruction for the retry.
 * Everything else is collapsed behind a disclosure.
 */
export function FeedbackCard({
  feedback,
  transcript,
  evidenceVerified,
  note,
  wasLocal,
  metricsPanel,
}: {
  feedback: CoachFeedback
  transcript: string
  evidenceVerified: boolean
  note?: string
  wasLocal: boolean
  metricsPanel?: ReactNode
}) {
  const [showMore, setShowMore] = useState(false)
  const grounding = verifyQuote(feedback.evidenceQuote, transcript)

  return (
    <div className="stack">
      {feedback.safetyFlags.length > 0 ? (
        <Card variant="warning">
          <div className="stack stack--tight">
            <SectionLabel>Worth pausing on</SectionLabel>
            {feedback.safetyFlags.map((flag) => (
              <p key={flag} className="body">
                {flag}
              </p>
            ))}
            <p className="caption">
              SpeakLab is communication training, not mental-health support. If something here is
              heavier than a practice session, talk to someone you trust.
            </p>
          </div>
        </Card>
      ) : null}

      <div className="stack stack--tight">
        <SectionLabel>What happened</SectionLabel>
        <p className="body">{feedback.scenarioOutcome}</p>
      </div>

      <Card>
        <div className="stack stack--tight">
          <SectionLabel>What worked</SectionLabel>
          <ul className="bullets body">
            {feedback.strengths.map((strength) => (
              <li key={strength}>{strength}</li>
            ))}
          </ul>
        </div>
      </Card>

      <Card variant="accent">
        <div className="stack stack--tight">
          <SectionLabel>Your one priority</SectionLabel>
          <p className="title">{feedback.primaryTarget}</p>
        </div>
      </Card>

      <div className="stack stack--tight">
        <div className="row row--between">
          <SectionLabel>From your attempt</SectionLabel>
          {evidenceVerified && grounding.verified ? null : <Pill tone="warning">Paraphrase</Pill>}
        </div>
        <Card variant="sunken">
          <p className="quote">{quoted(feedback.evidenceQuote)}</p>
        </Card>
        {grounding.verified ? null : (
          <ProvenanceNote>
            These aren't your exact words, so SpeakLab won't point at a moment in the transcript.
          </ProvenanceNote>
        )}
        <p className="body body--muted">{feedback.explanation}</p>
      </div>

      {transcript ? (
        <details>
          <summary className="caption" style={{ cursor: 'pointer' }}>
            Full transcript
          </summary>
          <Card variant="sunken">
            <HighlightedTranscript
              text={transcript}
              {...(grounding.matchedRange ? { range: grounding.matchedRange } : {})}
            />
          </Card>
        </details>
      ) : null}

      <Card>
        <div className="stack stack--tight">
          <SectionLabel>Do this on the retry</SectionLabel>
          <p className="heading">{feedback.retryInstruction}</p>
        </div>
      </Card>

      {feedback.optionalGoldenNugget ? (
        <Card variant="sunken">
          <div className="stack stack--tight">
            <div className="row row--between">
              <SectionLabel>Golden nugget</SectionLabel>
              <Pill>{NUGGET_CATEGORY_NAMES[feedback.optionalGoldenNugget.category]}</Pill>
            </div>
            <p className="heading">{feedback.optionalGoldenNugget.title}</p>
            <p className="body body--muted">{feedback.optionalGoldenNugget.insight}</p>
          </div>
        </Card>
      ) : null}

      <button type="button" className="link-button" onClick={() => setShowMore((value) => !value)}>
        {showMore ? 'Hide other observations' : 'Other observations'}
      </button>

      {showMore ? (
        <div className="stack enter">
          {feedback.rubricObservations.length > 0 ? (
            <Card variant="plain">
              <div className="stack stack--tight">
                <SectionLabel>Rubric</SectionLabel>
                {feedback.rubricObservations.map((observation) => (
                  <div key={observation.dimension} className="row row--between">
                    <div className="stack" style={{ gap: 0 }}>
                      <span className="body">{RUBRIC_DIMENSION_NAMES[observation.dimension]}</span>
                      <span className="caption">{observation.observation}</span>
                    </div>
                    <Pill tone={observation.rating === 'strong' ? 'accent' : undefined}>
                      {RUBRIC_RATING_NAMES[observation.rating]}
                    </Pill>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}
          {metricsPanel}
        </div>
      ) : null}

      {note ? <ProvenanceNote>{note}</ProvenanceNote> : null}
      {wasLocal ? (
        <ProvenanceNote>
          Coached by SpeakLab's built-in rules from measurements taken in your browser — no AI was
          involved and nothing left this device.
        </ProvenanceNote>
      ) : null}
    </div>
  )
}

export function SpeakingMetricsPanel({
  metrics,
  timingsEstimated,
}: {
  metrics: SpeakingMetrics
  timingsEstimated: boolean
}) {
  return (
    <Card variant="plain">
      <div className="stack stack--tight">
        <SectionLabel>Measured in your browser</SectionLabel>
        <div className="grid-3">
          <Stat value={formatDuration(metrics.totalDuration)} label="Length" />
          <Stat value={Math.round(metrics.wordsPerMinute)} label="Words / min" />
          <Stat value={metrics.wordCount} label="Words" />
        </div>
        <div className="grid-3">
          <Stat value={metrics.fillerCount} label="Fillers" />
          <Stat value={metrics.longPauses.length} label="Pauses > 1.2s" />
          <Stat value={metrics.paceVariation.toFixed(2)} label="Pace variation" />
        </div>
        {metrics.fillers.length > 0 ? (
          <p className="caption">
            {metrics.fillers
              .slice(0, 4)
              .map((hit) => `“${hit.token}” ×${hit.count}`)
              .join(' · ')}
          </p>
        ) : null}
        {metrics.hedges.length > 0 ? (
          <p className="caption">
            Hedging words (often legitimate):{' '}
            {metrics.hedges
              .slice(0, 4)
              .map((hit) => `“${hit.token}” ×${hit.count}`)
              .join(' · ')}
          </p>
        ) : null}
        {metrics.repeatedPhrases.length > 0 ? (
          <p className="caption">
            Repeated: {metrics.repeatedPhrases.map((phrase) => `“${phrase.phrase}”`).join(' · ')}
          </p>
        ) : null}
        <ProvenanceNote>
          Length, silences and pauses come from the microphone signal. Where each word sits inside a
          phrase is estimated{timingsEstimated ? '' : ''}, so pace figures are approximate. Nothing
          here is a judgement about your voice.
        </ProvenanceNote>
      </div>
    </Card>
  )
}

export function ConversationMetricsPanel({ metrics }: { metrics: ConversationMetrics }) {
  return (
    <Card variant="plain">
      <div className="stack stack--tight">
        <SectionLabel>Measured in your browser</SectionLabel>
        <div className="grid-3">
          <Stat value={metrics.userTurnCount} label="Your turns" />
          <Stat value={`${Math.round(metrics.userTalkShare * 100)}%`} label="Talk share" />
          <Stat value={metrics.acknowledgmentCount} label="Acknowledged" />
        </div>
        <div className="grid-3">
          <Stat value={metrics.openQuestionCount} label="Open Qs" />
          <Stat value={metrics.closedQuestionCount} label="Closed Qs" />
          <Stat value={metrics.clarifyingQuestionCount} label="Clarifying" />
        </div>
        <ProvenanceNote>
          The other person's speaking time is estimated from their word count, so talk share is an
          estimate. Interruptions are not measured at all — the simulation is turn-based, so you
          could not have talked over them.
        </ProvenanceNote>
      </div>
    </Card>
  )
}

export function ComparisonCard({
  comparison,
  wasLocal,
  note,
}: {
  comparison: AttemptComparison
  wasLocal: boolean
  note?: string
}) {
  const improved = comparison.targetImproved && !comparison.changeWasSuperficial
  return (
    <div className="stack">
      <Card variant={improved ? 'accent' : 'sunken'}>
        <div className="stack stack--tight">
          <SectionLabel>{improved ? 'The target moved' : 'The target held still'}</SectionLabel>
          <p className="title">{comparison.summary}</p>
          {comparison.changeWasSuperficial ? (
            <p className="caption">
              Something changed, but not the behaviour you were aiming at. That is worth knowing —
              it is the most common way practice stops working.
            </p>
          ) : null}
        </div>
      </Card>

      <div className="grid-2">
        <Card variant="plain">
          <div className="stack stack--tight">
            <SectionLabel>First attempt</SectionLabel>
            <p className="quote">{quoted(comparison.evidenceBefore || '—')}</p>
          </div>
        </Card>
        <Card variant="plain">
          <div className="stack stack--tight">
            <SectionLabel>Second attempt</SectionLabel>
            <p className="quote">{quoted(comparison.evidenceAfter || '—')}</p>
          </div>
        </Card>
      </div>

      {comparison.whatChanged.length > 0 ? (
        <Card>
          <div className="stack stack--tight">
            <SectionLabel>What changed</SectionLabel>
            <ul className="bullets body">
              {comparison.whatChanged.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </Card>
      ) : null}

      {comparison.whatDidNotChange.length > 0 ? (
        <Card variant="plain">
          <div className="stack stack--tight">
            <SectionLabel>What didn't</SectionLabel>
            <ul className="bullets caption">
              {comparison.whatDidNotChange.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </Card>
      ) : null}

      <Card variant="sunken">
        <div className="stack stack--tight">
          <SectionLabel>Next</SectionLabel>
          <p className="body">{comparison.nextStep}</p>
        </div>
      </Card>

      {note ? <ProvenanceNote>{note}</ProvenanceNote> : null}
      {wasLocal ? (
        <ProvenanceNote>
          Compared using measured change only. Where the measurements can't show whether the target
          moved, SpeakLab says so rather than guessing.
        </ProvenanceNote>
      ) : null}
    </div>
  )
}

export function RewardsSummary({ rewards }: { rewards: SessionRewards }) {
  return (
    <div className="stack">
      <div className="stack stack--tight">
        <SectionLabel>Session complete</SectionLabel>
        <h1 className="display">+{rewards.totalXP} XP</h1>
      </div>

      <Card>
        <ul className="list-reset stack stack--tight">
          {rewards.lines.map((line) => (
            <li key={line.id} className="row row--between">
              <span className="body">{line.label}</span>
              <span className="metric">+{line.xp}</span>
            </li>
          ))}
        </ul>
      </Card>

      {rewards.newTitle ? (
        <Card variant="accent">
          <div className="stack stack--tight">
            <SectionLabel>New title</SectionLabel>
            <p className="title">{rewards.newTitle.name}</p>
            <p className="body">{rewards.newTitle.blurb}</p>
          </div>
        </Card>
      ) : rewards.leveledUp ? (
        <Card variant="accent">
          <div className="stack stack--tight">
            <SectionLabel>Level up</SectionLabel>
            <p className="title">Level {rewards.newLevel}</p>
          </div>
        </Card>
      ) : null}

      {rewards.masteryImproved ? (
        <Card variant="sunken">
          <div className="stack stack--tight">
            <SectionLabel>Mastery</SectionLabel>
            <p className="body">
              {MASTERY_BAND_NAMES[rewards.masteryBandBefore]} →{' '}
              <strong>{MASTERY_BAND_NAMES[rewards.masteryBandAfter]}</strong>
            </p>
          </div>
        </Card>
      ) : null}

      {rewards.unlockedNugget ? (
        <Card variant="sunken">
          <div className="stack stack--tight">
            <SectionLabel>Golden nugget unlocked</SectionLabel>
            <p className="heading">{rewards.unlockedNugget.title}</p>
            <p className="body body--muted">{rewards.unlockedNugget.insight}</p>
          </div>
        </Card>
      ) : null}

      <Card variant="plain">
        <div className="stack stack--tight">
          <div className="row row--between">
            <span className="caption">Streak</span>
            <span className="metric">
              {rewards.streakCurrent} day{rewards.streakCurrent === 1 ? '' : 's'}
            </span>
          </div>
          {rewards.streakOutcome === 'savedByFreeze' ? (
            <p className="caption">A missed day was covered by this week's rest day.</p>
          ) : null}
          {rewards.weeklyGoalJustMet ? (
            <p className="caption accent-text">Weekly goal met.</p>
          ) : null}
          {rewards.reviewDueDate ? (
            <p className="caption">
              Spaced review scheduled for{' '}
              {new Date(rewards.reviewDueDate).toLocaleDateString(undefined, {
                weekday: 'long',
                day: 'numeric',
                month: 'short',
              })}
              .
            </p>
          ) : null}
        </div>
      </Card>
    </div>
  )
}

export function BonusClaim({
  scenario,
  claimed,
  onToggle,
}: {
  scenario: Scenario
  claimed: Set<string>
  onToggle: (id: string) => void
}) {
  const bonuses = scenario.objectives.filter((objective) => objective.isBonus)
  if (bonuses.length === 0) return null
  return (
    <Card variant="plain">
      <div className="stack stack--tight">
        <SectionLabel>Bonus objectives</SectionLabel>
        <p className="caption">
          SpeakLab can't check these, so they're yours to claim honestly. Nothing checks up on you.
        </p>
        {bonuses.map((objective) => (
          <label key={objective.id} className="row" style={{ alignItems: 'flex-start', gap: 10 }}>
            <input
              type="checkbox"
              checked={claimed.has(objective.id)}
              onChange={() => onToggle(objective.id)}
              style={{ marginTop: 4, width: 18, height: 18, accentColor: 'var(--accent)' }}
            />
            <span className="body">{objective.text}</span>
          </label>
        ))}
      </div>
    </Card>
  )
}

export function LevelStrip({
  level,
  progress,
  title,
}: {
  level: number
  progress: number
  title: string
}) {
  return (
    <div className="stack stack--tight">
      <div className="row row--between">
        <span className="label">
          Level {level} · {title}
        </span>
      </div>
      <Meter value={progress} />
    </div>
  )
}
