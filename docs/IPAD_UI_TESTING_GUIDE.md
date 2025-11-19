# iPad UI Testing Guide
**Agent 22 - iPad UI Optimizations**
**Date:** 2025-11-18

## Overview
This document provides comprehensive testing instructions for verifying iPad-specific UI optimizations in the Kull Universal App.

---

## Testing Devices

### Required Simulators
1. **iPad Pro 12.9" (6th generation)** - iOS 17.0+
2. **iPad (10th generation)** - iOS 17.0+
3. **iPad mini (6th generation)** - iOS 17.0+

### How to Test
```bash
# From the project directory
cd "apps/Kull Universal App/kull"

# Open in Xcode
open kull.xcodeproj

# Select iPad simulator from device dropdown
# Run: Cmd+R
# Test: Cmd+U
```

---

## Test Checklist

### 1. NavigationSplitView (3-Column Layout)

#### iPad Pro 12.9"
- [ ] Launch app in landscape orientation
- [ ] Verify 3-column layout:
  - **Sidebar**: Home, Folders, Marketplace, Settings
  - **Main Content**: Selected view content
  - **Detail**: Active shoots progress or "Select an item"
- [ ] Tap each sidebar item and verify content changes
- [ ] Verify sidebar remains visible in landscape
- [ ] Rotate to portrait and verify layout adapts

#### iPad (Standard)
- [ ] Repeat all iPad Pro tests
- [ ] Verify columns resize appropriately for smaller screen
- [ ] Check text remains readable at smaller size

#### iPad mini
- [ ] Repeat all iPad Pro tests
- [ ] Verify UI doesn't feel cramped
- [ ] Check that sidebar collapses in portrait if needed

**Expected Behavior:**
- Sidebar shows navigation items with icons and labels
- Main content area shows selected view
- Detail pane shows shoot progress or empty state
- Smooth transitions between views
- No layout breaking or overlap

---

### 2. Touch Targets (44pt Minimum)

#### Test All Interactive Elements
- [ ] Sidebar navigation items (Home, Folders, Marketplace, Settings)
- [ ] Buttons in HomeView (Refresh Credits, Choose Folder, etc.)
- [ ] RunSheetView controls (processing mode picker, provider picker, toggles)
- [ ] MarketplaceView search bar and buttons
- [ ] FoldersView folder cards and action buttons
- [ ] SettingsView toggles and buttons

**Verification Method:**
1. Enable Accessibility Inspector (Xcode > Developer Tools > Accessibility Inspector)
2. Select each interactive element
3. Verify "Size" shows height ≥ 44pt
4. Test tapping with finger (not stylus) for comfortable interaction

**Expected Behavior:**
- All buttons and interactive elements are at least 44pt tall
- Easy to tap with finger, no precision required
- No accidental taps on nearby elements

---

### 3. Landscape Orientation

#### RunSheetView
- [ ] Launch app, select "Model & Preset" button
- [ ] Rotate to landscape
- [ ] Verify 3-column horizontal layout:
  - Processing Mode | AI Provider | Preset & Options
- [ ] All sections should be visible side-by-side
- [ ] Cost estimate card prominently displayed
- [ ] Prompt editor uses full width
- [ ] Run button remains accessible at bottom

#### MarketplaceView
- [ ] Navigate to Marketplace
- [ ] Rotate to landscape
- [ ] Verify grid adapts to show more columns (3-4 columns)
- [ ] Cards resize appropriately
- [ ] Search bar remains at top
- [ ] Scrolling works smoothly

#### FoldersView
- [ ] Navigate to Folders
- [ ] Rotate to landscape
- [ ] Verify grid shows multiple folder cards horizontally
- [ ] Local folder card remains prominent
- [ ] All buttons remain accessible

**Expected Behavior:**
- Content adapts to landscape without breaking
- More horizontal space is utilized efficiently
- No content is cut off or inaccessible
- Rotation feels smooth and natural

---

### 4. Grid Layouts (iPad)

#### MarketplaceView Grid
- [ ] Navigate to Marketplace
- [ ] Wait for prompts to load (or verify empty state)
- [ ] Verify grid layout with adaptive columns
- [ ] Each card should show:
  - Prompt title (2 lines max)
  - Summary (3 lines max)
  - AI score with sparkle icon
  - User score with person icon
  - "Use Prompt" button (44pt tall)
- [ ] Cards should have subtle shadow
- [ ] Grid should adapt to screen width (2-4 columns)
- [ ] Search functionality works
- [ ] Clear search button appears when typing

#### FoldersView Grid
- [ ] Navigate to Folders
- [ ] Verify "Local Folder" card at top
- [ ] Verify "Mac Folders" grid below
- [ ] Each folder card should show:
  - Folder icon (blue)
  - Folder name (2 lines max)
  - "Synced from Mac" subtitle
  - "Run Culling" button (44pt tall)
- [ ] Cards should have subtle shadow
- [ ] Grid adapts to screen width (2-3 columns)
- [ ] Empty state shows if no folders

**Expected Behavior:**
- Grid uses LazyVGrid with adaptive columns
- Cards are visually appealing with consistent spacing
- Scrolling performance is smooth
- Cards resize gracefully on rotation

