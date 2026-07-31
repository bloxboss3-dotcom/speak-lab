import Foundation

/// What the recorder and transcriber hand to the metrics engine.
public struct SpeechAnalysisInput: Codable, Hashable, Sendable {
    public let transcript: String
    /// May be empty if the recogniser returned no timings; the calculator
    /// degrades to transcript-only metrics rather than failing.
    public let segments: [SpeechSegment]
    public let totalDuration: TimeInterval
    public let timeLimit: TimeInterval?

    public init(
        transcript: String,
        segments: [SpeechSegment] = [],
        totalDuration: TimeInterval,
        timeLimit: TimeInterval? = nil
    ) {
        self.transcript = transcript
        self.segments = segments
        self.totalDuration = totalDuration
        self.timeLimit = timeLimit
    }
}

/// Computes every objective metric locally.
///
/// Nothing here calls a network or a model. If the model is unavailable the
/// learner still gets these numbers, which is the point: the measurable part
/// of the feedback loop must never depend on a server being up.
public enum SpeechMetricsCalculator {

    public static func metrics(for input: SpeechAnalysisInput) -> SpeakingMetrics {
        let segments = input.segments.sorted { $0.start < $1.start }
        let transcript = resolvedTranscript(input.transcript, segments: segments)
        let tokens = normalizedTokens(in: transcript)

        guard !tokens.isEmpty else {
            return emptyMetrics(duration: input.totalDuration, timeLimit: input.timeLimit)
        }

        let duration = max(input.totalDuration, segments.last?.end ?? 0)
        let leadingSilence = segments.first?.start ?? 0

        let gaps = pauseGaps(in: segments)
        let pausedTime = gaps
            .filter { $0.duration > Thresholds.articulationPauseGap }
            .reduce(0) { $0 + $1.duration }
        let speakingDuration = max(0, duration - leadingSilence - pausedTime)

        let wordsPerMinute = rate(words: tokens.count, seconds: duration)
        let articulationRate = rate(
            words: tokens.count,
            seconds: speakingDuration > 0 ? speakingDuration : duration
        )

        let (fillers, fillerTotal) = countFillers(in: tokens)
        let (hedges, hedgeTotal) = countHedges(in: tokens)
        let fillerRate = tokens.isEmpty ? 0 : Double(fillerTotal) / Double(tokens.count) * 100

        let longPauses = gaps.filter { $0.duration >= Thresholds.longPause }
        let sentences = buildSentences(
            segments: segments,
            transcript: transcript,
            totalDuration: duration,
            totalWords: tokens.count
        )
        let pace = paceProfile(segments: segments, fallbackWPM: wordsPerMinute, duration: duration)

        let sentenceWordCounts = sentences.map { $0.wordCount }
        let averageSentenceWords = sentenceWordCounts.isEmpty
            ? Double(tokens.count)
            : Double(sentenceWordCounts.reduce(0, +)) / Double(sentenceWordCounts.count)

        var withinLimit: Bool?
        if let limit = input.timeLimit { withinLimit = duration <= limit + 0.5 }

        return SpeakingMetrics(
            totalDuration: duration,
            speakingDuration: speakingDuration,
            leadingSilence: leadingSilence,
            wordCount: tokens.count,
            wordsPerMinute: wordsPerMinute,
            articulationRate: articulationRate,
            fillers: fillers,
            fillerCount: fillerTotal,
            fillerRate: fillerRate,
            hedges: hedges,
            hedgeCount: hedgeTotal,
            repeatedPhrases: repeatedPhrases(in: tokens),
            longPauses: longPauses,
            longestPause: gaps.map { $0.duration }.max() ?? 0,
            paceVariation: pace.variation,
            slowestWindowWPM: pace.slowest,
            fastestWindowWPM: pace.fastest,
            sentences: sentences,
            averageSentenceWordCount: averageSentenceWords,
            longestSentenceWordCount: sentenceWordCounts.max() ?? tokens.count,
            timeLimit: input.timeLimit,
            withinTimeLimit: withinLimit
        )
    }

