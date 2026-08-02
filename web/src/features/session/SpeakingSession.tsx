import { useCallback, useEffect, useRef, useState } from 'react'
import { useSpeakLab } from '../../app/store'
import { Button, Card, Notice, SectionLabel, Waveform, formatDuration } from '../../design/components'
import { computeSpeakingMetrics } from '../../core/speechMetrics'
import { segmentsFrom, Recorder, type Recording } from '../../services/recorder'
import { LiveTranscriber } from '../../services/transcription'
import { analyzeAttempt, compareAttempts } from '../../services/coach'
import { assignMission, completeSession, startSession, upsertSession } from '../../core/state'
import type { AttemptRecord, SessionRewards, SessionRecord } from '../../core/state'
import { skill as findSkill, transferScenarioAfter, scenario as findScenario } from '../../core/content'
import { countsAsImprovement } from '../../core/types'
import type { AttemptComparison, CoachFeedback, MicroSkill, Scenario, SpeakingMetrics } from '../../core/types'
import {
  AnxietyRating,
  BonusClaim,
  ComparisonCard,
  FeedbackCard,
  RewardsSummary,
  ScenarioBrief,
  SessionHeader,
  SpeakingMetricsPanel,
} from './parts'

/**
 * One speaking session, end to end.
 *
 * The stage machine is the training loop from the brief: introduce one
 * micro-skill, plan briefly, record, analyse, give exactly one target, retry
 * immediately, compare honestly, then offer a changed scenario. Every
 * transition is explicit so the loop cannot quietly skip the retry — which is
 * the step that produces the learning.
 */

type Stage =
  | 'brief'
  | 'plan'
  | 'record'
  | 'transcribe'
  | 'analyzing'
  | 'feedback'
  | 'comparing'
  | 'comparison'
  | 'transfer'
  | 'summary'

interface AttemptState {
  transcript: string
  metrics: SpeakingMetrics
  duration: number
  audioURL?: string
  note?: string
}

