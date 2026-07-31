import SwiftUI

/// The transfer offer, shown only after the target behaviour actually moved.
///
/// This is the "same skill, changed situation" step: the point where a
/// rehearsed win has to survive contact with something different.
struct SessionTransferView: View {

    @ObservedObject var model: SessionViewModel
    @EnvironmentObject private var services: AppServices
    @Environment(\.modelContext) private var context
    let onDismiss: () -> Void

    @State private var startTransfer = false

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.Space.l) {
            Spacer()

            VStack(alignment: .leading, spacing: Theme.Space.s) {
                SectionLabel(text: "Ready for the harder version", accent: Theme.Palette.accent)
                Text(model.transferScenario?.title ?? "A changed scenario")
                    .font(Theme.Font.display(28))
                    .foregroundStyle(Theme.Palette.ink)
                if let twist = model.transferScenario?.transferTwist {
                    Text(twist)
                        .font(Theme.Font.body(16))
                        .foregroundStyle(Theme.Palette.inkMuted)
                }
            }

            if let transfer = model.transferScenario {
                Card {
                    VStack(alignment: .leading, spacing: Theme.Space.s) {
                        Text(transfer.hook)
                            .font(Theme.Font.heading(16))
                            .foregroundStyle(Theme.Palette.ink)
                        Text(transfer.briefing)
                            .font(Theme.Font.body(15))
                            .foregroundStyle(Theme.Palette.inkMuted)
                            .lineSpacing(3)
                        HStack(spacing: Theme.Space.s) {
                            Pill(
                                text: transfer.tier.displayName,
                                foreground: Theme.Palette.accent,
                                background: Theme.Palette.accentSoft
                            )
                            if let limit = transfer.timeLimitSeconds {
                                Pill(text: "\(limit)s", systemImage: "timer")
                            }
                        }
                    }
                }
            }

            Text("You've shown you can do it once. Doing it somewhere slightly different is what makes it stick.")
                .font(Theme.Font.body(14))
                .foregroundStyle(Theme.Palette.inkFaint)

            Spacer()

            VStack(spacing: Theme.Space.s) {
                PrimaryButton(title: "Take it on", systemImage: "flame") {
                    startTransfer = true
                }
                SecondaryButton(title: "Not now — finish here") {
                    model.declineTransfer()
                }
            }
        }
        .padding(Theme.Space.l)
        .navigationDestination(isPresented: $startTransfer) {
            if let transfer = model.transferScenario,
               let skill = Curriculum.skill(id: transfer.primarySkillID) {
                SessionFlowView(
                    scenario: transfer,
                    skill: skill,
                    services: services,
                    store: ProgressStore(context: context),
                    isTransferRun: true
                )
            }
        }
    }
}

/// End-of-session rewards.
///
/// The XP breakdown is itemised on purpose: the learner should be able to see
/// that applying the feedback paid most, and that turning up paid nothing.
struct SessionSummaryView: View {

    @ObservedObject var model: SessionViewModel
    @Environment(\.modelContext) private var context
    let onDone: () -> Void

    @State private var appeared = false

    private var rewards: SessionRewards? { model.rewards }

    var body: some View {
        ScrollView {
            VStack(spacing: Theme.Space.l) {
                headline
                if let rewards {
                    xpCard(rewards)
                    if rewards.leveledUp { levelCard(rewards) }
                    if rewards.masteryImproved { masteryCard(rewards) }
                    streakCard(rewards)
                    if let nugget = rewards.unlockedNugget {
                        GoldenNuggetCard(nugget: nugget, isNew: true)
                    }
                    if let due = rewards.reviewDueDate { reviewCard(due) }
                }
                if model.shouldAskAnxiety { anxietyCard }
            }
            .padding(Theme.Space.l)
            .padding(.bottom, 100)
        }
        .safeAreaInset(edge: .bottom) {
            PrimaryButton(title: "Done", systemImage: "checkmark") {
                onDone()
            }
            .padding(Theme.Space.l)
            .background(.ultraThinMaterial)
        }
        .onAppear {
            withAnimation(Theme.Motion.standard.delay(0.05)) { appeared = true }
        }
    }

    private var headline: some View {
        VStack(spacing: Theme.Space.s) {
            Image(systemName: model.comparison?.countsAsImprovement == true ? "checkmark.seal.fill" : "figure.strengthtraining.functional")
                .font(.system(size: 40))
                .foregroundStyle(Theme.Palette.accent)
                .scaleEffect(appeared ? 1 : 0.6)
                .opacity(appeared ? 1 : 0)

            Text(model.comparison?.countsAsImprovement == true ? "You changed the behaviour" : "Session complete")
                .font(Theme.Font.display(26))
                .foregroundStyle(Theme.Palette.ink)
                .multilineTextAlignment(.center)

            Text(model.scenario.title)
                .font(Theme.Font.caption())
                .foregroundStyle(Theme.Palette.inkMuted)
        }
        .frame(maxWidth: .infinity)
        .padding(.top, Theme.Space.l)
    }

