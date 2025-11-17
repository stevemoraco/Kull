import SwiftUI

struct RemoteImage: Identifiable { let id: String; let url: String }

struct RunWithView: View {
    var folderName: String
    var images: [RemoteImage]
    @State private var model: String = "gpt-5"
    @State private var prompt: String = "Rate images 1-5 and provide title/description/tags."
    @State private var running = false
    @State private var resultSummary: String = ""
    @State private var reportPayload: ReportPayload? = nil

    var body: some View {
        Form {
            Section(header: Text("Model")) {
                Picker("Model", selection: $model) {
                    Text("OpenAI GPT‑5").tag("gpt-5")
                }
            }
            Section(header: Text("Prompt")) {
                TextEditor(text: $prompt).frame(height: 140)
            }
            Section {
                Button(running ? "Running…" : "Run") { Task { await run() } }.disabled(running)
                if let rp = reportPayload {
                    NavigationLink("View Report") { ReportView(payload: rp) }
                } else if !resultSummary.isEmpty {
                    Text(resultSummary)
                }
            }
        }
        .navigationTitle(folderName)
    }

    private func run() async {
        running = true
        defer { running = false }
        do {
            let url = URL(string: "http://localhost:5000/api/kull/run/openai")!
            var req = URLRequest(url: url)
            req.httpMethod = "POST"
            req.addValue("application/json", forHTTPHeaderField: "Content-Type")
            let payload: [String: Any] = [
                "model": model,
                "prompt": prompt,
                "images": images.map { ["id": $0.id, "url": $0.url] },
                "report": true,
            ]
            req.httpBody = try JSONSerialization.data(withJSONObject: payload)
            let (data, _) = try await URLSession.shared.data(for: req)
            if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any], let report = json["report"] as? [String: Any] {
                let decoder = JSONDecoder()
                let rpData = try JSONSerialization.data(withJSONObject: report)
                let rp = try decoder.decode(ReportPayload.self, from: rpData)
                reportPayload = rp
            } else { resultSummary = "Run complete." }
        } catch {
            resultSummary = "Run failed."
        }
    }
}
