import Foundation

/// The skill tree: paths, and the micro-skills inside them.
///
/// Content lives in code rather than a bundled JSON file so that adding a skill
/// is a compile-checked change. `Curriculum` is the only place that knows the
/// shape of the tree; everything else looks skills up by ID.
public enum Curriculum {

    // MARK: - Paths

    public static let paths: [SkillPath] = [
        SkillPath(
            id: "clear-concise",
            name: "Clear and Concise",
            tagline: "Say the thing, then stop.",
            symbol: "scissors",
            accentHex: "#E2B04A",
            skillIDs: ["bottom-line-first", "one-idea-per-sentence", "cut-the-runway", "plain-words"],
            unlocksAtLevel: 1
        ),
        SkillPath(
            id: "structure-story",
            name: "Structure and Story",
            tagline: "Give people something to hold onto.",
            symbol: "square.stack.3d.up",
            accentHex: "#6FA8DC",
            skillIDs: ["signpost", "rule-of-three", "concrete-story", "callback-close"],
            unlocksAtLevel: 1
        ),
        SkillPath(
            id: "vocal-delivery",
            name: "Vocal Delivery",
            tagline: "Pace, pause, emphasis — used on purpose.",
            symbol: "waveform",
            accentHex: "#C98BDB",
            skillIDs: ["deliberate-pause", "pace-shift", "land-the-line"],
            unlocksAtLevel: 2
        ),
        SkillPath(
            id: "warmth-connection",
            name: "Warmth and Connection",
            tagline: "Be someone people want to talk to.",
            symbol: "heart.text.square",
            accentHex: "#E28F6F",
            skillIDs: ["name-and-notice", "acknowledge-before-answer", "generous-assumption"],
            unlocksAtLevel: 1
        ),
        SkillPath(
            id: "listening-questions",
            name: "Listening and Questions",
            tagline: "Find out before you speak.",
            symbol: "ear",
            accentHex: "#7FBF9E",
            skillIDs: ["open-question", "reflect-back", "hold-the-silence", "one-question-at-a-time"],
            unlocksAtLevel: 1
        ),
        SkillPath(
            id: "persuasion",
            name: "Persuasion",
            tagline: "Move people without pushing them.",
            symbol: "arrow.triangle.branch",
            accentHex: "#D9846F",
            skillIDs: ["diagnose-first", "link-to-their-value", "evidence-not-adjectives", "preserve-autonomy"],
            unlocksAtLevel: 3
        ),
        SkillPath(
            id: "ethical-sales",
            name: "Ethical Sales Conversations",
            tagline: "Diagnose, then recommend. Or don't.",
            symbol: "checkmark.seal",
            accentHex: "#8FBF7F",
            skillIDs: ["discovery-before-pitch", "their-language-benefits", "confirm-fit", "specific-close"],
            unlocksAtLevel: 4
        ),
        SkillPath(
            id: "objection-handling",
            name: "Objection Handling",
            tagline: "Treat the objection as information.",
            symbol: "shield.lefthalf.filled",
            accentHex: "#BF9F5F",
            skillIDs: ["ask-what-behind-it", "answer-the-real-one", "no-defensive-tone"],
            unlocksAtLevel: 4
        ),
        SkillPath(
            id: "leadership-comms",
            name: "Leadership Communication",
            tagline: "Set direction people can act on.",
            symbol: "flag",
            accentHex: "#6F9FD9",
            skillIDs: ["standard-not-scold", "why-then-what", "clear-ask"],
            unlocksAtLevel: 2
        ),
        SkillPath(
            id: "difficult-conversations",
            name: "Difficult Conversations",
            tagline: "Say the hard thing and keep the relationship.",
            symbol: "person.2.wave.2",
            accentHex: "#D96F8F",
            skillIDs: ["lead-with-care", "facts-not-character", "stay-in-the-room"],
            unlocksAtLevel: 3
        ),
        SkillPath(
            id: "speaking-confidence",
            name: "Public-Speaking Confidence",
            tagline: "Gradual exposure, one rung at a time.",
            symbol: "figure.stand",
            accentHex: "#9FA8B8",
            skillIDs: ["speak-to-one-person", "recover-out-loud", "hold-the-opening"],
            unlocksAtLevel: 1
        )
    ]

