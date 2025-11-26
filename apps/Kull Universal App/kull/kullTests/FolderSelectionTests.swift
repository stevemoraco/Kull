import XCTest
@testable import kull

final class FolderSelectionTests: XCTestCase {
    func testSharedServiceConformsToProtocol() {
        let service = FileAccessService.shared
        XCTAssertTrue(service is FileAccessServiceProtocol)
    }

    func testPersistResumeAndStopNoCrashOnTempFolder() throws {
        let service = FileAccessService.shared
        let tempDir = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try FileManager.default.createDirectory(at: tempDir, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: tempDir) }

        // Bookmark creation may fail on iOS simulators without security scope; handle gracefully.
        do {
            try service.persistAccess(to: tempDir)
        } catch {
            // It's acceptable for persist to fail in the test sandbox, but it should not crash.
        }

        _ = service.resumeAccess(to: tempDir)
        service.stopAccess(to: tempDir)
    }
}