    // MARK: - Tokenising

    /// Lowercased words with punctuation stripped. Apostrophes are kept so
    /// "don't" stays one word rather than becoming "don" and "t".
    public static func normalizedTokens(in text: String) -> [String] {
        var tokens: [String] = []
        var current = ""
        for character in text.lowercased() {
            if character.isLetter || character.isNumber || character == "'" || character == "\u{2019}" {
                current.append(character == "\u{2019}" ? "'" : character)
            } else {
                if !current.isEmpty { tokens.append(trimApostrophes(current)) }
                current = ""
            }
        }
        if !current.isEmpty { tokens.append(trimApostrophes(current)) }
        return tokens.filter { !$0.isEmpty }
    }

    private static func trimApostrophes(_ word: String) -> String {
        var result = Substring(word)
        while result.first == "'" { result = result.dropFirst() }
        while result.last == "'" { result = result.dropLast() }
        return String(result)
    }

    private static func resolvedTranscript(_ transcript: String, segments: [SpeechSegment]) -> String {
        let trimmed = transcript.trimmingCharacters(in: .whitespacesAndNewlines)
        if !trimmed.isEmpty { return trimmed }
        return segments.map { $0.text }.joined(separator: " ")
    }

    private static func rate(words: Int, seconds: TimeInterval) -> Double {
        guard seconds > 0.01 else { return 0 }
        return Double(words) / (seconds / 60)
    }

    private static func emptyMetrics(duration: TimeInterval, timeLimit: TimeInterval?) -> SpeakingMetrics {
        var metrics = SpeakingMetrics.empty
        metrics = SpeakingMetrics(
            totalDuration: duration,
            speakingDuration: 0,
            leadingSilence: duration,
            wordCount: 0,
            wordsPerMinute: 0,
            articulationRate: 0,
            fillers: [], fillerCount: 0, fillerRate: 0,
            hedges: [], hedgeCount: 0, repeatedPhrases: [],
            longPauses: [], longestPause: 0,
            paceVariation: 0, slowestWindowWPM: 0, fastestWindowWPM: 0,
            sentences: [], averageSentenceWordCount: 0, longestSentenceWordCount: 0,
            timeLimit: timeLimit,
            withinTimeLimit: timeLimit.map { duration <= $0 + 0.5 }
        )
        return metrics
    }

    // MARK: - Fillers

    private static func countFillers(in tokens: [String]) -> ([FillerHit], Int) {
        var counts: [String: Int] = [:]

        for token in tokens where FillerLexicon.hardFillers.contains(token) {
            counts[token, default: 0] += 1
        }

        // Longest phrases first so "you know what i mean" is not also counted as "you know".
        let phrases = FillerLexicon.fillerPhrases.sorted { $0.count > $1.count }
        var consumed = Set<Int>()
        for phrase in phrases {
            guard phrase.count <= tokens.count else { continue }
            var index = 0
            while index + phrase.count <= tokens.count {
                let window = Array(tokens[index..<(index + phrase.count)])
                let overlaps = (index..<(index + phrase.count)).contains { consumed.contains($0) }
                if !overlaps && window == phrase {
                    counts[phrase.joined(separator: " "), default: 0] += 1
                    for offset in index..<(index + phrase.count) { consumed.insert(offset) }
                    index += phrase.count
                } else {
                    index += 1
                }
            }
        }

        let hits = counts
            .map { FillerHit(token: $0.key, count: $0.value) }
            .sorted { ($0.count, $1.token) > ($1.count, $0.token) }
        return (hits, hits.reduce(0) { $0 + $1.count })
    }

