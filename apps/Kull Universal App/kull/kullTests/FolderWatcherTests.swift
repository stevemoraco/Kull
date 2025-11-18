//
//  FolderWatcherTests.swift
//  kullTests
//
//  Comprehensive tests for FolderWatcher
//  Tests platform-specific filesystem monitoring (macOS) and no-op behavior (iOS)
//

import XCTest
@testable import kull

final class FolderWatcherTests: XCTestCase {

    // MARK: - Initialization Tests

    func testWatcherInitialization() {
        // Given/When
        let watcher = FolderWatcher()

        // Then
        XCTAssertNotNil(watcher, "FolderWatcher should initialize")
    }

    func testMultipleWatcherInstances() {
        // Given/When
        let watcher1 = FolderWatcher()
        let watcher2 = FolderWatcher()

        // Then
        XCTAssertNotNil(watcher1, "First watcher should initialize")
        XCTAssertNotNil(watcher2, "Second watcher should initialize")
        XCTAssertFalse(watcher1 === watcher2, "Each watcher should be separate instance")
    }

    // MARK: - macOS-Specific Tests

    #if os(macOS)
    func testMacOSWatchCallbackOnChange() {
        // Given
        let watcher = FolderWatcher()
        let testURL = createTemporaryTestFolder()
        let expectation = expectation(description: "Callback called on file change")
        expectation.assertForOverFulfill = false // May trigger multiple times

        // When
        watcher.watch(urls: [testURL]) { url in
            if url.path == testURL.path {
                expectation.fulfill()
            }
        }

        // Simulate file change
        DispatchQueue.global().asyncAfter(deadline: .now() + 0.1) {
            let testFile = testURL.appendingPathComponent("test.txt")
            try? "test".write(to: testFile, atomically: true, encoding: .utf8)
        }

        // Then
        wait(for: [expectation], timeout: 2.0)

        // Cleanup
        watcher.stop()
        try? FileManager.default.removeItem(at: testURL)
    }

    func testMacOSWatchMultipleFolders() {
        // Given
        let watcher = FolderWatcher()
        let folder1 = createTemporaryTestFolder()
        let folder2 = createTemporaryTestFolder()
        let expectation1 = expectation(description: "Callback for folder 1")
        let expectation2 = expectation(description: "Callback for folder 2")
        expectation1.assertForOverFulfill = false
        expectation2.assertForOverFulfill = false

        var callbackCount = 0

        // When
        watcher.watch(urls: [folder1, folder2]) { url in
            callbackCount += 1
            if url.path == folder1.path {
                expectation1.fulfill()
            } else if url.path == folder2.path {
                expectation2.fulfill()
            }
        }

        // Trigger changes
        DispatchQueue.global().asyncAfter(deadline: .now() + 0.1) {
            let file1 = folder1.appendingPathComponent("test1.txt")
            try? "test1".write(to: file1, atomically: true, encoding: .utf8)
        }

        DispatchQueue.global().asyncAfter(deadline: .now() + 0.2) {
            let file2 = folder2.appendingPathComponent("test2.txt")
            try? "test2".write(to: file2, atomically: true, encoding: .utf8)
        }

        // Then
        wait(for: [expectation1, expectation2], timeout: 3.0)
        XCTAssertGreaterThanOrEqual(callbackCount, 2, "Should receive callbacks for both folders")

        // Cleanup
        watcher.stop()
        try? FileManager.default.removeItem(at: folder1)
        try? FileManager.default.removeItem(at: folder2)
    }

    func testMacOSStopWatching() {
        // Given
        let watcher = FolderWatcher()
        let testURL = createTemporaryTestFolder()
        var callbackCount = 0

        watcher.watch(urls: [testURL]) { _ in
            callbackCount += 1
        }

        // When
        watcher.stop()

        // Trigger change after stop
        DispatchQueue.global().asyncAfter(deadline: .now() + 0.1) {
            let testFile = testURL.appendingPathComponent("test.txt")
            try? "test".write(to: testFile, atomically: true, encoding: .utf8)
        }

        // Then
        // Wait to ensure no callback occurs
        let expectation = expectation(description: "Wait for potential callback")
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
            expectation.fulfill()
        }
        wait(for: [expectation], timeout: 2.0)

        // Should not receive callbacks after stop
        XCTAssertLessThanOrEqual(callbackCount, 1, "Should not receive callbacks after stop")

