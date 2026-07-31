import {
  EMPTY_METRICS,
  FillerLexicon,
  Thresholds,
  type FillerHit,
  type LongPause,
  type RepeatedPhrase,
  type SpeakingMetrics,
  type SpeechSegment,
  type TimedSentence,
} from './types'
import { arraysEqual, normalizedTokens } from './text'

/**
 * Computes every objective metric locally.
 *
 * Nothing here touches the network or a model. If the coaching service is
 * unavailable the learner still gets these numbers, which is the point: the
 * measurable half of the feedback loop must never depend on a server being up.
 *
 * Ported line-for-line from ios/SpeakLab/Core/Analysis/SpeechMetricsCalculator.swift.
 */

export interface SpeechAnalysisInput {
  transcript: string
  /** May be empty if no timings were captured; the calculator degrades rather than failing. */
  segments?: SpeechSegment[]
  totalDuration: number
  timeLimit?: number
}

export function computeSpeakingMetrics(input: SpeechAnalysisInput): SpeakingMetrics {
  const segments = [...(input.segments ?? [])].sort((a, b) => a.start - b.start)
  const transcript = resolvedTranscript(input.transcript, segments)
  const tokens = normalizedTokens(transcript)

  if (tokens.length === 0) {
    return emptyMetrics(input.totalDuration, input.timeLimit)
  }

  const lastSegment = segments[segments.length - 1]
  const duration = Math.max(input.totalDuration, lastSegment ? lastSegment.start + lastSegment.duration : 0)
  const leadingSilence = segments[0]?.start ?? 0

  const gaps = pauseGaps(segments)
  const pausedTime = gaps
    .filter((gap) => gap.duration > Thresholds.articulationPauseGap)
    .reduce((total, gap) => total + gap.duration, 0)
  const speakingDuration = Math.max(0, duration - leadingSilence - pausedTime)

  const wordsPerMinute = rate(tokens.length, duration)
  const articulationRate = rate(tokens.length, speakingDuration > 0 ? speakingDuration : duration)

  const [fillers, fillerTotal] = countFillers(tokens)
  const [hedges, hedgeTotal] = countHedges(tokens)
  const fillerRate = (fillerTotal / tokens.length) * 100

  const longPauses = gaps.filter((gap) => gap.duration >= Thresholds.longPause)
  const sentences = buildSentences(segments, transcript, duration, tokens.length)
  const pace = paceProfile(segments, wordsPerMinute, duration)

  const sentenceWordCounts = sentences.map((sentence) => sentence.wordCount)
  const averageSentenceWordCount =
    sentenceWordCounts.length === 0
      ? tokens.length
      : sentenceWordCounts.reduce((total, count) => total + count, 0) / sentenceWordCounts.length

  const metrics: SpeakingMetrics = {
    totalDuration: duration,
    speakingDuration,
    leadingSilence,
    wordCount: tokens.length,
    wordsPerMinute,
    articulationRate,
    fillers,
    fillerCount: fillerTotal,
    fillerRate,
    hedges,
    hedgeCount: hedgeTotal,
    repeatedPhrases: repeatedPhrases(tokens),
    longPauses,
    longestPause: gaps.reduce((longest, gap) => Math.max(longest, gap.duration), 0),
    paceVariation: pace.variation,
    slowestWindowWPM: pace.slowest,
    fastestWindowWPM: pace.fastest,
    sentences,
    averageSentenceWordCount,
    longestSentenceWordCount: sentenceWordCounts.length
      ? Math.max(...sentenceWordCounts)
      : tokens.length,
  }

  if (input.timeLimit !== undefined) {
    metrics.timeLimit = input.timeLimit
    metrics.withinTimeLimit = duration <= input.timeLimit + 0.5
  }
  return metrics
}

function resolvedTranscript(transcript: string, segments: SpeechSegment[]): string {
  const trimmed = transcript.trim()
  if (trimmed.length > 0) return trimmed
  return segments.map((segment) => segment.text).join(' ')
}

function rate(words: number, seconds: number): number {
  if (seconds <= 0.01) return 0
  return words / (seconds / 60)
}

function emptyMetrics(duration: number, timeLimit?: number): SpeakingMetrics {
  const metrics: SpeakingMetrics = {
    ...EMPTY_METRICS,
    totalDuration: duration,
    leadingSilence: duration,
  }
  if (timeLimit !== undefined) {
    metrics.timeLimit = timeLimit
    metrics.withinTimeLimit = duration <= timeLimit + 0.5
  }
  return metrics
}

// MARK: - Fillers