    // MARK: - Micro-skills

    private static let clearConciseSkills: [MicroSkill] = [
        MicroSkill(
            id: "bottom-line-first",
            pathID: "clear-concise",
            name: "Bottom line first",
            summary: "State the main point in your first sentence, before any context.",
            whyItMatters: "Listeners decide how hard to concentrate in the first few seconds. If the point arrives late, they spend your best material trying to work out where you're going.",
            strongExample: "\"Buddy Week is the 14th to the 18th. Your child brings a friend to class, free. Here's how it works.\"",
            weakExample: "\"So, um, we've been thinking for a while about how to grow the school, and one thing we've talked about — and this has worked at other schools — is a kind of week where…\"",
            retryCue: "First sentence: the point. Context after.",
            rubricDimension: .opening
        ),
        MicroSkill(
            id: "one-idea-per-sentence",
            pathID: "clear-concise",
            name: "One idea per sentence",
            summary: "Break compound sentences apart. Full stop, then the next idea.",
            whyItMatters: "Chained clauses force the listener to hold three things at once. Short sentences let each idea land before the next arrives.",
            strongExample: "\"Attendance matters. Skills fade in about two weeks. Coming twice a week keeps what they've built.\"",
            weakExample: "\"Attendance matters because skills fade quite quickly if they're not practised, which is why we recommend twice a week, although obviously life happens.\"",
            retryCue: "Short sentences. Full stop after each idea.",
            rubricDimension: .clarity
        ),
        MicroSkill(
            id: "cut-the-runway",
            pathID: "clear-concise",
            name: "Cut the runway",
            summary: "Delete the throat-clearing before your first real sentence.",
            whyItMatters: "\"So basically what I wanted to say is…\" costs you the moment where people are paying most attention.",
            strongExample: "\"Two things before you go.\"",
            weakExample: "\"Okay so, um, before everyone heads off, I just wanted to quickly mention, if that's alright, a couple of things…\"",
            retryCue: "Delete your first sentence. Start at the second one.",
            rubricDimension: .concision
        ),
        MicroSkill(
            id: "plain-words",
            pathID: "clear-concise",
            name: "Plain words",
            summary: "Replace insider or abstract vocabulary with what you'd say to a friend.",
            whyItMatters: "Jargon makes the speaker feel precise and the listener feel excluded. Plain words are understood at speed.",
            strongExample: "\"They'll spar with a partner their own size.\"",
            weakExample: "\"They'll engage in controlled kumite within an appropriate skill-differential bracket.\"",
            retryCue: "Say it the way you'd say it to a friend.",
            rubricDimension: .clarity
        )
    ]

    private static let structureStorySkills: [MicroSkill] = [
        MicroSkill(
            id: "signpost",
            pathID: "structure-story",
            name: "Signpost",
            summary: "Tell people how many points are coming, then number them out loud.",
            whyItMatters: "A listener who knows there are three points can relax and follow. A listener who doesn't is quietly wondering when you'll finish.",
            strongExample: "\"Three things. First, the dates. Second, what it costs. Third, what I need from you.\"",
            weakExample: "\"There's the dates, and cost is a thing, oh and also I need something from you at the end.\"",
            retryCue: "Say how many points, then number them.",
            rubricDimension: .organization
        ),
        MicroSkill(
            id: "rule-of-three",
            pathID: "structure-story",
            name: "Three, not seven",
            summary: "Cut your list to three items. Keep the strongest three.",
            whyItMatters: "People remember three. Seven reads as a list of everything you could think of, and dilutes the strong items.",
            strongExample: "\"Focus, fitness, and finishing what you start.\"",
            weakExample: "\"Focus, fitness, discipline, respect, coordination, confidence, resilience, and making friends.\"",
            retryCue: "Three items. Cut the rest.",
            rubricDimension: .concision
        ),
        MicroSkill(
            id: "concrete-story",
            pathID: "structure-story",
            name: "One concrete story",
            summary: "Replace the general claim with one specific thirty-second story.",
            whyItMatters: "Abstract claims are agreed with and forgotten. A specific person doing a specific thing is remembered and repeated.",
            strongExample: "\"Maya couldn't hold a plank for ten seconds in January. In June she held it while the whole class counted her up to sixty.\"",
            weakExample: "\"Students really build a lot of physical and mental resilience over time.\"",
            retryCue: "Tell one story about one person. Name, moment, change.",
            rubricDimension: .specificity
        ),
        MicroSkill(
            id: "callback-close",
            pathID: "structure-story",
            name: "Close on the callback",
            summary: "End by returning to the image or phrase you opened with.",
            whyItMatters: "A callback signals 'that's the end' without you having to say 'so, yeah, that's it', and makes the whole thing feel designed.",
            strongExample: "\"…and that's why we count out loud. Sixty seconds, whole class. See you Thursday.\"",
            weakExample: "\"So yeah. That's pretty much everything. Any questions? No? Okay.\"",
            retryCue: "End by echoing your opening line.",
            rubricDimension: .ending
        )
    ]

