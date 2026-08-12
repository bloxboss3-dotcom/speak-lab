import { containsAny, ngrams, opening, sentences, tokens, wordCount } from '@/lib/text'
import { TECHNIQUES, technique } from '@/content/techniques'
import type { DetectedTechnique, Technique, TechniqueTell } from '@/lib/types'

/**
 * The offline evaluator.
 *
 * This exists so the app is genuinely usable with no API key — not as a stub
 * that returns a plausible number, but as a real analysis. Every check below
 * corresponds to a property the transcript either has or does not have, which
 * is why it can also drive Field Test detection: if a technique's markers are
 * present in something the learner said unprompted, that is evidence, and if
 * they are absent, no amount of enthusiasm substitutes.
 *
 * It is deliberately stingy. A generous detector would hand out the app's
 * biggest reward for nothing, and the learner would stop believing it within a
 * week.
 */

// ---------------------------------------------------------------- Lexicons

const EMOTIONS = [
  'embarrassed', 'embarrassing', 'ashamed', 'humiliated', 'frustrated', 'frustrating',
  'angry', 'furious', 'upset', 'disappointed', 'discouraged', 'scared', 'afraid',
  'frightened', 'nervous', 'anxious', 'worried', 'sad', 'hurt', 'lonely', 'proud',
  'relieved', 'exhausted', 'overwhelmed', 'gutted', 'devastated', 'annoyed',
]

/** Physical, countable, in-the-room things. Abstractions are excluded on purpose. */
const CONCRETE = [
  'mat', 'mats', 'belt', 'belts', 'board', 'boards', 'floor', 'door', 'room', 'hall',
  'line', 'bag', 'bags', 'water', 'bottle', 'bottles', 'bench', 'shoes', 'hand', 'hands',
  'foot', 'feet', 'toe', 'knee', 'shoulder', 'shoulders', 'head', 'eyes', 'clock',
  'sheet', 'desk', 'car', 'phone', 'seat', 'chair', 'wall', 'stripe', 'certificate',
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
  'morning', 'tonight', 'week', 'weeks', 'month', 'months', 'minute', 'minutes',
  'second', 'seconds', 'kick', 'kicks', 'stance', 'guard', 'pattern', 'grading',
  'class', 'session', 'round', 'drill',
]

const CONCESSIONS = [
  'that is fair', "that's fair", 'fair enough', 'you are right', "you're right",
  'i can see why', 'i understand why', 'i get why', 'you are going to think',
  "you're going to think", 'you might think', 'you probably think', 'i know it looks',
  'that would be a fair', 'you have no way', "you've got no way", 'i would think that too',
]

const ANALOGIES = [
  'like ', 'as if', 'imagine', 'think of it as', 'it is the same as', "it's the same as",
  'the same way', 'is basically', 'picture ',
]

const ANTITHESIS = [
  ' but ', ' not ', 'instead of', 'rather than', 'is not', "isn't", 'was not',
  "wasn't", 'never ', 'no longer', 'used to', 'right now', 'these days',
]

/**
 * Times that make an instruction concrete. Bare temporal words like "today" are
 * deliberately absent — "proud of the effort in the room today" is not a call
 * to action, and treating it as one handed out credit for ordinary praise.
 */
const CTA_TIMES = [
  'before you leave', 'before you go', 'on the way out', 'on your way',
  'next class', 'next session', 'when you get home', 'by friday', 'this week',
  'first thing', 'tomorrow morning',
]

/** Phrases that carry an instruction without an imperative verb in front. */
const DIRECTIVES = [
  'i want you to', 'i need you to', 'make sure you', 'your job is', 'you need to',
  'what i want', 'here is what', "here's what", 'from now on',
]

