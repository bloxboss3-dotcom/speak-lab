import { useState } from 'react'
import { useSpeakLab } from '../app/store'
import { Button, Card, Pill, SectionLabel, TierPill } from '../design/components'
import { paths, scenariosForSkill, skillsInPath } from '../core/content'
import { quoted } from './session/parts'
import { LevelCurve, MASTERY_BAND_NAMES, computeMastery } from '../core/progression'
import { skillProgressFor } from '../core/state'
import type { MicroSkill, Scenario, SkillPath } from '../core/types'

/**
 * The curriculum, as a set of tracks rather than a flat list.
 *
 * Later paths are gated on account level so the learner meets difficult
 * conversations after they can already be clear and concise — but nothing is
 * hidden: a locked path still shows what it contains and what unlocks it.
 */
export function Paths({ onStart }: { onStart: (scenario: Scenario) => void }) {
  const { state } = useSpeakLab()
  const level = LevelCurve.level(state.profile.totalXP)
  const [openPath, setOpenPath] = useState<string>()

  return (
    <div className="screen stack stack--loose">
      <header className="stack stack--tight">
        <SectionLabel>Curriculum</SectionLabel>
        <h1 className="display">Skill paths</h1>
        <p className="body body--muted">
          Eleven tracks. Each one is a handful of narrow, observable behaviours — the kind you can
          change inside a single practice loop.
        </p>
      </header>

      <div className="stack stack--tight">
        {paths.map((path) => (
          <PathRow
            key={path.id}
            path={path}
            level={level}
            open={openPath === path.id}
            onToggle={() => setOpenPath((current) => (current === path.id ? undefined : path.id))}
            onStart={onStart}
          />
        ))}
      </div>
    </div>
  )
}

function PathRow({
  path,
  level,
  open,
  onToggle,
  onStart,
}: {
  path: SkillPath
  level: number
  open: boolean
  onToggle: () => void
  onStart: (scenario: Scenario) => void
}) {
  const { state } = useSpeakLab()
  const locked = path.unlocksAtLevel > level
  const skills = skillsInPath(path.id)

  const practised = skills.filter(
    (skill) => skillProgressFor(state, skill.id).evidence.length > 0,
  ).length

  return (
    <Card variant={open ? undefined : 'plain'}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        style={{
          all: 'unset',
          cursor: 'pointer',
          display: 'block',
          width: '100%',
        }}
      >
        <div className="row row--between">
          <div className="stack" style={{ gap: 2 }}>
            <span className="heading" style={{ color: locked ? 'var(--ink-faint)' : 'var(--ink)' }}>
              {path.name}
            </span>
            <span className="caption">{path.tagline}</span>
          </div>
          {locked ? (
            <Pill>Level {path.unlocksAtLevel}</Pill>
          ) : (
            <Pill tone={practised === skills.length && skills.length > 0 ? 'accent' : undefined}>
              {practised}/{skills.length}
            </Pill>
          )}
        </div>
      </button>

      {open ? (
        <div className="stack stack--tight enter" style={{ marginTop: 'var(--space-m)' }}>
          {locked ? (
            <p className="caption">
              Unlocks at level {path.unlocksAtLevel}. You're level {level}. Practise anything else
              and you'll get there.
            </p>
          ) : null}
          {skills.map((skill) => (
            <SkillRow key={skill.id} skill={skill} locked={locked} onStart={onStart} />
          ))}
        </div>
      ) : null}
    </Card>
  )
}

function SkillRow({
  skill,
  locked,
  onStart,
}: {
  skill: MicroSkill
  locked: boolean
  onStart: (scenario: Scenario) => void
}) {
  const { state } = useSpeakLab()
  const [expanded, setExpanded] = useState(false)
  const progress = skillProgressFor(state, skill.id)
  const mastery = computeMastery(progress.evidence)
  const scenarios = scenariosForSkill(skill.id)

  return (
    <div className="stack stack--tight">
      <button
        type="button"
        className="link-button"
        onClick={() => setExpanded((value) => !value)}
        style={{ width: '100%' }}
      >
        <div className="row row--between">
          <span className="body" style={{ color: 'var(--ink)' }}>
            {skill.name}
          </span>
          <Pill tone={mastery.band === 'fluent' ? 'accent' : undefined}>
            {MASTERY_BAND_NAMES[mastery.band]}
          </Pill>
        </div>
      </button>

      {expanded ? (
        <Card variant="sunken">
          <div className="stack stack--tight enter">
            <p className="body">{skill.summary}</p>
            <p className="caption">{skill.whyItMatters}</p>
            <p className="quote">{quoted(skill.strongExample)}</p>
            <p className="caption">
              {mastery.evidenceCount === 0
                ? 'Not practised yet.'
                : `${mastery.evidenceCount} session${mastery.evidenceCount === 1 ? '' : 's'} across ${mastery.distinctScenarios} scenario${mastery.distinctScenarios === 1 ? '' : 's'}. ${mastery.nextRequirement}`}
            </p>
            {scenarios.length > 0 ? (
              <div className="stack stack--tight">
                <SectionLabel>Missions</SectionLabel>
                {scenarios.map((scenario) => (
                  <div key={scenario.id} className="row row--between">
                    <div className="stack" style={{ gap: 2, minWidth: 0 }}>
                      <span className="body">{scenario.title}</span>
                      <span className="caption">{scenario.hook}</span>
                    </div>
                    <div className="row" style={{ flex: '0 0 auto' }}>
                      <TierPill tier={scenario.tier} />
                      <Button
                        variant="secondary"
                        disabled={locked}
                        onClick={() => onStart(scenario)}
                      >
                        Start
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </Card>
      ) : null}
    </div>
  )
}
