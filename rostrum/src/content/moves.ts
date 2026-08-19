import type { Move } from '@/lib/types'

/**
 * The curriculum.
 *
 * What used to be here was thirty-six named techniques in arbitrary order — it
 * taught how to close seven lessons before it taught how to open. You could
 * shuffle it and lose nothing, which is the definition of a list rather than a
 * course. Every entry also carried a label invented for this app, so a learner
 * had to memorise private vocabulary on top of the actual skill.
 *
 * These six are what those thirty-six are made of. Each name is a word already
 * in use pointing at something you can watch a person do, and each one is deep
 * enough to work on for months.
 *
 * A rung is never a new thing to learn. It is the same move under a harder
 * condition, so the ladder can be climbed for weeks without adding a single
 * word of vocabulary. Every example is written for this app.
 */
export const MOVES: Move[] = [
  {
    id: 'contrast',
    name: 'Contrast',
    what: 'Put two things next to each other and let the gap do the arguing.',
    why: 'A standard on its own is easy to nod at and forget. Put it beside what is actually happening and it stops being an opinion and becomes a measurement — one the listener takes themselves, which is far harder to argue with than being told.',
    spot: 'Two halves, and a gap between them you did not have to name.',
    techniqueIds: [
      'moral-contrast', 'hopeful-close', 'dignity-guard', 'reframing',
      'uncomfortable-contrast', 'the-turn', 'redefine-the-premise',
      'possibility-frame', 'resolve-without-denial',
    ],
    rungs: [
      {
        move: 'Say two things that do not match.',
        harder: 'Nothing yet. This is the move at its simplest, and most people never do it at all — they say the standard and stop.',
        example: 'Right now we’re finishing at half speed. A black belt finishes at full speed.',
        drill: 'Pick anything slipping in your class. Say what’s happening, then say what it should be. Two sentences, nothing else.',
      },
      {
        move: 'Take the blame out of the first half.',
        harder: 'Describing the present without accusing anybody is much harder than it sounds, and the accusation is exactly what makes people defend instead of listen.',
        example: 'Right now the last five minutes look like everybody’s already in the car.',
        drill: 'Say your first half again with no “you”, no “always”, no “never”. Describe the room, not the people.',
      },
      {
        move: 'Make the second half something they could watch someone do.',
        harder: 'Standards come out as adjectives — disciplined, focused, respectful. Nobody can copy an adjective.',
        example: 'A black belt finishes the last rep at the same speed as the first one.',
        drill: 'Replace your standard with something a camera could record. If it can’t be filmed, it’s still an adjective.',
      },
      {
        move: 'Name the gap out loud, and make it small.',
        harder: 'The gap is the whole point of the move and almost nobody says it. Said small, it turns into something they could close tonight instead of a verdict on who they are.',
        example: 'You’re not missing talent. You’re missing five minutes.',
        drill: 'Add two lines to what you already have: what they are not missing, then what they are.',
      },
      {
        move: 'Make the second half the thing you want them to do.',
        harder: 'Now the contrast has to carry the ask as well, without collapsing into an instruction. If it sounds like an order, the gap stopped doing the work.',
        example: 'Most people put the mats away when someone asks them to. The person I’m handing a black belt to is already carrying one.',
        drill: 'Build a contrast where the second half is exactly the behaviour you want tonight — and never say the word “should”.',
      },
    ],
  },
  {
    id: 'repetition',
    name: 'Repetition',
    what: 'Say it again on purpose.',
    why: 'Once a shape repeats, the listener stops decoding grammar and all their attention lands on the one thing that changed. The repeating part is not emphasis — it is a frame that makes the change measurable.',
    spot: 'The same words, more than twice, and you meant it.',
    techniqueIds: ['rising-refrain', 'accumulating-list', 'rhythm-of-three', 'repeat-the-anchor'],
    rungs: [
      {
        move: 'Say the same sentence shape twice.',
        harder: 'Nothing yet — except the nerve to do it. Saying something twice feels like a mistake while you are doing it.',
        example: 'Everybody’s got form in the first minute. Everybody’s got form when I’m watching.',
        drill: 'Two sentences that start with the same three words. Change only the end.',
      },
      {
        move: 'Keep the opening identical, word for word.',
        harder: 'Every instinct says vary it so you don’t sound repetitive. Varying it is what destroys the effect — the sameness is the instrument.',
        example: 'Everybody’s got form in the first minute. Everybody’s got form when I’m watching. Everybody’s got form when they’re fresh.',
        drill: 'Say three. Do not change a single word of the opening, even when it feels wrong.',
      },
      {
        move: 'Make each one harder than the one before.',
        harder: 'Now the fixed frame has to carry a climb. Get the order wrong and the run goes flat halfway through.',
        example: 'Everybody’s got form in the first minute. Everybody’s got form when I’m watching. Everybody’s got form when nothing hurts yet.',
        drill: 'Order your three from easiest to hardest. Say them again. Listen for where it stops climbing.',
      },
      {
        move: 'Break the pattern on the line that matters.',
        harder: 'The break is the payload, and it only lands if you held the pattern long enough to be believed. Break too early and nothing happened.',
        example: 'Show me minute nine, when I’m across the room and you’re tired.',
        drill: 'Add a fourth line that does not match the other three. Say the whole thing. That fourth line is the only one they’ll repeat.',
      },
      {
        move: 'Repeat one line across a whole session, not one paragraph.',
        harder: 'Now the gaps are minutes instead of seconds, and you have to resist explaining it the second time.',
        example: 'Last five minutes. — (forty minutes later) — Last five minutes. — (at the door) — That was the last five minutes.',
        drill: 'Pick one line. Say it at the start, in the middle, and at the end of tonight’s class. Word for word, no explanation.',
      },
    ],
  },
  {
    id: 'specificity',
    name: 'Specificity',
    what: 'The exact thing instead of the general thing.',
    why: 'General words are filed as definitions and forgotten. A specific one is filed as a picture. It also survives retelling, which is how anything you said travels to people who were not in the room.',
    spot: 'Something in the sentence could be photographed, counted, or pointed at.',
    techniqueIds: [
      'concrete-image', 'specific-call-to-action', 'plain-words',
      'name-the-feeling', 'direct-address', 'analogy-bridge',
    ],
    rungs: [
      {
        move: 'Swap one abstract word for something you could photograph.',
        harder: 'Spotting the abstract word is the hard part. They feel like content while you are saying them.',
        example: 'Respect is your shoes turned to face the door when you take them off.',
        drill: 'Catch yourself saying a word ending in -ity, -ness or -ment. Say the picture instead.',
      },
      {
        move: 'Put a number or a time in it.',
        harder: 'A number is checkable, which means you have to actually know it. Vagueness is usually hiding that you don’t.',
        example: 'You’re missing five minutes. Not the whole class — the last five.',
        drill: 'Take your line and add one number or one time. If you can’t, you don’t know the thing well enough yet.',
      },
      {
        move: 'Name the person or the moment, not the category.',
        harder: 'Naming somebody is a risk, and generalising is the safe move that costs you the whole effect.',
        example: 'Maya came back on the Tuesday and asked me what she got wrong.',
        drill: 'Replace “some students” or “you guys” with one person and one day.',
      },
      {
        move: 'Get the feeling word exactly right.',
        harder: 'Most feeling words are approximations, and the approximate one tells the person you don’t actually see them.',
        example: 'You’re not upset. You’re embarrassed, because it happened in front of the people you care about.',
        drill: 'Say the obvious word. Then find the more precise one underneath it and say that instead.',
      },
      {
        move: 'Make the ask specific enough that they can picture doing it.',
        harder: 'This is where specificity has to survive contact with a real instruction, and where every vague ending gets exposed.',
        example: 'Before you put your shoes on, go to the corner and do that turn five times.',
        drill: 'One action, one place, one time. If they can’t see themselves doing it, it isn’t specific yet.',
      },
    ],
  },
  {
    id: 'order',
    name: 'Order',
    what: 'Which half you say first.',
    why: 'The same words in a different order do a different thing. This is the cheapest move there is — you already have the content, you are only moving it — and it is the one most people never touch.',
    spot: 'You said the thing they were not expecting first.',
    techniqueIds: [
      'start-with-why', 'name-the-hard-thing', 'story-then-lesson',
      'anticipate-objection', 'answer-the-question-asked', 'reveal-structure',
      'intellect-to-heart', 'shared-ground',
    ],
    rungs: [
      {
        move: 'Reason before instruction.',
        harder: 'Nothing new to write. You just have to catch yourself, because the instruction always wants to come out first.',
        example: 'We bow at the door because it tells your body the next hour’s different. So: bow at the door.',
        drill: 'Take an instruction you gave this week. Say the reason first, then the instruction. Same words.',
      },
      {
        move: 'Cost before the ask.',
        harder: 'You have to say the bad part with nothing softening it, before you have earned anything. That is uncomfortable and it is the entire point.',
        example: 'Saturday’s longer, the hall’s hot, and you’ll spar tired. I’m asking you to do it anyway.',
        drill: 'Name three costs flatly. Then ask. Do not put a “but” anywhere in it.',
      },
      {
        move: 'Story before the meaning.',
        harder: 'Holding the point back feels like you are not communicating. Every instinct is to say what it’s about first.',
        example: 'Maya failed her first grading. She came back Tuesday. She tested for black belt last month.',
        drill: 'Tell it all the way through with no preamble. Say what it means only after you’ve stopped.',
      },
      {
        move: 'Their argument before yours.',
        harder: 'You have to put their side better than they would, which means genuinely understanding it — and it feels like arguing against yourself.',
        example: 'You think patterns are pointless because nobody fights like that. You’re right. Nobody fights like that.',
        drill: 'Say their objection out loud, stronger than they’d say it. Then answer that version, not the easy one.',
      },
      {
        move: 'The answer before the explanation.',
        harder: 'Leading with a hard answer removes the cushion you were going to hide it in.',
        example: 'No. You’re not ready for March. Here’s exactly what would change that.',
        drill: 'Answer a real question in one word. Then explain. Notice how much shorter the explanation gets.',
      },
    ],
  },
  {
    id: 'silence',
    name: 'Silence',
    what: 'Where you stop.',
    why: 'Sound fills the space a listener needs to do their own thinking. Stopping hands the moment back to them, and it is the only move that costs no words at all — which is why it is the hardest one to actually do.',
    spot: 'You finished and did not add anything.',
    techniqueIds: ['silence-beat', 'weight-of-brevity', 'provocative-question', 'one-idea-per-beat'],
    rungs: [
      {
        move: 'Stop at the end instead of adding encouragement.',
        harder: 'The urge to soften the ending is almost physical, and the softening is what erases everything you just said.',
        example: 'In six weeks that pattern is the one you’ll warm up with. — (nothing)',
        drill: 'Say your last line. Then close your mouth. Count to three before you move.',
      },
      {
        move: 'One second before the line that matters.',
        harder: 'A second is much longer from the front of a room than it is in your head.',
        example: 'Everybody in here has one thing they avoid practising. — (one second) — Mine was left kicks. Six years.',
        drill: 'Put one full second in front of your best line tonight. It will feel like five.',
      },
      {
        move: 'Ask a real question and wait through the discomfort.',
        harder: 'You are now holding a silence that belongs to somebody else, and rescuing them is the instinct you have to beat.',
        example: 'Who in here trains the same when I’m not watching? — (wait)',
        drill: 'Ask one question that costs something to answer. Count to five. Do not fill it.',
      },
      {
        move: 'One idea per breath. Full stop, then next.',
        harder: 'Subordinate clauses are where the second idea hides. Cutting them means saying less than you know.',
        example: 'Your stance is too narrow. That’s why you fall on the turn. Widen it a fist. Go again.',
        drill: 'Take a correction you give often. Break it into four sentences with nothing joining them.',
      },
      {
        move: 'Say less than the moment invites.',
        harder: 'Big moments pull for big speeches, and declining that pull takes more nerve than filling it.',
        example: 'You’ve trained four years for the next ten minutes. Bow.',
        drill: 'Take the biggest moment coming up. Cut what you were going to say by half. Then half again.',
      },
    ],
  },
  {
    id: 'story',
    name: 'Story',
    what: 'One person, one moment.',
    why: 'A general claim invites a debate. A specific person doing a specific thing does not — the listener runs it rather than checking it, and arrives at your point believing they got there on their own.',
    spot: 'Somebody in it has a name, and something happens at a particular time.',
    techniqueIds: [
      'story-hook', 'earned-vulnerability', 'think-out-loud',
      'conversational-conviction', 'belonging-frame',
    ],
    rungs: [
      {
        move: 'One person, one moment. No summary.',
        harder: 'The pull is to describe a pattern — “some students find that” — because a pattern is safer and proves more. It also lands on nobody.',
        example: 'Maya failed her first grading.',
        drill: 'Tell something that happened to one person on one day. Four sentences, no lesson attached.',
      },
      {
        move: 'Start inside the moment, not at the background.',
        harder: 'Everything you cut feels necessary while you are cutting it. Almost none of it is.',
        example: 'Her hands were shaking so bad she couldn’t tie the knot.',
        drill: 'Find the most vivid second in your story. Start there. Backfill only what they need to follow it.',
      },
      {
        move: 'Pick the small detail as the point, not the ending.',
        harder: 'The ending is the impressive part, which is exactly why it teaches nothing. The Tuesday is the lesson; the black belt is just the receipt.',
        example: 'I’m not telling you that so you feel better. I’m telling you because of the Tuesday.',
        drill: 'Name the smallest detail in your story. Make that the thing it was about.',
      },
      {
        move: 'Tell one that cost you something, and tell it for them.',
        harder: 'The line between useful and self-indulgent is whether it is already resolved, and whether the person listening needs it. Get that wrong and the room looks after you instead.',
        example: 'I failed my second-dan grading. I know what that drive home is. Two of you are about to find out, and it’s shorter than it feels.',
        drill: 'Tell something that went badly for you and is finished. Say who in the room it’s for.',
      },
      {
        move: 'Let them watch you think, instead of presenting a conclusion.',
        harder: 'Showing the working means admitting it was not obvious, in front of people who expect you to know.',
        example: 'I’m weighing two things. You haven’t missed since September. The pattern still isn’t clean. I’m going to say yes, with a condition.',
        drill: 'Take a decision you’ve made about someone. Say it again with the reasoning out loud, in order, including the part against.',
      },
    ],
  },
]

export const MOVE_BY_ID = new Map(MOVES.map((move) => [move.id, move]))

export function move(id: string | undefined): Move | undefined {
  return id ? MOVE_BY_ID.get(id) : undefined
}

/** Which move a technique is a variation of. */
export function moveForTechnique(techniqueId: string): Move | undefined {
  return MOVES.find((entry) => entry.techniqueIds.includes(techniqueId))
}

/** Total rungs across the whole curriculum — the length of the ladder. */
export const TOTAL_RUNGS = MOVES.reduce((sum, entry) => sum + entry.rungs.length, 0)
