import SwiftUI

struct RunSheetView: View {
    @Binding var selectedFolder: URL?
    @State private var selectedModel: String = "apple-intelligence"
    @State private var preset: String = "standard"
    @State private var includeTitle = true
    @State private var includeDescription = true
    @State private var includeTags = true
    @State private var promptText = "Standard culling: 1★ reject, 2★ duplicates, 3★ usable, 4★ keeper, 5★ hero."
    @StateObject private var runner = RunController()

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Run Settings").font(.title2).bold()

            HStack(alignment: .top, spacing: 16) {
                VStack(alignment: .leading) {
                    Text("Model").font(.caption).foregroundStyle(.secondary)
                    Picker("Model", selection: $selectedModel) {
                        Text("Apple Intelligence (Offline)").tag("apple-intelligence")
                        Text("OpenAI GPT‑5").tag("openai-gpt-5")
                    }.pickerStyle(.radioGroup)
                }
                VStack(alignment: .leading) {
                    Text("Preset").font(.caption).foregroundStyle(.secondary)
                    Picker("Preset", selection: $preset) {
                        Text("Standard").tag("standard")
                        Text("Wedding Storytelling").tag("wedding-storytelling")
                        Text("Corporate Event").tag("corporate-event")
                    }.pickerStyle(.menu)
                    Toggle("Title", isOn: $includeTitle)
                    Toggle("Description", isOn: $includeDescription)
                    Toggle("Tags", isOn: $includeTags)
                }
            }

            Text("Custom Prompt (optional)").font(.caption).foregroundStyle(.secondary)
            TextEditor(text: $promptText)
                .font(.system(.body, design: .monospaced))
                .border(.quaternary)
                .frame(height: 120)

            HStack {
                Spacer()
                if runner.isRunning {
                    ProgressView(value: Double(runner.processed), total: Double(max(runner.total, 1)))
                        .frame(width: 220)
                }
                Button("Run") { Task { await startRun() } }
                    .disabled(selectedFolder == nil || runner.isRunning)
            }
        }
        .padding(20)
    }

    private func startRun() async {
        guard let folder = selectedFolder else { return }
        let flags: [String] = [includeTitle ? "title" : nil, includeDescription ? "description" : nil, includeTags ? "tags" : nil].compactMap { $0 }
        let fullPrompt = "\(promptText)\nInclude: \(flags.joined(separator: ", "))"
        await runner.run(folder: folder, prompt: fullPrompt)
    }
}

