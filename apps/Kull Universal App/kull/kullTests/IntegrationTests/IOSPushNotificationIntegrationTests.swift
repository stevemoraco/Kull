import XCTest

final class IOSPushNotificationIntegrationTests: XCTestCase {
    func testPushIntegrationSkippedInUnitEnvironment() throws {
        throw XCTSkip("Push notification integration tests are skipped in unit test runs.")
    }
}
