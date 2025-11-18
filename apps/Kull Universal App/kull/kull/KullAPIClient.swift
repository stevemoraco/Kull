import Foundation
import OSLog

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

    struct DeviceTokens: Decodable {
        let accessToken: String
        let refreshToken: String
        let expiresIn: Int
    }

    let status: String
    let expiresAt: Date?
    let deviceName: String?
    let user: LinkedUser?
    let tokens: DeviceTokens?
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
    case notAuthenticated
    case invalidResponse
    case refreshFailed
}

final class KullAPIClient {
    static let shared = KullAPIClient()

    private let baseURL: URL
    private let session: URLSession
    private let jsonDecoder: JSONDecoder

    init(baseURL: URL? = nil, session: URLSession = .shared) {
        self.baseURL = baseURL ?? EnvironmentConfig.shared.apiBaseURL
        self.session = session
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        self.jsonDecoder = decoder
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
        let startTime = CFAbsoluteTimeGetCurrent()
        let endpoint = request.url?.path ?? "unknown"
        let method = request.httpMethod ?? "GET"

        Logger.api.logAPIRequest(method, endpoint)

        let (data, response) = try await session.data(for: request)

        let duration = CFAbsoluteTimeGetCurrent() - startTime

        guard let http = response as? HTTPURLResponse else {
            Logger.api.error("Invalid HTTP response for \(endpoint)")
            throw APIError.requestFailed(status: -1)
        }

        Logger.api.logAPIResponse(http.statusCode, endpoint, duration: duration)

        if !acceptedStatusCodes.contains(http.statusCode) {
            Logger.api.error("Request failed: \(endpoint) - status \(http.statusCode)")
            throw APIError.requestFailed(status: http.statusCode)
        }

        do {
            return try jsonDecoder.decode(T.self, from: data)
        } catch {
            Logger.api.error("Failed to decode response from \(endpoint): \(error.localizedDescription)")
            throw APIError.decodingFailed
        }
    }

    func initiateDeviceLink(deviceName: String?) async throws -> DeviceLinkInitiateResponse {
        Logger.auth.info("Initiating device link for device: \(deviceName ?? "unknown")")
        let payload = try JSONSerialization.data(withJSONObject: ["deviceName": deviceName as Any?].compactMapValues { $0 }, options: [])
        let request = makeRequest(path: "/api/device/link/initiate", method: "POST", body: payload)
        let response: DeviceLinkInitiateResponse = try await perform(request)
        Logger.auth.notice("Device link initiated successfully, code: \(response.code)")
        return response
    }

    func approveDeviceLink(code: String, deviceName: String?) async throws {
        let payload = try JSONSerialization.data(withJSONObject: ["code": code, "deviceName": deviceName as Any?].compactMapValues { $0 }, options: [])
        let request = makeRequest(path: "/api/device/link/approve", method: "POST", body: payload)
        _ = try await session.data(for: request)
    }

