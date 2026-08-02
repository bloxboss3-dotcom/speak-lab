import { normalizedTokens, tokensWithPositions } from './text'
import type { TimedSentence } from './types'

/**
 * Checks that model-supplied quotes actually come from the transcript.
 *
 * A coach who misquotes you loses your trust permanently, and a model allowed
 * to paraphrase evidence will eventually invent it. Quotes that fail this check
 * are still shown, but they are visibly marked as paraphrase and lose their
 * "jump to this moment" affordance.
 *
 * Ported from ios/SpeakLab/Core/Coaching/TranscriptGrounding.swift.
 */

export interface GroundingResult {
  verified: boolean
  /** 0…1 overlap between the quote and the best-matching span of transcript. */
  similarity: number
  /** Character offsets into the original transcript, for highlighting. */
  matchedRange?: { start: number; end: number }
  matchedText?: string
}

export const UNVERIFIED: GroundingResult = { verified: false, similarity: 0 }

/**
 * Set below 1.0 because recognisers punctuate inconsistently and models tidy
 * up filler words when they quote.
 */
export const VERIFICATION_THRESHOLD = 0.75

export function verifyQuote(quote: string, transcript: string): GroundingResult {
  const quoteTokens = normalizedTokens(quote)
  if (quoteTokens.length === 0) return UNVERIFIED

  const transcriptTokens = tokensWithPositions(transcript)
  if (transcriptTokens.length === 0) return UNVERIFIED

  // Exact contiguous match.
  if (quoteTokens.length <= transcriptTokens.length) {
    for (let start = 0; start + quoteTokens.length <= transcriptTokens.length; start += 1) {
      const window = transcriptTokens.slice(start, start + quoteTokens.length)
      if (window.every((entry, offset) => entry.token === quoteTokens[offset])) {
        const first = window[0]
        const last = window[window.length - 1]
        if (!first || !last) break
        const range = { start: first.start, end: last.end }
        return {
          verified: true,
          similarity: 1,
          matchedRange: range,
          matchedText: transcript.slice(range.start, range.end),
        }
      }
    }
  }

  // Best fuzzy window. Handles tidied filler words and light rewording.
  const windowSize = Math.min(quoteTokens.length, transcriptTokens.length)
  let bestScore = 0
  let bestRange: { start: number; end: number } | undefined

  const quoteCounts = new Map<string, number>()
  for (const token of quoteTokens) quoteCounts.set(token, (quoteCounts.get(token) ?? 0) + 1)

  for (let start = 0; start + windowSize <= transcriptTokens.length; start += 1) {
    const window = transcriptTokens.slice(start, start + windowSize)
    const remaining = new Map(quoteCounts)
    let matched = 0
    for (const entry of window) {
      const count = remaining.get(entry.token) ?? 0
      if (count > 0) {
        remaining.set(entry.token, count - 1)
        matched += 1
      }
    }
    const score = matched / quoteTokens.length
    if (score > bestScore) {
      bestScore = score
      const first = window[0]
      const last = window[window.length - 1]
      if (first && last) bestRange = { start: first.start, end: last.end }
    }
    if (bestScore >= 1) break
  }

  const verified = bestScore >= VERIFICATION_THRESHOLD
  const result: GroundingResult = { verified, similarity: bestScore }
  if (verified && bestRange) {
    result.matchedRange = bestRange
    result.matchedText = transcript.slice(bestRange.start, bestRange.end)
  }
  return result
}

/** The sentence a quote came from, so the UI can point at that second. */
export function locateQuote(quote: string, sentences: TimedSentence[]): TimedSentence | undefined {
  const quoteTokens = new Set(normalizedTokens(quote))
  if (quoteTokens.size === 0) return undefined

  let best: { sentence: TimedSentence; score: number } | undefined
  for (const sentence of sentences) {
    const sentenceTokens = new Set(normalizedTokens(sentence.text))
    if (sentenceTokens.size === 0) continue
    let shared = 0
    for (const token of quoteTokens) if (sentenceTokens.has(token)) shared += 1
    const overlap = shared / quoteTokens.size
    if (overlap > (best?.score ?? 0)) best = { sentence, score: overlap }
  }
  if (!best || best.score < 0.5) return undefined
  return best.sentence
}
