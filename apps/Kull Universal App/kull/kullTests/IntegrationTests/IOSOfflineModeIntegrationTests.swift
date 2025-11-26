import XCTest

final class IOSOfflineModeIntegrationTests: XCTestCase {
    func testOfflineModeSkippedInUnitEnvironment() throws {
        throw XCTSkip("Offline mode integration tests are skipped in unit test runs.")
    }
}
