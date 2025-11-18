//
//  SyncMessageModelsTests.swift
//  kullTests
//
//  Created by Claude Code on 11/18/25.
//

import XCTest
@testable import kull

final class SyncMessageModelsTests: XCTestCase {

    // MARK: - SyncMessageType Tests

    func testSyncMessageTypeRawValues() {
        XCTAssertEqual(SyncMessageType.shootProgress.rawValue, "SHOOT_PROGRESS")
        XCTAssertEqual(SyncMessageType.creditUpdate.rawValue, "CREDIT_UPDATE")
        XCTAssertEqual(SyncMessageType.promptChange.rawValue, "PROMPT_CHANGE")
        XCTAssertEqual(SyncMessageType.deviceConnected.rawValue, "DEVICE_CONNECTED")
        XCTAssertEqual(SyncMessageType.deviceDisconnected.rawValue, "DEVICE_DISCONNECTED")
        XCTAssertEqual(SyncMessageType.adminSessionUpdate.rawValue, "ADMIN_SESSION_UPDATE")
        XCTAssertEqual(SyncMessageType.ping.rawValue, "PING")
        XCTAssertEqual(SyncMessageType.pong.rawValue, "PONG")
    }

    func testSyncMessageTypeCodable() throws {
        let type = SyncMessageType.shootProgress
        let encoder = JSONEncoder()
        let decoder = JSONDecoder()

        let data = try encoder.encode(type)
        let decoded = try decoder.decode(SyncMessageType.self, from: data)

        XCTAssertEqual(decoded, type)
    }

    // MARK: - ShootStatus Tests

    func testShootStatusRawValues() {
        XCTAssertEqual(ShootStatus.queued.rawValue, "queued")
        XCTAssertEqual(ShootStatus.processing.rawValue, "processing")
        XCTAssertEqual(ShootStatus.completed.rawValue, "completed")
        XCTAssertEqual(ShootStatus.failed.rawValue, "failed")
    }

    func testShootStatusCodable() throws {
        let status = ShootStatus.processing
        let encoder = JSONEncoder()
        let decoder = JSONDecoder()

        let data = try encoder.encode(status)
        let decoded = try decoder.decode(ShootStatus.self, from: data)

        XCTAssertEqual(decoded, status)
    }

    // MARK: - ShootProgressPayload Tests

    func testShootProgressPayloadProgress() {
        let payload = ShootProgressPayload(
            shootId: "shoot-123",
            status: .processing,
            processedCount: 50,
            totalCount: 100,
            currentImage: "image.jpg",
            eta: 30,
            provider: "gpt-5-nano",
            errorMessage: nil
        )

        XCTAssertEqual(payload.progress, 0.5, accuracy: 0.01)
    }

    func testShootProgressPayloadProgressZeroTotal() {
        let payload = ShootProgressPayload(
            shootId: "shoot-123",
            status: .processing,
            processedCount: 0,
            totalCount: 0,
            currentImage: nil,
            eta: nil,
            provider: "gpt-5-nano",
            errorMessage: nil
        )

        XCTAssertEqual(payload.progress, 0)
    }

    func testShootProgressPayloadCodable() throws {
        let payload = ShootProgressPayload(
            shootId: "shoot-123",
            status: .processing,
            processedCount: 50,
            totalCount: 100,
            currentImage: "image.jpg",
            eta: 30,
            provider: "gpt-5-nano",
            errorMessage: nil
        )

        let encoder = JSONEncoder()
        let decoder = JSONDecoder()

        let data = try encoder.encode(payload)
        let decoded = try decoder.decode(ShootProgressPayload.self, from: data)

        XCTAssertEqual(decoded, payload)
    }

    func testShootProgressPayloadEquality() {
        let payload1 = ShootProgressPayload(
            shootId: "shoot-123",
            status: .processing,
            processedCount: 50,
            totalCount: 100,
            currentImage: "image.jpg",
            eta: 30,
            provider: "gpt-5-nano",
            errorMessage: nil
        )

        let payload2 = ShootProgressPayload(
            shootId: "shoot-123",
            status: .processing,
            processedCount: 50,
            totalCount: 100,
            currentImage: "image.jpg",
            eta: 30,
            provider: "gpt-5-nano",
            errorMessage: nil
        )

        XCTAssertEqual(payload1, payload2)
    }

    // MARK: - CreditUpdatePayload Tests

