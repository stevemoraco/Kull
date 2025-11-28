import Foundation
import OSLog

enum KeychainError: Error {
    case duplicateItem
    case itemNotFound
    case unexpectedStatus(OSStatus)
    case invalidData
}

/// Token storage using UserDefaults instead of Keychain
/// This avoids all keychain access prompts and permission issues
class KeychainManager {
    static let shared = KeychainManager()

    private let defaults = UserDefaults.standard
    private let keyPrefix = "com.kull.token."

    private init() {}

    // MARK: - Access Token (1 hour expiry)

    func saveAccessToken(_ token: String, for deviceId: String) throws {
        let key = "\(keyPrefix)access_\(deviceId)"
        defaults.set(token, forKey: key)
        Logger.keychain.logKeychainOperation("Save access token", success: true)
    }

    func getAccessToken(for deviceId: String) -> String? {
        let key = "\(keyPrefix)access_\(deviceId)"
        let token = defaults.string(forKey: key)
        if token != nil {
            Logger.keychain.debug("Retrieved access token")
        } else {
            Logger.keychain.debug("Access token not found")
        }
        return token
    }

    func deleteAccessToken(for deviceId: String) throws {
        let key = "\(keyPrefix)access_\(deviceId)"
        defaults.removeObject(forKey: key)
        Logger.keychain.logKeychainOperation("Delete access token", success: true)
    }

    // MARK: - Refresh Token (30 days expiry)

    func saveRefreshToken(_ token: String, for deviceId: String) throws {
        let key = "\(keyPrefix)refresh_\(deviceId)"
        defaults.set(token, forKey: key)
        Logger.keychain.logKeychainOperation("Save refresh token", success: true)
    }

    func getRefreshToken(for deviceId: String) -> String? {
        let key = "\(keyPrefix)refresh_\(deviceId)"
        let token = defaults.string(forKey: key)
        if token != nil {
            Logger.keychain.debug("Retrieved refresh token")
        } else {
            Logger.keychain.debug("Refresh token not found")
        }
        return token
    }

    func deleteRefreshToken(for deviceId: String) throws {
        let key = "\(keyPrefix)refresh_\(deviceId)"
        defaults.removeObject(forKey: key)
        Logger.keychain.logKeychainOperation("Delete refresh token", success: true)
    }

    // MARK: - Clear All

    func clearAll(for deviceId: String) {
        Logger.keychain.info("Clearing all tokens for device \(deviceId)")
        try? deleteAccessToken(for: deviceId)
        try? deleteRefreshToken(for: deviceId)
        Logger.keychain.notice("All tokens cleared")
    }
}
