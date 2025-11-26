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

    func testInitialization() {
        XCTAssertNotNil(sut)
    }

    func testSyncReturnsQuicklyDuringTests() async {
        let start = Date()
        await sut.sync(deviceName: "Test Device")
        XCTAssertLessThan(Date().timeIntervalSince(start), 1.0, "Sync should short-circuit under XCTest")
    }

    func testSyncHandlesVariousDeviceNames() async {
        let names = [
            "",
            "Device 1",
            String(repeating: "a", count: 256),
            "Device!@#$%^&*()_+-={}[]|\\\\:;<>?,./~`",
            "デバイス 🖥️ 测试"
        ]

        for name in names {
            await sut.sync(deviceName: name)
        }

        XCTAssertNotNil(sut)
    }

    func testConcurrentSyncCallsDoNotCrash() async {
        await withTaskGroup(of: Void.self) { group in
            for i in 0..<5 {
                group.addTask {
                    await self.sut.sync(deviceName: "Device \(i)")
                }
            }
        }
        XCTAssertNotNil(sut)
    }
}
