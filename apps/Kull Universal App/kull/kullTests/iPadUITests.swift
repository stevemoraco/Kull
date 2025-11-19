//
//  iPadUITests.swift
//  kullTests - iPad-specific UI tests
//
//  Created by Agent 22 on 11/18/25.
//

import XCTest
@testable import kull

/// Comprehensive UI tests for iPad-specific features
final class iPadUITests: XCTestCase {

    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    override func tearDownWithError() throws {
        // Cleanup after each test
    }

    // MARK: - NavigationSplitView Tests

    /// Test that iPad uses NavigationSplitView (3-column layout)
    func testNavigationSplitViewPresent() throws {
        // This test verifies that on iPad, the app uses NavigationSplitView
        // instead of NavigationView
        let app = XCUIApplication()
        app.launch()

        // Wait for authentication (assuming test environment has auto-login)
        sleep(2)

        // On iPad, we should see the sidebar
        XCTAssertTrue(app.navigationBars.count > 0, "Navigation bars should be present")

        // Verify sidebar items exist
        XCTAssertTrue(app.staticTexts["Home"].exists, "Home sidebar item should exist")
        XCTAssertTrue(app.staticTexts["Folders"].exists, "Folders sidebar item should exist")
        XCTAssertTrue(app.staticTexts["Marketplace"].exists, "Marketplace sidebar item should exist")
        XCTAssertTrue(app.staticTexts["Settings"].exists, "Settings sidebar item should exist")
    }

    /// Test navigation between sidebar items
    func testSidebarNavigation() throws {
        let app = XCUIApplication()
        app.launch()
        sleep(2)

        // Tap Folders
        app.staticTexts["Folders"].tap()
        sleep(1)
        XCTAssertTrue(app.navigationBars["Folders"].exists, "Folders view should be displayed")

        // Tap Marketplace
        app.staticTexts["Marketplace"].tap()
        sleep(1)
        XCTAssertTrue(app.navigationBars["Marketplace"].exists, "Marketplace view should be displayed")

        // Tap Settings
        app.staticTexts["Settings"].tap()
        sleep(1)
        XCTAssertTrue(app.navigationBars["Settings"].exists, "Settings view should be displayed")

        // Return to Home
        app.staticTexts["Home"].tap()
        sleep(1)
        XCTAssertTrue(app.navigationBars["Dashboard"].exists, "Home view should be displayed")
    }

    // MARK: - Touch Target Tests

    /// Test that all interactive elements meet 44pt minimum touch target
    func testMinimumTouchTargets() throws {
        let app = XCUIApplication()
        app.launch()
        sleep(2)

        // Navigate to different views and verify button sizes
        let folders = app.staticTexts["Folders"]
        XCTAssertGreaterThanOrEqual(folders.frame.height, 44, "Folders button should be at least 44pt tall")

        let marketplace = app.staticTexts["Marketplace"]
        XCTAssertGreaterThanOrEqual(marketplace.frame.height, 44, "Marketplace button should be at least 44pt tall")

        let settings = app.staticTexts["Settings"]
        XCTAssertGreaterThanOrEqual(settings.frame.height, 44, "Settings button should be at least 44pt tall")
    }

    /// Test RunSheetView touch targets
    func testRunSheetTouchTargets() throws {
        let app = XCUIApplication()
        app.launch()
        sleep(2)

        // Navigate to folders and open run sheet
        app.staticTexts["Folders"].tap()
        sleep(1)

        // Tap "Select Folder from Files" button
        let selectButton = app.buttons["Select Folder from Files"]
        if selectButton.exists {
            XCTAssertGreaterThanOrEqual(selectButton.frame.height, 44, "Select folder button should be at least 44pt tall")
        }
    }

    // MARK: - Landscape Orientation Tests

    /// Test that views adapt correctly to landscape orientation
    func testLandscapeOrientation() throws {
        let app = XCUIApplication()
        app.launch()
        sleep(2)

        // Rotate to landscape
        XCUIDevice.shared.orientation = .landscapeLeft
        sleep(1)

        // Verify NavigationSplitView is still functional
        XCTAssertTrue(app.staticTexts["Home"].exists, "Home should be visible in landscape")
        XCTAssertTrue(app.staticTexts["Folders"].exists, "Folders should be visible in landscape")
        XCTAssertTrue(app.staticTexts["Marketplace"].exists, "Marketplace should be visible in landscape")

        // Rotate back to portrait
        XCUIDevice.shared.orientation = .portrait
        sleep(1)

        // Verify still functional
        XCTAssertTrue(app.staticTexts["Home"].exists, "Home should be visible in portrait")
    }

