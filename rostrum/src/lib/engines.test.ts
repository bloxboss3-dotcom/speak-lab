import { describe, expect, it } from 'vitest'
import { LESSONS, LESSONS_IN_ORDER } from '@/content/lessons'
import { MASTERS } from '@/content/masters'
import { PRINCIPLES } from '@/content/motivationLab'
import { SCENARIOS, scenario as findScenario } from '@/content/scenarios'
import { TECHNIQUES, technique as findTechnique } from '@/content/techniques'
import { ACHIEVEMENTS, FIELD_TESTS } from '@/content/fieldTests'
import { OFFLINE_CEILING, checkTell, detectTechniques, scoreTechnique, strongestLine } from '@/lib/coach/heuristics'
import { CoachDecodeError, decodeEvaluation, extractJson } from '@/lib/coach/decode'
import {
  dayKey,
  addDays,
  firstReview,
  isDue,
  levelFromXp,
  masteryScore,
  nextReview,
  registerTraining,
  stageFor,
  totalXpToReach,
  xpFor,
} from '@/lib/progression'
import {
  coldRetrievalCount,
  emptyProgress,
  introduceTechnique,
  knownTechniqueIds,
  recordAttempt,
  completeLesson,
} from '@/lib/progress'
import { containsPhrase } from '@/lib/text'
import { buildTree } from '@/lib/tree'
import { equip, equippedCount, equippedTechniqueIds, slotCandidates, slotFor } from '@/lib/loadout'
import type { CoachEvaluation, TechniqueMastery } from '@/lib/types'

// ---------------------------------------------------------------- Fixtures

const NOW = new Date('2026-03-02T09:00:00')

function evaluation(overrides: Partial<CoachEvaluation> = {}): CoachEvaluation {
  return {
    targetTechniqueId: 'moral-contrast',
    techniqueScore: 80,
    overallScore: 80,
    strengths: [],
    improvements: [],
    strongestLine: 'That is not talent away.',
    nextRepInstruction: 'Say it again, shorter.',
    detectedTechniques: [],
    safetyFlags: [],
    wasOffline: true,
    basis: 'test',
    ...overrides,
  }
}

function mastery(overrides: Partial<TechniqueMastery> = {}): TechniqueMastery {
  return {
    techniqueId: 'moral-contrast',
    stage: 'discovered',
    score: 0,
    introducedAt: '2026-02-01',
    totalAttempts: 0,
    successfulUses: 0,
    coldRetrievals: 0,
    failedRetrievals: 0,
    contextsUsed: [],
    bestScore: 0,
    reviewIntervalDays: 2,
    reviewEase: 2.3,
    ...overrides,
  }
}

// ---------------------------------------------------------------- Content

