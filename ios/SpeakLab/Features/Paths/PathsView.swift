import SwiftData
import SwiftUI

/// The skill tree. Paths unlock by level; skills inside a path show real
/// mastery rather than a completion tick, because a skill you did once is not
/// a skill you have.
struct PathsView: View {

    @EnvironmentObject private var services: AppServices
    @Environment(\.modelContext) private var context
    @Query private var profiles: [ProfileRecord]
    @Query private var skillProgress: [SkillProgressRecord]

    private var level: Int { profiles.first?.level ?? 1 }

    var body: some View {
        NavigationStack {
            ZStack {
                ScreenBackground()
                ScrollView {
                    VStack(alignment: .leading, spacing: Theme.Space.l) {
                        header
                        ForEach(Curriculum.paths, id: \.id) { path in
                            PathCard(
                                path: path,
                                isUnlocked: path.unlocksAtLevel <= level,
                                level: level,
                                masteryBySkill: masteryBySkill
                            )
                        }
                        nuggetsLink
                    }
                    .padding(Theme.Space.l)
                    .padding(.bottom, Theme.Space.xl)
                }
            }
            .navigationTitle("Paths")
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: Theme.Space.xs) {
            Text("Eleven paths. Each one is a set of behaviours, not a set of ideas.")
                .font(Theme.Font.body(15))
                .foregroundStyle(Theme.Palette.inkMuted)
        }
    }

