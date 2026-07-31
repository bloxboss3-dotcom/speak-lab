import { suggestNugget } from './content'
import { arraysEqual, normalizedTokens } from './text'
import {
  FillerLexicon,
  Thresholds,
  type AttemptComparison,
  type CoachFeedback,
  type ConversationMetrics,
  type ConversationTurn,
  type MicroSkill,
  type RubricObservation,
  type RubricRating,
  type Scenario,
  type SpeakingMetrics,
} from './types'

/**
 * Rule-based coaching that runs entirely in the browser.
 *
 * This is not a stand-in for the model — it is the app's floor. With no network,
 * no proxy configured, or a failed call, the learner still gets a specific,
 * evidenced target rather than a spinner and an apology. Every observation it
 * makes is derived from a number it can point at.
 *
 * Ported from ios/SpeakLab/Core/Coaching/LocalFeedbackEngine.swift.
 */

// Thresholds are named so the reasoning is legible at the call site.
const Limits = {
  highFillerRate: 3.0, // per 100 words
  fastPace: 185,
  slowPace: 105,
  monotonePaceVariation: 0.08,
  longSentenceWords: 42,
  // An opening sentence past ~30 words has almost certainly buried the point.
  longOpeningWords: 32,
  heavyRepetitionCount: 3,
  dominatingTalkShare: 0.62,
} as const

interface Finding {
  target: string
  quote: string
  explanation: string
  retryInstruction: string
  skillID: string
}

// MARK: - Speaking

export function localSpeakingFeedback(
  scenario: Scenario,
  skill: MicroSkill,
  metrics: SpeakingMetrics,
): CoachFeedback {
  const finding = speakingFinding(skill, metrics)
  const feedback: CoachFeedback = {
    scenarioOutcome: outcomeLine(scenario, metrics),
    strengths: speakingStrengths(metrics, scenario),
    primaryTarget: finding.target,
    evidenceQuote: finding.quote,
    explanation: finding.explanation,
    retryInstruction: finding.retryInstruction,
    rubricObservations: speakingRubric(metrics),
    safetyFlags: [],
    targetSkillID: finding.skillID,
  }
  const nugget = suggestNugget(finding.skillID, new Set())
  if (nugget) feedback.optionalGoldenNugget = nugget
  return feedback
}