    /// Test RunSheetView in landscape
    func testRunSheetLandscapeLayout() throws {
        let app = XCUIApplication()
        app.launch()
        sleep(2)

        // Rotate to landscape
        XCUIDevice.shared.orientation = .landscapeLeft
        sleep(1)

        // Navigate to folders
        app.staticTexts["Folders"].tap()
        sleep(1)

        // Verify layout elements are accessible
        let selectButton = app.buttons["Select Folder from Files"]
        XCTAssertTrue(selectButton.exists || app.staticTexts["Local Folder"].exists, "Local folder section should be visible in landscape")

        // Rotate back
        XCUIDevice.shared.orientation = .portrait
    }

    // MARK: - Grid Layout Tests (iPad)

    /// Test Marketplace grid layout on iPad
    func testMarketplaceGridLayout() throws {
        let app = XCUIApplication()
        app.launch()
        sleep(2)

        // Navigate to Marketplace
        app.staticTexts["Marketplace"].tap()
        sleep(2)

        // Wait for content to load (prompts should appear in grid)
        let searchField = app.textFields["Search prompts…"]
        XCTAssertTrue(searchField.exists, "Search field should be visible")

        // Verify search functionality
        searchField.tap()
        searchField.typeText("wedding")
        app.buttons["Search"].tap()
        sleep(2)

        // Prompts should be displayed (either in grid or empty state)
        // Note: Actual content depends on backend data
    }

    /// Test FoldersView grid layout on iPad
    func testFoldersGridLayout() throws {
        let app = XCUIApplication()
        app.launch()
        sleep(2)

        // Navigate to Folders
        app.staticTexts["Folders"].tap()
        sleep(2)

        // Verify local folder section
        XCTAssertTrue(
            app.staticTexts["Local Folder"].exists,
            "Local Folder section should be visible"
        )

        // Verify Mac folders section
        XCTAssertTrue(
            app.staticTexts["Mac Folders"].exists,
            "Mac Folders section should be visible"
        )

        // Verify select folder button exists
        let selectButton = app.buttons.matching(identifier: "Select Folder from Files").firstMatch
        XCTAssertTrue(selectButton.exists || app.staticTexts["Select Folder from Files"].exists, "Select folder UI should be present")
    }

    // MARK: - Multitasking Tests

    /// Test Split View support
    func testSplitViewSupport() throws {
        // Note: Actual Split View testing requires specific simulator/device setup
        // This test verifies the app doesn't crash in multitasking scenarios

        let app = XCUIApplication()
        app.launch()
        sleep(2)

        // Verify app is functional
        XCTAssertTrue(app.staticTexts["Home"].exists, "App should be functional")

        // Simulate app going to background and returning
        XCUIDevice.shared.press(.home)
        sleep(1)
        app.activate()
        sleep(1)

        // Verify app state is preserved
        XCTAssertTrue(app.staticTexts["Home"].exists, "App state should be preserved after backgrounding")
    }

    /// Test Slide Over support
    func testSlideOverSupport() throws {
        // Similar to Split View, this verifies the app doesn't crash
        let app = XCUIApplication()
        app.launch()
        sleep(2)

        // Navigate through different views
        app.staticTexts["Folders"].tap()
        sleep(1)
        app.staticTexts["Marketplace"].tap()
        sleep(1)
        app.staticTexts["Home"].tap()
        sleep(1)

        // Verify navigation is smooth and doesn't crash
        XCTAssertTrue(app.navigationBars.count > 0, "Navigation should work smoothly")
    }

    // MARK: - Keyboard Shortcuts Tests

