import Foundation
import Combine

@MainActor
final class RunController: ObservableObject {
    @Published var isRunning = false
    @Published var processed = 0
    @Published var total = 0
    private let apple = AppleIntelligenceService()
    private let notifier = RunNotifier()

    func run(folder: URL, prompt: String) async {
        isRunning = true
        processed = 0
        total = 0
        defer {
            isRunning = false
            notifier.notifyCompletion(processed: processed, total: total)
        }

        let fm = FileManager.default
        guard let enumerator = fm.enumerator(at: folder, includingPropertiesForKeys: nil) else { return }

        var raws: [URL] = []
        while let url = enumerator.nextObject() as? URL {
            if ["cr3", "nef", "arw", "orf", "raf", "dng", "jpg", "jpeg", "png"].contains(url.pathExtension.lowercased()) {
                raws.append(url)
            }
        }

        total = raws.count
        let chunkSize = apple.recommendedBatchSize()

        for idx in stride(from: 0, to: raws.count, by: chunkSize) {
            let batch = Array(raws[idx..<min(idx + chunkSize, raws.count)])
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
                        try XMPWriter.writeSidecar(for: match, rating: item.star, color: item.color, title: item.title, description: item.description, tags: item.tags)
                    }
                    processed += 1
                }
            } catch {
                processed += batch.count
            }
        }
    }
}
