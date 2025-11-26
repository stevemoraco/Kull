import XCTest
@testable import kull

final class FolderWatcherTests: XCTestCase {
    func testWatchAndStopDoesNotCrash() throws {
        if ProcessInfo.processInfo.environment["XCTestConfigurationFilePath"] != nil {
            throw XCTSkip("Folder watching is disabled during unit tests")
        }

        let watcher = FolderWatcher()
        let tempDir = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try FileManager.default.createDirectory(at: tempDir, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: tempDir) }

        let exp = expectation(description: "watch callback")
        exp.isInverted = true // we don't require an event, just ensure no crash

        watcher.watch(urls: [tempDir]) { _ in
            exp.fulfill()
        }

        watcher.stop()
        wait(for: [exp], timeout: 0.1)
    }
}
