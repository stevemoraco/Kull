import Foundation

final class FolderSyncService {
    func sync(deviceName: String) async {
        let folders = BookmarkStore.shared.exportCatalog()
        guard let url = URL(string: "http://localhost:5000/api/kull/folders") else { return }
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.addValue("application/json", forHTTPHeaderField: "Content-Type")
        let body: [String: Any] = ["deviceName": deviceName, "folders": folders]
        req.httpBody = try? JSONSerialization.data(withJSONObject: body)
        _ = try? await URLSession.shared.data(for: req)
    }
}