const IMPERATIVE_STARTS = [
  'go', 'do', 'take', 'pick', 'tell', 'say', 'write', 'ask', 'find', 'start', 'stop',
  'run', 'try', 'come', 'bring', 'put', 'keep', 'give', 'show', 'call', 'text', 'stand',
  'sign', 'choose', 'practise', 'practice', 'remember', 'look', 'listen', 'finish',
]

const PAST_VERBS = [
  'was', 'were', 'had', 'did', 'went', 'came', 'said', 'told', 'saw', 'broke', 'fell',
  'stood', 'walked', 'stopped', 'started', 'trained', 'failed', 'passed', 'lost', 'won',
  'got', 'took', 'made', 'found', 'left', 'turned', 'looked', 'remember', 'remembered',
]

// ---------------------------------------------------------------- Detectors

export interface TellResult {
  tell: TechniqueTell
  label: string
  passed: boolean
  /** 0–1. Partial credit where the check has a natural gradient. */
  strength: number
  /** Quoted from the transcript when the check found something. */
  evidence?: string
}

export function checkTell(tell: TechniqueTell, text: string): TellResult {
  const list = sentences(text)
  const base = { tell, passed: false, strength: 0 } as TellResult

  switch (tell.kind) {
    case 'anaphora': {
      const groups = new Map<string, string[]>()
      for (const sentence of list) {
        for (const size of [2, 3]) {
          const head = opening(sentence, size)
          if (wordCount(head) < size) continue
          const key = `${size}:${head}`
          groups.set(key, [...(groups.get(key) ?? []), sentence])
        }
      }
      let best: string[] = []
      for (const group of groups.values()) if (group.length > best.length) best = group
      const passed = best.length >= tell.minRepeats
      return {
        ...base,
        label: `Repeated opening ×${best.length}`,
        passed,
        strength: Math.min(1, best.length / tell.minRepeats),
        ...(best[0] ? { evidence: best[0] } : {}),
      }
    }

    case 'antithesis': {
      const hit = list.find((sentence) => containsAny(sentence, ANTITHESIS))
      return {
        ...base,
        label: 'Something set against something else',
        passed: Boolean(hit),
        strength: hit ? 1 : 0,
        ...(hit ? { evidence: hit } : {}),
      }
    }

    case 'escalation': {
      // Within the repeated-opening group, do the units grow?
      const groups = new Map<string, string[]>()
      for (const sentence of list) {
        const head = opening(sentence, 3)
        if (wordCount(head) < 3) continue
        groups.set(head, [...(groups.get(head) ?? []), sentence])
      }
      let best: string[] = []
      for (const group of groups.values()) if (group.length > best.length) best = group

      if (best.length >= 2) {
        // A refrain climbs either by growing across its repetitions or by
        // landing on a payoff line bigger than any of them. Either counts.
        const lengths = best.map(wordCount)
        const mean = lengths.reduce((sum, value) => sum + value, 0) / lengths.length
        const grewInside = (lengths[lengths.length - 1] ?? 0) > (lengths[0] ?? 0)

        const lastMember = best[best.length - 1] as string
        const payoff = list.slice(list.indexOf(lastMember) + 1)
        const biggestPayoff = payoff.reduce(
          (longest, sentence) => Math.max(longest, wordCount(sentence)),
          0,
        )
        const landed = biggestPayoff > mean

        const passed = grewInside || landed
        const evidence = landed ? payoff[payoff.length - 1] : lastMember
        return {
          ...base,
          label: landed ? 'Breaks the pattern on the biggest line' : 'Stakes climb across the repetitions',
          passed,
          strength: passed ? 1 : 0,
          ...(evidence ? { evidence } : {}),
        }
      }

      // No refrain to measure: does the passage build toward its end at all?
      if (list.length < 3) return { ...base, label: 'Stakes climb', passed: false, strength: 0 }
      const third = Math.max(1, Math.floor(list.length / 3))
      const average = (group: string[]) =>
        group.reduce((sum, sentence) => sum + wordCount(sentence), 0) / Math.max(1, group.length)
      const opened = average(list.slice(0, third))
      const closed = average(list.slice(-third))
      const grew = closed > opened
      return {
        ...base,
        label: 'Builds toward the end',
        passed: grew,
        strength: grew ? Math.min(1, (closed - opened) / Math.max(4, opened)) : 0,
        ...(grew ? { evidence: list[list.length - 1] as string } : {}),
      }
    }

    case 'narrative-open': {
      const head = list.slice(0, 2).join(' ')
      const words = tokens(head)
      const firstPerson = words.includes('i') || words.includes('we') || words.includes('he') || words.includes('she')
      const pastTense = words.some((word) => PAST_VERBS.includes(word) || /ed$/.test(word))
      const passed = firstPerson && pastTense
      return {
        ...base,
        label: 'Opens inside a scene',
        passed,
        strength: passed ? 1 : 0,
        ...(passed && list[0] ? { evidence: list[0] } : {}),
      }
    }

    case 'question': {
      const asked = list.filter((sentence) => sentence.includes('?'))
      return {
        ...base,
        label: `Asked ${asked.length} question${asked.length === 1 ? '' : 's'}`,
        passed: asked.length >= tell.min,
        strength: Math.min(1, asked.length / Math.max(1, tell.min)),
        ...(asked[0] ? { evidence: asked[0] } : {}),
      }
    }

    case 'call-to-action': {
      // An instruction is required. A time on its own is context, not an ask —
      // it only strengthens a sentence that already tells someone to do something.
      const tail = list.slice(Math.max(0, list.length - 3))
      const hit = tail.find((sentence) => {
        const first = tokens(sentence)[0] ?? ''
        const imperative = IMPERATIVE_STARTS.includes(first)
        const directive = containsAny(sentence, DIRECTIVES)
        const timed = containsAny(sentence, CTA_TIMES)
        return imperative || directive || timed
      })
      return {
        ...base,
        label: 'Ends with something to actually do',
        passed: Boolean(hit),
        strength: hit ? 1 : 0,
        ...(hit ? { evidence: hit } : {}),
      }
    }

    case 'concrete-nouns': {
      const words = tokens(text)
      const found = words.filter((word) => CONCRETE.includes(word) || /^\d+$/.test(word))
      const unique = new Set(found).size
      return {
        ...base,
        label: `${unique} concrete detail${unique === 1 ? '' : 's'}`,
        passed: unique >= tell.min,
        strength: Math.min(1, unique / Math.max(1, tell.min)),
      }
    }

    case 'concession': {
      const hit = list.find((sentence) => containsAny(sentence, CONCESSIONS))
      return {
        ...base,
        label: 'Conceded something before disagreeing',
        passed: Boolean(hit),
        strength: hit ? 1 : 0,
        ...(hit ? { evidence: hit } : {}),
      }
    }

    case 'analogy': {
      const hit = list.find((sentence) => containsAny(sentence, ANALOGIES))
      return {
        ...base,
        label: 'Carried the idea on a comparison',
        passed: Boolean(hit),
        strength: hit ? 1 : 0,
        ...(hit ? { evidence: hit } : {}),
      }
    }

    case 'emotion-named': {
      const hit = list.find((sentence) => tokens(sentence).some((word) => EMOTIONS.includes(word)))
      return {
        ...base,
        label: 'Named the feeling out loud',
        passed: Boolean(hit),
        strength: hit ? 1 : 0,
        ...(hit ? { evidence: hit } : {}),
      }
    }

    case 'short-close': {
      const last = list[list.length - 1]
      if (!last) return { ...base, label: 'Lands on a short line', passed: false, strength: 0 }
      const count = wordCount(last)
      const passed = count <= tell.maxWords
      return {
        ...base,
        label: `Closing line is ${count} words`,
        passed,
        strength: passed ? 1 : Math.max(0, 1 - (count - tell.maxWords) / tell.maxWords),
        evidence: last,
      }
    }

    case 'callback': {
      const all = tokens(text)
      if (all.length < 24) return { ...base, label: 'Returns to an earlier line', passed: false, strength: 0 }
      const cut = Math.floor(all.length * 0.3)
      const head = all.slice(0, cut).join(' ')
      const tail = all.slice(Math.floor(all.length * 0.65)).join(' ')
      const shared = ngrams(head, 4).find((gram) => tail.includes(gram))
      return {
        ...base,
        label: 'Returns to an earlier line',
        passed: Boolean(shared),
        strength: shared ? 1 : 0,
        ...(shared ? { evidence: shared } : {}),
      }
    }

    case 'phrases': {
      if (tell.any.length === 0) {
        // A tell with no phrases is a readability check on sentence length.
        const lengths = list.map(wordCount).filter((n) => n > 0)
        const average = lengths.length ? lengths.reduce((a, b) => a + b, 0) / lengths.length : 0
        const passed = average > 0 && average <= 16
        return {
          ...base,
          label: `Average sentence ${Math.round(average)} words`,
          passed,
          strength: passed ? 1 : Math.max(0, 1 - (average - 16) / 16),
        }
      }
      const hit = list.find((sentence) => containsAny(sentence, tell.any))
      return {
        ...base,
        label: tell.label,
        passed: Boolean(hit),
        strength: hit ? 1 : 0,
        ...(hit ? { evidence: hit } : {}),
      }
    }
  }
}