    private static let vocalDeliverySkills: [MicroSkill] = [
        MicroSkill(
            id: "deliberate-pause",
            pathID: "vocal-delivery",
            name: "Pause instead of filling",
            summary: "When you'd reach for 'um', close your mouth for one full second instead.",
            whyItMatters: "A pause reads as control. A filler reads as searching. The silence feels far longer to you than to anyone listening.",
            strongExample: "\"Buddy Week starts Monday. [pause] Bring one friend.\"",
            weakExample: "\"Buddy Week starts Monday, um, and, uh, you can bring, like, a friend.\"",
            retryCue: "Every time you want to say 'um', close your mouth and count one.",
            rubricDimension: .clarity
        ),
        MicroSkill(
            id: "pace-shift",
            pathID: "vocal-delivery",
            name: "Slow down for the important part",
            summary: "Drop your speed noticeably on the sentence that matters most.",
            whyItMatters: "If everything is delivered at one speed, the listener has no way to tell which sentence was the point.",
            strongExample: "Normal pace through the setup, then markedly slower: \"She. Held it. For sixty seconds.\"",
            weakExample: nil,
            retryCue: "Pick your key sentence. Say it noticeably slower than the rest.",
            rubricDimension: .organization
        ),
        MicroSkill(
            id: "land-the-line",
            pathID: "vocal-delivery",
            name: "Land the last line",
            summary: "Finish the final sentence and stop. No trailing 'so yeah', no upward inflection.",
            whyItMatters: "Trailing off invites the audience to decide whether you meant it. A clean stop tells them you did.",
            strongExample: "\"Sign-up sheet's by the door. See you Monday.\" [stop]",
            weakExample: "\"Sign-up sheet's by the door, so, yeah, if you want to, or not, that's fine too…\"",
            retryCue: "Say your last sentence, then stop completely.",
            rubricDimension: .ending
        )
    ]

    private static let warmthSkills: [MicroSkill] = [
        MicroSkill(
            id: "name-and-notice",
            pathID: "warmth-connection",
            name: "Name and notice",
            summary: "Use the person's name and mention one specific thing you noticed.",
            whyItMatters: "Generic friendliness is forgettable. Evidence that you were actually paying attention is not.",
            strongExample: "\"Priya — I saw Sam stick with that partner drill even when it got hard. That's not nothing on a first day.\"",
            weakExample: "\"Hi! Thanks so much for coming, we're really glad to have you!\"",
            retryCue: "Use their name. Name one thing you actually saw.",
            rubricDimension: .warmthAndRespect
        ),
        MicroSkill(
            id: "acknowledge-before-answer",
            pathID: "warmth-connection",
            name: "Acknowledge before you answer",
            summary: "Say the thing they're feeling back to them before you respond to it.",
            whyItMatters: "An answer that arrives before the person feels heard is experienced as a rebuttal, however correct it is.",
            strongExample: "\"That's a real cost, and you're weighing it against everything else this month. Can I ask what part of it is the sticking point?\"",
            weakExample: "\"Actually, when you break it down per class, it works out cheaper than most activities.\"",
            retryCue: "Before answering, say back what they're feeling. Then pause.",
            rubricDimension: .listeningAndAcknowledgment
        ),
        MicroSkill(
            id: "generous-assumption",
            pathID: "warmth-connection",
            name: "Generous assumption",
            summary: "Open with the most charitable reading of their behaviour.",
            whyItMatters: "People defend themselves against accusation and engage with curiosity. The generous reading is also usually the true one.",
            strongExample: "\"I'm guessing the last few weeks have been busy rather than anything about the class — am I right?\"",
            weakExample: "\"We've noticed a real drop-off in commitment lately.\"",
            retryCue: "Open with the kindest explanation that could be true.",
            rubricDimension: .warmthAndRespect
        )
    ]

