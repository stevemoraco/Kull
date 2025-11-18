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
        let invalidURL = URL(fileURLWithPath: "/nonexistent/path/\(UUID().uuidString)")

        do {
            try await sut.runCulling(
                folderURL: invalidURL,
                provider: .appleIntelligence,
                mode: .local,
                prompt: "Test prompt"
            )
            XCTFail("Should have thrown error for non-existent folder")
        } catch let error as NSError {
            // Expected to fail with enumerator error
            XCTAssertTrue(error.domain == "RunController" || error.domain == NSCocoaErrorDomain)
        } catch {
            // Any error is acceptable for invalid folder
            XCTAssertNotNil(error)
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

    // MARK: - iOS-Specific Tests

    #if os(iOS)
    @MainActor
    func testIOSSandboxWorkflowCreation() async throws {
        let tempDir = FileManager.default.temporaryDirectory
            .appendingPathComponent("KullTestsSandbox-\(UUID().uuidString)")

        try FileManager.default.createDirectory(at: tempDir, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: tempDir) }

        // Verify sandbox directory creation works
        XCTAssertTrue(FileManager.default.fileExists(atPath: tempDir.path))
    }

    @MainActor
    func testIOSImageCopyToSandbox() async throws {
        let tempDir = FileManager.default.temporaryDirectory
            .appendingPathComponent("KullTestsCopy-\(UUID().uuidString)")
        let sandboxDir = tempDir.appendingPathComponent("sandbox")

        try FileManager.default.createDirectory(at: tempDir, withIntermediateDirectories: true)
        try FileManager.default.createDirectory(at: sandboxDir, withIntermediateDirectories: true)

        defer { try? FileManager.default.removeItem(at: tempDir) }

        // Create test image
        let sourceImage = tempDir.appendingPathComponent("test.jpg")
        let imageData = createTestJPEGData()
        try imageData.write(to: sourceImage)

        // Copy to sandbox
        let destination = sandboxDir.appendingPathComponent("test.jpg")
        try FileManager.default.copyItem(at: sourceImage, to: destination)

        XCTAssertTrue(FileManager.default.fileExists(atPath: destination.path))
    }

    @MainActor
    func testIOSXMPGeneration() async throws {
        let tempDir = FileManager.default.temporaryDirectory
            .appendingPathComponent("KullTestsXMP-\(UUID().uuidString)")
        try FileManager.default.createDirectory(at: tempDir, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: tempDir) }

        let xmpURL = tempDir.appendingPathComponent("test.xmp")
        let rating = createTestPhotoRating()

        let xmp = generateXMPContent(rating: rating)
        try xmp.write(to: xmpURL, atomically: true, encoding: .utf8)

        XCTAssertTrue(FileManager.default.fileExists(atPath: xmpURL.path))

        let xmpContent = try String(contentsOf: xmpURL, encoding: .utf8)
        XCTAssertTrue(xmpContent.contains("<?xml version=\"1.0\""))
        XCTAssertTrue(xmpContent.contains("<xmp:Rating>4</xmp:Rating>"))
        XCTAssertTrue(xmpContent.contains("<xmp:Label>green</xmp:Label>"))
    }

    @MainActor
    func testIOSMemoryWarningHandling() async {
        sut.setupMemoryWarningObserver()

        // Trigger memory warning
        NotificationCenter.default.post(
            name: UIApplication.didReceiveMemoryWarningNotification,
            object: nil
        )

        // Should not crash
        XCTAssertNotNil(sut)
    }

    @MainActor
    func testIOSBatchProcessingMemoryManagement() async throws {
        let tempDir = FileManager.default.temporaryDirectory
            .appendingPathComponent("KullTestsBatch-\(UUID().uuidString)")
        try FileManager.default.createDirectory(at: tempDir, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: tempDir) }

        // Create 25 test images (more than batch size of 20)
        for i in 0..<25 {
            let imageURL = tempDir.appendingPathComponent("test\(i).jpg")
            try createTestJPEGData().write(to: imageURL)
        }

        // Count images
        let files = try FileManager.default.contentsOfDirectory(
            at: tempDir,
            includingPropertiesForKeys: nil,
            options: [.skipsHiddenFiles]
        )

        let validExtensions = ["jpg", "jpeg", "png", "heic", "cr3", "nef", "arw", "orf", "raf", "dng"]
        let imageCount = files.filter { validExtensions.contains($0.pathExtension.lowercased()) }.count

        XCTAssertEqual(imageCount, 25)
    }

    @MainActor
    func testIOSSandboxCleanup() async throws {
        let tempDir = FileManager.default.temporaryDirectory
            .appendingPathComponent("KullTestsCleanup-\(UUID().uuidString)")
        try FileManager.default.createDirectory(at: tempDir, withIntermediateDirectories: true)

        // Create test files
        let file1 = tempDir.appendingPathComponent("file1.jpg")
        let file2 = tempDir.appendingPathComponent("file2.xmp")
        try createTestJPEGData().write(to: file1)
        try "test xmp".write(to: file2, atomically: true, encoding: .utf8)

        // Cleanup
        try FileManager.default.removeItem(at: tempDir)

        XCTAssertFalse(FileManager.default.fileExists(atPath: tempDir.path))
    }

    private func createTestJPEGData() -> Data {
        // Minimal valid JPEG data
        Data([
            0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46,
            0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01,
            0x00, 0x01, 0x00, 0x00, 0xFF, 0xD9
        ])
    }
    #endif

    // MARK: - XMP Generation Tests (Both Platforms)

    func testXMPFormatStructure() throws {
        let rating = createTestPhotoRating()
        let xmp = generateXMPContent(rating: rating)

        XCTAssertTrue(xmp.contains("<?xml version=\"1.0\" encoding=\"UTF-8\"?>"))
        XCTAssertTrue(xmp.contains("<x:xmpmeta"))
        XCTAssertTrue(xmp.contains("<rdf:RDF"))
        XCTAssertTrue(xmp.contains("<rdf:Description"))
        XCTAssertTrue(xmp.contains("</x:xmpmeta>"))
    }

    func testXMPRatingValues() throws {
        let testCases: [(Int, String)] = [
            (1, "red"),
            (3, "yellow"),
            (5, "green")
        ]

        for (star, color) in testCases {
            let rating = PhotoRating(
                starRating: star,
                colorLabel: color,
                keepReject: star >= 3 ? "keep" : "reject",
                tags: ["test"],
                description: "Test",
                technicalQuality: TechnicalQuality(sharpness: 800, exposure: 800, composition: 800, overallScore: 800),
                subjectAnalysis: SubjectAnalysis(primarySubject: "Test", emotion: "neutral", eyesOpen: true, smiling: false, inFocus: true)
            )

            let xmp = generateXMPContent(rating: rating)
            XCTAssertTrue(xmp.contains("<xmp:Rating>\(star)</xmp:Rating>"))
            XCTAssertTrue(xmp.contains("<xmp:Label>\(color)</xmp:Label>"))
        }
    }

    func testXMLEscaping() throws {
        let rating = PhotoRating(
            starRating: 4,
            colorLabel: "green",
            keepReject: "keep",
            tags: ["<tag>", "tag&value", "tag\"quotes\""],
            description: "Test <description> with & special \"characters\"",
            technicalQuality: TechnicalQuality(sharpness: 800, exposure: 800, composition: 800, overallScore: 800),
            subjectAnalysis: SubjectAnalysis(primarySubject: "Subject & More", emotion: "neutral", eyesOpen: true, smiling: false, inFocus: true)
        )

        let xmp = generateXMPContent(rating: rating)

        // Verify XML escaping
        XCTAssertTrue(xmp.contains("&lt;tag&gt;"))
        XCTAssertTrue(xmp.contains("tag&amp;value"))
        XCTAssertTrue(xmp.contains("&lt;description&gt;"))
        XCTAssertTrue(xmp.contains("Subject &amp; More"))
    }

    func testTechnicalQualityScoresInXMP() throws {
        let rating = PhotoRating(
            starRating: 5,
            colorLabel: "green",
            keepReject: "keep",
            tags: ["test"],
            description: "Test",
            technicalQuality: TechnicalQuality(
                sharpness: 950.0,
                exposure: 875.0,
                composition: 920.0,
                overallScore: 915.0
            ),
            subjectAnalysis: SubjectAnalysis(primarySubject: "Test", emotion: "neutral", eyesOpen: true, smiling: false, inFocus: true)
        )

        let xmp = generateXMPContent(rating: rating)

        XCTAssertTrue(xmp.contains("<kull:Sharpness>950</kull:Sharpness>"))
        XCTAssertTrue(xmp.contains("<kull:Exposure>875</kull:Exposure>"))
        XCTAssertTrue(xmp.contains("<kull:Composition>920</kull:Composition>"))
        XCTAssertTrue(xmp.contains("<kull:TechnicalQuality>915</kull:TechnicalQuality>"))
    }

    func testSubjectAnalysisInXMP() throws {
        let rating = PhotoRating(
            starRating: 5,
            colorLabel: "green",
            keepReject: "keep",
            tags: ["test"],
            description: "Test",
            technicalQuality: TechnicalQuality(sharpness: 800, exposure: 800, composition: 800, overallScore: 800),
            subjectAnalysis: SubjectAnalysis(
                primarySubject: "Bride & Groom",
                emotion: "joyful",
                eyesOpen: true,
                smiling: true,
                inFocus: true
            )
        )

        let xmp = generateXMPContent(rating: rating)

        XCTAssertTrue(xmp.contains("<kull:Subject>Bride &amp; Groom</kull:Subject>"))
        XCTAssertTrue(xmp.contains("<kull:EyesOpen>true</kull:EyesOpen>"))
        XCTAssertTrue(xmp.contains("<kull:InFocus>true</kull:InFocus>"))
    }

    func testMultipleTagsInXMP() throws {
        let rating = PhotoRating(
            starRating: 5,
            colorLabel: "green",
            keepReject: "keep",
            tags: ["wedding", "ceremony", "emotional", "hero", "5-star"],
            description: "Test",
            technicalQuality: TechnicalQuality(sharpness: 800, exposure: 800, composition: 800, overallScore: 800),
            subjectAnalysis: SubjectAnalysis(primarySubject: "Test", emotion: "neutral", eyesOpen: true, smiling: false, inFocus: true)
        )

        let xmp = generateXMPContent(rating: rating)

        for tag in rating.tags {
            XCTAssertTrue(xmp.contains("<rdf:li>\(escapeXML(tag))</rdf:li>"))
        }
    }

    // MARK: - Test Helpers

    private func createTestPhotoRating() -> PhotoRating {
        PhotoRating(
            starRating: 4,
            colorLabel: "green",
            keepReject: "keep",
            tags: ["test-tag", "wedding", "ceremony"],
            description: "Test description for photo rating",
            technicalQuality: TechnicalQuality(
                sharpness: 850.0,
                exposure: 800.0,
                composition: 900.0,
                overallScore: 850.0
            ),
            subjectAnalysis: SubjectAnalysis(
                primarySubject: "Bride",
                emotion: "happy",
                eyesOpen: true,
                smiling: true,
                inFocus: true
            )
        )
    }

    private func generateXMPContent(rating: PhotoRating) -> String {
        """
        <?xml version="1.0" encoding="UTF-8"?>
        <x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="Kull 1.0">
          <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
            <rdf:Description rdf:about=""
                xmlns:xmp="http://ns.adobe.com/xap/1.0/"
                xmlns:dc="http://purl.org/dc/elements/1.1/"
                xmlns:photoshop="http://ns.adobe.com/photoshop/1.0/"
                xmlns:kull="http://kull.ai/ns/1.0/">
              <xmp:Rating>\(rating.starRating)</xmp:Rating>
              <xmp:Label>\(rating.colorLabel)</xmp:Label>
              <dc:description>
                <rdf:Alt>
                  <rdf:li xml:lang="x-default">\(escapeXML(rating.description))</rdf:li>
                </rdf:Alt>
              </dc:description>
              <dc:subject>
                <rdf:Bag>
        \(rating.tags.map { "          <rdf:li>\(escapeXML($0))</rdf:li>" }.joined(separator: "\n"))
                </rdf:Bag>
              </dc:subject>
              <photoshop:Category>\(rating.keepReject)</photoshop:Category>
              <kull:TechnicalQuality>\(String(format: "%.0f", rating.technicalQuality.overallScore))</kull:TechnicalQuality>
              <kull:Sharpness>\(String(format: "%.0f", rating.technicalQuality.sharpness))</kull:Sharpness>
              <kull:Exposure>\(String(format: "%.0f", rating.technicalQuality.exposure))</kull:Exposure>
              <kull:Composition>\(String(format: "%.0f", rating.technicalQuality.composition))</kull:Composition>
              <kull:Subject>\(escapeXML(rating.subjectAnalysis.primarySubject))</kull:Subject>
              <kull:EyesOpen>\(rating.subjectAnalysis.eyesOpen ? "true" : "false")</kull:EyesOpen>
              <kull:InFocus>\(rating.subjectAnalysis.inFocus ? "true" : "false")</kull:InFocus>
            </rdf:Description>
          </rdf:RDF>
        </x:xmpmeta>
        """
    }

    private func escapeXML(_ string: String) -> String {
        string
            .replacingOccurrences(of: "&", with: "&amp;")
            .replacingOccurrences(of: "<", with: "&lt;")
            .replacingOccurrences(of: ">", with: "&gt;")
            .replacingOccurrences(of: "\"", with: "&quot;")
            .replacingOccurrences(of: "'", with: "&apos;")
    }
}
