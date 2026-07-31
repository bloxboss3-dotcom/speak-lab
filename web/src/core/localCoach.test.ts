import { describe, expect, it } from 'vitest'
import { computeConversationMetrics } from './conversationMetrics'
import { scenario as findScenario, skill as findSkill } from './content'
import { localCompare, localConversationFeedback, localSpeakingFeedback } from './localCoach'
import { computeSpeakingMetrics } from './speechMetrics'
import { verifyQuote } from './grounding'
import type { ConversationTurn, MicroSkill, Scenario, SpeechSegment } from './types'

// Mirrors Tests/SpeakLabCoreTests/LocalFeedbackEngineTests.swift.

function requireScenario(id: string): Scenario {
  const found = findScenario(id)
  if (!found) throw new Error(`missing scenario ${id}`)
  return found
}

function requireSkill(id: string): MicroSkill {
  const found = findSkill(id)
  if (!found) throw new Error(`missing skill ${id}`)
  return found
}

const scenario = requireScenario('spk-buddy-week')
const skill = requireSkill(scenario.primarySkillID)

function segments(text: string, totalDuration: number): SpeechSegment[] {
  // One segment per sentence, spread evenly — enough for the engine's rules.
  const pieces = text.split(/(?<=[.!?])\s+/).filter((piece) => piece.length > 0)
  const each = totalDuration / Math.max(1, pieces.length)
  return pieces.map((piece, index) => ({
    text: piece,
    start: index * each,
    duration: each * 0.9,
  }))
}

describe('speaking findings', () => {
  it('puts overrunning the time limit ahead of everything else', () => {
    const transcript = 'Um so um basically um we are um doing a thing this week. Come along.'
    const metrics = computeSpeakingMetrics({
      transcript,
      segments: segments(transcript, 95),
      totalDuration: 95,
      timeLimit: 60,
    })
    const feedback = localSpeakingFeedback(scenario, skill, metrics)
    expect(feedback.primaryTarget).toBe('Finish inside the time you were given')
    expect(feedback.targetSkillID).toBe('cut-the-runway')
  })

  it('targets heavy filler use', () => {
    const transcript =
      'Um Buddy Week starts on Monday. Um bring a friend along. Um they train free. Uh that is it.'
    const metrics = computeSpeakingMetrics({
      transcript,
      segments: segments(transcript, 25),
      totalDuration: 25,
      timeLimit: 60,
    })
    const feedback = localSpeakingFeedback(scenario, skill, metrics)
    expect(feedback.primaryTarget).toBe('Replace filler words with silence')
    expect(feedback.targetSkillID).toBe('deliberate-pause')
  })

  it('targets a long opening sentence', () => {
    const opening =
      'So what I wanted to talk to you about today before we get started with the session ' +
      'is something that we have been planning for quite a while now as a team here.'
    const transcript = `${opening} Buddy Week starts Monday. Bring a friend.`
    const metrics = computeSpeakingMetrics({
      transcript,
      segments: segments(transcript, 18),
      totalDuration: 18,
      timeLimit: 60,
    })
    const feedback = localSpeakingFeedback(scenario, skill, metrics)
    expect(feedback.primaryTarget).toBe('Get to the point in your first sentence')
    expect(feedback.targetSkillID).toBe('bottom-line-first')
  })

  it('falls back to the scenario skill when nothing measurable stands out', () => {
    const transcript =
      'Buddy Week starts on Monday. Bring one friend to any class. They train completely free ' +
      'all week. Sign up at the front desk today.'
    const metrics = computeSpeakingMetrics({
      transcript,
      segments: segments(transcript, 12),
      totalDuration: 12,
      timeLimit: 60,
    })
    const feedback = localSpeakingFeedback(scenario, skill, metrics)
    expect(feedback.targetSkillID).toBe(skill.id)
  })

  it('always quotes from the transcript', () => {
    const transcript =
      'Um so um basically Buddy Week is um happening. Um bring a friend. Uh it is free.'
    const metrics = computeSpeakingMetrics({
      transcript,
      segments: segments(transcript, 20),
      totalDuration: 20,
      timeLimit: 60,
    })
    const feedback = localSpeakingFeedback(scenario, skill, metrics)
    expect(verifyQuote(feedback.evidenceQuote, transcript).verified).toBe(true)
  })

  it('always fills in every required part of the feedback', () => {
    const transcript = 'Short attempt. Nothing special here.'
    const metrics = computeSpeakingMetrics({
      transcript,
      segments: segments(transcript, 8),
      totalDuration: 8,
      timeLimit: 60,
    })
    const feedback = localSpeakingFeedback(scenario, skill, metrics)
    for (const value of [
      feedback.scenarioOutcome,
      feedback.primaryTarget,
      feedback.explanation,
      feedback.retryInstruction,
    ]) {
      expect(value.trim().length).toBeGreaterThan(0)
    }
    expect(feedback.strengths.length).toBeGreaterThan(0)
    expect(feedback.strengths.length).toBeLessThanOrEqual(3)
    expect(feedback.rubricObservations.length).toBeGreaterThan(0)
  })

  it('is honest about an empty recording', () => {
    const metrics = computeSpeakingMetrics({ transcript: '', totalDuration: 6, timeLimit: 60 })
    const feedback = localSpeakingFeedback(scenario, skill, metrics)
    expect(feedback.scenarioOutcome).toContain('No speech was recognised')
    expect(feedback.primaryTarget.length).toBeGreaterThan(0)
  })
})

