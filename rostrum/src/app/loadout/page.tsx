'use client'

import Link from 'next/link'
import { useState } from 'react'
import { technique as findTechnique } from '@/content/techniques'
import { SLOT_BLURBS, equip, equippedCount, slotCandidates } from '@/lib/loadout'
import { masteryFor } from '@/lib/progress'
import { useStore } from '@/lib/store'
import { Card, Eyebrow, NotYet, StageBadge } from '@/components/ui'
import { LOADOUT_SLOTS, LOADOUT_SLOT_NAMES, type LoadoutSlot } from '@/lib/types'

/**
 * Loadout.
 *
 * Five slots, filled only from techniques the learner owns. What is equipped
 * leads the Speech Gym's plan — that is the whole mechanic, and it is stated on
 * the screen so nobody has to guess whether equipping did anything.
 */
export default function LoadoutPage() {
  const { progress, update } = useStore()
  const [openSlot, setOpenSlot] = useState<LoadoutSlot | null>(null)
  const filled = equippedCount(progress)

  return (
    <main className="screen stack-lg">
      <header className="stack-sm">
        <Eyebrow amber>Loadout</Eyebrow>
        <h1 className="display">{filled} of 5 equipped</h1>
        <p className="caption">
          What you equip leads the plan in Speech Gym when you prepare a real talk. Field Tests
          ignore it on purpose — naming a technique first would ruin the only thing they measure.
        </p>
      </header>

      <div className="stack">
        {LOADOUT_SLOTS.map((slot) => {
          const equippedId = progress.loadout[slot]
          const equipped = equippedId ? findTechnique(equippedId) : undefined
          const candidates = slotCandidates(progress, slot)
          const open = openSlot === slot
          const mastery = equipped ? masteryFor(progress, equipped.id) : undefined

          return (
            <Card key={slot} {...(equipped ? {} : { variant: 'quiet' as const })}>
              <div className="stack-sm">
                <div className="stack-sm" style={{ gap: 2 }}>
                  <div className="row-between">
                    <Eyebrow amber={Boolean(equipped)}>{LOADOUT_SLOT_NAMES[slot]}</Eyebrow>
                    {candidates.length > 0 ? (
                      <button
                        type="button"
                        className="link caption"
                        onClick={() => setOpenSlot(open ? null : slot)}
                        aria-expanded={open}
                      >
                        {open ? 'Close' : equipped ? 'Change' : 'Equip'}
                      </button>
                    ) : null}
                  </div>
                  <p className="caption faint">{SLOT_BLURBS[slot]}</p>
                </div>

                {equipped ? (
                  <div className="stack-sm" style={{ gap: 5 }}>
                    <p className="heading">{equipped.name}</p>
                    <p className="caption">{equipped.summary}</p>
                    {mastery ? <StageBadge stage={mastery.stage} /> : null}
                  </div>
                ) : candidates.length === 0 ? (
                  <NotYet>
                    Nothing you own fits this slot yet. It fills in as you finish lessons.
                  </NotYet>
                ) : (
                  <p className="caption faint">Empty.</p>
                )}

                {open ? (
                  <div className="stack-sm enter" style={{ marginTop: 4 }}>
                    <hr className="rule" />
                    {candidates.map((candidate) => {
                      const isCurrent = candidate.id === equippedId
                      return (
                        <button
                          key={candidate.id}
                          type="button"
                          className="card-quiet"
                          aria-pressed={isCurrent}
                          style={{
                            textAlign: 'left',
                            cursor: 'pointer',
                            borderColor: isCurrent ? 'var(--color-amber)' : undefined,
                          }}
                          onClick={() => {
                            update((current) =>
                              equip(current, slot, isCurrent ? null : candidate.id),
                            )
                            setOpenSlot(null)
                          }}
                        >
                          <span className="row-between">
                            <span className="stack-sm" style={{ gap: 2, minWidth: 0 }}>
                              <span className="body">{candidate.name}</span>
                              <span className="caption faint">{candidate.summary}</span>
                            </span>
                            <span className="numeral caption">
                              {masteryFor(progress, candidate.id)?.score ?? 0}
                            </span>
                          </span>
                        </button>
                      )
                    })}
                    {equipped ? (
                      <button
                        type="button"
                        className="btn-quiet"
                        onClick={() => {
                          update((current) => equip(current, slot, null))
                          setOpenSlot(null)
                        }}
                      >
                        Clear this slot
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </Card>
          )
        })}
      </div>

      {filled > 0 ? (
        <Link href="/gym" className="btn btn-block" style={{ textDecoration: 'none' }}>
          Take it to the Gym
        </Link>
      ) : (
        <Card variant="quiet">
          <p className="caption">
            Equip nothing and the Gym still recommends techniques from your whole Arsenal. The
            loadout only overrides that choice.
          </p>
        </Card>
      )}
    </main>
  )
}
