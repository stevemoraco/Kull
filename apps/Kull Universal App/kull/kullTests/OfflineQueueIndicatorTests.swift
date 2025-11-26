import XCTest
import SwiftUI
@testable import kull

final class OfflineQueueIndicatorTests: XCTestCase {
    func testViewBuildsWithDefaultState() {
        let view = OfflineQueueIndicator()
        _ = view.body  // Ensure view construction succeeds
    }
}
