'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo } from 'react'
import { FIELD_TESTS } from '@/content/fieldTests'
import { PRINCIPLES } from '@/content/motivationLab'
import { master } from '@/content/masters'
import { scenario as findScenario } from '@/content/scenarios'
import { technique as findTechnique } from '@/content/techniques'
import {
  branchScores,
  countAtStageOrAbove,
  dueReviewTechniqueIds,
  knownTechniqueIds,
  nextLesson,
  trainedToday,
} from '@/lib/progress'
import { levelFromXp, levelProgress, rankFor, xpForLevel, xpIntoLevel } from '@/lib/progression'
import { useStore } from '@/lib/store'
import { Card, Chip, Eyebrow, Meter, Portrait } from '@/components/ui'

/**
 * Today.
 *
 * One question, answered: what do I do right now. The app decides — there is no
 * catalogue to browse and nothing to choose between above the fold. Everything
 * else is either evidence that the reps are happening or something the learner
 * owes themselves from a previous session.
 */
export default function TodayPage() {
  const { progress, ready } = useStore()
  const router = useRouter()

  useEffect(() => {
    if (ready && !progress.profile.onboardedAt) router.replace('/onboarding')
  }, [ready, progress.profile.onboardedAt, router])

  const now = useMemo(() => new Date(), [])
  const lesson = nextLesson(progress)
  const technique = findTechnique(lesson?.techniqueId)
  const owner = master(technique?.masterId)
  const known = knownTechniqueIds(progress)
  const due = dueReviewTechniqueIds(progress, now)
  const level = levelFromXp(progress.xp)
  const rank = rankFor(level)
  const done = trainedToday(progress, now)

  const fieldTest = FIELD_TESTS.filter(
    (test) =>
      !progress.completedFieldTestIds.includes(test.id) && known.length >= test.unlockAtTechniques,
  )[0]

  const principle = PRINCIPLES.filter(
    (entry) => !progress.completedPrincipleIds.includes(entry.id),
  )[0]

  if (!ready) return <div className="screen" />

  return (
    <main className="screen stack-lg">
      <header className="stack-sm">
        <div className="row-between">
          <span className="row" style={{ gap: 7 }}>
            <Flame lit={progress.streak.current > 0} />
            <span className="numeral" style={{ fontSize: 15 }}>
              {progress.streak.current}
            </span>
            <span className="caption">day{progress.streak.current === 1 ? '' : 's'}</span>
          </span>
          {progress.streak.freezes > 0 ? (
            <Chip>{progress.streak.freezes} rest day in hand</Chip>
          ) : null}
        </div>

        <div className="stack-sm" style={{ marginTop: 6 }}>
          <div className="row-between">
            <p className="eyebrow">
              Level {level} — {rank.name}
            </p>
            <span className="caption numeral">
              {xpIntoLevel(progress.xp)} / {xpForLevel(level)}
            </span>
          </div>
          <Meter value={levelProgress(progress.xp)} label="Level progress" />
        </div>
      </header>

      {lesson && technique ? (
        <Card variant="amber">
          <div className="stack">
            <div className="row-between">
              <Eyebrow amber>{done ? 'Trained today — go again?' : "Today's training"}</Eyebrow>
              <Chip>~{lesson.estimatedMinutes} min</Chip>
            </div>

            <div className="row" style={{ alignItems: 'flex-start', gap: 14 }}>
              {owner ? <Portrait initials={owner.initials} accent={owner.accent} /> : null}
              <div className="stack-sm">
                <p className="title">{lesson.title}</p>
                <p className="caption">
                  {owner ? `${owner.name} · ` : ''}
                  {technique.name}
                </p>
              </div>
            </div>

            <p className="body">{lesson.promise}</p>

            <Link href={`/train/${lesson.id}`} className="btn btn-block">
              Begin training
            </Link>
          </div>
        </Card>
      ) : (
        <Card variant="amber">
          <div className="stack-sm">
            <Eyebrow amber>Curriculum complete</Eyebrow>
            <p className="title">Every lesson done.</p>
            <p className="body">
              Keep the techniques alive with Field Tests and the Speech Gym — retrieval is what
              turns them into yours.
            </p>
          </div>
        </Card>
      )}

      <div className="stack-sm">
        {fieldTest ? (
          <ActionRow
            href={`/field-test/${fieldTest.id}`}
            eyebrow="Field test"
            title={fieldTest.title}
            detail="No technique named. Reach for whatever fits."
            accent
          />
        ) : (
          <ActionRow
            href="/arsenal"
            eyebrow="Field test"
            title="Locked"
            detail={`Learn ${Math.max(2 - known.length, 1)} more technique${known.length >= 1 ? '' : 's'} to unlock retrieval practice.`}
          />
        )}

        {due.length > 0 ? (
          <ActionRow
            href="/arsenal"
            eyebrow="Due for review"
            title={findTechnique(due[0])?.name ?? 'A technique'}
            detail={`${due.length} technique${due.length === 1 ? '' : 's'} ready to be tested again.`}
          />
        ) : null}

        {principle ? (
          <ActionRow
            href={`/lab/${principle.id}`}
            eyebrow="Motivation lab"
            title={principle.name}
            detail={principle.summary}
          />
        ) : null}

        <ActionRow
          href="/gym"
          eyebrow="Speech gym"
          title="Something you actually have to say"
          detail="Prepare a real talk, then rehearse it here."
        />
      </div>

      <Snapshot />
    </main>
  )
}

