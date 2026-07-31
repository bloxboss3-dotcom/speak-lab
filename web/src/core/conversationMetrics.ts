import { computeSpeakingMetrics } from './speechMetrics'
import { arraysEqual, normalizedTokens, splitSentences } from './text'
import type {
  ConversationMetrics,
  ConversationTurn,
  DetectedQuestion,
  QuestionKind,
  SpeechSegment,
} from './types'

// Ported from ios/SpeakLab/Core/Analysis/ConversationMetrics.swift.

const OPEN_STARTERS = new Set([
  'what', 'how', 'why', 'describe', 'tell', 'walk', 'when', 'where', 'which',
])

const CLOSED_STARTERS = new Set([
  'is', 'are', 'was', 'were', 'do', 'does', 'did', 'can', 'could', 'will',
  'would', 'have', 'has', 'had', 'should', 'shall', 'may', 'might', 'am',
])

const CLARIFYING_OPENERS: string[][] = [
  ['so', "you're", 'saying'],
  ['so', 'you', 'are', 'saying'],
  ['if', "i've", 'got', 'that', 'right'],
  ['have', 'i', 'got', 'that'],
  ['let', 'me', 'make', 'sure'],
  ['so', "it's", 'less', 'about'],
  ['do', 'you', 'mean'],
  ['am', 'i', 'right', 'in', 'thinking'],
  ['just', 'to', 'check'],
]

const ACKNOWLEDGMENT_PHRASES: string[][] = [
  ['that', 'makes', 'sense'],
  ["that's", 'fair'],
  ['i', 'hear', 'you'],
  ['i', 'can', 'see', 'why'],
  ["that's", 'a', 'real'],
  ['i', 'understand'],
  ["you're", 'right'],
  ['fair', 'enough'],
  ['i', 'get', 'that'],
  ['thanks', 'for', 'telling', 'me'],
  ['that', 'sounds', 'hard'],
  ['i', 'appreciate', 'you'],
]

/** AVSpeechSynthesizer and the browser's synthesiser both land near 150 wpm. */
export function estimatedSpeechDuration(wordCount: number): number {
  if (wordCount <= 0) return 0
  return (wordCount / 150) * 60
}

export function computeConversationMetrics(turns: ConversationTurn[]): ConversationMetrics {
  const userTurns = turns.filter((turn) => turn.speaker === 'user')
  const characterTurns = turns.filter((turn) => turn.speaker === 'character')

  const userSeconds = userTurns.reduce((total, turn) => total + turn.duration, 0)
  const characterSeconds = characterTurns.reduce((total, turn) => total + turn.duration, 0)
  const totalSeconds = userSeconds + characterSeconds
  const share = totalSeconds > 0 ? userSeconds / totalSeconds : 0

  const questions: DetectedQuestion[] = []
  let stacked = 0
  let acknowledgments = 0

  turns.forEach((turn, index) => {
    if (turn.speaker !== 'user') return
    const found = detectQuestions(turn.text, index)
    if (found.length > 1) stacked += 1
    questions.push(...found)
    acknowledgments += countAcknowledgments(turn.text)
  })

  const userWordCounts = userTurns.map((turn) => normalizedTokens(turn.text).length)
  const averageWords =
    userWordCounts.length === 0
      ? 0
      : userWordCounts.reduce((total, count) => total + count, 0) / userWordCounts.length

  return {
    turnCount: turns.length,
    userTurnCount: userTurns.length,
    characterTurnCount: characterTurns.length,
    userSpeakingSeconds: userSeconds,
    characterSpeakingSecondsEstimated: characterSeconds,
    userTalkShare: share,
    questions,
    openQuestionCount: questions.filter((question) => question.kind === 'open').length,
    closedQuestionCount: questions.filter((question) => question.kind === 'closed').length,
    clarifyingQuestionCount: questions.filter((question) => question.kind === 'clarifying').length,
    stackedQuestionTurns: stacked,
    acknowledgmentCount: acknowledgments,
    averageUserTurnWords: averageWords,
    longestUserTurnWords: userWordCounts.length ? Math.max(...userWordCounts) : 0,
    interruptionsMeasurable: false,
    userSpeech: aggregateUserSpeech(userTurns),
  }
}

/**
 * Combines every user turn into one delivery profile.
 *
 * Segment timings are rebased so each turn follows the previous one, which
 * keeps pace analysis meaningful without pretending the character's speaking
 * time was silence from the learner.
 */
function aggregateUserSpeech(userTurns: ConversationTurn[]) {
  const segments: SpeechSegment[] = []
  const transcriptPieces: string[] = []
  let offset = 0

  for (const turn of userTurns) {
    for (const segment of turn.segments) {
      segments.push({
        text: segment.text,
        start: segment.start + offset,
        duration: segment.duration,
      })
    }
    transcriptPieces.push(turn.text)
    offset += turn.duration
  }

  return computeSpeakingMetrics({
    transcript: transcriptPieces.join(' '),
    segments,
    totalDuration: offset,
  })
}

/**
 * Splits a turn into sentences and classifies the interrogative ones.
 *
 * Transcription does not always produce a question mark, so a sentence opening
 * with an interrogative word counts as a question too.
 */
export function detectQuestions(text: string, turnIndex: number): DetectedQuestion[] {
  const results: DetectedQuestion[] = []
  for (const sentence of splitSentences(text)) {
    const tokens = normalizedTokens(sentence)
    const first = tokens[0]
    if (!first) continue
    const hasMark = sentence.includes('?')
    const startsInterrogative = OPEN_STARTERS.has(first) || CLOSED_STARTERS.has(first)
    if (!hasMark && !startsInterrogative) continue

    let kind: QuestionKind
    if (matchesAnyPrefix(tokens, CLARIFYING_OPENERS)) {
      kind = 'clarifying'
    } else if (OPEN_STARTERS.has(first)) {
      // "tell me about…" and "walk me through…" behave as open questions.
      kind = 'open'
    } else {
      kind = 'closed'
    }
    results.push({ text: sentence.trim(), kind, turnIndex })
  }
  return results
}

function countAcknowledgments(text: string): number {
  const tokens = normalizedTokens(text)
  let count = 0
  for (const phrase of ACKNOWLEDGMENT_PHRASES) {
    if (phrase.length > tokens.length) continue
    for (let index = 0; index + phrase.length <= tokens.length; index += 1) {
      if (arraysEqual(tokens.slice(index, index + phrase.length), phrase)) count += 1
    }
  }
  return count
}

function matchesAnyPrefix(tokens: string[], prefixes: string[][]): boolean {
  return prefixes.some(
    (prefix) => prefix.length <= tokens.length && arraysEqual(tokens.slice(0, prefix.length), prefix),
  )
}
