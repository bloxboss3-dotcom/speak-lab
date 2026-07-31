import { skill as findSkill, skillsInPath } from './content'
import { Thresholds } from './types'
import type {
  ConversationMetrics,
  ConversationTurn,
  MicroSkill,
  Scenario,
  SpeakingMetrics,
  TimedSentence,
} from './types'

/**
 * Builds every prompt the app sends.
 *
 * Prompt text lives in the client rather than the proxy so the coaching can be
 * iterated on and unit-tested without a deploy. The proxy only owns the API key
 * and enforces the response shape.
 *
 * Ported from ios/SpeakLab/Core/Coaching/PromptBuilder.swift.
 */

export type CoachingTask =
  | 'attempt_feedback'
  | 'attempt_comparison'
  | 'character_turn'
  | 'conversation_debrief'

export interface CoachingMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface CoachingRequest {
  task: CoachingTask
  system: string
  messages: CoachingMessage[]
  maxTokens: number
  /** Maps to the API's effort control. Lower is faster and cheaper. */
  effort: 'low' | 'medium' | 'high'
}

/**
 * Constraints that apply to every coaching call.
 *
 * The negative list matters as much as the positive one: without it, models
 * reliably drift into commenting on confidence and tone of voice from a text
 * transcript, which is not something they can observe.
 */
export const GROUND_RULES = `You are a communication coach running a deliberate-practice session. You are experienced, warm, and extremely specific. You are not a cheerleader.

Hard rules:
- Ground every claim in the transcript or the measured data you are given. Quote verbatim. If you cannot find evidence for an observation, do not make it.
- You have a transcript and timing measurements. You have NOT heard the audio. Never comment on tone of voice, volume, warmth of sound, accent, or emotion audible in the voice. You may refer to pace, pauses and timing ONLY where the supplied measurements support it, and you must attribute them to the measurements.
- Never assess personality, charisma, confidence, authority, honesty or likeability. These are not observable from a transcript and claiming otherwise makes the whole session untrustworthy.
- No scores, percentages or invented precision. No "87% persuasive".
- Address behaviour and task, never the person. "The opening ran 25 seconds before the main point" — not "you ramble".
- Exactly one primary target. If several things need work, pick the one that would most improve the outcome for this listener in this scenario, and stay silent about the rest except in the rubric observations.
- British or American spelling — match the learner's transcript.
- Coaching must be ethical. Never coach manipulation, manufactured urgency, false scarcity, fake social proof, or pressure tactics. If the learner asks for those, add a safety flag and coach the honest alternative instead.
- If the learner appears genuinely distressed, add a safety flag. You are a communication trainer, not a therapist, and you must not present yourself as one.`

// MARK: - Speaking attempt feedback

export function attemptFeedbackRequest(options: {
  scenario: Scenario
  skill: MicroSkill
  transcript: string
  metrics: SpeakingMetrics
  attemptNumber: number
  previousTargetSkillID?: string
}): CoachingRequest {
  const { scenario, skill, transcript, metrics, attemptNumber, previousTargetSkillID } = options

  const system = `${GROUND_RULES}

The learner is practising one micro-skill: "${skill.name}".
${skill.summary}
Why it matters: ${skill.whyItMatters}

Your primary target should normally be about this micro-skill. Choose a different target only if something else in the attempt clearly mattered more for this listener — and if you do, say why in the explanation.

Write the retryInstruction as one imperative sentence the learner can hold in their head while speaking. Not a paragraph, not a checklist.

Set targetSkillID to one of these IDs, whichever best matches your target: ${availableSkillIDs(scenario)}.

Include optionalGoldenNugget only when a specific principle genuinely explains what happened here. When in doubt, omit it — a nugget on every attempt trains the learner to skip them.

Include a transferScenario only if this attempt was strong. It should be the same skill in a changed or harder situation.`

  const user = `SCENARIO
Title: ${scenario.title}
Mode: speaking to an audience
Setting: ${scenario.briefing}
Objectives:
${objectiveList(scenario)}
${timeLimitLine(scenario)}
Attempt number: ${attemptNumber}
${previousTargetLine(previousTargetSkillID)}

MEASURED DATA (computed on device, not by you)
${speakingDigest(metrics)}

TRANSCRIPT WITH TIMINGS
${timedTranscript(metrics.sentences, transcript)}`

  return {
    task: 'attempt_feedback',
    system,
    messages: [{ role: 'user', content: user }],
    maxTokens: 4000,
    effort: 'medium',
  }
}

