import { useCallback, useEffect, useRef, useState } from 'react'
import { useSpeakLab } from '../../app/store'
import { Button, Card, Notice, SectionLabel, TypingDots, formatDuration } from '../../design/components'
import { computeConversationMetrics, estimatedSpeechDuration } from '../../core/conversationMetrics'
import { normalizedTokens } from '../../core/text'
import { segmentsFrom } from '../../services/recorder'
import { LiveTranscriber } from '../../services/transcription'
import { characterTurn, compareAttempts, debriefConversation } from '../../services/coach'
import { assignMission, completeSession, startSession, upsertSession } from '../../core/state'
import type { AttemptRecord, SessionRecord, SessionRewards } from '../../core/state'
import { skill as findSkill } from '../../core/content'
import { countsAsImprovement } from '../../core/types'
import type {
  AttemptComparison,
  CharacterTurnResponse,
  CoachFeedback,
  ConversationTurn,
  MicroSkill,
  Scenario,
} from '../../core/types'
import {
  AnxietyRating,
  ComparisonCard,
  ConversationMetricsPanel,
  FeedbackCard,
  RewardsSummary,
  ScenarioBrief,
  SessionHeader,
} from './parts'

/**
 * A multi-turn conversation with a simulated person.
 *
 * The character's hidden brief never reaches this side of the wire — it lives
 * in the system prompt — so the learner has to work out what the other person
 * actually wants by listening. It is revealed only in the debrief.
 */

type Stage = 'brief' | 'conversing' | 'analyzing' | 'feedback' | 'comparing' | 'comparison' | 'summary'

const TURN_BUDGET = 8

let turnCounter = 0
function makeTurn(
  speaker: 'user' | 'character',
  text: string,
  duration: number,
  measured: boolean,
  segments: ConversationTurn['segments'] = [],
): ConversationTurn {
  turnCounter += 1
  return {
    id: `turn-${turnCounter}`,
    speaker,
    text,
    duration,
    durationIsEstimated: !measured,
    segments,
  }
}

