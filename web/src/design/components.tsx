import type { ReactNode } from 'react'
import { TIER_NAMES, type DifficultyTier } from '../core/types'

/** Small shared pieces. Anything used on more than one screen lives here. */

export function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="label">{children}</p>
}

export function Card({
  children,
  variant,
  className,
}: {
  children: ReactNode
  variant?: 'accent' | 'warning' | 'sunken' | 'plain'
  className?: string
}) {
  const modifier = variant ? ` card--${variant}` : ''
  return <div className={`card${modifier}${className ? ` ${className}` : ''}`}>{children}</div>
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  block,
  disabled,
  type = 'button',
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger'
  block?: boolean
  disabled?: boolean
  type?: 'button' | 'submit'
}) {
  const classes = ['button']
  if (variant !== 'primary') classes.push(`button--${variant}`)
  if (block) classes.push('button--block')
  return (
    <button type={type} className={classes.join(' ')} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  )
}

export function Pill({
  children,
  tone,
}: {
  children: ReactNode
  tone?: 'accent' | 'warning' | 'danger'
}) {
  return <span className={`pill${tone ? ` pill--${tone}` : ''}`}>{children}</span>
}

export function TierPill({ tier }: { tier: DifficultyTier }) {
  return <Pill tone={tier >= 4 ? 'warning' : undefined}>{TIER_NAMES[tier]}</Pill>
}

export function Meter({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(1, value))
  return (
    <div
      className="meter"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped * 100)}
    >
      <div className="meter__fill" style={{ width: `${clamped * 100}%` }} />
    </div>
  )
}

export function Stat({
  value,
  label,
  hint,
}: {
  value: ReactNode
  label: string
  hint?: string
}) {
  return (
    <div className="stat">
      <span className="stat__value">{value}</span>
      <span className="label">{label}</span>
      {hint ? <span className="caption">{hint}</span> : null}
    </div>
  )
}

export function Notice({
  title,
  children,
  tone = 'sunken',
  action,
}: {
  title: string
  children?: ReactNode
  tone?: 'sunken' | 'warning' | 'accent'
  action?: ReactNode
}) {
  return (
    <Card variant={tone}>
      <div className="stack stack--tight">
        <p className="heading">{title}</p>
        {children ? <div className="caption">{children}</div> : null}
        {action}
      </div>
    </Card>
  )
}

export function Switch({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean
  onChange: (value: boolean) => void
  label: string
  description?: string
}) {
  return (
    <div className="switch-row">
      <div className="stack stack--tight" style={{ gap: 2 }}>
        <span className="body">{label}</span>
        {description ? <span className="caption">{description}</span> : null}
      </div>
      <button
        type="button"
        className="switch"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
      />
    </div>
  )
}

export function ChoiceRow({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: Array<{ value: number; label: string }>
  value?: number
  onChange: (value: number) => void
  ariaLabel: string
}) {
  return (
    <div className="choice-row" role="group" aria-label={ariaLabel}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className="choice"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export function Waveform({ levels, live }: { levels: number[]; live: boolean }) {
  const barCount = 44
  const tail = levels.slice(-barCount)
  const padded = [...Array<number>(Math.max(0, barCount - tail.length)).fill(0.03), ...tail]

  return (
    <div className={`waveform${live ? ' waveform--live' : ''}`} aria-hidden="true">
      {padded.map((level, index) => (
        <div
          key={index}
          className="waveform__bar"
          style={{
            height: `${Math.max(3, Math.min(1, level) * 96)}px`,
            opacity: live ? 0.45 + Math.min(1, level) * 0.55 : 0.45,
          }}
        />
      ))}
    </div>
  )
}

export function TypingDots() {
  return (
    <span className="typing" aria-label="thinking">
      <span />
      <span />
      <span />
    </span>
  )
}

/**
 * Renders a transcript with the quoted moment highlighted.
 *
 * When the quote could not be matched word-for-word the caller passes no range,
 * and nothing is highlighted — a highlight over the wrong words would be worse
 * than none.
 */
export function HighlightedTranscript({
  text,
  range,
}: {
  text: string
  range?: { start: number; end: number }
}) {
  if (!range) return <p className="transcript">{text}</p>
  return (
    <p className="transcript">
      {text.slice(0, range.start)}
      <mark>{text.slice(range.start, range.end)}</mark>
      {text.slice(range.end)}
    </p>
  )
}

export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

export function formatRelativeDay(iso: string, now = new Date()): string {
  const then = new Date(iso)
  const days = Math.round((startOfDay(now).getTime() - startOfDay(then).getTime()) / 86_400_000)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 14) return 'Last week'
  return then.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

export function formatDueDate(iso: string, now = new Date()): string {
  const then = new Date(iso)
  const days = Math.round((startOfDay(then).getTime() - startOfDay(now).getTime()) / 86_400_000)
  if (days <= 0) return 'due now'
  if (days === 1) return 'due tomorrow'
  return `due in ${days} days`
}

function startOfDay(date: Date): Date {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}
