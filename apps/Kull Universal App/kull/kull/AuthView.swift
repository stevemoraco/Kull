import SwiftUI
#if canImport(UIKit)
import UIKit
#endif

struct AuthView: View {
    @EnvironmentObject var auth: AuthViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            switch auth.state {
            case .loading:
                ProgressView("Connecting…")
                    .frame(maxWidth: .infinity, alignment: .center)
            case .signedOut(let message):
                signedOutView(message: message)
            case .linking(let linking):
                linkingView(state: linking)
            case .signedIn:
                signedInView()
            }
        }
        .padding(24)
        .frame(minWidth: 360, minHeight: 340)
    }

    private func signedOutView(message: String?) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Sign in to Kull")
                .font(.title2)
            #if os(macOS)
            Text("We'll open your browser so you can approve this Mac. The menubar app polls in the background and signs in automatically once you finish the flow.")
                .font(.callout)
                .foregroundStyle(.secondary)
            #else
            Text("We'll open your browser so you can approve this device. The app polls in the background and signs in automatically once you finish the flow.")
                .font(.callout)
                .foregroundStyle(.secondary)
            #endif
            if let message {
                Text(message)
                    .font(.callout)
                    .foregroundStyle(.red)
            }
            HStack {
                Spacer()
                Button("Sign In…") {
                    #if os(macOS)
                    let deviceName = Host.current().localizedName ?? "Mac"
                    #else
                    let deviceName = UIDevice.current.name
                    #endif
                    auth.startLink(deviceName: deviceName)
                }
                .buttonStyle(.borderedProminent)
            }
        }
    }

    private func linkingView(state: AuthViewModel.LinkingState) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Approve on the Web")
                .font(.title2)
            Text("Enter this code in the browser window that just opened, or visit kullai.com/device-auth.")
                .font(.callout)
                .foregroundStyle(.secondary)
            HStack(spacing: 12) {
                Text(state.code)
                    .font(.system(size: 36, weight: .semibold, design: .monospaced))
                    .padding(12)
                    #if os(macOS)
                    .background(RoundedRectangle(cornerRadius: 12).fill(Color(nsColor: .controlBackgroundColor)))
                    #else
                    .background(RoundedRectangle(cornerRadius: 12).fill(Color(.systemBackground)))
                    #endif
                VStack(alignment: .leading) {
                    Text("Expires in \(state.secondsRemaining) s")
                        .foregroundStyle(state.secondsRemaining < 10 ? .red : .secondary)
                    if let message = state.message {
                        Text(message)
                            .font(.callout)
                            .foregroundStyle(.red)
                    }
                }
            }
            HStack(spacing: 12) {
                Button("Open Approval Page") {
                    auth.openApprovalPage()
                }
                Button("Cancel") {
                    auth.cancelLinking()
                }
            }
        }
    }

    private func signedInView() -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("You're signed in")
                .font(.title2)
            #if os(macOS)
            Text("Open the control panel from the menubar icon to start culling.")
                .font(.callout)
                .foregroundStyle(.secondary)
            #else
            Text("You can now start using Kull to cull your photos.")
                .font(.callout)
                .foregroundStyle(.secondary)
            #endif
            Button("Log Out") {
                auth.logout()
            }
        }
    }
}
