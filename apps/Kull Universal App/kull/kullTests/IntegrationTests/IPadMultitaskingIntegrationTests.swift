import XCTest

final class IPadMultitaskingIntegrationTests: XCTestCase {
    func testMultitaskingSkippedInUnitEnvironment() throws {
        throw XCTSkip("iPad multitasking integration tests are skipped in unit test runs.")
    }
}
