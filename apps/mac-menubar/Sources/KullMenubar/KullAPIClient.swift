import Foundation

struct DeviceLinkInitiateResponse: Decodable {
    let code: String
    let pollToken: String
    let expiresAt: Date
}

struct DeviceLinkStatusResponse: Decodable {
    struct LinkedUser: Decodable {
        let id: String
        let email: String?
        let firstName: String?
        let lastName: String?
        let profileImageUrl: String?
    }

    let status: String
    let expiresAt: Date?
    let deviceName: String?
    let user: LinkedUser?
}

struct RemoteUser: Decodable {
    let id: String
    let email: String?
    let firstName: String?
    let lastName: String?
    let profileImageUrl: String?

    var displayName: String {
        if let first = firstName, let last = lastName { return "\(first) \(last)" }
        if let first = firstName { return first }
        if let email = email { return email }
        return id
    }
}

struct CreditSummaryPayload: Decodable {
    let balance: Int
    let planDisplayName: String
    let estimatedShootsRemaining: Double
}

struct ProviderCapability: Decodable, Identifiable {
    let id: String
    let displayName: String
    let description: String?
    let offline: Bool?
    let estimatedCostPer1kImages: Double?
}

enum APIError: Error {
    case invalidURL
    case requestFailed(status: Int)
    case decodingFailed
}

final class KullAPIClient {
    static let shared = KullAPIClient()

    private let baseURL: URL
    private let session: URLSession
    private let jsonDecoder: JSONDecoder

    init(baseURL: URL = KullAPIClient.resolveBaseURL(), session: URLSession = .shared) {
        self.baseURL = baseURL
        self.session = session
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        self.jsonDecoder = decoder
    }

    private static func resolveBaseURL() -> URL {
        let env = ProcessInfo.processInfo.environment
        if let override = env["KULL_BASE_URL"], let url = URL(string: override) {
            return url
        }
        if let url = URL(string: "https://kullai.com") {
            return url
        }
        fatalError("Unable to resolve base URL")
    }

    private func makeURL(_ path: String) -> URL {
        if path.hasPrefix("http") {
            return URL(string: path) ?? baseURL
        }
        let trimmed = path.hasPrefix("/") ? String(path.dropFirst()) : path
        return baseURL.appendingPathComponent(trimmed)
    }

    private func makeRequest(path: String, method: String = "GET", body: Data? = nil, contentType: String? = "application/json") -> URLRequest {
        var request = URLRequest(url: makeURL(path))
        request.httpMethod = method
        request.httpBody = body
        if let contentType {
            request.setValue(contentType, forHTTPHeaderField: "Content-Type")
        }
        return request
    }

    private func perform<T: Decodable>(_ request: URLRequest, acceptedStatusCodes: Set<Int> = [200]) async throws -> T {
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw APIError.requestFailed(status: -1)
        }
        if !acceptedStatusCodes.contains(http.statusCode) {
            throw APIError.requestFailed(status: http.statusCode)
        }
        do {
            return try jsonDecoder.decode(T.self, from: data)
        } catch {
            throw APIError.decodingFailed
        }
    }

    func initiateDeviceLink(deviceName: String?) async throws -> DeviceLinkInitiateResponse {
        let payload = try JSONSerialization.data(withJSONObject: ["deviceName": deviceName as Any?].compactMapValues { $0 }, options: [])
        let request = makeRequest(path: "/api/device/link/initiate", method: "POST", body: payload)
        return try await perform(request)
    }

    func approveDeviceLink(code: String, deviceName: String?) async throws {
        let payload = try JSONSerialization.data(withJSONObject: ["code": code, "deviceName": deviceName as Any?].compactMapValues { $0 }, options: [])
        let request = makeRequest(path: "/api/device/link/approve", method: "POST", body: payload)
        _ = try await session.data(for: request)
    }

    func pollDeviceLink(pollToken: String) async throws -> DeviceLinkStatusResponse {
        let payload = try JSONSerialization.data(withJSONObject: ["pollToken": pollToken], options: [])
        let request = makeRequest(path: "/api/device/link/status", method: "POST", body: payload)
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw APIError.requestFailed(status: -1)
        }
        if http.statusCode == 200 {
            return try jsonDecoder.decode(DeviceLinkStatusResponse.self, from: data)
        }
        if let decoded = try? jsonDecoder.decode(DeviceLinkStatusResponse.self, from: data) {
            return decoded
        }
        if http.statusCode == 410 {
            return DeviceLinkStatusResponse(status: "expired", expiresAt: nil, deviceName: nil, user: nil)
        }
        return DeviceLinkStatusResponse(status: "invalid", expiresAt: nil, deviceName: nil, user: nil)
    }

    func fetchCurrentUser() async throws -> RemoteUser? {
        let request = makeRequest(path: "/api/auth/user")
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw APIError.requestFailed(status: -1)
        }
        if http.statusCode == 401 {
            return nil
        }
        if http.statusCode == 200 {
            return try jsonDecoder.decode(RemoteUser.self, from: data)
        }
        throw APIError.requestFailed(status: http.statusCode)
    }

    func logout() async {
        var request = makeRequest(path: "/api/logout")
        request.httpMethod = "GET"
        _ = try? await session.data(for: request)
    }

    func fetchCreditSummary() async throws -> CreditSummaryPayload {
        let request = makeRequest(path: "/api/kull/credits/summary")
        return try await perform(request)
    }

    func listModels() async throws -> [ProviderCapability] {
        let request = makeRequest(path: "/api/kull/models")
        struct Response: Decodable { let providers: [ProviderCapability] }
        let response: Response = try await perform(request)
        return response.providers
    }
}
