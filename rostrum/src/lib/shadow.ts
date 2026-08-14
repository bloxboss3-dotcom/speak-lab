import { tokens } from './text'

/**
 * Shadowing: say the line back before you try to invent one.
 *
 * Copying is a different task from composing, and it needs a different kind of
 * feedback. "How good was that" is meaningless when the words were handed to
 * you — the only honest question is whether you actually said them. So this
 * counts, and reports a count. No score, no judgement of delivery.
 */

export interface ShadowMatch {
  /** Words from the line that appeared in what was said. */
  matched: number
  total: number
  /** 0–1. Reported as a fraction on screen, never as a percentage score. */
  ratio: number
  /** Words from the line that did not turn up, in order. */
  missed: string[]
}

/** Words so common that missing one says nothing about whether they copied it. */
const FILLER = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'of', 'to', 'in', 'on', 'at', 'as',
  'so', 'it', 'that', 'this', 'for', 'with', 'from', 'by',
  // Pronouns and auxiliaries: saying "everybody has form" instead of
  // "everybody's got form" is the same copy, and should not read as a miss.
  'i', 'you', 'we', 'he', 'she', 'they', 'them', 'his', 'her', 'their', 'my', 'your',
  'is', 'are', 'was', 'were', 'am', 'be', 'been', 'has', 'have', 'had',
  'do', 'does', 'did',
  // Deliberately NOT filtered: not, no, never. Dropping one of those is not a
  // copy of the line — it is the opposite of it.
])

export function shadowMatch(said: string, target: string): ShadowMatch {
  const wanted = tokens(target).filter((word) => !FILLER.has(word))
  if (wanted.length === 0) return { matched: 0, total: 0, ratio: 1, missed: [] }

  // A multiset, so saying one word three times does not cover three misses.
  const pool = new Map<string, number>()
  for (const word of tokens(said)) pool.set(word, (pool.get(word) ?? 0) + 1)

  const missed: string[] = []
  let matched = 0
  for (const word of wanted) {
    const left = pool.get(word) ?? 0
    if (left > 0) {
      pool.set(word, left - 1)
      matched += 1
    } else {
      missed.push(word)
    }
  }

  return {
    matched,
    total: wanted.length,
    ratio: matched / wanted.length,
    missed,
  }
}

/** The bar for "you said it". Not a grade — a threshold for moving on. */
export const SHADOW_PASS = 0.7

export function shadowVerdict(match: ShadowMatch): 'close' | 'partial' | 'off' {
  if (match.ratio >= SHADOW_PASS) return 'close'
  if (match.ratio >= 0.4) return 'partial'
  return 'off'
}
