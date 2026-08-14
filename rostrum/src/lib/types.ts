/**
 * The domain.
 *
 * Content is data, never markup: masters, techniques, lessons, scenarios and
 * principles are all plain objects so the catalogue can grow without a single
 * component changing. Anything the app persists about the learner lives in the
 * `Progress` half of this file and is a separate shape from the content it
 * refers to, joined only by id.
 */

// ---------------------------------------------------------------- Content

export type SkillCategory =
  | 'rhetoric'
  | 'storytelling'
  | 'emotional-connection'
  | 'persuasion'
  | 'teaching'
  | 'leadership'
  | 'motivation'
  | 'empathy'
  | 'argumentation'
  | 'presence'
  | 'delivery'
  | 'openings'
  | 'closings'
  | 'engagement'
  | 'improvisation'

export const SKILL_CATEGORY_NAMES: Record<SkillCategory, string> = {
  rhetoric: 'Rhetoric',
  storytelling: 'Storytelling',
  'emotional-connection': 'Emotional Connection',
  persuasion: 'Persuasion',
  teaching: 'Teaching',
  leadership: 'Leadership',
  motivation: 'Motivation',
  empathy: 'Empathy',
  argumentation: 'Argumentation',
  presence: 'Presence',
  delivery: 'Delivery',
  openings: 'Openings',
  closings: 'Closings',
  engagement: 'Audience Engagement',
  improvisation: 'Improvisation',
}

/**
 * The nine branches shown on the skill tree and the progress bars. Deliberately
 * fewer than the categories above: a tree with fifteen limbs reads as a list.
 */
export type SkillBranch =
  | 'clarity'
  | 'presence'
  | 'storytelling'
  | 'emotional-connection'
  | 'persuasion'
  | 'motivation'
  | 'teaching'
  | 'leadership'
  | 'improvisation'

export const SKILL_BRANCH_NAMES: Record<SkillBranch, string> = {
  clarity: 'Clarity',
  presence: 'Presence',
  storytelling: 'Storytelling',
  'emotional-connection': 'Emotional Connection',
  persuasion: 'Persuasion',
  motivation: 'Motivation',
  teaching: 'Teaching',
  leadership: 'Leadership',
  improvisation: 'Improvisation',
}

export interface Master {
  id: string
  name: string
  /** How they are best known — one line, factual. */
  role: string
  years: string
  /** The single thing this person did to language that is worth stealing. */
  signature: string
  /** Two or three sentences on what made their communication work. */
  study: string
  /**
   * Stated plainly on every Master page. The app teaches transferable
   * technique; it does not train impersonation, and it does not ask the
   * learner to adopt anyone's convictions or persona.
   */
  caution: string
  /** Initials shown in the portrait plate when no image exists. */
  initials: string
  /** Hex used for the plate's wash. Warm end of the palette. */
  accent: string
  techniqueIds: string[]
}

/**
 * A recording of someone using a technique, so it can be heard and not only
 * read. Half of what makes these techniques work is prosody — where the pitch
 * climbs, where the pause falls — and none of that survives on the page.
 *
 * Every clip here is a US Government work: an official recorded by a federal
 * agency in the course of their duties, which carries no copyright at all under
 * 17 U.S.C. §105. That is a deliberately narrow rule. A broadcaster's recording
 * of the same public-domain speech is still the broadcaster's recording, and
 * most great speeches of the last century cannot be used at any price — so the
 * provenance travels with the clip rather than sitting in a comment somewhere.
 */
export interface SpeechClip {
  /** File under public/clips. */
  file: string
  speaker: string
  occasion: string
  /** Length of the clip, and where it sits in the full recording. */
  seconds: number
  startsAt: number
  /** The archive it came from, so the claim can be checked. */
  sourceUrl: string
  /** Which agency made the recording — the reason it is free to use. */
  recordedBy: string
  /** What is happening in the audio. Original commentary, and the actual lesson. */
  listenFor: string
}

/**
 * One line of a worked example, with what that line is doing.
 *
 * `doing` is mechanical on purpose — "same opening, word for word", not "this
 * builds a sense of momentum". The learner is looking at the line while they
 * read it, so the note has to describe the move, not admire it.
 */
export interface BreakdownLine {
  text: string
  doing: string
}

