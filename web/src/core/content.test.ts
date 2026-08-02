import { describe, expect, it } from 'vitest'
import {
  baselineScenarios,
  browsableScenarios,
  nuggetEntries,
  nuggets,
  paths,
  scenarios,
  skill as findSkill,
  skills,
  skillsInPath,
  transferScenarioAfter,
  unlockedPaths,
} from './content'

// Guards the generated content file. It is produced from the Swift definitions
// by Tools/ContentExport, so these assertions also catch a bad regeneration.

describe('curriculum integrity', () => {
  it('has unique path and skill IDs', () => {
    expect(new Set(paths.map((path) => path.id)).size).toBe(paths.length)
    expect(new Set(skills.map((entry) => entry.id)).size).toBe(skills.length)
  })

  it('references only real skills from paths', () => {
    for (const path of paths) {
      for (const id of path.skillIDs) {
        expect(findSkill(id), `path ${path.id} references missing skill ${id}`).toBeDefined()
      }
    }
  })

  it('keeps every skill inside its declared path', () => {
    for (const entry of skills) {
      const owning = paths.find((path) => path.id === entry.pathID)
      expect(owning, `skill ${entry.id} has no path`).toBeDefined()
      expect(owning?.skillIDs).toContain(entry.id)
    }
  })

  it('ships the eleven curriculum paths from the brief', () => {
    expect(paths).toHaveLength(11)
    for (const path of paths) {
      expect(skillsInPath(path.id).length).toBeGreaterThan(0)
    }
  })

  it('gives every skill the copy the coaching screens need', () => {
    for (const entry of skills) {
      expect(entry.name.length).toBeGreaterThan(0)
      expect(entry.summary.length).toBeGreaterThan(0)
      expect(entry.whyItMatters.length).toBeGreaterThan(0)
      expect(entry.strongExample.length).toBeGreaterThan(0)
      expect(entry.retryCue.length).toBeGreaterThan(0)
    }
  })

  it('unlocks more paths as the level rises', () => {
    expect(unlockedPaths(1).length).toBeGreaterThan(0)
    expect(unlockedPaths(50).length).toBe(paths.length)
    expect(unlockedPaths(1).length).toBeLessThanOrEqual(unlockedPaths(10).length)
  })
})

