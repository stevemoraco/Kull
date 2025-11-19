//
//  OfflineQueueIndicator.swift
//  kull - Universal App for macOS, iOS, and iPadOS
//
//  Created by Agent 23 on 11/18/25.
//  Visual indicator for offline operations queue and sync status
//

import SwiftUI

#if os(macOS)
import AppKit
#else
import UIKit
#endif

/// Visual indicator showing offline queue status with badge
struct OfflineQueueIndicator: View {
    @ObservedObject var operationQueue = OfflineOperationQueue.shared
    @ObservedObject var networkMonitor = NetworkMonitor.shared
    @State private var showingQueueDetails = false
    @State private var showingSyncNotification = false
    @State private var syncResult: SyncResult?

    enum SyncResult {
        case success(count: Int)
        case failure(count: Int)
        case partial(success: Int, failed: Int)
    }

    var body: some View {
        Group {
            if shouldShowIndicator {
                Button(action: {
                    showingQueueDetails = true
                }) {
                    HStack(spacing: 6) {
                        // Icon
                        Group {
                            if operationQueue.isSyncing {
                                Image(systemName: "arrow.triangle.2.circlepath")
                                    .symbolEffect(.rotate, options: .repeat(.continuous))
                                    .foregroundColor(.blue)
                            } else if !networkMonitor.isConnected {
                                Image(systemName: "cloud.slash")
                                    .foregroundColor(.orange)
                            } else {
                                Image(systemName: "clock")
                                    .foregroundColor(.blue)
                            }
                        }
                        .font(.system(size: 14))

                        // Badge count
                        if operationQueue.pendingOperationsCount > 0 {
                            Text("\(operationQueue.pendingOperationsCount)")
                                .font(.system(size: 11, weight: .semibold))
                                .foregroundColor(.white)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(
                                    Capsule()
                                        .fill(operationQueue.hasFailedOperations ? Color.red : Color.secondary)
                                )
                        }

                        // Status text (macOS only - more space)
                        #if os(macOS)
                        Text(statusText)
                            .font(.system(size: 11))
                            .foregroundColor(.secondary)
                        #endif
                    }
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color.secondary.opacity(0.1))
                    .cornerRadius(8)
                }
                .buttonStyle(.plain)
                .help(statusHelpText)
                #if os(iOS) || os(visionOS)
                .sheet(isPresented: $showingQueueDetails) {
                    QueueDetailsView(isPresented: $showingQueueDetails, syncResult: $syncResult)
                }
                #else
                .popover(isPresented: $showingQueueDetails) {
                    QueueDetailsView(isPresented: $showingQueueDetails, syncResult: $syncResult)
                        .frame(width: 400, height: 500)
                }
                #endif
            }
        }
        .onChange(of: operationQueue.lastSyncDate) { oldValue, newValue in
            // Show sync notification when sync completes
            if newValue != oldValue && newValue != nil {
                showSyncNotification()
            }
        }
    }

    // MARK: - Computed Properties

    private var shouldShowIndicator: Bool {
        // Show if: syncing, offline, or has pending operations
        operationQueue.isSyncing || !networkMonitor.isConnected || operationQueue.pendingOperationsCount > 0
    }

    private var statusText: String {
        if operationQueue.isSyncing {
            return "Syncing..."
        } else if !networkMonitor.isConnected {
            return "Offline"
        } else {
            return "Pending"
        }
    }

    private var statusHelpText: String {
        if operationQueue.isSyncing {
            return "Syncing \(operationQueue.pendingOperationsCount) operations..."
        } else if !networkMonitor.isConnected {
            return "Offline - \(operationQueue.pendingOperationsCount) operations queued"
        } else {
            return "\(operationQueue.pendingOperationsCount) operation\(operationQueue.pendingOperationsCount != 1 ? "s" : "") pending"
        }
    }

    // MARK: - Sync Notification

    private func showSyncNotification() {
        // Calculate sync result
        let totalCount = operationQueue.pendingOperationsCount

        if totalCount == 0 {
            // All succeeded
            syncResult = .success(count: operationQueue.pendingOperationsCount)
        } else {
            // Some failed
            syncResult = .failure(count: totalCount)
        }

        showingSyncNotification = true

        // Auto-dismiss after 3 seconds
        DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
            showingSyncNotification = false
        }
    }
}

