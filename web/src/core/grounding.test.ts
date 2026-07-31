import { describe, expect, it } from 'vitest'
import { locateQuote, verifyQuote } from './grounding'
import {
  attemptFeedbackRequest,
  characterTurnRequest,
  comparisonRequest,
  conversationDebriefRequest,
  conversationDigest,
  speakingDigest,
  timestamp,
} from './prompts'
import { computeConversationMetrics } from './conversationMetrics'
import { computeSpeakingMetrics } from './speechMetrics'
import { scenario as findScenario, skill as findSkill, skillsInPath } from './content'
import type { ConversationTurn, MicroSkill, Scenario } from './types'

// Mirrors Tests/SpeakLabCoreTests/GroundingAndPromptTests.swift.

const TRANSCRIPT =
  'So basically what I wanted to say today is that Buddy Week starts on Monday. ' +
  'Bring one friend to any class and they train free.'

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

describe('quote grounding', () => {
  it('verifies an exact quote', () => {
    const result = verifyQuote('Buddy Week starts on Monday', TRANSCRIPT)
    expect(result.verified).toBe(true)
    expect(result.similarity).toBe(1)
  })

  it('matches regardless of case and punctuation', () => {
    expect(verifyQuote('buddy week starts on monday!', TRANSCRIPT).verified).toBe(true)
  })

  it('still verifies a lightly tidied quote', () => {
    // The model drops "So basically" when quoting; overlap stays above threshold.
    const result = verifyQuote('what I wanted to say today is that Buddy Week starts', TRANSCRIPT)
    expect(result.verified).toBe(true)
    expect(result.similarity).toBeGreaterThanOrEqual(0.75)
  })

  it('does not verify a fabricated quote', () => {
    const result = verifyQuote('I promise this will change your entire life forever', TRANSCRIPT)
    expect(result.verified).toBe(false)
    expect(result.matchedRange).toBeUndefined()
  })

  it('does not verify an empty quote', () => {
    expect(verifyQuote('   ', TRANSCRIPT).verified).toBe(false)
  })

  it('does not verify a quote longer than the transcript', () => {
    expect(verifyQuote(`${TRANSCRIPT} and then some more words entirely`, 'short').verified).toBe(
      false,
    )
  })

  it('returns a range that indexes the original transcript', () => {
    const result = verifyQuote('Buddy Week starts on Monday', TRANSCRIPT)
    expect(result.matchedRange).toBeDefined()
    const { start, end } = result.matchedRange as { start: number; end: number }
    expect(TRANSCRIPT.slice(start, end)).toBe('Buddy Week starts on Monday')
  })
})

describe('locating a quote in timed sentences', () => {
  const metrics = computeSpeakingMetrics({ transcript: TRANSCRIPT, totalDuration: 20 })

  it('finds the sentence a quote came from', () => {
    const sentence = locateQuote('Bring one friend to any class', metrics.sentences)
    expect(sentence?.text).toContain('Bring one friend')
  })

  it('returns nothing for an unrelated quote', () => {
    expect(locateQuote('quarterly revenue projections', metrics.sentences)).toBeUndefined()
  })
})

describe('prompts', () => {
  const scenario = requireScenario('spk-buddy-week')
  const skill = requireSkill(scenario.primarySkillID)
  const metrics = computeSpeakingMetrics({
    transcript: TRANSCRIPT,
    totalDuration: 40,
    timeLimit: 60,
  })

  it('carries the ground rules into the feedback prompt', () => {
    const request = attemptFeedbackRequest({
      scenario,
      skill,
      transcript: TRANSCRIPT,
      metrics,
      attemptNumber: 1,
    })
    expect(request.system).toContain('You have NOT heard the audio')
    expect(request.system).toContain('Never assess personality, charisma, confidence')
    expect(request.system).toContain('No scores, percentages or invented precision')
    expect(request.task).toBe('attempt_feedback')
  })

  it('offers only real skill IDs as targets', () => {
    const request = attemptFeedbackRequest({
      scenario,
      skill,
      transcript: TRANSCRIPT,
      metrics,
      attemptNumber: 1,
    })
    const offered = skillsInPath(scenario.pathID).map((entry) => entry.id)
    expect(offered.length).toBeGreaterThan(0)
    for (const id of offered) expect(request.system).toContain(id)
  })

  it('forbids rewarding surface change in the comparison prompt', () => {
    const request = comparisonRequest({
      scenario,
      skill,
      target: 'Get to the point',
      retryInstruction: 'Open with the ask.',
      firstTranscript: TRANSCRIPT,
      firstMetrics: metrics,
      secondTranscript: TRANSCRIPT,
      secondMetrics: metrics,
    })
    expect(request.system).toContain('Do not reward a second attempt for being longer')
    expect(request.system).toContain('changeWasSuperficial')
  })
})

