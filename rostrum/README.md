# Rostrum

A practice app for people who have to stand up and say something that matters.

It is not a course. There is no library to browse and no video to finish. Every
session is the same loop: study one thing a great communicator actually did to
language, take it apart, use it on a situation from your own week, get coached
on that specific technique, and then — days later, without being told — get
handed a situation that needs it and find out whether you reach for it.

Built for an instructor who teaches children, teenagers and student leaders, so
the scenarios are that world: a child who has just failed a grading, a
leadership team that has quietly stopped trying, a parent in the doorway after
class, a devotional on a Wednesday night.

## Running it

```bash
npm install
npm run dev            # http://localhost:3000
```

```bash
npm run typecheck
npm test               # 58 engine tests, no browser needed
npm run build && npm start
```

Node 22. No database, no account, no sign-in. Everything a learner does is kept
in `localStorage` on their own device under `rostrum.progress.v1`, and the
Profile screen has a button that erases it.

## Coaching, with and without a key

Copy `.env.example` to `.env.local` and add `ANTHROPIC_API_KEY` to have a model
judge the words. The key is read only by `src/app/api/coach/route.ts`, which
runs on the server; it is never sent to the browser and must never be given a
`NEXT_PUBLIC_` prefix.

**Without a key the app is still the app.** Every technique carries a list of
`tells` — checkable properties of the text, like "the same opening repeated
three or more times", "a following line longer than the refrain it answers", "a
closing sentence under twenty-two words". The offline evaluator in
`src/lib/coach/heuristics.ts` scores against those markers, which is enough to
coach a specific technique, to detect one used unprompted in a Field Test, and
to quote the strongest line back verbatim. It is capped at 90: it can see that a
pattern is present, but not whether the words were any good, and full marks for
"the markers were there" would teach people to satisfy a checklist.

Offline results are labelled `Offline coaching` on screen and say what they were
scored against. A detection reports `3 of 3 markers for it are in what you said`
rather than a confidence percentage, because marker coverage is what was
actually measured — a model's judgement is a different claim and keeps its
percentage.

## What it will not tell you

Scores come from a transcript and nothing else. The app never reports on tone of
voice, pace, volume, body language, eye contact, charisma or confidence — a
browser holding a text transcript cannot observe any of them, and a number
attached to one would be invented. Audio analysis could be added later; until it
is, none of those words appear anywhere in the feedback. This is stated on the
Profile screen too, not just here.

## The loop

| Screen | What it is for |
| --- | --- |
| **Today** | One card. What to do now, and nothing else to decide. |
| **Train** | Hook → micro lesson → decode a real example → build one → perform it. |
| **Coaching** | A score for the technique you were training, the strongest line you said, and one instruction for the next rep. |
| **Field Test** | A situation with no technique named. What you reach for is the measurement. |
| **Masters** | Nine people, what each did to language, and the caution that goes with them. |
| **Arsenal** | What you own, with the mastery stage of each. |
| **Skill tree** | The same techniques as nine limbs, coloured by mastery stage. |
| **Loadout** | Five slots. What you equip leads the plan in Speech Gym. |
| **Speech Gym** | Preparation for a talk you genuinely have to give this week. |
| **Motivation Lab** | The psychology, hedged where the evidence is thin. |
| **Profile** | Levels, streak, personal bests, and what the app refuses to claim. |

## Mastery

Six stages: Discovered → Learning → Practiced → Reliable → Integrated →
Mastered. The rule that makes them mean anything is that **you cannot climb past
Practiced by repeating a lesson.** Reliable and above require cold retrievals —
Field Tests where the technique was used without being named — plus breadth
across different situations, and Mastered additionally requires that ten days
have passed since you met it. Recognition is not retrieval, and rereading is not
learning; the gates are in `stageFor` in `src/lib/progression.ts`, in one place,
so the reward rules can be read and argued with.

Unprompted retrieval is worth 200 XP, the largest single award in the app, and
it is only credited from a Field Test, only for a technique already known, and
only above a confidence floor.

## Content

| | |
| --- | --- |
| Masters | 9 |
| Techniques | 34 |
| Lessons | 12 |
| Scenarios | 47 |
| Field Tests | 12 |
| Motivation Lab principles | 17 |
| Achievements | 13 |

All of it is TypeScript in `src/content/`, typed against `src/lib/types.ts`, and
covered by integrity tests. Every example line is written for this app.
There are no copyrighted speech transcripts here — the techniques are described
and demonstrated with original material.

Master entries teach the technique, never the person. Each one carries a
`caution` field, because the point is what King did with repetition or what
Churchill did with a monosyllable, not an endorsement of anyone's politics,
theology or persona.

The Motivation Lab hedges where the research hedges. Growth-mindset effects are
labelled contested rather than presented as settled; self-determination theory's
autonomy claim is stated with the limit that actually holds. Persuasion is
taught as something you do with people who keep their judgement — coercion,
deception, exploiting a known fear, humiliation and manipulation are not
techniques this app will teach.

## Layout

```
src/app/          Routes. Bottom nav: Today, Masters, Arsenal, Gym, Profile.
src/app/api/      The coaching route. The only place the API key exists.
src/components/   Perform (record/transcribe), Coaching, and the UI primitives.
src/content/      Masters, techniques, lessons, scenarios, field tests, the Lab.
src/lib/          Types, progression, mastery, review, tree, loadout, store.
src/lib/coach/    Prompts, tolerant JSON decoding, the offline evaluator.
```

`src/lib/engines.test.ts` runs the whole engine layer in Node — content
integrity, every detector, XP and levelling, the mastery gates, spaced review,
streaks, the tree, the loadout, and a persistence round trip.

## Deploying

Vercel, or anything that can run `next start`. It needs a server: the coaching
route is what keeps the API key out of the browser. Set `ANTHROPIC_API_KEY` as
an environment variable there if you want model coaching; leave it unset and the
deployment still works, offline-coached.

This app is a sibling of `web/` in the same repository, which is a different
take on the same problem and is deployed to GitHub Pages. Neither replaces the
other and both still build.
