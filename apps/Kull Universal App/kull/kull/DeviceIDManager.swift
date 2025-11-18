import Foundation

class DeviceIDManager {
    static let shared = DeviceIDManager()

    private let userDefaultsKey = "kull_device_id"

    private init() {}

    var deviceID: String {
        // Check if device ID already exists
        if let existing = UserDefaults.standard.string(forKey: userDefaultsKey) {
            return existing
        }

        // Generate new device ID
        let newID = UUID().uuidString
        UserDefaults.standard.set(newID, forKey: userDefaultsKey)
        return newID
    }

    func reset() {
        UserDefaults.standard.removeObject(forKey: userDefaultsKey)
    }
}