// MARK: - Queue Details View

struct QueueDetailsView: View {
    @Binding var isPresented: Bool
    @Binding var syncResult: OfflineQueueIndicator.SyncResult?
    @ObservedObject var operationQueue = OfflineOperationQueue.shared
    @ObservedObject var networkMonitor = NetworkMonitor.shared
    @State private var showingClearConfirmation = false

    var body: some View {
        #if os(iOS) || os(visionOS)
        NavigationView {
            content
                .navigationTitle("Offline Queue")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .navigationBarLeading) {
                        Button("Done") {
                            isPresented = false
                        }
                    }
                }
        }
        #else
        content
        #endif
    }

    private var content: some View {
        VStack(spacing: 0) {
            // Header (macOS only - iOS has navigation bar)
            #if os(macOS)
            HStack {
                HStack(spacing: 8) {
                    Image(systemName: networkMonitor.isConnected ? "cloud" : "cloud.slash")
                        .foregroundColor(networkMonitor.isConnected ? .green : .orange)
                    Text("Offline Queue")
                        .font(.headline)
                }
                Spacer()
                Button("Done") {
                    isPresented = false
                }
                .keyboardShortcut(.cancelAction)
            }
            .padding()

            Divider()
            #endif

            // Sync notification banner
            if let result = syncResult {
                syncNotificationBanner(result: result)
                    .transition(.move(edge: .top).combined(with: .opacity))
            }

            // Status bar
            HStack {
                HStack(spacing: 6) {
                    if operationQueue.isSyncing {
                        ProgressView()
                            .scaleEffect(0.7)
                        Text("Syncing operations...")
                            .font(.subheadline)
                    } else {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundColor(.green)
                        Text(lastSyncText)
                            .font(.subheadline)
                    }
                }
                .foregroundColor(.secondary)

                Spacer()

                // Action buttons
                HStack(spacing: 8) {
                    Button(action: handleManualSync) {
                        Label("Sync Now", systemImage: "arrow.triangle.2.circlepath")
                    }
                    .disabled(!networkMonitor.isConnected || operationQueue.isSyncing || operationQueue.pendingOperationsCount == 0)

                    if operationQueue.pendingOperationsCount > 0 {
                        Button(action: {
                            showingClearConfirmation = true
                        }) {
                            Label("Clear All", systemImage: "trash")
                        }
                        .disabled(operationQueue.isSyncing)
                        .foregroundColor(.red)
                    }
                }
                .buttonStyle(.bordered)
                #if os(iOS) || os(visionOS)
                .controlSize(.small)
                #endif
            }
            .padding()
            .background(Color.secondary.opacity(0.1))

            Divider()

            // Queue list
            if operationQueue.pendingOperationsCount == 0 {
                emptyStateView
            } else {
                queueListView
            }
        }
        .confirmationDialog(
            "Clear all pending operations?",
            isPresented: $showingClearConfirmation,
            titleVisibility: .visible
        ) {
            Button("Clear All", role: .destructive) {
                operationQueue.clearQueue()
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This will remove all \(operationQueue.pendingOperationsCount) pending operations from the queue. This action cannot be undone.")
        }
    }

    // MARK: - Subviews

    private var emptyStateView: some View {
        VStack(spacing: 12) {
            Spacer()
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 48))
                .foregroundColor(.green)
            Text("No pending operations")
                .font(.headline)
            Text("All changes have been synced")
                .font(.subheadline)
                .foregroundColor(.secondary)
            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var queueListView: some View {
        ScrollView {
            LazyVStack(spacing: 8) {
                ForEach(operationQueue.operations) { operation in
                    QueueOperationRow(operation: operation)
                }
            }
            .padding()
        }
    }

    private var lastSyncText: String {
        if let lastSync = operationQueue.lastSyncDate {
            let timeAgo = Date().timeIntervalSince(lastSync)
            if timeAgo < 60 {
                return "Last sync: Just now"
            } else if timeAgo < 3600 {
                return "Last sync: \(Int(timeAgo / 60))m ago"
            } else if timeAgo < 86400 {
                return "Last sync: \(Int(timeAgo / 3600))h ago"
            } else {
                let formatter = DateFormatter()
                formatter.dateStyle = .short
                return "Last sync: \(formatter.string(from: lastSync))"
            }
        } else {
            return "Not synced yet"
        }
    }

    private func syncNotificationBanner(result: OfflineQueueIndicator.SyncResult) -> some View {
        HStack {
            switch result {
            case .success(let count):
                Image(systemName: "checkmark.circle.fill")
                    .foregroundColor(.green)
                Text("Successfully synced \(count) operation\(count != 1 ? "s" : "")")
                    .font(.subheadline)
            case .failure(let count):
                Image(systemName: "exclamationmark.triangle.fill")
                    .foregroundColor(.red)
                Text("Failed to sync \(count) operation\(count != 1 ? "s" : "")")
                    .font(.subheadline)
            case .partial(let success, let failed):
                Image(systemName: "exclamationmark.triangle.fill")
                    .foregroundColor(.orange)
                Text("Synced \(success), failed \(failed)")
                    .font(.subheadline)
            }
            Spacer()
            Button(action: {
                withAnimation {
                    syncResult = nil
                }
            }) {
                Image(systemName: "xmark")
                    .font(.caption)
            }
            .buttonStyle(.plain)
        }
        .padding()
        .background(Color.secondary.opacity(0.15))
    }

    // MARK: - Actions

    private func handleManualSync() {
        Task {
            await operationQueue.syncWhenOnline()
        }
    }
}

