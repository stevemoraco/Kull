import Foundation
import OSLog
import ImageIO

#if canImport(FoundationModels)
import FoundationModels
#endif

enum AppleIntelligenceError: Error {
    case notAvailable
    case invalidResponse
}

final class AppleIntelligenceService {
    private let logger = Logger(subsystem: "com.kull.menubar", category: "AppleIntelligence")
    private let fallbackEncoder = JSONEncoder()
    private let fallbackDecoder = JSONDecoder()
    private let batchSize = 10

    struct Metrics {
        let filename: String
        let brightness: Double
        let contrast: Double
        let sharpness: Double
        let highlightsClipped: Double
        let shadowsClipped: Double
        let width: Int
        let height: Int
    }

    struct Analysis {
        let url: URL
        let metrics: Metrics
    }

    struct AIImageContext: Codable {
        let filename: String
        let captureDate: String?
        let cameraMake: String?
        let cameraModel: String?
        let lensModel: String?
        let width: Int?
        let height: Int?
        let address: String?
    }

    func process(images: [URL], prompt: String) async throws -> Data {
        let analyses = try images.map(analyze)

        #if canImport(FoundationModels)
        if #available(macOS 26.0, *) {
            if let json = try? await runLanguageModel(over: analyses, userPrompt: prompt) {
                return Data(json.utf8)
            } else {
                logger.warning("Falling back to heuristic output – unable to decode model response.")
            }
        } else {
            logger.info("FoundationModels unavailable on this macOS version; using heuristics.")
        }
        #else
        logger.info("FoundationModels framework not present; using heuristics.")
        #endif

