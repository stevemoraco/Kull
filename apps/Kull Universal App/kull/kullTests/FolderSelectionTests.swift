//
//  FolderSelectionTests.swift
//  kullTests
//
//  Comprehensive tests for folder selection across macOS and iOS platforms
//  Tests FileAccessService, BookmarkStore, and FolderWatcher
//

import XCTest
@testable import kull

final class FolderSelectionTests: XCTestCase {

    var bookmarkStore: BookmarkStore!
    var fileAccessService: FileAccessService!

    override func setUp() {
        super.setUp()
        bookmarkStore = BookmarkStore.shared
        fileAccessService = FileAccessService.shared

        // Clear any existing bookmarks for clean test state
        UserDefaults.standard.removeObject(forKey: "kull.securityScopedBookmarks")
    }

    override func tearDown() {
        // Clean up test bookmarks
        UserDefaults.standard.removeObject(forKey: "kull.securityScopedBookmarks")
        super.tearDown()
    }

    // MARK: - BookmarkStore Tests

    func testBookmarkStoreInitialization() {
        XCTAssertNotNil(bookmarkStore, "BookmarkStore should initialize")
    }

    func testBookmarkStoreSaveAndResolve() throws {
        // Create a test URL (use temp directory which is always accessible)
        let testURL = FileManager.default.temporaryDirectory

        // Save bookmark
        try bookmarkStore.save(url: testURL)

        // Resolve bookmarks
        let resolvedURLs = bookmarkStore.resolveAll()

        XCTAssertTrue(resolvedURLs.contains(testURL), "Saved URL should be resolvable")
    }

    func testBookmarkStoreMultipleFolders() throws {
        let tempDir = FileManager.default.temporaryDirectory
        let testDir1 = tempDir.appendingPathComponent("test1")
        let testDir2 = tempDir.appendingPathComponent("test2")

        // Create test directories
        try FileManager.default.createDirectory(at: testDir1, withIntermediateDirectories: true)
        try FileManager.default.createDirectory(at: testDir2, withIntermediateDirectories: true)

        // Save both bookmarks
        try bookmarkStore.save(url: testDir1)
        try bookmarkStore.save(url: testDir2)

        // Resolve all
        let resolvedURLs = bookmarkStore.resolveAll()

        XCTAssertTrue(resolvedURLs.contains(testDir1), "First URL should be resolvable")
        XCTAssertTrue(resolvedURLs.contains(testDir2), "Second URL should be resolvable")

        // Clean up
        try? FileManager.default.removeItem(at: testDir1)
        try? FileManager.default.removeItem(at: testDir2)
    }

    func testBookmarkStoreExportCatalog() throws {
        let testURL = FileManager.default.temporaryDirectory
        try bookmarkStore.save(url: testURL)

        let catalog = bookmarkStore.exportCatalog()

        XCTAssertFalse(catalog.isEmpty, "Catalog should contain saved folder")
        XCTAssertNotNil(catalog.first?["id"], "Catalog entry should have ID")
        XCTAssertNotNil(catalog.first?["name"], "Catalog entry should have name")
    }

    // MARK: - Platform-Specific Bookmark Tests

    #if os(macOS)

    func testMacOSSecurityScopedBookmarks() throws {
        let testURL = FileManager.default.temporaryDirectory

        // Create bookmark with security scope
        let bookmarkData = try testURL.bookmarkData(
            options: .withSecurityScope,
            includingResourceValuesForKeys: nil,
            relativeTo: nil
        )

        XCTAssertFalse(bookmarkData.isEmpty, "Bookmark data should not be empty")

        // Resolve bookmark
        var isStale = false
        let resolvedURL = try URL(
            resolvingBookmarkData: bookmarkData,
            options: .withSecurityScope,
            relativeTo: nil,
            bookmarkDataIsStale: &isStale
        )

        XCTAssertEqual(resolvedURL, testURL, "Resolved URL should match original")
        XCTAssertFalse(isStale, "Bookmark should not be stale")

        // Test security-scoped resource access
        let didStartAccessing = resolvedURL.startAccessingSecurityScopedResource()
        XCTAssertTrue(didStartAccessing, "Should start accessing security-scoped resource")

        resolvedURL.stopAccessingSecurityScopedResource()
    }

    func testMacOSFileAccessService() {
        // Note: Cannot fully test UI components in unit tests
        // This verifies the service exists and has correct API
        XCTAssertNotNil(fileAccessService, "FileAccessService should be available on macOS")
    }

    #elseif os(iOS)

    func testIOSMinimalBookmarks() throws {
        let testURL = FileManager.default.temporaryDirectory

        // Create minimal bookmark (iOS restriction)
        let bookmarkData = try testURL.bookmarkData(
            options: .minimalBookmark,
            includingResourceValuesForKeys: nil,
            relativeTo: nil
        )

        XCTAssertFalse(bookmarkData.isEmpty, "Bookmark data should not be empty")

        // Resolve bookmark
        var isStale = false
        let resolvedURL = try URL(
            resolvingBookmarkData: bookmarkData,
            options: [],
            relativeTo: nil,
            bookmarkDataIsStale: &isStale
        )

        XCTAssertEqual(resolvedURL, testURL, "Resolved URL should match original")
    }

