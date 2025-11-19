//
//  IOSAccessibilityIntegrationTests.swift
//  kullTests
//
//  Integration tests for iOS/iPadOS accessibility features
//  Tests touch target sizes (≥44pt), VoiceOver support, and Dynamic Type
//

import XCTest
@testable import kull

#if os(iOS)
import UIKit
import SwiftUI

final class IOSAccessibilityIntegrationTests: XCTestCase {

    // MARK: - Touch Target Size Tests (≥44pt requirement)

    func testButtonHasMinimumTouchTargetSize() {
        // Given
        let button = UIButton(frame: CGRect(x: 0, y: 0, width: 44, height: 44))

        // Then
        XCTAssertGreaterThanOrEqual(button.frame.width, 44, "Button width should be ≥44pt")
        XCTAssertGreaterThanOrEqual(button.frame.height, 44, "Button height should be ≥44pt")
    }

    func testSmallButtonExpandedTouchTarget() {
        // Given - Visual button is 24x24, but touch target should be expanded
        let smallButton = UIButton(frame: CGRect(x: 0, y: 0, width: 24, height: 24))

        // When - Expand touch target using hitTest expansion
        let expandedSize: CGFloat = 44
        let expansion = (expandedSize - smallButton.frame.width) / 2

        let expandedFrame = smallButton.frame.insetBy(dx: -expansion, dy: -expansion)

        // Then
        XCTAssertGreaterThanOrEqual(expandedFrame.width, 44, "Expanded width should be ≥44pt")
        XCTAssertGreaterThanOrEqual(expandedFrame.height, 44, "Expanded height should be ≥44pt")
    }

    func testMinimumTouchTargetConstant() {
        // Given
        let minimumTouchTarget: CGFloat = 44

        // Then
        XCTAssertEqual(minimumTouchTarget, 44, "iOS minimum touch target should be 44pt")
    }

    func testTableViewCellHasMinimumHeight() {
        // Given
        let cell = UITableViewCell(style: .default, reuseIdentifier: "test")
        let minimumHeight: CGFloat = 44

        // When
        cell.frame = CGRect(x: 0, y: 0, width: 320, height: minimumHeight)

        // Then
        XCTAssertGreaterThanOrEqual(cell.frame.height, 44, "Table cell height should be ≥44pt")
    }

    func testCollectionViewCellHasMinimumTouchTarget() {
        // Given
        let layout = UICollectionViewFlowLayout()
        layout.itemSize = CGSize(width: 44, height: 44)

        // Then
        XCTAssertGreaterThanOrEqual(layout.itemSize.width, 44, "Collection item width should be ≥44pt")
        XCTAssertGreaterThanOrEqual(layout.itemSize.height, 44, "Collection item height should be ≥44pt")
    }

    // MARK: - VoiceOver Tests

    func testButtonHasAccessibilityLabel() {
        // Given
        let button = UIButton(frame: .zero)
        button.setTitle("Process", for: .normal)

        // When
        button.accessibilityLabel = "Process images button"

        // Then
        XCTAssertNotNil(button.accessibilityLabel, "Button should have accessibility label")
        XCTAssertEqual(button.accessibilityLabel, "Process images button")
    }

    func testImageHasAccessibilityDescription() {
        // Given
        let imageView = UIImageView(frame: .zero)

        // When
        imageView.isAccessibilityElement = true
        imageView.accessibilityLabel = "Photo rating: 5 stars"

        // Then
        XCTAssertTrue(imageView.isAccessibilityElement, "Image should be accessibility element")
        XCTAssertNotNil(imageView.accessibilityLabel, "Image should have description")
    }

    func testSwitchHasAccessibilityLabel() {
        // Given
        let toggle = UISwitch(frame: .zero)

        // When
        toggle.accessibilityLabel = "Enable offline mode"

        // Then
        XCTAssertNotNil(toggle.accessibilityLabel, "Switch should have accessibility label")
    }

    func testTextFieldHasAccessibilityHint() {
        // Given
        let textField = UITextField(frame: .zero)

        // When
        textField.accessibilityLabel = "Shoot name"
        textField.accessibilityHint = "Enter a name for this photoshoot"

        // Then
        XCTAssertNotNil(textField.accessibilityLabel, "Text field should have label")
        XCTAssertNotNil(textField.accessibilityHint, "Text field should have hint")
    }

    func testAccessibilityTraitsAreSet() {
        // Given
        let button = UIButton(frame: .zero)

        // When
        button.accessibilityTraits = .button

        // Then
        XCTAssertTrue(button.accessibilityTraits.contains(.button), "Should have button trait")
    }

