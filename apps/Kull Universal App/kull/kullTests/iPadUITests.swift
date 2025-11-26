#if os(iOS)
import XCTest
@testable import kull

final class iPadUITests: XCTestCase {
    func testNavigationItemsExist() {
        let items: [NavigationItem] = [.home, .folders, .marketplace, .settings]
        XCTAssertEqual(Set(items).count, 4)
    }
}
#endif
