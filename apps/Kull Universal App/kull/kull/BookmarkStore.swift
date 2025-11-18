import Foundation

final class BookmarkStore {
    static let shared = BookmarkStore()
    private let key = "kull.securityScopedBookmarks"

    private var store: [String: Data] {
        get { UserDefaults.standard.dictionary(forKey: key) as? [String: Data] ?? [:] }
        set { UserDefaults.standard.set(newValue, forKey: key) }
    }

    func save(url: URL) throws {
        #if os(macOS)
        let data = try url.bookmarkData(options: .withSecurityScope, includingResourceValuesForKeys: nil, relativeTo: nil)
        #else
        let data = try url.bookmarkData(options: [], includingResourceValuesForKeys: nil, relativeTo: nil)
        #endif
        var current = store
        current[url.path] = data
        store = current
    }

    func resolveAll() -> [URL] {
        store.compactMap { (path, data) in
            var isStale = false
            #if os(macOS)
            if let url = try? URL(resolvingBookmarkData: data, options: .withSecurityScope, relativeTo: nil, bookmarkDataIsStale: &isStale) {
                _ = url.startAccessingSecurityScopedResource()
                return url
            }
            #else
            if let url = try? URL(resolvingBookmarkData: data, options: [], relativeTo: nil, bookmarkDataIsStale: &isStale) {
                return url
            }
            #endif
            return nil
        }
    }

    func exportCatalog() -> [[String: String]] {
        resolveAll().map { ["id": UUID().uuidString, "name": $0.lastPathComponent] }
    }
}