// ---------------------------------------------------------------- Scoring

/**
 * The most the offline evaluator will award.
 *
 * It can tell whether a pattern is present; it cannot tell whether the words
 * were any good. Handing out full marks for "all the markers were there" would
 * teach the learner to satisfy a checklist, so the top band is reserved for
 * coaching that has actually read the response.
 */
export const OFFLINE_CEILING = 90

export interface HeuristicResult {
  score: number
  results: TellResult[]
  strongestLine: string
}

/**
 * Scores a transcript against one technique.
 *
 * The floor is deliberately low and the ceiling is deliberately reachable: this
 * measures whether the pattern is present, not whether the speech was good, and
 * saying so plainly is more useful than a number that pretends to more.
 */
export function scoreTechnique(target: Technique, transcript: string): HeuristicResult {
  const results = target.tells.map((tell) => checkTell(tell, transcript))
  const words = wordCount(transcript)

  if (words < 12) {
    return { score: 0, results, strongestLine: '' }
  }

  const total = results.reduce((sum, result) => sum + result.strength, 0)
  const raw = results.length > 0 ? total / results.length : 0

  // Very short answers cannot demonstrate structure, so cap them rather than
  // rewarding a single lucky marker.
  const lengthCap = words < 35 ? 0.6 : 1
  const score = Math.round(Math.min(1, raw) * lengthCap * OFFLINE_CEILING)

  return { score, results, strongestLine: strongestLine(transcript) }
}

