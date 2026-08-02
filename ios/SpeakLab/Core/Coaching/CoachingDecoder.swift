import Foundation

public enum CoachingDecodingError: Error, Equatable, Sendable {
    case notJSON
    case malformed(String)
    case missingField(String)
    case emptyField(String)

    public var userMessage: String {
        switch self {
        case .notJSON, .malformed:
            return "The coaching response came back in an unexpected shape."
        case .missingField(let field), .emptyField(let field):
            return "The coaching response was missing its \(field)."
        }
    }
}

/// Decodes and validates everything that comes back from the model.
///
/// The proxy already constrains responses with a JSON schema, but the app
/// re-validates anyway: schemas can drift, proxies can be misconfigured, and a
/// half-populated feedback card is worse than an honest error.
public enum CoachingDecoder {

    private static let decoder: JSONDecoder = {
        let decoder = JSONDecoder()
        return decoder
    }()

    // MARK: - Entry points

    public static func decodeFeedback(from data: Data) throws -> CoachFeedback {
        let payload = try jsonObjectData(from: data)
        let raw: RawFeedback
        do {
            raw = try decoder.decode(RawFeedback.self, from: payload)
        } catch {
            throw CoachingDecodingError.malformed(String(describing: error))
        }
        return try raw.validated()
    }

    public static func decodeComparison(from data: Data) throws -> AttemptComparison {
        let payload = try jsonObjectData(from: data)
        let raw: RawComparison
        do {
            raw = try decoder.decode(RawComparison.self, from: payload)
        } catch {
            throw CoachingDecodingError.malformed(String(describing: error))
        }
        return try raw.validated()
    }

    public static func decodeCharacterTurn(from data: Data) throws -> CharacterTurnResponse {
        let payload = try jsonObjectData(from: data)
        let raw: RawCharacterTurn
        do {
            raw = try decoder.decode(RawCharacterTurn.self, from: payload)
        } catch {
            throw CoachingDecodingError.malformed(String(describing: error))
        }
        return try raw.validated()
    }

    // MARK: - Tolerant JSON extraction

    /// Returns the outermost JSON object in `data`.
    ///
    /// Structured outputs should make this a no-op, but a model that has been
    /// nudged into prose or a markdown fence should not cost the learner their
    /// recording. Anything that is not a balanced object still fails.
    public static func jsonObjectData(from data: Data) throws -> Data {
        if (try? JSONSerialization.jsonObject(with: data)) != nil { return data }

        guard let text = String(data: data, encoding: .utf8) else {
            throw CoachingDecodingError.notJSON
        }
        guard let start = text.firstIndex(of: "{") else {
            throw CoachingDecodingError.notJSON
        }

        var depth = 0
        var inString = false
        var escaped = false
        var index = start
        while index < text.endIndex {
            let character = text[index]
            if escaped {
                escaped = false
            } else if character == "\\" && inString {
                escaped = true
            } else if character == "\"" {
                inString.toggle()
            } else if !inString {
                if character == "{" { depth += 1 }
                if character == "}" {
                    depth -= 1
                    if depth == 0 {
                        let slice = String(text[start...index])
                        guard let sliceData = slice.data(using: .utf8),
                              (try? JSONSerialization.jsonObject(with: sliceData)) != nil else {
                            throw CoachingDecodingError.notJSON
                        }
                        return sliceData
                    }
                }
            }
            index = text.index(after: index)
        }
        throw CoachingDecodingError.notJSON
    }

    // MARK: - Wire shapes

    /// Mirrors the server schema. Enums arrive as strings and unknown values
    /// degrade to a sensible default rather than throwing away the response.
    private struct RawFeedback: Decodable {
        var scenarioOutcome: String?
        var strengths: [String]?
        var primaryTarget: String?
        var evidenceQuote: String?
        var explanation: String?
        var retryInstruction: String?
        var optionalGoldenNugget: RawNugget?
        var rubricObservations: [RawObservation]?
        var safetyFlags: [String]?
        var transferScenario: RawTransfer?
        var targetSkillID: String?

