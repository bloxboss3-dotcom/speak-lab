import { scenario as findScenario } from '@/content/scenarios'
import { IS_STATIC_BUILD } from '@/lib/build'
import { technique as findTechnique } from '@/content/techniques'
import { CoachDecodeError, decodeEvaluation } from './decode'
import { detectTechniques, scoreTechnique, strongestLine } from './heuristics'
import { gymPrompt, openChallengePrompt, principlePrompt, techniqueAttemptPrompt } from './prompts'
import type { CoachEvaluation, MotivationPrinciple, Technique } from '@/lib/types'

export { detectTechniques, recommendTechniques } from './heuristics'

/**
 * The coaching abstraction.
 *
 * Every function here returns a CoachEvaluation whether or not a model was
 * involved. When an API key is configured the model does the judging; when it
 * is not — or when the call fails, times out, or returns something that will
 * not validate — the offline evaluator does, and `wasOffline` says so on screen.
 * There is no path through this module that leaves the learner without feedback.
 */

const OFFLINE_BASIS =
  'Scored in your browser against this technique’s structure. No audio was analysed and nothing left this device.'
const MODEL_BASIS = 'Scored from your transcript. Delivery and tone were not analysed — only the words.'

/**
 * Remembers that coaching is not reachable, so a key-less install makes one
 * request per session rather than one per attempt. Reset on a reload, which is
 * the right cadence for noticing that a key has been added.
 *
 * A static build starts latched: there is no server, so `/api/coach` does not
 * exist and asking for it only produces a console error on every attempt. What
 * a static host answers a POST it has no route for varies — 404, 405, 501 — so
 * knowing at build time beats trying to recognise every host's refusal.
 */
let coachingUnavailable = IS_STATIC_BUILD

async function callModel(system: string, user: string, maxTokens = 1400): Promise<string | null> {
  if (coachingUnavailable) return null
  try {
    const response = await fetch('/api/coach', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ system, user, maxTokens }),
    })
    if (!response.ok) {
      // 503 is the route saying no key is configured. Any other 4xx means the
      // endpoint is not going to start working this session either — except
      // 429, which is exactly the case worth retrying.
      const structural =
        response.status === 503 ||
        (response.status >= 400 && response.status < 500 && response.status !== 429)
      if (structural) coachingUnavailable = true
      return null
    }
    const payload = (await response.json()) as { text?: string }
    return typeof payload.text === 'string' ? payload.text : null
  } catch {
    return null
  }
}

function knownIds(candidates: Technique[]): Set<string> {
  return new Set(candidates.map((entry) => entry.id))
}

// ------------------------------------------------------------ Technique attempt

export async function evaluateTechniqueAttempt(options: {
  techniqueId: string
  scenarioId: string
  transcript: string
  attemptNumber: number
  previousInstruction?: string
  knownTechniqueIds: string[]
}): Promise<CoachEvaluation> {
  const target = findTechnique(options.techniqueId)
  const scenario = findScenario(options.scenarioId)
  if (!target || !scenario) {
    return emptyEvaluation(options.techniqueId, 'That exercise is missing its content.')
  }

  const offline = () => offlineTechniqueEvaluation(target, options.transcript, options.knownTechniqueIds)

  const { system, user } = techniqueAttemptPrompt({
    technique: target,
    scenario,
    transcript: options.transcript,
    attemptNumber: options.attemptNumber,
    ...(options.previousInstruction ? { previousInstruction: options.previousInstruction } : {}),
  })

  const raw = await callModel(system, user)
  if (!raw) return offline()

  try {
    return decodeEvaluation(raw, {
      targetTechniqueId: target.id,
      knownTechniqueIds: new Set(options.knownTechniqueIds),
      basis: MODEL_BASIS,
    })
  } catch (error) {
    if (!(error instanceof CoachDecodeError)) throw error
    return offline()
  }
}

// ------------------------------------------------------------ Open challenge

/**
 * A Field Test. Nothing is named for the learner, and the detection bar stays
 * high in both paths — the offline detector requires essentially every marker,
 * and the prompt tells the model that a false positive is the worst error it
 * can make here.
 */