/**
 * A real thing, taken apart.
 *
 * This is the centre of a lesson. Explaining a technique and then asking for a
 * performance is a classroom model; showing one that works, marking what every
 * line in it is doing, and then asking for the same shape is closer to how a
 * physical skill is actually taught.
 */
export interface Breakdown {
  /** Where it came from, said plainly on screen. */
  source: string
  /** True only when these are someone's actual recorded words. */
  verbatim: boolean
  lines: BreakdownLine[]
  /** The one instruction for making your own. */
  nowYou: string
}

/**
 * Where a technique was used for real.
 *
 * `what` describes the move structurally and is written for this app. `words`
 * carries the actual line, and appears only where the source is public domain —
 * Lincoln, or a US official recorded in office. For everyone else the passage
 * is described and located rather than reproduced, which is the part that
 * transfers in any case: knowing that one opening is held fixed while the thing
 * after it widens teaches more than the sentence does.
 */
export interface InTheWild {
  speaker: string
  /** The occasion, specific enough to find and listen to. */
  where: string
  what: string
  words?: string
}

export interface Technique {
  id: string
  name: string
  /** Absent for techniques that belong to a tradition rather than a person. */
  masterId?: string
  category: SkillCategory
  branch: SkillBranch
  /** One sentence, on the card. */
  summary: string
  /** Why it works on a listener — the mechanism, not the vibe. */
  why: string
  /** The pattern, as ordered steps. Rendered as the technique's diagram. */
  structure: string[]
  /**
   * The same pattern as a skeleton you fill in.
   *
   * `structure` describes the move; this one is the move with the words taken
   * out, so it can be built rather than admired. Anything inside [brackets] is
   * a slot the learner supplies, and the words outside them are the fixed
   * scaffolding. Reading down it should produce a usable line without having to
   * reverse-engineer the example.
   */
  blueprint: string[]
  whenToUse: string
  whenNotToUse: string
  /** An original line written for this app, not a quotation. */
  example: string
  /**
   * The same move said in a Taekwondo hall. Written for this app.
   *
   * A technique only becomes usable at the point you can hear yourself saying
   * it on a Thursday night, so this is the example that does most of the work.
   */
  matExample: string
  /** Where someone used it for real, and what they did there. */
  inTheWild?: InTheWild
  /** One worked example taken apart line by line. The centre of the lesson. */
  breakdown?: Breakdown
  /**
   * Observable markers the offline evaluator looks for in a transcript.
   * These are what make coaching work with no API key — each is a real,
   * checkable property of the text rather than a vibe.
   */
  tells: TechniqueTell[]
  /** Techniques that should be learned first. */
  requires?: string[]
  /** Recordings of the technique in use. Most techniques have none. */
  clips?: SpeechClip[]
}

/** A checkable property of a transcript. */
export type TechniqueTell =
  /** Three or more sentences opening with the same two or three words. */
  | { kind: 'anaphora'; minRepeats: number }
  /** Explicit opposition: "not x, but y", "was … now", "instead of". */
  | { kind: 'antithesis' }
  /** Successive repeated units growing in length or intensity. */
  | { kind: 'escalation' }
  /** A first-person past-tense narrative opening. */
  | { kind: 'narrative-open' }
  /** A question directed at the listener. */
  | { kind: 'question'; min: number }
  /** A specific, time-bound instruction near the end. */
  | { kind: 'call-to-action' }
  /** Concrete sensory nouns rather than abstractions. */
  | { kind: 'concrete-nouns'; min: number }
  /** Naming the listener's likely objection before answering it. */
  | { kind: 'concession' }
  /** A stated comparison using like/as/imagine. */
  | { kind: 'analogy' }
  /** Naming a feeling the listener is having. */
  | { kind: 'emotion-named' }
  /** The last sentence is the shortest and lands a single idea. */
  | { kind: 'short-close'; maxWords: number }
  /** A phrase from the opening returning at the end. */
  | { kind: 'callback' }
  /** Any of a set of literal phrases. */
  | { kind: 'phrases'; any: string[]; label: string }

export interface LessonDecodeQuestion {
  id: string
  prompt: string
  options: string[]
  /** Index into `options`. */
  answer: number
  /** Shown after answering, right or wrong. */
  because: string
}

export interface LessonBuildExercise {
  instruction: string
  /** Lines with `___` marking what the learner completes. */
  frame: string[]
  hint: string
}

