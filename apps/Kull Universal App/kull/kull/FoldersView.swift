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
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass

    var body: some View {
        if horizontalSizeClass == .regular {
            // iPad: Card-based layout
            iPadLayout
        } else {
            // iPhone: List layout
            iPhoneLayout
        }
    }

    // MARK: - iPad Layout

    private var iPadLayout: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Local folder section
                VStack(alignment: .leading, spacing: 12) {
                    Text("Local Folder")
                        .font(.title2)
                        .bold()
                        .padding(.horizontal)

                    Button(action: selectLocalFolder) {
                        HStack {
                            Image(systemName: "folder.badge.plus")
                                .font(.title3)
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Select Folder from Files")
                                    .font(.headline)
                                Text("Choose photos from your iPad")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                            Spacer()
                            Image(systemName: "chevron.right")
                                .foregroundColor(.secondary)
                        }
                        .padding()
                        .frame(maxWidth: .infinity, minHeight: 80)
                        .background(Color(.systemBackground))
                        .cornerRadius(12)
                        .shadow(color: Color.black.opacity(0.05), radius: 4, x: 0, y: 2)
                    }
                    .padding(.horizontal)
                }

                // Mac folders section
                VStack(alignment: .leading, spacing: 12) {
                    HStack {
                        Text("Mac Folders")
                            .font(.title2)
                            .bold()
                        Spacer()
                        if loading {
                            ProgressView()
                        }
                    }
                    .padding(.horizontal)

                    if folders.isEmpty && !loading {
                        VStack(spacing: 12) {
                            Image(systemName: "folder.fill.badge.questionmark")
                                .font(.system(size: 48))
                                .foregroundColor(.secondary)
                            Text("No synced folders from Mac")
                                .font(.headline)
                                .foregroundColor(.secondary)
                            Text("Folders synced from your Mac will appear here")
                                .font(.caption)
                                .foregroundColor(.secondary)
                                .multilineTextAlignment(.center)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 40)
                    } else {
                        LazyVGrid(
                            columns: [
                                GridItem(.adaptive(minimum: 300, maximum: 400), spacing: 16)
                            ],
                            spacing: 16
                        ) {
                            ForEach(folders) { folder in
                                FolderCard(folder: folder) {
                                    selected = folder
                                    showingRun = true
                                }
                            }
                        }
                        .padding(.horizontal)
                    }
                }
            }
            .padding(.vertical)
        }
        .background(Color(.systemGroupedBackground))
        .navigationTitle("Folders")
        .onAppear { Task { await load() } }
        .sheet(isPresented: $showingRun) {
            if let folder = selected {
                RunSheetView(selectedFolder: .constant(nil))
                    .presentationDetents([.large])
            } else if let localURL = selectedLocalFolder {
                RunSheetView(selectedFolder: $selectedLocalFolder)
                    .presentationDetents([.large])
            }
        }
    }

    // MARK: - iPhone Layout

    private var iPhoneLayout: some View {
        List {
            Section(header: Text("Local Folder")) {
                Button("Select Folder from Files...") {
                    selectLocalFolder()
                }
                .frame(minHeight: 44)
            }

            Section(header: Text("Mac Folders")) {
                if loading { ProgressView() }
                ForEach(folders) { f in
                    HStack {
                        Text(f.name)
                        Spacer()
                        Button("Run with…") { selected = f; showingRun = true }
                    }
                    .frame(minHeight: 44)
                }
            }
        }
        .navigationTitle("Folders")
        .onAppear { Task { await load() } }
        .sheet(isPresented: $showingRun) {
            if let folder = selected {
                RunSheetView(selectedFolder: .constant(nil))
            } else if let localURL = selectedLocalFolder {
                RunSheetView(selectedFolder: $selectedLocalFolder)
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

// MARK: - Folder Card (iPad)

struct FolderCard: View {
    let folder: FolderItem
    let onRun: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Image(systemName: "folder.fill")
                    .font(.title)
                    .foregroundColor(.blue)
                VStack(alignment: .leading, spacing: 4) {
                    Text(folder.name)
                        .font(.headline)
                        .lineLimit(2)
                    Text("Synced from Mac")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                Spacer()
            }

            Button(action: onRun) {
                Text("Run Culling")
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
        .frame(maxWidth: .infinity)
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.05), radius: 4, x: 0, y: 2)
    }
}

#endif
