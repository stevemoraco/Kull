//
//  FileAccessService.swift
//  kull - Universal App for macOS, iOS, and iPadOS
//
//  Platform-agnostic file and folder access service
//  Abstracts NSOpenPanel (macOS) and UIDocumentPickerViewController (iOS/iPadOS)
//  Handles security-scoped bookmarks across all platforms
//

import Foundation

#if os(macOS)
import AppKit
#elseif os(iOS)
import UIKit
#endif

// MARK: - Protocol

/// Platform-agnostic file/folder selection service
protocol FileAccessServiceProtocol {
    /// Select a folder for processing
    /// - Parameter completion: Called with selected folder URL or nil if cancelled
    func selectFolder(completion: @escaping (URL?) -> Void)

    /// Persist access to a folder/file (security-scoped bookmarks)
    /// - Parameter url: The URL to persist access to
    /// - Throws: Bookmark creation errors
    func persistAccess(to url: URL) throws

    /// Resume access to previously bookmarked URL
    /// - Parameter url: The bookmarked URL
    /// - Returns: True if access resumed successfully
    func resumeAccess(to url: URL) -> Bool

    /// Stop accessing security-scoped resource
    /// - Parameter url: The URL to stop accessing
    func stopAccess(to url: URL)
}

// MARK: - macOS Implementation

#if os(macOS)

final class FileAccessService: FileAccessServiceProtocol {
    static let shared = FileAccessService()

    private init() {}

    func selectFolder(completion: @escaping (URL?) -> Void) {
        let panel = NSOpenPanel()
        panel.canChooseFiles = false
        panel.canChooseDirectories = true
        panel.allowsMultipleSelection = false
        panel.message = "Select a folder containing photos to process"
        panel.prompt = "Select Folder"
        panel.canCreateDirectories = false
        panel.allowedContentTypes = []

        panel.begin { response in
            if response == .OK {
                completion(panel.urls.first)
            } else {
                completion(nil)
            }
        }
    }

    func persistAccess(to url: URL) throws {
        // Use existing BookmarkStore for macOS
        try BookmarkStore.shared.save(url: url)
    }

    func resumeAccess(to url: URL) -> Bool {
        // macOS: Start accessing security-scoped resource
        return url.startAccessingSecurityScopedResource()
    }

    func stopAccess(to url: URL) {
        url.stopAccessingSecurityScopedResource()
    }
}

#elseif os(iOS)

// MARK: - iOS Implementation

final class FileAccessService: NSObject, FileAccessServiceProtocol, UIDocumentPickerDelegate {
    static let shared = FileAccessService()

    private var completion: ((URL?) -> Void)?
    private var activeResources: Set<URL> = []
    private let queue = DispatchQueue(label: "com.kull.fileaccess", attributes: .concurrent)

    private override init() {
        super.init()
    }

    func selectFolder(completion: @escaping (URL?) -> Void) {
        // Must run on main thread
        DispatchQueue.main.async { [weak self] in
            guard let self = self else {
                completion(nil)
                return
            }

            guard let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
                  let rootVC = windowScene.windows.first?.rootViewController else {
                Logger.errors.error("FileAccessService: No root view controller found")
                completion(nil)
                return
            }

            self.completion = completion

            let picker = UIDocumentPickerViewController(forOpeningContentTypes: [.folder])
            picker.delegate = self
            picker.allowsMultipleSelection = false
            picker.shouldShowFileExtensions = true
            picker.directoryURL = nil

            // Present from top-most view controller
            var topVC = rootVC
            while let presented = topVC.presentedViewController {
                topVC = presented
            }

            topVC.present(picker, animated: true)
        }
    }

    func persistAccess(to url: URL) throws {
        // iOS: Store bookmark in UserDefaults
        let bookmarkData = try url.bookmarkData(
            options: [.minimalBookmark],
            includingResourceValuesForKeys: nil,
            relativeTo: nil
        )

        let key = "folder_bookmark_\(url.lastPathComponent)"
        UserDefaults.standard.set(bookmarkData, forKey: key)

        // Also save via BookmarkStore for consistency
        try BookmarkStore.shared.save(url: url)

        // Start accessing immediately
        _ = resumeAccess(to: url)
    }

    func resumeAccess(to url: URL) -> Bool {
        let didStart = url.startAccessingSecurityScopedResource()
        if didStart {
            queue.async(flags: .barrier) { [weak self] in
                self?.activeResources.insert(url)
            }
        }
        return didStart
    }

    func stopAccess(to url: URL) {
        url.stopAccessingSecurityScopedResource()
        queue.async(flags: .barrier) { [weak self] in
            self?.activeResources.remove(url)
        }
    }

    // MARK: - UIDocumentPickerDelegate

    func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
        let selectedURL = urls.first

        // Log selection
        if let url = selectedURL {
            Logger.general.info("FileAccessService: Folder selected: \(url.path)")
        }

        completion?(selectedURL)
        completion = nil
    }

    func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) {
        Logger.general.info("FileAccessService: Folder selection cancelled")
        completion?(nil)
        completion = nil
    }
}

#endif
