//
//  NotificationService.swift
//  kull - Universal App for macOS, iOS, and iPadOS
//
//  Created by Agent 12 on 11/18/25.
//

import Foundation
import UserNotifications
import Combine
import OSLog
#if os(iOS)
import UIKit
#endif

/// Manages push notifications for iOS platform
/// - Requests notification permissions
/// - Registers device tokens with backend
/// - Handles shoot completion and device connection notifications
/// - Updates app badge with active shoot count
@MainActor
class NotificationService: NSObject, ObservableObject {
    static let shared = NotificationService()

    @Published var permissionGranted = false
    @Published var deviceToken: String?
    @Published var pendingNotifications: [PushNotification] = []

    private override init() {
        super.init()
    }

    /// Request notification permissions on app launch
    func requestPermissions() async throws {
        #if os(iOS)
        let center = UNUserNotificationCenter.current()

        let granted = try await center.requestAuthorization(options: [
            .alert, .badge, .sound, .provisional
        ])

        self.permissionGranted = granted

        if granted {
            Logger.general.info("Push notification permissions granted")
            // Register for remote notifications on main thread
            await UIApplication.shared.registerForRemoteNotifications()
        } else {
            Logger.general.warning("Push notification permissions denied")
        }
        #else
        Logger.general.info("Push notifications not supported on macOS")
        #endif
    }

    /// Called when APNs device token is received
    func didRegisterForRemoteNotifications(deviceToken: Data) {
        let token = deviceToken.map { String(format: "%02.2hhx", $0) }.joined()
        self.deviceToken = token

        Logger.general.info("APNs device token received: \(token.prefix(10))...")

        // Send to backend
        Task {
            do {
                try await registerDeviceToken(token)
                Logger.general.info("Device token successfully registered with backend")
            } catch {
                Logger.errors.error("Failed to register device token: \(error)")
            }
        }
    }