    private func xpCard(_ rewards: SessionRewards) -> some View {
        Card {
            VStack(alignment: .leading, spacing: Theme.Space.m) {
                HStack {
                    SectionLabel(text: "Experience earned")
                    Spacer()
                    Text("+\(rewards.totalXP)")
                        .font(Theme.Font.metric(26))
                        .foregroundStyle(Theme.Palette.accent)
                }
                VStack(spacing: Theme.Space.s) {
                    ForEach(rewards.lines) { line in
                        HStack {
                            Text(line.label)
                                .font(Theme.Font.body(14))
                                .foregroundStyle(Theme.Palette.inkMuted)
                            Spacer()
                            Text("+\(line.xp)")
                                .font(Theme.Font.caption(13))
                                .foregroundStyle(Theme.Palette.ink)
                        }
                    }
                }
            }
        }
    }

    private func levelCard(_ rewards: SessionRewards) -> some View {
        Card(raised: true) {
            VStack(alignment: .leading, spacing: Theme.Space.s) {
                SectionLabel(text: "Level up", accent: Theme.Palette.accent)
                Text("Level \(rewards.newLevel)")
                    .font(Theme.Font.display(30))
                    .foregroundStyle(Theme.Palette.ink)
                if let title = rewards.newTitle {
                    Text(title.name)
                        .font(Theme.Font.title(18))
                        .foregroundStyle(Theme.Palette.accent)
                    Text(title.blurb)
                        .font(Theme.Font.body(14))
                        .foregroundStyle(Theme.Palette.inkMuted)
                }
            }
        }
    }

    private func masteryCard(_ rewards: SessionRewards) -> some View {
        Card {
            VStack(alignment: .leading, spacing: Theme.Space.s) {
                SectionLabel(text: "Mastery", accent: Theme.Palette.positive)
                HStack(spacing: Theme.Space.s) {
                    Text(rewards.masteryBandBefore.displayName)
                        .font(Theme.Font.body(15))
                        .foregroundStyle(Theme.Palette.inkFaint)
                    Image(systemName: "arrow.right")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundStyle(Theme.Palette.inkFaint)
                    Text(rewards.masteryBandAfter.displayName)
                        .font(Theme.Font.title(18))
                        .foregroundStyle(Theme.Palette.positive)
                }
                Text("Earned across different scenarios, not by repeating this one.")
                    .font(Theme.Font.caption(11))
                    .foregroundStyle(Theme.Palette.inkFaint)
            }
        }
    }

    private func streakCard(_ rewards: SessionRewards) -> some View {
        Card(padding: Theme.Space.m) {
            HStack(spacing: Theme.Space.m) {
                Image(systemName: "flame.fill")
                    .foregroundStyle(Theme.Palette.accent)
                VStack(alignment: .leading, spacing: 2) {
                    Text("\(rewards.streakCurrent) day\(rewards.streakCurrent == 1 ? "" : "s") in a row")
                        .font(Theme.Font.heading(15))
                        .foregroundStyle(Theme.Palette.ink)
                    Text(streakSubtitle(rewards.streakOutcome))
                        .font(Theme.Font.caption(12))
                        .foregroundStyle(Theme.Palette.inkMuted)
                }
                Spacer()
            }
        }
    }

    private func streakSubtitle(_ outcome: StreakOutcome) -> String {
        switch outcome {
        case .started: return "First one. That's the hard one."
        case .extended: return "Kept it going."
        case .sameDay: return "Already practised today — this one's a bonus."
        case .savedByFreeze: return "You missed a day; your weekly recovery covered it."
        case .reset: return "Starting fresh. No penalty, no lecture."
        }
    }

    private func reviewCard(_ due: Date) -> some View {
        Card(padding: Theme.Space.m) {
            HStack(spacing: Theme.Space.m) {
                Image(systemName: "calendar.badge.clock")
                    .foregroundStyle(Theme.Palette.inkMuted)
                VStack(alignment: .leading, spacing: 2) {
                    Text("Review scheduled")
                        .font(Theme.Font.heading(15))
                        .foregroundStyle(Theme.Palette.ink)
                    Text("\(model.skill.name) comes back \(Format.relativeDay(due))")
                        .font(Theme.Font.caption(12))
                        .foregroundStyle(Theme.Palette.inkMuted)
                }
                Spacer()
            }
        }
    }

    private var anxietyCard: some View {
        Card {
            VStack(alignment: .leading, spacing: Theme.Space.m) {
                SectionLabel(text: "How do you feel now?")
                AnxietyScale(value: $model.anxietyAfter)
                if let before = model.anxietyBefore, let after = model.anxietyAfter {
                    Text(anxietyComparison(before: before, after: after))
                        .font(Theme.Font.body(14))
                        .foregroundStyle(Theme.Palette.inkMuted)
                }
                Text("Your own rating, tracked over time. Not a diagnosis and not shared anywhere.")
                    .font(Theme.Font.caption(11))
                    .foregroundStyle(Theme.Palette.inkFaint)
            }
        }
    }

    private func anxietyComparison(before: Int, after: Int) -> String {
        if after < before { return "Down \(before - after) from before you started." }
        if after > before { return "Up \(after - before) from before. That happens — it usually falls with repetition." }
        return "Unchanged from before you started."
    }
}
