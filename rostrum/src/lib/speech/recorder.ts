
/**
 * Microphone capture.
 *
 * Two things happen at once. `MediaRecorder` keeps the audio so the learner can
 * play their attempt back, and an `AnalyserNode` samples the signal twenty
 * times a second to drive the live waveform and to work out — from the audio
 * itself, not from the transcript — when the person was actually speaking.
 *
 * That second job is what makes pauses, leading silence and speaking time real
 * measurements rather than guesses. Word placement inside a phrase is still an
 * estimate, and everything that shows it says so.
 */

/** A contiguous run of speech, in seconds from the start of the recording. */
export interface SpeechRegion {
  start: number
  end: number
}

export interface Recording {
  /** Object URL for playback, or undefined if the browser gave us no audio. */
  url?: string
  blob?: Blob
  duration: number
  regions: SpeechRegion[]
  /** Peak-normalised levels, ~20 per second, for drawing the waveform. */
  levels: number[]
}

export type RecorderPermission = 'unknown' | 'granted' | 'denied'

const SAMPLE_INTERVAL_MS = 50
/** Below this fraction of the loudest sample, we call it silence. */
const SILENCE_RATIO = 0.12
/** A speech run shorter than this is a click or a breath, not a phrase. */
const MIN_REGION_SECONDS = 0.18
/** Gaps shorter than this are within-phrase, not pauses between phrases. */
const MERGE_GAP_SECONDS = 0.22

export class Recorder {
  permission: RecorderPermission = 'unknown'
  lastError?: string

  private stream?: MediaStream
  private context?: AudioContext
  private analyser?: AnalyserNode
  private mediaRecorder?: MediaRecorder
  private chunks: Blob[] = []
  private samples: number[] = []
  private timer?: ReturnType<typeof setInterval>
  private startedAt = 0
  private onSample?: (level: number, elapsed: number) => void

  get isRecording(): boolean {
    return this.timer !== undefined
  }

  static get isSupported(): boolean {
    return (
      typeof navigator !== 'undefined' &&
      typeof navigator.mediaDevices?.getUserMedia === 'function' &&
      typeof window !== 'undefined' &&
      typeof window.MediaRecorder !== 'undefined'
    )
  }

