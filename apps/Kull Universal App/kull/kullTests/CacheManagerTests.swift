import XCTest
@testable import kull

final class CacheManagerTests: XCTestCase {
    override func setUp() {
        super.setUp()
        CacheManager.shared.clearAllCache()
    }

    override func tearDown() {
        CacheManager.shared.clearAllCache()
        super.tearDown()
    }

    func testUserProfileCachingRoundTrip() {
        let user = RemoteUser(id: "id-1", email: "test@example.com", firstName: "Test", lastName: "User", profileImageUrl: nil)
        CacheManager.shared.cacheUserProfile(user)
        XCTAssertEqual(CacheManager.shared.getCachedUserProfile()?.id, "id-1")
        CacheManager.shared.clearUserProfile()
        XCTAssertNil(CacheManager.shared.getCachedUserProfile())
    }

    func testCreditSummaryCaching() {
        let summary = CreditSummary(balance: 10, planDisplayName: "Pro", estimatedShootsRemaining: 3.5)
        CacheManager.shared.cacheCreditSummary(summary)
        XCTAssertEqual(CacheManager.shared.getCachedCreditSummary()?.planDisplayName, "Pro")
        CacheManager.shared.clearCreditSummary()
        XCTAssertNil(CacheManager.shared.getCachedCreditSummary())
    }

    func testPromptsCaching() {
        let timestamp = ISO8601DateFormatter().string(from: Date())
        let prompt = PromptPresetPayload(
            id: "p1",
            slug: "test",
            title: "Title",
            summary: "Summary",
            instructions: "Do it",
            shootTypes: ["portrait"],
            tags: ["tag1"],
            authorProfile: .init(id: "author", email: "author@example.com", displayName: "Author", bio: "Bio", avatarUrl: nil),
            aiScore: nil,
            humanScore: nil,
            ratingsCount: 0,
            style: PromptStylePayload(
                starMeaning: ["1": "Bad"],
                colorMeaning: nil,
                includeTitle: true,
                includeDescription: false,
                includeTags: false
            ),
            createdAt: timestamp,
            updatedAt: timestamp,
            sharedWithMarketplace: false
        )

        CacheManager.shared.cachePrompts([prompt])
        XCTAssertEqual(CacheManager.shared.getCachedPrompts().count, 1)
        CacheManager.shared.clearPrompts()
        XCTAssertTrue(CacheManager.shared.getCachedPrompts().isEmpty)
    }

    func testCacheStaleness() {
        CacheManager.shared.clearAllCache()
        XCTAssertTrue(CacheManager.shared.isCacheStale())
        CacheManager.shared.updateLastSyncDate()
        XCTAssertFalse(CacheManager.shared.isCacheStale(maxAgeSeconds: 3600))
    }
}
