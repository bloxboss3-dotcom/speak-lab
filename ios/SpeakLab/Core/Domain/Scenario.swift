import Foundation

public enum PracticeMode: String, Codable, CaseIterable, Sendable {
    case speaking
    case conversation

    public var displayName: String {
        switch self {
        case .speaking: return "Speaking"
        case .conversation: return "Conversation"
        }
    }
}

/// Difficulty band. Higher tiers reduce assistance (shorter prep, tighter time
/// limits, less cooperative characters) rather than simply adding words.
public enum DifficultyTier: Int, Codable, CaseIterable, Sendable, Comparable {
    case foundation = 1
    case applied = 2
    case pressure = 3
    case boss = 4

    public static func < (lhs: DifficultyTier, rhs: DifficultyTier) -> Bool {
        lhs.rawValue < rhs.rawValue
    }

    public var displayName: String {
        switch self {
        case .foundation: return "Foundation"
        case .applied: return "Applied"
        case .pressure: return "Pressure"
        case .boss: return "Boss"
        }
    }

    /// XP multiplier for attempting work at this tier.
    public var xpMultiplier: Double {
        switch self {
        case .foundation: return 1.0
        case .applied: return 1.25
        case .pressure: return 1.6
        case .boss: return 2.0
        }
    }

    /// Default seconds of planning time before recording starts.
    public var defaultPrepSeconds: Int {
        switch self {
        case .foundation: return 45
        case .applied: return 30
        case .pressure: return 20
        case .boss: return 15
        }
    }
}

/// One thing the learner is trying to achieve in the scenario.
public struct Objective: Identifiable, Codable, Hashable, Sendable {
    public let id: String
    public let text: String
    public let isBonus: Bool

    public init(id: String, text: String, isBonus: Bool = false) {
        self.id = id
        self.text = text
        self.isBonus = isBonus
    }
}

/// The hidden brief for a simulated person.
///
/// This is never rendered before the attempt — the learner must discover the
/// goal and objection by listening, exactly as in life. It is revealed in the
/// debrief so the learner can check their read of the room.
public struct CharacterBrief: Codable, Hashable, Sendable {
    public let name: String
    public let role: String
    /// Two or three traits, e.g. "warm but time-poor; talks in specifics".
    public let personality: String
    public let emotionalState: String
    /// What they actually want, which may not be what they first say.
    public let hiddenGoal: String
    /// The concern they will raise, directly or obliquely.
    public let objection: String
    /// Their opening line, so every run starts identically.
    public let opensWith: String
    /// What the learner must achieve for the character to shift position.
    public let successCondition: String
    /// What causes the conversation to end unsuccessfully.
    public let failCondition: String
    /// Rough vocal character for speech synthesis: "warm-mid", "brisk-low", etc.
    public let voiceHint: String

    public init(
        name: String,
        role: String,
        personality: String,
        emotionalState: String,
        hiddenGoal: String,
        objection: String,
        opensWith: String,
        successCondition: String,
        failCondition: String,
        voiceHint: String
    ) {
        self.name = name
        self.role = role
        self.personality = personality
        self.emotionalState = emotionalState
        self.hiddenGoal = hiddenGoal
        self.objection = objection
        self.opensWith = opensWith
        self.successCondition = successCondition
        self.failCondition = failCondition
        self.voiceHint = voiceHint
    }
}

/// A practice mission.
public struct Scenario: Identifiable, Codable, Hashable, Sendable {
    public let id: String
    public let title: String
    /// One line shown in lists, written to make the next mission sound worth doing.
    public let hook: String
    public let mode: PracticeMode
    public let pathID: String
    public let primarySkillID: String
    public let tier: DifficultyTier
    /// Narrative setup shown before practice: where you are, who is in front of you.
    public let briefing: String
    public let objectives: [Objective]
    /// Nil means untimed (used for the anxiety ladder's first rung).
    public let timeLimitSeconds: Int?
    public let prepSeconds: Int
    /// Present only for conversation scenarios.
    public let character: CharacterBrief?
    /// If set, this scenario is a transfer variant of another scenario.
    public let transferOf: String?
    /// What changed relative to the parent scenario, shown when offering transfer.
    public let transferTwist: String?
    public let tags: [String]

    public init(
        id: String,
        title: String,
        hook: String,
        mode: PracticeMode,
        pathID: String,
        primarySkillID: String,
        tier: DifficultyTier,
        briefing: String,
        objectives: [Objective],
        timeLimitSeconds: Int?,
        prepSeconds: Int? = nil,
        character: CharacterBrief? = nil,
        transferOf: String? = nil,
        transferTwist: String? = nil,
        tags: [String] = []
    ) {
        self.id = id
        self.title = title
        self.hook = hook
        self.mode = mode
        self.pathID = pathID
        self.primarySkillID = primarySkillID
        self.tier = tier
        self.briefing = briefing
        self.objectives = objectives
        self.timeLimitSeconds = timeLimitSeconds
        self.prepSeconds = prepSeconds ?? tier.defaultPrepSeconds
        self.character = character
        self.transferOf = transferOf
        self.transferTwist = transferTwist
        self.tags = tags
    }

    public var requiredObjectives: [Objective] { objectives.filter { !$0.isBonus } }
    public var bonusObjectives: [Objective] { objectives.filter { $0.isBonus } }
}
