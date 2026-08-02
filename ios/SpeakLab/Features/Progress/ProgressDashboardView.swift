import Charts
import SwiftData
import SwiftUI

/// Progress over time.
///
/// Charts appear only where a trend genuinely means something. There is no
/// overall "communication score" — a single number would imply a precision the
/// app doesn't have, and would hide the thing that matters, which is whether
/// specific behaviours are changing.
struct ProgressDashboardView: View {

    @Environment(\.modelContext) private var context
    @Query private var profiles: [ProfileRecord]
    @Query(sort: \PracticeSessionRecord.startedAt, order: .forward) private var sessions: [PracticeSessionRecord]
    @Query private var skillProgress: [SkillProgressRecord]
    @Query private var missions: [RealWorldMissionRecord]

    private var profile: ProfileRecord? { profiles.first }
    private var completed: [PracticeSessionRecord] { sessions.filter { $0.completedAt != nil } }

    var body: some View {
        NavigationStack {
            ZStack {
                ScreenBackground()
                ScrollView {
                    VStack(alignment: .leading, spacing: Theme.Space.l) {
                        if completed.isEmpty {
                            NoticeCard(
                                title: "Nothing to show yet",
                                message: "Finish a session and this fills up. Everything here is measured from your own recordings.",
                                systemImage: "chart.xyaxis.line"
                            )
                        } else {
                            headlineStats
                            practiceFrequencyCard
                            fillerTrendCard
                            paceTrendCard
                            retentionCard
                            baselineCard
                            personalBestsCard
                            realWorldCard
                        }
                    }
                    .padding(Theme.Space.l)
                    .padding(.bottom, Theme.Space.xl)
                }
            }
            .navigationTitle("Progress")
        }
    }

    // MARK: - Headline

    private var headlineStats: some View {
        Card {
            VStack(alignment: .leading, spacing: Theme.Space.m) {
                HStack(spacing: Theme.Space.l) {
                    StatTile(value: "\(completed.count)", label: "Sessions")
                    StatTile(value: "\(retryCount)", label: "Retries")
                    StatTile(
                        value: "\(improvedCount)",
                        label: "Targets hit",
                        caption: improvementRateCaption,
                        tint: Theme.Palette.positive
                    )
                }
                Divider().overlay(Theme.Palette.hairline)
                HStack(spacing: Theme.Space.l) {
                    StatTile(value: "\(profile?.streakBest ?? 0)", label: "Best streak")
                    StatTile(value: "\(fluentSkillCount)", label: "Fluent skills")
                    StatTile(value: "\(completedMissionCount)", label: "Real-world")
                }
            }
        }
    }

    private var retryCount: Int {
        completed.filter { $0.attempts.count > 1 }.count
    }

    private var improvedCount: Int {
        completed.filter { $0.targetImproved }.count
    }

    private var improvementRateCaption: String? {
        guard retryCount > 0 else { return nil }
        return "\(Int((Double(improvedCount) / Double(retryCount) * 100).rounded()))% of retries"
    }

    private var fluentSkillCount: Int {
        skillProgress.filter { $0.mastery.band == .fluent }.count
    }

    private var completedMissionCount: Int {
        missions.filter { $0.isComplete }.count
    }

    // MARK: - Charts

    /// Weeks are plotted as labelled categories rather than binned dates: the
    /// date-binning overloads in Charts are fussy, and eight short labels read
    /// better on a phone anyway.
    private struct WeekPoint: Identifiable {
        let id = UUID()
        let label: String
        let count: Int
    }

    private struct TrendPoint: Identifiable {
        let id = UUID()
        let date: Date
        let value: Double
        let index: Int
    }

    private var weeklyCounts: [WeekPoint] {
        let calendar = Calendar.current
        var buckets: [Date: Int] = [:]
        for session in completed {
            guard let date = session.completedAt else { continue }
            let week = StreakEngine.startOfWeek(for: date, calendar: calendar)
            buckets[week, default: 0] += 1
        }
        let formatter = DateFormatter()
        formatter.dateFormat = "d MMM"
        return buckets
            .sorted { $0.key < $1.key }
            .suffix(8)
            .map { WeekPoint(label: formatter.string(from: $0.key), count: $0.value) }
    }

    private var practiceFrequencyCard: some View {
        Card {
            VStack(alignment: .leading, spacing: Theme.Space.m) {
                SectionLabel(text: "Practice frequency")
                if weeklyCounts.count < 2 {
                    Text("Practise across two different weeks to see the trend.")
                        .font(Theme.Font.body(14))
                        .foregroundStyle(Theme.Palette.inkMuted)
                } else {
                    Chart(weeklyCounts) { point in
                        BarMark(
                            x: .value("Week", point.label),
                            y: .value("Sessions", point.count)
                        )
                        .foregroundStyle(Theme.Palette.accent)
                        .cornerRadius(4)
                    }
                    .frame(height: 130)
                    .chartYAxis {
                        AxisMarks(position: .leading)
                    }
                }
            }
        }
    }

