//
//  AppleIntelligenceServiceTests.swift
//  kullTests
//
//  Created by Claude Code on 11/18/25.
//

import XCTest
@testable import kull

final class AppleIntelligenceServiceTests: XCTestCase {
    var sut: AppleIntelligenceService!

    override func setUp() {
        super.setUp()
        sut = AppleIntelligenceService()
    }

    override func tearDown() {
        sut = nil
        super.tearDown()
    }

    // MARK: - Initialization Tests

    func testInitialization() {
        XCTAssertNotNil(sut)
    }

    func testRecommendedBatchSize() {
        let batchSize = sut.recommendedBatchSize()
        XCTAssertGreaterThan(batchSize, 0)
        XCTAssertLessThanOrEqual(batchSize, 100, "Batch size should be reasonable")
    }

    // MARK: - Error Tests

    func testAppleIntelligenceErrorNotAvailable() {
        let error = AppleIntelligenceError.notAvailable
        XCTAssertNotNil(error)
    }

    func testAppleIntelligenceErrorInvalidResponse() {
        let error = AppleIntelligenceError.invalidResponse
        XCTAssertNotNil(error)
    }

    // MARK: - Metrics Tests

    func testMetricsInitialization() {
        let metrics = AppleIntelligenceService.Metrics(
            filename: "test.jpg",
            brightness: 0.5,
            contrast: 0.6,
            sharpness: 0.7,
            highlightsClipped: 0.1,
            shadowsClipped: 0.05,
            width: 1920,
            height: 1080
        )

        XCTAssertEqual(metrics.filename, "test.jpg")
        XCTAssertEqual(metrics.brightness, 0.5, accuracy: 0.01)
        XCTAssertEqual(metrics.contrast, 0.6, accuracy: 0.01)
        XCTAssertEqual(metrics.sharpness, 0.7, accuracy: 0.01)
        XCTAssertEqual(metrics.highlightsClipped, 0.1, accuracy: 0.01)
        XCTAssertEqual(metrics.shadowsClipped, 0.05, accuracy: 0.01)
        XCTAssertEqual(metrics.width, 1920)
        XCTAssertEqual(metrics.height, 1080)
    }

    // MARK: - Analysis Tests

    func testAnalysisInitialization() {
        let testURL = URL(fileURLWithPath: "/tmp/test.jpg")
        let metrics = AppleIntelligenceService.Metrics(
            filename: "test.jpg",
            brightness: 0.5,
            contrast: 0.6,
            sharpness: 0.7,
            highlightsClipped: 0.1,
            shadowsClipped: 0.05,
            width: 1920,
            height: 1080
        )
        let analysis = AppleIntelligenceService.Analysis(url: testURL, metrics: metrics)

        XCTAssertEqual(analysis.url, testURL)
        XCTAssertEqual(analysis.metrics.filename, "test.jpg")
    }

    // MARK: - AIImageContext Tests

    func testAIImageContextCodable() throws {
        let context = AppleIntelligenceService.AIImageContext(
            filename: "test.jpg",
            captureDate: "2025-11-18T12:00:00Z",
            cameraMake: "Canon",
            cameraModel: "EOS R5",
            lensModel: "RF 24-70mm F2.8",
            width: 8192,
            height: 5464,
            address: "123 Main St, City, State"
        )

        let encoder = JSONEncoder()
        let data = try encoder.encode(context)
        XCTAssertFalse(data.isEmpty)

        let decoder = JSONDecoder()
        let decoded = try decoder.decode(AppleIntelligenceService.AIImageContext.self, from: data)

        XCTAssertEqual(decoded.filename, "test.jpg")
        XCTAssertEqual(decoded.captureDate, "2025-11-18T12:00:00Z")
        XCTAssertEqual(decoded.cameraMake, "Canon")
        XCTAssertEqual(decoded.cameraModel, "EOS R5")
        XCTAssertEqual(decoded.lensModel, "RF 24-70mm F2.8")
        XCTAssertEqual(decoded.width, 8192)
        XCTAssertEqual(decoded.height, 5464)
        XCTAssertEqual(decoded.address, "123 Main St, City, State")
    }

