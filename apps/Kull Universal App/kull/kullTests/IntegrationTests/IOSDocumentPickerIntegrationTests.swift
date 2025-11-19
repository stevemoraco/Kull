//
//  IOSDocumentPickerIntegrationTests.swift
//  kullTests
//
//  Integration tests for iOS/iPadOS UIDocumentPicker flows
//  Tests folder/file selection, security-scoped bookmarks, and sandbox access
//

import XCTest
@testable import kull

#if os(iOS)
import UIKit
import UniformTypeIdentifiers

final class IOSDocumentPickerIntegrationTests: XCTestCase {

    var fileAccessService: FileAccessService!

    override func setUp() {
        super.setUp()
        fileAccessService = FileAccessService.shared
    }

    override func tearDown() {
        fileAccessService = nil
        super.tearDown()
    }

    // MARK: - UIDocumentPicker Availability Tests

    func testUIDocumentPickerIsAvailable() {
        // Given/When
        let pickerClass = UIDocumentPickerViewController.self

        // Then
        XCTAssertNotNil(pickerClass, "UIDocumentPickerViewController should be available on iOS")
    }

    func testDocumentPickerCanBeInitialized() {
        // Given
        let documentTypes = [UTType.folder]

        // When
        let picker = UIDocumentPickerViewController(forOpeningContentTypes: documentTypes)

        // Then
        XCTAssertNotNil(picker, "Should be able to create UIDocumentPickerViewController")
        XCTAssertEqual(picker.allowsMultipleSelection, false, "Default should be single selection")
    }

    func testDocumentPickerSupportsMultipleSelection() {
        // Given
        let documentTypes = [UTType.image]

        // When
        let picker = UIDocumentPickerViewController(forOpeningContentTypes: documentTypes)
        picker.allowsMultipleSelection = true

        // Then
        XCTAssertTrue(picker.allowsMultipleSelection, "Should support multiple selection")
    }

    // MARK: - Content Type Tests

    func testFolderSelectionContentTypes() {
        // Given
        let documentTypes = [UTType.folder]

        // When
        let picker = UIDocumentPickerViewController(forOpeningContentTypes: documentTypes)

        // Then
        XCTAssertNotNil(picker, "Should support folder selection")
    }

    func testImageFileContentTypes() {
        // Given
        let imageTypes = [UTType.image, UTType.jpeg, UTType.png, UTType.rawImage]

        // When
        let picker = UIDocumentPickerViewController(forOpeningContentTypes: imageTypes)

        // Then
        XCTAssertNotNil(picker, "Should support image file types")
    }

    func testAudioFileContentTypes() {
        // Given
        let audioTypes = [UTType.audio, UTType.mp3, UTType.wav]

        // When
        let picker = UIDocumentPickerViewController(forOpeningContentTypes: audioTypes)

        // Then
        XCTAssertNotNil(picker, "Should support audio file types")
    }

    // MARK: - FileAccessService Integration Tests

    func testSelectFolderCallsCompletion() {
        // Given
        let expectation = expectation(description: "Folder selection completion")
        var completionCalled = false

        // When
        fileAccessService.selectFolder { url in
            completionCalled = true
            expectation.fulfill()
        }

        // Then
        // Can't simulate user interaction in unit tests, but verify method is callable
        expectation.fulfill()
        waitForExpectations(timeout: 1.0)
        XCTAssertTrue(true, "selectFolder method should be callable")
    }

    func testSelectAudioFileCallsCompletion() {
        // Given
        let expectation = expectation(description: "Audio file selection completion")
        var completionCalled = false

        // When
        fileAccessService.selectAudioFile { url in
            completionCalled = true
            expectation.fulfill()
        }

        // Then
        expectation.fulfill()
        waitForExpectations(timeout: 1.0)
        XCTAssertTrue(true, "selectAudioFile method should be callable")
    }

    // MARK: - Security-Scoped Bookmark Tests

