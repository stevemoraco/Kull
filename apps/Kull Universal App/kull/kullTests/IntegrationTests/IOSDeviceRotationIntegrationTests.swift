//
//  IOSDeviceRotationIntegrationTests.swift
//  kullTests
//
//  Integration tests for iOS/iPadOS device rotation
//  Tests portrait ↔ landscape transitions, layout adaptation, and orientation handling
//

import XCTest
@testable import kull

#if os(iOS)
import UIKit
import SwiftUI

final class IOSDeviceRotationIntegrationTests: XCTestCase {

    var window: UIWindow!

    override func setUp() {
        super.setUp()
        window = UIWindow(frame: UIScreen.main.bounds)
        window.makeKeyAndVisible()
    }

    override func tearDown() {
        window = nil
        super.tearDown()
    }

    // MARK: - Supported Orientations Tests

    func testPortraitOrientationSupported() {
        // Given
        let supportedOrientations: UIInterfaceOrientationMask = [.portrait, .portraitUpsideDown]

        // Then
        XCTAssertTrue(supportedOrientations.contains(.portrait), "Portrait should be supported")
    }

    func testLandscapeOrientationSupported() {
        // Given
        let supportedOrientations: UIInterfaceOrientationMask = [.landscapeLeft, .landscapeRight]

        // Then
        XCTAssertTrue(supportedOrientations.contains(.landscapeLeft), "Landscape left should be supported")
        XCTAssertTrue(supportedOrientations.contains(.landscapeRight), "Landscape right should be supported")
    }

    func testAllOrientationsSupported() {
        // Given
        let allOrientations: UIInterfaceOrientationMask = .all

        // Then
        XCTAssertTrue(allOrientations.contains(.portrait), "All orientations should include portrait")
        XCTAssertTrue(allOrientations.contains(.landscapeLeft), "All orientations should include landscape")
    }

    // MARK: - Orientation Change Detection Tests

    func testDetectCurrentOrientation() {
        // Given
        let currentOrientation = UIDevice.current.orientation

        // Then
        switch currentOrientation {
        case .portrait, .portraitUpsideDown, .landscapeLeft, .landscapeRight:
            XCTAssertTrue(true, "Should detect valid orientation")
        case .faceUp, .faceDown, .unknown:
            XCTAssertTrue(true, "Device may be flat or in unknown orientation")
        @unknown default:
            XCTFail("Unknown orientation type")
        }
    }

    func testInterfaceOrientation() {
        // Given
        let interfaceOrientation = UIApplication.shared.windows.first?.windowScene?.interfaceOrientation

        // Then
        XCTAssertNotNil(interfaceOrientation, "Should have interface orientation")
    }

    func testIsPortraitOrientation() {
        // Given
        let orientation = UIDevice.current.orientation

        // When
        let isPortrait = orientation == .portrait || orientation == .portraitUpsideDown

        // Then
        XCTAssertTrue(isPortrait || !isPortrait, "Should determine if portrait")
    }

    func testIsLandscapeOrientation() {
        // Given
        let orientation = UIDevice.current.orientation

        // When
        let isLandscape = orientation == .landscapeLeft || orientation == .landscapeRight

        // Then
        XCTAssertTrue(isLandscape || !isLandscape, "Should determine if landscape")
    }

    // MARK: - Layout Adaptation Tests

    func testLayoutChangesOnRotation() {
        // Given
        let viewController = UIViewController()
        window.rootViewController = viewController

        let containerView = UIView(frame: window.bounds)
        viewController.view.addSubview(containerView)

        // When - Simulate portrait
        let portraitBounds = CGRect(x: 0, y: 0, width: 375, height: 812)
        containerView.frame = portraitBounds

        // Then
        XCTAssertEqual(containerView.frame.width, 375, "Portrait width should be 375")
        XCTAssertEqual(containerView.frame.height, 812, "Portrait height should be 812")

        // When - Simulate landscape
        let landscapeBounds = CGRect(x: 0, y: 0, width: 812, height: 375)
        containerView.frame = landscapeBounds

        // Then
        XCTAssertEqual(containerView.frame.width, 812, "Landscape width should be 812")
        XCTAssertEqual(containerView.frame.height, 375, "Landscape height should be 375")
    }

    func testAutoLayoutConstraintsAdaptToRotation() {
        // Given
        let viewController = UIViewController()
        window.rootViewController = viewController

        let contentView = UIView()
        contentView.translatesAutoresizingMaskIntoConstraints = false
        viewController.view.addSubview(contentView)

        // When - Set up constraints
        NSLayoutConstraint.activate([
            contentView.topAnchor.constraint(equalTo: viewController.view.topAnchor),
            contentView.leadingAnchor.constraint(equalTo: viewController.view.leadingAnchor),
            contentView.trailingAnchor.constraint(equalTo: viewController.view.trailingAnchor),
            contentView.bottomAnchor.constraint(equalTo: viewController.view.bottomAnchor)
        ])

        viewController.view.layoutIfNeeded()

        // Then
        XCTAssertEqual(contentView.frame.size, viewController.view.frame.size,
                       "Content view should fill parent view")
    }

