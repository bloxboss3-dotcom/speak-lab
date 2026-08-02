import SwiftUI

/// Mission brief: the narrative setup, the objectives, and the one micro-skill
/// being trained — with a short strong and weak model where one helps.
///
/// The hidden character brief is deliberately absent. The learner discovers
/// what the other person wants by listening, exactly as in life.
struct SessionBriefView: View {
    @ObservedObject var model: SessionViewModel

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Theme.Space.l) {
                header
                objectives
                skillCard
                examples
                if model.shouldAskAnxiety { anxietyRating }
            }
            .padding(Theme.Space.l)
            .padding(.bottom, 100)
        }
        .safeAreaInset(edge: .bottom) {
            VStack(spacing: Theme.Space.s) {
                PrimaryButton(title: "Start", systemImage: "arrow.right") {
                    model.beginPlanning()
                }
                Text("You'll get \(model.scenario.prepSeconds) seconds to think first.")
                    .font(Theme.Font.caption(12))
                    .foregroundStyle(Theme.Palette.inkFaint)
            }
            .padding(Theme.Space.l)
            .background(.ultraThinMaterial)
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: Theme.Space.s) {
            HStack(spacing: Theme.Space.s) {
                Pill(
                    text: model.scenario.tier.displayName,
                    foreground: Theme.Palette.accent,
                    background: Theme.Palette.accentSoft
                )
                Pill(text: model.scenario.mode.displayName, systemImage: model.scenario.mode == .speaking ? "mic" : "bubble.left.and.bubble.right")
                if model.isReview {
                    Pill(text: "Review", systemImage: "arrow.clockwise")
                }
                if model.isTransferRun {
                    Pill(text: "Transfer", systemImage: "arrow.turn.up.right")
                }
            }

            Text(model.scenario.title)
                .font(Theme.Font.display(30))
                .foregroundStyle(Theme.Palette.ink)

            Text(model.scenario.briefing)
                .font(Theme.Font.body(17))
                .foregroundStyle(Theme.Palette.inkMuted)
                .lineSpacing(4)
        }
    }

    private var objectives: some View {
        Card {
            VStack(alignment: .leading, spacing: Theme.Space.m) {
                SectionLabel(text: "What you're trying to do")
                ForEach(model.scenario.objectives) { objective in
                    HStack(alignment: .top, spacing: Theme.Space.s) {
                        Image(systemName: objective.isBonus ? "star" : "circle")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundStyle(objective.isBonus ? Theme.Palette.accent : Theme.Palette.inkFaint)
                            .padding(.top, 2)
                        Text(objective.text)
                            .font(Theme.Font.body(15))
                            .foregroundStyle(Theme.Palette.ink)
                    }
                }
                if let limit = model.scenario.timeLimitSeconds {
                    Divider().overlay(Theme.Palette.hairline)
                    Label("\(limit) seconds", systemImage: "timer")
                        .font(Theme.Font.caption())
                        .foregroundStyle(Theme.Palette.inkMuted)
                } else {
                    Divider().overlay(Theme.Palette.hairline)
                    Label("Untimed — take as long as you like", systemImage: "infinity")
                        .font(Theme.Font.caption())
                        .foregroundStyle(Theme.Palette.inkMuted)
                }
            }
        }
    }

    private var skillCard: some View {
        Card(raised: true) {
            VStack(alignment: .leading, spacing: Theme.Space.s) {
                SectionLabel(text: "Today's one thing", accent: Theme.Palette.accent)
                Text(model.skill.name)
                    .font(Theme.Font.title(20))
                    .foregroundStyle(Theme.Palette.ink)
                Text(model.skill.summary)
                    .font(Theme.Font.body(16))
                    .foregroundStyle(Theme.Palette.ink)
                Text(model.skill.whyItMatters)
                    .font(Theme.Font.body(15))
                    .foregroundStyle(Theme.Palette.inkMuted)
                    .lineSpacing(3)
            }
        }
    }

    @ViewBuilder
    private var examples: some View {
        VStack(alignment: .leading, spacing: Theme.Space.m) {
            ExampleRow(
                label: "Strong",
                text: model.skill.strongExample,
                tint: Theme.Palette.positive,
                background: Theme.Palette.positiveSoft,
                icon: "checkmark"
            )
            if let weak = model.skill.weakExample {
                ExampleRow(
                    label: "Weaker",
                    text: weak,
                    tint: Theme.Palette.caution,
                    background: Theme.Palette.cautionSoft,
                    icon: "minus"
                )
            }
        }
    }

    private var anxietyRating: some View {
        Card {
            VStack(alignment: .leading, spacing: Theme.Space.m) {
                SectionLabel(text: "Before you start")
                Text("How anxious do you feel about this one?")
                    .font(Theme.Font.body(15))
                    .foregroundStyle(Theme.Palette.ink)
                AnxietyScale(value: $model.anxietyBefore)
                Text("Only for your own comparison afterwards. This isn't a clinical measure.")
                    .font(Theme.Font.caption(11))
                    .foregroundStyle(Theme.Palette.inkFaint)
            }
        }
    }
}

struct ExampleRow: View {
    let label: String
    let text: String
    let tint: Color
    let background: Color
    let icon: String

    var body: some View {
        HStack(alignment: .top, spacing: Theme.Space.m) {
            ZStack {
                Circle().fill(background)
                Image(systemName: icon)
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(tint)
            }
            .frame(width: 26, height: 26)

            VStack(alignment: .leading, spacing: 4) {
                Text(label.uppercased())
                    .font(Theme.Font.label(10))
                    .tracking(1.1)
                    .foregroundStyle(tint)
                Text(text)
                    .font(Theme.Font.body(15))
                    .foregroundStyle(Theme.Palette.ink)
                    .italic()
                    .lineSpacing(3)
            }
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

/// A 0–10 self-rating. Deliberately plain, and always labelled as self-reported.
struct AnxietyScale: View {
    @Binding var value: Int?

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.Space.s) {
            HStack(spacing: 5) {
                ForEach(0...10, id: \.self) { number in
                    Button {
                        value = number
                    } label: {
                        Text("\(number)")
                            .font(Theme.Font.caption(12))
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 8)
                            .background(value == number ? Theme.Palette.accent : Theme.Palette.surfaceRaised)
                            .foregroundStyle(value == number ? Theme.Palette.canvas : Theme.Palette.inkMuted)
                            .clipShape(RoundedRectangle(cornerRadius: 7, style: .continuous))
                    }
                    .buttonStyle(.plain)
                }
            }
            HStack {
                Text("Calm").font(Theme.Font.caption(11)).foregroundStyle(Theme.Palette.inkFaint)
                Spacer()
                Text("Very anxious").font(Theme.Font.caption(11)).foregroundStyle(Theme.Palette.inkFaint)
            }
        }
    }
}
