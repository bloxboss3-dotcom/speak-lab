import SwiftUI

// MARK: - Backgrounds and containers

/// The page background used by every screen.
struct ScreenBackground: View {
    var body: some View {
        Theme.Palette.canvas.ignoresSafeArea()
    }
}

/// A raised surface. Elevation is carried by a hairline and a very soft shadow
/// rather than heavy blur, so stacked cards stay calm.
struct Card<Content: View>: View {
    var padding: CGFloat = Theme.Space.l
    var raised: Bool = false
    @ViewBuilder var content: Content

    var body: some View {
        content
            .padding(padding)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(raised ? Theme.Palette.surfaceRaised : Theme.Palette.surface)
            .clipShape(RoundedRectangle(cornerRadius: Theme.Radius.medium, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: Theme.Radius.medium, style: .continuous)
                    .stroke(Theme.Palette.hairline, lineWidth: 1)
            )
            .shadow(color: Color.black.opacity(0.05), radius: 12, x: 0, y: 4)
    }
}

/// Small uppercase section header.
struct SectionLabel: View {
    let text: String
    var accent: Color = Theme.Palette.inkFaint

    var body: some View {
        Text(text.uppercased())
            .font(Theme.Font.label())
            .tracking(1.2)
            .foregroundStyle(accent)
            .accessibilityAddTraits(.isHeader)
    }
}

// MARK: - Buttons

struct PrimaryButton: View {
    let title: String
    var systemImage: String?
    var isEnabled: Bool = true
    var isLoading: Bool = false
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: Theme.Space.s) {
                if isLoading {
                    ProgressView().tint(Theme.Palette.canvas)
                } else if let systemImage {
                    Image(systemName: systemImage)
                }
                Text(title).font(Theme.Font.heading())
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, Theme.Space.m)
            .background(Theme.Palette.accent)
            .foregroundStyle(Theme.Palette.canvas)
            .clipShape(RoundedRectangle(cornerRadius: Theme.Radius.medium, style: .continuous))
        }
        .buttonStyle(.plain)
        .opacity(isEnabled && !isLoading ? 1 : 0.5)
        .disabled(!isEnabled || isLoading)
    }
}

struct SecondaryButton: View {
    let title: String
    var systemImage: String?
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: Theme.Space.s) {
                if let systemImage { Image(systemName: systemImage) }
                Text(title).font(Theme.Font.heading())
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, Theme.Space.m)
            .background(Theme.Palette.surface)
            .foregroundStyle(Theme.Palette.ink)
            .clipShape(RoundedRectangle(cornerRadius: Theme.Radius.medium, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: Theme.Radius.medium, style: .continuous)
                    .stroke(Theme.Palette.hairline, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }
}

struct QuietButton: View {
    let title: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(Theme.Font.caption())
                .foregroundStyle(Theme.Palette.inkMuted)
                .underline()
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Small pieces

struct Pill: View {
    let text: String
    var foreground: Color = Theme.Palette.inkMuted
    var background: Color = Theme.Palette.surfaceRaised
    var systemImage: String?

    var body: some View {
        HStack(spacing: Theme.Space.xs) {
            if let systemImage {
                Image(systemName: systemImage).font(.system(size: 10, weight: .semibold))
            }
            Text(text).font(Theme.Font.label())
        }
        .padding(.horizontal, Theme.Space.s + 2)
        .padding(.vertical, 5)
        .background(background)
        .foregroundStyle(foreground)
        .clipShape(Capsule())
    }
}

/// A labelled number. Used for metrics that are genuinely measured.
struct StatTile: View {
    let value: String
    let label: String
    var caption: String?
    var tint: Color = Theme.Palette.ink

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(value)
                .font(Theme.Font.metric(24))
                .foregroundStyle(tint)
            Text(label)
                .font(Theme.Font.caption(12))
                .foregroundStyle(Theme.Palette.inkMuted)
            if let caption {
                Text(caption)
                    .font(Theme.Font.caption(11))
                    .foregroundStyle(Theme.Palette.inkFaint)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(label): \(value)")
    }
}

/// Horizontal progress. Deliberately thin — progress should be legible, not loud.
struct MeterBar: View {
    let progress: Double
    var tint: Color = Theme.Palette.accent
    var height: CGFloat = 8

    var body: some View {
        GeometryReader { geometry in
            ZStack(alignment: .leading) {
                Capsule()
                    .fill(Theme.Palette.hairline)
                Capsule()
                    .fill(tint)
                    .frame(width: max(0, min(1, progress)) * geometry.size.width)
            }
        }
        .frame(height: height)
        .accessibilityElement()
        .accessibilityValue("\(Int((max(0, min(1, progress)) * 100).rounded())) percent")
    }
}

/// Qualitative rubric badge. Never a number — a score on "warmth" would be fake.
struct RatingChip: View {
    let rating: RubricRating

    private var colors: (fg: Color, bg: Color) {
        switch rating {
        case .strong: return (Theme.Palette.positive, Theme.Palette.positiveSoft)
        case .adequate: return (Theme.Palette.inkMuted, Theme.Palette.surfaceRaised)
        case .needsWork: return (Theme.Palette.caution, Theme.Palette.cautionSoft)
        }
    }

    var body: some View {
        Pill(text: rating.displayName, foreground: colors.fg, background: colors.bg)
    }
}

/// Empty-state / error message with an optional action.
struct NoticeCard: View {
    let title: String
    let message: String
    var systemImage: String = "info.circle"
    var actionTitle: String?
    var action: (() -> Void)?

    var body: some View {
        Card {
            VStack(alignment: .leading, spacing: Theme.Space.s) {
                HStack(spacing: Theme.Space.s) {
                    Image(systemName: systemImage)
                        .foregroundStyle(Theme.Palette.accent)
                    Text(title).font(Theme.Font.heading())
                }
                Text(message)
                    .font(Theme.Font.body(15))
                    .foregroundStyle(Theme.Palette.inkMuted)
                if let actionTitle, let action {
                    Button(actionTitle, action: action)
                        .font(Theme.Font.caption())
                        .foregroundStyle(Theme.Palette.accent)
                        .padding(.top, Theme.Space.xs)
                }
            }
        }
    }
}

/// A row of three animated dots, used while the coach is thinking.
struct ThinkingDots: View {
    @State private var phase = 0

    private let timer = Timer.publish(every: 0.35, on: .main, in: .common).autoconnect()

    var body: some View {
        HStack(spacing: 6) {
            ForEach(0..<3, id: \.self) { index in
                Circle()
                    .fill(Theme.Palette.accent)
                    .frame(width: 7, height: 7)
                    .opacity(phase == index ? 1 : 0.28)
                    .scaleEffect(phase == index ? 1.15 : 1)
            }
        }
        .onReceive(timer) { _ in
            withAnimation(Theme.Motion.quick) { phase = (phase + 1) % 3 }
        }
        .accessibilityLabel("Working")
    }
}

// MARK: - Formatting helpers

enum Format {
    static func duration(_ seconds: TimeInterval) -> String {
        let total = Int(seconds.rounded())
        return String(format: "%d:%02d", total / 60, total % 60)
    }

    static func shortDuration(_ seconds: TimeInterval) -> String {
        seconds < 60 ? "\(Int(seconds.rounded()))s" : duration(seconds)
    }

    static func relativeDay(_ date: Date, now: Date = Date()) -> String {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .short
        return formatter.localizedString(for: date, relativeTo: now)
    }
}
