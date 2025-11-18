import Foundation
import SwiftUI
import Combine

enum Environment: String, CaseIterable, Identifiable {
    case development = "Development"
    case staging = "Staging"
    case production = "Production"

    var id: String { rawValue }

    var baseURL: URL {
        switch self {
        case .development:
            return URL(string: "http://localhost:5000")!
        case .staging:
            return URL(string: "https://staging.kullai.com")!
        case .production:
            return URL(string: "https://kullai.com")!
        }
    }

    var wsURL: URL {
        switch self {
        case .development:
            return URL(string: "ws://localhost:5000")!
        case .staging:
            return URL(string: "wss://staging.kullai.com")!
        case .production:
            return URL(string: "wss://kullai.com")!
        }
    }

    var displayName: String {
        switch self {
        case .development:
            return "Development (localhost:5000)"
        case .staging:
            return "Staging (staging.kullai.com)"
        case .production:
            return "Production (kullai.com)"
        }
    }
}

@MainActor
class EnvironmentConfig: ObservableObject {
    static let shared = EnvironmentConfig()

    @Published var current: Environment {
        didSet {
            UserDefaults.standard.set(current.rawValue, forKey: "selectedEnvironment")
            // Notify all services that environment changed
            NotificationCenter.default.post(
                name: .environmentDidChange,
                object: current
            )
        }
    }

    private init() {
        // Load from UserDefaults
        if let saved = UserDefaults.standard.string(forKey: "selectedEnvironment"),
           let env = Environment(rawValue: saved) {
            self.current = env
        } else {
            // Default to production for all builds
            // Users can switch to development mode via settings if needed
            self.current = .production
        }
    }

    var apiBaseURL: URL {
        current.baseURL
    }

    var websocketURL: URL {
        current.wsURL
    }
}

extension Notification.Name {
    static let environmentDidChange = Notification.Name("environmentDidChange")
}