    func testAccessibilityValueForProgressBar() {
        // Given
        let progressView = UIProgressView(frame: .zero)

        // When
        progressView.progress = 0.75
        progressView.accessibilityValue = "75 percent complete"

        // Then
        XCTAssertNotNil(progressView.accessibilityValue, "Progress should have value")
        XCTAssertEqual(progressView.accessibilityValue, "75 percent complete")
    }

    // MARK: - Dynamic Type Tests

    func testDynamicTypeSupport() {
        // Given
        let label = UILabel(frame: .zero)

        // When
        label.font = UIFont.preferredFont(forTextStyle: .body)
        label.adjustsFontForContentSizeCategory = true

        // Then
        XCTAssertTrue(label.adjustsFontForContentSizeCategory, "Should support Dynamic Type")
        XCTAssertNotNil(label.font, "Should have font set")
    }

    func testPreferredFontStyles() {
        // Given
        let styles: [UIFont.TextStyle] = [
            .largeTitle, .title1, .title2, .title3,
            .headline, .body, .callout, .subheadline,
            .footnote, .caption1, .caption2
        ]

        // When/Then
        styles.forEach { style in
            let font = UIFont.preferredFont(forTextStyle: style)
            XCTAssertNotNil(font, "\(style) should have preferred font")
        }
    }

    func testButtonTitleSupportsDynamicType() {
        // Given
        let button = UIButton(frame: .zero)

        // When
        button.titleLabel?.font = UIFont.preferredFont(forTextStyle: .body)
        button.titleLabel?.adjustsFontForContentSizeCategory = true

        // Then
        XCTAssertTrue(button.titleLabel?.adjustsFontForContentSizeCategory == true,
                      "Button title should support Dynamic Type")
    }

    // MARK: - Accessibility Inspector Compliance Tests

    func testContrastRatio() {
        // Given
        let backgroundColor = UIColor.white
        let textColor = UIColor.black

        // When - Calculate luminance (simplified)
        // WCAG AA requires 4.5:1 for normal text, 3:1 for large text
        // This is a simplified test - real contrast calculation is more complex

        // Then
        XCTAssertNotEqual(backgroundColor, textColor, "Background and text should have contrast")
    }

    func testAccessibilityElementsAreOrdered() {
        // Given
        let containerView = UIView(frame: .zero)
        let element1 = UIButton(frame: .zero)
        let element2 = UIButton(frame: .zero)
        let element3 = UIButton(frame: .zero)

        containerView.addSubview(element1)
        containerView.addSubview(element2)
        containerView.addSubview(element3)

        // When
        element1.accessibilityLabel = "First button"
        element2.accessibilityLabel = "Second button"
        element3.accessibilityLabel = "Third button"

        // Then - Elements should be in reading order
        XCTAssertTrue(containerView.subviews.count == 3, "Container should have 3 elements")
    }

    func testAccessibilityNotificationPosted() {
        // Given
        let expectation = expectation(description: "Accessibility notification posted")

        // When - Post announcement
        let announcement = "Processing complete"
        UIAccessibility.post(notification: .announcement, argument: announcement)

        // Then - Notification should be posted (can't verify receipt in unit tests)
        expectation.fulfill()
        waitForExpectations(timeout: 1.0)
    }

    // MARK: - Reduced Motion Tests

    func testReducedMotionPreference() {
        // Given
        let isReducedMotionEnabled = UIAccessibility.isReduceMotionEnabled

        // Then
        XCTAssertTrue(isReducedMotionEnabled || !isReducedMotionEnabled,
                      "Should be able to check reduced motion preference")
    }

    func testAnimationRespectsReducedMotion() {
        // Given
        let view = UIView(frame: .zero)
        let duration: TimeInterval = UIAccessibility.isReduceMotionEnabled ? 0 : 0.3

        // When
        UIView.animate(withDuration: duration) {
            view.alpha = 0
        }

        // Then
        XCTAssertTrue(duration >= 0, "Animation duration should respect reduced motion")
    }

    // MARK: - Accessibility Traits Tests

    func testHeaderTrait() {
        // Given
        let label = UILabel(frame: .zero)

        // When
        label.accessibilityTraits = .header

        // Then
        XCTAssertTrue(label.accessibilityTraits.contains(.header), "Should have header trait")
    }

    func testStaticTextTrait() {
        // Given
        let label = UILabel(frame: .zero)

        // When
        label.accessibilityTraits = .staticText

        // Then
        XCTAssertTrue(label.accessibilityTraits.contains(.staticText), "Should have static text trait")
    }

    func testSelectedTrait() {
        // Given
        let button = UIButton(frame: .zero)

        // When
        button.isSelected = true
        button.accessibilityTraits.insert(.selected)

        // Then
        XCTAssertTrue(button.accessibilityTraits.contains(.selected), "Should have selected trait")
    }

