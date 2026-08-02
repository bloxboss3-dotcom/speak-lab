import Foundation

/// Whether a quoted piece of feedback actually appears in what the learner said.
public struct GroundingResult: Hashable, Sendable {
    public let verified: Bool
    /// 0…1 overlap between the quote and the best-matching span of transcript.
    public let similarity: Double
    /// The span of the original transcript that matched, for highlighting.
    public let matchedRange: Range<String.Index>?
    public let matchedText: String?

    public init(
        verified: Bool,
        similarity: Double,
        matchedRange: Range<String.Index>? = nil,
        matchedText: String? = nil
    ) {
        self.verified = verified
        self.similarity = similarity
        self.matchedRange = matchedRange
        self.matchedText = matchedText
    }

    public static let unverified = GroundingResult(verified: false, similarity: 0)
}

/// Checks that model-supplied quotes come from the transcript.
///
/// A coach who misquotes you loses your trust permanently, and a model that is
/// allowed to paraphrase evidence will eventually invent it. Quotes that fail
/// this check are still shown, but they are visibly marked as paraphrase and
/// lose their "jump to this moment" affordance.
public enum TranscriptGrounding {

    /// Overlap at or above this counts as a real quote. Set below 1.0 because
    /// recognisers punctuate inconsistently and models tidy up filler words.
    public static let verificationThreshold: Double = 0.75

    public static func verify(quote: String, in transcript: String) -> GroundingResult {
        let quoteTokens = SpeechMetricsCalculator.normalizedTokens(in: quote)
        guard !quoteTokens.isEmpty else { return .unverified }

        let transcriptTokens = tokensWithRanges(in: transcript)
        guard !transcriptTokens.isEmpty else { return .unverified }

        // Exact contiguous match.
        if quoteTokens.count <= transcriptTokens.count {
            for start in 0...(transcriptTokens.count - quoteTokens.count) {
                let window = transcriptTokens[start..<(start + quoteTokens.count)]
                if window.map({ $0.token }) == quoteTokens {
                    let range = window.first!.range.lowerBound..<window.last!.range.upperBound
                    return GroundingResult(
                        verified: true,
                        similarity: 1.0,
                        matchedRange: range,
                        matchedText: String(transcript[range])
                    )
                }
            }
        }

        // Best fuzzy window. Handles tidied filler words and light rewording.
        let windowSize = min(quoteTokens.count, transcriptTokens.count)
        var bestScore = 0.0
        var bestRange: Range<String.Index>?

        var quoteCounts: [String: Int] = [:]
        for token in quoteTokens { quoteCounts[token, default: 0] += 1 }

        for start in 0...(transcriptTokens.count - windowSize) {
            let window = transcriptTokens[start..<(start + windowSize)]
            var remaining = quoteCounts
            var matched = 0
            for entry in window {
                if let count = remaining[entry.token], count > 0 {
                    remaining[entry.token] = count - 1
                    matched += 1
                }
            }
            let score = Double(matched) / Double(quoteTokens.count)
            if score > bestScore {
                bestScore = score
                bestRange = window.first!.range.lowerBound..<window.last!.range.upperBound
            }
            if bestScore >= 1.0 { break }
        }

        let verified = bestScore >= verificationThreshold
        return GroundingResult(
            verified: verified,
            similarity: bestScore,
            matchedRange: verified ? bestRange : nil,
            matchedText: verified ? bestRange.map { String(transcript[$0]) } : nil
        )
    }

    /// The sentence a quote came from, so the player can seek to that second.
    public static func locate(quote: String, in sentences: [TimedSentence]) -> TimedSentence? {
        let quoteTokens = Set(SpeechMetricsCalculator.normalizedTokens(in: quote))
        guard !quoteTokens.isEmpty else { return nil }

        var best: (sentence: TimedSentence, score: Double)?
        for sentence in sentences {
            let sentenceTokens = Set(SpeechMetricsCalculator.normalizedTokens(in: sentence.text))
            guard !sentenceTokens.isEmpty else { continue }
            let overlap = Double(quoteTokens.intersection(sentenceTokens).count) / Double(quoteTokens.count)
            if overlap > (best?.score ?? 0) { best = (sentence, overlap) }
        }
        guard let best, best.score >= 0.5 else { return nil }
        return best.sentence
    }

    // MARK: - Tokenising with positions

    private struct PositionedToken {
        let token: String
        let range: Range<String.Index>
    }

    private static func tokensWithRanges(in text: String) -> [PositionedToken] {
        var tokens: [PositionedToken] = []
        var current = ""
        var start: String.Index?
        var index = text.startIndex

        func flush(end: String.Index) {
            guard let tokenStart = start, !current.isEmpty else {
                current = ""
                start = nil
                return
            }
            let normalized = current.lowercased().trimmingCharacters(in: CharacterSet(charactersIn: "'"))
            if !normalized.isEmpty {
                tokens.append(PositionedToken(token: normalized, range: tokenStart..<end))
            }
            current = ""
            start = nil
        }

        while index < text.endIndex {
            let character = text[index]
            if character.isLetter || character.isNumber || character == "'" || character == "\u{2019}" {
                if start == nil { start = index }
                current.append(character == "\u{2019}" ? "'" : character)
            } else {
                flush(end: index)
            }
            index = text.index(after: index)
        }
        flush(end: text.endIndex)
        return tokens
    }
}
