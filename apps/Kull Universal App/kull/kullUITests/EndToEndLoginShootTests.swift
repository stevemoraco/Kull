//
//  EndToEndLoginShootTests.swift
//  kullUITests
//
//  Created by Codex Agent on 11/22/25.
//

import XCTest

/// High-level UI scaffolding for login + shoot flows.
/// This intentionally skips unless the caller opts in and provides credentials + a shoot folder path,
/// so regular CI runs stay green.
final class EndToEndLoginShootTests: XCTestCase {
    @MainActor
    func testLoginAndShootFlow() throws {
        let env = ProcessInfo.processInfo.environment
        guard env["UITEST_ENABLE_E2E"] == "1" else {
            throw XCTSkip("Set UITEST_ENABLE_E2E=1 to run the full login/shoot UI flow.")
        }
        guard
            let email = env["KULL_UI_EMAIL"],
            let password = env["KULL_UI_PASSWORD"],
            let shootFolder = env["KULL_UI_SHOOT_FOLDER"]
        else {
            throw XCTSkip("Missing KULL_UI_EMAIL / KULL_UI_PASSWORD / KULL_UI_SHOOT_FOLDER env vars.")
        }

        let app = XCUIApplication()
        app.launchEnvironment["UITEST_SHOOT_FOLDER"] = shootFolder
        app.launch()

        // The following steps assume the auth screen presents email/password fields and a login button.
        // Adjust accessibility identifiers to match the real UI before enabling in CI.
        let emailField = app.textFields["email"]
        let passwordField = app.secureTextFields["password"]
        let loginButton = app.buttons["login"]

        XCTAssertTrue(emailField.waitForExistence(timeout: 10), "Email field not found")
        emailField.tap()
        emailField.typeText(email)

        XCTAssertTrue(passwordField.waitForExistence(timeout: 5), "Password field not found")
        passwordField.tap()
        passwordField.typeText(password)

        XCTAssertTrue(loginButton.waitForExistence(timeout: 5), "Login button not found")
        loginButton.tap()

        // Wait for home screen; look for a run/choose-folder action
        let chooseFolderButton = app.buttons["chooseFolder"]
        XCTAssertTrue(chooseFolderButton.waitForExistence(timeout: 15), "Choose Folder button not found after login")
        chooseFolderButton.tap()

        // File picker automation is platform-specific; this placeholder asserts the app stayed responsive.
        XCTAssertTrue(app.state == .runningForeground, "App not in foreground after folder picker action")

        // Additional assertions for sync/progress indicators can be added once accessibility identifiers are defined.
    }
}
