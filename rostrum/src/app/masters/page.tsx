'use client'

import Link from 'next/link'
import { MASTERS } from '@/content/masters'
import { techniquesForMaster } from '@/content/techniques'
import { knownTechniqueIds } from '@/lib/progress'
import { useStore } from '@/lib/store'
import { Card, Eyebrow, Portrait } from '@/components/ui'

/** The Hall. Portraits, what each did to language, and the techniques beneath. */
export default function MastersPage() {
  const { progress } = useStore()
  const known = new Set(knownTechniqueIds(progress))

  return (
    <main className="screen stack-lg">
      <header className="stack-sm">
        <Eyebrow amber>Hall of Masters</Eyebrow>
        <h1 className="display">Nine people who did something to language</h1>
        <p className="caption">
          Every technique here is transferable and domain-neutral. None of these entries endorses
          anyone’s politics, theology or persona — take the principle, leave the personality.
        </p>
      </header>

      <div className="stack">
        {MASTERS.map((entry) => {
          const techniques = techniquesForMaster(entry.id)
          const learned = techniques.filter((technique) => known.has(technique.id)).length
          return (
            <Link
              key={entry.id}
              href={`/masters/${entry.id}`}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <Card>
                <div className="row" style={{ alignItems: 'flex-start', gap: 14 }}>
                  <Portrait initials={entry.initials} accent={entry.accent} size={54} />
                  <div className="stack-sm" style={{ gap: 4, minWidth: 0 }}>
                    <p className="heading">{entry.name}</p>
                    <p className="caption">{entry.signature}</p>
                    <p className="eyebrow" style={{ marginTop: 4 }}>
                      {learned} of {techniques.length} learned
                    </p>
                  </div>
                </div>
              </Card>
            </Link>
          )
        })}
      </div>
    </main>
  )
}
