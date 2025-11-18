//
//  SyncCoordinatorTests.swift
//  kullTests
//
//  Created by Claude Code on 11/18/25.
//

import XCTest
@testable import kull

@MainActor
final class SyncCoordinatorTests: XCTestCase {
    var coordinator: SyncCoordinator!

    override func setUp() async throws {
        try await super.setUp()
        coordinator = SyncCoordinator.shared
    }

    override func tearDown() async throws {
        coordinator.stop()
        try await super.tearDown()
    }

    // MARK: - Initial State Tests

    func testInitialState() {
        XCTAssertTrue(coordinator.activeShootProgress.isEmpty)
        XCTAssertEqual(coordinator.creditBalance, 0)
        XCTAssertTrue(coordinator.connectedDevices.isEmpty)
        XCTAssertNil(coordinator.lastCreditUpdate)
        XCTAssertNil(coordinator.lastPromptChange)
    }

    // MARK: - Start/Stop Tests

    func testStart() {
        let userId = "test-user-123"
        let deviceId = "test-device-456"

        coordinator.start(userId: userId, deviceId: deviceId)

        // Give it time to connect
        let expectation = XCTestExpectation(description: "Start connection")
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            expectation.fulfill()
        }

        wait(for: [expectation], timeout: 1.0)
    }

    func testStop() {
        coordinator.stop()

        XCTAssertTrue(coordinator.activeShootProgress.isEmpty)
        XCTAssertEqual(coordinator.creditBalance, 0)
        XCTAssertTrue(coordinator.connectedDevices.isEmpty)
        XCTAssertNil(coordinator.lastCreditUpdate)
        XCTAssertNil(coordinator.lastPromptChange)
    }

    func testStopClearsState() {
        // Set some state
        coordinator.creditBalance = 1000

        // Stop should clear it
        coordinator.stop()

        XCTAssertEqual(coordinator.creditBalance, 0)
    }

    // MARK: - Shoot Progress Tests

    func testIsAnyShootingInitially() {
        XCTAssertFalse(coordinator.isAnyShooting)
    }

    func testIsAnyShootingWithProcessing() {
        let progress = ShootProgressPayload(
            shootId: "shoot-123",
            status: .processing,
            processedCount: 50,
            totalCount: 100,
            currentImage: "image.jpg",
            eta: 30,
            provider: "gpt-5-nano",
            errorMessage: nil
        )

        coordinator.activeShootProgress["shoot-123"] = progress

        XCTAssertTrue(coordinator.isAnyShooting)
    }

    func testIsAnyShootingWithCompleted() {
        let progress = ShootProgressPayload(
            shootId: "shoot-123",
            status: .completed,
            processedCount: 100,
            totalCount: 100,
            currentImage: nil,
            eta: nil,
            provider: "gpt-5-nano",
            errorMessage: nil
        )

        coordinator.activeShootProgress["shoot-123"] = progress

        XCTAssertFalse(coordinator.isAnyShooting)
    }

    // MARK: - Progress Calculation Tests

    func testTotalImagesProcessing() {
        let progress1 = ShootProgressPayload(
            shootId: "shoot-1",
            status: .processing,
            processedCount: 50,
            totalCount: 100,
            currentImage: nil,
            eta: nil,
            provider: "gpt-5-nano",
            errorMessage: nil
        )

        let progress2 = ShootProgressPayload(
            shootId: "shoot-2",
            status: .processing,
            processedCount: 30,
            totalCount: 60,
            currentImage: nil,
            eta: nil,
            provider: "gpt-5-nano",
            errorMessage: nil
        )

        coordinator.activeShootProgress["shoot-1"] = progress1
        coordinator.activeShootProgress["shoot-2"] = progress2

        XCTAssertEqual(coordinator.totalImagesProcessing, 80)
    }

    func testTotalImagesToProcess() {
        let progress1 = ShootProgressPayload(
            shootId: "shoot-1",
            status: .processing,
            processedCount: 50,
            totalCount: 100,
            currentImage: nil,
            eta: nil,
            provider: "gpt-5-nano",
            errorMessage: nil
        )

        let progress2 = ShootProgressPayload(
            shootId: "shoot-2",
            status: .processing,
            processedCount: 30,
            totalCount: 60,
            currentImage: nil,
            eta: nil,
            provider: "gpt-5-nano",
            errorMessage: nil
        )

        coordinator.activeShootProgress["shoot-1"] = progress1
        coordinator.activeShootProgress["shoot-2"] = progress2

        XCTAssertEqual(coordinator.totalImagesToProcess, 160)
    }

    func testOverallProgress() {
        let progress = ShootProgressPayload(
            shootId: "shoot-1",
            status: .processing,
            processedCount: 50,
            totalCount: 100,
            currentImage: nil,
            eta: nil,
            provider: "gpt-5-nano",
            errorMessage: nil
        )

        coordinator.activeShootProgress["shoot-1"] = progress

        XCTAssertEqual(coordinator.overallProgress, 0.5, accuracy: 0.01)
    }

    func testOverallProgressWithZeroTotal() {
        XCTAssertEqual(coordinator.overallProgress, 0)
    }

    func testOverallProgressWithMultipleShoots() {
        let progress1 = ShootProgressPayload(
            shootId: "shoot-1",
            status: .processing,
            processedCount: 50,
            totalCount: 100,
            currentImage: nil,
            eta: nil,
            provider: "gpt-5-nano",
            errorMessage: nil
        )

        let progress2 = ShootProgressPayload(
            shootId: "shoot-2",
            status: .processing,
            processedCount: 25,
            totalCount: 100,
            currentImage: nil,
            eta: nil,
            provider: "gpt-5-nano",
            errorMessage: nil
        )

        coordinator.activeShootProgress["shoot-1"] = progress1
        coordinator.activeShootProgress["shoot-2"] = progress2

        // 75 / 200 = 0.375
        XCTAssertEqual(coordinator.overallProgress, 0.375, accuracy: 0.01)
    }

    // MARK: - Credit Balance Tests

    func testCreditBalanceUpdate() {
        coordinator.creditBalance = 5000
        XCTAssertEqual(coordinator.creditBalance, 5000)
    }

    func testCreditBalanceMultipleUpdates() {
        coordinator.creditBalance = 1000
        coordinator.creditBalance = 2000
        coordinator.creditBalance = 1500

        XCTAssertEqual(coordinator.creditBalance, 1500)
    }

    // MARK: - Connected Devices Tests

    func testConnectedDevicesEmpty() {
        XCTAssertTrue(coordinator.connectedDevices.isEmpty)
    }

    func testAddConnectedDevice() {
        let device = DeviceConnectionPayload(
            deviceId: "device-1",
            platform: "macOS",
            deviceName: "MacBook Pro",
            connectedAt: Date().timeIntervalSince1970
        )

        coordinator.connectedDevices.append(device)

        XCTAssertEqual(coordinator.connectedDevices.count, 1)
        XCTAssertEqual(coordinator.connectedDevices[0].deviceId, "device-1")
    }

    func testMultipleConnectedDevices() {
        let device1 = DeviceConnectionPayload(
            deviceId: "device-1",
            platform: "macOS",
            deviceName: "MacBook Pro",
            connectedAt: Date().timeIntervalSince1970
        )

        let device2 = DeviceConnectionPayload(
            deviceId: "device-2",
            platform: "iOS",
            deviceName: "iPhone 15 Pro",
            connectedAt: Date().timeIntervalSince1970
        )

        coordinator.connectedDevices.append(device1)
        coordinator.connectedDevices.append(device2)

        XCTAssertEqual(coordinator.connectedDevices.count, 2)
    }

    func testRemoveConnectedDevice() {
        let device1 = DeviceConnectionPayload(
            deviceId: "device-1",
            platform: "macOS",
            deviceName: "MacBook Pro",
            connectedAt: Date().timeIntervalSince1970
        )

        let device2 = DeviceConnectionPayload(
            deviceId: "device-2",
            platform: "iOS",
            deviceName: "iPhone 15 Pro",
            connectedAt: Date().timeIntervalSince1970
        )

        coordinator.connectedDevices.append(device1)
        coordinator.connectedDevices.append(device2)

        coordinator.connectedDevices.removeAll { $0.deviceId == "device-1" }

        XCTAssertEqual(coordinator.connectedDevices.count, 1)
        XCTAssertEqual(coordinator.connectedDevices[0].deviceId, "device-2")
    }

    // MARK: - Shoot Status Tests

    func testShootStatusTransitions() {
        let shootId = "shoot-123"

        // Queued
        var progress = ShootProgressPayload(
            shootId: shootId,
            status: .queued,
            processedCount: 0,
            totalCount: 100,
            currentImage: nil,
            eta: nil,
            provider: "gpt-5-nano",
            errorMessage: nil
        )
        coordinator.activeShootProgress[shootId] = progress

        XCTAssertEqual(coordinator.activeShootProgress[shootId]?.status, .queued)

        // Processing
        progress = ShootProgressPayload(
            shootId: shootId,
            status: .processing,
            processedCount: 50,
            totalCount: 100,
            currentImage: "image.jpg",
            eta: 30,
            provider: "gpt-5-nano",
            errorMessage: nil
        )
        coordinator.activeShootProgress[shootId] = progress

        XCTAssertEqual(coordinator.activeShootProgress[shootId]?.status, .processing)

        // Completed
        progress = ShootProgressPayload(
            shootId: shootId,
            status: .completed,
            processedCount: 100,
            totalCount: 100,
            currentImage: nil,
            eta: nil,
            provider: "gpt-5-nano",
            errorMessage: nil
        )
        coordinator.activeShootProgress[shootId] = progress

        XCTAssertEqual(coordinator.activeShootProgress[shootId]?.status, .completed)
    }

    // MARK: - Last Update Tests

    func testLastCreditUpdate() {
        let update = CreditUpdatePayload(
            userId: "user-123",
            newBalance: 5000,
            change: -100,
            reason: "AI processing"
        )

        coordinator.lastCreditUpdate = update

        XCTAssertNotNil(coordinator.lastCreditUpdate)
        XCTAssertEqual(coordinator.lastCreditUpdate?.newBalance, 5000)
        XCTAssertEqual(coordinator.lastCreditUpdate?.change, -100)
    }

    func testLastPromptChange() {
        let change = PromptChangePayload(
            promptId: "prompt-123",
            action: .created
        )

        coordinator.lastPromptChange = change

        XCTAssertNotNil(coordinator.lastPromptChange)
        XCTAssertEqual(coordinator.lastPromptChange?.promptId, "prompt-123")
        XCTAssertEqual(coordinator.lastPromptChange?.action, .created)
    }

    // MARK: - State Clearing Tests

    func testStopClearsAllState() {
        // Set up some state
        coordinator.creditBalance = 1000
        coordinator.activeShootProgress["shoot-1"] = ShootProgressPayload(
            shootId: "shoot-1",
            status: .processing,
            processedCount: 50,
            totalCount: 100,
            currentImage: nil,
            eta: nil,
            provider: "gpt-5-nano",
            errorMessage: nil
        )
        coordinator.connectedDevices.append(DeviceConnectionPayload(
            deviceId: "device-1",
            platform: "macOS",
            deviceName: "MacBook",
            connectedAt: Date().timeIntervalSince1970
        ))
        coordinator.lastCreditUpdate = CreditUpdatePayload(
            userId: "user-123",
            newBalance: 1000,
            change: 0,
            reason: "test"
        )

        // Stop
        coordinator.stop()

        // Verify everything is cleared
        XCTAssertTrue(coordinator.activeShootProgress.isEmpty)
        XCTAssertEqual(coordinator.creditBalance, 0)
        XCTAssertTrue(coordinator.connectedDevices.isEmpty)
        XCTAssertNil(coordinator.lastCreditUpdate)
        XCTAssertNil(coordinator.lastPromptChange)
    }

    // MARK: - Performance Tests

    func testShootProgressUpdatePerformance() {
        measure {
            for i in 0..<100 {
                let progress = ShootProgressPayload(
                    shootId: "shoot-\(i)",
                    status: .processing,
                    processedCount: i,
                    totalCount: 100,
                    currentImage: nil,
                    eta: nil,
                    provider: "gpt-5-nano",
                    errorMessage: nil
                )
                coordinator.activeShootProgress["shoot-\(i)"] = progress
            }
        }
    }

    func testOverallProgressCalculationPerformance() {
        // Set up 100 shoots
        for i in 0..<100 {
            let progress = ShootProgressPayload(
                shootId: "shoot-\(i)",
                status: .processing,
                processedCount: i,
                totalCount: 100,
                currentImage: nil,
                eta: nil,
                provider: "gpt-5-nano",
                errorMessage: nil
            )
            coordinator.activeShootProgress["shoot-\(i)"] = progress
        }

        measure {
            _ = coordinator.overallProgress
        }
    }
}