    func testCreditUpdatePayloadCodable() throws {
        let payload = CreditUpdatePayload(
            userId: "user-123",
            newBalance: 5000,
            change: -100,
            reason: "AI processing"
        )

        let encoder = JSONEncoder()
        let decoder = JSONDecoder()

        let data = try encoder.encode(payload)
        let decoded = try decoder.decode(CreditUpdatePayload.self, from: data)

        XCTAssertEqual(decoded, payload)
    }

    func testCreditUpdatePayloadEquality() {
        let payload1 = CreditUpdatePayload(
            userId: "user-123",
            newBalance: 5000,
            change: -100,
            reason: "AI processing"
        )

        let payload2 = CreditUpdatePayload(
            userId: "user-123",
            newBalance: 5000,
            change: -100,
            reason: "AI processing"
        )

        XCTAssertEqual(payload1, payload2)
    }

    // MARK: - PromptChangePayload Tests

    func testPromptChangePayloadActions() {
        XCTAssertEqual(PromptChangePayload.PromptAction.created.rawValue, "created")
        XCTAssertEqual(PromptChangePayload.PromptAction.updated.rawValue, "updated")
        XCTAssertEqual(PromptChangePayload.PromptAction.deleted.rawValue, "deleted")
        XCTAssertEqual(PromptChangePayload.PromptAction.voted.rawValue, "voted")
    }

    func testPromptChangePayloadCodable() throws {
        let payload = PromptChangePayload(
            promptId: "prompt-123",
            action: .created
        )

        let encoder = JSONEncoder()
        let decoder = JSONDecoder()

        let data = try encoder.encode(payload)
        let decoded = try decoder.decode(PromptChangePayload.self, from: data)

        XCTAssertEqual(decoded, payload)
    }

    func testPromptChangePayloadEquality() {
        let payload1 = PromptChangePayload(promptId: "prompt-123", action: .created)
        let payload2 = PromptChangePayload(promptId: "prompt-123", action: .created)

        XCTAssertEqual(payload1, payload2)
    }

    // MARK: - DeviceConnectionPayload Tests

    func testDeviceConnectionPayloadCodable() throws {
        let payload = DeviceConnectionPayload(
            deviceId: "device-123",
            platform: "macOS",
            deviceName: "MacBook Pro",
            connectedAt: Date().timeIntervalSince1970
        )

        let encoder = JSONEncoder()
        let decoder = JSONDecoder()

        let data = try encoder.encode(payload)
        let decoded = try decoder.decode(DeviceConnectionPayload.self, from: data)

        XCTAssertEqual(decoded, payload)
    }

    func testDeviceConnectionPayloadEquality() {
        let timestamp = Date().timeIntervalSince1970

        let payload1 = DeviceConnectionPayload(
            deviceId: "device-123",
            platform: "macOS",
            deviceName: "MacBook Pro",
            connectedAt: timestamp
        )

        let payload2 = DeviceConnectionPayload(
            deviceId: "device-123",
            platform: "macOS",
            deviceName: "MacBook Pro",
            connectedAt: timestamp
        )

        XCTAssertEqual(payload1, payload2)
    }

    // MARK: - AdminSessionUpdatePayload Tests

    func testAdminSessionUpdatePayloadActions() {
        XCTAssertEqual(AdminSessionUpdatePayload.AdminAction.newMessage.rawValue, "new_message")
        XCTAssertEqual(AdminSessionUpdatePayload.AdminAction.sessionUpdated.rawValue, "session_updated")
    }

    func testAdminSessionUpdatePayloadCodable() throws {
        let payload = AdminSessionUpdatePayload(
            sessionId: "session-123",
            userId: "user-456",
            userEmail: "test@example.com",
            action: .newMessage,
            messageCount: 5
        )

        let encoder = JSONEncoder()
        let decoder = JSONDecoder()

        let data = try encoder.encode(payload)
        let decoded = try decoder.decode(AdminSessionUpdatePayload.self, from: data)

        XCTAssertEqual(decoded, payload)
    }

    // MARK: - PingPayload Tests

    func testPingPayloadCodable() throws {
        let payload = PingPayload(timestamp: Date().timeIntervalSince1970)

        let encoder = JSONEncoder()
        let decoder = JSONDecoder()

        let data = try encoder.encode(payload)
        let decoded = try decoder.decode(PingPayload.self, from: data)

        XCTAssertEqual(decoded, payload)
    }

