import XCTest

final class IOSMemoryMonitoringIntegrationTests: XCTestCase {
    func testMemoryMonitoringSkippedInUnitEnvironment() throws {
        throw XCTSkip("Memory monitoring integration tests are skipped in unit test runs.")
    }
}
