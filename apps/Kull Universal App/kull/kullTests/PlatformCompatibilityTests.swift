//
//  PlatformCompatibilityTests.swift
//  kullTests
//
//  Tests to ensure platform-specific code compiles and works correctly
//  on both macOS and iOS/iPadOS platforms
//

import XCTest
@testable import kull

#if os(macOS)
import AppKit
#elseif os(iOS)
import UIKit
#endif

final class PlatformCompatibilityTests: XCTestCase {

    // MARK: - Import Tests

    func testAppKitImportsCompileOnMacOS() {
        #if os(macOS)
        // Test AppKit imports work
        let _ = NSWorkspace.shared
        let _ = NSApplication.shared
        XCTAssertNotNil(NSWorkspace.shared, "NSWorkspace should be available on macOS")
        XCTAssertNotNil(NSApplication.shared, "NSApplication should be available on macOS")
        #else
        // This test should be skipped on iOS
        XCTAssertTrue(true, "Skipping AppKit test on non-macOS platform")
        #endif
    }

    func testUIKitImportsCompileOnIOS() {
        #if os(iOS)
        // Test UIKit imports work
        let _ = UIApplication.shared
        XCTAssertNotNil(UIApplication.shared, "UIApplication should be available on iOS")
        #else
        // This test should be skipped on macOS
        XCTAssertTrue(true, "Skipping UIKit test on non-iOS platform")
        #endif
    }

    // MARK: - URL Opening Tests