describe('conversation prompts', () => {
  const scenario = requireScenario('cnv-too-expensive')
  const skill = requireSkill(scenario.primarySkillID)

  const turns: ConversationTurn[] = [
    {
      id: '1',
      speaker: 'character',
      text: "Honestly, it's more than I wanted to spend.",
      duration: 3,
      durationIsEstimated: true,
      segments: [],
    },
    {
      id: '2',
      speaker: 'user',
      text: 'That makes sense. What were you comparing it against?',
      duration: 4,
      durationIsEstimated: false,
      segments: [],
    },
  ]

  it('keeps the hidden brief in the system prompt and out of the visible transcript', () => {
    const request = characterTurnRequest({ scenario, history: turns, turnBudget: 8 })
    const brief = scenario.character
    expect(brief).toBeDefined()
    expect(request.system).toContain(brief?.hiddenGoal ?? '@@none@@')
    const visible = request.messages.map((message) => message.content).join('\n')
    expect(visible).not.toContain(brief?.hiddenGoal ?? '@@none@@')
  })

  it('maps speakers to the right roles', () => {
    const request = characterTurnRequest({ scenario, history: turns, turnBudget: 8 })
    expect(request.messages[0]?.role).toBe('assistant')
    expect(request.messages[1]?.role).toBe('user')
  })

  it('seeds an opening when the history is empty', () => {
    const request = characterTurnRequest({ scenario, history: [], turnBudget: 8 })
    expect(request.messages).toHaveLength(1)
    expect(request.messages[0]?.role).toBe('user')
  })

  it('tells the model interruptions were not measured', () => {
    const metrics = computeConversationMetrics(turns)
    const request = conversationDebriefRequest({
      scenario,
      skill,
      turns,
      metrics,
      attemptNumber: 1,
    })
    expect(request.system).toContain('interruptions were not measured')
    expect(request.messages[0]?.content).toContain('Interruptions: NOT MEASURED')
  })
})

describe('metrics digest', () => {
  it('formats timestamps as m:ss', () => {
    expect(timestamp(0)).toBe('0:00')
    expect(timestamp(9)).toBe('0:09')
    expect(timestamp(65)).toBe('1:05')
    expect(timestamp(600)).toBe('10:00')
  })

  it('labels estimated conversation data', () => {
    const metrics = computeConversationMetrics([
      { id: '1', speaker: 'user', text: 'Hi.', duration: 2, durationIsEstimated: false, segments: [] },
      {
        id: '2',
        speaker: 'character',
        text: 'Hello.',
        duration: 2,
        durationIsEstimated: true,
        segments: [],
      },
    ])
    const digest = conversationDigest(metrics)
    expect(digest).toContain('ESTIMATED from word count')
    expect(digest).toContain('NOT MEASURED')
  })

  it('states where the speaking numbers came from', () => {
    const metrics = computeSpeakingMetrics({
      transcript: 'um so this is the thing um we should do',
      totalDuration: 12,
      timeLimit: 10,
    })
    const digest = speakingDigest(metrics)
    expect(digest).toContain('OVER the limit')
    expect(digest).toContain('Pace variation index')
    expect(digest).toContain('Filler words: 2')
  })
})