    private static let listeningSkills: [MicroSkill] = [
        MicroSkill(
            id: "open-question",
            pathID: "listening-questions",
            name: "Ask an open question",
            summary: "Ask something that cannot be answered with yes or no.",
            whyItMatters: "Closed questions confirm what you already believe. Open questions tell you what you were missing.",
            strongExample: "\"What made you look for a class for Sam right now?\"",
            weakExample: "\"Did you enjoy the class?\"",
            retryCue: "Ask one question starting with what or how. Then stop talking.",
            rubricDimension: .questionQuality
        ),
        MicroSkill(
            id: "reflect-back",
            pathID: "listening-questions",
            name: "Reflect it back",
            summary: "Say their point back in your own words before you add yours.",
            whyItMatters: "It proves you listened, and it catches misunderstandings while they're still cheap to fix.",
            strongExample: "\"So it's less about the fighting side and more that he's been shrinking at school. Have I got that right?\"",
            weakExample: "\"Right, yeah, totally. So what we do here is…\"",
            retryCue: "Say their point back in your words. Check you've got it.",
            rubricDimension: .listeningAndAcknowledgment
        ),
        MicroSkill(
            id: "hold-the-silence",
            pathID: "listening-questions",
            name: "Hold the silence",
            summary: "After you ask, wait. Do not answer your own question.",
            whyItMatters: "The most useful thing a person says usually arrives after the pause you were tempted to fill.",
            strongExample: "\"What's worrying you most about it?\" [waits]",
            weakExample: "\"What's worrying you most about it? Is it the cost? Or the time? Because a lot of parents say the time.\"",
            retryCue: "Ask your question, then say nothing until they answer.",
            rubricDimension: .questionQuality
        ),
        MicroSkill(
            id: "one-question-at-a-time",
            pathID: "listening-questions",
            name: "One question at a time",
            summary: "Ask a single question and let it be answered before asking another.",
            whyItMatters: "Stacked questions get answered selectively — usually the easiest one — and you lose the answer you needed.",
            strongExample: "\"What does a good outcome look like for Sam?\"",
            weakExample: "\"What are you hoping for — is it confidence, or fitness, or the discipline side, or making friends?\"",
            retryCue: "One question. Nothing after the question mark.",
            rubricDimension: .questionQuality
        )
    ]

