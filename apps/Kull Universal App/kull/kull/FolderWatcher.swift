import Foundation
import Dispatch
import OSLog

#if os(macOS)
import Darwin

final class FolderWatcher {
    private var sources: [DispatchSourceFileSystemObject] = []

    func watch(urls: [URL], onChange: @escaping (URL) -> Void) {
        for url in urls {
            let fd = open(url.path, O_EVTONLY)
            guard fd != -1 else { continue }
            let src = DispatchSource.makeFileSystemObjectSource(fileDescriptor: fd, eventMask: [.write, .delete, .extend], queue: .main)
            src.setEventHandler { onChange(url) }
            src.setCancelHandler { close(fd) }
            src.resume()
            sources.append(src)
        }
    }

    func stop() {
        sources.forEach { $0.cancel() }
        sources.removeAll()
    }
}

#elseif os(iOS)

// iOS: Filesystem monitoring not available due to sandboxing
// This is a no-op implementation that maintains API compatibility
final class FolderWatcher {
    func watch(urls: [URL], onChange: @escaping (URL) -> Void) {
        Logger.general.info("FolderWatcher: Folder watching not available on iOS (sandboxing restrictions)")
        // iOS apps cannot monitor filesystem changes outside their sandbox
        // Users must manually trigger processing instead
    }

    func stop() {
        // No-op on iOS
    }
}

#endif

