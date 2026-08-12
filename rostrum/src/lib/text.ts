/** Shared text handling. Every detector and metric goes through these. */

const WORD = /[\p{L}\p{N}]/u

export function tokens(text: string): string[] {
  const out: string[] = []
  let current = ''
  for (const character of text.toLowerCase()) {
    if (WORD.test(character) || character === "'" || character === '’') {
      current += character === '’' ? "'" : character
    } else {
      if (current) out.push(trimQuotes(current))
      current = ''
    }
  }
  if (current) out.push(trimQuotes(current))
  return out.filter(Boolean)
}

function trimQuotes(word: string): string {
  let start = 0
  let end = word.length
  while (start < end && word[start] === "'") start += 1
  while (end > start && word[end - 1] === "'") end -= 1
  return word.slice(start, end)
}

/** Splits on sentence punctuation, keeping the punctuation with the sentence. */
export function sentences(text: string): string[] {
  const out: string[] = []
  let current = ''
  for (const character of text) {
    current += character
    if (character === '.' || character === '!' || character === '?') {
      const trimmed = current.trim()
      if (trimmed) out.push(trimmed)
      current = ''
    }
  }
  const trimmed = current.trim()
  if (trimmed) out.push(trimmed)
  return out
}

export function wordCount(text: string): number {
  return tokens(text).length
}

/** Lowercased, punctuation-stripped, single-spaced — for phrase matching. */
export function normalise(text: string): string {
  return tokens(text).join(' ')
}

export function containsPhrase(text: string, phrase: string): boolean {
  const haystack = ` ${normalise(text)} `
  const needle = ` ${normalise(phrase)} `
  return haystack.includes(needle)
}

export function containsAny(text: string, phrases: readonly string[]): boolean {
  return phrases.some((phrase) => containsPhrase(text, phrase))
}

/** The first `n` tokens of a sentence, for spotting repeated openings. */
export function opening(sentence: string, n: number): string {
  return tokens(sentence).slice(0, n).join(' ')
}

/** Contiguous token runs of length `n`, used for callback detection. */
export function ngrams(text: string, n: number): string[] {
  const list = tokens(text)
  const out: string[] = []
  for (let index = 0; index + n <= list.length; index += 1) {
    out.push(list.slice(index, index + n).join(' '))
  }
  return out
}
