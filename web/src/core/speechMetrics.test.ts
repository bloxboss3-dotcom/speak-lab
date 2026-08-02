import { describe, expect, it } from 'vitest'
import { computeSpeakingMetrics, repeatedPhrases } from './speechMetrics'
import { normalizedTokens } from './text'
import type { SpeechSegment } from './types'

// Mirrors Tests/SpeakLabCoreTests/SpeechMetricsTests.swift. Both suites run the
// same algorithm, so a divergence between clients shows up as a failure here.

function segment(text: string, start: number, duration: number): SpeechSegment {
  return { text, start, duration }
}

/** Evenly spaced one-word segments, for building predictable timings. */
function evenSegments(words: string[], secondsPerWord: number, from = 0): SpeechSegment[] {
  return words.map((word, index) => segment(word, from + index * secondsPerWord, secondsPerWord))
}

describe('pace', () => {
  it('computes words per minute over the whole recording', () => {
    const metrics = computeSpeakingMetrics({
      transcript: Array(60).fill('word').join(' '),
      totalDuration: 30,
    })
    expect(metrics.wordCount).toBe(60)
    expect(metrics.wordsPerMinute).toBeCloseTo(120, 5)
  })

  it('excludes long pauses from the articulation rate', () => {
    const segments = [segment('one two three', 0, 3), segment('four five six', 8, 3)]
    const metrics = computeSpeakingMetrics({
      transcript: 'one two three four five six',
      segments,
      totalDuration: 11,
    })
    // Six words over 11s is ~33 wpm; while actually speaking it is far higher.
    expect(metrics.articulationRate).toBeGreaterThan(metrics.wordsPerMinute)
    expect(metrics.speakingDuration).toBeLessThan(metrics.totalDuration)
  })

  it('reports even delivery as low pace variation', () => {
    const metrics = computeSpeakingMetrics({
      transcript: Array(80).fill('word').join(' '),
      segments: evenSegments(Array(80).fill('word'), 0.5),
      totalDuration: 40,
    })
    expect(metrics.paceVariation).toBeLessThan(0.05)
  })

  it('reports varied delivery as higher pace variation', () => {
    // Dense first ten seconds, sparse afterwards.
    const fast = evenSegments(Array(40).fill('word'), 0.25, 0)
    const slow = evenSegments(Array(10).fill('word'), 1.0, 10)
    const metrics = computeSpeakingMetrics({
      transcript: Array(50).fill('word').join(' '),
      segments: [...fast, ...slow],
      totalDuration: 40,
    })
    expect(metrics.paceVariation).toBeGreaterThan(0.15)
    expect(metrics.fastestWindowWPM).toBeGreaterThan(metrics.slowestWindowWPM)
  })
})

describe('tokenising', () => {
  it('keeps apostrophes inside words', () => {
    expect(normalizedTokens("don't stop — it's fine")).toEqual(['don\'t', 'stop', 'it\'s', 'fine'])
  })

  it('treats a typographic apostrophe as a plain one', () => {
    expect(normalizedTokens('it’s')).toEqual(["it's"])
  })
})

describe('fillers', () => {
  it('counts hard fillers', () => {
    const metrics = computeSpeakingMetrics({
      transcript: 'um so uh we should um go',
      totalDuration: 10,
    })
    expect(metrics.fillerCount).toBe(3)
    expect(metrics.fillers[0]).toEqual({ token: 'um', count: 2 })
  })

  it('counts multi-word fillers without double counting the shorter form', () => {
    const metrics = computeSpeakingMetrics({
      transcript: 'you know what i mean the thing is you know',
      totalDuration: 10,
    })
    const tokens = metrics.fillers.map((hit) => hit.token)
    expect(tokens).toContain('you know what i mean')
    expect(metrics.fillers.find((hit) => hit.token === 'you know')?.count).toBe(1)
  })

  it('reports hedges separately from fillers', () => {
    const metrics = computeSpeakingMetrics({
      transcript: 'i just actually think this is basically fine',
      totalDuration: 10,
    })
    expect(metrics.fillerCount).toBe(0)
    expect(metrics.hedgeCount).toBe(3)
  })

  it('expresses filler rate per hundred words', () => {
    const words = [...Array(97).fill('word'), 'um', 'um', 'um']
    const metrics = computeSpeakingMetrics({ transcript: words.join(' '), totalDuration: 60 })
    expect(metrics.wordCount).toBe(100)
    expect(metrics.fillerRate).toBeCloseTo(3, 5)
  })
})