    func testAIImageContextWithNilValues() throws {
        let context = AppleIntelligenceService.AIImageContext(
            filename: "test.jpg",
            captureDate: nil,
            cameraMake: nil,
            cameraModel: nil,
            lensModel: nil,
            width: nil,
            height: nil,
            address: nil
        )

        let encoder = JSONEncoder()
        let data = try encoder.encode(context)
        XCTAssertFalse(data.isEmpty)

        let decoder = JSONDecoder()
        let decoded = try decoder.decode(AppleIntelligenceService.AIImageContext.self, from: data)

        XCTAssertEqual(decoded.filename, "test.jpg")
        XCTAssertNil(decoded.captureDate)
        XCTAssertNil(decoded.cameraMake)
        XCTAssertNil(decoded.cameraModel)
        XCTAssertNil(decoded.lensModel)
        XCTAssertNil(decoded.width)
        XCTAssertNil(decoded.height)
        XCTAssertNil(decoded.address)
    }

    // MARK: - Batch Processing Tests

    func testRecommendedBatchSizeConsistency() {
        let size1 = sut.recommendedBatchSize()
        let size2 = sut.recommendedBatchSize()

        XCTAssertEqual(size1, size2, "Recommended batch size should be consistent")
    }

    // MARK: - Performance Tests

    func testMetricsCreationPerformance() {
        measure {
            for _ in 0..<1000 {
                _ = AppleIntelligenceService.Metrics(
                    filename: "test.jpg",
                    brightness: 0.5,
                    contrast: 0.6,
                    sharpness: 0.7,
                    highlightsClipped: 0.1,
                    shadowsClipped: 0.05,
                    width: 1920,
                    height: 1080
                )
            }
        }
    }

    func testAIImageContextEncodingPerformance() {
        let context = AppleIntelligenceService.AIImageContext(
            filename: "test.jpg",
            captureDate: "2025-11-18T12:00:00Z",
            cameraMake: "Canon",
            cameraModel: "EOS R5",
            lensModel: "RF 24-70mm F2.8",
            width: 8192,
            height: 5464,
            address: "123 Main St"
        )

        measure {
            for _ in 0..<100 {
                _ = try? JSONEncoder().encode(context)
            }
        }
    }

    // MARK: - Edge Cases

    func testMetricsWithZeroValues() {
        let metrics = AppleIntelligenceService.Metrics(
            filename: "test.jpg",
            brightness: 0.0,
            contrast: 0.0,
            sharpness: 0.0,
            highlightsClipped: 0.0,
            shadowsClipped: 0.0,
            width: 0,
            height: 0
        )

        XCTAssertEqual(metrics.brightness, 0.0)
        XCTAssertEqual(metrics.contrast, 0.0)
        XCTAssertEqual(metrics.sharpness, 0.0)
    }

    func testMetricsWithMaxValues() {
        let metrics = AppleIntelligenceService.Metrics(
            filename: "test.jpg",
            brightness: 1.0,
            contrast: 1.0,
            sharpness: 1.0,
            highlightsClipped: 1.0,
            shadowsClipped: 1.0,
            width: 10000,
            height: 10000
        )

        XCTAssertEqual(metrics.brightness, 1.0)
        XCTAssertEqual(metrics.contrast, 1.0)
        XCTAssertEqual(metrics.sharpness, 1.0)
    }

    func testAIImageContextWithEmptyFilename() throws {
        let context = AppleIntelligenceService.AIImageContext(
            filename: "",
            captureDate: nil,
            cameraMake: nil,
            cameraModel: nil,
            lensModel: nil,
            width: nil,
            height: nil,
            address: nil
        )

        XCTAssertEqual(context.filename, "")

        // Should still encode/decode successfully
        let data = try JSONEncoder().encode(context)
        let decoded = try JSONDecoder().decode(AppleIntelligenceService.AIImageContext.self, from: data)
        XCTAssertEqual(decoded.filename, "")
    }

    func testAIImageContextWithVeryLongValues() throws {
        let longString = String(repeating: "a", count: 10000)

        let context = AppleIntelligenceService.AIImageContext(
            filename: longString,
            captureDate: longString,
            cameraMake: longString,
            cameraModel: longString,
            lensModel: longString,
            width: Int.max,
            height: Int.max,
            address: longString
        )

        // Should encode without crashing
        let data = try JSONEncoder().encode(context)
        XCTAssertFalse(data.isEmpty)
    }
}
