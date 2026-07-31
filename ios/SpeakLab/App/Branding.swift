import Foundation

/// Every user-visible mention of the product name comes from here.
///
/// Renaming the app is then a one-line change plus the display name in the
/// Xcode target — no hunting through view code. Nothing else in the app should
/// contain the literal string "SpeakLab".
enum Branding {
    static let appName = "SpeakLab"
    static let tagline = "Your communication gym"

    /// Used on the empty-state and onboarding screens.
    static let promise = "Five focused minutes. One thing to change. Then do it again."

    /// Shown in privacy copy.
    static var privacySummary: String {
        "\(appName) keeps your recordings on this device. Nothing is sent anywhere unless you ask for coaching on a specific attempt."
    }
}
