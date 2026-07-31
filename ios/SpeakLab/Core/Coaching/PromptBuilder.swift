import Foundation

/// The four things the app ever asks the model to do.
public enum CoachingTask: String, Codable, Sendable {
    case attemptFeedback = "attempt_feedback"
    case attemptComparison = "attempt_comparison"
    case characterTurn = "character_turn"
    case conversationDebrief = "conversation_debrief"
}

public struct CoachingMessage: Codable, Hashable, Sendable {
    public enum Role: String, Codable, Sendable {
        case user
        case assistant
    }

    public let role: Role
    public let content: String

    public init(role: Role, content: String) {
        self.role = role
        self.content = content
    }
}

/// What the app sends to its proxy. The proxy owns the API key, the model
/// choice and the response schema; the app owns the coaching itself.
public struct CoachingRequest: Codable, Hashable, Sendable {
    public let task: CoachingTask
    public let system: String
    public let messages: [CoachingMessage]
    public let maxTokens: Int
    /// Maps to the API's effort control. Lower is faster and cheaper.
    public let effort: String

    public init(
        task: CoachingTask,
        system: String,
        messages: [CoachingMessage],
        maxTokens: Int = 4000,
        effort: String = "medium"
    ) {
        self.task = task
        self.system = system
        self.messages = messages
        self.maxTokens = maxTokens
        self.effort = effort
    }
}

/// Builds every prompt the app sends.
///
/// Prompt text lives here rather than on the server so the coaching can be
/// iterated on and unit-tested without a deploy. The server only enforces the
/// response shape.
public enum PromptBuilder {

    // MARK: - Shared rules

    /// Constraints that apply to every coaching call.
    ///
    /// The negative list is as important as the positive one: without it,
    /// models reliably drift into commenting on confidence and tone of voice
    /// from a text transcript, which is not something they can observe.
    static let groundRules = """
    You are a communication coach running a deliberate-practice session. You are \
    experienced, warm, and extremely specific. You are not a cheerleader.

    Hard rules:
    - Ground every claim in the transcript or the measured data you are given. \
    Quote verbatim. If you cannot find evidence for an observation, do not make it.
    - You have a transcript and timing measurements. You have NOT heard the audio. \
    Never comment on tone of voice, volume, warmth of sound, accent, or emotion \
    audible in the voice. You may refer to pace, pauses and timing ONLY where the \
    supplied measurements support it, and you must attribute them to the measurements.
    - Never assess personality, charisma, confidence, authority, honesty or \
    likeability. These are not observable from a transcript and claiming otherwise \
    makes the whole session untrustworthy.
    - No scores, percentages or invented precision. No "87% persuasive".
    - Address behaviour and task, never the person. "The opening ran 25 seconds \
    before the main point" — not "you ramble".
    - Exactly one primary target. If several things need work, pick the one that \
    would most improve the outcome for this listener in this scenario, and stay silent \
    about the rest except in the rubric observations.
    - British or American spelling — match the learner's transcript.
    - Coaching must be ethical. Never coach manipulation, manufactured urgency, \
    false scarcity, fake social proof, or pressure tactics. If the learner asks for \
    those, add a safety flag and coach the honest alternative instead.
    - If the learner appears genuinely distressed, add a safety flag. You are a \
    communication trainer, not a therapist, and you must not present yourself as one.
    """

    // MARK: - Speaking attempt feedback

    public static func attemptFeedbackRequest(
        scenario: Scenario,
        skill: MicroSkill,
        transcript: String,
        metrics: SpeakingMetrics,
        attemptNumber: Int,
        previousTargetSkillID: String? = nil
    ) -> CoachingRequest {
        let system = """
        \(groundRules)

        The learner is practising one micro-skill: "\(skill.name)".
        \(skill.summary)
        Why it matters: \(skill.whyItMatters)

        Your primary target should normally be about this micro-skill. Choose a \
        different target only if something else in the attempt clearly mattered \
        more for this listener — and if you do, say why in the explanation.

        Write the retryInstruction as one imperative sentence the learner can hold \
        in their head while speaking. Not a paragraph, not a checklist.

        Set targetSkillID to one of these IDs, whichever best matches your target: \
        \(availableSkillIDs(for: scenario)).

        Include optionalGoldenNugget only when a specific principle genuinely \
        explains what happened here. When in doubt, omit it — a nugget on every \
        attempt trains the learner to skip them.

        Include a transferScenario only if this attempt was strong. It should be \
        the same skill in a changed or harder situation.
        """

        let user = """
        SCENARIO
        Title: \(scenario.title)
        Mode: speaking to an audience
        Setting: \(scenario.briefing)
        Objectives:
        \(objectiveList(scenario))
        \(timeLimitLine(scenario))
        Attempt number: \(attemptNumber)
        \(previousTargetLine(previousTargetSkillID))

        MEASURED DATA (computed on device, not by you)
        \(MetricsDigest.speaking(metrics))

        TRANSCRIPT WITH TIMINGS
        \(timedTranscript(metrics.sentences, fallback: transcript))
        """

        return CoachingRequest(
            task: .attemptFeedback,
            system: system,
            messages: [CoachingMessage(role: .user, content: user)],
            maxTokens: 4000,
            effort: "medium"
        )
    }