describe('conversation findings', () => {
  const conversationScenario = requireScenario('cnv-too-expensive')
  const conversationSkill = requireSkill(conversationScenario.primarySkillID)

  let id = 0
  function turn(speaker: 'user' | 'character', text: string, duration: number): ConversationTurn {
    id += 1
    return {
      id: `t${id}`,
      speaker,
      text,
      duration,
      durationIsEstimated: speaker === 'character',
      segments: [],
    }
  }

  it('targets the absence of open questions', () => {
    const turns = [
      turn('character', "It's more than I wanted to spend.", 4),
      turn('user', 'Is the price the only issue?', 3),
      turn('character', 'Mostly, yes.', 2),
      turn('user', 'Can you afford it if we split it monthly?', 4),
    ]
    const feedback = localConversationFeedback(
      conversationSkill,
      computeConversationMetrics(turns),
      turns,
    )
    expect(feedback.primaryTarget).toBe('Ask one genuinely open question')
    expect(feedback.targetSkillID).toBe('open-question')
  })

  it('targets dominating the conversation', () => {
    const long = `What matters most to you here? ${'We offer a lot of value and I want to explain it. '.repeat(6)}`
    const turns = [
      turn('character', 'Hmm.', 2),
      turn('user', long, 90),
      turn('character', 'Right.', 2),
      turn('user', 'What do you think?', 4),
    ]
    const feedback = localConversationFeedback(
      conversationSkill,
      computeConversationMetrics(turns),
      turns,
    )
    expect(feedback.primaryTarget).toBe('Take up less of the conversation')
    expect(feedback.targetSkillID).toBe('hold-the-silence')
  })
})

describe('comparison', () => {
  function metricsFor(transcript: string, duration: number, timeLimit?: number) {
    return computeSpeakingMetrics({
      transcript,
      segments: segments(transcript, duration),
      totalDuration: duration,
      ...(timeLimit === undefined ? {} : { timeLimit }),
    })
  }

  it('counts filler reduction as improvement for the pause skill', () => {
    const before = metricsFor('Um so um this is um the plan. Um come along.', 20)
    const after = metricsFor('This is the plan. Come along.', 20)
    const comparison = localCompare('deliberate-pause', before, after)
    expect(comparison.targetImproved).toBe(true)
    expect(comparison.changeWasSuperficial).toBe(false)
  })

  it('does not reward rewording without behaviour change', () => {
    const before = metricsFor(
      'So what I wanted to say today before we start is that the thing we planned is now here.',
      20,
    )
    const after = metricsFor(
      'So what I wanted to mention today before we begin is that the thing we planned has landed.',
      20,
    )
    const comparison = localCompare('bottom-line-first', before, after)
    expect(comparison.targetImproved).toBe(false)
  })

  it('does not claim improvement for an unmapped skill', () => {
    const before = metricsFor('One version of the attempt goes here.', 15)
    const after = metricsFor('A completely different second attempt entirely.', 15)
    expect(localCompare('some-unmapped-skill', before, after).targetImproved).toBe(false)
    expect(localCompare(undefined, before, after).targetImproved).toBe(false)
  })

  it('counts a shorter opening for bottom-line-first', () => {
    const before = metricsFor(
      'So what I wanted to talk to you about today before we get going properly is Buddy Week. ' +
        'It starts Monday.',
      20,
    )
    const after = metricsFor('Buddy Week starts Monday. Bring one friend and they train free.', 20)
    expect(localCompare('bottom-line-first', before, after).targetImproved).toBe(true)
  })

  it('recognises getting back inside the time limit for an unmapped target', () => {
    const before = metricsFor('Words that ran long here.', 90, 60)
    const after = metricsFor('Words that fitted this time.', 45, 60)
    expect(localCompare(undefined, before, after).targetImproved).toBe(true)
  })
})
