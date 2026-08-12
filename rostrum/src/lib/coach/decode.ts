import type { CoachEvaluation, DetectedTechnique } from '@/lib/types'

/**
 * Decoding and validating whatever comes back from the model.
 *
 * Malformed AI output must never reach the UI and must never crash the app.
 * Anything that fails validation here is discarded and the caller falls back to
 * the offline evaluator — which is a real analysis, so the learner loses
 * nothing but a little nuance.
 */

export class CoachDecodeError extends Error {
  constructor(readonly reason: string) {
    super(reason)
    this.name = 'CoachDecodeError'
  }
}

/** Pulls the outermost balanced JSON object out of a string. */
export function extractJson(text: string): Record<string, unknown> {
  const direct = tryParse(text)
  if (direct) return direct

  const start = text.indexOf('{')
  if (start < 0) throw new CoachDecodeError('no JSON object in response')

  let depth = 0
  let inString = false
  let escaped = false
  for (let index = start; index < text.length; index += 1) {
    const character = text[index]
    if (escaped) escaped = false
    else if (character === '\\' && inString) escaped = true
    else if (character === '"') inString = !inString
    else if (!inString) {
      if (character === '{') depth += 1
      if (character === '}') {
        depth -= 1
        if (depth === 0) {
          const parsed = tryParse(text.slice(start, index + 1))
          if (!parsed) throw new CoachDecodeError('unbalanced JSON object')
          return parsed
        }
      }
    }
  }
  throw new CoachDecodeError('unterminated JSON object')
}

function tryParse(text: string): Record<string, unknown> | undefined {
  try {
    const value: unknown = JSON.parse(text)
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>
    }
  } catch {
    // Fall through to the balanced-brace scan.
  }
  return undefined
}

function str(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function strings(value: unknown, cap: number): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map(str)
    .filter((item): item is string => item !== undefined)
    .slice(0, cap)
}

function score(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined
  return Math.max(0, Math.min(100, Math.round(value)))
}

/**
 * Validates a model response into a CoachEvaluation.
 *
 * `knownTechniqueIds` is passed in so a model that invents a technique id
 * cannot introduce a phantom entry into the learner's arsenal — detections
 * naming anything unknown are dropped rather than trusted.
 */
export function decodeEvaluation(
  raw: string,
  context: { targetTechniqueId: string | null; knownTechniqueIds: Set<string>; basis: string },
): CoachEvaluation {
  const payload = extractJson(raw)

  const techniqueScore = score(payload['techniqueScore'])
  const overallScore = score(payload['overallScore'])
  if (overallScore === undefined) throw new CoachDecodeError('missing overallScore')

  const nextRep = str(payload['nextRepInstruction'])
  if (!nextRep) throw new CoachDecodeError('missing nextRepInstruction')

  const detected: DetectedTechnique[] = []
  if (Array.isArray(payload['detectedTechniques'])) {
    for (const entry of payload['detectedTechniques']) {
      if (!entry || typeof entry !== 'object') continue
      const row = entry as Record<string, unknown>
      const id = str(row['techniqueId'])
      if (!id || !context.knownTechniqueIds.has(id)) continue
      const confidence =
        typeof row['confidence'] === 'number' && Number.isFinite(row['confidence'])
          ? Math.max(0, Math.min(1, row['confidence']))
          : 0
      if (confidence <= 0) continue
      const evidence = str(row['evidence'])
      detected.push({
        techniqueId: id,
        confidence: Number(confidence.toFixed(2)),
        appropriateUse: row['appropriateUse'] !== false,
        ...(evidence ? { evidence } : {}),
      })
    }
  }

  return {
    targetTechniqueId: context.targetTechniqueId,
    techniqueScore: techniqueScore ?? overallScore,
    overallScore,
    strengths: strings(payload['strengths'], 3),
    improvements: strings(payload['improvements'], 3),
    strongestLine: str(payload['strongestLine']) ?? '',
    nextRepInstruction: nextRep,
    detectedTechniques: detected,
    safetyFlags: strings(payload['safetyFlags'], 3),
    wasOffline: false,
    basis: context.basis,
  }
}