// MARK: - Retry comparison

export function comparisonRequest(options: {
  scenario: Scenario
  skill: MicroSkill
  target: string
  retryInstruction: string
  firstTranscript: string
  firstMetrics: SpeakingMetrics
  secondTranscript: string
  secondMetrics: SpeakingMetrics
}): CoachingRequest {
  const system = `${GROUND_RULES}

You are comparing two attempts at the same scenario. The learner was told to change exactly one thing.

The target was: ${options.target}
The instruction they were given was: "${options.retryInstruction}"

Judge only whether that targeted behaviour changed. Do not reward a second attempt for being longer, more polished, or more enthusiastic if the target behaviour is unchanged. Rewarding surface change teaches the learner to perform effort instead of changing behaviour, which is the failure mode this whole app exists to avoid.

Set changeWasSuperficial to true when the wording changed but the underlying behaviour did not — for example, the same late arrival at the main point, reworded.

Quote both attempts verbatim in evidenceBefore and evidenceAfter, choosing the moments that show the target most clearly.`

  const user = `SCENARIO: ${options.scenario.title} — ${options.scenario.briefing}
MICRO-SKILL: ${options.skill.name} — ${options.skill.summary}

ATTEMPT 1 MEASURED DATA
${speakingDigest(options.firstMetrics)}

ATTEMPT 1 TRANSCRIPT
${timedTranscript(options.firstMetrics.sentences, options.firstTranscript)}

ATTEMPT 2 MEASURED DATA
${speakingDigest(options.secondMetrics)}

ATTEMPT 2 TRANSCRIPT
${timedTranscript(options.secondMetrics.sentences, options.secondTranscript)}`

  return {
    task: 'attempt_comparison',
    system,
    messages: [{ role: 'user', content: user }],
    maxTokens: 3000,
    effort: 'medium',
  }
}

// MARK: - Conversation

/**
 * The character's next line.
 *
 * The hidden brief is sent every turn as the system prompt and the visible
 * conversation as the message history — so the model plays the part rather than
 * narrating it, and the learner never sees the brief.
 */
export function characterTurnRequest(options: {
  scenario: Scenario
  history: ConversationTurn[]
  turnBudget: number
}): CoachingRequest {
  const { scenario, history, turnBudget } = options
  const character = scenario.character

  if (!character) {
    return {
      task: 'character_turn',
      system: 'You are a person in a conversation. Reply naturally in one or two sentences.',
      messages: history.map(toMessage),
      maxTokens: 1200,
      effort: 'low',
    }
  }

  const system = `You are playing a real person in a communication training simulation. Stay in character. You are not an assistant and you must never mention coaching, training, or that this is practice.

WHO YOU ARE
Name: ${character.name}
Role: ${character.role}
Personality: ${character.personality}
How you feel right now: ${character.emotionalState}

WHAT YOU ACTUALLY WANT (the other person does not know this)
${character.hiddenGoal}

YOUR CONCERN
${character.objection}

HOW TO PLAY IT
- React to what the other person actually said, not to what a generic person in your situation might expect. If they ignored your concern, notice that. If they asked a real question, answer it like a real person would — partially, and with the easy part first.
- Do not agree quickly. Shift position only when they have genuinely earned it: they listened, they understood the concern, and they responded to it.
- If they listen well, open up and say more of the real thing.
- If they lecture, sell, or talk over your concern, become shorter and more guarded. Do not become theatrical, cruel or abusive. Real people mostly get quieter, not louder.
- Speak the way a person actually speaks out loud: one to four sentences, contractions, no bullet points, no stage directions, no asterisks.
- You may ask questions back.

WHEN THE CONVERSATION ENDS
Set shouldEnd to true when either of these is true:
- Objective reached: ${character.successCondition}
- Objective clearly missed: ${character.failCondition}
Also end if the conversation has plainly run its natural course. There are about ${turnBudget} exchanges available in total; do not drag it out to fill them.

innerState is your private read of the moment — one sentence, honest, never spoken aloud. The learner sees it only after the conversation ends.
observedMove names one specific thing the other person just did, if anything notable ("asked an open question and waited"), otherwise omit it.`

  let messages = history.map(toMessage)
  if (messages.length === 0) {
    messages = [
      { role: 'user', content: '[The conversation is starting. Open with your first line.]' },
    ]
  }

  return { task: 'character_turn', system, messages, maxTokens: 1500, effort: 'low' }
}

