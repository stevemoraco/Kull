import XCTest
@testable import kull

@MainActor
final class NotificationServiceTests: XCTestCase {
    override func setUp() {
        super.setUp()
        NotificationService.shared.deviceToken = nil
        NotificationService.shared.permissionGranted = false
        NotificationService.shared.pendingNotifications.removeAll()
    }

    func testHandleNotificationMissingTypeDoesNotCrash() {
        NotificationService.shared.handleNotification([:])
        XCTAssertNil(NotificationService.shared.deviceToken)
    }

    func testHandleNotificationKnownTypes() {
        let payloads: [[AnyHashable: Any]] = [
            ["type": "shoot_complete", "shootId": "abc", "imageCount": 3, "activeCount": 0],
            ["type": "device_connected", "deviceName": "Test"],
            ["type": "device_disconnected", "deviceName": "Test"],
            ["type": "credit_low"]
        ]

        for payload in payloads {
            NotificationService.shared.handleNotification(payload)
        }

        // No crashes and permission flag remains default
        XCTAssertFalse(NotificationService.shared.permissionGranted)
    }

    func testClearBadgeNoCrash() {
        NotificationService.shared.clearBadge()
        XCTAssertTrue(true)
    }
}