/**
 * Picks the most quotable sentence, verbatim.
 *
 * Never paraphrases: the line shown back to the learner has to be something
 * they actually said, or the whole "strongest line" feature is flattery.
 */
export function strongestLine(transcript: string): string {
  const list = sentences(transcript).filter((sentence) => wordCount(sentence) >= 4)
  if (list.length === 0) return ''

  let best = list[0] as string
  let bestScore = -Infinity

  list.forEach((sentence, index) => {
    const words = wordCount(sentence)
    // Quotable lines are short but not fragments, land late, and contain
    // something concrete or a turn.
    let value = 0
    value += words >= 6 && words <= 20 ? 2 : words <= 28 ? 1 : 0
    value += index >= list.length - 2 ? 1.5 : 0
    value += containsAny(sentence, ANTITHESIS) ? 1 : 0
    const concrete = tokens(sentence).filter((word) => CONCRETE.includes(word)).length
    value += Math.min(1.5, concrete * 0.5)
    value -= sentence.includes('?') ? 0.5 : 0
    if (value > bestScore) {
      bestScore = value
      best = sentence
    }
  })

  return best
}

// ---------------------------------------------------------------- Detection

/** Two independent markers before the app will claim an unprompted retrieval. */
export const MIN_MARKERS_FOR_DETECTION = 2

