import Foundation

/// The mission catalogue.
///
/// Adding a scenario is a matter of appending to one of the arrays below —
/// nothing else in the app needs to change. Transfer variants point at their
/// parent with `transferOf`, which is how the training loop finds "the same
/// skill, slightly harder" after a successful retry.
public enum ScenarioLibrary {

    // MARK: - Speaking

    private static let speakingScenarios: [Scenario] = [
        Scenario(
            id: "spk-buddy-week",
            title: "Buddy Week announcement",
            hook: "Thirty parents, coats already half on. You have forty seconds.",
            mode: .speaking,
            pathID: "clear-concise",
            primarySkillID: "bottom-line-first",
            tier: .foundation,
            briefing: "Class has just finished. Parents are collecting bags and children are pulling at sleeves. You want to announce Buddy Week — the week where every student can bring one friend to class for free — before the room empties.",
            objectives: [
                Objective(id: "o1", text: "State what Buddy Week is and when it happens in your first two sentences"),
                Objective(id: "o2", text: "Give parents one clear action to take"),
                Objective(id: "o3", text: "Finish inside the time limit", isBonus: true)
            ],
            timeLimitSeconds: 60,
            tags: ["announcement", "parents"]
        ),
        Scenario(
            id: "spk-buddy-week-noise",
            title: "Buddy Week, noisy room",
            hook: "Same announcement. Now two toddlers are melting down by the door.",
            mode: .speaking,
            pathID: "clear-concise",
            primarySkillID: "bottom-line-first",
            tier: .applied,
            briefing: "Same announcement, harder room. It is loud, half the parents are mid-conversation, and you have less time than last week. You get one shot before people drift.",
            objectives: [
                Objective(id: "o1", text: "Lead with the point — no warm-up sentence"),
                Objective(id: "o2", text: "Keep it under 40 seconds"),
                Objective(id: "o3", text: "End with a single specific action", isBonus: true)
            ],
            timeLimitSeconds: 40,
            transferOf: "spk-buddy-week",
            transferTwist: "Less time, noisier room, no second chance.",
            tags: ["announcement", "parents", "pressure"]
        ),
        Scenario(
            id: "spk-leadership-lesson",
            title: "Two-minute leadership lesson",
            hook: "Fourteen teenagers on the mat. Make them think.",
            mode: .speaking,
            pathID: "structure-story",
            primarySkillID: "concrete-story",
            tier: .applied,
            briefing: "You run a short leadership talk at the start of the teen class. Today's theme is doing the right thing when nobody is checking. You have two minutes and a group who can smell a lecture from across the room.",
            objectives: [
                Objective(id: "o1", text: "Build the lesson around one specific story, not general advice"),
                Objective(id: "o2", text: "Give them one thing to do this week"),
                Objective(id: "o3", text: "Close by returning to your opening image", isBonus: true)
            ],
            timeLimitSeconds: 120,
            tags: ["leadership", "teens"]
        ),
        Scenario(
            id: "spk-leadership-lesson-adults",
            title: "The same lesson, to adults",
            hook: "Same message. Now they're your peers, and one of them owns a business.",
            mode: .speaking,
            pathID: "structure-story",
            primarySkillID: "concrete-story",
            tier: .pressure,
            briefing: "You're giving the same leadership idea at an adult class. These are people with jobs, mortgages and opinions. The teenage version will not survive contact with this room.",
            objectives: [
                Objective(id: "o1", text: "Keep one concrete story at the centre"),
                Objective(id: "o2", text: "Adapt the example to adult stakes"),
                Objective(id: "o3", text: "Avoid any line that would sound like a motivational poster", isBonus: true)
            ],
            timeLimitSeconds: 120,
            transferOf: "spk-leadership-lesson",
            transferTwist: "Same skill, adult audience, higher scepticism.",
            tags: ["leadership", "adults"]
        ),
        Scenario(
            id: "spk-attendance-matters",
            title: "Why attendance matters",
            hook: "Say the hard thing without making anyone feel told off.",
            mode: .speaking,
            pathID: "leadership-comms",
            primarySkillID: "standard-not-scold",
            tier: .applied,
            briefing: "Attendance has slipped across the school. You want to explain to parents why consistency matters — physically and for the child's sense of progress — without it landing as a telling-off. Several parents in the room have had a genuinely difficult month.",
            objectives: [
                Objective(id: "o1", text: "Explain the reason before any instruction"),
                Objective(id: "o2", text: "Say nothing that implies parents are failing"),
                Objective(id: "o3", text: "Offer one realistic option for families who are struggling", isBonus: true)
            ],
            timeLimitSeconds: 90,
            tags: ["parents", "standards"]
        ),
        Scenario(
            id: "spk-wedding-toast",
            title: "The best man's ninety seconds",
            hook: "Cutlery down, phones up. Do not tell the story about Ibiza.",
            mode: .speaking,
            pathID: "structure-story",
            primarySkillID: "callback-close",
            tier: .pressure,
            briefing: "You're giving a short wedding speech. The room is warm, slightly drunk, and entirely on your side — which is its own kind of pressure. Ninety seconds, one story, land the ending.",
            objectives: [
                Objective(id: "o1", text: "One story with a specific moment in it"),
                Objective(id: "o2", text: "Say something true about the couple, not generic"),
                Objective(id: "o3", text: "End on a callback to your opening line", isBonus: true)
            ],
            timeLimitSeconds: 90,
            tags: ["speech", "personal"]
        ),
        Scenario(
            id: "spk-price-increase",
            title: "Announcing a price increase",
            hook: "You've been putting this off for three months.",
            mode: .speaking,
            pathID: "leadership-comms",
            primarySkillID: "why-then-what",
            tier: .pressure,
            briefing: "Fees are going up by eight percent in September. You're telling the parents yourself rather than sending an email. Say it clearly, give the reason, and don't over-apologise your way into sounding guilty.",
            objectives: [
                Objective(id: "o1", text: "State the change and the date plainly in the first fifteen seconds"),
                Objective(id: "o2", text: "Give one honest reason"),
                Objective(id: "o3", text: "Say it without apologising more than once", isBonus: true)
            ],
            timeLimitSeconds: 75,
            tags: ["parents", "money", "pressure"]
        ),
        Scenario(
            id: "spk-untimed-warmup",
            title: "Just talk. Nobody is listening.",
            hook: "No timer, no score. The lowest rung on the ladder.",
            mode: .speaking,
            pathID: "speaking-confidence",
            primarySkillID: "speak-to-one-person",
            tier: .foundation,
            briefing: "This one is private and untimed. Explain something you know well — anything at all — to one imagined person. Nothing is scored against a clock. The only goal is to record your voice and hear it back.",
            objectives: [
                Objective(id: "o1", text: "Record something, all the way through, without restarting"),
                Objective(id: "o2", text: "Speak as if to one person you like")
            ],
            timeLimitSeconds: nil,
            prepSeconds: 60,
            tags: ["anxiety-ladder", "warmup"]
        ),
        Scenario(
            id: "spk-story-that-lands",
            title: "The moment that has to land",
            hook: "One sentence in this story matters. Make it obvious which.",
            mode: .speaking,
            pathID: "vocal-delivery",
            primarySkillID: "pace-shift",
            tier: .applied,
            briefing: "Tell a sixty-second story about someone who kept going when it got hard. Somewhere in it is one sentence that carries the whole point. Everything hangs on whether the listener can tell which one it was.",
            objectives: [
                Objective(id: "o1", text: "Deliver one sentence noticeably slower than the rest"),
                Objective(id: "o2", text: "Keep the story to one person and one moment"),
                Objective(id: "o3", text: "Stop cleanly on the last line", isBonus: true)
            ],
            timeLimitSeconds: 60,
            tags: ["delivery", "story"]
        ),
        Scenario(
            id: "spk-baseline-a",
            title: "Baseline: explain your work",
            hook: "Where you're starting from. No feedback yet — just a marker.",
            mode: .speaking,
            pathID: "clear-concise",
            primarySkillID: "bottom-line-first",
            tier: .foundation,
            briefing: "Explain what you do and who it's for, to someone who has never heard of it. This is your baseline recording. You'll do a comparable one later so you can see what actually changed.",
            objectives: [
                Objective(id: "o1", text: "Explain what you do and who it helps"),
                Objective(id: "o2", text: "Finish inside 60 seconds")
            ],
            timeLimitSeconds: 60,
            tags: ["baseline"]
        ),
        Scenario(
            id: "spk-baseline-b",
            title: "Re-baseline: explain a decision",
            hook: "Same difficulty, different content. The honest comparison.",
            mode: .speaking,
            pathID: "clear-concise",
            primarySkillID: "bottom-line-first",
            tier: .foundation,
            briefing: "Explain a decision you made recently and why, to someone who wasn't there. Deliberately comparable to your first baseline but not the same task, so improvement can't come from having memorised it.",
            objectives: [
                Objective(id: "o1", text: "Explain the decision and the reason"),
                Objective(id: "o2", text: "Finish inside 60 seconds")
            ],
            timeLimitSeconds: 60,
            tags: ["baseline"]
        )
    ]

