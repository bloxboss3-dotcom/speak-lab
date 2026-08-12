import type { Lesson } from '@/lib/types'

/**
 * The daily curriculum.
 *
 * Order matters. Lesson one has to be a win — a technique that is immediately
 * usable, obviously effective, and applied on the first day to a situation the
 * learner will genuinely face this week. Everything after it builds, and the
 * spaced-review engine starts folding earlier techniques back in from lesson
 * four onward without them appearing on this list.
 *
 * Every worked example is written for this app.
 */
export const LESSONS: Lesson[] = [
  {
    id: 'lesson-contrast',
    techniqueId: 'moral-contrast',
    order: 1,
    title: 'Make the gap do the arguing',
    promise: 'Put what is beside what ought to be, and stop having to convince anyone.',
    estimatedMinutes: 7,
    decodeExample: {
      setting: 'An instructor, two minutes before the end of a flat Thursday class.',
      lines: [
        'Right now, most of you are doing this drill at about seventy percent.',
        'That is not laziness. It is the end of a long week and I know it.',
        'The people who grade in November are the ones who treat the last five minutes exactly like the first five.',
        'That is the whole difference. Not talent. Five minutes.',
      ],
    },
    decodeQuestions: [
      {
        id: 'q1',
        prompt: 'Which line states what is happening now, without blaming anyone for it?',
        options: [
          'Line 1 — “doing this drill at about seventy percent”',
          'Line 3 — “the ones who treat the last five minutes…”',
          'Line 4 — “Not talent. Five minutes.”',
        ],
        answer: 0,
        because:
          'The present is described factually and immediately excused in line 2. Contrast only works if the “is” half does not read as an accusation — otherwise the listener defends instead of measuring.',
      },
      {
        id: 'q2',
        prompt: 'Why is the gap named in line 4 rather than left implied?',
        options: [
          'It makes the speaker sound more authoritative',
          'It sizes the distance, so the change sounds small enough to attempt',
          'It fills time while the class recovers',
        ],
        answer: 1,
        because:
          'An unnamed gap gets estimated by the listener, and people overestimate how far they are from a standard. “Five minutes” makes the distance concrete and crossable.',
      },
    ],
    build: {
      instruction: 'Finish the contrast. Keep the “is” half free of blame.',
      frame: [
        'Right now, when the drill gets hard, we ___.',
        'A black belt in this room ___.',
        'That is not ___ away. That is ___ away.',
      ],
      hint: 'The last line should make the distance sound smaller than they think it is.',
    },
    scenarioId: 'final-five-minutes',
  },
  {
    id: 'lesson-rising-refrain',
    techniqueId: 'rising-refrain',
    order: 2,
    title: 'Build emotional momentum',
    promise: 'Repeat one structure while the stakes underneath it climb.',
    estimatedMinutes: 8,
    decodeExample: {
      setting: 'Closing thirty seconds of a talk to a room of teenage students.',
      lines: [
        'Anyone can train when the class is fun.',
        'Anyone can train when their friends turned up.',
        'Anyone can train when they are already winning.',
        'The person you are becoming is decided on the nights when none of that is true.',
      ],
    },
    decodeQuestions: [
      {
        id: 'q1',
        prompt: 'What stays exactly the same across the first three lines?',
        options: [
          'The subject and the opening four words',
          'The length of each line',
          'The emotional intensity',
        ],
        answer: 0,
        because:
          'The fixed frame is what lets the listener notice the change. If the grammar moved too, there would be nothing to measure against.',
      },
      {
        id: 'q2',
        prompt: 'Why does the fourth line break the pattern instead of continuing it?',
        options: [
          'Four repetitions would be too many to remember',
          'The break itself signals that this is the line that matters',
          'It gives the speaker somewhere to raise their voice',
        ],
        answer: 1,
        because:
          'A pattern establishes an expectation; breaking it spends that expectation on one sentence. Continue the pattern and the last line is just another item.',
      },
    ],
    build: {
      instruction: 'Write three parallel lines that climb, then break the pattern on the fourth.',
      frame: [
        'It is easy to ___ when ___.',
        'It is easy to ___ when ___.',
        'It is easy to ___ when ___.',
        'But ___.',
      ],
      hint: 'Each “when” should be harder to dismiss than the one before it.',
    },
    scenarioId: 'not-trying',
  },
  {
    id: 'lesson-story-then-lesson',
    techniqueId: 'story-then-lesson',
    order: 3,
    title: 'Story first, meaning second',
    promise: 'Stop announcing the moral before you have earned it.',
    estimatedMinutes: 8,
    decodeExample: {
      setting: 'An instructor explaining persistence to a class that has heard it before.',
      lines: [
        'Second week of blue belt, I broke my toe on the door frame walking to the mat.',
        'I did not tell anyone. I did the whole session sitting down doing hand techniques.',
        'Nobody in that room remembers a single kick I threw that year.',
        'They remember I did not go home.',
      ],
    },
    decodeQuestions: [
      {
        id: 'q1',
        prompt: 'Where does the meaning of the story appear?',
        options: [
          'It is announced in line 1',
          'It is implied throughout',
          'It arrives only in the final line, after the story finishes',
        ],
        answer: 2,
        because:
          'The listener assembles the point themselves a fraction before it is said, which is why it feels like their conclusion rather than your argument.',
      },
      {
        id: 'q2',
        prompt: 'What would be lost by opening with “I want to talk about persistence”?',
        options: [
          'Nothing — it would help orient the listener',
          'The story becomes evidence for a claim, so the listener starts checking it',
          'The story would take longer to tell',
        ],
        answer: 1,
        because:
          'Announced as an argument, the audience listens critically. Told as an event, they listen along — and only notice they have been persuaded afterwards.',
      },
    ],
    build: {
      instruction: 'Start inside the moment. No background, no preamble.',
      frame: ['___ — and then ___.', 'I ___.', 'Nobody remembers ___.', 'They remember ___.'],
      hint: 'Your first five words should contain something physical: a place, an object, a time.',
    },
    scenarioId: 'no-visible-progress',
  },
  {
    id: 'lesson-reframing',
    techniqueId: 'reframing',
    order: 4,
    title: 'Change the frame, not the facts',
    promise: 'Take “I am bad at this” apart without arguing with any of it.',
    estimatedMinutes: 8,
    decodeExample: {
      setting: 'After a student misses a board break three times in front of the class.',
      lines: [
        'That was embarrassing. Everyone was watching and it did not go.',
        'You have decided that means you are not strong enough.',
        'You missed by about four centimetres each time, in the same direction.',
        'That is a distance problem. Distance is a two-week fix.',
      ],
    },
    decodeQuestions: [
      {
        id: 'q1',
        prompt: 'Why does the first line agree with the student?',
        options: [
          'To soften the correction that follows',
          'Because a reframe offered before the feeling is acknowledged is heard as denial',
          'To fill time while the class settles',
        ],
        answer: 1,
        because:
          'If the listener still feels unheard, any new frame is experienced as being told they are wrong to be upset — and they will hold the original frame harder.',
      },
      {
        id: 'q2',
        prompt: 'Which facts changed between the old frame and the new one?',
        options: ['None of them', 'The number of attempts', 'How strong the student is'],
        answer: 0,
        because:
          'That is the whole technique. Every fact survives; only the category the facts are filed under moves — from a verdict about the person to a measurement about a skill.',
      },
    ],
    build: {
      instruction: 'Acknowledge, name the frame, offer a new one, give the action.',
      frame: [
        'That ___. I am not going to pretend otherwise.',
        'You have decided it means ___.',
        'What I actually saw was ___.',
        'That is a ___ problem, and ___.',
      ],
      hint: 'The new frame must fit every fact you just agreed with.',
    },
    scenarioId: 'failed-belt-test',
  },
  {
    id: 'lesson-call-to-action',
    techniqueId: 'specific-call-to-action',
    order: 5,
    title: 'One action, one time, one place',
    promise: 'Stop ending on “so, try harder this week”.',
    estimatedMinutes: 6,
    decodeExample: {
      setting: 'The last fifteen seconds of a class.',
      lines: [
        'I do not want you to practise everything this week.',
        'Pick the one pattern you were worst at tonight.',
        'Before you leave, tell whoever is on the desk which one it is.',
        'Not all of them. One.',
      ],
    },
    decodeQuestions: [
      {
        id: 'q1',
        prompt: 'What makes this actionable where “practise more” is not?',
        options: [
          'It is shorter',
          'It has a specific action, a time and a person attached',
          'It is delivered more firmly',
        ],
        answer: 1,
        because:
          'Intentions become behaviour when they specify when and where. Without those, the listener agrees sincerely and does nothing, and neither of you finds out for a month.',
      },
      {
        id: 'q2',
        prompt: 'Why “not all of them — one”?',
        options: [
          'To make the ask small enough that skipping it would be embarrassing',
          'To save the instructor time',
          'Because students cannot handle more than one instruction',
        ],
        answer: 0,
        because:
          'An ask sized to be trivially achievable removes every excuse. The size is the point: it is designed so that not doing it is a decision rather than an oversight.',
      },
    ],
    build: {
      instruction: 'One action. Attach a time and a person.',
      frame: ['Before ___, ___.', 'Not ___. Just ___.'],
      hint: 'If your action could be done “sometime”, it is not finished.',
    },
    scenarioId: 'close-a-keynote',
  },
  {
    id: 'lesson-name-the-feeling',
    techniqueId: 'name-the-feeling',
    order: 6,
    title: 'Say the feeling out loud',
    promise: 'The fastest way to be heard is to prove you are looking.',
    estimatedMinutes: 6,
    decodeExample: {
      setting: 'A student has gone quiet at the edge of the mat after a correction.',
      lines: [
        'I think that landed as embarrassing rather than useful.',
        'Because it was in front of the group.',
        'Am I close?',
      ],
    },
    decodeQuestions: [
      {
        id: 'q1',
        prompt: 'Why “embarrassing” rather than “upset”?',
        options: [
          'It is a longer word',
          'Specific naming proves you were actually watching; a vague word could apply to anyone',
          'It sounds more professional',
        ],
        answer: 1,
        because:
          'Precision is the evidence. “Upset” is a guess anyone could make from across the room; “embarrassed, because it was in front of the group” could only come from paying attention.',
      },
      {
        id: 'q2',
        prompt: 'What does ending on “Am I close?” do?',
        options: [
          'Makes the speaker sound uncertain',
          'Turns a verdict into a guess the other person can correct',
          'Fills an awkward silence',
        ],
        answer: 1,
        because:
          'A named feeling asserted as fact can be wrong, and being told what you feel is its own irritation. Offered as a question it stays useful even when the guess misses.',
      },
    ],
    build: {
      instruction: 'Name it specifically, give your reason, hand it back.',
      frame: ['I think that felt more ___ than ___.', 'Because ___.', '___?'],
      hint: 'Avoid “upset”, “sad” and “annoyed” — reach for the specific version.',
    },
    scenarioId: 'embarrassed-in-front',
  },
  {
    id: 'lesson-plain-words',
    techniqueId: 'plain-words',
    order: 7,
    title: 'Small words, heavy ideas',
    promise: 'Say the hardest thing you have to say in words a ten-year-old uses.',
    estimatedMinutes: 6,
    decodeExample: {
      setting: 'Telling a student he has not passed.',
      lines: [
        'I am not going to pass you today.',
        'You are close.',
        'What is missing is the thing I have asked you for four weeks in a row.',
        'We both know which one.',
      ],
    },
    decodeQuestions: [
      {
        id: 'q1',
        prompt: 'What would “I have taken the decision not to award a promotion” cost here?',
        options: [
          'Nothing, it is more precise',
          'Formal register signals distance and gives the listener something to decode under stress',
          'It would take longer to say',
        ],
        answer: 1,
        because:
          'Under emotional load the decoding does not happen. The listener catches the tone, misses the content, and asks you to repeat it — or worse, does not.',
      },
      {
        id: 'q2',
        prompt: 'Which line does the most work?',
        options: ['Line 1', 'Line 2 — “You are close.”', 'Line 4'],
        answer: 1,
        because:
          'Three words, placed immediately after the refusal, that stop the news becoming a verdict about ability. Short does not mean unimportant — the shortest line is often carrying the most.',
      },
    ],
    build: {
      instruction: 'Rewrite this in the plainest words you can find: “Regrettably, your performance did not satisfy the criteria on this occasion.”',
      frame: ['___.', '___.', '___.'],
      hint: 'Three short sentences. No word longer than two syllables if you can manage it.',
    },
    scenarioId: 'deliver-disappointment',
  },
  {
    id: 'lesson-anticipate-objection',
    techniqueId: 'anticipate-objection',
    order: 8,
    title: 'Say their argument for them',
    promise: 'Empty their hands before you ask them to hold anything.',
    estimatedMinutes: 8,
    decodeExample: {
      setting: 'Telling a parent their child is not grading in November.',
      lines: [
        'You are going to wonder whether I am holding him back to keep the fees running.',
        'That is a fair thing to wonder. You have no way to check it from where you are standing.',
        'Here is the part you cannot see from the viewing area.',
        'He has the sequence. He does not have it under fatigue, and the examiner tests it last.',
      ],
    },
    decodeQuestions: [
      {
        id: 'q1',
        prompt: 'Why state the objection in its strongest form rather than a softer one?',
        options: [
          'It shows off the speaker’s honesty',
          'A softened version is transparently a straw man, and answering it proves nothing',
          'It makes the conversation longer',
        ],
        answer: 1,
        because:
          'The listener is holding the strong version. Answer a weak one and they simply conclude you have not understood — and now they trust you less than before you spoke.',
      },
      {
        id: 'q2',
        prompt: 'What does line 2 concede?',
        options: [
          'That the speaker is motivated by money',
          'That the suspicion is reasonable given what the parent can observe',
          'Nothing — it is a rhetorical move only',
        ],
        answer: 1,
        because:
          'Conceding the legitimacy of the doubt is not conceding the accusation. It costs nothing true and buys the right to be believed on the next sentence.',
      },
    ],
    build: {
      instruction: 'State their objection, concede what is fair, then introduce what they cannot see.',
      frame: [
        'You are going to think ___.',
        'That is ___ — ___.',
        'What you cannot see from ___ is ___.',
      ],
      hint: 'If your version of their objection would not annoy you to hear, it is not the strong version.',
    },
    scenarioId: 'parent-no-progress',
  },
  {
    id: 'lesson-name-the-hard-thing',
    techniqueId: 'name-the-hard-thing',
    order: 9,
    title: 'Cost first, ask second',
    promise: 'Stop selling the difficult thing as though it were easy.',
    estimatedMinutes: 7,
    decodeExample: {
      setting: 'Introducing a six-week conditioning block.',
      lines: [
        'The next six weeks are the least interesting part of your training.',
        'One pattern. Over and over. You will be sick of it by week two.',
        'I am not going to dress that up.',
        'And it is the reason the people above you look calm when everyone else is panicking.',
      ],
    },
    decodeQuestions: [
      {
        id: 'q1',
        prompt: 'What does line 3 buy?',
        options: [
          'Time to think',
          'Credibility — it names the thing the listener was already suspecting you would hide',
          'A softer tone',
        ],
        answer: 1,
        because:
          'The audience is always checking whether you are levelling with them. Explicitly refusing to spin it settles that question, and everything after it is heard differently.',
      },
      {
        id: 'q2',
        prompt: 'Why is the payoff described as an observable state rather than a promise?',
        options: [
          '“Look calm when everyone else is panicking” is something they have actually seen',
          'It sounds more impressive',
          'It avoids committing the instructor to anything',
        ],
        answer: 0,
        because:
          'A payoff the listener has personally witnessed needs no evidence. A promised outcome they have not seen has to be taken on trust you may not have yet.',
      },
    ],
    build: {
      instruction: 'Name the cost flatly. Refuse to spin it. Then make the ask.',
      frame: ['The next ___ is ___.', 'You will ___.', 'I am not going to ___.', 'And ___.'],
      hint: 'The word “and” is doing the turn. Do not use “but” — it cancels what came before.',
    },
    scenarioId: 'team-is-tired',
  },
  {
    id: 'lesson-start-with-why',
    techniqueId: 'start-with-why',
    order: 10,
    title: 'Reason before instruction',
    promise: 'Give them something they can apply when you are not in the room.',
    estimatedMinutes: 6,
    decodeExample: {
      setting: 'Correcting where students bow.',
      lines: [
        'The reason we bow at the line and not at the door is that it marks where training starts in your head.',
        'So: bow at the line.',
        'If you forget, step back and do it again.',
      ],
    },
    decodeQuestions: [
      {
        id: 'q1',
        prompt: 'What can the student do with the reason that they could not do with the rule?',
        options: [
          'Apply it to situations the instructor never mentioned',
          'Remember it more easily',
          'Explain it to their parents',
        ],
        answer: 0,
        because:
          'A rule covers the cases it names. A reason generalises — the student who understands “this marks the start” knows what to do about the water bottle and the phone without being told.',
      },
      {
        id: 'q2',
        prompt: 'Why does the instruction come second rather than first?',
        options: [
          'It is more polite',
          'An instruction heard first is filed as a demand, and the reason afterwards sounds like justification',
          'It makes the sentence flow better',
        ],
        answer: 1,
        because:
          'Order changes category. Reason-then-instruction is an explanation; instruction-then-reason is a defence, and people argue with defences.',
      },
    ],
    build: {
      instruction: 'Reason, instruction, what good looks like. Then stop.',
      frame: ['The reason ___ is ___.', 'So: ___.', 'If ___, ___.'],
      hint: 'Resist adding a second justification. One reason, stated once.',
    },
    scenarioId: 'set-expectations-newcomer',
  },
  {
    id: 'lesson-dignity-guard',
    techniqueId: 'dignity-guard',
    order: 11,
    title: 'Correct the act, keep the person',
    promise: 'Say the hard thing in a way they can actually act on.',
    estimatedMinutes: 7,
    decodeExample: {
      setting: 'A student stopped three times mid-pattern.',
      lines: [
        'You stopped three times in that pattern.',
        'The standard here is you finish it and fix it afterwards.',
        'That is a habit, not a character flaw.',
        'Run it again. Finish it badly if you have to.',
      ],
    },
    decodeQuestions: [
      {
        id: 'q1',
        prompt: 'Why does line 3 exist at all?',
        options: [
          'To be kind',
          'Because the student has already begun converting the correction into a verdict about themselves',
          'To fill the pause before the retry',
        ],
        answer: 1,
        because:
          'People do the conversion automatically and silently. Saying it out loud interrupts it — and unconverted, the correction stays something they can fix tonight.',
      },
      {
        id: 'q2',
        prompt: 'What makes “finish it badly if you have to” effective?',
        options: [
          'It lowers the standard',
          'It removes the excuse of not being able to do it well, so the actual instruction can be obeyed',
          'It is funny',
        ],
        answer: 1,
        because:
          'The instruction was about finishing, not about quality. Explicitly permitting a bad version makes the real standard achievable right now.',
      },
    ],
    build: {
      instruction: 'Observation, standard, separation, next attempt.',
      frame: ['You ___.', 'The standard is ___.', 'That is ___, not ___.', '___ again. ___.'],
      hint: 'The third line is not optional. It is the technique.',
    },
    scenarioId: 'correcting-a-leader',
  },
  {
    id: 'lesson-story-hook',
    techniqueId: 'story-hook',
    order: 12,
    title: 'Open inside the moment',
    promise: 'Spend your best ten seconds on something other than throat-clearing.',
    estimatedMinutes: 6,
    decodeExample: {
      setting: 'Opening a talk to two hundred people.',
      lines: [
        'The board did not break.',
        'Forty people watching, and it did not break.',
        'He stood there holding his hand, and the whole room went quiet.',
        'He was nine.',
      ],
    },
    decodeQuestions: [
      {
        id: 'q1',
        prompt: 'What information is deliberately withheld until the end?',
        options: [
          'Who it happened to',
          'Where it happened',
          'Why the speaker is telling the story',
        ],
        answer: 0,
        because:
          'Held back, “he was nine” re-reads everything above it. Given first, it would have been ordinary context and the last line would have nowhere to go.',
      },
      {
        id: 'q2',
        prompt: 'Why not open with “I want to talk about resilience today”?',
        options: [
          'It is too short',
          'It spends the most valuable attention of the talk on an announcement the audience cannot use yet',
          'The audience already knows the topic',
        ],
        answer: 1,
        because:
          'Attention is highest at the start and never returns to that level. An abstract announcement converts it into nothing; a scene converts it into curiosity you can spend later.',
      },
    ],
    build: {
      instruction: 'Write four lines. The first contains a physical detail. No background.',
      frame: ['___.', '___.', '___.', '___.'],
      hint: 'Delete your first sentence, then delete the new first sentence. Start there.',
    },
    scenarioId: 'open-a-keynote',
  },
]

export const LESSON_BY_ID = new Map(LESSONS.map((lesson) => [lesson.id, lesson]))

export function lesson(id: string | undefined): Lesson | undefined {
  return id ? LESSON_BY_ID.get(id) : undefined
}

export const LESSONS_IN_ORDER = [...LESSONS].sort((a, b) => a.order - b.order)
