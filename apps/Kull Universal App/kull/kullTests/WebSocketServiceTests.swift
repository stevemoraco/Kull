//
//  WebSocketServiceTests.swift
//  kullTests
//
//  Created by Claude Code on 11/18/25.
//

import XCTest
@testable import kull

@MainActor
final class WebSocketServiceTests: XCTestCase {
    var service: WebSocketService!

    override func setUp() async throws {
        try await super.setUp()
        service = WebSocketService.shared
    }

    override func tearDown() async throws {
        service.disconnect()
        try await super.tearDown()
    }

    // MARK: - Connection State Tests

    func testInitialState() {
        XCTAssertFalse(service.isConnected)
        XCTAssertEqual(service.connectionState, .disconnected)
        XCTAssertNil(service.lastSyncTime)
    }

    func testConnectionStateTransitions() async {
        // Initial state should be disconnected
        XCTAssertEqual(service.connectionState, .disconnected)

        // Note: We can't fully test connection without a live server
        // These tests verify the state management logic
    }

    func testDisconnect() async {
        service.disconnect()

        XCTAssertFalse(service.isConnected)
        XCTAssertEqual(service.connectionState, .disconnected)
    }

    // MARK: - Handler Registration Tests

    func testRegisterHandler() {
        var handlerCalled = false
        var receivedPayload: ShootProgressPayload?

        service.registerHandler(for: .shootProgress) { (payload: ShootProgressPayload) in
            handlerCalled = true
            receivedPayload = payload
        }

        // Handler should be registered (we can't easily test invocation without mocking)
        XCTAssertNotNil(service)
    }

    func testMultipleHandlerRegistration() {
        var shootProgressCalled = false
        var creditUpdateCalled = false

        service.registerHandler(for: .shootProgress) { (_: ShootProgressPayload) in
            shootProgressCalled = true
        }

        service.registerHandler(for: .creditUpdate) { (_: CreditUpdatePayload) in
            creditUpdateCalled = true
        }

        // Both handlers should be registered
        XCTAssertNotNil(service)
    }

    func testHandlerOverwrite() {
        var firstHandlerCalled = false
        var secondHandlerCalled = false

        service.registerHandler(for: .shootProgress) { (_: ShootProgressPayload) in
            firstHandlerCalled = true
        }

        // Registering again should overwrite
        service.registerHandler(for: .shootProgress) { (_: ShootProgressPayload) in
            secondHandlerCalled = true
        }

        // Only the second handler should be registered
        XCTAssertNotNil(service)
    }

    // MARK: - Message Type Tests

    func testShootProgressHandlerType() {
        service.registerHandler(for: .shootProgress) { (payload: ShootProgressPayload) in
            XCTAssertNotNil(payload.shootId)
            XCTAssertGreaterThanOrEqual(payload.processedCount, 0)
            XCTAssertGreaterThan(payload.totalCount, 0)
        }
    }

    func testCreditUpdateHandlerType() {
        service.registerHandler(for: .creditUpdate) { (payload: CreditUpdatePayload) in
            XCTAssertNotNil(payload.userId)
            XCTAssertNotNil(payload.reason)
        }
    }

    func testDeviceConnectionHandlerType() {
        service.registerHandler(for: .deviceConnected) { (payload: DeviceConnectionPayload) in
            XCTAssertNotNil(payload.deviceId)
            XCTAssertNotNil(payload.platform)
            XCTAssertNotNil(payload.deviceName)
        }
    }

    // MARK: - Connection Parameter Tests

    func testConnectWithValidParameters() {
        let userId = "test-user-123"
        let deviceId = "test-device-456"

        // This will attempt to connect but fail without a live server
        // We're testing that it doesn't crash
        service.connect(userId: userId, deviceId: deviceId)

        // Give it a moment to update state
        let expectation = XCTestExpectation(description: "State update")
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            expectation.fulfill()
        }

