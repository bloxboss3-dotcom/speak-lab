'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { asset } from '@/lib/build'
import { shadowMatch, shadowVerdict, type ShadowMatch } from '@/lib/shadow'
import { LiveTranscriber } from '@/lib/speech/transcription'
import { Card, Eyebrow } from '@/components/ui'
import type { Breakdown, SpeechClip } from '@/lib/types'

/**
 * Shadowing.
 *
 * Copy the line before inventing one. The words stay on screen the whole time
 * on purpose — this is imitation, not recall, and hiding them would turn a
 * copying drill into a memory test.
 *
 * Reps are short and there is no score. Asking "how good was that" is
 * meaningless when the words were handed over; the only honest question is
 * whether they were actually said, so the app counts and reports a count. The
 * last rep is the only one where the learner supplies their own content, and
 * that is the one worth coaching.
 */

type Phase = 'idle' | 'listening' | 'checked'

export function ShadowDrill({
  breakdown,
  clip,
  onFinish,
}: {
  breakdown: Breakdown
  clip?: SpeechClip | undefined
  onFinish: () => void
}) {
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>('idle')
  const [heard, setHeard] = useState('')
  const [match, setMatch] = useState<ShadowMatch>()
  const [typed, setTyped] = useState('')
  const transcriberRef = useRef<LiveTranscriber | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const lines = breakdown.lines
  const line = lines[index]
  const canListen = useMemo(() => LiveTranscriber.isSupported, [])
  const done = index >= lines.length

  const stop = useCallback(() => {
    transcriberRef.current?.abort()
    transcriberRef.current = null
  }, [])

  const listen = useCallback(() => {
    if (!line) return
    setHeard('')
    setMatch(undefined)
    const transcriber = new LiveTranscriber()
    // start() reports whether recognition could begin at all; stop() hands back
    // the transcript synchronously, so there is no completion callback.
    const started = transcriber.start(() => setHeard(transcriber.liveText))
    if (!started) return
    transcriberRef.current = transcriber
    setPhase('listening')
  }, [line])

  const finish = useCallback(() => {
    if (!line) return
    const transcriber = transcriberRef.current
    const result = transcriber?.stop()
    transcriberRef.current = null
    const said = result?.transcript ?? heard
    setHeard(said)
    setMatch(shadowMatch(said, line.text))
    setPhase('checked')
  }, [line, heard])

  const check = (text: string) => {
    if (!line) return
    setHeard(text)
    setMatch(shadowMatch(text, line.text))
    setPhase('checked')
  }

  const next = () => {
    stop()
    setPhase('idle')
    setHeard('')
    setMatch(undefined)
    setTyped('')
    setIndex((current) => current + 1)
  }

  if (done) {
    return (
      <Card variant="amber">
        <div className="stack-sm">
          <Eyebrow amber>You have said all of it</Eyebrow>
          <p className="body">{breakdown.nowYou}</p>
          <button type="button" className="btn btn-block" onClick={onFinish}>
            Now do it with your own words
          </button>
        </div>
      </Card>
    )
  }

  if (!line) return null

  const verdict = match ? shadowVerdict(match) : undefined

  return (
    <div className="stack-sm">
      <div className="row-between">
        <Eyebrow amber>Say it back</Eyebrow>
        <span className="caption faint">
          {index + 1} of {lines.length}
        </span>
      </div>

      <Card variant="amber">
        <div className="stack-sm">
          <p className="spoken">“{line.text}”</p>
          {/* Only when the lines actually came from that recording. A clip
              attached to a technique demonstrates the move; it is not the
              source of an example written for this app, and offering it as
              "the original" of one would be a lie. */}
          {clip && breakdown.verbatim ? (
            <>
              <button
                type="button"
                className="btn-quiet"
                onClick={() => void audioRef.current?.play().catch(() => undefined)}
              >
                ▸ Hear the original
              </button>
              <audio ref={audioRef} src={asset(`clips/${clip.file}`)} preload="none" />
            </>
          ) : null}
        </div>
      </Card>

      <p className="caption faint">{line.doing}</p>

      {phase === 'listening' ? (
        <Card>
          <div className="stack-sm">
            <span className="row" style={{ gap: 8 }}>
              <span className="rec-dot" aria-hidden="true" />
              <span className="eyebrow">Listening</span>
            </span>
            <p className="caption">{heard || 'Say the line.'}</p>
            <button
              type="button"
              className="btn btn-block"
              onClick={finish}
            >
              Done
            </button>
          </div>
        </Card>
      ) : null}

      {phase === 'checked' && match ? (
        <Card {...(verdict === 'close' ? { variant: 'amber' as const } : {})}>
          <div className="stack-sm">
            <Eyebrow amber={verdict === 'close'}>
              {verdict === 'close'
                ? 'That was it'
                : verdict === 'partial'
                  ? 'Most of it'
                  : 'Not quite that one'}
            </Eyebrow>
            <p className="caption">
              You said {match.matched} of the {match.total} words that carry it.
            </p>
            {match.missed.length > 0 && verdict !== 'close' ? (
              <p className="caption faint">Missing: {match.missed.slice(0, 6).join(', ')}</p>
            ) : null}
            <div className="row" style={{ gap: 8 }}>
              <button type="button" className="btn" onClick={next}>
                {index + 1 === lines.length ? 'Finish' : 'Next line'}
              </button>
              <button
                type="button"
                className="btn-quiet"
                onClick={() => {
                  setPhase('idle')
                  setMatch(undefined)
                  setHeard('')
                }}
              >
                Again
              </button>
            </div>
          </div>
        </Card>
      ) : null}

      {phase === 'idle' ? (
        <div className="stack-sm">
          {canListen ? (
            <button type="button" className="btn btn-block" onClick={listen}>
              Say it
            </button>
          ) : null}
          <details className="disclosure">
            <summary className="caption">
              {canListen ? 'Or type it instead' : 'Type what you said'}
            </summary>
            <div className="stack-sm" style={{ marginTop: 10 }}>
              <textarea
                className="field"
                value={typed}
                onChange={(event) => setTyped(event.target.value)}
                aria-label="Type the line"
                style={{ minHeight: 70 }}
              />
              <button
                type="button"
                className="btn"
                disabled={!typed.trim()}
                onClick={() => check(typed)}
              >
                Check it
              </button>
            </div>
          </details>
          <button type="button" className="btn-quiet" onClick={next}>
            Skip this line
          </button>
        </div>
      ) : null}
    </div>
  )
}
