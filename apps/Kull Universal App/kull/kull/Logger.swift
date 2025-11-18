//
//  Logger.swift
//  kull - Universal App for macOS, iOS, and iPadOS
//
//  Created by Agent G on 11/18/25.
//

import Foundation
import OSLog

/// Centralized logging system using OSLog for admin debugging
/// NEVER show errors to users - all errors are logged for admin review only
extension Logger {
    private static let subsystem = "media.lander.kull"

    /// Authentication-related logs (device linking, token refresh, logout)
    static let auth = Logger(subsystem: subsystem, category: "auth")

    /// Real-time sync logs (WebSocket connection, messages, reconnection)
    static let sync = Logger(subsystem: subsystem, category: "sync")

    /// API request/response logs (endpoints, status codes, errors)
    static let api = Logger(subsystem: subsystem, category: "api")

    /// AI processing logs (provider selection, image processing, results)
    static let processing = Logger(subsystem: subsystem, category: "processing")

    /// Error logs (all errors across the app)
    static let errors = Logger(subsystem: subsystem, category: "errors")

    /// Keychain operations (save, retrieve, delete tokens)
    static let keychain = Logger(subsystem: subsystem, category: "keychain")

    /// Settings and configuration changes
    static let settings = Logger(subsystem: subsystem, category: "settings")

    /// User interface interactions and navigation
    static let ui = Logger(subsystem: subsystem, category: "ui")
}

/// Helper extension for logging with consistent formatting
extension Logger {
    /// Log an API request
    func logAPIRequest(_ method: String, _ endpoint: String) {
        self.info("API Request: \(method) \(endpoint)")
    }

    /// Log an API response
    func logAPIResponse(_ statusCode: Int, _ endpoint: String, duration: TimeInterval) {
        self.info("API Response: [\(statusCode)] \(endpoint) (\(String(format: "%.2f", duration))s)")
    }

    /// Log an API error
    func logAPIError(_ error: Error, _ endpoint: String) {
        self.error("API Error: \(endpoint) - \(error.localizedDescription)")
    }

    /// Log successful authentication
    func logAuthSuccess(_ userId: String) {
        self.notice("Auth Success: User \(userId) authenticated")
    }

    /// Log authentication failure
    func logAuthFailure(_ reason: String) {
        self.error("Auth Failure: \(reason)")
    }

    /// Log WebSocket connection state change
    func logWebSocketState(_ state: String) {
        self.info("WebSocket: \(state)")
    }

    /// Log WebSocket message received
    func logWebSocketMessage(_ type: String) {
        self.debug("WebSocket Message: \(type)")
    }

    /// Log processing start
    func logProcessingStart(_ provider: String, _ imageCount: Int) {
        self.notice("Processing Started: \(imageCount) images with \(provider)")
    }

    /// Log processing completion
    func logProcessingComplete(_ imageCount: Int, duration: TimeInterval) {
        self.notice("Processing Complete: \(imageCount) images in \(String(format: "%.2f", duration))s")
    }

    /// Log processing error
    func logProcessingError(_ error: Error, _ provider: String) {
        self.error("Processing Error: \(provider) - \(error.localizedDescription)")
    }

    /// Log keychain operation
    func logKeychainOperation(_ operation: String, success: Bool, error: Error? = nil) {
        if success {
            self.debug("Keychain: \(operation) succeeded")
        } else {
            self.error("Keychain: \(operation) failed - \(error?.localizedDescription ?? "unknown error")")
        }
    }

    /// Log environment change
    func logEnvironmentChange(_ oldEnv: String, _ newEnv: String) {
        self.notice("Environment Changed: \(oldEnv) -> \(newEnv)")
    }

    /// Log settings change
    func logSettingsChange(_ setting: String, _ value: String) {
        self.info("Settings: \(setting) = \(value)")
    }
}

/// Debug logging helpers (only active in DEBUG builds)
extension Logger {
    /// Log debug information (only in DEBUG builds)
    func debugLog(_ message: String) {
        #if DEBUG
        self.debug("\(message)")
        #endif
    }

    /// Log verbose information for troubleshooting
    func verbose(_ message: String) {
        #if DEBUG
        self.trace("\(message)")
        #endif
    }
}

/// Performance measurement helper
class PerformanceTimer {
    private let startTime: CFAbsoluteTime
    private let logger: Logger
    private let operation: String

    init(logger: Logger, operation: String) {
        self.startTime = CFAbsoluteTimeGetCurrent()
        self.logger = logger
        self.operation = operation
        logger.debug("⏱️ Starting: \(operation)")
    }

    func stop() {
        let duration = CFAbsoluteTimeGetCurrent() - startTime
        logger.info("⏱️ Completed: \(operation) in \(String(format: "%.3f", duration))s")
    }

    deinit {
        stop()
    }
}

/// Usage example:
/// let timer = PerformanceTimer(logger: .api, operation: "Fetch credit summary")
/// // ... perform operation ...
/// timer.stop()