    /// Filler rate per attempt, oldest first. Per 100 words so long and short
    /// attempts are comparable.
    private var fillerTrend: [TrendPoint] {
        var points: [TrendPoint] = []
        var index = 0
        for session in completed {
            for attempt in session.orderedAttempts {
                guard let metrics = attempt.metrics, metrics.wordCount > 20 else { continue }
                points.append(TrendPoint(date: attempt.createdAt, value: metrics.fillerRate, index: index))
                index += 1
            }
        }
        return points.suffix(24).map { $0 }
    }

    private var fillerTrendCard: some View {
        Card {
            VStack(alignment: .leading, spacing: Theme.Space.m) {
                HStack {
                    SectionLabel(text: "Filler words")
                    Spacer()
                    if let change = trendChange(fillerTrend) {
                        Pill(
                            text: change < 0 ? "down \(abs(Int(change.rounded())))%" : "up \(Int(change.rounded()))%",
                            foreground: change < 0 ? Theme.Palette.positive : Theme.Palette.caution,
                            background: change < 0 ? Theme.Palette.positiveSoft : Theme.Palette.cautionSoft
                        )
                    }
                }
                if fillerTrend.count < 3 {
                    Text("A few more attempts and this becomes meaningful.")
                        .font(Theme.Font.body(14))
                        .foregroundStyle(Theme.Palette.inkMuted)
                } else {
                    Chart(fillerTrend) { point in
                        LineMark(
                            x: .value("Attempt", point.index),
                            y: .value("Per 100 words", point.value)
                        )
                        .foregroundStyle(Theme.Palette.accent)
                        .interpolationMethod(.monotone)
                        PointMark(
                            x: .value("Attempt", point.index),
                            y: .value("Per 100 words", point.value)
                        )
                        .foregroundStyle(Theme.Palette.accent)
                        .symbolSize(24)
                    }
                    .frame(height: 130)
                    .chartXAxis(.hidden)
                    Text("Fillers per 100 words, oldest attempt on the left.")
                        .font(Theme.Font.caption(11))
                        .foregroundStyle(Theme.Palette.inkFaint)
                }
            }
        }
    }

    private var paceTrend: [TrendPoint] {
        var points: [TrendPoint] = []
        var index = 0
        for session in completed {
            for attempt in session.orderedAttempts {
                guard let metrics = attempt.metrics, metrics.wordsPerMinute > 0 else { continue }
                points.append(TrendPoint(date: attempt.createdAt, value: metrics.wordsPerMinute, index: index))
                index += 1
            }
        }
        return points.suffix(24).map { $0 }
    }

    private var paceTrendCard: some View {
        Card {
            VStack(alignment: .leading, spacing: Theme.Space.m) {
                SectionLabel(text: "Speaking pace")
                if paceTrend.count < 3 {
                    Text("Not enough attempts yet.")
                        .font(Theme.Font.body(14))
                        .foregroundStyle(Theme.Palette.inkMuted)
                } else {
                    Chart {
                        RuleMark(y: .value("Comfortable low", Thresholds.comfortablePaceRange.lowerBound))
                            .foregroundStyle(Theme.Palette.positive.opacity(0.5))
                            .lineStyle(StrokeStyle(lineWidth: 1, dash: [4, 4]))
                        RuleMark(y: .value("Comfortable high", Thresholds.comfortablePaceRange.upperBound))
                            .foregroundStyle(Theme.Palette.positive.opacity(0.5))
                            .lineStyle(StrokeStyle(lineWidth: 1, dash: [4, 4]))

                        ForEach(paceTrend) { point in
                            LineMark(
                                x: .value("Attempt", point.index),
                                y: .value("Words per minute", point.value)
                            )
                            .foregroundStyle(Theme.Palette.ink)
                            .interpolationMethod(.monotone)
                        }
                    }
                    .frame(height: 130)
                    .chartXAxis(.hidden)
                    Text("The dashed lines mark the range most listeners find comfortable. Outside it isn't wrong — it's just worth knowing.")
                        .font(Theme.Font.caption(11))
                        .foregroundStyle(Theme.Palette.inkFaint)
                }
            }
        }
    }

    private func trendChange(_ points: [TrendPoint]) -> Double? {
        guard points.count >= 4 else { return nil }
        let half = points.count / 2
        let firstHalf = points.prefix(half).map { $0.value }
        let secondHalf = points.suffix(points.count - half).map { $0.value }
        let firstAverage = firstHalf.reduce(0, +) / Double(firstHalf.count)
        let secondAverage = secondHalf.reduce(0, +) / Double(secondHalf.count)
        guard firstAverage > 0.01 else { return nil }
        return (secondAverage - firstAverage) / firstAverage * 100
    }

    // MARK: - Retention and baseline

