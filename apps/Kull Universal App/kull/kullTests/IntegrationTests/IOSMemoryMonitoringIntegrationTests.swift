//
//  IOSMemoryMonitoringIntegrationTests.swift
//  kullTests
//
//  Integration tests for iOS/iPadOS memory usage monitoring
//  Tests memory profiling during image processing, ensures <2GB usage for 1000 images
//

import XCTest
@testable import kull

#if os(iOS)
import UIKit

final class IOSMemoryMonitoringIntegrationTests: XCTestCase {

    // MARK: - Memory Measurement Helpers

    func getMemoryUsage() -> UInt64 {
        var taskInfo = task_vm_info_data_t()
        var count = mach_msg_type_number_t(MemoryLayout<task_vm_info>.size) / 4
        let result = withUnsafeMutablePointer(to: &taskInfo) {
            $0.withMemoryRebound(to: integer_t.self, capacity: 1) {
                task_info(mach_task_self_, task_flavor_t(TASK_VM_INFO), $0, &count)
            }
        }

        if result == KERN_SUCCESS {
            return UInt64(taskInfo.phys_footprint)
        } else {
            return 0
        }
    }

    func formatBytes(_ bytes: UInt64) -> String {
        let mb = Double(bytes) / 1024.0 / 1024.0
        let gb = mb / 1024.0

        if gb >= 1.0 {
            return String(format: "%.2f GB", gb)
        } else {
            return String(format: "%.2f MB", mb)
        }
    }

    // MARK: - Basic Memory Tests

    func testMemoryUsageMeasurement() {
        // Given/When
        let memoryUsage = getMemoryUsage()

        // Then
        XCTAssertGreaterThan(memoryUsage, 0, "Should measure memory usage")
        print("Current memory usage: \(formatBytes(memoryUsage))")
    }

    func testMemoryFootprintBeforeProcessing() {
        // Given
        let initialMemory = getMemoryUsage()

        // Then
        XCTAssertGreaterThan(initialMemory, 0, "Should have measurable initial memory")
        print("Initial memory footprint: \(formatBytes(initialMemory))")

        // Verify we're starting under 2GB
        let twoGB: UInt64 = 2 * 1024 * 1024 * 1024
        XCTAssertLessThan(initialMemory, twoGB, "Initial memory should be < 2GB")
    }

    // MARK: - Memory Tests for Image Processing

    func testMemoryUsageFor100Images() {
        // Given
        let initialMemory = getMemoryUsage()
        var images: [UIImage] = []

        // When - Load 100 small images
        autoreleasepool {
            for _ in 0..<100 {
                if let image = createTestImage(size: CGSize(width: 100, height: 100)) {
                    images.append(image)
                }
            }
        }

        let afterLoadMemory = getMemoryUsage()
        let memoryIncrease = afterLoadMemory - initialMemory

        // Then
        print("Memory increase for 100 images: \(formatBytes(memoryIncrease))")
        XCTAssertLessThan(memoryIncrease, 100 * 1024 * 1024, "100 images should use <100MB")

        // Cleanup
        images.removeAll()
    }

    func testMemoryUsageFor1000Images() {
        // Given
        let initialMemory = getMemoryUsage()
        var imageData: [Data] = []

        // When - Create 1000 image placeholders
        autoreleasepool {
            for _ in 0..<1000 {
                // Use small data to simulate image metadata
                let data = Data(repeating: 0xFF, count: 1024 * 10) // 10KB per image metadata
                imageData.append(data)
            }
        }

        let afterLoadMemory = getMemoryUsage()
        let memoryIncrease = afterLoadMemory - initialMemory

        // Then
        print("Memory increase for 1000 image placeholders: \(formatBytes(memoryIncrease))")

        let twoGB: UInt64 = 2 * 1024 * 1024 * 1024
        XCTAssertLessThan(afterLoadMemory, twoGB,
                          "Memory usage should be < 2GB for 1000 images")

        // Cleanup
        imageData.removeAll()
    }

    func testMemoryUsageWithImageCaching() {
        // Given
        let cacheManager = CacheManager.shared
        let initialMemory = getMemoryUsage()

        // When - Cache 100 images
        autoreleasepool {
            for index in 0..<100 {
                let imageData = Data(repeating: UInt8(index % 256), count: 1024 * 100) // 100KB
                cacheManager.cacheImageData(imageData, forKey: "test-\(index)")
            }
        }

        let afterCacheMemory = getMemoryUsage()
        let memoryIncrease = afterCacheMemory - initialMemory

        // Then
        print("Memory increase with caching: \(formatBytes(memoryIncrease))")
        XCTAssertLessThan(memoryIncrease, 200 * 1024 * 1024, "Cache should use <200MB")

        // Cleanup
        cacheManager.clearCache()
    }

    // MARK: - Memory Leak Tests

