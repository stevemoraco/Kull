//
//  CacheManagerTests.swift
//  kullTests
//
//  Created by Agent H on 11/18/25.
//  Tests for CacheManager offline caching functionality
//

import XCTest
@testable import kull

final class CacheManagerTests: XCTestCase {
    var cacheManager: CacheManager!

    override func setUp() {
        super.setUp()
        cacheManager = CacheManager.shared
        // Clear cache before each test
        cacheManager.clearAllCache()
    }

    override func tearDown() {
        cacheManager.clearAllCache()
        super.tearDown()
    }

    // MARK: - User Profile Tests

    func testCacheUserProfile() {
        // Given
        let user = RemoteUser(
            id: "user123",
            email: "test@example.com",
            firstName: "Test",
            lastName: "User",
            profileImageUrl: "https://example.com/avatar.jpg"
        )

        // When
        cacheManager.cacheUserProfile(user)

        // Then
        let cached = cacheManager.getCachedUserProfile()
        XCTAssertNotNil(cached)
        XCTAssertEqual(cached?.id, user.id)
        XCTAssertEqual(cached?.email, user.email)
        XCTAssertEqual(cached?.firstName, user.firstName)
        XCTAssertEqual(cached?.lastName, user.lastName)
    }

    func testClearUserProfile() {
        // Given
        let user = RemoteUser(id: "user123", email: "test@example.com", firstName: nil, lastName: nil, profileImageUrl: nil)
        cacheManager.cacheUserProfile(user)

        // When
        cacheManager.clearUserProfile()

        // Then
        XCTAssertNil(cacheManager.getCachedUserProfile())
    }

    // MARK: - Credit Balance Tests

    func testCacheCreditBalance() {
        // Given
        let balance = 50000

        // When
        cacheManager.cacheCreditBalance(balance)

        // Then
        let cached = cacheManager.getCachedCreditBalance()
        XCTAssertNotNil(cached)
        XCTAssertEqual(cached, balance)
    }

    func testClearCreditBalance() {
        // Given
        cacheManager.cacheCreditBalance(10000)

        // When
        cacheManager.clearCreditBalance()

        // Then
        XCTAssertNil(cacheManager.getCachedCreditBalance())
    }

    // MARK: - Credit Summary Tests

    func testCacheCreditSummary() {
        // Given
        let summary = CreditSummary(
            balance: 50000,
            planDisplayName: "Pro Plan",
            estimatedShootsRemaining: 10.5
        )

        // When
        cacheManager.cacheCreditSummary(summary)

        // Then
        let cached = cacheManager.getCachedCreditSummary()
        XCTAssertNotNil(cached)
        XCTAssertEqual(cached?.balance, summary.balance)
        XCTAssertEqual(cached?.planDisplayName, summary.planDisplayName)
        XCTAssertEqual(cached?.estimatedShootsRemaining, summary.estimatedShootsRemaining)
    }

    func testClearCreditSummary() {
        // Given
        let summary = CreditSummary(balance: 10000, planDisplayName: "Basic", estimatedShootsRemaining: 5.0)
        cacheManager.cacheCreditSummary(summary)

        // When
        cacheManager.clearCreditSummary()

        // Then
        XCTAssertNil(cacheManager.getCachedCreditSummary())
    }

    // MARK: - Prompts Tests

    func testCachePrompts() {
        // Given
        let prompts = [
            createMockPrompt(id: "prompt1", title: "Wedding Photography"),
            createMockPrompt(id: "prompt2", title: "Portrait Session")
        ]

        // When
        cacheManager.cachePrompts(prompts)

        // Then
        let cached = cacheManager.getCachedPrompts()
        XCTAssertEqual(cached.count, 2)
        XCTAssertEqual(cached[0].id, "prompt1")
        XCTAssertEqual(cached[1].id, "prompt2")
    }

    func testClearPrompts() {
        // Given
        let prompts = [createMockPrompt(id: "prompt1", title: "Test")]
        cacheManager.cachePrompts(prompts)

        // When
        cacheManager.clearPrompts()

        // Then
        XCTAssertTrue(cacheManager.getCachedPrompts().isEmpty)
    }

    // MARK: - Reports Tests

    func testCacheReports() {
        // Given
        let reports = [
            createMockReport(id: "report1", shootName: "Wedding 2025"),
            createMockReport(id: "report2", shootName: "Corporate Event")
        ]

        // When
        cacheManager.cacheReports(reports)

        // Then
        let cached = cacheManager.getCachedReports()
        XCTAssertEqual(cached.count, 2)
        XCTAssertEqual(cached[0].id, "report1")
        XCTAssertEqual(cached[1].id, "report2")
    }

    func testClearReports() {
        // Given
        let reports = [createMockReport(id: "report1", shootName: "Test")]
        cacheManager.cacheReports(reports)

        // When
        cacheManager.clearReports()

        // Then
        XCTAssertTrue(cacheManager.getCachedReports().isEmpty)
    }

    // MARK: - Image Cache Tests

