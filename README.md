# SpeakLab

A communication gym for iPhone. Five to eight minutes per session: one realistic
scenario, one micro-skill, a recorded attempt, one thing to change, an immediate
retry, an honest comparison, then a harder version of the same situation.

Built as a native SwiftUI app with a small server that holds the Anthropic API
key so the app never has to.

---

## Get it running

**You need a Mac with Xcode 15 or newer and an Apple ID.** Everything below
takes about ten minutes; only step 3 involves you making a decision.

### 1. Open and run

```bash
open ios/SpeakLab.xcodeproj
```

In Xcode:

1. Select the **SpeakLab** target → **Signing & Capabilities**
2. Set **Team** to your Apple ID (add one under Xcode → Settings → Accounts if
   you haven't). A free account is fine.
3. Change **Bundle Identifier** from `com.speaklab.app` to something unique —
   `com.yourname.speaklab` works.
4. Plug in your iPhone, pick it as the destination, press **Run**.

The first launch on a device asks you to trust the developer certificate:
**Settings → General → VPN & Device Management → your Apple ID → Trust**.

> With a free Apple account the app expires after 7 days and needs re-running
> from Xcode. A paid Developer Program account extends that to a year. That's
> an Apple policy, not a SpeakLab limitation.

### 2. Try it with no setup at all

The app works immediately with **no API key and no server**. It records,
transcribes on-device, measures your pace, pauses, fillers, repeated phrases and
sentence lengths, and coaches you from those measurements. Conversation mode
runs with a scripted stand-in character and says so on screen.

This is a real mode, not a demo: everything measurable still works offline.

### 3. Connect the AI coach

For contextual feedback on *what you actually said* — and for the simulated
people in conversation mode to react properly — the app needs Claude.

**Recommended: run the proxy.**

```bash
cd server
npm install
cp .env.example .env          # add your key from console.anthropic.com
npm run build && npm start
```

Then in the app: **Settings → AI coaching → Coaching server URL**. On the same
Wi-Fi, use your Mac's LAN address, e.g. `http://192.168.1.42:8787`
(`ipconfig getifaddr en0` prints it). `localhost` won't work from the phone.

To use it away from your desk, deploy the proxy — see `server/README.md` for
Fly.io/Render/Docker, and **set `SPEAKLAB_CLIENT_SECRET` before you do**.

**Quicker but weaker: a key on the device.** Settings → AI coaching →
*Development: use an API key directly*. The key goes into the iOS Keychain, not
the bundle or the repo. It is still a key sitting on a phone you can't rotate
remotely, so use it to try things out, not to live with.

---

## What's in the box

| Area | State |
| --- | --- |
| Training loop | Brief → skill → plan → record → measure → one target → retry → compare → transfer → rewards |
| Speaking mode | 11 scenarios incl. Buddy Week, leadership talk, attendance, wedding toast, price increase, baselines |
| Conversation mode | 12 scenarios with hidden character briefs; spoken or typed turns; the character speaks aloud |
| On-device metrics | Duration, WPM, articulation rate, fillers, hedges, repeated phrases, long pauses, pace variation, sentence timing, time-limit compliance |
| Conversation metrics | Talk share, open/closed/clarifying questions, stacked questions, acknowledgments, turn lengths |
| AI coaching | Structured JSON, schema-enforced at the proxy and re-validated in the app; quotes checked against the transcript |
| Curriculum | 11 paths, 35 micro-skills, level-gated unlocks |
| Progression | XP weighted toward applying feedback, levels, titles, mastery across *different* scenarios, spaced review, forgiving streaks, weekly goal |
| Golden nuggets | 18 principles, unlocked only when a session actually calls for one |
| Real-world missions | Assigned after a behaviour genuinely changes; self-reported; largest single award |
| Progress | Practice frequency, filler trend, pace trend, retention, baseline re-comparison, personal records |
| Privacy | Recordings local and deleted after analysis by default; three levels of deletion; plain-English disclosure of what leaves the device |

Full design rationale and known limitations:
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## Repository layout

```
ios/SpeakLab/
  Core/          Foundation-only. Curriculum, metrics, coaching contract,
                 progression. Unit-tested, no UI, no Apple frameworks.
  App/           Entry point, SwiftData models, services container.
  DesignSystem/  Palette, type scale, shared components.
  Services/      Audio, speech, synthesis, config, coaching, progression writes.
  Features/      Today, Session, Conversation, Paths, Progress, Settings.
server/          Node proxy that holds the API key.
Tests/           XCTest suite for Core.
Tools/           Project generator, syntax checker.
Package.swift    Builds Core alone so its tests run without Xcode.
```

`Core` is compiled twice — into the app target by Xcode, and as a SwiftPM
library for tests. Same files, no duplication.

---

## Running the tests

**Core logic** (works on macOS or Linux, no Xcode needed):

```bash
swift test        # 135 tests
```

Or press **⌘U** in Xcode to run the same suite against the app target.

**Proxy:**

```bash
cd server && npm test    # 31 tests against a stub Anthropic upstream
```

**Syntax-check every Swift file** (useful in CI without a Mac):

```bash
Tools/parse_check.sh
```

---

## Regenerating the Xcode project

The `.xcodeproj` is generated and committed. After adding or moving source
files:

```bash
gem install xcodeproj
ruby Tools/generate_xcodeproj.rb
```

Never resolve a merge conflict inside `project.pbxproj` by hand — regenerate.

---

## Renaming the app

1. `ios/SpeakLab/App/Branding.swift` — every user-visible string comes from here
2. `CFBundleDisplayName` in `ios/SpeakLab/Resources/Info.plist`
3. Optionally the folder and target names, then regenerate the project

No view code contains the literal product name.

---

## What it deliberately doesn't do

- **No score for charisma, confidence, authority or personality.** None of those
  are observable from a recording. The rubric grades only behaviours with
  evidence behind them.
- **No claim to have heard your voice.** The model receives a transcript and
  measurements, and is told so explicitly. Anything about pace or pausing comes
  from timing data and is labelled that way.
- **No interruption count in conversation mode.** Turns are taken one at a time,
  so you physically can't talk over the character. Reporting a number would be
  inventing one.
- **No reward for opening the app.** XP comes from attempts, retries, applying
  feedback, transfer, review and real-world use — nothing else.
- **No punishment for missing days.** Streaks have a weekly recovery, and a
  lapsed streak restarts quietly.
- **It is not therapy.** Anxiety ratings are your own, before and after, for
  your own comparison. The app says so wherever it asks.