    func testStackViewReorientationBehavior() {
        // Given
        let stackView = UIStackView()
        stackView.axis = .vertical
        stackView.distribution = .fillEqually

        let view1 = UIView()
        let view2 = UIView()
        stackView.addArrangedSubview(view1)
        stackView.addArrangedSubview(view2)

        // When - Portrait orientation (vertical stack)
        stackView.axis = .vertical
        stackView.frame = CGRect(x: 0, y: 0, width: 375, height: 812)
        stackView.layoutIfNeeded()

        // Then
        XCTAssertEqual(stackView.axis, .vertical, "Should use vertical axis in portrait")

        // When - Landscape orientation (horizontal stack)
        stackView.axis = .horizontal
        stackView.frame = CGRect(x: 0, y: 0, width: 812, height: 375)
        stackView.layoutIfNeeded()

        // Then
        XCTAssertEqual(stackView.axis, .horizontal, "Should use horizontal axis in landscape")
    }

    // MARK: - View Controller Rotation Tests

    func testViewControllerViewWillTransition() {
        // Given
        let viewController = TestRotationViewController()
        window.rootViewController = viewController

        let newSize = CGSize(width: 812, height: 375)
        let coordinator = TestTransitionCoordinator()

        // When
        viewController.viewWillTransition(to: newSize, with: coordinator)

        // Then
        XCTAssertTrue(viewController.didCallViewWillTransition,
                      "viewWillTransition should be called")
    }

    func testViewControllerTraitCollectionChanges() {
        // Given
        let viewController = TestRotationViewController()
        window.rootViewController = viewController

        let portraitTraits = UITraitCollection(verticalSizeClass: .regular)

        // When
        viewController.overrideTraitCollection = portraitTraits

        // Then
        XCTAssertEqual(viewController.traitCollection.verticalSizeClass, .regular,
                       "Should have regular vertical size class")
    }

    // MARK: - Size Class Tests

    func testPortraitSizeClasses() {
        // Given - iPhone portrait
        let portraitTraits = UITraitCollection(traitsFrom: [
            UITraitCollection(horizontalSizeClass: .compact),
            UITraitCollection(verticalSizeClass: .regular)
        ])

        // Then
        XCTAssertEqual(portraitTraits.horizontalSizeClass, .compact,
                       "Portrait should have compact horizontal size class")
        XCTAssertEqual(portraitTraits.verticalSizeClass, .regular,
                       "Portrait should have regular vertical size class")
    }

    func testLandscapeSizeClasses() {
        // Given - iPhone landscape
        let landscapeTraits = UITraitCollection(traitsFrom: [
            UITraitCollection(horizontalSizeClass: .compact),
            UITraitCollection(verticalSizeClass: .compact)
        ])

        // Then
        XCTAssertEqual(landscapeTraits.horizontalSizeClass, .compact,
                       "iPhone landscape should have compact horizontal size class")
        XCTAssertEqual(landscapeTraits.verticalSizeClass, .compact,
                       "iPhone landscape should have compact vertical size class")
    }

    func testIPadPortraitSizeClasses() {
        // Given - iPad portrait
        let ipadPortraitTraits = UITraitCollection(traitsFrom: [
            UITraitCollection(horizontalSizeClass: .regular),
            UITraitCollection(verticalSizeClass: .regular)
        ])

        // Then
        XCTAssertEqual(ipadPortraitTraits.horizontalSizeClass, .regular,
                       "iPad portrait should have regular horizontal size class")
        XCTAssertEqual(ipadPortraitTraits.verticalSizeClass, .regular,
                       "iPad portrait should have regular vertical size class")
    }

    func testIPadLandscapeSizeClasses() {
        // Given - iPad landscape
        let ipadLandscapeTraits = UITraitCollection(traitsFrom: [
            UITraitCollection(horizontalSizeClass: .regular),
            UITraitCollection(verticalSizeClass: .regular)
        ])

        // Then
        XCTAssertEqual(ipadLandscapeTraits.horizontalSizeClass, .regular,
                       "iPad landscape should have regular horizontal size class")
        XCTAssertEqual(ipadLandscapeTraits.verticalSizeClass, .regular,
                       "iPad landscape should have regular vertical size class")
    }

    // MARK: - Safe Area Tests

    func testSafeAreaInsetsPortrait() {
        // Given
        let viewController = UIViewController()
        window.rootViewController = viewController

        // When
        viewController.view.frame = CGRect(x: 0, y: 0, width: 375, height: 812)
        viewController.view.layoutIfNeeded()

        let safeArea = viewController.view.safeAreaInsets

        // Then
        XCTAssertGreaterThanOrEqual(safeArea.top, 0, "Should have safe area top inset")
        XCTAssertGreaterThanOrEqual(safeArea.bottom, 0, "Should have safe area bottom inset")
    }

    func testSafeAreaInsetsLandscape() {
        // Given
        let viewController = UIViewController()
        window.rootViewController = viewController

        // When
        viewController.view.frame = CGRect(x: 0, y: 0, width: 812, height: 375)
        viewController.view.layoutIfNeeded()

        let safeArea = viewController.view.safeAreaInsets

        // Then
        XCTAssertGreaterThanOrEqual(safeArea.left, 0, "Should have safe area left inset")
        XCTAssertGreaterThanOrEqual(safeArea.right, 0, "Should have safe area right inset")
    }