    private static let persuasionSkills: [MicroSkill] = [
        MicroSkill(
            id: "diagnose-first",
            pathID: "persuasion",
            name: "Diagnose before you recommend",
            summary: "Understand their situation before proposing anything.",
            whyItMatters: "A recommendation made before diagnosis is a guess, and people can tell. It also wastes your strongest argument on the wrong problem.",
            strongExample: "\"Before I suggest anything — what's changed recently that made this feel urgent?\"",
            weakExample: "\"I'd definitely put him in the three-a-week programme.\"",
            retryCue: "Ask about their situation before you propose anything.",
            rubricDimension: .questionQuality
        ),
        MicroSkill(
            id: "link-to-their-value",
            pathID: "persuasion",
            name: "Link to what they said they wanted",
            summary: "Connect your recommendation to their own stated words, not your favourite benefit.",
            whyItMatters: "People are persuaded by their own reasons. Quoting their words back makes the recommendation theirs, not yours.",
            strongExample: "\"You said you want him to stop shrinking when things get hard. That's exactly what the belt tests are for.\"",
            weakExample: "\"Our programme builds tremendous discipline and character.\"",
            retryCue: "Quote their own words, then connect your point to them.",
            rubricDimension: .audienceAdaptation
        ),
        MicroSkill(
            id: "evidence-not-adjectives",
            pathID: "persuasion",
            name: "Evidence, not adjectives",
            summary: "Replace 'amazing', 'incredible', 'life-changing' with a specific observable fact.",
            whyItMatters: "Adjectives are the speaker's opinion. Facts let the listener form their own, which is the only kind that sticks.",
            strongExample: "\"Eleven of our teens have taught a class this year.\"",
            weakExample: "\"The confidence transformation is genuinely incredible.\"",
            retryCue: "Delete every adjective. Replace one with a number or an example.",
            rubricDimension: .specificity
        ),
        MicroSkill(
            id: "preserve-autonomy",
            pathID: "persuasion",
            name: "Leave the door open",
            summary: "Say plainly that the decision is theirs and that no is a fine answer.",
            whyItMatters: "Pressure produces compliance that reverses in the car park. Explicit autonomy produces decisions that hold — and it's the honest thing to do.",
            strongExample: "\"Take the week. If it's not right for you, tell me and I'll stop asking.\"",
            weakExample: "\"I've only got two spots left and they'll be gone tonight.\"",
            retryCue: "Say out loud that the choice is theirs, and mean it.",
            rubricDimension: .warmthAndRespect
        )
    ]

    private static let salesSkills: [MicroSkill] = [
        MicroSkill(
            id: "discovery-before-pitch",
            pathID: "ethical-sales",
            name: "Discovery before pitch",
            summary: "Ask at least two real questions before you describe anything you offer.",
            whyItMatters: "You cannot recommend well without knowing the problem, the desired outcome, and the barrier. Pitching first means guessing.",
            strongExample: "\"What's she like at home when something's hard? …And what would you want to be different in six months?\"",
            weakExample: "\"Let me walk you through our three membership tiers.\"",
            retryCue: "Two real questions before you mention anything you sell.",
            rubricDimension: .questionQuality
        ),
        MicroSkill(
            id: "their-language-benefits",
            pathID: "ethical-sales",
            name: "Benefits in their language",
            summary: "Describe the outcome using the words they used, not your feature names.",
            whyItMatters: "Feature language makes people translate. Their own language needs no translation and proves you were listening.",
            strongExample: "\"So — fewer meltdowns when homework gets hard. That's what the belt system is actually training.\"",
            weakExample: "\"Our curriculum includes a structured progression framework.\"",
            retryCue: "Describe the benefit using their exact words.",
            rubricDimension: .benefitExplanation
        ),
        MicroSkill(
            id: "confirm-fit",
            pathID: "ethical-sales",
            name: "Confirm fit, don't push",
            summary: "Check out loud whether this is actually right for them — including whether it isn't.",
            whyItMatters: "Confirming fit filters out the people who'd have quit in six weeks, and it's the difference between selling and helping.",
            strongExample: "\"Honestly — if the twice-a-week is going to be a fight every Tuesday, once a week is a better start. Which sounds more like your reality?\"",
            weakExample: "\"So shall we get you signed up for the full programme?\"",
            retryCue: "Ask whether this is actually right for them. Accept the answer.",
            rubricDimension: .concernHandling
        ),
        MicroSkill(
            id: "specific-close",
            pathID: "ethical-sales",
            name: "Make the next step tiny and specific",
            summary: "End with one concrete, easy action and a time.",
            whyItMatters: "'Let me know' puts the work on them and dies quietly. A specific small step gets taken.",
            strongExample: "\"Come Thursday at 5. I'll hold a spot under Sam's name — no charge if you don't stay.\"",
            weakExample: "\"Have a think about it and let me know if you're interested.\"",
            retryCue: "End with one specific action, with a day and a time.",
            rubricDimension: .ending
        )
    ]