---

### 5. Keyboard Shortcuts

#### Test Infrastructure (Cmd+N, Cmd+,, Cmd+W, Cmd+R)
**Note:** Keyboard shortcuts require physical keyboard or simulator with "Hardware > Keyboard > Connect Hardware Keyboard" enabled.

##### Cmd+N (New Shoot)
- [ ] Press Cmd+N
- [ ] Expected: Run sheet should appear (or folder picker)

##### Cmd+, (Settings)
- [ ] Press Cmd+,
- [ ] Expected: Settings view should appear

##### Cmd+W (Close)
- [ ] Open a modal (run sheet, settings, etc.)
- [ ] Press Cmd+W
- [ ] Expected: Modal should close

##### Cmd+R (Refresh)
- [ ] On Home view, press Cmd+R
- [ ] Expected: Credits should refresh

**Expected Behavior:**
- Keyboard shortcuts respond immediately
- No conflicts with system shortcuts
- Discoverability hints appear in menus (if applicable)

**Note:** KeyboardShortcuts.swift infrastructure is in place. Full implementation requires UIKeyCommand integration in view controllers.

---

### 6. Multitasking Support

#### Split View
1. **Setup:**
   - Launch Kull app on iPad simulator
   - Launch Safari (or another app)
   - Drag Safari to split view

2. **Tests:**
   - [ ] Kull app continues to function in 1/2 screen
   - [ ] Kull app continues to function in 1/3 screen
   - [ ] Kull app continues to function in 2/3 screen
   - [ ] NavigationSplitView adapts (may collapse sidebar)
   - [ ] Content remains readable
   - [ ] Active shoots continue to sync
   - [ ] WebSocket remains connected

#### Slide Over
1. **Setup:**
   - Launch Kull app full screen
   - Swipe from right edge to bring up another app

2. **Tests:**
   - [ ] Kull app remains functional underneath
   - [ ] Active processing continues
   - [ ] UI adapts to narrower width
   - [ ] No crashes or layout breaks

#### Stage Manager (iPadOS 16+)
1. **Setup:**
   - Enable Stage Manager on iPad
   - Launch Kull app

2. **Tests:**
   - [ ] App appears in Stage Manager window
   - [ ] Can resize window freely
   - [ ] UI adapts to all window sizes
   - [ ] Can create multiple Kull windows (if UIApplicationSupportsMultipleScenes is true)
   - [ ] Windows maintain state independently

**Expected Behavior:**
- App functions correctly at all sizes
- No content is cut off or inaccessible
- Active processes continue in background
- State is preserved across multitasking transitions
- Info.plist has `UIRequiresFullScreen = false`

---

### 7. Performance & Responsiveness

#### Navigation Performance
- [ ] Rapid switching between sidebar items feels instant
- [ ] No lag or frame drops during navigation
- [ ] Animations are smooth (60fps minimum)

#### Grid Scrolling Performance
- [ ] Marketplace grid scrolls smoothly with 100+ items
- [ ] FoldersView grid scrolls smoothly with 50+ folders
- [ ] No stuttering or frame drops
- [ ] Cards load quickly (LazyVGrid)

#### Rotation Performance
- [ ] Rotation from portrait to landscape feels smooth
- [ ] No layout flickering or intermediate states
- [ ] Content reflows cleanly

**Measurement:**
- Use Xcode Instruments (Time Profiler)
- Target: 60fps during all interactions
- Target: <100ms for navigation transitions

---

### 8. Accessibility

#### VoiceOver
1. **Enable VoiceOver:** Settings > Accessibility > VoiceOver
2. **Tests:**
   - [ ] All sidebar items are announced correctly
   - [ ] Navigation between views is clear
   - [ ] Buttons have descriptive labels
   - [ ] Cards in grids are navigable
   - [ ] Forms are properly labeled

#### Dynamic Type
1. **Setup:** Settings > Accessibility > Display & Text Size > Larger Text
2. **Set to:** "Accessibility XXL"
3. **Tests:**
   - [ ] All text remains readable
   - [ ] Touch targets remain ≥44pt
   - [ ] Layout doesn't break with large text
   - [ ] Scrolling works properly

#### Dark Mode
- [ ] Switch to Dark Mode (Settings > Display & Brightness)
- [ ] All views support dark mode correctly
- [ ] Contrast is sufficient for readability
- [ ] Custom colors adapt appropriately

**Expected Behavior:**
- Full VoiceOver support for all UI elements
- Dynamic Type support up to Accessibility XXL
- Seamless dark mode support
- No accessibility warnings in Xcode

---

### 9. State Preservation

#### Background/Foreground
1. **Test:**
   - Launch app, navigate to Marketplace
   - Press Home button (or swipe up)
   - Wait 30 seconds
   - Relaunch app

2. **Verify:**
   - [ ] App returns to Marketplace view
   - [ ] Search text is preserved (if applicable)
   - [ ] Credits balance is cached and displayed
   - [ ] WebSocket reconnects automatically

#### App Termination
1. **Test:**
   - Launch app, start a culling run
   - Force quit app (swipe up in app switcher)
   - Relaunch app

