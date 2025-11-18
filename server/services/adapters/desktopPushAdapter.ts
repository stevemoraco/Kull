import type { NotificationEvent } from "../notificationService";
import type { PushAdapter } from "../pushGateway";

export class DesktopPushAdapter implements PushAdapter {
  name = "desktop-placeholder";

  async send(event: NotificationEvent): Promise<void> {
    console.log(`[desktop push] user=${event.userId} type=${event.type}`, event.payload);
  }
}
