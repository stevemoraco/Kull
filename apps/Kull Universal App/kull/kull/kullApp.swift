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
    private var cancellables: Set<AnyCancellable> = []

    func refresh() {
        let baseURL = EnvironmentConfig.shared.apiBaseURL
        let url = baseURL.appendingPathComponent("/api/kull/credits/summary")
        loading = true
        URLSession.shared.dataTaskPublisher(for: URLRequest(url: url))
            .map(\.data)
            .decode(type: CreditSummary.self, decoder: JSONDecoder())
            .receive(on: DispatchQueue.main)
            .sink(receiveCompletion: { [weak self] _ in self?.loading = false }, receiveValue: { [weak self] cs in
                self?.balance = cs.balance
                self?.planDisplayName = cs.planDisplayName
                self?.estimatedShootsRemaining = cs.estimatedShootsRemaining
            })
            .store(in: &cancellables)
    }
}

struct MainWindow: View {
    @EnvironmentObject var credits: CreditSummaryViewModel
    @State private var showingRunSheet = false
    @State private var selectedFolder: URL? = nil

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Text("Kull")
                    .font(.system(size: 22, weight: .bold))
                Spacer()
                Button("Refresh Credits") { credits.refresh() }
            }
            HStack(spacing: 24) {
                VStack(alignment: .leading) {
                    Text("Credits Available")
                        .font(.caption).foregroundStyle(.secondary)
                    Text("\(credits.balance)")
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
    private var cancellables: Set<AnyCancellable> = []

    func refresh() {
        let baseURL = EnvironmentConfig.shared.apiBaseURL
        let url = baseURL.appendingPathComponent("/api/kull/credits/summary")
        URLSession.shared.dataTaskPublisher(for: URLRequest(url: url))
            .map(\.data)
            .decode(type: CreditSummary.self, decoder: JSONDecoder())
            .replaceError(with: CreditSummary(balance: 0, planDisplayName: "—", estimatedShootsRemaining: 0))
            .receive(on: DispatchQueue.main)
            .sink { [weak self] sum in
                self?.balance = sum.balance
                self?.plan = sum.planDisplayName
                self?.shootsLeft = sum.estimatedShootsRemaining
            }.store(in: &cancellables)
    }
}

struct HomeView: View {
    @StateObject var credits = MobileCredits()
    @State private var showingPrompts = false
    @State private var showingFolders = false

    var body: some View {
        NavigationView {
            List {
                Section(header: Text("Credits")) {
                    HStack { Text("Available"); Spacer(); Text("\(credits.balance)").font(.headline) }
                    HStack { Text("Plan"); Spacer(); Text(credits.plan) }
                    HStack { Text("Est. Shoots Left"); Spacer(); Text(String(format: "%.0f", credits.shootsLeft)) }
                    Button("Buy Credits") { /* open web */ }
                }
                Section(header: Text("Active Shoot")) {
                    HStack { Text("Model"); Spacer(); Text("—") }
                    HStack { Text("Progress"); Spacer(); Text("0 / 0") }
                    HStack { Text("ETA"); Spacer(); Text("—") }
                }
                Section {
                    NavigationLink(isActive: $showingFolders) { FoldersView() } label: { Button("Folders") { showingFolders = true } }
                    NavigationLink(isActive: $showingPrompts) { MarketplaceView() } label: { Button("Prompt Marketplace") { showingPrompts = true } }
                }
            }
            .navigationTitle("Kull")
            .onAppear { credits.refresh() }
        }
    }
}

#endif
