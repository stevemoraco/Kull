import Foundation
import UserNotifications

final class RunNotifier {
    func notifyCompletion(processed: Int, total: Int) {
        let center = UNUserNotificationCenter.current()
        center.requestAuthorization(options: [.alert, .sound]) { _, _ in }
        let content = UNMutableNotificationContent()
        content.title = "Kull: Cull Complete"
        content.body = "Processed \(processed) of \(total) images."
        let request = UNNotificationRequest(identifier: UUID().uuidString, content: content, trigger: nil)
        center.add(request)
    }
}

