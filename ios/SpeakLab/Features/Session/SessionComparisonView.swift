import SwiftUI

/// Side-by-side comparison of the two attempts.
///
/// The verdict is about the *targeted* behaviour only. A second attempt that
/// was longer, warmer or more polished but left the target untouched is shown
/// as exactly that — rewarding it would teach performance instead of change.
struct SessionComparisonView: View {

    @ObservedObject var model: SessionViewModel
    @State private var showDetail = false

    private var comparison: AttemptComparison? { model.comparison }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Theme.Space.l) {
                if let comparison {
                    verdict(comparison)
                    quotes(comparison)
                    changeLists(comparison)
                    nextStep(comparison)
                    numbers
                } else {
                    NoticeCard(
                        title: "Couldn't compare",
                        message: "The two attempts couldn't be compared, but both are saved.",
                        systemImage: "exclamationmark.triangle"
                    )
                }
                if model.comparisonWasLocal {
                    Label(
                        "Compared on device using measured change only.",
                        systemImage: "iphone"
                    )
                    .font(Theme.Font.caption(12))
                    .foregroundStyle(Theme.Palette.inkFaint)
                }
            }
            .padding(Theme.Space.l)
            .padding(.bottom, 100)
        }
        .safeAreaInset(edge: .bottom) {
            PrimaryButton(title: "Continue", systemImage: "arrow.right") {
                model.continueFromComparison()
            }
            .padding(Theme.Space.l)
            .background(.ultraThinMaterial)
        }
    }

    private func verdict(_ comparison: AttemptComparison) -> some View {
        let improved = comparison.countsAsImprovement
        let superficial = comparison.targetImproved && comparison.changeWasSuperficial

        return VStack(alignment: .leading, spacing: Theme.Space.m) {
            HStack(spacing: Theme.Space.s) {
                Image(systemName: improved ? "checkmark.seal.fill" : (superficial ? "arrow.triangle.2.circlepath" : "circle.dashed"))
                    .font(.system(size: 26))
                    .foregroundStyle(improved ? Theme.Palette.positive : Theme.Palette.caution)
                VStack(alignment: .leading, spacing: 2) {
                    Text(improved ? "The target moved" : (superficial ? "Changed, but not the target" : "The target didn't move yet"))
                        .font(Theme.Font.title(22))
                        .foregroundStyle(Theme.Palette.ink)
                    Text(model.feedback?.primaryTarget ?? "")
                        .font(Theme.Font.caption(12))
                        .foregroundStyle(Theme.Palette.inkMuted)
                }
            }

            Text(comparison.summary)
                .font(Theme.Font.body(16))
                .foregroundStyle(Theme.Palette.inkMuted)
                .lineSpacing(3)
        }
    }

    private func quotes(_ comparison: AttemptComparison) -> some View {
        VStack(spacing: Theme.Space.m) {
            AttemptQuoteCard(
                label: "First attempt",
                quote: comparison.evidenceBefore.isEmpty
                    ? (model.firstAttempt?.metrics.sentences.first?.text ?? "")
                    : comparison.evidenceBefore,
                tint: Theme.Palette.inkMuted
            )
            AttemptQuoteCard(
                label: "Second attempt",
                quote: comparison.evidenceAfter.isEmpty
                    ? (model.secondAttempt?.metrics.sentences.first?.text ?? "")
                    : comparison.evidenceAfter,
                tint: comparison.countsAsImprovement ? Theme.Palette.positive : Theme.Palette.accent
            )
        }
    }

    @ViewBuilder
    private func changeLists(_ comparison: AttemptComparison) -> some View {
        if !comparison.whatChanged.isEmpty || !comparison.whatDidNotChange.isEmpty {
            Card {
                VStack(alignment: .leading, spacing: Theme.Space.m) {
                    if !comparison.whatChanged.isEmpty {
                        VStack(alignment: .leading, spacing: Theme.Space.s) {
                            SectionLabel(text: "What changed", accent: Theme.Palette.positive)
                            ForEach(comparison.whatChanged, id: \.self) { item in
                                BulletRow(text: item, symbol: "arrow.up.right", tint: Theme.Palette.positive)
                            }
                        }
                    }
                    if !comparison.whatDidNotChange.isEmpty {
                        VStack(alignment: .leading, spacing: Theme.Space.s) {
                            SectionLabel(text: "What stayed the same")
                            ForEach(comparison.whatDidNotChange, id: \.self) { item in
                                BulletRow(text: item, symbol: "equal", tint: Theme.Palette.inkFaint)
                            }
                        }
                    }
                }
            }
        }
    }

    private func nextStep(_ comparison: AttemptComparison) -> some View {
        HStack(alignment: .top, spacing: Theme.Space.m) {
            Image(systemName: "arrow.turn.down.right")
                .foregroundStyle(Theme.Palette.accent)
                .padding(.top, 2)
            Text(comparison.nextStep)
                .font(Theme.Font.body(15))
                .foregroundStyle(Theme.Palette.ink)
        }
        .padding(Theme.Space.m)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Theme.Palette.accentSoft)
        .clipShape(RoundedRectangle(cornerRadius: Theme.Radius.medium, style: .continuous))
    }

    @ViewBuilder
    private var numbers: some View {
        if let first = model.firstAttempt, let second = model.secondAttempt {
            DisclosureCard(
                title: "Measured side by side",
                subtitle: "Both attempts",
                isExpanded: $showDetail
            ) {
                VStack(spacing: Theme.Space.s) {
                    ComparisonRow(
                        label: "Length",
                        before: Format.duration(first.metrics.totalDuration),
                        after: Format.duration(second.metrics.totalDuration)
                    )
                    ComparisonRow(
                        label: "Words per minute",
                        before: "\(Int(first.metrics.wordsPerMinute.rounded()))",
                        after: "\(Int(second.metrics.wordsPerMinute.rounded()))"
                    )
                    ComparisonRow(
                        label: "Filler words",
                        before: "\(first.metrics.fillerCount)",
                        after: "\(second.metrics.fillerCount)"
                    )
                    ComparisonRow(
                        label: "Opening sentence",
                        before: "\(first.metrics.sentences.first?.wordCount ?? 0) words",
                        after: "\(second.metrics.sentences.first?.wordCount ?? 0) words"
                    )
                    ComparisonRow(
                        label: "Longest sentence",
                        before: "\(first.metrics.longestSentenceWordCount) words",
                        after: "\(second.metrics.longestSentenceWordCount) words"
                    )
                }
            }
        }
    }
}

