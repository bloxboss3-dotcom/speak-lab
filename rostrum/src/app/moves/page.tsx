'use client'

import Link from 'next/link'
import { MOVES, TOTAL_RUNGS } from '@/content/moves'
import { rungsCleared, totalRungsCleared } from '@/lib/progress'
import { useStore } from '@/lib/store'
import { Card, Eyebrow, Meter } from '@/components/ui'

/**
 * The curriculum, which is six things rather than thirty-six.
 *
 * Every name here is a word already in use pointing at something you can watch
 * a person do. Nothing on this screen is jargon invented for this app, because
 * a learner should not have to hold a private vocabulary as well as a skill.
 */
export default function MovesPage() {
  const { progress } = useStore()
  const cleared = totalRungsCleared(progress)

  return (
    <main className="screen stack-lg">
      <header className="stack-sm">
        <Eyebrow amber>The six</Eyebrow>
        <h1 className="display">Everything is one of these</h1>
        <p className="caption">
          Not a list to get through. Six moves, each deep enough to work on for months — you climb
          a ladder inside one rather than finishing it and moving on.
        </p>
      </header>

      <Card variant="quiet">
        <div className="stack-sm">
          <div className="row-between">
            <span className="caption">Rungs climbed</span>
            <span className="numeral caption">
              {cleared} of {TOTAL_RUNGS}
            </span>
          </div>
          <Meter value={cleared / TOTAL_RUNGS} label="Rungs climbed" />
        </div>
      </Card>

      <div className="stack">
        {MOVES.map((move) => {
          const done = rungsCleared(progress, move.id)
          const next = move.rungs[Math.min(done, move.rungs.length - 1)]
          const finished = done >= move.rungs.length
          return (
            <Link
              key={move.id}
              href={`/moves/${move.id}`}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <Card {...(done > 0 ? {} : { variant: 'quiet' as const })}>
                <div className="stack-sm">
                  <div className="row-between">
                    <p className="title" style={{ fontSize: 22 }}>
                      {move.name}
                    </p>
                    <span className="numeral caption">
                      {done}/{move.rungs.length}
                    </span>
                  </div>
                  <p className="caption">{move.what}</p>
                  <div className="row" style={{ gap: 4 }} aria-hidden="true">
                    {move.rungs.map((_, index) => (
                      <span
                        key={index}
                        style={{
                          height: 3,
                          flex: 1,
                          borderRadius: 999,
                          background:
                            index < done ? 'var(--color-amber)' : 'var(--color-hairline-strong)',
                        }}
                      />
                    ))}
                  </div>
                  <p className="caption faint">
                    {finished ? 'All five rungs climbed — keep using it.' : `Next: ${next?.move}`}
                  </p>
                </div>
              </Card>
            </Link>
          )
        })}
      </div>

      <Card variant="quiet">
        <div className="stack-sm">
          <Eyebrow>Where the old techniques went</Eyebrow>
          <p className="caption">
            The thirty-six named techniques are still in the Arsenal. They are variations of these
            six — each move lists the ones it covers — but they are reference now, not the course.
          </p>
        </div>
      </Card>
    </main>
  )
}