export interface Lesson {
  id: string
  techniqueId: string
  /** Ordering for the curriculum. Lesson 1 must be a satisfying win. */
  order: number
  title: string
  /** The line on the Today card. */
  promise: string
  estimatedMinutes: number
  /** A short worked example, written for this app. */
  decodeExample: {
    setting: string
    lines: string[]
  }
  decodeQuestions: LessonDecodeQuestion[]
  build: LessonBuildExercise
  /** The scenario the learner performs at the end of the lesson. */
  scenarioId: string
}

export type ScenarioAudience =
  | 'children'
  | 'teens'
  | 'adults'
  | 'parents'
  | 'team'
  | 'church'
  | 'public'

export const AUDIENCE_NAMES: Record<ScenarioAudience, string> = {
  children: 'Children',
  teens: 'Teens',
  adults: 'Adults',
  parents: 'Parents',
  team: 'Leadership team',
  church: 'Church',
  public: 'Public audience',
}

export type ScenarioCategory =
  | 'child-motivation'
  | 'leadership-team'
  | 'parents'
  | 'public-speaking'
  | 'faith'

export const SCENARIO_CATEGORY_NAMES: Record<ScenarioCategory, string> = {
  'child-motivation': 'Motivating a student',
  'leadership-team': 'Leadership team',
  parents: 'Parents',
  'public-speaking': 'Public speaking',
  faith: 'Devotional',
}

export interface Scenario {
  id: string
  title: string
  category: ScenarioCategory
  audience: ScenarioAudience
  /** What is happening, in the second person. */
  situation: string
  /** What the learner has to achieve. */
  mission: string
  prepSeconds: number
  speakSeconds: number
  /** Rises with emotional stakes and time pressure, 1–4. */
  intensity: 1 | 2 | 3 | 4
}

/**
 * A Field Test never names a technique. The whole point is finding out what
 * the learner reaches for unprompted.
 */
export interface FieldTest {
  id: string
  title: string
  scenarioId: string
  /** Only offered once the learner has this many techniques at `practiced`+. */
  unlockAtTechniques: number
}

export interface MotivationPrinciple {
  id: string
  name: string
  /** The research tradition this comes from, named honestly. */
  tradition: string
  summary: string
  /** What it actually claims — stated with appropriate hedging. */
  detail: string
  /** How it shows up in a Taekwondo hall or a leadership meeting. */
  inPractice: string
  /** The mistake it explains. */
  failureItExplains: string
  scenarioId: string
  /** What good use of the principle looks like in a transcript. */
  rubric: string[]
}

export interface Achievement {
  id: string
  name: string
  description: string
  /** Evaluated against Progress; see `lib/achievements.ts`. */
  test: AchievementTest
}

export type AchievementTest =
  | { kind: 'attempts'; min: number }
  | { kind: 'improvement'; minDelta: number }
  | { kind: 'cold-retrieval'; min: number }
  | { kind: 'category-attempts'; category: SkillCategory; min: number }
  | { kind: 'scenario-category'; category: ScenarioCategory; min: number }
  | { kind: 'mastery-stage'; stage: MasteryStage; min: number }
  | { kind: 'streak'; min: number }
  | { kind: 'level'; min: number }
  | { kind: 'gym-sessions'; min: number }

// ---------------------------------------------------------------- Mastery

/**
 * Six stages. The jump from `practiced` to `reliable` is the one that matters:
 * it cannot be reached by repeating today's lesson, only by retrieving the
 * technique cold, days later, without being told to.
 */
export type MasteryStage =
  | 'discovered'
  | 'learning'
  | 'practiced'
  | 'reliable'
  | 'integrated'
  | 'mastered'

export const MASTERY_STAGES: MasteryStage[] = [
  'discovered',
  'learning',
  'practiced',
  'reliable',
  'integrated',
  'mastered',
]

export const MASTERY_STAGE_NAMES: Record<MasteryStage, string> = {
  discovered: 'Discovered',
  learning: 'Learning',
  practiced: 'Practiced',
  reliable: 'Reliable',
  integrated: 'Integrated',
  mastered: 'Mastered',
}

// ---------------------------------------------------------------- Coaching

