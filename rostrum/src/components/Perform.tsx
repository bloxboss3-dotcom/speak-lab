'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Recorder } from '@/lib/speech/recorder'
import { LiveTranscriber } from '@/lib/speech/transcription'
import { Card, Chip, Eyebrow, formatClock } from './ui'
import type { Scenario } from '@/lib/types'

/**
 * The performance screen.
 *
 * Prep, then speak. Recording state is unmistakable — the whole screen shifts,
 * a waveform moves, a dot pulses — because nobody should ever be uncertain
 * whether the microphone is live. When the browser cannot transcribe (Firefox,
 * a denied permission, a silent recogniser) the timing is still measured and
 * the learner types what they said, so the loop always completes.
 */

export interface Performance {
  transcript: string
  durationSeconds: number
  durationMeasured: boolean
}

type Phase = 'prep' | 'recording' | 'typing'

export function Perform({
  scenario,
  missionOverride,
  cue,
  autoTranscribe,
  onDone,
  onCancel,
}: {
  scenario: Scenario
  /** Field Tests replace the mission but never name a technique. */
  missionOverride?: string
  /** The one instruction to hold while speaking, on a retry. */
  cue?: string
  autoTranscribe: boolean
  onDone: (performance: Performance) => void
  onCancel: () => void
}) {
  const [phase, setPhase] = useState<Phase>('prep')
  const [prepLeft, setPrepLeft] = useState(scenario.prepSeconds)
  const [elapsed, setElapsed] = useState(0)
  const [levels, setLevels] = useState<number[]>([])
  const [live, setLive] = useState(false)
  const [liveText, setLiveText] = useState('')
  const [typed, setTyped] = useState('')
  const [duration, setDuration] = useState(0)
  const [measured, setMeasured] = useState(false)
  const [notice, setNotice] = useState<string>()

  const recorder = useRef<Recorder | null>(null)
  const transcriber = useRef<LiveTranscriber | undefined>(undefined)
  const stopping = useRef(false)

  useEffect(() => {
    recorder.current = new Recorder()
    return () => {
      recorder.current?.cancel()
      transcriber.current?.abort()
    }
  }, [])

  // Prep countdown. The learner can start early at any point.
  useEffect(() => {
    if (phase !== 'prep' || prepLeft <= 0) return
    const timer = setTimeout(() => setPrepLeft((value) => value - 1), 1000)
    return () => clearTimeout(timer)
  }, [phase, prepLeft])

  const beginRecording = useCallback(async () => {
    setPhase('recording')
    setNotice(undefined)
    const started = await recorder.current?.start((level, at) => {
      setElapsed(at)
      setLevels((current) => [...current.slice(-100), level])
    })
    if (!started) {
      setNotice(
        recorder.current?.lastError ??
          'The microphone is not available. Type your answer instead — it still counts.',
      )
      setPhase('typing')
      return
    }
    setLive(true)
    if (autoTranscribe && LiveTranscriber.isSupported) {
      const instance = new LiveTranscriber()
      transcriber.current = instance
      instance.start(() => setLiveText(instance.liveText))
    }
  }, [autoTranscribe])

  const stopRecording = useCallback(async () => {
    if (stopping.current) return
    stopping.current = true
    setLive(false)

    const recording = await recorder.current?.stop()
    const result = transcriber.current?.stop()
    transcriber.current = undefined
    stopping.current = false

    const seconds = recording?.duration ?? elapsed
    setDuration(seconds)
    setMeasured(true)

    const transcript = result?.transcript.trim() ?? ''
    if (transcript.length > 0) {
      onDone({ transcript, durationSeconds: seconds, durationMeasured: true })
      return
    }

    setNotice(
      result?.note ??
        'Your browser did not return any words. The timing was still measured — type roughly what you said.',
    )
    setPhase('typing')
  }, [elapsed, onDone])

  // Hard stop at the scenario's limit so a runaway recording cannot trap anyone.
  useEffect(() => {
    if (phase !== 'recording' || !live) return
    if (elapsed >= scenario.speakSeconds + 15) void stopRecording()
  }, [phase, live, elapsed, scenario.speakSeconds, stopRecording])

  const remaining = Math.max(0, scenario.speakSeconds - elapsed)
  const overtime = elapsed > scenario.speakSeconds

  if (phase === 'prep') {
    return (
      <div className="screen screen--plain stack-lg enter">
        <div className="row-between">
          <Eyebrow amber>Prepare</Eyebrow>
          <button type="button" className="btn-quiet" onClick={onCancel}>
            Leave
          </button>
        </div>

        <div style={{ textAlign: 'center' }}>
          <div className="numeral" style={{ fontSize: 64, lineHeight: 1 }}>
            {prepLeft}
          </div>
          <p className="caption" style={{ marginTop: 6 }}>
            seconds to think — not to script
          </p>
        </div>

        <Card variant="amber">
          <div className="stack-sm">
            <Eyebrow>The situation</Eyebrow>
            <p className="body">{scenario.situation}</p>
            <hr className="rule" style={{ margin: '6px 0' }} />
            <Eyebrow>Your mission</Eyebrow>
            <p className="heading">{missionOverride ?? scenario.mission}</p>
          </div>
        </Card>

        {cue ? (
          <Card variant="sunken">
            <div className="stack-sm">
              <Eyebrow amber>Change this one thing</Eyebrow>
              <p className="heading">{cue}</p>
            </div>
          </Card>
        ) : null}

        <div className="row" style={{ justifyContent: 'center', gap: 8 }}>
          <Chip>{formatClock(scenario.speakSeconds)} to speak</Chip>
          <Chip>Intensity {scenario.intensity}/4</Chip>
        </div>

        <button type="button" className="btn btn-block" onClick={() => void beginRecording()}>
          {prepLeft > 0 ? 'Start now' : 'Speak'}
        </button>
      </div>
    )
  }

  if (phase === 'typing') {
    return (
      <div className="screen screen--plain stack enter">
        <div className="row-between">
          <Eyebrow>Your answer</Eyebrow>
          <button type="button" className="btn-quiet" onClick={onCancel}>
            Leave
          </button>
        </div>

        {notice ? (
          <Card variant="sunken">
            <p className="caption">{notice}</p>
          </Card>
        ) : null}

        <textarea
          className="field"
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          placeholder="What you said…"
          aria-label="Type what you said"
          autoFocus
          style={{ minHeight: 200 }}
        />

        <button
          type="button"
          className="btn btn-block"
          disabled={typed.trim().length === 0}
          onClick={() =>
            onDone({
              transcript: typed.trim(),
              durationSeconds: duration > 0 ? duration : estimateSeconds(typed),
              durationMeasured: measured,
            })
          }
        >
          Get coached
        </button>
      </div>
    )
  }

  return (
    <div className={live ? 'stage stage-live' : 'stage'}>
      <div className="screen screen--plain stack-lg">
        <div className="row-between">
          <span className="row">
            {live ? (
              <>
                <span className="record-dot" />
                <span className="eyebrow" style={{ color: 'var(--color-live)' }}>
                  Recording
                </span>
              </>
            ) : (
              <span className="eyebrow">Starting…</span>
            )}
          </span>
          <button type="button" className="btn-quiet" onClick={onCancel}>
            Cancel
          </button>
        </div>

        <div style={{ textAlign: 'center' }}>
          <div
            className="numeral"
            style={{ fontSize: 66, lineHeight: 1, color: overtime ? 'var(--color-live)' : undefined }}
          >
            {formatClock(overtime ? elapsed - scenario.speakSeconds : remaining)}
          </div>
          <p className="caption" style={{ marginTop: 6 }}>
            {overtime ? 'over time' : 'remaining'}
          </p>
        </div>

        <Waveform levels={levels} live={live} />

        <Card variant="sunken">
          <div className="stack-sm">
            <Eyebrow amber>Mission</Eyebrow>
            <p className="body">{missionOverride ?? scenario.mission}</p>
            {cue ? <p className="caption" style={{ color: 'var(--color-amber)' }}>{cue}</p> : null}
          </div>
        </Card>

        {liveText ? (
          <p className="caption" style={{ maxHeight: 72, overflow: 'hidden' }}>
            {liveText}
          </p>
        ) : null}

        <div style={{ flex: 1 }} />

        <div className="stack-sm" style={{ alignItems: 'center' }}>
          <button
            type="button"
            className="record-btn"
            onClick={() => void stopRecording()}
            disabled={!live}
            aria-label="Stop and get coached"
          >
            <span className="record-btn-square" />
          </button>
          <p className="caption">Tap when you have finished</p>
        </div>
      </div>
    </div>
  )
}

function Waveform({ levels, live }: { levels: number[]; live: boolean }) {
  const bars = 40
  const tail = levels.slice(-bars)
  const padded = [...Array<number>(Math.max(0, bars - tail.length)).fill(0.02), ...tail]
  return (
    <div className={live ? 'wave wave-live' : 'wave'} aria-hidden="true">
      {padded.map((level, index) => (
        <div
          key={index}
          className="wave-bar"
          style={{
            height: `${Math.max(3, Math.min(1, level) * 84)}px`,
            opacity: live ? 0.4 + Math.min(1, level) * 0.6 : 0.4,
          }}
        />
      ))}
    </div>
  )
}

/** Typed answers have no measured duration; reading pace is the honest guess. */
function estimateSeconds(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length
  return Math.round((words / 150) * 60)
}
