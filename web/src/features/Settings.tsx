import { useState } from 'react'
import { clearStorage, useSpeakLab } from '../app/store'
import { Button, Card, ChoiceRow, Notice, SectionLabel, Switch } from '../design/components'
import { deleteAllTranscripts, deleteEverything, deleteHistory, setWeeklyTarget } from '../core/state'
import { Recorder } from '../services/recorder'
import { LiveTranscriber } from '../services/transcription'
import { Voice } from '../services/voice'

/**
 * Settings, privacy and the coaching connection.
 *
 * The privacy section is not boilerplate: it states exactly what leaves the
 * device, and every deletion it offers actually happens immediately and locally.
 */
export function Settings() {
  const { state, update, replace, storageFailed } = useSpeakLab()
  const profile = state.profile

  const [proxyURL, setProxyURL] = useState(profile.proxyURL ?? '')
  const [secret, setSecret] = useState(profile.sharedSecret ?? '')
  const [checking, setChecking] = useState(false)
  const [checkResult, setCheckResult] = useState<string>()
  const [confirmWipe, setConfirmWipe] = useState(false)

  const setProfile = (change: Partial<typeof profile>) =>
    update((current) => ({ ...current, profile: { ...current.profile, ...change } }))

  const saveConnection = async () => {
    const trimmed = proxyURL.trim().replace(/\/+$/, '')
    setProfile({
      ...(trimmed ? { proxyURL: trimmed } : { proxyURL: undefined }),
      ...(secret.trim() ? { sharedSecret: secret.trim() } : { sharedSecret: undefined }),
    })
    if (!trimmed) {
      setCheckResult('Cleared. SpeakLab will coach you with its built-in rules.')
      return
    }
    setChecking(true)
    setCheckResult(undefined)
    try {
      const response = await fetch(`${trimmed}/healthz`)
      if (!response.ok) {
        setCheckResult(`The server answered with ${response.status}.`)
      } else {
        const body = (await response.json()) as { model?: string; requiresClientSecret?: boolean }
        setCheckResult(
          `Connected. Model ${body.model ?? 'unknown'}${
            body.requiresClientSecret ? ', shared key required.' : '.'
          }`,
        )
      }
    } catch {
      setCheckResult(
        "Couldn't reach it. Check the address, that it is served over HTTPS, and that this site's origin is in the server's SPEAKLAB_ALLOWED_ORIGINS.",
      )
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="screen stack stack--loose">
      <header className="stack stack--tight">
        <SectionLabel>Settings</SectionLabel>
        <h1 className="display">Setup</h1>
      </header>

      {storageFailed ? (
        <Notice title="Progress isn't being saved" tone="warning">
          This browser refused to write to local storage — private browsing usually causes it. The
          session you're in still works, but history won't survive a reload.
        </Notice>
      ) : null}

      <Card>
        <div className="stack stack--tight">
          <SectionLabel>Practice</SectionLabel>
          <p className="body">Sessions per week</p>
          <ChoiceRow
            ariaLabel="Weekly target"
            value={profile.weeklyTarget}
            onChange={(value) => update((current) => setWeeklyTarget(current, value))}
            options={[2, 3, 4, 5, 6].map((n) => ({ value: n, label: String(n) }))}
          />
          <p className="caption">
            Missing a week costs nothing. A rest day each week covers a missed day so the streak
            survives real life.
          </p>
          <hr className="divider" />
          <Switch
            label="Speak the other person's lines"
            description="Conversation practice works better heard than read."
            checked={profile.speakCharacterAloud}
            onChange={(value) => setProfile({ speakCharacterAloud: value })}
          />
          <Switch
            label="Try automatic transcription"
            description={
              LiveTranscriber.isSupported
                ? 'Uses your browser’s speech recognition while you record. If it returns nothing, you can type instead.'
                : 'This browser has no speech recognition, so you will be asked to type what you said.'
            }
            checked={profile.autoTranscribe}
            onChange={(value) => setProfile({ autoTranscribe: value })}
          />
          <Switch
            label="Ask how nervous I feel"
            description="A 1–5 note before and after a session. Not a diagnosis, and not treatment."
            checked={profile.trackAnxiety}
            onChange={(value) => setProfile({ trackAnxiety: value })}
          />
        </div>
      </Card>

      <Card>
        <div className="stack stack--tight">
          <SectionLabel>Coaching server</SectionLabel>
          <p className="body body--muted">
            SpeakLab works with no server at all — it coaches from measurements taken in your
            browser. Connecting a server adds Claude's analysis and turns the simulated conversations
            into real ones.
          </p>
          <input
            className="field"
            type="url"
            inputMode="url"
            autoComplete="off"
            value={proxyURL}
            onChange={(event) => setProxyURL(event.target.value)}
            placeholder="https://your-coach.example.com"
            aria-label="Coaching server address"
          />
          <input
            className="field"
            type="password"
            autoComplete="off"
            value={secret}
            onChange={(event) => setSecret(event.target.value)}
            placeholder="Shared key (optional)"
            aria-label="Shared key"
          />
          <Button onClick={() => void saveConnection()} disabled={checking}>
            {checking ? 'Checking…' : 'Save and test'}
          </Button>
          {checkResult ? <p className="caption">{checkResult}</p> : null}
          <p className="caption">
            <strong>Never paste an Anthropic API key here.</strong> Anything typed into a web page is
            visible to that page. The server in <code>server/</code> holds the key; this browser only
            ever learns its address.
          </p>
        </div>
      </Card>

      <Card>
        <div className="stack stack--tight">
          <SectionLabel>What leaves this device</SectionLabel>
          <ul className="bullets body">
            <li>
              <strong>Audio: never.</strong> Recordings exist only in this tab and are discarded when
              you leave the session.
            </li>
            <li>
              <strong>Transcription:</strong> if automatic transcription is on, your browser handles
              it. Safari and Chrome send audio to Apple's or Google's servers to do that — that is
              the browser's own speech feature, not SpeakLab.
            </li>
            <li>
              <strong>To the coaching server (only if you connect one):</strong> the transcript, the
              measurements, and the scenario text. Never audio, never your history.
            </li>
            <li>
              <strong>Everything else stays here</strong>, in this browser's local storage. There is
              no account and no analytics.
            </li>
          </ul>
        </div>
      </Card>

      <Card>
        <div className="stack stack--tight">
          <SectionLabel>Your data</SectionLabel>
          <Button
            variant="secondary"
            block
            onClick={() => update((current) => deleteAllTranscripts(current))}
          >
            Delete transcripts and coaching text
          </Button>
          <p className="caption">Keeps your progress, removes every word you said.</p>
          <Button variant="secondary" block onClick={() => update((current) => deleteHistory(current))}>
            Delete practice history
          </Button>
          <p className="caption">Removes sessions and missions. Settings and XP stay.</p>
          {confirmWipe ? (
            <div className="stack stack--tight">
              <p className="body">
                This erases everything: history, XP, levels, unlocked nuggets, and these settings.
                It cannot be undone.
              </p>
              <div className="row">
                <Button
                  variant="danger"
                  onClick={() => {
                    clearStorage()
                    replace(deleteEverything())
                    setConfirmWipe(false)
                  }}
                >
                  Erase everything
                </Button>
                <Button variant="quiet" onClick={() => setConfirmWipe(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="danger" block onClick={() => setConfirmWipe(true)}>
              Erase everything
            </Button>
          )}
        </div>
      </Card>

      <Card variant="plain">
        <div className="stack stack--tight">
          <SectionLabel>This browser</SectionLabel>
          <p className="caption">
            Microphone: {Recorder.isSupported ? 'supported' : 'not available'} · Speech recognition:{' '}
            {LiveTranscriber.isSupported ? 'supported' : 'not available'} · Speech output:{' '}
            {Voice.isSupported ? 'supported' : 'not available'}
          </p>
          <p className="caption">
            On iPhone, add SpeakLab to your home screen from the Share menu and it opens without
            Safari's chrome. The microphone needs HTTPS, which the published page uses.
          </p>
        </div>
      </Card>

      <Card variant="plain">
        <div className="stack stack--tight">
          <SectionLabel>What SpeakLab does not do</SectionLabel>
          <p className="caption">
            It does not measure charisma, confidence, authority, honesty or personality — none of
            those are observable from a recording, and any app that claims otherwise is guessing. It
            gives no overall score. It is communication training, not therapy, and it does not
            diagnose anxiety.
          </p>
        </div>
      </Card>
    </div>
  )
}
