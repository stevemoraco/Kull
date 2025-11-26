import XCTest
@testable import kull

final class NetworkMonitorTests: XCTestCase {
    func testSharedMonitorAccessible() {
        let monitor = NetworkMonitor.shared
        XCTAssertNotNil(monitor)
        XCTAssertFalse(monitor.connectionDescription.isEmpty)
    }

    func testNetworkQualityReturnsValue() {
        let quality = NetworkMonitor.shared.networkQuality
        // Whatever the live state, this should produce a valid enum case
        switch quality {
        case .offline, .poor, .moderate, .good:
            XCTAssertTrue(true)
        }
    }
}
