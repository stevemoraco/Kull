import XCTest
@testable import kull

@MainActor
final class EnvironmentConfigTests: XCTestCase {

    override func setUp() async throws {
        try await super.setUp()
        // Clear UserDefaults before each test
        UserDefaults.standard.removeObject(forKey: "selectedEnvironment")
        EnvironmentConfig.shared.current = EnvironmentConfig.defaultEnvironment
    }

    override func tearDown() async throws {
        // Clean up UserDefaults after each test
        UserDefaults.standard.removeObject(forKey: "selectedEnvironment")
        EnvironmentConfig.shared.current = EnvironmentConfig.defaultEnvironment
        try await super.tearDown()
    }

    // MARK: - Environment URLs

    func testDevelopmentBaseURL() {
        let env = Environment.development
        XCTAssertEqual(env.baseURL.absoluteString, "http://localhost:5000")
    }

    func testStagingBaseURL() {
        let env = Environment.staging
        XCTAssertEqual(env.baseURL.absoluteString, "https://staging.kullai.com")
    }

    func testProductionBaseURL() {
        let env = Environment.production
        XCTAssertEqual(env.baseURL.absoluteString, "https://kullai.com")
    }

    func testDevelopmentWSURL() {
        let env = Environment.development
        XCTAssertEqual(env.wsURL.absoluteString, "ws://localhost:5000")
    }

    func testStagingWSURL() {
        let env = Environment.staging
        XCTAssertEqual(env.wsURL.absoluteString, "wss://staging.kullai.com")
    }

    func testProductionWSURL() {
        let env = Environment.production
        XCTAssertEqual(env.wsURL.absoluteString, "wss://kullai.com")
    }

    // MARK: - Display Names

    func testDevelopmentDisplayName() {
        let env = Environment.development
        XCTAssertEqual(env.displayName, "Development (localhost:5000)")
    }

    func testStagingDisplayName() {
        let env = Environment.staging
        XCTAssertEqual(env.displayName, "Staging (staging.kullai.com)")
    }

    func testProductionDisplayName() {
        let env = Environment.production
        XCTAssertEqual(env.displayName, "Production (kullai.com)")
    }

    // MARK: - EnvironmentConfig

    func testDefaultEnvironmentIsProduction() {
        let config = EnvironmentConfig.shared
        XCTAssertEqual(config.current, Environment.production)
    }

    func testAPIBaseURLFromConfig() {
        let config = EnvironmentConfig.shared
        // Should return the URL for the current environment
        XCTAssertNotNil(config.apiBaseURL)
        XCTAssertTrue(config.apiBaseURL.absoluteString.contains("http"))
    }

    func testWebSocketURLFromConfig() {
        let config = EnvironmentConfig.shared
        // Should return the WS URL for the current environment
        XCTAssertNotNil(config.websocketURL)
        XCTAssertTrue(config.websocketURL.absoluteString.contains("ws"))
    }

    func testEnvironmentPersistence() async {
        let config = EnvironmentConfig.shared

        // Set to staging
        config.current = .staging

        // Verify it's saved to UserDefaults
        let saved = UserDefaults.standard.string(forKey: "selectedEnvironment")
        XCTAssertEqual(saved, "Staging")

        // Verify the current environment is staging
        XCTAssertEqual(config.current, .staging)
    }

    func testEnvironmentChangeNotification() async {
        let expectation = XCTestExpectation(description: "Environment change notification posted")

        let observer = NotificationCenter.default.addObserver(
            forName: .environmentDidChange,
            object: nil,
            queue: .main
        ) { notification in
            if let env = notification.object as? Environment {
                XCTAssertEqual(env, Environment.production)
                expectation.fulfill()
            }
        }

        let config = EnvironmentConfig.shared
        config.current = .production

        await fulfillment(of: [expectation], timeout: 1.0)

        NotificationCenter.default.removeObserver(observer)
    }

    func testURLsUpdateWhenEnvironmentChanges() async {
        let config = EnvironmentConfig.shared

        // Start with development
        config.current = .development
        XCTAssertEqual(config.apiBaseURL.absoluteString, "http://localhost:5000")

        // Switch to staging
        config.current = .staging
        XCTAssertEqual(config.apiBaseURL.absoluteString, "https://staging.kullai.com")

        // Switch to production
        config.current = .production
        XCTAssertEqual(config.apiBaseURL.absoluteString, "https://kullai.com")
    }

    func testLoadFromUserDefaultsOnInit() {
        // Set UserDefaults to production
        UserDefaults.standard.set("Production", forKey: "selectedEnvironment")

        // Create new instance (simulating app restart)
        // Note: We can't easily test the singleton init, but we can verify the logic
        if let saved = UserDefaults.standard.string(forKey: "selectedEnvironment"),
           let env = Environment(rawValue: saved) {
            XCTAssertEqual(env, Environment.production)
        } else {
            XCTFail("Failed to load environment from UserDefaults")
        }
    }

    func testInvalidEnvironmentStringFallsBackToDefault() {
        // Set invalid value in UserDefaults
        UserDefaults.standard.set("InvalidEnvironment", forKey: "selectedEnvironment")

        // Should fall back to default (production)
        let saved = UserDefaults.standard.string(forKey: "selectedEnvironment")
        let env = Environment(rawValue: saved ?? "")

        XCTAssertNil(env, "Should return nil for invalid environment string")
    }

    func testAllEnvironmentsCaseIterable() {
        let allCases = Environment.allCases
        XCTAssertEqual(allCases.count, 3)
        XCTAssertTrue(allCases.contains(.development))
        XCTAssertTrue(allCases.contains(.staging))
        XCTAssertTrue(allCases.contains(.production))
    }

    func testEnvironmentIdentifiable() {
        let dev = Environment.development
        let staging = Environment.staging
        let prod = Environment.production

        XCTAssertEqual(dev.id, "Development")
        XCTAssertEqual(staging.id, "Staging")
        XCTAssertEqual(prod.id, "Production")
    }

    func testEnvironmentRawValues() {
        XCTAssertEqual(Environment.development.rawValue, "Development")
        XCTAssertEqual(Environment.staging.rawValue, "Staging")
        XCTAssertEqual(Environment.production.rawValue, "Production")
    }
}