describe('content integrity', () => {
  it('seeds enough to feel like a product', () => {
    expect(MASTERS.length).toBeGreaterThanOrEqual(6)
    expect(TECHNIQUES.length).toBeGreaterThanOrEqual(20)
    expect(SCENARIOS.length).toBeGreaterThanOrEqual(40)
    expect(LESSONS.length).toBeGreaterThanOrEqual(10)
    expect(PRINCIPLES.length).toBeGreaterThanOrEqual(15)
    expect(FIELD_TESTS.length).toBeGreaterThanOrEqual(10)
  })

  it('has unique ids throughout', () => {
    for (const list of [MASTERS, TECHNIQUES, SCENARIOS, LESSONS, PRINCIPLES, FIELD_TESTS, ACHIEVEMENTS]) {
      const ids = list.map((entry) => entry.id)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })

  it('resolves every cross-reference', () => {
    for (const master of MASTERS) {
      for (const id of master.techniqueIds) {
        expect(findTechnique(id), `${master.id} → ${id}`).toBeDefined()
        expect(findTechnique(id)?.masterId).toBe(master.id)
      }
    }
    for (const lesson of LESSONS) {
      expect(findTechnique(lesson.techniqueId), lesson.id).toBeDefined()
      expect(findScenario(lesson.scenarioId), lesson.id).toBeDefined()
    }
    for (const test of FIELD_TESTS) expect(findScenario(test.scenarioId), test.id).toBeDefined()
    for (const principle of PRINCIPLES) expect(findScenario(principle.scenarioId), principle.id).toBeDefined()
    for (const technique of TECHNIQUES) {
      for (const required of technique.requires ?? []) {
        expect(findTechnique(required), `${technique.id} requires ${required}`).toBeDefined()
      }
    }
  })

  it('gives every technique checkable markers and full coaching copy', () => {
    for (const technique of TECHNIQUES) {
      expect(technique.tells.length, technique.id).toBeGreaterThan(0)
      expect(technique.structure.length, technique.id).toBeGreaterThanOrEqual(3)
      expect(technique.whenNotToUse.length, technique.id).toBeGreaterThan(10)
      expect(technique.example.length, technique.id).toBeGreaterThan(20)
    }
  })

  it('opens the curriculum on a technique that is usable the same day', () => {
    const first = LESSONS_IN_ORDER[0]
    expect(first?.order).toBe(1)
    expect(first?.techniqueId).toBe('moral-contrast')
    // Lesson one must not depend on anything not yet taught.
    expect(findTechnique(first?.techniqueId)?.requires).toBeUndefined()
  })

  it('has decode questions whose answers are in range', () => {
    for (const lesson of LESSONS) {
      expect(lesson.decodeQuestions.length).toBeGreaterThan(0)
      for (const question of lesson.decodeQuestions) {
        expect(question.answer).toBeGreaterThanOrEqual(0)
        expect(question.answer).toBeLessThan(question.options.length)
        expect(question.because.length).toBeGreaterThan(20)
      }
    }
  })

  it('states a caution on every master, so nobody is trained to impersonate', () => {
    for (const master of MASTERS) expect(master.caution.length).toBeGreaterThan(30)
  })

  it('hedges the contested psychology instead of overselling it', () => {
    const mindset = PRINCIPLES.find((entry) => entry.id === 'mindset-caveat')
    expect(mindset?.tradition.toLowerCase()).toContain('contested')
    expect(mindset?.detail.toLowerCase()).toContain('replicat')
  })
})

// ---------------------------------------------------------------- Detectors

describe('technique detectors', () => {
  const refrain =
    'Anyone can train when the class is fun. Anyone can train when their friends turned up. ' +
    'Anyone can train when they are already winning. The person you become is decided on the nights none of that is true.'

  it('finds a repeated opening', () => {
    const result = checkTell({ kind: 'anaphora', minRepeats: 3 }, refrain)
    expect(result.passed).toBe(true)
    expect(result.evidence).toContain('Anyone can train')
  })

  it('does not find one in ordinary prose', () => {
    const result = checkTell(
      { kind: 'anaphora', minRepeats: 3 },
      'You did well today. The stance was better. Keep going and it will come.',
    )
    expect(result.passed).toBe(false)
  })

  it('detects a closing line that is short', () => {
    expect(checkTell({ kind: 'short-close', maxWords: 14 }, 'A long sentence that goes on. Class dismissed.').passed).toBe(true)
    expect(
      checkTell(
        { kind: 'short-close', maxWords: 8 },
        'Short. And then a much longer closing sentence that keeps going well past the limit.',
      ).passed,
    ).toBe(false)
  })

  it('detects a call to action only when something is actually asked for', () => {
    expect(
      checkTell({ kind: 'call-to-action' }, 'Before you leave tonight, tell the desk which pattern you are fixing.').passed,
    ).toBe(true)
    expect(checkTell({ kind: 'call-to-action' }, 'Everyone should try a bit harder in general.').passed).toBe(false)
  })

  it('counts only concrete nouns', () => {
    const concrete = checkTell({ kind: 'concrete-nouns', min: 3 }, 'The belt, the mat and the clock on Thursday.')
    const abstract = checkTell({ kind: 'concrete-nouns', min: 3 }, 'Excellence requires commitment and determination.')
    expect(concrete.passed).toBe(true)
    expect(abstract.passed).toBe(false)
  })

  it('scores a technique and refuses to award full marks offline', () => {
    const technique = findTechnique('rising-refrain')
    expect(technique).toBeDefined()
    if (!technique) return
    const result = scoreTechnique(technique, refrain)
    expect(result.score).toBeGreaterThan(60)
    expect(result.score).toBeLessThanOrEqual(OFFLINE_CEILING)
  })

  it('scores an empty or trivial answer at zero', () => {
    const technique = findTechnique('rising-refrain')
    if (!technique) return
    expect(scoreTechnique(technique, '').score).toBe(0)
    expect(scoreTechnique(technique, 'Yes ok sure.').score).toBe(0)
  })

  it('quotes the strongest line verbatim from the transcript', () => {
    const line = strongestLine(refrain)
    expect(refrain).toContain(line)
  })
})

describe('unprompted detection', () => {
  it('is stingy — encouraging noise is not a technique', () => {
    const vague = 'You are all doing really well and I am proud of the effort in the room today.'
    expect(detectTechniques(vague, TECHNIQUES.map((entry) => entry.id))).toHaveLength(0)
  })

  it('finds a technique that is genuinely present', () => {
    const text =
      'Anyone can work hard when it is fun. Anyone can work hard when someone is watching. ' +
      'Anyone can work hard when they are already ahead. What you do now is what nobody sees.'
    const found = detectTechniques(text, ['rising-refrain', 'analogy-bridge'])
    expect(found.map((entry) => entry.techniqueId)).toContain('rising-refrain')
    expect(found[0]?.confidence).toBeGreaterThanOrEqual(0.72)
  })

  it('never reports a confidence above one', () => {
    const text = 'It is not about talent. It is about the mat, the belt and Thursday night.'
    for (const found of detectTechniques(text, TECHNIQUES.map((entry) => entry.id))) {
      expect(found.confidence).toBeLessThanOrEqual(1)
      expect(found.confidence).toBeGreaterThan(0)
    }
  })
})

// ---------------------------------------------------------------- Decoding

describe('AI response decoding', () => {
  const good = JSON.stringify({
    techniqueScore: 84,
    overallScore: 78,
    strengths: ['Repeated structure was clear'],
    improvements: ['The final repetition should be strongest'],
    strongestLine: 'Your effort decides who you become.',
    nextRepInstruction: 'Make the last repetition the peak.',
    detectedTechniques: [{ techniqueId: 'moral-contrast', confidence: 0.82, appropriateUse: true }],
    safetyFlags: [],
  })

  const context = {
    targetTechniqueId: 'rising-refrain',
    knownTechniqueIds: new Set(['rising-refrain', 'moral-contrast']),
    basis: 'test',
  }

  it('decodes a well-formed response', () => {
    const result = decodeEvaluation(good, context)
    expect(result.techniqueScore).toBe(84)
    expect(result.detectedTechniques).toHaveLength(1)
  })

  it('recovers JSON from a markdown fence', () => {
    expect(decodeEvaluation('```json\n' + good + '\n```', context).overallScore).toBe(78)
  })

  it('is not fooled by braces inside strings', () => {
    const payload = JSON.parse(good) as Record<string, unknown>
    payload['strongestLine'] = 'He said "the {plan} is} fine" and left.'
    const wrapped = `Here you go: ${JSON.stringify(payload)} — hope that helps.`
    expect(decodeEvaluation(wrapped, context).strongestLine).toContain('{plan}')
  })

  it('throws rather than rendering a half-empty card', () => {
    const payload = JSON.parse(good) as Record<string, unknown>
    delete payload['nextRepInstruction']
    expect(() => decodeEvaluation(JSON.stringify(payload), context)).toThrow(CoachDecodeError)
    expect(() => extractJson('I am afraid I cannot help with that.')).toThrow(CoachDecodeError)
  })

  it('drops a detection naming a technique the learner has never met', () => {
    const payload = JSON.parse(good) as Record<string, unknown>
    payload['detectedTechniques'] = [{ techniqueId: 'invented-technique', confidence: 0.99 }]
    expect(decodeEvaluation(JSON.stringify(payload), context).detectedTechniques).toHaveLength(0)
  })

  it('clamps a score the model put out of range', () => {
    const payload = JSON.parse(good) as Record<string, unknown>
    payload['overallScore'] = 480
    expect(decodeEvaluation(JSON.stringify(payload), context).overallScore).toBe(100)
  })
})

// ---------------------------------------------------------------- Progression

describe('experience and levels', () => {
  it('pays most for retrieving a technique cold', () => {
    const cold = xpFor({ kind: 'cold-retrieval' })
    expect(cold).toBeGreaterThan(xpFor({ kind: 'lesson-completed' }))
    expect(cold).toBeGreaterThan(xpFor({ kind: 'attempt' }))
    expect(cold).toBeGreaterThan(xpFor({ kind: 'field-test-completed' }))
    expect(cold).toBeGreaterThan(xpFor({ kind: 'improved', delta: 40 }))
  })

  it('pays nothing for improving by nothing', () => {
    expect(xpFor({ kind: 'improved', delta: 0 })).toBe(0)
  })

  it('has a self-consistent level curve', () => {
    for (let level = 1; level <= 20; level += 1) {
      const total = totalXpToReach(level)
      expect(levelFromXp(total)).toBe(level)
      if (level > 1) expect(levelFromXp(total - 1)).toBe(level - 1)
    }
  })
})

describe('mastery gating', () => {
  it('cannot pass Practiced without an unprompted retrieval, however much you grind', () => {
    const ground = mastery({
      totalAttempts: 50,
      successfulUses: 50,
      bestScore: 100,
      contextsUsed: ['a', 'b', 'c', 'd'],
      coldRetrievals: 0,
    })
    expect(stageFor(ground, NOW)).toBe('practiced')
  })

  it('reaches Reliable on a first cold retrieval across two situations', () => {
    const record = mastery({
      totalAttempts: 3,
      successfulUses: 2,
      bestScore: 80,
      contextsUsed: ['a', 'b'],
      coldRetrievals: 1,
    })
    expect(stageFor(record, NOW)).toBe('reliable')
  })

  it('requires a delayed retrieval for Mastered', () => {
    const recent = mastery({
      introducedAt: dayKey(NOW),
      totalAttempts: 10,
      successfulUses: 9,
      bestScore: 95,
      contextsUsed: ['a', 'b', 'c'],
      coldRetrievals: 4,
    })
    expect(stageFor(recent, NOW)).toBe('integrated')

    const aged = { ...recent, introducedAt: '2026-01-01' }
    expect(stageFor(aged, NOW)).toBe('mastered')
  })

  it('weights the score toward retrieval and breadth, not raw practice', () => {
    const grinder = mastery({ totalAttempts: 20, successfulUses: 20, bestScore: 100, contextsUsed: ['a'] })
    const retriever = mastery({
      totalAttempts: 4,
      successfulUses: 3,
      bestScore: 80,
      contextsUsed: ['a', 'b', 'c'],
      coldRetrievals: 3,
    })
    expect(masteryScore(retriever)).toBeGreaterThan(masteryScore(grinder))
  })
})

describe('spaced review', () => {
  it('schedules the first review two days out', () => {
    const first = firstReview(NOW)
    expect(first.intervalDays).toBe(2)
    expect(first.nextReviewAt).toBe(addDays(dayKey(NOW), 2))
  })

  it('lengthens on success and collapses on failure', () => {
    const first = firstReview(NOW)
    const passed = nextReview(first, true, NOW)
    expect(passed.intervalDays).toBeGreaterThan(first.intervalDays)
    const failed = nextReview(passed, false, NOW)
    expect(failed.intervalDays).toBe(1)
  })

  it('becomes due on the day, not before', () => {
    const first = firstReview(NOW)
    expect(isDue(first.nextReviewAt, addDays2(NOW, 1))).toBe(false)
    expect(isDue(first.nextReviewAt, addDays2(NOW, 2))).toBe(true)
  })
})

function addDays2(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000)
}

