import Foundation

#if canImport(FoundationModels)
import FoundationModels
#endif

enum AppleIntelligenceError: Error { case notAvailable }

final class AppleIntelligenceService {
    func process(images: [URL], prompt: String) async throws -> Data {
        #if canImport(FoundationModels)
        if #available(macOS 15.0, *) {
            let session = try SystemLanguageModel.shared.makeSession()
            let instruction = "Return a JSON object with a 'ratings' array of {filename, star, color, title, description, tags}.\n\(prompt)"
            let input = LanguageModel.Input(stringLiteral: instruction)
            let result = try await session.generate(from: input)
            return Data(result.utf8)
        }
        #endif
        throw AppleIntelligenceError.notAvailable
    }
}

