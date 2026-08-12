'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useStore } from '@/lib/store'
import { Card, Eyebrow } from '@/components/ui'
import {
  AUDIENCE_NAMES,
  SKILL_BRANCH_NAMES,
  type ScenarioAudience,
  type SkillBranch,
} from '@/lib/types'

/**
 * Onboarding.
 *
 * Two questions. They shape which scenarios surface first and nothing else —
 * the curriculum order is fixed, because the first five techniques build on
 * each other and letting someone skip to Persuasion on day one produces a bad
 * first session. Anything longer than this is a page between the learner and
 * their first rep.
 */

const GOALS: SkillBranch[] = [
  'motivation',
  'presence',
  'leadership',
  'teaching',
  'storytelling',
  'persuasion',
  'emotional-connection',
  'clarity',
  'improvisation',
]

const AUDIENCES: ScenarioAudience[] = ['children', 'teens', 'adults', 'parents', 'team', 'church', 'public']

export default function OnboardingPage() {
  const { update } = useStore()
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [goals, setGoals] = useState<SkillBranch[]>([])
  const [audiences, setAudiences] = useState<ScenarioAudience[]>([])

  const toggle = <T,>(list: T[], value: T, set: (next: T[]) => void) => {
    set(list.includes(value) ? list.filter((item) => item !== value) : [...list, value])
  }

  const finish = () => {
    update((current) => ({
      ...current,
      profile: { ...current.profile, goals, audiences, onboardedAt: new Date().toISOString() },
    }))
    router.replace('/')
  }

  return (
    <main className="screen screen--plain stack-lg">
      <header className="stack-sm" style={{ paddingTop: 24 }}>
        <Eyebrow amber>Rostrum</Eyebrow>
        <h1 className="display">
          {step === 0 ? 'What do you want to get better at?' : 'Who do you speak to most?'}
        </h1>
        <p className="caption">
          {step === 0
            ? 'Pick as many as apply. This decides which situations you practise on, not what you learn first.'
            : 'Your scenarios will be drawn from these rooms.'}
        </p>
      </header>

      {step === 0 ? (
        <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
          {GOALS.map((goal) => (
            <button
              key={goal}
              type="button"
              className="pick"
              aria-pressed={goals.includes(goal)}
              onClick={() => toggle(goals, goal, setGoals)}
            >
              {SKILL_BRANCH_NAMES[goal]}
            </button>
          ))}
        </div>
      ) : (
        <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
          {AUDIENCES.map((audience) => (
            <button
              key={audience}
              type="button"
              className="pick"
              aria-pressed={audiences.includes(audience)}
              onClick={() => toggle(audiences, audience, setAudiences)}
            >
              {AUDIENCE_NAMES[audience]}
            </button>
          ))}
        </div>
      )}

      {step === 1 ? (
        <Card variant="quiet">
          <div className="stack-sm">
            <Eyebrow>Before you start</Eyebrow>
            <p className="caption">
              Recording happens in your browser and stays there. Audio is never uploaded and never
              saved. If you connect a coaching key later, the transcript is what gets sent — never
              the audio, never your history.
            </p>
          </div>
        </Card>
      ) : null}

      <div style={{ flex: 1 }} />

      <div className="stack-sm">
        <button
          type="button"
          className="btn btn-block"
          disabled={step === 0 ? goals.length === 0 : audiences.length === 0}
          onClick={() => (step === 0 ? setStep(1) : finish())}
        >
          {step === 0 ? 'Next' : 'Start training'}
        </button>
        {step === 1 ? (
          <button type="button" className="btn-quiet" onClick={() => setStep(0)}>
            Back
          </button>
        ) : null}
      </div>
    </main>
  )
}
