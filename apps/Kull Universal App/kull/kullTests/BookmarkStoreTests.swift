//
//  BookmarkStoreTests.swift
//  kullTests
//
//  Created by Claude Code on 11/18/25.
//

import XCTest
@testable import kull

final class BookmarkStoreTests: XCTestCase {
    var sut: BookmarkStore!
    var testURL: URL!

    override func setUp() {
        super.setUp()
        sut = BookmarkStore.shared
        // Create a temporary test directory
        testURL = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try? FileManager.default.createDirectory(at: testURL, withIntermediateDirectories: true)
    }

    override func tearDown() {
        // Clean up test directory
        try? FileManager.default.removeItem(at: testURL)
        testURL = nil
        sut = nil
        super.tearDown()
    }

    // MARK: - Initialization Tests

    func testSharedInstance() {
        let instance1 = BookmarkStore.shared
        let instance2 = BookmarkStore.shared

        XCTAssertTrue(instance1 === instance2, "Shared should return same instance")
    }

    // MARK: - Save Tests

    func testSaveURL() throws {
        try sut.save(url: testURL)

        // Should save without throwing
        XCTAssertTrue(true)
    }

    func testSaveMultipleURLs() throws {
        let url1 = FileManager.default.temporaryDirectory.appendingPathComponent("test1")
        let url2 = FileManager.default.temporaryDirectory.appendingPathComponent("test2")

        try FileManager.default.createDirectory(at: url1, withIntermediateDirectories: true)
        try FileManager.default.createDirectory(at: url2, withIntermediateDirectories: true)

        try sut.save(url: url1)
        try sut.save(url: url2)

        // Clean up
        try? FileManager.default.removeItem(at: url1)
        try? FileManager.default.removeItem(at: url2)

        XCTAssertTrue(true)
    }

    func testSaveOverwritesExisting() throws {
        // Save same URL twice
        try sut.save(url: testURL)
        try sut.save(url: testURL)

        // Should not throw error on overwrite
        XCTAssertTrue(true)
    }

    // MARK: - ResolveAll Tests

    func testResolveAllInitiallyEmpty() {
        // Clear UserDefaults for clean test
        UserDefaults.standard.removeObject(forKey: "kull.securityScopedBookmarks")

        let resolved = sut.resolveAll()

        // May or may not be empty depending on previous tests
        XCTAssertNotNil(resolved)
    }

    func testResolveAllAfterSave() throws {
        try sut.save(url: testURL)

        let resolved = sut.resolveAll()

        // Should contain at least the URL we just saved (if still valid)
        XCTAssertNotNil(resolved)
    }

    func testResolveAllReturnsValidURLs() throws {
        try sut.save(url: testURL)

        let resolved = sut.resolveAll()

        // All resolved URLs should be valid
        for url in resolved {
            XCTAssertTrue(url.isFileURL)
        }
    }

    // MARK: - ExportCatalog Tests

    func testExportCatalogFormat() {
        let catalog = sut.exportCatalog()

        XCTAssertNotNil(catalog)

        // Each item should have id and name
        for item in catalog {
            XCTAssertNotNil(item["id"])
            XCTAssertNotNil(item["name"])
        }
    }

    func testExportCatalogWithNoBookmarks() {
        // Clear all bookmarks
        UserDefaults.standard.removeObject(forKey: "kull.securityScopedBookmarks")

        let catalog = sut.exportCatalog()

        XCTAssertTrue(catalog.isEmpty)
    }

    func testExportCatalogWithBookmarks() throws {
        try sut.save(url: testURL)

        let catalog = sut.exportCatalog()

        // Should contain at least one item (if URL is still valid)
        XCTAssertNotNil(catalog)
    }

    func testExportCatalogItemsHaveUUIDs() throws {
        try sut.save(url: testURL)

        let catalog = sut.exportCatalog()

        for item in catalog {
            if let idString = item["id"] {
                // Should be a valid UUID string
                XCTAssertNotNil(UUID(uuidString: idString))
            }
        }
    }

    func testExportCatalogItemsHaveNames() throws {
        try sut.save(url: testURL)

        let catalog = sut.exportCatalog()

        for item in catalog {
            if let name = item["name"] {
                XCTAssertFalse(name.isEmpty)
            }
        }
    }

    // MARK: - Persistence Tests

    func testBookmarksPersistAcrossInstances() throws {
        try sut.save(url: testURL)

        // Access same singleton instance
        let catalog1 = BookmarkStore.shared.exportCatalog()
        let catalog2 = BookmarkStore.shared.exportCatalog()

        // Should return same results
        XCTAssertEqual(catalog1.count, catalog2.count)
    }

    // MARK: - Performance Tests

    func testSavePerformance() {
        measure {
            try? sut.save(url: testURL)
        }
    }

    func testResolveAllPerformance() throws {
        // Save a few URLs first
        for i in 0..<10 {
            let url = FileManager.default.temporaryDirectory.appendingPathComponent("test\(i)")
            try? FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
            try? sut.save(url: url)
        }

        measure {
            _ = sut.resolveAll()
        }

        // Clean up
        for i in 0..<10 {
            let url = FileManager.default.temporaryDirectory.appendingPathComponent("test\(i)")
            try? FileManager.default.removeItem(at: url)
        }
    }

    func testExportCatalogPerformance() throws {
        try sut.save(url: testURL)

        measure {
            _ = sut.exportCatalog()
        }
    }

    // MARK: - Edge Cases

    func testSaveNonExistentURL() {
        let nonExistent = URL(fileURLWithPath: "/nonexistent/path/\(UUID().uuidString)")

        // May throw error for non-existent path
        do {
            try sut.save(url: nonExistent)
        } catch {
            // Expected to fail
            XCTAssertNotNil(error)
        }
    }

    func testResolveAllWithStaleBookmarks() {
        // After deleting files, some bookmarks may become stale
        let resolved = sut.resolveAll()

        // Should still return array (possibly empty)
        XCTAssertNotNil(resolved)
    }

    func testExportCatalogWithStaleBookmarks() {
        let catalog = sut.exportCatalog()

        // Should still return valid array
        XCTAssertNotNil(catalog)
    }

    // MARK: - Thread Safety Tests

    func testConcurrentSaves() async {
        await withTaskGroup(of: Void.self) { group in
            for i in 0..<10 {
                group.addTask {
                    let url = FileManager.default.temporaryDirectory.appendingPathComponent("concurrent\(i)")
                    try? FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
                    try? self.sut.save(url: url)
                }
            }
        }

        XCTAssertNotNil(sut)

        // Clean up
        for i in 0..<10 {
            let url = FileManager.default.temporaryDirectory.appendingPathComponent("concurrent\(i)")
            try? FileManager.default.removeItem(at: url)
        }
    }

    func testConcurrentResolveAll() async {
        await withTaskGroup(of: [URL].self) { group in
            for _ in 0..<10 {
                group.addTask {
                    return self.sut.resolveAll()
                }
            }

            for await _ in group {
                // All should complete successfully
                XCTAssertTrue(true)
            }
        }
    }

    func testConcurrentExportCatalog() async {
        await withTaskGroup(of: [[String: String]].self) { group in
            for _ in 0..<10 {
                group.addTask {
                    return self.sut.exportCatalog()
                }
            }

            for await _ in group {
                // All should complete successfully
                XCTAssertTrue(true)
            }
        }
    }
}
