import XCTest
@testable import KullMobile

final class CreditSummaryTests: XCTestCase {
    func testDecodesFromJSON() throws {
        let data = """
        {
            "balance": 950,
            "planDisplayName": "Studio Monthly",
            "estimatedShootsRemaining": 36.5
        }
        """.data(using: .utf8)!
        let summary = try JSONDecoder().decode(CreditSummary.self, from: data)
        XCTAssertEqual(summary.balance, 950)
        XCTAssertEqual(summary.planDisplayName, "Studio Monthly")
        XCTAssertEqual(summary.estimatedShootsRemaining, 36.5)
    }
}