function speakingFinding(skill: MicroSkill, metrics: SpeakingMetrics): Finding {
  // Ordered by how much the problem damages the listener's experience.
  if (metrics.timeLimit !== undefined && metrics.withinTimeLimit === false) {
    const over = Math.round(metrics.totalDuration - metrics.timeLimit)
    const limit = Math.round(metrics.timeLimit)
    return {
      target: 'Finish inside the time you were given',
      quote: lastSentenceText(metrics),
      explanation:
        `You ran ${over} seconds past the ${limit}-second limit. In this scenario the limit is not ` +
        'arbitrary — the room empties. Everything after the limit was said to fewer people than ' +
        'everything before it.',
      retryInstruction: `Cut one whole section before you start, and stop at ${limit} seconds even if you have more to say.`,
      skillID: 'cut-the-runway',
    }
  }

  if (metrics.fillerRate >= Limits.highFillerRate && metrics.fillerCount >= 4) {
    const top = metrics.fillers[0]
    const detail = top
      ? `"${top.token}" appeared ${top.count} times`
      : 'fillers appeared throughout'
    return {
      target: 'Replace filler words with silence',
      quote: sentenceWithMostFillers(metrics),
      explanation:
        `${detail}, which is ${metrics.fillerRate.toFixed(1)} per 100 words. Fillers do not make ` +
        'the pause shorter — they make it audible. A closed mouth reads as thinking; "um" reads ' +
        'as searching.',
      retryInstruction: 'Every time you reach for a filler, close your mouth and count one instead.',
      skillID: 'deliberate-pause',
    }
  }

  const opening = metrics.sentences[0]
  if (opening && opening.wordCount >= Limits.longOpeningWords) {
    return {
      target: 'Get to the point in your first sentence',
      quote: opening.text,
      explanation:
        `Your opening sentence ran ${opening.wordCount} words and took ` +
        `${Math.round(opening.end - opening.start)} seconds before it finished. Attention is ` +
        'highest in the first few seconds and you spent it on setup.',
      retryInstruction: 'Say the single most important sentence first. Context comes second.',
      skillID: 'bottom-line-first',
    }
  }

  if (metrics.wordsPerMinute >= Limits.fastPace && metrics.wordCount > 40) {
    return {
      target: 'Slow down enough to be followed',
      quote: longestSentenceText(metrics),
      explanation:
        `You averaged ${Math.round(metrics.wordsPerMinute)} words per minute. Comfortable ` +
        `listening sits nearer ${Thresholds.comfortablePaceLow}–${Thresholds.comfortablePaceHigh}. ` +
        'At this speed a listener who misses one sentence cannot catch back up.',
      retryInstruction: 'Deliberately pause for one second at every full stop.',
      skillID: 'deliberate-pause',
    }
  }

  const repeated = metrics.repeatedPhrases[0]
  if (repeated && repeated.count >= Limits.heavyRepetitionCount) {
    return {
      target: 'Vary the phrase you keep returning to',
      quote: sentenceContaining(repeated.phrase, metrics) ?? repeated.phrase,
      explanation:
        `"${repeated.phrase}" appeared ${repeated.count} times. Repetition that isn't deliberate ` +
        'reads as a verbal habit rather than emphasis, and it makes the surrounding material ' +
        'sound less considered.',
      retryInstruction: `Say "${repeated.phrase}" at most once.`,
      skillID: 'plain-words',
    }
  }

  if (metrics.longestSentenceWordCount >= Limits.longSentenceWords) {
    return {
      target: 'Break long sentences into separate ideas',
      quote: longestSentenceText(metrics),
      explanation:
        `Your longest sentence ran ${metrics.longestSentenceWordCount} words. A listener has to ` +
        'hold every clause in memory until the sentence resolves — and most of them stop trying ' +
        'before it does.',
      retryInstruction: 'One idea per sentence. Full stop, breathe, next idea.',
      skillID: 'one-idea-per-sentence',
    }
  }

  if (metrics.paceVariation <= Limits.monotonePaceVariation && metrics.totalDuration >= 40) {
    return {
      target: 'Change pace on the sentence that matters most',
      quote: longestSentenceText(metrics),
      explanation:
        `Measured pace stayed within a narrow band throughout (variation index ` +
        `${metrics.paceVariation.toFixed(2)}). This is a timing measurement, not a judgement of ` +
        'your voice — but it does mean nothing in the delivery marked out which sentence was the ' +
        'important one.',
      retryInstruction: 'Pick your one key sentence and say it noticeably slower than everything else.',
      skillID: 'pace-shift',
    }
  }

  if (
    metrics.wordsPerMinute > 0 &&
    metrics.wordsPerMinute <= Limits.slowPace &&
    metrics.wordCount > 30
  ) {
    return {
      target: 'Lift the pace so the energy carries',
      quote: firstSentenceText(metrics),
      explanation:
        `You averaged ${Math.round(metrics.wordsPerMinute)} words per minute, below the ` +
        `${Thresholds.comfortablePaceLow}–${Thresholds.comfortablePaceHigh} comfortable range. At ` +
        'this speed listeners have spare capacity, and spare capacity is where minds wander.',
      retryInstruction: 'Say it as if you only have half the time.',
      skillID: 'land-the-line',
    }
  }

  // Nothing measurable stood out — fall back to the scenario's own skill.
  return {
    target: skill.name,
    quote: firstSentenceText(metrics),
    explanation:
      'Nothing in the measurements stood out as a problem, which means the next gain is in the ' +
      `skill this scenario is built around. ${skill.whyItMatters}`,
    retryInstruction: skill.retryCue,
    skillID: skill.id,
  }
}

function speakingStrengths(metrics: SpeakingMetrics, scenario: Scenario): string[] {
  const strengths: string[] = []
  if (metrics.withinTimeLimit === true && metrics.timeLimit !== undefined) {
    strengths.push(
      `You finished in ${Math.round(metrics.totalDuration)}s, inside the ${Math.round(metrics.timeLimit)}s limit.`,
    )
  }
  if (metrics.fillerCount === 0 && metrics.wordCount > 25) {
    strengths.push(`No filler words at all across ${metrics.wordCount} words.`)
  } else if (metrics.fillerRate < 1.5 && metrics.wordCount > 40) {
    strengths.push(`Filler rate stayed low at ${metrics.fillerRate.toFixed(1)} per 100 words.`)
  }
  if (
    metrics.wordsPerMinute >= Thresholds.comfortablePaceLow &&
    metrics.wordsPerMinute <= Thresholds.comfortablePaceHigh
  ) {
    strengths.push(
      `Pace sat at ${Math.round(metrics.wordsPerMinute)} words per minute — comfortable to follow.`,
    )
  }
  if (metrics.paceVariation > 0.15) {
    strengths.push(
      'Your pace changed noticeably across the recording, which gives the listener signposts.',
    )
  }
  if (metrics.longPauses.length > 0 && metrics.fillerRate < 2) {
    strengths.push('You used real pauses rather than filling them.')
  }
  if (strengths.length === 0) {
    strengths.push(
      `You recorded a complete attempt at "${scenario.title}" — that is the rep that counts.`,
    )
  }
  return strengths.slice(0, 3)
}

