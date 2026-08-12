import type { Master } from '@/lib/types'

/**
 * The Hall of Masters.
 *
 * These entries describe what each communicator *did to language* — the part
 * that transfers. They do not endorse anyone's politics, theology or persona,
 * and every Master page carries the same warning: take the principle, leave the
 * personality. Impersonation is the failure mode this section is designed
 * against, so it is named out loud rather than hoped away.
 *
 * Every example anywhere in this app is written for this app. There are no
 * transcript excerpts.
 */
export const MASTERS: Master[] = [
  {
    id: 'king',
    name: 'Martin Luther King Jr.',
    role: 'Minister and civil rights leader',
    years: '1929–1968',
    signature: 'Repetition that gets heavier each time it returns',
    study:
      'King built passages the way music is built: a fixed phrase returns, and everything around it grows. The repeated words are the floor the audience stands on; the changing words are the climb. He also refused to leave a crowd in the grievance — the structure almost always turns toward a described future rather than ending in the complaint.',
    caution:
      'Learn the architecture of his sentences, not the cadence of his voice. Borrowed cadence sounds like costume. The pattern works in a quiet room at conversational volume.',
    initials: 'MLK',
    accent: '#c98f3f',
    techniqueIds: ['rising-refrain', 'moral-contrast', 'concrete-image', 'hopeful-close'],
  },
  {
    id: 'lincoln',
    name: 'Abraham Lincoln',
    role: 'Lawyer and 16th US President',
    years: '1809–1865',
    signature: 'Enormous ideas carried by very small words',
    study:
      'Lincoln wrote short. He reached for the plainest available word almost every time, which is harder than it sounds, and he was willing to be brief in moments that invited grandeur. He also tended to open from common ground — the thing both sides already believed — before moving anywhere contested.',
    caution:
      'The nineteenth-century sentence rhythm does not transfer. The discipline of the short word does.',
    initials: 'AL',
    accent: '#8f9bb0',
    techniqueIds: ['plain-words', 'shared-ground', 'weight-of-brevity'],
  },
  {
    id: 'churchill',
    name: 'Winston Churchill',
    role: 'Writer and wartime Prime Minister',
    years: '1874–1965',
    signature: 'Naming the worst of it before asking for resolve',
    study:
      'Churchill rarely softened the difficulty. He would state the cost in flat, concrete terms first, and only then ask for the effort — which is why the ask did not sound like denial. He also leaned hard on groups of three, where the third item carries the weight.',
    caution:
      'Grand vocabulary and wartime stakes do not belong in a Tuesday class. What belongs is the order: difficulty first, resolve second.',
    initials: 'WC',
    accent: '#a8875e',
    techniqueIds: ['name-the-hard-thing', 'rhythm-of-three', 'resolve-without-denial'],
  },
  {
    id: 'jobs',
    name: 'Steve Jobs',
    role: 'Co-founder of Apple',
    years: '1955–2011',
    signature: 'One idea at a time, and a turn you did not see coming',
    study:
      'Jobs presented in single beats — one thought per breath, one claim per moment, almost nothing subordinate. He also built anticipation deliberately: set an expectation, let it settle, then turn it. His most-quoted commencement passage works because the story arrives before its meaning, never after.',
    caution:
      'The theatrical reveal is a tool, not a personality. Used on something trivial it reads as manipulation, and audiences only fall for it once.',
    initials: 'SJ',
    accent: '#9aa3ab',
    techniqueIds: ['one-idea-per-beat', 'reveal-structure', 'story-then-lesson'],
  },
  {
    id: 'sinek',
    name: 'Simon Sinek',
    role: 'Author on leadership and purpose',
    years: 'b. 1973',
    signature: 'Purpose stated before plan',
    study:
      'Sinek popularised putting the reason ahead of the instruction — people commit to a why and comply with a what. He also writes almost everything in the first person plural, which quietly makes the listener a participant rather than a target.',
    caution:
      'A stated purpose that is not actually yours is just a better-dressed sales line. This only works when the reason is true.',
    initials: 'SS',
    accent: '#7f9a8a',
    techniqueIds: ['start-with-why', 'belonging-frame'],
  },
  {
    id: 'brown',
    name: 'Brené Brown',
    role: 'Researcher on vulnerability and shame',
    years: 'b. 1965',
    signature: 'Disclosure that serves the listener',
    study:
      'Brown made self-disclosure usable in professional settings by tying it to a rule: you share the scar, not the open wound. The story is told after you have processed it, and it is told because it helps the person listening. She is also precise about separating what someone did from who someone is.',
    caution:
      'Vulnerability performed for effect is the opposite of the technique. If the disclosure is mainly about how it makes you look, it belongs in a journal.',
    initials: 'BB',
    accent: '#b08ba0',
    techniqueIds: ['earned-vulnerability', 'name-the-feeling', 'dignity-guard'],
  },
  {
    id: 'keller',
    name: 'Timothy Keller',
    role: 'Pastor and writer',
    years: '1950–2023',
    signature: 'Arguing with the strongest version of the objection',
    study:
      'Keller habitually stated the listener’s counter-argument better than they would have stated it themselves, then answered that version. He also worked by redefinition — showing that the question being asked was not quite the real question — and he moved deliberately from the intellectual to the personal rather than staying in either.',
    caution:
      'This app teaches the reasoning move, which is domain-neutral. It takes no position on his theology, and the technique works identically in a parent meeting.',
    initials: 'TK',
    accent: '#8c93b3',
    techniqueIds: ['anticipate-objection', 'redefine-the-premise', 'analogy-bridge', 'intellect-to-heart'],
  },
  {
    id: 'chan',
    name: 'Francis Chan',
    role: 'Pastor and author',
    years: 'b. 1967',
    signature: 'Plain talk aimed at the gap between what we say and what we do',
    study:
      'Chan speaks conversationally about high-stakes things, which removes the padding most speakers add when the subject is serious. His characteristic move is a question the listener cannot answer comfortably, followed by silence rather than rescue.',
    caution:
      'The discomfort has to serve the listener. Aimed carelessly at a ten-year-old, the same move is just shaming — the app checks for this.',
    initials: 'FC',
    accent: '#a3906f',
    techniqueIds: ['provocative-question', 'uncomfortable-contrast', 'conversational-conviction'],
  },
  {
    id: 'les-brown',
    name: 'Les Brown',
    role: 'Motivational speaker',
    years: 'b. 1945',
    signature: 'Talking to one person in a room of hundreds',
    study:
      'Brown addresses individuals — “somebody in here” — which turns a broadcast into something that feels aimed. He describes who a person could become in concrete, specific terms rather than praising them in general, and he leaves an audience holding one repeatable line.',
    caution:
      'Energy is not the technique; specificity is. Volume without a described future is just noise, and children in particular see through it fast.',
    initials: 'LB',
    accent: '#c2924f',
    techniqueIds: ['direct-address', 'possibility-frame', 'repeat-the-anchor'],
  },
]

export const MASTER_BY_ID = new Map(MASTERS.map((master) => [master.id, master]))

export function master(id: string | undefined): Master | undefined {
  return id ? MASTER_BY_ID.get(id) : undefined
}
