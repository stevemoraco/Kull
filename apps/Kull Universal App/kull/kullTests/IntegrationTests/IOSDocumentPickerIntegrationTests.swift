import XCTest

final class IOSDocumentPickerIntegrationTests: XCTestCase {
    func testDocumentPickerFlowsSkippedInUnitEnvironment() throws {
        throw XCTSkip("Document picker integration tests are skipped in unit test runs.")
    }
}
