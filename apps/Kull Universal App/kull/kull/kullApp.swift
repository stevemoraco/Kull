//
//  kullApp.swift
//  kull - Universal App for macOS, iOS, and iPadOS
//
//  Created by Steve Moraco on 11/18/25.
//

import SwiftUI

#if os(macOS)
import AppKit
import Combine

@main
struct KullApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    @StateObject private var auth = AuthViewModel()

    var body: some Scene {
        WindowGroup("Kull") {
            if auth.isAuthenticated {
                MainWindow()
                    .environmentObject(CreditSummaryViewModel())
            } else {
                AuthView()
                    .environmentObject(auth)
            }
        }
        .commands {
            CommandGroup(replacing: .appInfo) {
                Button("Kull Website") {
                    let url = EnvironmentConfig.shared.apiBaseURL
                    NSWorkspace.shared.open(url)
                }
            }
        }
    }
}

final class AppDelegate: NSObject, NSApplicationDelegate {
    private var statusItem: NSStatusItem?
    private var watcher = FolderWatcher()

    func applicationDidFinishLaunching(_ notification: Notification) {
        let item = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        item.button?.title = "Kull"
        item.button?.action = #selector(toggleMainWindow)
        item.button?.target = self
        self.statusItem = item

        // Begin watching bookmarked folders to suggest runs
        let urls = BookmarkStore.shared.resolveAll()
        watcher.watch(urls: urls) { [weak self] url in
            self?.suggestRun(for: url)
        }
    }

    @objc private func toggleMainWindow() {
        NSApp.activate(ignoringOtherApps: true)
        if let target = NSApp.windows.first(where: { $0.title == "Kull" }) {
            target.makeKeyAndOrderFront(nil)
        } else {
            NSApp.windows.first?.makeKeyAndOrderFront(nil)
        }
    }

    private func suggestRun(for url: URL) {
        let alert = NSAlert()
        alert.messageText = "New files detected"
        alert.informativeText = "Kull detected changes in \(url.lastPathComponent). Run a new cull?"
        alert.addButton(withTitle: "Run")
        alert.addButton(withTitle: "Dismiss")
        NSApp.activate(ignoringOtherApps: true)
        let resp = alert.runModal()
        if resp == .alertFirstButtonReturn {
            // Open main window and present run sheet
            toggleMainWindow()
        }
    }
}

final class CreditSummaryViewModel: ObservableObject {
    @Published var balance: Int = 0
    @Published var planDisplayName: String = "—"
    @Published var estimatedShootsRemaining: Double = 0
    @Published var loading = false
    @Published var usingCachedData = false
    private var cancellables: Set<AnyCancellable> = []

    init() {
        // Load cached data on init
        loadCachedData()
    }

    private func loadCachedData() {
        if let cached = CacheManager.shared.getCachedCreditSummary() {
            self.balance = cached.balance
            self.planDisplayName = cached.planDisplayName
            self.estimatedShootsRemaining = cached.estimatedShootsRemaining
            self.usingCachedData = true
        }
    }

    func refresh() {
        let baseURL = EnvironmentConfig.shared.apiBaseURL
        let url = baseURL.appendingPathComponent("/api/kull/credits/summary")
        loading = true
        URLSession.shared.dataTaskPublisher(for: URLRequest(url: url))
            .map(\.data)
            .decode(type: CreditSummary.self, decoder: JSONDecoder())
            .receive(on: DispatchQueue.main)
            .sink(receiveCompletion: { [weak self] completion in
                self?.loading = false
                if case .failure = completion {
                    // Failed to fetch, use cached data
                    self?.loadCachedData()
                }
            }, receiveValue: { [weak self] cs in
                self?.balance = cs.balance
                self?.planDisplayName = cs.planDisplayName
                self?.estimatedShootsRemaining = cs.estimatedShootsRemaining
                self?.usingCachedData = false

                // Cache the fresh data
                CacheManager.shared.cacheCreditSummary(cs)
            })
            .store(in: &cancellables)
    }
}

