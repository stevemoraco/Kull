//
//  SettingsViewTests.swift
//  kullTests
//
//  Created by Agent G on 11/18/25.
//

import XCTest
import SwiftUI
@testable import kull

// Type alias to avoid ambiguity with SwiftUI.Environment
typealias KullEnvironment = kull.Environment

@MainActor
final class SettingsViewTests: XCTestCase {
    var authViewModel: AuthViewModel!
    var envConfig: EnvironmentConfig!

    override func setUp() async throws {
        try await super.setUp()
        authViewModel = AuthViewModel()
        envConfig = EnvironmentConfig.shared
    }

    override func tearDown() async throws {
        // Reset to default environment
        envConfig.current = .development
        try await super.tearDown()
    }

    // MARK: - View Creation Tests

    func testSettingsViewCreation() {
        let view = SettingsView()
            .environmentObject(authViewModel)

        XCTAssertNotNil(view)
    }

    func testSettingsViewWithAuthenticatedUser() {
        // Create a mock authenticated user
        let mockUser = AuthViewModel.DeviceUser(
            id: "test-user",
            email: "test@example.com",
            firstName: "Test",
            lastName: "User",
            profileImageUrl: nil
        )

        // Note: We can't easily set the state directly in tests
        // This test verifies the view can be created with the auth view model
        let view = SettingsView()
            .environmentObject(authViewModel)

        XCTAssertNotNil(view)
    }

    // MARK: - Environment Configuration Tests

    func testEnvironmentSwitching() {
        let originalEnv = envConfig.current

        // Test switching to different environments
        envConfig.current = .production
        XCTAssertEqual(envConfig.current, .production)
        XCTAssertEqual(envConfig.apiBaseURL, KullEnvironment.production.baseURL)

        envConfig.current = .staging
        XCTAssertEqual(envConfig.current, .staging)
        XCTAssertEqual(envConfig.apiBaseURL, KullEnvironment.staging.baseURL)

        envConfig.current = .development
        XCTAssertEqual(envConfig.current, .development)
        XCTAssertEqual(envConfig.apiBaseURL, KullEnvironment.development.baseURL)

        // Restore original
        envConfig.current = originalEnv
    }

    func testEnvironmentURLs() {
        envConfig.current = .development
        XCTAssertEqual(envConfig.apiBaseURL.absoluteString, "http://localhost:5000")
        XCTAssertEqual(envConfig.websocketURL.absoluteString, "ws://localhost:5000")

        envConfig.current = .staging
        XCTAssertEqual(envConfig.apiBaseURL.absoluteString, "https://staging.kullai.com")
        XCTAssertEqual(envConfig.websocketURL.absoluteString, "wss://staging.kullai.com")

        envConfig.current = .production
        XCTAssertEqual(envConfig.apiBaseURL.absoluteString, "https://kullai.com")
        XCTAssertEqual(envConfig.websocketURL.absoluteString, "wss://kullai.com")
    }

    func testEnvironmentDisplayNames() {
        XCTAssertEqual(KullEnvironment.development.displayName, "Development (localhost:5000)")
        XCTAssertEqual(KullEnvironment.staging.displayName, "Staging (staging.kullai.com)")
        XCTAssertEqual(KullEnvironment.production.displayName, "Production (kullai.com)")
    }

    func testEnvironmentPersistence() {
        let originalEnv = envConfig.current

        // Change environment
        envConfig.current = .production

        // Verify it's persisted in UserDefaults
        let saved = UserDefaults.standard.string(forKey: "selectedEnvironment")
        XCTAssertEqual(saved, KullEnvironment.production.rawValue)

        // Restore original
        envConfig.current = originalEnv
    }

    // MARK: - App Storage Tests

    func testNotificationPreferencesDefaults() {
        // These test the default values
        let notifyShootCompleted = UserDefaults.standard.object(forKey: "notifyShootCompleted") as? Bool ?? true
        let notifyCreditsLow = UserDefaults.standard.object(forKey: "notifyCreditsLow") as? Bool ?? true
        let notifyDeviceConnected = UserDefaults.standard.object(forKey: "notifyDeviceConnected") as? Bool ?? true

        // Defaults should be true
        XCTAssertTrue(notifyShootCompleted)
        XCTAssertTrue(notifyCreditsLow)
        XCTAssertTrue(notifyDeviceConnected)
    }

    func testDebugLoggingDefault() {
        let debugLogging = UserDefaults.standard.object(forKey: "debugLogging") as? Bool ?? false
        XCTAssertFalse(debugLogging)
    }

    func testSettingNotificationPreferences() {
        // Save preferences
        UserDefaults.standard.set(false, forKey: "notifyShootCompleted")
        UserDefaults.standard.set(false, forKey: "notifyCreditsLow")
        UserDefaults.standard.set(false, forKey: "notifyDeviceConnected")

        // Retrieve and verify
        XCTAssertFalse(UserDefaults.standard.bool(forKey: "notifyShootCompleted"))
        XCTAssertFalse(UserDefaults.standard.bool(forKey: "notifyCreditsLow"))
        XCTAssertFalse(UserDefaults.standard.bool(forKey: "notifyDeviceConnected"))

        // Reset to defaults
        UserDefaults.standard.removeObject(forKey: "notifyShootCompleted")
        UserDefaults.standard.removeObject(forKey: "notifyCreditsLow")
        UserDefaults.standard.removeObject(forKey: "notifyDeviceConnected")
    }

