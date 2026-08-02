import { describe, expect, it } from 'vitest'
import {
  computeConversationMetrics,
  detectQuestions,
  estimatedSpeechDuration,
} from './conversationMetrics'
import type { ConversationTurn, SpeechSegment } from './types'

// Mirrors Tests/SpeakLabCoreTests/ConversationMetricsTests.swift.

let nextID = 0
function turn(
  speaker: 'user' | 'character',
  text: string,
  duration: number,
  segments: SpeechSegment[] = [],
): ConversationTurn {
  nextID += 1
  return {
    id: `turn-${nextID}`,
    speaker,
    text,
    duration,
    durationIsEstimated: speaker === 'character',
    segments,
  }
}

describe('question detection', () => {
  it('classifies open questions', () => {
    const questions = detectQuestions('What matters most to you here?', 0)
    expect(questions).toHaveLength(1)
    expect(questions[0]?.kind).toBe('open')
  })

  it('classifies closed questions', () => {
    const questions = detectQuestions('Do you want to book it?', 0)
    expect(questions[0]?.kind).toBe('closed')
  })

  it('classifies clarifying questions ahead of closed ones', () => {
    const questions = detectQuestions("So you're saying the timing is the problem?", 0)
    expect(questions[0]?.kind).toBe('clarifying')
  })

  it('still detects a question with no question mark', () => {
    const questions = detectQuestions('What would make this work for you', 0)
    expect(questions).toHaveLength(1)
    expect(questions[0]?.kind).toBe('open')
  })

  it('does not count statements as questions', () => {
    expect(detectQuestions('That sounds difficult. I understand.', 0)).toHaveLength(0)
  })
})

describe('conversation metrics', () => {
  it('counts turns per speaker', () => {
    const metrics = computeConversationMetrics([
      turn('character', 'Hello.', 2),
      turn('user', 'Hi there.', 2),
      turn('character', 'And?', 1),
    ])
    expect(metrics.turnCount).toBe(3)
    expect(metrics.userTurnCount).toBe(1)
    expect(metrics.characterTurnCount).toBe(2)
  })

  it('counts a turn with several questions as stacked', () => {
    const metrics = computeConversationMetrics([
      turn('user', 'What worries you? Is it the cost? Should we look at times?', 8),
    ])
    expect(metrics.stackedQuestionTurns).toBe(1)
    expect(metrics.questions.length).toBeGreaterThan(1)
  })

  it('derives talk share from measured and estimated time', () => {
    const metrics = computeConversationMetrics([
      turn('user', 'a b c', 30),
      turn('character', 'd e f', 10),
    ])
    expect(metrics.userTalkShare).toBeCloseTo(0.75, 5)
  })

  it('counts acknowledgment phrases', () => {
    const metrics = computeConversationMetrics([
      turn('user', "That makes sense. I hear you, and I can see why that lands badly.", 6),
    ])
    expect(metrics.acknowledgmentCount).toBe(3)
  })

  it('never claims interruptions were measured', () => {
    const metrics = computeConversationMetrics([turn('user', 'anything', 1)])
    expect(metrics.interruptionsMeasurable).toBe(false)
  })

  it('aggregates the learner speech across turns with rebased timings', () => {
    const metrics = computeConversationMetrics([
      turn('user', 'um first turn', 5, [{ text: 'um first turn', start: 0, duration: 3 }]),
      turn('character', 'reply', 4),
      turn('user', 'um second turn', 5, [{ text: 'um second turn', start: 0, duration: 3 }]),
    ])
    expect(metrics.userSpeech.wordCount).toBe(6)
    expect(metrics.userSpeech.fillerCount).toBe(2)
    // Second turn's segment is rebased past the first turn's duration.
    expect(metrics.userSpeech.totalDuration).toBeCloseTo(10, 5)
  })

  it('produces zeroed metrics for an empty conversation', () => {
    const metrics = computeConversationMetrics([])
    expect(metrics.turnCount).toBe(0)
    expect(metrics.userTalkShare).toBe(0)
    expect(metrics.averageUserTurnWords).toBe(0)
    expect(metrics.longestUserTurnWords).toBe(0)
  })
})

describe('estimated speech duration', () => {
  it('lands near 150 words per minute', () => {
    expect(estimatedSpeechDuration(150)).toBeCloseTo(60, 5)
    expect(estimatedSpeechDuration(0)).toBe(0)
  })
})