export function SpeakingSession({
  scenario,
  onExit,
  onStartScenario,
  isReview = false,
  isTransfer = false,
}: {
  scenario: Scenario
  onExit: () => void
  onStartScenario: (scenario: Scenario, options?: { isTransfer?: boolean }) => void
  isReview?: boolean
  isTransfer?: boolean
}) {
  const { state, update, recorder, coachSettings } = useSpeakLab()
  const skill = findSkill(scenario.primarySkillID)

  const [stage, setStage] = useState<Stage>('brief')
  const [attemptIndex, setAttemptIndex] = useState(0)
  const [attempts, setAttempts] = useState<AttemptState[]>([])
  const [feedback, setFeedback] = useState<CoachFeedback>()
  const [feedbackWasLocal, setFeedbackWasLocal] = useState(true)
  const [evidenceVerified, setEvidenceVerified] = useState(true)
  const [coachNote, setCoachNote] = useState<string>()
  const [comparison, setComparison] = useState<AttemptComparison>()
  const [comparisonWasLocal, setComparisonWasLocal] = useState(true)
  const [rewards, setRewards] = useState<SessionRewards>()
  const [transfer, setTransfer] = useState<Scenario>()
  const [planNotes, setPlanNotes] = useState('')
  const [anxietyBefore, setAnxietyBefore] = useState<number>()
  const [anxietyAfter, setAnxietyAfter] = useState<number>()
  const [claimedBonuses, setClaimedBonuses] = useState<Set<string>>(new Set())
  const [pendingRecording, setPendingRecording] = useState<Recording>()
  const [typedTranscript, setTypedTranscript] = useState('')
  const [transcriptionNote, setTranscriptionNote] = useState<string>()

  const sessionRef = useRef<SessionRecord | undefined>(undefined)
  const transcriberRef = useRef<LiveTranscriber | undefined>(undefined)
  const audioURLs = useRef<string[]>([])

  useEffect(() => {
    return () => {
      recorder.cancel()
      transcriberRef.current?.abort()
      audioURLs.current.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [recorder])

  const timeLimit = scenario.timeLimitSeconds
  const isRetry = attemptIndex > 0

  const beginPlanning = useCallback(() => {
    const started = startSession(state, { scenario, skillID: scenario.primarySkillID, isReview, isTransfer })
    sessionRef.current = started.session
    update(() => started.state)
    setStage('plan')
  }, [state, update, scenario, isReview, isTransfer])

  const persistAttempt = useCallback(
    (index: number, attempt: AttemptState, extra: Partial<AttemptRecord> = {}) => {
      const session = sessionRef.current
      if (!session) return
      const record: AttemptRecord = {
        index,
        transcript: attempt.transcript,
        durationSeconds: attempt.duration,
        metrics: attempt.metrics,
        feedbackWasLocal: true,
        evidenceVerified: true,
        timingsEstimated: true,
        ...extra,
      }
      const attemptsForRecord = [...session.attempts]
      attemptsForRecord[index] = record
      const updated: SessionRecord = { ...session, attempts: attemptsForRecord }
      sessionRef.current = updated
      update((current) => upsertSession(current, updated))
    },
    [update],
  )

  const runAnalysis = useCallback(
    async (index: number, attempt: AttemptState) => {
      setStage('analyzing')
      const result = await analyzeAttempt({
        scenario,
        skill: skill as MicroSkill,
        transcript: attempt.transcript,
        metrics: attempt.metrics,
        attemptNumber: index + 1,
        settings: coachSettings,
      })
      setFeedback(result.feedback)
      setFeedbackWasLocal(result.wasLocal)
      setEvidenceVerified(result.evidenceVerified)
      setCoachNote(result.note)
      persistAttempt(index, attempt, {
        feedback: result.feedback,
        feedbackWasLocal: result.wasLocal,
        evidenceVerified: result.evidenceVerified,
      })
      setStage('feedback')
    },
    [scenario, skill, coachSettings, persistAttempt],
  )

  const runComparison = useCallback(
    async (second: AttemptState) => {
      const first = attempts[0]
      if (!first || !feedback) {
        setStage('summary')
        return
      }
      setStage('comparing')
      const result = await compareAttempts({
        scenario,
        skill: skill as MicroSkill,
        target: feedback.primaryTarget,
        targetSkillID: feedback.targetSkillID ?? scenario.primarySkillID,
        retryInstruction: feedback.retryInstruction,
        first: { transcript: first.transcript, metrics: first.metrics },
        second: { transcript: second.transcript, metrics: second.metrics },
        settings: coachSettings,
      })
      setComparison(result.comparison)
      setComparisonWasLocal(result.wasLocal)
      if (result.note) setCoachNote(result.note)
      persistAttempt(1, second, { comparison: result.comparison })
      setStage('comparison')
    },
    [attempts, feedback, scenario, skill, coachSettings, persistAttempt],
  )

  /** Turns a finished recording plus a transcript into an analysed attempt. */
  const acceptAttempt = useCallback(
    async (recording: Recording, transcript: string, note?: string) => {
      const segments = segmentsFrom(transcript, recording.regions, recording.duration)
      const metrics = computeSpeakingMetrics({
        transcript,
        segments,
        totalDuration: recording.duration,
        ...(timeLimit === undefined ? {} : { timeLimit }),
      })
      const attempt: AttemptState = {
        transcript,
        metrics,
        duration: recording.duration,
        ...(recording.url ? { audioURL: recording.url } : {}),
        ...(note ? { note } : {}),
      }
      if (recording.url) audioURLs.current.push(recording.url)

      const index = attemptIndex
      setAttempts((current) => {
        const next = [...current]
        next[index] = attempt
        return next
      })
      setPendingRecording(undefined)
      setTypedTranscript('')

      if (index === 0) await runAnalysis(0, attempt)
      else await runComparison(attempt)
    },
    [attemptIndex, timeLimit, runAnalysis, runComparison],
  )

  const finishSession = useCallback(() => {
    const session = sessionRef.current
    if (!session) {
      setStage('summary')
      return
    }
    const improved = countsAsImprovement(comparison)
    const targetSkillID = feedback?.targetSkillID ?? scenario.primarySkillID
    const rubricRating = feedback?.rubricObservations.find(
      (observation) => observation.dimension === skill?.rubricDimension,
    )?.rating

    const withAnxiety: SessionRecord = {
      ...session,
      ...(anxietyBefore === undefined ? {} : { anxietyBefore }),
      ...(anxietyAfter === undefined ? {} : { anxietyAfter }),
    }
    sessionRef.current = withAnxiety

    // Computed outside the state updater rather than inside it: the reward
    // rules also produce a summary to show, and an updater that has side
    // effects runs twice under React's development double-invocation.
    const result = completeSession(upsertSession(state, withAnxiety), {
      session: withAnxiety,
      scenario,
      targetSkillID,
      improved,
      bonusObjectivesMet: claimedBonuses.size,
      ...(rubricRating ? { rubricRating } : {}),
      ...(feedback?.optionalGoldenNugget ? { suggestedNugget: feedback.optionalGoldenNugget } : {}),
    })

    // A real-world mission is only assigned once the behaviour has actually
    // moved — otherwise it is homework on something not yet learned.
    const targetSkill = findSkill(targetSkillID)
    const nextState =
      improved && targetSkill
        ? assignMission(
            result.state,
            targetSkillID,
            `This week, use "${targetSkill.name}" once for real. ${targetSkill.retryCue} Come back and tell me what happened.`,
          )
        : result.state

    setRewards(result.rewards)
    update(() => nextState)
    setStage('summary')
  }, [
    state,
    comparison,
    feedback,
    scenario,
    skill,
    anxietyBefore,
    anxietyAfter,
    claimedBonuses,
    update,
  ])

  const continueFromComparison = useCallback(() => {
    if (!countsAsImprovement(comparison)) {
      finishSession()
      return
    }
    const suggested =
      findScenario(feedback?.transferScenario?.scenarioID) ?? transferScenarioAfter(scenario)
    if (suggested && suggested.id !== scenario.id) {
      setTransfer(suggested)
      setStage('transfer')
    } else {
      finishSession()
    }
  }, [comparison, feedback, scenario, finishSession])

  if (!skill) {
    return (
      <div className="screen">
        <Notice title="That scenario is missing its skill">
          The content file and the app are out of step. Regenerate it with{' '}
          <code>npm run gen:content</code>.
        </Notice>
        <Button block onClick={onExit}>
          Back
        </Button>
      </div>
    )
  }

  const stageLabel =
    stage === 'brief'
      ? 'Brief'
      : stage === 'plan'
        ? 'Plan'
        : stage === 'record'
          ? isRetry
            ? 'Attempt 2'
            : 'Attempt 1'
          : stage === 'transcribe'
            ? 'Transcript'
            : stage === 'feedback'
              ? 'Feedback'
              : stage === 'comparison'
                ? 'Compare'
                : stage === 'transfer'
                  ? 'Transfer'
                  : 'Session'

  if (stage === 'record') {
    return (
      <RecordStage
        scenario={scenario}
        recorder={recorder}
        transcriberRef={transcriberRef}
        autoTranscribe={state.profile.autoTranscribe}
        cue={isRetry ? feedback?.retryInstruction : planNotes}
        isRetry={isRetry}
        onCancel={() => {
          recorder.cancel()
          transcriberRef.current?.abort()
          setStage(isRetry ? 'feedback' : 'plan')
        }}
        onFinished={(recording, transcript, note) => {
          if (transcript.trim().length > 0) {
            void acceptAttempt(recording, transcript.trim(), note)
          } else {
            setPendingRecording(recording)
            setTranscriptionNote(note)
            setStage('transcribe')
          }
        }}
      />
    )
  }

  return (
    <div className="screen">
      <SessionHeader scenario={scenario} onQuit={onExit} stageLabel={stageLabel} />

      {stage === 'brief' ? (
        <div className="stack stack--loose enter">
          <ScenarioBrief scenario={scenario} skill={skill} />
          {state.profile.trackAnxiety ? (
            <AnxietyRating
              title="How do you feel about this one right now?"
              {...(anxietyBefore === undefined ? {} : { value: anxietyBefore })}
              onChange={setAnxietyBefore}
            />
          ) : null}
          <Button block onClick={beginPlanning}>
            Plan it — {scenario.prepSeconds}s
          </Button>
        </div>
      ) : null}

      {stage === 'plan' ? (
        <PlanStage
          seconds={scenario.prepSeconds}
          notes={planNotes}
          onNotes={setPlanNotes}
          onStart={() => {
            setStage('record')
          }}
        />
      ) : null}

      {stage === 'transcribe' && pendingRecording ? (
        <div className="stack enter">
          <Notice title="No transcript came back" tone="warning">
            {transcriptionNote ??
              'Your browser did not return any recognised speech.'}{' '}
            Timing was still measured. Type roughly what you said and the analysis will run on that.
          </Notice>
          <textarea
            className="field"
            value={typedTranscript}
            onChange={(event) => setTypedTranscript(event.target.value)}
            placeholder="What you said…"
            aria-label="Type what you said"
          />
          <Button
            block
            disabled={typedTranscript.trim().length === 0}
            onClick={() => void acceptAttempt(pendingRecording, typedTranscript.trim(), transcriptionNote)}
          >
            Analyse it
          </Button>
          <Button variant="secondary" block onClick={() => setStage(isRetry ? 'feedback' : 'plan')}>
            Record again instead
          </Button>
        </div>
      ) : null}

      {stage === 'analyzing' || stage === 'comparing' ? (
        <Working label={stage === 'analyzing' ? 'Analysing your attempt' : 'Comparing the two attempts'} />
      ) : null}

      {stage === 'feedback' && feedback ? (
        <div className="stack stack--loose enter">
          <FeedbackCard
            feedback={feedback}
            transcript={attempts[0]?.transcript ?? ''}
            evidenceVerified={evidenceVerified}
            wasLocal={feedbackWasLocal}
            {...(coachNote ? { note: coachNote } : {})}
            metricsPanel={
              attempts[0] ? (
                <SpeakingMetricsPanel metrics={attempts[0].metrics} timingsEstimated />
              ) : null
            }
          />
          {attempts[0]?.audioURL ? (
            <Card variant="plain">
              <div className="stack stack--tight">
                <SectionLabel>Listen back</SectionLabel>
                <audio controls src={attempts[0].audioURL} style={{ width: '100%' }} />
                <p className="caption">
                  This audio only exists in this browser tab and is thrown away when you leave.
                </p>
              </div>
            </Card>
          ) : null}
          <BonusClaim
            scenario={scenario}
            claimed={claimedBonuses}
            onToggle={(id) =>
              setClaimedBonuses((current) => {
                const next = new Set(current)
                if (next.has(id)) next.delete(id)
                else next.add(id)
                return next
              })
            }
          />
          <div className="stack stack--tight">
            <Button
              block
              onClick={() => {
                setAttemptIndex(1)
                setStage('record')
              }}
            >
              Try it again with that one change
            </Button>
            <Button variant="quiet" block onClick={finishSession}>
              Skip the retry — no improvement reward
            </Button>
          </div>
        </div>
      ) : null}

      {stage === 'comparison' && comparison ? (
        <div className="stack stack--loose enter">
          <ComparisonCard
            comparison={comparison}
            wasLocal={comparisonWasLocal}
            {...(coachNote ? { note: coachNote } : {})}
          />
          {attempts[1] ? (
            <SpeakingMetricsPanel metrics={attempts[1].metrics} timingsEstimated />
          ) : null}
          {state.profile.trackAnxiety ? (
            <AnxietyRating
              title="And how do you feel now?"
              {...(anxietyAfter === undefined ? {} : { value: anxietyAfter })}
              onChange={setAnxietyAfter}
            />
          ) : null}
          <Button block onClick={continueFromComparison}>
            Continue
          </Button>
        </div>
      ) : null}

      {stage === 'transfer' && transfer ? (
        <div className="stack stack--loose enter">
          <div className="stack stack--tight">
            <SectionLabel>Same skill, changed situation</SectionLabel>
            <h1 className="title">{transfer.title}</h1>
            <p className="body body--muted">{transfer.transferTwist ?? transfer.hook}</p>
          </div>
          <Card variant="sunken">
            <p className="body">{transfer.briefing}</p>
          </Card>
          <p className="caption">
            Doing the same skill somewhere new is what turns it from a rehearsed line into something
            you can actually use.
          </p>
          <Button
            block
            onClick={() => {
              finishSession()
              onStartScenario(transfer, { isTransfer: true })
            }}
          >
            Take it on
          </Button>
          <Button variant="secondary" block onClick={finishSession}>
            Not now
          </Button>
        </div>
      ) : null}

      {stage === 'summary' && rewards ? (
        <div className="stack stack--loose enter">
          <RewardsSummary rewards={rewards} />
          <Button block onClick={onExit}>
            Done
          </Button>
        </div>
      ) : null}
    </div>
  )
}

function Working({ label }: { label: string }) {
  return (
    <div className="stack stack--tight enter" style={{ paddingTop: 'var(--space-xl)' }}>
      <SectionLabel>{label}</SectionLabel>
      <div className="meter">
        <div className="meter__fill" style={{ width: '45%' }} />
      </div>
      <p className="caption">Measurements first, then the coaching.</p>
    </div>
  )
}

function PlanStage({
  seconds,
  notes,
  onNotes,
  onStart,
}: {
  seconds: number
  notes: string
  onNotes: (value: string) => void
  onStart: () => void
}) {
  const [remaining, setRemaining] = useState(seconds)

  useEffect(() => {
    if (remaining <= 0) return
    const timer = setTimeout(() => setRemaining((value) => value - 1), 1000)
    return () => clearTimeout(timer)
  }, [remaining])

  return (
    <div className="stack stack--loose enter">
      <div className="stack stack--tight" style={{ alignItems: 'center' }}>
        <span className="metric" style={{ fontSize: 56 }}>
          {formatDuration(remaining)}
        </span>
        <p className="caption">planning time</p>
      </div>
      <Card variant="sunken">
        <div className="stack stack--tight">
          <SectionLabel>Jot the shape, not the words</SectionLabel>
          <p className="caption">
            Three bullets at most. A script read aloud sounds like a script read aloud, and it
            teaches you nothing you can use when someone interrupts.
          </p>
          <textarea
            className="field"
            value={notes}
            onChange={(event) => onNotes(event.target.value)}
            placeholder={'· the ask\n· the reason\n· what happens next'}
            aria-label="Planning notes"
          />
        </div>
      </Card>
      <Button block onClick={onStart}>
        {remaining > 0 ? 'Start now' : 'Start recording'}
      </Button>
    </div>
  )
}

/**
 * The recording screen.
 *
 * Recording state is unmistakable: the whole screen changes colour, a live
 * waveform moves, and a red dot pulses. That is a privacy feature, not a
 * flourish — nobody should ever be unsure whether the microphone is live.
 */
function RecordStage({
  scenario,
  recorder,
  transcriberRef,
  autoTranscribe,
  cue,
  isRetry,
  onCancel,
  onFinished,
}: {
  scenario: Scenario
  recorder: Recorder
  transcriberRef: { current: LiveTranscriber | undefined }
  autoTranscribe: boolean
  cue?: string
  isRetry: boolean
  onCancel: () => void
  onFinished: (recording: Recording, transcript: string, note?: string) => void
}) {
  const [live, setLive] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [levels, setLevels] = useState<number[]>([])
  const [liveText, setLiveText] = useState('')
  const [error, setError] = useState<string>()
  const startedRef = useRef(false)
  const stoppingRef = useRef(false)

  const limit = scenario.timeLimitSeconds
  const remaining = limit === undefined ? undefined : Math.max(0, limit - elapsed)

  const stop = useCallback(async () => {
    if (stoppingRef.current) return
    stoppingRef.current = true
    setLive(false)
    const recording = await recorder.stop()
    const transcription = transcriberRef.current?.stop()
    transcriberRef.current = undefined
    onFinished(recording, transcription?.transcript ?? '', transcription?.note)
  }, [recorder, transcriberRef, onFinished])

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true

    void (async () => {
      const started = await recorder.start((level, at) => {
        setElapsed(at)
        setLevels((current) => [...current.slice(-120), level])
      })
      if (!started) {
        setError(recorder.lastError ?? 'The microphone could not be started.')
        return
      }
      setLive(true)
      if (autoTranscribe && LiveTranscriber.isSupported) {
        const transcriber = new LiveTranscriber()
        transcriberRef.current = transcriber
        transcriber.start(() => setLiveText(transcriber.liveText))
      }
    })()
  }, [recorder, transcriberRef, autoTranscribe])

  useEffect(() => {
    if (limit === undefined || !live) return
    if (elapsed >= limit) void stop()
  }, [elapsed, limit, live, stop])

  if (error) {
    return (
      <div className="screen">
        <div className="stack stack--loose">
          <Notice title="The microphone isn't available" tone="warning">
            {error} On iPhone, Safari only offers the microphone over HTTPS — which the published
            SpeakLab page uses — and you may need to allow it in Settings › Safari › Microphone.
          </Notice>
          <Button block onClick={onCancel}>
            Back
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={`recording-shell${live ? ' recording-shell--live' : ''}`}>
      <div className="screen screen--flush stack stack--loose" style={{ paddingBottom: 24 }}>
        <div className="row row--between">
          <div className="row">
            {live ? (
              <>
                <span className="record-dot" />
                <span className="label" style={{ color: 'var(--recording)' }}>
                  Recording
                </span>
              </>
            ) : (
              <span className="label">Starting…</span>
            )}
          </div>
          <span className="caption">{isRetry ? 'Attempt 2' : 'Attempt 1'}</span>
        </div>

        <div className="stack stack--tight" style={{ alignItems: 'center', paddingTop: 12 }}>
          <span
            className="metric"
            style={{
              fontSize: 60,
              color: remaining !== undefined && remaining <= 10 ? 'var(--recording)' : 'var(--ink)',
            }}
          >
            {formatDuration(remaining ?? elapsed)}
          </span>
          <p className="caption">{remaining === undefined ? 'untimed' : 'remaining'}</p>
        </div>

        <Waveform levels={levels} live={live} />

        {cue ? (
          <Card variant={isRetry ? 'accent' : 'sunken'}>
            <div className="stack stack--tight">
              <SectionLabel>{isRetry ? 'The one change' : 'Your plan'}</SectionLabel>
              <p className={isRetry ? 'heading' : 'body'} style={{ whiteSpace: 'pre-wrap' }}>
                {cue}
              </p>
            </div>
          </Card>
        ) : null}

        {liveText ? (
          <Card variant="plain">
            <p className="caption" style={{ maxHeight: 96, overflow: 'hidden' }}>
              {liveText}
            </p>
          </Card>
        ) : null}

        <div className="spacer" />

        <div className="stack stack--tight" style={{ alignItems: 'center' }}>
          <button
            type="button"
            className="record-button"
            onClick={() => void stop()}
            disabled={!live}
            aria-label="Stop recording and analyse"
          >
            <span className="record-button__square" />
          </button>
          <p className="caption">Tap to finish</p>
          <Button variant="quiet" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}
