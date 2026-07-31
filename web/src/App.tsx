import { useCallback, useState } from 'react'
import { SpeakLabProvider } from './app/store'
import { Today } from './features/Today'
import { Paths } from './features/Paths'
import { Progress } from './features/Progress'
import { Settings } from './features/Settings'
import { SpeakingSession } from './features/session/SpeakingSession'
import { ConversationSession } from './features/session/ConversationSession'
import type { Scenario } from './core/types'

type Tab = 'today' | 'paths' | 'progress' | 'settings'

interface ActiveSession {
  scenario: Scenario
  isReview: boolean
  isTransfer: boolean
  /** Bumped on each start so a transfer run remounts with clean state. */
  runKey: number
}

const TABS: Array<{ id: Tab; label: string; glyph: string }> = [
  { id: 'today', label: 'Today', glyph: '◎' },
  { id: 'paths', label: 'Paths', glyph: '≡' },
  { id: 'progress', label: 'Progress', glyph: '◫' },
  { id: 'settings', label: 'Setup', glyph: '⚙' },
]

export default function App() {
  return (
    <SpeakLabProvider>
      <Shell />
    </SpeakLabProvider>
  )
}

function Shell() {
  const [tab, setTab] = useState<Tab>('today')
  const [session, setSession] = useState<ActiveSession>()
  const [runKey, setRunKey] = useState(0)

  const start = useCallback(
    (scenario: Scenario, options?: { isReview?: boolean; isTransfer?: boolean }) => {
      setRunKey((current) => current + 1)
      setSession({
        scenario,
        isReview: options?.isReview ?? false,
        isTransfer: options?.isTransfer ?? false,
        runKey: runKey + 1,
      })
      window.scrollTo({ top: 0 })
    },
    [runKey],
  )

  const exit = useCallback(() => {
    setSession(undefined)
    window.scrollTo({ top: 0 })
  }, [])

  if (session) {
    const key = `${session.scenario.id}-${session.runKey}`
    return (
      <div className="app">
        {session.scenario.mode === 'conversation' ? (
          <ConversationSession
            key={key}
            scenario={session.scenario}
            onExit={exit}
            isReview={session.isReview}
            isTransfer={session.isTransfer}
          />
        ) : (
          <SpeakingSession
            key={key}
            scenario={session.scenario}
            onExit={exit}
            onStartScenario={start}
            isReview={session.isReview}
            isTransfer={session.isTransfer}
          />
        )}
      </div>
    )
  }

  return (
    <div className="app">
      {tab === 'today' ? <Today onStart={start} /> : null}
      {tab === 'paths' ? <Paths onStart={start} /> : null}
      {tab === 'progress' ? <Progress /> : null}
      {tab === 'settings' ? <Settings /> : null}

      <nav className="tabbar" aria-label="Main">
        <div className="tabbar__inner">
          {TABS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className="tab"
              aria-current={tab === entry.id ? 'page' : undefined}
              onClick={() => {
                setTab(entry.id)
                window.scrollTo({ top: 0 })
              }}
            >
              <span className="tab__glyph" aria-hidden="true">
                {entry.glyph}
              </span>
              {entry.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
