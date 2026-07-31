// Mirrors ios/SpeakLab/Core/Domain and Core/Analysis.
//
// These types are the TypeScript face of the Swift value types the iOS app
// uses. Field names match exactly, because the same JSON content file and the
// same coaching schema feed both clients — a rename on one side without the
// other would be a silent break, so they are kept identical on purpose.

export type PracticeMode = 'speaking' | 'conversation'

/** 1 = Foundation … 4 = Boss. Numeric so tiers stay comparable. */
export type DifficultyTier = 1 | 2 | 3 | 4

export const TIER_NAMES: Record<DifficultyTier, string> = {
  1: 'Foundation',
  2: 'Applied',
  3: 'Pressure',
  4: 'Boss',
}

export const TIER_XP_MULTIPLIER: Record<DifficultyTier, number> = {
  1: 1.0,
  2: 1.25,
  3: 1.6,
  4: 2.0,
}

/**
 * The rubric the coaching is graded against.
 *
 * Every dimension is behavioural and evidenced by the transcript or by timing
 * data. Deliberately absent: charisma, confidence, authority, honesty,
 * personality — none of those are observable from a recording.
 */
export type RubricDimension =
  | 'clarity'
  | 'organization'
  | 'concision'
  | 'audienceAdaptation'
  | 'specificity'
  | 'warmthAndRespect'
  | 'listeningAndAcknowledgment'
  | 'questionQuality'
  | 'benefitExplanation'
  | 'concernHandling'
  | 'opening'
  | 'ending'

export const RUBRIC_DIMENSIONS: RubricDimension[] = [
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
]

export const RUBRIC_DIMENSION_NAMES: Record<RubricDimension, string> = {
  clarity: 'Clarity',
  organization: 'Organization',
  concision: 'Concision',
  audienceAdaptation: 'Audience adaptation',
  specificity: 'Specificity',
  warmthAndRespect: 'Warmth & respect',
  listeningAndAcknowledgment: 'Listening & acknowledgment',
  questionQuality: 'Question quality',
  benefitExplanation: 'Explaining benefits',
  concernHandling: 'Handling concerns',
  opening: 'Opening',
  ending: 'Ending / call to action',
}

/** Three coarse bands on purpose — a 0–100 score on "warmth" would be fake precision. */
export type RubricRating = 'strong' | 'adequate' | 'needsWork'

export const RUBRIC_RATING_NAMES: Record<RubricRating, string> = {
  strong: 'Strong',
  adequate: 'Adequate',
  needsWork: 'Needs work',
}

/** Used only for internal mastery maths, never shown as a score. */
export const RUBRIC_RATING_WEIGHT: Record<RubricRating, number> = {
  strong: 1.0,
  adequate: 0.55,
  needsWork: 0.15,
}

export interface MicroSkill {
  id: string
  pathID: string
  name: string
  summary: string
  whyItMatters: string
  strongExample: string
  weakExample?: string
  retryCue: string
  rubricDimension: RubricDimension
}

export interface SkillPath {
  id: string
  name: string
  tagline: string
  /** SF Symbol name on iOS; the web build maps it to its own glyph set. */
  symbol: string
  accentHex: string
  skillIDs: string[]
  unlocksAtLevel: number
}

export interface Objective {
  id: string
  text: string
  isBonus?: boolean
}

/**
 * The hidden brief for a simulated person. Never rendered before the attempt —
 * the learner has to work out what this person wants by listening.
 */
export interface CharacterBrief {
  name: string
  role: string
  personality: string
  emotionalState: string
  hiddenGoal: string
  objection: string
  opensWith: string
  successCondition: string
  failCondition: string
  voiceHint: string
}

export interface Scenario {
  id: string
  title: string
  hook: string
  mode: PracticeMode
  pathID: string
  primarySkillID: string
  tier: DifficultyTier
  briefing: string
  objectives: Objective[]
  /** Absent means untimed — used for the anxiety ladder's first rung. */
  timeLimitSeconds?: number
  prepSeconds: number
  character?: CharacterBrief
  transferOf?: string
  transferTwist?: string
  tags?: string[]
}

export type NuggetCategory = 'persuasion' | 'sales' | 'charisma' | 'structure' | 'listening'

export const NUGGET_CATEGORY_NAMES: Record<NuggetCategory, string> = {
  persuasion: 'Persuasion',
  sales: 'Ethical sales',
  charisma: 'Presence',
  structure: 'Structure',
  listening: 'Listening',
}

export interface GoldenNugget {
  id: string
  title: string
  insight: string
  category: NuggetCategory
}

export interface NuggetEntry {
  nugget: GoldenNugget
  relatedSkillIDs: string[]
}

// MARK: - Measured data

export interface SpeechSegment {
  text: string
  start: number
  duration: number
}

export interface TimedSentence {
  text: string
  start: number
  end: number
  wordCount: number
}

export interface FillerHit {
  token: string
  count: number
}

export interface RepeatedPhrase {
  phrase: string
  count: number
}

export interface LongPause {
  start: number
  duration: number
  afterWordIndex: number
}

/**
 * Everything measured locally, with no model involved.
 *
 * Every field is counted from the transcript or derived from timings. Nothing
 * here is an inference about the speaker, and that separation is preserved all
 * the way to the feedback screen.
 */
export interface SpeakingMetrics {
  totalDuration: number
  speakingDuration: number
  leadingSilence: number

  wordCount: number
  wordsPerMinute: number
  articulationRate: number

