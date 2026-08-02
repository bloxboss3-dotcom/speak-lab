import Foundation

/// Short principles that are shown at most once per session, and only when the
/// attempt actually demonstrates the situation they describe.
///
/// Every nugget here is ethical by construction. There is deliberately no
/// entry for urgency, scarcity, or social proof: those work, and that is
/// exactly why an app that trains behaviour should not teach them.
public enum NuggetLibrary {

    public struct Entry: Identifiable, Hashable, Sendable {
        public let nugget: GoldenNugget
        /// Skill IDs this nugget is relevant to.
        public let relatedSkillIDs: [String]
        public var id: String { nugget.id }
    }

    public static let entries: [Entry] = [
        // Persuasion
        Entry(
            nugget: GoldenNugget(
                id: "understand-before-persuade",
                title: "Understand before you persuade",
                insight: "Persuasion that starts before diagnosis is guessing. The first job is to find out what this particular person is weighing up — then you only need one argument instead of six.",
                category: .persuasion
            ),
            relatedSkillIDs: ["diagnose-first", "open-question", "discovery-before-pitch"]
        ),
        Entry(
            nugget: GoldenNugget(
                id: "connect-to-their-values",
                title: "Connect to what they already care about",
                insight: "People move toward their own reasons, not yours. Quote their words back and attach your recommendation to those, and the decision becomes theirs to defend.",
                category: .persuasion
            ),
            relatedSkillIDs: ["link-to-their-value", "their-language-benefits"]
        ),
        Entry(
            nugget: GoldenNugget(
                id: "evidence-beats-adjectives",
                title: "Evidence beats adjectives",
                insight: "\"Amazing\" is your opinion; \"eleven of our teens taught a class this year\" is a fact they can check. Facts survive the car-park conversation with their partner. Adjectives don't.",
                category: .persuasion
            ),
            relatedSkillIDs: ["evidence-not-adjectives", "concrete-story"]
        ),
        Entry(
            nugget: GoldenNugget(
                id: "strongest-reasonable-concern",
                title: "Answer the strongest concern, not the easiest",
                insight: "Everyone can hear it when you answer the easy version of an objection. Naming their actual, strongest concern out loud costs you nothing and buys the rest of the conversation.",
                category: .persuasion
            ),
            relatedSkillIDs: ["answer-the-real-one", "ask-what-behind-it"]
        ),
        Entry(
            nugget: GoldenNugget(
                id: "preserve-autonomy",
                title: "Leave them their choice",
                insight: "Pressure produces agreement that reverses within a day. Saying plainly that no is a fine answer is both the honest move and the one that produces decisions that hold.",
                category: .persuasion
            ),
            relatedSkillIDs: ["preserve-autonomy", "confirm-fit"]
        ),
        Entry(
            nugget: GoldenNugget(
                id: "make-the-step-easy",
                title: "Make the next step small and specific",
                insight: "\"Let me know\" transfers all the work to them and quietly dies. \"Come Thursday at five, I'll hold a spot\" gets done, because there is nothing left to decide.",
                category: .persuasion
            ),
            relatedSkillIDs: ["specific-close", "clear-ask"]
        ),

        // Ethical sales
        Entry(
            nugget: GoldenNugget(
                id: "diagnose-before-present",
                title: "Diagnose before you present",
                insight: "A doctor who prescribes before examining is a bad doctor, whatever the prescription. Two real questions before you describe anything you offer changes the whole conversation.",
                category: .sales
            ),
            relatedSkillIDs: ["discovery-before-pitch", "diagnose-first"]
        ),
        Entry(
            nugget: GoldenNugget(
                id: "problem-outcome-barrier",
                title: "Problem, outcome, barrier",
                insight: "Three things make a recommendation possible: what's wrong now, what they want instead, and what's stopping them. Miss the barrier and you'll solve a problem they weren't blocked on.",
                category: .sales
            ),
            relatedSkillIDs: ["discovery-before-pitch", "open-question", "reflect-back"]
        ),
        Entry(
            nugget: GoldenNugget(
                id: "objections-are-information",
                title: "An objection is information",
                insight: "\"It's expensive\" is not a no — it's the first sentence of a paragraph you haven't heard yet. Ask what's behind it and the real objection is usually something you can actually solve.",
                category: .sales
            ),
            relatedSkillIDs: ["ask-what-behind-it", "answer-the-real-one", "no-defensive-tone"]
        ),
        Entry(
            nugget: GoldenNugget(
                id: "confirm-fit-not-pressure",
                title: "Confirm fit rather than pressing for yes",
                insight: "Checking out loud whether this is genuinely right — including saying when it isn't — loses you the sales you'd have lost anyway in six weeks, and wins the ones worth having.",
                category: .sales
            ),
            relatedSkillIDs: ["confirm-fit", "preserve-autonomy"]
        ),

        // Presence
        Entry(
            nugget: GoldenNugget(
                id: "pause-instead-of-filling",
                title: "Pause instead of filling",
                insight: "A one-second silence feels like five to you and like nothing to everyone else. The pause is heard as control; the \"um\" is heard as searching. It is the cheapest upgrade available.",
                category: .charisma
            ),
            relatedSkillIDs: ["deliberate-pause", "hold-the-silence"]
        ),
        Entry(
            nugget: GoldenNugget(
                id: "vivid-over-vague",
                title: "Vivid beats vague",
                insight: "\"They build resilience\" is forgotten before you finish saying it. \"She held the plank while the whole class counted her to sixty\" gets repeated at the school gate.",
                category: .charisma
            ),
            relatedSkillIDs: ["concrete-story", "evidence-not-adjectives", "plain-words"]
        ),
        Entry(
            nugget: GoldenNugget(
                id: "warmth-plus-conviction",
                title: "Warmth and conviction together",
                insight: "Warmth alone reads as pleasant and forgettable; conviction alone reads as pushy. The combination — clearly on their side, and clear about what you think — is what people describe as presence.",
                category: .charisma
            ),
            relatedSkillIDs: ["acknowledge-before-answer", "clear-ask", "stay-in-the-room"]
        ),
        Entry(
            nugget: GoldenNugget(
                id: "vary-deliberately",
                title: "Change speed on the line that matters",
                insight: "If every sentence arrives at the same speed, the listener has no way to tell which one was the point. Slowing down for one sentence marks it more clearly than any amount of emphasis.",
                category: .charisma
            ),
            relatedSkillIDs: ["pace-shift", "land-the-line"]
        ),
        Entry(
            nugget: GoldenNugget(
                id: "speak-from-intention",
                title: "Speak from an intention, not a performance",
                insight: "Trying to seem confident splits your attention between the message and yourself. Deciding what you want the listener to do, and aiming at that, does the same job with none of the effort.",
                category: .charisma
            ),
            relatedSkillIDs: ["speak-to-one-person", "recover-out-loud", "hold-the-opening"]
        ),

        // Structure and listening
        Entry(
            nugget: GoldenNugget(
                id: "signpost-frees-attention",
                title: "Signposting frees their attention",
                insight: "\"Three things\" lets a listener stop wondering how long this will take and start listening. It costs two words and buys the whole talk.",
                category: .structure
            ),
            relatedSkillIDs: ["signpost", "rule-of-three"]
        ),
        Entry(
            nugget: GoldenNugget(
                id: "silence-does-the-work",
                title: "The answer comes after the pause",
                insight: "The most useful thing someone says is usually the thing they say after the silence you were tempted to fill. Ask, then wait — even when it's uncomfortable, especially then.",
                category: .listening
            ),
            relatedSkillIDs: ["hold-the-silence", "open-question", "one-question-at-a-time"]
        ),
        Entry(
            nugget: GoldenNugget(
                id: "acknowledge-first",
                title: "Acknowledge before you answer",
                insight: "An answer that arrives before the person feels heard is experienced as a rebuttal, however correct it is. One sentence of acknowledgment makes the same answer land completely differently.",
                category: .listening
            ),
            relatedSkillIDs: ["acknowledge-before-answer", "reflect-back", "stay-in-the-room"]
        )
    ]

    private static let index: [String: Entry] = {
        var result: [String: Entry] = [:]
        for entry in entries { result[entry.nugget.id] = entry }
        return result
    }()

    public static func nugget(id: String) -> GoldenNugget? { index[id]?.nugget }

    public static func nuggets(forSkill skillID: String) -> [GoldenNugget] {
        entries.filter { $0.relatedSkillIDs.contains(skillID) }.map { $0.nugget }
    }

    /// Picks at most one nugget for a session, avoiding ones already shown.
    ///
    /// Returning nil is a normal and frequent outcome — the library exists to
    /// be used sparingly, not to append a tip to every attempt.
    public static func suggest(forSkill skillID: String, alreadySeen: Set<String>) -> GoldenNugget? {
        let candidates = nuggets(forSkill: skillID)
        return candidates.first { !alreadySeen.contains($0.id) }
    }

    public static var all: [GoldenNugget] { entries.map { $0.nugget } }
}