// MARK: - Operation Row

struct QueueOperationRow: View {
    let operation: QueuedOperation
    @ObservedObject var operationQueue = OfflineOperationQueue.shared

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text(operationTypeLabel)
                        .font(.subheadline)
                        .fontWeight(.medium)

                    if operation.retryCount > 0 {
                        Text("Retry \(operation.retryCount)/3")
                            .font(.caption2)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color.orange.opacity(0.2))
                            .foregroundColor(.orange)
                            .cornerRadius(4)
                    }
                }

                Text(timeAgoString)
                    .font(.caption)
                    .foregroundColor(.secondary)

                if let error = operation.lastError {
                    HStack(alignment: .top, spacing: 4) {
                        Image(systemName: "exclamationmark.circle.fill")
                            .font(.caption2)
                        Text(error)
                            .font(.caption2)
                            .lineLimit(2)
                    }
                    .foregroundColor(.red)
                    .padding(.top, 4)
                }
            }

            Spacer()

            Button(action: {
                operationQueue.clearQueue() // This would need to be updated to remove single operation
            }) {
                Image(systemName: "trash")
                    .font(.caption)
            }
            .buttonStyle(.plain)
            .disabled(operationQueue.isSyncing)
        }
        .padding()
        .background(Color.secondary.opacity(0.05))
        .cornerRadius(8)
        .overlay(
            RoundedRectangle(cornerRadius: 8)
                .stroke(Color.secondary.opacity(0.2), lineWidth: 1)
        )
    }

    private var operationTypeLabel: String {
        switch operation.type {
        case .votePrompt: return "Vote on Prompt"
        case .addFolder: return "Add Folder"
        case .removeFolder: return "Remove Folder"
        case .updateSettings: return "Update Settings"
        case .purchaseCredits: return "Purchase Credits"
        case .submitReport: return "Submit Report"
        }
    }

    private var timeAgoString: String {
        let timeAgo = Date().timeIntervalSince(operation.createdAt)
        if timeAgo < 60 {
            return "Just now"
        } else if timeAgo < 3600 {
            return "\(Int(timeAgo / 60))m ago"
        } else if timeAgo < 86400 {
            return "\(Int(timeAgo / 3600))h ago"
        } else {
            let formatter = DateFormatter()
            formatter.dateStyle = .short
            return formatter.string(from: operation.createdAt)
        }
    }
}

// MARK: - Preview

#if DEBUG
struct OfflineQueueIndicator_Previews: PreviewProvider {
    static var previews: some View {
        Group {
            // With operations
            OfflineQueueIndicator()
                .previewDisplayName("With Operations")

            // Empty
            OfflineQueueIndicator()
                .previewDisplayName("Empty")

            // Queue details
            QueueDetailsView(
                isPresented: .constant(true),
                syncResult: .constant(.success(count: 5))
            )
            .previewDisplayName("Queue Details")
        }
    }
}
#endif
