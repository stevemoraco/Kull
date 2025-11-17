import XCTest
@testable import KullMenubar

final class CreditSummaryTests: XCTestCase {
    func testDecodesFromJSON() throws {
        let json = """
        {
            "balance": 1200,
            "planDisplayName": "Pro Annual",
            "estimatedShootsRemaining": 48.0
        }
        """
        let data = Data(json.utf8)
        let summary = try JSONDecoder().decode(KullMenubar.CreditSummary.self, from: data)
        XCTAssertEqual(summary.balance, 1200)
        XCTAssertEqual(summary.planDisplayName, "Pro Annual")
        XCTAssertEqual(summary.estimatedShootsRemaining, 48.0)
    }
}
