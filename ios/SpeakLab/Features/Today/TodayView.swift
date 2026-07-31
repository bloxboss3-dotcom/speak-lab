import SwiftData
import SwiftUI

/// The home screen. Its only real job is to get someone into practice in one
/// tap, and to make the next thing sound worth doing.
struct TodayView: View {

    @EnvironmentObject private var services: AppServices
    @Environment(\.modelContext) private var context

    @Query private var profiles: [ProfileRecord]
    @Query(sort: \PracticeSessionRecord.startedAt, order: .reverse) private var sessions: [PracticeSessionRecord]
    @Query private var skillProgress: [SkillProgressRecord]
    @Query private var missions: [RealWorldMissionRecord]

    @State private var recommendation: Recommendation?
    @State private var showMissionSheet: RealWorldMissionRecord?

    private var store: ProgressStore { ProgressStore(context: context) }

    private var profile: ProfileRecord? { profiles.first }

    var body: some View {
        NavigationStack {
            ZStack {
                ScreenBackground()
                ScrollView {
                    VStack(alignment: .leading, spacing: Theme.Space.l) {
                        greeting
                        heroCard
                        if !dueReviews.isEmpty { reviewSection }
                        if !openMissions.isEmpty { missionSection }
                        weeklySection
                        quickPickSection
                        if sessions.isEmpty { firstRunHelp }
                    }
                    .padding(Theme.Space.l)
                    .padding(.bottom, Theme.Space.xl)
                }
            }
            .navigationTitle(Branding.appName)
            .navigationBarTitleDisplayMode(.inline)
            .onAppear { refreshRecommendation() }
            .sheet(item: $showMissionSheet) { mission in
                RealWorldReportSheet(mission: mission, store: store)
            }
        }
    }

    // MARK: - Sections

    private var greeting: some View {
        VStack(alignment: .leading, spacing: Theme.Space.xs) {
            Text(Branding.tagline)
                .font(Theme.Font.caption())
                .foregroundStyle(Theme.Palette.inkFaint)
            HStack(alignment: .firstTextBaseline, spacing: Theme.Space.s) {
                Text("Level \(profile?.level ?? 1)")
                    .font(Theme.Font.display(28))
                    .foregroundStyle(Theme.Palette.ink)
                Text(profile?.title.name ?? TitleLadder.titles[0].name)
                    .font(Theme.Font.caption())
                    .foregroundStyle(Theme.Palette.accent)
            }
            MeterBar(progress: LevelCurve.progress(forXP: profile?.totalXP ?? 0))
                .padding(.top, 2)
        }
    }

    @ViewBuilder
    private var heroCard: some View {
        if let recommendation {
            NavigationLink {
                destination(for: recommendation.scenario, skill: recommendation.skill, isReview: recommendation.isReview)
            } label: {
                Card(raised: true) {
                    VStack(alignment: .leading, spacing: Theme.Space.m) {
                        HStack(spacing: Theme.Space.s) {
                            SectionLabel(text: recommendation.reason, accent: Theme.Palette.accent)
                            Spacer()
                            Pill(
                                text: recommendation.scenario.tier.displayName,
                                foreground: Theme.Palette.accent,
                                background: Theme.Palette.accentSoft
                            )
                        }

                        Text(recommendation.scenario.title)
                            .font(Theme.Font.display(26))
                            .foregroundStyle(Theme.Palette.ink)
                            .multilineTextAlignment(.leading)

                        Text(recommendation.scenario.hook)
                            .font(Theme.Font.body(16))
                            .foregroundStyle(Theme.Palette.inkMuted)
                            .multilineTextAlignment(.leading)

                        HStack(spacing: Theme.Space.s) {
                            Pill(
                                text: recommendation.scenario.mode.displayName,
                                systemImage: recommendation.scenario.mode == .speaking ? "mic" : "bubble.left.and.bubble.right"
                            )
                            Pill(text: recommendation.skill.name, systemImage: "target")
                            Spacer()
                            Image(systemName: "arrow.right.circle.fill")
                                .font(.system(size: 26))
                                .foregroundStyle(Theme.Palette.accent)
                        }
                    }
                }
            }
            .buttonStyle(.plain)
        }
    }

