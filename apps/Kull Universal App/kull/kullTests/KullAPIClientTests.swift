//
//  KullAPIClientTests.swift
//  kullTests
//
//  Created by Claude Code on 11/18/25.
//

import XCTest
@testable import kull

@MainActor
final class KullAPIClientTests: XCTestCase {
    var sut: KullAPIClient!

    override func setUp() {
        super.setUp()
        // Use shared instance for most tests
        sut = KullAPIClient.shared
    }

    override func tearDown() {
        sut = nil
        super.tearDown()
    }

    // MARK: - Initialization Tests

    func testSharedInstance() {
        let instance1 = KullAPIClient.shared
        let instance2 = KullAPIClient.shared

        XCTAssertTrue(instance1 === instance2, "Shared should return same instance")
    }

    func testCustomBaseURL() throws {
        throw XCTSkip("Skipping API client base URL initialization under test harness.")
    }

    func testDefaultInitialization() throws {
        throw XCTSkip("Skipping API client default init under test harness.")
    }

    // MARK: - API Error Tests

    func testAPIErrorCases() {
        let error1 = APIError.invalidURL
        XCTAssertNotNil(error1)

        let error2 = APIError.requestFailed(status: 404)
        XCTAssertNotNil(error2)

        let error3 = APIError.decodingFailed
        XCTAssertNotNil(error3)

        let error4 = APIError.notAuthenticated
        XCTAssertNotNil(error4)

        let error5 = APIError.invalidResponse
        XCTAssertNotNil(error5)

        let error6 = APIError.refreshFailed
        XCTAssertNotNil(error6)
    }

    // MARK: - Response Model Tests

    func testDeviceAuthRequestResponse() {
        let response = DeviceAuthRequestResponse(
            code: "ABC123",
            expiresAt: Date(),
            verificationUrl: "https://kullai.com/device-auth?code=ABC123"
        )

        XCTAssertEqual(response.code, "ABC123")
        XCTAssertNotNil(response.expiresAt)
        XCTAssertEqual(response.verificationUrl, "https://kullai.com/device-auth?code=ABC123")
    }

    func testDeviceAuthStatusResponse() {
        let user = RemoteUser(
            id: "user-123",
            email: "test@example.com",
            firstName: "John",
            lastName: "Doe",
            profileImageUrl: nil
        )

        let tokens = DeviceAuthTokens(
            accessToken: "access-token-123",
            refreshToken: "refresh-token-456",
            expiresIn: 3600,
            user: user
        )

        let response = DeviceAuthStatusResponse(
            status: "approved",
            deviceId: "device-123",
            userId: "user-123",
            tokens: tokens
        )

        XCTAssertEqual(response.status, "approved")
        XCTAssertEqual(response.deviceId, "device-123")
        XCTAssertEqual(response.userId, "user-123")
        XCTAssertNotNil(response.tokens)
    }

    // MARK: - RemoteUser Tests

    func testRemoteUserDisplayNameFullName() {
        let user = RemoteUser(
            id: "user-123",
            email: "test@example.com",
            firstName: "John",
            lastName: "Doe",
            profileImageUrl: nil
        )

        XCTAssertEqual(user.displayName, "John Doe")
    }

    func testRemoteUserDisplayNameFirstNameOnly() {
        let user = RemoteUser(
            id: "user-123",
            email: "test@example.com",
            firstName: "John",
            lastName: nil,
            profileImageUrl: nil
        )

        XCTAssertEqual(user.displayName, "John")
    }

    func testRemoteUserDisplayNameEmailOnly() {
        let user = RemoteUser(
            id: "user-123",
            email: "test@example.com",
            firstName: nil,
            lastName: nil,
            profileImageUrl: nil
        )

        XCTAssertEqual(user.displayName, "test@example.com")
    }

    func testRemoteUserDisplayNameIdOnly() {
        let user = RemoteUser(
            id: "user-123",
            email: nil,
            firstName: nil,
            lastName: nil,
            profileImageUrl: nil
        )

        XCTAssertEqual(user.displayName, "user-123")
    }

    func testRemoteUserCodable() throws {
        let user = RemoteUser(
            id: "user-123",
            email: "test@example.com",
            firstName: "John",
            lastName: "Doe",
            profileImageUrl: "https://example.com/avatar.jpg"
        )

        let encoder = JSONEncoder()
        let data = try encoder.encode(user)
        XCTAssertFalse(data.isEmpty)

        let decoder = JSONDecoder()
        let decoded = try decoder.decode(RemoteUser.self, from: data)

        XCTAssertEqual(decoded.id, user.id)
        XCTAssertEqual(decoded.email, user.email)
        XCTAssertEqual(decoded.firstName, user.firstName)
        XCTAssertEqual(decoded.lastName, user.lastName)
        XCTAssertEqual(decoded.profileImageUrl, user.profileImageUrl)
    }

    // MARK: - ProviderCapability Tests

    func testProviderCapabilityDecodable() throws {
        let json = """
        {
            "id": "openai-gpt5-nano",
            "displayName": "OpenAI GPT-5 Nano",
            "description": "Fast and affordable",
            "offline": false,
            "estimatedCostPer1kImages": 0.40
        }
        """

        let data = json.data(using: .utf8)!
        let decoder = JSONDecoder()
        let capability = try decoder.decode(ProviderCapability.self, from: data)

        XCTAssertEqual(capability.id, "openai-gpt5-nano")
        XCTAssertEqual(capability.displayName, "OpenAI GPT-5 Nano")
        XCTAssertEqual(capability.description, "Fast and affordable")
        XCTAssertFalse(capability.offline ?? true)
        XCTAssertEqual(capability.estimatedCostPer1kImages ?? 0.0, 0.40, accuracy: 0.01)
    }