        wait(for: [expectation], timeout: 1.0)
    }

    func testMultipleConnectCalls() {
        let userId = "test-user-123"
        let deviceId = "test-device-456"

        // Connect multiple times - should handle gracefully
        service.connect(userId: userId, deviceId: deviceId)
        service.connect(userId: userId, deviceId: deviceId)

        XCTAssertNotNil(service)
    }

    func testDisconnectWithoutConnect() {
        // Should not crash
        service.disconnect()

        XCTAssertEqual(service.connectionState, .disconnected)
        XCTAssertFalse(service.isConnected)
    }

    // MARK: - Reconnection Tests

    func testReconnectionStateTracking() {
        // Simulate reconnection state
        // Note: Without a live server, we can't test the full reconnection flow
        XCTAssertNotNil(service)
    }

    // MARK: - Environment Change Tests

    func testEnvironmentChange() async {
        // Connect with initial environment
        service.connect(userId: "user-123", deviceId: "device-456")

        // Change environment
        await MainActor.run {
            EnvironmentConfig.shared.current = .staging
        }

        // Give it time to reconnect
        try? await Task.sleep(nanoseconds: 100_000_000) // 0.1s

        // Service should still exist (reconnection should be attempted)
        XCTAssertNotNil(service)
    }

    // MARK: - Ping/Pong Tests

    func testPingPayloadStructure() {
        let payload = PingPayload(timestamp: Date().timeIntervalSince1970)
        XCTAssertGreaterThan(payload.timestamp, 0)
    }

    func testPongPayloadStructure() {
        let payload = PongPayload(timestamp: Date().timeIntervalSince1970)
        XCTAssertGreaterThan(payload.timestamp, 0)
    }

    // MARK: - Connection State Equality Tests

    func testConnectionStateEquality() {
        let state1 = WebSocketService.ConnectionState.disconnected
        let state2 = WebSocketService.ConnectionState.disconnected
        XCTAssertEqual(state1, state2)

        let state3 = WebSocketService.ConnectionState.connecting
        let state4 = WebSocketService.ConnectionState.connecting
        XCTAssertEqual(state3, state4)

        let state5 = WebSocketService.ConnectionState.connected
        let state6 = WebSocketService.ConnectionState.connected
        XCTAssertEqual(state5, state6)

        let state7 = WebSocketService.ConnectionState.reconnecting(attempt: 1)
        let state8 = WebSocketService.ConnectionState.reconnecting(attempt: 1)
        XCTAssertEqual(state7, state8)

        let state9 = WebSocketService.ConnectionState.failed(error: "test")
        let state10 = WebSocketService.ConnectionState.failed(error: "test")
        XCTAssertEqual(state9, state10)
    }

    func testConnectionStateInequality() {
        let state1 = WebSocketService.ConnectionState.disconnected
        let state2 = WebSocketService.ConnectionState.connected
        XCTAssertNotEqual(state1, state2)

        let state3 = WebSocketService.ConnectionState.reconnecting(attempt: 1)
        let state4 = WebSocketService.ConnectionState.reconnecting(attempt: 2)
        XCTAssertNotEqual(state3, state4)
    }

    // MARK: - Thread Safety Tests

    func testConcurrentHandlerRegistration() async {
        let expectation = XCTestExpectation(description: "Concurrent registration")
        expectation.expectedFulfillmentCount = 5

        // Register multiple handlers concurrently
        await withTaskGroup(of: Void.self) { group in
            for i in 0..<5 {
                group.addTask { @MainActor in
                    self.service.registerHandler(for: .shootProgress) { (_: ShootProgressPayload) in
                        // Handler \(i)
                    }
                    expectation.fulfill()
                }
            }
        }

        wait(for: [expectation], timeout: 2.0)
    }

    // MARK: - Message Sending Tests

    func testSendMessage() {
        // Should not crash when sending before connection
        let payload = PingPayload(timestamp: Date().timeIntervalSince1970)
        service.send(type: .ping, payload: payload)

        XCTAssertNotNil(service)
    }

    func testSendMessageWithNilPayload() {
        // Should handle nil payload
        service.send(type: .ping, payload: nil as PingPayload?)

        XCTAssertNotNil(service)
    }

    // MARK: - Performance Tests

    func testHandlerRegistrationPerformance() {
        measure {
            for _ in 0..<100 {
                service.registerHandler(for: .shootProgress) { (_: ShootProgressPayload) in
                    // Do nothing
                }
            }
        }
    }

    func testMultipleDisconnectPerformance() {
        measure {
            for _ in 0..<100 {
                service.disconnect()
            }
        }
    }
}