export function conversationDebriefRequest(options: {
  scenario: Scenario
  skill: MicroSkill
  turns: ConversationTurn[]
  metrics: ConversationMetrics
  attemptNumber: number
}): CoachingRequest {
  const { scenario, skill, turns, metrics, attemptNumber } = options
  const character = scenario.character
  const characterContext = character
    ? `The person they were speaking to was ${character.name}, ${character.role}.
What that person actually wanted: ${character.hiddenGoal}
Their stated concern: ${character.objection}
Success looked like: ${character.successCondition}`
    : ''

  const system = `${GROUND_RULES}

You are debriefing a simulated conversation. The learner was practising "${skill.name}": ${skill.summary}

${characterContext}

Judge the conversation on whether the learner found out what the other person actually wanted and responded to it — not on whether they were pleasant.

Note that interruptions were not measured: the simulation is turn-based, so the learner physically could not talk over the other person. Do not comment on interrupting.

Set targetSkillID to one of: ${availableSkillIDs(scenario)}.`

  const user = `SCENARIO: ${scenario.title}
Setting: ${scenario.briefing}
Objectives:
${objectiveList(scenario)}
Attempt number: ${attemptNumber}

MEASURED DATA (computed on device, not by you)
${conversationDigest(metrics)}

TRANSCRIPT
${conversationTranscript(turns, scenario)}`

  return {
    task: 'conversation_debrief',
    system,
    messages: [{ role: 'user', content: user }],
    maxTokens: 4000,
    effort: 'medium',
  }
}

// MARK: - Formatting helpers

export function toMessage(turn: ConversationTurn): CoachingMessage {
  // The learner is "user"; the character's own past lines are "assistant",
  // which is what keeps the model anchored in the role across turns.
  return { role: turn.speaker === 'user' ? 'user' : 'assistant', content: turn.text }
}

export function objectiveList(scenario: Scenario): string {
  return scenario.objectives
    .map((objective) => `- ${objective.text}${objective.isBonus ? ' (bonus)' : ''}`)
    .join('\n')
}

export function timeLimitLine(scenario: Scenario): string {
  if (scenario.timeLimitSeconds === undefined) return 'Time limit: none (untimed practice)'
  return `Time limit: ${scenario.timeLimitSeconds} seconds`
}

function previousTargetLine(skillID?: string): string {
  const found = findSkill(skillID)
  if (!found) return ''
  return `Previous target they were working on: ${found.name}`
}

/**
 * Skills the model may choose as a target: the scenario's path, plus the
 * scenario's own primary skill in case it lives elsewhere in the tree.
 */
export function availableSkillIDs(scenario: Scenario): string {
  const ids = skillsInPath(scenario.pathID).map((entry) => entry.id)
  if (!ids.includes(scenario.primarySkillID)) ids.push(scenario.primarySkillID)
  return ids.join(', ')
}

export function timedTranscript(sentences: TimedSentence[], fallback: string): string {
  if (sentences.length === 0) return fallback
  return sentences.map((sentence) => `[${timestamp(sentence.start)}] ${sentence.text}`).join('\n')
}

export function conversationTranscript(turns: ConversationTurn[], scenario: Scenario): string {
  const characterName = scenario.character?.name ?? 'Them'
  return turns
    .map((turn) => {
      const speaker = turn.speaker === 'user' ? 'LEARNER' : characterName.toUpperCase()
      return `${speaker}: ${turn.text}`
    })
    .join('\n\n')
}

export function timestamp(seconds: number): string {
  const total = Math.round(seconds)
  const minutes = Math.floor(total / 60)
  return `${minutes}:${String(total % 60).padStart(2, '0')}`
}

// MARK: - Metrics digest

/**
 * Renders measured data into the compact, clearly-labelled block the model
 * reads. Every line says where the number came from, which is what stops the
 * model treating "pace variation" as something it heard.
 */
