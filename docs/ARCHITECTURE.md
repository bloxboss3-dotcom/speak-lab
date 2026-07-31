# Architecture and design decisions

Companion to the README. This covers *why* things are shaped the way they are,
what is known to be incomplete, and what to do next.

---

## The one idea everything follows from

An app that tells you flattering things about your speaking is worse than no
app, because it teaches you to trust a signal that isn't real. So the whole
system is organised around one distinction:

**Measurements** are computed on the device from the recording and its
transcript. They are facts. **Interpretations** come from Claude. They are
judgements, and they are constrained, checked, and labelled.

This shows up everywhere:

- `Core/Analysis` produces only measurable things and never a verdict.
- The prompt tells the model, in its ground rules, that it has *not heard the
  audio* and must not comment on tone, volume, warmth of sound, or emotion in
  the voice.
- The rubric has twelve dimensions, all behavioural. Charisma, confidence,
  authority, honesty and personality are absent by design.
- Every quote the model attributes to the learner is checked against the
  transcript (`TranscriptGrounding`). A quote that doesn't match is still shown,
  but visibly marked "Paraphrase" and loses its jump-to-moment affordance.
- Conversation mode reports "Interruptions: NOT MEASURED" rather than a number,
  because turns are push-to-talk and the learner cannot interrupt.

---

## Layers

```
┌────────────────────────────────────────────────────┐
│ Features/         SwiftUI screens, one per stage   │
│ Services/         Audio, speech, config, Coach     │
│ App/              SwiftData models, entry point    │
├────────────────────────────────────────────────────┤
│ Core/             Foundation only — no UIKit, no   │
│                   SwiftUI, no network. Unit-tested │
└────────────────────────────────────────────────────┘
                          │
                          ▼  HTTPS, transcript only
                 ┌──────────────────┐
                 │ server/ (Node)   │ ← holds the API key
                 └──────────────────┘
                          │
                          ▼
                   Anthropic API
```

`Core` being Foundation-only isn't an aesthetic choice. It means the learning
engine — scoring, progression, spaced review, the coaching contract, the prompt
construction — can be built and tested on any machine, including one with no
Xcode. That's how the 135 tests in this repo were written and run.

### Why prompts live in the app and schemas live on the server

The app builds every prompt and names a *task*; the proxy owns the JSON schema
for each task and the API key.

- Prompts are product logic. Iterating on coaching quality shouldn't need a
  deploy.
- Schemas are a security boundary. A client naming a task can't ask the model
  for an arbitrary response shape, which matters if the proxy is ever public.

