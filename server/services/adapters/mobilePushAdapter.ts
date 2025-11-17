import type { NotificationEvent } from "../notificationService";
import type { PushAdapter } from "../pushGateway";

type MobileDevicePayload = {
  token: string;
  platform?: "ios" | "android";
  deviceName?: string;
};

export class MobilePushAdapter implements PushAdapter {
  name = "mobile-placeholder";

  async send(event: NotificationEvent): Promise<void> {
    const devices = this.extractDevices(event);
    if (devices.length === 0) {
      console.info(`[mobile push] no registered devices for user=${event.userId} type=${event.type}`);
      return;
    }
    for (const device of devices) {
      console.log(
        `[mobile push] user=${event.userId} token=${this.maskToken(device.token)} platform=${device.platform ?? "unknown"} type=${event.type}`,
        event.payload,
      );
    }
  }

  private extractDevices(event: NotificationEvent): MobileDevicePayload[] {
    const { payload } = event;
    if (!payload) return [];
    const raw = (payload as Record<string, unknown>).mobileDevices;
    if (!Array.isArray(raw)) return [];
    return raw.filter((candidate: unknown): candidate is MobileDevicePayload => {
      return (
        typeof candidate === "object" &&
        candidate !== null &&
        typeof (candidate as MobileDevicePayload).token === "string"
      );
    });
  }

  private maskToken(token: string) {
    if (token.length <= 8) return token;
    return `${token.slice(0, 4)}…${token.slice(-4)}`;
  }
}
