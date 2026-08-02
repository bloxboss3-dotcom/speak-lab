import {
  attemptFeedbackRequest,
  characterTurnRequest,
  comparisonRequest,
  conversationDebriefRequest,
  type CoachingRequest,
} from '../core/prompts'
import {
  CoachingDecodingError,
  decodeCharacterTurn,
  decodeComparison,
  decodeFeedback,
} from '../core/decoder'
import { verifyQuote } from '../core/grounding'
import { detectQuestions } from '../core/conversationMetrics'
import { localCompare, localConversationFeedback, localSpeakingFeedback } from '../core/localCoach'
import type {
  AttemptComparison,
  CharacterTurnResponse,
  CoachFeedback,
  ConversationMetrics,
  ConversationTurn,
  MicroSkill,
  Scenario,
  SpeakingMetrics,
} from '../core/types'

/**
 * The coaching facade.
 *
 * Everything the app asks of a model goes through here, and every path has a
 * local fallback. That is deliberate: a page served from static hosting has no
 * server of its own, so "no coaching service configured" is the *normal* state,
 * not an error state. The app has to be fully usable in it.
 *
 * The API key never reaches this code. When a proxy is configured it holds the
 * key; the browser only ever sees a URL and an optional shared secret that the
 * learner typed in themselves.
 */

export interface CoachSettings {
  /** Base URL of a deployed `server/` instance, e.g. https://coach.example.com */
  proxyURL?: string
  /** Optional shared secret the proxy requires in `x-speaklab-key`. */
  sharedSecret?: string
}

export interface FeedbackOutcome {
  feedback: CoachFeedback
  wasLocal: boolean
  evidenceVerified: boolean
  note?: string
}

export interface ComparisonOutcome {
  comparison: AttemptComparison
  wasLocal: boolean
  note?: string
}

export interface CharacterOutcome {
  turn: CharacterTurnResponse
  wasScripted: boolean
  note?: string
}

export class CoachingServiceError extends Error {
  readonly code: string
  constructor(code: string, message: string) {
    super(message)
    this.name = 'CoachingServiceError'
    this.code = code
  }
}

export function isConfigured(settings: CoachSettings): boolean {
  return Boolean(settings.proxyURL && settings.proxyURL.trim().length > 0)
}

/** Posts one coaching request and returns the model's raw JSON text. */
async function callProxy(request: CoachingRequest, settings: CoachSettings): Promise<string> {
  const base = settings.proxyURL?.trim().replace(/\/+$/, '')
  if (!base) throw new CoachingServiceError('notConfigured', 'No coaching server configured.')

  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (settings.sharedSecret) headers['x-speaklab-key'] = settings.sharedSecret

  let response: Response
  try {
    response = await fetch(`${base}/v1/coach`, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    })
  } catch {
    throw new CoachingServiceError(
      'offline',
      'The coaching server could not be reached from this browser.',
    )
  }

  if (!response.ok) {
    const detail = (await response.json().catch(() => undefined)) as
      | { error?: { code?: string; message?: string } }
      | undefined
    const code = detail?.error?.code ?? String(response.status)
    if (response.status === 401) {
      throw new CoachingServiceError('unauthorized', 'The coaching server rejected the shared key.')
    }
    if (response.status === 422) {
      throw new CoachingServiceError('refused', 'The coach declined to analyse this one.')
    }
    if (response.status === 429) {
      throw new CoachingServiceError('rateLimited', 'The coaching server is rate limiting requests.')
    }
    throw new CoachingServiceError(code, detail?.error?.message ?? 'The coaching server errored.')
  }

  const payload = (await response.json()) as { data?: unknown }
  if (typeof payload.data === 'string') return payload.data
  if (payload.data && typeof payload.data === 'object') return JSON.stringify(payload.data)
  throw new CoachingServiceError('malformed', 'The coaching server returned no data.')
}

