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
    private let defaultsKey = "selectedEnvironment"
    private var defaultsObserver: NSObjectProtocol?

    /// Default environment for fresh installs. We ship pointing at production.
    static var defaultEnvironment: Environment {
        return .production
    }

    @Published var current: Environment {
        didSet {
            UserDefaults.standard.set(current.rawValue, forKey: defaultsKey)
            // Notify all services that environment changed
            NotificationCenter.default.post(
                name: .environmentDidChange,
                object: current
            )
        }
    }

    private init() {
        // Load from UserDefaults
        if let saved = UserDefaults.standard.string(forKey: defaultsKey),
           let env = Environment(rawValue: saved) {
            #if DEBUG
            self.current = env
            #else
            // Never ship pointing at localhost; migrate to production if needed
            if env == .development {
                self.current = .production
                UserDefaults.standard.set(current.rawValue, forKey: defaultsKey)
            } else {
                self.current = env
            }
            #endif
        } else {
            // Default to production in release builds, development in debug
            self.current = Self.defaultEnvironment
            UserDefaults.standard.set(current.rawValue, forKey: defaultsKey)
        }

        defaultsObserver = NotificationCenter.default.addObserver(
            forName: UserDefaults.didChangeNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            Task { @MainActor [weak self] in
                self?.syncFromDefaults()
            }
        }
    }

    deinit {
        if let observer = defaultsObserver {
            NotificationCenter.default.removeObserver(observer)
        }
    }

    private func syncFromDefaults() {
        if let saved = UserDefaults.standard.string(forKey: defaultsKey),
           let env = Environment(rawValue: saved),
           env != current {
            #if DEBUG
            current = env
            #else
            // Ship builds always use production if no explicit choice
            current = env == .development ? .production : env
            if env == .development {
                UserDefaults.standard.set(current.rawValue, forKey: defaultsKey)
            }
            #endif
        } else if UserDefaults.standard.string(forKey: defaultsKey) == nil && current != Self.defaultEnvironment {
            current = Self.defaultEnvironment
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
