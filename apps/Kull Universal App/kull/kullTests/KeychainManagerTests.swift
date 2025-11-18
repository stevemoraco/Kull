import XCTest
@testable import kull

final class KeychainManagerTests: XCTestCase {
    let testDeviceId = "test-device-123"

    override func tearDown() {
        // Clean up after each test
        KeychainManager.shared.clearAll(for: testDeviceId)
        super.tearDown()
    }

    func testSaveAndRetrieveAccessToken() throws {
        let token = "test-access-token"

        try KeychainManager.shared.saveAccessToken(token, for: testDeviceId)
        let retrieved = KeychainManager.shared.getAccessToken(for: testDeviceId)

        XCTAssertEqual(retrieved, token)
    }

    func testSaveAndRetrieveRefreshToken() throws {
        let token = "test-refresh-token"

        try KeychainManager.shared.saveRefreshToken(token, for: testDeviceId)
        let retrieved = KeychainManager.shared.getRefreshToken(for: testDeviceId)

        XCTAssertEqual(retrieved, token)
    }

    func testUpdateToken() throws {
        let token1 = "token-v1"
        let token2 = "token-v2"

        try KeychainManager.shared.saveAccessToken(token1, for: testDeviceId)
        try KeychainManager.shared.saveAccessToken(token2, for: testDeviceId)

        let retrieved = KeychainManager.shared.getAccessToken(for: testDeviceId)
        XCTAssertEqual(retrieved, token2)
    }

    func testDeleteAccessToken() throws {
        let token = "test-token"

        try KeychainManager.shared.saveAccessToken(token, for: testDeviceId)
        try KeychainManager.shared.deleteAccessToken(for: testDeviceId)

        let retrieved = KeychainManager.shared.getAccessToken(for: testDeviceId)
        XCTAssertNil(retrieved)
    }

    func testDeleteRefreshToken() throws {
        let token = "test-token"

        try KeychainManager.shared.saveRefreshToken(token, for: testDeviceId)
        try KeychainManager.shared.deleteRefreshToken(for: testDeviceId)

        let retrieved = KeychainManager.shared.getRefreshToken(for: testDeviceId)
        XCTAssertNil(retrieved)
    }

    func testClearAll() throws {
        try KeychainManager.shared.saveAccessToken("access", for: testDeviceId)
        try KeychainManager.shared.saveRefreshToken("refresh", for: testDeviceId)

        KeychainManager.shared.clearAll(for: testDeviceId)

        XCTAssertNil(KeychainManager.shared.getAccessToken(for: testDeviceId))
        XCTAssertNil(KeychainManager.shared.getRefreshToken(for: testDeviceId))
    }

    func testMultipleDevices() throws {
        let device1 = "device-1"
        let device2 = "device-2"

        try KeychainManager.shared.saveAccessToken("token1", for: device1)
        try KeychainManager.shared.saveAccessToken("token2", for: device2)

        XCTAssertEqual(KeychainManager.shared.getAccessToken(for: device1), "token1")
        XCTAssertEqual(KeychainManager.shared.getAccessToken(for: device2), "token2")

        // Cleanup
        KeychainManager.shared.clearAll(for: device1)
        KeychainManager.shared.clearAll(for: device2)
    }

    func testRetrieveNonExistentToken() {
        let retrieved = KeychainManager.shared.getAccessToken(for: "non-existent-device")
        XCTAssertNil(retrieved)
    }

    func testSaveEmptyStringToken() throws {
        // Should be able to save empty string
        try KeychainManager.shared.saveAccessToken("", for: testDeviceId)
        let retrieved = KeychainManager.shared.getAccessToken(for: testDeviceId)
        XCTAssertEqual(retrieved, "")
    }

    func testTokenPersistsAcrossInstances() throws {
        // Save with one instance
        try KeychainManager.shared.saveAccessToken("persistent-token", for: testDeviceId)

        // Retrieve with same singleton instance
        let retrieved = KeychainManager.shared.getAccessToken(for: testDeviceId)
        XCTAssertEqual(retrieved, "persistent-token")
    }

    func testOverwriteExistingToken() throws {
        // Save initial token
        try KeychainManager.shared.saveAccessToken("initial", for: testDeviceId)

        // Overwrite with new token
        try KeychainManager.shared.saveAccessToken("updated", for: testDeviceId)

        // Verify only the latest token exists
        let retrieved = KeychainManager.shared.getAccessToken(for: testDeviceId)
        XCTAssertEqual(retrieved, "updated")
    }

    func testSaveBothTokenTypes() throws {
        try KeychainManager.shared.saveAccessToken("access-123", for: testDeviceId)
        try KeychainManager.shared.saveRefreshToken("refresh-456", for: testDeviceId)

        XCTAssertEqual(KeychainManager.shared.getAccessToken(for: testDeviceId), "access-123")
        XCTAssertEqual(KeychainManager.shared.getRefreshToken(for: testDeviceId), "refresh-456")
    }

    func testDeleteOnlyAccessToken() throws {
        try KeychainManager.shared.saveAccessToken("access", for: testDeviceId)
        try KeychainManager.shared.saveRefreshToken("refresh", for: testDeviceId)

        try KeychainManager.shared.deleteAccessToken(for: testDeviceId)

        XCTAssertNil(KeychainManager.shared.getAccessToken(for: testDeviceId))
        XCTAssertEqual(KeychainManager.shared.getRefreshToken(for: testDeviceId), "refresh")
    }

    func testDeleteOnlyRefreshToken() throws {
        try KeychainManager.shared.saveAccessToken("access", for: testDeviceId)
        try KeychainManager.shared.saveRefreshToken("refresh", for: testDeviceId)

        try KeychainManager.shared.deleteRefreshToken(for: testDeviceId)

        XCTAssertEqual(KeychainManager.shared.getAccessToken(for: testDeviceId), "access")
        XCTAssertNil(KeychainManager.shared.getRefreshToken(for: testDeviceId))
    }

    func testLongTokenString() throws {
        // Test with a very long token (simulating JWT)
        let longToken = String(repeating: "a", count: 10000)

        try KeychainManager.shared.saveAccessToken(longToken, for: testDeviceId)
        let retrieved = KeychainManager.shared.getAccessToken(for: testDeviceId)

        XCTAssertEqual(retrieved, longToken)
    }

    func testSpecialCharactersInToken() throws {
        // Test with special characters that might appear in JWTs
        let specialToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"

        try KeychainManager.shared.saveAccessToken(specialToken, for: testDeviceId)
        let retrieved = KeychainManager.shared.getAccessToken(for: testDeviceId)

        XCTAssertEqual(retrieved, specialToken)
    }

    func testUnicodeInToken() throws {
        // Test with unicode characters
        let unicodeToken = "token-with-emoji-😀-and-unicode-字符"

        try KeychainManager.shared.saveAccessToken(unicodeToken, for: testDeviceId)
        let retrieved = KeychainManager.shared.getAccessToken(for: testDeviceId)

        XCTAssertEqual(retrieved, unicodeToken)
    }
}