  fillers: FillerHit[]
  fillerCount: number
  /** Fillers per 100 words — comparable across recordings of different lengths. */
  fillerRate: number
  hedges: FillerHit[]
  hedgeCount: number
  repeatedPhrases: RepeatedPhrase[]

  longPauses: LongPause[]
  longestPause: number
  /** Windowed pace stdev / mean. 0 = perfectly even; ~0.15+ = deliberate variation. */
  paceVariation: number
  slowestWindowWPM: number
  fastestWindowWPM: number

  sentences: TimedSentence[]
  averageSentenceWordCount: number
  longestSentenceWordCount: number

  timeLimit?: number
  withinTimeLimit?: boolean
}

export const EMPTY_METRICS: SpeakingMetrics = {
  totalDuration: 0,
  speakingDuration: 0,
  leadingSilence: 0,
  wordCount: 0,
  wordsPerMinute: 0,
  articulationRate: 0,
  fillers: [],
  fillerCount: 0,
  fillerRate: 0,
  hedges: [],
  hedgeCount: 0,
  repeatedPhrases: [],
  longPauses: [],
  longestPause: 0,
  paceVariation: 0,
  slowestWindowWPM: 0,
  fastestWindowWPM: 0,
  sentences: [],
  averageSentenceWordCount: 0,
  longestSentenceWordCount: 0,
}

/** Tunables for the metrics pipeline, kept in one place so they can be tested. */
export const Thresholds = {
  longPause: 1.2,
  articulationPauseGap: 0.3,
  sentenceBreakPause: 0.7,
  paceWindow: 10,
  minRepeatedPhraseWords: 3,
  maxRepeatedPhraseWords: 6,
  comfortablePaceLow: 125,
  comfortablePaceHigh: 165,
} as const

export const FillerLexicon = {
  hardFillers: new Set([
    'um', 'umm', 'ummm', 'uh', 'uhh', 'uhhh', 'er', 'erm', 'ah', 'ahh',
    'mm', 'mmm', 'hmm', 'eh', 'uhm',
  ]),

  /** Multi-word fillers, matched as consecutive tokens. */
  fillerPhrases: [
    ['you', 'know'],
    ['i', 'mean'],
    ['sort', 'of'],
    ['kind', 'of'],
    ['you', 'know', 'what', 'i', 'mean'],
    ['and', 'stuff'],
    ['or', 'whatever'],
    ['if', 'that', 'makes', 'sense'],
  ] as string[][],

  /**
   * Weaken a sentence when overused but are frequently legitimate. Reported
   * separately and never called an error on their own.
   */
  hedges: new Set([
    'just', 'actually', 'basically', 'literally', 'obviously', 'really',
    'maybe', 'probably', 'somewhat', 'quite', 'perhaps',
  ]),
} as const

// MARK: - Conversation

export type ConversationSpeaker = 'user' | 'character'

export interface ConversationTurn {
  id: string
  speaker: ConversationSpeaker
  text: string
  duration: number
  /** True for the simulated character, whose speaking time is inferred from word count. */
  durationIsEstimated: boolean
  segments: SpeechSegment[]
}

export type QuestionKind = 'open' | 'closed' | 'clarifying'

export interface DetectedQuestion {
  text: string
  kind: QuestionKind
  turnIndex: number
}

export interface ConversationMetrics {
  turnCount: number
  userTurnCount: number
  characterTurnCount: number

  userSpeakingSeconds: number
  characterSpeakingSecondsEstimated: number
  userTalkShare: number

  questions: DetectedQuestion[]
  openQuestionCount: number
  closedQuestionCount: number
  clarifyingQuestionCount: number
  stackedQuestionTurns: number

  acknowledgmentCount: number
  averageUserTurnWords: number
  longestUserTurnWords: number

  /**
   * Always false: turns are push-to-talk, so the learner physically cannot
   * speak over the character. Reporting a count would be inventing data.
   */
  interruptionsMeasurable: boolean

  userSpeech: SpeakingMetrics
}

// MARK: - Coaching contract

export interface RubricObservation {
  dimension: RubricDimension
  rating: RubricRating
  observation: string
}

export interface TransferSuggestion {
  scenarioID?: string
  title: string
  twist: string
}

export interface CoachFeedback {
  scenarioOutcome: string
  strengths: string[]
  primaryTarget: string
  evidenceQuote: string
  explanation: string
  retryInstruction: string
  optionalGoldenNugget?: GoldenNugget
  rubricObservations: RubricObservation[]
  safetyFlags: string[]
  transferScenario?: TransferSuggestion
  targetSkillID?: string
}

export interface AttemptComparison {
  targetImproved: boolean
  changeWasSuperficial: boolean
  summary: string
  evidenceBefore: string
  evidenceAfter: string
  whatChanged: string[]
  whatDidNotChange: string[]
  nextStep: string
}

/**
 * Improvement only counts when the target actually moved and the change was
 * substantive. Rewarding a reworded but unchanged attempt teaches the wrong
 * lesson, so this is the single gate every reward path goes through.
 */
export function countsAsImprovement(comparison: AttemptComparison | undefined): boolean {
  if (!comparison) return false
  return comparison.targetImproved && !comparison.changeWasSuperficial
}

export interface CharacterTurnResponse {
  speech: string
  innerState: string
  observedMove?: string
  objectiveMet: boolean
  objectiveMissed: boolean
  shouldEnd: boolean
  endReason?: string
}
