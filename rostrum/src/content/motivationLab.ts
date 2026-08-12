import type { MotivationPrinciple } from '@/lib/types'

/**
 * Motivation Lab.
 *
 * The other half of the curriculum: not how to say it, but why people act.
 *
 * These are summaries of research traditions, and they are written with the
 * hedging the evidence actually warrants. Where a finding is contested or has
 * replicated poorly, the entry says so — a communication app that oversells
 * psychology teaches its user to make confident claims that will eventually
 * embarrass them in front of a parent who has read more than they have.
 */
export const PRINCIPLES: MotivationPrinciple[] = [
  {
    id: 'autonomy',
    name: 'Autonomy',
    tradition: 'Self-determination theory (Deci & Ryan)',
    summary: 'People sustain effort better when the action feels chosen rather than imposed.',
    detail:
      'Self-determination theory proposes autonomy as one of three basic psychological needs. The evidence is strongest for the claim that controlling language (“you have to”, “you must”) reduces sustained engagement relative to language that preserves a sense of choice — not that structure or authority are themselves harmful. Instructors often hear this as “do not give instructions”, which is the opposite of the finding.',
    inPractice:
      'Offer a genuine choice inside the requirement. Not “do you want to train tonight” — the training is not optional — but “do you want to fix the timing or the stance first”.',
    failureItExplains:
      'The student who complies all term and quits in the holidays. Compliance was never engagement; it just looked like it while you were standing there.',
    scenarioId: 'not-trying',
    rubric: [
      'Preserved a real choice rather than a fake one',
      'Kept the non-negotiable non-negotiable',
      'Avoided controlling phrasing (“you have to”, “you need to”)',
      'Gave a reason rather than an assertion of authority',
    ],
  },
  {
    id: 'competence',
    name: 'Competence',
    tradition: 'Self-determination theory',
    summary: 'People move toward activities where they can feel themselves getting better.',
    detail:
      'The need is not for being good at something but for detectable improvement. This is why plateaus are so dangerous: the underlying skill may still be developing while the felt sense of progress has stopped, and the felt sense is what drives the behaviour.',
    inPractice:
      'Name improvements the student cannot see yet. Be specific enough that they can verify it — “your guard did not drop once in that round, it dropped four times last week”.',
    failureItExplains:
      'The four-month student who says nothing is happening. They are not being dramatic; the signal genuinely has gone quiet.',
    scenarioId: 'no-visible-progress',
    rubric: [
      'Pointed at a specific, checkable improvement',
      'Did not invent progress that has not happened',
      'Explained why progress became harder to see',
      'Gave a way to notice it themselves next week',
    ],
  },
  {
    id: 'relatedness',
    name: 'Relatedness',
    tradition: 'Self-determination theory',
    summary: 'People persist in places where they are known.',
    detail:
      'Relatedness is the least-discussed of the three needs and probably the most decisive in youth sport. Attrition tends to follow social disconnection more closely than it follows difficulty — students rarely leave because training got hard; they leave because nobody noticed they were there.',
    inPractice:
      'Use names. Reference something from a previous week. Notice absence out loud when they return.',
    failureItExplains:
      'The quiet, capable student who disappears without warning and whose parents say they “just went off it”.',
    scenarioId: 'wants-to-quit',
    rubric: [
      'Referenced something specific about this person',
      'Made their presence matter to the group, not just to you',
      'Avoided generic warmth that could be said to anyone',
    ],
  },
  {
    id: 'intrinsic-extrinsic',
    name: 'Intrinsic and extrinsic motivation',
    tradition: 'Self-determination theory; overjustification research',
    summary: 'Rewards for something already enjoyed can reduce the enjoyment.',
    detail:
      'The overjustification effect is reasonably well supported for *expected, tangible* rewards given for activity the person already found interesting. It does not show that all praise or all rewards are harmful — unexpected rewards and informational feedback generally do not produce the effect. Belt systems are extrinsic by design, which is fine; the risk is when the belt becomes the only reason left.',
    inPractice:
      'Attach praise to the thing itself rather than to the reward: talk about what the technique felt like, not only about what it earns.',
    failureItExplains:
      'The student who grades, gets the belt, and stops coming — the reward arrived and there was nothing underneath it.',
    scenarioId: 'passed-but-poorly',
    rubric: [
      'Praised the activity rather than only the outcome',
      'Did not dangle a further reward as the main reason to continue',
      'Named something intrinsically interesting about the work',
    ],
  },
  {
    id: 'self-efficacy',
    name: 'Self-efficacy',
    tradition: 'Bandura',
    summary: 'Belief that you can do this specific thing predicts whether you attempt it.',
    detail:
      'Self-efficacy is domain-specific — someone can have high efficacy for patterns and near-zero for sparring. Bandura identified mastery experience as the strongest source, well ahead of verbal persuasion. Which means telling someone they can do it is the weakest tool available, and arranging a small success is the strongest.',
    inPractice:
      'Do not argue with “I can\'t”. Shrink the task until it is attemptable, let them do it, then name what just happened.',
    failureItExplains:
      'Why encouragement bounces off. You are using the weakest lever on someone who has direct evidence against you.',
    scenarioId: 'i-cant-do-it',
    rubric: [
      'Reduced the task rather than raising the encouragement',
      'Created an attemptable version',
      'Named the success afterwards as evidence',
      'Avoided empty reassurance',
    ],
  },
  {
    id: 'identity',
    name: 'Identity',
    tradition: 'Self-concept and behaviour-change research',
    summary: 'People act in line with who they believe they are.',
    detail:
      'Behaviour attributed to identity tends to persist better than behaviour attributed to effort or circumstance, though most of this literature is correlational and the effect sizes in field settings are modest. Treat it as a useful frame rather than a lever that reliably works.',
    inPractice:
      'Describe the person as someone who already does the thing, when it is true: “you are one of the people who finishes”, not “you should finish”.',
    failureItExplains:
      'Why “I am just not a sporty person” is so much harder to shift than any specific skill deficit.',
    scenarioId: 'comparing-himself',
    rubric: [
      'Named an identity supported by actual evidence',
      'Did not assign a flattering identity the person has not earned',
      'Connected the identity to a specific behaviour',
    ],
  },
  {
    id: 'goal-specificity',
    name: 'Goal specificity',
    tradition: 'Goal-setting theory (Locke & Latham)',
    summary: 'Specific, difficult goals outperform “do your best”.',
    detail:
      'One of the more robust findings in organisational psychology, with the important caveat that it holds for tasks where the person already has the necessary skill. On a genuinely novel task, a hard outcome goal can hurt — a learning goal (“find three ways to do this”) tends to work better.',
    inPractice:
      'For a known skill, set a number. For an unfamiliar one, set an exploration.',
    failureItExplains:
      'Why “try your hardest at the grading” produces less than “hold the stance for the full count”.',
    scenarioId: 'afraid-of-testing',
    rubric: [
      'Set something specific and checkable',
      'Matched goal type to whether the skill is known or new',
      'Avoided “do your best”',
    ],
  },
  {
    id: 'implementation-intentions',
    name: 'Implementation intentions',
    tradition: 'Gollwitzer',
    summary: 'If–then plans close the gap between intending and doing.',
    detail:
      'Specifying when, where and how — “if it is Tuesday at seven, then I am on the mat” — reliably improves follow-through relative to goal intentions alone. The effect is well replicated, though most studies are on health behaviours and the sizes are moderate.',
    inPractice: 'Never end with “practise this week”. End with the if and the then.',
    failureItExplains:
      'The sincere student who genuinely meant to practise and genuinely did not.',
    scenarioId: 'close-a-keynote',
    rubric: [
      'Specified a trigger — a time, a place or an event',
      'Specified the action attached to it',
      'Kept it to a single if–then',
    ],
  },
  {
    id: 'informational-feedback',
    name: 'Informational feedback',
    tradition: 'Feedback intervention research (Kluger & DeNisi)',
    summary: 'Feedback about the task helps; feedback about the person often does not.',
    detail:
      'A large meta-analysis found feedback interventions improved performance on average but made it *worse* in over a third of cases — and the harmful cases clustered where attention was drawn to the self rather than the task. This is one of the strongest practical findings in the whole area and it is routinely ignored.',
    inPractice:
      'Say what the technique did, not what the person is. “The guard dropped” rather than “you are careless”.',
    failureItExplains:
      'Why some students get visibly worse after being corrected in front of the class.',
    scenarioId: 'disruptive-student',
    rubric: [
      'Kept attention on the task, not the person',
      'Described what happened observably',
      'Gave the next attempt something to aim at',
    ],
  },
  {
    id: 'perceived-progress',
    name: 'Perceived progress',
    tradition: 'Progress principle (Amabile & Kramer)',
    summary: 'Small visible wins predict day-to-day motivation better than big distant ones.',
    detail:
      'Diary research in workplaces found that the single strongest predictor of a good working day was making progress on meaningful work — and that the size of the progress mattered far less than its visibility. The research is on knowledge workers, so transfer to a training hall is plausible rather than established.',
    inPractice:
      'Make the small wins legible. A wall chart, a named improvement each week, a “you can now do X” moment.',
    failureItExplains:
      'Why long belt cycles are demotivating even when training is going well.',
    scenarioId: 'team-is-tired',
    rubric: [
      'Made a specific recent gain visible',
      'Sized it honestly rather than inflating it',
      'Connected it to the longer arc',
    ],
  },
  {
    id: 'belonging-uncertainty',
    name: 'Belonging uncertainty',
    tradition: 'Walton & Cohen',
    summary: 'People wondering whether they belong read ordinary setbacks as proof they do not.',
    detail:
      'The finding is that a brief message normalising early difficulty — “everyone finds the first months hard, it passes” — can improve persistence, particularly for people who have reason to doubt they fit. Some of this literature has attracted replication scrutiny, and effects appear largest for those already at risk rather than for everyone.',
    inPractice:
      'Normalise the struggle explicitly and attribute it to the stage, not the person.',
    failureItExplains:
      'Why the new student who is visibly behind quits before the point where it gets easier.',
    scenarioId: 'embarrassed-in-front',
    rubric: [
      'Normalised the difficulty as common and temporary',
      'Attributed it to the stage rather than the person',
      'Avoided singling them out as a special case',
    ],
  },
  {
    id: 'psychological-safety',
    name: 'Psychological safety',
    tradition: 'Edmondson',
    summary: 'Teams perform better when it is safe to be wrong out loud.',
    detail:
      'Originally studied in hospital teams, where the safest units reported *more* errors — because they reported them at all. Safety is not comfort or the absence of standards; the research consistently pairs it with high accountability, and it does nothing on its own.',
    inPractice:
      'Respond to a leader admitting a mistake in a way the rest of the team will remember. That reaction is the policy.',
    failureItExplains:
      'The instructor team where nothing ever goes wrong until something goes badly wrong.',
    scenarioId: 'leader-made-mistake-publicly',
    rubric: [
      'Made the admission safe without lowering the standard',
      'Responded to the disclosure before the error',
      'Kept the person’s authority intact',
    ],
  },
  {
    id: 'change-talk',
    name: 'Evoking change talk',
    tradition: 'Motivational interviewing (Miller & Rollnick)',
    summary: 'People are persuaded more by what they hear themselves say than by what you say.',
    detail:
      'Motivational interviewing has good evidence in health behaviour change. Its central mechanism — arguing for change tends to produce counter-argument, so the practitioner should evoke the person’s own reasons instead — is directly transferable to any conversation with a resistant teenager.',
    inPractice:
      'Ask what they would miss if they stopped. Then be quiet. Do not supply the answer.',
    failureItExplains:
      'Why the more compelling your case for staying, the more firmly they decide to leave.',
    scenarioId: 'wants-to-quit',
    rubric: [
      'Asked rather than argued',
      'Left silence for the answer',
      'Did not supply the reasons on their behalf',
      'Reflected back what they actually said',
    ],
  },
  {
    id: 'reflective-listening',
    name: 'Reflective listening',
    tradition: 'Rogers; motivational interviewing',
    summary: 'Say it back before you respond to it.',
    detail:
      'Reflection serves two functions: it checks comprehension, and it demonstrates it. The second is usually the point. A person who has been accurately reflected reliably de-escalates, and a person who has not will restate their position with increasing volume until they believe they have been heard.',
    inPractice:
      'Before answering an angry parent, say their concern back in your own words and let them confirm it.',
    failureItExplains:
      'The conversation where you answered the question perfectly and they got angrier.',
    scenarioId: 'angry-parent',
    rubric: [
      'Reflected the concern before responding to it',
      'Used their meaning, not just their words',
      'Checked the reflection was right',
      'Waited for confirmation before moving on',
    ],
  },
  {
    id: 'emotional-validation',
    name: 'Emotional validation',
    tradition: 'Linehan; emotion-regulation research',
    summary: 'Agreeing that a feeling makes sense is not agreeing with the conclusion.',
    detail:
      'Validation targets the reasonableness of the emotion given the person’s perception, not the accuracy of their beliefs. This distinction is what makes it usable when you disagree — and confusing the two is why many people avoid validating at all, fearing they are conceding the argument.',
    inPractice:
      '“Of course you are angry — from where you were sitting it looked like I ignored her.” Then disagree, if you need to.',
    failureItExplains:
      'Why “calm down and let me explain” has never once worked.',
    scenarioId: 'parent-disagrees-correction',
    rubric: [
      'Validated the feeling as reasonable given their view',
      'Did not concede a factual point in order to do it',
      'Validated before explaining',
    ],
  },
  {
    id: 'specific-reinforcement',
    name: 'Specific reinforcement',
    tradition: 'Behaviour analysis',
    summary: 'Praise the behaviour, immediately, and say exactly which one.',
    detail:
      'Reinforcement strengthens what it follows, so timing and specificity determine what actually gets strengthened. “Good job” delivered ten minutes later reinforces whatever the person happened to be doing at the time — most often, nothing.',
    inPractice:
      'Name the behaviour in the moment: “that — the way you reset your stance without being told”.',
    failureItExplains:
      'Why generous but vague praise produces no change in behaviour at all.',
    scenarioId: 'praise-a-leader',
    rubric: [
      'Named the specific behaviour',
      'Delivered it close to the event',
      'Made it repeatable rather than flattering',
    ],
  },
  {
    id: 'mindset-caveat',
    name: 'Beliefs about ability',
    tradition: 'Mindset research (Dweck) — contested',
    summary: 'How someone explains a failure may affect what they do next. Claim this cautiously.',
    detail:
      'The popular version — praise effort, not talent — outran the evidence. Large replications and meta-analyses have found effects that are small on average and concentrated among lower-achieving or at-risk students, and several high-profile studies have not replicated. What survives is modest and worth knowing: attributing a setback to something changeable leaves more room to act than attributing it to something fixed. Do not tell a parent that mindset determines outcomes.',
    inPractice:
      'Attribute setbacks to specific changeable causes because it is usually *true* and gives a next step — not because it rewires anyone’s brain.',
    failureItExplains:
      'Both the student who concludes they are talentless, and the instructor who thinks saying “yet” will fix it.',
    scenarioId: 'failed-belt-test',
    rubric: [
      'Attributed the setback to something specific and changeable',
      'Stayed accurate — did not reattribute a real skill gap away',
      'Gave the next action',
      'Avoided overclaiming what a change of framing can do',
    ],
  },
]

export const PRINCIPLE_BY_ID = new Map(PRINCIPLES.map((principle) => [principle.id, principle]))

export function principle(id: string | undefined): MotivationPrinciple | undefined {
  return id ? PRINCIPLE_BY_ID.get(id) : undefined
}