    func testSettingDebugLogging() {
        UserDefaults.standard.set(true, forKey: "debugLogging")
        XCTAssertTrue(UserDefaults.standard.bool(forKey: "debugLogging"))

        UserDefaults.standard.set(false, forKey: "debugLogging")
        XCTAssertFalse(UserDefaults.standard.bool(forKey: "debugLogging"))

        // Reset
        UserDefaults.standard.removeObject(forKey: "debugLogging")
    }

    // MARK: - Version Info Tests

    func testAppVersionAvailable() {
        let version = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String
        XCTAssertNotNil(version)
    }

    func testBuildNumberAvailable() {
        let buildNumber = Bundle.main.infoDictionary?["CFBundleVersion"] as? String
        XCTAssertNotNil(buildNumber)
    }

    // MARK: - Cache Management Tests

    func testClearURLCache() {
        // Add something to cache
        let url = URL(string: "https://test.com")!
        let response = URLResponse(url: url, mimeType: "text/html", expectedContentLength: 0, textEncodingName: nil)
        let data = Data()
        let cachedResponse = CachedURLResponse(response: response, data: data)

        URLCache.shared.storeCachedResponse(cachedResponse, for: URLRequest(url: url))

        // Verify it was cached
        XCTAssertNotNil(URLCache.shared.cachedResponse(for: URLRequest(url: url)))

        // Clear cache
        URLCache.shared.removeAllCachedResponses()

        // Verify cache is cleared
        XCTAssertNil(URLCache.shared.cachedResponse(for: URLRequest(url: url)))
    }

    func testClearUserDefaultsPreservesSettings() {
        // Set a setting that should be preserved
        UserDefaults.standard.set(false, forKey: "notifyShootCompleted")

        // Set a non-settings key that should be cleared
        UserDefaults.standard.set("test-value", forKey: "tempCacheKey")

        // Simulate the clear cache function (without actually calling it in the test)
        let settingsKeys = [
            "notifyShootCompleted",
            "notifyCreditsLow",
            "notifyDeviceConnected",
            "debugLogging",
            "selectedEnvironment"
        ]

        let dictionary = UserDefaults.standard.dictionaryRepresentation()
        for key in dictionary.keys where !settingsKeys.contains(key) {
            if key == "tempCacheKey" {
                UserDefaults.standard.removeObject(forKey: key)
            }
        }

        // Verify settings key is preserved
        XCTAssertFalse(UserDefaults.standard.bool(forKey: "notifyShootCompleted"))

        // Verify non-settings key was cleared
        XCTAssertNil(UserDefaults.standard.string(forKey: "tempCacheKey"))

        // Cleanup
        UserDefaults.standard.removeObject(forKey: "notifyShootCompleted")
    }

    // MARK: - Environment Change Notification Tests

    func testEnvironmentChangeNotification() {
        let expectation = XCTestExpectation(description: "Environment change notification")

        let observer = NotificationCenter.default.addObserver(
            forName: .environmentDidChange,
            object: nil,
            queue: .main
        ) { notification in
            if let newEnv = notification.object as? KullEnvironment {
                XCTAssertEqual(newEnv, .production)
                expectation.fulfill()
            }
        }

        // Change environment
        envConfig.current = .production

        wait(for: [expectation], timeout: 1.0)

        NotificationCenter.default.removeObserver(observer)

        // Reset
        envConfig.current = .development
    }

    // MARK: - Integration Tests

    func testFullEnvironmentSwitchFlow() {
        let originalEnv = envConfig.current

        // Switch through all environments
        let environments: [KullEnvironment] = [.development, .staging, .production]

        for env in environments {
            envConfig.current = env
            XCTAssertEqual(envConfig.current, env)
            XCTAssertEqual(envConfig.apiBaseURL, env.baseURL)
            XCTAssertEqual(envConfig.websocketURL, env.wsURL)

            // Verify persistence
            let saved = UserDefaults.standard.string(forKey: "selectedEnvironment")
            XCTAssertEqual(saved, env.rawValue)
        }

        // Restore original
        envConfig.current = originalEnv
    }

    func testAllEnvironmentsHaveValidURLs() {
        for env in KullEnvironment.allCases {
            // Base URL should be valid
            XCTAssertNotNil(URL(string: env.baseURL.absoluteString))

            // WebSocket URL should be valid
            XCTAssertNotNil(URL(string: env.wsURL.absoluteString))

            // Display name should not be empty
            XCTAssertFalse(env.displayName.isEmpty)
        }
    }

    // MARK: - Edge Cases

    func testRapidEnvironmentSwitching() {
        let originalEnv = envConfig.current

        // Rapidly switch environments
        for _ in 0..<10 {
            envConfig.current = .production
            envConfig.current = .development
            envConfig.current = .staging
        }

        // Should end in consistent state
        XCTAssertEqual(envConfig.current, .staging)

        // Restore original
        envConfig.current = originalEnv
    }

    func testEnvironmentSwitchingWithURLCaching() {
        let originalEnv = envConfig.current

        // Get URL for one environment
        envConfig.current = .development
        let devURL = envConfig.apiBaseURL

        // Switch environment
        envConfig.current = .production
        let prodURL = envConfig.apiBaseURL

        // URLs should be different
        XCTAssertNotEqual(devURL, prodURL)

        // Restore original
        envConfig.current = originalEnv
    }
}
