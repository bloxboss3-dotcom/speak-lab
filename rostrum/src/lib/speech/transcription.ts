/**
 * Live speech recognition, where the browser offers it.
 *
 * The Web Speech API is the only transcription available to a page with no
 * server, and it is uneven: Chrome and Safari implement it, Firefox does not,
 * and Safari sends audio to Apple for recognition. So this wrapper does two
 * things — it reports honestly whether it is available, and it never becomes
 * load-bearing. If recognition is missing, refused, or returns nothing, the
 * session falls back to the learner typing what they said, and the loop
 * completes either way.
 */

export type TranscriptionAvailability = 'available' | 'unsupported' | 'denied'

export interface TranscriptionResult {
  transcript: string
  /** False when the learner typed it or recognition produced nothing. */
  wasRecognised: boolean
  note?: string
}

interface SpeechRecognitionAlternativeLike {
  transcript: string
}

interface SpeechRecognitionResultLike {
  readonly isFinal: boolean
  readonly length: number
  [index: number]: SpeechRecognitionAlternativeLike
}

interface SpeechRecognitionEventLike {
  readonly resultIndex: number
  readonly results: {
    readonly length: number
    [index: number]: SpeechRecognitionResultLike
  }
}

interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike

function constructorFor(): SpeechRecognitionConstructor | undefined {
  if (typeof window === 'undefined') return undefined
  const scope = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition
}

export function transcriptionAvailability(): TranscriptionAvailability {
  return constructorFor() ? 'available' : 'unsupported'
}

/**
 * Recognition that runs alongside the recorder.
 *
 * Interim results are surfaced so the learner can see it is listening; only
 * final results are kept for analysis.
 */
export class LiveTranscriber {
  private recognition?: SpeechRecognitionLike
  private finals: string[] = []
  private interim = ''
  private failure?: string
  private stopped = false
  private restartOnEnd = false

  static get isSupported(): boolean {
    return constructorFor() !== undefined
  }

  /** Returns false when recognition could not be started at all. */
  start(onUpdate?: (text: string, isFinal: boolean) => void): boolean {
    const Constructor = constructorFor()
    if (!Constructor) return false

    this.finals = []
    this.interim = ''
    this.failure = undefined
    this.stopped = false
    this.restartOnEnd = true

    try {
      const recognition = new Constructor()
      recognition.lang = navigator.language || 'en-US'
      recognition.continuous = true
      recognition.interimResults = true
      recognition.maxAlternatives = 1

      recognition.onresult = (event) => {
        let interim = ''
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const result = event.results[index]
          if (!result) continue
          const text = result[0]?.transcript ?? ''
          if (result.isFinal) {
            const trimmed = text.trim()
            if (trimmed) {
              this.finals.push(trimmed)
              onUpdate?.(trimmed, true)
            }
          } else {
            interim += text
          }
        }
        this.interim = interim
        if (interim) onUpdate?.(interim, false)
      }

      recognition.onerror = (event) => {
        // "no-speech" and "aborted" are normal endings, not failures worth
        // telling the learner about.
        if (event.error === 'no-speech' || event.error === 'aborted') return
        this.restartOnEnd = false
        this.failure =
          event.error === 'not-allowed' || event.error === 'service-not-allowed'
            ? 'This browser would not allow speech recognition.'
            : 'Speech recognition stopped early.'
      }

      recognition.onend = () => {
        // Browsers time recognition out after a stretch of quiet; restart it so
        // a thoughtful pause doesn't silently end transcription mid-attempt.
        if (this.restartOnEnd && !this.stopped) {
          try {
            recognition.start()
          } catch {
            this.restartOnEnd = false
          }
        }
      }

      recognition.start()
      this.recognition = recognition
      return true
    } catch {
      return false
    }
  }

  get liveText(): string {
    return [...this.finals, this.interim].filter(Boolean).join(' ')
  }

  stop(): TranscriptionResult {
    this.stopped = true
    this.restartOnEnd = false
    try {
      this.recognition?.stop()
    } catch {
      // Nothing to do — we already have whatever it produced.
    }
    this.recognition = undefined

    const transcript = this.finals.join(' ').trim() || this.interim.trim()
    if (transcript.length === 0) {
      const result: TranscriptionResult = { transcript: '', wasRecognised: false }
      result.note = this.failure ?? 'Nothing was recognised from that recording.'
      return result
    }
    const result: TranscriptionResult = { transcript, wasRecognised: true }
    if (this.failure) result.note = this.failure
    return result
  }

  abort(): void {
    this.stopped = true
    this.restartOnEnd = false
    try {
      this.recognition?.abort()
    } catch {
      // Already gone.
    }
    this.recognition = undefined
  }
}
