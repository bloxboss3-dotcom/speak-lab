import Foundation

public enum NuggetCategory: String, Codable, Sendable, CaseIterable {
    case persuasion
    case sales
    case charisma
    case structure
    case listening

    public var displayName: String {
        switch self {
        case .persuasion: return "Persuasion"
        case .sales: return "Ethical sales"
        case .charisma: return "Presence"
        case .structure: return "Structure"
        case .listening: return "Listening"
        }
    }
}

/// A short, practical principle surfaced only when it matches what just happened.
public struct GoldenNugget: Codable, Hashable, Sendable, Identifiable {
    public let id: String
    public let title: String
    public let insight: String
    public let category: NuggetCategory

    public init(id: String, title: String, insight: String, category: NuggetCategory) {
        self.id = id
        self.title = title
        self.insight = insight
        self.category = category
    }
}

/// A changed or harder version of the scenario, proposed after mastery.
public struct TransferSuggestion: Codable, Hashable, Sendable {
    /// Set when the model picked an existing scenario from the catalogue.
    public let scenarioID: String?
    public let title: String
    public let twist: String

    public init(scenarioID: String?, title: String, twist: String) {
        self.scenarioID = scenarioID
        self.title = title
        self.twist = twist
    }
}

public struct RubricObservation: Codable, Hashable, Sendable, Identifiable {
    public let dimension: RubricDimension
    public let rating: RubricRating
    public let observation: String

    public var id: String { dimension.rawValue }

    public init(dimension: RubricDimension, rating: RubricRating, observation: String) {
        self.dimension = dimension
        self.rating = rating
        self.observation = observation
    }
}

/// The structured feedback contract.
///
/// Field names match the schema the proxy enforces, so a change here without a
/// matching change in `server/src/schemas.ts` will fail validation loudly
/// rather than silently producing half-empty feedback.
public struct CoachFeedback: Codable, Hashable, Sendable {
    /// One sentence: what actually happened in the scenario.
    public var scenarioOutcome: String
    /// One to three things that genuinely worked, tied to behaviour.
    public var strengths: [String]
    /// The single most important thing to change. Not a list.
    public var primaryTarget: String
    /// Verbatim words from the transcript that show the moment.
    public var evidenceQuote: String
    /// Why it matters to this listener in this scenario.
    public var explanation: String
    /// One concrete instruction for the immediate retry.
    public var retryInstruction: String
    public var optionalGoldenNugget: GoldenNugget?
    public var rubricObservations: [RubricObservation]
    /// Non-empty when the model saw something requiring care (distress,
    /// a request that would be unethical to coach, and so on).
    public var safetyFlags: [String]
    public var transferScenario: TransferSuggestion?
    /// Which micro-skill the target maps to, so progression can be updated.
    public var targetSkillID: String?

    public init(
        scenarioOutcome: String,
        strengths: [String],
        primaryTarget: String,
        evidenceQuote: String,
        explanation: String,
        retryInstruction: String,
        optionalGoldenNugget: GoldenNugget? = nil,
        rubricObservations: [RubricObservation] = [],
        safetyFlags: [String] = [],
        transferScenario: TransferSuggestion? = nil,
        targetSkillID: String? = nil
    ) {
        self.scenarioOutcome = scenarioOutcome
        self.strengths = strengths
        self.primaryTarget = primaryTarget
        self.evidenceQuote = evidenceQuote
        self.explanation = explanation
        self.retryInstruction = retryInstruction
        self.optionalGoldenNugget = optionalGoldenNugget
        self.rubricObservations = rubricObservations
        self.safetyFlags = safetyFlags
        self.transferScenario = transferScenario
        self.targetSkillID = targetSkillID
    }
}

/// The result of the second attempt, compared against the first.
public struct AttemptComparison: Codable, Hashable, Sendable {
    /// Did the *targeted* behaviour change? Not "was it better overall".
    public var targetImproved: Bool
    /// True when the wording changed but the underlying behaviour did not.
    public var changeWasSuperficial: Bool
    public var summary: String
    public var evidenceBefore: String
    public var evidenceAfter: String
    public var whatChanged: [String]
    public var whatDidNotChange: [String]
    public var nextStep: String

    public init(
        targetImproved: Bool,
        changeWasSuperficial: Bool,
        summary: String,
        evidenceBefore: String,
        evidenceAfter: String,
        whatChanged: [String],
        whatDidNotChange: [String],
        nextStep: String
    ) {
        self.targetImproved = targetImproved
        self.changeWasSuperficial = changeWasSuperficial
        self.summary = summary
        self.evidenceBefore = evidenceBefore
        self.evidenceAfter = evidenceAfter
        self.whatChanged = whatChanged
        self.whatDidNotChange = whatDidNotChange
        self.nextStep = nextStep
    }

    /// Improvement only counts when the target actually moved and the change
    /// was substantive. Rewarding a reworded but unchanged attempt would teach
    /// the wrong lesson.
    public var countsAsImprovement: Bool { targetImproved && !changeWasSuperficial }
}

/// One reply from the simulated person.
public struct CharacterTurnResponse: Codable, Hashable, Sendable {
    /// What the character says out loud.
    public var speech: String
    /// Their private read of the moment. Hidden until the debrief.
    public var innerState: String
    /// Did the learner just do something worth naming later?
    public var observedMove: String?
    public var objectiveMet: Bool
    public var objectiveMissed: Bool
    public var shouldEnd: Bool
    public var endReason: String?

    public init(
        speech: String,
        innerState: String,
        observedMove: String? = nil,
        objectiveMet: Bool = false,
        objectiveMissed: Bool = false,
        shouldEnd: Bool = false,
        endReason: String? = nil
    ) {
        self.speech = speech
        self.innerState = innerState
        self.observedMove = observedMove
        self.objectiveMet = objectiveMet
        self.objectiveMissed = objectiveMissed
        self.shouldEnd = shouldEnd
        self.endReason = endReason
    }
}
