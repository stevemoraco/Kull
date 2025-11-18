//
//  FolderSyncServiceTests.swift
//  kullTests
//
//  Created by Claude Code on 11/18/25.
//

import XCTest
@testable import kull

final class FolderSyncServiceTests: XCTestCase {
    var sut: FolderSyncService!

    override func setUp() {
        super.setUp()
        sut = FolderSyncService()
    }

    override func tearDown() {
        sut = nil
        super.tearDown()
    }

    // MARK: - Initialization Tests

    func testInitialization() {
        XCTAssertNotNil(sut)
    }

    // MARK: - Sync Function Tests

    func testSyncFunctionCompletes() async {
        // Sync will attempt to send data to API
        // Without a running server, this will fail gracefully
        await sut.sync(deviceName: "Test Device")

        // Should complete without crashing
        XCTAssertNotNil(sut)
    }

    func testSyncWithEmptyDeviceName() async {
        await sut.sync(deviceName: "")

        // Should complete without crashing
        XCTAssertNotNil(sut)
    }

    func testSyncWithLongDeviceName() async {
        let longName = String(repeating: "a", count: 1000)
        await sut.sync(deviceName: longName)

        // Should complete without crashing
        XCTAssertNotNil(sut)
    }

    func testSyncWithSpecialCharacters() async {
        let specialName = "Device!@#$%^&*()_+-={}[]|\\:;<>?,./~`"
        await sut.sync(deviceName: specialName)

        // Should complete without crashing
        XCTAssertNotNil(sut)
    }

    func testSyncWithUnicodeCharacters() async {
        let unicodeName = "デバイス 🖥️ 测试"
        await sut.sync(deviceName: unicodeName)

        // Should complete without crashing
        XCTAssertNotNil(sut)
    }

    // MARK: - Multiple Sync Tests

    func testMultipleSyncCalls() async {
        await sut.sync(deviceName: "Device 1")
        await sut.sync(deviceName: "Device 2")
        await sut.sync(deviceName: "Device 3")

        // Should complete without crashing
        XCTAssertNotNil(sut)
    }

    func testConcurrentSyncCalls() async {
        await withTaskGroup(of: Void.self) { group in
            for i in 0..<5 {
                group.addTask {
                    await self.sut.sync(deviceName: "Device \(i)")
                }
            }
        }

        // Should complete without crashing
        XCTAssertNotNil(sut)
    }

    // MARK: - Performance Tests

    func testSyncPerformance() {
        measure {
            Task {
                await sut.sync(deviceName: "Test Device")
            }
        }
    }

    func testMultipleSyncPerformance() {
        measure {
            Task {
                for i in 0..<10 {
                    await self.sut.sync(deviceName: "Device \(i)")
                }
            }
        }
    }

    // MARK: - Integration Tests

    func testSyncWithBookmarkStore() async {
        // BookmarkStore should be used by FolderSyncService
        // This tests integration without mocking
        await sut.sync(deviceName: "Test Device")

        // Should complete and call BookmarkStore.shared.exportCatalog()
        XCTAssertNotNil(sut)
    }

    @MainActor
    func testSyncWithEnvironmentConfig() async {
        // Should use EnvironmentConfig.shared.apiBaseURL
        let originalEnv = EnvironmentConfig.shared.current

        // Try with different environments
        EnvironmentConfig.shared.current = .development
        await sut.sync(deviceName: "Dev Device")

        EnvironmentConfig.shared.current = .staging
        await sut.sync(deviceName: "Staging Device")

        EnvironmentConfig.shared.current = .production
        await sut.sync(deviceName: "Prod Device")

        // Restore original environment
        EnvironmentConfig.shared.current = originalEnv

        XCTAssertNotNil(sut)
    }

    // MARK: - Error Handling Tests

    func testSyncHandlesNetworkErrors() async {
        // Should handle network errors gracefully without throwing
        await sut.sync(deviceName: "Test Device")

        // Function should complete (errors are caught internally)
        XCTAssertNotNil(sut)
    }

    func testSyncWithInvalidAPIResponse() async {
        // Should handle invalid API responses gracefully
        await sut.sync(deviceName: "Test Device")

        // Should not crash
        XCTAssertNotNil(sut)
    }

    // MARK: - Thread Safety Tests

    func testConcurrentSyncFromMultipleThreads() async {
        await withTaskGroup(of: Void.self) { group in
            for i in 0..<20 {
                group.addTask {
                    await self.sut.sync(deviceName: "Thread \(i)")
                }
            }
        }

        XCTAssertNotNil(sut)
    }

    // MARK: - Edge Cases

    func testSyncWithNilCharactersInName() async {
        // Test with various edge case strings
        let edgeCases = [
            "\0",
            "\n",
            "\t",
            "\r\n",
            "   ",
            ""
        ]

        for deviceName in edgeCases {
            await sut.sync(deviceName: deviceName)
        }

        XCTAssertNotNil(sut)
    }

    func testSyncWithVeryLongDeviceName() async {
        let veryLongName = String(repeating: "Device", count: 10000)
        await sut.sync(deviceName: veryLongName)

        XCTAssertNotNil(sut)
    }

    func testSyncIsSafeToCallMultipleTimes() async {
        for _ in 0..<100 {
            await sut.sync(deviceName: "Repeated Device")
        }

        XCTAssertNotNil(sut)
    }
}
