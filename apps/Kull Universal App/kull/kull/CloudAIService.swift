import Foundation
import OSLog
import Combine

enum AIProvider: String, Codable, CaseIterable, Identifiable {
    case appleIntelligence = "apple"
    case googleFlashLite = "google-flash-lite"
    case openaiGPT5Nano = "openai-gpt5-nano"
    case anthropicHaiku = "anthropic-haiku"
    case grokMini = "grok-mini"
    case kimiK2 = "kimi-k2"

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .appleIntelligence:
            return "Apple Intelligence (Local)"
        case .googleFlashLite:
            return "Google Gemini Flash Lite"
        case .openaiGPT5Nano:
            return "OpenAI GPT-5 Nano"
        case .anthropicHaiku:
            return "Anthropic Claude Haiku 4.5"
        case .grokMini:
            return "Grok Mini"
        case .kimiK2:
            return "Kimi K2"
        }
    }
}

enum ProcessingMode: String, Codable, CaseIterable, Identifiable {
    case fast = "fast"
    case economy = "economy"
    case local = "local"

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .fast:
            return "Default (Fast)"
        case .economy:
            return "Economy (Batch)"
        case .local:
            return "Local (On-Device)"
        }
    }

    var description: String {
        switch self {
        case .fast:
            return "All photos processed simultaneously in seconds"
        case .economy:
            return "Batch processing, 50% cheaper, takes 10-30 minutes"
        case .local:
            return "On-device processing, free but slower"
        }
    }
}

struct ProviderInfo: Codable, Identifiable {
    let id: String
    let name: String
    let costPerImage: Double
    let creditsPerImage: Int
    let supportsBatch: Bool

    var displayCost: String {
        String(format: "$%.4f", costPerImage)
    }
}

struct ProcessResult: Codable {
    let result: PhotoRating
    let cost: Double
}

struct PhotoRating: Codable {
    let starRating: Int
    let colorLabel: String
    let keepReject: String
    let tags: [String]
    let description: String
    let technicalQuality: TechnicalQuality
    let subjectAnalysis: SubjectAnalysis
}

struct TechnicalQuality: Codable {
    let sharpness: Double
    let exposure: Double
    let composition: Double
    let overallScore: Double
}

struct SubjectAnalysis: Codable {
    let primarySubject: String
    let emotion: String
    let eyesOpen: Bool
    let smiling: Bool
    let inFocus: Bool
}

// MARK: - API Request/Response Models

private struct ProcessSingleRequest: Encodable {
    let provider: String
    let imageData: String // base64
    let imageFormat: String
    let prompt: String
    let systemPrompt: String?
}

private struct ProcessBatchRequest: Encodable {
    let provider: String
    let images: [BatchImage]
    let prompt: String
    let systemPrompt: String?
}

private struct BatchImage: Encodable {
    let imageData: String // base64
    let imageFormat: String
    let filename: String
}

private struct ProvidersResponse: Decodable {
    let providers: [ProviderInfo]
}

private struct BatchJobResponse: Decodable {
    let jobId: String
    let status: String
    let estimatedCompletion: String?
}

private struct BatchStatusResponse: Decodable {
    let jobId: String
    let status: String
    let progress: Double
    let totalImages: Int
    let processedImages: Int
    let results: [ProcessResult]?
    let totalCost: Double?
}

// MARK: - Cloud AI Service Error

enum CloudAIServiceError: Error, LocalizedError {
    case notAuthenticated
    case providerNotAvailable
    case batchNotSupported
    case processingFailed(String)
    case invalidImageData
    case networkError(Error)

    var errorDescription: String? {
        switch self {
        case .notAuthenticated:
            return "Not authenticated. Please log in."
        case .providerNotAvailable:
            return "Selected AI provider is not available."
        case .batchNotSupported:
            return "Batch processing not supported by this provider."
        case .processingFailed(let message):
            return "Processing failed: \(message)"
        case .invalidImageData:
            return "Invalid image data."
        case .networkError(let error):
            return "Network error: \(error.localizedDescription)"
        }
    }
}

// MARK: - Cloud AI Service

@MainActor
class CloudAIService: ObservableObject {
    static let shared = CloudAIService()

    private let logger = Logger(subsystem: "com.kull.app", category: "CloudAIService")
    private let apiClient = KullAPIClient.shared
    private let appleService = AppleIntelligenceService()

    @Published var isProcessing = false
    @Published var progress: Double = 0.0

    private init() {}

    // MARK: - Provider Management

