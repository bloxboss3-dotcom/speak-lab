import { describe, expect, it } from 'vitest'
import {
  CoachingDecodingError,
  decodeCharacterTurn,
  decodeComparison,
  decodeFeedback,
} from './decoder'
import { countsAsImprovement } from './types'

// Mirrors Tests/SpeakLabCoreTests/CoachingDecoderTests.swift.

const completeFeedback = JSON.stringify({
  scenarioOutcome: 'You announced Buddy Week and asked for sign-ups.',
  strengths: ['You named the date twice.', 'You said what to do next.'],
  primaryTarget: 'Get to the point in your first sentence',
  evidenceQuote: 'so basically what we wanted to talk about today',
  explanation: 'The first fourteen seconds were setup.',
  retryInstruction: 'Open with the ask.',
  optionalGoldenNugget: {
    id: 'signpost-frees-attention',
    title: 'Signposting frees their attention',
    insight: 'Telling people the shape of what is coming lets them stop guessing.',
    category: 'structure',
  },
  rubricObservations: [
    { dimension: 'opening', rating: 'needsWork', observation: 'Opening ran 31 words.' },
    { dimension: 'clarity', rating: 'strong', observation: 'No fillers.' },
  ],
  safetyFlags: [],
  transferScenario: { scenarioID: 'spk-buddy-week-noise', title: 'Noisy room', twist: 'Chatter.' },
  targetSkillID: 'bottom-line-first',
})

describe('feedback decoding', () => {
  it('decodes a complete response', () => {
    const feedback = decodeFeedback(completeFeedback)
    expect(feedback.primaryTarget).toBe('Get to the point in your first sentence')
    expect(feedback.strengths).toHaveLength(2)
    expect(feedback.rubricObservations).toHaveLength(2)
    expect(feedback.optionalGoldenNugget?.category).toBe('structure')
    expect(feedback.transferScenario?.scenarioID).toBe('spk-buddy-week-noise')
    expect(feedback.targetSkillID).toBe('bottom-line-first')
  })

  it('throws when a required field is missing', () => {
    const payload = JSON.parse(completeFeedback) as Record<string, unknown>
    delete payload['primaryTarget']
    expect(() => decodeFeedback(JSON.stringify(payload))).toThrow(CoachingDecodingError)
  })

  it('treats a whitespace-only required field as empty', () => {
    const payload = JSON.parse(completeFeedback) as Record<string, unknown>
    payload['evidenceQuote'] = '   \n '
    try {
      decodeFeedback(JSON.stringify(payload))
      expect.unreachable('expected a decoding error')
    } catch (error) {
      expect(error).toBeInstanceOf(CoachingDecodingError)
      expect((error as CoachingDecodingError).kind).toBe('emptyField')
    }
  })

  it('rejects input that is not JSON at all', () => {
    expect(() => decodeFeedback('I am afraid I cannot help with that.')).toThrow(
      CoachingDecodingError,
    )
  })

  it('recovers JSON wrapped in a markdown fence', () => {
    const fenced = '```json\n' + completeFeedback + '\n```'
    expect(decodeFeedback(fenced).primaryTarget).toBe('Get to the point in your first sentence')
  })

  it('does not truncate extraction on braces inside strings', () => {
    const payload = JSON.parse(completeFeedback) as Record<string, unknown>
    payload['explanation'] = 'You said "the {plan} is} fine" and moved on.'
    const wrapped = `Here you go:\n${JSON.stringify(payload)}\nHope that helps.`
    expect(decodeFeedback(wrapped).explanation).toContain('{plan}')
  })

  it('drops an unknown rubric dimension rather than failing the whole response', () => {
    const payload = JSON.parse(completeFeedback) as Record<string, unknown>
    payload['rubricObservations'] = [
      { dimension: 'charisma', rating: 'strong', observation: 'Not a real dimension.' },
      { dimension: 'clarity', rating: 'strong', observation: 'Real one.' },
    ]
    const feedback = decodeFeedback(JSON.stringify(payload))
    expect(feedback.rubricObservations).toHaveLength(1)
    expect(feedback.rubricObservations[0]?.dimension).toBe('clarity')
  })

  it('falls back to adequate for an unknown rating', () => {
    const payload = JSON.parse(completeFeedback) as Record<string, unknown>
    payload['rubricObservations'] = [
      { dimension: 'clarity', rating: 'excellent', observation: 'Unknown rating.' },
    ]
    expect(decodeFeedback(JSON.stringify(payload)).rubricObservations[0]?.rating).toBe('adequate')
  })

  it('collapses duplicate rubric dimensions', () => {
    const payload = JSON.parse(completeFeedback) as Record<string, unknown>
    payload['rubricObservations'] = [
      { dimension: 'clarity', rating: 'strong', observation: 'First.' },
      { dimension: 'clarity', rating: 'needsWork', observation: 'Second.' },
    ]
    const feedback = decodeFeedback(JSON.stringify(payload))
    expect(feedback.rubricObservations).toHaveLength(1)
    expect(feedback.rubricObservations[0]?.observation).toBe('First.')
  })

  it('caps strengths at three', () => {
    const payload = JSON.parse(completeFeedback) as Record<string, unknown>
    payload['strengths'] = ['one', 'two', 'three', 'four', 'five']
    expect(decodeFeedback(JSON.stringify(payload)).strengths).toHaveLength(3)
  })

  it('defaults missing optional arrays to empty', () => {
    const feedback = decodeFeedback(
      JSON.stringify({
        scenarioOutcome: 'outcome',
        primaryTarget: 'target',
        evidenceQuote: 'quote',
        explanation: 'why',
        retryInstruction: 'do this',
      }),
    )
    expect(feedback.strengths).toEqual([])
    expect(feedback.rubricObservations).toEqual([])
    expect(feedback.safetyFlags).toEqual([])
    expect(feedback.optionalGoldenNugget).toBeUndefined()
  })

  it('drops an incomplete nugget rather than half-rendering it', () => {
    const payload = JSON.parse(completeFeedback) as Record<string, unknown>
    payload['optionalGoldenNugget'] = { id: 'x', title: 'Only a title' }
    expect(decodeFeedback(JSON.stringify(payload)).optionalGoldenNugget).toBeUndefined()
  })
})