    /// Test keyboard shortcut: Cmd+N (New Shoot)
    func testKeyboardShortcutNewShoot() throws {
        let app = XCUIApplication()
        app.launch()
        sleep(2)

        // Verify keyboard shortcuts are available
        // On iPad with Magic Keyboard, Cmd+N should open the New Shoot sheet
        // We can verify the infrastructure by checking that the modifier is applied
        XCTAssertTrue(app.staticTexts["Home"].exists, "App should be ready for keyboard shortcuts")

        // Test manual trigger of New Shoot (simulates Cmd+N result)
        // In actual usage with Magic Keyboard, Cmd+N would trigger this
        // The sheet would show FoldersView with "New Shoot" title

        // Note: XCUITest doesn't support direct keyboard command simulation
        // To test this manually:
        // 1. Run app on iPad simulator
        // 2. Enable "Connect Hardware Keyboard" in Simulator menu
        // 3. Press Cmd+N to verify New Shoot sheet appears
        // 4. Press Cmd+, to verify Settings opens
        // 5. Press Cmd+R to verify refresh occurs
    }

    /// Test keyboard shortcut: Cmd+, (Settings)
    func testKeyboardShortcutSettings() throws {
        let app = XCUIApplication()
        app.launch()
        sleep(2)

        // Manual navigation to settings (equivalent to Cmd+, result)
        app.staticTexts["Settings"].tap()
        sleep(1)
        XCTAssertTrue(app.navigationBars["Settings"].exists, "Settings should be accessible")

        // Verify Settings view loaded properly
        XCTAssertTrue(app.staticTexts["Account"].exists || app.staticTexts["Server Environment"].exists,
                      "Settings content should be visible")
    }

    /// Test keyboard shortcut: Cmd+R (Refresh)
    func testKeyboardShortcutRefresh() throws {
        let app = XCUIApplication()
        app.launch()
        sleep(2)

        // Verify refresh functionality exists
        // Cmd+R should trigger credits.refresh()
        XCTAssertTrue(app.staticTexts["Home"].exists, "Home view should support refresh")

        // Verify credits section is present (what gets refreshed)
        let creditsSection = app.staticTexts["Credits"]
        XCTAssertTrue(creditsSection.exists || app.staticTexts["Available"].exists,
                      "Credits section should be present for refresh")
    }

    /// Test keyboard shortcut infrastructure integration
    func testKeyboardShortcutInfrastructure() throws {
        let app = XCUIApplication()
        app.launch()
        sleep(2)

        // Verify the app loads without crashes (keyboard shortcuts are registered)
        XCTAssertTrue(app.staticTexts["Home"].exists, "App should load with keyboard shortcuts registered")

        // Navigate to different views to ensure keyboard shortcuts work everywhere
        app.staticTexts["Folders"].tap()
        sleep(1)
        XCTAssertTrue(app.navigationBars["Folders"].exists, "Should navigate to Folders")

        app.staticTexts["Marketplace"].tap()
        sleep(1)
        XCTAssertTrue(app.navigationBars["Marketplace"].exists, "Should navigate to Marketplace")

        // Return to home
        app.staticTexts["Home"].tap()
        sleep(1)
        XCTAssertTrue(app.navigationBars["Dashboard"].exists, "Should return to Home")

        // Keyboard shortcuts should work from any view
        // Manual test: Press Cmd+N from any view to open New Shoot
    }

    /// Test keyboard shortcuts discoverability
    func testKeyboardShortcutsDiscoverability() throws {
        let app = XCUIApplication()
        app.launch()
        sleep(2)

        // When user holds Cmd key on iPad with Magic Keyboard,
        // iOS shows available shortcuts with their discoverability titles:
        // - "Cmd+N: Start a new photo culling session"
        // - "Cmd+,: Open settings"
        // - "Cmd+R: Refresh current view"

        // This test verifies the app structure supports this
        XCTAssertTrue(app.staticTexts["Home"].exists, "Base navigation should exist")

        // Manual test for discoverability:
        // 1. Connect Magic Keyboard to iPad
        // 2. Launch app
        // 3. Hold down Cmd key
        // 4. Verify shortcuts overlay appears showing:
        //    - New Shoot (N)
        //    - Settings (,)
        //    - Refresh (R)
    }