function sortedHits(counts: Map<string, number>): [FillerHit[], number] {
  const hits = [...counts.entries()]
    .map(([token, count]): FillerHit => ({ token, count }))
    .sort((a, b) => (b.count !== a.count ? b.count - a.count : a.token.localeCompare(b.token)))
  return [hits, hits.reduce((total, hit) => total + hit.count, 0)]
}

function countFillers(tokens: string[]): [FillerHit[], number] {
  const counts = new Map<string, number>()

  for (const token of tokens) {
    if (FillerLexicon.hardFillers.has(token)) {
      counts.set(token, (counts.get(token) ?? 0) + 1)
    }
  }

  // Longest phrases first so "you know what i mean" is not also counted as "you know".
  const phrases = [...FillerLexicon.fillerPhrases].sort((a, b) => b.length - a.length)
  const consumed = new Set<number>()

  for (const phrase of phrases) {
    if (phrase.length > tokens.length) continue
    let index = 0
    while (index + phrase.length <= tokens.length) {
      const window = tokens.slice(index, index + phrase.length)
      let overlaps = false
      for (let offset = index; offset < index + phrase.length; offset += 1) {
        if (consumed.has(offset)) {
          overlaps = true
          break
        }
      }
      if (!overlaps && arraysEqual(window, phrase)) {
        const key = phrase.join(' ')
        counts.set(key, (counts.get(key) ?? 0) + 1)
        for (let offset = index; offset < index + phrase.length; offset += 1) consumed.add(offset)
        index += phrase.length
      } else {
        index += 1
      }
    }
  }

  return sortedHits(counts)
}

function countHedges(tokens: string[]): [FillerHit[], number] {
  const counts = new Map<string, number>()
  for (const token of tokens) {
    if (FillerLexicon.hedges.has(token)) {
      counts.set(token, (counts.get(token) ?? 0) + 1)
    }
  }
  return sortedHits(counts)
}

// MARK: - Repetition

/**
 * Repeated multi-word phrases, longest and most frequent first.
 *
 * Hard fillers are removed first so "um, um, um" does not swamp the genuinely
 * interesting repetitions like "at the end of the day".
 */
export function repeatedPhrases(tokens: string[]): RepeatedPhrase[] {
  const content = tokens.filter((token) => !FillerLexicon.hardFillers.has(token))
  if (content.length < Thresholds.minRepeatedPhraseWords * 2) return []

  const maxN = Math.min(Thresholds.maxRepeatedPhraseWords, Math.floor(content.length / 2))
  if (maxN < Thresholds.minRepeatedPhraseWords) return []

  const candidates: Array<{ phrase: string; count: number; length: number }> = []
  for (let n = Thresholds.minRepeatedPhraseWords; n <= maxN; n += 1) {
    const counts = new Map<string, number>()
    for (let index = 0; index + n <= content.length; index += 1) {
      const phrase = content.slice(index, index + n).join(' ')
      counts.set(phrase, (counts.get(phrase) ?? 0) + 1)
    }
    for (const [phrase, count] of counts) {
      if (count >= 2) candidates.push({ phrase, count, length: n })
    }
  }

  candidates.sort((a, b) => {
    if (a.length !== b.length) return b.length - a.length
    if (a.count !== b.count) return b.count - a.count
    return a.phrase.localeCompare(b.phrase)
  })

  const result: RepeatedPhrase[] = []
  for (const candidate of candidates) {
    const subsumed = result.some((existing) => existing.phrase.includes(candidate.phrase))
    if (!subsumed) result.push({ phrase: candidate.phrase, count: candidate.count })
    if (result.length === 5) break
  }
  return result
}

// MARK: - Pauses

function pauseGaps(segments: SpeechSegment[]): LongPause[] {
  if (segments.length < 2) return []
  const gaps: LongPause[] = []
  let wordsSoFar = 0
  for (let index = 0; index < segments.length - 1; index += 1) {
    const current = segments[index] as SpeechSegment
    const next = segments[index + 1] as SpeechSegment
    wordsSoFar += normalizedTokens(current.text).length
    const gap = next.start - (current.start + current.duration)
    if (gap > 0) {
      gaps.push({
        start: current.start + current.duration,
        duration: gap,
        afterWordIndex: Math.max(0, wordsSoFar - 1),
      })
    }
  }
  return gaps
}

// MARK: - Sentences