export function ConversationSession({
  scenario,
  onExit,
  isReview = false,
  isTransfer = false,
}: {
  scenario: Scenario
  onExit: () => void
  isReview?: boolean
  isTransfer?: boolean
}) {
  const { state, update, recorder, voice, coachSettings } = useSpeakLab()
  const skill = findSkill(scenario.primarySkillID)

  const [stage, setStage] = useState<Stage>('brief')
  const [turns, setTurns] = useState<ConversationTurn[]>([])
  const [firstRunTurns, setFirstRunTurns] = useState<ConversationTurn[]>([])
  const [runIndex, setRunIndex] = useState(0)
  const [thinking, setThinking] = useState(false)
  const [scripted, setScripted] = useState(false)
  const [ended, setEnded] = useState(false)
  const [endReason, setEndReason] = useState<string>()
  const [objectiveMet, setObjectiveMet] = useState(false)
  const [observedMoves, setObservedMoves] = useState<string[]>([])
  const [innerStates, setInnerStates] = useState<string[]>([])
  const [typed, setTyped] = useState('')
  const [recording, setRecording] = useState(false)
  const [feedback, setFeedback] = useState<CoachFeedback>()
  const [feedbackWasLocal, setFeedbackWasLocal] = useState(true)
  const [evidenceVerified, setEvidenceVerified] = useState(true)
  const [coachNote, setCoachNote] = useState<string>()
  const [comparison, setComparison] = useState<AttemptComparison>()
  const [comparisonWasLocal, setComparisonWasLocal] = useState(true)
  const [rewards, setRewards] = useState<SessionRewards>()
  const [anxietyBefore, setAnxietyBefore] = useState<number>()
  const [anxietyAfter, setAnxietyAfter] = useState<number>()
  const [error, setError] = useState<string>()

  const sessionRef = useRef<SessionRecord | undefined>(undefined)
  const transcriberRef = useRef<LiveTranscriber | undefined>(undefined)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    return () => {
      voice.stop()
      recorder.cancel()
      transcriberRef.current?.abort()
    }
  }, [voice, recorder])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [turns, thinking])

  const learnerTurnCount = turns.filter((turn) => turn.speaker === 'user').length

  const appendCharacter = useCallback(
    (response: CharacterTurnResponse) => {
      const words = normalizedTokens(response.speech).length
      setTurns((current) => [
        ...current,
        makeTurn('character', response.speech, estimatedSpeechDuration(words), false),
      ])
      if (response.observedMove) {
        setObservedMoves((current) =>
          current.includes(response.observedMove as string)
            ? current
            : [...current, response.observedMove as string],
        )
      }
      if (response.innerState) setInnerStates((current) => [...current, response.innerState])
      if (response.objectiveMet) setObjectiveMet(true)
      if (response.shouldEnd) {
        setEnded(true)
        setEndReason(response.endReason)
      }
      voice.speak(response.speech, scenario.character?.voiceHint)
    },
    [voice, scenario],
  )

  const characterOpens = useCallback(async () => {
    setThinking(true)
    const result = await characterTurn({ scenario, history: [], turnBudget: TURN_BUDGET, settings: coachSettings })
    setScripted(result.wasScripted)
    appendCharacter(result.turn)
    setThinking(false)
  }, [scenario, coachSettings, appendCharacter])

  const begin = useCallback(() => {
    const started = startSession(state, { scenario, skillID: scenario.primarySkillID, isReview, isTransfer })
    sessionRef.current = started.session
    update(() => started.state)
    setStage('conversing')
    void characterOpens()
  }, [state, update, scenario, isReview, isTransfer, characterOpens])

  const characterResponds = useCallback(
    async (history: ConversationTurn[]) => {
      setThinking(true)
      const result = await characterTurn({
        scenario,
        history,
        turnBudget: TURN_BUDGET,
        settings: coachSettings,
      })
      setScripted(result.wasScripted)
      appendCharacter(result.turn)
      setThinking(false)

      // A hard stop so a runaway simulation can't trap the learner.
      const learnerTurns = history.filter((turn) => turn.speaker === 'user').length
      if (learnerTurns >= TURN_BUDGET) {
        setEnded(true)
        setEndReason((current) => current ?? "You've used the time available for this one.")
      }
    },
    [scenario, coachSettings, appendCharacter],
  )

  const sendTyped = useCallback(() => {
    const text = typed.trim()
    if (!text) return
    setTyped('')
    const words = normalizedTokens(text).length
    const turn = makeTurn('user', text, estimatedSpeechDuration(words), false)
    const next = [...turns, turn]
    setTurns(next)
    void characterResponds(next)
  }, [typed, turns, characterResponds])

  const startSpeaking = useCallback(async () => {
    voice.stop()
    setError(undefined)
    const started = await recorder.start()
    if (!started) {
      setError(recorder.lastError ?? 'The microphone could not be started.')
      return
    }
    setRecording(true)
    if (state.profile.autoTranscribe && LiveTranscriber.isSupported) {
      const transcriber = new LiveTranscriber()
      transcriberRef.current = transcriber
      transcriber.start()
    }
  }, [recorder, voice, state.profile.autoTranscribe])

  const stopSpeaking = useCallback(async () => {
    setRecording(false)
    const captured = await recorder.stop()
    const transcription = transcriberRef.current?.stop()
    transcriberRef.current = undefined
    const text = transcription?.transcript.trim() ?? ''
    if (!text) {
      setError(
        transcription?.note ??
          "Nothing was recognised. You can type your turn instead — the conversation still counts.",
      )
      return
    }
    const segments = segmentsFrom(text, captured.regions, captured.duration)
    const turn = makeTurn('user', text, captured.duration, true, segments)
    const next = [...turns, turn]
    setTurns(next)
    void characterResponds(next)
  }, [recorder, turns, characterResponds])

  const persistAttempt = useCallback(
    (index: number, conversation: ConversationTurn[], extra: Partial<AttemptRecord> = {}) => {
      const session = sessionRef.current
      if (!session) return
      const metrics = computeConversationMetrics(conversation)
      const record: AttemptRecord = {
        index,
        transcript: conversation
          .filter((turn) => turn.speaker === 'user')
          .map((turn) => turn.text)
          .join('\n'),
        durationSeconds: metrics.userSpeakingSeconds,
        metrics: metrics.userSpeech,
        conversationTurns: conversation,
        feedbackWasLocal: true,
        evidenceVerified: true,
        timingsEstimated: true,
        ...extra,
      }
      const attempts = [...session.attempts]
      attempts[index] = record
      const updated: SessionRecord = { ...session, attempts }
      sessionRef.current = updated
      update((current) => upsertSession(current, updated))
    },
    [update],
  )

  const requestDebrief = useCallback(async () => {
    voice.stop()
    setStage('analyzing')
    const metrics = computeConversationMetrics(turns)
    persistAttempt(runIndex, turns)

    const result = await debriefConversation({
      scenario,
      skill: skill as MicroSkill,
      turns,
      metrics,
      attemptNumber: runIndex + 1,
      settings: coachSettings,
    })
    setFeedback(result.feedback)
    setFeedbackWasLocal(result.wasLocal)
    setEvidenceVerified(result.evidenceVerified)
    setCoachNote(result.note)
    persistAttempt(runIndex, turns, {
      feedback: result.feedback,
      feedbackWasLocal: result.wasLocal,
      evidenceVerified: result.evidenceVerified,
    })

    if (runIndex === 0) {
      setStage('feedback')
      return
    }

    // Second run: compare the learner's side of both conversations.
    setStage('comparing')
    const learnerOnly = (source: ConversationTurn[]) => {
      const conversationMetrics = computeConversationMetrics(source)
      return {
        transcript: source
          .filter((turn) => turn.speaker === 'user')
          .map((turn) => turn.text)
          .join(' '),
        metrics: conversationMetrics.userSpeech,
      }
    }
    const compared = await compareAttempts({
      scenario,
      skill: skill as MicroSkill,
      target: result.feedback.primaryTarget,
      targetSkillID: result.feedback.targetSkillID ?? scenario.primarySkillID,
      retryInstruction: result.feedback.retryInstruction,
      first: learnerOnly(firstRunTurns),
      second: learnerOnly(turns),
      settings: coachSettings,
    })
    setComparison(compared.comparison)
    setComparisonWasLocal(compared.wasLocal)
    if (compared.note) setCoachNote(compared.note)
    persistAttempt(runIndex, turns, { comparison: compared.comparison })
    setStage('comparison')
  }, [voice, turns, runIndex, persistAttempt, scenario, skill, coachSettings, firstRunTurns])

  const beginRetry = useCallback(() => {
    setFirstRunTurns(turns)
    setRunIndex(1)
    setTurns([])
    setEnded(false)
    setEndReason(undefined)
    setObjectiveMet(false)
    setObservedMoves([])
    setInnerStates([])
    setStage('conversing')
    void characterOpens()
  }, [turns, characterOpens])

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

    update((current) => {
      const withSession = upsertSession(current, withAnxiety)
      const result = completeSession(withSession, {
        session: withAnxiety,
        scenario,
        targetSkillID,
        improved,
        bonusObjectivesMet: objectiveMet ? 1 : 0,
        ...(rubricRating ? { rubricRating } : {}),
        ...(feedback?.optionalGoldenNugget ? { suggestedNugget: feedback.optionalGoldenNugget } : {}),
      })
      setRewards(result.rewards)
      const targetSkill = findSkill(targetSkillID)
      if (improved && targetSkill) {
        return assignMission(
          result.state,
          targetSkillID,
          `This week, use "${targetSkill.name}" in a real conversation. ${targetSkill.retryCue}`,
        )
      }
      return result.state
    })
    setStage('summary')
  }, [comparison, feedback, scenario, skill, objectiveMet, anxietyBefore, anxietyAfter, update])

  if (!skill || !scenario.character) {
    return (
      <div className="screen">
        <Notice title="That conversation is missing its brief">
          Regenerate the content file with <code>npm run gen:content</code>.
        </Notice>
        <Button block onClick={onExit}>
          Back
        </Button>
      </div>
    )
  }

  const learnerTranscript = turns
    .filter((turn) => turn.speaker === 'user')
    .map((turn) => turn.text)
    .join(' ')

  return (
    <div className="screen">
      <SessionHeader
        scenario={scenario}
        onQuit={onExit}
        stageLabel={
          stage === 'brief'
            ? 'Brief'
            : stage === 'conversing'
              ? runIndex > 0
                ? 'Run 2'
                : 'Run 1'
              : stage === 'feedback'
                ? 'Debrief'
                : stage === 'comparison'
                  ? 'Compare'
                  : 'Session'
        }
      />

      {stage === 'brief' ? (
        <div className="stack stack--loose enter">
          <ScenarioBrief scenario={scenario} skill={skill} />
          <Card variant="plain">
            <div className="stack stack--tight">
              <SectionLabel>How this works</SectionLabel>
              <p className="body body--muted">
                You'll talk to {scenario.character.name}, {scenario.character.role}. What they
                actually want is deliberately hidden — you have to find it out by listening. You get
                about {TURN_BUDGET} turns.
              </p>
              <p className="caption">
                Speak your turn or type it. You can end the conversation at any point: walking away
                is a legitimate outcome in a difficult conversation.
              </p>
            </div>
          </Card>
          {state.profile.trackAnxiety ? (
            <AnxietyRating
              title="How do you feel about this one right now?"
              {...(anxietyBefore === undefined ? {} : { value: anxietyBefore })}
              onChange={setAnxietyBefore}
            />
          ) : null}
          <Button block onClick={begin}>
            Start the conversation
          </Button>
        </div>
      ) : null}

      {stage === 'conversing' ? (
        <div className="stack">
          {scripted ? (
            <Notice title="Rehearsal mode" tone="warning">
              No coaching server is connected, so {scenario.character.name} is following a short
              script rather than genuinely reacting. It's enough to walk the loop; connect a server
              in Settings for a real simulation.
            </Notice>
          ) : null}

          <div className="turns" ref={scrollRef} style={{ maxHeight: '52dvh', overflowY: 'auto' }}>
            {turns.map((turn) => (
              <div key={turn.id} className={`turn turn--${turn.speaker}`}>
                {turn.text}
              </div>
            ))}
            {thinking ? (
              <div className="turn turn--character">
                <TypingDots />
              </div>
            ) : null}
          </div>

          {error ? (
            <Notice title="Microphone" tone="warning">
              {error}
            </Notice>
          ) : null}

          {ended ? (
            <div className="stack stack--tight">
              <Card variant="sunken">
                <div className="stack stack--tight">
                  <SectionLabel>Conversation over</SectionLabel>
                  <p className="body">{endReason ?? 'That conversation has run its course.'}</p>
                </div>
              </Card>
              <Button block onClick={() => void requestDebrief()}>
                See the debrief
              </Button>
            </div>
          ) : (
            <div className="stack stack--tight">
              <div className="row">
                <Button
                  variant={recording ? 'danger' : 'secondary'}
                  onClick={() => (recording ? void stopSpeaking() : void startSpeaking())}
                  disabled={thinking}
                >
                  {recording ? '■ Stop and send' : '● Speak your turn'}
                </Button>
                <span className="caption">{learnerTurnCount}/{TURN_BUDGET} turns</span>
              </div>
              <textarea
                className="field"
                value={typed}
                onChange={(event) => setTyped(event.target.value)}
                placeholder="…or type what you'd say"
                aria-label="Type your turn"
                style={{ minHeight: 76 }}
              />
              <div className="row">
                <Button onClick={sendTyped} disabled={thinking || typed.trim().length === 0}>
                  Send
                </Button>
                <div className="spacer" />
                <Button variant="quiet" onClick={() => setEnded(true)}>
                  End it here
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {stage === 'analyzing' || stage === 'comparing' ? (
        <div className="stack stack--tight enter" style={{ paddingTop: 'var(--space-xl)' }}>
          <SectionLabel>
            {stage === 'analyzing' ? 'Working through the conversation' : 'Comparing both runs'}
          </SectionLabel>
          <div className="meter">
            <div className="meter__fill" style={{ width: '45%' }} />
          </div>
        </div>
      ) : null}

      {stage === 'feedback' && feedback ? (
        <div className="stack stack--loose enter">
          <CharacterReveal
            scenario={scenario}
            observedMoves={observedMoves}
            innerStates={innerStates}
            objectiveMet={objectiveMet}
          />
          <FeedbackCard
            feedback={feedback}
            transcript={learnerTranscript}
            evidenceVerified={evidenceVerified}
            wasLocal={feedbackWasLocal}
            {...(coachNote ? { note: coachNote } : {})}
            metricsPanel={<ConversationMetricsPanel metrics={computeConversationMetrics(turns)} />}
          />
          <div className="stack stack--tight">
            <Button block onClick={beginRetry}>
              Run it again with that one change
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
          <ConversationMetricsPanel metrics={computeConversationMetrics(turns)} />
          {state.profile.trackAnxiety ? (
            <AnxietyRating
              title="And how do you feel now?"
              {...(anxietyAfter === undefined ? {} : { value: anxietyAfter })}
              onChange={setAnxietyAfter}
            />
          ) : null}
          <Button block onClick={finishSession}>
            Continue
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

/** The hidden brief, revealed only once the conversation is over. */
function CharacterReveal({
  scenario,
  observedMoves,
  innerStates,
  objectiveMet,
}: {
  scenario: Scenario
  observedMoves: string[]
  innerStates: string[]
  objectiveMet: boolean
}) {
  const character = scenario.character
  if (!character) return null
  return (
    <Card variant="sunken">
      <div className="stack stack--tight">
        <SectionLabel>What {character.name} actually wanted</SectionLabel>
        <p className="body">{character.hiddenGoal}</p>
        <p className="caption">
          <strong>Their concern:</strong> {character.objection}
        </p>
        <p className="caption">
          <strong>Success looked like:</strong> {character.successCondition}
        </p>
        {objectiveMet ? <p className="caption accent-text">You got there.</p> : null}
        {observedMoves.length > 0 ? (
          <>
            <SectionLabel>What they noticed you doing</SectionLabel>
            <ul className="bullets caption">
              {observedMoves.map((move) => (
                <li key={move}>{move}</li>
              ))}
            </ul>
          </>
        ) : null}
        {innerStates.length > 0 ? (
          <details>
            <summary className="caption" style={{ cursor: 'pointer' }}>
              Their private read, turn by turn
            </summary>
            <ul className="bullets caption">
              {innerStates.map((thought, index) => (
                <li key={`${index}-${thought}`}>{thought}</li>
              ))}
            </ul>
          </details>
        ) : null}
      </div>
    </Card>
  )
}

export const conversationTurnBudget = TURN_BUDGET
export const conversationTurnDuration = formatDuration
