import XCTest

final class IOSAccessibilityIntegrationTests: XCTestCase {
    func testAccessibilityFlowsSkippedInUnitEnvironment() throws {
        throw XCTSkip("UI accessibility integration tests are skipped in unit test runs.")
    }
}
