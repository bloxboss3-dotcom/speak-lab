/**
 * Speaking the simulated character's lines out loud.
 *
 * A conversation you read is a different exercise from one you hear, so the
 * character speaks by default. It is one switch away from silent, because
 * synthesised voices are not to everyone's taste and because practice in a
 * quiet office should still be possible.
 */

export class Voice {
  enabled = true
  private current?: SpeechSynthesisUtterance

  static get isSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window
  }

  speak(text: string, voiceHint?: string): void {
    if (!this.enabled || !Voice.isSupported) return
    const trimmed = text.trim()
    if (!trimmed) return

    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(trimmed)
    const voice = pickVoice(voiceHint)
    if (voice) utterance.voice = voice
    // Hints describe the person, not a preset: "brisk" speeds them up a little,
    // "warm" slows them slightly. Small moves — anything larger sounds robotic.
    const hint = voiceHint ?? ''
    utterance.rate = hint.includes('brisk') ? 1.08 : hint.includes('slow') ? 0.92 : 1
    utterance.pitch = hint.includes('low') ? 0.9 : hint.includes('high') ? 1.1 : 1
    this.current = utterance
    window.speechSynthesis.speak(utterance)
  }

  stop(): void {
    if (!Voice.isSupported) return
    window.speechSynthesis.cancel()
    this.current = undefined
  }

  get isSpeaking(): boolean {
    return Voice.isSupported && window.speechSynthesis.speaking && this.current !== undefined
  }
}

function pickVoice(hint?: string): SpeechSynthesisVoice | undefined {
  if (!Voice.isSupported) return undefined
  const voices = window.speechSynthesis.getVoices()
  if (voices.length === 0) return undefined

  const language = navigator.language || 'en-US'
  const sameLanguage = voices.filter((voice) => voice.lang.startsWith(language.slice(0, 2)))
  const pool = sameLanguage.length > 0 ? sameLanguage : voices

  // Deterministic per hint, so the same character sounds the same each run.
  const seed = [...(hint ?? 'neutral')].reduce((total, character) => total + character.charCodeAt(0), 0)
  return pool[seed % pool.length]
}
