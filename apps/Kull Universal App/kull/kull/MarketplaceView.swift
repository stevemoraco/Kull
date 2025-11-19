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
    @SwiftUI.Environment(\.horizontalSizeClass) private var horizontalSizeClass: UserInterfaceSizeClass?

    var body: some View {
        VStack(spacing: 0) {
            // Search bar
            HStack {
                Image(systemName: "magnifyingglass")
                    .foregroundColor(.secondary)
                TextField("Search prompts…", text: $search)
                    .textFieldStyle(.plain)
                    .frame(minHeight: 44)  // iPad: Touch target
                    .onSubmit {
                        Task { await load() }
                    }
                if !search.isEmpty {
                    Button(action: { search = "" }) {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundColor(.secondary)
                    }
                    .frame(width: 44, height: 44)  // iPad: Touch target
                }
                Button("Search") {
                    Task { await load() }
                }
                .frame(minHeight: 44)
            }
            .padding(.horizontal)
            .padding(.vertical, 8)
            .background(Color(.systemBackground))

            Divider()

            // Content area
            if horizontalSizeClass == .regular {
                // iPad: Grid layout
                iPadGridLayout
            } else {
                // iPhone: List layout
                iPhoneListLayout
            }
        }
        .navigationTitle("Marketplace")
        .onAppear { Task { await load() } }
    }

    // MARK: - iPad Grid Layout

    private var iPadGridLayout: some View {
        ScrollView {
            LazyVGrid(
                columns: [
                    GridItem(.adaptive(minimum: 300, maximum: 400), spacing: 16)
                ],
                spacing: 16
            ) {
                ForEach(prompts) { prompt in
                    PromptGridCard(prompt: prompt)
                }
            }
            .padding()
        }
        .overlay(loading ? ProgressView().scaleEffect(1.5) : nil)
        .background(Color(.systemGroupedBackground))
    }

    // MARK: - iPhone List Layout

    private var iPhoneListLayout: some View {
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
            .frame(minHeight: 44)
        }
        .overlay(loading ? ProgressView() : nil)
    }

    private func load() async {
        let baseURL = EnvironmentConfig.shared.apiBaseURL
        var url = baseURL.appendingPathComponent("/api/kull/prompts")
        if !search.isEmpty {
            var comp = URLComponents(url: url, resolvingAgainstBaseURL: false)!
            comp.queryItems = [URLQueryItem(name: "search", value: search)]
            url = comp.url!
        }
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

// MARK: - Prompt Grid Card (iPad)

struct PromptGridCard: View {
    let prompt: PromptCard

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header
            VStack(alignment: .leading, spacing: 4) {
                Text(prompt.title)
                    .font(.headline)
                    .lineLimit(2)
                Text(prompt.summary)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .lineLimit(3)
            }

            Spacer()

            // Ratings
            HStack(spacing: 12) {
                if let ai = prompt.aiScore {
                    HStack(spacing: 4) {
                        Image(systemName: "sparkles")
                            .font(.caption)
                        Text(String(format: "%.1f", ai))
                            .font(.caption)
                            .fontWeight(.medium)
                    }
                    .foregroundStyle(.blue)
                }
                if let hs = prompt.humanScoreAverage {
                    HStack(spacing: 4) {
                        Image(systemName: "person.2.fill")
                            .font(.caption)
                        Text(String(format: "%.1f", hs))
                            .font(.caption)
                            .fontWeight(.medium)
                    }
                    .foregroundStyle(.green)
                }
                if let rc = prompt.ratingsCount {
                    Text("(\(rc))")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
                Spacer()
            }

            // Action button
            Button(action: {
                // TODO: Select prompt action
            }) {
                Text("Use Prompt")
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .frame(maxWidth: .infinity)
                    .frame(height: 44)
                    .background(Color.blue)
                    .foregroundColor(.white)
                    .cornerRadius(8)
            }
        }
        .padding()
        .frame(maxWidth: .infinity, minHeight: 200)
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.05), radius: 4, x: 0, y: 2)
    }
}

#endif