    private static func countHedges(in tokens: [String]) -> ([FillerHit], Int) {
        var counts: [String: Int] = [:]
        for token in tokens where FillerLexicon.hedges.contains(token) {
            counts[token, default: 0] += 1
        }
        let hits = counts
            .map { FillerHit(token: $0.key, count: $0.value) }
            .sorted { ($0.count, $1.token) > ($1.count, $0.token) }
        return (hits, hits.reduce(0) { $0 + $1.count })
    }

    // MARK: - Repetition

    /// Repeated multi-word phrases, longest and most frequent first.
    ///
    /// Hard fillers are removed first so that "um, um, um" does not swamp the
    /// genuinely interesting repetitions like "at the end of the day".
    public static func repeatedPhrases(in tokens: [String]) -> [RepeatedPhrase] {
        let content = tokens.filter { !FillerLexicon.hardFillers.contains($0) }
        guard content.count >= Thresholds.minRepeatedPhraseWords * 2 else { return [] }

        var candidates: [(phrase: String, count: Int, length: Int)] = []
        let maxN = min(Thresholds.maxRepeatedPhraseWords, content.count / 2)
        guard maxN >= Thresholds.minRepeatedPhraseWords else { return [] }

        for n in Thresholds.minRepeatedPhraseWords...maxN {
            var counts: [String: Int] = [:]
            for index in 0...(content.count - n) {
                let phrase = content[index..<(index + n)].joined(separator: " ")
                counts[phrase, default: 0] += 1
            }
            for (phrase, count) in counts where count >= 2 {
                candidates.append((phrase, count, n))
            }
        }

        let ordered = candidates.sorted {
            if $0.length != $1.length { return $0.length > $1.length }
            if $0.count != $1.count { return $0.count > $1.count }
            return $0.phrase < $1.phrase
        }

        var result: [RepeatedPhrase] = []
        for candidate in ordered {
            let isSubsumed = result.contains { $0.phrase.contains(candidate.phrase) }
            if !isSubsumed {
                result.append(RepeatedPhrase(phrase: candidate.phrase, count: candidate.count))
            }
            if result.count == 5 { break }
        }
        return result
    }

    // MARK: - Pauses

    private static func pauseGaps(in segments: [SpeechSegment]) -> [LongPause] {
        guard segments.count > 1 else { return [] }
        var gaps: [LongPause] = []
        var wordsSoFar = 0
        for index in 0..<(segments.count - 1) {
            wordsSoFar += normalizedTokens(in: segments[index].text).count
            let gap = segments[index + 1].start - segments[index].end
            if gap > 0 {
                gaps.append(
                    LongPause(
                        start: segments[index].end,
                        duration: gap,
                        afterWordIndex: max(0, wordsSoFar - 1)
                    )
                )
            }
        }
        return gaps
    }

    // MARK: - Sentences

    private static func buildSentences(
        segments: [SpeechSegment],
        transcript: String,
        totalDuration: TimeInterval,
        totalWords: Int
    ) -> [TimedSentence] {
        guard !segments.isEmpty else {
            return sentencesWithoutTimings(
                transcript: transcript,
                totalDuration: totalDuration,
                totalWords: totalWords
            )
        }

        var sentences: [TimedSentence] = []
        var buffer: [SpeechSegment] = []

        func flush() {
            guard let first = buffer.first, let last = buffer.last else { return }
            let text = buffer
                .map { $0.text.trimmingCharacters(in: .whitespaces) }
                .filter { !$0.isEmpty }
                .joined(separator: " ")
            guard !text.isEmpty else { buffer.removeAll(); return }
            sentences.append(
                TimedSentence(
                    text: text,
                    start: first.start,
                    end: last.end,
                    wordCount: normalizedTokens(in: text).count
                )
            )
            buffer.removeAll()
        }

        for (index, segment) in segments.enumerated() {
            buffer.append(segment)
            let trimmed = segment.text.trimmingCharacters(in: .whitespaces)
            let endsSentence = trimmed.hasSuffix(".") || trimmed.hasSuffix("!") || trimmed.hasSuffix("?")
            var pauseBreak = false
            if index + 1 < segments.count {
                pauseBreak = segments[index + 1].start - segment.end >= Thresholds.sentenceBreakPause
            }
            if endsSentence || pauseBreak || index == segments.count - 1 {
                flush()
            }
        }
        flush()
        return sentences
    }