    private var nuggetsLink: some View {
        NavigationLink {
            NuggetCollectionView()
        } label: {
            Card(padding: Theme.Space.m) {
                HStack(spacing: Theme.Space.m) {
                    Image(systemName: "sparkles")
                        .font(.system(size: 20))
                        .foregroundStyle(Theme.Palette.accent)
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Golden nuggets")
                            .font(Theme.Font.heading(15))
                            .foregroundStyle(Theme.Palette.ink)
                        Text("Principles you've unlocked by practising")
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

    private var masteryBySkill: [String: MasteryResult] {
        var result: [String: MasteryResult] = [:]
        for record in skillProgress {
            result[record.skillID] = record.mastery
        }
        return result
    }
}

struct PathCard: View {
    let path: SkillPath
    let isUnlocked: Bool
    let level: Int
    let masteryBySkill: [String: MasteryResult]

    var body: some View {
        NavigationLink {
            if isUnlocked { PathDetailView(path: path, masteryBySkill: masteryBySkill) }
        } label: {
            Card {
                VStack(alignment: .leading, spacing: Theme.Space.m) {
                    HStack(spacing: Theme.Space.m) {
                        ZStack {
                            Circle()
                                .fill(isUnlocked ? Color(hex: path.accentHex).opacity(0.16) : Theme.Palette.surfaceRaised)
                            Image(systemName: isUnlocked ? path.symbol : "lock")
                                .font(.system(size: 17, weight: .semibold))
                                .foregroundStyle(isUnlocked ? Color(hex: path.accentHex) : Theme.Palette.inkFaint)
                        }
                        .frame(width: 42, height: 42)

                        VStack(alignment: .leading, spacing: 2) {
                            Text(path.name)
                                .font(Theme.Font.heading(17))
                                .foregroundStyle(isUnlocked ? Theme.Palette.ink : Theme.Palette.inkFaint)
                            Text(isUnlocked ? path.tagline : "Unlocks at level \(path.unlocksAtLevel)")
                                .font(Theme.Font.caption(12))
                                .foregroundStyle(Theme.Palette.inkMuted)
                        }
                        Spacer()
                        if isUnlocked {
                            Image(systemName: "chevron.right")
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundStyle(Theme.Palette.inkFaint)
                        }
                    }

                    if isUnlocked {
                        HStack(spacing: 4) {
                            ForEach(path.skillIDs, id: \.self) { skillID in
                                let band = masteryBySkill[skillID]?.band ?? .learning
                                Capsule()
                                    .fill(colour(for: band, accent: Color(hex: path.accentHex)))
                                    .frame(height: 5)
                            }
                        }
                        .accessibilityLabel("\(path.skillIDs.count) skills")
                    }
                }
            }
        }
        .buttonStyle(.plain)
        .disabled(!isUnlocked)
    }

    private func colour(for band: MasteryBand, accent: Color) -> Color {
        switch band {
        case .learning: return Theme.Palette.hairline
        case .practising: return accent.opacity(0.4)
        case .proficient: return accent.opacity(0.7)
        case .fluent: return accent
        }
    }
}

struct PathDetailView: View {

    let path: SkillPath
    let masteryBySkill: [String: MasteryResult]

    @EnvironmentObject private var services: AppServices
    @Environment(\.modelContext) private var context

    var body: some View {
        ZStack {
            ScreenBackground()
            ScrollView {
                VStack(alignment: .leading, spacing: Theme.Space.l) {
                    VStack(alignment: .leading, spacing: Theme.Space.xs) {
                        Text(path.tagline)
                            .font(Theme.Font.body(16))
                            .foregroundStyle(Theme.Palette.inkMuted)
                    }

                    ForEach(Curriculum.skills(inPath: path.id), id: \.id) { skill in
                        SkillCard(
                            skill: skill,
                            mastery: masteryBySkill[skill.id],
                            accent: Color(hex: path.accentHex)
                        )
                    }

                    SectionLabel(text: "Scenarios in this path")
                    ForEach(ScenarioLibrary.scenarios(pathID: path.id).filter { !$0.tags.contains("baseline") }, id: \.id) { scenario in
                        ScenarioRow(scenario: scenario)
                    }
                }
                .padding(Theme.Space.l)
                .padding(.bottom, Theme.Space.xl)
            }
        }
        .navigationTitle(path.name)
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct SkillCard: View {
    let skill: MicroSkill
    let mastery: MasteryResult?
    let accent: Color

    var body: some View {
        Card {
            VStack(alignment: .leading, spacing: Theme.Space.s) {
                HStack {
                    Text(skill.name)
                        .font(Theme.Font.heading(16))
                        .foregroundStyle(Theme.Palette.ink)
                    Spacer()
                    Pill(
                        text: (mastery?.band ?? .learning).displayName,
                        foreground: accent,
                        background: accent.opacity(0.14)
                    )
                }
                Text(skill.summary)
                    .font(Theme.Font.body(14))
                    .foregroundStyle(Theme.Palette.inkMuted)

                if let mastery {
                    MeterBar(progress: mastery.score, tint: accent, height: 6)
                    Text(mastery.nextRequirement)
                        .font(Theme.Font.caption(11))
                        .foregroundStyle(Theme.Palette.inkFaint)
                }
            }
        }
    }
}

struct ScenarioRow: View {

    let scenario: Scenario
    @EnvironmentObject private var services: AppServices
    @Environment(\.modelContext) private var context

    var body: some View {
        NavigationLink {
            if let skill = Curriculum.skill(id: scenario.primarySkillID) {
                if scenario.mode == .conversation {
                    ConversationView(
                        scenario: scenario,
                        skill: skill,
                        services: services,
                        store: ProgressStore(context: context)
                    )
                } else {
                    SessionFlowView(
                        scenario: scenario,
                        skill: skill,
                        services: services,
                        store: ProgressStore(context: context)
                    )
                }
            }
        } label: {
            Card(padding: Theme.Space.m) {
                HStack(spacing: Theme.Space.m) {
                    Image(systemName: scenario.mode == .speaking ? "mic" : "bubble.left.and.bubble.right")
                        .font(.system(size: 16))
                        .foregroundStyle(Theme.Palette.accent)
                        .frame(width: 24)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(scenario.title)
                            .font(Theme.Font.heading(15))
                            .foregroundStyle(Theme.Palette.ink)
                            .multilineTextAlignment(.leading)
                        Text(scenario.hook)
                            .font(Theme.Font.caption(12))
                            .foregroundStyle(Theme.Palette.inkMuted)
                            .multilineTextAlignment(.leading)
                            .lineLimit(2)
                    }
                    Spacer()
                    Pill(text: scenario.tier.displayName)
                }
            }
        }
        .buttonStyle(.plain)
    }
}

/// Browse everything, filtered by mode.
struct ScenarioBrowserView: View {

    @State private var mode: PracticeMode?

    private var scenarios: [Scenario] {
        guard let mode else { return ScenarioLibrary.browsable }
        return ScenarioLibrary.browsable.filter { $0.mode == mode }
    }

    var body: some View {
        ZStack {
            ScreenBackground()
            ScrollView {
                VStack(alignment: .leading, spacing: Theme.Space.m) {
                    Picker("Mode", selection: $mode) {
                        Text("All").tag(PracticeMode?.none)
                        Text("Speaking").tag(PracticeMode?.some(.speaking))
                        Text("Conversation").tag(PracticeMode?.some(.conversation))
                    }
                    .pickerStyle(.segmented)
                    .padding(.bottom, Theme.Space.s)

                    ForEach(scenarios, id: \.id) { scenario in
                        ScenarioRow(scenario: scenario)
                    }
                }
                .padding(Theme.Space.l)
                .padding(.bottom, Theme.Space.xl)
            }
        }
        .navigationTitle("All scenarios")
        .navigationBarTitleDisplayMode(.inline)
    }
}

/// The collection of unlocked principles.
struct NuggetCollectionView: View {

    @Query(sort: \UnlockedNuggetRecord.unlockedAt, order: .reverse)
    private var unlocked: [UnlockedNuggetRecord]

    private var unlockedIDs: Set<String> { Set(unlocked.map { $0.nuggetID }) }

    var body: some View {
        ZStack {
            ScreenBackground()
            ScrollView {
                VStack(alignment: .leading, spacing: Theme.Space.l) {
                    Text("\(unlockedIDs.count) of \(NuggetLibrary.all.count) unlocked. They appear when a session actually calls for one — never as a list of tips after every attempt.")
                        .font(Theme.Font.body(14))
                        .foregroundStyle(Theme.Palette.inkMuted)

                    ForEach(NuggetCategory.allCases, id: \.self) { category in
                        let items = NuggetLibrary.all.filter { $0.category == category }
                        if !items.isEmpty {
                            VStack(alignment: .leading, spacing: Theme.Space.m) {
                                SectionLabel(text: category.displayName)
                                ForEach(items, id: \.id) { nugget in
                                    if unlockedIDs.contains(nugget.id) {
                                        GoldenNuggetCard(nugget: nugget)
                                    } else {
                                        LockedNuggetRow(title: nugget.title)
                                    }
                                }
                            }
                        }
                    }
                }
                .padding(Theme.Space.l)
                .padding(.bottom, Theme.Space.xl)
            }
        }
        .navigationTitle("Golden nuggets")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct LockedNuggetRow: View {
    let title: String

    var body: some View {
        HStack(spacing: Theme.Space.m) {
            Image(systemName: "lock")
                .font(.system(size: 13))
                .foregroundStyle(Theme.Palette.inkFaint)
            Text(title)
                .font(Theme.Font.body(14))
                .foregroundStyle(Theme.Palette.inkFaint)
            Spacer()
        }
        .padding(Theme.Space.m)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Theme.Palette.surfaceRaised)
        .clipShape(RoundedRectangle(cornerRadius: Theme.Radius.small, style: .continuous))
    }
}
