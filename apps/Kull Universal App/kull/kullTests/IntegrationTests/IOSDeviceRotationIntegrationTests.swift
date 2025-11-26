import XCTest

final class IOSDeviceRotationIntegrationTests: XCTestCase {
    func testRotationFlowsSkippedInUnitEnvironment() throws {
        throw XCTSkip("Device rotation integration tests are skipped in unit test runs.")
    }
}