    /// Register device token with backend
    private func registerDeviceToken(_ token: String) async throws {
        let endpoint = "\(EnvironmentConfig.shared.apiBaseURL)/api/notifications/register"

        guard let url = URL(string: endpoint) else {
            throw NotificationError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        // Add auth token
        let deviceId = DeviceIDManager.shared.deviceID
        if let authToken = KeychainManager.shared.getAccessToken(for: deviceId) {
            request.setValue("Bearer \(authToken)", forHTTPHeaderField: "Authorization")
        } else {
            throw NotificationError.notAuthenticated
        }

        let body = RegisterDeviceTokenRequest(
            deviceToken: token,
            deviceId: DeviceIDManager.shared.deviceID,
            platform: "iOS"
        )
        request.httpBody = try JSONEncoder().encode(body)

        let (_, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw NotificationError.registrationFailed
        }
    }

    /// Update app badge with active shoot count
    func updateBadge(count: Int) {
        #if os(iOS)
        UIApplication.shared.applicationIconBadgeNumber = count
        Logger.general.info("App badge updated to \(count)")
        #endif
    }

    /// Clear app badge
    func clearBadge() {
        updateBadge(count: 0)
    }

    // MARK: - Processing Notifications

    func notifyProcessingStarted(shootId: String, imageCount: Int) {
        #if os(iOS)
        let title = "Processing started"
        let body = "Shoot \(shootId) started with \(imageCount) images"
        scheduleLocalNotification(title: title, body: body)
        #endif
    }

    func notifyProcessingProgress(shootId: String, processed: Int, total: Int) {
        #if os(iOS)
        let title = "Processing progress"
        let body = "Shoot \(shootId): \(processed)/\(total) images processed"
        scheduleLocalNotification(title: title, body: body)
        #endif
    }

    func notifyProcessingCompleted(shootId: String, imageCount: Int, duration: Double) {
        #if os(iOS)
        let title = "Processing completed"
        let body = "Shoot \(shootId) finished (\(imageCount) images) in \(Int(duration))s"
        scheduleLocalNotification(title: title, body: body)
        #endif
    }

    func notifyProcessingFailed(shootId: String, error: Error) {
        #if os(iOS)
        let title = "Processing failed"
        let body = "Shoot \(shootId) failed: \(error.localizedDescription)"
        scheduleLocalNotification(title: title, body: body)
        #endif
    }

    /// Handle received notification
    func handleNotification(_ userInfo: [AnyHashable: Any]) {
        Logger.general.info("Handling notification: \(userInfo)")

        guard let type = userInfo["type"] as? String else {
            Logger.general.warning("Notification missing type field")
            return
        }

        switch type {
        case "shoot_complete":
            handleShootComplete(userInfo)
        case "device_connected":
            handleDeviceConnected(userInfo)
        case "device_disconnected":
            handleDeviceDisconnected(userInfo)
        case "credit_low":
            handleCreditLow(userInfo)
        default:
            Logger.general.warning("Unknown notification type: \(type)")
        }
    }

    private func handleShootComplete(_ userInfo: [AnyHashable: Any]) {
        guard let shootId = userInfo["shootId"] as? String else {
            Logger.general.warning("shoot_complete notification missing shootId")
            return
        }

        let imageCount = userInfo["imageCount"] as? Int ?? 0
        Logger.general.info("Shoot completed: \(shootId), images: \(imageCount)")

        // Post notification for UI updates
        NotificationCenter.default.post(
            name: .shootCompleted,
            object: nil,
            userInfo: ["shootId": shootId, "imageCount": imageCount]
        )

        // Update badge
        if let activeCount = userInfo["activeCount"] as? Int {
            updateBadge(count: activeCount)
        }
    }

    private func handleDeviceConnected(_ userInfo: [AnyHashable: Any]) {
        guard let deviceName = userInfo["deviceName"] as? String else {
            Logger.general.warning("device_connected notification missing deviceName")
            return
        }

        Logger.general.info("Device connected: \(deviceName)")

        // Post notification for UI updates
        NotificationCenter.default.post(
            name: .deviceConnected,
            object: nil,
            userInfo: ["deviceName": deviceName]
        )
    }

    private func handleDeviceDisconnected(_ userInfo: [AnyHashable: Any]) {
        guard let deviceName = userInfo["deviceName"] as? String else {
            Logger.general.warning("device_disconnected notification missing deviceName")
            return
        }

        Logger.general.info("Device disconnected: \(deviceName)")

        // Post notification for UI updates
        NotificationCenter.default.post(
            name: .deviceDisconnected,
            object: nil,
            userInfo: ["deviceName": deviceName]
        )
    }

    private func handleCreditLow(_ userInfo: [AnyHashable: Any]) {
        let remaining = userInfo["remaining"] as? Int ?? 0
        Logger.general.warning("Credit balance low: \(remaining)")

        // Post notification for UI updates
        NotificationCenter.default.post(
            name: .creditLow,
            object: nil,
            userInfo: ["remaining": remaining]
        )
    }

    /// Schedule local notification (for testing or offline scenarios)
    func scheduleLocalNotification(title: String, body: String, delay: TimeInterval = 1.0) {
        #if os(iOS)
        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.sound = .default

        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: delay, repeats: false)
        let request = UNNotificationRequest(
            identifier: UUID().uuidString,
            content: content,
            trigger: trigger
        )

        UNUserNotificationCenter.current().add(request) { error in
            if let error = error {
                Logger.errors.error("Failed to schedule local notification: \(error)")
            } else {
                Logger.general.info("Local notification scheduled: \(title)")
            }
        }
        #endif
    }
}

// MARK: - Data Models

struct RegisterDeviceTokenRequest: Codable {
    let deviceToken: String
    let deviceId: String
    let platform: String
}

struct PushNotification: Codable, Identifiable {
    let id: String
    let type: String
    let title: String
    let body: String
    let data: [String: String]
    let timestamp: Date
}

enum NotificationError: LocalizedError {
    case registrationFailed
    case invalidURL
    case notAuthenticated

    var errorDescription: String? {
        switch self {
        case .registrationFailed:
            return "Failed to register device token with backend"
        case .invalidURL:
            return "Invalid notification endpoint URL"
        case .notAuthenticated:
            return "User not authenticated - cannot register for notifications"
        }
    }
}

// MARK: - Notification Names

extension Notification.Name {
    static let shootCompleted = Notification.Name("shootCompleted")
    static let deviceConnected = Notification.Name("deviceConnected")
    static let deviceDisconnected = Notification.Name("deviceDisconnected")
    static let creditLow = Notification.Name("creditLow")
}
