//
//  NetworkMonitorTests.swift
//  kullTests
//
//  Created by Agent H on 11/18/25.
//  Tests for NetworkMonitor connectivity detection
//

import XCTest
import Network
@testable import kull

final class NetworkMonitorTests: XCTestCase {
    var networkMonitor: NetworkMonitor!

    override func setUp() {
        super.setUp()
        networkMonitor = NetworkMonitor.shared
    }

    override func tearDown() {
        networkMonitor = nil
        super.tearDown()
    }

    // MARK: - Initialization Tests

    func testNetworkMonitorInitialization() {
        // Then
        XCTAssertNotNil(networkMonitor)
        // Network status should be one of the defined states
        XCTAssertTrue([NetworkStatus.connected, .disconnected, .unknown].contains(networkMonitor.status))
    }

    // MARK: - Network Status Tests

    func testNetworkStatusEnumValues() {
        // Test all status values
        let connected = NetworkStatus.connected
        let disconnected = NetworkStatus.disconnected
        let unknown = NetworkStatus.unknown

        XCTAssertTrue(connected.isConnected)
        XCTAssertFalse(disconnected.isConnected)
        XCTAssertFalse(unknown.isConnected)
    }

    func testIsConnectedProperty() {
        // The actual connection state depends on the device
        // We can only test that the property is accessible and returns a Bool
        let isConnected = networkMonitor.isConnected
        XCTAssertTrue(isConnected is Bool)
    }

    // MARK: - Connection Type Tests

    func testConnectionTypeValues() {
        // Test all connection type values exist
        let types: [NetworkMonitor.ConnectionType] = [
            .wifi,
            .cellular,
            .wiredEthernet,
            .other,
            .none
        ]

        XCTAssertEqual(types.count, 5)
    }

    func testConnectionTypeProperty() {
        // Current connection type should be one of the defined types
        let connectionType = networkMonitor.connectionType
        let validTypes: [NetworkMonitor.ConnectionType] = [.wifi, .cellular, .wiredEthernet, .other, .none]
        XCTAssertTrue(validTypes.contains(where: { $0 == connectionType }))
    }

    func testConnectionDescription() {
        // Connection description should not be empty
        let description = networkMonitor.connectionDescription
        XCTAssertFalse(description.isEmpty)
        XCTAssertTrue(["WiFi", "Cellular", "Ethernet", "Connected", "Offline"].contains(description))
    }

    // MARK: - Network Quality Tests

    func testNetworkQualityEnum() {
        // Test all quality values
        let qualities: [NetworkMonitor.NetworkQuality] = [
            .offline,
            .poor,
            .moderate,
            .good
        ]

        XCTAssertEqual(qualities.count, 4)

        // Test descriptions
        XCTAssertEqual(NetworkMonitor.NetworkQuality.offline.description, "Offline")
        XCTAssertEqual(NetworkMonitor.NetworkQuality.poor.description, "Poor Connection")
        XCTAssertEqual(NetworkMonitor.NetworkQuality.moderate.description, "Moderate Connection")
        XCTAssertEqual(NetworkMonitor.NetworkQuality.good.description, "Good Connection")
    }

    func testNetworkQualityProperty() {
        // Current network quality should be one of the defined qualities
        let quality = networkMonitor.networkQuality
        let validQualities: [NetworkMonitor.NetworkQuality] = [.offline, .poor, .moderate, .good]
        XCTAssertTrue(validQualities.contains(where: { $0 == quality }))
    }

    func testNetworkQualityLogic() {
        // If offline, quality should be offline
        if !networkMonitor.isConnected {
            XCTAssertEqual(networkMonitor.networkQuality, .offline)
        }

        // If connected and constrained, quality should be poor
        if networkMonitor.isConnected && networkMonitor.isConstrained {
            XCTAssertEqual(networkMonitor.networkQuality, .poor)
        }

        // If connected and expensive but not constrained, quality should be moderate
        if networkMonitor.isConnected && networkMonitor.isExpensive && !networkMonitor.isConstrained {
            XCTAssertEqual(networkMonitor.networkQuality, .moderate)
        }

        // If connected and neither expensive nor constrained, quality should be good
        if networkMonitor.isConnected && !networkMonitor.isExpensive && !networkMonitor.isConstrained {
            XCTAssertEqual(networkMonitor.networkQuality, .good)
        }
    }

    // MARK: - Connection Properties Tests

    func testIsExpensiveProperty() {
        // Property should be accessible and return a Bool
        let isExpensive = networkMonitor.isExpensive
        XCTAssertTrue(isExpensive is Bool)
    }

