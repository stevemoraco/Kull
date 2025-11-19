# Keyboard Shortcuts Testing Guide for iPad

## Overview

This document provides instructions for testing the keyboard shortcuts integration in the Kull iPad app. The implementation adds Magic Keyboard support for iPad, allowing users to trigger common actions using keyboard shortcuts.

## Implemented Shortcuts

The following keyboard shortcuts have been integrated into the iPad app:

1. **Cmd+N** - Open New Shoot sheet
2. **Cmd+,** - Navigate to Settings
3. **Cmd+R** - Refresh credits

## Architecture

### Files Modified

1. **KeyboardShortcuts.swift** (`/kull/apps/Kull Universal App/kull/kull/KeyboardShortcuts.swift`)
   - Created `KeyboardHostingController<Content>` for UIKeyCommand support
   - Implemented `KeyboardShortcutsModifier` view modifier
   - Created `KeyboardCommandManager` singleton for command routing
   - Added `KeyboardResponder` class for Objective-C selector support

2. **kullApp.swift** (`/kull/apps/Kull Universal App/kull/kull/kullApp.swift`)
   - Added `showingNewShoot` state variable to HomeView
   - Applied `.keyboardShortcuts()` modifier to HomeView
   - Added sheet presentation for New Shoot (Cmd+N)
   - Added onChange handler for Settings navigation (Cmd+,)

3. **iPadUITests.swift** (`/kull/apps/Kull Universal App/kull/kullTests/iPadUITests.swift`)
   - Enhanced keyboard shortcut tests
   - Added infrastructure verification tests
   - Added discoverability tests
   - Added multitasking tests

### Implementation Details

The keyboard shortcuts are registered using UIKeyCommand and integrated into the SwiftUI responder chain through:

1. A custom `KeyboardHostingController` that exposes `keyCommands` property
2. A `KeyboardCommandManager` singleton that routes commands to handlers
3. A `KeyboardResponder` class that bridges Swift closures to Objective-C selectors
4. A SwiftUI view modifier that registers handlers on appear

## Manual Testing Instructions

### Prerequisites

- iPad simulator or physical iPad device
- Magic Keyboard, Smart Keyboard, or Mac keyboard connected to iPad
- Xcode 16.0 or later
- iOS 18.5 or later

### Test Setup

#### Option 1: iPad Simulator with Mac Keyboard