/**
 * Looks for techniques the learner used without being told to.
 *
 * Only techniques they have actually been taught are considered, and the bar is
 * high — a technique must show essentially all of its markers before this
 * claims a retrieval, because the reward attached to it is the largest in the
 * app. Confidence is reported as computed and never rounded up.
 */
export function detectTechniques(
  transcript: string,
  candidateIds: string[],
  options: { minConfidence?: number } = {},
): DetectedTechnique[] {
  const minConfidence = options.minConfidence ?? 0.72
  const found: DetectedTechnique[] = []

  for (const id of candidateIds) {
    const entry = technique(id)
    if (!entry) continue
    const results = entry.tells.map((tell) => checkTell(tell, transcript))
    if (results.length === 0) continue

    const passedCount = results.filter((result) => result.passed).length
    const confidence = passedCount / results.length

    // A single generic marker is not a technique. Two independent markers is
    // the floor for claiming a retrieval, which means techniques whose only
    // text-visible signature is one property — a short closing line, a pause —
    // are never claimed unprompted. That is correct: there is no honest way to
    // tell a deliberate Beat from a sentence that happened to be short. They
    // are still scored normally when the learner was asked to use them.
    if (passedCount < MIN_MARKERS_FOR_DETECTION) continue

    // Beyond the floor, require every marker for two-tell techniques and
    // all-but-one for richer ones.
    const required = results.length <= 2 ? results.length : results.length - 1
    if (passedCount < required || confidence < minConfidence) continue

    const evidence = results.find((result) => result.passed && result.evidence)?.evidence
    found.push({
      techniqueId: id,
      confidence: Number(confidence.toFixed(2)),
      appropriateUse: true,
      markersPresent: passedCount,
      markersTotal: results.length,
      ...(evidence ? { evidence } : {}),
    })
  }

  return found.sort((a, b) => b.confidence - a.confidence)
}

/** Techniques whose markers suit a given scenario, for Speech Gym suggestions. */
export function recommendTechniques(
  need: string,
  situation: string,
  belief: string,
  action: string,
  availableIds: string[],
  limit = 4,
): string[] {
  const text = `${need} ${situation} ${belief} ${action}`.toLowerCase()
  const pool = availableIds.length > 0 ? availableIds : TECHNIQUES.map((entry) => entry.id)

  const wants = (words: string[]) => words.some((word) => text.includes(word))
  const scored = pool
    .map((id) => technique(id))
    .filter((entry): entry is Technique => Boolean(entry))
    .map((entry) => {
      let value = 0
      if (wants(['motivat', 'tired', 'effort', 'quit', 'give up']) && entry.branch === 'motivation') value += 3
      if (wants(['explain', 'teach', 'understand', 'concept']) && entry.branch === 'teaching') value += 3
      if (wants(['angry', 'upset', 'difficult', 'sensitive', 'failed']) && entry.branch === 'emotional-connection') value += 3
      if (wants(['convince', 'persuade', 'disagree', 'objection', 'parent']) && entry.branch === 'persuasion') value += 3
      if (wants(['team', 'leader', 'staff', 'instructor']) && entry.branch === 'leadership') value += 3
      if (wants(['story', 'speech', 'keynote', 'talk']) && entry.branch === 'storytelling') value += 2
      // Every talk needs an opening and a close.
      if (entry.category === 'openings' || entry.category === 'closings') value += 2
      return { id: entry.id, value }
    })
    .sort((a, b) => b.value - a.value)

  return scored.slice(0, limit).map((entry) => entry.id)
}
