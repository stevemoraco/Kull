#if canImport(SwiftUI) && !os(macOS)
import SwiftUI

struct ReportStats: Decodable { let totalImages: Int; let heroCount: Int; let keeperCount: Int }
struct ReportPayload: Decodable { let shootName: String; let narrative: String; let stats: ReportStats }

struct ReportView: View {
    let payload: ReportPayload
    var body: some View {
        List {
            Section(header: Text(payload.shootName)) {
                Text("Total: \(payload.stats.totalImages)")
                Text("5★: \(payload.stats.heroCount) • 4★: \(payload.stats.keeperCount)")
                Text(payload.narrative).padding(.top, 8)
            }
        }.navigationTitle("Report")
    }
}


#endif
