// Tokenising shared by every analysis path.
//
// Ported from SpeechMetricsCalculator.normalizedTokens / splitSentences so the
// web and iOS clients count the same words in the same way. If these two drift,
// every downstream metric drifts with them.

const WORD_CHARACTER = /[\p{L}\p{N}]/u

function trimApostrophes(word: string): string {
  let start = 0
  let end = word.length
  while (start < end && word[start] === "'") start += 1
  while (end > start && word[end - 1] === "'") end -= 1
  return word.slice(start, end)
}

/**
 * Lowercased words with punctuation stripped. Apostrophes are kept inside a
 * word so "don't" stays one token rather than becoming "don" and "t".
 */
export function normalizedTokens(text: string): string[] {
  const tokens: string[] = []
  let current = ''
  for (const character of text.toLowerCase()) {
    if (WORD_CHARACTER.test(character) || character === "'" || character === '’') {
      current += character === '’' ? "'" : character
    } else {
      if (current.length > 0) tokens.push(trimApostrophes(current))
      current = ''
    }
  }
  if (current.length > 0) tokens.push(trimApostrophes(current))
  return tokens.filter((token) => token.length > 0)
}

/** A token plus where it sits in the original string, for highlighting. */
export interface PositionedToken {
  token: string
  start: number
  end: number
}

export function tokensWithPositions(text: string): PositionedToken[] {
  const tokens: PositionedToken[] = []
  let current = ''
  let start = -1

  const flush = (end: number) => {
    if (start >= 0 && current.length > 0) {
      const normalized = trimApostrophes(current.toLowerCase())
      if (normalized.length > 0) tokens.push({ token: normalized, start, end })
    }
    current = ''
    start = -1
  }

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index] as string
    if (WORD_CHARACTER.test(character) || character === "'" || character === '’') {
      if (start < 0) start = index
      current += character === '’' ? "'" : character
    } else {
      flush(index)
    }
  }
  flush(text.length)
  return tokens
}

/** Splits on sentence-ending punctuation, keeping the punctuation attached. */
export function splitSentences(text: string): string[] {
  const sentences: string[] = []
  let current = ''
  for (const character of text) {
    current += character
    if (character === '.' || character === '!' || character === '?') {
      const trimmed = current.trim()
      if (trimmed.length > 0) sentences.push(trimmed)
      current = ''
    }
  }
  const trimmed = current.trim()
  if (trimmed.length > 0) sentences.push(trimmed)
  return sentences
}

export function arraysEqual(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false
  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) return false
  }
  return true
}
