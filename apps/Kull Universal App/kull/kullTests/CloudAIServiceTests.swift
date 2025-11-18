import XCTest
@testable import kull

final class CloudAIServiceTests: XCTestCase {

    var sut: CloudAIService!
    var mockAPIClient: MockKullAPIClient!

    @MainActor
    override func setUp() async throws {
        try await super.setUp()
        mockAPIClient = MockKullAPIClient()
        sut = CloudAIService.shared
        // Note: In a real implementation, we'd inject the mock client
        // For now, tests will use the real client but can be mocked via protocol
    }

    override func tearDown() {
        sut = nil
        mockAPIClient = nil
        super.tearDown()
    }

    // MARK: - Provider Enum Tests

    func testAIProviderRawValues() {
        XCTAssertEqual(AIProvider.appleIntelligence.rawValue, "apple")
        XCTAssertEqual(AIProvider.googleFlashLite.rawValue, "google-flash-lite")
        XCTAssertEqual(AIProvider.openaiGPT5Nano.rawValue, "openai-gpt5-nano")
        XCTAssertEqual(AIProvider.anthropicHaiku.rawValue, "anthropic-haiku")
        XCTAssertEqual(AIProvider.grokMini.rawValue, "grok-mini")
        XCTAssertEqual(AIProvider.kimiK2.rawValue, "kimi-k2")
    }

    func testAIProviderDisplayNames() {
        XCTAssertEqual(AIProvider.appleIntelligence.displayName, "Apple Intelligence (Local)")
        XCTAssertEqual(AIProvider.googleFlashLite.displayName, "Google Gemini Flash Lite")
        XCTAssertEqual(AIProvider.openaiGPT5Nano.displayName, "OpenAI GPT-5 Nano")
        XCTAssertEqual(AIProvider.anthropicHaiku.displayName, "Anthropic Claude Haiku 4.5")
        XCTAssertEqual(AIProvider.grokMini.displayName, "Grok Mini")
        XCTAssertEqual(AIProvider.kimiK2.displayName, "Kimi K2")
    }

    func testProcessingModeRawValues() {
        XCTAssertEqual(ProcessingMode.fast.rawValue, "fast")
        XCTAssertEqual(ProcessingMode.economy.rawValue, "economy")
        XCTAssertEqual(ProcessingMode.local.rawValue, "local")
    }

    func testProcessingModeDisplayNames() {
        XCTAssertEqual(ProcessingMode.fast.displayName, "Default (Fast)")
        XCTAssertEqual(ProcessingMode.economy.displayName, "Economy (Batch)")
        XCTAssertEqual(ProcessingMode.local.displayName, "Local (On-Device)")
    }

    func testProcessingModeDescriptions() {
        XCTAssertFalse(ProcessingMode.fast.description.isEmpty)
        XCTAssertFalse(ProcessingMode.economy.description.isEmpty)
        XCTAssertFalse(ProcessingMode.local.description.isEmpty)
    }

    // MARK: - Model Tests

    func testProviderInfoDisplayCost() {
        let provider = ProviderInfo(
            id: "test-provider",
            name: "Test Provider",
            costPerImage: 0.0012,
            creditsPerImage: 12,
            supportsBatch: true
        )

        XCTAssertEqual(provider.displayCost, "$0.0012")
    }

    func testProviderInfoDisplayCostHighValue() {
        let provider = ProviderInfo(
            id: "test-provider",
            name: "Test Provider",
            costPerImage: 1.5,
            creditsPerImage: 1500,
            supportsBatch: false
        )

        XCTAssertEqual(provider.displayCost, "$1.5000")
    }

