import type { Scenario } from '@/lib/types'

/**
 * The scenario bank.
 *
 * Every one of these is a situation the learner actually walks into: a
 * Taekwondo hall, a leadership meeting, a corridor conversation with a parent,
 * a stage, a devotional. They are written in the second person and end with a
 * mission, so a scenario can be dropped into a lesson, a Field Test or the
 * Speech Gym without rewriting.
 *
 * Intensity 1–4 governs prep time, speaking time, and which challenges unlock.
 */
export const SCENARIOS: Scenario[] = [
  // ------------------------------------------------ Motivating a student
  {
    id: 'final-five-minutes',
    title: 'The last five minutes',
    category: 'child-motivation',
    audience: 'children',
    situation:
      'Class has twenty minutes left and one drill to go. The room has gone flat — shoulders down, half-speed kicks, three of them looking at the clock.',
    mission: 'Make the last five minutes feel like the part that counts.',
    prepSeconds: 30,
    speakSeconds: 60,
    intensity: 1,
  },
  {
    id: 'i-cant-do-it',
    title: '“I can\'t do it”',
    category: 'child-motivation',
    audience: 'children',
    situation:
      'A nine-year-old has stopped trying the jumping kick. She is standing at the back with her arms folded, saying she cannot do it and she is not going to.',
    mission: 'Get her to attempt it once more, without promising she will land it.',
    prepSeconds: 30,
    speakSeconds: 60,
    intensity: 2,
  },
  {
    id: 'wants-to-quit',
    title: 'The one who wants to quit',
    category: 'child-motivation',
    audience: 'children',
    situation:
      'An eleven-year-old tells you after class that he is going to stop coming. He has been training two years. He does not give a reason.',
    mission: 'Find out what is actually happening before you argue with the decision.',
    prepSeconds: 30,
    speakSeconds: 90,
    intensity: 3,
  },
  {
    id: 'failed-belt-test',
    title: 'She did not pass',
    category: 'child-motivation',
    audience: 'children',
    situation:
      'A ten-year-old has just been told she has not passed her grading. She is crying at the edge of the mat. Other students are packing up around her.',
    mission: 'Help her leave with the failure sized correctly — real, and not permanent.',
    prepSeconds: 30,
    speakSeconds: 90,
    intensity: 3,
  },
  {
    id: 'passed-but-poorly',
    title: 'Passed, but he knows',
    category: 'child-motivation',
    audience: 'children',
    situation:
      'A student passed his grading on the examiner’s generosity. He knows it. He is holding the certificate and not looking at it.',
    mission: 'Acknowledge what he knows without taking the pass away from him.',
    prepSeconds: 30,
    speakSeconds: 75,
    intensity: 3,
  },
  {
    id: 'not-trying',
    title: 'The one who has stopped trying',
    category: 'child-motivation',
    audience: 'teens',
    situation:
      'A fourteen-year-old has been coasting for a month. Technically present, effectively absent. Everyone can see it, including him.',
    mission: 'Address the effort without turning it into a character verdict.',
    prepSeconds: 25,
    speakSeconds: 75,
    intensity: 3,
  },
  {
    id: 'talented-undisciplined',
    title: 'Talented, undisciplined',
    category: 'child-motivation',
    audience: 'teens',
    situation:
      'Your most naturally gifted student is late again, has not practised, and still outperforms half the class. He is beginning to believe that is a strategy.',
    mission: 'Make the case for discipline to someone for whom talent has always been enough.',
    prepSeconds: 25,
    speakSeconds: 90,
    intensity: 3,
  },
  {
    id: 'comparing-himself',
    title: 'Always comparing',
    category: 'child-motivation',
    audience: 'children',
    situation:
      'A twelve-year-old measures every session against the student beside him, who started earlier and is visibly better. He has begun describing himself as the worst in the class.',
    mission: 'Give him a different thing to measure against.',
    prepSeconds: 30,
    speakSeconds: 75,
    intensity: 2,
  },
  {
    id: 'no-visible-progress',
    title: 'The plateau',
    category: 'child-motivation',
    audience: 'teens',
    situation:
      'A student has trained hard for four months and genuinely cannot see any improvement. She is not wrong that the last belt felt faster.',
    mission: 'Make invisible progress visible without inventing any.',
    prepSeconds: 30,
    speakSeconds: 90,
    intensity: 2,
  },
  {
    id: 'disruptive-student',
    title: 'The disruptive one',
    category: 'child-motivation',
    audience: 'children',
    situation:
      'An eight-year-old has interrupted the class three times in ten minutes. The others have started watching him instead of you.',
    mission: 'Reset the room and keep him in it.',
    prepSeconds: 20,
    speakSeconds: 45,
    intensity: 2,
  },
  {
    id: 'embarrassed-in-front',
    title: 'Embarrassed in front of everyone',
    category: 'child-motivation',
    audience: 'children',
    situation:
      'A student fell during a demonstration in front of the whole class. Somebody laughed. He has gone red and is staring at the floor.',
    mission: 'Restore his standing in the room in under thirty seconds.',
    prepSeconds: 15,
    speakSeconds: 45,
    intensity: 3,
  },
  {
    id: 'afraid-of-testing',
    title: 'Afraid of the test',
    category: 'child-motivation',
    audience: 'children',
    situation:
      'Grading is on Saturday. A normally confident student tells you quietly that she does not want to do it, and you can see she means it.',
    mission: 'Address the fear itself rather than arguing that she is ready.',
    prepSeconds: 30,
    speakSeconds: 75,
    intensity: 2,
  },

  // ------------------------------------------------ Leadership team
  {
    id: 'leaders-not-serious',
    title: 'The leadership team is coasting',
    category: 'leadership-team',
    audience: 'team',
    situation:
      'Your student leaders have been turning up late, standing in a group, and doing the minimum. They wanted the role. They are not doing the job.',
    mission: 'Raise the standard without making it a telling-off they can dismiss.',
    prepSeconds: 30,
    speakSeconds: 90,
    intensity: 3,
  },
  {
    id: 'young-leader-no-confidence',
    title: 'The leader who does not believe it',
    category: 'leadership-team',
    audience: 'teens',
    situation:
      'A sixteen-year-old you promoted last month is technically excellent and will not give a single instruction above a whisper. The younger students have noticed.',
    mission: 'Build the belief, not the volume.',
    prepSeconds: 30,
    speakSeconds: 75,
    intensity: 2,
  },
  {
    id: 'leader-made-mistake-publicly',
    title: 'A leader got it wrong in front of everyone',
    category: 'leadership-team',
    audience: 'team',
    situation:
      'One of your leaders gave a whole group the wrong instruction, loudly and confidently, and had to be corrected in front of them.',
    mission: 'Address it so she leads again tomorrow rather than retreating.',
    prepSeconds: 25,
    speakSeconds: 75,
    intensity: 3,
  },
  {
    id: 'authority-without-responsibility',
    title: 'They want the title',
    category: 'leadership-team',
    audience: 'teens',
    situation:
      'Two of your leaders enjoy the badge, the front position and telling people what to do. They are not doing the unglamorous parts — setting up, staying late, noticing the quiet ones.',
    mission: 'Redefine what the role actually is.',
    prepSeconds: 30,
    speakSeconds: 90,
    intensity: 3,
  },
  {
    id: 'team-gossip',
    title: 'It has become gossip',
    category: 'leadership-team',
    audience: 'team',
    situation:
      'Your leaders have started talking about the students — and each other — in the changing room. You have heard some of it.',
    mission: 'Stop it without a witch-hunt, and make the standard obvious.',
    prepSeconds: 30,
    speakSeconds: 90,
    intensity: 4,
  },
  {
    id: 'team-is-tired',
    title: 'The team is running on empty',
    category: 'leadership-team',
    audience: 'team',
    situation:
      'End of a long term. Your instructors have covered extra classes, a grading and a demo weekend. Nobody has complained, which is its own warning sign.',
    mission: 'Acknowledge the cost honestly and give them something to hold.',
    prepSeconds: 30,
    speakSeconds: 90,
    intensity: 2,
  },
  {
    id: 'team-underappreciated',
    title: 'They feel unseen',
    category: 'leadership-team',
    audience: 'team',
    situation:
      'You have realised your instructors have not been thanked specifically for anything in months. General praise has started landing as noise.',
    mission: 'Say something specific enough to be believed.',
    prepSeconds: 25,
    speakSeconds: 75,
    intensity: 1,
  },
  {
    id: 'team-needs-vision',
    title: 'Where this is going',
    category: 'leadership-team',
    audience: 'team',
    situation:
      'It is the start of a new year. Your team knows the schedule and does not know the point. Numbers are fine; direction is not.',
    mission: 'Give them a reason that is bigger than the timetable.',
    prepSeconds: 40,
    speakSeconds: 120,
    intensity: 3,
  },
  {
    id: 'correcting-a-leader',
    title: 'Correcting someone who outranks their age',
    category: 'leadership-team',
    audience: 'teens',
    situation:
      'A senior student spoke sharply to a seven-year-old in front of the class. He is a good leader having a bad night.',
    mission: 'Correct it clearly, privately, and without ending his authority.',
    prepSeconds: 25,
    speakSeconds: 75,
    intensity: 3,
  },
  {
    id: 'rally-instructors',
    title: 'The night before the grading',
    category: 'leadership-team',
    audience: 'team',
    situation:
      'Tomorrow is the biggest grading of the year. Forty students, a room full of parents, and an instructor team that has never run one this size.',
    mission: 'Set the tone for tomorrow in ninety seconds.',
    prepSeconds: 30,
    speakSeconds: 90,
    intensity: 3,
  },
  {
    id: 'praise-a-leader',
    title: 'Say the thing you noticed',
    category: 'leadership-team',
    audience: 'teens',
    situation:
      'One of your leaders spent ten minutes with a struggling white belt while everyone else packed up. Nobody asked her to. She has no idea you saw.',
    mission: 'Praise it in a way that makes it repeatable rather than embarrassing.',
    prepSeconds: 20,
    speakSeconds: 45,
    intensity: 1,
  },

  // ------------------------------------------------ Parents
  {
    id: 'parent-no-progress',
    title: '“He is not progressing”',
    category: 'parents',
    audience: 'parents',
    situation:
      'A father stops you after class. He has been paying for eight months and believes his son should be further along. He is not angry yet.',
    mission: 'Answer the real concern and keep the relationship.',
    prepSeconds: 30,
    speakSeconds: 90,
    intensity: 3,
  },
  {
    id: 'angry-parent',
    title: 'The angry parent',
    category: 'parents',
    audience: 'parents',
    situation:
      'A parent is upset that her daughter was not entered for the grading. She has raised her voice, and there are other parents within earshot.',
    mission: 'Lower the temperature and address the decision, in that order.',
    prepSeconds: 20,
    speakSeconds: 90,
    intensity: 4,
  },
  {
    id: 'parent-wants-to-withdraw',
    title: 'They are pulling him out',
    category: 'parents',
    audience: 'parents',
    situation:
      'A parent tells you her son is stopping at the end of the month. She says it is about time and money. You suspect it is about the fact he has not enjoyed it since he moved up a group.',
    mission: 'Understand the real reason before you make any case.',
    prepSeconds: 30,
    speakSeconds: 90,
    intensity: 3,
  },
  {
    id: 'parent-disagrees-correction',
    title: 'They think you were too hard on him',
    category: 'parents',
    audience: 'parents',
    situation:
      'You corrected a student firmly in class. His mother believes it was unfair and has told you so in front of him.',
    mission: 'Hold the standard while treating her concern as legitimate.',
    prepSeconds: 25,
    speakSeconds: 90,
    intensity: 4,
  },
  {
    id: 'parent-anxious-testing',
    title: 'The anxious parent',
    category: 'parents',
    audience: 'parents',
    situation:
      'A mother is more nervous about Saturday’s grading than her daughter is, and the daughter has started to notice.',
    mission: 'Settle the parent so she does not transfer it to the child.',
    prepSeconds: 25,
    speakSeconds: 75,
    intensity: 2,
  },
  {
    id: 'explain-why-struggle',
    title: 'Why you let him struggle',
    category: 'parents',
    audience: 'parents',
    situation:
      'A parent watched you let her son fail a technique six times without stepping in. She wants to know why you did not just help him.',
    mission: 'Explain the reasoning so it sounds like care rather than policy.',
    prepSeconds: 30,
    speakSeconds: 90,
    intensity: 2,
  },
  {
    id: 'set-expectations-newcomer',
    title: 'The first conversation',
    category: 'parents',
    audience: 'parents',
    situation:
      'A new family has just signed up. You have three minutes to set expectations that will save everyone six months of misunderstanding.',
    mission: 'Say the three things that matter most, once.',
    prepSeconds: 30,
    speakSeconds: 90,
    intensity: 1,
  },
  {
    id: 'deliver-disappointment',
    title: 'Telling them before the day',
    category: 'parents',
    audience: 'parents',
    situation:
      'You have decided a student is not ready to grade. You are telling the parent a week out rather than on the day.',
    mission: 'Deliver it clearly, kindly, and without leaving room for negotiation.',
    prepSeconds: 30,
    speakSeconds: 75,
    intensity: 3,
  },

  // ------------------------------------------------ Public speaking
  {
    id: 'open-a-keynote',
    title: 'The first fifteen seconds',
    category: 'public-speaking',
    audience: 'public',
    situation:
      'Two hundred people at a martial arts association evening. You have been introduced. The room is warm and half of them are still finding their seats.',
    mission: 'Earn the room’s attention before you say what the talk is about.',
    prepSeconds: 30,
    speakSeconds: 60,
    intensity: 3,
  },
  {
    id: 'close-a-keynote',
    title: 'The last thirty seconds',
    category: 'public-speaking',
    audience: 'public',
    situation:
      'You have made your case for twenty minutes. The room agrees with you. In half an hour most of them will have forgotten which part mattered.',
    mission: 'Leave them holding one thing and one action.',
    prepSeconds: 30,
    speakSeconds: 60,
    intensity: 3,
  },
  {
    id: 'personal-story-stage',
    title: 'The story you have told too often',
    category: 'public-speaking',
    audience: 'public',
    situation:
      'You are telling the story of your own black belt grading to an audience for the fifth time. It has gone smooth, and smooth has made it flat.',
    mission: 'Tell it as if it is happening, not as if you are reciting it.',
    prepSeconds: 30,
    speakSeconds: 120,
    intensity: 3,
  },
  {
    id: 'skeptical-audience',
    title: 'They are not sold',
    category: 'public-speaking',
    audience: 'adults',
    situation:
      'A room of secondary school teachers. You are proposing martial arts as part of their behaviour programme. Two of them have already folded their arms.',
    mission: 'Take their strongest objection seriously before making your case.',
    prepSeconds: 40,
    speakSeconds: 120,
    intensity: 4,
  },
  {
    id: 'explain-difficult-concept',
    title: 'Make the boring part matter',
    category: 'public-speaking',
    audience: 'adults',
    situation:
      'You have to explain the grading syllabus — genuinely dry, genuinely necessary — to a room of new parents who did not come for this.',
    mission: 'Make them care about the structure before you describe it.',
    prepSeconds: 30,
    speakSeconds: 90,
    intensity: 2,
  },
  {
    id: 'hostile-question',
    title: 'The question you did not want',
    category: 'public-speaking',
    audience: 'public',
    situation:
      'End of your talk. Someone asks, in front of everyone, whether martial arts just teaches children to be violent. They are not joking.',
    mission: 'Answer directly, without defensiveness and without dismissing them.',
    prepSeconds: 15,
    speakSeconds: 75,
    intensity: 4,
  },
  {
    id: 'no-preparation',
    title: 'You are on in ten seconds',
    category: 'public-speaking',
    audience: 'public',
    situation:
      'The scheduled speaker has not arrived. You are asked to fill five minutes, starting now, on anything you like.',
    mission: 'Say one true thing well rather than three things badly.',
    prepSeconds: 10,
    speakSeconds: 90,
    intensity: 4,
  },
  {
    id: 'inspire-discouraged-room',
    title: 'A room that has stopped believing',
    category: 'public-speaking',
    audience: 'adults',
    situation:
      'A club that has lost half its members and its lease. They have asked you to speak. Optimism will be heard as insult.',
    mission: 'Say something true that is also worth standing up for.',
    prepSeconds: 40,
    speakSeconds: 120,
    intensity: 4,
  },
  {
    id: 'award-presentation',
    title: 'Handing over the award',
    category: 'public-speaking',
    audience: 'public',
    situation:
      'You are presenting student of the year. Everyone expects generic praise. The recipient has done something genuinely unusual this year.',
    mission: 'Make the room understand exactly why it is her.',
    prepSeconds: 25,
    speakSeconds: 75,
    intensity: 2,
  },

  // ------------------------------------------------ Devotional
  {
    id: 'short-devotional',
    title: 'Three minutes before training',
    category: 'faith',
    audience: 'church',
    situation:
      'You have been asked to give a short devotional before a youth session. Mixed group, mixed levels of interest, some there because a parent said so.',
    mission: 'Say one idea in a way that survives the walk to the mat.',
    prepSeconds: 40,
    speakSeconds: 120,
    intensity: 2,
  },
  {
    id: 'explain-grace',
    title: 'Explaining grace to teenagers',
    category: 'faith',
    audience: 'teens',
    situation:
      'A group of fifteen-year-olds who have heard the word a hundred times and could not define it if you asked.',
    mission: 'Make an abstract idea land with something concrete from their week.',
    prepSeconds: 40,
    speakSeconds: 120,
    intensity: 3,
  },
  {
    id: 'explain-suffering',
    title: 'The question about suffering',
    category: 'faith',
    audience: 'adults',
    situation:
      'Someone in the group has just lost a parent and asks, in front of everyone, why any of this would be allowed to happen.',
    mission: 'Respond honestly without reaching for a tidy answer.',
    prepSeconds: 30,
    speakSeconds: 120,
    intensity: 4,
  },
  {
    id: 'scripture-to-daily-life',
    title: 'From the page to Tuesday',
    category: 'faith',
    audience: 'church',
    situation:
      'You have explained a passage well and accurately. Every face says “understood, and unchanged”.',
    mission: 'Connect it to something that happens in their actual week.',
    prepSeconds: 40,
    speakSeconds: 120,
    intensity: 3,
  },
  {
    id: 'abstract-theology-simply',
    title: 'The idea nobody can hold',
    category: 'faith',
    audience: 'church',
    situation:
      'You need to explain an abstract concept to a room that includes eight-year-olds and their grandparents.',
    mission: 'Find one comparison that works for both ends of the room.',
    prepSeconds: 40,
    speakSeconds: 120,
    intensity: 3,
  },
  {
    id: 'challenge-complacency',
    title: 'Challenge without contempt',
    category: 'faith',
    audience: 'church',
    situation:
      'A comfortable group who have been doing the same things for years and are quietly pleased with themselves. You are one of them.',
    mission: 'Name the gap in a way that includes you in it.',
    prepSeconds: 40,
    speakSeconds: 120,
    intensity: 4,
  },
  {
    id: 'encourage-after-loss',
    title: 'The week after',
    category: 'faith',
    audience: 'church',
    situation:
      'The group is meeting for the first time since something went badly wrong for one of them. Everyone knows. Nobody has said it.',
    mission: 'Say it out loud, briefly, and then say what you are going to do about it.',
    prepSeconds: 30,
    speakSeconds: 90,
    intensity: 4,
  },
]

export const SCENARIO_BY_ID = new Map(SCENARIOS.map((scenario) => [scenario.id, scenario]))

export function scenario(id: string | undefined): Scenario | undefined {
  return id ? SCENARIO_BY_ID.get(id) : undefined
}

/** Scenarios matching the audiences chosen in onboarding, hardest last. */
export function scenariosFor(audiences: string[], maxIntensity = 4): Scenario[] {
  const wanted = new Set(audiences)
  const pool = SCENARIOS.filter((entry) => entry.intensity <= maxIntensity)
  const preferred = pool.filter((entry) => wanted.has(entry.audience))
  return (preferred.length >= 5 ? preferred : pool).sort((a, b) => a.intensity - b.intensity)
}