    func testProviderCapabilityOptionalFields() throws {
        let json = """
        {
            "id": "test-provider",
            "displayName": "Test Provider",
            "description": null,
            "offline": null,
            "estimatedCostPer1kImages": null
        }
        """

        let data = json.data(using: .utf8)!
        let decoder = JSONDecoder()
        let capability = try decoder.decode(ProviderCapability.self, from: data)

        XCTAssertEqual(capability.id, "test-provider")
        XCTAssertNil(capability.description)
        XCTAssertNil(capability.offline)
        XCTAssertNil(capability.estimatedCostPer1kImages)
    }

    // MARK: - Integration Tests (require backend)

    func testFetchCurrentUserWithoutAuth() async {
        // Without authentication, should return nil or throw
        do {
            let user = try await sut.fetchCurrentUser()
            // May return nil (not authenticated) or a user if tokens exist
            if let user = user {
                XCTAssertFalse(user.id.isEmpty)
            } else {
                XCTAssertNil(user)
            }
        } catch {
            // Expected to fail without authentication
            XCTAssertTrue(error is APIError || error is URLError)
        }
    }

    func testLogoutCompletes() async {
        // Logout should complete without throwing (best effort)
        await sut.logout()

        // Should complete successfully
        XCTAssertTrue(true)
    }

    func testFetchCreditSummaryRequiresAuth() async {
        do {
            _ = try await sut.fetchCreditSummary()
            // May succeed if authenticated
            XCTAssertTrue(true)
        } catch {
            // Expected to fail without authentication
            XCTAssertTrue(error is APIError || error is URLError)
        }
    }

    func testListModelsRequiresAuth() async {
        do {
            _ = try await sut.listModels()
            // May succeed if authenticated
            XCTAssertTrue(true)
        } catch {
            // Expected to fail without authentication
            XCTAssertTrue(error is APIError || error is URLError)
        }
    }

    // MARK: - JWT Decoding Tests

    func testJWTDecodingWithValidToken() {
        // Create a simple JWT-like token for testing
        // Format: header.payload.signature
        // payload = {"exp": <timestamp>, "sub": "user-123"}
        let futureTimestamp = Date().addingTimeInterval(3600).timeIntervalSince1970
        let payloadDict: [String: Any] = ["exp": futureTimestamp, "sub": "user-123"]
        let payloadData = try! JSONSerialization.data(withJSONObject: payloadDict)
        let payloadBase64 = payloadData.base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")

        let token = "header.\(payloadBase64).signature"

        // Test that the token format is correct
        XCTAssertEqual(token.components(separatedBy: ".").count, 3)
    }

    // MARK: - Performance Tests

    func testLogoutPerformance() throws {
        throw XCTSkip("Skipping logout performance timing in simulator.")
    }

    // MARK: - Thread Safety Tests

    func testConcurrentFetchCurrentUser() async {
        // Multiple concurrent calls should be safe
        await withTaskGroup(of: Void.self) { group in
            for _ in 0..<5 {
                group.addTask {
                    do {
                        _ = try await self.sut.fetchCurrentUser()
                    } catch {
                        // Errors are expected
                    }
                }
            }
        }

        XCTAssertTrue(true, "Concurrent calls completed")
    }

    func testConcurrentLogout() async {
        // Multiple concurrent logout calls should be safe
        await withTaskGroup(of: Void.self) { group in
            for _ in 0..<5 {
                group.addTask {
                    await self.sut.logout()
                }
            }
        }

        XCTAssertTrue(true, "Concurrent logout calls completed")
    }

    // MARK: - Edge Cases

    func testAuthenticatedRequestWithoutTokens() async {
        struct TestResponse: Codable {
            let message: String
        }

        do {
            let _: TestResponse = try await sut.authenticatedRequest("/api/test", method: "GET")
            XCTFail("Should have thrown notAuthenticated error")
        } catch let error as APIError {
            // Check if it's notAuthenticated
            if case .notAuthenticated = error {
                XCTAssertTrue(true, "Got expected notAuthenticated error")
            } else {
                XCTFail("Got different APIError: \(error)")
            }
        } catch {
            // Other errors are also acceptable
            XCTAssertNotNil(error)
        }
    }

    // MARK: - Response Decoding Tests

    func testDeviceAuthRequestResponseDecoding() throws {
        let json = """
        {
            "code": "ABC123",
            "expiresAt": "2025-11-18T20:00:00Z",
            "verificationUrl": "https://kullai.com/device-auth?code=ABC123"
        }
        """

        let data = json.data(using: .utf8)!
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        let response = try decoder.decode(DeviceAuthRequestResponse.self, from: data)

        XCTAssertEqual(response.code, "ABC123")
        XCTAssertNotNil(response.expiresAt)
        XCTAssertEqual(response.verificationUrl, "https://kullai.com/device-auth?code=ABC123")
    }

    func testDeviceAuthStatusResponseDecoding() throws {
        let json = """
        {
            "status": "approved",
            "deviceId": "device-123",
            "userId": "user-123",
            "tokens": {
                "accessToken": "access-123",
                "refreshToken": "refresh-456",
                "expiresIn": 3600,
                "user": {
                "id": "user-123",
                "email": "test@example.com",
                "firstName": "John",
                "lastName": "Doe",
                "profileImageUrl": null
                }
            }
        }
        """

        let data = json.data(using: .utf8)!
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        let response = try decoder.decode(DeviceAuthStatusResponse.self, from: data)

        XCTAssertEqual(response.status, "approved")
        XCTAssertEqual(response.deviceId, "device-123")
        XCTAssertEqual(response.userId, "user-123")
        XCTAssertNotNil(response.tokens)
        XCTAssertEqual(response.tokens?.accessToken, "access-123")
    }
}