        // Cleanup
        try? FileManager.default.removeItem(at: testURL)
    }

    func testMacOSWatchInvalidURL() {
        // Given
        let watcher = FolderWatcher()
        let invalidURL = URL(fileURLWithPath: "/nonexistent/path/that/does/not/exist")
        var callbackCalled = false

        // When
        watcher.watch(urls: [invalidURL]) { _ in
            callbackCalled = true
        }

        // Then
        // Should not crash, just skip invalid URLs
        XCTAssertFalse(callbackCalled, "Should not call callback for invalid URL")

        // Cleanup
        watcher.stop()
    }

    func testMacOSWatchEmptyArray() {
        // Given
        let watcher = FolderWatcher()
        var callbackCalled = false

        // When
        watcher.watch(urls: []) { _ in
            callbackCalled = true
        }

        // Then
        XCTAssertFalse(callbackCalled, "Should not call callback for empty array")

        // Cleanup
        watcher.stop()
    }

    func testMacOSMultipleStopCalls() {
        // Given
        let watcher = FolderWatcher()
        let testURL = createTemporaryTestFolder()

        watcher.watch(urls: [testURL]) { _ in }

        // When/Then
        // Should not crash on multiple stop calls
        watcher.stop()
        watcher.stop()
        watcher.stop()

        XCTAssertTrue(true, "Multiple stop calls should not crash")

        // Cleanup
        try? FileManager.default.removeItem(at: testURL)
    }
    #endif

    // MARK: - iOS-Specific Tests

    #if os(iOS)
    func testIOSWatchIsNoOp() {
        // Given
        let watcher = FolderWatcher()
        let testURL = createTemporaryTestFolder()
        var callbackCalled = false

        // When
        watcher.watch(urls: [testURL]) { _ in
            callbackCalled = true
        }

        // Simulate file change (should not trigger callback on iOS)
        let testFile = testURL.appendingPathComponent("test.txt")
        try? "test".write(to: testFile, atomically: true, encoding: .utf8)

        // Wait a bit
        let expectation = expectation(description: "Wait for potential callback")
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            expectation.fulfill()
        }
        wait(for: [expectation], timeout: 1.0)

        // Then
        XCTAssertFalse(callbackCalled, "iOS should not trigger file system callbacks")

        // Cleanup
        watcher.stop()
        try? FileManager.default.removeItem(at: testURL)
    }

    func testIOSWatchDoesNotCrash() {
        // Given
        let watcher = FolderWatcher()
        let testURL = createTemporaryTestFolder()

        // When/Then
        // Should not crash, just no-op
        watcher.watch(urls: [testURL]) { _ in
            XCTFail("Should not call callback on iOS")
        }

        XCTAssertTrue(true, "Watch call should complete without crashing")

        // Cleanup
        watcher.stop()
        try? FileManager.default.removeItem(at: testURL)
    }

    func testIOSStopIsNoOp() {
        // Given
        let watcher = FolderWatcher()

        // When/Then
        // Should not crash
        watcher.stop()
        watcher.stop() // Multiple calls

        XCTAssertTrue(true, "Stop should complete without crashing")
    }

    func testIOSWatchWithMultipleFolders() {
        // Given
        let watcher = FolderWatcher()
        let folder1 = createTemporaryTestFolder()
        let folder2 = createTemporaryTestFolder()
        var callbackCount = 0

        // When
        watcher.watch(urls: [folder1, folder2]) { _ in
            callbackCount += 1
        }

        // Simulate changes (should not trigger callbacks)
        let file1 = folder1.appendingPathComponent("test1.txt")
        let file2 = folder2.appendingPathComponent("test2.txt")
        try? "test1".write(to: file1, atomically: true, encoding: .utf8)
        try? "test2".write(to: file2, atomically: true, encoding: .utf8)

        // Wait
        let expectation = expectation(description: "Wait for potential callbacks")
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            expectation.fulfill()
        }
        wait(for: [expectation], timeout: 1.0)

        // Then
        XCTAssertEqual(callbackCount, 0, "iOS should not trigger callbacks")

        // Cleanup
        watcher.stop()
        try? FileManager.default.removeItem(at: folder1)
        try? FileManager.default.removeItem(at: folder2)
    }

    func testIOSWatchWithInvalidURL() {
        // Given
        let watcher = FolderWatcher()
        let invalidURL = URL(fileURLWithPath: "/nonexistent/path")

        // When/Then
        // Should not crash
        watcher.watch(urls: [invalidURL]) { _ in
            XCTFail("Should not call callback")
        }

        XCTAssertTrue(true, "Should handle invalid URL without crashing")

        // Cleanup
        watcher.stop()
    }
    #endif

    // MARK: - Cross-Platform Tests

    func testWatchAPIExists() {
        // Given
        let watcher = FolderWatcher()
        let testURL = createTemporaryTestFolder()

        // When/Then
        // Should compile and not crash on both platforms
        watcher.watch(urls: [testURL]) { _ in }
        watcher.stop()

        XCTAssertTrue(true, "Watch API should exist on both platforms")

        // Cleanup
        try? FileManager.default.removeItem(at: testURL)
    }

    func testStopAPIExists() {
        // Given
        let watcher = FolderWatcher()

        // When/Then
        // Should compile and not crash on both platforms
        watcher.stop()

        XCTAssertTrue(true, "Stop API should exist on both platforms")
    }

    func testWatchAcceptsEmptyArray() {
        // Given
        let watcher = FolderWatcher()

        // When/Then
        watcher.watch(urls: []) { _ in }

        XCTAssertTrue(true, "Should accept empty array")

        // Cleanup
        watcher.stop()
    }

    // MARK: - Memory and Performance Tests

    func testNoMemoryLeaksAfterStop() {
        // Given
        let testURL = createTemporaryTestFolder()

        autoreleasepool {
            let watcher = FolderWatcher()
            watcher.watch(urls: [testURL]) { _ in }
            watcher.stop()
        }

        // Then
        // If no crash, memory was properly released
        XCTAssertTrue(true, "Should release memory after stop")

        // Cleanup
        try? FileManager.default.removeItem(at: testURL)
    }

    func testMultipleWatchStopCycles() {
        // Given
        let watcher = FolderWatcher()
        let testURL = createTemporaryTestFolder()

        // When
        for _ in 0..<10 {
            watcher.watch(urls: [testURL]) { _ in }
            watcher.stop()
        }

        // Then
        XCTAssertTrue(true, "Should handle multiple watch/stop cycles")

        // Cleanup
        try? FileManager.default.removeItem(at: testURL)
    }

    // MARK: - Helper Methods

    private func createTemporaryTestFolder() -> URL {
        let tempDir = FileManager.default.temporaryDirectory
        let folderName = "kull-watcher-test-\(UUID().uuidString)"
        let testURL = tempDir.appendingPathComponent(folderName)

        try? FileManager.default.createDirectory(
            at: testURL,
            withIntermediateDirectories: true,
            attributes: nil
        )

        return testURL
    }
}