    // MARK: - Conversation

    private static let conversationScenarios: [Scenario] = [
        Scenario(
            id: "cnv-trial-welcome",
            title: "After the first trial class",
            hook: "A parent with their coat on, deciding whether to come back.",
            mode: .conversation,
            pathID: "listening-questions",
            primarySkillID: "open-question",
            tier: .foundation,
            briefing: "Sam has just finished a trial class. Their parent is waiting by the door. You have a few minutes to find out what they're actually hoping for — which is rarely the thing they say first.",
            objectives: [
                Objective(id: "o1", text: "Find out what they want for their child, in their words"),
                Objective(id: "o2", text: "Ask at least one open question before describing anything you offer"),
                Objective(id: "o3", text: "Reflect their answer back before you respond to it", isBonus: true)
            ],
            timeLimitSeconds: 300,
            character: CharacterBrief(
                name: "Priya",
                role: "Parent of Sam, 8",
                personality: "Polite, a little guarded, answers briefly until she trusts you. Warms up fast if you notice something specific about her child. Her stated objection is a soft brush-off she will drop as soon as she feels heard.",
                emotionalState: "Mildly hopeful, slightly braced for a sales pitch",
                hiddenGoal: "Sam has started saying he's 'rubbish at everything' after being left out at school. She wants him to have one thing that is his.",
                objection: "I'm just looking at a few options at the moment.",
                opensWith: "He seemed to enjoy it, I think. So how does it all work?",
                successCondition: "The learner asks about Sam or Priya's hopes before describing the programme, and Priya says the real reason out loud.",
                failCondition: "The learner launches into memberships, timetables or prices before asking anything meaningful.",
                voiceHint: "warm-mid"
            ),
            tags: ["parents", "discovery"]
        ),
        Scenario(
            id: "cnv-too-expensive",
            title: "\"It's a lot of money\"",
            hook: "The objection everyone answers too fast.",
            mode: .conversation,
            pathID: "objection-handling",
            primarySkillID: "ask-what-behind-it",
            tier: .applied,
            briefing: "A parent has been to two classes with their daughter and likes it. Now the monthly cost has come up. Most people answer this objection within two seconds — and answer the wrong version of it.",
            objectives: [
                Objective(id: "o1", text: "Find out which part of the cost is the real concern before answering"),
                Objective(id: "o2", text: "Answer the concern they actually have"),
                Objective(id: "o3", text: "Leave the decision explicitly with them", isBonus: true)
            ],
            timeLimitSeconds: 300,
            character: CharacterBrief(
                name: "Dan",
                role: "Parent of Ellie, 10",
                personality: "Direct, practical, not hostile. Respects a straight answer and dislikes being sold to.",
                emotionalState: "Slightly embarrassed to be talking about money",
                hiddenGoal: "He can afford it. He's worried Ellie will quit in two months like she did with swimming, and he'll have wasted it again.",
                objection: "\"It's a lot per month, and I've been stung before.\"",
                opensWith: "So look — she likes it. But it's a fair bit a month, isn't it?",
                successCondition: "The learner asks what specifically is behind the concern and gets Dan to name the quitting fear, then responds to that.",
                failCondition: "The learner defends the price, breaks it down per class, or compares to other activities without asking anything.",
                voiceHint: "brisk-low"
            ),
            tags: ["parents", "money", "objection"]
        ),
        Scenario(
            id: "cnv-too-expensive-firmer",
            title: "\"It's a lot of money\" — and he's already decided",
            hook: "Same objection, but he came in planning to say no.",
            mode: .conversation,
            pathID: "objection-handling",
            primarySkillID: "answer-the-real-one",
            tier: .pressure,
            briefing: "The same conversation, three weeks later. He's had a rough month and has come in intending to pause the membership. The skill is unchanged; the resistance is not.",
            objectives: [
                Objective(id: "o1", text: "Find the real concern without arguing"),
                Objective(id: "o2", text: "Offer something that fits his actual situation"),
                Objective(id: "o3", text: "Accept a no gracefully if that's the honest answer", isBonus: true)
            ],
            timeLimitSeconds: 300,
            character: CharacterBrief(
                name: "Dan",
                role: "Parent of Ellie, 10",
                personality: "Direct, tired, slightly defensive because he feels he's letting his daughter down.",
                emotionalState: "Braced for a hard sell, ready to leave",
                hiddenGoal: "He wants permission to downgrade rather than quit — but won't ask for it, because he thinks it isn't an option.",
                objection: "\"I think we need to stop for a bit.\"",
                opensWith: "I'll be honest with you, I think we're going to have to knock it on the head.",
                successCondition: "The learner uncovers that pausing is about money-this-month rather than value, and surfaces a smaller option without pressure.",
                failCondition: "The learner pushes to keep the full membership, or accepts the cancellation without asking a single question.",
                voiceHint: "brisk-low"
            ),
            transferOf: "cnv-too-expensive",
            transferTwist: "He's arrived having already decided. Same skill, no goodwill.",
            tags: ["parents", "money", "pressure"]
        ),
        Scenario(
            id: "cnv-schedule-request",
            title: "Asking for a healthier schedule",
            hook: "Respectful and firm are not opposites. Prove it.",
            mode: .conversation,
            pathID: "difficult-conversations",
            primarySkillID: "clear-ask",
            tier: .applied,
            briefing: "You're asking your employer to change your schedule — you're teaching five nights a week and it isn't sustainable. You want to stay. You need this to change. Both of those are true at once.",
            objectives: [
                Objective(id: "o1", text: "Make one specific, unmissable ask"),
                Objective(id: "o2", text: "Stay respectful without retreating from the ask"),
                Objective(id: "o3", text: "Acknowledge their constraint without abandoning yours", isBonus: true)
            ],
            timeLimitSeconds: 300,
            character: CharacterBrief(
                name: "Marcus",
                role: "Your manager / school owner",
                personality: "Reasonable but stretched. Deflects with logistics. Responds well to specifics and badly to vagueness.",
                emotionalState: "Distracted, genuinely short-staffed",
                hiddenGoal: "He can move one night if someone names which one and offers a workable swap. He won't volunteer this.",
                objection: "\"There's nobody else to cover Thursdays.\"",
                opensWith: "You wanted a word? I've got about ten minutes before the four o'clock.",
                successCondition: "The learner names a specific change, holds it under deflection, and stays respectful throughout.",
                failCondition: "The learner softens into 'whenever suits you', or turns it into a complaint about being undervalued.",
                voiceHint: "brisk-mid"
            ),
            tags: ["work", "boundaries"]
        ),
        Scenario(
            id: "cnv-missed-classes",
            title: "The child who stopped coming",
            hook: "Three of the last ten classes. Say it without it sounding like a bill.",
            mode: .conversation,
            pathID: "difficult-conversations",
            primarySkillID: "lead-with-care",
            tier: .applied,
            briefing: "Ellie has made three of the last ten classes. Her parent is here today. You want to raise it — because she's about to lose her grading — without it landing as a complaint about commitment.",
            objectives: [
                Objective(id: "o1", text: "Open with why you're raising it before what the issue is"),
                Objective(id: "o2", text: "Describe what happened as facts, not as a character judgement"),
                Objective(id: "o3", text: "Leave with one agreed next step", isBonus: true)
            ],
            timeLimitSeconds: 300,
            character: CharacterBrief(
                name: "Nadia",
                role: "Parent of Ellie, 10",
                personality: "Warm, over-apologetic, deflects with jokes when uncomfortable.",
                emotionalState: "Immediately guilty, expects to be told off",
                hiddenGoal: "Her working hours changed in April and Thursday is now impossible. She's embarrassed to say so and has been hoping nobody noticed.",
                objection: "\"I know, I know, we've been terrible, sorry — it's just been mad.\"",
                opensWith: "Oh — hi. Sorry, we've been rubbish lately, I know.",
                successCondition: "The learner gets past the apology to the actual Thursday obstacle and they find a concrete alternative.",
                failCondition: "The learner accepts the apology and leaves it there, or emphasises the missed classes until she withdraws.",
                voiceHint: "warm-mid"
            ),
            tags: ["parents", "attendance"]
        ),
        Scenario(
            id: "cnv-correct-student",
            title: "Correcting a student, keeping the student",
            hook: "Authority and connection in the same sentence.",
            mode: .conversation,
            pathID: "leadership-comms",
            primarySkillID: "standard-not-scold",
            tier: .applied,
            briefing: "Jayden, 13, has been talking through instructions and pulling focus for three weeks. Today he stepped on a younger student's foot messing about. You need to correct it properly — in front of the class or after it, your call — without losing him.",
            objectives: [
                Objective(id: "o1", text: "Name the standard and the next action, not his character"),
                Objective(id: "o2", text: "Keep the relationship intact — he should still want to be there"),
                Objective(id: "o3", text: "Give him a way to be useful rather than just told off", isBonus: true)
            ],
            timeLimitSeconds: 240,
            character: CharacterBrief(
                name: "Jayden",
                role: "Student, 13",
                personality: "Quick, funny, deflects with jokes, extremely alert to unfairness. Shuts down completely if he feels humiliated.",
                emotionalState: "Defensive, expecting to be embarrassed in front of the class",
                hiddenGoal: "He's bored — he's been on the same material for months and is acting up to fill the gap. He wants responsibility, not attention.",
                objection: "\"I wasn't even doing anything, it was Tom as well.\"",
                opensWith: "What? I barely touched him.",
                successCondition: "The learner corrects the behaviour with a standard rather than an insult, and Jayden accepts it without shutting down.",
                failCondition: "The learner shames him, argues about who started it, or lets the behaviour go entirely.",
                voiceHint: "bright-high"
            ),
            tags: ["students", "discipline"]
        ),
        Scenario(
            id: "cnv-upset-parent",
            title: "The parent who is genuinely angry",
            hook: "No defence. No 'to be fair'. Stay in the room.",
            mode: .conversation,
            pathID: "difficult-conversations",
            primarySkillID: "stay-in-the-room",
            tier: .pressure,
            briefing: "A parent is upset. Their child was moved out of the grading list without warning and they found out from another parent. They are not being unreasonable. You need to hear it fully before you explain anything.",
            objectives: [
                Objective(id: "o1", text: "Let them finish and acknowledge the substance before responding"),
                Objective(id: "o2", text: "Say nothing defensive — no 'actually', no 'to be fair'"),
                Objective(id: "o3", text: "End with something concrete you will do", isBonus: true)
            ],
            timeLimitSeconds: 300,
            character: CharacterBrief(
                name: "Tom",
                role: "Parent of Kai, 9",
                personality: "Articulate, controlled anger, notices evasion instantly. De-escalates quickly when genuinely heard — and escalates just as quickly when managed.",
                emotionalState: "Angry, and embarrassed about being angry",
                hiddenGoal: "He mainly wants to know it wasn't a judgement on Kai. The grading itself matters less than what it implied.",
                objection: "\"I had to hear it from someone else in the car park.\"",
                opensWith: "Have you got a minute? Because I've got to say, I'm not happy about this.",
                successCondition: "The learner acknowledges the substance without defending, and Tom's tone drops before any explanation is offered.",
                failCondition: "The learner explains the policy first, says 'to be fair', or tries to end the conversation early.",
                voiceHint: "firm-low"
            ),
            tags: ["parents", "conflict"]
        ),
        Scenario(
            id: "cnv-upset-parent-public",
            title: "The angry parent, in front of everyone",
            hook: "Same conversation. Now nine people are pretending not to listen.",
            mode: .conversation,
            pathID: "difficult-conversations",
            primarySkillID: "stay-in-the-room",
            tier: .boss,
            briefing: "The same complaint, raised loudly in a full reception area with other parents present. Everything that worked in private is harder here, and the temptation to shut it down quickly is enormous.",
            objectives: [
                Objective(id: "o1", text: "Acknowledge fully without defending, in public"),
                Objective(id: "o2", text: "Move it somewhere private without making it look like a brush-off"),
                Objective(id: "o3", text: "Leave with a concrete commitment", isBonus: true)
            ],
            timeLimitSeconds: 300,
            character: CharacterBrief(
                name: "Tom",
                role: "Parent of Kai, 9",
                personality: "Articulate, controlled anger, hyper-alert to being handled. An audience makes him less willing to back down.",
                emotionalState: "Angry, publicly committed to his position",
                hiddenGoal: "Same as before — he wants to know it wasn't about Kai — but now he also needs to not look foolish for having made a scene.",
                objection: "\"No, we can talk about it here, it's not a secret.\"",
                opensWith: "Actually — since you're here. Can you explain why Kai's off the grading list?",
                successCondition: "The learner acknowledges publicly, gives him a dignified exit from the audience, and holds the concrete commitment.",
                failCondition: "The learner defends themselves in public, or insists on moving without acknowledging first.",
                voiceHint: "firm-low"
            ),
            transferOf: "cnv-upset-parent",
            transferTwist: "Same skill, public audience, no easy exit.",
            tags: ["parents", "conflict", "boss"]
        ),
        Scenario(
            id: "cnv-trial-welcome-quiet",
            title: "The parent who won't give you anything",
            hook: "Monosyllables. Now find the real answer.",
            mode: .conversation,
            pathID: "listening-questions",
            primarySkillID: "hold-the-silence",
            tier: .pressure,
            briefing: "Another trial class, another parent by the door — but this one answers in three words and looks at their phone. Filling the silence will get you nowhere. Holding it might.",
            objectives: [
                Objective(id: "o1", text: "Ask one open question and wait through the silence"),
                Objective(id: "o2", text: "Resist explaining the programme to fill the gap"),
                Objective(id: "o3", text: "Get one piece of real information about the child", isBonus: true)
            ],
            timeLimitSeconds: 300,
            character: CharacterBrief(
                name: "Alex",
                role: "Parent of Rowan, 7",
                personality: "Short answers, not rude, genuinely uncomfortable with small talk. Opens up substantially if given actual silence to fill.",
                emotionalState: "Reserved, slightly tired",
                hiddenGoal: "Rowan was recently assessed for anxiety and Alex doesn't know whether it's relevant to mention. If given room, they will.",
                objection: "We'll see how it goes, I suppose.",
                opensWith: "Yeah, it was fine.",
                successCondition: "The learner asks something open and then stays quiet long enough for Alex to say the real thing.",
                failCondition: "The learner fills every pause, stacks questions, or gives up and pitches the timetable.",
                voiceHint: "flat-mid"
            ),
            transferOf: "cnv-trial-welcome",
            transferTwist: "Same discovery skill, a person who gives you nothing to work with.",
            tags: ["parents", "discovery", "pressure"]
        ),
        Scenario(
            id: "cnv-recommend-programme",
            title: "Recommending the right thing",
            hook: "You know what they need. Now earn the right to say it.",
            mode: .conversation,
            pathID: "ethical-sales",
            primarySkillID: "discovery-before-pitch",
            tier: .applied,
            briefing: "A parent has asked, directly, which programme you'd put their child in. The easy move is to answer immediately. The right move is to diagnose first — and then to be honest if the cheaper option is the better fit.",
            objectives: [
                Objective(id: "o1", text: "Ask at least two real questions before recommending anything"),
                Objective(id: "o2", text: "Describe the benefit in their words"),
                Objective(id: "o3", text: "Confirm fit honestly, including whether a smaller option is better", isBonus: true)
            ],
            timeLimitSeconds: 300,
            character: CharacterBrief(
                name: "Grace",
                role: "Parent of Noor, 11",
                personality: "Decisive, wants a recommendation, mildly impatient with questions until she sees why they're being asked.",
                emotionalState: "Ready to buy, slightly rushed",
                hiddenGoal: "Noor already does three evening activities. The three-a-week programme would break her, but Grace hasn't connected those facts.",
                objection: "\"Can you just tell me which one is best?\"",
                opensWith: "Right — which one should we do? The full thing, I assume?",
                successCondition: "The learner uncovers the existing schedule and recommends the smaller programme with an honest reason.",
                failCondition: "The learner sells the largest programme, or recommends anything before asking about Noor's week.",
                voiceHint: "brisk-mid"
            ),
            tags: ["parents", "sales"]
        ),
        Scenario(
            id: "cnv-returning-student",
            title: "The one who came back",
            hook: "Four months away. Don't make it weird.",
            mode: .conversation,
            pathID: "warmth-connection",
            primarySkillID: "name-and-notice",
            tier: .foundation,
            briefing: "A student who disappeared four months ago has walked back in. They're hovering at the edge of the mat, half expecting to be asked where they've been. What you say in the next twenty seconds decides whether they come back on Thursday.",
            objectives: [
                Objective(id: "o1", text: "Use their name and mention one specific thing you remember"),
                Objective(id: "o2", text: "Don't ask them to account for the absence"),
                Objective(id: "o3", text: "Give them a concrete reason to come back this week", isBonus: true)
            ],
            timeLimitSeconds: 180,
            character: CharacterBrief(
                name: "Ryan",
                role: "Student, 16, returning after four months",
                personality: "Guarded, monosyllabic when self-conscious, funny once relaxed. Watches closely for any hint of a telling-off. Deflects rather than explains.",
                emotionalState: "Embarrassed, ready to leave at the first sign of judgement",
                hiddenGoal: "He stopped coming after a bad grading and has told himself he's not good enough. He wants to be told he still belongs here, not that he was missed.",
                objection: "Yeah, been busy. You know how it is.",
                opensWith: "Alright. Is it — do I need to sign up again or something?",
                successCondition: "The learner welcomes him specifically and warmly without interrogating the gap, and Ryan says something real about why he stopped.",
                failCondition: "The learner asks where he's been, mentions the missed months, or is generically friendly in a way that could be aimed at anyone.",
                voiceHint: "flat-mid"
            ),
            tags: ["students", "warmth"]
        ),
        Scenario(
            id: "cnv-persuade-grading",
            title: "Talking someone into the grading",
            hook: "She's ready. She doesn't think she is.",
            mode: .conversation,
            pathID: "persuasion",
            primarySkillID: "link-to-their-value",
            tier: .pressure,
            briefing: "Noor is ready to grade and has decided she isn't. You believe she should enter. You cannot want it more than she does, and pushing will make it worse — but leaving it alone means she stalls for another six months.",
            objectives: [
                Objective(id: "o1", text: "Find out what she's actually afraid of before making any case"),
                Objective(id: "o2", text: "Connect your recommendation to something she said she wanted"),
                Objective(id: "o3", text: "Say out loud that the decision is hers", isBonus: true)
            ],
            timeLimitSeconds: 300,
            character: CharacterBrief(
                name: "Noor",
                role: "Student, 14",
                personality: "Thoughtful, self-critical, articulate. Argues her corner well and spots a pep talk instantly.",
                emotionalState: "Quietly anxious, presenting as indifferent",
                hiddenGoal: "She failed a piano exam in front of people last year. It isn't the grading she's avoiding — it's being watched while she fails.",
                objection: "\"I'm just not ready, I'd rather wait for the next one.\"",
                opensWith: "I saw the sheet. I think I'll leave it this time, to be honest.",
                successCondition: "The learner uncovers the fear of being watched, connects the grading to something Noor herself values, and leaves the choice with her.",
                failCondition: "The learner insists she's ready, lists her strengths at her, or applies pressure about letting people down.",
                voiceHint: "warm-mid"
            ),
            tags: ["students", "persuasion", "pressure"]
        ),
        Scenario(
            id: "cnv-baseline-conversation",
            title: "Baseline: a parent asks about your school",
            hook: "Your starting point in conversation. Just talk normally.",
            mode: .conversation,
            pathID: "listening-questions",
            primarySkillID: "open-question",
            tier: .foundation,
            briefing: "A neutral, friendly conversation with a parent who is curious about the school. This is your conversational baseline — no pressure, no hidden objection. Talk the way you normally would.",
            objectives: [
                Objective(id: "o1", text: "Have a normal conversation"),
                Objective(id: "o2", text: "Find out something about them")
            ],
            timeLimitSeconds: 240,
            character: CharacterBrief(
                name: "Jo",
                role: "Parent, curious",
                personality: "Friendly, chatty, easy to talk to, no agenda. Raises nothing you have to overcome — there is no objection in this one.",
                emotionalState: "Relaxed and interested",
                hiddenGoal: "Genuinely just curious. Will happily follow wherever the learner takes the conversation.",
                objection: "I don't really know what I'm asking, to be honest — what should I be asking?",
                opensWith: "Someone at work mentioned you — what's the school like?",
                successCondition: "The conversation reaches a natural end after several exchanges.",
                failCondition: "None — this is a baseline measurement, not a test.",
                voiceHint: "warm-mid"
            ),
            tags: ["baseline"]
        )
    ]