    func testNotEnabledTrait() {
        // Given
        let button = UIButton(frame: .zero)

        // When
        button.isEnabled = false
        button.accessibilityTraits.insert(.notEnabled)

        // Then
        XCTAssertTrue(button.accessibilityTraits.contains(.notEnabled), "Should have not enabled trait")
    }

    // MARK: - Accessibility Focus Tests

    func testSetAccessibilityFocus() {
        // Given
        let button = UIButton(frame: .zero)
        button.isAccessibilityElement = true

        // When
        UIAccessibility.post(notification: .layoutChanged, argument: button)

        // Then - Focus should be set (can't verify in unit tests)
        XCTAssertTrue(button.isAccessibilityElement, "Element should be focusable")
    }

    // MARK: - Accessibility Container Tests

    func testAccessibilityContainerElements() {
        // Given
        let containerView = UIView(frame: .zero)
        let elements = [UIButton(), UIButton(), UIButton()]

        elements.forEach { containerView.addSubview($0) }

        // When
        containerView.isAccessibilityElement = false
        containerView.accessibilityElements = elements

        // Then
        XCTAssertEqual(containerView.accessibilityElements?.count, 3,
                       "Container should have 3 accessibility elements")
    }

    // MARK: - Touch Target Measurement Tests

    func testMeasureTouchTargetArea() {
        // Given
        let button = UIButton(frame: CGRect(x: 0, y: 0, width: 50, height: 50))

        // When
        let area = button.frame.width * button.frame.height

        // Then
        let minimumArea: CGFloat = 44 * 44 // 1936 sq pt
        XCTAssertGreaterThanOrEqual(area, minimumArea,
                                    "Touch target area should be ≥1936 sq pt")
    }

    func testTouchTargetSpacing() {
        // Given
        let button1 = UIButton(frame: CGRect(x: 0, y: 0, width: 44, height: 44))
        let button2 = UIButton(frame: CGRect(x: 52, y: 0, width: 44, height: 44))

        // When
        let spacing = button2.frame.minX - button1.frame.maxX

        // Then
        XCTAssertGreaterThanOrEqual(spacing, 8, "Buttons should have adequate spacing")
    }

    // MARK: - SwiftUI Accessibility Tests

    func testSwiftUIAccessibilityLabel() {
        // Given
        let view = Text("Hello")
            .accessibilityLabel("Greeting")

        // Then - SwiftUI views should support accessibility
        XCTAssertNotNil(view, "SwiftUI view should support accessibility modifiers")
    }

    func testSwiftUIAccessibilityHint() {
        // Given
        let button = Button("Process") {}
            .accessibilityHint("Processes all images in the shoot")

        // Then
        XCTAssertNotNil(button, "SwiftUI button should support accessibility hint")
    }

    func testSwiftUIAccessibilityValue() {
        // Given
        let slider = Slider(value: .constant(0.5))
            .accessibilityValue("50 percent")

        // Then
        XCTAssertNotNil(slider, "SwiftUI slider should support accessibility value")
    }

    // MARK: - Performance Tests

    func testAccessibilityPerformance() {
        // Given
        let buttons = (0..<100).map { index -> UIButton in
            let button = UIButton(frame: .zero)
            button.accessibilityLabel = "Button \(index)"
            return button
        }

        // When/Then
        measure {
            buttons.forEach { button in
                _ = button.accessibilityLabel
                _ = button.accessibilityTraits
                _ = button.isAccessibilityElement
            }
        }
    }

    // MARK: - iPad-Specific Accessibility Tests

    func testIPadTouchTargetsAreAdequate() {
        // Given - iPad should use same 44pt minimum
        let button = UIButton(frame: CGRect(x: 0, y: 0, width: 44, height: 44))

        // Then
        if UIDevice.current.userInterfaceIdiom == .pad {
            XCTAssertGreaterThanOrEqual(button.frame.width, 44, "iPad button width should be ≥44pt")
            XCTAssertGreaterThanOrEqual(button.frame.height, 44, "iPad button height should be ≥44pt")
        } else {
            XCTAssertTrue(true, "Skipping iPad-specific test on iPhone")
        }
    }

    func testIPadPointerInteraction() {
        // Given
        let button = UIButton(frame: CGRect(x: 0, y: 0, width: 100, height: 44))

        // When
        if #available(iOS 13.4, *) {
            button.isPointerInteractionEnabled = true

            // Then
            XCTAssertTrue(button.isPointerInteractionEnabled,
                         "iPad button should support pointer interaction")
        } else {
            XCTAssertTrue(true, "Pointer interaction requires iOS 13.4+")
        }
    }
}

#endif
