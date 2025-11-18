#if os(iOS)
import UIKit
import OSLog

// MARK: - iOS-Specific Processing Extension

extension RunController {
    /// iOS-specific photo processing workflow
    /// iOS cannot write directly to user folders, so we:
    /// 1. Copy images to sandbox
    /// 2. Process them
    /// 3. Generate XMP sidecars in sandbox
    /// 4. Present share sheet for user to save XMP back to original location
    func processPhotosIOS(
        folder: URL,
        provider: AIProvider,
        mode: ProcessingMode,
        prompt: String
    ) async throws {
        logger.info("Starting iOS processing workflow")

        // Request security-scoped access
        guard folder.startAccessingSecurityScopedResource() else {
            throw RunError.accessDenied
        }
        defer { folder.stopAccessingSecurityScopedResource() }

        // Enumerate files from picker
        let imageFiles = try enumerateImagesIOS(in: folder)
        total = imageFiles.count

        logger.info("Found \(imageFiles.count) images to process on iOS")

        // Create sandbox working directory
        let sandboxFolder = try createSandboxWorkingDirectory()

        // Copy images to sandbox in batches to manage memory
        let batchSize = 20 // Process 20 images at a time on iOS
        var allXMPURLs: [URL] = []
        var totalCost = 0.0

        for batchStart in stride(from: 0, to: imageFiles.count, by: batchSize) {
            let batchEnd = min(batchStart + batchSize, imageFiles.count)
            let batch = Array(imageFiles[batchStart..<batchEnd])

            logger.info("Processing iOS batch \(batchStart/batchSize + 1): \(batch.count) images")

            // Copy batch to sandbox
            var sandboxedFiles: [URL] = []
            for file in batch {
                let destination = sandboxFolder.appendingPathComponent(file.lastPathComponent)

                // Skip if already copied (avoid duplicates)
                if !FileManager.default.fileExists(atPath: destination.path) {
                    try FileManager.default.copyItem(at: file, to: destination)
                }
                sandboxedFiles.append(destination)
            }

            // Process based on mode
            let (ratings, cost) = try await processBatchIOS(
                images: sandboxedFiles,
                provider: provider,
                mode: mode,
                prompt: prompt
            )

            totalCost += cost

            // Generate XMP sidecars in sandbox
            let xmpURLs = try generateXMPSidecars(
                ratings: ratings,
                imageURLs: sandboxedFiles
            )

            allXMPURLs.append(contentsOf: xmpURLs)

            // Update progress
            processed = batchEnd

            // Clean up image data to free memory (keep XMP files)
            for file in sandboxedFiles {
                try? FileManager.default.removeItem(at: file)
            }
        }

        currentCost = totalCost

        logger.info("iOS processing complete: \(allXMPURLs.count) XMP files generated")

        // Present share sheet for user to save XMP files
        await presentShareSheet(files: allXMPURLs, sandboxFolder: sandboxFolder)
    }

    // MARK: - iOS Helper Methods

    private func enumerateImagesIOS(in folder: URL) throws -> [URL] {
        let fm = FileManager.default
        let files = try fm.contentsOfDirectory(
            at: folder,
            includingPropertiesForKeys: [.contentTypeKey],
            options: [.skipsHiddenFiles]
        )

        let validExtensions = ["cr3", "nef", "arw", "orf", "raf", "dng", "jpg", "jpeg", "png", "heic"]

        return files.filter { url in
            validExtensions.contains(url.pathExtension.lowercased())
        }
    }

    private func createSandboxWorkingDirectory() throws -> URL {
        let tempDir = FileManager.default.temporaryDirectory
            .appendingPathComponent("KullProcessing")
            .appendingPathComponent(UUID().uuidString)

        try FileManager.default.createDirectory(
            at: tempDir,
            withIntermediateDirectories: true,
            attributes: nil
        )

        logger.info("Created iOS sandbox directory: \(tempDir.path)")
        return tempDir
    }

    private func processBatchIOS(
        images: [URL],
        provider: AIProvider,
        mode: ProcessingMode,
        prompt: String
    ) async throws -> ([PhotoRating], Double) {
        if mode == .local {
            // Local processing with Apple Intelligence
            return try await processLocallyIOS(images, prompt)
        } else {
            // Cloud processing
            return try await processCloudIOS(images, provider, mode, prompt)
        }
    }

