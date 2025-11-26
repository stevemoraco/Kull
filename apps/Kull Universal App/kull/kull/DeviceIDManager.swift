import Foundation

final class DeviceIDManager {
    static let shared = DeviceIDManager()

    private let userDefaultsKey = "kull_device_id"
    private let queue = DispatchQueue(label: "com.kull.deviceid", attributes: .concurrent)
    private var cachedID: String?

    private init() {}

    var deviceID: String {
        queue.sync(flags: .barrier) {
            if let cachedID {
                return cachedID
            }

            if let stored = UserDefaults.standard.string(forKey: userDefaultsKey) {
                cachedID = stored
                return stored
            }

            let newID = UUID().uuidString.uppercased()
            cachedID = newID
            UserDefaults.standard.set(newID, forKey: userDefaultsKey)
            return newID
        }
    }

    func reset() {
        queue.sync(flags: .barrier) {
            cachedID = nil
            UserDefaults.standard.removeObject(forKey: userDefaultsKey)
        }
    }
}