function speakingRubric(metrics: SpeakingMetrics): RubricObservation[] {
  const observations: RubricObservation[] = []

  if (metrics.timeLimit !== undefined) {
    observations.push({
      dimension: 'concision',
      rating: metrics.withinTimeLimit === true ? 'strong' : 'needsWork',
      observation: `${Math.round(metrics.totalDuration)}s against a ${Math.round(metrics.timeLimit)}s limit.`,
    })
  }

  if (metrics.wordCount > 20) {
    let clarity: RubricRating
    if (metrics.fillerRate < 1.5 && metrics.longestSentenceWordCount < 30) {
      clarity = 'strong'
    } else if (metrics.fillerRate < 3.5) {
      clarity = 'adequate'
    } else {
      clarity = 'needsWork'
    }
    observations.push({
      dimension: 'clarity',
      rating: clarity,
      observation: `${metrics.fillerCount} fillers, longest sentence ${metrics.longestSentenceWordCount} words.`,
    })
  }

  const opening = metrics.sentences[0]
  if (opening) {
    observations.push({
      dimension: 'opening',
      rating: opening.wordCount <= 22 ? 'strong' : 'needsWork',
      observation: `Opening sentence was ${opening.wordCount} words.`,
    })
  }

  observations.push({
    dimension: 'organization',
    rating: metrics.sentences.length >= 3 ? 'adequate' : 'needsWork',
    observation: `${metrics.sentences.length} sentences, average ${Math.round(metrics.averageSentenceWordCount)} words.`,
  })

  return observations
}

function outcomeLine(scenario: Scenario, metrics: SpeakingMetrics): string {
  if (metrics.wordCount === 0) return 'No speech was recognised in this recording.'
  return `You delivered ${metrics.wordCount} words in ${Math.round(metrics.totalDuration)} seconds for "${scenario.title}".`
}

// MARK: - Conversation

export function localConversationFeedback(
  skill: MicroSkill,
  metrics: ConversationMetrics,
  turns: ConversationTurn[],
): CoachFeedback {
  const finding = conversationFinding(skill, metrics, turns)
  const strengths: string[] = []

  if (metrics.openQuestionCount > 0) {
    strengths.push(
      `You asked ${metrics.openQuestionCount} open question${metrics.openQuestionCount === 1 ? '' : 's'} — the kind that produce new information.`,
    )
  }
  if (metrics.acknowledgmentCount > 0) {
    strengths.push(
      `You acknowledged what they said ${metrics.acknowledgmentCount} time${metrics.acknowledgmentCount === 1 ? '' : 's'} before responding.`,
    )
  }
  if (metrics.userTalkShare < 0.5 && metrics.turnCount >= 4) {
    strengths.push(
      `You held your share of talking time to ${Math.round(metrics.userTalkShare * 100)}%, which left room for them.`,
    )
  }
  if (strengths.length === 0) {
    strengths.push(
      `You stayed in the conversation for ${metrics.turnCount} turns rather than closing it down early.`,
    )
  }

  const feedback: CoachFeedback = {
    scenarioOutcome: `The conversation ran ${metrics.turnCount} turns; you spoke for about ${Math.round(metrics.userSpeakingSeconds)} seconds.`,
    strengths: strengths.slice(0, 3),
    primaryTarget: finding.target,
    evidenceQuote: finding.quote,
    explanation: finding.explanation,
    retryInstruction: finding.retryInstruction,
    rubricObservations: conversationRubric(metrics),
    safetyFlags: [],
    targetSkillID: finding.skillID,
  }
  const nugget = suggestNugget(finding.skillID, new Set())
  if (nugget) feedback.optionalGoldenNugget = nugget
  return feedback
}

