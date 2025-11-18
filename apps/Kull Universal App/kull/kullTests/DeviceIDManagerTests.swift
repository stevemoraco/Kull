import XCTest
@testable import kull

final class DeviceIDManagerTests: XCTestCase {
    override func tearDown() {
        // Reset device ID after each test
        DeviceIDManager.shared.reset()
        super.tearDown()
    }

    func testDeviceIDGeneration() {
        // Reset to ensure clean state
        DeviceIDManager.shared.reset()

        let deviceID = DeviceIDManager.shared.deviceID

        XCTAssertFalse(deviceID.isEmpty, "Device ID should not be empty")
        XCTAssertTrue(deviceID.count > 0, "Device ID should have a length")
    }

    func testDeviceIDPersistence() {
        // Reset to start fresh
        DeviceIDManager.shared.reset()

        let id1 = DeviceIDManager.shared.deviceID
        let id2 = DeviceIDManager.shared.deviceID

        XCTAssertEqual(id1, id2, "Device ID should be consistent across multiple calls")
        XCTAssertFalse(id1.isEmpty, "Device ID should not be empty")
    }

    func testDeviceIDReset() {
        DeviceIDManager.shared.reset()
        let id1 = DeviceIDManager.shared.deviceID

        DeviceIDManager.shared.reset()
        let id2 = DeviceIDManager.shared.deviceID

        XCTAssertNotEqual(id1, id2, "Device ID should change after reset")
    }

    func testDeviceIDIsUUID() {
        DeviceIDManager.shared.reset()
        let deviceID = DeviceIDManager.shared.deviceID

        // Verify it's a valid UUID format
        let uuid = UUID(uuidString: deviceID)
        XCTAssertNotNil(uuid, "Device ID should be a valid UUID")
    }

    func testMultipleResetsGenerateUniqueIDs() {
        DeviceIDManager.shared.reset()
        let id1 = DeviceIDManager.shared.deviceID

        DeviceIDManager.shared.reset()
        let id2 = DeviceIDManager.shared.deviceID

        DeviceIDManager.shared.reset()
        let id3 = DeviceIDManager.shared.deviceID

        // All three should be different
        XCTAssertNotEqual(id1, id2)
        XCTAssertNotEqual(id2, id3)
        XCTAssertNotEqual(id1, id3)
    }

    func testDeviceIDPersistsInUserDefaults() {
        DeviceIDManager.shared.reset()
        let originalID = DeviceIDManager.shared.deviceID

        // Manually retrieve from UserDefaults
        let storedID = UserDefaults.standard.string(forKey: "kull_device_id")

        XCTAssertEqual(originalID, storedID, "Device ID should be stored in UserDefaults")
    }

    func testResetClearsUserDefaults() {
        DeviceIDManager.shared.reset()
        _ = DeviceIDManager.shared.deviceID

        // Verify it's stored
        var storedID = UserDefaults.standard.string(forKey: "kull_device_id")
        XCTAssertNotNil(storedID)

        // Reset and verify it's cleared
        DeviceIDManager.shared.reset()
        storedID = UserDefaults.standard.string(forKey: "kull_device_id")
        XCTAssertNil(storedID, "Device ID should be removed from UserDefaults after reset")
    }

    func testDeviceIDAccessAfterReset() {
        DeviceIDManager.shared.reset()

        // Access should regenerate
        let newID = DeviceIDManager.shared.deviceID
        XCTAssertFalse(newID.isEmpty)

        // Should persist
        let sameID = DeviceIDManager.shared.deviceID
        XCTAssertEqual(newID, sameID)
    }

    func testConcurrentAccess() {
        DeviceIDManager.shared.reset()

        let expectation = XCTestExpectation(description: "Concurrent access")
        var ids: [String] = []
        let queue = DispatchQueue(label: "test.concurrent", attributes: .concurrent)

        // Access device ID from multiple threads
        for _ in 0..<10 {
            queue.async {
                let id = DeviceIDManager.shared.deviceID
                DispatchQueue.main.async {
                    ids.append(id)
                    if ids.count == 10 {
                        expectation.fulfill()
                    }
                }
            }
        }

        wait(for: [expectation], timeout: 5.0)

        // All IDs should be the same
        let uniqueIDs = Set(ids)
        XCTAssertEqual(uniqueIDs.count, 1, "All concurrent accesses should return the same device ID")
    }

    func testDeviceIDFormatConsistency() {
        DeviceIDManager.shared.reset()

        for _ in 0..<5 {
            DeviceIDManager.shared.reset()
            let deviceID = DeviceIDManager.shared.deviceID

            // Should be uppercase UUID format (8-4-4-4-12 characters)
            let components = deviceID.components(separatedBy: "-")
            XCTAssertEqual(components.count, 5, "UUID should have 5 components separated by hyphens")
        }
    }

    func testSingletonInstance() {
        let instance1 = DeviceIDManager.shared
        let instance2 = DeviceIDManager.shared

        XCTAssertTrue(instance1 === instance2, "DeviceIDManager should be a singleton")
    }
}
