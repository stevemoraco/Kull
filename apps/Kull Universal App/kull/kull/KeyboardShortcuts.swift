//
//  KeyboardShortcuts.swift
//  kull - Universal App for macOS, iOS, and iPadOS
//
//  Created by Agent 22 on 11/18/25.
//

import SwiftUI

#if os(iOS)
/// Keyboard shortcuts for iPad
/// Cmd+N: New shoot
/// Cmd+,: Settings
/// Cmd+W: Close current view
/// Cmd+R: Refresh
struct KeyboardShortcutsModifier: ViewModifier {
    @Binding var showingNewShoot: Bool
    @Binding var showingSettings: Bool
    var onRefresh: () -> Void
    @Environment(\.dismiss) private var dismiss

    func body(content: Content) -> some View {
        content
            .onAppear {
                setupKeyCommands()
            }
    }

    private func setupKeyCommands() {
        // Note: UIKeyCommand setup would go here
        // This is a placeholder for the keyboard command infrastructure
    }
}

extension View {
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
class KeyboardCommandManager {
    static let shared = KeyboardCommandManager()

    // Command identifiers
    struct Commands {
        static let newShoot = "newShoot"
        static let settings = "settings"
        static let close = "close"
        static let refresh = "refresh"
    }

    private var commandHandlers: [String: () -> Void] = [:]

    func registerHandler(for command: String, handler: @escaping () -> Void) {
        commandHandlers[command] = handler
    }

    func executeCommand(_ command: String) {
        commandHandlers[command]?()
    }

    func buildKeyCommands() -> [UIKeyCommand] {
        return [
            UIKeyCommand(
                title: "New Shoot",
                action: #selector(handleNewShoot),
                input: "n",
                modifierFlags: .command,
                discoverabilityTitle: "Start a new photo culling session"
            ),
            UIKeyCommand(
                title: "Settings",
                action: #selector(handleSettings),
                input: ",",
                modifierFlags: .command,
                discoverabilityTitle: "Open settings"
            ),
            UIKeyCommand(
                title: "Close",
                action: #selector(handleClose),
                input: "w",
                modifierFlags: .command,
                discoverabilityTitle: "Close current view"
            ),
            UIKeyCommand(
                title: "Refresh",
                action: #selector(handleRefresh),
                input: "r",
                modifierFlags: .command,
                discoverabilityTitle: "Refresh current view"
            )
        ]
    }

    @objc private func handleNewShoot() {
        executeCommand(Commands.newShoot)
    }

    @objc private func handleSettings() {
        executeCommand(Commands.settings)
    }

    @objc private func handleClose() {
        executeCommand(Commands.close)
    }

    @objc private func handleRefresh() {
        executeCommand(Commands.refresh)
    }
}
#endif