        let fallback = buildFallbackResponse(from: analyses, userPrompt: prompt)
        return try fallbackEncoder.encode(fallback)
    }

    func recommendedBatchSize() -> Int { batchSize }

    // Enhanced path: accept per-image context (EXIF + geocode) and build a structured instruction
    func processWithContext(images: [(url: URL, context: AIImageContext)], prompt: String) async throws -> Data {
        #if canImport(FoundationModels)
        if #available(macOS 26.0, *) {
            let model = SystemLanguageModel.default
            guard case .available = model.availability else { throw AppleIntelligenceError.notAvailable }
            var inst = "You are Kull. Rate images 1-5 stars, assign optional Lightroom color labels, and produce concise titles/descriptions and up to 8 tags. Respond strictly as JSON: {\\\"ratings\\\":[{\\\"filename\\\":string,\\\"star\\\":number,\\\"color\\\":string,\\\"title\\\":string,\\\"description\\\":string,\\\"tags\\\":[string]}]}\n"
            inst += prompt + "\n"
            for item in images {
                if let json = try? String(data: JSONEncoder().encode(item.context), encoding: .utf8) {
                    inst += "IMAGE_REF " + json + "\n"
                }
            }
            let instructions = Instructions { inst }
            let session = LanguageModelSession(model: model, instructions: instructions)
            let response = try await session.respond(to: Prompt { "Output JSON only." })
            let raw = response.content.trimmingCharacters(in: .whitespacesAndNewlines)
            let sanitized = sanitize(jsonCandidate: raw)
            return Data(sanitized.utf8)
        }
        #endif
        // fallback to heuristic
        return try await process(images: images.map { $0.url }, prompt: prompt)
    }

    private func analyze(_ url: URL) throws -> Analysis {
        guard let cgImage = makeThumbnail(for: url) else {
            throw AppleIntelligenceError.invalidResponse
        }
        let metrics = computeMetrics(for: cgImage, filename: url.lastPathComponent)
        return Analysis(url: url, metrics: metrics)
    }

    private func makeThumbnail(for url: URL, maxDimension: Int = 256) -> CGImage? {
        guard let source = CGImageSourceCreateWithURL(url as CFURL, nil) else { return nil }
        let options: [CFString: Any] = [
            kCGImageSourceCreateThumbnailFromImageAlways: true,
            kCGImageSourceCreateThumbnailWithTransform: true,
            kCGImageSourceThumbnailMaxPixelSize: maxDimension,
            kCGImageSourceShouldCacheImmediately: true
        ]
        return CGImageSourceCreateThumbnailAtIndex(source, 0, options as CFDictionary)
    }

    private func computeMetrics(for image: CGImage, filename: String) -> Metrics {
        let width = image.width
        let height = image.height
        let bytesPerPixel = 4
        let bytesPerRow = width * bytesPerPixel
        var pixelBuffer = [UInt8](repeating: 0, count: Int(bytesPerRow * height))

        pixelBuffer.withUnsafeMutableBytes { ptr in
            guard let context = CGContext(
                data: ptr.baseAddress,
                width: width,
                height: height,
                bitsPerComponent: 8,
                bytesPerRow: bytesPerRow,
                space: CGColorSpaceCreateDeviceRGB(),
                bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue | CGBitmapInfo.byteOrder32Big.rawValue
            ) else {
                return
            }
            context.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))
        }

        var luminanceSum: Double = 0
        var luminanceSqSum: Double = 0
        var highlightCount: Int = 0
        var shadowCount: Int = 0
        var gradientSum: Double = 0

        let pixelCount = max(width * height, 1)
        let highlightThreshold: Double = 0.97
        let shadowThreshold: Double = 0.03

        for y in 0 ..< height {
            for x in 0 ..< width {
                let index = Int(y * width + x)
                let offset = index * bytesPerPixel
                let r = Double(pixelBuffer[offset + 0]) / 255.0
                let g = Double(pixelBuffer[offset + 1]) / 255.0
                let b = Double(pixelBuffer[offset + 2]) / 255.0
                let luminance = (0.2126 * r) + (0.7152 * g) + (0.0722 * b)
                luminanceSum += luminance
                luminanceSqSum += luminance * luminance
                if luminance > highlightThreshold { highlightCount += 1 }
                if luminance < shadowThreshold { shadowCount += 1 }

                if x < width - 1 {
                    let nextOffset = offset + bytesPerPixel
                    let nr = Double(pixelBuffer[nextOffset + 0]) / 255.0
                    let ng = Double(pixelBuffer[nextOffset + 1]) / 255.0
                    let nb = Double(pixelBuffer[nextOffset + 2]) / 255.0
                    let nextLum = (0.2126 * nr) + (0.7152 * ng) + (0.0722 * nb)
                    gradientSum += abs(luminance - nextLum)
                }
            }
        }

        let count = Double(pixelCount)
        let brightness = luminanceSum / count
        let variance = max(luminanceSqSum / count - (brightness * brightness), 0)
        let contrast = sqrt(variance)
        let highlightsClipped = Double(highlightCount) / count
        let shadowsClipped = Double(shadowCount) / count
        let gradientAvg = gradientSum / count
        let sharpness = min(max(gradientAvg * 2.0, 0), 1)

        return Metrics(
            filename: filename,
            brightness: brightness,
            contrast: min(max(contrast * 2.0, 0), 1),
            sharpness: sharpness,
            highlightsClipped: highlightsClipped,
            shadowsClipped: shadowsClipped,
            width: width,
            height: height
        )
    }

    private func buildFallbackResponse(from analyses: [Analysis], userPrompt: String) -> RatingsResponse {
        let items: [RatingItem] = analyses.enumerated().map { index, analysis in
            fallbackRating(for: analysis.metrics, position: index, userPrompt: userPrompt)
        }
        return RatingsResponse(ratings: items)
    }

    private func fallbackRating(for metrics: Metrics, position: Int, userPrompt: String) -> RatingItem {
        var score = (metrics.sharpness * 0.5) + (metrics.contrast * 0.35) + ((1 - metrics.highlightsClipped - metrics.shadowsClipped) * 0.15)
        if metrics.highlightsClipped > 0.2 { score -= 0.1 }
        if metrics.shadowsClipped > 0.2 { score -= 0.08 }
        score = min(max(score, 0), 1)

        let stars: Int
        switch score {
        case 0.8...:
            stars = 5
        case 0.6..<0.8:
            stars = 4
        case 0.4..<0.6:
            stars = 3
        case 0.25..<0.4:
            stars = 2
        default:
            stars = 1
        }

        let color: String
        switch stars {
        case 5: color = "green"
        case 4: color = "blue"
        case 3: color = "yellow"
        case 2: color = "purple"
        default: color = "none"
        }

        let brightnessPct = Int((metrics.brightness * 100).rounded())
        let contrastPct = Int((metrics.contrast * 100).rounded())
        let sharpnessPct = Int((metrics.sharpness * 100).rounded())

        let title: String
        switch stars {
        case 5: title = "Hero Candidate"
        case 4: title = "Strong Keeper"
        case 3: title = "Worth Reviewing"
        case 2: title = "Backup Frame"
        default: title = "Reject"
        }

        let description = """
        Auto-generated rating based on brightness \(brightnessPct)%, contrast \(contrastPct)%, and sharpness \(sharpnessPct)%. Highlights clipped: \(Int(metrics.highlightsClipped * 100))%, shadows clipped: \(Int(metrics.shadowsClipped * 100))%.
        """

        var tags = ["auto-generated"]
        if stars >= 4 { tags.append("priority") }
        if metrics.highlightsClipped > 0.25 { tags.append("watch-highlights") }
        if metrics.shadowsClipped > 0.25 { tags.append("watch-shadows") }
        if !userPrompt.isEmpty { tags.append("prompt-hint") }

        return RatingItem(
            filename: metrics.filename,
            star: stars,
            color: color,
            title: title,
            description: description.trimmingCharacters(in: .whitespacesAndNewlines),
            tags: tags
        )
    }

    #if canImport(FoundationModels)
    @available(macOS 26.0, *)
    private func runLanguageModel(over analyses: [Analysis], userPrompt: String) async throws -> String? {
        guard !analyses.isEmpty else {
            return "{\"ratings\":[]}"
        }

        let model = SystemLanguageModel.default
        switch model.availability {
        case .available:
            break
        default:
            throw AppleIntelligenceError.notAvailable
        }

        let instructions = Instructions {
            """
            You are Kull's on-device photo culling assistant. Produce structured JSON matching:
            { \"ratings\": [ { \"filename\": String, \"star\": Int (0-5), \"color\": String, \"title\": String, \"description\": String, \"tags\": [String] } ] }.
            Output JSON only. Do not include explanations or markdown fencing.
            """
        }

        let session = LanguageModelSession(model: model, instructions: instructions)

        let prompt = Prompt {
            "User preference: \(userPrompt)"
            "Evaluate the following images, provided with heuristic metrics. Higher sharpness/contrast generally indicates better focus and drama. Avoid promoting frames with high clipping ratios."
            for (index, analysis) in analyses.enumerated() {
                let m = analysis.metrics
                """
                Image \(index + 1):
                  filename: \(m.filename)
                  width: \(m.width)
                  height: \(m.height)
                  brightness: \(String(format: "%.3f", m.brightness))
                  contrast: \(String(format: "%.3f", m.contrast))
                  sharpness: \(String(format: "%.3f", m.sharpness))
                  highlightsClippedRatio: \(String(format: "%.3f", m.highlightsClipped))
                  shadowsClippedRatio: \(String(format: "%.3f", m.shadowsClipped))
                """
            }
            "Return JSON covering every filename exactly once."
        }

        do {
            let response = try await session.respond(to: prompt)
            let raw = response.content.trimmingCharacters(in: .whitespacesAndNewlines)
            let sanitized = sanitize(jsonCandidate: raw)
            guard let data = sanitized.data(using: .utf8) else { return nil }
            _ = try fallbackDecoder.decode(RatingsResponse.self, from: data)
            return sanitized
        } catch {
            logger.error("Language model generation failed: \(error.localizedDescription, privacy: .public)")
            return nil
        }
    }
    #endif

    private func sanitize(jsonCandidate: String) -> String {
        var candidate = jsonCandidate
        if candidate.hasPrefix("```") {
            candidate = candidate.trimmingCharacters(in: CharacterSet(charactersIn: "`"))
        }
        if let range = candidate.range(of: "{"), candidate.first != "{" {
            candidate = String(candidate[range.lowerBound...])
        }
        if let range = candidate.range(of: "}", options: .backwards), candidate.last != "}" {
            candidate = String(candidate[..<range.upperBound])
        }
        return candidate.trimmingCharacters(in: .whitespacesAndNewlines)
    }
}