describe('comparison decoding', () => {
  const comparison = {
    targetImproved: true,
    changeWasSuperficial: false,
    summary: 'The main point arrived first this time.',
    evidenceBefore: 'so basically',
    evidenceAfter: 'buddy week starts monday',
    whatChanged: ['Opening shortened from 31 to 9 words.'],
    whatDidNotChange: ['Length was similar.'],
    nextStep: 'Try it with a harder audience.',
  }

  it('decodes a comparison', () => {
    const decoded = decodeComparison(JSON.stringify(comparison))
    expect(decoded.targetImproved).toBe(true)
    expect(countsAsImprovement(decoded)).toBe(true)
  })

  it('does not count a superficial change as improvement', () => {
    const decoded = decodeComparison(
      JSON.stringify({ ...comparison, changeWasSuperficial: true }),
    )
    expect(countsAsImprovement(decoded)).toBe(false)
  })

  it('throws when the verdict is missing', () => {
    const payload: Record<string, unknown> = { ...comparison }
    delete payload['targetImproved']
    expect(() => decodeComparison(JSON.stringify(payload))).toThrow(CoachingDecodingError)
  })
})

describe('character turn decoding', () => {
  it('decodes a turn', () => {
    const turn = decodeCharacterTurn(
      JSON.stringify({
        speech: "I'm not sure it's worth the money right now.",
        innerState: 'Testing whether they will just discount it.',
        observedMove: 'asked what mattered and waited',
        objectiveMet: false,
        objectiveMissed: false,
        shouldEnd: false,
        endReason: null,
      }),
    )
    expect(turn.speech).toContain('worth the money')
    expect(turn.observedMove).toBe('asked what mattered and waited')
    expect(turn.endReason).toBeUndefined()
  })

  it('throws without speech', () => {
    expect(() => decodeCharacterTurn(JSON.stringify({ innerState: 'thinking' }))).toThrow(
      CoachingDecodingError,
    )
  })

  it('defaults missing flags to false', () => {
    const turn = decodeCharacterTurn(JSON.stringify({ speech: 'Fine.' }))
    expect(turn.objectiveMet).toBe(false)
    expect(turn.objectiveMissed).toBe(false)
    expect(turn.shouldEnd).toBe(false)
    expect(turn.innerState).toBe('')
  })
})