describe('streaks', () => {
  const base = { current: 0, best: 0, freezes: 0 }

  it('starts, extends, and does not double count a day', () => {
    const started = registerTraining(base, NOW)
    expect(started.outcome).toBe('started')
    const same = registerTraining(started.state, new Date('2026-03-02T20:00:00'))
    expect(same.outcome).toBe('same-day')
    expect(same.state.current).toBe(1)
    const next = registerTraining(same.state, addDays2(NOW, 1))
    expect(next.outcome).toBe('extended')
    expect(next.state.current).toBe(2)
  })

  it('grants a freeze every seven days and spends it on a missed day', () => {
    let state = { ...base }
    for (let day = 0; day < 7; day += 1) state = registerTraining(state, addDays2(NOW, day)).state
    expect(state.current).toBe(7)
    expect(state.freezes).toBe(1)

    const saved = registerTraining(state, addDays2(NOW, 8))
    expect(saved.outcome).toBe('saved')
    expect(saved.state.current).toBe(8)
    expect(saved.state.freezes).toBe(0)
  })

  it('resets quietly after a long gap and keeps the personal best', () => {
    const started = registerTraining(base, NOW)
    const reset = registerTraining(started.state, addDays2(NOW, 30))
    expect(reset.outcome).toBe('reset')
    expect(reset.state.current).toBe(1)
    expect(reset.state.best).toBe(1)
  })
})

