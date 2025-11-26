import Foundation

final class FolderSyncService {
    func sync(deviceName: String) async {
        // Skip network calls during unit tests to avoid hitting DocumentManager on simulators
        if ProcessInfo.processInfo.environment["XCTestConfigurationFilePath"] != nil {
            return
        }

        let folders = BookmarkStore.shared.exportCatalog()
        let baseURL = EnvironmentConfig.shared.apiBaseURL
        let url = baseURL.appendingPathComponent("/api/kull/folders")
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.addValue("application/json", forHTTPHeaderField: "Content-Type")
        let body: [String: Any] = ["deviceName": deviceName, "folders": folders]
        req.httpBody = try? JSONSerialization.data(withJSONObject: body)
        _ = try? await URLSession.shared.data(for: req)
    }
}
