import Foundation

struct RatingItem: Codable {
    let filename: String
    let star: Int
    let color: String?
    let title: String?
    let description: String?
    let tags: [String]?
}

struct RatingsResponse: Codable {
    let ratings: [RatingItem]
}

enum StructuredOutputParser {
    static func parse(_ data: Data) throws -> RatingsResponse {
        try JSONDecoder().decode(RatingsResponse.self, from: data)
    }
}

