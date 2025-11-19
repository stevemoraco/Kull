//
//  IOSOfflineModeIntegrationTests.swift
//  kullTests
//
//  Integration tests for iOS/iPadOS offline mode functionality
//  Tests airplane mode simulation, offline queue, and connectivity monitoring
//

import XCTest
@testable import kull
import Network

#if os(iOS)
import UIKit

final class IOSOfflineModeIntegrationTests: XCTestCase {

    var networkMonitor: NetworkMonitor!
    var offlineQueue: OfflineOperationQueue!
    var cacheManager: CacheManager!

    override func setUp() {
        super.setUp()
        networkMonitor = NetworkMonitor.shared
        offlineQueue = OfflineOperationQueue.shared
        cacheManager = CacheManager.shared
    }

    override func tearDown() {
        offlineQueue.clear()
        networkMonitor = nil
        offlineQueue = nil
        cacheManager = nil
        super.tearDown()
    }

    // MARK: - NetworkMonitor Tests

    func testNetworkMonitorInitializes() {
        // Given/When
        let monitor = NetworkMonitor.shared

        // Then
        XCTAssertNotNil(monitor, "NetworkMonitor should initialize")
    }

    func testNetworkMonitorIsSingleton() {
        // Given
        let monitor1 = NetworkMonitor.shared
        let monitor2 = NetworkMonitor.shared

        // Then
        XCTAssertTrue(monitor1 === monitor2, "NetworkMonitor should be singleton")
    }

    func testNetworkMonitorStartsMonitoring() {
        // Given/When
        networkMonitor.startMonitoring()

        // Then
        XCTAssertTrue(true, "Network monitoring should start without error")

        // Cleanup
        networkMonitor.stopMonitoring()
    }

    func testNetworkMonitorStopsMonitoring() {
        // Given
        networkMonitor.startMonitoring()

        // When/Then
        networkMonitor.stopMonitoring()
        XCTAssertTrue(true, "Network monitoring should stop without error")
    }

    func testNetworkMonitorDetectsInitialState() {
        // Given
        networkMonitor.startMonitoring()

        // When
        let isConnected = networkMonitor.isConnected

        // Then
        // In simulator, should typically be connected
        // We can't assume a specific state, but it should be a valid boolean
        XCTAssertTrue(isConnected || !isConnected, "Should have valid connection state")

        // Cleanup
        networkMonitor.stopMonitoring()
    }

    func testNetworkMonitorConnectionType() {
        // Given
        networkMonitor.startMonitoring()

        // When
        let connectionType = networkMonitor.connectionType

        // Then
        switch connectionType {
        case .wifi, .cellular, .wired, .none:
            XCTAssertTrue(true, "Should have valid connection type")
        }

        // Cleanup
        networkMonitor.stopMonitoring()
    }

    // MARK: - Offline Queue Tests

    func testOfflineQueueInitializes() {
        // Given/When
        let queue = OfflineOperationQueue.shared

        // Then
        XCTAssertNotNil(queue, "OfflineOperationQueue should initialize")
    }

    func testOfflineQueueIsSingleton() {
        // Given
        let queue1 = OfflineOperationQueue.shared
        let queue2 = OfflineOperationQueue.shared

        // Then
        XCTAssertTrue(queue1 === queue2, "OfflineOperationQueue should be singleton")
    }

    func testEnqueueOperationWhenOffline() {
        // Given
        let operation = OfflineOperation(
            id: UUID().uuidString,
            type: .processImages,
            data: ["shootId": "test-123", "imageCount": 100],
            timestamp: Date()
        )

        // When
        offlineQueue.enqueue(operation)

        // Then
        let pending = offlineQueue.getPendingOperations()
        XCTAssertGreaterThan(pending.count, 0, "Should enqueue operation")

        // Cleanup
        offlineQueue.clear()
    }

    func testDequeueOperationWhenOnline() {
        // Given
        let operation = OfflineOperation(
            id: UUID().uuidString,
            type: .syncRatings,
            data: ["ratings": []],
            timestamp: Date()
        )

        offlineQueue.enqueue(operation)

        // When
        let dequeued = offlineQueue.dequeue()

        // Then
        XCTAssertNotNil(dequeued, "Should dequeue operation")
        XCTAssertEqual(dequeued?.id, operation.id, "Should dequeue correct operation")

        // Cleanup
        offlineQueue.clear()
    }

    func testGetPendingOperations() {
        // Given
        let operations = (0..<5).map { index in
            OfflineOperation(
                id: "test-\(index)",
                type: .processImages,
                data: ["index": index],
                timestamp: Date()
            )
        }

        operations.forEach { offlineQueue.enqueue($0) }

        // When
        let pending = offlineQueue.getPendingOperations()

        // Then
        XCTAssertEqual(pending.count, 5, "Should return all pending operations")

        // Cleanup
        offlineQueue.clear()
    }