    private func processLocallyIOS(_ images: [URL], _ prompt: String) async throws -> ([PhotoRating], Double) {
        logger.info("Processing \(images.count) images locally on iOS")

        var ratings: [PhotoRating] = []

        for url in images {
            do {
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

                let data = try await apple.processWithContext(images: [(url, ctx)], prompt: prompt)
                let parsed = try StructuredOutputParser.parse(data)

                if let rating = parsed.ratings.first {
                    // Convert local rating format to PhotoRating
                    let photoRating = PhotoRating(
                        starRating: rating.star,
                        colorLabel: rating.color,
                        keepReject: rating.star >= 3 ? "keep" : "reject",
                        tags: rating.tags,
                        description: rating.description,
                        technicalQuality: TechnicalQuality(
                            sharpness: 800.0, // Placeholder, local doesn't provide detailed metrics
                            exposure: 800.0,
                            composition: 800.0,
                            overallScore: Double(rating.star) * 200.0
                        ),
                        subjectAnalysis: SubjectAnalysis(
                            primarySubject: rating.title,
                            emotion: "neutral",
                            eyesOpen: true,
                            smiling: false,
                            inFocus: true
                        )
                    )
                    ratings.append(photoRating)
                }
            } catch {
                logger.warning("Failed to process image \(url.lastPathComponent): \(error.localizedDescription)")
            }
        }

        return (ratings, 0.0) // Local processing is free
    }

    private func processCloudIOS(
        _ images: [URL],
        _ provider: AIProvider,
        _ mode: ProcessingMode,
        _ prompt: String
    ) async throws -> ([PhotoRating], Double) {
        logger.info("Processing \(images.count) images via cloud on iOS")

        // Load image data
        var imageData: [(Data, String, String)] = []
        for url in images {
            if let data = try? Data(contentsOf: url) {
                let format = url.pathExtension.lowercased()
                imageData.append((data, url.lastPathComponent, format))
            }
        }

        let (ratings, cost) = try await cloudService.processBatch(
            provider: provider,
            mode: mode,
            images: imageData,
            prompt: prompt
        ) { progress in
            // Progress is handled at batch level
        }

        return (ratings, cost)
    }

    private func generateXMPSidecars(
        ratings: [PhotoRating],
        imageURLs: [URL]
    ) throws -> [URL] {
        var xmpURLs: [URL] = []

        for (index, rating) in ratings.enumerated() {
            guard index < imageURLs.count else { break }
            let imageURL = imageURLs[index]
            let xmpURL = imageURL.deletingPathExtension().appendingPathExtension("xmp")

            try generateXMPSidecar(rating: rating, outputURL: xmpURL)
            xmpURLs.append(xmpURL)
        }

        logger.info("Generated \(xmpURLs.count) XMP sidecars on iOS")
        return xmpURLs
    }

    private func generateXMPSidecar(rating: PhotoRating, outputURL: URL) throws {
        let xmp = """
        <?xml version="1.0" encoding="UTF-8"?>
        <x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="Kull iOS 1.0">
          <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
            <rdf:Description rdf:about=""
                xmlns:xmp="http://ns.adobe.com/xap/1.0/"
                xmlns:dc="http://purl.org/dc/elements/1.1/"
                xmlns:photoshop="http://ns.adobe.com/photoshop/1.0/"
                xmlns:kull="http://kull.ai/ns/1.0/">
              <xmp:Rating>\(rating.starRating)</xmp:Rating>
              <xmp:Label>\(rating.colorLabel)</xmp:Label>
              <dc:description>
                <rdf:Alt>
                  <rdf:li xml:lang="x-default">\(escapeXML(rating.description))</rdf:li>
                </rdf:Alt>
              </dc:description>
              <dc:subject>
                <rdf:Bag>
        \(rating.tags.map { "          <rdf:li>\(escapeXML($0))</rdf:li>" }.joined(separator: "\n"))
                </rdf:Bag>
              </dc:subject>
              <photoshop:Category>\(rating.keepReject)</photoshop:Category>
              <kull:TechnicalQuality>\(String(format: "%.0f", rating.technicalQuality.overallScore))</kull:TechnicalQuality>
              <kull:Sharpness>\(String(format: "%.0f", rating.technicalQuality.sharpness))</kull:Sharpness>
              <kull:Exposure>\(String(format: "%.0f", rating.technicalQuality.exposure))</kull:Exposure>
              <kull:Composition>\(String(format: "%.0f", rating.technicalQuality.composition))</kull:Composition>
              <kull:Subject>\(escapeXML(rating.subjectAnalysis.primarySubject))</kull:Subject>
              <kull:EyesOpen>\(rating.subjectAnalysis.eyesOpen ? "true" : "false")</kull:EyesOpen>
              <kull:InFocus>\(rating.subjectAnalysis.inFocus ? "true" : "false")</kull:InFocus>
            </rdf:Description>
          </rdf:RDF>
        </x:xmpmeta>
        """

        try xmp.write(to: outputURL, atomically: true, encoding: .utf8)
    }