struct MainWindow: View {
    @EnvironmentObject var credits: CreditSummaryViewModel
    @StateObject private var webSocket = WebSocketService.shared
    @StateObject private var syncCoordinator = SyncCoordinator.shared
    @StateObject private var networkMonitor = NetworkMonitor.shared
    @StateObject private var operationQueue = OfflineOperationQueue.shared
    @State private var showingRunSheet = false
    @State private var selectedFolder: URL? = nil

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Text("Kull")
                    .font(.system(size: 22, weight: .bold))
                Spacer()

                // Network and sync status
                HStack(spacing: 12) {
                    // Network status
                    HStack(spacing: 4) {
                        Image(systemName: networkMonitor.isConnected ? "wifi" : "wifi.slash")
                            .foregroundColor(networkMonitor.isConnected ? .green : .orange)
                        Text(networkMonitor.connectionDescription)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    .help(networkMonitor.isConnected ? "Network connected" : "Offline - operations will sync when online")

                    // WebSocket connection status
                    HStack(spacing: 4) {
                        Image(systemName: webSocket.isConnected ? "bolt.fill" : "exclamationmark.triangle.fill")
                            .foregroundColor(webSocket.isConnected ? .green : .orange)
                        Text(webSocket.isConnected ? "Synced" : connectionStateText)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    .help(webSocket.isConnected ? "Real-time sync active" : "Sync unavailable - check connection")

                    // Pending operations indicator
                    if operationQueue.pendingOperationsCount > 0 {
                        HStack(spacing: 4) {
                            Image(systemName: "clock.arrow.circlepath")
                                .foregroundColor(.blue)
                            Text("\(operationQueue.pendingOperationsCount) pending")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        .help("Operations queued for sync")
                    }
                }

                Button("Refresh Credits") { credits.refresh() }
            }

            // Offline banner
            if !networkMonitor.isConnected {
                HStack {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .foregroundColor(.orange)
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Offline Mode")
                            .font(.headline)
                        Text("Changes will sync automatically when connection is restored")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    Spacer()
                    if operationQueue.pendingOperationsCount > 0 {
                        Text("\(operationQueue.pendingOperationsCount) operations queued")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                }
                .padding()
                .background(Color.orange.opacity(0.15))
                .cornerRadius(8)
            }

            // Syncing indicator
            if operationQueue.isSyncing {
                HStack {
                    ProgressView()
                        .scaleEffect(0.8)
                    Text("Syncing operations...")
                        .font(.subheadline)
                    Spacer()
                }
                .padding()
                .background(Color.blue.opacity(0.15))
                .cornerRadius(8)
            }
            HStack(spacing: 24) {
                VStack(alignment: .leading) {
                    Text("Credits Available")
                        .font(.caption).foregroundStyle(.secondary)
                    Text("\(syncCoordinator.creditBalance > 0 ? syncCoordinator.creditBalance : credits.balance)")
                        .font(.title3)
                }
                VStack(alignment: .leading) {
                    Text("Plan")
                        .font(.caption).foregroundStyle(.secondary)
                    Text(credits.planDisplayName)
                        .font(.title3)
                }
                VStack(alignment: .leading) {
                    Text("Est. Shoots Left")
                        .font(.caption).foregroundStyle(.secondary)
                    Text(String(format: "%.0f", credits.estimatedShootsRemaining))
                        .font(.title3)
                }
                Spacer()
            }

            // Active shoot progress
            if syncCoordinator.isAnyShooting {
                GroupBox(label: Text("Active Shoots").font(.headline)) {
                    VStack(spacing: 8) {
                        ForEach(Array(syncCoordinator.activeShootProgress.values), id: \.shootId) { progress in
                            VStack(alignment: .leading, spacing: 4) {
                                HStack {
                                    Text("Shoot: \(progress.shootId.prefix(8))")
                                        .font(.caption)
                                    Spacer()
                                    Text("\(progress.processedCount)/\(progress.totalCount)")
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                }
                                ProgressView(value: progress.progress)
                                if let eta = progress.eta {
                                    Text("ETA: \(Int(eta))s")
                                        .font(.caption2)
                                        .foregroundColor(.secondary)
                                }
                            }
                        }
                    }
                    .padding(8)
                }
            }
            GroupBox(label: Text("Start a new cull")) {
                VStack(alignment: .center, spacing: 12) {
                    Text("Select or drag your project folder to start")
                        .font(.headline)
                    HStack {
                        Button("Choose Folder…") { chooseFolder() }
                        Button("Model & Preset…") { showingRunSheet = true }
                    }
                }.frame(maxWidth: .infinity)
            }
            Spacer()
        }
        .padding(20)
        .onAppear { credits.refresh() }
        .frame(minWidth: 720, minHeight: 420)
        .sheet(isPresented: $showingRunSheet) {
            RunSheetView(selectedFolder: $selectedFolder)
                .frame(minWidth: 540, minHeight: 380)
        }
    }

    private func chooseFolder() {
        let panel = NSOpenPanel()
        panel.canChooseFiles = false
        panel.canChooseDirectories = true
        panel.allowsMultipleSelection = false
        panel.begin { resp in
            if resp == .OK {
                if let url = panel.urls.first {
                    self.selectedFolder = url
                    try? BookmarkStore.shared.save(url: url)
                    Task { await FolderSyncService().sync(deviceName: Host.current().localizedName ?? "Mac") }
                }
                self.showingRunSheet = true
            }
        }
    }

    private var connectionStateText: String {
        switch webSocket.connectionState {
        case .disconnected:
            return "Offline"
        case .connecting:
            return "Connecting..."
        case .connected:
            return "Connected"
        case .reconnecting(let attempt):
            return "Reconnecting (\(attempt))..."
        case .failed(let error):
            return "Failed"
        }
    }
}

#else
// iOS and iPadOS
import Combine

@main
struct KullApp: App {
    @StateObject private var auth = AuthViewModel()

