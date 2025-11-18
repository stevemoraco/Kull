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
        // macOS: Use security-scoped bookmarks for persistent access
        let data = try url.bookmarkData(
            options: .withSecurityScope,
            includingResourceValuesForKeys: nil,
            relativeTo: nil
        )
        #elseif os(iOS)
        // iOS: Use minimal bookmarks (iOS sandbox restrictions)
        // Security-scoped resources work differently on iOS
        let data = try url.bookmarkData(
            options: .minimalBookmark,
            includingResourceValuesForKeys: nil,
            relativeTo: nil
        )
        #endif
        var current = store
        current[url.path] = data
        store = current
    }

    func resolveAll() -> [URL] {
        store.compactMap { (path, data) in
            var isStale = false
            #if os(macOS)
            // macOS: Resolve security-scoped bookmark and start accessing
            if let url = try? URL(
                resolvingBookmarkData: data,
                options: .withSecurityScope,
                relativeTo: nil,
                bookmarkDataIsStale: &isStale
            ) {
                // Start accessing the security-scoped resource
                _ = url.startAccessingSecurityScopedResource()
                return url
            }
            #elseif os(iOS)
            // iOS: Resolve minimal bookmark
            if let url = try? URL(
                resolvingBookmarkData: data,
                options: [],
                relativeTo: nil,
                bookmarkDataIsStale: &isStale
            ) {
                // iOS: Start accessing security-scoped resource
                // (Required even for minimal bookmarks when accessing user-selected folders)
                _ = url.startAccessingSecurityScopedResource()
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

