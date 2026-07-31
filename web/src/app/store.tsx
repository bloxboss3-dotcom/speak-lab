import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { STATE_VERSION, emptyState, type AppState } from '../core/state'
import type { CoachSettings } from '../services/coach'
import { Recorder } from '../services/recorder'
import { Voice } from '../services/voice'

/**
 * Persistence and shared services.
 *
 * Everything lives in `localStorage` on the learner's own device. No account,
 * no sync, no analytics — there is nowhere for practice history to go, which is
 * the strongest version of "store as little personal data as possible".
 */

const STORAGE_KEY = 'speaklab.state.v1'

interface SpeakLabContextValue {
  state: AppState
  update: (change: (state: AppState) => AppState) => void
  replace: (state: AppState) => void
  recorder: Recorder
  voice: Voice
  coachSettings: CoachSettings
  /** True when the last write to localStorage failed (private mode, quota). */
  storageFailed: boolean
}

const SpeakLabContext = createContext<SpeakLabContextValue | undefined>(undefined)

function load(): AppState {
  if (typeof localStorage === 'undefined') return emptyState()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyState()
    const parsed = JSON.parse(raw) as Partial<AppState>
    if (parsed.version !== STATE_VERSION) return emptyState()
    // Merge over a fresh state so a field added in a later build is never
    // undefined at runtime just because the stored blob predates it.
    const fresh = emptyState()
    return {
      ...fresh,
      ...parsed,
      version: STATE_VERSION,
      profile: { ...fresh.profile, ...parsed.profile },
      skillProgress: parsed.skillProgress ?? {},
      sessions: parsed.sessions ?? [],
      missions: parsed.missions ?? [],
      unlockedNuggets: parsed.unlockedNuggets ?? [],
    }
  } catch {
    return emptyState()
  }
}

export function SpeakLabProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(load)
  const [storageFailed, setStorageFailed] = useState(false)
  const recorder = useRef(new Recorder()).current
  const voice = useRef(new Voice()).current

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
      setStorageFailed(false)
    } catch {
      setStorageFailed(true)
    }
  }, [state])

  useEffect(() => {
    voice.enabled = state.profile.speakCharacterAloud
  }, [voice, state.profile.speakCharacterAloud])

  const update = useCallback((change: (current: AppState) => AppState) => {
    setState((current) => change(current))
  }, [])

  const replace = useCallback((next: AppState) => setState(next), [])

  const coachSettings = useMemo<CoachSettings>(() => {
    const settings: CoachSettings = {}
    if (state.profile.proxyURL) settings.proxyURL = state.profile.proxyURL
    if (state.profile.sharedSecret) settings.sharedSecret = state.profile.sharedSecret
    return settings
  }, [state.profile.proxyURL, state.profile.sharedSecret])

  const value = useMemo<SpeakLabContextValue>(
    () => ({ state, update, replace, recorder, voice, coachSettings, storageFailed }),
    [state, update, replace, recorder, voice, coachSettings, storageFailed],
  )

  return <SpeakLabContext.Provider value={value}>{children}</SpeakLabContext.Provider>
}

export function useSpeakLab(): SpeakLabContextValue {
  const value = useContext(SpeakLabContext)
  if (!value) throw new Error('useSpeakLab must be used inside SpeakLabProvider')
  return value
}

/** Clears the persisted blob outright, for the "delete everything" action. */
export function clearStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Nothing else to try; the in-memory reset still happens.
  }
}
