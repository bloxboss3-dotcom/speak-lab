'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { master } from '@/content/masters'
import { branchScores } from '@/lib/progress'
import { useStore } from '@/lib/store'
import { buildTree, type TreeBranch, type TreeNode } from '@/lib/tree'
import { Card, Eyebrow, NotYet, stageColour } from '@/components/ui'
import { MASTERY_STAGES, MASTERY_STAGE_NAMES, type SkillBranch } from '@/lib/types'

/**
 * The skill tree.
 *
 * Nine limbs, each a vertical spine of techniques in the order the curriculum
 * teaches them. A node's colour is its mastery stage — the same ramp used
 * everywhere else — so the tree is a readout of real state, not decoration.
 * Limbs collapse because a 34-node graph on a phone is a wall.
 */
export default function TreePage() {
  const { progress } = useStore()
  const tree = useMemo(() => buildTree(progress), [progress])
  const scores = branchScores(progress)

  // The store hydrates in an effect, so a useState initialiser would compute
  // this against an empty record and open the wrong limb for a returning
  // learner. Until they choose one, the open limb is derived every render.
  const [chosen, setChosen] = useState<SkillBranch | null>(null)
  const [touched, setTouched] = useState(false)
  const fallback = tree.find((limb) => limb.owned > 0)?.branch ?? tree[0]?.branch ?? null
  const open = touched ? chosen : fallback

  const toggle = (branch: SkillBranch) => {
    setTouched(true)
    setChosen(open === branch ? null : branch)
  }

  const totalOwned = tree.reduce((sum, limb) => sum + limb.owned, 0)
  const totalNodes = tree.reduce((sum, limb) => sum + limb.nodes.length, 0)

  return (
    <main className="screen stack-lg">
      <header className="stack-sm">
        <Eyebrow amber>Skill tree</Eyebrow>
        <h1 className="display">
          {totalOwned} of {totalNodes}
        </h1>
        <p className="caption">
          Colour is mastery stage, not progress through a menu. A technique only moves up the ramp
          when you retrieve it in a Field Test without being told to.
        </p>
      </header>

      <Legend />

      <div className="stack">
        {tree.map((limb) => (
          <Limb
            key={limb.branch}
            limb={limb}
            score={scores[limb.branch]}
            open={open === limb.branch}
            onToggle={() => toggle(limb.branch)}
          />
        ))}
      </div>

      {totalOwned === 0 ? (
        <NotYet>
          Nothing is lit yet. Finish today’s training and the first node turns on.
        </NotYet>
      ) : null}
    </main>
  )
}

function Legend() {
  return (
    <Card variant="quiet">
      {/* Wraps rather than scrolls: on a narrow phone a scrolling legend hides
          the last two stages, which are the two worth aiming at. */}
      <div className="row" style={{ gap: '8px 14px', flexWrap: 'wrap' }}>
        {MASTERY_STAGES.map((stage) => (
          <span key={stage} className="row" style={{ gap: 6, flexShrink: 0 }}>
            <span
              aria-hidden="true"
              style={{
                width: 9,
                height: 9,
                borderRadius: 999,
                background: stageColour(stage),
              }}
            />
            <span className="caption faint" style={{ whiteSpace: 'nowrap' }}>
              {MASTERY_STAGE_NAMES[stage]}
            </span>
          </span>
        ))}
      </div>
    </Card>
  )
}

function Limb({
  limb,
  score,
  open,
  onToggle,
}: {
  limb: TreeBranch
  score: number
  open: boolean
  onToggle: () => void
}) {
  const spine = limb.peak ? stageColour(limb.peak) : 'var(--color-hairline-strong)'

  return (
    <Card {...(limb.owned > 0 ? {} : { variant: 'quiet' as const })}>
      <button
        type="button"
        className="row-between"
        onClick={onToggle}
        aria-expanded={open}
        style={{
          width: '100%',
          background: 'none',
          border: 'none',
          padding: 0,
          color: 'inherit',
          textAlign: 'left',
          cursor: 'pointer',
        }}
      >
        <span className="row" style={{ gap: 12, minWidth: 0 }}>
          <span
            aria-hidden="true"
            style={{ width: 3, height: 30, borderRadius: 999, background: spine, flexShrink: 0 }}
          />
          <span className="stack-sm" style={{ gap: 2, minWidth: 0 }}>
            <span className="heading">{limb.name}</span>
            <span className="caption faint">
              {limb.owned} of {limb.nodes.length}
              {limb.owned > 0 ? ` · strength ${score}` : ''}
            </span>
          </span>
        </span>
        <span className="caption faint" aria-hidden="true">
          {open ? '−' : '+'}
        </span>
      </button>

      {open ? (
        <div className="stack-sm" style={{ marginTop: 14, gap: 0 }}>
          {limb.nodes.map((node, index) => (
            <Node
              key={node.technique.id}
              node={node}
              spine={spine}
              last={index === limb.nodes.length - 1}
            />
          ))}
        </div>
      ) : null}
    </Card>
  )
}

function Node({ node, spine, last }: { node: TreeNode; spine: string; last: boolean }) {
  const colour =
    node.state === 'owned' && node.stage
      ? stageColour(node.stage)
      : node.state === 'available'
        ? 'var(--color-amber)'
        : 'var(--color-hairline-strong)'

  const owner = node.technique.masterId ? master(node.technique.masterId) : undefined

  const body = (
    <span className="row" style={{ alignItems: 'stretch', gap: 12, minWidth: 0 }}>
      {/* The spine: a rail behind the dot, cut short on the last node. */}
      <span
        aria-hidden="true"
        style={{
          position: 'relative',
          width: 14,
          flexShrink: 0,
          alignSelf: 'stretch',
        }}
      >
        <span
          style={{
            position: 'absolute',
            left: 6,
            top: 0,
            bottom: last ? '50%' : 0,
            width: 2,
            background: node.state === 'owned' ? spine : 'var(--color-hairline)',
          }}
        />
        <span
          style={{
            position: 'absolute',
            left: 1,
            top: 'calc(50% - 6px)',
            width: 12,
            height: 12,
            borderRadius: 999,
            background: node.state === 'owned' ? colour : 'var(--color-raised)',
            border: `2px solid ${colour}`,
            boxShadow: node.state === 'owned' ? `0 0 10px ${colour}55` : 'none',
          }}
        />
      </span>

      <span className="stack-sm" style={{ gap: 2, padding: '9px 0', minWidth: 0, flex: 1 }}>
        <span className="body" style={{ color: node.state === 'locked' ? undefined : 'inherit' }}>
          {node.technique.name}
        </span>
        <span className="caption faint">
          {node.state === 'owned'
            ? `${MASTERY_STAGE_NAMES[node.stage ?? 'discovered']} · ${node.score}`
            : node.state === 'locked' && node.blockedBy
              ? `Needs ${node.blockedBy.name} first`
              : owner
                ? `Not met yet · ${owner.name}`
                : 'Not met yet'}
        </span>
      </span>
    </span>
  )

  const dim = node.state === 'locked' ? { opacity: 0.5 } : undefined

  if (node.state === 'owned') {
    return (
      <Link
        href={`/arsenal/${node.technique.id}`}
        style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
      >
        {body}
      </Link>
    )
  }

  return <span style={{ display: 'block', ...dim }}>{body}</span>
}
