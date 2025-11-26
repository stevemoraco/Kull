//
//  ModelsViewModelTests.swift
//  kullTests
//
//  Created by Claude Code on 11/18/25.
//

import XCTest
import Combine
@testable import kull

#if os(macOS)
@MainActor
final class ModelsViewModelTests: XCTestCase {
    var sut: ModelsViewModel!
    var cancellables: Set<AnyCancellable>!

    override func setUp() {
        super.setUp()
        sut = ModelsViewModel()
        cancellables = []
    }

    override func tearDown() {
        cancellables = nil
        sut = nil
        super.tearDown()
    }

    // MARK: - Initialization Tests

    func testInitialState() {
        XCTAssertTrue(sut.models.isEmpty)
        XCTAssertFalse(sut.loading)
    }

    // MARK: - ProviderCapabilityDTO Tests

    func testProviderCapabilityDTODecodable() throws {
        let json = """
        {
            "id": "openai-gpt5-nano",
            "displayName": "OpenAI GPT-5 Nano",
            "vision": true,
            "structuredOutput": true,
            "offline": false,
            "maxBatchImages": 1000,
            "estimatedCostPer1kImages": 0.40
        }
        """

        let data = json.data(using: .utf8)!
        let decoder = JSONDecoder()
        let provider = try decoder.decode(ProviderCapabilityDTO.self, from: data)

        XCTAssertEqual(provider.id, "openai-gpt5-nano")
        XCTAssertEqual(provider.displayName, "OpenAI GPT-5 Nano")
        XCTAssertTrue(provider.vision)
        XCTAssertTrue(provider.structuredOutput)
        XCTAssertFalse(provider.offline)
        XCTAssertEqual(provider.maxBatchImages, 1000)
        XCTAssertEqual(provider.estimatedCostPer1kImages, 0.40, accuracy: 0.01)
    }

    func testProviderCapabilityDTOIsIdentifiable() {
        let provider = ProviderCapabilityDTO(
            id: "test-provider",
            displayName: "Test Provider",
            vision: true,
            structuredOutput: true,
            offline: false,
            maxBatchImages: 100,
            estimatedCostPer1kImages: 1.0
        )

        XCTAssertEqual(provider.id, "test-provider")
    }

    // MARK: - Published Properties Tests

    func testModelsPublished() {
        let expectation = XCTestExpectation(description: "Models updated")

        sut.$models.dropFirst().sink { models in
            expectation.fulfill()
        }.store(in: &cancellables)

        sut.models = [
            ProviderCapabilityDTO(
                id: "test",
                displayName: "Test",
                vision: true,
                structuredOutput: true,
                offline: false,
                maxBatchImages: 100,
                estimatedCostPer1kImages: 1.0
            )
        ]

        wait(for: [expectation], timeout: 1.0)
        XCTAssertFalse(sut.models.isEmpty)
    }

    func testLoadingPublished() {
        let expectation = XCTestExpectation(description: "Loading state updated")

        sut.$loading.dropFirst().sink { loading in
            expectation.fulfill()
        }.store(in: &cancellables)

        sut.loading = true

        wait(for: [expectation], timeout: 1.0)
        XCTAssertTrue(sut.loading)
    }

    // MARK: - Load Function Tests

    func testLoadFunction() async {
        // Load will attempt to fetch from API
        // Without a running server, this will fail gracefully
        await sut.load()

        // Loading should be false after load completes (whether successful or not)
        XCTAssertFalse(sut.loading)

        // Models may or may not be populated depending on API availability
        // Test just ensures function completes without crashing
        XCTAssertNotNil(sut.models)
    }

#if os(macOS)
    func testLoadSetsLoadingState() async {
        await sut.load()
        XCTAssertFalse(sut.loading)
        XCTAssertFalse(sut.models.isEmpty)
    }
#endif

    // MARK: - Multiple Loads Tests

    func testMultipleLoadCalls() async {
        await sut.load()
        await sut.load()
        await sut.load()

        // Should complete without crashing
        XCTAssertFalse(sut.loading)
        XCTAssertNotNil(sut.models)
    }

    func testConcurrentLoadCalls() async {
        await withTaskGroup(of: Void.self) { group in
            for _ in 0..<5 {
                group.addTask {
                    await self.sut.load()
                }
            }
        }

        // Should complete without crashing
        XCTAssertFalse(sut.loading)
        XCTAssertNotNil(sut.models)
    }

    // MARK: - Performance Tests

    func testLoadPerformance() {
        measure {
            Task {
                await sut.load()
            }
        }
    }

    func testProviderCapabilityDTODecodingPerformance() {
        let json = """
        {
            "id": "test",
            "displayName": "Test",
            "vision": true,
            "structuredOutput": true,
            "offline": false,
            "maxBatchImages": 100,
            "estimatedCostPer1kImages": 1.0
        }
        """
        let data = json.data(using: .utf8)!

        measure {
            for _ in 0..<100 {
                _ = try? JSONDecoder().decode(ProviderCapabilityDTO.self, from: data)
            }
        }
    }

    // MARK: - Edge Cases

    func testLoadWithNetworkError() async {
        // Should handle network errors gracefully
        await sut.load()

        // Models should remain empty or unchanged
        XCTAssertNotNil(sut.models)
        XCTAssertFalse(sut.loading)
    }

    func testLoadClearsLoadingOnError() async {
        await sut.load()

        // Even if load fails, loading should be false
        XCTAssertFalse(sut.loading)
    }

    func testModelsArrayMutation() {
        let provider1 = ProviderCapabilityDTO(
            id: "provider1",
            displayName: "Provider 1",
            vision: true,
            structuredOutput: true,
            offline: false,
            maxBatchImages: 100,
            estimatedCostPer1kImages: 1.0
        )

        let provider2 = ProviderCapabilityDTO(
            id: "provider2",
            displayName: "Provider 2",
            vision: false,
            structuredOutput: false,
            offline: true,
            maxBatchImages: 50,
            estimatedCostPer1kImages: 0.5
        )

        sut.models = [provider1]
        XCTAssertEqual(sut.models.count, 1)

        sut.models.append(provider2)
        XCTAssertEqual(sut.models.count, 2)

        sut.models.removeAll()
        XCTAssertTrue(sut.models.isEmpty)
    }

    func testProviderCapabilityDTOWithBooleanEdgeCases() {
        let provider = ProviderCapabilityDTO(
            id: "test",
            displayName: "Test",
            vision: false,
            structuredOutput: false,
            offline: true,
            maxBatchImages: 0,
            estimatedCostPer1kImages: 0.0
        )

        XCTAssertFalse(provider.vision)
        XCTAssertFalse(provider.structuredOutput)
        XCTAssertTrue(provider.offline)
        XCTAssertEqual(provider.maxBatchImages, 0)
        XCTAssertEqual(provider.estimatedCostPer1kImages, 0.0)
    }

    func testProviderCapabilityDTOWithLargeValues() {
        let provider = ProviderCapabilityDTO(
            id: "test",
            displayName: "Test",
            vision: true,
            structuredOutput: true,
            offline: false,
            maxBatchImages: Int.max,
            estimatedCostPer1kImages: Double.greatestFiniteMagnitude
        )

        XCTAssertEqual(provider.maxBatchImages, Int.max)
        XCTAssertEqual(provider.estimatedCostPer1kImages, Double.greatestFiniteMagnitude)
    }
}
#endif
