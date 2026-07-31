import SwiftUI

/// The visual language.
///
/// The brief was "a serious training gym, not a chatbot": warm neutral paper
/// rather than blue-grey dashboard, one brass accent instead of a gradient, and
/// a serif for display type so the app reads as considered rather than
/// generated. Colours are defined in code rather than an asset catalogue so the
/// whole palette is legible in one place and adapts without duplicate assets.
enum Theme {

    // MARK: - Palette

    enum Palette {
        /// Page background. Warm paper in light, warm charcoal in dark.
        static let canvas = Color(light: "#F6F2EC", dark: "#141311")
        /// Raised surfaces: cards, sheets.
        static let surface = Color(light: "#FFFFFF", dark: "#1E1D1A")
        /// A second level of elevation, used sparingly.
        static let surfaceRaised = Color(light: "#FBF8F3", dark: "#282622")
        /// Primary text.
        static let ink = Color(light: "#1A1815", dark: "#F3EFE8")
        /// Secondary text.
        static let inkMuted = Color(light: "#6B655C", dark: "#A49C90")
        /// Tertiary text and captions.
        static let inkFaint = Color(light: "#948C81", dark: "#7A736A")
        /// Hairlines and dividers.
        static let hairline = Color(light: "#E3DCD1", dark: "#332F2A")

        /// The single accent: brass. Energy without the AI-gradient cliché.
        static let accent = Color(light: "#B07B12", dark: "#E2B04A")
        static let accentSoft = Color(light: "#F3E4C4", dark: "#3A2E17")

        /// Reserved for the recording state. Nothing else uses it, so an active
        /// microphone is never ambiguous.
        static let recording = Color(light: "#C4402F", dark: "#E56A57")

        static let positive = Color(light: "#2F7A55", dark: "#7FBF9E")
        static let positiveSoft = Color(light: "#DFF0E6", dark: "#1B2E24")
        static let caution = Color(light: "#9A5B1E", dark: "#D9975F")
        static let cautionSoft = Color(light: "#F7E7D3", dark: "#332619")
    }

    // MARK: - Typography

    enum Font {
        /// Big editorial numbers and screen titles.
        static func display(_ size: CGFloat = 34) -> SwiftUI.Font {
            .system(size: size, weight: .semibold, design: .serif)
        }

        static func title(_ size: CGFloat = 22) -> SwiftUI.Font {
            .system(size: size, weight: .semibold, design: .serif)
        }

        static func heading(_ size: CGFloat = 17) -> SwiftUI.Font {
            .system(size: size, weight: .semibold)
        }

        static func body(_ size: CGFloat = 16) -> SwiftUI.Font {
            .system(size: size, weight: .regular)
        }

        static func caption(_ size: CGFloat = 13) -> SwiftUI.Font {
            .system(size: size, weight: .medium)
        }

        /// Monospaced digits so live timers don't jitter.
        static func metric(_ size: CGFloat = 28) -> SwiftUI.Font {
            .system(size: size, weight: .semibold, design: .rounded).monospacedDigit()
        }

        /// Small caps-style label for section headers.
        static func label(_ size: CGFloat = 12) -> SwiftUI.Font {
            .system(size: size, weight: .semibold)
        }
    }

    // MARK: - Metrics

    enum Space {
        static let xs: CGFloat = 4
        static let s: CGFloat = 8
        static let m: CGFloat = 14
        static let l: CGFloat = 20
        static let xl: CGFloat = 28
        static let xxl: CGFloat = 40
    }

    enum Radius {
        static let small: CGFloat = 10
        static let medium: CGFloat = 16
        static let large: CGFloat = 24
        static let pill: CGFloat = 999
    }

    /// One shared animation so motion feels like a single system.
    enum Motion {
        static let standard = Animation.spring(response: 0.38, dampingFraction: 0.82)
        static let quick = Animation.spring(response: 0.26, dampingFraction: 0.86)
        static let gentle = Animation.easeInOut(duration: 0.45)
    }
}

extension Color {
    /// Builds a colour that resolves differently in light and dark mode.
    init(light: String, dark: String) {
        self.init(uiColor: UIColor { traits in
            UIColor(hex: traits.userInterfaceStyle == .dark ? dark : light)
        })
    }

    /// Parses `#RRGGBB`. Falls back to grey rather than crashing on a typo.
    init(hex: String) {
        self.init(uiColor: UIColor(hex: hex))
    }
}

extension UIColor {
    convenience init(hex: String) {
        var cleaned = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        if cleaned.hasPrefix("#") { cleaned.removeFirst() }
        guard cleaned.count == 6, let value = UInt32(cleaned, radix: 16) else {
            self.init(white: 0.5, alpha: 1)
            return
        }
        self.init(
            red: CGFloat((value & 0xFF0000) >> 16) / 255,
            green: CGFloat((value & 0x00FF00) >> 8) / 255,
            blue: CGFloat(value & 0x0000FF) / 255,
            alpha: 1
        )
    }
}
