//
//  SettingsView.swift
//  kull - Universal App for macOS, iOS, and iPadOS
//
//  Created by Agent G on 11/18/25.
//

import Foundation
import SwiftUI
import OSLog
#if os(iOS)
import UserNotifications
import UIKit
#endif

/// Settings view for environment switching, notification preferences, and app info
struct SettingsView: View {
    @StateObject private var envConfig = EnvironmentConfig.shared
    @EnvironmentObject private var authViewModel: AuthViewModel
    @AppStorage("notifyShootCompleted") private var notifyShootCompleted = true
    @AppStorage("notifyCreditsLow") private var notifyCreditsLow = true
    @AppStorage("notifyDeviceConnected") private var notifyDeviceConnected = true
    @AppStorage("debugLogging") private var debugLogging = false
    @State private var showingLogViewer = false
    @State private var showingClearCacheConfirmation = false
    @State private var cacheCleared = false

    #if os(iOS)
    @AppStorage("showBadgeOnIcon") private var showBadgeOnIcon = true
    @AppStorage("allowBackgroundRefresh") private var allowBackgroundRefresh = true
    #endif

    var body: some View {
        Form {
            accountSection
            environmentSection
            notificationsSection
            #if os(iOS)
            iosSettingsSection
            #endif
            advancedSection
            aboutSection
        }
        .formStyle(.grouped)
        .navigationTitle("Settings")
        #if os(macOS)
        .frame(minWidth: 500, minHeight: 600)
        #endif
        .errorAlert()
    }

    // MARK: - Account Section

