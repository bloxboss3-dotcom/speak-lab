'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { TECHNIQUES } from '@/content/techniques'
import { master } from '@/content/masters'
import { equippedCount } from '@/lib/loadout'
import { masteryFor } from '@/lib/progress'
import { nextMasteryRequirement } from '@/lib/progression'
import { useStore } from '@/lib/store'
import { Card, Eyebrow, NotYet, Ring, StageBadge, relativeDay, stageColour } from '@/components/ui'
import { SKILL_CATEGORY_NAMES, type SkillCategory } from '@/lib/types'

/**
 * The Arsenal.
 *
 * Only techniques the learner has actually met appear as owned; the rest are
 * shown locked, because seeing what is ahead is motivating and hiding it is
 * just mystery for its own sake.
 */
export default function ArsenalPage() {
  const { progress } = useStore()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<SkillCategory | 'all'>('all')

  const owned = useMemo(
    () => TECHNIQUES.filter((technique) => masteryFor(progress, technique.id)),
    [progress],
  )
  const locked = useMemo(
    () => TECHNIQUES.filter((technique) => !masteryFor(progress, technique.id)),
    [progress],
  )

  const categories = useMemo(() => {
    const set = new Set(owned.map((technique) => technique.category))
    return [...set].sort()
  }, [owned])

  const equipped = equippedCount(progress)

  const filtered = owned.filter((technique) => {
    if (category !== 'all' && technique.category !== category) return false
    if (!query.trim()) return true
    const haystack = `${technique.name} ${technique.summary}`.toLowerCase()
    return haystack.includes(query.trim().toLowerCase())
  })

  return (
    <main className="screen stack-lg">
      <header className="stack-sm">
        <Eyebrow amber>Arsenal</Eyebrow>
        <h1 className="display">
          {owned.length} technique{owned.length === 1 ? '' : 's'}
        </h1>
        <p className="caption">
          {locked.length} more waiting. Mastery is not reading — it is retrieving one of these
          without being told to.
        </p>
        <div className="row" style={{ gap: 8, marginTop: 4 }}>
          <Link href="/tree" className="pick" style={{ textDecoration: 'none' }}>
            Skill tree
          </Link>
          <Link href="/loadout" className="pick" style={{ textDecoration: 'none' }}>
            Loadout {equipped > 0 ? `· ${equipped}/5` : ''}
          </Link>
        </div>
      </header>

      {owned.length === 0 ? (
        <Card variant="quiet">
          <div className="stack-sm">
            <Eyebrow>Empty for now</Eyebrow>
            <p className="body">
              Finish today’s training and the technique lands here, with everything you have done
              with it.
            </p>
            <Link href="/" className="link">
              Go to Today ›
            </Link>
          </div>
        </Card>
      ) : (
        <>
          <input
            className="field"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search your techniques"
            aria-label="Search techniques"
          />

          {categories.length > 1 ? (
            <div className="row scroll-x" style={{ gap: 8 }}>
              <button
                type="button"
                className="pick"
                aria-pressed={category === 'all'}
                onClick={() => setCategory('all')}
              >
                All
              </button>
              {categories.map((entry) => (
                <button
                  key={entry}
                  type="button"
                  className="pick"
                  aria-pressed={category === entry}
                  onClick={() => setCategory(entry)}
                >
                  {SKILL_CATEGORY_NAMES[entry]}
                </button>
              ))}
            </div>
          ) : null}

          <div className="stack">
            {filtered.map((technique) => {
              const mastery = masteryFor(progress, technique.id)
              if (!mastery) return null
              const owner = master(technique.masterId)
              return (
                <Link
                  key={technique.id}
                  href={`/arsenal/${technique.id}`}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <Card>
                    <div className="row" style={{ alignItems: 'flex-start', gap: 14 }}>
                      <Ring
                        value={mastery.score}
                        size={56}
                        stroke={5}
                        colour={stageColour(mastery.stage)}
                      >
                        <span className="numeral" style={{ fontSize: 14 }}>
                          {mastery.score}
                        </span>
                      </Ring>
                      <div className="stack-sm" style={{ gap: 5, minWidth: 0 }}>
                        <p className="heading">{technique.name}</p>
                        <p className="caption">
                          {owner ? `${owner.name} · ` : ''}
                          {SKILL_CATEGORY_NAMES[technique.category]}
                        </p>
                        <StageBadge stage={mastery.stage} />
                        <p className="caption faint">
                          {mastery.totalAttempts} attempt{mastery.totalAttempts === 1 ? '' : 's'} ·{' '}
                          {mastery.coldRetrievals} unprompted · last{' '}
                          {relativeDay(mastery.lastPracticedAt)}
                        </p>
                      </div>
                    </div>
                  </Card>
                </Link>
              )
            })}
            {filtered.length === 0 ? <NotYet>Nothing matches that.</NotYet> : null}
          </div>
        </>
      )}

      {locked.length > 0 ? (
        <div className="stack-sm">
          <Eyebrow>Not met yet</Eyebrow>
          <Card variant="quiet">
            <div className="stack-sm">
              {locked.slice(0, 8).map((technique) => (
                <div key={technique.id} className="row-between">
                  <span className="body faint">{technique.name}</span>
                  <span className="caption faint">
                    {master(technique.masterId)?.initials ?? 'Craft'}
                  </span>
                </div>
              ))}
              {locked.length > 8 ? (
                <p className="caption faint">and {locked.length - 8} more.</p>
              ) : null}
            </div>
          </Card>
        </div>
      ) : null}

      {owned.length > 0 ? (
        <Card variant="quiet">
          <div className="stack-sm">
            <Eyebrow>Closest to the next stage</Eyebrow>
            {owned
              .map((technique) => ({ technique, mastery: masteryFor(progress, technique.id) }))
              .filter((entry) => entry.mastery)
              .sort((a, b) => (b.mastery?.score ?? 0) - (a.mastery?.score ?? 0))
              .slice(0, 3)
              .map(({ technique, mastery }) =>
                mastery ? (
                  <p key={technique.id} className="caption">
                    <strong>{technique.name}</strong> — {nextMasteryRequirement(mastery, mastery.stage)}
                  </p>
                ) : null,
              )}
          </div>
        </Card>
      ) : null}
    </main>
  )
}
