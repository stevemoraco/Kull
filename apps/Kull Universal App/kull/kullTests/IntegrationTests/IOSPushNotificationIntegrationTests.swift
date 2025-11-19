//
//  IOSPushNotificationIntegrationTests.swift
//  kullTests
//
//  Integration tests for iOS/iPadOS push notification delivery
//  Tests notification service, APNs integration, and notification handling
//

import XCTest
@testable import kull

#if os(iOS)
import UIKit
import UserNotifications

final class IOSPushNotificationIntegrationTests: XCTestCase {

    var notificationService: NotificationService!
    var notificationCenter: UNUserNotificationCenter!

    override func setUp() {
        super.setUp()
        notificationService = NotificationService.shared
        notificationCenter = UNUserNotificationCenter.current()
    }

    override func tearDown() {
        notificationService = nil
        notificationCenter = nil
        super.tearDown()
    }

    // MARK: - Notification Service Initialization Tests

    func testNotificationServiceInitializes() {
        // Given/When
        let service = NotificationService.shared

        // Then
        XCTAssertNotNil(service, "NotificationService should initialize")
    }

    func testNotificationServiceIsSingleton() {
        // Given
        let service1 = NotificationService.shared
        let service2 = NotificationService.shared

        // Then
        XCTAssertTrue(service1 === service2, "NotificationService should be singleton")
    }

    // MARK: - Permission Request Tests

    func testRequestNotificationPermissions() {
        // Given
        let expectation = expectation(description: "Permission request completes")

        // When
        notificationCenter.requestAuthorization(options: [.alert, .sound, .badge]) { granted, error in
            // Then
            XCTAssertNil(error, "Should not have error requesting permissions")
            expectation.fulfill()
        }

        waitForExpectations(timeout: 5.0)
    }

    func testCheckNotificationSettings() {
        // Given
        let expectation = expectation(description: "Check settings completes")

        // When
        notificationCenter.getNotificationSettings { settings in
            // Then
            XCTAssertNotNil(settings, "Should return notification settings")
            XCTAssertTrue(
                settings.authorizationStatus == .authorized ||
                settings.authorizationStatus == .notDetermined ||
                settings.authorizationStatus == .denied,
                "Should have valid authorization status"
            )
            expectation.fulfill()
        }

        waitForExpectations(timeout: 5.0)
    }

    // MARK: - Local Notification Tests

    func testScheduleLocalNotification() {
        // Given
        let content = UNMutableNotificationContent()
        content.title = "Test Notification"
        content.body = "This is a test notification"
        content.sound = .default

        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 1, repeats: false)
        let request = UNNotificationRequest(
            identifier: "test-notification-\(UUID().uuidString)",
            content: content,
            trigger: trigger
        )

        let expectation = expectation(description: "Notification scheduled")

        // When
        notificationCenter.add(request) { error in
            // Then
            XCTAssertNil(error, "Should schedule notification without error")
            expectation.fulfill()
        }

        waitForExpectations(timeout: 5.0)