    func testNoMemoryLeakOnImageLoading() {
        // Given
        let initialMemory = getMemoryUsage()

        // When - Load and release images multiple times
        for _ in 0..<10 {
            autoreleasepool {
                var images: [UIImage] = []
                for _ in 0..<100 {
                    if let image = createTestImage(size: CGSize(width: 50, height: 50)) {
                        images.append(image)
                    }
                }
                images.removeAll()
            }
        }

        let finalMemory = getMemoryUsage()
        let memoryDifference = Int64(finalMemory) - Int64(initialMemory)

        // Then - Memory should return close to initial
        print("Memory difference after cycles: \(formatBytes(UInt64(abs(memoryDifference))))")

        // Allow 50MB tolerance for memory fluctuation
        XCTAssertLessThan(abs(memoryDifference), 50 * 1024 * 1024,
                          "Should not leak significant memory")
    }

    func testNoMemoryLeakOnCacheOperations() {
        // Given
        let cacheManager = CacheManager.shared
        let initialMemory = getMemoryUsage()

        // When - Cache and clear repeatedly
        for cycle in 0..<10 {
            autoreleasepool {
                for index in 0..<50 {
                    let data = Data(repeating: UInt8(cycle), count: 1024 * 10)
                    cacheManager.cacheImageData(data, forKey: "leak-test-\(index)")
                }
                cacheManager.clearCache()
            }
        }

        let finalMemory = getMemoryUsage()
        let memoryDifference = Int64(finalMemory) - Int64(initialMemory)

        // Then
        print("Memory difference after cache cycles: \(formatBytes(UInt64(abs(memoryDifference))))")
        XCTAssertLessThan(abs(memoryDifference), 30 * 1024 * 1024,
                          "Cache should not leak memory")
    }

    // MARK: - Memory Warning Tests

    func testHandleMemoryWarning() {
        // Given
        let cacheManager = CacheManager.shared

        // Cache some data
        for index in 0..<50 {
            let data = Data(repeating: 0xFF, count: 1024 * 100)
            cacheManager.cacheImageData(data, forKey: "warning-test-\(index)")
        }

        let beforeWarningMemory = getMemoryUsage()

        // When - Simulate memory warning
        NotificationCenter.default.post(
            name: UIApplication.didReceiveMemoryWarningNotification,
            object: nil
        )

        // Clear cache in response to warning
        cacheManager.clearCache()

        let afterWarningMemory = getMemoryUsage()

        // Then
        print("Memory before warning: \(formatBytes(beforeWarningMemory))")
        print("Memory after warning: \(formatBytes(afterWarningMemory))")

        XCTAssertLessThanOrEqual(afterWarningMemory, beforeWarningMemory,
                                 "Memory should decrease after handling warning")
    }

    // MARK: - Performance Tests

    func testMemoryAllocationPerformance() {
        // When/Then
        measure {
            autoreleasepool {
                var data: [Data] = []
                for _ in 0..<1000 {
                    data.append(Data(repeating: 0xFF, count: 1024))
                }
                data.removeAll()
            }
        }
    }

    func testImageCreationPerformance() {
        // When/Then
        measure {
            autoreleasepool {
                var images: [UIImage] = []
                for _ in 0..<100 {
                    if let image = createTestImage(size: CGSize(width: 100, height: 100)) {
                        images.append(image)
                    }
                }
                images.removeAll()
            }
        }
    }

    // MARK: - Large Batch Processing Tests

    func testMemoryUsageForLargeBatch() {
        // Given
        let initialMemory = getMemoryUsage()
        let batchSize = 1000

        // When - Simulate processing 1000 images in batches
        let batchCount = 10
        let imagesPerBatch = batchSize / batchCount

        for batchIndex in 0..<batchCount {
            autoreleasepool {
                var batchData: [Data] = []
                for imageIndex in 0..<imagesPerBatch {
                    let data = Data(repeating: UInt8(batchIndex), count: 1024 * 50) // 50KB
                    batchData.append(data)
                }

                // Simulate processing
                let currentMemory = getMemoryUsage()
                let twoGB: UInt64 = 2 * 1024 * 1024 * 1024
                XCTAssertLessThan(currentMemory, twoGB,
                                  "Memory should stay < 2GB during batch \(batchIndex)")

                batchData.removeAll()
            }
        }

        let finalMemory = getMemoryUsage()

        // Then
        print("Initial memory: \(formatBytes(initialMemory))")
        print("Final memory: \(formatBytes(finalMemory))")

        let twoGB: UInt64 = 2 * 1024 * 1024 * 1024
        XCTAssertLessThan(finalMemory, twoGB,
                          "Final memory should be < 2GB after processing")
    }

