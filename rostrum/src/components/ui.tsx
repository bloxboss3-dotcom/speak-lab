import type { ReactNode } from 'react'
import { MASTERY_STAGE_NAMES, MASTERY_STAGES, type MasteryStage } from '@/lib/types'

/** Shared pieces. Anything used on more than one screen lives here. */

export function Eyebrow({ children, amber }: { children: ReactNode; amber?: boolean }) {
  return <p className={amber ? 'eyebrow eyebrow-amber' : 'eyebrow'}>{children}</p>
}

export function Card({
  children,
  variant,
  className,
}: {
  children: ReactNode
  variant?: 'amber' | 'quiet' | 'sunken'
  className?: string
}) {
  const name = variant === 'amber' ? 'card-amber' : variant === 'quiet' ? 'card-quiet' : variant === 'sunken' ? 'card-sunken' : 'card'
  return <div className={className ? `${name} ${className}` : name}>{children}</div>
}

export function Chip({
  children,
  tone,
}: {
  children: ReactNode
  tone?: 'amber' | 'live' | 'verify'
}) {
  return <span className={tone ? `chip chip-${tone}` : 'chip'}>{children}</span>
}

export function Meter({ value, label }: { value: number; label?: string }) {
  const clamped = Math.max(0, Math.min(1, value))
  return (
    <div
      className="meter"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped * 100)}
    >
      <div className="meter-fill" style={{ width: `${clamped * 100}%` }} />
    </div>
  )
}

/**
 * The score ring.
 *
 * Used for technique scores and mastery. The number inside is always the thing
 * being measured, never a composite — this app has no single "speaking score"
 * because there is no honest way to compute one.
 */
export function Ring({
  value,
  size = 96,
  stroke = 7,
  colour = 'var(--color-amber)',
  children,
}: {
  value: number
  size?: number
  stroke?: number
  colour?: string
  children?: ReactNode
}) {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.max(0, Math.min(100, value))
  const offset = circumference * (1 - clamped / 100)

  return (
    <div style={{ position: 'relative', width: size, height: size, flex: '0 0 auto' }}>
      <svg className="ring" width={size} height={size} aria-hidden="true">
        <circle
          className="ring-track"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
        />
        <circle
          className="ring-fill"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          stroke={colour}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          placeItems: 'center',
          textAlign: 'center',
        }}
      >
        {children}
      </div>
    </div>
  )
}

export function ScoreRing({ score, label }: { score: number; label: string }) {
  return (
    <Ring value={score} size={112} stroke={8}>
      <div>
        <div className="numeral" style={{ fontSize: 32, lineHeight: 1 }}>
          {score}
        </div>
        <div className="eyebrow" style={{ marginTop: 4 }}>
          {label}
        </div>
      </div>
    </Ring>
  )
}

const STAGE_COLOURS: Record<MasteryStage, string> = {
  discovered: 'var(--color-stage-1)',
  learning: 'var(--color-stage-2)',
  practiced: 'var(--color-stage-3)',
  reliable: 'var(--color-stage-4)',
  integrated: 'var(--color-stage-5)',
  mastered: 'var(--color-stage-6)',
}

export function stageColour(stage: MasteryStage): string {
  return STAGE_COLOURS[stage]
}

/**
 * Mastery as six pips plus a name. The pips encode the stage in form as well as
 * colour, so it reads at a glance and does not depend on colour alone.
 */
export function StageBadge({ stage }: { stage: MasteryStage }) {
  const index = MASTERY_STAGES.indexOf(stage)
  return (
    <span className="row" style={{ gap: 8 }}>
      <span className="row" style={{ gap: 3 }} aria-hidden="true">
        {MASTERY_STAGES.map((entry, position) => (
          <span
            key={entry}
            style={{
              width: 5,
              height: 5,
              borderRadius: 999,
              background: position <= index ? STAGE_COLOURS[stage] : 'var(--color-hairline-strong)',
            }}
          />
        ))}
      </span>
      <span style={{ fontSize: 12, fontWeight: 640, color: STAGE_COLOURS[stage] }}>
        {MASTERY_STAGE_NAMES[stage]}
      </span>
    </span>
  )
}

export function Stat({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div>
      <div className="numeral" style={{ fontSize: 24 }}>
        {value}
      </div>
      <div className="eyebrow" style={{ marginTop: 2 }}>
        {label}
      </div>
    </div>
  )
}

/**
 * Used wherever a number would otherwise be invented. The rule across the app:
 * if there is not enough practice behind a figure, say so instead of showing one.
 */
export function NotYet({ children }: { children: ReactNode }) {
  return <p className="caption faint">{children}</p>
}

export function Portrait({
  initials,
  accent,
  size = 56,
}: {
  initials: string
  accent: string
  size?: number
}) {
  return (
    <div
      aria-hidden="true"
      style={{
        width: size,
        height: size * 1.15,
        flex: '0 0 auto',
        borderRadius: 10,
        display: 'grid',
        placeItems: 'center',
        background: `linear-gradient(160deg, ${accent}33, ${accent}0d), var(--color-sunken)`,
        border: `1px solid ${accent}44`,
        fontFamily: 'var(--font-display)',
        fontSize: size * 0.3,
        letterSpacing: '0.02em',
        color: accent,
      }}
    >
      {initials}
    </div>
  )
}

export function formatClock(seconds: number): string {
  const total = Math.max(0, Math.round(seconds))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

export function relativeDay(iso: string | undefined, now = new Date()): string {
  if (!iso) return 'never'
  const then = new Date(iso.length <= 10 ? `${iso}T12:00:00` : iso)
  const days = Math.round((startOfDay(now).getTime() - startOfDay(then).getTime()) / 86_400_000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 14) return 'last week'
  return `${Math.floor(days / 7)} weeks ago`
}

function startOfDay(date: Date): Date {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}
