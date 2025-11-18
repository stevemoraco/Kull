import Foundation
import Combine
import OSLog

@MainActor
final class RunController: ObservableObject {
    @Published var isRunning = false
    @Published var processed = 0
    @Published var total = 0
    @Published var currentCost = 0.0

    private let apple = AppleIntelligenceService()
    private let cloudService = CloudAIService.shared
    private let notifier = RunNotifier()
    private let logger = Logger(subsystem: "com.kull.app", category: "RunController")

    func runCulling(
        folderURL: URL,
        provider: AIProvider,
        mode: ProcessingMode,
        prompt: String
    ) async throws {
        logger.info("Starting culling: provider=\(provider.rawValue), mode=\(mode.rawValue)")

        isRunning = true
        processed = 0
        total = 0
        currentCost = 0.0
        defer {
            isRunning = false
            notifier.notifyCompletion(processed: processed, total: total)
        }

        let images = try enumerateImages(in: folderURL)
        total = images.count

        logger.info("Found \(images.count) images to process")

        switch mode {
        case .local:
            try await processLocally(images, prompt)
        case .fast:
            try await processFastConcurrent(images, provider, prompt)
        case .economy:
            try await processEconomyBatch(images, provider, prompt)
        }

        logger.info("Culling completed: processed=\(processed), cost=$\(String(format: "%.2f", currentCost))")
    }

    // MARK: - Legacy method for backward compatibility

    func run(folder: URL, prompt: String) async {
        do {
            try await runCulling(
                folderURL: folder,
                provider: .appleIntelligence,
                mode: .local,
                prompt: prompt
            )
        } catch {
            logger.error("Run failed: \(error.localizedDescription)")
        }
    }

    // MARK: - Private Processing Methods

    private func enumerateImages(in folder: URL) throws -> [URL] {
        let fm = FileManager.default
        guard let enumerator = fm.enumerator(at: folder, includingPropertiesForKeys: nil) else {
            throw NSError(domain: "RunController", code: 1, userInfo: [NSLocalizedDescriptionKey: "Could not enumerate folder"])
        }

        var images: [URL] = []
        let validExtensions = ["cr3", "nef", "arw", "orf", "raf", "dng", "jpg", "jpeg", "png", "heic"]

        while let url = enumerator.nextObject() as? URL {
            if validExtensions.contains(url.pathExtension.lowercased()) {
                images.append(url)
            }
        }

        return images
    }

    private func processLocally(_ images: [URL], _ prompt: String) async throws {
        logger.info("Processing \(images.count) images locally")

        let chunkSize = apple.recommendedBatchSize()

        for idx in stride(from: 0, to: images.count, by: chunkSize) {
            let batch = Array(images[idx..<min(idx + chunkSize, images.count)])

            do {
                // Build EXIF + address context per image
                var contexts: [(URL, AppleIntelligenceService.AIImageContext)] = []
                for url in batch {
                    let exif = ExifReader.read(from: url)
                    var address: String? = nil
                    if let gps = exif.gps {
                        let geo = GeoResolver()
                        let resolved = await geo.resolve(coordinate: gps)
                        address = resolved.address
                    }
                    let ctx = AppleIntelligenceService.AIImageContext(
                        filename: url.lastPathComponent,
                        captureDate: exif.captureDate?.ISO8601Format(),
                        cameraMake: exif.cameraMake,
                        cameraModel: exif.cameraModel,
                        lensModel: exif.lensModel,
                        width: exif.width,
                        height: exif.height,
                        address: address
                    )
                    contexts.append((url, ctx))
                }

                let data = try await apple.processWithContext(images: contexts, prompt: prompt)
                let parsed = try StructuredOutputParser.parse(data)

                for item in parsed.ratings {
                    if let match = batch.first(where: { $0.lastPathComponent == item.filename }) {
                        try XMPWriter.writeSidecar(
                            for: match,
                            rating: item.star,
                            color: item.color,
                            title: item.title,
                            description: item.description,
                            tags: item.tags
                        )
                    }
                    processed += 1
                }
            } catch {
                logger.warning("Failed to process batch: \(error.localizedDescription)")
                processed += batch.count
            }
        }
    }

    private func processFastConcurrent(_ images: [URL], _ provider: AIProvider, _ prompt: String) async throws {
        logger.info("Processing \(images.count) images in fast mode with \(provider.rawValue)")

        // Load image data for all images
        var imageData: [(Data, String, String)] = []
        for url in images {
            if let data = try? Data(contentsOf: url) {
                let format = url.pathExtension.lowercased()
                imageData.append((data, url.lastPathComponent, format))
            }
        }

        let (ratings, cost) = try await cloudService.processBatch(
            provider: provider,
            mode: .fast,
            images: imageData,
            prompt: prompt
        ) { progress in
            Task { @MainActor in
                self.processed = Int(progress * Double(imageData.count))
            }
        }

        currentCost = cost

        // Write results back to XMP sidecars
        for (index, rating) in ratings.enumerated() {
            guard index < images.count else { break }
            let url = images[index]

            do {
                try XMPWriter.writeSidecar(
                    for: url,
                    rating: rating.starRating,
                    color: rating.colorLabel,
                    title: rating.subjectAnalysis.primarySubject,
                    description: rating.description,
                    tags: rating.tags
                )
            } catch {
                logger.warning("Failed to write XMP for \(url.lastPathComponent): \(error.localizedDescription)")
            }
        }

        processed = ratings.count
    }

    private func processEconomyBatch(_ images: [URL], _ provider: AIProvider, _ prompt: String) async throws {
        logger.info("Processing \(images.count) images in economy mode with \(provider.rawValue)")

        // Load image data for all images
        var imageData: [(Data, String, String)] = []
        for url in images {
            if let data = try? Data(contentsOf: url) {
                let format = url.pathExtension.lowercased()
                imageData.append((data, url.lastPathComponent, format))
            }
        }

        let (ratings, cost) = try await cloudService.processBatch(
            provider: provider,
            mode: .economy,
            images: imageData,
            prompt: prompt
        ) { progress in
            Task { @MainActor in
                self.processed = Int(progress * Double(imageData.count))
            }
        }

        currentCost = cost

        // Write results back to XMP sidecars
        for (index, rating) in ratings.enumerated() {
            guard index < images.count else { break }
            let url = images[index]

            do {
                try XMPWriter.writeSidecar(
                    for: url,
                    rating: rating.starRating,
                    color: rating.colorLabel,
                    title: rating.subjectAnalysis.primarySubject,
                    description: rating.description,
                    tags: rating.tags
                )
            } catch {
                logger.warning("Failed to write XMP for \(url.lastPathComponent): \(error.localizedDescription)")
            }
        }

        processed = ratings.count
    }
}
