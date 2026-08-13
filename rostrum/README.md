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
npm test               # 63 engine tests, no browser needed
npm run build && npm start
```

Node 22. No database, no account, no sign-in. Everything a learner does is kept
in `localStorage` on their own device under `rostrum.progress.v1`, and the
Profile screen has a button that erases it.

## Coaching, with and without a key

Copy `.env.example` to `.env.local` and add `ANTHROPIC_API_KEY` to have a model
judge the words. The key is read only by `src/app/api/coach/route.ts`, which
runs on the server; it is never sent to the browser and must never be given a
`NEXT_PUBLIC_` prefix. A static build has no server at all, so that route is not
part of it — see Deploying.

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

## Hearing it

Reading that a structure repeats teaches the shape. Hearing it teaches where the
pitch climbs and where the pause falls, which is most of why it works — so some
techniques carry a short recording of someone using it, with a note on what to
listen for.

The note is the point. A famous speech played end to end teaches very little;
being told which twenty seconds to attend to, and what is happening inside them,
teaches the move.

**Only US federal recordings are used.** A work of the US government carries no
copyright at all under 17 U.S.C. §105, which makes those recordings genuinely
free to host. That rule is deliberately narrow and rules out almost every famous
speech of the last century: King's estate holds copyright until the end of 2058
and enforces it, and a broadcaster's recording of an otherwise public-domain
speech is still the broadcaster's recording. Nothing here relies on fair use.

Each clip stores who recorded it and a link to the archive item, and the screen
shows both — the provenance travels with the audio rather than living in a
commit message. Clip boundaries were taken from a transcript of the recording,
and each clip was transcribed again afterwards to confirm it contains the
passage it claims to.

A clip demonstrates a technique; it does not own it. Roosevelt using a repeated
structure does not make repetition his, so the speaker on a clip is often not
the master the technique is credited to.

### Your own recordings

Most of the Hall therefore has no shipped clip, which is a limit on what this
repository may publish rather than on what its owner may study. Any technique
will accept a recording you attach yourself: it is stored in IndexedDB in your
browser, on your device, and is never uploaded, never committed, and not part of
the build. The Profile screen reports how much is stored so it is never a
surprise, and each one can be deleted from the technique page.

This distinction is the whole of it. Publishing someone's recording is the app's
problem; playing a copy of one you already have, for your own practice, is not
something the app has any business policing.

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
| **Masters** | Eleven people, what each did to language, and the caution that goes with them. |
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
| Masters | 11 |
| Techniques | 36 |
| Lessons | 12 |
| Scenarios | 47 |
| Field Tests | 12 |
| Motivation Lab principles | 17 |
| Achievements | 13 |
| Speech clips | 5 |

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
public/clips/     Public-domain speech excerpts, with provenance in the content.
src/lib/          Types, progression, mastery, review, tree, loadout, store.
src/lib/coach/    Prompts, tolerant JSON decoding, the offline evaluator.
```

`src/lib/engines.test.ts` runs the whole engine layer in Node — content
integrity, every detector, XP and levelling, the mastery gates, spaced review,
streaks, the tree, the loadout, and a persistence round trip.

## Deploying

Two modes, from the same source.

**With a server** — Vercel, or anything that runs `next start`:

```bash
npm run build && npm start
```

`/api/coach` exists, so setting `ANTHROPIC_API_KEY` there gets you model
coaching. This is the better app.

**As static files** — GitHub Pages, or any static host:

```bash
ROSTRUM_BASE_PATH=/your-repo/rostrum npm run build:static   # writes out/
```

There is no server in this mode, so `/api/coach` is not built and there is no
model coaching — the offline evaluator handles everything, and the Profile
screen says so rather than describing a coaching path that cannot exist. Every
other feature is identical, because all of them were already browser-side.

The exclusion works by dropping the `ts` page extension: screens are `.tsx` and
route handlers are `.ts`, so the route disappears from that build and stays in
the other. `npm run check:static` fails the build if a routable file is ever
written as `.ts`, which would otherwise vanish from the static site silently.
The five `[param]` routes each have a `generateStaticParams` in a small server
shell over the existing screen, because the export needs every id up front and
that function cannot live in a `'use client'` file.

CI builds both modes. This repository publishes SpeakLab (`web/`) at the root of
its Pages site and Rostrum beneath it at `/rostrum/`; neither replaces the other
and all of it still builds.