    private static let objectionSkills: [MicroSkill] = [
        MicroSkill(
            id: "ask-what-behind-it",
            pathID: "objection-handling",
            name: "Ask what's behind it",
            summary: "Before answering an objection, ask what part of it is the real sticking point.",
            whyItMatters: "'Too expensive' can mean the price, the commitment, the value, or a conversation happening at home. Answering the wrong one changes nothing.",
            strongExample: "\"Can I ask — is it the monthly number, or is it that you're not sure it'll be worth it yet?\"",
            weakExample: "\"It's actually only about eight pounds a class when you work it out.\"",
            retryCue: "Ask what part of the concern is the real one, before answering.",
            rubricDimension: .concernHandling
        ),
        MicroSkill(
            id: "answer-the-real-one",
            pathID: "objection-handling",
            name: "Answer the real objection",
            summary: "Address the concern they actually raised, in their terms, without detouring.",
            whyItMatters: "Answering an adjacent, easier objection is transparently evasive and costs you trust you had.",
            strongExample: "\"You're worried you'll pay for a term he drops out of. That's fair. Here's what we do about that.\"",
            weakExample: "\"Well, the value you get is really quite exceptional compared to other activities.\"",
            retryCue: "Name their actual concern out loud, then answer that one.",
            rubricDimension: .concernHandling
        ),
        MicroSkill(
            id: "no-defensive-tone",
            pathID: "objection-handling",
            name: "Drop the defence",
            summary: "Remove 'actually', 'to be fair', 'with respect', and any justification of yourself.",
            whyItMatters: "Defensive markers tell the listener you've taken it personally, which turns a question into a conflict.",
            strongExample: "\"You're right that we changed the timetable in April. That was disruptive for you.\"",
            weakExample: "\"To be fair, we did email everyone about the timetable change.\"",
            retryCue: "No 'actually', no 'to be fair', no defending yourself.",
            rubricDimension: .warmthAndRespect
        )
    ]

    private static let leadershipSkills: [MicroSkill] = [
        MicroSkill(
            id: "standard-not-scold",
            pathID: "leadership-comms",
            name: "Restate the standard, don't scold",
            summary: "Name the behaviour you want rather than the person's failing.",
            whyItMatters: "Scolding trains people to hide mistakes. Restating the standard tells everyone exactly what good looks like.",
            strongExample: "\"In this room we stand still when someone's talking. Reset your feet.\"",
            weakExample: "\"Why can't you ever just listen? Every single week with you.\"",
            retryCue: "Name the standard and the next action. Don't mention the person's character.",
            rubricDimension: .warmthAndRespect
        ),
        MicroSkill(
            id: "why-then-what",
            pathID: "leadership-comms",
            name: "Why, then what",
            summary: "Give the reason in one sentence before the instruction.",
            whyItMatters: "People follow instructions they understand and quietly abandon ones they don't.",
            strongExample: "\"We line up by belt so the newer students can copy someone. Belts to the left, please.\"",
            weakExample: "\"Line up by belt. Because I said so.\"",
            retryCue: "One sentence of why. Then the instruction.",
            rubricDimension: .organization
        ),
        MicroSkill(
            id: "clear-ask",
            pathID: "leadership-comms",
            name: "Make the ask unmissable",
            summary: "State exactly who does what by when, in one sentence.",
            whyItMatters: "Vague asks produce vague action and then resentment on both sides.",
            strongExample: "\"Seniors: I need three of you on the mat at 4:45 on Thursday to help with the beginners.\"",
            weakExample: "\"It'd be great if some people could maybe help out with the younger ones sometime.\"",
            retryCue: "Say who, what, and by when. One sentence.",
            rubricDimension: .ending
        )
    ]