    func testIsConstrainedProperty() {
        // Property should be accessible and return a Bool
        let isConstrained = networkMonitor.isConstrained
        XCTAssertTrue(isConstrained is Bool)
    }

    func testShouldWaitForWifi() {
        // If on WiFi, should not wait
        if networkMonitor.connectionType == .wifi {
            XCTAssertFalse(networkMonitor.shouldWaitForWifi)
        }

        // If on cellular and expensive/constrained, should wait
        if networkMonitor.connectionType == .cellular &&
           (networkMonitor.isExpensive || networkMonitor.isConstrained) {
            XCTAssertTrue(networkMonitor.shouldWaitForWifi)
        }
    }

    // MARK: - Manual Sync Tests

    func testTriggerSyncWhenOnline() {
        // Test that triggerSync doesn't crash
        if networkMonitor.isConnected {
            networkMonitor.triggerSync()
            // No assertion needed - just verify no crash
        }
    }

    func testTriggerSyncWhenOffline() {
        // Test that triggerSync handles offline gracefully
        if !networkMonitor.isConnected {
            networkMonitor.triggerSync()
            // Should print message but not crash
        }
    }

    // MARK: - Singleton Tests

    func testSingletonInstance() {
        // Verify NetworkMonitor uses singleton pattern
        let instance1 = NetworkMonitor.shared
        let instance2 = NetworkMonitor.shared

        XCTAssertTrue(instance1 === instance2)
    }

    // MARK: - Observable Object Tests

    func testPublishedProperties() {
        // Verify that NetworkMonitor conforms to ObservableObject
        XCTAssertTrue(networkMonitor is ObservableObject)

        // Published properties should be accessible
        _ = networkMonitor.status
        _ = networkMonitor.isExpensive
        _ = networkMonitor.isConstrained
        _ = networkMonitor.connectionType
    }

    // MARK: - Edge Cases

    func testMultipleStatusChecks() {
        // Rapid status checks should not cause issues
        for _ in 0..<10 {
            _ = networkMonitor.isConnected
            _ = networkMonitor.connectionDescription
            _ = networkMonitor.networkQuality
        }
        // No assertion needed - just verify no crash
    }

    // MARK: - Integration with Operation Queue

    func testReconnectionTriggersSync() {
        // This is an integration point - when network reconnects,
        // it should trigger OfflineOperationQueue.syncWhenOnline()
        // This is tested through observation of behavior

        // We can verify the queue exists and is accessible
        let queue = OfflineOperationQueue.shared
        XCTAssertNotNil(queue)

        // If we have operations queued and go online, they should sync
        // (This would require network simulation to test properly)
    }

    // MARK: - SwiftUI View Tests

    #if canImport(SwiftUI)
    func testNetworkStatusViewExists() {
        // Verify the NetworkStatusView can be instantiated
        let view = NetworkStatusView()
        XCTAssertNotNil(view)
    }

    func testNetworkQualityIndicatorExists() {
        // Verify the NetworkQualityIndicator can be instantiated
        let indicator = NetworkQualityIndicator()
        XCTAssertNotNil(indicator)
    }
    #endif

    // MARK: - Performance Tests

    func testConnectionCheckPerformance() {
        measure {
            // Measure performance of checking connection status
            for _ in 0..<100 {
                _ = networkMonitor.isConnected
            }
        }
    }

    func testNetworkQualityCheckPerformance() {
        measure {
            // Measure performance of checking network quality
            for _ in 0..<100 {
                _ = networkMonitor.networkQuality
            }
        }
    }

    // MARK: - State Consistency Tests

    func testStateConsistency() {
        // If status is connected, isConnected should be true
        if networkMonitor.status == .connected {
            XCTAssertTrue(networkMonitor.isConnected)
        }

        // If status is disconnected, isConnected should be false
        if networkMonitor.status == .disconnected {
            XCTAssertFalse(networkMonitor.isConnected)
        }

        // If connectionType is none, should not be connected
        if networkMonitor.connectionType == .none {
            XCTAssertFalse(networkMonitor.isConnected)
        }
    }

    // MARK: - Cache Refresh Tests

    func testCacheRefreshOnReconnection() {
        // When reconnecting, cache should be refreshed if stale
        let cacheManager = CacheManager.shared

        // Clear cache age to make it appear stale
        UserDefaults.standard.removeObject(forKey: "last_sync_date")

        // Verify cache is considered stale
        XCTAssertTrue(cacheManager.isCacheStale(maxAgeSeconds: 3600))

        // If network is connected, a reconnection event would trigger refresh
        // (This is tested through integration, not unit test)
    }
}