    private var accountSection: some View {
        Section("Account") {
            if let user = authViewModel.currentUser {
                VStack(alignment: .leading, spacing: 4) {
                    Text(user.displayName)
                        .font(.headline)
                    if let email = user.email {
                        Text(email)
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                }
                .padding(.vertical, 4)

                Button("Sign Out", role: .destructive) {
                    Logger.settings.info("User initiated sign out")
                    Task {
                        await authViewModel.logout()
                    }
                }
            } else {
                Text("Not signed in")
                    .foregroundColor(.secondary)
            }
        }
    }

    // MARK: - Environment Section

    private var environmentSection: some View {
        Section("Server Environment") {
            Picker("Environment", selection: $envConfig.current) {
                ForEach(Environment.allCases) { env in
                    Text(env.displayName).tag(env)
                }
            }
            .onChange(of: envConfig.current) { oldValue, newValue in
                Logger.settings.logEnvironmentChange(oldValue.rawValue, newValue.rawValue)
            }

            VStack(alignment: .leading, spacing: 4) {
                Text("API Base URL")
                    .font(.caption)
                    .foregroundColor(.secondary)
                Text(envConfig.apiBaseURL.absoluteString)
                    .font(.system(.body, design: .monospaced))
                    .foregroundColor(.blue)
            }
            .padding(.vertical, 2)

            VStack(alignment: .leading, spacing: 4) {
                Text("WebSocket URL")
                    .font(.caption)
                    .foregroundColor(.secondary)
                Text(envConfig.websocketURL.absoluteString)
                    .font(.system(.body, design: .monospaced))
                    .foregroundColor(.blue)
            }
            .padding(.vertical, 2)
        }
    }

    // MARK: - Notifications Section

    private var notificationsSection: some View {
        Section("Notifications") {
            Toggle("Shoot completed", isOn: $notifyShootCompleted)
                .onChange(of: notifyShootCompleted) { _, newValue in
                    Logger.settings.logSettingsChange("notifyShootCompleted", String(newValue))
                }

            Toggle("Credits running low", isOn: $notifyCreditsLow)
                .onChange(of: notifyCreditsLow) { _, newValue in
                    Logger.settings.logSettingsChange("notifyCreditsLow", String(newValue))
                }

            Toggle("Device connected", isOn: $notifyDeviceConnected)
                .onChange(of: notifyDeviceConnected) { _, newValue in
                    Logger.settings.logSettingsChange("notifyDeviceConnected", String(newValue))
                }
        }
    }

    // MARK: - iOS Settings Section

    #if os(iOS)
    private var iosSettingsSection: some View {
        Section("iOS Settings") {
            Toggle("Show badge on app icon", isOn: $showBadgeOnIcon)
                .onChange(of: showBadgeOnIcon) { _, newValue in
                    Logger.settings.logSettingsChange("showBadgeOnIcon", String(newValue))
                    updateBadgeSettings(newValue)
                }

            Toggle("Allow background refresh", isOn: $allowBackgroundRefresh)
                .onChange(of: allowBackgroundRefresh) { _, newValue in
                    Logger.settings.logSettingsChange("allowBackgroundRefresh", String(newValue))
                }

            Text("Background refresh allows the app to check for processing updates when not in use.")
                .font(.caption)
                .foregroundColor(.secondary)
        }
    }
    #endif

    // MARK: - Advanced Section

    private var advancedSection: some View {
        Section("Advanced") {
            Toggle("Debug logging", isOn: $debugLogging)
                .onChange(of: debugLogging) { _, newValue in
                    Logger.settings.logSettingsChange("debugLogging", String(newValue))
                }

            #if os(macOS)
            Button("View Logs in Console.app") {
                openConsoleApp()
            }
            #else
            Button("View Logs") {
                showingLogViewer = true
            }
            .sheet(isPresented: $showingLogViewer) {
                LogViewerView()
            }
            #endif

            Button("Clear Cache") {
                showingClearCacheConfirmation = true
            }
            .confirmationDialog(
                "Clear all cached data?",
                isPresented: $showingClearCacheConfirmation,
                titleVisibility: .visible
            ) {
                Button("Clear Cache", role: .destructive) {
                    clearCache()
                }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("This will clear all locally cached data. You may need to re-sync with the server.")
            }

            if cacheCleared {
                Text("Cache cleared successfully")
                    .foregroundColor(.green)
                    .font(.caption)
            }

            #if DEBUG
            Button("Test Error Alert") {
                ErrorPresenter.shared.presentCustom(
                    title: "Test Error",
                    message: "This is a test error message to verify the error presentation system."
                )
            }
            #endif
        }
    }

    // MARK: - About Section

    private var aboutSection: some View {
        Section("About") {
            HStack {
                Text("Version")
                Spacer()
                Text("\(appVersion)")
                    .foregroundColor(.secondary)
            }

            HStack {
                Text("Build")
                Spacer()
                Text(buildNumber)
                    .foregroundColor(.secondary)
            }

            #if os(macOS)
            HStack {
                Text("Platform")
                Spacer()
                Text("macOS")
                    .foregroundColor(.secondary)
            }
            #elseif os(iOS)
            HStack {
                Text("Platform")
                Spacer()
                Text("iOS")
                    .foregroundColor(.secondary)
            }
            #endif

            Link("Privacy Policy", destination: URL(string: "https://kullai.com/privacy")!)
            Link("Terms of Service", destination: URL(string: "https://kullai.com/terms")!)
            Link("Support", destination: URL(string: "https://kullai.com/support")!)
        }
    }

    // MARK: - Helper Functions

    private var appVersion: String {
        Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0.0"
    }

    private var buildNumber: String {
        Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "1"
    }

    #if os(macOS)
    private func openConsoleApp() {
        Logger.settings.info("Opening Console.app for log viewing")
        let task = Process()
        task.launchPath = "/usr/bin/open"
        task.arguments = ["-a", "Console"]
        do {
            try task.run()
        } catch {
            Logger.errors.error("Failed to open Console.app: \(error.localizedDescription)")
        }
    }
    #endif

    #if os(iOS)
    private func updateBadgeSettings(_ enabled: Bool) {
        if enabled {
            // Request notification permission for badge (non-intrusive)
            UNUserNotificationCenter.current().requestAuthorization(options: [.badge]) { granted, error in
                if let error = error {
                    Logger.errors.error("Failed to request badge authorization: \(error.localizedDescription)")
                }
            }
        } else {
            // Clear badge
            Task { @MainActor in
                UIApplication.shared.applicationIconBadgeNumber = 0
            }
        }
    }
    #endif

    private func clearCache() {
        Logger.settings.notice("User initiated cache clear")

        // Clear URLCache
        URLCache.shared.removeAllCachedResponses()

        // Clear UserDefaults cache keys (but preserve settings)
        let settingsKeys = [
            "notifyShootCompleted",
            "notifyCreditsLow",
            "notifyDeviceConnected",
            "debugLogging",
            "selectedEnvironment"
        ]

        let defaults = UserDefaults.standard
        let dictionary = defaults.dictionaryRepresentation()
        for key in dictionary.keys where !settingsKeys.contains(key) {
            defaults.removeObject(forKey: key)
        }

        cacheCleared = true
        Logger.settings.notice("Cache cleared successfully")

        // Hide the success message after 3 seconds
        DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
            cacheCleared = false
        }
    }
}

// MARK: - Log Viewer (iOS only)