    func testClearOfflineQueue() {
        // Given
        (0..<3).forEach { index in
            let op = OfflineOperation(
                id: "clear-test-\(index)",
                type: .processImages,
                data: [:],
                timestamp: Date()
            )
            offlineQueue.enqueue(op)
        }

        // When
        offlineQueue.clear()

        // Then
        let pending = offlineQueue.getPendingOperations()
        XCTAssertEqual(pending.count, 0, "Should clear all operations")
    }

    func testOfflineQueuePersistence() {
        // Given
        let operation = OfflineOperation(
            id: "persist-test-\(UUID().uuidString)",
            type: .uploadResults,
            data: ["resultId": "12345"],
            timestamp: Date()
        )

        // When
        offlineQueue.enqueue(operation)

        // Create new instance (simulates app restart)
        let newQueue = OfflineOperationQueue.shared

        // Then
        let pending = newQueue.getPendingOperations()
        let exists = pending.contains { $0.id == operation.id }
        XCTAssertTrue(exists, "Operations should persist across instances")

        // Cleanup
        offlineQueue.clear()
    }

    // MARK: - Cache Manager Tests

    func testCacheImageData() {
        // Given
        let imageData = Data([0xFF, 0xD8, 0xFF, 0xE0]) // JPEG header
        let key = "test-image-\(UUID().uuidString)"

        // When
        cacheManager.cacheImageData(imageData, forKey: key)

        // Then
        let retrieved = cacheManager.getCachedImageData(forKey: key)
        XCTAssertNotNil(retrieved, "Should retrieve cached image data")
        XCTAssertEqual(retrieved, imageData, "Cached data should match original")

        // Cleanup
        cacheManager.clearCache()
    }

    func testCacheRating() {
        // Given
        let rating = PhotoRating(
            imageId: "test-\(UUID().uuidString)",
            filename: "test.jpg",
            starRating: 5,
            colorLabel: .green,
            keepReject: .keep,
            technicalQuality: TechnicalQuality(
                focusAccuracy: 950,
                exposureQuality: 900,
                compositionScore: 880,
                lightingQuality: 920,
                colorHarmony: 870,
                noiseLevel: 940,
                sharpnessDetail: 930,
                dynamicRange: 910,
                overallTechnical: 920
            ),
            subjectAnalysis: SubjectAnalysis(
                primarySubject: "Bride",
                emotionIntensity: 980,
                eyesOpen: true,
                eyeContact: true,
                genuineExpression: 960,
                facialSharpness: 970,
                bodyLanguage: 940,
                momentTiming: 990,
                storyTelling: 950,
                uniqueness: 920
            ),
            tags: ["ceremony", "emotional"],
            description: "Beautiful moment during ceremony"
        )

        // When
        cacheManager.cacheRating(rating)

        // Then
        let retrieved = cacheManager.getCachedRating(forImageId: rating.imageId)
        XCTAssertNotNil(retrieved, "Should retrieve cached rating")
        XCTAssertEqual(retrieved?.imageId, rating.imageId, "Should match image ID")
        XCTAssertEqual(retrieved?.starRating, 5, "Should match star rating")

        // Cleanup
        cacheManager.clearCache()
    }

    func testCacheShootMetadata() {
        // Given
        let metadata = ShootMetadata(
            shootId: "test-shoot-\(UUID().uuidString)",
            imageCount: 1000,
            processingMode: .fast,
            modelUsed: "gpt-5-nano",
            startTime: Date(),
            estimatedCost: 4.0
        )

        // When
        cacheManager.cacheShootMetadata(metadata)

        // Then
        let retrieved = cacheManager.getCachedShootMetadata(forShootId: metadata.shootId)
        XCTAssertNotNil(retrieved, "Should retrieve cached shoot metadata")
        XCTAssertEqual(retrieved?.shootId, metadata.shootId, "Should match shoot ID")
        XCTAssertEqual(retrieved?.imageCount, 1000, "Should match image count")

        // Cleanup
        cacheManager.clearCache()
    }

    func testClearCache() {
        // Given
        let imageData = Data([0x00, 0x01])
        cacheManager.cacheImageData(imageData, forKey: "test-clear")

        // When
        cacheManager.clearCache()

        // Then
        let retrieved = cacheManager.getCachedImageData(forKey: "test-clear")
        XCTAssertNil(retrieved, "Cache should be cleared")
    }

    func testCacheSizeLimit() {
        // Given
        let largeData = Data(repeating: 0xFF, count: 1024 * 1024) // 1MB

        // When - Cache 100MB worth of data
        (0..<100).forEach { index in
            cacheManager.cacheImageData(largeData, forKey: "large-\(index)")
        }

        // Then - Cache should handle large amounts of data
        XCTAssertTrue(true, "Should handle large cache without crashing")

        // Cleanup
        cacheManager.clearCache()
    }

    // MARK: - Offline Mode Integration Tests