// ---------------------------------------------------------------- Records

describe('recording an attempt', () => {
  it('saves the attempt, awards XP and advances the streak', () => {
    const start = introduceTechnique(emptyProgress(), 'moral-contrast', NOW)
    const outcome = recordAttempt(
      start,
      {
        sourceKind: 'lesson',
        sourceId: 'lesson-contrast',
        scenarioId: 'final-five-minutes',
        techniqueId: 'moral-contrast',
        attemptNumber: 1,
        transcript: 'Right now we work at seventy percent. A black belt finishes the last rep.',
        durationSeconds: 42,
        durationMeasured: true,
        evaluation: evaluation(),
      },
      NOW,
    )

    expect(outcome.progress.attempts).toHaveLength(1)
    expect(outcome.xpAwarded).toBeGreaterThan(0)
    expect(outcome.progress.xp).toBe(outcome.xpAwarded)
    expect(outcome.progress.streak.current).toBe(1)
    expect(outcome.progress.mastery['moral-contrast']?.totalAttempts).toBe(1)
  })

  it('pays for improvement on a retry, and nothing for going backwards', () => {
    const start = introduceTechnique(emptyProgress(), 'moral-contrast', NOW)
    const better = recordAttempt(
      start,
      {
        sourceKind: 'lesson',
        sourceId: 'l',
        scenarioId: 'final-five-minutes',
        techniqueId: 'moral-contrast',
        attemptNumber: 2,
        transcript: 'x',
        durationSeconds: 30,
        durationMeasured: true,
        evaluation: evaluation({ techniqueScore: 85 }),
        previousBest: 60,
      },
      NOW,
    )
    expect(better.rewards.some((line) => line.label.startsWith('Improved'))).toBe(true)

    const worse = recordAttempt(
      start,
      {
        sourceKind: 'lesson',
        sourceId: 'l',
        scenarioId: 'final-five-minutes',
        techniqueId: 'moral-contrast',
        attemptNumber: 2,
        transcript: 'x',
        durationSeconds: 30,
        durationMeasured: true,
        evaluation: evaluation({ techniqueScore: 40 }),
        previousBest: 60,
      },
      NOW,
    )
    expect(worse.rewards.some((line) => line.label.startsWith('Improved'))).toBe(false)
  })

  it('credits an unprompted retrieval only inside a Field Test', () => {
    const start = introduceTechnique(emptyProgress(), 'rising-refrain', NOW)
    const detected = evaluation({
      targetTechniqueId: null,
      detectedTechniques: [{ techniqueId: 'rising-refrain', confidence: 0.85, appropriateUse: true }],
    })

    const inLesson = recordAttempt(
      start,
      {
        sourceKind: 'lesson',
        sourceId: 'l',
        scenarioId: 'wants-to-quit',
        techniqueId: null,
        attemptNumber: 1,
        transcript: 'x',
        durationSeconds: 30,
        durationMeasured: true,
        evaluation: detected,
      },
      NOW,
    )
    expect(coldRetrievalCount(inLesson.progress)).toBe(0)

    const inFieldTest = recordAttempt(
      start,
      {
        sourceKind: 'field-test',
        sourceId: 'ft-quitting',
        scenarioId: 'wants-to-quit',
        techniqueId: null,
        attemptNumber: 1,
        transcript: 'x',
        durationSeconds: 30,
        durationMeasured: true,
        evaluation: detected,
      },
      NOW,
    )
    expect(coldRetrievalCount(inFieldTest.progress)).toBe(1)
    expect(inFieldTest.coldRetrievals[0]?.techniqueId).toBe('rising-refrain')
    expect(inFieldTest.rewards.some((line) => line.label === 'Unprompted retrieval')).toBe(true)
  })

  it('ignores a low-confidence detection', () => {
    const start = introduceTechnique(emptyProgress(), 'rising-refrain', NOW)
    const outcome = recordAttempt(
      start,
      {
        sourceKind: 'field-test',
        sourceId: 'ft',
        scenarioId: 'wants-to-quit',
        techniqueId: null,
        attemptNumber: 1,
        transcript: 'x',
        durationSeconds: 30,
        durationMeasured: true,
        evaluation: evaluation({
          targetTechniqueId: null,
          detectedTechniques: [{ techniqueId: 'rising-refrain', confidence: 0.5, appropriateUse: true }],
        }),
      },
      NOW,
    )
    expect(coldRetrievalCount(outcome.progress)).toBe(0)
  })

  it('never credits a retrieval for a technique the learner has not met', () => {
    const outcome = recordAttempt(
      emptyProgress(),
      {
        sourceKind: 'field-test',
        sourceId: 'ft',
        scenarioId: 'wants-to-quit',
        techniqueId: null,
        attemptNumber: 1,
        transcript: 'x',
        durationSeconds: 30,
        durationMeasured: true,
        evaluation: evaluation({
          targetTechniqueId: null,
          detectedTechniques: [{ techniqueId: 'rising-refrain', confidence: 0.95, appropriateUse: true }],
        }),
      },
      NOW,
    )
    expect(coldRetrievalCount(outcome.progress)).toBe(0)
  })
})