    var body: some Scene {
        WindowGroup {
            if auth.isAuthenticated {
                HomeView()
                    .environmentObject(auth)
            } else {
                AuthView()
                    .environmentObject(auth)
            }
        }
    }
}

final class MobileCredits: ObservableObject {
    @Published var balance: Int = 0
    @Published var plan: String = "—"
    @Published var shootsLeft: Double = 0
    @Published var usingCachedData = false
    private var cancellables: Set<AnyCancellable> = []

    init() {
        // Load cached data on init
        loadCachedData()
    }

    private func loadCachedData() {
        if let cached = CacheManager.shared.getCachedCreditSummary() {
            self.balance = cached.balance
            self.plan = cached.planDisplayName
            self.shootsLeft = cached.estimatedShootsRemaining
            self.usingCachedData = true
        }
    }

    func refresh() {
        let baseURL = EnvironmentConfig.shared.apiBaseURL
        let url = baseURL.appendingPathComponent("/api/kull/credits/summary")
        URLSession.shared.dataTaskPublisher(for: URLRequest(url: url))
            .map(\.data)
            .decode(type: CreditSummary.self, decoder: JSONDecoder())
            .receive(on: DispatchQueue.main)
            .sink(receiveCompletion: { [weak self] completion in
                if case .failure = completion {
                    // Failed to fetch, use cached data
                    self?.loadCachedData()
                }
            }, receiveValue: { [weak self] sum in
                self?.balance = sum.balance
                self?.plan = sum.planDisplayName
                self?.shootsLeft = sum.estimatedShootsRemaining
                self?.usingCachedData = false

                // Cache the fresh data
                CacheManager.shared.cacheCreditSummary(sum)
            }).store(in: &cancellables)
    }
}

struct HomeView: View {
    @StateObject var credits = MobileCredits()
    @StateObject private var webSocket = WebSocketService.shared
    @StateObject private var syncCoordinator = SyncCoordinator.shared
    @StateObject private var networkMonitor = NetworkMonitor.shared
    @StateObject private var operationQueue = OfflineOperationQueue.shared
    @State private var showingPrompts = false
    @State private var showingFolders = false

    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Network status banner
                HStack {
                    Image(systemName: networkMonitor.isConnected ? "wifi" : "wifi.slash")
                        .foregroundColor(networkMonitor.isConnected ? .green : .orange)
                    Text(networkMonitor.connectionDescription)
                        .font(.caption)
                    Spacer()
                    if operationQueue.pendingOperationsCount > 0 {
                        Text("\(operationQueue.pendingOperationsCount) pending")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                }
                .padding(.horizontal)
                .padding(.vertical, 8)
                .background(networkMonitor.isConnected ? Color.green.opacity(0.1) : Color.orange.opacity(0.1))

                // Syncing indicator
                if operationQueue.isSyncing {
                    HStack {
                        ProgressView()
                            .scaleEffect(0.7)
                        Text("Syncing operations...")
                            .font(.caption)
                        Spacer()
                    }
                    .padding(.horizontal)
                    .padding(.vertical, 8)
                    .background(Color.blue.opacity(0.1))
                }

                // WebSocket connection status
                HStack {
                    Image(systemName: webSocket.isConnected ? "bolt.fill" : "exclamationmark.triangle.fill")
                        .foregroundColor(webSocket.isConnected ? .green : .orange)
                    Text(webSocket.isConnected ? "Real-time sync active" : connectionStateText)
                        .font(.caption)
                    Spacer()
                    if let lastSync = webSocket.lastSyncTime {
                        Text("Last sync: \(timeAgo(lastSync))")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                }
                .padding(.horizontal)
                .padding(.vertical, 8)
                .background(webSocket.isConnected ? Color.green.opacity(0.1) : Color.orange.opacity(0.1))

                List {
                    Section(header: Text("Credits")) {
                        HStack {
                            Text("Available")
                            Spacer()
                            Text("\(syncCoordinator.creditBalance > 0 ? syncCoordinator.creditBalance : credits.balance)")
                                .font(.headline)
                        }
                        HStack { Text("Plan"); Spacer(); Text(credits.plan) }
                        HStack { Text("Est. Shoots Left"); Spacer(); Text(String(format: "%.0f", credits.shootsLeft)) }
                        Button("Buy Credits") { /* open web */ }
                    }

                    // Active shoot progress
                    if syncCoordinator.isAnyShooting {
                        Section(header: Text("Active Shoots")) {
                            ForEach(Array(syncCoordinator.activeShootProgress.values), id: \.shootId) { progress in
                                VStack(alignment: .leading, spacing: 4) {
                                    HStack {
                                        Text("Shoot: \(progress.shootId.prefix(8))")
                                            .font(.caption)
                                        Spacer()
                                        Text("\(progress.processedCount)/\(progress.totalCount)")
                                            .font(.caption)
                                    }
                                    ProgressView(value: progress.progress)
                                    if let eta = progress.eta {
                                        Text("ETA: \(Int(eta))s")
                                            .font(.caption2)
                                            .foregroundColor(.secondary)
                                    }
                                }
                            }
                        }
                    }

                    Section {
                        NavigationLink(isActive: $showingFolders) { FoldersView() } label: { Button("Folders") { showingFolders = true } }
                        NavigationLink(isActive: $showingPrompts) { MarketplaceView() } label: { Button("Prompt Marketplace") { showingPrompts = true } }
                    }
                }
            }
            .navigationTitle("Kull")
            .onAppear { credits.refresh() }
        }
    }

    private var connectionStateText: String {
        switch webSocket.connectionState {
        case .disconnected:
            return "Offline"
        case .connecting:
            return "Connecting..."
        case .connected:
            return "Connected"
        case .reconnecting(let attempt):
            return "Reconnecting (\(attempt))..."
        case .failed(let error):
            return "Failed"
        }
    }

    private func timeAgo(_ date: Date) -> String {
        let seconds = Int(Date().timeIntervalSince(date))
        if seconds < 60 { return "\(seconds)s ago" }
        let minutes = seconds / 60
        if minutes < 60 { return "\(minutes)m ago" }
        let hours = minutes / 60
        return "\(hours)h ago"
    }
}

#endif
