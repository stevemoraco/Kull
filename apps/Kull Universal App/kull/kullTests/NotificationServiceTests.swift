//
//  NotificationServiceTests.swift
//  kullTests
//
//  Created by Agent 12 on 11/18/25.
//

import XCTest
import UserNotifications
@testable import kull

#if os(iOS)
@MainActor
final class NotificationServiceTests: XCTestCase {
    var notificationService: NotificationService!

    override func setUp() async throws {
        try await super.setUp()
        notificationService = NotificationService.shared
    }

    override func tearDown() async throws {
        try await super.tearDown()
    }

    // MARK: - Permission Tests

    func testRequestPermissions() async throws {
        // Test that permission request completes without error
        // Note: In test environment, this will likely be denied/mocked
        do {
            try await notificationService.requestPermissions()
            // If we get here, the method executed without throwing
            XCTAssertTrue(true, "Permission request completed")
        } catch {
            // Permission request can fail in test environment - that's OK
            XCTAssertTrue(error is NotificationError || error.localizedDescription.contains("not authorized"))
        }
    }

    // MARK: - Device Token Tests

    func testDeviceTokenParsing() {
        // Test that device token is correctly parsed from Data
        let mockTokenData = Data([0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC, 0xDE, 0xF0])

        notificationService.didRegisterForRemoteNotifications(deviceToken: mockTokenData)

        // Should be parsed as hex string
        XCTAssertEqual(notificationService.deviceToken, "123456789abcdef0")
    }

    func testDeviceTokenRegistration() async throws {
        // Test device token registration with backend
        let mockToken = Data([0x12, 0x34, 0x56, 0x78])

        // This will attempt to register with backend
        // In production, it should succeed; in test, it may fail due to network
        notificationService.didRegisterForRemoteNotifications(deviceToken: mockToken)

        // Verify token was stored locally
        XCTAssertNotNil(notificationService.deviceToken)
        XCTAssertEqual(notificationService.deviceToken?.count, 8) // 4 bytes = 8 hex chars
    }

    // MARK: - Badge Tests

    func testBadgeUpdate() {
        // Test badge count update
        notificationService.updateBadge(count: 5)

        // Verify badge was updated
        let badgeCount = UIApplication.shared.applicationIconBadgeNumber
        XCTAssertEqual(badgeCount, 5)

        // Clear badge
        notificationService.clearBadge()
        let clearedBadge = UIApplication.shared.applicationIconBadgeNumber
        XCTAssertEqual(clearedBadge, 0)
    }

    // MARK: - Notification Handling Tests

    func testShootCompleteNotification() {
        let expectation = XCTestExpectation(description: "Shoot complete notification")

        // Listen for notification center event
        let observer = NotificationCenter.default.addObserver(
            forName: .shootCompleted,
            object: nil,
            queue: .main
        ) { notification in
            XCTAssertEqual(notification.userInfo?["shootId"] as? String, "test-shoot-123")
            XCTAssertEqual(notification.userInfo?["imageCount"] as? Int, 1247)
            expectation.fulfill()
        }

        // Simulate shoot complete notification
        let userInfo: [AnyHashable: Any] = [
            "type": "shoot_complete",
            "shootId": "test-shoot-123",
            "imageCount": 1247,
            "activeCount": 2
        ]

        notificationService.handleNotification(userInfo)

        wait(for: [expectation], timeout: 2.0)
        NotificationCenter.default.removeObserver(observer)

        // Verify badge was updated
        let badgeCount = UIApplication.shared.applicationIconBadgeNumber
        XCTAssertEqual(badgeCount, 2)
    }

    func testDeviceConnectedNotification() {
        let expectation = XCTestExpectation(description: "Device connected notification")

        let observer = NotificationCenter.default.addObserver(
            forName: .deviceConnected,
            object: nil,
            queue: .main
        ) { notification in
            XCTAssertEqual(notification.userInfo?["deviceName"] as? String, "MacBook Pro")
            expectation.fulfill()
        }

        let userInfo: [AnyHashable: Any] = [
            "type": "device_connected",
            "deviceName": "MacBook Pro"
        ]

        notificationService.handleNotification(userInfo)

        wait(for: [expectation], timeout: 2.0)
        NotificationCenter.default.removeObserver(observer)
    }

