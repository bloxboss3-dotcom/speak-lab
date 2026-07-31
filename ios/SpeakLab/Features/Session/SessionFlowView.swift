import SwiftData
import SwiftUI

/// Container for one practice session. Each stage is its own small view so no
/// single body gets large enough to be hard to read — or to type-check.
struct SessionFlowView: View {

    @StateObject private var model: SessionViewModel
    @EnvironmentObject private var services: AppServices
    @Environment(\.dismiss) private var dismiss
    @State private var showAbandonConfirmation = false

    init(scenario: Scenario, skill: MicroSkill, services: AppServices, store: ProgressStore,
         isReview: Bool = false, isTransferRun: Bool = false) {
        _model = StateObject(wrappedValue: SessionViewModel(
            scenario: scenario,
            skill: skill,
            services: services,
            store: store,
            isReview: isReview,
            isTransferRun: isTransferRun
        ))
    }

    var body: some View {
        ZStack {
            ScreenBackground()
            content
        }
        .navigationBarBackButtonHidden(model.stage != .brief)
        .toolbar { toolbarContent }
        .confirmationDialog(
            "Leave this session?",
            isPresented: $showAbandonConfirmation,
            titleVisibility: .visible
        ) {
            Button("Leave and delete the recording", role: .destructive) {
                model.abandon()
                dismiss()
            }
            Button("Keep practising", role: .cancel) {}
        } message: {
            Text("Nothing is saved until you finish, and the recording will be deleted.")
        }
    }

    @ViewBuilder
    private var content: some View {
        switch model.stage {
        case .brief:
            SessionBriefView(model: model)
        case .plan:
            SessionPlanView(model: model)
        case .recording:
            SessionRecordView(model: model)
        case .analyzing:
            SessionWorkingView(
                title: model.isRetry ? "Comparing your two attempts" : "Listening back",
                subtitle: model.feedbackWasLocal
                    ? "Measuring pace, pauses and fillers"
                    : "Measuring on device, then asking your coach"
            )
        case .feedback:
            SessionFeedbackView(model: model)
        case .comparing:
            SessionWorkingView(
                title: "Comparing your two attempts",
                subtitle: "Checking whether the target behaviour actually moved"
            )
        case .comparison:
            SessionComparisonView(model: model)
        case .transfer:
            SessionTransferView(model: model, onDismiss: { dismiss() })
        case .summary:
            SessionSummaryView(model: model, onDone: { dismiss() })
        }
    }

    @ToolbarContentBuilder
    private var toolbarContent: some ToolbarContent {
        ToolbarItem(placement: .topBarLeading) {
            if model.stage != .summary {
                Button {
                    if model.stage == .brief {
                        dismiss()
                    } else {
                        showAbandonConfirmation = true
                    }
                } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(Theme.Palette.inkMuted)
                }
                .accessibilityLabel("Close session")
            }
        }
        ToolbarItem(placement: .principal) {
            SessionStageIndicator(stage: model.stage)
        }
    }
}

/// A quiet progress indicator so the learner always knows where they are in the
/// loop. Five dots, because the loop has five beats that matter.
struct SessionStageIndicator: View {
    let stage: SessionViewModel.Stage

    private var activeIndex: Int {
        switch stage {
        case .brief: return 0
        case .plan: return 1
        case .recording, .analyzing: return 2
        case .feedback: return 3
        case .comparing, .comparison, .transfer, .summary: return 4
        }
    }

    var body: some View {
        HStack(spacing: 6) {
            ForEach(0..<5, id: \.self) { index in
                Capsule()
                    .fill(index <= activeIndex ? Theme.Palette.accent : Theme.Palette.hairline)
                    .frame(width: index == activeIndex ? 18 : 6, height: 5)
                    .animation(Theme.Motion.quick, value: activeIndex)
            }
        }
        .accessibilityLabel("Step \(activeIndex + 1) of 5")
    }
}

/// Shared "the app is working" screen.
struct SessionWorkingView: View {
    let title: String
    let subtitle: String

    var body: some View {
        VStack(spacing: Theme.Space.l) {
            Spacer()
            ThinkingDots()
            VStack(spacing: Theme.Space.s) {
                Text(title)
                    .font(Theme.Font.title(20))
                    .foregroundStyle(Theme.Palette.ink)
                Text(subtitle)
                    .font(Theme.Font.body(15))
                    .foregroundStyle(Theme.Palette.inkMuted)
                    .multilineTextAlignment(.center)
            }
            .padding(.horizontal, Theme.Space.xl)
            Spacer()
        }
        .frame(maxWidth: .infinity)
    }
}
