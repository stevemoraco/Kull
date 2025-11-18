import Foundation

#if canImport(UIKit)
import SwiftUI
import Combine

@main
struct KullMobileApp: App {
    var body: some Scene {
        WindowGroup {
            HomeView()
        }
    }
}

final class MobileCredits: ObservableObject {
    @Published var balance: Int = 0
    @Published var plan: String = "—"
    @Published var shootsLeft: Double = 0
    private var cancellables: Set<AnyCancellable> = []

    func refresh() {
        guard let url = URL(string: "http://localhost:5000/api/kull/credits/summary") else { return }
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

#if !canImport(UIKit)
@main
enum UnsupportedPlatformApp {
    static func main() {
        fatalError("KullMobileApp requires UIKit.")
    }
}
#endif