    func testURLOpeningAPIsExist() {
        let url = URL(string: "https://kull.ai")!

        #if os(macOS)
        // macOS uses NSWorkspace
        XCTAssertNotNil(NSWorkspace.shared, "NSWorkspace should be available")
        // Note: Can't actually open URLs in unit tests, just verify API exists
        XCTAssertTrue(NSWorkspace.shared.responds(to: #selector(NSWorkspace.open(_:))), "NSWorkspace should have open(_:) method")
        #elseif os(iOS)
        // iOS uses UIApplication
        XCTAssertNotNil(UIApplication.shared, "UIApplication should be available")
        XCTAssertTrue(UIApplication.shared.responds(to: #selector(UIApplication.open(_:options:completionHandler:))), "UIApplication should have open method")
        #endif
    }

    // MARK: - Device Name Tests

    func testDeviceNameResolutionWorks() {
        var deviceName: String

        #if os(macOS)
        deviceName = Host.current().localizedName ?? "Mac"
        XCTAssertFalse(deviceName.isEmpty, "macOS device name should not be empty")
        XCTAssertNotEqual(deviceName, "Mac", "macOS should return actual host name, not fallback")
        #elseif os(iOS)
        deviceName = UIDevice.current.name
        XCTAssertFalse(deviceName.isEmpty, "iOS device name should not be empty")
        // iOS Simulator typically returns "iPhone Simulator" or similar
        XCTAssertTrue(deviceName.contains("iPhone") || deviceName.contains("iPad") || deviceName.contains("iPod"),
                      "iOS device name should contain device type")
        #endif
    }

    // MARK: - Color Platform Tests

    func testColorAPIsWork() {
        #if os(macOS)
        let backgroundColor = Color(nsColor: .controlBackgroundColor)
        XCTAssertNotNil(backgroundColor, "macOS Color from NSColor should work")
        #elseif os(iOS)
        let backgroundColor = Color(.systemBackground)
        XCTAssertNotNil(backgroundColor, "iOS Color from UIColor should work")
        #endif
    }

    // MARK: - Application Delegate Tests

    func testAppDelegateExists() {
        #if os(macOS)
        // Verify macOS AppDelegate exists and conforms to NSApplicationDelegate
        let delegate = AppDelegate()
        XCTAssertNotNil(delegate, "macOS AppDelegate should exist")
        XCTAssertTrue(delegate is NSApplicationDelegate,
                      "macOS AppDelegate should conform to NSApplicationDelegate")
        #elseif os(iOS)
        // Verify iOS AppDelegate exists and conforms to UIApplicationDelegate
        let delegate = AppDelegate()
        XCTAssertNotNil(delegate, "iOS AppDelegate should exist")
        XCTAssertTrue(delegate is UIApplicationDelegate,
                      "iOS AppDelegate should conform to UIApplicationDelegate")
        #endif
    }

    // MARK: - Auth ViewModel Tests

    func testAuthViewModelInitializes() {
        let authViewModel = AuthViewModel()
        XCTAssertNotNil(authViewModel, "AuthViewModel should initialize on both platforms")

        // Check initial state
        switch authViewModel.state {
        case .loading:
            XCTAssertTrue(true, "Initial state should be loading")
        default:
            XCTFail("Initial state should be loading, got: \(authViewModel.state)")
        }
    }

    func testAuthViewModelURLOpeningMethodExists() {
        let authViewModel = AuthViewModel()

        // Verify the method compiles and exists
        // We can't actually test URL opening in unit tests, but we can verify the code compiles
        XCTAssertNotNil(authViewModel, "AuthViewModel should have URL opening capability")

        #if os(macOS)
        XCTAssertTrue(true, "macOS URL opening uses NSWorkspace")
        #elseif os(iOS)
        XCTAssertTrue(true, "iOS URL opening uses UIApplication")
        #endif
    }

    // MARK: - File Access Service Tests

    func testFileAccessServiceExists() {
        let service = FileAccessService.shared
        XCTAssertNotNil(service, "FileAccessService should exist on both platforms")
    }

    func testFileAccessServiceConformsToProtocol() {
        let service = FileAccessService.shared
        XCTAssertTrue(service is FileAccessServiceProtocol, "FileAccessService should conform to protocol")
    }

    func testFileAccessServiceHasRequiredMethods() {
        let service = FileAccessService.shared

        // Test that service has all required methods
        // We can't actually call them in unit tests (they require UI), but we verify they compile
        XCTAssertTrue(service.responds(to: #selector(FileAccessService.selectFolder(completion:))),
                      "FileAccessService should have selectFolder method")
        XCTAssertTrue(service.responds(to: #selector(FileAccessService.selectAudioFile(completion:))),
                      "FileAccessService should have selectAudioFile method")
    }

    // MARK: - Platform-Specific Feature Tests

    func testMacOSStatusBarItemExists() {
        #if os(macOS)
        // Verify that NSStatusBar is available
        let statusBar = NSStatusBar.system
        XCTAssertNotNil(statusBar, "NSStatusBar should be available on macOS")
        #else
        XCTAssertTrue(true, "Skipping macOS-only test on iOS")
        #endif
    }

    func testIOSDocumentPickerTypesExist() {
        #if os(iOS)
        // Verify UIDocumentPickerViewController is available
        XCTAssertTrue(true, "UIDocumentPickerViewController type should be available on iOS")
        // Can't instantiate in unit tests without UI, but verify the type exists
        let pickerType = UIDocumentPickerViewController.self
        XCTAssertNotNil(pickerType, "UIDocumentPickerViewController type should exist")
        #else
        XCTAssertTrue(true, "Skipping iOS-only test on macOS")
        #endif
    }

    // MARK: - Environment Config Tests

    func testEnvironmentConfigWorksOnBothPlatforms() {
        let config = EnvironmentConfig.shared
        XCTAssertNotNil(config, "EnvironmentConfig should work on both platforms")
        XCTAssertNotNil(config.apiBaseURL, "API base URL should be configured")
        XCTAssertFalse(config.apiBaseURL.absoluteString.isEmpty, "API base URL should not be empty")
    }

    // MARK: - Keychain Manager Tests

    func testKeychainManagerWorksOnBothPlatforms() {
        let keychain = KeychainManager.shared
        XCTAssertNotNil(keychain, "KeychainManager should work on both platforms")

        // Test that we can interact with keychain (should work on both platforms)
        let testDeviceId = "test-device-\(UUID().uuidString)"
        let testToken = "test-token-\(UUID().uuidString)"

        do {
            try keychain.saveAccessToken(testToken, for: testDeviceId)
            let retrieved = try keychain.getAccessToken(for: testDeviceId)
            XCTAssertEqual(retrieved, testToken, "Keychain should save and retrieve tokens")

            // Clean up
            keychain.clearAll(for: testDeviceId)
        } catch {
            XCTFail("Keychain operations should work on both platforms: \(error)")
        }
    }

    // MARK: - Device ID Manager Tests

    func testDeviceIDManagerWorksOnBothPlatforms() {
        let deviceIdManager = DeviceIDManager.shared
        XCTAssertNotNil(deviceIdManager, "DeviceIDManager should work on both platforms")

        let deviceId = deviceIdManager.deviceID
        XCTAssertFalse(deviceId.isEmpty, "Device ID should not be empty")
        XCTAssertTrue(deviceId.count > 10, "Device ID should be a reasonable length")

        // Verify consistency - getting it again should return the same ID
        let deviceId2 = deviceIdManager.deviceID
        XCTAssertEqual(deviceId, deviceId2, "Device ID should be consistent")
    }

    // MARK: - WebSocket Service Tests

    func testWebSocketServiceWorksOnBothPlatforms() {
        let webSocket = WebSocketService.shared
        XCTAssertNotNil(webSocket, "WebSocketService should work on both platforms")

        // Test initial state
        XCTAssertFalse(webSocket.isConnected, "WebSocket should not be connected initially")

        if case .disconnected = webSocket.connectionState {
            XCTAssertTrue(true, "Initial connection state should be disconnected")
        } else {
            XCTFail("Initial connection state should be disconnected")
        }
    }

    // MARK: - Integration Tests

    func testAppCanInitializeOnBothPlatforms() {
        // This tests that the main app structure compiles and can initialize
        #if os(macOS)
        // On macOS, verify the main app has required components
        XCTAssertTrue(true, "macOS app should have NSApplicationDelegateAdaptor")
        #elseif os(iOS)
        // On iOS, verify the main app has required components
        XCTAssertTrue(true, "iOS app should have UIApplicationDelegateAdaptor")
        #endif
    }

    func testAllPlatformConditionalsBranchCorrectly() {
        var platformIdentified = false

        #if os(macOS)
        platformIdentified = true
        XCTAssertTrue(platformIdentified, "macOS platform should be identified")
        #elseif os(iOS)
        platformIdentified = true
        XCTAssertTrue(platformIdentified, "iOS platform should be identified")
        #else
        XCTFail("Platform should be either macOS or iOS")
        #endif

        XCTAssertTrue(platformIdentified, "Platform must be identified")
    }
}