The cost is that the schema exists in two places (`server/src/schemas.ts` and
`ResponseSchemas` in the app's development-only direct path). Drift surfaces as
a loud decode error rather than a half-empty card, because responses are
validated three times: by the API's structured outputs, by Ajv in the proxy,
and by `CoachingDecoder` in the app.

### Why the app never fails to give feedback

`Coach` wraps every model call. On any failure — no server, no network, a
refusal, malformed JSON, a schema mismatch — it falls through to
`LocalFeedbackEngine`, a rule-based coach that picks a target from the
measurements in priority order (over time limit → filler rate → long opening →
pace → repetition → sentence length → monotone delivery). The learner gets a
specific, evidenced target and a line explaining that it was coached on device.

Conversation mode has no honest offline equivalent of a simulated person, so it
uses a small scripted character and says "Rehearsal mode" on screen rather than
pretending.

---

## The training loop

`SessionViewModel.Stage` is the loop, made explicit so it can't silently skip
the retry:

```
brief → plan → recording → analyzing → feedback
      → recording(2) → comparing → comparison
      → transfer? → summary
```

Design decisions inside it:

- **Planning is capped at 90 characters** and the copy says not to script. A
  scripted talk is a recital and collapses when interrupted.
- **The retry instruction is one imperative sentence**, shown again on the
  recording screen while the learner speaks.
- **Comparison judges only the target.** `AttemptComparison.countsAsImprovement`
  requires `targetImproved && !changeWasSuperficial`. A second attempt that was
  longer, warmer or more polished but left the target untouched earns nothing,
  and the screen says which of the three outcomes it was.
- **Transfer is offered only after a genuine improvement**, and prefers a real
  catalogue scenario over one the model invented.
- **Bonus objectives are self-claimed.** "End on a callback" isn't something a
  transcript can settle, and a wrong automatic verdict is worse than an honest
  self-report.

---

## Progression

| Event | XP (applied tier) | Why |
| --- | --- | --- |
| Attempt completed | 25 | The rep counts, even if it went badly |
| Retry completed | 19 | Doing it twice is the mechanism |
| **Applied the feedback** | **56** | The behaviour the app exists to produce |
| Bonus objective | 10 | Self-claimed |
| Transfer completed | 44 | Survived a changed situation |
| Spaced review | 30 | Returning matters more than novelty |
| **Real-world report** | **60** | Transfer into life is the actual goal |
| Opening the app | 0 | — |

**Mastery cannot be farmed.** `MasteryEngine` gates each band on evidence count
*and* distinct scenarios: six perfect runs of the same scenario cannot reach
Fluent, because that proves memorisation. There's a test for exactly this.

**Spaced review** is a two-outcome SM-2 variant (the behaviour held, or it
didn't) with ease clamped to 1.4–2.8 and intervals capped at a year.

**Streaks forgive.** One recovery per week covers a missed day. A longer lapse
resets the count to 1, keeps the personal best, and the summary says "Starting
fresh. No penalty, no lecture."

---

## Privacy

- Recordings are written to Application Support, excluded from iCloud backup,
  and **deleted as soon as they're transcribed and measured** unless the learner
  opts to keep them.
- Recording state is unmissable: the screen tints, a red dot pulses, and a live
  waveform moves. `scenePhase != .active` cancels any in-progress recording.
- Audio never leaves the device. Transcription uses on-device recognition where
  the hardware supports it; when it can't, the app says so on the feedback
  screen rather than silently uploading.
- What goes to the proxy: transcript, scenario, measured numbers. Not audio.
- Three deletion levels in Settings: recordings only; recordings and
  transcripts (keeping progress); everything including Keychain entries.
- No analytics SDK, and nothing is sent for training or advertising.

---

## Known limitations

1. **The UI has not been compiled.** This repo was built on Linux, where no iOS
   SDK exists. Core and the proxy are genuinely built and tested (135 + 31
   tests); every Swift file passes `swiftc -parse`; the `.xcodeproj` is
   generated by the same library CocoaPods uses and verified to re-open. But
   `-parse` does not type-check, so **expect to fix a handful of compile errors
   on first build in Xcode** — most likely a SwiftUI modifier signature or a
   Charts overload. They'll be quick.
2. **No physical-device verification.** Microphone behaviour, on-device
   recognition quality, and speech-synthesis voices can only be judged on real
   hardware.
3. **Conversation retry comparison is approximate.** It compares the learner's
   joined turns using the speaking-comparison prompt. A conversation-native
   comparison prompt would be better.
4. **The proxy's rate limiter is in-memory and per-process.** Fine for one user;
   put a real limiter in front for anything more.
5. **The refusal-fallback path is untested against the live API.** It is on by
   default and degrades to a plain request if the account rejects the beta
   parameter, but the beta itself has only been exercised against a stub.
6. **`stop_details` is not propagated by the SDK's streaming accumulator**, so
   a refusal's category is usually absent. The 422 itself is reliable.
7. **The app icon is a placeholder.** The asset catalogue has the slot and the
   accent colour; drop a 1024×1024 PNG in to fill it.
8. **Speech recognition is English-biased.** It uses the device locale with an
   `en_US` fallback; the filler and acknowledgment lexicons are English-only.

---

## Suggested next steps

**Before anything else:** build it in Xcode, fix whatever the compiler finds,
and run one session end to end on the phone.

Then, roughly in order of value:

1. **Play the recording back on the feedback screen**, seeking to the quoted
   moment. `AudioPlayer` and `TranscriptGrounding.locate` already exist —
   this is UI work only, and it's the single biggest addition to how the
   feedback lands.
2. **A conversation-native comparison prompt**, replacing limitation 3.
3. **Periodic reassessment prompts** — the baseline pair exists and is
   compared, but nothing yet nudges the learner to re-baseline after N sessions.
4. **Notifications for due reviews.** Spaced review only works if the learner
   comes back on the right day.
5. **Widen the curriculum.** Adding a scenario is one array entry in
   `ScenarioLibrary`; content-integrity tests will catch a mistyped skill ID.
6. **Localise the lexicons** in `FillerLexicon` and the acknowledgment phrases
   in `ConversationMetricsCalculator` if you ever need a second language.

---

## Testing strategy

| Suite | Where | Count | Covers |
| --- | --- | --- | --- |
| Core | `Tests/SpeakLabCoreTests` | 135 | Metrics, question classification, decoding, grounding, XP, levels, mastery gating, review scheduling, streaks, content integrity, offline coach |
| Proxy | `server/src/test` | 31 | Validation, auth, rate limiting, schema enforcement, refusal, truncation, upstream error mapping, fallback degradation |
| Syntax | `Tools/parse_check.sh` | 50 files | Every Swift file parses |

The content-integrity tests are worth calling out: they check that every
scenario references a real skill and path, that transfer variants aren't easier
than their parents, that every conversation scenario has a complete hidden
brief, that the nine originally-specified scenarios still exist, and that no
golden nugget endorses a manipulation tactic. Content is hand-written, and these
catch the mistakes hand-writing produces. Two real content bugs were found this
way during the build.
