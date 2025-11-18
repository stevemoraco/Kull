//
//  ErrorPresenter.swift
//  kull - Universal App for macOS, iOS, and iPadOS
//
//  Created by Agent G on 11/18/25.
//

import Foundation
import SwiftUI
import OSLog
import Combine

/// User-facing error that should be shown in the UI
/// ONLY critical user-facing errors are shown - network/API errors are logged only
struct PresentableError: Identifiable {
    let id = UUID()
    let title: String
    let message: String
    let retryAction: (() -> Void)?

    init(title: String, message: String, retryAction: (() -> Void)? = nil) {
        self.title = title
        self.message = message
        self.retryAction = retryAction
    }
}

/// ErrorPresenter decides which errors to show to users and which to only log
/// Core principle: NEVER show network/API errors to users
@MainActor
class ErrorPresenter: ObservableObject {
    static let shared = ErrorPresenter()

    @Published var currentError: PresentableError?

    private init() {}

    /// Present an error to the user (if it's a critical user-facing error)
    /// All errors are logged for admin, but only critical ones are shown to users
    func present(_ error: Error, context: String = "", retryAction: (() -> Void)? = nil) {
        // Always log for admin
        Logger.errors.error("Error in \(context): \(error.localizedDescription)")

        // Convert to user error (returns nil for non-critical errors)
        if let userError = convertToUserError(error, context: context, retryAction: retryAction) {
            currentError = userError
        }
    }

    /// Clear the current error
    func dismiss() {
        currentError = nil
    }

    /// Convert system error to user-facing error (or nil if should not be shown)
    private func convertToUserError(_ error: Error, context: String, retryAction: (() -> Void)?) -> PresentableError? {
        // Check if it's an API error
        if let apiError = error as? APIError {
            return handleAPIError(apiError, context: context, retryAction: retryAction)
        }

        // Check if it's a Keychain error
        if let keychainError = error as? KeychainError {
            return handleKeychainError(keychainError)
        }

        // Default: Log but don't show generic errors
        Logger.errors.error("Unhandled error type: \(error.localizedDescription)")
        return nil
    }

    /// Handle API-specific errors
    private func handleAPIError(_ error: APIError, context: String, retryAction: (() -> Void)?) -> PresentableError? {
        switch error {
        case .notAuthenticated:
            // Critical: User needs to re-authenticate
            return PresentableError(
                title: "Authentication Required",
                message: "Your session has expired. Please sign in again.",
                retryAction: nil
            )

        case .requestFailed(let status) where status == 402:
            // Critical: Insufficient credits
            return PresentableError(
                title: "Insufficient Credits",
                message: "You don't have enough credits to complete this action. Please purchase more credits.",
                retryAction: nil
            )

        case .refreshFailed:
            // Critical: Token refresh failed, need to re-authenticate
            return PresentableError(
                title: "Session Expired",
                message: "Your session could not be renewed. Please sign in again.",
                retryAction: nil
            )

        case .requestFailed(let status):
            // Log but DON'T show network/server errors to users
            Logger.api.error("API request failed with status \(status) in \(context)")
            return nil

        case .decodingFailed:
            // Log but DON'T show decoding errors to users
            Logger.api.error("Failed to decode API response in \(context)")
            return nil

        case .invalidURL, .invalidResponse:
            // Log but DON'T show technical errors to users
            Logger.api.error("Invalid API request/response in \(context)")
            return nil
        }
    }

    /// Handle Keychain-specific errors
    private func handleKeychainError(_ error: KeychainError) -> PresentableError? {
        // Keychain errors are technical - log but don't show to users
        Logger.keychain.error("Keychain error: \(error)")
        return nil
    }

    /// Present a specific user-facing error with custom title and message
    func presentCustom(title: String, message: String, retryAction: (() -> Void)? = nil) {
        currentError = PresentableError(
            title: title,
            message: message,
            retryAction: retryAction
        )
        Logger.errors.notice("Custom error presented: \(title) - \(message)")
    }
}

/// SwiftUI View Modifier for presenting errors
struct ErrorAlertModifier: ViewModifier {
    @ObservedObject var errorPresenter: ErrorPresenter

    func body(content: Content) -> some View {
        content
            .alert(item: $errorPresenter.currentError) { error in
                if let retryAction = error.retryAction {
                    return Alert(
                        title: Text(error.title),
                        message: Text(error.message),
                        primaryButton: .default(Text("Retry"), action: retryAction),
                        secondaryButton: .cancel()
                    )
                } else {
                    return Alert(
                        title: Text(error.title),
                        message: Text(error.message),
                        dismissButton: .default(Text("OK"))
                    )
                }
            }
    }
}

/// SwiftUI View extension for easy error handling
extension View {
    func errorAlert() -> some View {
        self.modifier(ErrorAlertModifier(errorPresenter: ErrorPresenter.shared))
    }
}

/// Example usage in views:
///
/// ```swift
/// struct MyView: View {
///     var body: some View {
///         VStack {
///             // ... view content ...
///         }
///         .errorAlert()  // Automatically shows errors
///     }
///
///     func doSomething() async {
///         do {
///             try await api.fetchData()
///         } catch {
///             ErrorPresenter.shared.present(error, context: "Fetching data")
///         }
///     }
/// }
/// ```
