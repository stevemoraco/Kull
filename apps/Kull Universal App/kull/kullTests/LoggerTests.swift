//
//  LoggerTests.swift
//  kullTests
//
//  Created by Agent G on 11/18/25.
//

import XCTest
import OSLog
@testable import kull

final class LoggerTests: XCTestCase {
    // Note: OSLog doesn't provide direct test APIs to verify log output
    // These tests verify that logging methods execute without crashing

    func testLoggerCategories() {
        // Verify all logger categories are accessible
        XCTAssertNotNil(Logger.auth)
        XCTAssertNotNil(Logger.sync)
        XCTAssertNotNil(Logger.api)
        XCTAssertNotNil(Logger.processing)
        XCTAssertNotNil(Logger.errors)
        XCTAssertNotNil(Logger.keychain)
        XCTAssertNotNil(Logger.settings)
        XCTAssertNotNil(Logger.ui)
    }

    func testLogAPIRequest() {
        // Should execute without throwing
        XCTAssertNoThrow(Logger.api.logAPIRequest("GET", "/api/test"))
        XCTAssertNoThrow(Logger.api.logAPIRequest("POST", "/api/users"))
        XCTAssertNoThrow(Logger.api.logAPIRequest("DELETE", "/api/sessions/123"))
    }

    func testLogAPIResponse() {
        // Should execute without throwing
        XCTAssertNoThrow(Logger.api.logAPIResponse(200, "/api/test", duration: 0.5))
        XCTAssertNoThrow(Logger.api.logAPIResponse(404, "/api/missing", duration: 0.1))
        XCTAssertNoThrow(Logger.api.logAPIResponse(500, "/api/error", duration: 2.5))
    }

    func testLogAPIError() {
        let error = NSError(domain: "test", code: 1, userInfo: [NSLocalizedDescriptionKey: "Test error"])
        XCTAssertNoThrow(Logger.api.logAPIError(error, "/api/test"))
    }

    func testLogAuthSuccess() {
        XCTAssertNoThrow(Logger.auth.logAuthSuccess("user-123"))
        XCTAssertNoThrow(Logger.auth.logAuthSuccess("another-user-456"))
    }

    func testLogAuthFailure() {
        XCTAssertNoThrow(Logger.auth.logAuthFailure("Invalid credentials"))
        XCTAssertNoThrow(Logger.auth.logAuthFailure("Token expired"))
    }

    func testLogWebSocketState() {
        XCTAssertNoThrow(Logger.sync.logWebSocketState("connecting"))
        XCTAssertNoThrow(Logger.sync.logWebSocketState("connected"))
        XCTAssertNoThrow(Logger.sync.logWebSocketState("disconnected"))
        XCTAssertNoThrow(Logger.sync.logWebSocketState("reconnecting"))
    }

    func testLogWebSocketMessage() {
        XCTAssertNoThrow(Logger.sync.logWebSocketMessage("SHOOT_PROGRESS"))
        XCTAssertNoThrow(Logger.sync.logWebSocketMessage("CREDIT_UPDATE"))
        XCTAssertNoThrow(Logger.sync.logWebSocketMessage("DEVICE_CONNECTED"))
    }

    func testLogProcessingStart() {
        XCTAssertNoThrow(Logger.processing.logProcessingStart("gpt-5-nano", 100))
        XCTAssertNoThrow(Logger.processing.logProcessingStart("claude-haiku-4.5", 500))
    }

    func testLogProcessingComplete() {
        XCTAssertNoThrow(Logger.processing.logProcessingComplete(100, duration: 5.5))
        XCTAssertNoThrow(Logger.processing.logProcessingComplete(1000, duration: 30.2))
    }

    func testLogProcessingError() {
        let error = NSError(domain: "test", code: 1, userInfo: [NSLocalizedDescriptionKey: "Processing failed"])
        XCTAssertNoThrow(Logger.processing.logProcessingError(error, "gpt-5-nano"))
    }