    func pollDeviceLink(pollToken: String) async throws -> DeviceLinkStatusResponse {
        Logger.auth.debug("Polling device link status")
        let payload = try JSONSerialization.data(withJSONObject: ["pollToken": pollToken], options: [])
        let request = makeRequest(path: "/api/device/link/status", method: "POST", body: payload)
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            Logger.auth.error("Invalid HTTP response while polling device link")
            throw APIError.requestFailed(status: -1)
        }
        if http.statusCode == 200 {
            let decoded = try jsonDecoder.decode(DeviceLinkStatusResponse.self, from: data)
            Logger.auth.info("Device link status: \(decoded.status)")
            return decoded
        }
        if let decoded = try? jsonDecoder.decode(DeviceLinkStatusResponse.self, from: data) {
            Logger.auth.info("Device link status: \(decoded.status)")
            return decoded
        }
        if http.statusCode == 410 {
            Logger.auth.warning("Device link expired")
            return DeviceLinkStatusResponse(status: "expired", expiresAt: nil, deviceName: nil, user: nil, tokens: nil)
        }
        Logger.auth.warning("Device link invalid")
        return DeviceLinkStatusResponse(status: "invalid", expiresAt: nil, deviceName: nil, user: nil, tokens: nil)
    }

    func fetchCurrentUser() async throws -> RemoteUser? {
        Logger.auth.debug("Fetching current user")
        let request = makeRequest(path: "/api/auth/user")
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            Logger.auth.error("Invalid HTTP response while fetching user")
            throw APIError.requestFailed(status: -1)
        }
        if http.statusCode == 401 {
            Logger.auth.info("User not authenticated (401)")
            return nil
        }
        if http.statusCode == 200 {
            let user = try jsonDecoder.decode(RemoteUser.self, from: data)
            Logger.auth.logAuthSuccess(user.id)
            return user
        }
        Logger.auth.error("Failed to fetch user: status \(http.statusCode)")
        throw APIError.requestFailed(status: http.statusCode)
    }

    func logout() async {
        Logger.auth.notice("Logging out user")
        var request = makeRequest(path: "/api/logout")
        request.httpMethod = "GET"
        _ = try? await session.data(for: request)
        Logger.auth.info("Logout request completed")
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

    // MARK: - Authenticated Requests with Token Management

    func authenticatedRequest<T: Decodable>(
        _ endpoint: String,
        method: String = "GET",
        body: Encodable? = nil
    ) async throws -> T {
        let deviceId = DeviceIDManager.shared.deviceID

        // Get access token from Keychain
        guard let accessToken = KeychainManager.shared.getAccessToken(for: deviceId) else {
            throw APIError.notAuthenticated
        }

        // Check if token is expiring soon and refresh if needed
        if isTokenExpiringSoon(accessToken) {
            try await refreshAccessToken()
        }

        // Build request with Authorization header
        var request = makeRequest(path: endpoint, method: method)
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")

        if let body = body {
            request.httpBody = try JSONEncoder().encode(body)
        }

        let (data, response) = try await session.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        if httpResponse.statusCode == 401 {
            // Token invalid, try refresh
            try await refreshAccessToken()
            // Retry request (recursive call, but with fresh token)
            return try await self.authenticatedRequest(endpoint, method: method, body: body)
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            throw APIError.requestFailed(status: httpResponse.statusCode)
        }

        return try jsonDecoder.decode(T.self, from: data)
    }

    private func isTokenExpiringSoon(_ token: String) -> Bool {
        // Decode JWT and check expiry
        guard let payload = decodeJWT(token),
              let exp = payload["exp"] as? TimeInterval else {
            Logger.auth.warning("Could not decode JWT token, assuming expired")
            return true  // Assume expired if can't decode
        }

        let expiryDate = Date(timeIntervalSince1970: exp)
        let fiveMinutesFromNow = Date().addingTimeInterval(300)
        let expiring = expiryDate < fiveMinutesFromNow

        if expiring {
            Logger.auth.info("Access token expiring soon, will refresh")
        }

        return expiring
    }

    private func refreshAccessToken() async throws {
        let deviceId = DeviceIDManager.shared.deviceID

        Logger.auth.info("Refreshing access token")

        guard let refreshToken = KeychainManager.shared.getRefreshToken(for: deviceId) else {
            Logger.auth.error("No refresh token found in keychain")
            throw APIError.notAuthenticated
        }

        // Call backend refresh endpoint
        let payload = try JSONSerialization.data(withJSONObject: [
            "refreshToken": refreshToken,
            "deviceId": deviceId
        ], options: [])

        var request = makeRequest(path: "/api/device-auth/refresh", method: "POST", body: payload)
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let (data, response) = try await session.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            // Refresh failed - user needs to re-authenticate
            Logger.auth.error("Token refresh failed, clearing credentials")
            KeychainManager.shared.clearAll(for: deviceId)
            throw APIError.refreshFailed
        }

        struct RefreshResponse: Decodable {
            let accessToken: String
        }

        let refreshResponse = try jsonDecoder.decode(RefreshResponse.self, from: data)

        // Save new access token
        try KeychainManager.shared.saveAccessToken(refreshResponse.accessToken, for: deviceId)
        Logger.auth.notice("Access token refreshed successfully")
    }

    private func decodeJWT(_ token: String) -> [String: Any]? {
        let segments = token.components(separatedBy: ".")
        guard segments.count > 1 else { return nil }

        let payloadSegment = segments[1]
        var base64 = payloadSegment
            .replacingOccurrences(of: "-", with: "+")
            .replacingOccurrences(of: "_", with: "/")

        // Pad to multiple of 4
        while base64.count % 4 != 0 {
            base64.append("=")
        }

        guard let data = Data(base64Encoded: base64) else { return nil }

        return try? JSONSerialization.jsonObject(with: data) as? [String: Any]
    }
}
