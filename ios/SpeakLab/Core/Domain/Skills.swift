import Foundation

/// A single trainable communication behaviour.
///
/// Micro-skills are deliberately narrow: each one names *one* observable
/// behaviour a person can change inside a five-minute practice loop. Anything
/// broader ("be more confident") is not a micro-skill because it cannot be
/// coached with one instruction or observed in a transcript.
public struct MicroSkill: Identifiable, Codable, Hashable, Sendable {
    public let id: String
    public let pathID: String
    /// Short display name, e.g. "Bottom line first".
    public let name: String
    /// One sentence the learner reads before practising.
    public let summary: String
    /// Why this behaviour changes outcomes for the listener.
    public let whyItMatters: String
    /// A short model of the behaviour done well.
    public let strongExample: String
    /// The same moment done poorly — omitted when a weak model would be noise.
    public let weakExample: String?
    /// The instruction shown on the retry screen.
    public let retryCue: String
    /// Rubric dimension this skill is graded against.
    public let rubricDimension: RubricDimension

    public init(
        id: String,
        pathID: String,
        name: String,
        summary: String,
        whyItMatters: String,
        strongExample: String,
        weakExample: String? = nil,
        retryCue: String,
        rubricDimension: RubricDimension
    ) {
        self.id = id
        self.pathID = pathID
        self.name = name
        self.summary = summary
        self.whyItMatters = whyItMatters
        self.strongExample = strongExample
        self.weakExample = weakExample
        self.retryCue = retryCue
        self.rubricDimension = rubricDimension
    }
}

/// A curriculum track. Paths group micro-skills into a progression and gate
/// later material behind demonstrated behaviour, not time spent in the app.
public struct SkillPath: Identifiable, Codable, Hashable, Sendable {
    public let id: String
    public let name: String
    public let tagline: String
    /// SF Symbol name used by the UI.
    public let symbol: String
    /// Hex accent used by the UI (no alpha).
    public let accentHex: String
    /// Ordered micro-skill IDs.
    public let skillIDs: [String]
    /// Account level required before the path appears. 1 = available at start.
    public let unlocksAtLevel: Int

    public init(
        id: String,
        name: String,
        tagline: String,
        symbol: String,
        accentHex: String,
        skillIDs: [String],
        unlocksAtLevel: Int
    ) {
        self.id = id
        self.name = name
        self.tagline = tagline
        self.symbol = symbol
        self.accentHex = accentHex
        self.skillIDs = skillIDs
        self.unlocksAtLevel = unlocksAtLevel
    }
}

/// The rubric Claude grades against.
///
/// Every dimension here is *behavioural* and evidenced by the transcript or by
/// timing data. Deliberately absent: charisma, confidence, authority, honesty,
/// personality. Those cannot be measured from a recording and pretending
/// otherwise would make the feedback untrustworthy.
public enum RubricDimension: String, Codable, CaseIterable, Sendable {
    case clarity
    case organization
    case concision
    case audienceAdaptation
    case specificity
    case warmthAndRespect
    case listeningAndAcknowledgment
    case questionQuality
    case benefitExplanation
    case concernHandling
    case opening
    case ending

    public var displayName: String {
        switch self {
        case .clarity: return "Clarity"
        case .organization: return "Organization"
        case .concision: return "Concision"
        case .audienceAdaptation: return "Audience adaptation"
        case .specificity: return "Specificity"
        case .warmthAndRespect: return "Warmth & respect"
        case .listeningAndAcknowledgment: return "Listening & acknowledgment"
        case .questionQuality: return "Question quality"
        case .benefitExplanation: return "Explaining benefits"
        case .concernHandling: return "Handling concerns"
        case .opening: return "Opening"
        case .ending: return "Ending / call to action"
        }
    }
}

/// Qualitative band. Intentionally three coarse values — a 0-100 score on
/// "warmth" would be fake precision.
public enum RubricRating: String, Codable, Sendable, CaseIterable {
    case strong
    case adequate
    case needsWork

    public var displayName: String {
        switch self {
        case .strong: return "Strong"
        case .adequate: return "Adequate"
        case .needsWork: return "Needs work"
        }
    }

    /// Used only for internal mastery maths, never shown as a score.
    public var weight: Double {
        switch self {
        case .strong: return 1.0
        case .adequate: return 0.55
        case .needsWork: return 0.15
        }
    }
}
