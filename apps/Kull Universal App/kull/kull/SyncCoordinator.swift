//
//  SyncCoordinator.swift
//  kull - Real-Time Sync State Coordinator
//
//  Created by Claude Code on 11/18/25.
//

import Foundation
import Combine

@MainActor
final class SyncCoordinator: ObservableObject {
    // MARK: - Singleton

    static let shared = SyncCoordinator()

    // MARK: - Published Properties

    @Published var activeShootProgress: [String: ShootProgressPayload] = [:]
    @Published var creditBalance: Int = 0
    @Published var connectedDevices: [DeviceConnectionPayload] = []
    @Published var lastCreditUpdate: CreditUpdatePayload?
    @Published var lastPromptChange: PromptChangePayload?

    // MARK: - Private Properties

    private let webSocketService = WebSocketService.shared
    private let apiClient = KullAPIClient.shared
    private let isRunningTests = ProcessInfo.processInfo.environment["XCTestConfigurationFilePath"] != nil

    // MARK: - Initialization

    private init() {
        if !isRunningTests {
            registerHandlers()
        }
    }

    // MARK: - Public Methods

    func start(userId: String, deviceId: String) {
        guard !isRunningTests else { return }
        print("[SyncCoordinator] Starting sync for userId: \(userId), deviceId: \(deviceId)")

        // Connect WebSocket
        webSocketService.connect(userId: userId, deviceId: deviceId)

        // Load initial state
        Task {
            await loadInitialState()
        }
    }

    func stop() {
        print("[SyncCoordinator] Stopping sync")
        webSocketService.disconnect()

        // Clear state
        activeShootProgress.removeAll()
        creditBalance = 0
        connectedDevices.removeAll()
        lastCreditUpdate = nil
        lastPromptChange = nil
    }

    // MARK: - Initial State Loading

    private func loadInitialState() async {
        if isRunningTests { return }
        // Load credit balance
        do {
            let summary = try await apiClient.fetchCreditSummary()
            creditBalance = summary.balance
        } catch {
            print("[SyncCoordinator] Failed to load credit summary: \(error)")
        }
    }

    // MARK: - Handler Registration

    private func registerHandlers() {
        // Shoot Progress Handler
        webSocketService.registerHandler(for: .shootProgress) { [weak self] (payload: ShootProgressPayload) in
            guard let self = self else { return }

            print("[SyncCoordinator] Shoot progress update: \(payload.shootId) - \(payload.processedCount)/\(payload.totalCount)")

            self.activeShootProgress[payload.shootId] = payload

            // Remove completed or failed shoots after a delay
            if payload.status == .completed || payload.status == .failed {
                Task { @MainActor in
                    try? await Task.sleep(nanoseconds: 5_000_000_000) // 5 seconds
                    self.activeShootProgress.removeValue(forKey: payload.shootId)
                }
            }
        }

        // Credit Update Handler
        webSocketService.registerHandler(for: .creditUpdate) { [weak self] (payload: CreditUpdatePayload) in
            guard let self = self else { return }

            print("[SyncCoordinator] Credit update: balance=\(payload.newBalance), change=\(payload.change), reason=\(payload.reason)")

            self.creditBalance = payload.newBalance
            self.lastCreditUpdate = payload

            // Show notification for credit changes
            self.showCreditUpdateNotification(payload)
        }

        // Prompt Change Handler
        webSocketService.registerHandler(for: .promptChange) { [weak self] (payload: PromptChangePayload) in
            guard let self = self else { return }

            print("[SyncCoordinator] Prompt change: \(payload.promptId) - \(payload.action)")

            self.lastPromptChange = payload

            // Post notification for prompt changes (marketplace can listen)
            NotificationCenter.default.post(
                name: .promptDidChange,
                object: payload
            )
        }

        // Device Connected Handler
        webSocketService.registerHandler(for: .deviceConnected) { [weak self] (payload: DeviceConnectionPayload) in
            guard let self = self else { return }

            print("[SyncCoordinator] Device connected: \(payload.deviceName) (\(payload.platform))")

            // Add to connected devices if not already present
            if !self.connectedDevices.contains(where: { $0.deviceId == payload.deviceId }) {
                self.connectedDevices.append(payload)
            }
        }

        // Device Disconnected Handler
        webSocketService.registerHandler(for: .deviceDisconnected) { [weak self] (payload: DeviceConnectionPayload) in
            guard let self = self else { return }

            print("[SyncCoordinator] Device disconnected: \(payload.deviceName) (\(payload.platform))")

            // Remove from connected devices
            self.connectedDevices.removeAll { $0.deviceId == payload.deviceId }
        }

        // Admin Session Update Handler (for admin users)
        webSocketService.registerHandler(for: .adminSessionUpdate) { [weak self] (payload: AdminSessionUpdatePayload) in
            guard self != nil else { return }

            print("[SyncCoordinator] Admin session update: \(payload.sessionId) - \(payload.action)")

            // Post notification for admin UI
            NotificationCenter.default.post(
                name: .adminSessionDidUpdate,
                object: payload
            )
        }
    }

    // MARK: - Notifications

    private func showCreditUpdateNotification(_ payload: CreditUpdatePayload) {
        #if os(macOS)
        let content = UNMutableNotificationContent()
        content.title = "Credit Update"

        if payload.change > 0 {
            content.body = "Added \(payload.change) credits. New balance: \(payload.newBalance)"
        } else if payload.change < 0 {
            content.body = "Used \(abs(payload.change)) credits. Remaining: \(payload.newBalance)"
        } else {
            content.body = "Balance updated: \(payload.newBalance)"
        }

        if !payload.reason.isEmpty {
            content.subtitle = payload.reason
        }

        let request = UNNotificationRequest(
            identifier: UUID().uuidString,
            content: content,
            trigger: nil
        )

        UNUserNotificationCenter.current().add(request)
        #endif
    }

    // MARK: - Computed Properties

    var isAnyShooting: Bool {
        activeShootProgress.values.contains { $0.status == .processing }
    }

    var totalImagesProcessing: Int {
        activeShootProgress.values
            .filter { $0.status == .processing }
            .reduce(0) { $0 + $1.processedCount }
    }

    var totalImagesToProcess: Int {
        activeShootProgress.values
            .filter { $0.status == .processing }
            .reduce(0) { $0 + $1.totalCount }
    }

    var overallProgress: Double {
        guard totalImagesToProcess > 0 else { return 0 }
        return Double(totalImagesProcessing) / Double(totalImagesToProcess)
    }
}

// MARK: - Notification Names

extension Notification.Name {
    static let promptDidChange = Notification.Name("promptDidChange")
    static let adminSessionDidUpdate = Notification.Name("adminSessionDidUpdate")
}

// MARK: - UserNotifications Import

#if os(macOS)
import UserNotifications
#endif
