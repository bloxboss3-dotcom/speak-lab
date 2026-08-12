import { TECHNIQUES, technique as findTechnique } from '@/content/techniques'
import { masteryFor } from './progress'
import { LOADOUT_SLOTS } from './types'
import type { LoadoutSlot, Progress, SkillCategory, Technique } from './types'

/**
 * The Loadout.
 *
 * Five slots covering the shape of a talk: how it opens, how it argues, how it
 * reaches people, how it sounds, how it lands. Equipping is not cosmetic — the
 * Speech Gym puts what is equipped at the top of its plan, so a loadout is a
 * standing answer to "these are the moves I am working on right now".
 *
 * Field Tests deliberately ignore the loadout. Naming a technique before an
 * unprompted-retrieval exercise would destroy the only thing it measures.
 */

/** Which categories belong in which slot. A technique may fit more than one. */
const SLOT_CATEGORIES: Record<LoadoutSlot, SkillCategory[]> = {
  opening: ['openings', 'storytelling', 'engagement'],
  logic: ['argumentation', 'persuasion', 'teaching'],
  emotion: ['emotional-connection', 'empathy', 'motivation'],
  rhetoric: ['rhetoric', 'delivery', 'presence', 'improvisation'],
  closing: ['closings', 'leadership'],
}

export const SLOT_BLURBS: Record<LoadoutSlot, string> = {
  opening: 'How you get into the room.',
  logic: 'How you make the case.',
  emotion: 'How you reach the person, not the crowd.',
  rhetoric: 'The shape of the sentences.',
  closing: 'What they leave holding.',
}

export function slotFor(technique: Technique): LoadoutSlot | undefined {
  return LOADOUT_SLOTS.find((slot) => SLOT_CATEGORIES[slot].includes(technique.category))
}

/** Techniques the learner owns that fit a slot, best-mastered first. */
export function slotCandidates(progress: Progress, slot: LoadoutSlot): Technique[] {
  return TECHNIQUES.filter(
    (technique) =>
      SLOT_CATEGORIES[slot].includes(technique.category) && Boolean(masteryFor(progress, technique.id)),
  ).sort(
    (a, b) =>
      (masteryFor(progress, b.id)?.score ?? 0) - (masteryFor(progress, a.id)?.score ?? 0) ||
      a.name.localeCompare(b.name),
  )
}

/** Equipped technique ids, in slot order, skipping empty and stale slots. */
export function equippedTechniqueIds(progress: Progress): string[] {
  const ids: string[] = []
  for (const slot of LOADOUT_SLOTS) {
    const id = progress.loadout[slot]
    // A slot can hold an id that no longer exists if content changed under a
    // saved record; drop it rather than rendering a blank card.
    if (id && findTechnique(id) && !ids.includes(id)) ids.push(id)
  }
  return ids
}

export function equip(progress: Progress, slot: LoadoutSlot, techniqueId: string | null): Progress {
  const loadout = { ...progress.loadout }
  if (techniqueId) loadout[slot] = techniqueId
  else delete loadout[slot]
  return { ...progress, loadout }
}

/** How many of the five slots are filled with a technique that still exists. */
export function equippedCount(progress: Progress): number {
  return equippedTechniqueIds(progress).length
}
