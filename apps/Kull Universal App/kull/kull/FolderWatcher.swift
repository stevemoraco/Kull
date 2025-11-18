import Foundation
import Dispatch
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