function conversationFinding(
  skill: MicroSkill,
  metrics: ConversationMetrics,
  turns: ConversationTurn[],
): Finding {
  const userTurns = turns.filter((turn) => turn.speaker === 'user')
  const firstUserTurn = userTurns[0]?.text ?? ''
  const longestUserTurn =
    userTurns.reduce<string>(
      (longest, turn) => (turn.text.length > longest.length ? turn.text : longest),
      '',
    ) || firstUserTurn

  if (metrics.openQuestionCount === 0 && metrics.userTurnCount >= 2) {
    return {
      target: 'Ask one genuinely open question',
      quote: firstUserTurn,
      explanation:
        `Across ${metrics.userTurnCount} turns you asked ${metrics.closedQuestionCount} closed ` +
        `question${metrics.closedQuestionCount === 1 ? '' : 's'} and no open ones. Closed questions ` +
        'confirm what you already believe; open ones tell you the thing you were missing.',
      retryInstruction: 'Ask one question starting with "what" or "how", then stop talking.',
      skillID: 'open-question',
    }
  }

  if (metrics.userTalkShare >= Limits.dominatingTalkShare && metrics.turnCount >= 4) {
    return {
      target: 'Take up less of the conversation',
      quote: longestUserTurn,
      explanation:
        `You accounted for about ${Math.round(metrics.userTalkShare * 100)}% of the talking time. ` +
        'In a conversation whose purpose is finding out what they want, that ratio means you were ' +
        'explaining when you could have been learning.',
      retryInstruction:
        'Keep every turn under three sentences, and end at least two of them with a question.',
      skillID: 'hold-the-silence',
    }
  }

  if (metrics.stackedQuestionTurns > 0) {
    return {
      target: 'Ask one question at a time',
      quote: longestUserTurn,
      explanation:
        `${metrics.stackedQuestionTurns} of your turns contained more than one question. People ` +
        'answer the easiest one and quietly drop the rest — usually the one you actually needed.',
      retryInstruction: 'One question per turn. Say nothing after the question mark.',
      skillID: 'one-question-at-a-time',
    }
  }

  if (metrics.acknowledgmentCount === 0 && metrics.userTurnCount >= 3) {
    return {
      target: 'Acknowledge before you answer',
      quote: longestUserTurn,
      explanation:
        'No acknowledging phrase appeared in any of your turns. An answer that arrives before the ' +
        'other person feels heard is received as a rebuttal, however good the answer is.',
      retryInstruction: 'Before your next answer, say their concern back to them in your own words.',
      skillID: 'acknowledge-before-answer',
    }
  }

  return {
    target: skill.name,
    quote: longestUserTurn,
    explanation:
      'The measurable patterns look healthy, so the next gain is in the skill this scenario is ' +
      `built around. ${skill.whyItMatters}`,
    retryInstruction: skill.retryCue,
    skillID: skill.id,
  }
}

function conversationRubric(metrics: ConversationMetrics): RubricObservation[] {
  return [
    {
      dimension: 'questionQuality',
      rating:
        metrics.openQuestionCount >= 2
          ? 'strong'
          : metrics.openQuestionCount === 1
            ? 'adequate'
            : 'needsWork',
      observation: `${metrics.openQuestionCount} open, ${metrics.closedQuestionCount} closed, ${metrics.clarifyingQuestionCount} clarifying.`,
    },
    {
      dimension: 'listeningAndAcknowledgment',
      rating:
        metrics.acknowledgmentCount >= 2
          ? 'strong'
          : metrics.acknowledgmentCount === 1
            ? 'adequate'
            : 'needsWork',
      observation: `${metrics.acknowledgmentCount} acknowledging phrases detected; you held ${Math.round(metrics.userTalkShare * 100)}% of talking time.`,
    },
    {
      dimension: 'concision',
      rating: metrics.averageUserTurnWords <= 45 ? 'strong' : 'needsWork',
      observation: `Average turn ${Math.round(metrics.averageUserTurnWords)} words, longest ${metrics.longestUserTurnWords}.`,
    },
  ]
}

// MARK: - Comparison

/**
 * Compares two attempts without a model, using only measured change.
 *
 * Deliberately conservative: when it cannot tell whether the target behaviour
 * moved, it says so rather than guessing, because a false "improved!" is the
 * single most damaging thing this app could tell someone.
 */