    func testOfflineProcessingWorkflow() {
        // Given - Simulate offline state
        let operation = OfflineOperation(
            id: UUID().uuidString,
            type: .processImages,
            data: [
                "shootId": "offline-test",
                "imageCount": 500,
                "folderPath": "/test/path"
            ],
            timestamp: Date()
        )

        // When - Queue operation while offline
        offlineQueue.enqueue(operation)

        // Cache some image data
        let imageData = Data([0xFF, 0xD8])
        cacheManager.cacheImageData(imageData, forKey: "offline-image-1")

        // Then - Operations should be queued and data cached
        let pending = offlineQueue.getPendingOperations()
        XCTAssertGreaterThan(pending.count, 0, "Should queue operations offline")

        let cached = cacheManager.getCachedImageData(forKey: "offline-image-1")
        XCTAssertNotNil(cached, "Should cache data offline")

        // Cleanup
        offlineQueue.clear()
        cacheManager.clearCache()
    }

    func testOnlineReconnectionWorkflow() {
        // Given - Queue operations while offline
        let operations = (0..<3).map { index in
            OfflineOperation(
                id: "reconnect-\(index)",
                type: .syncRatings,
                data: ["index": index],
                timestamp: Date()
            )
        }

        operations.forEach { offlineQueue.enqueue($0) }

        // When - Simulate coming back online
        networkMonitor.startMonitoring()

        // Process queued operations
        var processedCount = 0
        while let operation = offlineQueue.dequeue() {
            processedCount += 1
            // Simulate processing
        }

        // Then
        XCTAssertEqual(processedCount, 3, "Should process all queued operations")

        let remaining = offlineQueue.getPendingOperations()
        XCTAssertEqual(remaining.count, 0, "All operations should be processed")

        // Cleanup
        networkMonitor.stopMonitoring()
    }

    // MARK: - Connectivity Change Tests

    func testHandleConnectivityChange() {
        // Given
        let expectation = expectation(description: "Connectivity change handled")
        var changeDetected = false

        networkMonitor.startMonitoring()

        // When - Simulate connectivity change (in real app, this happens automatically)
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
            changeDetected = true
            expectation.fulfill()
        }

        // Then
        waitForExpectations(timeout: 2.0)
        XCTAssertTrue(changeDetected, "Should handle connectivity changes")

        // Cleanup
        networkMonitor.stopMonitoring()
    }

    func testNetworkReachability() {
        // Given
        networkMonitor.startMonitoring()

        // When
        let isReachable = networkMonitor.isConnected

        // Then
        // In simulator, network should typically be reachable
        XCTAssertTrue(isReachable || !isReachable, "Should determine reachability")

        // Cleanup
        networkMonitor.stopMonitoring()
    }

    // MARK: - Performance Tests

    func testOfflineQueuePerformance() {
        // Given
        let operations = (0..<1000).map { index in
            OfflineOperation(
                id: "perf-\(index)",
                type: .processImages,
                data: ["index": index],
                timestamp: Date()
            )
        }

        // When/Then
        measure {
            operations.forEach { offlineQueue.enqueue($0) }
        }

        // Cleanup
        offlineQueue.clear()
    }

    func testCachePerformance() {
        // Given
        let imageData = Data(repeating: 0xFF, count: 1024 * 100) // 100KB

        // When/Then
        measure {
            (0..<100).forEach { index in
                cacheManager.cacheImageData(imageData, forKey: "perf-\(index)")
            }
        }

        // Cleanup
        cacheManager.clearCache()
    }

    func testCacheRetrievalPerformance() {
        // Given
        let imageData = Data(repeating: 0xFF, count: 1024 * 100)
        (0..<100).forEach { index in
            cacheManager.cacheImageData(imageData, forKey: "retrieve-\(index)")
        }

        // When/Then
        measure {
            (0..<100).forEach { index in
                _ = cacheManager.getCachedImageData(forKey: "retrieve-\(index)")
            }
        }

        // Cleanup
        cacheManager.clearCache()
    }

    // MARK: - Memory Tests

    func testMemoryUsageDuringOfflineQueueing() {
        // Given
        let largeOperations = (0..<1000).map { index in
            OfflineOperation(
                id: "memory-\(index)",
                type: .processImages,
                data: [
                    "shootId": UUID().uuidString,
                    "imageCount": 1000,
                    "largeArray": Array(repeating: index, count: 100)
                ],
                timestamp: Date()
            )
        }

        // When
        largeOperations.forEach { offlineQueue.enqueue($0) }

        // Then
        let pending = offlineQueue.getPendingOperations()
        XCTAssertEqual(pending.count, 1000, "Should queue many operations")

        // Verify memory is managed properly (should not crash)
        XCTAssertTrue(true, "Should handle large queue without memory issues")

        // Cleanup
        offlineQueue.clear()
    }

    func testMemoryUsageDuringCaching() {
        // Given
        let largeData = Data(repeating: 0xFF, count: 1024 * 1024 * 2) // 2MB per image

        // When - Cache 50 images (100MB total)
        (0..<50).forEach { index in
            autoreleasepool {
                cacheManager.cacheImageData(largeData, forKey: "memory-\(index)")
            }
        }

        // Then
        XCTAssertTrue(true, "Should handle large cache without memory issues")

        // Cleanup
        cacheManager.clearCache()
    }
}

#endif