function degradedNote(error: unknown): string {
  if (error instanceof CoachingServiceError) {
    switch (error.code) {
      case 'notConfigured':
        return 'Coached in your browser. Connect a coaching server in Settings for deeper feedback.'
      case 'offline':
        return "The coaching server couldn't be reached, so this was coached in your browser."
      case 'refused':
        return 'The coach declined to analyse this one, so this is browser-only feedback.'
      case 'unauthorized':
        return 'The coaching server rejected the shared key, so this was coached in your browser.'
      default:
        return `${error.message} Coached in your browser instead.`
    }
  }
  if (error instanceof CoachingDecodingError) {
    return "The coach's reply didn't arrive in one piece, so this was coached in your browser."
  }
  return 'Coached in your browser.'
}

// MARK: - Speaking

export async function analyzeAttempt(options: {
  scenario: Scenario
  skill: MicroSkill
  transcript: string
  metrics: SpeakingMetrics
  attemptNumber: number
  settings: CoachSettings
}): Promise<FeedbackOutcome> {
  const { scenario, skill, transcript, metrics, attemptNumber, settings } = options
  const local = () => localSpeakingFeedback(scenario, skill, metrics)

  if (!isConfigured(settings)) {
    return {
      feedback: local(),
      wasLocal: true,
      evidenceVerified: true,
      note: degradedNote(new CoachingServiceError('notConfigured', '')),
    }
  }

  try {
    const raw = await callProxy(
      attemptFeedbackRequest({ scenario, skill, transcript, metrics, attemptNumber }),
      settings,
    )
    const feedback = decodeFeedback(raw)
    const grounding = verifyQuote(feedback.evidenceQuote, transcript)
    const outcome: FeedbackOutcome = {
      feedback,
      wasLocal: false,
      evidenceVerified: grounding.verified,
    }
    if (!grounding.verified) {
      outcome.note = "The quoted evidence isn't a word-for-word match, so it's marked as a paraphrase."
    }
    return outcome
  } catch (error) {
    return { feedback: local(), wasLocal: true, evidenceVerified: true, note: degradedNote(error) }
  }
}

export async function compareAttempts(options: {
  scenario: Scenario
  skill: MicroSkill
  target: string
  targetSkillID: string
  retryInstruction: string
  first: { transcript: string; metrics: SpeakingMetrics }
  second: { transcript: string; metrics: SpeakingMetrics }
  settings: CoachSettings
}): Promise<ComparisonOutcome> {
  const { scenario, skill, target, targetSkillID, retryInstruction, first, second, settings } =
    options
  const local = () => localCompare(targetSkillID, first.metrics, second.metrics)

  if (!isConfigured(settings)) {
    return {
      comparison: local(),
      wasLocal: true,
      note: degradedNote(new CoachingServiceError('notConfigured', '')),
    }
  }

  try {
    const raw = await callProxy(
      comparisonRequest({
        scenario,
        skill,
        target,
        retryInstruction,
        firstTranscript: first.transcript,
        firstMetrics: first.metrics,
        secondTranscript: second.transcript,
        secondMetrics: second.metrics,
      }),
      settings,
    )
    return { comparison: decodeComparison(raw), wasLocal: false }
  } catch (error) {
    return { comparison: local(), wasLocal: true, note: degradedNote(error) }
  }
}

// MARK: - Conversation

export async function characterTurn(options: {
  scenario: Scenario
  history: ConversationTurn[]
  turnBudget: number
  settings: CoachSettings
}): Promise<CharacterOutcome> {
  const { scenario, history, turnBudget, settings } = options
  const local = () => scriptedReply(scenario, history, turnBudget)

  if (!isConfigured(settings)) {
    return { turn: local(), wasScripted: true }
  }

  try {
    const raw = await callProxy(characterTurnRequest({ scenario, history, turnBudget }), settings)
    return { turn: decodeCharacterTurn(raw), wasScripted: false }
  } catch (error) {
    return { turn: local(), wasScripted: true, note: degradedNote(error) }
  }
}