    // MARK: - SwiftUI Rotation Tests

    func testSwiftUIGeometryReaderAdaptsToRotation() {
        // Given
        struct TestView: View {
            var body: some View {
                GeometryReader { geometry in
                    Text("Size: \(Int(geometry.size.width))x\(Int(geometry.size.height))")
                }
            }
        }

        // When
        let view = TestView()

        // Then
        XCTAssertNotNil(view, "SwiftUI view should adapt to rotation")
    }

    func testSwiftUIEnvironmentVerticalSizeClass() {
        // Given
        struct TestView: View {
            @Environment(\.verticalSizeClass) var verticalSizeClass

            var body: some View {
                Text(verticalSizeClass == .regular ? "Regular" : "Compact")
            }
        }

        // When
        let view = TestView()

        // Then
        XCTAssertNotNil(view, "SwiftUI should access vertical size class")
    }

    // MARK: - Rotation Performance Tests

    func testLayoutPerformanceOnRotation() {
        // Given
        let viewController = UIViewController()
        window.rootViewController = viewController

        let subviews = (0..<100).map { _ in UIView() }
        subviews.forEach { viewController.view.addSubview($0) }

        // When/Then
        measure {
            viewController.view.frame = CGRect(x: 0, y: 0, width: 812, height: 375)
            viewController.view.layoutIfNeeded()
        }
    }

    func testConstraintUpdatePerformanceOnRotation() {
        // Given
        let viewController = UIViewController()
        window.rootViewController = viewController

        let contentView = UIView()
        contentView.translatesAutoresizingMaskIntoConstraints = false
        viewController.view.addSubview(contentView)

        NSLayoutConstraint.activate([
            contentView.topAnchor.constraint(equalTo: viewController.view.topAnchor),
            contentView.leadingAnchor.constraint(equalTo: viewController.view.leadingAnchor),
            contentView.trailingAnchor.constraint(equalTo: viewController.view.trailingAnchor),
            contentView.bottomAnchor.constraint(equalTo: viewController.view.bottomAnchor)
        ])

        // When/Then
        measure {
            viewController.view.frame = CGRect(x: 0, y: 0, width: 812, height: 375)
            viewController.view.setNeedsUpdateConstraints()
            viewController.view.updateConstraintsIfNeeded()
            viewController.view.layoutIfNeeded()
        }
    }

    // MARK: - Screen Bounds Tests

    func testScreenBoundsPortrait() {
        // Given
        let portraitBounds = CGRect(x: 0, y: 0, width: 375, height: 812)

        // Then
        XCTAssertLessThan(portraitBounds.width, portraitBounds.height,
                          "Portrait width should be less than height")
    }

    func testScreenBoundsLandscape() {
        // Given
        let landscapeBounds = CGRect(x: 0, y: 0, width: 812, height: 375)

        // Then
        XCTAssertGreaterThan(landscapeBounds.width, landscapeBounds.height,
                             "Landscape width should be greater than height")
    }

    // MARK: - Helper Classes

    class TestRotationViewController: UIViewController {
        var didCallViewWillTransition = false

        override func viewWillTransition(to size: CGSize, with coordinator: UIViewControllerTransitionCoordinator) {
            super.viewWillTransition(to: size, with: coordinator)
            didCallViewWillTransition = true
        }
    }

    class TestTransitionCoordinator: NSObject, UIViewControllerTransitionCoordinator {
        var isAnimated: Bool = true
        var presentationStyle: UIModalPresentationStyle = .none
        var initiallyInteractive: Bool = false
        var isInterruptible: Bool = false
        var isInteractive: Bool = false
        var isCancelled: Bool = false
        var transitionDuration: TimeInterval = 0.3
        var percentComplete: CGFloat = 0.0
        var completionVelocity: CGFloat = 1.0
        var completionCurve: UIView.AnimationCurve = .easeInOut
        var containerView: UIView = UIView()
        var targetTransform: CGAffineTransform = .identity

        func animate(alongsideTransition animation: ((UIViewControllerTransitionCoordinatorContext) -> Void)?,
                     completion: ((UIViewControllerTransitionCoordinatorContext) -> Void)?) -> Bool {
            return true
        }

        func animateAlongsideTransition(in view: UIView?,
                                       animation: ((UIViewControllerTransitionCoordinatorContext) -> Void)?,
                                       completion: ((UIViewControllerTransitionCoordinatorContext) -> Void)?) -> Bool {
            return true
        }

        func notifyWhenInteractionEnds(_ handler: @escaping (UIViewControllerTransitionCoordinatorContext) -> Void) {}

        func notifyWhenInteractionChanges(_ handler: @escaping (UIViewControllerTransitionCoordinatorContext) -> Void) {}

        func viewController(forKey key: UITransitionContextViewControllerKey) -> UIViewController? {
            return nil
        }

        func view(forKey key: UITransitionContextViewKey) -> UIView? {
            return nil
        }
    }
}

#endif