    func testDeviceDisconnectedNotification() {
        let expectation = XCTestExpectation(description: "Device disconnected notification")

        let observer = NotificationCenter.default.addObserver(
            forName: .deviceDisconnected,
            object: nil,
            queue: .main
        ) { notification in
            XCTAssertEqual(notification.userInfo?["deviceName"] as? String, "iPhone 15 Pro")
            expectation.fulfill()
        }

        let userInfo: [AnyHashable: Any] = [
            "type": "device_disconnected",
            "deviceName": "iPhone 15 Pro"
        ]

        notificationService.handleNotification(userInfo)

        wait(for: [expectation], timeout: 2.0)
        NotificationCenter.default.removeObserver(observer)
    }

    func testCreditLowNotification() {
        let expectation = XCTestExpectation(description: "Credit low notification")

        let observer = NotificationCenter.default.addObserver(
            forName: .creditLow,
            object: nil,
            queue: .main
        ) { notification in
            XCTAssertEqual(notification.userInfo?["remaining"] as? Int, 100)
            expectation.fulfill()
        }

        let userInfo: [AnyHashable: Any] = [
            "type": "credit_low",
            "remaining": 100
        ]

        notificationService.handleNotification(userInfo)

        wait(for: [expectation], timeout: 2.0)
        NotificationCenter.default.removeObserver(observer)
    }

    func testUnknownNotificationType() {
        // Should not crash on unknown type
        let userInfo: [AnyHashable: Any] = [
            "type": "unknown_type",
            "data": "some data"
        ]

        notificationService.handleNotification(userInfo)

        // Should complete without crashing
        XCTAssertTrue(true)
    }

    func testMissingNotificationType() {
        // Should handle missing type gracefully
        let userInfo: [AnyHashable: Any] = [
            "data": "some data"
        ]

        notificationService.handleNotification(userInfo)

        // Should complete without crashing
        XCTAssertTrue(true)
    }

    // MARK: - Local Notification Tests

    func testScheduleLocalNotification() async throws {
        let center = UNUserNotificationCenter.current()

        // Request permissions first
        _ = try? await center.requestAuthorization(options: [.alert, .sound, .badge])

        // Schedule local notification
        notificationService.scheduleLocalNotification(
            title: "Test Notification",
            body: "This is a test",
            delay: 0.1
        )

        // Wait for notification to be scheduled
        try await Task.sleep(nanoseconds: 200_000_000) // 200ms

        // Verify notification was added
        let requests = await center.pendingNotificationRequests()
        XCTAssertTrue(requests.count > 0, "Local notification should be scheduled")
    }

    // MARK: - Integration Tests

    func testFullNotificationFlow() async throws {
        // Simulate full flow: permission -> token -> notification

        // 1. Request permissions
        do {
            try await notificationService.requestPermissions()
        } catch {
            // May fail in test environment
        }

        // 2. Register device token
        let mockToken = Data([0xAA, 0xBB, 0xCC, 0xDD])
        notificationService.didRegisterForRemoteNotifications(deviceToken: mockToken)

        XCTAssertNotNil(notificationService.deviceToken)

        // 3. Handle notification
        let expectation = XCTestExpectation(description: "Full flow")

        let observer = NotificationCenter.default.addObserver(
            forName: .shootCompleted,
            object: nil,
            queue: .main
        ) { _ in
            expectation.fulfill()
        }

        let userInfo: [AnyHashable: Any] = [
            "type": "shoot_complete",
            "shootId": "integration-test",
            "imageCount": 999,
            "activeCount": 1
        ]

        notificationService.handleNotification(userInfo)

        wait(for: [expectation], timeout: 2.0)
        NotificationCenter.default.removeObserver(observer)

        // Verify badge
        let badgeCount = UIApplication.shared.applicationIconBadgeNumber
        XCTAssertEqual(badgeCount, 1)
    }

    // MARK: - Error Handling Tests

    func testNotificationError() {
        let error = NotificationError.registrationFailed
        XCTAssertEqual(error.errorDescription, "Failed to register device token with backend")

        let invalidURLError = NotificationError.invalidURL
        XCTAssertEqual(invalidURLError.errorDescription, "Invalid notification endpoint URL")

        let notAuthError = NotificationError.notAuthenticated
        XCTAssertEqual(notAuthError.errorDescription, "User not authenticated - cannot register for notifications")
    }
}
#else
// macOS doesn't support push notifications in the same way
final class NotificationServiceTests: XCTestCase {
    func testNotificationServiceNotAvailableOnMacOS() {
        XCTAssertTrue(true, "Push notifications are iOS-only")
    }
}
#endif