struct AttemptQuoteCard: View {
    let label: String
    let quote: String
    let tint: Color

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.Space.s) {
            SectionLabel(text: label, accent: tint)
            Text(quote.isEmpty ? "—" : "\u{201C}\(quote)\u{201D}")
                .font(Theme.Font.body(15))
                .italic()
                .foregroundStyle(Theme.Palette.ink)
                .lineSpacing(3)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(Theme.Space.m)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Theme.Palette.surface)
        .clipShape(RoundedRectangle(cornerRadius: Theme.Radius.medium, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: Theme.Radius.medium, style: .continuous)
                .stroke(Theme.Palette.hairline, lineWidth: 1)
        )
    }
}

struct ComparisonRow: View {
    let label: String
    let before: String
    let after: String

    var body: some View {
        HStack {
            Text(label)
                .font(Theme.Font.body(14))
                .foregroundStyle(Theme.Palette.inkMuted)
            Spacer()
            Text(before)
                .font(Theme.Font.caption(13))
                .foregroundStyle(Theme.Palette.inkFaint)
            Image(systemName: "arrow.right")
                .font(.system(size: 9, weight: .semibold))
                .foregroundStyle(Theme.Palette.inkFaint)
            Text(after)
                .font(Theme.Font.caption(13))
                .foregroundStyle(Theme.Palette.ink)
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(label): was \(before), now \(after)")
    }
}

struct BulletRow: View {
    let text: String
    let symbol: String
    let tint: Color

    var body: some View {
        HStack(alignment: .top, spacing: Theme.Space.s) {
            Image(systemName: symbol)
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(tint)
                .padding(.top, 3)
            Text(text)
                .font(Theme.Font.body(14))
                .foregroundStyle(Theme.Palette.ink)
        }
    }
}