export interface DetectedTechnique {
  techniqueId: string
  /** 0–1. Never rounded up for effect. */
  confidence: number
  appropriateUse: boolean
  /** The words that triggered the detection, quoted from the transcript. */
  evidence?: string
  /**
   * How many of the technique's text markers were found, out of how many.
   * Present only for offline detection, where "confidence" is really marker
   * coverage — the app can see that the pattern is there, not that the learner
   * meant it. The UI states the count rather than dressing it up as certainty.
   */
  markersPresent?: number
  markersTotal?: number
}

export interface CoachEvaluation {
  targetTechniqueId: string | null
  /** 0–100 for how well the target technique was executed. */
  techniqueScore: number
  /** 0–100 for the response as a whole against the mission. */
  overallScore: number
  strengths: string[]
  improvements: string[]
  /** Quoted verbatim from the transcript. */
  strongestLine: string
  /** One imperative sentence for the immediate retry. */
  nextRepInstruction: string
  detectedTechniques: DetectedTechnique[]
  /** Non-empty when the response coached something the app should not. */
  safetyFlags: string[]
  /** True when this came from the offline evaluator rather than a model. */
  wasOffline: boolean
  /** Shown under the score so the learner knows what it is based on. */
  basis: string
}

export type CoachTask =
  | 'technique_attempt'
  | 'open_challenge'
  | 'technique_detection'
  | 'gym_feedback'

// ---------------------------------------------------------------- Progress

export interface PracticeAttempt {
  id: string
  /** Which lesson, field test, gym session or scenario produced it. */
  sourceKind: 'lesson' | 'field-test' | 'scenario' | 'gym' | 'motivation-lab'
  sourceId: string
  scenarioId: string
  techniqueId: string | null
  /** 1-based within a single sitting; a retry is attempt 2. */
  attemptNumber: number
  transcript: string
  /** Seconds. Measured when recorded, estimated when typed. */
  durationSeconds: number
  durationMeasured: boolean
  techniqueScore: number
  overallScore: number
  strongestLine: string
  createdAt: string
  wasOffline: boolean
}

export interface TechniqueMastery {
  techniqueId: string
  stage: MasteryStage
  /** 0–100. Derived, never edited directly. */
  score: number
  introducedAt: string
  lastPracticedAt?: string
  totalAttempts: number
  /** Attempts where the target score cleared the bar. */
  successfulUses: number
  /** Field Tests where this technique was used without being named. */
  coldRetrievals: number
  failedRetrievals: number
  /** Scenario ids it has been used in — breadth, not repetition. */
  contextsUsed: string[]
  /** Best line the learner has produced using it. */
  bestLine?: string
  bestScore: number
  nextReviewAt?: string
  reviewIntervalDays: number
  reviewEase: number
}

export interface GymSession {
  id: string
  need: string
  situation: string
  belief: string
  action: string
  recommendedTechniqueIds: string[]
  attempts: number
  bestScore: number
  createdAt: string
  helpUsed: boolean
}

export interface UserProfile {
  /** Chosen in onboarding. Drives which branches surface first. */
  goals: SkillBranch[]
  audiences: ScenarioAudience[]
  onboardedAt?: string
  /** Speak the coaching aloud is off by default; this is a training tool. */
  autoTranscribe: boolean
}

export interface StreakState {
  current: number
  best: number
  lastTrainedOn?: string
  /** Earned, not bought. One is granted per full week trained. */
  freezes: number
  lastFreezeGrantWeek?: string
}

export interface Progress {
  version: number
  profile: UserProfile
  xp: number
  streak: StreakState
  /** Keyed by technique id. */
  mastery: Record<string, TechniqueMastery>
  attempts: PracticeAttempt[]
  completedLessonIds: string[]
  completedFieldTestIds: string[]
  completedPrincipleIds: string[]
  gymSessions: GymSession[]
  unlockedAchievementIds: string[]
  /** Equipped technique ids by slot, for intermediate challenges. */
  loadout: Partial<Record<LoadoutSlot, string>>
  /** ISO date of the last day a lesson was completed, for the daily card. */
  lastLessonOn?: string
}

export type LoadoutSlot = 'opening' | 'logic' | 'emotion' | 'rhetoric' | 'closing'

export const LOADOUT_SLOTS: LoadoutSlot[] = ['opening', 'logic', 'emotion', 'rhetoric', 'closing']

export const LOADOUT_SLOT_NAMES: Record<LoadoutSlot, string> = {
  opening: 'Opening',
  logic: 'Logic',
  emotion: 'Emotion',
  rhetoric: 'Rhetoric',
  closing: 'Closing',
}
