#if canImport(UIKit)
import SwiftUI

struct PromptCard: Identifiable, Decodable {
    let id: String
    let slug: String
    let title: String
    let summary: String
    let aiScore: Double?
    let humanScoreAverage: Double?
    let ratingsCount: Int?
}

struct PromptListResponse: Decodable { let presets: [PromptCard] }

struct MarketplaceView: View {
    @State private var search: String = ""
    @State private var prompts: [PromptCard] = []
    @State private var loading = false

    var body: some View {
        VStack {
            HStack {
                TextField("Search prompts…", text: $search)
                    .textFieldStyle(.roundedBorder)
                Button("Search") { Task { await load() } }
            }.padding([.horizontal, .top])

            List(prompts) { p in
                VStack(alignment: .leading, spacing: 4) {
                    Text(p.title).font(.headline)
                    Text(p.summary).font(.subheadline).foregroundStyle(.secondary)
                    HStack {
                        if let ai = p.aiScore { Text(String(format: "AI: %.1f", ai)) }
                        if let hs = p.humanScoreAverage { Text(String(format: "Users: %.1f", hs)) }
                        if let rc = p.ratingsCount { Text("(") + Text("\(rc)") + Text(")") }
                    }.font(.caption).foregroundStyle(.secondary)
                }
            }
            .overlay(loading ? ProgressView() : nil)
        }
        .navigationTitle("Marketplace")
        .onAppear { Task { await load() } }
    }

    private func load() async {
        guard var comp = URLComponents(string: "http://localhost:5000/api/kull/prompts") else { return }
        if !search.isEmpty { comp.queryItems = [URLQueryItem(name: "search", value: search)] }
        guard let url = comp.url else { return }
        loading = true
        defer { loading = false }
        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            let resp = try JSONDecoder().decode(PromptListResponse.self, from: data)
            prompts = resp.presets
        } catch {
            prompts = []
        }
    }
}
#endif
