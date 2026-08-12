import type { Achievement, FieldTest } from '@/lib/types'

/**
 * Field Tests.
 *
 * The whole point is that these never name a technique. The learner gets a
 * situation and ninety seconds; the app then looks at what they actually
 * reached for and checks it against everything they have been taught. An
 * unprompted, appropriate retrieval is the single most valuable event in the
 * app, and it is the only route to the higher mastery stages.
 *
 * `unlockAtTechniques` staggers them so the first Field Test arrives once
 * there is genuinely something to retrieve.
 */
export const FIELD_TESTS: FieldTest[] = [
  {
    id: 'ft-three-failed',
    title: 'Three of them failed',
    scenarioId: 'failed-belt-test',
    unlockAtTechniques: 2,
  },
  { id: 'ft-quitting', title: 'He is done', scenarioId: 'wants-to-quit', unlockAtTechniques: 3 },
  {
    id: 'ft-angry-parent',
    title: 'She is not lowering her voice',
    scenarioId: 'angry-parent',
    unlockAtTechniques: 4,
  },
  {
    id: 'ft-coasting-leaders',
    title: 'Nobody is doing the job',
    scenarioId: 'leaders-not-serious',
    unlockAtTechniques: 4,
  },
  {
    id: 'ft-plateau',
    title: 'Four months, nothing',
    scenarioId: 'no-visible-progress',
    unlockAtTechniques: 5,
  },
  {
    id: 'ft-hostile-question',
    title: 'The question from the back',
    scenarioId: 'hostile-question',
    unlockAtTechniques: 6,
  },
  {
    id: 'ft-talented-late',
    title: 'Talent is not a plan',
    scenarioId: 'talented-undisciplined',
    unlockAtTechniques: 6,
  },
  {
    id: 'ft-gossip',
    title: 'You heard what they said',
    scenarioId: 'team-gossip',
    unlockAtTechniques: 7,
  },
  {
    id: 'ft-withdraw',
    title: 'End of the month',
    scenarioId: 'parent-wants-to-withdraw',
    unlockAtTechniques: 7,
  },
  {
    id: 'ft-suffering',
    title: 'Why would that be allowed',
    scenarioId: 'explain-suffering',
    unlockAtTechniques: 8,
  },
  {
    id: 'ft-no-prep',
    title: 'You are on now',
    scenarioId: 'no-preparation',
    unlockAtTechniques: 8,
  },
  {
    id: 'ft-discouraged-room',
    title: 'The club that lost its lease',
    scenarioId: 'inspire-discouraged-room',
    unlockAtTechniques: 10,
  },
]

export const FIELD_TEST_BY_ID = new Map(FIELD_TESTS.map((test) => [test.id, test]))

/**
 * Achievements.
 *
 * Every one of these requires the learner to have spoken. None of them can be
 * earned by opening the app, browsing, or reading — which is the whole design
 * rule for the game layer.
 */
export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-rep',
    name: 'First Rep',
    description: 'Record your first attempt.',
    test: { kind: 'attempts', min: 1 },
  },
  {
    id: 'second-take',
    name: 'Second Take',
    description: 'Improve a technique score by 20 points on a retry.',
    test: { kind: 'improvement', minDelta: 20 },
  },
  {
    id: 'cold-retrieval',
    name: 'Cold Retrieval',
    description: 'Use a technique correctly in a Field Test without being told to.',
    test: { kind: 'cold-retrieval', min: 1 },
  },
  {
    id: 'cold-blooded',
    name: 'Cold Blooded',
    description: 'Five unprompted retrievals.',
    test: { kind: 'cold-retrieval', min: 5 },
  },
  {
    id: 'storyteller',
    name: 'Storyteller',
    description: 'Complete ten storytelling attempts.',
    test: { kind: 'category-attempts', category: 'storytelling', min: 10 },
  },
  {
    id: 'under-pressure',
    name: 'Under Pressure',
    description: 'Complete five improvisation challenges.',
    test: { kind: 'category-attempts', category: 'improvisation', min: 5 },
  },
  {
    id: 'leaders-voice',
    name: 'Leader’s Voice',
    description: 'Complete twenty leadership-team scenarios.',
    test: { kind: 'scenario-category', category: 'leadership-team', min: 20 },
  },
  {
    id: 'the-corridor',
    name: 'The Corridor',
    description: 'Complete ten parent conversations.',
    test: { kind: 'scenario-category', category: 'parents', min: 10 },
  },
  {
    id: 'master-of-reframing',
    name: 'Master of Reframing',
    description: 'Reach Integrated on Reframing.',
    test: { kind: 'mastery-stage', stage: 'integrated', min: 1 },
  },
  {
    id: 'armed',
    name: 'Armed',
    description: 'Take five techniques to Reliable.',
    test: { kind: 'mastery-stage', stage: 'reliable', min: 5 },
  },
  {
    id: 'two-weeks',
    name: 'Fortnight',
    description: 'Train fourteen days in a row.',
    test: { kind: 'streak', min: 14 },
  },
  {
    id: 'orator',
    name: 'Orator',
    description: 'Reach level 10.',
    test: { kind: 'level', min: 10 },
  },
  {
    id: 'real-world',
    name: 'Off the Mat',
    description: 'Prepare five real talks in the Speech Gym.',
    test: { kind: 'gym-sessions', min: 5 },
  },
]

export const ACHIEVEMENT_BY_ID = new Map(ACHIEVEMENTS.map((entry) => [entry.id, entry]))