function ActionRow({
  href,
  eyebrow,
  title,
  detail,
  accent,
}: {
  href: string
  eyebrow: string
  title: string
  detail: string
  accent?: boolean
}) {
  return (
    <Link href={href} style={{ textDecoration: 'none', color: 'inherit' }}>
      <Card variant={accent ? undefined : 'quiet'}>
        <div className="row-between">
          <div className="stack-sm" style={{ gap: 3, minWidth: 0 }}>
            <Eyebrow amber={accent}>{eyebrow}</Eyebrow>
            <p className="heading">{title}</p>
            <p className="caption">{detail}</p>
          </div>
          <span className="faint" aria-hidden="true">
            ›
          </span>
        </div>
      </Card>
    </Link>
  )
}

function Snapshot() {
  const { progress } = useStore()
  const known = knownTechniqueIds(progress)
  if (known.length === 0) {
    return (
      <Card variant="quiet">
        <div className="stack-sm">
          <Eyebrow>How this works</Eyebrow>
          <ol className="bullets body">
            <li>Learn one technique from someone who used it well.</li>
            <li>Take it apart — see exactly why it works.</li>
            <li>Use it, out loud, on a situation from your week.</li>
            <li>Get coached on that technique specifically, then go again.</li>
            <li>Days later, the app asks for it back without telling you which one.</li>
          </ol>
          <p className="caption">
            That last step is the one that matters. It is also the only way to reach the higher
            mastery stages.
          </p>
        </div>
      </Card>
    )
  }

  const scores = branchScores(progress)
  const top = Object.entries(scores)
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)

  return (
    <Card variant="quiet">
      <div className="stack-sm">
        <Eyebrow>Where you are</Eyebrow>
        <div className="row" style={{ gap: 18 }}>
          <div>
            <div className="numeral" style={{ fontSize: 22 }}>
              {known.length}
            </div>
            <div className="eyebrow">Techniques</div>
          </div>
          <div>
            <div className="numeral" style={{ fontSize: 22 }}>
              {countAtStageOrAbove(progress, 'reliable')}
            </div>
            <div className="eyebrow">Reliable+</div>
          </div>
          <div>
            <div className="numeral" style={{ fontSize: 22 }}>
              {progress.attempts.length}
            </div>
            <div className="eyebrow">Attempts</div>
          </div>
        </div>
        {top.length > 0 ? (
          <p className="caption">
            Strongest branch: {top[0]?.[0].replace('-', ' ')} ·{' '}
            {progress.attempts[0]
              ? `last worked on ${findScenario(progress.attempts[0].scenarioId)?.title ?? 'a scenario'}`
              : ''}
          </p>
        ) : null}
      </div>
    </Card>
  )
}

function Flame({ lit }: { lit: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke={lit ? 'var(--color-amber)' : 'var(--color-ivory-faint)'}
      strokeWidth="1.8"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3s5 4.2 5 8.6a5 5 0 0 1-10 0C7 9.4 9 8 9 8s.4 2 1.6 2.6C11 9 12 7 12 3Z" />
    </svg>
  )
}