export async function evaluateOpenChallenge(options: {
  scenarioId: string
  transcript: string
  knownTechniqueIds: string[]
}): Promise<CoachEvaluation> {
  const scenario = findScenario(options.scenarioId)
  if (!scenario) return emptyEvaluation(null, 'That challenge is missing its scenario.')

  const candidates = options.knownTechniqueIds
    .map(findTechnique)
    .filter((entry): entry is Technique => Boolean(entry))

  const offline = (): CoachEvaluation => {
    const detected = detectTechniques(options.transcript, options.knownTechniqueIds)
    const best = detected[0]
    const bestTechnique = best ? findTechnique(best.techniqueId) : undefined
    const scored = bestTechnique ? scoreTechnique(bestTechnique, options.transcript) : undefined

    return {
      targetTechniqueId: best?.techniqueId ?? null,
      techniqueScore: scored?.score ?? 0,
      overallScore: scored?.score ?? baselineScore(options.transcript),
      strengths: bestTechnique
        ? [`You reached for ${bestTechnique.name} without being told to.`]
        : ['You answered the situation directly.'],
      improvements: bestTechnique
        ? []
        : ['Nothing you have been taught showed up clearly here — pick one deliberately next time.'],
      strongestLine: strongestLine(options.transcript),
      nextRepInstruction: bestTechnique
        ? `Run it again and make ${bestTechnique.name} even more deliberate.`
        : 'Run it again and choose one technique from your Arsenal before you start.',
      detectedTechniques: detected,
      safetyFlags: [],
      wasOffline: true,
      basis: OFFLINE_BASIS,
    }
  }

  const { system, user } = openChallengePrompt({ scenario, transcript: options.transcript, candidates })
  const raw = await callModel(system, user, 1600)
  if (!raw) return offline()

  try {
    const decoded = decodeEvaluation(raw, {
      targetTechniqueId: null,
      knownTechniqueIds: knownIds(candidates),
      basis: MODEL_BASIS,
    })
    // Cross-check the model's detections against the offline markers. A claim
    // neither source supports does not get to award the app's biggest reward.
    const offlineIds = new Set(
      detectTechniques(options.transcript, options.knownTechniqueIds, { minConfidence: 0.5 }).map(
        (entry) => entry.techniqueId,
      ),
    )
    decoded.detectedTechniques = decoded.detectedTechniques.map((entry) => ({
      ...entry,
      confidence: offlineIds.has(entry.techniqueId)
        ? entry.confidence
        : Number((entry.confidence * 0.7).toFixed(2)),
    }))
    return decoded
  } catch (error) {
    if (!(error instanceof CoachDecodeError)) throw error
    return offline()
  }
}

// ------------------------------------------------------------ Motivation Lab

export async function evaluatePrincipleAttempt(options: {
  principle: MotivationPrinciple
  transcript: string
  knownTechniqueIds: string[]
}): Promise<CoachEvaluation> {
  const scenario = findScenario(options.principle.scenarioId)
  if (!scenario) return emptyEvaluation(null, 'That principle is missing its scenario.')

  const offline = (): CoachEvaluation => {
    const score = rubricScore(options.principle.rubric, options.transcript)
    return {
      targetTechniqueId: null,
      techniqueScore: score,
      overallScore: score,
      strengths: score >= 60 ? ['You engaged with the situation rather than reassuring past it.'] : [],
      improvements:
        score >= 60 ? [] : ['Work through the rubric one line at a time — most of it is missing.'],
      strongestLine: strongestLine(options.transcript),
      nextRepInstruction: options.principle.rubric[0]
        ? `Run it again and start with this: ${options.principle.rubric[0].toLowerCase()}.`
        : 'Run it again, slower.',
      detectedTechniques: detectTechniques(options.transcript, options.knownTechniqueIds),
      safetyFlags: [],
      wasOffline: true,
      basis:
        'Scored in your browser against the principle’s rubric. This check is coarser than the model’s — it looks for the moves, not the nuance.',
    }
  }

  const { system, user } = principlePrompt({
    principleName: options.principle.name,
    rubric: options.principle.rubric,
    scenario,
    transcript: options.transcript,
  })

  const raw = await callModel(system, user)
  if (!raw) return offline()

  try {
    return decodeEvaluation(raw, {
      targetTechniqueId: null,
      knownTechniqueIds: new Set(options.knownTechniqueIds),
      basis: MODEL_BASIS,
    })
  } catch (error) {
    if (!(error instanceof CoachDecodeError)) throw error
    return offline()
  }
}

// ------------------------------------------------------------ Speech Gym

