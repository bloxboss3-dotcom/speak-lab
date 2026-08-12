import type { Scenario, Technique } from '@/lib/types'

/**
 * Prompt construction.
 *
 * Prompts live in the app rather than the route so coaching quality can be
 * iterated on and unit-tested without touching the server. The route owns the
 * key and the model; this owns the coaching.
 */

/**
 * Rules applied to every call.
 *
 * The negative list matters most. Models asked to coach speaking will reliably
 * comment on tone, warmth and confidence from a text transcript, none of which
 * they can observe — and a learner who is told their delivery was warm by
 * something that never heard them stops believing the parts that were real.
 */
export const GROUND_RULES = `You are a communication coach running a deliberate-practice session. You are experienced, specific, and not a cheerleader.

WHAT YOU HAVE
A transcript of what the learner said, and the scenario they were responding to. Nothing else.

HARD RULES
- You have NOT heard the audio. Never comment on tone of voice, volume, pace, warmth of sound, accent, pauses, body language, eye contact or confidence. You cannot observe any of them.
- Ground every claim in words that are actually in the transcript. Quote verbatim. If you cannot find the evidence, do not make the claim.
- Score only the thing you were asked to score. techniqueScore is about whether the named technique's structure is present and well executed — not whether the speech was enjoyable.
- Address the behaviour and the task, never the person. "The final repetition was shorter than the third" — not "you lost energy".
- Give exactly one instruction for the retry. One sentence, imperative, holdable in the head while speaking.
- strongestLine must be copied word for word from the transcript. Never paraphrase it, never improve it. If nothing stands out, return an empty string.
- Coaching must be ethical. Never coach manipulation, manufactured urgency, false scarcity, invented social proof, shaming, or pressure tactics. If the learner used any of those, add a safetyFlag and coach the honest alternative.
- The learner works with children and teenagers. If a response would humiliate a child, damage their dignity, or trade on their insecurity, add a safetyFlag — even if it was rhetorically effective.
- No praise that is not attached to something specific in the transcript.

OUTPUT
Return a single JSON object and nothing else. No prose, no markdown fence.
{
  "techniqueScore": <0-100 integer>,
  "overallScore": <0-100 integer>,
  "strengths": [<up to 3 short strings>],
  "improvements": [<up to 3 short strings>],
  "strongestLine": <verbatim quote from the transcript, or "">,
  "nextRepInstruction": <one imperative sentence>,
  "detectedTechniques": [{ "techniqueId": <id from the supplied list>, "confidence": <0-1>, "appropriateUse": <bool>, "evidence": <verbatim quote> }],
  "safetyFlags": [<strings, usually empty>]
}`

function techniqueBrief(entry: Technique): string {
  return `TECHNIQUE: ${entry.name} (id: ${entry.id})
What it is: ${entry.summary}
Why it works: ${entry.why}
Structure:
${entry.structure.map((step, index) => `  ${index + 1}. ${step}`).join('\n')}
Use it when: ${entry.whenToUse}
Do not use it when: ${entry.whenNotToUse}`
}

function scenarioBrief(entry: Scenario): string {
  return `SCENARIO: ${entry.title}
Audience: ${entry.audience}
Situation: ${entry.situation}
Mission: ${entry.mission}
Time available: ${entry.speakSeconds} seconds`
}

/** Coaching an attempt where the learner was told which technique to use. */
export function techniqueAttemptPrompt(options: {
  technique: Technique
  scenario: Scenario
  transcript: string
  attemptNumber: number
  previousInstruction?: string
}): { system: string; user: string } {
  const { technique, scenario, transcript, attemptNumber, previousInstruction } = options

  const system = `${GROUND_RULES}

The learner was explicitly asked to use one technique. Weight techniqueScore heavily on whether its structure is actually present, and say plainly when it is not — a warm response that ignored the technique has not done the exercise.

${techniqueBrief(technique)}`

  const retryNote =
    attemptNumber > 1 && previousInstruction
      ? `\nThis is attempt ${attemptNumber}. On the previous attempt they were told: "${previousInstruction}". Judge whether they actually did that. Do not reward a response for being longer or more enthusiastic if the instruction was not followed.`
      : ''

  const user = `${scenarioBrief(scenario)}
${retryNote}

TRANSCRIPT OF WHAT THEY SAID
${transcript}`

  return { system, user }
}

/**
 * A Field Test: the learner was told nothing. The model has to work out what
 * they reached for, from a list of what they have actually been taught.
 */
export function openChallengePrompt(options: {
  scenario: Scenario
  transcript: string
  candidates: Technique[]
}): { system: string; user: string } {
  const { scenario, transcript, candidates } = options

  const list = candidates
    .map((entry) => `- ${entry.id}: ${entry.name} — ${entry.summary}`)
    .join('\n')

  const system = `${GROUND_RULES}

This was an open challenge. The learner was NOT told which technique to use, and must not be marked down for choosing a different one from the one you would have picked.

Your extra job is detection. Below is every technique this learner has been taught. Decide which, if any, they actually used — and be strict. Only report a technique when its structure is genuinely present and you can quote the words that show it. A vaguely encouraging sentence is not "Possibility Frame". A single repeated word is not "Rising Refrain". Reporting a technique that is not really there is the worst error you can make here, because the app rewards it heavily.

Set techniqueScore to how well the strongest detected technique was executed, or 0 if none was.

TECHNIQUES THIS LEARNER KNOWS
${list}`

  const user = `${scenarioBrief(scenario)}

TRANSCRIPT OF WHAT THEY SAID
${transcript}`

  return { system, user }
}

/** Coaching against a Motivation Lab principle rather than a rhetorical form. */
export function principlePrompt(options: {
  principleName: string
  rubric: string[]
  scenario: Scenario
  transcript: string
}): { system: string; user: string } {
  const { principleName, rubric, scenario, transcript } = options

  const system = `${GROUND_RULES}

The learner is practising a motivation principle rather than a rhetorical technique. Judge techniqueScore against this rubric, item by item:

${principleName}
${rubric.map((item) => `- ${item}`).join('\n')}

Empty reassurance ("you'll be fine", "you're great") should score badly even when kindly meant — it is the specific failure this principle exists to correct.`

  const user = `${scenarioBrief(scenario)}

TRANSCRIPT OF WHAT THEY SAID
${transcript}`

  return { system, user }
}

/** Feedback on a real talk the learner is preparing in the Speech Gym. */
export function gymPrompt(options: {
  need: string
  situation: string
  belief: string
  action: string
  techniques: Technique[]
  transcript: string
}): { system: string; user: string } {
  const { need, situation, belief, action, techniques, transcript } = options

  const system = `${GROUND_RULES}

This is preparation for something the learner is genuinely going to say to real people this week. Coach it as a draft, not as an exercise.

Judge it against their own stated goal: did the audience get to the belief, and were they given the action? Those two, in that order, matter more than elegance.

Do not rewrite the talk for them. Point at what is missing and let them fix it.

TECHNIQUES THEY HAVE AVAILABLE
${techniques.map((entry) => `- ${entry.id}: ${entry.name} — ${entry.summary}`).join('\n')}`

  const user = `WHAT THEY NEED TO COMMUNICATE: ${need}
THE SITUATION: ${situation}
WHAT THE AUDIENCE SHOULD BELIEVE AFTERWARDS: ${belief}
WHAT THEY SHOULD DO AFTERWARDS: ${action}

TRANSCRIPT OF THE DRAFT
${transcript}`

  return { system, user }
}