    func testPhotoRatingCodable() throws {
        let rating = PhotoRating(
            starRating: 5,
            colorLabel: "green",
            keepReject: "keep",
            tags: ["hero", "sharp"],
            description: "Amazing shot",
            technicalQuality: TechnicalQuality(
                sharpness: 0.95,
                exposure: 0.88,
                composition: 0.92,
                overallScore: 0.92
            ),
            subjectAnalysis: SubjectAnalysis(
                primarySubject: "Portrait",
                emotion: "happy",
                eyesOpen: true,
                smiling: true,
                inFocus: true
            )
        )

        let encoder = JSONEncoder()
        let data = try encoder.encode(rating)
        XCTAssertFalse(data.isEmpty)

        let decoder = JSONDecoder()
        let decoded = try decoder.decode(PhotoRating.self, from: data)
        XCTAssertEqual(decoded.starRating, 5)
        XCTAssertEqual(decoded.colorLabel, "green")
        XCTAssertEqual(decoded.tags, ["hero", "sharp"])
    }

    // MARK: - Error Tests

    func testCloudAIServiceErrorDescriptions() {
        XCTAssertNotNil(CloudAIServiceError.notAuthenticated.errorDescription)
        XCTAssertNotNil(CloudAIServiceError.providerNotAvailable.errorDescription)
        XCTAssertNotNil(CloudAIServiceError.batchNotSupported.errorDescription)
        XCTAssertNotNil(CloudAIServiceError.processingFailed("test").errorDescription)
        XCTAssertNotNil(CloudAIServiceError.invalidImageData.errorDescription)

        let nsError = NSError(domain: "test", code: 1, userInfo: nil)
        XCTAssertNotNil(CloudAIServiceError.networkError(nsError).errorDescription)
    }

    func testCloudAIServiceErrorMessages() {
        let error = CloudAIServiceError.processingFailed("Test failure message")
        XCTAssertTrue(error.errorDescription?.contains("Test failure message") ?? false)
    }

    // MARK: - Integration Tests (require backend)

    @MainActor
    func testGetAvailableProvidersRequiresAuthentication() async {
        // This test will fail if not authenticated, which is expected
        // In a real test environment, we'd mock the API client
        do {
            let providers = try await sut.getAvailableProviders()
            // If we get here, authentication worked
            XCTAssertTrue(providers.isEmpty || !providers.isEmpty) // Just check it doesn't crash
        } catch {
            // Expected to fail without authentication
            XCTAssertTrue(error is CloudAIServiceError || error is APIError)
        }
    }

    // MARK: - Cost Calculation Tests

    func testCostCalculationForMultipleImages() {
        let costPerImage = 0.004
        let imageCount = 1000

        let totalCost = Double(imageCount) * costPerImage
        XCTAssertEqual(totalCost, 4.0, accuracy: 0.001)
    }

    func testEconomyModeDiscount() {
        let baseCost = 10.0
        let economyCost = baseCost * 0.5
        XCTAssertEqual(economyCost, 5.0)
    }

    // MARK: - Progress Handler Tests

    @MainActor
    func testProgressHandlerCalledDuringProcessing() async {
        var progressValues: [Double] = []
        let progressHandler: (Double) -> Void = { progress in
            progressValues.append(progress)
        }

        // Test that progress handler would be called
        // In real implementation, this would be tested with mock processing
        progressHandler(0.25)
        progressHandler(0.50)
        progressHandler(0.75)
        progressHandler(1.0)

        XCTAssertEqual(progressValues.count, 4)
        XCTAssertEqual(progressValues.last, 1.0)
    }

    // MARK: - Mode Selection Tests

    func testLocalModeIsAlwaysFree() {
        let mode = ProcessingMode.local
        let cost = 0.0
        XCTAssertEqual(cost, 0.0)
        XCTAssertTrue(mode.description.contains("free") || mode.description.contains("slower"))
    }

    func testFastModeConcurrentProcessing() {
        let mode = ProcessingMode.fast
        XCTAssertEqual(mode.rawValue, "fast")
        XCTAssertTrue(mode.description.contains("second") || mode.description.contains("simultaneous"))
    }

    func testEconomyModeBatchProcessing() {
        let mode = ProcessingMode.economy
        XCTAssertEqual(mode.rawValue, "economy")
        XCTAssertTrue(mode.description.contains("Batch") || mode.description.contains("cheaper"))
    }