    // MARK: - Retry comparison

    public static func comparisonRequest(
        scenario: Scenario,
        skill: MicroSkill,
        target: String,
        retryInstruction: String,
        firstTranscript: String,
        firstMetrics: SpeakingMetrics,
        secondTranscript: String,
        secondMetrics: SpeakingMetrics
    ) -> CoachingRequest {
        let system = """
        \(groundRules)

        You are comparing two attempts at the same scenario. The learner was told \
        to change exactly one thing.

        The target was: \(target)
        The instruction they were given was: "\(retryInstruction)"

        Judge only whether that targeted behaviour changed. Do not reward a second \
        attempt for being longer, more polished, or more enthusiastic if the target \
        behaviour is unchanged. Rewarding surface change teaches the learner to \
        perform effort instead of changing behaviour, which is the failure mode this \
        whole app exists to avoid.

        Set changeWasSuperficial to true when the wording changed but the underlying \
        behaviour did not — for example, the same late arrival at the main point, \
        reworded.

        Quote both attempts verbatim in evidenceBefore and evidenceAfter, choosing \
        the moments that show the target most clearly.
        """

        let user = """
        SCENARIO: \(scenario.title) — \(scenario.briefing)
        MICRO-SKILL: \(skill.name) — \(skill.summary)

        ATTEMPT 1 MEASURED DATA
        \(MetricsDigest.speaking(firstMetrics))

        ATTEMPT 1 TRANSCRIPT
        \(timedTranscript(firstMetrics.sentences, fallback: firstTranscript))

        ATTEMPT 2 MEASURED DATA
        \(MetricsDigest.speaking(secondMetrics))

        ATTEMPT 2 TRANSCRIPT
        \(timedTranscript(secondMetrics.sentences, fallback: secondTranscript))
        """

        return CoachingRequest(
            task: .attemptComparison,
            system: system,
            messages: [CoachingMessage(role: .user, content: user)],
            maxTokens: 3000,
            effort: "medium"
        )
    }

    // MARK: - Conversation

    /// The character's next line.
    ///
    /// The hidden brief is sent every turn as the system prompt, and the visible
    /// conversation is sent as the message history — so the model plays the part
    /// rather than narrating it, and the learner never sees the brief.
    public static func characterTurnRequest(
        scenario: Scenario,
        history: [ConversationTurn],
        turnBudget: Int
    ) -> CoachingRequest {
        guard let character = scenario.character else {
            return CoachingRequest(
                task: .characterTurn,
                system: "You are a person in a conversation. Reply naturally in one or two sentences.",
                messages: history.map(toMessage),
                maxTokens: 1200,
                effort: "low"
            )
        }

        let system = """
        You are playing a real person in a communication training simulation. Stay \
        in character. You are not an assistant and you must never mention coaching, \
        training, or that this is practice.

        WHO YOU ARE
        Name: \(character.name)
        Role: \(character.role)
        Personality: \(character.personality)
        How you feel right now: \(character.emotionalState)

        WHAT YOU ACTUALLY WANT (the other person does not know this)
        \(character.hiddenGoal)

        YOUR CONCERN
        \(character.objection)

        HOW TO PLAY IT
        - React to what the other person actually said, not to what a generic person \
        in your situation might expect. If they ignored your concern, notice that. If \
        they asked a real question, answer it like a real person would — partially, \
        and with the easy part first.
        - Do not agree quickly. Shift position only when they have genuinely earned \
        it: they listened, they understood the concern, and they responded to it.
        - If they listen well, open up and say more of the real thing.
        - If they lecture, sell, or talk over your concern, become shorter and more \
        guarded. Do not become theatrical, cruel or abusive. Real people mostly get \
        quieter, not louder.
        - Speak the way a person actually speaks out loud: one to four sentences, \
        contractions, no bullet points, no stage directions, no asterisks.
        - You may ask questions back.

        WHEN THE CONVERSATION ENDS
        Set shouldEnd to true when either of these is true:
        - Objective reached: \(character.successCondition)
        - Objective clearly missed: \(character.failCondition)
        Also end if the conversation has plainly run its natural course. There are \
        about \(turnBudget) exchanges available in total; do not drag it out to fill them.

        innerState is your private read of the moment — one sentence, honest, never \
        spoken aloud. The learner sees it only after the conversation ends.
        observedMove names one specific thing the other person just did, if anything \
        notable ("asked an open question and waited"), otherwise omit it.
        """

        var messages = history.map(toMessage)
        if messages.isEmpty {
            messages = [
                CoachingMessage(
                    role: .user,
                    content: "[The conversation is starting. Open with your first line.]"
                )
            ]
        }

        return CoachingRequest(
            task: .characterTurn,
            system: system,
            messages: messages,
            maxTokens: 1500,
            effort: "low"
        )
    }