#if !os(macOS)
struct LogViewerView: View {
    @SwiftUI.Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    // Header
                    VStack(alignment: .leading, spacing: 8) {
                        Label("Viewing Logs on iOS", systemImage: "doc.text.magnifyingglass")
                            .font(.headline)

                        Text("Kull uses Apple's native OSLog system for secure, efficient logging. All logs are stored system-wide and can be viewed using developer tools.")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                    .padding(.horizontal)
                    .padding(.top)

                    Divider()

                    // Console.app Instructions
                    VStack(alignment: .leading, spacing: 8) {
                        Label("Using Console.app (Mac)", systemImage: "desktopcomputer")
                            .font(.headline)

                        Text("For detailed, real-time log viewing:")
                            .font(.subheadline)

                        VStack(alignment: .leading, spacing: 4) {
                            HStack(alignment: .top) {
                                Text("1.")
                                    .fontWeight(.medium)
                                Text("Connect your device to a Mac via USB or WiFi")
                            }
                            HStack(alignment: .top) {
                                Text("2.")
                                    .fontWeight(.medium)
                                Text("Open Console.app (in /Applications/Utilities/)")
                            }
                            HStack(alignment: .top) {
                                Text("3.")
                                    .fontWeight(.medium)
                                Text("Select your device from the sidebar")
                            }
                            HStack(alignment: .top) {
                                Text("4.")
                                    .fontWeight(.medium)
                                VStack(alignment: .leading, spacing: 4) {
                                    Text("Filter logs by subsystem:")
                                    Text("media.lander.kull")
                                        .font(.system(.caption, design: .monospaced))
                                        .padding(4)
                                        .background(Color.secondary.opacity(0.1))
                                        .cornerRadius(4)
                                }
                            }
                        }
                        .font(.caption)
                    }
                    .padding(.horizontal)

                    Divider()

                    // Xcode Console Instructions
                    VStack(alignment: .leading, spacing: 8) {
                        Label("Using Xcode Console", systemImage: "hammer")
                            .font(.headline)

                        Text("When running from Xcode:")
                            .font(.subheadline)

                        VStack(alignment: .leading, spacing: 4) {
                            HStack(alignment: .top) {
                                Text("1.")
                                    .fontWeight(.medium)
                                Text("Run the app from Xcode")
                            }
                            HStack(alignment: .top) {
                                Text("2.")
                                    .fontWeight(.medium)
                                Text("Open the debug console (Cmd+Shift+Y)")
                            }
                            HStack(alignment: .top) {
                                Text("3.")
                                    .fontWeight(.medium)
                                Text("View real-time logs in the output panel")
                            }
                        }
                        .font(.caption)
                    }
                    .padding(.horizontal)

                    Divider()

                    // Log Categories
                    VStack(alignment: .leading, spacing: 8) {
                        Label("Available Log Categories", systemImage: "list.bullet.rectangle")
                            .font(.headline)

                        VStack(alignment: .leading, spacing: 6) {
                            LogCategoryRow(category: "auth", description: "Authentication and device linking")
                            LogCategoryRow(category: "sync", description: "WebSocket real-time sync")
                            LogCategoryRow(category: "api", description: "API requests and responses")
                            LogCategoryRow(category: "processing", description: "AI photo processing")
                            LogCategoryRow(category: "errors", description: "All application errors")
                            LogCategoryRow(category: "keychain", description: "Secure credential storage")
                            LogCategoryRow(category: "settings", description: "Settings changes")
                            LogCategoryRow(category: "ui", description: "User interface interactions")
                        }
                    }
                    .padding(.horizontal)

                    Divider()

                    // Tips
                    VStack(alignment: .leading, spacing: 8) {
                        Label("Pro Tips", systemImage: "lightbulb")
                            .font(.headline)

                        VStack(alignment: .leading, spacing: 4) {
                            Text("• Enable 'Debug logging' in Advanced settings for more detailed logs")
                            Text("• Logs persist across app restarts")
                            Text("• Filter by category in Console.app for focused debugging")
                            Text("• Screenshots of Console.app logs can be shared with support")
                        }
                        .font(.caption)
                        .foregroundColor(.secondary)
                    }
                    .padding(.horizontal)
                    .padding(.bottom)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .navigationTitle("Logs")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
    }
}

// Helper view for log category rows
struct LogCategoryRow: View {
    let category: String
    let description: String

    var body: some View {
        HStack(alignment: .top, spacing: 8) {
            Text(category)
                .font(.system(.caption, design: .monospaced))
                .fontWeight(.medium)
                .foregroundColor(.blue)
                .frame(width: 80, alignment: .leading)

            Text(description)
                .font(.caption)
                .foregroundColor(.secondary)
        }
    }
}
#endif

// MARK: - Preview

#if DEBUG
struct SettingsView_Previews: PreviewProvider {
    static var previews: some View {
        NavigationView {
            SettingsView()
                .environmentObject(AuthViewModel())
        }
    }
}
#endif