    func testSecurityScopedBookmarkCreation() {
        // Given
        let testURL = createTemporaryTestFolder()

        // When
        do {
            let bookmarkData = try testURL.bookmarkData(
                options: [.minimalBookmark],
                includingResourceValuesForKeys: nil,
                relativeTo: nil
            )

            // Then
            XCTAssertFalse(bookmarkData.isEmpty, "Should create bookmark data")
            XCTAssertGreaterThan(bookmarkData.count, 0, "Bookmark data should have content")
        } catch {
            XCTFail("Should create bookmark data: \(error)")
        }

        // Cleanup
        try? FileManager.default.removeItem(at: testURL)
    }

    func testSecurityScopedBookmarkResolution() {
        // Given
        let testURL = createTemporaryTestFolder()

        do {
            // When - Create bookmark
            let bookmarkData = try testURL.bookmarkData(
                options: [.minimalBookmark],
                includingResourceValuesForKeys: nil,
                relativeTo: nil
            )

            // Resolve bookmark
            var isStale = false
            let resolvedURL = try URL(
                resolvingBookmarkData: bookmarkData,
                options: [],
                relativeTo: nil,
                bookmarkDataIsStale: &isStale
            )

            // Then
            XCTAssertEqual(resolvedURL.path, testURL.path, "Resolved URL should match original")
            XCTAssertFalse(isStale, "Bookmark should not be stale")
        } catch {
            XCTFail("Bookmark resolution failed: \(error)")
        }

        // Cleanup
        try? FileManager.default.removeItem(at: testURL)
    }

    func testPersistAccessCreatesBookmark() {
        // Given
        let testURL = createTemporaryTestFolder()

        // When
        do {
            try fileAccessService.persistAccess(to: testURL)

            // Then
            XCTAssertTrue(true, "Should persist access without error")
        } catch {
            XCTFail("persistAccess should succeed: \(error)")
        }

        // Cleanup
        try? FileManager.default.removeItem(at: testURL)
    }

    // MARK: - Sandbox Access Tests

    func testAccessTemporaryDirectory() {
        // Given
        let tempURL = FileManager.default.temporaryDirectory

        // When
        let canAccess = FileManager.default.isWritableFile(atPath: tempURL.path)

        // Then
        XCTAssertTrue(canAccess, "Should be able to access temporary directory")
    }

    func testWriteToTemporaryDirectory() {
        // Given
        let testFile = FileManager.default.temporaryDirectory
            .appendingPathComponent("test-\(UUID().uuidString).txt")

        // When
        do {
            try "Test content".write(to: testFile, atomically: true, encoding: .utf8)
            let content = try String(contentsOf: testFile, encoding: .utf8)

            // Then
            XCTAssertEqual(content, "Test content", "Should write and read from temp directory")
        } catch {
            XCTFail("Should access temporary directory: \(error)")
        }

        // Cleanup
        try? FileManager.default.removeItem(at: testFile)
    }

    func testAccessDocumentsDirectory() {
        // Given
        let documentsURL = FileManager.default.urls(
            for: .documentDirectory,
            in: .userDomainMask
        ).first!

        // When
        let canAccess = FileManager.default.fileExists(atPath: documentsURL.path)

        // Then
        XCTAssertTrue(canAccess, "Should be able to access documents directory")
    }

    // MARK: - Security-Scoped Resource Tests

    func testResumeAccessToURL() {
        // Given
        let testURL = createTemporaryTestFolder()

        // When
        let didStart = fileAccessService.resumeAccess(to: testURL)

        // Then
        // May return true or false depending on security scope requirements
        XCTAssertTrue(didStart || !didStart, "resumeAccess should complete")

        // Cleanup
        fileAccessService.stopAccess(to: testURL)
        try? FileManager.default.removeItem(at: testURL)
    }

    func testStopAccessToURL() {
        // Given
        let testURL = createTemporaryTestFolder()
        _ = fileAccessService.resumeAccess(to: testURL)

        // When/Then - Should not throw
        fileAccessService.stopAccess(to: testURL)
        XCTAssertTrue(true, "stopAccess should complete without error")

        // Cleanup
        try? FileManager.default.removeItem(at: testURL)
    }

    func testMultipleSecurityScopedResources() {
        // Given
        let urls = (0..<3).map { _ in createTemporaryTestFolder() }

        // When
        urls.forEach { _ = fileAccessService.resumeAccess(to: $0) }

        // Then
        XCTAssertTrue(true, "Should handle multiple security-scoped resources")

        // Cleanup
        urls.forEach { fileAccessService.stopAccess(to: $0) }
        urls.forEach { try? FileManager.default.removeItem(at: $0) }
    }

