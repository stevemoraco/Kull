//
//  OfflineOperationQueue.swift
//  kull - Universal App for macOS, iOS, and iPadOS
//
//  Created by Agent H on 11/18/25.
//  Manages operation queue for offline functionality
//

import Foundation

// MARK: - Operation Types

enum OperationType: String, Codable {
    case votePrompt
    case addFolder
    case removeFolder
    case updateSettings
    case purchaseCredits
    case submitReport
}

// MARK: - Queued Operation

struct QueuedOperation: Codable, Identifiable {
    let id: UUID
    let type: OperationType
    let payload: Data
    let createdAt: Date
    var retryCount: Int = 0
    var lastError: String?

    init(id: UUID = UUID(), type: OperationType, payload: Data, createdAt: Date = Date(), retryCount: Int = 0, lastError: String? = nil) {
        self.id = id
        self.type = type
        self.payload = payload
        self.createdAt = createdAt
        self.retryCount = retryCount
        self.lastError = lastError
    }
}

// MARK: - Operation Payloads

struct VotePromptPayload: Codable {
    let promptId: String
    let score: Int
}

struct AddFolderPayload: Codable {
    let folderPath: String
    let bookmarkData: Data?
}

struct RemoveFolderPayload: Codable {
    let folderPath: String
}

struct UpdateSettingsPayload: Codable {
    let key: String
    let value: String
}

// MARK: - Offline Operation Queue

final class OfflineOperationQueue: ObservableObject {
    static let shared = OfflineOperationQueue()

    @Published private(set) var operations: [QueuedOperation] = []
    @Published private(set) var isSyncing = false
    @Published var lastSyncDate: Date?

    private let userDefaults = UserDefaults.standard
    private let queueKey = "offline_operation_queue"
    private let maxRetries = 3
    private let syncLock = NSLock()

    private init() {
        loadQueue()
    }

    // MARK: - Queue Management

    /// Enqueue a new operation
    func enqueue(_ operation: QueuedOperation) {
        syncLock.lock()
        defer { syncLock.unlock() }

        operations.append(operation)
        saveQueue()
    }

    /// Convenience method to enqueue an operation with automatic payload encoding
    func enqueue<T: Codable>(type: OperationType, payload: T) throws {
        let data = try JSONEncoder().encode(payload)
        let operation = QueuedOperation(type: type, payload: data)
        enqueue(operation)
    }

    /// Remove an operation from the queue
    private func removeOperation(withId id: UUID) {
        syncLock.lock()
        defer { syncLock.unlock() }

        operations.removeAll { $0.id == id }
        saveQueue()
    }

    /// Update an operation (for retry tracking)
    private func updateOperation(_ operation: QueuedOperation) {
        syncLock.lock()
        defer { syncLock.unlock() }

        if let index = operations.firstIndex(where: { $0.id == operation.id }) {
            operations[index] = operation
            saveQueue()
        }
    }

    /// Clear all operations
    func clearQueue() {
        syncLock.lock()
        defer { syncLock.unlock() }

        operations.removeAll()
        saveQueue()
    }

    // MARK: - Persistence

    private func loadQueue() {
        guard let data = userDefaults.data(forKey: queueKey),
              let decoded = try? JSONDecoder().decode([QueuedOperation].self, from: data) else {
            return
        }
        operations = decoded
    }

    private func saveQueue() {
        if let encoded = try? JSONEncoder().encode(operations) {
            userDefaults.set(encoded, forKey: queueKey)
        }
    }

    // MARK: - Sync Operations

    /// Sync all queued operations when online
    func syncWhenOnline() async {
        guard !isSyncing else {
            print("[OfflineQueue] Already syncing, skipping")
            return
        }

        guard !operations.isEmpty else {
            print("[OfflineQueue] No operations to sync")
            return
        }

        await MainActor.run {
            self.isSyncing = true
        }

        print("[OfflineQueue] Starting sync of \(operations.count) operations")

        // Process operations in order
        let operationsToSync = operations
        for operation in operationsToSync {
            await processOperation(operation)
        }

        await MainActor.run {
            self.isSyncing = false
            self.lastSyncDate = Date()
        }

        print("[OfflineQueue] Sync completed. Remaining: \(operations.count)")
    }