2. **Verify:**
   - [ ] App shows home screen (expected)
   - [ ] Cached data is displayed
   - [ ] WebSocket reconnects
   - [ ] Can resume normal operation

**Expected Behavior:**
- State is preserved during backgrounding
- Cached data is displayed while reloading
- Network connections recover gracefully
- User doesn't lose work

---

### 10. Error Handling

#### Offline Mode
1. **Setup:**
   - Disable Wi-Fi and cellular (airplane mode)
   - Launch app

2. **Tests:**
   - [ ] App launches successfully
   - [ ] Cached data is displayed
   - [ ] Offline banner appears
   - [ ] User can navigate views
   - [ ] Cannot start new culling runs
   - [ ] Pending operations show in queue

3. **Recovery:**
   - Re-enable Wi-Fi
   - [ ] Offline banner disappears
   - [ ] Pending operations sync automatically
   - [ ] Credits refresh

#### Network Failures
- [ ] Navigate to Marketplace with no internet
- [ ] Empty state or cached prompts displayed
- [ ] No crash or error dialogs
- [ ] Retry works when connection restored

**Expected Behavior:**
- Graceful degradation when offline
- Clear communication to user
- Automatic recovery when online
- No data loss

---

## Automated Tests

### Running UI Tests
```bash
cd "apps/Kull Universal App/kull"

# Run all iPad UI tests
xcodebuild test \
  -scheme kull \
  -destination 'platform=iOS Simulator,name=iPad Pro (12.9-inch) (6th generation),OS=latest' \
  -only-testing:kullTests/iPadUITests

# Run specific test
xcodebuild test \
  -scheme kull \
  -destination 'platform=iOS Simulator,name=iPad Pro (12.9-inch) (6th generation),OS=latest' \
  -only-testing:kullTests/iPadUITests/testNavigationSplitViewPresent
```

### Test Coverage
- **iPadUITests.swift:** 20+ comprehensive UI tests
- **Coverage areas:**
  - NavigationSplitView functionality
  - Touch target sizing
  - Landscape orientation
  - Grid layouts
  - Keyboard shortcuts (infrastructure)
  - Multitasking support
  - Performance
  - Accessibility
  - State preservation
  - Error handling

### Expected Results
- ✅ All tests should pass GREEN
- ✅ No crashes or exceptions
- ✅ Performance metrics within targets
- ✅ No accessibility warnings

---

## Known Limitations

1. **Keyboard Shortcuts:**
   - Infrastructure in place (KeyboardShortcuts.swift)
   - Full UIKeyCommand integration requires view controller updates
   - Currently tested manually with hardware keyboard

2. **Stage Manager:**
   - Requires iPadOS 16+ simulator
   - Multiple scenes require UIApplicationSupportsMultipleScenes = true
   - Currently set to true in Info.plist

3. **Split View Testing:**
   - Automated testing of Split View is limited
   - Manual testing recommended
   - Verify with actual iPad device for best results

---

## Success Criteria

### All tests must pass with:
✅ **Layout:** NavigationSplitView with 3 columns on iPad
✅ **Touch Targets:** All interactive elements ≥44pt
✅ **Orientation:** Smooth adaptation to landscape/portrait
✅ **Grid Layouts:** Adaptive columns in Marketplace and Folders
✅ **Keyboard Shortcuts:** Infrastructure ready for Cmd+N, Cmd+,, Cmd+W, Cmd+R
✅ **Multitasking:** No crashes in Split View, Slide Over, Stage Manager
✅ **Performance:** 60fps navigation and scrolling
✅ **Accessibility:** VoiceOver, Dynamic Type, Dark Mode support
✅ **State:** Preservation during backgrounding
✅ **Offline:** Graceful degradation and auto-recovery

---

## Next Steps

1. **Run Automated Tests:**
   ```bash
   xcodebuild test -scheme kull -destination 'platform=iOS Simulator,name=iPad Pro (12.9-inch) (6th generation)'
   ```

2. **Manual Testing:**
   - Follow this checklist on all 3 iPad sizes
   - Test with external keyboard
   - Test with VoiceOver enabled
   - Test in Split View and Slide Over

3. **Real Device Testing:**
   - Deploy to physical iPad Pro, iPad, and iPad mini
   - Verify touch targets with actual finger
   - Test multitasking with real apps
   - Verify performance under real-world conditions

4. **Report Issues:**
   - Document any failing tests
   - Create issues in project tracker
   - Fix and retest until all GREEN

---

## Conclusion

The iPad UI optimizations are comprehensive and ready for testing. All code changes have been implemented following Apple's Human Interface Guidelines for iPad. The app now provides a professional, iPad-native experience with:

- **NavigationSplitView** for efficient multi-column navigation
- **Optimized touch targets** for comfortable finger interaction
- **Adaptive layouts** that shine in landscape orientation
- **Beautiful grid layouts** for browsing content
- **Keyboard shortcut infrastructure** for power users
- **Full multitasking support** for Split View, Slide Over, and Stage Manager
- **Comprehensive accessibility** for all users

**Status:** ✅ **READY FOR TESTING**