    // MARK: - Lookup

    public static let all: [Scenario] = speakingScenarios + conversationScenarios

    private static let index: [String: Scenario] = {
        var result: [String: Scenario] = [:]
        for scenario in all { result[scenario.id] = scenario }
        return result
    }()

    public static func scenario(id: String) -> Scenario? { index[id] }

    public static func scenarios(mode: PracticeMode) -> [Scenario] {
        all.filter { $0.mode == mode }
    }

    public static func scenarios(pathID: String) -> [Scenario] {
        all.filter { $0.pathID == pathID }
    }

    public static func scenarios(skillID: String) -> [Scenario] {
        all.filter { $0.primarySkillID == skillID }
    }

    /// The harder or changed variant to offer after a successful retry.
    ///
    /// Prefers an explicit transfer variant; falls back to any scenario training
    /// the same skill at a higher tier, so new content is picked up automatically.
    public static func transferScenario(after scenario: Scenario) -> Scenario? {
        if let explicit = all.first(where: { $0.transferOf == scenario.id }) {
            return explicit
        }
        return all
            .filter { $0.primarySkillID == scenario.primarySkillID && $0.tier > scenario.tier }
            .sorted { $0.tier < $1.tier }
            .first
    }

    /// Scenarios excluded from normal browsing because they exist to measure, not to teach.
    public static var baselineScenarios: [Scenario] {
        all.filter { $0.tags.contains("baseline") }
    }

    /// Everything a learner can pick from the mission board.
    public static var browsable: [Scenario] {
        all.filter { !$0.tags.contains("baseline") }
    }
}