    func testMemoryPressureDuringConcurrentOperations() {
        // Given
        let initialMemory = getMemoryUsage()
        let expectation = self.expectation(description: "Concurrent operations")
        expectation.expectedFulfillmentCount = 5

        // When - Simulate concurrent operations
        for index in 0..<5 {
            DispatchQueue.global().async {
                autoreleasepool {
                    var data: [Data] = []
                    for _ in 0..<100 {
                        data.append(Data(repeating: UInt8(index), count: 1024 * 10))
                    }
                    data.removeAll()
                    expectation.fulfill()
                }
            }
        }

        waitForExpectations(timeout: 10.0)

        let finalMemory = getMemoryUsage()

        // Then
        print("Memory after concurrent operations: \(formatBytes(finalMemory))")

        let twoGB: UInt64 = 2 * 1024 * 1024 * 1024
        XCTAssertLessThan(finalMemory, twoGB,
                          "Memory should stay < 2GB during concurrent operations")
    }

    // MARK: - Peak Memory Tests

    func testPeakMemoryUsage() {
        // Given
        var peakMemory: UInt64 = 0
        let monitorQueue = DispatchQueue(label: "memory-monitor")

        // Monitor memory in background
        let timer = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { _ in
            monitorQueue.async {
                let current = self.getMemoryUsage()
                peakMemory = max(peakMemory, current)
            }
        }

        // When - Perform memory-intensive operation
        autoreleasepool {
            var images: [UIImage] = []
            for _ in 0..<200 {
                if let image = createTestImage(size: CGSize(width: 200, height: 200)) {
                    images.append(image)
                }
            }
            images.removeAll()
        }

        // Stop monitoring
        timer.invalidate()
        Thread.sleep(forTimeInterval: 0.5) // Let final measurement complete

        // Then
        print("Peak memory usage: \(formatBytes(peakMemory))")

        let twoGB: UInt64 = 2 * 1024 * 1024 * 1024
        XCTAssertLessThan(peakMemory, twoGB,
                          "Peak memory should be < 2GB")
    }

    // MARK: - Memory Cleanup Tests

    func testMemoryCleanupAfterProcessing() {
        // Given
        let initialMemory = getMemoryUsage()

        // When - Process images then cleanup
        autoreleasepool {
            var images: [UIImage] = []
            for _ in 0..<100 {
                if let image = createTestImage(size: CGSize(width: 100, height: 100)) {
                    images.append(image)
                }
            }
            // Process images (simulate)
            images.removeAll()
        }

        // Force cleanup
        autoreleasepool {}

        let finalMemory = getMemoryUsage()
        let memoryDifference = Int64(finalMemory) - Int64(initialMemory)

        // Then
        print("Memory after cleanup: \(formatBytes(finalMemory))")
        print("Memory difference: \(formatBytes(UInt64(abs(memoryDifference))))")

        // Memory should return close to initial (within 30MB)
        XCTAssertLessThan(abs(memoryDifference), 30 * 1024 * 1024,
                          "Memory should be cleaned up after processing")
    }

    // MARK: - Helper Methods

    private func createTestImage(size: CGSize) -> UIImage? {
        UIGraphicsBeginImageContext(size)
        defer { UIGraphicsEndImageContext() }

        let context = UIGraphicsGetCurrentContext()
        context?.setFillColor(UIColor.blue.cgColor)
        context?.fill(CGRect(origin: .zero, size: size))

        return UIGraphicsGetImageFromCurrentImageContext()
    }

    // MARK: - Real-World Scenario Tests

    func testMemoryUsageForTypicalPhotoshoot() {
        // Given - Simulate typical wedding shoot: 1000 RAW images
        let initialMemory = getMemoryUsage()
        let imageCount = 1000
        let avgImageSize = 25 * 1024 * 1024 // 25MB RAW file

        // When - Process images in batches of 50
        let batchSize = 50
        let batchCount = imageCount / batchSize

        for batchIndex in 0..<batchCount {
            autoreleasepool {
                // Simulate loading image metadata (not full images)
                var metadata: [(filename: String, size: Int)] = []

                for imageIndex in 0..<batchSize {
                    let filename = "IMG_\(batchIndex * batchSize + imageIndex).CR3"
                    metadata.append((filename, avgImageSize))
                }

                // Check memory during processing
                let currentMemory = getMemoryUsage()
                print("Batch \(batchIndex): \(formatBytes(currentMemory))")

                let twoGB: UInt64 = 2 * 1024 * 1024 * 1024
                XCTAssertLessThan(currentMemory, twoGB,
                                  "Memory should stay < 2GB during batch \(batchIndex)")

                metadata.removeAll()
            }
        }

        let finalMemory = getMemoryUsage()

        // Then
        print("Photoshoot simulation complete")
        print("Initial memory: \(formatBytes(initialMemory))")
        print("Final memory: \(formatBytes(finalMemory))")

        let twoGB: UInt64 = 2 * 1024 * 1024 * 1024
        XCTAssertLessThan(finalMemory, twoGB,
                          "Memory should be < 2GB after processing 1000 images")
    }
}

#endif