    func getAvailableProviders() async throws -> [ProviderInfo] {
        logger.info("Fetching available AI providers")

        do {
            let response: ProvidersResponse = try await apiClient.authenticatedRequest(
                "/api/ai/providers",
                method: "GET"
            )
            logger.info("Received \(response.providers.count) providers")
            return response.providers
        } catch {
            logger.error("Failed to fetch providers: \(error.localizedDescription)")
            throw CloudAIServiceError.networkError(error)
        }
    }

    // MARK: - Single Image Processing

    func processSingleImage(
        provider: AIProvider,
        imageData: Data,
        imageFormat: String = "jpeg",
        prompt: String,
        systemPrompt: String? = nil
    ) async throws -> (result: PhotoRating, cost: Double) {
        logger.info("Processing single image with provider: \(provider.rawValue)")

        // Handle local processing separately
        if provider == .appleIntelligence {
            return try await processLocalImage(imageData: imageData, prompt: prompt)
        }

        let base64Image = imageData.base64EncodedString()

        let body = ProcessSingleRequest(
            provider: provider.rawValue,
            imageData: base64Image,
            imageFormat: imageFormat,
            prompt: prompt,
            systemPrompt: systemPrompt
        )

        do {
            let result: ProcessResult = try await apiClient.authenticatedRequest(
                "/api/ai/process-single",
                method: "POST",
                body: body
            )
            logger.info("Successfully processed image, cost: $\(String(format: "%.4f", result.cost))")
            return (result.result, result.cost)
        } catch {
            logger.error("Failed to process image: \(error.localizedDescription)")
            throw CloudAIServiceError.processingFailed(error.localizedDescription)
        }
    }

    // MARK: - Batch Processing

    func processBatch(
        provider: AIProvider,
        mode: ProcessingMode,
        images: [(Data, String, String)], // (imageData, filename, format)
        prompt: String,
        systemPrompt: String? = nil,
        progressHandler: ((Double) -> Void)? = nil
    ) async throws -> (results: [PhotoRating], totalCost: Double) {
        logger.info("Processing batch of \(images.count) images with mode: \(mode.rawValue)")

        // Handle local processing
        if mode == .local || provider == .appleIntelligence {
            return try await processLocalBatch(images: images, prompt: prompt, progressHandler: progressHandler)
        }

        // Handle fast mode (concurrent requests)
        if mode == .fast {
            return try await processFastConcurrent(
                provider: provider,
                images: images,
                prompt: prompt,
                systemPrompt: systemPrompt,
                progressHandler: progressHandler
            )
        }

        // Handle economy mode (batch API)
        if mode == .economy {
            return try await processEconomyBatch(
                provider: provider,
                images: images,
                prompt: prompt,
                systemPrompt: systemPrompt,
                progressHandler: progressHandler
            )
        }

        throw CloudAIServiceError.processingFailed("Invalid processing mode")
    }

    // MARK: - Private Processing Methods

    private func processLocalImage(
        imageData: Data,
        prompt: String
    ) async throws -> (result: PhotoRating, cost: Double) {
        logger.info("Processing local image with Apple Intelligence")

        // Create temporary file for Apple Intelligence service
        let tempURL = FileManager.default.temporaryDirectory
            .appendingPathComponent(UUID().uuidString)
            .appendingPathExtension("jpg")

        try imageData.write(to: tempURL)
        defer { try? FileManager.default.removeItem(at: tempURL) }

        let resultData = try await appleService.process(images: [tempURL], prompt: prompt)
        let response = try JSONDecoder().decode(RatingsResponse.self, from: resultData)

        guard let rating = response.ratings.first else {
            throw CloudAIServiceError.processingFailed("No rating returned from Apple Intelligence")
        }

        // Convert RatingItem to PhotoRating
        let photoRating = PhotoRating(
            starRating: rating.star,
            colorLabel: rating.color ?? "",
            keepReject: rating.star >= 3 ? "keep" : "reject",
            tags: rating.tags ?? [],
            description: rating.description ?? "",
            technicalQuality: TechnicalQuality(
                sharpness: 0.8,
                exposure: 0.8,
                composition: 0.8,
                overallScore: Double(rating.star) / 5.0
            ),
            subjectAnalysis: SubjectAnalysis(
                primarySubject: rating.title ?? "Unknown",
                emotion: "neutral",
                eyesOpen: true,
                smiling: false,
                inFocus: true
            )
        )

        return (photoRating, 0.0) // Local processing is free
    }

