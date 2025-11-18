//
//  NetworkMonitor.swift
//  kull - Universal App for macOS, iOS, and iPadOS
//
//  Created by Agent H on 11/18/25.
//  Monitors network connectivity and triggers sync when online
//

import Foundation
import Network
import Combine

/// Network connectivity status
enum NetworkStatus {
    case connected
    case disconnected
    case unknown

    var isConnected: Bool {
        return self == .connected
    }
}

/// Monitors network connectivity and triggers offline operation sync
final class NetworkMonitor: ObservableObject {
    static let shared = NetworkMonitor()

    @Published private(set) var status: NetworkStatus = .unknown
    @Published private(set) var isExpensive: Bool = false
    @Published private(set) var isConstrained: Bool = false

    private let monitor = NWPathMonitor()
    private let monitorQueue = DispatchQueue(label: "com.kull.networkmonitor")
    private var cancellables = Set<AnyCancellable>()

    // Connection type
    enum ConnectionType {
        case wifi
        case cellular
        case wiredEthernet
        case other
        case none
    }

    @Published private(set) var connectionType: ConnectionType = .none

    private init() {
        setupMonitor()
    }

    deinit {
        monitor.cancel()
    }

    // MARK: - Setup

    private func setupMonitor() {
        monitor.pathUpdateHandler = { [weak self] path in
            guard let self = self else { return }

            DispatchQueue.main.async {
                self.updateStatus(for: path)
                self.updateConnectionType(for: path)
            }
        }

        monitor.start(queue: monitorQueue)
    }

    private func updateStatus(for path: NWPath) {
        let newStatus: NetworkStatus = path.status == .satisfied ? .connected : .disconnected
        let wasConnected = status.isConnected
        let isNowConnected = newStatus.isConnected

        status = newStatus
        isExpensive = path.isExpensive
        isConstrained = path.isConstrained

        // Log status change
        print("[NetworkMonitor] Status changed: \(status), expensive: \(isExpensive), constrained: \(isConstrained)")

        // Trigger sync when transitioning from offline to online
        if !wasConnected && isNowConnected {
            handleReconnection()
        }
    }

    private func updateConnectionType(for path: NWPath) {
        if path.usesInterfaceType(.wifi) {
            connectionType = .wifi
        } else if path.usesInterfaceType(.cellular) {
            connectionType = .cellular
        } else if path.usesInterfaceType(.wiredEthernet) {
            connectionType = .wiredEthernet
        } else if path.status == .satisfied {
            connectionType = .other
        } else {
            connectionType = .none
        }
    }

    // MARK: - Reconnection Handler

    private func handleReconnection() {
        print("[NetworkMonitor] Reconnected to network, triggering sync...")

        // Trigger offline operation queue sync
        Task {
            await OfflineOperationQueue.shared.syncWhenOnline()
        }

        // Refresh cached data if stale
        refreshCacheIfNeeded()
    }

    private func refreshCacheIfNeeded() {
        let cacheManager = CacheManager.shared

        // Refresh if cache is older than 1 hour
        if cacheManager.isCacheStale(maxAgeSeconds: 3600) {
            print("[NetworkMonitor] Cache is stale, refreshing...")

            Task {
                await refreshAllData()
            }
        }
    }

    // MARK: - Data Refresh

    @MainActor
    private func refreshAllData() async {
        do {
            // Refresh user profile
            if let user = try? await KullAPIClient.shared.fetchCurrentUser() {
                CacheManager.shared.cacheUserProfile(user)
            }

            // Refresh credit summary
            let creditSummary = try await KullAPIClient.shared.fetchCreditSummary()
            CacheManager.shared.cacheCreditSummary(creditSummary)

            // Refresh prompts (if endpoint exists)
            // let prompts = try await KullAPIClient.shared.fetchPrompts()
            // CacheManager.shared.cachePrompts(prompts)

            print("[NetworkMonitor] Successfully refreshed cached data")
        } catch {
            print("[NetworkMonitor] Failed to refresh data: \(error)")
        }
    }

    // MARK: - Manual Sync

    /// Manually trigger sync (useful for pull-to-refresh)
    func triggerSync() {
        guard status.isConnected else {
            print("[NetworkMonitor] Cannot sync: offline")
            return
        }

        Task {
            await OfflineOperationQueue.shared.syncWhenOnline()
            await refreshAllData()
        }
    }

    // MARK: - Connection Checks

    var isConnected: Bool {
        status.isConnected
    }

    var shouldWaitForWifi: Bool {
        // Wait for WiFi if on cellular and data is expensive or constrained
        return connectionType == .cellular && (isExpensive || isConstrained)
    }

    var connectionDescription: String {
        switch connectionType {
        case .wifi:
            return "WiFi"
        case .cellular:
            return "Cellular"
        case .wiredEthernet:
            return "Ethernet"
        case .other:
            return "Connected"
        case .none:
            return "Offline"
        }
    }

    // MARK: - Network Quality Estimation

    var networkQuality: NetworkQuality {
        guard status.isConnected else { return .offline }

        if isConstrained {
            return .poor
        } else if isExpensive {
            return .moderate
        } else {
            return .good
        }
    }

    enum NetworkQuality {
        case offline
        case poor
        case moderate
        case good

        var description: String {
            switch self {
            case .offline: return "Offline"
            case .poor: return "Poor Connection"
            case .moderate: return "Moderate Connection"
            case .good: return "Good Connection"
            }
        }
    }
}

// MARK: - SwiftUI Convenience

#if canImport(SwiftUI)
import SwiftUI

struct NetworkStatusView: View {
    @ObservedObject var monitor = NetworkMonitor.shared

    var body: some View {
        if !monitor.isConnected {
            HStack {
                Image(systemName: "wifi.slash")
                    .foregroundColor(.orange)
                Text("Offline Mode")
                    .font(.caption)
                    .foregroundColor(.secondary)

                Spacer()

                if OfflineOperationQueue.shared.pendingOperationsCount > 0 {
                    Text("\(OfflineOperationQueue.shared.pendingOperationsCount) pending")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(Color.orange.opacity(0.15))
            .cornerRadius(8)
        } else if OfflineOperationQueue.shared.isSyncing {
            HStack {
                ProgressView()
                    .scaleEffect(0.7)
                Text("Syncing...")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(Color.blue.opacity(0.15))
            .cornerRadius(8)
        }
    }
}

struct NetworkQualityIndicator: View {
    @ObservedObject var monitor = NetworkMonitor.shared

    var body: some View {
        HStack(spacing: 4) {
            Circle()
                .fill(statusColor)
                .frame(width: 8, height: 8)

            Text(monitor.connectionDescription)
                .font(.caption2)
                .foregroundColor(.secondary)
        }
    }

    private var statusColor: Color {
        switch monitor.networkQuality {
        case .offline:
            return .red
        case .poor:
            return .orange
        case .moderate:
            return .yellow
        case .good:
            return .green
        }
    }
}
#endif