    // MARK: - PongPayload Tests

    func testPongPayloadCodable() throws {
        let payload = PongPayload(timestamp: Date().timeIntervalSince1970)

        let encoder = JSONEncoder()
        let decoder = JSONDecoder()

        let data = try encoder.encode(payload)
        let decoded = try decoder.decode(PongPayload.self, from: data)

        XCTAssertEqual(decoded, payload)
    }

    // MARK: - WebSocketClientMessageType Tests

    func testWebSocketClientMessageTypeRawValues() {
        XCTAssertEqual(WebSocketClientMessageType.subscribe.rawValue, "SUBSCRIBE")
        XCTAssertEqual(WebSocketClientMessageType.unsubscribe.rawValue, "UNSUBSCRIBE")
        XCTAssertEqual(WebSocketClientMessageType.updateProgress.rawValue, "UPDATE_PROGRESS")
        XCTAssertEqual(WebSocketClientMessageType.ping.rawValue, "PING")
    }

    func testWebSocketClientMessageCodable() throws {
        let payload = PingPayload(timestamp: Date().timeIntervalSince1970)
        let message = WebSocketClientMessage(type: .ping, payload: payload)

        let encoder = JSONEncoder()
        let decoder = JSONDecoder()

        let data = try encoder.encode(message)
        let decoded = try decoder.decode(WebSocketClientMessage<PingPayload>.self, from: data)

        XCTAssertEqual(decoded.type, message.type)
    }

    // MARK: - SyncMessage Tests

    func testSyncMessageCodable() throws {
        let payload = ShootProgressPayload(
            shootId: "shoot-123",
            status: .processing,
            processedCount: 50,
            totalCount: 100,
            currentImage: "image.jpg",
            eta: 30,
            provider: "gpt-5-nano",
            errorMessage: nil
        )

        let message = SyncMessage(
            type: .shootProgress,
            data: payload,
            timestamp: Date().timeIntervalSince1970,
            deviceId: "device-123",
            userId: "user-456"
        )

        let encoder = JSONEncoder()
        let decoder = JSONDecoder()

        let data = try encoder.encode(message)
        let decoded = try decoder.decode(SyncMessage<ShootProgressPayload>.self, from: data)

        XCTAssertEqual(decoded.type, message.type)
        XCTAssertEqual(decoded.data, message.data)
        XCTAssertEqual(decoded.deviceId, message.deviceId)
        XCTAssertEqual(decoded.userId, message.userId)
    }

    // MARK: - GenericSyncMessage Tests

    func testGenericSyncMessageDecoding() throws {
        let jsonString = """
        {
            "type": "SHOOT_PROGRESS",
            "data": {
                "shootId": "shoot-123",
                "status": "processing",
                "processedCount": 50,
                "totalCount": 100,
                "provider": "gpt-5-nano"
            },
            "timestamp": 1234567890,
            "deviceId": "device-123",
            "userId": "user-456"
        }
        """

        let data = jsonString.data(using: .utf8)!
        let decoder = JSONDecoder()

        let message = try decoder.decode(GenericSyncMessage.self, from: data)

        XCTAssertEqual(message.type, .shootProgress)
        XCTAssertEqual(message.deviceId, "device-123")
        XCTAssertEqual(message.userId, "user-456")
    }

    // MARK: - Performance Tests

    func testShootProgressPayloadEncodingPerformance() {
        let payload = ShootProgressPayload(
            shootId: "shoot-123",
            status: .processing,
            processedCount: 50,
            totalCount: 100,
            currentImage: "image.jpg",
            eta: 30,
            provider: "gpt-5-nano",
            errorMessage: nil
        )

        let encoder = JSONEncoder()

        measure {
            for _ in 0..<1000 {
                _ = try? encoder.encode(payload)
            }
        }
    }

    func testShootProgressPayloadDecodingPerformance() throws {
        let payload = ShootProgressPayload(
            shootId: "shoot-123",
            status: .processing,
            processedCount: 50,
            totalCount: 100,
            currentImage: "image.jpg",
            eta: 30,
            provider: "gpt-5-nano",
            errorMessage: nil
        )

        let encoder = JSONEncoder()
        let data = try encoder.encode(payload)
        let decoder = JSONDecoder()

        measure {
            for _ in 0..<1000 {
                _ = try? decoder.decode(ShootProgressPayload.self, from: data)
            }
        }
    }
}