    private func processLocalBatch(
        images: [(Data, String, String)],
        prompt: String,
        progressHandler: ((Double) -> Void)?
    ) async throws -> (results: [PhotoRating], totalCost: Double) {
        logger.info("Processing \(images.count) images locally")

        isProcessing = true
        progress = 0.0
        defer { isProcessing = false }

        var results: [PhotoRating] = []

        for (index, (imageData, filename, _)) in images.enumerated() {
            do {
                let (rating, _) = try await processLocalImage(imageData: imageData, prompt: prompt)
                results.append(rating)
            } catch {
                logger.warning("Failed to process \(filename): \(error.localizedDescription)")
                // Continue processing other images
            }

            let currentProgress = Double(index + 1) / Double(images.count)
            progress = currentProgress
            progressHandler?(currentProgress)
        }

        return (results, 0.0) // Local processing is free
    }

    private func processFastConcurrent(
        provider: AIProvider,
        images: [(Data, String, String)],
        prompt: String,
        systemPrompt: String?,
        progressHandler: ((Double) -> Void)?
    ) async throws -> (results: [PhotoRating], totalCost: Double) {
        logger.info("Processing \(images.count) images concurrently (fast mode)")

        isProcessing = true
        progress = 0.0
        defer { isProcessing = false }

        var results: [PhotoRating] = []
        var totalCost = 0.0
        let completed = OSAllocatedUnfairLock(initialState: 0)

        // Process all images concurrently
        await withTaskGroup(of: (PhotoRating?, Double).self) { group in
            for (imageData, _, format) in images {
                group.addTask {
                    do {
                        let (rating, cost) = try await self.processSingleImage(
                            provider: provider,
                            imageData: imageData,
                            imageFormat: format,
                            prompt: prompt,
                            systemPrompt: systemPrompt
                        )
                        return (rating, cost)
                    } catch {
                        self.logger.warning("Failed to process image: \(error.localizedDescription)")
                        return (nil, 0.0)
                    }
                }
            }

            for await (rating, cost) in group {
                if let rating = rating {
                    results.append(rating)
                }
                totalCost += cost

                let count = completed.withLock { value in
                    value += 1
                    return value
                }

                let currentProgress = Double(count) / Double(images.count)
                await MainActor.run {
                    self.progress = currentProgress
                }
                progressHandler?(currentProgress)
            }
        }

        logger.info("Completed fast processing: \(results.count)/\(images.count) images, total cost: $\(String(format: "%.2f", totalCost))")
        return (results, totalCost)
    }

    private func processEconomyBatch(
        provider: AIProvider,
        images: [(Data, String, String)],
        prompt: String,
        systemPrompt: String?,
        progressHandler: ((Double) -> Void)?
    ) async throws -> (results: [PhotoRating], totalCost: Double) {
        logger.info("Processing \(images.count) images via batch API (economy mode)")

        isProcessing = true
        progress = 0.0
        defer { isProcessing = false }

        // Submit batch job
        let batchImages = images.map { imageData, filename, format in
            BatchImage(
                imageData: imageData.base64EncodedString(),
                imageFormat: format,
                filename: filename
            )
        }

        let body = ProcessBatchRequest(
            provider: provider.rawValue,
            images: batchImages,
            prompt: prompt,
            systemPrompt: systemPrompt
        )

        let jobResponse: BatchJobResponse = try await apiClient.authenticatedRequest(
            "/api/ai/process-batch",
            method: "POST",
            body: body
        )

        logger.info("Batch job submitted: \(jobResponse.jobId)")

        // Poll for completion
        var status: BatchStatusResponse
        repeat {
            // Wait before polling
            try await Task.sleep(nanoseconds: 5_000_000_000) // 5 seconds

            status = try await apiClient.authenticatedRequest(
                "/api/ai/batch-status/\(jobResponse.jobId)",
                method: "GET"
            )

            progress = status.progress
            progressHandler?(status.progress)

            logger.info("Batch job progress: \(Int(status.progress * 100))% (\(status.processedImages)/\(status.totalImages))")

        } while status.status != "completed" && status.status != "failed"

        if status.status == "failed" {
            throw CloudAIServiceError.processingFailed("Batch job failed")
        }

        guard let results = status.results, let totalCost = status.totalCost else {
            throw CloudAIServiceError.processingFailed("No results returned from batch job")
        }

        let ratings = results.map { $0.result }

        logger.info("Batch processing completed: \(ratings.count) images, total cost: $\(String(format: "%.2f", totalCost))")
        return (ratings, totalCost)
    }
}
