import { LESSONS_IN_ORDER } from '@/content/lessons'
import { TECHNIQUES } from '@/content/techniques'
import { masteryFor } from './progress'
import { MASTERY_STAGES, SKILL_BRANCH_NAMES } from './types'
import type { MasteryStage, Progress, SkillBranch, Technique } from './types'

/**
 * The skill tree, derived rather than authored.
 *
 * There is no hand-drawn graph file to drift out of sync with the content: a
 * branch's spine is the order the curriculum actually teaches it in, with
 * prerequisites forced ahead of the techniques that need them. Add a technique
 * to `techniques.ts` and it appears on the tree in the right place.
 */

export type NodeState = 'locked' | 'available' | 'owned'

export interface TreeNode {
  technique: Technique
  state: NodeState
  stage?: MasteryStage
  score: number
  /** Present on locked nodes whose prerequisite is not yet met. */
  blockedBy?: Technique
  /** The lesson that introduces it, when one does. */
  lessonId?: string
}

export interface TreeBranch {
  branch: SkillBranch
  name: string
  nodes: TreeNode[]
  owned: number
  /** Highest stage reached anywhere on the limb — colours the spine. */
  peak?: MasteryStage
}

/** Curriculum position, or Infinity for techniques no lesson introduces. */
const LESSON_ORDER = new Map(
  LESSONS_IN_ORDER.map((lesson, index) => [lesson.techniqueId, index] as const),
)

const LESSON_BY_TECHNIQUE = new Map(
  LESSONS_IN_ORDER.map((lesson) => [lesson.techniqueId, lesson.id] as const),
)

function curriculumRank(technique: Technique): number {
  return LESSON_ORDER.get(technique.id) ?? Number.POSITIVE_INFINITY
}

/**
 * Orders one limb: taught techniques in the order they are taught, then the
 * rest alphabetically — but a prerequisite always precedes its dependant, even
 * when that means jumping the queue.
 */
function orderLimb(techniques: Technique[]): Technique[] {
  const sorted = [...techniques].sort((a, b) => {
    const rank = curriculumRank(a) - curriculumRank(b)
    if (rank !== 0 && Number.isFinite(rank)) return rank
    if (curriculumRank(a) !== curriculumRank(b)) return curriculumRank(a) - curriculumRank(b)
    return a.name.localeCompare(b.name)
  })

  const placed: Technique[] = []
  const seen = new Set<string>()
  const byId = new Map(techniques.map((entry) => [entry.id, entry] as const))

  const place = (technique: Technique, guard: Set<string>) => {
    if (seen.has(technique.id) || guard.has(technique.id)) return
    guard.add(technique.id)
    for (const requirement of technique.requires ?? []) {
      const prerequisite = byId.get(requirement)
      // Cross-branch prerequisites are handled by the lock check, not the order.
      if (prerequisite) place(prerequisite, guard)
    }
    seen.add(technique.id)
    placed.push(technique)
  }

  for (const technique of sorted) place(technique, new Set())
  return placed
}

export function buildTree(progress: Progress): TreeBranch[] {
  const branches = new Map<SkillBranch, Technique[]>()
  for (const technique of TECHNIQUES) {
    const limb = branches.get(technique.branch)
    if (limb) limb.push(technique)
    else branches.set(technique.branch, [technique])
  }

  const result: TreeBranch[] = []
  for (const [branch, techniques] of branches) {
    const nodes = orderLimb(techniques).map<TreeNode>((technique) => {
      const mastery = masteryFor(progress, technique.id)
      const lessonId = LESSON_BY_TECHNIQUE.get(technique.id)
      if (mastery) {
        return {
          technique,
          state: 'owned',
          stage: mastery.stage,
          score: mastery.score,
          ...(lessonId ? { lessonId } : {}),
        }
      }
      const unmet = (technique.requires ?? [])
        .filter((id) => !masteryFor(progress, id))
        .map((id) => TECHNIQUES.find((entry) => entry.id === id))
        .find((entry): entry is Technique => Boolean(entry))

      return {
        technique,
        state: unmet ? 'locked' : 'available',
        score: 0,
        ...(unmet ? { blockedBy: unmet } : {}),
        ...(lessonId ? { lessonId } : {}),
      }
    })

    const owned = nodes.filter((node) => node.state === 'owned')
    const peak = owned
      .map((node) => node.stage)
      .filter((stage): stage is MasteryStage => Boolean(stage))
      .sort((a, b) => MASTERY_STAGES.indexOf(b) - MASTERY_STAGES.indexOf(a))[0]

    result.push({
      branch,
      name: SKILL_BRANCH_NAMES[branch],
      nodes,
      owned: owned.length,
      ...(peak ? { peak } : {}),
    })
  }

  // Limbs the learner has actually started come first; the rest keep a stable
  // alphabetical order so the tree does not reshuffle between visits.
  return result.sort((a, b) => b.owned - a.owned || a.name.localeCompare(b.name))
}