function buildSentences(
  segments: SpeechSegment[],
  transcript: string,
  totalDuration: number,
  totalWords: number,
): TimedSentence[] {
  if (segments.length === 0) {
    return sentencesWithoutTimings(transcript, totalDuration, totalWords)
  }

  const sentences: TimedSentence[] = []
  let buffer: SpeechSegment[] = []

  const flush = () => {
    const first = buffer[0]
    const last = buffer[buffer.length - 1]
    if (!first || !last) return
    const text = buffer
      .map((segment) => segment.text.trim())
      .filter((piece) => piece.length > 0)
      .join(' ')
    if (text.length === 0) {
      buffer = []
      return
    }
    sentences.push({
      text,
      start: first.start,
      end: last.start + last.duration,
      wordCount: normalizedTokens(text).length,
    })
    buffer = []
  }

  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index] as SpeechSegment
    buffer.push(segment)
    const trimmed = segment.text.trim()
    const endsSentence = trimmed.endsWith('.') || trimmed.endsWith('!') || trimmed.endsWith('?')
    let pauseBreak = false
    if (index + 1 < segments.length) {
      const next = segments[index + 1] as SpeechSegment
      pauseBreak = next.start - (segment.start + segment.duration) >= Thresholds.sentenceBreakPause
    }
    if (endsSentence || pauseBreak || index === segments.length - 1) flush()
  }
  flush()
  return sentences
}

/**
 * Fallback when no timings were captured: split on punctuation and distribute
 * the duration proportionally to word count. Timings are then approximate, and
 * every caller labels them as such.
 */
function sentencesWithoutTimings(
  transcript: string,
  totalDuration: number,
  totalWords: number,
): TimedSentence[] {
  const pieces = transcript
    .split(/[.!?]/)
    .map((piece) => piece.trim())
    .filter((piece) => piece.length > 0)
  if (pieces.length === 0 || totalWords === 0) return []

  const sentences: TimedSentence[] = []
  let elapsed = 0
  for (const piece of pieces) {
    const words = normalizedTokens(piece).length
    const length = totalDuration * (words / totalWords)
    sentences.push({ text: piece, start: elapsed, end: elapsed + length, wordCount: words })
    elapsed += length
  }
  return sentences
}

// MARK: - Pace

interface PaceProfile {
  variation: number
  slowest: number
  fastest: number
}

/**
 * Windowed pace analysis. This is what backs observations like "your pace
 * barely changed during the story". It comes from timings, not from any
 * judgement about the voice, and is labelled that way wherever it is shown.
 */
function paceProfile(
  segments: SpeechSegment[],
  fallbackWPM: number,
  duration: number,
): PaceProfile {
  if (duration < Thresholds.paceWindow * 2 || segments.length === 0) {
    return { variation: 0, slowest: fallbackWPM, fastest: fallbackWPM }
  }

  const windowCount = Math.ceil(duration / Thresholds.paceWindow)
  const wordsPerWindow = new Array<number>(windowCount).fill(0)

  for (const segment of segments) {
    const words = normalizedTokens(segment.text).length
    if (words === 0) continue
    // Spread a segment's words across the windows it spans.
    const spanStart = segment.start
    const spanEnd = Math.max(segment.start + segment.duration, segment.start + 0.01)
    const span = spanEnd - spanStart
    for (let window = 0; window < windowCount; window += 1) {
      const windowStart = window * Thresholds.paceWindow
      const windowEnd = windowStart + Thresholds.paceWindow
      const overlap = Math.min(spanEnd, windowEnd) - Math.max(spanStart, windowStart)
      if (overlap > 0) {
        wordsPerWindow[window] = (wordsPerWindow[window] ?? 0) + words * (overlap / span)
      }
    }
  }

  const rates: number[] = []
  for (let window = 0; window < windowCount; window += 1) {
    const windowStart = window * Thresholds.paceWindow
    const seconds = Math.min(Thresholds.paceWindow, duration - windowStart)
    const words = wordsPerWindow[window] ?? 0
    // Ignore stub windows and windows with no speech: a silent tail would
    // otherwise read as a dramatic pace change.
    if (seconds < 3 || words < 1) continue
    rates.push(words / (seconds / 60))
  }

  if (rates.length < 2) {
    return { variation: 0, slowest: fallbackWPM, fastest: fallbackWPM }
  }

  const mean = rates.reduce((total, value) => total + value, 0) / rates.length
  if (mean <= 0) {
    return { variation: 0, slowest: fallbackWPM, fastest: fallbackWPM }
  }
  const variance =
    rates.reduce((total, value) => total + (value - mean) ** 2, 0) / rates.length
  return {
    variation: Math.sqrt(variance) / mean,
    slowest: Math.min(...rates),
    fastest: Math.max(...rates),
  }
}