export function localCompare(
  targetSkillID: string | undefined,
  first: SpeakingMetrics,
  second: SpeakingMetrics,
): AttemptComparison {
  const changed: string[] = []
  const unchanged: string[] = []

  const fillerDelta = first.fillerCount - second.fillerCount
  if (Math.abs(fillerDelta) >= 2) {
    changed.push(
      fillerDelta > 0
        ? `Filler words dropped from ${first.fillerCount} to ${second.fillerCount}.`
        : `Filler words rose from ${first.fillerCount} to ${second.fillerCount}.`,
    )
  } else {
    unchanged.push(
      `Filler count was essentially the same (${first.fillerCount} then ${second.fillerCount}).`,
    )
  }

  const durationDelta = first.totalDuration - second.totalDuration
  if (Math.abs(durationDelta) >= 5) {
    changed.push(
      `Length changed by ${Math.round(Math.abs(durationDelta))}s (${Math.round(first.totalDuration)}s then ${Math.round(second.totalDuration)}s).`,
    )
  }

  const firstOpening = first.sentences[0]
  const secondOpening = second.sentences[0]
  if (firstOpening && secondOpening) {
    const delta = firstOpening.wordCount - secondOpening.wordCount
    if (Math.abs(delta) >= 6) {
      changed.push(
        `Opening sentence went from ${firstOpening.wordCount} to ${secondOpening.wordCount} words.`,
      )
    } else {
      unchanged.push('The opening was about the same length both times.')
    }
  }

  if (Math.abs(first.wordsPerMinute - second.wordsPerMinute) >= 15) {
    changed.push(
      `Pace moved from ${Math.round(first.wordsPerMinute)} to ${Math.round(second.wordsPerMinute)} words per minute.`,
    )
  }

  const improved = improvementHeuristic(targetSkillID, first, second)

  return {
    targetImproved: improved,
    changeWasSuperficial: !improved && changed.length > 0,
    summary: improved
      ? 'The measurements moved in the direction of your target.'
      : 'The measurements do not show a clear change in the behaviour you were targeting.',
    evidenceBefore: firstOpening?.text ?? '',
    evidenceAfter: secondOpening?.text ?? '',
    whatChanged: changed,
    whatDidNotChange: unchanged,
    nextStep: improved
      ? 'Take the same skill into a harder version of the scenario.'
      : 'Run it once more, holding only the one instruction in mind.',
  }
}

/**
 * Maps a target skill onto the measurement that would move if the learner
 * actually did the thing. Anything unmapped returns false rather than guessing:
 * an unearned "improved" is worse than a cautious "not shown".
 */
function improvementHeuristic(
  targetSkillID: string | undefined,
  first: SpeakingMetrics,
  second: SpeakingMetrics,
): boolean {
  switch (targetSkillID) {
    case 'deliberate-pause':
      return second.fillerRate < first.fillerRate - 0.5
    case 'cut-the-runway':
    case 'bottom-line-first': {
      const a = first.sentences[0]
      const b = second.sentences[0]
      if (!a || !b) return false
      return b.wordCount < a.wordCount - 4
    }
    case 'one-idea-per-sentence':
      return second.longestSentenceWordCount < first.longestSentenceWordCount - 5
    case 'pace-shift':
      return second.paceVariation > first.paceVariation + 0.04
    case 'land-the-line':
      return second.wordsPerMinute > first.wordsPerMinute + 10
    case 'plain-words':
      return second.repeatedPhrases.length < first.repeatedPhrases.length
    default:
      if (first.timeLimit !== undefined && first.withinTimeLimit === false) {
        return second.totalDuration <= first.timeLimit + 0.5
      }
      return false
  }
}

// MARK: - Small text helpers

function firstSentenceText(metrics: SpeakingMetrics): string {
  return metrics.sentences[0]?.text ?? ''
}

function lastSentenceText(metrics: SpeakingMetrics): string {
  return metrics.sentences[metrics.sentences.length - 1]?.text ?? ''
}

function longestSentenceText(metrics: SpeakingMetrics): string {
  let best = metrics.sentences[0]
  for (const sentence of metrics.sentences) {
    if (!best || sentence.wordCount > best.wordCount) best = sentence
  }
  return best?.text ?? firstSentenceText(metrics)
}

function sentenceWithMostFillers(metrics: SpeakingMetrics): string {
  let bestText: string | undefined
  let bestCount = 0
  for (const sentence of metrics.sentences) {
    const count = normalizedTokens(sentence.text).filter((token) =>
      FillerLexicon.hardFillers.has(token),
    ).length
    if (count > bestCount) {
      bestCount = count
      bestText = sentence.text
    }
  }
  return bestText ?? firstSentenceText(metrics)
}

function sentenceContaining(phrase: string, metrics: SpeakingMetrics): string | undefined {
  const needle = normalizedTokens(phrase)
  if (needle.length === 0) return undefined
  for (const sentence of metrics.sentences) {
    const tokens = normalizedTokens(sentence.text)
    if (tokens.length < needle.length) continue
    for (let index = 0; index + needle.length <= tokens.length; index += 1) {
      if (arraysEqual(tokens.slice(index, index + needle.length), needle)) return sentence.text
    }
  }
  return undefined
}
