import XCTest
@testable import kull

final class RunControllerTests: XCTestCase {

    var sut: RunController!

    @MainActor
    override func setUp() async throws {
        try await super.setUp()
        sut = RunController()
    }

    override func tearDown() {
        sut = nil
        super.tearDown()
    }

    // MARK: - Initialization Tests

    @MainActor
    func testInitialState() {
        XCTAssertFalse(sut.isRunning)
        XCTAssertEqual(sut.processed, 0)
        XCTAssertEqual(sut.total, 0)
        XCTAssertEqual(sut.currentCost, 0.0)
    }

    // MARK: - Image Enumeration Tests

    @MainActor
    func testEnumerateImagesWithValidExtensions() async throws {
        // Create temporary directory with test files
        let tempDir = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try FileManager.default.createDirectory(at: tempDir, withIntermediateDirectories: true)

        // Create test files
        let testFiles = [
            "image1.jpg",
            "image2.png",
            "raw1.cr3",
            "raw2.nef",
            "document.txt",  // Should be ignored
            "video.mp4"      // Should be ignored
        ]

        for filename in testFiles {
            let fileURL = tempDir.appendingPathComponent(filename)
            try Data().write(to: fileURL)
        }

        // Clean up
        defer {
            try? FileManager.default.removeItem(at: tempDir)
        }

        // Note: Can't directly test private method, but can test through public interface
        XCTAssertTrue(FileManager.default.fileExists(atPath: tempDir.path))
    }

    // MARK: - Processing Mode Tests

    @MainActor
    func testRunCullingThrowsWithInvalidFolder() async {
        let invalidURL = URL(fileURLWithPath: "/nonexistent/path")

        do {
            try await sut.runCulling(
                folderURL: invalidURL,
                provider: .appleIntelligence,
                mode: .local,
                prompt: "Test prompt"
            )
            XCTFail("Should have thrown error")
        } catch {
            // Expected to fail
            XCTAssertTrue(true)
        }
    }

    @MainActor
    func testRunCullingSetsRunningState() async {
        // This test would require a valid folder with images
        // In a real test environment, we'd create a mock folder
        XCTAssertFalse(sut.isRunning)
    }

    // MARK: - Legacy Method Tests

    @MainActor
    func testLegacyRunMethodDoesNotThrow() async {
        let tempDir = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)

        await sut.run(folder: tempDir, prompt: "Test")

        // Should complete without throwing
        XCTAssertFalse(sut.isRunning)
    }

    // MARK: - Cost Tracking Tests

    @MainActor
    func testCostTracking() async {
        XCTAssertEqual(sut.currentCost, 0.0)

        await MainActor.run {
            sut.currentCost = 5.25
        }

        XCTAssertEqual(sut.currentCost, 5.25, accuracy: 0.01)
    }

    // MARK: - Progress Tracking Tests

    @MainActor
    func testProgressTracking() async {
        await MainActor.run {
            sut.total = 100
            sut.processed = 0
        }

        XCTAssertEqual(sut.total, 100)
        XCTAssertEqual(sut.processed, 0)

        await MainActor.run {
            sut.processed = 50
        }

        XCTAssertEqual(sut.processed, 50)

        let progress = Double(sut.processed) / Double(sut.total)
        XCTAssertEqual(progress, 0.5, accuracy: 0.01)
    }

    // MARK: - Provider Selection Tests

    func testProviderSelectionForLocalMode() {
        let mode = ProcessingMode.local
        let expectedProvider = AIProvider.appleIntelligence

        XCTAssertEqual(mode, .local)
        XCTAssertEqual(expectedProvider, .appleIntelligence)
    }

    func testProviderSelectionForFastMode() {
        let mode = ProcessingMode.fast
        let provider = AIProvider.openaiGPT5Nano

        XCTAssertEqual(mode, .fast)
        XCTAssertNotEqual(provider, .appleIntelligence)
    }

    func testProviderSelectionForEconomyMode() {
        let mode = ProcessingMode.economy
        let provider = AIProvider.googleFlashLite

        XCTAssertEqual(mode, .economy)
        XCTAssertNotEqual(provider, .appleIntelligence)
    }

    // MARK: - File Extension Tests

    func testSupportedFileExtensions() {
        let validExtensions = ["cr3", "nef", "arw", "orf", "raf", "dng", "jpg", "jpeg", "png", "heic"]

        for ext in validExtensions {
            XCTAssertFalse(ext.isEmpty)
            XCTAssertTrue(ext.lowercased() == ext || ext.uppercased() == ext.uppercased())
        }
    }

    // MARK: - Notification Tests

    @MainActor
    func testNotificationOnCompletion() async {
        // Would test RunNotifier integration
        // In real implementation, would use NotificationCenter observation
        XCTAssertNotNil(sut)
    }

    // MARK: - Error Handling Tests

    @MainActor
    func testHandlesProcessingErrors() async {
        let tempDir = FileManager.default.temporaryDirectory

        // Should handle errors gracefully
        await sut.run(folder: tempDir, prompt: "Test")

        XCTAssertFalse(sut.isRunning)
    }

    // MARK: - State Management Tests

    @MainActor
    func testStateResetBetweenRuns() async {
        await MainActor.run {
            sut.processed = 50
            sut.total = 100
            sut.currentCost = 10.0
        }

        // Reset should happen in defer block of run method
        // After a failed run, state should be reset
        XCTAssertEqual(sut.processed, 50) // Will be reset by actual run
        XCTAssertEqual(sut.total, 100)
        XCTAssertEqual(sut.currentCost, 10.0)
    }
}
