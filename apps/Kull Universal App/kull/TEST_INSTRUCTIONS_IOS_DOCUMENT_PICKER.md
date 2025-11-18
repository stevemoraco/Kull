# iOS Document Picker Implementation - Test Instructions

## Overview
This document provides comprehensive instructions for testing the iOS Document Picker implementation (Agent 8 work).

## What Was Implemented

### 1. FolderWatcher iOS Support
- **File:** `/home/runner/workspace/apps/Kull Universal App/kull/kull/FolderWatcher.swift`
- **Changes:**
  - Added `#if os(macOS)` / `#elseif os(iOS)` conditional compilation
  - macOS: Full filesystem monitoring using `DispatchSourceFileSystemObject`
  - iOS: No-op implementation (filesystem monitoring not available due to sandboxing)
  - Maintains API compatibility across both platforms

### 2. Logger Enhancement
- **File:** `/home/runner/workspace/apps/Kull Universal App/kull/kull/Logger.swift`
- **Changes:**
  - Added `Logger.general` category for general application logs
  - Used by `FolderWatcher` and `FileAccessService` for iOS logging

### 3. Comprehensive Tests
- **File:** `/home/runner/workspace/apps/Kull Universal App/kull/kullTests/FolderWatcherTests.swift`
- **Coverage:**
  - 20+ test cases covering both macOS and iOS
  - macOS-specific: Filesystem monitoring, callbacks, multiple folders
  - iOS-specific: No-op behavior verification
  - Cross-platform: API compatibility, memory management

## Test Execution Instructions

### Prerequisites
- macOS machine with Xcode installed
- iOS Simulator configured
- Kull Universal App project open in Xcode

### Running Tests

#### 1. Run ALL Tests (Both Platforms)

```bash
cd "apps/Kull Universal App/kull"

# macOS Tests
xcodebuild test -scheme kull -destination 'platform=macOS'

# iOS Tests
xcodebuild test -scheme kull -destination 'platform=iOS Simulator,name=iPhone 15 Pro'

# iPad Tests (optional)
xcodebuild test -scheme kull -destination 'platform=iOS Simulator,name=iPad Pro (12.9-inch) (6th generation)'
```

#### 2. Run Only FolderWatcher Tests

```bash
# macOS
xcodebuild test -scheme kull -destination 'platform=macOS' \
  -only-testing:kullTests/FolderWatcherTests

# iOS
xcodebuild test -scheme kull -destination 'platform=iOS Simulator,name=iPhone 15 Pro' \
  -only-testing:kullTests/FolderWatcherTests
```

#### 3. Run FileAccessService Tests (Verify iOS Document Picker)

```bash
# iOS
xcodebuild test -scheme kull -destination 'platform=iOS Simulator,name=iPhone 15 Pro' \
  -only-testing:kullTests/FileAccessServiceTests
```

### Expected Results

#### macOS Tests
All tests should PASS:
- `testMacOSWatchCallbackOnChange` - Verifies filesystem monitoring works
- `testMacOSWatchMultipleFolders` - Verifies multiple folder monitoring
- `testMacOSStopWatching` - Verifies cleanup works correctly
- `testMacOSBookmarkOptions` - Verifies security-scoped bookmarks

#### iOS Tests
All tests should PASS:
- `testIOSWatchIsNoOp` - Verifies no callbacks triggered (expected behavior)
- `testIOSWatchDoesNotCrash` - Verifies API doesn't crash
- `testIOSStopIsNoOp` - Verifies stop() is safe to call
- `testIOSBookmarkOptions` - Verifies minimal bookmark creation

### Manual UI Testing

#### iOS Simulator Testing

1. **Launch App on iOS Simulator**
   ```bash
   # Build and run
   xcodebuild -scheme kull -destination 'platform=iOS Simulator,name=iPhone 15 Pro' run
   ```
   Or: Open in Xcode → Select iPhone Simulator → Press Cmd+R

2. **Test Folder Selection Flow**
   - Launch app on iOS simulator
   - Navigate to "Folders" screen (bottom navigation)
   - Tap "Select Folder from Files..."
   - Verify `UIDocumentPickerViewController` appears
   - Select a folder from iCloud Drive or "On My iPhone"
   - Verify folder is selected (should show folder name)
   - Verify no crash

3. **Test Bookmark Persistence**
   - Select a folder (as above)
   - Force quit app (swipe up from bottom, swipe up on app card)
   - Relaunch app
   - Navigate to "Folders" screen
   - Verify folder still appears in list (bookmark restored)

4. **Test macOS Folder Sync (iOS Companion Feature)**
   - On macOS: Run Kull app, select a folder
   - On iOS: Open app, navigate to "Folders"
   - Verify "Mac Folders" section shows synced folders
   - Tap "Run with..." on synced folder
   - Verify no crash (remote processing trigger)

#### iPad Simulator Testing

Repeat above tests on iPad simulator:
```bash
xcodebuild -scheme kull -destination 'platform=iOS Simulator,name=iPad Pro (12.9-inch) (6th generation)' run
```

Verify:
- Split-view layouts work correctly
- Larger touch targets on iPad
- Landscape mode works
- Document picker displays properly on larger screen

### Verification Checklist