describe('repetition', () => {
  it('detects a repeated phrase', () => {
    const tokens = normalizedTokens(
      'at the end of the day we ship at the end of the day we learn',
    )
    const phrases = repeatedPhrases(tokens)
    expect(phrases[0]?.phrase).toContain('at the end of the day')
    expect(phrases[0]?.count).toBe(2)
  })

  it('does not also report a shorter phrase subsumed by a longer one', () => {
    const tokens = normalizedTokens(
      'at the end of the day we ship at the end of the day we learn',
    )
    const phrases = repeatedPhrases(tokens)
    const shorter = phrases.filter((phrase) => phrase.phrase === 'the end of')
    expect(shorter).toHaveLength(0)
  })

  it('finds no repetition in short distinct speech', () => {
    expect(repeatedPhrases(normalizedTokens('one two three four five six'))).toEqual([])
  })
})

describe('pauses', () => {
  it('detects long pauses between segments', () => {
    const metrics = computeSpeakingMetrics({
      transcript: 'first part second part',
      segments: [segment('first part', 0, 2), segment('second part', 5, 2)],
      totalDuration: 7,
    })
    expect(metrics.longPauses).toHaveLength(1)
    expect(metrics.longPauses[0]?.duration).toBeCloseTo(3, 5)
    expect(metrics.longestPause).toBeCloseTo(3, 5)
  })

  it('ignores short gaps', () => {
    const metrics = computeSpeakingMetrics({
      transcript: 'first second',
      segments: [segment('first', 0, 1), segment('second', 1.4, 1)],
      totalDuration: 2.4,
    })
    expect(metrics.longPauses).toHaveLength(0)
  })

  it('measures the silence before the first word', () => {
    const metrics = computeSpeakingMetrics({
      transcript: 'hello there',
      segments: [segment('hello there', 2.5, 1.5)],
      totalDuration: 4,
    })
    expect(metrics.leadingSilence).toBeCloseTo(2.5, 5)
  })
})

describe('sentences', () => {
  it('splits on punctuation', () => {
    const metrics = computeSpeakingMetrics({
      transcript: 'First point. Second point.',
      segments: [segment('First point.', 0, 2), segment('Second point.', 2, 2)],
      totalDuration: 4,
    })
    expect(metrics.sentences).toHaveLength(2)
  })

  it('splits on a long pause when punctuation is missing', () => {
    const metrics = computeSpeakingMetrics({
      transcript: 'first point second point',
      segments: [segment('first point', 0, 2), segment('second point', 3.5, 2)],
      totalDuration: 5.5,
    })
    expect(metrics.sentences).toHaveLength(2)
  })

  it('falls back to proportional timing without segments', () => {
    const metrics = computeSpeakingMetrics({
      transcript: 'One word. Three more words here.',
      totalDuration: 10,
    })
    expect(metrics.sentences).toHaveLength(2)
    expect(metrics.sentences[0]?.start).toBe(0)
    const last = metrics.sentences[metrics.sentences.length - 1]
    expect(last?.end).toBeCloseTo(10, 5)
  })
})

describe('constraints and degradation', () => {
  it('reports time-limit compliance', () => {
    const within = computeSpeakingMetrics({
      transcript: 'a few words here',
      totalDuration: 40,
      timeLimit: 60,
    })
    const over = computeSpeakingMetrics({
      transcript: 'a few words here',
      totalDuration: 75,
      timeLimit: 60,
    })
    expect(within.withinTimeLimit).toBe(true)
    expect(over.withinTimeLimit).toBe(false)
  })

  it('leaves compliance unknown when there is no limit', () => {
    const metrics = computeSpeakingMetrics({ transcript: 'words', totalDuration: 10 })
    expect(metrics.withinTimeLimit).toBeUndefined()
    expect(metrics.timeLimit).toBeUndefined()
  })

  it('does not invent numbers for an empty transcript', () => {
    const metrics = computeSpeakingMetrics({ transcript: '   ', totalDuration: 12 })
    expect(metrics.wordCount).toBe(0)
    expect(metrics.wordsPerMinute).toBe(0)
    expect(metrics.sentences).toEqual([])
    expect(metrics.totalDuration).toBe(12)
    expect(metrics.leadingSilence).toBe(12)
  })

  it('recovers the transcript from segments when it is missing', () => {
    const metrics = computeSpeakingMetrics({
      transcript: '',
      segments: [segment('recovered', 0, 1), segment('text', 1, 1)],
      totalDuration: 2,
    })
    expect(metrics.wordCount).toBe(2)
  })

  it('extends the duration to cover the last segment', () => {
    const metrics = computeSpeakingMetrics({
      transcript: 'trailing words',
      segments: [segment('trailing words', 0, 9)],
      totalDuration: 4,
    })
    expect(metrics.totalDuration).toBeCloseTo(9, 5)
  })
})
