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
        do {
            isRunning = true
            let fm = FileManager.default
            guard let enumerator = fm.enumerator(at: folder, includingPropertiesForKeys: nil) else { return }
            var raws: [URL] = []
            for case let url as URL in enumerator {
                if ["cr3", "nef", "arw", "orf", "raf", "dng", "jpg", "jpeg", "png"].contains(url.pathExtension.lowercased()) {
                    raws.append(url)
                }
            }
            total = raws.count
            processed = 0

            let chunkSize = 10
            for idx in stride(from: 0, to: raws.count, by: chunkSize) {
                let batch = Array(raws[idx..<min(idx + chunkSize, raws.count)])
                do {
                    let data = try await apple.process(images: batch, prompt: prompt)
                    let parsed = try StructuredOutputParser.parse(data)
                    for item in parsed.ratings {
                        if let match = batch.first(where: { $0.lastPathComponent == item.filename }) {
                            try XMPWriter.writeSidecar(for: match, rating: item.star, color: item.color, title: item.title, description: item.description, tags: item.tags)
                        }
                        processed += 1
                    }
                } catch {
                    // skip batch on error and continue
                    processed += batch.count
                }
            }
        } catch {
            // no-op
        }
        // Generate a quick report summary and notify
        isRunning = false
        notifier.notifyCompletion(processed: processed, total: total)
    }
}