  /** Resolves true once the microphone is live. */
  async start(onSample?: (level: number, elapsed: number) => void): Promise<boolean> {
    this.lastError = undefined
    this.onSample = onSample
    if (!Recorder.isSupported) {
      this.lastError = 'This browser cannot record audio.'
      return false
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      })
      this.permission = 'granted'
    } catch (error) {
      this.permission = 'denied'
      this.lastError =
        error instanceof DOMException && error.name === 'NotAllowedError'
          ? 'Microphone access was refused. SpeakLab cannot record without it.'
          : 'The microphone could not be started.'
      return false
    }

    try {
      const AudioContextClass =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (AudioContextClass) {
        this.context = new AudioContextClass()
        // Safari starts contexts suspended until a gesture has resumed one.
        if (this.context.state === 'suspended') await this.context.resume()
        const source = this.context.createMediaStreamSource(this.stream)
        this.analyser = this.context.createAnalyser()
        this.analyser.fftSize = 1024
        source.connect(this.analyser)
      }
    } catch {
      // Metering is a nice-to-have; recording still works without it.
      this.analyser = undefined
    }

    this.chunks = []
    try {
      this.mediaRecorder = new MediaRecorder(this.stream, pickMimeType())
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) this.chunks.push(event.data)
      }
      this.mediaRecorder.start()
    } catch {
      // Playback is optional too — some browsers refuse every mime type.
      this.mediaRecorder = undefined
    }

    this.samples = []
    this.startedAt = performance.now()
    this.timer = setInterval(() => this.sample(), SAMPLE_INTERVAL_MS)
    return true
  }

  private sample(): void {
    const elapsed = (performance.now() - this.startedAt) / 1000
    let level = 0
    if (this.analyser) {
      const buffer = new Float32Array(this.analyser.fftSize)
      this.analyser.getFloatTimeDomainData(buffer)
      let sum = 0
      for (const value of buffer) sum += value * value
      level = Math.sqrt(sum / buffer.length)
    }
    this.samples.push(level)
    this.onSample?.(level, elapsed)
  }

  /** Stops capture and returns the finished recording. */
  async stop(): Promise<Recording> {
    if (this.timer) clearInterval(this.timer)
    this.timer = undefined
    const duration = Math.max(0, (performance.now() - this.startedAt) / 1000)

    const blob = await this.finishMediaRecorder()

    this.stream?.getTracks().forEach((track) => track.stop())
    this.stream = undefined
    await this.context?.close().catch(() => undefined)
    this.context = undefined
    this.analyser = undefined

    const levels = normalise(this.samples)
    const recording: Recording = {
      duration,
      regions: regionsFrom(levels, SAMPLE_INTERVAL_MS / 1000, duration),
      levels,
    }
    if (blob && blob.size > 0) {
      recording.blob = blob
      recording.url = URL.createObjectURL(blob)
    }
    return recording
  }

  private finishMediaRecorder(): Promise<Blob | undefined> {
    const recorder = this.mediaRecorder
    this.mediaRecorder = undefined
    if (!recorder || recorder.state === 'inactive') return Promise.resolve(undefined)
    return new Promise((resolve) => {
      recorder.onstop = () => {
        resolve(new Blob(this.chunks, { type: recorder.mimeType || 'audio/webm' }))
        this.chunks = []
      }
      try {
        recorder.stop()
      } catch {
        resolve(undefined)
      }
    })
  }

  /** Throws the recording away without producing anything. */
  cancel(): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = undefined
    try {
      this.mediaRecorder?.stop()
    } catch {
      // Already stopped; nothing to clean up.
    }
    this.mediaRecorder = undefined
    this.chunks = []
    this.stream?.getTracks().forEach((track) => track.stop())
    this.stream = undefined
    void this.context?.close().catch(() => undefined)
    this.context = undefined
    this.analyser = undefined
  }
}

function pickMimeType(): MediaRecorderOptions {
  const candidates = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm']
  for (const mimeType of candidates) {
    if (MediaRecorder.isTypeSupported?.(mimeType)) return { mimeType }
  }
  return {}
}

function normalise(samples: number[]): number[] {
  const peak = samples.reduce((highest, value) => Math.max(highest, value), 0)
  if (peak <= 0) return samples.map(() => 0)
  return samples.map((value) => Math.min(1, value / peak))
}

/**
 * Turns the level envelope into speech regions.
 *
 * Peak-relative rather than absolute, so a quiet microphone and a loud one both
 * produce sensible regions. If there is no metering at all, the whole recording
 * counts as one region — better than reporting a pause that never happened.
 */
export function regionsFrom(
  levels: number[],
  secondsPerSample: number,
  duration: number,
): SpeechRegion[] {
  if (levels.length === 0 || levels.every((level) => level === 0)) {
    return duration > 0 ? [{ start: 0, end: duration }] : []
  }

  const raw: SpeechRegion[] = []
  let openedAt: number | undefined
  for (let index = 0; index < levels.length; index += 1) {
    const loud = (levels[index] ?? 0) >= SILENCE_RATIO
    const at = index * secondsPerSample
    if (loud && openedAt === undefined) openedAt = at
    if (!loud && openedAt !== undefined) {
      raw.push({ start: openedAt, end: at })
      openedAt = undefined
    }
  }
  if (openedAt !== undefined) raw.push({ start: openedAt, end: duration })

  const merged: SpeechRegion[] = []
  for (const region of raw) {
    const previous = merged[merged.length - 1]
    if (previous && region.start - previous.end <= MERGE_GAP_SECONDS) {
      previous.end = region.end
    } else {
      merged.push({ ...region })
    }
  }

  const kept = merged.filter((region) => region.end - region.start >= MIN_REGION_SECONDS)
  return kept.length > 0 ? kept : [{ start: 0, end: duration }]
}