    private var reviewSection: some View {
        VStack(alignment: .leading, spacing: Theme.Space.m) {
            SectionLabel(text: "Due for review")
            ForEach(dueReviews.prefix(3), id: \.skillID) { record in
                if let skill = record.skill, let scenario = reviewScenario(for: skill) {
                    NavigationLink {
                        destination(for: scenario, skill: skill, isReview: true)
                    } label: {
                        Card(padding: Theme.Space.m) {
                            HStack(spacing: Theme.Space.m) {
                                Image(systemName: "arrow.clockwise.circle")
                                    .font(.system(size: 22))
                                    .foregroundStyle(Theme.Palette.accent)
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(skill.name)
                                        .font(Theme.Font.heading(15))
                                        .foregroundStyle(Theme.Palette.ink)
                                    Text("Last practised \(record.lastPracticedAt.map { Format.relativeDay($0) } ?? "a while ago")")
                                        .font(Theme.Font.caption(12))
                                        .foregroundStyle(Theme.Palette.inkMuted)
                                }
                                Spacer()
                                Image(systemName: "chevron.right")
                                    .font(.system(size: 12, weight: .semibold))
                                    .foregroundStyle(Theme.Palette.inkFaint)
                            }
                        }
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    private var missionSection: some View {
        VStack(alignment: .leading, spacing: Theme.Space.m) {
            SectionLabel(text: "Out in the world")
            ForEach(openMissions.prefix(2)) { mission in
                Button {
                    showMissionSheet = mission
                } label: {
                    Card(padding: Theme.Space.m) {
                        HStack(alignment: .top, spacing: Theme.Space.m) {
                            Image(systemName: "figure.walk.motion")
                                .font(.system(size: 20))
                                .foregroundStyle(Theme.Palette.accent)
                            VStack(alignment: .leading, spacing: 3) {
                                Text(mission.prompt)
                                    .font(Theme.Font.body(15))
                                    .foregroundStyle(Theme.Palette.ink)
                                    .multilineTextAlignment(.leading)
                                Text("Tap when you've done it")
                                    .font(Theme.Font.caption(12))
                                    .foregroundStyle(Theme.Palette.inkFaint)
                            }
                            Spacer()
                        }
                    }
                }
                .buttonStyle(.plain)
            }
        }
    }

    private var weeklySection: some View {
        Card {
            VStack(alignment: .leading, spacing: Theme.Space.m) {
                HStack {
                    SectionLabel(text: "This week")
                    Spacer()
                    if let profile {
                        Text("\(profile.weeklyGoal.completed) of \(profile.weeklyTarget)")
                            .font(Theme.Font.caption())
                            .foregroundStyle(Theme.Palette.inkMuted)
                    }
                }
                MeterBar(progress: profile?.weeklyGoal.progress ?? 0)

                HStack(spacing: Theme.Space.l) {
                    StatTile(
                        value: "\(profile?.streakCurrent ?? 0)",
                        label: "Day streak",
                        caption: (profile?.freezesRemaining ?? 0) > 0 ? "1 recovery left" : "recovery used"
                    )
                    StatTile(value: "\(completedThisWeek)", label: "Sessions")
                    StatTile(value: "\(improvedCount)", label: "Targets hit")
                }
            }
        }
    }

    private var quickPickSection: some View {
        VStack(alignment: .leading, spacing: Theme.Space.m) {
            HStack {
                SectionLabel(text: "Or pick something")
                Spacer()
                NavigationLink {
                    ScenarioBrowserView()
                } label: {
                    Text("See all")
                        .font(Theme.Font.caption())
                        .foregroundStyle(Theme.Palette.accent)
                }
            }

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: Theme.Space.m) {
                    ForEach(quickPicks, id: \.id) { scenario in
                        if let skill = Curriculum.skill(id: scenario.primarySkillID) {
                            NavigationLink {
                                destination(for: scenario, skill: skill, isReview: false)
                            } label: {
                                ScenarioTile(scenario: scenario)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
                .padding(.horizontal, 1)
            }
        }
    }

    private var firstRunHelp: some View {
        NoticeCard(
            title: "Start with a baseline",
            message: "Record one short attempt now so there's something honest to compare against later. \(Branding.promise)",
            systemImage: "flag"
        )
    }

    // MARK: - Data

    private var dueReviews: [SkillProgressRecord] {
        skillProgress.filter { record in
            guard let state = record.reviewState else { return false }
            return ReviewScheduler.isDue(state, on: Date())
        }
    }

    private var openMissions: [RealWorldMissionRecord] {
        missions.filter { !$0.isComplete }.sorted { $0.assignedAt > $1.assignedAt }
    }

    private var completedThisWeek: Int {
        let weekStart = StreakEngine.startOfWeek(for: Date(), calendar: .current)
        return sessions.filter { ($0.completedAt ?? .distantPast) >= weekStart }.count
    }

    private var improvedCount: Int {
        sessions.filter { $0.targetImproved }.count
    }

    private var quickPicks: [Scenario] {
        let level = profile?.level ?? 1
        let unlocked = Set(Curriculum.unlockedPaths(atLevel: level).map { $0.id })
        return ScenarioLibrary.browsable
            .filter { unlocked.contains($0.pathID) }
            .sorted { $0.tier < $1.tier }
            .prefix(6)
            .map { $0 }
    }

    // MARK: - Recommendation

    struct Recommendation {
        let scenario: Scenario
        let skill: MicroSkill
        let reason: String
        let isReview: Bool
    }

    /// Picks the next thing to practise.
    ///
    /// Order matters: baseline first so there's something to compare against,
    /// then anything due for review (spacing beats novelty), then the next
    /// unpractised skill in an unlocked path.
    private func refreshRecommendation() {
        let level = profile?.level ?? 1

        if profile?.baselineCompletedAt == nil,
           let baseline = ScenarioLibrary.scenario(id: "spk-baseline-a"),
           let skill = Curriculum.skill(id: baseline.primarySkillID) {
            recommendation = Recommendation(
                scenario: baseline,
                skill: skill,
                reason: "Start here",
                isReview: false
            )
            return
        }

        if let due = dueReviews.first, let skill = due.skill, let scenario = reviewScenario(for: skill) {
            recommendation = Recommendation(
                scenario: scenario,
                skill: skill,
                reason: "Due for review",
                isReview: true
            )
            return
        }

        let practised = Set(skillProgress.filter { !$0.evidence.isEmpty }.map { $0.skillID })
        let unlocked = Curriculum.unlockedPaths(atLevel: level).map { $0.id }
        let candidates = ScenarioLibrary.browsable.filter { unlocked.contains($0.pathID) }

        if let fresh = candidates.first(where: { !practised.contains($0.primarySkillID) }),
           let skill = Curriculum.skill(id: fresh.primarySkillID) {
            recommendation = Recommendation(
                scenario: fresh,
                skill: skill,
                reason: "Next up",
                isReview: false
            )
            return
        }

        if let any = candidates.randomElement(), let skill = Curriculum.skill(id: any.primarySkillID) {
            recommendation = Recommendation(scenario: any, skill: skill, reason: "Keep sharp", isReview: false)
        }
    }

    /// A scenario for reviewing a skill — preferring one not practised most
    /// recently, so review isn't just a repeat.
    private func reviewScenario(for skill: MicroSkill) -> Scenario? {
        let options = ScenarioLibrary.scenarios(skillID: skill.id).filter { !$0.tags.contains("baseline") }
        return options.last ?? options.first
    }

    @ViewBuilder
    private func destination(for scenario: Scenario, skill: MicroSkill, isReview: Bool) -> some View {
        if scenario.mode == .conversation {
            ConversationView(scenario: scenario, skill: skill, services: services, store: store)
        } else {
            SessionFlowView(
                scenario: scenario,
                skill: skill,
                services: services,
                store: store,
                isReview: isReview
            )
        }
    }
}

struct ScenarioTile: View {
    let scenario: Scenario

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.Space.s) {
            HStack(spacing: 5) {
                Image(systemName: scenario.mode == .speaking ? "mic" : "bubble.left.and.bubble.right")
                    .font(.system(size: 11, weight: .semibold))
                Text(scenario.tier.displayName)
                    .font(Theme.Font.label(10))
                    .tracking(1)
            }
            .foregroundStyle(Theme.Palette.accent)

            Text(scenario.title)
                .font(Theme.Font.heading(16))
                .foregroundStyle(Theme.Palette.ink)
                .multilineTextAlignment(.leading)
                .lineLimit(2)

            Text(scenario.hook)
                .font(Theme.Font.body(13))
                .foregroundStyle(Theme.Palette.inkMuted)
                .multilineTextAlignment(.leading)
                .lineLimit(3)

            Spacer(minLength: 0)
        }
        .padding(Theme.Space.m)
        .frame(width: 220, height: 150, alignment: .topLeading)
        .background(Theme.Palette.surface)
        .clipShape(RoundedRectangle(cornerRadius: Theme.Radius.medium, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: Theme.Radius.medium, style: .continuous)
                .stroke(Theme.Palette.hairline, lineWidth: 1)
        )
    }
}

/// Where a real-world attempt gets reported. Self-reported by design — the app
/// cannot observe a real conversation and shouldn't pretend to.
struct RealWorldReportSheet: View {
    let mission: RealWorldMissionRecord
    let store: ProgressStore

    @Environment(\.dismiss) private var dismiss
    @State private var reflection = ""
    @State private var rating = 3
    @State private var awardedXP: Int?

    var body: some View {
        NavigationStack {
            ZStack {
                ScreenBackground()
                ScrollView {
                    VStack(alignment: .leading, spacing: Theme.Space.l) {
                        if let awardedXP {
                            VStack(alignment: .leading, spacing: Theme.Space.s) {
                                Text("+\(awardedXP) XP")
                                    .font(Theme.Font.display(32))
                                    .foregroundStyle(Theme.Palette.accent)
                                Text("Using it for real is the whole point. That's the biggest single award in the app.")
                                    .font(Theme.Font.body(15))
                                    .foregroundStyle(Theme.Palette.inkMuted)
                            }
                        } else {
                            Text(mission.prompt)
                                .font(Theme.Font.title(20))
                                .foregroundStyle(Theme.Palette.ink)

                            Card {
                                VStack(alignment: .leading, spacing: Theme.Space.m) {
                                    SectionLabel(text: "What happened?")
                                    TextField("Who was it with, and how did it go?", text: $reflection, axis: .vertical)
                                        .font(Theme.Font.body(15))
                                        .lineLimit(3...8)
                                }
                            }

                            Card {
                                VStack(alignment: .leading, spacing: Theme.Space.m) {
                                    SectionLabel(text: "How did it feel?")
                                    Picker("Rating", selection: $rating) {
                                        Text("Rough").tag(1)
                                        Text("Mixed").tag(2)
                                        Text("Okay").tag(3)
                                        Text("Good").tag(4)
                                        Text("Great").tag(5)
                                    }
                                    .pickerStyle(.segmented)
                                    Text("Your own read on it. Nothing is verified or shared.")
                                        .font(Theme.Font.caption(11))
                                        .foregroundStyle(Theme.Palette.inkFaint)
                                }
                            }
                        }
                    }
                    .padding(Theme.Space.l)
                }
            }
            .navigationTitle("Real-world mission")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button(awardedXP == nil ? "Log it" : "Done") {
                        if awardedXP == nil {
                            awardedXP = store.recordRealWorldReport(
                                mission: mission,
                                reflection: reflection,
                                selfRating: rating
                            )
                        } else {
                            dismiss()
                        }
                    }
                    .font(Theme.Font.heading(15))
                }
            }
        }
    }
}