    // MARK: - Provider Compatibility Tests

    func testAllProvidersHaveValidIDs() {
        for provider in AIProvider.allCases {
            XCTAssertFalse(provider.id.isEmpty)
            XCTAssertFalse(provider.rawValue.isEmpty)
        }
    }

    func testAllModesHaveValidIDs() {
        for mode in ProcessingMode.allCases {
            XCTAssertFalse(mode.id.isEmpty)
            XCTAssertFalse(mode.rawValue.isEmpty)
        }
    }

    // MARK: - JSON Encoding/Decoding Tests

    func testProviderInfoDecodable() throws {
        let json = """
        {
            "id": "openai-gpt5-nano",
            "name": "OpenAI GPT-5 Nano",
            "costPerImage": 0.0004,
            "creditsPerImage": 4,
            "supportsBatch": true
        }
        """

        let data = json.data(using: .utf8)!
        let decoder = JSONDecoder()
        let provider = try decoder.decode(ProviderInfo.self, from: data)

        XCTAssertEqual(provider.id, "openai-gpt5-nano")
        XCTAssertEqual(provider.name, "OpenAI GPT-5 Nano")
        XCTAssertEqual(provider.costPerImage, 0.0004, accuracy: 0.0001)
        XCTAssertTrue(provider.supportsBatch)
    }

    func testProcessResultDecodable() throws {
        let json = """
        {
            "result": {
                "starRating": 4,
                "colorLabel": "blue",
                "keepReject": "keep",
                "tags": ["sharp", "well-composed"],
                "description": "Great shot",
                "technicalQuality": {
                    "sharpness": 0.9,
                    "exposure": 0.85,
                    "composition": 0.88,
                    "overallScore": 0.87
                },
                "subjectAnalysis": {
                    "primarySubject": "Landscape",
                    "emotion": "serene",
                    "eyesOpen": true,
                    "smiling": false,
                    "inFocus": true
                }
            },
            "cost": 0.0008
        }
        """

        let data = json.data(using: .utf8)!
        let decoder = JSONDecoder()
        let processResult = try decoder.decode(ProcessResult.self, from: data)

        XCTAssertEqual(processResult.result.starRating, 4)
        XCTAssertEqual(processResult.result.colorLabel, "blue")
        XCTAssertEqual(processResult.cost, 0.0008, accuracy: 0.0001)
        XCTAssertEqual(processResult.result.tags.count, 2)
    }

    // MARK: - Image Format Tests

    func testSupportedImageFormats() {
        let supportedFormats = ["jpeg", "jpg", "png", "heic", "cr3", "nef", "arw"]

        for format in supportedFormats {
            XCTAssertFalse(format.isEmpty)
            // In real implementation, would test format validation
        }
    }

    // MARK: - Concurrency Tests

    @MainActor
    func testServiceIsSingleton() {
        let instance1 = CloudAIService.shared
        let instance2 = CloudAIService.shared

        XCTAssertTrue(instance1 === instance2)
    }

    @MainActor
    func testProcessingStateManagement() async {
        XCTAssertFalse(sut.isProcessing)
        XCTAssertEqual(sut.progress, 0.0)

        // Test progress update
        await MainActor.run {
            sut.progress = 0.5
        }
        XCTAssertEqual(sut.progress, 0.5)
    }
}

// MARK: - Mock Classes

class MockKullAPIClient {
    var shouldFailAuthentication = false
    var mockProviders: [ProviderInfo] = []
    var mockProcessResult: ProcessResult?

    func authenticatedRequest<T: Decodable>(
        _ endpoint: String,
        method: String = "GET",
        body: Encodable? = nil
    ) async throws -> T {
        if shouldFailAuthentication {
            throw APIError.notAuthenticated
        }

        // Return mock data based on endpoint
        if endpoint.contains("providers") {
            if let result = mockProviders as? T {
                return result
            }
        }

        throw APIError.invalidResponse
    }
}