    func testLogKeychainOperation() {
        XCTAssertNoThrow(Logger.keychain.logKeychainOperation("Save access token", success: true))
        XCTAssertNoThrow(Logger.keychain.logKeychainOperation("Retrieve refresh token", success: true))

        let error = NSError(domain: "test", code: 1)
        XCTAssertNoThrow(Logger.keychain.logKeychainOperation("Delete token", success: false, error: error))
    }

    func testLogEnvironmentChange() {
        XCTAssertNoThrow(Logger.settings.logEnvironmentChange("Development", "Production"))
        XCTAssertNoThrow(Logger.settings.logEnvironmentChange("Staging", "Development"))
    }

    func testLogSettingsChange() {
        XCTAssertNoThrow(Logger.settings.logSettingsChange("debugLogging", "true"))
        XCTAssertNoThrow(Logger.settings.logSettingsChange("notifyShootCompleted", "false"))
    }

    func testDebugLogging() {
        XCTAssertNoThrow(Logger.api.debugLog("Debug message"))
        XCTAssertNoThrow(Logger.auth.debugLog("Debug auth message"))
    }

    func testVerboseLogging() {
        XCTAssertNoThrow(Logger.processing.verbose("Verbose processing info"))
        XCTAssertNoThrow(Logger.sync.verbose("Verbose sync info"))
    }

    func testBasicLogLevels() {
        // Test basic OSLog levels
        XCTAssertNoThrow(Logger.api.debug("Debug message"))
        XCTAssertNoThrow(Logger.api.info("Info message"))
        XCTAssertNoThrow(Logger.api.notice("Notice message"))
        XCTAssertNoThrow(Logger.api.warning("Warning message"))
        XCTAssertNoThrow(Logger.api.error("Error message"))
    }

    func testLoggingWithSpecialCharacters() {
        // Test logging with special characters
        XCTAssertNoThrow(Logger.api.info("Message with emoji: 😀🎉"))
        XCTAssertNoThrow(Logger.api.info("Message with quotes: \"test\""))
        XCTAssertNoThrow(Logger.api.info("Message with newline:\nSecond line"))
        XCTAssertNoThrow(Logger.api.info("Message with unicode: 你好世界"))
    }

    func testLoggingLongMessages() {
        let longMessage = String(repeating: "a", count: 10000)
        XCTAssertNoThrow(Logger.api.info("\(longMessage)"))
    }

    func testPerformanceTimer() {
        // Test that PerformanceTimer can be created and stopped
        let timer = PerformanceTimer(logger: Logger.api, operation: "Test operation")
        XCTAssertNotNil(timer)

        // Manually stop timer
        XCTAssertNoThrow(timer.stop())
    }

    func testPerformanceTimerAutoStop() {
        // Test that timer stops when going out of scope
        autoreleasepool {
            let timer = PerformanceTimer(logger: Logger.api, operation: "Auto-stop test")
            XCTAssertNotNil(timer)
            // Timer should stop when deallocated
        }
    }

    func testPerformanceTimerWithRealWork() {
        let timer = PerformanceTimer(logger: Logger.processing, operation: "Simulated work")

        // Simulate some work
        Thread.sleep(forTimeInterval: 0.01)

        timer.stop()
    }

    func testMultipleLoggersInParallel() {
        let expectation = XCTestExpectation(description: "Parallel logging")
        expectation.expectedFulfillmentCount = 5

        DispatchQueue.concurrentPerform(iterations: 5) { index in
            Logger.api.info("Parallel log \(index)")
            expectation.fulfill()
        }

        wait(for: [expectation], timeout: 1.0)
    }

    func testConcurrentLoggingToDifferentCategories() {
        let expectation = XCTestExpectation(description: "Concurrent category logging")
        expectation.expectedFulfillmentCount = 4

        DispatchQueue.global().async {
            Logger.auth.info("Auth log")
            expectation.fulfill()
        }

        DispatchQueue.global().async {
            Logger.api.info("API log")
            expectation.fulfill()
        }

        DispatchQueue.global().async {
            Logger.sync.info("Sync log")
            expectation.fulfill()
        }

        DispatchQueue.global().async {
            Logger.processing.info("Processing log")
            expectation.fulfill()
        }

        wait(for: [expectation], timeout: 1.0)
    }
}
