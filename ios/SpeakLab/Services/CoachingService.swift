import Foundation

enum CoachingServiceError: LocalizedError, Equatable {
    case notConfigured
    case offline
    case timedOut
    case refused
    case rateLimited
    case serverUnavailable
    case badResponse(String)
    case http(status: Int, code: String?, message: String?)

    var errorDescription: String? {
        switch self {
        case .notConfigured:
            return "No coaching server is set up yet."
        case .offline:
            return "You appear to be offline."
        case .timedOut:
            return "The coach took too long to respond."
        case .refused:
            return "The coach declined to analyse this one."
        case .rateLimited:
            return "Too many requests in a row. Give it a moment."
        case .serverUnavailable:
            return "The coaching service is unavailable right now."
        case .badResponse(let detail):
            return "The coach sent something unexpected. \(detail)"
        case .http(let status, _, let message):
            return message ?? "The coaching server returned an error (\(status))."
        }
    }

    /// Whether trying the same request again could plausibly work.
    var isRetryable: Bool {
        switch self {
        case .offline, .timedOut, .rateLimited, .serverUnavailable:
            return true
        case .http(let status, _, _):
            return status >= 500
        default:
            return false
        }
    }
}

/// The seam between the app and whatever is answering coaching requests.
///
/// Everything downstream of this protocol is testable without a network, and
/// swapping the proxy for a direct key — or for the offline stub — changes
/// nothing else in the app.
protocol CoachingService: Sendable {
    var isConfigured: Bool { get }
    /// Returns the validated `data` object as JSON.
    func run(_ request: CoachingRequest) async throws -> Data
}

/// Talks to the SpeakLab proxy. This is the supported configuration.
struct ProxyCoachingService: CoachingService {
    let baseURL: URL
    let secret: String?
    var session: URLSession = .shared

    var isConfigured: Bool { true }

    func run(_ request: CoachingRequest) async throws -> Data {
        var urlRequest = URLRequest(url: baseURL.appendingPathComponent("v1/coach"))
        urlRequest.httpMethod = "POST"
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let secret { urlRequest.setValue(secret, forHTTPHeaderField: "x-speaklab-key") }
        urlRequest.timeoutInterval = 120
        urlRequest.httpBody = try JSONEncoder().encode(request)

        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await session.data(for: urlRequest)
        } catch let error as URLError {
            switch error.code {
            case .timedOut: throw CoachingServiceError.timedOut
            case .notConnectedToInternet, .networkConnectionLost, .cannotConnectToHost,
                 .cannotFindHost, .dataNotAllowed:
                throw CoachingServiceError.offline
            default:
                throw CoachingServiceError.serverUnavailable
            }
        }

        guard let http = response as? HTTPURLResponse else {
            throw CoachingServiceError.badResponse("No HTTP response.")
        }

        if http.statusCode == 200 {
            guard let payload = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let inner = payload["data"] else {
                throw CoachingServiceError.badResponse("Missing data field.")
            }
            return try JSONSerialization.data(withJSONObject: inner)
        }

        let envelope = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
        let error = envelope?["error"] as? [String: Any]
        let code = error?["code"] as? String
        let message = error?["message"] as? String

        switch http.statusCode {
        case 422 where code == "refused": throw CoachingServiceError.refused
        case 429: throw CoachingServiceError.rateLimited
        case 503, 504: throw CoachingServiceError.serverUnavailable
        default: throw CoachingServiceError.http(status: http.statusCode, code: code, message: message)
        }
    }
}

/// Development-only path that calls Anthropic directly with a key from the
/// Keychain.
///
/// This exists so the app can be exercised before a proxy is deployed. It is
/// clearly labelled in Settings, and the key is never bundled or committed —
/// but a key on a device is still a key on a device, which is exactly why the
/// proxy is the supported configuration.
struct DirectCoachingService: CoachingService {
    let apiKey: String
    var model: String = "claude-opus-5"
    var session: URLSession = .shared

    var isConfigured: Bool { !apiKey.isEmpty }

    func run(_ request: CoachingRequest) async throws -> Data {
        var urlRequest = URLRequest(url: URL(string: "https://api.anthropic.com/v1/messages")!)
        urlRequest.httpMethod = "POST"
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        urlRequest.setValue(apiKey, forHTTPHeaderField: "x-api-key")
        urlRequest.setValue("2023-06-01", forHTTPHeaderField: "anthropic-version")
        urlRequest.timeoutInterval = 120

        let body: [String: Any] = [
            "model": model,
            "max_tokens": request.maxTokens,
            "system": request.system,
            "messages": request.messages.map { ["role": $0.role.rawValue, "content": $0.content] },
            "output_config": [
                "effort": request.effort,
                "format": [
                    "type": "json_schema",
                    "schema": ResponseSchemas.schema(for: request.task)
                ]
            ]
        ]
        urlRequest.httpBody = try JSONSerialization.data(withJSONObject: body)

        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await session.data(for: urlRequest)
        } catch let error as URLError {
            throw error.code == .timedOut ? CoachingServiceError.timedOut : CoachingServiceError.offline
        }