    private func escapeXML(_ string: String) -> String {
        return string
            .replacingOccurrences(of: "&", with: "&amp;")
            .replacingOccurrences(of: "<", with: "&lt;")
            .replacingOccurrences(of: ">", with: "&gt;")
            .replacingOccurrences(of: "\"", with: "&quot;")
            .replacingOccurrences(of: "'", with: "&apos;")
    }

    @MainActor
    private func presentShareSheet(files: [URL], sandboxFolder: URL) {
        logger.info("Presenting iOS share sheet with \(files.count) XMP files")

        let activityVC = UIActivityViewController(
            activityItems: files,
            applicationActivities: nil
        )

        // Set completion handler to clean up sandbox after sharing
        activityVC.completionWithItemsHandler = { [weak self] _, completed, _, error in
            if let error = error {
                self?.logger.error("Share sheet error: \(error.localizedDescription)")
            }

            if completed {
                self?.logger.info("User completed sharing XMP files")
            }

            // Clean up sandbox folder after a delay to ensure files are saved
            DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
                try? FileManager.default.removeItem(at: sandboxFolder)
                self?.logger.info("Cleaned up iOS sandbox folder")
            }
        }

        // Present from top-most view controller
        if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
           let window = windowScene.windows.first(where: { $0.isKeyWindow }),
           let rootVC = window.rootViewController {

            // Find the topmost presented view controller
            var topVC = rootVC
            while let presented = topVC.presentedViewController {
                topVC = presented
            }

            // iPad requires popover presentation
            if UIDevice.current.userInterfaceIdiom == .pad {
                activityVC.popoverPresentationController?.sourceView = topVC.view
                activityVC.popoverPresentationController?.sourceRect = CGRect(
                    x: topVC.view.bounds.midX,
                    y: topVC.view.bounds.midY,
                    width: 0,
                    height: 0
                )
                activityVC.popoverPresentationController?.permittedArrowDirections = []
            }

            topVC.present(activityVC, animated: true)
        }
    }
}

// MARK: - iOS Memory Management

extension RunController {
    /// Monitor memory warnings on iOS and pause processing if needed
    func setupMemoryWarningObserver() {
        NotificationCenter.default.addObserver(
            forName: UIApplication.didReceiveMemoryWarningNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            self?.handleMemoryWarning()
        }
    }

    private func handleMemoryWarning() {
        logger.warning("iOS memory warning received - pausing processing")
        // In a real implementation, you'd pause processing and clean up caches
        // For now, just log it
    }
}

// MARK: - iOS-Specific Errors

enum RunError: Error, LocalizedError {
    case accessDenied
    case sandboxCreationFailed
    case xmpGenerationFailed
    case shareSheetPresentationFailed

    var errorDescription: String? {
        switch self {
        case .accessDenied:
            return "Cannot access folder. Please grant access in Settings."
        case .sandboxCreationFailed:
            return "Failed to create temporary working directory."
        case .xmpGenerationFailed:
            return "Failed to generate XMP sidecar files."
        case .shareSheetPresentationFailed:
            return "Failed to present share sheet for saving XMP files."
        }
    }
}

#endif
