Development notes
-----------------
This directory contains Swift files for the macOS menubar app, including:
- KullMenubarApp.swift (status item + main window)
- RunSheetView.swift (model/preset picker and run controls)
- RunController.swift (batching and XMP writes)
- AppleIntelligenceService.swift (on-device model session stub)
- ExifReader.swift / GeoResolver.swift (metadata extraction)
- BookmarkStore.swift / FolderSyncService.swift / FolderWatcher.swift

Create an Xcode project targeting macOS 14+ (or 15 for FoundationModels) and add these files. Ensure entitlements for:
- App Sandbox (File Access: user-selected files)
- Incoming/Outgoing network (for API calls)
- UserNotifications (for completion notifications)

When building on macOS 15+, import FoundationModels for Apple Intelligence.