        guard let http = response as? HTTPURLResponse else {
            throw CoachingServiceError.badResponse("No HTTP response.")
        }
        guard http.statusCode == 200 else {
            if http.statusCode == 429 { throw CoachingServiceError.rateLimited }
            if http.statusCode >= 500 { throw CoachingServiceError.serverUnavailable }
            throw CoachingServiceError.http(status: http.statusCode, code: nil, message: nil)
        }

        guard let payload = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            throw CoachingServiceError.badResponse("Response was not JSON.")
        }
        if payload["stop_reason"] as? String == "refusal" {
            throw CoachingServiceError.refused
        }
        // Thinking blocks come first on Opus 5, so find the text block rather
        // than assuming index zero.
        guard let content = payload["content"] as? [[String: Any]],
              let text = content.first(where: { $0["type"] as? String == "text" })?["text"] as? String,
              let textData = text.data(using: .utf8) else {
            throw CoachingServiceError.badResponse("No text content in the response.")
        }
        return textData
    }
}

/// Used when nothing is configured. Always fails, so the caller falls through
/// to on-device coaching — which is a supported mode, not an error state.
struct UnconfiguredCoachingService: CoachingService {
    var isConfigured: Bool { false }

    func run(_ request: CoachingRequest) async throws -> Data {
        throw CoachingServiceError.notConfigured
    }
}

/// Response schemas for the direct-key path.
///
/// The proxy owns the canonical copies; these mirror them so development mode
/// behaves identically. Kept minimal on purpose — the Swift decoder is the
/// thing that actually protects the UI.
enum ResponseSchemas {
    static func schema(for task: CoachingTask) -> [String: Any] {
        switch task {
        case .attemptFeedback, .conversationDebrief: return feedback
        case .attemptComparison: return comparison
        case .characterTurn: return characterTurn
        }
    }

    private static let nullableString: [String: Any] = [
        "anyOf": [["type": "string"], ["type": "null"]]
    ]

    private static var feedback: [String: Any] {
        [
            "type": "object",
            "additionalProperties": false,
            "required": [
                "scenarioOutcome", "strengths", "primaryTarget", "evidenceQuote",
                "explanation", "retryInstruction", "optionalGoldenNugget",
                "rubricObservations", "safetyFlags", "transferScenario", "targetSkillID"
            ],
            "properties": [
                "scenarioOutcome": ["type": "string"],
                "strengths": ["type": "array", "items": ["type": "string"]],
                "primaryTarget": ["type": "string"],
                "evidenceQuote": ["type": "string"],
                "explanation": ["type": "string"],
                "retryInstruction": ["type": "string"],
                "optionalGoldenNugget": [
                    "anyOf": [
                        [
                            "type": "object",
                            "additionalProperties": false,
                            "required": ["id", "title", "insight", "category"],
                            "properties": [
                                "id": ["type": "string"],
                                "title": ["type": "string"],
                                "insight": ["type": "string"],
                                "category": [
                                    "type": "string",
                                    "enum": NuggetCategory.allCases.map { $0.rawValue }
                                ]
                            ]
                        ],
                        ["type": "null"]
                    ]
                ],
                "rubricObservations": [
                    "type": "array",
                    "items": [
                        "type": "object",
                        "additionalProperties": false,
                        "required": ["dimension", "rating", "observation"],
                        "properties": [
                            "dimension": [
                                "type": "string",
                                "enum": RubricDimension.allCases.map { $0.rawValue }
                            ],
                            "rating": [
                                "type": "string",
                                "enum": RubricRating.allCases.map { $0.rawValue }
                            ],
                            "observation": ["type": "string"]
                        ]
                    ]
                ],
                "safetyFlags": ["type": "array", "items": ["type": "string"]],
                "transferScenario": [
                    "anyOf": [
                        [
                            "type": "object",
                            "additionalProperties": false,
                            "required": ["scenarioID", "title", "twist"],
                            "properties": [
                                "scenarioID": nullableString,
                                "title": ["type": "string"],
                                "twist": ["type": "string"]
                            ]
                        ],
                        ["type": "null"]
                    ]
                ],
                "targetSkillID": nullableString
            ]
        ]
    }

    private static var comparison: [String: Any] {
        [
            "type": "object",
            "additionalProperties": false,
            "required": [
                "targetImproved", "changeWasSuperficial", "summary", "evidenceBefore",
                "evidenceAfter", "whatChanged", "whatDidNotChange", "nextStep"
            ],
            "properties": [
                "targetImproved": ["type": "boolean"],
                "changeWasSuperficial": ["type": "boolean"],
                "summary": ["type": "string"],
                "evidenceBefore": ["type": "string"],
                "evidenceAfter": ["type": "string"],
                "whatChanged": ["type": "array", "items": ["type": "string"]],
                "whatDidNotChange": ["type": "array", "items": ["type": "string"]],
                "nextStep": ["type": "string"]
            ]
        ]
    }

    private static var characterTurn: [String: Any] {
        [
            "type": "object",
            "additionalProperties": false,
            "required": [
                "speech", "innerState", "observedMove",
                "objectiveMet", "objectiveMissed", "shouldEnd", "endReason"
            ],
            "properties": [
                "speech": ["type": "string"],
                "innerState": ["type": "string"],
                "observedMove": nullableString,
                "objectiveMet": ["type": "boolean"],
                "objectiveMissed": ["type": "boolean"],
                "shouldEnd": ["type": "boolean"],
                "endReason": nullableString
            ]
        ]
    }
}