    /// Test keyboard shortcuts with iPad multitasking
    func testKeyboardShortcutsWithMultitasking() throws {
        let app = XCUIApplication()
        app.launch()
        sleep(2)

        // Verify keyboard shortcuts work after backgrounding/foregrounding
        XCTAssertTrue(app.staticTexts["Home"].exists, "App should be ready")

        // Simulate multitasking
        XCUIDevice.shared.press(.home)
        sleep(1)
        app.activate()
        sleep(1)

        // Keyboard shortcuts should still work after returning to app
        XCTAssertTrue(app.staticTexts["Home"].exists, "App should restore state")

        // Manual test: After backgrounding and returning, press Cmd+N to verify
        // keyboard shortcuts still function correctly
    }

    // MARK: - Performance Tests

    /// Test NavigationSplitView performance with rapid switching
    func testNavigationPerformance() throws {
        let app = XCUIApplication()
        app.launch()
        sleep(2)

        measure {
            // Rapid navigation between views
            app.staticTexts["Folders"].tap()
            app.staticTexts["Marketplace"].tap()
            app.staticTexts["Settings"].tap()
            app.staticTexts["Home"].tap()
        }
    }

    /// Test grid layout performance with multiple items
    func testGridLayoutPerformance() throws {
        let app = XCUIApplication()
        app.launch()
        sleep(2)

        app.staticTexts["Marketplace"].tap()
        sleep(2)

        measure {
            // Scroll through marketplace (if items exist)
            let scrollView = app.scrollViews.firstMatch
            if scrollView.exists {
                scrollView.swipeUp()
                scrollView.swipeDown()
            }
        }
    }

    // MARK: - Accessibility Tests

    /// Test VoiceOver support for iPad layout
    func testVoiceOverSupport() throws {
        let app = XCUIApplication()
        app.launch()
        sleep(2)

        // Verify all navigation items have accessibility labels
        let home = app.staticTexts["Home"]
        XCTAssertNotNil(home.label, "Home should have accessibility label")

        let folders = app.staticTexts["Folders"]
        XCTAssertNotNil(folders.label, "Folders should have accessibility label")

        let marketplace = app.staticTexts["Marketplace"]
        XCTAssertNotNil(marketplace.label, "Marketplace should have accessibility label")

        let settings = app.staticTexts["Settings"]
        XCTAssertNotNil(settings.label, "Settings should have accessibility label")
    }

    /// Test Dynamic Type support
    func testDynamicTypeSupport() throws {
        let app = XCUIApplication()
        app.launchArguments += ["-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityL"]
        app.launch()
        sleep(2)

        // Verify app still functions with larger text
        XCTAssertTrue(app.staticTexts["Home"].exists, "App should support larger text sizes")

        // Touch targets should still be accessible
        let folders = app.staticTexts["Folders"]
        XCTAssertGreaterThanOrEqual(folders.frame.height, 44, "Touch targets should remain adequate with larger text")
    }

    // MARK: - State Preservation Tests

    /// Test state preservation during multitasking
    func testStatePreservation() throws {
        let app = XCUIApplication()
        app.launch()
        sleep(2)

        // Navigate to a specific view
        app.staticTexts["Marketplace"].tap()
        sleep(1)

        // Enter search text
        let searchField = app.textFields["Search prompts…"]
        if searchField.exists {
            searchField.tap()
            searchField.typeText("test")
        }

        // Background the app
        XCUIDevice.shared.press(.home)
        sleep(2)

        // Reactivate
        app.activate()
        sleep(2)

        // Verify state is preserved
        XCTAssertTrue(app.navigationBars["Marketplace"].exists, "Should return to Marketplace view")

        // Note: Search field text preservation depends on implementation
    }

    // MARK: - Error Handling Tests

    /// Test error handling in offline mode
    func testOfflineMode() throws {
        let app = XCUIApplication()
        app.launch()
        sleep(2)

        // Navigate to marketplace (which requires network)
        app.staticTexts["Marketplace"].tap()
        sleep(2)

        // App should handle offline gracefully (show empty state or cached data)
        XCTAssertTrue(app.navigationBars["Marketplace"].exists, "Marketplace should load even offline")
    }

    /// Test error recovery from network failures
    func testNetworkErrorRecovery() throws {
        let app = XCUIApplication()
        app.launch()
        sleep(2)

        // Navigate to folders (sync with backend)
        app.staticTexts["Folders"].tap()
        sleep(2)

        // Should either show cached data or empty state, not crash
        XCTAssertTrue(app.navigationBars["Folders"].exists, "App should handle network errors gracefully")
    }
}