#### Code Changes
- [ ] `FolderWatcher.swift` has iOS conditional compilation
- [ ] `FolderWatcher.swift` iOS implementation doesn't crash
- [ ] `Logger.swift` has `Logger.general` category
- [ ] `FolderWatcherTests.swift` exists with 20+ test cases
- [ ] `FileAccessService.swift` already had iOS support (Agent 6)
- [ ] `BookmarkStore.swift` already had iOS support (Agent 6)

#### macOS Tests (via xcodebuild)
- [ ] All `FolderWatcherTests` pass on macOS
- [ ] All `FileAccessServiceTests` pass on macOS
- [ ] Filesystem monitoring works correctly
- [ ] Security-scoped bookmarks work
- [ ] No regressions in existing functionality

#### iOS Tests (via xcodebuild)
- [ ] All `FolderWatcherTests` pass on iOS
- [ ] All `FileAccessServiceTests` pass on iOS
- [ ] No-op behavior works correctly (no crashes)
- [ ] Minimal bookmarks work correctly
- [ ] UIDocumentPicker integration works

#### Manual UI Tests (iOS Simulator)
- [ ] Folder selection opens UIDocumentPicker
- [ ] Can select folder from Files app
- [ ] Selected folder persists across app restarts
- [ ] No crashes during selection or cancellation
- [ ] iPad UI displays correctly
- [ ] Split-view mode works (iPad)

#### Manual UI Tests (macOS)
- [ ] Existing folder selection still works
- [ ] NSOpenPanel still appears correctly
- [ ] Folder monitoring still triggers notifications
- [ ] No regressions in macOS functionality

## Known Limitations

### iOS Limitations (By Design)
1. **No Filesystem Monitoring**: iOS sandboxing prevents monitoring filesystem changes
   - Users must manually trigger processing
   - Folder watching is macOS-only feature

2. **Limited File Access**: iOS apps can only access user-selected folders
   - Must use `UIDocumentPickerViewController`
   - Cannot browse arbitrary filesystem locations

3. **Bookmark Differences**: iOS uses minimal bookmarks, not security-scoped
   - Different `URL.bookmarkData()` options
   - Different `URL(resolvingBookmarkData:)` options

### Platform Differences Summary

| Feature | macOS | iOS |
|---------|-------|-----|
| Folder Selection | NSOpenPanel | UIDocumentPickerViewController |
| Filesystem Monitoring | Yes (DispatchSource) | No (sandboxing) |
| Bookmark Type | Security-scoped | Minimal |
| Arbitrary File Access | Yes | No |
| Auto-suggest on Changes | Yes | No |

## Troubleshooting

### Test Failures

#### "Logger.general" Not Found
- **Cause:** Logger.swift missing general category
- **Fix:** Verify `/home/runner/workspace/apps/Kull Universal App/kull/kull/Logger.swift` has `Logger.general` definition

#### macOS Tests Fail on Filesystem Monitoring
- **Cause:** Permissions or sandboxing issues
- **Fix:** Ensure app has proper entitlements for file access
- Check `kull.entitlements` has `com.apple.security.files.user-selected.read-write`

#### iOS Tests Fail on Bookmark Creation
- **Cause:** Folder doesn't exist in simulator
- **Fix:** Tests create temporary folders automatically; should not fail
- If fails: Check `FileManager.default.temporaryDirectory` is accessible

### Manual Testing Issues

#### UIDocumentPicker Doesn't Appear on iOS
- **Cause:** No root view controller
- **Fix:** Verify app is fully launched and view hierarchy is established
- Check console for `FileAccessService: No root view controller found` error

#### Folder Selection Crashes on iOS
- **Cause:** Security-scoped resource not started
- **Fix:** Verify `FileAccessService.persistAccess()` is called after selection
- Check that `url.startAccessingSecurityScopedResource()` is called

#### Folder Doesn't Persist Across Restarts
- **Cause:** Bookmark not saved correctly
- **Fix:** Verify `BookmarkStore.shared.save(url:)` is called
- Check UserDefaults for saved bookmarks in iOS simulator

## Success Criteria

### All Tests Must Pass
- macOS: 100% pass rate for `FolderWatcherTests`
- macOS: 100% pass rate for `FileAccessServiceTests`
- iOS: 100% pass rate for `FolderWatcherTests`
- iOS: 100% pass rate for `FileAccessServiceTests`

### Manual Testing Must Succeed
- iOS folder selection works end-to-end
- Bookmarks persist across app restarts
- No crashes on iOS or macOS
- iPad UI displays correctly

### Code Quality
- All Swift files compile without errors
- No compiler warnings
- Proper conditional compilation (`#if os(macOS)` / `#elseif os(iOS)`)
- Comprehensive test coverage (20+ test cases)

## Next Steps (For Future Agents)

1. **Agent 9**: Run Controller iOS Support
   - Will use `FileAccessService` for folder selection
   - Should coordinate with this implementation

2. **Agent 10-12**: Other iOS Features
   - Can rely on folder selection working correctly
   - Should use `FileAccessService.shared` for all folder/file access

3. **Integration Testing**: End-to-end testing
   - Folder selection → Processing → Export XMP
   - Test on real iOS devices (not just simulator)
   - Test with large folders (1000+ images)

## Contact

If tests fail or issues arise:
- Review this document first
- Check Xcode console for detailed error messages
- Verify all prerequisites are met
- Document the issue in project notes for admin review

---

**Last Updated:** 2025-11-18
**Agent:** Agent 8 (iOS Document Picker Implementation)
**Status:** Implementation Complete, Awaiting Test Execution on macOS Environment
