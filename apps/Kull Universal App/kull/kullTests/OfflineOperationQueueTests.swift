import XCTest
@testable import kull

final class OfflineOperationQueueTests: XCTestCase {
    var queue: OfflineOperationQueue!

    override func setUp() {
        super.setUp()
        queue = OfflineOperationQueue.shared
        queue.clearQueue()
    }

    override func tearDown() {
        queue.clearQueue()
        super.tearDown()
    }

    func testEnqueueAndClearQueue() throws {
        try queue.enqueue(type: .addFolder, payload: AddFolderPayload(folderPath: "/tmp/test", bookmarkData: nil))
        XCTAssertEqual(queue.pendingOperationsCount, 1)
        queue.clearQueue()
        XCTAssertEqual(queue.pendingOperationsCount, 0)
    }

    func testSyncWhenNoOperationsReturnsQuickly() async {
        queue.clearQueue()
        await queue.syncWhenOnline()
        XCTAssertFalse(queue.isSyncing)
    }
}
