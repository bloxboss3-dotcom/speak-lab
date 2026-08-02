import Foundation
import Security

/// Where the app should send coaching requests.
enum CoachingBackend: Equatable {
    /// The supported configuration: a server that holds the API key.
    case proxy(url: URL, secret: String?)
    /// Local development only. The key lives in the Keychain, never in the bundle.
    case directKey(String)
    /// Nothing configured — the app runs on its on-device coach.
    case offline

    var isConfigured: Bool {
        if case .offline = self { return false }
        return true
    }
}

/// Reads configuration, in priority order:
///
/// 1. Values the user entered in Settings (Keychain)
/// 2. `Config.plist` in the bundle, if present — gitignored, for local dev
/// 3. Build settings injected from `Secrets.xcconfig` via Info.plist
///
/// An Anthropic key is never read from the bundle or from source. The only way
/// one enters the app is if the user types it into the development field in
/// Settings, and it goes straight to the Keychain.
@MainActor
final class AppConfig: ObservableObject {

    @Published private(set) var backend: CoachingBackend = .offline

    private enum KeychainKey {
        static let proxyURL = "speaklab.proxy.url"
        static let proxySecret = "speaklab.proxy.secret"
        static let developmentAPIKey = "speaklab.dev.apiKey"
    }

    init() {
        reload()
    }

    // MARK: - Reading

    func reload() {
        if let stored = Keychain.readString(KeychainKey.proxyURL),
           let url = URL(string: stored),
           url.scheme != nil {
            backend = .proxy(url: url, secret: Keychain.readString(KeychainKey.proxySecret))
            return
        }

        if let key = Keychain.readString(KeychainKey.developmentAPIKey), !key.isEmpty {
            backend = .directKey(key)
            return
        }

        if let bundled = Self.bundledProxyURL() {
            backend = .proxy(url: bundled, secret: Self.bundledProxySecret())
            return
        }

        backend = .offline
    }

    // MARK: - Writing

    func setProxy(urlString: String, secret: String?) throws {
        let trimmed = urlString.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else {
            clearProxy()
            return
        }
        guard let url = URL(string: trimmed), let scheme = url.scheme,
              scheme == "http" || scheme == "https", url.host != nil else {
            throw ConfigError.invalidURL
        }
        Keychain.writeString(url.absoluteString, for: KeychainKey.proxyURL)
        if let secret, !secret.isEmpty {
            Keychain.writeString(secret, for: KeychainKey.proxySecret)
        } else {
            Keychain.delete(KeychainKey.proxySecret)
        }
        reload()
    }

    func clearProxy() {
        Keychain.delete(KeychainKey.proxyURL)
        Keychain.delete(KeychainKey.proxySecret)
        reload()
    }

    func setDevelopmentKey(_ key: String) {
        let trimmed = key.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.isEmpty {
            Keychain.delete(KeychainKey.developmentAPIKey)
        } else {
            Keychain.writeString(trimmed, for: KeychainKey.developmentAPIKey)
        }
        reload()
    }

    var proxyURLString: String {
        if case .proxy(let url, _) = backend { return url.absoluteString }
        return ""
    }

    var hasProxySecret: Bool {
        if case .proxy(_, let secret) = backend { return secret != nil }
        return false
    }

    var hasDevelopmentKey: Bool {
        if case .directKey = backend { return true }
        return Keychain.readString(KeychainKey.developmentAPIKey) != nil
    }

    var statusDescription: String {
        switch backend {
        case .proxy(let url, let secret):
            let host = url.host ?? url.absoluteString
            return secret == nil ? "Proxy at \(host) (no shared secret)" : "Proxy at \(host)"
        case .directKey:
            return "Development key on this device"
        case .offline:
            return "Not connected — using on-device coaching"
        }
    }

    // MARK: - Bundle lookups

    private static func bundledProxyURL() -> URL? {
        guard let raw = bundleValue(forKey: "SpeakLabProxyURL"), !raw.isEmpty else { return nil }
        return URL(string: raw)
    }

    private static func bundledProxySecret() -> String? {
        let value = bundleValue(forKey: "SpeakLabProxySecret")
        return (value?.isEmpty ?? true) ? nil : value
    }

    private static func bundleValue(forKey key: String) -> String? {
        if let url = Bundle.main.url(forResource: "Config", withExtension: "plist"),
           let data = try? Data(contentsOf: url),
           let plist = try? PropertyListSerialization.propertyList(from: data, format: nil) as? [String: Any],
           let value = plist[key] as? String,
           !value.hasPrefix("$(") {
            return value
        }
        if let value = Bundle.main.object(forInfoDictionaryKey: key) as? String,
           !value.isEmpty,
           !value.hasPrefix("$(") {
            return value
        }
        return nil
    }

    enum ConfigError: LocalizedError {
        case invalidURL

        var errorDescription: String? {
            switch self {
            case .invalidURL:
                return "That doesn't look like a URL. It should start with http:// or https://"
            }
        }
    }
}

/// Minimal Keychain wrapper for the few small strings the app stores.
enum Keychain {
    private static let service = "com.speaklab.app"

    static func writeString(_ value: String, for key: String) {
        guard let data = value.data(using: .utf8) else { return }
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key
        ]
        SecItemDelete(query as CFDictionary)

        var attributes = query
        attributes[kSecValueData as String] = data
        // Never syncs to iCloud, and unavailable until the device is unlocked.
        attributes[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        SecItemAdd(attributes as CFDictionary, nil)
    }

    static func readString(_ key: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        var item: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &item) == errSecSuccess,
              let data = item as? Data,
              let value = String(data: data, encoding: .utf8),
              !value.isEmpty else {
            return nil
        }
        return value
    }

    static func delete(_ key: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key
        ]
        SecItemDelete(query as CFDictionary)
    }

    static func deleteAll() {
        delete("speaklab.proxy.url")
        delete("speaklab.proxy.secret")
        delete("speaklab.dev.apiKey")
    }
}
