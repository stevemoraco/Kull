//
//  ErrorPresenterTests.swift
//  kullTests
//
//  Created by Agent G on 11/18/25.
//

import XCTest
@testable import kull

@MainActor
final class ErrorPresenterTests: XCTestCase {
    var errorPresenter: ErrorPresenter!

    override func setUp() async throws {
        try await super.setUp()
        errorPresenter = ErrorPresenter.shared
        errorPresenter.currentError = nil
    }

    override func tearDown() async throws {
        errorPresenter.currentError = nil
        try await super.tearDown()
    }

    // MARK: - API Error Tests

    func testNotAuthenticatedError() async {
        let error = APIError.notAuthenticated
        errorPresenter.present(error, context: "Test")

        XCTAssertNotNil(errorPresenter.currentError)
        XCTAssertEqual(errorPresenter.currentError?.title, "Authentication Required")
        XCTAssertTrue(errorPresenter.currentError?.message.contains("session has expired") ?? false)
    }

    func testInsufficientCreditsError() async {
        let error = APIError.requestFailed(status: 402)
        errorPresenter.present(error, context: "Test")

        XCTAssertNotNil(errorPresenter.currentError)
        XCTAssertEqual(errorPresenter.currentError?.title, "Insufficient Credits")
        XCTAssertTrue(errorPresenter.currentError?.message.contains("credits") ?? false)
    }

    func testRefreshFailedError() async {
        let error = APIError.refreshFailed
        errorPresenter.present(error, context: "Test")

        XCTAssertNotNil(errorPresenter.currentError)
        XCTAssertEqual(errorPresenter.currentError?.title, "Session Expired")
    }

    func testNetworkErrorsNotShown() async {
        // These errors should be logged but NOT shown to users
        let errors: [APIError] = [
            .requestFailed(status: 500),
            .requestFailed(status: 404),
            .requestFailed(status: 503),
            .decodingFailed,
            .invalidURL,
            .invalidResponse
        ]

        for error in errors {
            errorPresenter.currentError = nil
            errorPresenter.present(error, context: "Test")

            // These should NOT create user-facing errors
            XCTAssertNil(errorPresenter.currentError, "Error \(error) should not be shown to user")
        }
    }

    func testKeychainErrorsNotShown() async {
        let errors: [KeychainError] = [
            .itemNotFound,
            .duplicateItem,
            .unexpectedStatus(errSecParam),
            .invalidData
        ]

        for error in errors {
            errorPresenter.currentError = nil
            errorPresenter.present(error, context: "Test")

            // Keychain errors should NOT be shown to users
            XCTAssertNil(errorPresenter.currentError, "Keychain error \(error) should not be shown to user")
        }
    }

    // MARK: - Custom Error Tests

    func testPresentCustomError() async {
        errorPresenter.presentCustom(
            title: "Test Title",
            message: "Test Message"
        )

        XCTAssertNotNil(errorPresenter.currentError)
        XCTAssertEqual(errorPresenter.currentError?.title, "Test Title")
        XCTAssertEqual(errorPresenter.currentError?.message, "Test Message")
        XCTAssertNil(errorPresenter.currentError?.retryAction)
    }

    func testPresentCustomErrorWithRetry() async {
        var retryCallCount = 0
        let retryAction = {
            retryCallCount += 1
        }

        errorPresenter.presentCustom(
            title: "Test",
            message: "Test",
            retryAction: retryAction
        )

        XCTAssertNotNil(errorPresenter.currentError)
        XCTAssertNotNil(errorPresenter.currentError?.retryAction)

        // Call retry action
        errorPresenter.currentError?.retryAction?()
        XCTAssertEqual(retryCallCount, 1)
    }

    // MARK: - Error Dismissal Tests

    func testDismissError() async {
        errorPresenter.presentCustom(title: "Test", message: "Test")
        XCTAssertNotNil(errorPresenter.currentError)

        errorPresenter.dismiss()
        XCTAssertNil(errorPresenter.currentError)
    }

    func testMultipleErrorsOverwrite() async {
        // First error
        errorPresenter.presentCustom(title: "Error 1", message: "Message 1")
        XCTAssertEqual(errorPresenter.currentError?.title, "Error 1")

        // Second error should overwrite first
        errorPresenter.presentCustom(title: "Error 2", message: "Message 2")
        XCTAssertEqual(errorPresenter.currentError?.title, "Error 2")
    }

    // MARK: - Error Context Tests

    func testErrorWithContext() async {
        let error = APIError.notAuthenticated
        errorPresenter.present(error, context: "Fetching user data")

        // Should still present the error
        XCTAssertNotNil(errorPresenter.currentError)
    }

    func testErrorWithoutContext() async {
        let error = APIError.notAuthenticated
        errorPresenter.present(error)

        // Should still work without context
        XCTAssertNotNil(errorPresenter.currentError)
    }

    // MARK: - Thread Safety Tests

    func testConcurrentErrorPresentation() async {
        let expectation = XCTestExpectation(description: "Concurrent error presentation")
        expectation.expectedFulfillmentCount = 5

        await withTaskGroup(of: Void.self) { group in
            for i in 0..<5 {
                group.addTask { @MainActor in
                    self.errorPresenter.presentCustom(
                        title: "Error \(i)",
                        message: "Message \(i)"
                    )
                    expectation.fulfill()
                }
            }
        }

        await fulfillment(of: [expectation], timeout: 1.0)

        // Should have one error (the last one)
        XCTAssertNotNil(errorPresenter.currentError)
    }

    // MARK: - PresentableError Tests

    func testPresentableErrorIdentity() {
        let error1 = PresentableError(title: "Test", message: "Message")
        let error2 = PresentableError(title: "Test", message: "Message")

        // Each error should have unique ID
        XCTAssertNotEqual(error1.id, error2.id)
    }

    func testPresentableErrorWithRetry() {
        var called = false
        let error = PresentableError(
            title: "Test",
            message: "Message",
            retryAction: { called = true }
        )

        XCTAssertNotNil(error.retryAction)
        error.retryAction?()
        XCTAssertTrue(called)
    }

    func testPresentableErrorWithoutRetry() {
        let error = PresentableError(
            title: "Test",
            message: "Message"
        )

        XCTAssertNil(error.retryAction)
    }
}
