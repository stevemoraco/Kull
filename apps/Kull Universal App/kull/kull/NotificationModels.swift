//
//  NotificationModels.swift
//  kull - Universal App for macOS, iOS, and iPadOS
//
//  Created by Agent 12 on 11/18/25.
//

import Foundation

/// Notification payload types sent from backend
enum NotificationType: String, Codable {
    case shootComplete = "shoot_complete"
    case deviceConnected = "device_connected"
    case deviceDisconnected = "device_disconnected"
    case creditLow = "credit_low"
    case shootFailed = "shoot_failed"
    case batchComplete = "batch_complete"
}

/// APNs notification payload structure
struct APNsPayload: Codable {
    let aps: APsContent
    let type: String
    let data: [String: AnyCodable]

    struct APsContent: Codable {
        let alert: Alert
        let badge: Int?
        let sound: String?

        struct Alert: Codable {
            let title: String
            let body: String
        }
    }
}

/// Type-erased Codable wrapper for heterogeneous notification data
struct AnyCodable: Codable {
    let value: Any

    init<T>(_ value: T) {
        self.value = value
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()

        if let intValue = try? container.decode(Int.self) {
            value = intValue
        } else if let stringValue = try? container.decode(String.self) {
            value = stringValue
        } else if let boolValue = try? container.decode(Bool.self) {
            value = boolValue
        } else if let doubleValue = try? container.decode(Double.self) {
            value = doubleValue
        } else if let arrayValue = try? container.decode([AnyCodable].self) {
            value = arrayValue.map { $0.value }
        } else if let dictValue = try? container.decode([String: AnyCodable].self) {
            value = dictValue.mapValues { $0.value }
        } else {
            throw DecodingError.dataCorruptedError(
                in: container,
                debugDescription: "Unsupported type"
            )
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()

        switch value {
        case let intValue as Int:
            try container.encode(intValue)
        case let stringValue as String:
            try container.encode(stringValue)
        case let boolValue as Bool:
            try container.encode(boolValue)
        case let doubleValue as Double:
            try container.encode(doubleValue)
        case let arrayValue as [Any]:
            try container.encode(arrayValue.map { AnyCodable($0) })
        case let dictValue as [String: Any]:
            try container.encode(dictValue.mapValues { AnyCodable($0) })
        default:
            throw EncodingError.invalidValue(
                value,
                EncodingError.Context(
                    codingPath: container.codingPath,
                    debugDescription: "Unsupported type"
                )
            )
        }
    }
}

/// Shoot completion notification data
struct ShootCompleteNotification: Codable {
    let shootId: String
    let imageCount: Int
    let activeCount: Int
    let duration: Int? // seconds
    let cost: Double? // dollars
}

/// Device connection notification data
struct DeviceConnectionNotification: Codable {
    let deviceName: String
    let deviceId: String
    let platform: String
    let timestamp: Date
}

/// Credit balance notification data
struct CreditLowNotification: Codable {
    let remaining: Int
    let threshold: Int
    let plan: String
}

/// Batch processing notification data
struct BatchCompleteNotification: Codable {
    let batchId: String
    let imageCount: Int
    let successCount: Int
    let failedCount: Int
    let duration: Int // seconds
}

/// Shoot failure notification data
struct ShootFailedNotification: Codable {
    let shootId: String
    let reason: String
    let errorCode: String?
}

/// Notification preference settings
struct NotificationPreferences: Codable {
    var shootComplete: Bool = true
    var deviceConnection: Bool = true
    var creditLow: Bool = true
    var batchComplete: Bool = true
    var shootFailed: Bool = true

    /// Check if notification type should be delivered based on preferences
    func shouldDeliver(type: NotificationType) -> Bool {
        switch type {
        case .shootComplete:
            return shootComplete
        case .deviceConnected, .deviceDisconnected:
            return deviceConnection
        case .creditLow:
            return creditLow
        case .batchComplete:
            return batchComplete
        case .shootFailed:
            return shootFailed
        }
    }
}

/// Device token registration response
struct DeviceTokenResponse: Codable {
    let success: Bool
    let message: String?
    let tokenId: String?
}

/// Notification history item (for UI display)
struct NotificationHistoryItem: Identifiable, Codable {
    let id: String
    let type: NotificationType
    let title: String
    let body: String
    let timestamp: Date
    let read: Bool
    let data: [String: String]

    var timeAgo: String {
        let seconds = Int(Date().timeIntervalSince(timestamp))
        if seconds < 60 { return "\(seconds)s ago" }
        let minutes = seconds / 60
        if minutes < 60 { return "\(minutes)m ago" }
        let hours = minutes / 60
        if hours < 24 { return "\(hours)h ago" }
        let days = hours / 24
        return "\(days)d ago"
    }
}