export async function debriefConversation(options: {
  scenario: Scenario
  skill: MicroSkill
  turns: ConversationTurn[]
  metrics: ConversationMetrics
  attemptNumber: number
  settings: CoachSettings
}): Promise<FeedbackOutcome> {
  const { scenario, skill, turns, metrics, attemptNumber, settings } = options
  const local = () => localConversationFeedback(skill, metrics, turns)
  const learnerText = turns
    .filter((turn) => turn.speaker === 'user')
    .map((turn) => turn.text)
    .join(' ')

  if (!isConfigured(settings)) {
    return {
      feedback: local(),
      wasLocal: true,
      evidenceVerified: true,
      note: degradedNote(new CoachingServiceError('notConfigured', '')),
    }
  }

  try {
    const raw = await callProxy(
      conversationDebriefRequest({ scenario, skill, turns, metrics, attemptNumber }),
      settings,
    )
    const feedback = decodeFeedback(raw)
    const grounding = verifyQuote(feedback.evidenceQuote, learnerText)
    const outcome: FeedbackOutcome = {
      feedback,
      wasLocal: false,
      evidenceVerified: grounding.verified,
    }
    if (!grounding.verified) {
      outcome.note = "The quoted evidence isn't a word-for-word match, so it's marked as a paraphrase."
    }
    return outcome
  } catch (error) {
    return { feedback: local(), wasLocal: true, evidenceVerified: true, note: degradedNote(error) }
  }
}

/**
 * A small scripted stand-in used when no coaching server is configured.
 *
 * It is not trying to be Claude. It exists so the whole training loop —
 * including conversation mode — can be walked through with no setup at all, and
 * the UI says plainly that it is a rehearsal rather than a real simulation.
 */
export function scriptedReply(
  scenario: Scenario,
  history: ConversationTurn[],
  turnBudget: number,
): CharacterTurnResponse {
  const character = scenario.character
  if (!character) {
    return { speech: 'Okay.', innerState: '', objectiveMet: false, objectiveMissed: false, shouldEnd: true }
  }

  if (history.length === 0) {
    return {
      speech: character.opensWith,
      innerState: character.emotionalState,
      objectiveMet: false,
      objectiveMissed: false,
      shouldEnd: false,
    }
  }

  const userTurns = history.filter((turn) => turn.speaker === 'user')
  const lastUserText = userTurns[userTurns.length - 1]?.text ?? ''
  const questions = detectQuestions(lastUserText, 0)
  const askedOpen = questions.some((question) => question.kind === 'open')

  if (userTurns.length >= Math.max(3, turnBudget - 2)) {
    return {
      speech: "Alright — let me have a think about it and I'll let you know.",
      innerState: 'Neither convinced nor put off.',
      objectiveMet: false,
      objectiveMissed: false,
      shouldEnd: true,
      endReason: 'The conversation reached its natural end.',
    }
  }

  if (askedOpen) {
    return {
      speech: opennessLine(character.hiddenGoal, character.objection, userTurns.length),
      innerState: 'Starting to feel listened to.',
      observedMove: 'Asked an open question.',
      objectiveMet: false,
      objectiveMissed: false,
      shouldEnd: false,
    }
  }

  return {
    speech: guardedLine(character.objection, userTurns.length),
    innerState: 'Not sure this person is listening yet.',
    observedMove: questions.length === 0 ? 'Explained rather than asked.' : 'Asked a closed question.',
    objectiveMet: false,
    objectiveMissed: false,
    shouldEnd: false,
  }
}

function opennessLine(hiddenGoal: string, objection: string, turn: number): string {
  const lines = [
    `Honestly? ${hiddenGoal.charAt(0).toLowerCase()}${hiddenGoal.slice(1)}`,
    `I suppose what's really behind it is this — ${objection}`,
    "That's a fair question. I hadn't really put it into words before.",
  ]
  return lines[Math.min(turn, lines.length - 1)] as string
}

function guardedLine(objection: string, turn: number): string {
  const lines = [
    objection,
    "Right. I hear you, but it's still the same issue for me.",
    "Mm. I'm not sure that changes much, to be honest.",
  ]
  return lines[Math.min(turn, lines.length - 1)] as string
}
