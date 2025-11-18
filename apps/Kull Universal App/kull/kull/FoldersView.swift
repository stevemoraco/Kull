#if canImport(UIKit)
import SwiftUI

struct FolderItem: Identifiable, Decodable { let id: String; let name: String }
struct FolderCatalog: Decodable { let folders: [FolderItem]; let updatedAt: String }
struct FolderResponse: Decodable { let folderCatalog: FolderCatalog }

struct FoldersView: View {
    @State private var folders: [FolderItem] = []
    @State private var loading = false
    @State private var selected: FolderItem? = nil
    @State private var showingRun = false
    @State private var selectedLocalFolder: URL? = nil

    var body: some View {
        List {
            Section(header: Text("Local Folder")) {
                Button("Select Folder from Files...") {
                    selectLocalFolder()
                }
            }

            Section(header: Text("Mac Folders")) {
                if loading { ProgressView() }
                ForEach(folders) { f in
                    HStack {
                        Text(f.name)
                        Spacer()
                        Button("Run with…") { selected = f; showingRun = true }
                    }
                }
            }
        }
        .navigationTitle("Folders")
        .onAppear { Task { await load() } }
        .sheet(isPresented: $showingRun) {
            if let folder = selected {
                Text("Running \(folder.name)")
                    .padding()
            } else if let localURL = selectedLocalFolder {
                Text("Running \(localURL.lastPathComponent)")
                    .padding()
            }
        }
    }

    private func selectLocalFolder() {
        FileAccessService.shared.selectFolder { [self] url in
            guard let url = url else { return }

            do {
                try FileAccessService.shared.persistAccess(to: url)
                self.selectedLocalFolder = url
                self.showingRun = true
            } catch {
                Logger.errors.error("Failed to persist folder access: \(error)")
            }
        }
    }

    private func load() async {
        let baseURL = EnvironmentConfig.shared.apiBaseURL
        let url = baseURL.appendingPathComponent("/api/kull/folders")
        loading = true
        defer { loading = false }
        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            let resp = try JSONDecoder().decode(FolderResponse.self, from: data)
            folders = resp.folderCatalog.folders
        } catch {
            folders = []
        }
    }
}
#endif
