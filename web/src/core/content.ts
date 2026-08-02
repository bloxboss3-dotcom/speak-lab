import contentJSON from '../content/content.json'
import type {
  GoldenNugget,
  MicroSkill,
  NuggetEntry,
  PracticeMode,
  Scenario,
  SkillPath,
} from './types'

/**
 * The curriculum, scenario catalogue and nugget library.
 *
 * `content/content.json` is generated from the Swift definitions by
 * `Tools/ContentExport` (`npm run gen:content` at the repo root). It is not
 * edited by hand — the Swift source is the single place content lives, so the
 * iOS app and this web client cannot drift apart. CI regenerates it and fails
 * if the committed file is stale.
 */

interface ContentFile {
  formatVersion: number
  paths: SkillPath[]
  skills: MicroSkill[]
  scenarios: Scenario[]
  nuggets: NuggetEntry[]
}

const content = contentJSON as unknown as ContentFile

export const paths: SkillPath[] = content.paths
export const skills: MicroSkill[] = content.skills
export const scenarios: Scenario[] = content.scenarios
export const nuggetEntries: NuggetEntry[] = content.nuggets

const skillIndex = new Map(skills.map((skill) => [skill.id, skill]))
const pathIndex = new Map(paths.map((path) => [path.id, path]))
const scenarioIndex = new Map(scenarios.map((scenario) => [scenario.id, scenario]))
const nuggetIndex = new Map(nuggetEntries.map((entry) => [entry.nugget.id, entry]))

// MARK: - Curriculum

export function skill(id: string | undefined): MicroSkill | undefined {
  return id ? skillIndex.get(id) : undefined
}

export function path(id: string | undefined): SkillPath | undefined {
  return id ? pathIndex.get(id) : undefined
}

export function skillsInPath(pathID: string): MicroSkill[] {
  const found = pathIndex.get(pathID)
  if (!found) return []
  return found.skillIDs
    .map((id) => skillIndex.get(id))
    .filter((entry): entry is MicroSkill => entry !== undefined)
}

/** Paths available to an account at the given level. */
export function unlockedPaths(level: number): SkillPath[] {
  return paths.filter((entry) => entry.unlocksAtLevel <= level)
}

// MARK: - Scenarios

export function scenario(id: string | undefined): Scenario | undefined {
  return id ? scenarioIndex.get(id) : undefined
}

export function scenariosForMode(mode: PracticeMode): Scenario[] {
  return scenarios.filter((entry) => entry.mode === mode)
}

export function scenariosForPath(pathID: string): Scenario[] {
  return scenarios.filter((entry) => entry.pathID === pathID)
}

export function scenariosForSkill(skillID: string): Scenario[] {
  return scenarios.filter((entry) => entry.primarySkillID === skillID)
}

/**
 * The harder or changed variant to offer after a successful retry.
 *
 * Prefers an explicit transfer variant; falls back to any scenario training the
 * same skill at a higher tier, so new content is picked up automatically.
 */
export function transferScenarioAfter(current: Scenario): Scenario | undefined {
  const explicit = scenarios.find((entry) => entry.transferOf === current.id)
  if (explicit) return explicit
  return scenarios
    .filter((entry) => entry.primarySkillID === current.primarySkillID && entry.tier > current.tier)
    .sort((a, b) => a.tier - b.tier)[0]
}

function hasTag(entry: Scenario, tag: string): boolean {
  return (entry.tags ?? []).includes(tag)
}

/** Excluded from normal browsing because they exist to measure, not to teach. */
export const baselineScenarios: Scenario[] = scenarios.filter((entry) => hasTag(entry, 'baseline'))

/** Everything a learner can pick from the mission board. */
export const browsableScenarios: Scenario[] = scenarios.filter((entry) => !hasTag(entry, 'baseline'))

/** The gradual-exposure ladder for public-speaking nerves, easiest rung first. */
export const exposureLadder: Scenario[] = browsableScenarios
  .filter((entry) => hasTag(entry, 'exposure') || hasTag(entry, 'anxiety'))
  .sort((a, b) => a.tier - b.tier)

// MARK: - Nuggets

export const nuggets: GoldenNugget[] = nuggetEntries.map((entry) => entry.nugget)

export function nugget(id: string | undefined): GoldenNugget | undefined {
  return id ? nuggetIndex.get(id)?.nugget : undefined
}

export function nuggetsForSkill(skillID: string): GoldenNugget[] {
  return nuggetEntries
    .filter((entry) => entry.relatedSkillIDs.includes(skillID))
    .map((entry) => entry.nugget)
}

/**
 * Picks at most one nugget for a session, avoiding ones already shown.
 *
 * Returning undefined is a normal and frequent outcome — the library exists to
 * be used sparingly, not to append a tip to every attempt.
 */
export function suggestNugget(skillID: string, alreadySeen: Set<string>): GoldenNugget | undefined {
  return nuggetsForSkill(skillID).find((entry) => !alreadySeen.has(entry.id))
}
