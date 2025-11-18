import XCTest
import CoreImage
import CoreImage.CIFilterBuiltins
import ImageIO
import UniformTypeIdentifiers
@testable import KullMenubar

final class AppleIntelligenceServiceTests: XCTestCase {
    func testFallbackProducesRatings() async throws {
        let imageURL = try Self.makeTestImage(width: 64, height: 64, red: 0.8, green: 0.5, blue: 0.3)
        let service = AppleIntelligenceService()
        let data = try await service.process(images: [imageURL], prompt: "Prefer warm scenes with rich contrast")
        let decoded = try JSONDecoder().decode(RatingsResponse.self, from: data)
        XCTAssertEqual(decoded.ratings.count, 1)
        XCTAssertEqual(decoded.ratings.first?.filename, imageURL.lastPathComponent)
        XCTAssert((0...5).contains(decoded.ratings.first?.star ?? -1))
    }

    private static func makeTestImage(width: Int, height: Int, red: Double, green: Double, blue: Double) throws -> URL {
        let extent = CGRect(x: 0, y: 0, width: width, height: height)
        let baseColor = CIColor(red: red, green: green, blue: blue, alpha: 1)
        let gradient = CIFilter.linearGradient()
        gradient.point0 = CGPoint(x: 0, y: 0)
        gradient.point1 = CGPoint(x: width, y: height)
        gradient.color0 = baseColor
        gradient.color1 = CIColor(red: max(red - 0.2, 0), green: max(green - 0.2, 0), blue: max(blue - 0.2, 0), alpha: 1)
        let image = (gradient.outputImage ?? CIImage(color: baseColor)).cropped(to: extent)

        let ciContext = CIContext(options: [.useSoftwareRenderer: true])
        guard let cgImage = ciContext.createCGImage(image, from: extent) else {
            throw NSError(domain: "KullMacMenubarTests", code: -1, userInfo: [NSLocalizedDescriptionKey: "Failed to create CGImage"])
        }

        let url = URL(fileURLWithPath: NSTemporaryDirectory())
            .appendingPathComponent(UUID().uuidString)
            .appendingPathExtension("png")

        guard let destination = CGImageDestinationCreateWithURL(url as CFURL, UTType.png.identifier as CFString, 1, nil) else {
            throw NSError(domain: "KullMacMenubarTests", code: -2, userInfo: [NSLocalizedDescriptionKey: "Failed to create image destination"])
        }
        CGImageDestinationAddImage(destination, cgImage, nil)
        guard CGImageDestinationFinalize(destination) else {
            throw NSError(domain: "KullMacMenubarTests", code: -3, userInfo: [NSLocalizedDescriptionKey: "Failed to finalize image destination"])
        }
        return url
    }
}