    private var retentionCard: some View {
        Card {
            VStack(alignment: .leading, spacing: Theme.Space.m) {
                SectionLabel(text: "Held up in review")
                let reviewed = skillProgress.filter { ($0.reviewState?.reviewCount ?? 0) > 0 }
                if reviewed.isEmpty {
                    Text("Skills come back for review a few days after you learn them. Nothing is due yet.")
                        .font(Theme.Font.body(14))
                        .foregroundStyle(Theme.Palette.inkMuted)
                } else {
                    ForEach(reviewed, id: \.skillID) { record in
                        HStack {
                            Text(record.skill?.name ?? record.skillID)
                                .font(Theme.Font.body(14))
                                .foregroundStyle(Theme.Palette.ink)
                            Spacer()
                            Text("\(record.reviewCount) review\(record.reviewCount == 1 ? "" : "s")")
                                .font(Theme.Font.caption(12))
                                .foregroundStyle(Theme.Palette.inkMuted)
                            if record.reviewLapses > 0 {
                                Pill(
                                    text: "\(record.reviewLapses) slip",
                                    foreground: Theme.Palette.caution,
                                    background: Theme.Palette.cautionSoft
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    private var baselineSessions: [PracticeSessionRecord] {
        completed.filter { $0.isBaseline }
    }

    @ViewBuilder
    private var baselineCard: some View {
        Card {
            VStack(alignment: .leading, spacing: Theme.Space.m) {
                SectionLabel(text: "Baseline")
                if baselineSessions.count < 2 {
                    Text(baselineSessions.isEmpty
                         ? "Record a baseline so there's an honest starting point to compare against."
                         : "You have one baseline. A second, comparable one later will show what actually changed.")
                        .font(Theme.Font.body(14))
                        .foregroundStyle(Theme.Palette.inkMuted)
                } else if let first = baselineSessions.first?.orderedAttempts.first?.metrics,
                          let last = baselineSessions.last?.orderedAttempts.first?.metrics {
                    VStack(spacing: Theme.Space.s) {
                        ComparisonRow(
                            label: "Filler rate",
                            before: String(format: "%.1f", first.fillerRate),
                            after: String(format: "%.1f", last.fillerRate)
                        )
                        ComparisonRow(
                            label: "Words per minute",
                            before: "\(Int(first.wordsPerMinute.rounded()))",
                            after: "\(Int(last.wordsPerMinute.rounded()))"
                        )
                        ComparisonRow(
                            label: "Opening sentence",
                            before: "\(first.sentences.first?.wordCount ?? 0) words",
                            after: "\(last.sentences.first?.wordCount ?? 0) words"
                        )
                    }
                    Text("Two comparable-but-different tasks, so improvement can't come from having memorised one.")
                        .font(Theme.Font.caption(11))
                        .foregroundStyle(Theme.Palette.inkFaint)
                }
            }
        }
    }

    // MARK: - Records

    private var personalBestsCard: some View {
        Card {
            VStack(alignment: .leading, spacing: Theme.Space.m) {
                SectionLabel(text: "Personal records")
                let allMetrics = completed.flatMap { $0.orderedAttempts.compactMap { $0.metrics } }
                    .filter { $0.wordCount > 20 }

                if allMetrics.isEmpty {
                    Text("Nothing recorded yet.")
                        .font(Theme.Font.body(14))
                        .foregroundStyle(Theme.Palette.inkMuted)
                } else {
                    HStack(spacing: Theme.Space.l) {
                        StatTile(
                            value: String(format: "%.1f", allMetrics.map { $0.fillerRate }.min() ?? 0),
                            label: "Fewest fillers",
                            caption: "per 100 words"
                        )
                        StatTile(
                            value: String(format: "%.2f", allMetrics.map { $0.paceVariation }.max() ?? 0),
                            label: "Most vocal variety",
                            caption: "pace variation"
                        )
                        StatTile(
                            value: "\(allMetrics.map { $0.sentences.first?.wordCount ?? 99 }.min() ?? 0)",
                            label: "Shortest opening",
                            caption: "words"
                        )
                    }
                }
            }
        }
    }

    private var realWorldCard: some View {
        Card {
            VStack(alignment: .leading, spacing: Theme.Space.m) {
                SectionLabel(text: "Used for real")
                let done = missions.filter { $0.isComplete }.sorted { ($0.completedAt ?? .distantPast) > ($1.completedAt ?? .distantPast) }
                if done.isEmpty {
                    Text("When you use a skill in a real conversation and report back, it shows up here. That's the part that counts.")
                        .font(Theme.Font.body(14))
                        .foregroundStyle(Theme.Palette.inkMuted)
                } else {
                    ForEach(done.prefix(4)) { mission in
                        VStack(alignment: .leading, spacing: 3) {
                            HStack {
                                Text(mission.skill?.name ?? mission.skillID)
                                    .font(Theme.Font.heading(14))
                                    .foregroundStyle(Theme.Palette.ink)
                                Spacer()
                                if let date = mission.completedAt {
                                    Text(Format.relativeDay(date))
                                        .font(Theme.Font.caption(11))
                                        .foregroundStyle(Theme.Palette.inkFaint)
                                }
                            }
                            if let reflection = mission.reflection, !reflection.isEmpty {
                                Text(reflection)
                                    .font(Theme.Font.body(13))
                                    .foregroundStyle(Theme.Palette.inkMuted)
                                    .lineLimit(3)
                            }
                        }
                    }
                }
            }
        }
    }
}