describe('scenario integrity', () => {
  it('has unique IDs', () => {
    expect(new Set(scenarios.map((entry) => entry.id)).size).toBe(scenarios.length)
  })

  it('references real skills and paths', () => {
    const pathIDs = new Set(paths.map((path) => path.id))
    for (const entry of scenarios) {
      expect(pathIDs.has(entry.pathID), `${entry.id} has unknown path`).toBe(true)
      expect(findSkill(entry.primarySkillID), `${entry.id} has unknown skill`).toBeDefined()
    }
  })

  it('gives conversation scenarios a character brief and speaking scenarios none', () => {
    for (const entry of scenarios) {
      if (entry.mode === 'conversation') {
        expect(entry.character, `${entry.id} needs a character`).toBeDefined()
        expect(entry.character?.hiddenGoal.length).toBeGreaterThan(0)
        expect(entry.character?.opensWith.length).toBeGreaterThan(0)
      } else {
        expect(entry.character, `${entry.id} should have no character`).toBeUndefined()
      }
    }
  })

  it('writes every objection as a line the character would say out loud', () => {
    // The offline scripted character speaks `objection` verbatim, so a brief
    // written *about* them ("Deflects with…") comes out as nonsense.
    const narration = /^(says|deflects|thinks|wants|believes|feels|avoids|refuses|insists|claims)\s/i
    const placeholder = /^(none|n\/a|—|-)\.?$/i
    for (const entry of scenarios) {
      if (!entry.character) continue
      const stripped = entry.character.objection.replace(/^["“\s]+|["”\s]+$/g, '')
      expect(stripped.length, `${entry.id} needs an objection`).toBeGreaterThan(0)
      expect(placeholder.test(stripped), `${entry.id} objection is a placeholder`).toBe(false)
      expect(narration.test(stripped), `${entry.id} objection reads as narration`).toBe(false)
    }
  })

  it('gives every scenario a briefing, a hook and a required objective', () => {
    for (const entry of scenarios) {
      expect(entry.briefing.length).toBeGreaterThan(0)
      expect(entry.hook.length).toBeGreaterThan(0)
      expect(entry.objectives.filter((objective) => !objective.isBonus).length).toBeGreaterThan(0)
    }
  })

  it('points transfer variants at real parents', () => {
    const ids = new Set(scenarios.map((entry) => entry.id))
    for (const entry of scenarios) {
      if (entry.transferOf) expect(ids.has(entry.transferOf)).toBe(true)
    }
  })

  it('includes every seed scenario the brief asked for', () => {
    const required = [
      'spk-buddy-week',
      'spk-leadership-lesson',
      'spk-attendance-matters',
      'cnv-trial-welcome',
      'cnv-too-expensive',
      'cnv-schedule-request',
      'cnv-missed-classes',
      'cnv-correct-student',
      'cnv-upset-parent',
    ]
    const ids = new Set(scenarios.map((entry) => entry.id))
    for (const id of required) expect(ids.has(id), `missing seed scenario ${id}`).toBe(true)
  })

  it('gives higher tiers less preparation time', () => {
    const byTier = new Map<number, number[]>()
    for (const entry of scenarios) {
      byTier.set(entry.tier, [...(byTier.get(entry.tier) ?? []), entry.prepSeconds])
    }
    const foundation = byTier.get(1) ?? []
    const boss = byTier.get(4) ?? []
    if (foundation.length > 0 && boss.length > 0) {
      expect(Math.max(...boss)).toBeLessThanOrEqual(Math.max(...foundation))
    }
  })

  it('prefers an explicit transfer variant, then a harder scenario', () => {
    const buddy = scenarios.find((entry) => entry.id === 'spk-buddy-week')
    expect(buddy).toBeDefined()
    if (!buddy) return
    const transfer = transferScenarioAfter(buddy)
    expect(transfer).toBeDefined()
    expect(transfer?.id).not.toBe(buddy.id)
    if (transfer?.transferOf) {
      expect(transfer.transferOf).toBe(buddy.id)
    } else {
      expect(transfer?.tier).toBeGreaterThan(buddy.tier)
    }
  })

  it('keeps baseline scenarios out of browsing', () => {
    expect(baselineScenarios.length).toBeGreaterThan(0)
    const browsableIDs = new Set(browsableScenarios.map((entry) => entry.id))
    for (const entry of baselineScenarios) expect(browsableIDs.has(entry.id)).toBe(false)
  })

  it('makes the baseline pair comparable but not identical', () => {
    expect(baselineScenarios.length).toBeGreaterThanOrEqual(2)
    const ids = baselineScenarios.map((entry) => entry.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('golden nuggets', () => {
  it('has unique IDs and references real skills', () => {
    expect(new Set(nuggets.map((entry) => entry.id)).size).toBe(nuggets.length)
    for (const entry of nuggetEntries) {
      expect(entry.relatedSkillIDs.length).toBeGreaterThan(0)
      for (const id of entry.relatedSkillIDs) {
        expect(findSkill(id), `nugget ${entry.nugget.id} references missing skill ${id}`).toBeDefined()
      }
    }
  })

  it('contains no manufactured urgency, scarcity or fake social proof', () => {
    // The brief is explicit: never manufacture urgency, fear, or social proof.
    const banned = [
      'manufacture urgency',
      'create urgency',
      'fake scarcity',
      'limited time only',
      'act now',
      'fear of missing out',
      'everyone else is doing',
    ]
    for (const entry of nuggets) {
      const text = `${entry.title} ${entry.insight}`.toLowerCase()
      for (const phrase of banned) {
        expect(text.includes(phrase), `${entry.id} contains "${phrase}"`).toBe(false)
      }
    }
  })
})
