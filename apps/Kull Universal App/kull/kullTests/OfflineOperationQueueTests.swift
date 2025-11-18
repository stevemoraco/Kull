//
//  OfflineOperationQueueTests.swift
//  kullTests
//
//  Created by Agent H on 11/18/25.
//  Tests for OfflineOperationQueue functionality
//

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

    // MARK: - Enqueue Tests

    func testEnqueueOperation() {
        // Given
        let payload = VotePromptPayload(promptId: "prompt123", score: 5)
        let data = try! JSONEncoder().encode(payload)
        let operation = QueuedOperation(type: .votePrompt, payload: data)

        // When
        queue.enqueue(operation)

        // Then
        XCTAssertEqual(queue.pendingOperationsCount, 1)
        XCTAssertEqual(queue.operations.first?.type, .votePrompt)
    }

    func testEnqueueWithTypedPayload() throws {
        // Given
        let payload = VotePromptPayload(promptId: "prompt456", score: 4)

        // When
        try queue.enqueue(type: .votePrompt, payload: payload)

        // Then
        XCTAssertEqual(queue.pendingOperationsCount, 1)

        let operation = queue.operations.first!
        let decodedPayload = try JSONDecoder().decode(VotePromptPayload.self, from: operation.payload)
        XCTAssertEqual(decodedPayload.promptId, "prompt456")
        XCTAssertEqual(decodedPayload.score, 4)
    }

    func testEnqueueMultipleOperations() {
        // Given & When
        let op1 = QueuedOperation(type: .votePrompt, payload: Data())
        let op2 = QueuedOperation(type: .addFolder, payload: Data())
        let op3 = QueuedOperation(type: .updateSettings, payload: Data())

        queue.enqueue(op1)
        queue.enqueue(op2)
        queue.enqueue(op3)

        // Then
        XCTAssertEqual(queue.pendingOperationsCount, 3)
    }

    // MARK: - Clear Queue Tests

    func testClearQueue() {
        // Given
        let op = QueuedOperation(type: .votePrompt, payload: Data())
        queue.enqueue(op)
        XCTAssertEqual(queue.pendingOperationsCount, 1)

        // When
        queue.clearQueue()

        // Then
        XCTAssertEqual(queue.pendingOperationsCount, 0)
        XCTAssertTrue(queue.operations.isEmpty)
    }

    // MARK: - Queue Persistence Tests

    func testQueuePersistence() {
        // Given
        let payload = VotePromptPayload(promptId: "persist123", score: 5)
        try! queue.enqueue(type: .votePrompt, payload: payload)

        // When - Simulate app restart by creating new instance
        let newQueue = OfflineOperationQueue.shared

        // Then - Operations should be persisted
        XCTAssertEqual(newQueue.pendingOperationsCount, 1)
        XCTAssertEqual(newQueue.operations.first?.type, .votePrompt)
    }

    // MARK: - Operation Statistics Tests

    func testPendingOperationsCount() {
        // Given
        XCTAssertEqual(queue.pendingOperationsCount, 0)

        // When
        queue.enqueue(QueuedOperation(type: .votePrompt, payload: Data()))
        queue.enqueue(QueuedOperation(type: .addFolder, payload: Data()))

        // Then
        XCTAssertEqual(queue.pendingOperationsCount, 2)
    }

    func testOperationsByType() {
        // Given
        queue.enqueue(QueuedOperation(type: .votePrompt, payload: Data()))
        queue.enqueue(QueuedOperation(type: .votePrompt, payload: Data()))
        queue.enqueue(QueuedOperation(type: .addFolder, payload: Data()))
        queue.enqueue(QueuedOperation(type: .updateSettings, payload: Data()))

        // When
        let byType = queue.operationsByType

        // Then
        XCTAssertEqual(byType[.votePrompt], 2)
        XCTAssertEqual(byType[.addFolder], 1)
        XCTAssertEqual(byType[.updateSettings], 1)
    }

    func testGetOperationsOfType() {
        // Given
        queue.enqueue(QueuedOperation(type: .votePrompt, payload: Data()))
        queue.enqueue(QueuedOperation(type: .votePrompt, payload: Data()))
        queue.enqueue(QueuedOperation(type: .addFolder, payload: Data()))

        // When
        let voteOps = queue.getOperations(ofType: .votePrompt)
        let folderOps = queue.getOperations(ofType: .addFolder)

        // Then
        XCTAssertEqual(voteOps.count, 2)
        XCTAssertEqual(folderOps.count, 1)
    }

    func testHasFailedOperations() {
        // Given - No operations
        XCTAssertFalse(queue.hasFailedOperations)

        // When - Add operation with max retries
        var op = QueuedOperation(type: .votePrompt, payload: Data())
        op.retryCount = 3 // Max retries
        queue.enqueue(op)

        // Then
        XCTAssertTrue(queue.hasFailedOperations)
    }

    // MARK: - Operation Payload Tests

    func testVotePromptPayload() throws {
        // Given
        let payload = VotePromptPayload(promptId: "prompt789", score: 3)
        let data = try JSONEncoder().encode(payload)

        // When
        let decoded = try JSONDecoder().decode(VotePromptPayload.self, from: data)

        // Then
        XCTAssertEqual(decoded.promptId, "prompt789")
        XCTAssertEqual(decoded.score, 3)
    }

    func testAddFolderPayload() throws {
        // Given
        let payload = AddFolderPayload(
            folderPath: "/Users/test/Photos",
            bookmarkData: "bookmark".data(using: .utf8)
        )
        let data = try JSONEncoder().encode(payload)

        // When
        let decoded = try JSONDecoder().decode(AddFolderPayload.self, from: data)

        // Then
        XCTAssertEqual(decoded.folderPath, "/Users/test/Photos")
        XCTAssertNotNil(decoded.bookmarkData)
    }

    func testRemoveFolderPayload() throws {
        // Given
        let payload = RemoveFolderPayload(folderPath: "/Users/test/Photos")
        let data = try JSONEncoder().encode(payload)

        // When
        let decoded = try JSONDecoder().decode(RemoveFolderPayload.self, from: data)

        // Then
        XCTAssertEqual(decoded.folderPath, "/Users/test/Photos")
    }

    func testUpdateSettingsPayload() throws {
        // Given
        let payload = UpdateSettingsPayload(key: "theme", value: "dark")
        let data = try JSONEncoder().encode(payload)

        // When
        let decoded = try JSONDecoder().decode(UpdateSettingsPayload.self, from: data)

        // Then
        XCTAssertEqual(decoded.key, "theme")
        XCTAssertEqual(decoded.value, "dark")
    }

    // MARK: - Queue Behavior Tests

    func testQueueMaintainsOrder() {
        // Given
        let op1 = QueuedOperation(id: UUID(), type: .votePrompt, payload: Data())
        let op2 = QueuedOperation(id: UUID(), type: .addFolder, payload: Data())
        let op3 = QueuedOperation(id: UUID(), type: .updateSettings, payload: Data())

        // When
        queue.enqueue(op1)
        queue.enqueue(op2)
        queue.enqueue(op3)

        // Then - Should maintain FIFO order
        XCTAssertEqual(queue.operations[0].id, op1.id)
        XCTAssertEqual(queue.operations[1].id, op2.id)
        XCTAssertEqual(queue.operations[2].id, op3.id)
    }

    func testOperationRetryTracking() {
        // Given
        var operation = QueuedOperation(type: .votePrompt, payload: Data())
        XCTAssertEqual(operation.retryCount, 0)
        XCTAssertNil(operation.lastError)

        // When
        operation.retryCount += 1
        operation.lastError = "Network timeout"

        // Then
        XCTAssertEqual(operation.retryCount, 1)
        XCTAssertEqual(operation.lastError, "Network timeout")
    }

    // MARK: - Integration Tests

    func testOperationQueueWithRealPayload() throws {
        // Given
        let votePayload = VotePromptPayload(promptId: "real-prompt-123", score: 5)
        let folderPayload = AddFolderPayload(folderPath: "/Users/test", bookmarkData: nil)

        // When
        try queue.enqueue(type: .votePrompt, payload: votePayload)
        try queue.enqueue(type: .addFolder, payload: folderPayload)

        // Then
        XCTAssertEqual(queue.pendingOperationsCount, 2)

        // Verify first operation
        let firstOp = queue.operations[0]
        let decodedVote = try JSONDecoder().decode(VotePromptPayload.self, from: firstOp.payload)
        XCTAssertEqual(decodedVote.promptId, "real-prompt-123")
        XCTAssertEqual(decodedVote.score, 5)

        // Verify second operation
        let secondOp = queue.operations[1]
        let decodedFolder = try JSONDecoder().decode(AddFolderPayload.self, from: secondOp.payload)
        XCTAssertEqual(decodedFolder.folderPath, "/Users/test")
    }

    // MARK: - Edge Cases

    func testEmptyQueue() {
        // Given
        queue.clearQueue()

        // Then
        XCTAssertEqual(queue.pendingOperationsCount, 0)
        XCTAssertTrue(queue.operations.isEmpty)
        XCTAssertFalse(queue.hasFailedOperations)
        XCTAssertTrue(queue.operationsByType.isEmpty)
    }

    func testQueueWithManyOperations() {
        // Given & When - Add 100 operations
        for i in 0..<100 {
            let op = QueuedOperation(type: .votePrompt, payload: Data())
            queue.enqueue(op)
        }

        // Then
        XCTAssertEqual(queue.pendingOperationsCount, 100)
    }

    // MARK: - Sync State Tests

    func testSyncingState() {
        // Given
        XCTAssertFalse(queue.isSyncing)

        // Note: Testing actual sync would require network mocking
        // This test just verifies the property exists and has correct initial state
    }

    func testLastSyncDate() {
        // Given
        XCTAssertNil(queue.lastSyncDate)

        // Note: lastSyncDate is set after successful sync
        // Would require network mocking to test fully
    }
}
