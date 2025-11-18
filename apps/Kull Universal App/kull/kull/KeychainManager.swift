import Foundation
import Security

enum KeychainError: Error {
    case duplicateItem
    case itemNotFound
    case unexpectedStatus(OSStatus)
    case invalidData
}

class KeychainManager {
    static let shared = KeychainManager()

    private let serviceName = "com.kull.app"

    private init() {}

    // MARK: - Access Token (1 hour expiry)

    func saveAccessToken(_ token: String, for deviceId: String) throws {
        let key = "access_token_\(deviceId)"
        try save(token, forKey: key)
    }

    func getAccessToken(for deviceId: String) -> String? {
        let key = "access_token_\(deviceId)"
        return try? retrieve(forKey: key)
    }

    func deleteAccessToken(for deviceId: String) throws {
        let key = "access_token_\(deviceId)"
        try delete(forKey: key)
    }

    // MARK: - Refresh Token (30 days expiry)

    func saveRefreshToken(_ token: String, for deviceId: String) throws {
        let key = "refresh_token_\(deviceId)"
        try save(token, forKey: key)
    }

    func getRefreshToken(for deviceId: String) -> String? {
        let key = "refresh_token_\(deviceId)"
        return try? retrieve(forKey: key)
    }

    func deleteRefreshToken(for deviceId: String) throws {
        let key = "refresh_token_\(deviceId)"
        try delete(forKey: key)
    }

    // MARK: - Clear All

    func clearAll(for deviceId: String) {
        try? deleteAccessToken(for: deviceId)
        try? deleteRefreshToken(for: deviceId)
    }

    // MARK: - Private Keychain Operations

    private func save(_ value: String, forKey key: String) throws {
        guard let data = value.data(using: .utf8) else {
            throw KeychainError.invalidData
        }

        // Check if item exists
        if (try? retrieve(forKey: key)) != nil {
            // Update existing
            try update(data, forKey: key)
        } else {
            // Add new
            try add(data, forKey: key)
        }
    }

    private func add(_ data: Data, forKey key: String) throws {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: serviceName,
            kSecAttrAccount as String: key,
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlock
        ]

        let status = SecItemAdd(query as CFDictionary, nil)

        guard status == errSecSuccess else {
            if status == errSecDuplicateItem {
                throw KeychainError.duplicateItem
            }
            throw KeychainError.unexpectedStatus(status)
        }
    }

    private func update(_ data: Data, forKey key: String) throws {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: serviceName,
            kSecAttrAccount as String: key
        ]

        let attributes: [String: Any] = [
            kSecValueData as String: data
        ]

        let status = SecItemUpdate(query as CFDictionary, attributes as CFDictionary)

        guard status == errSecSuccess else {
            throw KeychainError.unexpectedStatus(status)
        }
    }

    private func retrieve(forKey key: String) throws -> String {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: serviceName,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        guard status == errSecSuccess else {
            if status == errSecItemNotFound {
                throw KeychainError.itemNotFound
            }
            throw KeychainError.unexpectedStatus(status)
        }

        guard let data = result as? Data,
              let string = String(data: data, encoding: .utf8) else {
            throw KeychainError.invalidData
        }

        return string
    }

    private func delete(forKey key: String) throws {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: serviceName,
            kSecAttrAccount as String: key
        ]

        let status = SecItemDelete(query as CFDictionary)

        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw KeychainError.unexpectedStatus(status)
        }
    }
}
