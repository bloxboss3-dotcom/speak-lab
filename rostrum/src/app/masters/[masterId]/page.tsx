'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { master } from '@/content/masters'
import { techniquesForMaster } from '@/content/techniques'
import { masteryFor } from '@/lib/progress'
import { useStore } from '@/lib/store'
import { Card, Eyebrow, Portrait, StageBadge } from '@/components/ui'

export default function MasterPage() {
  const params = useParams<{ masterId: string }>()
  const router = useRouter()
  const { progress } = useStore()
  const entry = master(params?.masterId)

  if (!entry) {
    return (
      <main className="screen stack">
        <p className="body">No such master.</p>
        <button type="button" className="btn" onClick={() => router.push('/masters')}>
          Back to the Hall
        </button>
      </main>
    )
  }

  const techniques = techniquesForMaster(entry.id)

  return (
    <main className="screen stack-lg">
      <button type="button" className="btn-quiet" onClick={() => router.push('/masters')}>
        ‹ Hall of Masters
      </button>

      <div className="row" style={{ alignItems: 'flex-start', gap: 16 }}>
        <Portrait initials={entry.initials} accent={entry.accent} size={78} />
        <div className="stack-sm">
          <h1 className="title">{entry.name}</h1>
          <p className="caption">
            {entry.role} · {entry.years}
          </p>
        </div>
      </div>

      <Card variant="amber">
        <div className="stack-sm">
          <Eyebrow amber>Signature</Eyebrow>
          <p className="heading">{entry.signature}</p>
        </div>
      </Card>

      <div className="stack-sm">
        <Eyebrow>The study</Eyebrow>
        <p className="body">{entry.study}</p>
      </div>

      <Card variant="quiet">
        <div className="stack-sm">
          <Eyebrow>Take the principle, not the personality</Eyebrow>
          <p className="caption">{entry.caution}</p>
        </div>
      </Card>

      <div className="stack-sm">
        <Eyebrow amber>Techniques</Eyebrow>
        {techniques.map((technique) => {
          const mastery = masteryFor(progress, technique.id)
          return (
            <Link
              key={technique.id}
              href={`/arsenal/${technique.id}`}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <Card>
                <div className="stack-sm" style={{ gap: 6 }}>
                  <div className="row-between">
                    <p className="heading">{technique.name}</p>
                    {mastery ? (
                      <StageBadge stage={mastery.stage} />
                    ) : (
                      <span className="caption faint">Not met yet</span>
                    )}
                  </div>
                  <p className="caption">{technique.summary}</p>
                </div>
              </Card>
            </Link>
          )
        })}
      </div>
    </main>
  )
}
