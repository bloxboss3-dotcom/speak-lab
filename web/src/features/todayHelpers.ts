import { rolledForward, type WeeklyGoal } from '../core/progression'
import {
  completedSessions as coreCompletedSessions,
  dueReviews as coreDueReviews,
  openMissions as coreOpenMissions,
  reportRealWorldUse as coreReportRealWorldUse,
  type AppState,
} from '../core/state'

/**
 * Thin re-exports so screens import their reads from one place, plus the couple
 * of view-level derivations that would otherwise be repeated on every render.
 */

export const completedSessions = coreCompletedSessions
export const dueReviews = coreDueReviews
export const openMissions = coreOpenMissions

export function reportRealWorldUse(
  state: AppState,
  options: { missionID: string; reflection: string; selfRating: number },
): AppState {
  return coreReportRealWorldUse(state, options).state
}

/** The weekly goal as it stands today, rolled over if a new week has begun. */
export function rolledForwardGoal(state: AppState, now = new Date()): WeeklyGoal {
  const rolled = rolledForward(state.profile.weeklyGoal, now)
  return { ...rolled, target: state.profile.weeklyTarget }
}
