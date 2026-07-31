import { RUBRIC_DIMENSIONS, type RubricDimension, type RubricRating } from './types'
import type {
  AttemptComparison,
  CharacterTurnResponse,
  CoachFeedback,
  GoldenNugget,
  NuggetCategory,
  RubricObservation,
  TransferSuggestion,
} from './types'

/**
 * Decodes and validates everything that comes back from the model.
 *
 * The proxy already constrains responses with a JSON schema, but the client
 * re-validates anyway: schemas drift, proxies get misconfigured, and a
 * half-populated feedback card is worse than an honest error.
 *
 * Ported from ios/SpeakLab/Core/Coaching/CoachingDecoder.swift.
 */

export type DecodingFailure = 'notJSON' | 'malformed' | 'missingField' | 'emptyField'

export class CoachingDecodingError extends Error {
  readonly kind: DecodingFailure
  readonly field?: string

  constructor(kind: DecodingFailure, field?: string) {
    super(field ? `${kind}: ${field}` : kind)
    this.name = 'CoachingDecodingError'
    this.kind = kind
    this.field = field
  }

  get userMessage(): string {
    switch (this.kind) {
      case 'notJSON':
      case 'malformed':
        return 'The coaching response came back in an unexpected shape.'
      default:
        return `The coaching response was missing its ${this.field ?? 'content'}.`
    }
  }
}

type Json = Record<string, unknown>

/**
 * Returns the outermost JSON object in `text`.
 *
 * Structured outputs should make this a no-op, but a model nudged into prose or
 * a markdown fence should not cost the learner their recording. Anything that
 * is not a balanced object still fails.
 */
export function jsonObjectFrom(text: string): Json {
  const direct = tryParseObject(text)
  if (direct) return direct

  const start = text.indexOf('{')
  if (start < 0) throw new CoachingDecodingError('notJSON')

  let depth = 0
  let inString = false
  let escaped = false

  for (let index = start; index < text.length; index += 1) {
    const character = text[index]
    if (escaped) {
      escaped = false
    } else if (character === '\\' && inString) {
      escaped = true
    } else if (character === '"') {
      inString = !inString
    } else if (!inString) {
      if (character === '{') depth += 1
      if (character === '}') {
        depth -= 1
        if (depth === 0) {
          const slice = tryParseObject(text.slice(start, index + 1))
          if (!slice) throw new CoachingDecodingError('notJSON')
          return slice
        }
      }
    }
  }
  throw new CoachingDecodingError('notJSON')
}

function tryParseObject(text: string): Json | undefined {
  try {
    const value: unknown = JSON.parse(text)
    if (value && typeof value === 'object' && !Array.isArray(value)) return value as Json
    return undefined
  } catch {
    return undefined
  }
}

// MARK: - Small shared helpers

function nonEmpty(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function cleaned(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map(nonEmpty).filter((item): item is string => item !== undefined)
}

function require(value: unknown, field: string): string {
  if (value === undefined || value === null) throw new CoachingDecodingError('missingField', field)
  if (typeof value !== 'string') throw new CoachingDecodingError('malformed', field)
  const trimmed = nonEmpty(value)
  if (!trimmed) throw new CoachingDecodingError('emptyField', field)
  return trimmed
}

function asObject(value: unknown): Json | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Json) : undefined
}

function asBool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

// MARK: - Entry points

export function decodeFeedback(text: string): CoachFeedback {
  const raw = jsonObjectFrom(text)

  const scenarioOutcome = require(raw['scenarioOutcome'], 'scenarioOutcome')
  const primaryTarget = require(raw['primaryTarget'], 'primaryTarget')
  const evidenceQuote = require(raw['evidenceQuote'], 'evidenceQuote')
  const explanation = require(raw['explanation'], 'explanation')
  const retryInstruction = require(raw['retryInstruction'], 'retryInstruction')

  const observations: RubricObservation[] = []
  const seen = new Set<RubricDimension>()
  if (Array.isArray(raw['rubricObservations'])) {
    for (const entry of raw['rubricObservations']) {
      const observation = decodeObservation(entry)
      if (!observation || seen.has(observation.dimension)) continue
      seen.add(observation.dimension)
      observations.push(observation)
    }
  }

  const feedback: CoachFeedback = {
    scenarioOutcome,
    // Three is the cap: a longer list of strengths dilutes the single target,
    // which is the whole point of the screen.
    strengths: cleaned(raw['strengths']).slice(0, 3),
    primaryTarget,
    evidenceQuote,
    explanation,
    retryInstruction,
    rubricObservations: observations,
    safetyFlags: cleaned(raw['safetyFlags']),
  }

  const nugget = decodeNugget(raw['optionalGoldenNugget'])
  if (nugget) feedback.optionalGoldenNugget = nugget

  const transfer = decodeTransfer(raw['transferScenario'])
  if (transfer) feedback.transferScenario = transfer

  const targetSkillID = nonEmpty(raw['targetSkillID'])
  if (targetSkillID) feedback.targetSkillID = targetSkillID

  return feedback
}

