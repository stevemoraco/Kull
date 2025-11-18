import Foundation
import Combine

struct ProviderCapabilityDTO: Decodable, Identifiable {
    let id: String
    let displayName: String
    let vision: Bool
    let structuredOutput: Bool
    let offline: Bool
    let maxBatchImages: Int
    let estimatedCostPer1kImages: Double
}

final class ModelsViewModel: ObservableObject {
    @Published var models: [ProviderCapabilityDTO] = []
    @Published var loading = false

    func load() async {
        loading = true
        defer { loading = false }
        do {
            let baseURL = EnvironmentConfig.shared.apiBaseURL
            let url = baseURL.appendingPathComponent("/api/kull/models")
            let (data, _) = try await URLSession.shared.data(from: url)
            if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any], let arr = json["providers"] as? [[String: Any]] {
                let dec = JSONDecoder()
                let encoded = try JSONSerialization.data(withJSONObject: arr)
                let providers = try dec.decode([ProviderCapabilityDTO].self, from: encoded)
                DispatchQueue.main.async { self.models = providers }
            }
        } catch { }
    }
}