        func validated() throws -> CoachFeedback {
            let outcome = try require(scenarioOutcome, "scenarioOutcome")
            let target = try require(primaryTarget, "primaryTarget")
            let quote = try require(evidenceQuote, "evidenceQuote")
            let why = try require(explanation, "explanation")
            let retry = try require(retryInstruction, "retryInstruction")

            var observations: [RubricObservation] = []
            var seenDimensions = Set<RubricDimension>()
            for raw in rubricObservations ?? [] {
                guard let observation = raw.toModel(), !seenDimensions.contains(observation.dimension) else { continue }
                seenDimensions.insert(observation.dimension)
                observations.append(observation)
            }

            return CoachFeedback(
                scenarioOutcome: outcome,
                // Three is the cap: a longer list of strengths dilutes the
                // single target, which is the whole point of the screen.
                strengths: Array(cleaned(strengths).prefix(3)),
                primaryTarget: target,
                evidenceQuote: quote,
                explanation: why,
                retryInstruction: retry,
                optionalGoldenNugget: optionalGoldenNugget?.toModel(),
                rubricObservations: observations,
                safetyFlags: cleaned(safetyFlags),
                transferScenario: transferScenario?.toModel(),
                targetSkillID: nonEmpty(targetSkillID)
            )
        }
    }

    private struct RawObservation: Decodable {
        var dimension: String?
        var rating: String?
        var observation: String?

        func toModel() -> RubricObservation? {
            guard let text = nonEmpty(observation) else { return nil }
            guard let dimensionKey = dimension,
                  let parsedDimension = RubricDimension(rawValue: dimensionKey) else { return nil }
            let parsedRating = rating.flatMap { RubricRating(rawValue: $0) } ?? .adequate
            return RubricObservation(dimension: parsedDimension, rating: parsedRating, observation: text)
        }
    }

    private struct RawNugget: Decodable {
        var id: String?
        var title: String?
        var insight: String?
        var category: String?

        func toModel() -> GoldenNugget? {
            guard let title = nonEmpty(title), let insight = nonEmpty(insight) else { return nil }
            let parsedCategory = category.flatMap { NuggetCategory(rawValue: $0) } ?? .charisma
            return GoldenNugget(
                id: nonEmpty(id) ?? "nugget-\(abs(title.hashValue))",
                title: title,
                insight: insight,
                category: parsedCategory
            )
        }
    }

    private struct RawTransfer: Decodable {
        var scenarioID: String?
        var title: String?
        var twist: String?

        func toModel() -> TransferSuggestion? {
            guard let title = nonEmpty(title) else { return nil }
            return TransferSuggestion(
                scenarioID: nonEmpty(scenarioID),
                title: title,
                twist: nonEmpty(twist) ?? ""
            )
        }
    }

    private struct RawComparison: Decodable {
        var targetImproved: Bool?
        var changeWasSuperficial: Bool?
        var summary: String?
        var evidenceBefore: String?
        var evidenceAfter: String?
        var whatChanged: [String]?
        var whatDidNotChange: [String]?
        var nextStep: String?

        func validated() throws -> AttemptComparison {
            guard let improved = targetImproved else {
                throw CoachingDecodingError.missingField("targetImproved")
            }
            let summaryText = try require(summary, "summary")
            let next = try require(nextStep, "nextStep")
            return AttemptComparison(
                targetImproved: improved,
                changeWasSuperficial: changeWasSuperficial ?? false,
                summary: summaryText,
                evidenceBefore: nonEmpty(evidenceBefore) ?? "",
                evidenceAfter: nonEmpty(evidenceAfter) ?? "",
                whatChanged: cleaned(whatChanged),
                whatDidNotChange: cleaned(whatDidNotChange),
                nextStep: next
            )
        }
    }

    private struct RawCharacterTurn: Decodable {
        var speech: String?
        var innerState: String?
        var observedMove: String?
        var objectiveMet: Bool?
        var objectiveMissed: Bool?
        var shouldEnd: Bool?
        var endReason: String?

        func validated() throws -> CharacterTurnResponse {
            let line = try require(speech, "speech")
            return CharacterTurnResponse(
                speech: line,
                innerState: nonEmpty(innerState) ?? "",
                observedMove: nonEmpty(observedMove),
                objectiveMet: objectiveMet ?? false,
                objectiveMissed: objectiveMissed ?? false,
                shouldEnd: shouldEnd ?? false,
                endReason: nonEmpty(endReason)
            )
        }
    }
}

// MARK: - Small shared helpers

private func nonEmpty(_ value: String?) -> String? {
    guard let trimmed = value?.trimmingCharacters(in: .whitespacesAndNewlines), !trimmed.isEmpty else {
        return nil
    }
    return trimmed
}

private func cleaned(_ values: [String]?) -> [String] {
    (values ?? []).compactMap { nonEmpty($0) }
}

private func require(_ value: String?, _ field: String) throws -> String {
    guard let value else { throw CoachingDecodingError.missingField(field) }
    guard let trimmed = nonEmpty(value) else { throw CoachingDecodingError.emptyField(field) }
    return trimmed
}
