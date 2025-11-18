import Foundation
import Combine
import AppKit

@MainActor
final class AuthViewModel: ObservableObject {
    struct DeviceUser: Equatable {
        let id: String
        let email: String?
        let firstName: String?
        let lastName: String?
        let profileImageUrl: String?

        var displayName: String {
            if let first = firstName, let last = lastName { return "\(first) \(last)" }
            if let first = firstName { return first }
            if let email = email { return email }
            return id
        }
    }

    struct LinkingState: Equatable {
        var code: String
        var pollToken: String
        var expiresAt: Date
        var secondsRemaining: Int
        var message: String?

        var isExpired: Bool { secondsRemaining <= 0 }
    }

    enum State: Equatable {
        case loading
        case signedOut(message: String? = nil)
        case linking(LinkingState)
        case signedIn(DeviceUser)
    }

    @Published private(set) var state: State = .loading
    @Published private(set) var creditSummary: CreditSummaryPayload?

    private let api: KullAPIClient
    private var pollTask: Task<Void, Never>?

    init(api: KullAPIClient = .shared) {
        self.api = api
        Task { await refreshSession() }
    }

    var isAuthenticated: Bool {
        if case .signedIn = state { return true }
        return false
    }

    var currentUser: DeviceUser? {
        if case .signedIn(let user) = state { return user }
        return nil
    }

    func refreshSession() async {
        state = .loading
        do {
            if let user = try await api.fetchCurrentUser() {
                state = .signedIn(DeviceUser(id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, profileImageUrl: user.profileImageUrl))
                await loadCreditSummary()
            } else {
                state = .signedOut()
            }
        } catch {
            state = .signedOut(message: "Unable to reach Kull servers.")
        }
    }

    func startLink(deviceName: String?) {
        pollTask?.cancel()
        Task {
            do {
                let response = try await api.initiateDeviceLink(deviceName: deviceName)
                let expiresAt = response.expiresAt
                let seconds = max(0, Int(expiresAt.timeIntervalSinceNow.rounded()))
                state = .linking(LinkingState(code: response.code, pollToken: response.pollToken, expiresAt: expiresAt, secondsRemaining: seconds))
                // Automatically open the approval page in the browser
                openApprovalPage()
                await pollLinking()
            } catch {
                state = .signedOut(message: "Could not start device link. Check your connection and try again.")
            }
        }
    }

    func cancelLinking() {
        pollTask?.cancel()
        state = .signedOut()
    }

    func openApprovalPage() {
        guard case .linking(let linkingState) = state else { return }
        let base = apiBaseForApproval()
        guard var components = URLComponents(url: base, resolvingAgainstBaseURL: false) else { return }
        components.path = components.path.appending("/device")
        components.queryItems = [URLQueryItem(name: "code", value: linkingState.code)]
        if let url = components.url {
            NSWorkspace.shared.open(url)
        }
    }

    func logout() {
        pollTask?.cancel()
        Task {
            let deviceId = DeviceIDManager.shared.deviceID

            // Clear Keychain
            KeychainManager.shared.clearAll(for: deviceId)

            // Notify backend (optional, best effort)
            await api.logout()

            // Clear user state
            state = .signedOut()
        }
    }

    private func apiBaseForApproval() -> URL {
        return EnvironmentConfig.shared.apiBaseURL
    }

    private func pollLinking() async {
        guard case .linking(let linkingState) = state else { return }
        let pollToken = linkingState.pollToken
        pollTask?.cancel()
        pollTask = Task { [weak self] in
            guard let self else { return }
            var currentState = linkingState
            while !Task.isCancelled {
                let remaining = max(0, Int(currentState.expiresAt.timeIntervalSinceNow.rounded()))
                await MainActor.run {
                    if case .linking = self.state {
                        currentState.secondsRemaining = remaining
                        self.state = .linking(currentState)
                    }
                }
                if remaining <= 0 {
                    await MainActor.run {
                        self.state = .signedOut(message: "Code expired. Generate a new link to continue.")
                    }
                    return
                }
                do {
                    let response = try await self.api.pollDeviceLink(pollToken: pollToken)
                    switch response.status.lowercased() {
                    case "pending":
                        // continue polling
                        break
                    case "approved":
                        // Save tokens to Keychain before updating state
                        if let tokens = response.tokens {
                            let deviceId = DeviceIDManager.shared.deviceID
                            do {
                                try KeychainManager.shared.saveAccessToken(tokens.accessToken, for: deviceId)
                                try KeychainManager.shared.saveRefreshToken(tokens.refreshToken, for: deviceId)
                            } catch {
                                await MainActor.run {
                                    self.state = .signedOut(message: "Failed to save credentials: \(error.localizedDescription)")
                                }
                                return
                            }
                        }

                        if let user = response.user {
                            let deviceUser = DeviceUser(id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, profileImageUrl: user.profileImageUrl)
                            await MainActor.run {
                                self.state = .signedIn(deviceUser)
                            }
                            await self.loadCreditSummary()
                            return
                        } else {
                            await MainActor.run {
                                self.state = .signedOut(message: "Link approved but no user returned.")
                            }
                            return
                        }
                    case "expired":
                        await MainActor.run {
                            self.state = .signedOut(message: "Code expired. Generate a new link to continue.")
                        }
                        return
                    default:
                        await MainActor.run {
                            self.state = .signedOut(message: "This code is no longer valid.")
                        }
                        return
                    }
                } catch {
                    await MainActor.run {
                        self.state = .signedOut(message: "Connection interrupted while linking device.")
                    }
                    return
                }

                try? await Task.sleep(nanoseconds: 1_000_000_000)
            }
        }
    }

    private func loadCreditSummary() async {
        do {
            creditSummary = try await api.fetchCreditSummary()
        } catch {
            creditSummary = nil
        }
    }
}
