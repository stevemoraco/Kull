import SwiftUI

struct FolderItem: Identifiable, Decodable { let id: String; let name: String }
struct FolderCatalog: Decodable { let folders: [FolderItem]; let updatedAt: String }
struct FolderResponse: Decodable { let folderCatalog: FolderCatalog }

struct FoldersView: View {
    @State private var folders: [FolderItem] = []
    @State private var loading = false

    var body: some View {
        List {
            Section(header: Text("Mac Folders")) {
                if loading { ProgressView() }
                ForEach(folders) { f in
                    HStack { Text(f.name); Spacer(); Button("Run with…") { /* open run modal */ } }
                }
            }
        }
        .navigationTitle("Folders")
        .onAppear { Task { await load() } }
    }

    private func load() async {
        guard let url = URL(string: "http://localhost:5000/api/kull/folders") else { return }
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

