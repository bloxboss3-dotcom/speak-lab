/**
 * Response schemas for every coaching task.
 *
 * The app names a task; the proxy owns the schema. That split means a client
 * can never ask the model for an arbitrary response shape, and it keeps the
 * contract in one auditable place.
 *
 * These must stay in step with the Swift types in
 * `ios/SpeakLab/Core/Coaching/CoachFeedback.swift`. The Swift decoder
 * re-validates independently, so drift shows up as a decode error rather than
 * a half-empty feedback card.
 *
 * Schema constraints imposed by structured outputs:
 *  - every object needs `additionalProperties: false`
 *  - every property must appear in `required`
 *  - optionality is expressed as `anyOf: [<type>, {type: 'null'}]`
 */

export const RUBRIC_DIMENSIONS = [
  'clarity',
  'organization',
  'concision',
  'audienceAdaptation',
  'specificity',
  'warmthAndRespect',
  'listeningAndAcknowledgment',
  'questionQuality',
  'benefitExplanation',
  'concernHandling',
  'opening',
  'ending',
] as const;

export const RUBRIC_RATINGS = ['strong', 'adequate', 'needsWork'] as const;

export const NUGGET_CATEGORIES = ['persuasion', 'sales', 'charisma', 'structure', 'listening'] as const;

const nullableString = { anyOf: [{ type: 'string' }, { type: 'null' }] } as const;

const goldenNugget = {
  anyOf: [
    {
      type: 'object',
      additionalProperties: false,
      required: ['id', 'title', 'insight', 'category'],
      properties: {
        id: { type: 'string', description: 'Stable identifier, kebab-case.' },
        title: { type: 'string' },
        insight: {
          type: 'string',
          description: 'Two or three sentences. Practical and ethical — never a manipulation tactic.',
        },
        category: { type: 'string', enum: NUGGET_CATEGORIES },
      },
    },
    { type: 'null' },
  ],
} as const;

const transferScenario = {
  anyOf: [
    {
      type: 'object',
      additionalProperties: false,
      required: ['scenarioID', 'title', 'twist'],
      properties: {
        scenarioID: {
          ...nullableString,
          description: 'ID of an existing scenario if one fits, otherwise null.',
        },
        title: { type: 'string' },
        twist: { type: 'string', description: 'What changed relative to the scenario just practised.' },
      },
    },
    { type: 'null' },
  ],
} as const;

const rubricObservations = {
  type: 'array',
  description: 'At most one observation per dimension. Only dimensions the transcript actually evidences.',
  items: {
    type: 'object',
    additionalProperties: false,
    required: ['dimension', 'rating', 'observation'],
    properties: {
      dimension: { type: 'string', enum: RUBRIC_DIMENSIONS },
      rating: { type: 'string', enum: RUBRIC_RATINGS },
      observation: {
        type: 'string',
        description: 'One concrete sentence citing what happened. No scores or percentages.',
      },
    },
  },
} as const;

export const attemptFeedbackSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'scenarioOutcome',
    'strengths',
    'primaryTarget',
    'evidenceQuote',
    'explanation',
    'retryInstruction',
    'optionalGoldenNugget',
    'rubricObservations',
    'safetyFlags',
    'transferScenario',
    'targetSkillID',
  ],
  properties: {
    scenarioOutcome: {
      type: 'string',
      description: 'One sentence describing what actually happened in the scenario.',
    },
    strengths: {
      type: 'array',
      description: 'One to three specific things that worked, each tied to observable behaviour.',
      items: { type: 'string' },
    },
    primaryTarget: {
      type: 'string',
      description: 'The single most important behaviour to change. Never a list.',
    },
    evidenceQuote: {
      type: 'string',
      description: 'Verbatim words from the transcript showing the moment. Must appear in the transcript.',
    },
    explanation: {
      type: 'string',
      description: 'Two to four sentences on why this matters to this listener in this scenario.',
    },
    retryInstruction: {
      type: 'string',
      description: 'One imperative sentence the learner can hold in mind while speaking.',
    },
    optionalGoldenNugget: goldenNugget,
    rubricObservations,
    safetyFlags: {
      type: 'array',
      description: 'Empty in almost every case. Populate for distress or a request to coach manipulation.',
      items: { type: 'string' },
    },
    transferScenario,
    targetSkillID: {
      ...nullableString,
      description: 'One of the skill IDs offered in the system prompt.',
    },
  },
} as const;

export const attemptComparisonSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'targetImproved',
    'changeWasSuperficial',
    'summary',
    'evidenceBefore',
    'evidenceAfter',
    'whatChanged',
    'whatDidNotChange',
    'nextStep',
  ],
  properties: {
    targetImproved: {
      type: 'boolean',
      description: 'Did the specific targeted behaviour change? Not "was attempt two nicer".',
    },
    changeWasSuperficial: {
      type: 'boolean',
      description: 'True when the wording changed but the underlying behaviour did not.',
    },
    summary: { type: 'string' },
    evidenceBefore: { type: 'string', description: 'Verbatim quote from attempt one.' },
    evidenceAfter: { type: 'string', description: 'Verbatim quote from attempt two.' },
    whatChanged: { type: 'array', items: { type: 'string' } },
    whatDidNotChange: { type: 'array', items: { type: 'string' } },
    nextStep: { type: 'string', description: 'One sentence: what to do next.' },
  },
} as const;

export const characterTurnSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['speech', 'innerState', 'observedMove', 'objectiveMet', 'objectiveMissed', 'shouldEnd', 'endReason'],
  properties: {
    speech: {
      type: 'string',
      description:
        'What the character says out loud. One to four sentences of natural speech. No stage directions, asterisks or bullet points.',
    },
    innerState: {
      type: 'string',
      description: 'The character\'s private read of the moment, one sentence. Never spoken aloud.',
    },
    observedMove: {
      ...nullableString,
      description: 'One specific thing the learner just did, if notable. Otherwise null.',
    },
    objectiveMet: { type: 'boolean' },
    objectiveMissed: { type: 'boolean' },
    shouldEnd: { type: 'boolean' },
    endReason: nullableString,
  },
} as const;

export const TASK_SCHEMAS = {
  attempt_feedback: attemptFeedbackSchema,
  attempt_comparison: attemptComparisonSchema,
  character_turn: characterTurnSchema,
  conversation_debrief: attemptFeedbackSchema,
} as const;

export type CoachingTask = keyof typeof TASK_SCHEMAS;

export function isCoachingTask(value: unknown): value is CoachingTask {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(TASK_SCHEMAS, value);
}