    /// Fallback when the recogniser gave us no timings: split on punctuation and
    /// distribute the duration proportionally to word count. Timings are then
    /// approximate, and callers should treat them as such.
    private static func sentencesWithoutTimings(
        transcript: String,
        totalDuration: TimeInterval,
        totalWords: Int
    ) -> [TimedSentence] {
        let pieces = transcript
            .components(separatedBy: CharacterSet(charactersIn: ".!?"))
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }
        guard !pieces.isEmpty, totalWords > 0 else { return [] }

        var sentences: [TimedSentence] = []
        var elapsed: TimeInterval = 0
        for piece in pieces {
            let words = normalizedTokens(in: piece).count
            let share = Double(words) / Double(totalWords)
            let length = totalDuration * share
            sentences.append(
                TimedSentence(text: piece, start: elapsed, end: elapsed + length, wordCount: words)
            )
            elapsed += length
        }
        return sentences
    }

    // MARK: - Pace

    private struct PaceProfile {
        let variation: Double
        let slowest: Double
        let fastest: Double
    }

    /// Windowed pace analysis.
    ///
    /// This is what backs observations like "your pace barely changed during the
    /// story". It is derived from recogniser timings, not from audio analysis,
    /// and is labelled as such wherever it is shown.
    private static func paceProfile(
        segments: [SpeechSegment],
        fallbackWPM: Double,
        duration: TimeInterval
    ) -> PaceProfile {
        guard duration >= Thresholds.paceWindow * 2, !segments.isEmpty else {
            return PaceProfile(variation: 0, slowest: fallbackWPM, fastest: fallbackWPM)
        }

        let windowCount = Int(ceil(duration / Thresholds.paceWindow))
        var wordsPerWindow = [Double](repeating: 0, count: windowCount)

        for segment in segments {
            let words = Double(normalizedTokens(in: segment.text).count)
            guard words > 0 else { continue }
            // Spread a segment's words across the windows it spans.
            let spanStart = segment.start
            let spanEnd = max(segment.end, segment.start + 0.01)
            let span = spanEnd - spanStart
            for window in 0..<windowCount {
                let windowStart = Double(window) * Thresholds.paceWindow
                let windowEnd = windowStart + Thresholds.paceWindow
                let overlap = min(spanEnd, windowEnd) - max(spanStart, windowStart)
                if overlap > 0 {
                    wordsPerWindow[window] += words * (overlap / span)
                }
            }
        }

        var rates: [Double] = []
        for window in 0..<windowCount {
            let windowStart = Double(window) * Thresholds.paceWindow
            let seconds = min(Thresholds.paceWindow, duration - windowStart)
            // Ignore stub windows and windows with no speech at all: a silent
            // tail would otherwise read as a dramatic pace change.
            guard seconds >= 3, wordsPerWindow[window] >= 1 else { continue }
            rates.append(wordsPerWindow[window] / (seconds / 60))
        }

        guard rates.count >= 2 else {
            return PaceProfile(variation: 0, slowest: fallbackWPM, fastest: fallbackWPM)
        }

        let mean = rates.reduce(0, +) / Double(rates.count)
        guard mean > 0 else {
            return PaceProfile(variation: 0, slowest: fallbackWPM, fastest: fallbackWPM)
        }
        let variance = rates.reduce(0) { $0 + pow($1 - mean, 2) } / Double(rates.count)
        return PaceProfile(
            variation: sqrt(variance) / mean,
            slowest: rates.min() ?? mean,
            fastest: rates.max() ?? mean
        )
    }
}
