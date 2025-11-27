//
//  KeyboardShortcuts.swift
//  kull - Universal App for macOS, iOS, and iPadOS
//
//  Created by Agent 22 on 11/18/25.
//

#if canImport(UIKit)
import SwiftUI
import UIKit
import OSLog

/// UIHostingController subclass that handles keyboard shortcuts
/// This is the proper way to integrate UIKeyCommands into SwiftUI on iPad
final class KeyboardHostingController<Content: View>: UIHostingController<Content> {
    private var customKeyCommands: [UIKeyCommand] = []

    override var keyCommands: [UIKeyCommand]? {
        return customKeyCommands
    }

    func setKeyCommands(_ commands: [UIKeyCommand]) {
        self.customKeyCommands = commands
    }

    // Explicit deinit to work around Xcode 26 beta compiler crash
    deinit {
        customKeyCommands.removeAll()
    }
}

/// Keyboard shortcuts for iPad
/// Cmd+N: New shoot
/// Cmd+,: Settings
/// Cmd+R: Refresh
struct KeyboardShortcutsModifier: ViewModifier {
    @Binding var showingNewShoot: Bool
    @Binding var showingSettings: Bool
    var onRefresh: () -> Void

    func body(content: Content) -> some View {
        content
            .onAppear {
                setupKeyCommands()
            }
    }

    private func setupKeyCommands() {
        // Register handlers with the global manager
        KeyboardCommandManager.shared.registerHandler(for: KeyboardCommandManager.Commands.newShoot) { [self] in
            Logger.ui.info("Keyboard shortcut: Cmd+N (New Shoot)")
            showingNewShoot = true
        }

        KeyboardCommandManager.shared.registerHandler(for: KeyboardCommandManager.Commands.settings) { [self] in
            Logger.ui.info("Keyboard shortcut: Cmd+, (Settings)")
            showingSettings = true
        }

        KeyboardCommandManager.shared.registerHandler(for: KeyboardCommandManager.Commands.refresh) {
            Logger.ui.info("Keyboard shortcut: Cmd+R (Refresh)")
            onRefresh()
        }

        // Register commands with the responder chain
        if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
           let window = windowScene.windows.first,
           let rootVC = window.rootViewController as? KeyboardHostingController<AnyView> {
            rootVC.setKeyCommands(KeyboardCommandManager.shared.buildKeyCommands())
        }
    }
}

extension View {
    /// Adds keyboard shortcuts to a view
    /// - Parameters:
    ///   - showingNewShoot: Binding to control "New Shoot" sheet (Cmd+N)
    ///   - showingSettings: Binding to control Settings sheet (Cmd+,)
    ///   - onRefresh: Callback for refresh action (Cmd+R)
    func keyboardShortcuts(
        showingNewShoot: Binding<Bool>,
        showingSettings: Binding<Bool>,
        onRefresh: @escaping () -> Void
    ) -> some View {
        self.modifier(KeyboardShortcutsModifier(
            showingNewShoot: showingNewShoot,
            showingSettings: showingSettings,
            onRefresh: onRefresh
        ))
    }
}

/// Keyboard command definitions for iOS/iPadOS
/// Manages global keyboard shortcuts for the app
class KeyboardCommandManager {
    static let shared = KeyboardCommandManager()

    // Command identifiers
    struct Commands {
        static let newShoot = "newShoot"
        static let settings = "settings"
        static let refresh = "refresh"
    }

    private var commandHandlers: [String: () -> Void] = [:]

    private init() {}

    /// Register a handler for a specific command
    func registerHandler(for command: String, handler: @escaping () -> Void) {
        commandHandlers[command] = handler
        Logger.ui.debug("Registered keyboard handler for command: \(command)")
    }

    /// Remove a handler for a specific command
    func unregisterHandler(for command: String) {
        commandHandlers.removeValue(forKey: command)
        Logger.ui.debug("Unregistered keyboard handler for command: \(command)")
    }

    /// Execute a command if a handler is registered
    func executeCommand(_ command: String) {
        if let handler = commandHandlers[command] {
            Logger.ui.info("Executing keyboard command: \(command)")
            handler()
        } else {
            Logger.ui.warning("No handler registered for keyboard command: \(command)")
        }
    }

    /// Build the array of UIKeyCommands for the app
    func buildKeyCommands() -> [UIKeyCommand] {
        return [
            UIKeyCommand(
                title: "New Shoot",
                action: #selector(KeyboardResponder.handleNewShoot),
                input: "n",
                modifierFlags: .command,
                discoverabilityTitle: "Start a new photo culling session"
            ),
            UIKeyCommand(
                title: "Settings",
                action: #selector(KeyboardResponder.handleSettings),
                input: ",",
                modifierFlags: .command,
                discoverabilityTitle: "Open settings"
            ),
            UIKeyCommand(
                title: "Refresh",
                action: #selector(KeyboardResponder.handleRefresh),
                input: "r",
                modifierFlags: .command,
                discoverabilityTitle: "Refresh current view"
            )
        ]
    }
}

/// Helper class to make keyboard commands work with Objective-C selectors
@objc class KeyboardResponder: NSObject {
    @objc static func handleNewShoot() {
        KeyboardCommandManager.shared.executeCommand(KeyboardCommandManager.Commands.newShoot)
    }

    @objc static func handleSettings() {
        KeyboardCommandManager.shared.executeCommand(KeyboardCommandManager.Commands.settings)
    }

    @objc static func handleRefresh() {
        KeyboardCommandManager.shared.executeCommand(KeyboardCommandManager.Commands.refresh)
    }
}
#endif