    public static func conversationDebriefRequest(
        scenario: Scenario,
        skill: MicroSkill,
        turns: [ConversationTurn],
        metrics: ConversationMetrics,
        attemptNumber: Int
    ) -> CoachingRequest {
        let characterContext: String
        if let character = scenario.character {
            characterContext = """
            The person they were speaking to was \(character.name), \(character.role).
            What that person actually wanted: \(character.hiddenGoal)
            Their stated concern: \(character.objection)
            Success looked like: \(character.successCondition)
            """
        } else {
            characterContext = ""
        }

        let system = """
        \(groundRules)

        You are debriefing a simulated conversation. The learner was practising \
        "\(skill.name)": \(skill.summary)

        \(characterContext)

        Judge the conversation on whether the learner found out what the other person \
        actually wanted and responded to it — not on whether they were pleasant.

        Note that interruptions were not measured: the simulation is turn-based, so \
        the learner physically could not talk over the other person. Do not comment on \
        interrupting.

        Set targetSkillID to one of: \(availableSkillIDs(for: scenario)).
        """

        let user = """
        SCENARIO: \(scenario.title)
        Setting: \(scenario.briefing)
        Objectives:
        \(objectiveList(scenario))
        Attempt number: \(attemptNumber)

        MEASURED DATA (computed on device, not by you)
        \(MetricsDigest.conversation(metrics))

        TRANSCRIPT
        \(conversationTranscript(turns, scenario: scenario))
        """

        return CoachingRequest(
            task: .conversationDebrief,
            system: system,
            messages: [CoachingMessage(role: .user, content: user)],
            maxTokens: 4000,
            effort: "medium"
        )
    }

    // MARK: - Formatting helpers

    static func toMessage(_ turn: ConversationTurn) -> CoachingMessage {
        // The learner is "user"; the character's own past lines are "assistant",
        // which is what keeps the model anchored in the role across turns.
        CoachingMessage(role: turn.speaker == .user ? .user : .assistant, content: turn.text)
    }

    static func objectiveList(_ scenario: Scenario) -> String {
        scenario.objectives
            .map { "- \($0.text)\($0.isBonus ? " (bonus)" : "")" }
            .joined(separator: "\n")
    }

    static func timeLimitLine(_ scenario: Scenario) -> String {
        guard let limit = scenario.timeLimitSeconds else { return "Time limit: none (untimed practice)" }
        return "Time limit: \(limit) seconds"
    }

    static func previousTargetLine(_ skillID: String?) -> String {
        guard let skillID, let skill = Curriculum.skill(id: skillID) else { return "" }
        return "Previous target they were working on: \(skill.name)"
    }

    /// Skills the model may choose as a target: the scenario's path, plus the
    /// scenario's own primary skill in case it lives elsewhere in the tree.
    static func availableSkillIDs(for scenario: Scenario) -> String {
        var ids = Curriculum.skills(inPath: scenario.pathID).map { $0.id }
        if !ids.contains(scenario.primarySkillID) { ids.append(scenario.primarySkillID) }
        return ids.joined(separator: ", ")
    }

    static func timedTranscript(_ sentences: [TimedSentence], fallback: String) -> String {
        guard !sentences.isEmpty else { return fallback }
        return sentences
            .map { "[\(timestamp($0.start))] \($0.text)" }
            .joined(separator: "\n")
    }

    static func conversationTranscript(_ turns: [ConversationTurn], scenario: Scenario) -> String {
        let characterName = scenario.character?.name ?? "Them"
        return turns
            .map { turn in
                let speaker = turn.speaker == .user ? "LEARNER" : characterName.uppercased()
                return "\(speaker): \(turn.text)"
            }
            .joined(separator: "\n\n")
    }