describe('lessons and persistence', () => {
  it('completes a lesson once and introduces its technique', () => {
    const first = completeLesson(emptyProgress(), 'lesson-contrast', NOW)
    expect(first.xp).toBeGreaterThan(0)
    expect(knownTechniqueIds(first.progress)).toContain('moral-contrast')

    const again = completeLesson(first.progress, 'lesson-contrast', NOW)
    expect(again.xp).toBe(0)
    expect(again.progress.completedLessonIds).toHaveLength(1)
  })

  it('survives a round trip through JSON', () => {
    const start = introduceTechnique(emptyProgress(), 'moral-contrast', NOW)
    const outcome = recordAttempt(
      start,
      {
        sourceKind: 'lesson',
        sourceId: 'lesson-contrast',
        scenarioId: 'final-five-minutes',
        techniqueId: 'moral-contrast',
        attemptNumber: 1,
        transcript: 'Right now we coast. A black belt does not.',
        durationSeconds: 40,
        durationMeasured: true,
        evaluation: evaluation(),
      },
      NOW,
    )

    const restored = JSON.parse(JSON.stringify(outcome.progress)) as typeof outcome.progress
    expect(restored.xp).toBe(outcome.progress.xp)
    expect(restored.attempts).toHaveLength(1)
    expect(restored.mastery['moral-contrast']?.stage).toBe(outcome.progress.mastery['moral-contrast']?.stage)
    expect(restored.streak.current).toBe(1)
  })
})

