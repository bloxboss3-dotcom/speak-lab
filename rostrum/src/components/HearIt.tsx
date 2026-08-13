'use client'

import { useEffect, useRef, useState } from 'react'
import { asset } from '@/lib/build'
import { Card, Eyebrow, formatClock } from '@/components/ui'
import type { SpeechClip } from '@/lib/types'

/**
 * Hearing the technique.
 *
 * Reading that a structure repeats teaches the shape; hearing it teaches where
 * the pitch climbs and where the pause falls, which is most of why it works.
 *
 * Only public-domain recordings appear here — US officials recorded by federal
 * agencies, which carry no copyright at all. That rules out nearly every famous
 * speech of the last century, so the ones that qualify are labelled with who
 * recorded them and linked to the archive, rather than asking anyone to take it
 * on trust.
 */

/** Only one clip plays at a time; starting one stops whatever was running. */
let playing: HTMLAudioElement | null = null

export function HearIt({ clips }: { clips: SpeechClip[] }) {
  if (clips.length === 0) return null
  return (
    <div className="stack-sm">
      <Eyebrow amber>Hear it</Eyebrow>
      {clips.map((clip) => (
        <ClipPlayer key={clip.file} clip={clip} />
      ))}
    </div>
  )
}

function ClipPlayer({ clip }: { clip: SpeechClip }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const audio = audioRef.current
    return () => {
      if (audio && playing === audio) playing = null
    }
  }, [])

  const toggle = () => {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) {
      audio.pause()
      return
    }
    if (playing && playing !== audio) playing.pause()
    playing = audio
    void audio.play().catch(() => setFailed(true))
  }

  const progress = clip.seconds > 0 ? Math.min(1, elapsed / clip.seconds) : 0

  return (
    <Card>
      <div className="stack-sm">
        <div className="row" style={{ gap: 14, alignItems: 'center' }}>
          <button
            type="button"
            className="play-btn"
            onClick={toggle}
            aria-label={`${isPlaying ? 'Pause' : 'Play'} ${clip.speaker}, ${clip.occasion}`}
          >
            {isPlaying ? (
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <rect x="6" y="5" width="4" height="14" rx="1.2" fill="currentColor" />
                <rect x="14" y="5" width="4" height="14" rx="1.2" fill="currentColor" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path d="M8 5.5v13l11-6.5z" fill="currentColor" />
              </svg>
            )}
          </button>

          <div className="stack-sm" style={{ gap: 4, minWidth: 0, flex: 1 }}>
            <p className="body" style={{ lineHeight: 1.25 }}>
              {clip.speaker}
            </p>
            <p className="caption faint">{clip.occasion}</p>
          </div>

          <span className="numeral caption" style={{ flexShrink: 0 }}>
            {formatClock(isPlaying || elapsed > 0 ? Math.round(clip.seconds - elapsed) : clip.seconds)}
          </span>
        </div>

        <div className="meter" aria-hidden="true">
          <span style={{ width: `${progress * 100}%` }} />
        </div>

        <audio
          ref={audioRef}
          src={asset(`clips/${clip.file}`)}
          preload="none"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onTimeUpdate={(event) => setElapsed(event.currentTarget.currentTime)}
          onEnded={() => {
            setIsPlaying(false)
            setElapsed(0)
          }}
          onError={() => setFailed(true)}
        />

        {failed ? (
          <p className="caption faint">
            This clip would not play in your browser. The recording is public domain and can be
            heard at the archive link below.
          </p>
        ) : null}

        <hr className="rule" />

        <div className="stack-sm" style={{ gap: 5 }}>
          <Eyebrow>What to listen for</Eyebrow>
          <p className="caption">{clip.listenFor}</p>
        </div>

        {/* Stated, not assumed: why this particular recording is free to use. */}
        <p className="caption faint" style={{ fontSize: 11.5, lineHeight: 1.45 }}>
          Public domain — a work of the US federal government. Recorded by {clip.recordedBy}. This
          is a {clip.seconds}-second excerpt beginning {formatClock(clip.startsAt)} into the full
          address.{' '}
          <a href={clip.sourceUrl} target="_blank" rel="noreferrer" className="link">
            Full recording ›
          </a>
        </p>
      </div>
    </Card>
  )
}