    func testCacheImage() {
        // Given
        let imageData = "Test Image Data".data(using: .utf8)!
        let key = "test_image_123"

        // When
        cacheManager.cacheImage(imageData, forKey: key)

        // Then
        let cached = cacheManager.getCachedImage(forKey: key)
        XCTAssertNotNil(cached)
        XCTAssertEqual(cached, imageData)
    }

    func testClearImage() {
        // Given
        let imageData = "Test Image".data(using: .utf8)!
        let key = "test_image"
        cacheManager.cacheImage(imageData, forKey: key)

        // When
        cacheManager.clearImage(forKey: key)

        // Then
        XCTAssertNil(cacheManager.getCachedImage(forKey: key))
    }

    // MARK: - Cache Metadata Tests

    func testLastSyncDate() {
        // When
        cacheManager.updateLastSyncDate()

        // Then
        let lastSync = cacheManager.getLastSyncDate()
        XCTAssertNotNil(lastSync)
        XCTAssertTrue(Date().timeIntervalSince(lastSync!) < 1.0) // Within 1 second
    }

    func testCacheStaleDetection() {
        // Given - Fresh cache
        cacheManager.updateLastSyncDate()

        // Then - Should not be stale
        XCTAssertFalse(cacheManager.isCacheStale(maxAgeSeconds: 3600))

        // Given - Old cache (simulate by clearing last sync)
        UserDefaults.standard.removeObject(forKey: "last_sync_date")

        // Then - Should be stale
        XCTAssertTrue(cacheManager.isCacheStale(maxAgeSeconds: 3600))
    }

    // MARK: - Clear All Tests

    func testClearAllCache() {
        // Given - Cache multiple items
        let user = RemoteUser(id: "user1", email: "test@example.com", firstName: nil, lastName: nil, profileImageUrl: nil)
        cacheManager.cacheUserProfile(user)
        cacheManager.cacheCreditBalance(10000)
        cacheManager.cachePrompts([createMockPrompt(id: "p1", title: "Test")])
        cacheManager.cacheImage("Image".data(using: .utf8)!, forKey: "img1")
        cacheManager.updateLastSyncDate()

        // When
        cacheManager.clearAllCache()

        // Then
        XCTAssertNil(cacheManager.getCachedUserProfile())
        XCTAssertNil(cacheManager.getCachedCreditBalance())
        XCTAssertTrue(cacheManager.getCachedPrompts().isEmpty)
        XCTAssertNil(cacheManager.getCachedImage(forKey: "img1"))
        XCTAssertNil(cacheManager.getLastSyncDate())
    }

    // MARK: - Cache Size Tests

    func testCacheSize() {
        // Given
        cacheManager.clearAllCache()

        // When - Empty cache
        let emptySize = cacheManager.getCacheSize()

        // Then
        XCTAssertEqual(emptySize, 0)

        // When - Add some data
        cacheManager.cacheCreditBalance(50000)
        let imageData = String(repeating: "x", count: 1000).data(using: .utf8)!
        cacheManager.cacheImage(imageData, forKey: "large_image")

        let nonEmptySize = cacheManager.getCacheSize()

        // Then
        XCTAssertGreaterThan(nonEmptySize, 0)
    }

    func testCacheSizeFormatted() {
        // When
        let formatted = cacheManager.getCacheSizeFormatted()

        // Then
        XCTAssertFalse(formatted.isEmpty)
        XCTAssertTrue(formatted.contains("KB") || formatted.contains("MB") || formatted.contains("bytes"))
    }

    // MARK: - Helper Methods

    private func createMockPrompt(id: String, title: String) -> PromptPresetPayload {
        return PromptPresetPayload(
            id: id,
            slug: "test-\(id)",
            title: title,
            summary: "Test summary",
            instructions: "Test instructions",
            shootTypes: ["wedding"],
            tags: ["test"],
            authorProfile: PromptPresetPayload.PhotographerProfile(
                id: "author1",
                email: "author@example.com",
                displayName: "Test Author",
                bio: "Test bio",
                avatarUrl: nil
            ),
            aiScore: 0.9,
            humanScore: 4.5,
            ratingsCount: 10,
            style: PromptStylePayload(
                starMeaning: ["1": "Reject", "5": "Hero"],
                colorMeaning: ["red": "Delete"],
                includeTitle: true,
                includeDescription: true,
                includeTags: true
            ),
            createdAt: "2025-01-01T00:00:00Z",
            updatedAt: "2025-01-01T00:00:00Z",
            sharedWithMarketplace: true
        )
    }

    private func createMockReport(id: String, shootName: String) -> ShootReportPayload {
        return ShootReportPayload(
            id: id,
            userId: "user123",
            shootName: shootName,
            heroImages: ["img1.jpg", "img2.jpg"],
            summary: "Test summary",
            totalImages: 100,
            processedAt: "2025-01-01T00:00:00Z",
            creditSpent: 500.0,
            processingTimeSeconds: 120,
            providerUsage: ["anthropic": 50, "openai": 50]
        )
    }
}
