'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { PROGRESS_VERSION, emptyProgress } from './progress'
import type { Progress } from './types'

/**
 * Persistence.
 *
 * Everything lives in localStorage on this device. No account, no sync, no
 * analytics — there is nowhere for a record of how badly someone spoke on a
 * Tuesday to go. Supabase can be added behind this same interface later; the
 * shape of `Progress` was designed to be a row.
 */

const KEY = 'rostrum.progress.v1'

interface StoreValue {
  progress: Progress
  /** Applies a pure update. Persisted immediately. */
  update: (change: (current: Progress) => Progress) => void
  replace: (next: Progress) => void
  /** True once the browser's stored value has been read — avoids a flash of empty state. */
  ready: boolean
  /** True when localStorage refused to write (private mode, quota). */
  storageFailed: boolean
}

const StoreContext = createContext<StoreValue | undefined>(undefined)

function load(): Progress {
  if (typeof window === 'undefined') return emptyProgress()
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return emptyProgress()
    const parsed = JSON.parse(raw) as Partial<Progress>
    if (parsed.version !== PROGRESS_VERSION) return emptyProgress()
    // Merge over a fresh record so a field added in a later build is never
    // undefined at runtime just because the stored blob predates it.
    const base = emptyProgress()
    return {
      ...base,
      ...parsed,
      version: PROGRESS_VERSION,
      profile: { ...base.profile, ...parsed.profile },
      streak: { ...base.streak, ...parsed.streak },
      mastery: parsed.mastery ?? {},
      attempts: parsed.attempts ?? [],
      completedLessonIds: parsed.completedLessonIds ?? [],
      completedFieldTestIds: parsed.completedFieldTestIds ?? [],
      completedPrincipleIds: parsed.completedPrincipleIds ?? [],
      gymSessions: parsed.gymSessions ?? [],
      unlockedAchievementIds: parsed.unlockedAchievementIds ?? [],
      loadout: parsed.loadout ?? {},
    }
  } catch {
    return emptyProgress()
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  // Server and first client render must agree, so the stored value is read in
  // an effect rather than during render.
  const [progress, setProgress] = useState<Progress>(() => emptyProgress())
  const [ready, setReady] = useState(false)
  const [storageFailed, setStorageFailed] = useState(false)

  useEffect(() => {
    setProgress(load())
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready) return
    try {
      window.localStorage.setItem(KEY, JSON.stringify(progress))
      setStorageFailed(false)
    } catch {
      setStorageFailed(true)
    }
  }, [progress, ready])

  const update = useCallback((change: (current: Progress) => Progress) => {
    setProgress((current) => change(current))
  }, [])

  const replace = useCallback((next: Progress) => setProgress(next), [])

  const value = useMemo<StoreValue>(
    () => ({ progress, update, replace, ready, storageFailed }),
    [progress, update, replace, ready, storageFailed],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreValue {
  const value = useContext(StoreContext)
  if (!value) throw new Error('useStore must be used inside StoreProvider')
  return value
}

export function clearStoredProgress(): void {
  try {
    window.localStorage.removeItem(KEY)
  } catch {
    // The in-memory reset still happens.
  }
}
