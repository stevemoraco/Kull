import SwiftUI
import Combine
import AppKit

@main
struct KullMenubarApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) var appDelegate

    var body: some Scene {
        WindowGroup("Kull") {
            MainWindow()
                .environmentObject(CreditSummaryViewModel())
        }
        .commands {
            CommandGroup(replacing: .appInfo) {
                Button("Kull Website") {
                    if let url = URL(string: "https://kullai.com") { NSWorkspace.shared.open(url) }
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
            // The run sheet will be triggered manually by the user; future: deep-link state.
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
        guard let url = URL(string: "/api/kull/credits/summary", relativeTo: baseURL()) else { return }
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

    private func baseURL() -> URL {
        // assumes same host during development
        return URL(string: "http://localhost:5000")!
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