// ---------------------------------------------------------------- Skill tree

describe('skill tree', () => {
  it('covers every technique exactly once', () => {
    const tree = buildTree(emptyProgress())
    const ids = tree.flatMap((limb) => limb.nodes.map((node) => node.technique.id))
    expect(ids).toHaveLength(TECHNIQUES.length)
    expect(new Set(ids).size).toBe(TECHNIQUES.length)
  })

  it('puts a prerequisite ahead of the technique that needs it', () => {
    for (const limb of buildTree(emptyProgress())) {
      const order = limb.nodes.map((node) => node.technique.id)
      limb.nodes.forEach((node, index) => {
        for (const requirement of node.technique.requires ?? []) {
          const at = order.indexOf(requirement)
          // Cross-branch prerequisites are absent from this limb; only the
          // same-limb case constrains the order.
          if (at !== -1) expect(at).toBeLessThan(index)
        }
      })
    }
  })

  it('locks a technique until its prerequisite is owned, then opens it', () => {
    const dependant = TECHNIQUES.find((entry) => (entry.requires ?? []).length > 0)
    expect(dependant).toBeDefined()
    const requirement = dependant?.requires?.[0]
    if (!dependant || !requirement) return

    const findNode = (progress: ReturnType<typeof emptyProgress>) =>
      buildTree(progress)
        .flatMap((limb) => limb.nodes)
        .find((node) => node.technique.id === dependant.id)

    expect(findNode(emptyProgress())?.state).toBe('locked')
    expect(findNode(emptyProgress())?.blockedBy?.id).toBe(requirement)

    const met = introduceTechnique(emptyProgress(), requirement, NOW)
    expect(findNode(met)?.state).toBe('available')
  })

  it('marks an owned technique with its stage and sorts started limbs first', () => {
    const progress = introduceTechnique(emptyProgress(), 'moral-contrast', NOW)
    const tree = buildTree(progress)
    const node = tree
      .flatMap((limb) => limb.nodes)
      .find((entry) => entry.technique.id === 'moral-contrast')
    expect(node?.state).toBe('owned')
    expect(node?.stage).toBe('discovered')
    expect(tree[0]?.owned).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------- Loadout

describe('loadout', () => {
  it('offers only techniques the learner owns', () => {
    expect(slotCandidates(emptyProgress(), 'rhetoric')).toHaveLength(0)
    const progress = introduceTechnique(emptyProgress(), 'rising-refrain', NOW)
    expect(slotCandidates(progress, 'rhetoric').map((entry) => entry.id)).toContain('rising-refrain')
  })

  it('equips, replaces and clears a slot', () => {
    const owned = introduceTechnique(emptyProgress(), 'rising-refrain', NOW)
    const equipped = equip(owned, 'rhetoric', 'rising-refrain')
    expect(equippedTechniqueIds(equipped)).toEqual(['rising-refrain'])
    expect(equippedCount(equipped)).toBe(1)

    const cleared = equip(equipped, 'rhetoric', null)
    expect(equippedTechniqueIds(cleared)).toEqual([])
    expect(cleared.loadout.rhetoric).toBeUndefined()
  })

  it('drops an equipped id that no longer names a technique', () => {
    const stale = { ...emptyProgress(), loadout: { rhetoric: 'technique-that-was-removed' } }
    expect(equippedTechniqueIds(stale)).toEqual([])
    expect(equippedCount(stale)).toBe(0)
  })

  it('gives every technique a slot to live in', () => {
    for (const technique of TECHNIQUES) {
      expect(slotFor(technique), technique.id).toBeDefined()
    }
  })

  it('does not equip the same technique twice across slots', () => {
    let progress = introduceTechnique(emptyProgress(), 'rising-refrain', NOW)
    progress = equip(progress, 'rhetoric', 'rising-refrain')
    progress = equip(progress, 'closing', 'rising-refrain')
    expect(equippedTechniqueIds(progress)).toEqual(['rising-refrain'])
  })
})

// ---------------------------------------------------------------- Text matching

describe('phrase matching across apostrophe forms', () => {
  it('matches a curly-apostrophe phrase against a straight-apostrophe transcript', () => {
    expect(containsPhrase("I'm talking to you, the one at the back.", 'i’m talking to you')).toBe(true)
    expect(containsPhrase('I’m talking to you, the one at the back.', "i'm talking to you")).toBe(true)
  })

  it('keeps every authored phrase matchable in both forms', () => {
    // Content is written with typographic apostrophes; transcripts arrive with
    // whatever the keyboard produced. Normalisation has to bridge the two.
    for (const technique of TECHNIQUES) {
      for (const tell of technique.tells) {
        if (tell.kind !== 'phrases') continue
        for (const phrase of tell.any) {
          if (!phrase.includes('’') && !phrase.includes("'")) continue
          const straight = phrase.replace(/’/g, "'")
          const curly = phrase.replace(/'/g, '’')
          expect(containsPhrase(straight, phrase), phrase).toBe(true)
          expect(containsPhrase(curly, phrase), phrase).toBe(true)
        }
      }
    }
  })
})

describe('detection reports what it actually measured', () => {
  it('carries marker counts on offline detections', () => {
    const transcript =
      'You did not fail because you are not good enough. You did not fail because you did not care. ' +
      'You did not fail because you are not meant to be here. You did not pass today because one thing ' +
      'was not ready yet, and one thing is a small thing to fix. Wipe your face. We start Tuesday.'
    const detected = detectTechniques(transcript, ['rising-refrain'])
    const hit = detected[0]
    expect(hit?.techniqueId).toBe('rising-refrain')
    expect(hit?.markersTotal).toBeGreaterThan(0)
    expect(hit?.markersPresent).toBeLessThanOrEqual(hit?.markersTotal ?? 0)
  })

  it('leaves marker counts off a model detection, which cannot count markers', () => {
    const decoded = decodeEvaluation(
      JSON.stringify({
        techniqueScore: 80,
        overallScore: 80,
        strengths: [],
        improvements: [],
        strongestLine: 'We start Tuesday.',
        nextRepInstruction: 'Again.',
        detectedTechniques: [{ techniqueId: 'rising-refrain', confidence: 0.8 }],
      }),
      {
        targetTechniqueId: null,
        knownTechniqueIds: new Set(['rising-refrain']),
        basis: 'test',
      },
    )
    expect(decoded.detectedTechniques[0]?.markersTotal).toBeUndefined()
  })
})

describe('content is plain text', () => {
  it('carries no markup the app does not render', () => {
    // Nothing in the app parses markdown, so an authored *emphasis* or **bold**
    // would reach the screen as literal asterisks.
    const strings = [
      ...TECHNIQUES.flatMap((t) => [t.summary, t.why, t.example, t.whenToUse, t.whenNotToUse, ...t.structure]),
      ...LESSONS_IN_ORDER.flatMap((l) => [l.title, l.promise, l.decodeExample.setting, ...l.decodeExample.lines]),
      ...LESSONS_IN_ORDER.flatMap((l) => l.decodeQuestions.flatMap((q) => [q.prompt, ...q.options])),
      ...PRINCIPLES.flatMap((p) => [p.name, p.summary, p.detail, p.inPractice, p.failureItExplains, ...p.rubric]),
      ...SCENARIOS.flatMap((s) => [s.title, s.situation, s.mission]),
      ...MASTERS.flatMap((m) => [m.signature, m.study, m.caution]),
    ]
    for (const value of strings) {
      expect(value, value).not.toMatch(/\*\w|\w\*/)
      expect(value, value).not.toMatch(/\[[^\]]+\]\(/)
    }
  })
})
