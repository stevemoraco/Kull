import Foundation
import AppKit
import UniformTypeIdentifiers

final class TranscriptionHelper {
    func transcribe(currentText: @escaping () -> String, update: @escaping (String) -> Void) {
        let panel = NSOpenPanel()
        if #available(macOS 12.0, *) {
            panel.allowedContentTypes = [
                UTType.mpeg4Audio,
                UTType.mp3,
                UTType.wav,
                UTType(filenameExtension: "webm"),
            ].compactMap { $0 }
        } else {
            panel.allowedFileTypes = ["m4a", "mp3", "wav", "webm"]
        }
        panel.canChooseFiles = true
        panel.canChooseDirectories = false
        panel.begin { resp in
            if resp == .OK, let url = panel.urls.first {
                Task { @MainActor in
                    if let transcription = try? await self.upload(url: url) {
                        let combined = (currentText() + "\n" + transcription).trimmingCharacters(in: .whitespacesAndNewlines)
                        update(combined)
                    }
                }
            }
        }
    }

    private func upload(url: URL) async throws -> String {
        let data = try Data(contentsOf: url)
        var req = URLRequest(url: URL(string: "http://localhost:5000/api/transcribe")!)
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