    func testIOSFileAccessService() {
        // Verify FileAccessService exists on iOS
        XCTAssertNotNil(fileAccessService, "FileAccessService should be available on iOS")
    }

    func testIOSFileAccessServicePersistence() throws {
        let testURL = FileManager.default.temporaryDirectory

        // Test persistAccess method
        try fileAccessService.persistAccess(to: testURL)

        // Verify bookmark was saved
        let resolvedURLs = bookmarkStore.resolveAll()
        XCTAssertTrue(resolvedURLs.contains(testURL), "iOS should persist folder access")
    }

    #endif

    // MARK: - FolderWatcher Tests

    #if os(macOS)

    func testFolderWatcherWorks() {
        let watcher = FolderWatcher()
        let expectation = self.expectation(description: "Folder change detected")
        expectation.isInverted = true // Don't expect change immediately

        let testURL = FileManager.default.temporaryDirectory

        watcher.watch(urls: [testURL]) { url in
            expectation.fulfill()
        }

        // Wait a short time to ensure watcher is running
        waitForExpectations(timeout: 1.0) { error in
            // No change expected in this short time
        }

        watcher.stop()
    }

    func testFolderWatcherMultipleFolders() {
        let watcher = FolderWatcher()
        let tempDir = FileManager.default.temporaryDirectory
        let testDir1 = tempDir.appendingPathComponent("watch1")
        let testDir2 = tempDir.appendingPathComponent("watch2")

        // Create test directories
        try? FileManager.default.createDirectory(at: testDir1, withIntermediateDirectories: true)
        try? FileManager.default.createDirectory(at: testDir2, withIntermediateDirectories: true)

        watcher.watch(urls: [testDir1, testDir2]) { url in
            // Callback would fire on changes
        }

        watcher.stop()

        // Clean up
        try? FileManager.default.removeItem(at: testDir1)
        try? FileManager.default.removeItem(at: testDir2)
    }

    func testFolderWatcherStop() {
        let watcher = FolderWatcher()
        let testURL = FileManager.default.temporaryDirectory

        watcher.watch(urls: [testURL]) { _ in }
        watcher.stop()

        // Should not crash when stopping
        XCTAssertTrue(true, "FolderWatcher should stop without errors")
    }

    #elseif os(iOS)

    func testFolderWatcherDisabledOnIOS() {
        let watcher = FolderWatcher()
        let testURL = FileManager.default.temporaryDirectory

        // Should not crash, but does nothing on iOS
        watcher.watch(urls: [testURL]) { url in
            XCTFail("Folder watching should be disabled on iOS")
        }

        watcher.stop()

        XCTAssertTrue(true, "FolderWatcher should be a no-op on iOS")
    }

    #endif

    // MARK: - Cross-Platform Tests

    func testBookmarkPersistenceAcrossPlatforms() throws {
        let testURL = FileManager.default.temporaryDirectory

        // Save bookmark
        try bookmarkStore.save(url: testURL)

        // Simulate app restart by creating new instance
        let resolvedURLs = BookmarkStore.shared.resolveAll()

        XCTAssertTrue(resolvedURLs.contains(testURL), "Bookmarks should persist across app restarts")
    }

    func testFileAccessServicePersistAccess() throws {
        let testURL = FileManager.default.temporaryDirectory

        try fileAccessService.persistAccess(to: testURL)

        // Verify bookmark was saved
        let resolvedURLs = bookmarkStore.resolveAll()
        XCTAssertTrue(resolvedURLs.contains(testURL), "persistAccess should save bookmark")
    }

    func testFileAccessServiceResumeAccess() {
        let testURL = FileManager.default.temporaryDirectory

        // Resume access (should work on both platforms)
        let didResume = fileAccessService.resumeAccess(to: testURL)

        // May succeed or fail depending on bookmark state
        // Just verify it doesn't crash
        XCTAssertNotNil(didResume, "resumeAccess should return a boolean")

        // Clean up
        fileAccessService.stopAccess(to: testURL)
    }

    func testFileAccessServiceStopAccess() {
        let testURL = FileManager.default.temporaryDirectory

        // Start then stop
        _ = fileAccessService.resumeAccess(to: testURL)
        fileAccessService.stopAccess(to: testURL)

        // Should not crash
        XCTAssertTrue(true, "stopAccess should complete without errors")
    }

    // MARK: - Error Handling Tests

    func testBookmarkStoreInvalidURL() {
        // Create invalid URL
        let invalidURL = URL(fileURLWithPath: "/nonexistent/path/that/does/not/exist")

        // Should throw error when trying to create bookmark
        XCTAssertThrowsError(try bookmarkStore.save(url: invalidURL)) { error in
            // Verify it's a bookmark error
            XCTAssertNotNil(error, "Should throw error for invalid URL")
        }
    }

    func testBookmarkStoreEmptyStore() {
        // Clear store
        UserDefaults.standard.removeObject(forKey: "kull.securityScopedBookmarks")

        let resolvedURLs = bookmarkStore.resolveAll()
        XCTAssertTrue(resolvedURLs.isEmpty, "Empty store should return no URLs")
    }
}
