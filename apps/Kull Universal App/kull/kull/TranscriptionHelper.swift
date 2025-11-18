import Foundation

final class TranscriptionHelper {
    func transcribe(currentText: @escaping () -> String, update: @escaping (String) -> Void) {
        FileAccessService.shared.selectAudioFile { [weak self] url in
            guard let self = self, let url = url else { return }

            Task { @MainActor in
                if let transcription = try? await self.upload(url: url) {
                    let combined = (currentText() + "\n" + transcription).trimmingCharacters(in: .whitespacesAndNewlines)
                    update(combined)
                }
            }
        }
    }

    private func upload(url: URL) async throws -> String {
        let data = try Data(contentsOf: url)
        let baseURL = EnvironmentConfig.shared.apiBaseURL
        let apiURL = baseURL.appendingPathComponent("/api/transcribe")
        var req = URLRequest(url: apiURL)
        req.httpMethod = "POST"
        let boundary = UUID().uuidString
        req.addValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        var body = Data()
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"audio\"; filename=\"\(url.lastPathComponent)\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: application/octet-stream\r\n\r\n".data(using: .utf8)!)
        body.append(data)
        body.append("\r\n--\(boundary)--\r\n".data(using: .utf8)!)
        req.httpBody = body
        let (respData, _) = try await URLSession.shared.data(for: req)
        if let json = try JSONSerialization.jsonObject(with: respData) as? [String: Any], let text = json["text"] as? String {
            return text
        }
        return ""
    }
}
