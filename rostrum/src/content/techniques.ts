import type { Technique } from '@/lib/types'

/**
 * The arsenal.
 *
 * Each technique is narrow enough to practise in ninety seconds and to check in
 * a transcript. `tells` is the part that earns its keep: every entry is a
 * property a piece of text either has or does not have, which is what lets the
 * app coach — and detect unprompted retrieval — with no model in the loop.
 *
 * Every `example` is written for this app. None is a quotation.
 */
export const TECHNIQUES: Technique[] = [
  // ---------------------------------------------------------------- King
  {
    id: 'rising-refrain',
    name: 'Rising Refrain',
    masterId: 'king',
    category: 'rhetoric',
    branch: 'motivation',
    summary: 'Repeat one structure while the stakes underneath it climb.',
    why: 'Repetition frees the listener from decoding new grammar, so all their attention goes to what changed. Because the frame is fixed, every increase in stakes registers as an increase — the pattern does the measuring for them.',
    structure: [
      'Say the line',
      'Repeat the structure, raise what is at stake',
      'Repeat again, widen who it touches',
      'Break the pattern on the strongest idea',
    ],
    whenToUse:
      'When you need a group to feel that something ordinary matters more than it appears to. Ends of classes, ends of talks, moments where effort is fading.',
    whenNotToUse:
      'In a one-to-one conversation, or when someone is upset. Structure this deliberate reads as performance when it is aimed at a single person who needs to be heard.',
    example:
      'Anyone can show up when they feel like it. Anyone can train hard when someone is watching. Anyone can finish when the end is already in sight. What you do in the next five minutes is the part nobody else will ever see.',
    tells: [
      { kind: 'anaphora', minRepeats: 3 },
      { kind: 'escalation' },
      { kind: 'short-close', maxWords: 22 },
    ],
    clips: [
      {
        file: 'fdr-anaphora.mp3',
        speaker: 'Franklin D. Roosevelt',
        occasion: 'Address to Congress, 8 December 1941',
        seconds: 36,
        startsAt: 171,
        sourceUrl: 'https://archive.org/details/FranklinDelanoRooseveltDayOfInfamySpeech',
        recordedBy: 'Franklin D. Roosevelt Presidential Library and Museum (US National Archives)',
        listenFor:
          'One sentence shape, held exactly, with only the place name changing inside it. Notice that he does not raise his volume — the pressure comes from accumulation, and from how little he varies. Count the repetitions before he breaks the pattern.',
      },
    ],
  },
  {
    id: 'moral-contrast',
    name: 'Moral Contrast',
    masterId: 'king',
    category: 'persuasion',
    branch: 'persuasion',
    summary: 'Put what is next to what ought to be, and let the gap argue.',
    why: 'A stated ideal is easy to nod at and forget. Placed directly against the present reality, it becomes a measurement, and the listener does the arithmetic themselves — which is far more persuasive than being handed the conclusion.',
    structure: [
      'Describe the present, plainly and without blame',
      'Describe what it should be, concretely',
      'Name the distance between them',
      'Point at the first step across',
    ],
    whenToUse:
      'When standards have slipped and you want the group to raise them without being scolded into it.',
    whenNotToUse:
      'When the gap is somebody’s personal failure and they are in the room. Aim contrast at a situation, never at a person.',
    example:
      'Right now we bow when the instructor is looking. A black belt bows because the room deserves it whether or not anyone sees. That is not a rule away — it is a habit away.',
    tells: [{ kind: 'antithesis' }, { kind: 'concrete-nouns', min: 4 }],
    clips: [
      {
        file: 'jfk-antithesis.mp3',
        speaker: 'John F. Kennedy',
        occasion: 'Inaugural Address, 20 January 1961',
        seconds: 14,
        startsAt: 16,
        sourceUrl: 'https://archive.org/details/JohnF.KennedyInauguralAddress',
        recordedBy: 'John F. Kennedy Presidential Library (US National Archives)',
        listenFor:
          'He says what the moment is not before he says what it is, and the two halves are balanced to almost the same length. Listen for the small dip in pitch at the hinge between them — that pause is what makes the second half land as the answer.',
      },
    ],
  },
  {
    id: 'concrete-image',
    name: 'Concrete Image',
    masterId: 'king',
    category: 'storytelling',
    branch: 'storytelling',
    summary: 'Trade the abstraction for something the listener can see.',
    why: 'Abstract nouns — discipline, potential, excellence — are stored as definitions and forgotten. A picture is stored as an experience. The image also survives retelling, which is how an idea travels when you are not in the room.',
    structure: [
      'Find the abstract word you were about to use',
      'Ask what it looks like on a specific Tuesday',
      'Say that instead',
      'Only then name the abstraction, if at all',
    ],
    whenToUse: 'Any time you catch yourself about to say a word ending in -ity, -ness or -ment.',
    whenNotToUse:
      'When precision matters more than memory — safety instructions, testing criteria, anything someone must follow exactly.',
    example:
      'Discipline is not a feeling. It is the second time you tie your belt properly after nobody corrected you the first time.',
    tells: [{ kind: 'concrete-nouns', min: 5 }],
  },
  {
    id: 'hopeful-close',
    name: 'Hopeful Close',
    masterId: 'king',
    category: 'closings',
    branch: 'motivation',
    summary: 'End on the described future, not on the problem you opened with.',
    why: 'People leave holding whatever you said last. Ending on the grievance leaves them holding the grievance; ending on a described future leaves them holding something to walk toward — and description, not cheerleading, is what makes it credible.',
    structure: [
      'Acknowledge the hard thing once',
      'Turn: “and here is what is coming”',
      'Describe the future in specifics, not adjectives',
      'Stop',
    ],
    whenToUse: 'The last twenty seconds of anything.',
    whenNotToUse:
      'When the situation genuinely is not resolved and hope would be a lie. Say the truth and stop instead.',
    example:
      'This grading was rough. In eight weeks you will stand in the same spot and the pattern you fell apart on today will be the one you use to warm up.',
    tells: [{ kind: 'short-close', maxWords: 26 }, { kind: 'antithesis' }],
  },

  // ---------------------------------------------------------------- Lincoln
  {
    id: 'plain-words',
    name: 'Plain Words',
    masterId: 'lincoln',
    category: 'rhetoric',
    branch: 'clarity',
    summary: 'Carry the heaviest idea on the smallest available words.',
    why: 'Long words make a speaker sound careful and make a listener work. Under any emotional load the working stops, and the sentence is lost. The short word is not simpler thinking — it is thinking that has finished.',
    structure: [
      'Write or say the sentence however it comes',
      'Find the longest word in it',
      'Replace it with a word a ten-year-old uses',
      'Keep the sentence if it still means the same thing',
    ],
    whenToUse: 'When the stakes are highest. Difficult news, corrections, anything emotional.',
    whenNotToUse:
      'When the technical term is the point and vagueness would mislead — belt requirements, medical facts, legal obligations.',
    example:
      'I am not going to pass you today. You are close. What is missing is the part I have asked you for four weeks in a row.',
    tells: [{ kind: 'phrases', any: [], label: 'short words' }],
  },
  {
    id: 'shared-ground',
    name: 'Shared Ground',
    masterId: 'lincoln',
    category: 'persuasion',
    branch: 'persuasion',
    summary: 'Open from the thing you already agree on.',
    why: 'Disagreement makes people defend rather than listen. Starting from genuine agreement removes the need to defend, and it also commits you publicly to a fair reading of their position, which is what buys you the right to disagree next.',
    structure: [
      'Name what you both want, honestly',
      'Confirm you have understood their concern',
      'Only then introduce the difference',
      'Keep the shared want in view while you do',
    ],
    whenToUse: 'Parent conversations, disagreements with staff, anything that could become a fight.',
    whenNotToUse:
      'When there genuinely is no shared ground and pretending otherwise would be dishonest.',
    example:
      'We both want him to finish something hard for the first time in his life. That is exactly why I do not want to move his grading yet.',
    tells: [
      { kind: 'phrases', any: ['we both', 'you and i both', 'we all want', 'i agree'], label: 'shared want named' },
      { kind: 'concession' },
    ],
  },
  {
    id: 'weight-of-brevity',
    name: 'The Weight of Brevity',
    masterId: 'lincoln',
    category: 'closings',
    branch: 'clarity',
    summary: 'Say less than the moment invites, and stop early.',
    why: 'Every sentence after the point competes with the point. A speaker who stops while the room is still leaning in leaves the idea intact; one who continues dilutes it with material the audience did not ask for.',
    structure: [
      'Decide the one sentence that must survive',
      'Say the necessary setup',
      'Say the sentence',
      'Say nothing else',
    ],
    whenToUse: 'When you are tempted to explain a good line. Do not explain the good line.',
    whenNotToUse:
      'When the listener genuinely lacks information they need to act. Brevity is not a substitute for instructions.',
    example: 'You did not lose today. You found out what you have not trained yet. Class dismissed.',
    tells: [{ kind: 'short-close', maxWords: 14 }],
  },

  // ---------------------------------------------------------------- Churchill
  {
    id: 'name-the-hard-thing',
    name: 'Name the Hard Thing',
    masterId: 'churchill',
    category: 'leadership',
    branch: 'leadership',
    summary: 'State the cost plainly before you ask for effort.',
    why: 'An ask that skips the difficulty tells the listener you either have not noticed it or are hiding it, and both cost you credibility. Naming it first means the effort you ask for lands as realism rather than cheerleading.',
    structure: [
      'Say the difficulty in flat, concrete language',
      'Do not soften it or rush past it',
      'Turn once: “and”',
      'Make the ask, sized to the difficulty you just named',
    ],
    whenToUse:
      'Before a hard training block, an unpopular change, or any request that will actually cost people something.',
    whenNotToUse: 'When the thing is not, in fact, hard. Manufactured difficulty is transparent.',
    example:
      'The next six weeks are the least interesting part of your training. You will repeat one pattern until you are sick of it. And it is the reason the people above you look calm under pressure.',
    tells: [{ kind: 'antithesis' }, { kind: 'call-to-action' }],
  },
  {
    id: 'rhythm-of-three',
    name: 'Rhythm of Three',
    masterId: 'churchill',
    category: 'rhetoric',
    branch: 'presence',
    summary: 'Group in threes; put the weight on the third.',
    why: 'Two items read as a comparison and four as a list. Three is the smallest group that feels complete, so the ear expects the third to close — which makes it the strongest position in the sentence, free.',
    structure: [
      'Choose the idea that must land',
      'Find two lighter items to precede it',
      'Order them shortest to longest',
      'Put the idea last',
    ],
    whenToUse: 'Announcing values, summarising, closing. Anywhere you want a phrase to be repeatable.',
    whenNotToUse: 'More than once in a short talk. Two tricolons in a row is a tic, not a technique.',
    example: 'Show up. Work when it is boring. Then find out what you are actually made of.',
    tells: [{ kind: 'anaphora', minRepeats: 3 }, { kind: 'escalation' }],
    clips: [
      {
        file: 'jfk-escalation.mp3',
        speaker: 'John F. Kennedy',
        occasion: 'Inaugural Address, 20 January 1961',
        seconds: 26,
        startsAt: 145,
        sourceUrl: 'https://archive.org/details/JohnF.KennedyInauguralAddress',
        recordedBy: 'John F. Kennedy Presidential Library (US National Archives)',
        listenFor:
          'A run of very short parallel clauses, each the same length, taken at a steady clip. Listen to how the pitch lifts slightly on each one and how little air sits between them — the run is doing the work, not any single phrase in it.',
      },
    ],
  },
  {
    id: 'resolve-without-denial',
    name: 'Resolve Without Denial',
    masterId: 'churchill',
    category: 'leadership',
    branch: 'leadership',
    summary: 'Commit fully while admitting you might not win.',
    why: 'Certainty about outcomes is usually false, and listeners know it. Certainty about your own conduct is always available and never a lie — so moving the commitment from the result to the behaviour keeps the resolve and drops the dishonesty.',
    structure: [
      'Admit the outcome is not guaranteed',
      'Move the commitment to what you will do regardless',
      'State it as behaviour, not feeling',
      'Invite them into the same commitment',
    ],
    whenToUse: 'Before belt tests, competitions, anything with a real chance of failure.',
    whenNotToUse: 'When success genuinely is assured and doubt would be theatre.',
    example:
      'I cannot promise you pass on Saturday. I can promise that if you do the corrections this week, nothing that happens on Saturday will be because you did not prepare.',
    tells: [{ kind: 'antithesis' }, { kind: 'call-to-action' }],
  },

  // ---------------------------------------------------------------- Jobs
  {
    id: 'one-idea-per-beat',
    name: 'One Idea Per Beat',
    masterId: 'jobs',
    category: 'rhetoric',
    branch: 'clarity',
    summary: 'One claim per sentence. Full stop. Next.',
    why: 'A subordinate clause asks the listener to hold the first half in memory while parsing the second. Under noise, fatigue or emotion they drop it. Short declaratives cost nothing to hold, so all of the attention stays on meaning.',
    structure: [
      'Find any sentence with “and”, “but”, “which” or “because” in the middle',
      'Cut it at the joint',
      'Delete whichever half was not necessary',
      'Say the rest as separate sentences',
    ],
    whenToUse: 'Noisy rooms, young children, tired audiences, and anything you want repeated back.',
    whenNotToUse:
      'When the relationship between two ideas is the point — causes, conditions and consequences need their connective.',
    example: 'Grading is on the 14th. You need three more classes. Sign the sheet on the way out.',
    tells: [{ kind: 'phrases', any: [], label: 'short sentences' }],
  },
  {
    id: 'reveal-structure',
    name: 'Reveal Structure',
    masterId: 'jobs',
    category: 'engagement',
    branch: 'presence',
    summary: 'Set an expectation, hold it, then turn it.',
    why: 'Attention is renewed by unresolved expectation and spent by resolved ones. Announcing a shape — “three things” — buys you the whole span, and a turn inside it resets the clock without any increase in volume.',
    structure: [
      'Announce the shape: how many, how long',
      'Deliver the expected items',
      'Pause before the last',
      'Turn it into something they did not expect',
    ],
    whenToUse: 'Talks over two minutes, where attention will otherwise decay.',
    whenNotToUse:
      'When there is no genuine turn. A promised surprise that turns out to be ordinary is worse than no promise.',
    example:
      'Three things change at red belt. The first two are on the syllabus. The third is that people start copying you whether you agreed to it or not.',
    tells: [
      { kind: 'phrases', any: ['three things', 'two things', 'first', 'second', 'third'], label: 'announced shape' },
      { kind: 'antithesis' },
    ],
  },
  {
    id: 'story-then-lesson',
    name: 'Story, Then Lesson',
    masterId: 'jobs',
    category: 'storytelling',
    branch: 'storytelling',
    summary: 'Tell the whole story before you say what it means.',
    why: 'A story announced as a lesson is heard as an argument, and the listener starts checking it against their own position. Told first, it is heard as an event, and the meaning arrives as something they helped construct.',
    structure: [
      'Start inside the moment, not at the background',
      'One specific scene, present detail',
      'Let it finish',
      'Then, one sentence: what it meant',
    ],
    whenToUse: 'Any point you have made before and that stopped landing.',
    whenNotToUse:
      'When you have thirty seconds. A truncated story is worse than the plain statement.',
    example:
      'Second week of blue belt, I broke my toe on the door frame walking to the mat. I trained the whole session sitting down, doing hand techniques. Nobody remembers my kicks that year. They remember I did not go home.',
    tells: [{ kind: 'narrative-open' }, { kind: 'concrete-nouns', min: 5 }, { kind: 'short-close', maxWords: 24 }],
  },

  // ---------------------------------------------------------------- Sinek
  {
    id: 'start-with-why',
    name: 'Start With Why',
    masterId: 'sinek',
    category: 'leadership',
    branch: 'leadership',
    summary: 'Give the reason before the instruction.',
    why: 'An instruction without a reason can only be complied with. Compliance stops the moment supervision does. A reason given first converts the same instruction into something the listener can apply on their own to situations you did not anticipate.',
    structure: [
      'Say why this matters, in one sentence',
      'Say what you are asking for',
      'Say what it looks like done well',
      'Stop — do not re-justify',
    ],
    whenToUse: 'Every instruction to anyone you want acting without you present.',
    whenNotToUse:
      'Emergencies. When someone is about to get hurt, the instruction comes first and the reason comes afterwards.',
    example:
      'The reason we bow at the line and not at the door is that it marks where training starts in your head. So: bow at the line. If you forget, step back and do it again.',
    tells: [
      { kind: 'phrases', any: ['the reason', 'because', 'so that', 'which is why'], label: 'reason given' },
      { kind: 'call-to-action' },
    ],
  },
  {
    id: 'belonging-frame',
    name: 'Belonging Frame',
    masterId: 'sinek',
    category: 'leadership',
    branch: 'leadership',
    summary: 'Say “we” where you were about to say “you”.',
    why: 'Second person puts the listener on one side of a line and you on the other, which turns a standard into a demand. First person plural puts the standard above both of you — you are subject to it too — and that is a materially different claim, so only make it when it is true.',
    structure: [
      'Find the sentence that starts “you need to”',
      'Ask whether the standard applies to you as well',
      'If it does, say “we”',
      'If it does not, keep “you” and own the asymmetry',
    ],
    whenToUse: 'Setting team standards, addressing a group, anything about culture.',
    whenNotToUse:
      'When one person specifically is not doing their job. A collective “we” there is cowardice dressed as inclusion, and everyone can tell.',
    example:
      'We do not leave the mats for the last person out. That includes me, and it has included me on nights I wanted to go home.',
    tells: [{ kind: 'phrases', any: ['we ', 'our ', 'us '], label: 'first person plural' }],
  },

  // ---------------------------------------------------------------- Brown
  {
    id: 'earned-vulnerability',
    name: 'Earned Vulnerability',
    masterId: 'brown',
    category: 'emotional-connection',
    branch: 'emotional-connection',
    summary: 'Share the scar, not the open wound — and only to serve them.',
    why: 'Disclosure closes distance because it removes the listener’s suspicion that you have never been where they are. But an unresolved disclosure transfers your distress to them and quietly asks them to manage it, which reverses who is being helped.',
    structure: [
      'Check: is this processed, or am I still in it?',
      'Check: does this help them, or does it help me?',
      'Tell it briefly and without self-criticism',
      'Return the focus to them in the next sentence',
    ],
    whenToUse: 'When someone believes they are uniquely bad at something.',
    whenNotToUse:
      'When you are still upset about it, or when the story would make them responsible for reassuring you.',
    example:
      'I failed my first black belt grading. I am telling you because you are about to decide that today means something permanent, and I want you to have the data. What did the examiner actually say to you?',
    tells: [{ kind: 'narrative-open' }, { kind: 'question', min: 1 }],
  },
  {
    id: 'name-the-feeling',
    name: 'Name the Feeling',
    masterId: 'brown',
    category: 'empathy',
    branch: 'emotional-connection',
    summary: 'Say the emotion out loud before you say anything else.',
    why: 'An unnamed feeling keeps demanding attention, and it will win against whatever you are trying to say. Named accurately by someone else, it drops in intensity — and the listener also learns that you are actually looking at them rather than at the problem.',
    structure: [
      'Guess the feeling specifically — embarrassed, not “upset”',
      'Say it as a guess, not a verdict',
      'Stop and let them correct you',
      'Only then move to the situation',
    ],
    whenToUse:
      'Immediately after a failure, in front of peers, or any time someone has gone quiet.',
    whenNotToUse:
      'As a preface to disagreement — “I know you feel X, but” cancels the whole move.',
    example:
      'I think that was embarrassing more than it was disappointing. Everyone was watching. Am I close?',
    tells: [{ kind: 'emotion-named' }, { kind: 'question', min: 1 }],
  },
  {
    id: 'dignity-guard',
    name: 'Dignity Guard',
    masterId: 'brown',
    category: 'empathy',
    branch: 'emotional-connection',
    summary: 'Correct the behaviour in a way that leaves the person intact.',
    why: 'A correction attached to identity — “you are lazy” — cannot be acted on, because the listener has no move except to defend who they are. Attached to a behaviour and a specific occasion, it becomes something they can change by Thursday.',
    structure: [
      'Describe what happened, observably',
      'Say the standard it missed',
      'Say explicitly that this is about the action',
      'Give the specific next attempt',
    ],
    whenToUse: 'Every correction, but especially in front of others.',
    whenNotToUse: 'Never skip it. There is no situation improved by removing someone’s dignity.',
    example:
      'You stopped three times during that pattern. The standard is you finish and fix it afterwards. That is a habit, not a character flaw — run it again and finish it badly if you have to.',
    tells: [{ kind: 'antithesis' }, { kind: 'call-to-action' }],
  },

  // ---------------------------------------------------------------- Keller
  {
    id: 'anticipate-objection',
    name: 'Anticipate the Objection',
    masterId: 'keller',
    category: 'argumentation',
    branch: 'persuasion',
    summary: 'State their counter-argument better than they would, then answer it.',
    why: 'While a listener is holding an unspoken objection, they are rehearsing it rather than listening. Saying it first empties their hands. Saying it well also proves you understood them, which is the only thing that makes your answer worth hearing.',
    structure: [
      'Say the strongest version of their objection',
      'Concede whatever part of it is true',
      'Introduce the thing it does not account for',
      'Answer that version, not a weaker one',
    ],
    whenToUse: 'Any parent conversation, any resistant teenager, any unpopular decision.',
    whenNotToUse:
      'When you cannot actually answer the objection. Raising it and failing is worse than not raising it.',
    example:
      'You are going to think I am holding him back to keep the fees coming. That would be a fair suspicion — you have no way to check it. Here is what changes if he grades in November instead.',
    tells: [{ kind: 'concession' }, { kind: 'antithesis' }],
  },
  {
    id: 'redefine-the-premise',
    name: 'Redefine the Premise',
    masterId: 'keller',
    category: 'teaching',
    branch: 'teaching',
    summary: 'Answer the question behind the question.',
    why: 'Some questions cannot be answered well as asked, because the framing contains the error. Answering the literal question confirms the framing; naming the real question moves the conversation to ground where an answer actually exists.',
    structure: [
      'Take the question seriously and repeat it back',
      'Name what it assumes',
      'Offer the question underneath it',
      'Answer that one',
    ],
    whenToUse: '“Am I any good at this?” “Why am I not a black belt yet?” “Do you even like me?”',
    whenNotToUse:
      'When the literal question has a literal answer they need. Do not dodge a fair question with a reframe.',
    example:
      'You are asking whether you are talented. Underneath that I think you are asking whether it is worth continuing. Those have different answers, and the second one is yes.',
    tells: [{ kind: 'question', min: 1 }, { kind: 'antithesis' }],
  },
  {
    id: 'analogy-bridge',
    name: 'Analogy Bridge',
    masterId: 'keller',
    category: 'teaching',
    branch: 'teaching',
    summary: 'Carry the difficult idea across on something they already own.',
    why: 'New concepts are learned by attachment to existing ones. A well-chosen analogy does the attaching for the listener; a badly chosen one attaches the concept to the wrong thing and is very hard to undo later.',
    structure: [
      'Name the hard idea',
      'Find something in their life with the same shape',
      'Map it explicitly — this is that',
      'Say where the analogy stops working',
    ],
    whenToUse: 'Abstract ideas: patience, grace, compound progress, delayed reward.',
    whenNotToUse:
      'When you have not found a genuinely matching shape. A loose analogy teaches a wrong idea confidently.',
    example:
      'Sparring is a conversation where both people talk at once. You are trying to finish your sentence while they finish theirs. Where it breaks down: in a conversation, nobody wins.',
    tells: [{ kind: 'analogy' }, { kind: 'concrete-nouns', min: 4 }],
  },
  {
    id: 'intellect-to-heart',
    name: 'Intellect to Heart',
    masterId: 'keller',
    category: 'persuasion',
    branch: 'persuasion',
    summary: 'Win the argument, then say why it matters to this person.',
    why: 'An argument that stays intellectual is agreed with and not acted on. Moving to what it costs or gives this particular listener converts assent into motive — and doing it after the reasoning, not instead of it, is what keeps it from being manipulation.',
    structure: [
      'Make the case properly',
      'Pause at the point of agreement',
      'Turn: “here is why I care that you know that”',
      'Say what it changes for them personally',
    ],
    whenToUse: 'Devotionals, leadership talks, any explanation that keeps being understood and ignored.',
    whenNotToUse:
      'Before the argument is actually made. Emotional appeal standing in for reasoning is the thing this technique is designed to avoid.',
    example:
      'So consistency beats intensity — that is just how skill accumulates. The reason I care that you know it: you have been treating your bad weeks as evidence you should quit, and they are not evidence of anything.',
    tells: [{ kind: 'phrases', any: ['the reason i', 'why i care', 'what that means for you', 'here is why'], label: 'turn to the personal' }],
  },

  // ---------------------------------------------------------------- Chan
  {
    id: 'provocative-question',
    name: 'Provocative Question',
    masterId: 'chan',
    category: 'teaching',
    branch: 'teaching',
    summary: 'Ask the question that costs something to answer, then wait.',
    why: 'A statement can be filed away; an unanswered question stays open. The cost is what makes it stay — a question with a comfortable answer is answered instantly and forgotten just as fast.',
    structure: [
      'Find the thing they are avoiding',
      'Ask it directly, without accusation',
      'Stop talking',
      'Do not rescue them from the silence',
    ],
    whenToUse: 'With teens and adults who have stopped hearing statements.',
    whenNotToUse:
      'With young children, or in front of an audience. A costly question asked publicly is an ambush.',
    example:
      'If nobody at this school ever graded you again — no belts, no certificates — would you still come on Tuesday? I am not going to answer that for you.',
    tells: [{ kind: 'question', min: 1 }, { kind: 'short-close', maxWords: 18 }],
  },
  {
    id: 'uncomfortable-contrast',
    name: 'Uncomfortable Contrast',
    masterId: 'chan',
    category: 'persuasion',
    branch: 'persuasion',
    summary: 'Hold up what we say next to what we do.',
    why: 'People rarely act against a value they hold; they act without noticing the value applies. Putting the stated value beside the actual behaviour removes the not-noticing, which is usually all that was needed.',
    structure: [
      'State the value in the group’s own words',
      'Describe the behaviour, factually and without adjectives',
      'Let the gap sit',
      'Offer one concrete way to close it',
    ],
    whenToUse: 'Leadership teams, senior students, anyone who has stopped being challenged.',
    whenNotToUse:
      'When you are not also implicated. Naming a gap you are outside of is a lecture.',
    example:
      'We tell the little ones that respect means cleaning up after yourself. There are eleven water bottles on that bench and none of them are theirs. Ours are in there too.',
    tells: [{ kind: 'antithesis' }, { kind: 'concrete-nouns', min: 4 }],
  },
  {
    id: 'conversational-conviction',
    name: 'Conversational Conviction',
    masterId: 'chan',
    category: 'delivery',
    branch: 'presence',
    summary: 'Talk about serious things the way you talk to a friend.',
    why: 'Most speakers inflate register when the stakes rise, and the padding — the formal constructions, the throat-clearing — signals performance. Keeping ordinary speech under a serious subject makes the seriousness credible rather than staged.',
    structure: [
      'Say the serious thing at the volume you would use across a table',
      'Use contractions and ordinary words',
      'Do not announce that it is important',
      'Let the content carry the weight',
    ],
    whenToUse: 'Devotionals, difficult news, anything where a raised register would feel false.',
    whenNotToUse:
      'Large rooms with no amplification, where you genuinely need to project to be heard.',
    example:
      'I am not going to build this up. Three of you are coasting, and I think you know which three. That is it — that is the whole talk.',
    tells: [{ kind: 'short-close', maxWords: 16 }],
  },

  // ---------------------------------------------------------------- Les Brown
  {
    id: 'direct-address',
    name: 'Direct Address',
    masterId: 'les-brown',
    category: 'engagement',
    branch: 'motivation',
    summary: 'Speak to one person, out loud, in a room full of people.',
    why: 'A message aimed at everybody is received by nobody in particular. Narrowing the address — “somebody here” — lets every listener decide whether it is about them, and the ones for whom it is true hear it as personal.',
    structure: [
      'Name the specific person you mean, without naming them',
      'Describe their situation precisely enough that they recognise it',
      'Speak to them singularly — “you”',
      'Leave room for everyone else to overhear',
    ],
    whenToUse: 'Group talks where one subgroup is the real audience.',
    whenNotToUse:
      'When the description is narrow enough to identify an individual. That is public correction wearing a disguise.',
    example:
      'Somebody in this room has already decided they are the least talented person on this mat. You have been quietly planning your exit since September. I am talking to you.',
    tells: [{ kind: 'phrases', any: ['somebody in', 'someone here', 'one of you', 'i am talking to you', 'i’m talking to you'], label: 'narrowed address' }],
  },
  {
    id: 'possibility-frame',
    name: 'Possibility Frame',
    masterId: 'les-brown',
    category: 'motivation',
    branch: 'motivation',
    summary: 'Describe who they could become, in specifics.',
    why: 'General praise — “you have so much potential” — cannot be acted on and is discounted immediately, especially by children who have heard it before. A described future is a target: concrete enough to aim at, and therefore concrete enough to fail toward productively.',
    structure: [
      'Pick one specific capability, not a trait',
      'Place it at a stated time',
      'Describe what it will look like from the outside',
      'Name the first thing that gets them there',
    ],
    whenToUse: 'Students who have stopped believing improvement applies to them.',
    whenNotToUse:
      'When you cannot honestly picture it. An invented future is a lie the listener will eventually check.',
    example:
      'By March you are the person the new white belts copy when they do not know what to do. Not because you are the best — because you never look confused. That starts with knowing the warm-up cold.',
    tells: [{ kind: 'concrete-nouns', min: 4 }, { kind: 'call-to-action' }],
  },
  {
    id: 'repeat-the-anchor',
    name: 'Repeat the Anchor',
    masterId: 'les-brown',
    category: 'closings',
    branch: 'motivation',
    summary: 'Give them one line, and give it to them more than once.',
    why: 'An audience retains a phrase, not a paragraph. Deciding in advance which phrase, and returning to it, means you choose what survives the walk to the car rather than leaving it to chance.',
    structure: [
      'Write the one sentence before you write anything else',
      'Say it early',
      'Say it in the middle, in a different context',
      'Say it last, alone',
    ],
    whenToUse: 'Anything over ninety seconds that you want remembered.',
    whenNotToUse:
      'Short instructions, where repetition just wastes the time you had.',
    example:
      'Your belt shows where you are. Your effort shows who you are becoming. … So when the drill gets boring, remember: your belt shows where you are. Your effort shows who you are becoming.',
    tells: [{ kind: 'callback' }, { kind: 'anaphora', minRepeats: 2 }],
  },

  // ---------------------------------------------------------- Tradition
  {
    id: 'reframing',
    name: 'Reframing',
    category: 'motivation',
    branch: 'motivation',
    summary: 'Change the frame around the facts without changing the facts.',
    why: 'Meaning is not in the event; it is in the category the listener files it under. Moving an event from “proof I am bad at this” to “information about what is untrained” leaves every fact intact and changes what the person does next.',
    structure: [
      'Say the facts back, accurately and without minimising',
      'Name the frame they are using',
      'Offer a different frame that fits the same facts',
      'Give the action the new frame makes obvious',
    ],
    whenToUse: 'Failure, plateaus, comparison to peers, any “I am just bad at this”.',
    whenNotToUse:
      'Before the feeling has been acknowledged. Reframing first is heard as being told you are wrong to be upset.',
    example:
      'You missed the board three times. That is real. It also tells us your distance is off, which is a two-week fix — it is not a talent problem, it is a measurement problem.',
    tells: [{ kind: 'antithesis' }, { kind: 'emotion-named' }],
    requires: ['name-the-feeling'],
  },
  {
    id: 'specific-call-to-action',
    name: 'Specific Call to Action',
    category: 'closings',
    branch: 'persuasion',
    summary: 'One action, one time, one place.',
    why: 'A general exhortation to try harder has no first step, so nothing happens. An action with a time and a place attached converts intention into something the listener can either do or notice themselves not doing — and that noticing is most of the value.',
    structure: [
      'Choose exactly one action',
      'Attach a time',
      'Attach a place or a person',
      'Make it small enough to be embarrassing to skip',
    ],
    whenToUse: 'The end of every talk, class and conversation that is meant to change anything.',
    whenNotToUse: 'When you have not decided what you actually want. Vagueness here is a planning failure.',
    example:
      'Before you leave tonight, tell one person at the desk which pattern you are fixing this week. Not all of them. One.',
    tells: [{ kind: 'call-to-action' }, { kind: 'short-close', maxWords: 20 }],
  },
  {
    id: 'story-hook',
    name: 'Story Hook',
    category: 'openings',
    branch: 'storytelling',
    summary: 'Open inside the moment, not at the background.',
    why: 'Background is the speaker organising their own thoughts out loud, and the audience pays for it with the attention they had at the start — the most valuable attention they will have all talk. Beginning mid-scene borrows interest immediately and lets the context arrive later, when it is wanted.',
    structure: [
      'Find the most vivid moment in the story',
      'Start one sentence before it',
      'Give context only when the listener needs it to follow',
      'Never open with “so I want to talk about”',
    ],
    whenToUse: 'The first ten seconds of anything.',
    whenNotToUse:
      'When the audience genuinely needs orientation to be safe or to act — briefings, instructions, warnings.',
    example:
      'The board did not break. Forty people were watching, and it did not break — and he stood there holding his hand.',
    tells: [{ kind: 'narrative-open' }, { kind: 'concrete-nouns', min: 3 }],
  },
  {
    id: 'silence-beat',
    name: 'The Beat',
    category: 'delivery',
    branch: 'presence',
    summary: 'Stop for one second before the line that matters.',
    why: 'A pause creates a small expectation, and the sentence that follows is heard as the answer to it. It also gives the previous idea somewhere to land — continuous speech means each sentence is buried by the next.',
    structure: [
      'Mark the one sentence you most want heard',
      'Finish the sentence before it, and stop',
      'Count one',
      'Deliver the line at normal volume',
    ],
    whenToUse: 'Once per talk, on the line you would put on a poster.',
    whenNotToUse:
      'Repeatedly. Constant pausing reads as searching for words, which is the opposite effect.',
    example: 'You have trained here for two years. … Nobody in this room outworks you. You know that.',
    tells: [{ kind: 'short-close', maxWords: 18 }],
  },
  {
    id: 'answer-the-question-asked',
    name: 'Answer the Question Asked',
    category: 'improvisation',
    branch: 'improvisation',
    summary: 'Say the direct answer first, then explain.',
    why: 'Under pressure most speakers explain toward an answer, which reads as evasion regardless of intent — and by the time the answer arrives the listener has decided you were dodging. Answer first and the explanation is heard as generosity instead of defence.',
    structure: [
      'Give the one-word or one-sentence answer',
      'Stop for a beat',
      'Then give the reasoning',
      'Do not add anything you were not asked for',
    ],
    whenToUse: 'Hostile questions, parent complaints, anything you did not see coming.',
    whenNotToUse:
      'When you genuinely do not know. “I do not know, and I will find out by Friday” is the direct answer there.',
    example:
      'No. He is not ready. The reason is the third pattern — he has the sequence and not the timing, and the examiner will ask for it slowly.',
    tells: [{ kind: 'short-close', maxWords: 20 }, { kind: 'phrases', any: ['the reason', 'because'], label: 'reason after answer' }],
  },
  {
    id: 'think-out-loud',
    name: 'Think Out Loud',
    category: 'improvisation',
    branch: 'improvisation',
    summary: 'Narrate your reasoning instead of pretending it was ready.',
    why: 'Filling an unexpected gap with confident-sounding nothing is transparent. Saying what you are weighing keeps you honest, keeps the room with you, and usually produces a better answer than the one you would have improvised — because you are actually thinking rather than performing having thought.',
    structure: [
      'Say plainly that you are working it out',
      'Name the two things you are weighing',
      'Reason to a position out loud',
      'State the position as a position, not a certainty',
    ],
    whenToUse: 'Questions with no prepared answer, in front of people who will know if you bluff.',
    whenNotToUse:
      'When you do have an answer. Manufactured deliberation is just a slower bluff.',
    example:
      'Let me think about that properly. On one side she has trained every week since January. On the other she has not once held the stance under fatigue. I think I am going to say not yet — and I would rather tell you that now than on the day.',
    tells: [
      { kind: 'phrases', any: ['let me think', 'i am weighing', 'i’m weighing', 'on one side', 'on the other'], label: 'reasoning narrated' },
      { kind: 'antithesis' },
    ],
  },
  // ---------------------------------------------------------------- Kennedy
  {
    id: 'the-turn',
    name: 'The Turn',
    masterId: 'jfk',
    category: 'rhetoric',
    branch: 'persuasion',
    summary: 'Say the clause, then say it back with the halves swapped.',
    why: 'Reversing a clause forces the listener to hold both orders at once, and the second one arrives sounding like a conclusion they reached rather than a claim you made. It is also unusually memorable: the shape is a hook, so the sentence survives long after the talk.',
    structure: [
      'Write the ordinary sentence',
      'Find its two halves',
      'Say it again with them swapped',
      'Keep it only if the reversal is actually true',
    ],
    whenToUse:
      'One line per talk, at the point you most want repeated afterwards. It works best when the reversal exposes something real rather than being clever.',
    whenNotToUse:
      'Any time the reversed version is not true. The construction sounds so convincing out loud that it will carry a false claim past people, which is precisely why it should be used carefully.',
    example:
      'Do not train until you can get it right. Train until you cannot get it wrong.',
    tells: [{ kind: 'antithesis' }, { kind: 'short-close', maxWords: 24 }],
    clips: [
      {
        file: 'jfk-ask-not.mp3',
        speaker: 'John F. Kennedy',
        occasion: 'Inaugural Address, 20 January 1961',
        seconds: 14,
        startsAt: 755,
        sourceUrl: 'https://archive.org/details/JohnF.KennedyInauguralAddress',
        recordedBy: 'John F. Kennedy Presidential Library (US National Archives)',
        listenFor:
          'The best-known example of the shape. Listen to how evenly the two halves are weighted and how he slows into the second one — the reversal is given room rather than rushed, which is what stops it sounding like wordplay.',
      },
      {
        file: 'jfk-chiasmus.mp3',
        speaker: 'John F. Kennedy',
        occasion: 'Inaugural Address, 20 January 1961',
        seconds: 25,
        startsAt: 470,
        sourceUrl: 'https://archive.org/details/JohnF.KennedyInauguralAddress',
        recordedBy: 'John F. Kennedy Presidential Library (US National Archives)',
        listenFor:
          'The more useful example, because the reversal carries an actual argument about fear rather than a slogan. Notice it arrives mid-passage at conversational volume, and that the surrounding sentences are plain — the turn stands out because nothing around it is competing.',
      },
    ],
  },
  // ---------------------------------------------------------------- Roosevelt
  {
    id: 'accumulating-list',
    name: 'The Accumulating List',
    masterId: 'fdr',
    category: 'rhetoric',
    branch: 'clarity',
    summary: 'Hold one sentence shape exactly and change only one word in it.',
    why: 'When the frame never varies, the listener stops processing grammar and starts counting. The scale of a thing is then established by the count itself rather than by any adjective, which is why it survives scepticism — you have not told them it was big, you have listed it until it was.',
    structure: [
      'Choose the one sentence shape',
      'Change only the single variable inside it',
      'Keep your volume and pace flat',
      'Stop as soon as the count has landed',
    ],
    whenToUse:
      'When a group has heard the headline and shrugged. Listing the instances plainly re-establishes a scale that summarising it away destroys.',
    whenNotToUse:
      'When there are only two instances, or when you would have to stretch to reach a third. A short list draws attention to how short it is.',
    example:
      'On Monday the mats were left out. On Tuesday the mats were left out. On Wednesday I put them away myself. Nobody is in trouble. I am telling you what a week looks like from where I stand.',
    tells: [
      { kind: 'anaphora', minRepeats: 3 },
      { kind: 'concrete-nouns', min: 4 },
    ],
    clips: [
      {
        file: 'fdr-anaphora.mp3',
        speaker: 'Franklin D. Roosevelt',
        occasion: 'Address to Congress, 8 December 1941',
        seconds: 36,
        startsAt: 171,
        sourceUrl: 'https://archive.org/details/FranklinDelanoRooseveltDayOfInfamySpeech',
        recordedBy: 'Franklin D. Roosevelt Presidential Library and Museum (US National Archives)',
        listenFor:
          'One sentence shape, held exactly, with only the place name changing. He does not raise his volume and he does not speed up — the flatness is the technique. Count the entries and notice that the list, not any single line, is what establishes the scale.',
      },
    ],
  },
]

export const TECHNIQUE_BY_ID = new Map(TECHNIQUES.map((technique) => [technique.id, technique]))

export function technique(id: string | undefined | null): Technique | undefined {
  return id ? TECHNIQUE_BY_ID.get(id) : undefined
}

export function techniquesForMaster(masterId: string): Technique[] {
  return TECHNIQUES.filter((entry) => entry.masterId === masterId)
}