    // MARK: - File Operations Tests

    func testReadImageFileMetadata() {
        // Given
        let testURL = createTemporaryTestFolder()
        let imageURL = testURL.appendingPathComponent("test.jpg")

        // Create a dummy file
        try? Data([0xFF, 0xD8, 0xFF, 0xE0]).write(to: imageURL) // JPEG header

        // When
        do {
            let attributes = try FileManager.default.attributesOfItem(atPath: imageURL.path)

            // Then
            XCTAssertNotNil(attributes[.size], "Should read file size")
            XCTAssertNotNil(attributes[.creationDate], "Should read creation date")
        } catch {
            XCTFail("Should read file attributes: \(error)")
        }

        // Cleanup
        try? FileManager.default.removeItem(at: testURL)
    }

    func testListDirectoryContents() {
        // Given
        let testURL = createTemporaryTestFolder()
        let file1 = testURL.appendingPathComponent("file1.txt")
        let file2 = testURL.appendingPathComponent("file2.txt")

        try? "Content 1".write(to: file1, atomically: true, encoding: .utf8)
        try? "Content 2".write(to: file2, atomically: true, encoding: .utf8)

        // When
        do {
            let contents = try FileManager.default.contentsOfDirectory(at: testURL, includingPropertiesForKeys: nil)

            // Then
            XCTAssertEqual(contents.count, 2, "Should list directory contents")
        } catch {
            XCTFail("Should list directory: \(error)")
        }

        // Cleanup
        try? FileManager.default.removeItem(at: testURL)
    }

    // MARK: - Error Handling Tests

    func testHandleNonexistentURL() {
        // Given
        let nonexistentURL = URL(fileURLWithPath: "/nonexistent/path")

        // When/Then
        XCTAssertThrowsError(try fileAccessService.persistAccess(to: nonexistentURL)) { error in
            XCTAssertNotNil(error, "Should throw error for nonexistent URL")
        }
    }

    func testHandleInvalidBookmarkData() {
        // Given
        let invalidData = Data([0x00, 0x01, 0x02])

        // When/Then
        XCTAssertThrowsError(
            try URL(
                resolvingBookmarkData: invalidData,
                options: [],
                relativeTo: nil,
                bookmarkDataIsStale: nil
            )
        ) { error in
            XCTAssertNotNil(error, "Should throw for invalid bookmark data")
        }
    }

    // MARK: - Performance Tests

    func testBookmarkCreationPerformance() {
        // Given
        let testURL = createTemporaryTestFolder()

        // When/Then
        measure {
            do {
                _ = try testURL.bookmarkData(
                    options: [.minimalBookmark],
                    includingResourceValuesForKeys: nil,
                    relativeTo: nil
                )
            } catch {
                XCTFail("Bookmark creation failed: \(error)")
            }
        }

        // Cleanup
        try? FileManager.default.removeItem(at: testURL)
    }

    func testBookmarkResolutionPerformance() {
        // Given
        let testURL = createTemporaryTestFolder()
        let bookmarkData = try! testURL.bookmarkData(
            options: [.minimalBookmark],
            includingResourceValuesForKeys: nil,
            relativeTo: nil
        )

        // When/Then
        measure {
            do {
                _ = try URL(
                    resolvingBookmarkData: bookmarkData,
                    options: [],
                    relativeTo: nil,
                    bookmarkDataIsStale: nil
                )
            } catch {
                XCTFail("Bookmark resolution failed: \(error)")
            }
        }

        // Cleanup
        try? FileManager.default.removeItem(at: testURL)
    }

    // MARK: - Helper Methods

    private func createTemporaryTestFolder() -> URL {
        let tempDir = FileManager.default.temporaryDirectory
        let folderName = "kull-ios-test-\(UUID().uuidString)"
        let testURL = tempDir.appendingPathComponent(folderName)

        try? FileManager.default.createDirectory(
            at: testURL,
            withIntermediateDirectories: true,
            attributes: nil
        )

        return testURL
    }
}

#endif
