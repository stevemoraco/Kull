//
//  SyncMessageModels.swift
//  kull - WebSocket Real-Time Sync Message Models
//
//  Created by Claude Code on 11/18/25.
//

import Foundation

// MARK: - Sync Message Types

enum SyncMessageType: String, Codable {
    case shootProgress = "SHOOT_PROGRESS"
    case creditUpdate = "CREDIT_UPDATE"
    case promptChange = "PROMPT_CHANGE"
    case deviceConnected = "DEVICE_CONNECTED"
    case deviceDisconnected = "DEVICE_DISCONNECTED"
    case adminSessionUpdate = "ADMIN_SESSION_UPDATE"
    case ping = "PING"
    case pong = "PONG"
}

// MARK: - Shoot Status

enum ShootStatus: String, Codable {
    case queued
    case processing
    case completed
    case failed
}

// MARK: - Sync Message Wrapper

struct SyncMessage<T: Codable>: Codable {
    let type: SyncMessageType
    let data: T
    let timestamp: TimeInterval
    let deviceId: String
    let userId: String?

    enum CodingKeys: String, CodingKey {
        case type
        case data
        case timestamp
        case deviceId
        case userId
    }
}

// MARK: - Generic Sync Message (for decoding unknown payloads)

struct GenericSyncMessage: Codable {
    let type: SyncMessageType
    let timestamp: TimeInterval
    let deviceId: String
    let userId: String?

    enum CodingKeys: String, CodingKey {
        case type
        case data
        case timestamp
        case deviceId
        case userId
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        type = try container.decode(SyncMessageType.self, forKey: .type)
        timestamp = try container.decode(TimeInterval.self, forKey: .timestamp)
        deviceId = try container.decode(String.self, forKey: .deviceId)
        userId = try? container.decode(String.self, forKey: .userId)
    }
}

// MARK: - Message Payloads

struct ShootProgressPayload: Codable, Equatable {
    let shootId: String
    let status: ShootStatus
    let processedCount: Int
    let totalCount: Int
    let currentImage: String?
    let eta: TimeInterval?
    let provider: String
    let errorMessage: String?

    var progress: Double {
        guard totalCount > 0 else { return 0 }
        return Double(processedCount) / Double(totalCount)
    }
}

struct CreditUpdatePayload: Codable, Equatable {
    let userId: String
    let newBalance: Int
    let change: Int
    let reason: String
}

struct PromptChangePayload: Codable, Equatable {
    let promptId: String
    let action: PromptAction

    enum PromptAction: String, Codable {
        case created
        case updated
        case deleted
        case voted
    }
}

struct DeviceConnectionPayload: Codable, Equatable {
    let deviceId: String
    let platform: String
    let deviceName: String
    let connectedAt: TimeInterval
}

struct AdminSessionUpdatePayload: Codable, Equatable {
    let sessionId: String
    let userId: String?
    let userEmail: String?
    let action: AdminAction
    let messageCount: Int?

    enum AdminAction: String, Codable {
        case newMessage = "new_message"
        case sessionUpdated = "session_updated"
    }
}

struct PingPayload: Codable, Equatable {
    let timestamp: TimeInterval
}

struct PongPayload: Codable, Equatable {
    let timestamp: TimeInterval
}

// MARK: - Client Message Types (messages sent from client to server)

enum WebSocketClientMessageType: String, Codable {
    case subscribe = "SUBSCRIBE"
    case unsubscribe = "UNSUBSCRIBE"
    case updateProgress = "UPDATE_PROGRESS"
    case ping = "PING"
}

struct WebSocketClientMessage<T: Codable>: Codable {
    let type: WebSocketClientMessageType
    let payload: T?
}

// MARK: - Type-Safe Handler Closures

typealias ShootProgressHandler = (ShootProgressPayload) -> Void
typealias CreditUpdateHandler = (CreditUpdatePayload) -> Void
typealias PromptChangeHandler = (PromptChangePayload) -> Void
typealias DeviceConnectionHandler = (DeviceConnectionPayload) -> Void
typealias AdminSessionUpdateHandler = (AdminSessionUpdatePayload) -> Void