function decodeObservation(value: unknown): RubricObservation | undefined {
  const raw = asObject(value)
  if (!raw) return undefined
  const observation = nonEmpty(raw['observation'])
  if (!observation) return undefined
  const dimension = raw['dimension']
  if (typeof dimension !== 'string') return undefined
  if (!RUBRIC_DIMENSIONS.includes(dimension as RubricDimension)) return undefined
  const ratingValue = raw['rating']
  const rating: RubricRating =
    ratingValue === 'strong' || ratingValue === 'adequate' || ratingValue === 'needsWork'
      ? ratingValue
      : 'adequate'
  return { dimension: dimension as RubricDimension, rating, observation }
}

const NUGGET_CATEGORIES: NuggetCategory[] = [
  'persuasion',
  'sales',
  'charisma',
  'structure',
  'listening',
]

function decodeNugget(value: unknown): GoldenNugget | undefined {
  const raw = asObject(value)
  if (!raw) return undefined
  const title = nonEmpty(raw['title'])
  const insight = nonEmpty(raw['insight'])
  if (!title || !insight) return undefined
  const categoryValue = raw['category']
  const category: NuggetCategory =
    typeof categoryValue === 'string' && NUGGET_CATEGORIES.includes(categoryValue as NuggetCategory)
      ? (categoryValue as NuggetCategory)
      : 'charisma'
  return { id: nonEmpty(raw['id']) ?? `nugget-${slug(title)}`, title, insight, category }
}

function decodeTransfer(value: unknown): TransferSuggestion | undefined {
  const raw = asObject(value)
  if (!raw) return undefined
  const title = nonEmpty(raw['title'])
  if (!title) return undefined
  const suggestion: TransferSuggestion = { title, twist: nonEmpty(raw['twist']) ?? '' }
  const scenarioID = nonEmpty(raw['scenarioID'])
  if (scenarioID) suggestion.scenarioID = scenarioID
  return suggestion
}

export function decodeComparison(text: string): AttemptComparison {
  const raw = jsonObjectFrom(text)
  if (typeof raw['targetImproved'] !== 'boolean') {
    throw new CoachingDecodingError('missingField', 'targetImproved')
  }
  return {
    targetImproved: raw['targetImproved'],
    changeWasSuperficial: asBool(raw['changeWasSuperficial'], false),
    summary: require(raw['summary'], 'summary'),
    evidenceBefore: nonEmpty(raw['evidenceBefore']) ?? '',
    evidenceAfter: nonEmpty(raw['evidenceAfter']) ?? '',
    whatChanged: cleaned(raw['whatChanged']),
    whatDidNotChange: cleaned(raw['whatDidNotChange']),
    nextStep: require(raw['nextStep'], 'nextStep'),
  }
}

export function decodeCharacterTurn(text: string): CharacterTurnResponse {
  const raw = jsonObjectFrom(text)
  const response: CharacterTurnResponse = {
    speech: require(raw['speech'], 'speech'),
    innerState: nonEmpty(raw['innerState']) ?? '',
    objectiveMet: asBool(raw['objectiveMet'], false),
    objectiveMissed: asBool(raw['objectiveMissed'], false),
    shouldEnd: asBool(raw['shouldEnd'], false),
  }
  const observedMove = nonEmpty(raw['observedMove'])
  if (observedMove) response.observedMove = observedMove
  const endReason = nonEmpty(raw['endReason'])
  if (endReason) response.endReason = endReason
  return response
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)
}