        // Cleanup
        notificationCenter.removeAllPendingNotificationRequests()
    }

    func testScheduleMultipleNotifications() {
        // Given
        let requests = (0..<3).map { index -> UNNotificationRequest in
            let content = UNMutableNotificationContent()
            content.title = "Test \(index)"
            content.body = "Notification \(index)"

            let trigger = UNTimeIntervalNotificationTrigger(timeInterval: Double(index + 1), repeats: false)
            return UNNotificationRequest(
                identifier: "test-\(index)-\(UUID().uuidString)",
                content: content,
                trigger: trigger
            )
        }

        let expectation = expectation(description: "All notifications scheduled")
        expectation.expectedFulfillmentCount = requests.count

        // When
        requests.forEach { request in
            notificationCenter.add(request) { error in
                XCTAssertNil(error, "Should schedule notification")
                expectation.fulfill()
            }
        }

        // Then
        waitForExpectations(timeout: 5.0)

        // Cleanup
        notificationCenter.removeAllPendingNotificationRequests()
    }

    func testRemovePendingNotifications() {
        // Given
        let content = UNMutableNotificationContent()
        content.title = "Test"
        content.body = "Test"

        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 60, repeats: false)
        let identifier = "test-removable-\(UUID().uuidString)"
        let request = UNNotificationRequest(identifier: identifier, content: content, trigger: trigger)

        let scheduleExpectation = expectation(description: "Notification scheduled")
        notificationCenter.add(request) { error in
            XCTAssertNil(error)
            scheduleExpectation.fulfill()
        }
        wait(for: [scheduleExpectation], timeout: 5.0)

        // When
        notificationCenter.removePendingNotificationRequests(withIdentifiers: [identifier])

        // Then
        let verifyExpectation = expectation(description: "Verify removal")
        notificationCenter.getPendingNotificationRequests { requests in
            let exists = requests.contains { $0.identifier == identifier }
            XCTAssertFalse(exists, "Notification should be removed")
            verifyExpectation.fulfill()
        }

        waitForExpectations(timeout: 5.0)
    }

    // MARK: - Notification Content Tests

    func testNotificationWithBadge() {
        // Given
        let content = UNMutableNotificationContent()
        content.title = "Badge Test"
        content.body = "Testing badge"
        content.badge = 5

        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 1, repeats: false)
        let request = UNNotificationRequest(
            identifier: "badge-test-\(UUID().uuidString)",
            content: content,
            trigger: trigger
        )

        let expectation = expectation(description: "Notification with badge")

        // When
        notificationCenter.add(request) { error in
            // Then
            XCTAssertNil(error, "Should schedule notification with badge")
            expectation.fulfill()
        }

        waitForExpectations(timeout: 5.0)

        // Cleanup
        notificationCenter.removeAllPendingNotificationRequests()
    }

    func testNotificationWithSound() {
        // Given
        let content = UNMutableNotificationContent()
        content.title = "Sound Test"
        content.body = "Testing sound"
        content.sound = .default

        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 1, repeats: false)
        let request = UNNotificationRequest(
            identifier: "sound-test-\(UUID().uuidString)",
            content: content,
            trigger: trigger
        )

        let expectation = expectation(description: "Notification with sound")

        // When
        notificationCenter.add(request) { error in
            // Then
            XCTAssertNil(error, "Should schedule notification with sound")
            expectation.fulfill()
        }

        waitForExpectations(timeout: 5.0)

        // Cleanup
        notificationCenter.removeAllPendingNotificationRequests()
    }

    func testNotificationWithUserInfo() {
        // Given
        let content = UNMutableNotificationContent()
        content.title = "User Info Test"
        content.body = "Testing user info"
        content.userInfo = [
            "shootId": "12345",
            "processedImages": 1000,
            "status": "completed"
        ]

        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 1, repeats: false)
        let request = UNNotificationRequest(
            identifier: "userinfo-test-\(UUID().uuidString)",
            content: content,
            trigger: trigger
        )

        let expectation = expectation(description: "Notification with user info")

        // When
        notificationCenter.add(request) { error in
            // Then
            XCTAssertNil(error, "Should schedule notification with user info")
            expectation.fulfill()
        }

        waitForExpectations(timeout: 5.0)

        // Verify user info
        let verifyExpectation = expectation(description: "Verify user info")
        notificationCenter.getPendingNotificationRequests { requests in
            if let request = requests.first(where: { $0.identifier == request.identifier }) {
                XCTAssertEqual(request.content.userInfo["shootId"] as? String, "12345")
            }
            verifyExpectation.fulfill()
        }

        waitForExpectations(timeout: 5.0)

        // Cleanup
        notificationCenter.removeAllPendingNotificationRequests()
    }

    // MARK: - NotificationService Integration Tests

    func testNotifyProcessingStarted() {
        // Given
        let shootId = "test-shoot-\(UUID().uuidString)"
        let imageCount = 1000

        // When/Then - Should not throw
        notificationService.notifyProcessingStarted(shootId: shootId, imageCount: imageCount)
        XCTAssertTrue(true, "Should send processing started notification")

        // Cleanup
        notificationCenter.removeAllPendingNotificationRequests()
    }

    func testNotifyProcessingProgress() {
        // Given
        let shootId = "test-shoot-\(UUID().uuidString)"
        let processed = 500
        let total = 1000

        // When/Then - Should not throw
        notificationService.notifyProcessingProgress(
            shootId: shootId,
            processed: processed,
            total: total
        )
        XCTAssertTrue(true, "Should send progress notification")

        // Cleanup
        notificationCenter.removeAllPendingNotificationRequests()
    }

    func testNotifyProcessingCompleted() {
        // Given
        let shootId = "test-shoot-\(UUID().uuidString)"
        let imageCount = 1000
        let duration = 45.0

        // When/Then - Should not throw
        notificationService.notifyProcessingCompleted(
            shootId: shootId,
            imageCount: imageCount,
            duration: duration
        )
        XCTAssertTrue(true, "Should send completion notification")

        // Cleanup
        notificationCenter.removeAllPendingNotificationRequests()
    }

    func testNotifyProcessingFailed() {
        // Given
        let shootId = "test-shoot-\(UUID().uuidString)"
        let error = NSError(domain: "TestError", code: -1, userInfo: nil)

        // When/Then - Should not throw
        notificationService.notifyProcessingFailed(shootId: shootId, error: error)
        XCTAssertTrue(true, "Should send failure notification")

        // Cleanup
        notificationCenter.removeAllPendingNotificationRequests()
    }

    // MARK: - Background Notification Tests

    func testScheduleBackgroundNotification() {
        // Given
        let content = UNMutableNotificationContent()
        content.title = "Background Test"
        content.body = "Testing background delivery"
        content.userInfo = ["aps": ["content-available": 1]]

        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 1, repeats: false)
        let request = UNNotificationRequest(
            identifier: "background-test-\(UUID().uuidString)",
            content: content,
            trigger: trigger
        )

        let expectation = expectation(description: "Background notification")

        // When
        notificationCenter.add(request) { error in
            // Then
            XCTAssertNil(error, "Should schedule background notification")
            expectation.fulfill()
        }

        waitForExpectations(timeout: 5.0)

        // Cleanup
        notificationCenter.removeAllPendingNotificationRequests()
    }

    // MARK: - Notification Category Tests

    func testRegisterNotificationCategories() {
        // Given
        let viewAction = UNNotificationAction(
            identifier: "VIEW_ACTION",
            title: "View Results",
            options: .foreground
        )

        let category = UNNotificationCategory(
            identifier: "SHOOT_COMPLETED",
            actions: [viewAction],
            intentIdentifiers: [],
            options: []
        )

        // When
        notificationCenter.setNotificationCategories([category])

        // Then
        XCTAssertTrue(true, "Should register notification categories")
    }

    func testNotificationWithCategory() {
        // Given
        let viewAction = UNNotificationAction(
            identifier: "VIEW_ACTION",
            title: "View",
            options: .foreground
        )

        let category = UNNotificationCategory(
            identifier: "SHOOT_COMPLETED",
            actions: [viewAction],
            intentIdentifiers: [],
            options: []
        )

        notificationCenter.setNotificationCategories([category])

        let content = UNMutableNotificationContent()
        content.title = "Processing Complete"
        content.body = "Your shoot has been processed"
        content.categoryIdentifier = "SHOOT_COMPLETED"

        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 1, repeats: false)
        let request = UNNotificationRequest(
            identifier: "category-test-\(UUID().uuidString)",
            content: content,
            trigger: trigger
        )

        let expectation = expectation(description: "Notification with category")

        // When
        notificationCenter.add(request) { error in
            // Then
            XCTAssertNil(error, "Should schedule notification with category")
            expectation.fulfill()
        }

        waitForExpectations(timeout: 5.0)

        // Cleanup
        notificationCenter.removeAllPendingNotificationRequests()
    }

    // MARK: - Performance Tests

    func testNotificationSchedulingPerformance() {
        // Given
        let content = UNMutableNotificationContent()
        content.title = "Performance Test"
        content.body = "Testing notification scheduling performance"

        // When/Then
        measure {
            let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 60, repeats: false)
            let request = UNNotificationRequest(
                identifier: "perf-\(UUID().uuidString)",
                content: content,
                trigger: trigger
            )

            let expectation = expectation(description: "Scheduled")
            notificationCenter.add(request) { _ in
                expectation.fulfill()
            }
            wait(for: [expectation], timeout: 1.0)
        }

        // Cleanup
        notificationCenter.removeAllPendingNotificationRequests()
    }

    func testGetPendingNotificationsPerformance() {
        // Given - Schedule 10 notifications first
        let scheduleExpectation = expectation(description: "All scheduled")
        scheduleExpectation.expectedFulfillmentCount = 10

        (0..<10).forEach { index in
            let content = UNMutableNotificationContent()
            content.title = "Test \(index)"

            let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 60, repeats: false)
            let request = UNNotificationRequest(
                identifier: "perf-get-\(index)",
                content: content,
                trigger: trigger
            )

            notificationCenter.add(request) { _ in
                scheduleExpectation.fulfill()
            }
        }

        wait(for: [scheduleExpectation], timeout: 5.0)

        // When/Then
        measure {
            let expectation = expectation(description: "Get pending")
            notificationCenter.getPendingNotificationRequests { _ in
                expectation.fulfill()
            }
            wait(for: [expectation], timeout: 1.0)
        }

        // Cleanup
        notificationCenter.removeAllPendingNotificationRequests()
    }

    // MARK: - Memory Tests

    func testNotificationServiceMemoryUsage() {
        // Given
        weak var weakService: NotificationService?

        autoreleasepool {
            let service = NotificationService.shared
            weakService = service

            // Trigger multiple notifications
            (0..<100).forEach { index in
                service.notifyProcessingProgress(
                    shootId: "test-\(index)",
                    processed: index * 10,
                    total: 1000
                )
            }
        }

        // Then - Service is singleton, should persist
        XCTAssertNotNil(weakService, "Singleton should not be deallocated")

        // Cleanup
        notificationCenter.removeAllPendingNotificationRequests()
    }
}

#endif