export async function generateSpeechGymFeedback(options: {
  need: string
  situation: string
  belief: string
  action: string
  techniqueIds: string[]
  transcript: string
  knownTechniqueIds: string[]
}): Promise<CoachEvaluation> {
  const techniques = options.techniqueIds
    .map(findTechnique)
    .filter((entry): entry is Technique => Boolean(entry))

  const offline = (): CoachEvaluation => {
    const detected = detectTechniques(options.transcript, options.knownTechniqueIds)
    const best = detected[0] ? findTechnique(detected[0].techniqueId) : undefined
    const scored = best ? scoreTechnique(best, options.transcript) : undefined
    const score = scored?.score ?? baselineScore(options.transcript)
    return {
      targetTechniqueId: best?.id ?? null,
      techniqueScore: score,
      overallScore: score,
      strengths: best ? [`${best.name} came through clearly.`] : [],
      improvements: [
        'Check the last sentence: does it say what you want them to do, with a time attached?',
      ],
      strongestLine: strongestLine(options.transcript),
      nextRepInstruction: 'Run it again and cut the first sentence entirely.',
      detectedTechniques: detected,
      safetyFlags: [],
      wasOffline: true,
      basis: OFFLINE_BASIS,
    }
  }

  const { system, user } = gymPrompt({
    need: options.need,
    situation: options.situation,
    belief: options.belief,
    action: options.action,
    techniques,
    transcript: options.transcript,
  })

  const raw = await callModel(system, user, 1600)
  if (!raw) return offline()

  try {
    return decodeEvaluation(raw, {
      targetTechniqueId: null,
      knownTechniqueIds: new Set(options.knownTechniqueIds),
      basis: MODEL_BASIS,
    })
  } catch (error) {
    if (!(error instanceof CoachDecodeError)) throw error
    return offline()
  }
}

// ------------------------------------------------------------ Helpers

function offlineTechniqueEvaluation(
  target: Technique,
  transcript: string,
  knownTechniqueIds: string[],
): CoachEvaluation {
  const { score, results } = scoreTechnique(target, transcript)
  const passed = results.filter((result) => result.passed)
  const missed = results.filter((result) => !result.passed)

  return {
    targetTechniqueId: target.id,
    techniqueScore: score,
    overallScore: score,
    strengths: passed.slice(0, 3).map((result) => result.label),
    improvements: missed.slice(0, 3).map((result) => `Missing: ${result.label.toLowerCase()}`),
    strongestLine: strongestLine(transcript),
    nextRepInstruction: missed[0]
      ? `Run it again and fix one thing: ${missed[0].label.toLowerCase()}.`
      : `Run it again and make the last line land harder.`,
    detectedTechniques: detectTechniques(transcript, knownTechniqueIds),
    safetyFlags: [],
    wasOffline: true,
    basis: OFFLINE_BASIS,
  }
}

/** A rough score for responses with no technique to measure against. */
function baselineScore(transcript: string): number {
  const words = transcript.trim().split(/\s+/).filter(Boolean).length
  if (words < 12) return 0
  if (words < 30) return 35
  return 55
}

/**
 * Rubric scoring without a model: each rubric line is matched against the
 * markers most likely to satisfy it. Coarse, and labelled as coarse on screen.
 */
function rubricScore(rubric: string[], transcript: string): number {
  const text = transcript.toLowerCase()
  const words = transcript.trim().split(/\s+/).filter(Boolean).length
  if (words < 15) return 0

  let met = 0
  for (const line of rubric) {
    const item = line.toLowerCase()
    if (item.includes('question') || item.includes('ask')) {
      if (transcript.includes('?')) met += 1
    } else if (item.includes('specific') || item.includes('checkable')) {
      if (/\d/.test(text)) met += 1
    } else if (item.includes('avoid') || item.includes('did not') || item.includes('without')) {
      // Absence checks pass by default; the model is needed to judge them well.
      met += 0.5
    } else if (item.includes('feeling') || item.includes('emotion') || item.includes('validat')) {
      if (/(embarrass|frustrat|angry|upset|scared|nervous|disappoint|proud|hurt)/.test(text)) met += 1
    } else if (item.includes('next') || item.includes('action') || item.includes('step')) {
      if (/(tonight|tomorrow|this week|before you|next class|on the way)/.test(text)) met += 1
    } else if (words >= 45) {
      met += 0.5
    }
  }
  return Math.round(Math.min(1, met / Math.max(1, rubric.length)) * 100)
}

function emptyEvaluation(targetTechniqueId: string | null, message: string): CoachEvaluation {
  return {
    targetTechniqueId,
    techniqueScore: 0,
    overallScore: 0,
    strengths: [],
    improvements: [message],
    strongestLine: '',
    nextRepInstruction: 'Try a different exercise.',
    detectedTechniques: [],
    safetyFlags: [],
    wasOffline: true,
    basis: message,
  }
}