    private func processOperation(_ operation: QueuedOperation) async {
        do {
            try await executeOperation(operation)
            removeOperation(withId: operation.id)
            print("[OfflineQueue] Successfully processed operation: \(operation.type)")
        } catch {
            print("[OfflineQueue] Failed to process operation: \(operation.type), error: \(error)")

            var updatedOperation = operation
            updatedOperation.retryCount += 1
            updatedOperation.lastError = error.localizedDescription

            if updatedOperation.retryCount >= maxRetries {
                print("[OfflineQueue] Max retries reached for operation: \(operation.type), removing from queue")
                removeOperation(withId: operation.id)
            } else {
                print("[OfflineQueue] Retry \(updatedOperation.retryCount)/\(maxRetries) for operation: \(operation.type)")
                updateOperation(updatedOperation)
            }
        }
    }

    // MARK: - Operation Execution

    private func executeOperation(_ operation: QueuedOperation) async throws {
        switch operation.type {
        case .votePrompt:
            try await executeVotePrompt(operation)
        case .addFolder:
            try await executeAddFolder(operation)
        case .removeFolder:
            try await executeRemoveFolder(operation)
        case .updateSettings:
            try await executeUpdateSettings(operation)
        case .purchaseCredits:
            try await executePurchaseCredits(operation)
        case .submitReport:
            try await executeSubmitReport(operation)
        }
    }

    private func executeVotePrompt(_ operation: QueuedOperation) async throws {
        let payload = try JSONDecoder().decode(VotePromptPayload.self, from: operation.payload)

        // Make API call to vote on prompt
        let endpoint = "/api/prompts/\(payload.promptId)/vote"
        let body = ["score": payload.score]

        struct EmptyResponse: Decodable {}
        let _: EmptyResponse = try await KullAPIClient.shared.authenticatedRequest(
            endpoint,
            method: "POST",
            body: body
        )
    }

    private func executeAddFolder(_ operation: QueuedOperation) async throws {
        let payload = try JSONDecoder().decode(AddFolderPayload.self, from: operation.payload)

        // Sync folder with backend
        await FolderSyncService().sync(deviceName: getDeviceName())
        print("[OfflineQueue] Synced folder: \(payload.folderPath)")
    }

    private func executeRemoveFolder(_ operation: QueuedOperation) async throws {
        let payload = try JSONDecoder().decode(RemoveFolderPayload.self, from: operation.payload)

        // Remove folder from backend
        await FolderSyncService().sync(deviceName: getDeviceName())
        print("[OfflineQueue] Removed folder: \(payload.folderPath)")
    }

    private func executeUpdateSettings(_ operation: QueuedOperation) async throws {
        let payload = try JSONDecoder().decode(UpdateSettingsPayload.self, from: operation.payload)

        // Update settings on backend
        let endpoint = "/api/settings"
        let body = [payload.key: payload.value]

        struct EmptyResponse: Decodable {}
        let _: EmptyResponse = try await KullAPIClient.shared.authenticatedRequest(
            endpoint,
            method: "PUT",
            body: body
        )
    }

    private func executePurchaseCredits(_ operation: QueuedOperation) async throws {
        // Credit purchases should be handled through Stripe and webhook
        // This is a placeholder for purchase confirmation
        print("[OfflineQueue] Credit purchase operations are handled by Stripe webhooks")
    }

    private func executeSubmitReport(_ operation: QueuedOperation) async throws {
        // Submit shoot report to backend
        let endpoint = "/api/reports"

        struct EmptyResponse: Decodable {}
        let _: EmptyResponse = try await KullAPIClient.shared.authenticatedRequest(
            endpoint,
            method: "POST",
            body: operation.payload
        )
    }

    // MARK: - Helpers

    private func getDeviceName() -> String {
        #if os(macOS)
        return Host.current().localizedName ?? "Mac"
        #else
        return UIDevice.current.name
        #endif
    }

    // MARK: - Queue Statistics

    var pendingOperationsCount: Int {
        operations.count
    }

    var operationsByType: [OperationType: Int] {
        var counts: [OperationType: Int] = [:]
        for operation in operations {
            counts[operation.type, default: 0] += 1
        }
        return counts
    }

    var hasFailedOperations: Bool {
        operations.contains { $0.retryCount >= maxRetries }
    }

    func getOperations(ofType type: OperationType) -> [QueuedOperation] {
        operations.filter { $0.type == type }
    }
}
