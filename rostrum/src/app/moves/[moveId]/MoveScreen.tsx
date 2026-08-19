'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { move as findMove } from '@/content/moves'
import { technique as findTechnique } from '@/content/techniques'
import { clearRung, rungsCleared } from '@/lib/progress'
import { useStore } from '@/lib/store'
import { Card, Eyebrow } from '@/components/ui'

/**
 * One move's ladder.
 *
 * The rung you are on is open and everything else is collapsed, because the
 * only thing that matters is the next harder condition. Rungs below are done
 * and rungs above are deliberately not previewed in detail — reading rung five
 * while you are on rung two is how a curriculum turns back into a list.
 */
export default function MoveScreen() {
  const params = useParams<{ moveId: string }>()
  const router = useRouter()
  const { progress, update } = useStore()

  const move = findMove(params?.moveId)
  if (!move) {
    return (
      <main className="screen stack">
        <p className="body">That move is missing.</p>
        <Link href="/moves" className="link">
          Back to the six ›
        </Link>
      </main>
    )
  }

  const done = rungsCleared(progress, move.id)
  const currentIndex = Math.min(done, move.rungs.length - 1)
  const finished = done >= move.rungs.length

  return (
    <main className="screen stack-lg">
      <header className="stack-sm">
        <button type="button" className="link caption" onClick={() => router.push('/moves')}>
          ‹ The six
        </button>
        <h1 className="display">{move.name}</h1>
        <p className="body">{move.what}</p>
      </header>

      <Card variant="quiet">
        <div className="stack-sm">
          <Eyebrow>Why it works</Eyebrow>
          <p className="caption">{move.why}</p>
          <hr className="rule" />
          <Eyebrow>How you know you did it</Eyebrow>
          <p className="caption">{move.spot}</p>
        </div>
      </Card>

      <div className="stack-sm">
        <div className="row-between">
          <Eyebrow amber>The ladder</Eyebrow>
          <span className="caption faint">
            {done} of {move.rungs.length} climbed
          </span>
        </div>

        <div className="stack-sm">
          {move.rungs.map((rung, index) => {
            const cleared = index < done
            const locked = index > currentIndex

            if (locked) {
              return (
                <Card key={index} variant="quiet">
                  <div className="row" style={{ gap: 12, alignItems: 'center', opacity: 0.45 }}>
                    <span className="numeral faint" style={{ width: 16 }}>
                      {index + 1}
                    </span>
                    <span className="caption">Not yet</span>
                  </div>
                </Card>
              )
            }

            if (cleared) {
              return (
                <Card key={index} variant="quiet">
                  <div className="row" style={{ gap: 12, alignItems: 'center' }}>
                    <span className="numeral faint" style={{ width: 16 }}>
                      {index + 1}
                    </span>
                    <span className="caption" style={{ flex: 1 }}>
                      {rung.move}
                    </span>
                    <span className="caption" style={{ color: 'var(--color-amber)' }}>
                      ✓
                    </span>
                  </div>
                </Card>
              )
            }

            return (
              <Card key={index} variant="amber">
                <div className="stack-sm">
                  <div className="row" style={{ gap: 12, alignItems: 'baseline' }}>
                    <span className="numeral" style={{ width: 16, color: 'var(--color-amber)' }}>
                      {index + 1}
                    </span>
                    <p className="heading" style={{ flex: 1 }}>
                      {rung.move}
                    </p>
                  </div>

                  <p className="caption faint">{rung.harder}</p>

                  <hr className="rule" />
                  <div className="stack-sm" style={{ gap: 5 }}>
                    <Eyebrow>Sounds like</Eyebrow>
                    <p className="spoken">“{rung.example}”</p>
                  </div>

                  <hr className="rule" />
                  <div className="stack-sm" style={{ gap: 5 }}>
                    <Eyebrow amber>Go and do this</Eyebrow>
                    <p className="body">{rung.drill}</p>
                  </div>

                  <button
                    type="button"
                    className="btn btn-block"
                    onClick={() => update((c) => clearRung(c, move.id, index))}
                  >
                    I did it — next rung
                  </button>
                </div>
              </Card>
            )
          })}
        </div>

        {finished ? (
          <Card variant="amber">
            <div className="stack-sm">
              <Eyebrow amber>Ladder climbed</Eyebrow>
              <p className="body">
                There is no rung six. This is a move you keep using, and it gets better because you
                use it — not because there is more of it to read.
              </p>
            </div>
          </Card>
        ) : null}
      </div>

      <div className="stack-sm">
        <Eyebrow>Variations in the Arsenal</Eyebrow>
        <Card variant="quiet">
          <div className="stack-sm">
            <p className="caption faint">
              These are the same move under different names. Reference, not homework.
            </p>
            {move.techniqueIds.map((id) => {
              const technique = findTechnique(id)
              if (!technique) return null
              return (
                <Link
                  key={id}
                  href={`/arsenal/${id}`}
                  className="row-between"
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <span className="caption">{technique.name}</span>
                  <span className="caption faint">›</span>
                </Link>
              )
            })}
          </div>
        </Card>
      </div>
    </main>
  )
}