    private static let difficultSkills: [MicroSkill] = [
        MicroSkill(
            id: "lead-with-care",
            pathID: "difficult-conversations",
            name: "Lead with the care, not the complaint",
            summary: "Open with why you're raising it, which is that you're on their side.",
            whyItMatters: "The first sentence decides whether the rest is heard as an attack or as help.",
            strongExample: "\"I'm raising this because I don't want Ellie to lose what she's built. Can we talk about the last month?\"",
            weakExample: "\"We need to talk about Ellie's attendance, it's become a problem.\"",
            retryCue: "First sentence: why you care. Then the issue.",
            rubricDimension: .opening
        ),
        MicroSkill(
            id: "facts-not-character",
            pathID: "difficult-conversations",
            name: "Facts, not character",
            summary: "Describe what happened and when. Say nothing about what kind of person they are.",
            whyItMatters: "Facts can be discussed. Character judgements can only be defended against.",
            strongExample: "\"She's made three of the last ten classes.\"",
            weakExample: "\"She's just not committed, and honestly neither are you.\"",
            retryCue: "Say only what happened and when. No adjectives about the person.",
            rubricDimension: .specificity
        ),
        MicroSkill(
            id: "stay-in-the-room",
            pathID: "difficult-conversations",
            name: "Stay in the room",
            summary: "When it gets heated, slow down and stay on the topic instead of retreating or escalating.",
            whyItMatters: "Most difficult conversations fail not from the wrong words but from ending too early or fighting back.",
            strongExample: "\"I can hear you're angry, and I'd rather stay with it than leave it here. What's the part I've got wrong?\"",
            weakExample: "\"Look, forget I mentioned it. It's fine.\"",
            retryCue: "When it gets tense: acknowledge, slow down, stay on topic.",
            rubricDimension: .concernHandling
        )
    ]

    private static let confidenceSkills: [MicroSkill] = [
        MicroSkill(
            id: "speak-to-one-person",
            pathID: "speaking-confidence",
            name: "Speak to one person",
            summary: "Deliver it as if to a single named person rather than a crowd.",
            whyItMatters: "A room is intimidating and abstract. One person is a normal conversation, and the delivery comes out warmer and more specific.",
            strongExample: "Pick a parent you know. Say it to them.",
            weakExample: nil,
            retryCue: "Pick one person. Say it to them, not to the room.",
            rubricDimension: .audienceAdaptation
        ),
        MicroSkill(
            id: "recover-out-loud",
            pathID: "speaking-confidence",
            name: "Recover out loud",
            summary: "When you lose your place, say so plainly and continue. No apology spiral.",
            whyItMatters: "Audiences forgive a stumble instantly and remember a long apology forever. Recovering visibly is a competence signal.",
            strongExample: "\"Let me start that again. Buddy Week is the 14th.\"",
            weakExample: "\"Sorry, sorry, I've completely lost it, sorry, this is embarrassing, um, sorry…\"",
            retryCue: "If you stumble: one short reset, then keep going. No apologising.",
            rubricDimension: .clarity
        ),
        MicroSkill(
            id: "hold-the-opening",
            pathID: "speaking-confidence",
            name: "Hold the opening",
            summary: "Stand still, wait for quiet, and start only when you have the room.",
            whyItMatters: "Starting into noise trains people that you can be talked over. Two seconds of waiting buys the whole talk.",
            strongExample: "[stands, waits, room settles] \"Two things before you go.\"",
            weakExample: "[starts talking over chatter] \"So — um — if everyone could — Buddy Week is —\"",
            retryCue: "Wait two full seconds before your first word.",
            rubricDimension: .opening
        )
    ]

    // MARK: - Lookup

    public static let skills: [MicroSkill] =
        clearConciseSkills
        + structureStorySkills
        + vocalDeliverySkills
        + warmthSkills
        + listeningSkills
        + persuasionSkills
        + salesSkills
        + objectionSkills
        + leadershipSkills
        + difficultSkills
        + confidenceSkills

    private static let skillIndex: [String: MicroSkill] = {
        var index: [String: MicroSkill] = [:]
        for skill in skills { index[skill.id] = skill }
        return index
    }()

    private static let pathIndex: [String: SkillPath] = {
        var index: [String: SkillPath] = [:]
        for path in paths { index[path.id] = path }
        return index
    }()

    public static func skill(id: String) -> MicroSkill? { skillIndex[id] }

    public static func path(id: String) -> SkillPath? { pathIndex[id] }

    public static func skills(inPath pathID: String) -> [MicroSkill] {
        guard let path = pathIndex[pathID] else { return [] }
        return path.skillIDs.compactMap { skillIndex[$0] }
    }

    /// Paths available to an account at the given level.
    public static func unlockedPaths(atLevel level: Int) -> [SkillPath] {
        paths.filter { $0.unlocksAtLevel <= level }
    }
}