export function speakingDigest(metrics: SpeakingMetrics): string {
  const lines: string[] = []
  lines.push(`- Total length: ${format(metrics.totalDuration)} seconds`)
  if (metrics.timeLimit !== undefined) {
    const verdict = metrics.withinTimeLimit ? 'within limit' : 'OVER the limit'
    lines.push(`- Time limit: ${format(metrics.timeLimit)}s — ${verdict}`)
  }
  lines.push(`- Words: ${metrics.wordCount}`)
  lines.push(
    `- Pace: ${Math.round(metrics.wordsPerMinute)} words/min overall, ${Math.round(metrics.articulationRate)} while actually speaking`,
  )
  lines.push(
    `- Pace variation index: ${metrics.paceVariation.toFixed(2)} (0.00 = perfectly even; slowest 10s window ${Math.round(metrics.slowestWindowWPM)} wpm, fastest ${Math.round(metrics.fastestWindowWPM)} wpm)`,
  )

  if (metrics.fillerCount > 0) {
    const detail = metrics.fillers
      .slice(0, 5)
      .map((hit) => `"${hit.token}" x${hit.count}`)
      .join(', ')
    lines.push(
      `- Filler words: ${metrics.fillerCount} total (${metrics.fillerRate.toFixed(1)} per 100 words) — ${detail}`,
    )
  } else {
    lines.push('- Filler words: none detected')
  }

  if (metrics.hedgeCount > 0) {
    const detail = metrics.hedges
      .slice(0, 5)
      .map((hit) => `"${hit.token}" x${hit.count}`)
      .join(', ')
    lines.push(`- Hedging words (often legitimate, judge in context): ${detail}`)
  }

  if (metrics.repeatedPhrases.length > 0) {
    const detail = metrics.repeatedPhrases
      .map((phrase) => `"${phrase.phrase}" x${phrase.count}`)
      .join(', ')
    lines.push(`- Repeated phrases: ${detail}`)
  }

  if (metrics.longPauses.length > 0) {
    const detail = metrics.longPauses
      .slice(0, 4)
      .map((pause) => `${format(pause.duration)}s at ${timestamp(pause.start)}`)
      .join(', ')
    lines.push(`- Pauses over ${format(Thresholds.longPause)}s: ${detail}`)
  }

  if (metrics.leadingSilence > 0.8) {
    lines.push(`- Silence before first word: ${format(metrics.leadingSilence)}s`)
  }

  lines.push(
    `- Sentences: ${metrics.sentences.length}, average ${Math.round(metrics.averageSentenceWordCount)} words, longest ${metrics.longestSentenceWordCount} words`,
  )
  return lines.join('\n')
}

export function conversationDigest(metrics: ConversationMetrics): string {
  const lines: string[] = []
  lines.push(
    `- Exchanges: ${metrics.turnCount} turns total, ${metrics.userTurnCount} from the learner`,
  )
  lines.push(
    `- Talking time: learner ${format(metrics.userSpeakingSeconds)}s measured, other person ~${format(metrics.characterSpeakingSecondsEstimated)}s ESTIMATED from word count`,
  )
  lines.push(
    `- Learner's share of talking time: ${Math.round(metrics.userTalkShare * 100)}% (estimate, because the other side is synthesised)`,
  )
  lines.push(
    `- Questions asked by the learner: ${metrics.questions.length} — ${metrics.openQuestionCount} open, ${metrics.closedQuestionCount} closed, ${metrics.clarifyingQuestionCount} clarifying`,
  )
  if (metrics.stackedQuestionTurns > 0) {
    lines.push(`- Turns containing more than one question: ${metrics.stackedQuestionTurns}`)
  }
  lines.push(`- Acknowledgment phrases detected: ${metrics.acknowledgmentCount}`)
  lines.push(
    `- Learner turn length: average ${Math.round(metrics.averageUserTurnWords)} words, longest ${metrics.longestUserTurnWords}`,
  )
  lines.push('- Interruptions: NOT MEASURED (turn-based simulation)')
  if (metrics.userSpeech.fillerCount > 0) {
    lines.push(`- Filler words across the learner's turns: ${metrics.userSpeech.fillerCount}`)
  }
  return lines.join('\n')
}

function format(value: number): string {
  return value.toFixed(1)
}
