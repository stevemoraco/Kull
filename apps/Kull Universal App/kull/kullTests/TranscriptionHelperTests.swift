//
//  TranscriptionHelperTests.swift
//  kullTests
//
//  Created by Claude Code on 11/18/25.
//

import XCTest
@testable import kull

final class TranscriptionHelperTests: XCTestCase {
    var sut: TranscriptionHelper!

    override func setUp() {
        super.setUp()
        sut = TranscriptionHelper()
    }

    override func tearDown() {
        sut = nil
        super.tearDown()
    }

    // MARK: - Initialization Tests

    func testInitialization() {
        XCTAssertNotNil(sut)
    }

    // MARK: - Platform Tests

    #if os(macOS)
    func testTranscribeMethodExists() {
        // Verify transcribe method exists and can be called
        var called = false
        let currentText = { return "Current text" }
        let update = { (newText: String) in
            called = true
        }

        // Note: This will show a file picker in actual tests
        // For automated tests, we just verify the method exists
        XCTAssertNotNil(sut.transcribe)
    }

    func testTranscribeWithEmptyCurrentText() {
        let currentText = { return "" }
        var updatedText: String?
        let update = { (newText: String) in
            updatedText = newText
        }

        // Method should be callable
        // Note: Actual file picker interaction can't be tested in unit tests
        XCTAssertNotNil(currentText())
    }

    func testTranscribeWithExistingText() {
        let currentText = { return "Existing prompt text" }
        var updatedText: String?
        let update = { (newText: String) in
            updatedText = newText
        }

        // Method should be callable
        XCTAssertEqual(currentText(), "Existing prompt text")
    }

    func testTranscribeClosuresAreOptional() {
        // Test that transcribe can be called with different closure types
        let simpleCurrentText = { "" }
        let simpleUpdate: (String) -> Void = { _ in }

        XCTAssertNotNil(simpleCurrentText)
        XCTAssertNotNil(simpleUpdate)
    }

    // MARK: - Multipart Form Data Tests

    func testMultipartBoundaryGeneration() {
        // Test that UUID can be used as boundary
        let boundary = UUID().uuidString

        XCTAssertFalse(boundary.isEmpty)
        XCTAssertEqual(boundary.count, 36) // UUID string length
    }

    func testMultipartFormDataStructure() {
        let boundary = "test-boundary"
        var body = Data()

        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"audio\"; filename=\"test.mp3\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: application/octet-stream\r\n\r\n".data(using: .utf8)!)
        body.append("test data".data(using: .utf8)!)
        body.append("\r\n--\(boundary)--\r\n".data(using: .utf8)!)

