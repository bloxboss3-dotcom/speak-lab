'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  addClip,
  clipStorageAvailable,
  clipsFor,
  removeClip,
  type LocalClip,
} from '@/lib/localClips'
import { Card, Eyebrow, formatClock } from '@/components/ui'

/**
 * Audio the learner attaches themselves.
 *
 * The shipped clips can only be US federal recordings, because anything in the
 * repository is published when this deploys. Most of the Hall is therefore
 * missing its audio — which is a limit on what this app may distribute, not on
 * what its owner may listen to.
 *
 * Files added here stay in IndexedDB on the device. Nothing is uploaded and
 * nothing is committed, which is stated on screen rather than implied.
 */

/** Soft warning threshold. Browsers allow far more, but a phone should not fill up. */
const LARGE_FILE_MB = 25

export function OwnClips({ techniqueId }: { techniqueId: string }) {
  const [clips, setClips] = useState<LocalClip[]>([])
  const [ready, setReady] = useState(false)
  const [adding, setAdding] = useState(false)
  const [label, setLabel] = useState('')
  const [note, setNote] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    clipsFor(techniqueId)
      .then((found) => setClips(found.sort((a, b) => a.addedAt.localeCompare(b.addedAt))))
      .catch(() => setError('This browser would not open its clip storage.'))
      .finally(() => setReady(true))
  }, [techniqueId])

  useEffect(load, [load])

  if (!ready) return null

  if (!clipStorageAvailable()) {
    return (
      <Card variant="quiet">
        <p className="caption">
          This browser cannot store audio, so your own clips are unavailable here. Private browsing
          usually causes it.
        </p>
      </Card>
    )
  }

  const save = async () => {
    if (!file) return
    try {
      await addClip({
        techniqueId,
        label: label.trim() || file.name.replace(/\.[^.]+$/, ''),
        note: note.trim(),
        blob: file,
      })
      setAdding(false)
      setLabel('')
      setNote('')
      setFile(null)
      setError('')
      load()
    } catch {
      setError('Saving failed — the file may be too large for this browser’s storage.')
    }
  }

  return (
    <div className="stack-sm">
      <Eyebrow>Your own recordings</Eyebrow>

      {clips.map((clip) => (
        <LocalPlayer
          key={clip.id}
          clip={clip}
          onRemove={async () => {
            await removeClip(clip.id)
            load()
          }}
        />
      ))}

      {adding ? (
        <Card>
          <div className="stack-sm">
            <input
              type="file"
              accept="audio/*,video/*"
              className="field"
              aria-label="Choose an audio file"
              onChange={(event) => {
                const chosen = event.target.files?.[0] ?? null
                setFile(chosen)
                setError(
                  chosen && chosen.size > LARGE_FILE_MB * 1024 * 1024
                    ? `That file is ${Math.round(chosen.size / 1024 / 1024)}MB. It will work, but a short excerpt is easier to replay.`
                    : '',
                )
              }}
            />
            <input
              className="field"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="Who and when — e.g. a speech you already have"
              aria-label="Label"
            />
            <textarea
              className="field"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="What to listen for (optional)"
              aria-label="What to listen for"
              style={{ minHeight: 72 }}
            />
            {error ? <p className="caption faint">{error}</p> : null}
            <div className="row" style={{ gap: 8 }}>
              <button type="button" className="btn" disabled={!file} onClick={() => void save()}>
                Save to this device
              </button>
              <button
                type="button"
                className="btn-quiet"
                onClick={() => {
                  setAdding(false)
                  setError('')
                  setFile(null)
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </Card>
      ) : (
        <Card variant="quiet">
          <div className="stack-sm">
            <p className="caption">
              Most of the Hall has no clip here, because this app may only ship recordings that are
              free to publish. You can attach your own for any technique — it stays in this browser,
              is never uploaded, and is not part of the app.
            </p>
            <button type="button" className="btn-quiet" onClick={() => setAdding(true)}>
              Add a recording
            </button>
          </div>
        </Card>
      )}
    </div>
  )
}

function LocalPlayer({ clip, onRemove }: { clip: LocalClip; onRemove: () => void }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [url, setUrl] = useState('')
  const [isPlaying, setIsPlaying] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [duration, setDuration] = useState(0)
  const [confirming, setConfirming] = useState(false)

  // The object URL holds the blob in memory, so it is released on unmount.
  useEffect(() => {
    const created = URL.createObjectURL(clip.blob)
    setUrl(created)
    return () => URL.revokeObjectURL(created)
  }, [clip.blob])

  const toggle = () => {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) audio.pause()
    else void audio.play().catch(() => undefined)
  }

  const progress = duration > 0 ? Math.min(1, elapsed / duration) : 0

  return (
    <Card>
      <div className="stack-sm">
        <div className="row" style={{ gap: 14, alignItems: 'center' }}>
          <button
            type="button"
            className="play-btn"
            onClick={toggle}
            aria-label={`${isPlaying ? 'Pause' : 'Play'} ${clip.label}`}
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
          <div className="stack-sm" style={{ gap: 3, minWidth: 0, flex: 1 }}>
            <p className="body" style={{ lineHeight: 1.25 }}>
              {clip.label}
            </p>
            <p className="caption faint">On this device only</p>
          </div>
          <span className="numeral caption" style={{ flexShrink: 0 }}>
            {formatClock(Math.round(duration > 0 ? duration - elapsed : 0))}
          </span>
        </div>

        <div className="meter" aria-hidden="true">
          <span style={{ width: `${progress * 100}%` }} />
        </div>

        {url ? (
          <audio
            ref={audioRef}
            src={url}
            preload="metadata"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
            onTimeUpdate={(event) => setElapsed(event.currentTarget.currentTime)}
            onEnded={() => {
              setIsPlaying(false)
              setElapsed(0)
            }}
          />
        ) : null}

        {clip.note ? (
          <>
            <hr className="rule" />
            <div className="stack-sm" style={{ gap: 5 }}>
              <Eyebrow>What to listen for</Eyebrow>
              <p className="caption">{clip.note}</p>
            </div>
          </>
        ) : null}

        {confirming ? (
          <div className="row" style={{ gap: 8 }}>
            <button
              type="button"
              className="btn-quiet"
              style={{ color: 'var(--color-live)' }}
              onClick={onRemove}
            >
              Delete it
            </button>
            <button type="button" className="btn-quiet" onClick={() => setConfirming(false)}>
              Keep
            </button>
          </div>
        ) : (
          <button type="button" className="btn-quiet" onClick={() => setConfirming(true)}>
            Remove
          </button>
        )}
      </div>
    </Card>
  )
}