1. Open Xcode
2. Select iPad simulator as target (e.g., "iPad Pro 13-inch (M4)")
3. Run the app (Cmd+R in Xcode)
4. In Simulator menu: **I/O → Keyboard → Connect Hardware Keyboard** (ensure it's checked)
5. Now your Mac keyboard will work as input for the simulator

#### Option 2: Physical iPad with Magic Keyboard

1. Connect your iPad with Magic Keyboard
2. Build and run the app on your iPad device
3. The keyboard shortcuts will automatically be available

### Test Cases

#### Test 1: Cmd+N (New Shoot)

**Steps:**
1. Launch the app
2. Wait for the Home view to load
3. Press **Cmd+N**

**Expected Result:**
- A sheet should appear with "New Shoot" title in the navigation bar
- The sheet should contain the FoldersView with options to select a folder
- A "Cancel" button should appear in the top-left
- Pressing Cancel should dismiss the sheet

**Pass/Fail:** ______

**Notes:**
_______________________________________________

---

#### Test 2: Cmd+, (Settings)

**Steps:**
1. Launch the app
2. Wait for the Home view to load
3. Press **Cmd+,**

**Expected Result:**
- The app should navigate to the Settings view in the main content area
- The Settings view should display sections: Account, Server Environment, Notifications, etc.
- The sidebar should highlight "Settings" as the selected item

**Pass/Fail:** ______

**Notes:**
_______________________________________________

---

#### Test 3: Cmd+R (Refresh)

**Steps:**
1. Launch the app
2. Wait for the Home view to load
3. Note the current credits balance
4. Press **Cmd+R**

**Expected Result:**
- The credits information should refresh (you may see a brief loading state)
- The credits balance should update if there are changes on the server
- No visual errors should occur

**Pass/Fail:** ______

**Notes:**
_______________________________________________

---

#### Test 4: Keyboard Shortcut Discoverability

**Steps:**
1. Launch the app on iPad with Magic Keyboard connected
2. Wait for the Home view to load
3. Press and hold **Cmd** key (don't release)

**Expected Result:**
- iOS should display a keyboard shortcuts overlay
- The overlay should show:
  - **N** - "Start a new photo culling session"
  - **,** - "Open settings"
  - **R** - "Refresh current view"
- Releasing Cmd should hide the overlay

**Pass/Fail:** ______

**Notes:**
_______________________________________________

---

#### Test 5: Shortcuts Work from Different Views

**Steps:**
1. Launch the app
2. Navigate to Folders view (tap "Folders" in sidebar)
3. Press **Cmd+N**
4. Verify New Shoot sheet appears
5. Dismiss sheet
6. Navigate to Marketplace view
7. Press **Cmd+,**
8. Verify Settings view appears
9. Navigate back to Home
10. Press **Cmd+R**
11. Verify refresh occurs

**Expected Result:**
- All keyboard shortcuts should work from any view in the app
- Navigation should be smooth without crashes

**Pass/Fail:** ______

**Notes:**
_______________________________________________

---

#### Test 6: Shortcuts After Multitasking

**Steps:**
1. Launch the app
2. Press Home button or gesture to background the app
3. Wait 2-3 seconds
4. Reopen the app
5. Try all keyboard shortcuts (Cmd+N, Cmd+,, Cmd+R)

**Expected Result:**
- All keyboard shortcuts should still work after backgrounding
- No crashes or unexpected behavior
- Handlers should be properly re-registered

**Pass/Fail:** ______

**Notes:**
_______________________________________________

---

#### Test 7: Landscape Orientation

**Steps:**
1. Launch the app
2. Rotate iPad to landscape orientation
3. Try all keyboard shortcuts (Cmd+N, Cmd+,, Cmd+R)

**Expected Result:**
- All keyboard shortcuts should work in landscape
- Sheet presentations should adapt to landscape
- No layout issues

**Pass/Fail:** ______

**Notes:**
_______________________________________________

---

#### Test 8: Split View Multitasking

**Steps:**
1. Launch the app on iPad
2. Enter Split View mode with another app (e.g., Safari)
3. Make Kull app active
4. Try all keyboard shortcuts

**Expected Result:**
- Keyboard shortcuts should work when Kull is in Split View
- Shortcuts should only affect Kull when it's the active pane

**Pass/Fail:** ______

**Notes:**
_______________________________________________

---

## Automated Testing

The following UI tests have been added to `iPadUITests.swift`:

- `testKeyboardShortcutNewShoot()` - Verifies Cmd+N infrastructure
- `testKeyboardShortcutSettings()` - Verifies Cmd+, navigation
- `testKeyboardShortcutRefresh()` - Verifies Cmd+R functionality
- `testKeyboardShortcutInfrastructure()` - Verifies keyboard shortcuts work across views
- `testKeyboardShortcutsDiscoverability()` - Verifies discoverability overlay support
- `testKeyboardShortcutsWithMultitasking()` - Verifies shortcuts persist after backgrounding

### Running Automated Tests

```bash
cd "/Users/stevemoraco/Lander Dropbox/Steve Moraco/Mac (6)/Downloads/ai image culling/kull/apps/Kull Universal App/kull"

# Run all iPad UI tests
xcodebuild test \
  -project kull.xcodeproj \
  -scheme kull \
  -destination 'platform=iOS Simulator,name=iPad Pro 13-inch (M4)' \
  -only-testing:kullTests/iPadUITests

# Run specific keyboard shortcut test
xcodebuild test \
  -project kull.xcodeproj \
  -scheme kull \
  -destination 'platform=iOS Simulator,name=iPad Pro 13-inch (M4)' \
  -only-testing:kullTests/iPadUITests/testKeyboardShortcutInfrastructure
```

**Note:** XCUITest does not support direct simulation of keyboard commands. The automated tests verify that:
1. The app launches without crashes when keyboard shortcuts are registered
2. The UI elements that shortcuts trigger are accessible
3. The app state is preserved correctly

Manual testing with a real keyboard is still required to verify actual keystroke handling.

## Troubleshooting

### Issue: Keyboard shortcuts don't work

**Possible Causes:**
1. Hardware keyboard not connected or enabled
2. Simulator keyboard not connected (check I/O → Keyboard → Connect Hardware Keyboard)
3. App not in foreground/active state

**Solution:**
- Verify keyboard connection
- Make sure app is active and in focus
- Check Console logs for "Keyboard shortcut" messages

### Issue: Cmd key overlay doesn't appear

**Possible Causes:**
1. Running on iPhone instead of iPad
2. iOS version too old (requires iOS 13+)
3. Keyboard not properly connected

**Solution:**
- Ensure running on iPad device or iPad simulator
- Update to latest iOS version
- Reconnect keyboard

### Issue: Shortcuts work but trigger wrong actions

**Possible Causes:**
1. Command handlers registered incorrectly
2. Multiple handlers for same command

**Solution:**
- Check Console logs for "Executing keyboard command" messages
- Verify KeyboardCommandManager has correct handlers
- Restart app to clear handler registry

## Logging

The keyboard shortcuts implementation includes comprehensive logging:

- **Registration:** When handlers are registered
  - Log: `"Registered keyboard handler for command: <command>"`
- **Execution:** When shortcuts are triggered
  - Log: `"Keyboard shortcut: Cmd+N (New Shoot)"`
  - Log: `"Executing keyboard command: <command>"`
- **Errors:** When handlers are missing
  - Log: `"No handler registered for keyboard command: <command>"`

To view logs:
1. Run app from Xcode
2. Open Debug Console (Cmd+Shift+Y)
3. Filter by "Keyboard" to see only shortcut-related logs

## Known Limitations

1. **XCUITest:** Cannot directly simulate keyboard commands in automated tests
2. **iPhone:** Keyboard shortcuts are iPad-only (iOS limitation)
3. **Custom Keyboards:** Third-party keyboards may not support all shortcuts
4. **Accessibility:** VoiceOver may intercept some keyboard commands

## Future Enhancements

Potential future improvements:

1. **Additional Shortcuts:**
   - Cmd+W to close sheets/modal views
   - Cmd+F to focus search fields
   - Cmd+1/2/3/4 to switch between sidebar tabs
   - Cmd+[ and Cmd+] for back/forward navigation

2. **User Customization:**
   - Allow users to customize keyboard shortcuts
   - Settings panel for keyboard shortcut preferences

3. **Accessibility:**
   - Full VoiceOver support for shortcuts
   - Alternative keyboard navigation for accessibility

## Documentation

For more information on UIKeyCommand and iPad keyboard support:

- [Apple Human Interface Guidelines - Keyboards](https://developer.apple.com/design/human-interface-guidelines/keyboards)
- [UIKeyCommand Documentation](https://developer.apple.com/documentation/uikit/uikeycommand)
- [Supporting Keyboard Shortcuts](https://developer.apple.com/documentation/uikit/uiresponder/supporting_keyboard_shortcuts)

## Support

For issues or questions about keyboard shortcuts:

- Check Console logs for error messages
- Verify iOS and Xcode versions meet minimum requirements
- Test on different iPad models and keyboard types
- Contact: steve@lander.media

---

**Last Updated:** 2025-11-19
**Version:** 1.0
**iOS Version:** 18.5+
**iPad Models:** All iPad models with iOS 18.5 or later