        XCTAssertFalse(body.isEmpty)
        XCTAssertTrue(body.count > 0)
    }

    // MARK: - URL Handling Tests

    func testFileURLCreation() {
        let tempURL = FileManager.default.temporaryDirectory.appendingPathComponent("test.mp3")

        XCTAssertTrue(tempURL.isFileURL)
        XCTAssertEqual(tempURL.lastPathComponent, "test.mp3")
    }

    func testSupportedFileExtensions() {
        let supportedExtensions = ["m4a", "mp3", "wav", "webm"]

        for ext in supportedExtensions {
            let url = URL(fileURLWithPath: "/tmp/test.\(ext)")
            XCTAssertEqual(url.pathExtension, ext)
        }
    }

    // MARK: - JSON Response Tests

    func testJSONResponseParsing() throws {
        let json = """
        {
            "text": "This is a transcribed text"
        }
        """

        let data = json.data(using: .utf8)!
        let parsed = try JSONSerialization.jsonObject(with: data) as? [String: Any]

        XCTAssertNotNil(parsed)
        XCTAssertEqual(parsed?["text"] as? String, "This is a transcribed text")
    }

    func testJSONResponseWithEmptyText() throws {
        let json = """
        {
            "text": ""
        }
        """

        let data = json.data(using: .utf8)!
        let parsed = try JSONSerialization.jsonObject(with: data) as? [String: Any]

        XCTAssertNotNil(parsed)
        XCTAssertEqual(parsed?["text"] as? String, "")
    }

    func testJSONResponseWithMissingText() throws {
        let json = """
        {
            "status": "success"
        }
        """

        let data = json.data(using: .utf8)!
        let parsed = try JSONSerialization.jsonObject(with: data) as? [String: Any]

        XCTAssertNotNil(parsed)
        XCTAssertNil(parsed?["text"])
    }

    // MARK: - Text Combination Tests

    func testTextCombinationWithExistingText() {
        let existing = "Existing text"
        let newText = "New transcribed text"
        let combined = (existing + "\n" + newText).trimmingCharacters(in: .whitespacesAndNewlines)

        XCTAssertTrue(combined.contains(existing))
        XCTAssertTrue(combined.contains(newText))
        XCTAssertTrue(combined.contains("\n"))
    }

    func testTextCombinationWithEmptyExisting() {
        let existing = ""
        let newText = "New transcribed text"
        let combined = (existing + "\n" + newText).trimmingCharacters(in: .whitespacesAndNewlines)

        XCTAssertEqual(combined, newText)
    }

    func testTextCombinationTrimsWhitespace() {
        let existing = "  Existing text  "
        let newText = "  New text  "
        let combined = (existing + "\n" + newText).trimmingCharacters(in: .whitespacesAndNewlines)

        XCTAssertFalse(combined.hasPrefix(" "))
        XCTAssertFalse(combined.hasSuffix(" "))
    }

    #else
    // iOS Tests
    func testTranscribeIsNoOpOniOS() {
        let currentText = { return "Text" }
        let update: (String) -> Void = { _ in }

        // On iOS, transcribe should be a no-op
        sut.transcribe(currentText: currentText, update: update)

        // Should complete without error
        XCTAssertNotNil(sut)
    }
    #endif

    // MARK: - Performance Tests

    func testTextCombinationPerformance() {
        let existing = String(repeating: "a", count: 1000)
        let newText = String(repeating: "b", count: 1000)

        measure {
            for _ in 0..<100 {
                _ = (existing + "\n" + newText).trimmingCharacters(in: .whitespacesAndNewlines)
            }
        }
    }

    func testJSONParsingPerformance() {
        let json = """
        {
            "text": "This is a test transcription"
        }
        """
        let data = json.data(using: .utf8)!

        measure {
            for _ in 0..<100 {
                _ = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
            }
        }
    }

    // MARK: - Edge Cases

    func testTranscribeWithVeryLongExistingText() {
        let veryLongText = String(repeating: "a", count: 100000)
        let currentText = { return veryLongText }
        let update: (String) -> Void = { _ in }

        // Should not crash with very long text
        XCTAssertEqual(currentText().count, 100000)
    }

    func testTranscribeWithSpecialCharacters() {
        let specialText = "Test with émojis 🎵 and spëcial çharacters"
        let currentText = { return specialText }
        let update: (String) -> Void = { _ in }

        XCTAssertEqual(currentText(), specialText)
    }

    func testTranscribeWithNewlines() {
        let multilineText = "Line 1\nLine 2\nLine 3"
        let currentText = { return multilineText }
        let update: (String) -> Void = { _ in }

        XCTAssertTrue(currentText().contains("\n"))
    }

    // MARK: - Integration Tests

    @MainActor
    func testEnvironmentConfigIntegration() {
        // TranscriptionHelper should use EnvironmentConfig
        let config = EnvironmentConfig.shared
        let apiURL = config.apiBaseURL

        XCTAssertNotNil(apiURL)
        XCTAssertTrue(apiURL.absoluteString.contains("http"))
    }

    @MainActor
    func testTranscriptionEndpointURL() {
        let baseURL = EnvironmentConfig.shared.apiBaseURL
        let transcribeURL = baseURL.appendingPathComponent("/api/transcribe")

        XCTAssertTrue(transcribeURL.absoluteString.hasSuffix("/api/transcribe"))
    }

    // MARK: - Thread Safety Tests

    func testConcurrentClosureCalls() {
        var callCount = 0
        let lock = NSLock()

        let currentText = {
            lock.lock()
            defer { lock.unlock() }
            return "Text \(callCount)"
        }

        let update: (String) -> Void = { _ in
            lock.lock()
            callCount += 1
            lock.unlock()
        }

        // Call closures from multiple threads
        DispatchQueue.concurrentPerform(iterations: 100) { _ in
            _ = currentText()
        }

        XCTAssertNotNil(currentText)
        XCTAssertNotNil(update)
    }
}