    public static func timestamp(_ seconds: TimeInterval) -> String {
        let total = Int(seconds.rounded())
        return String(format: "%d:%02d", total / 60, total % 60)
    }
}

/// Renders measured data into the compact, clearly-labelled block the model reads.
///
/// Every line says where the number came from. That framing is what stops the
/// model treating "pace variation" as something it heard.
public enum MetricsDigest {

    public static func speaking(_ metrics: SpeakingMetrics) -> String {
        var lines: [String] = []
        lines.append("- Total length: \(format(metrics.totalDuration)) seconds")
        if let limit = metrics.timeLimit {
            let verdict = (metrics.withinTimeLimit ?? false) ? "within limit" : "OVER the limit"
            lines.append("- Time limit: \(format(limit))s — \(verdict)")
        }
        lines.append("- Words: \(metrics.wordCount)")
        lines.append("- Pace: \(Int(metrics.wordsPerMinute.rounded())) words/min overall, \(Int(metrics.articulationRate.rounded())) while actually speaking")
        lines.append("- Pace variation index: \(String(format: "%.2f", metrics.paceVariation)) (0.00 = perfectly even; slowest 10s window \(Int(metrics.slowestWindowWPM.rounded())) wpm, fastest \(Int(metrics.fastestWindowWPM.rounded())) wpm)")

        if metrics.fillerCount > 0 {
            let detail = metrics.fillers.prefix(5).map { "\"\($0.token)\" x\($0.count)" }.joined(separator: ", ")
            lines.append("- Filler words: \(metrics.fillerCount) total (\(String(format: "%.1f", metrics.fillerRate)) per 100 words) — \(detail)")
        } else {
            lines.append("- Filler words: none detected")
        }

        if metrics.hedgeCount > 0 {
            let detail = metrics.hedges.prefix(5).map { "\"\($0.token)\" x\($0.count)" }.joined(separator: ", ")
            lines.append("- Hedging words (often legitimate, judge in context): \(detail)")
        }

        if !metrics.repeatedPhrases.isEmpty {
            let detail = metrics.repeatedPhrases.map { "\"\($0.phrase)\" x\($0.count)" }.joined(separator: ", ")
            lines.append("- Repeated phrases: \(detail)")
        }

        if !metrics.longPauses.isEmpty {
            let detail = metrics.longPauses
                .prefix(4)
                .map { "\(format($0.duration))s at \(PromptBuilder.timestamp($0.start))" }
                .joined(separator: ", ")
            lines.append("- Pauses over \(format(Thresholds.longPause))s: \(detail)")
        }

        if metrics.leadingSilence > 0.8 {
            lines.append("- Silence before first word: \(format(metrics.leadingSilence))s")
        }

        lines.append("- Sentences: \(metrics.sentences.count), average \(Int(metrics.averageSentenceWordCount.rounded())) words, longest \(metrics.longestSentenceWordCount) words")
        return lines.joined(separator: "\n")
    }

    public static func conversation(_ metrics: ConversationMetrics) -> String {
        var lines: [String] = []
        lines.append("- Exchanges: \(metrics.turnCount) turns total, \(metrics.userTurnCount) from the learner")
        lines.append("- Talking time: learner \(format(metrics.userSpeakingSeconds))s measured, other person ~\(format(metrics.characterSpeakingSecondsEstimated))s ESTIMATED from word count")
        lines.append("- Learner's share of talking time: \(Int((metrics.userTalkShare * 100).rounded()))% (estimate, because the other side is synthesised)")
        lines.append("- Questions asked by the learner: \(metrics.questions.count) — \(metrics.openQuestionCount) open, \(metrics.closedQuestionCount) closed, \(metrics.clarifyingQuestionCount) clarifying")
        if metrics.stackedQuestionTurns > 0 {
            lines.append("- Turns containing more than one question: \(metrics.stackedQuestionTurns)")
        }
        lines.append("- Acknowledgment phrases detected: \(metrics.acknowledgmentCount)")
        lines.append("- Learner turn length: average \(Int(metrics.averageUserTurnWords.rounded())) words, longest \(metrics.longestUserTurnWords)")
        lines.append("- Interruptions: NOT MEASURED (turn-based simulation)")
        if metrics.userSpeech.fillerCount > 0 {
            lines.append("- Filler words across the learner's turns: \(metrics.userSpeech.fillerCount)")
        }
        return lines.joined(separator: "\n")
    }

    private static func format(_ value: TimeInterval) -> String {
        String(format: "%.1f", value)
    }
}
