import apn from '@parse/node-apn';
import type { NotificationEvent } from "../notificationService";
import type { PushAdapter } from "../pushGateway";

type MobileDevicePayload = {
  token: string;
  platform?: "ios" | "android";
  deviceName?: string;
};

interface PushNotificationData {
  deviceToken: string;
  title: string;
  body: string;
  data: Record<string, any>;
  badge?: number;
}

export class MobilePushAdapter implements PushAdapter {
  name = "mobile-apns";
  private apnProvider: apn.Provider | null = null;

  constructor() {
    this.initializeAPNs();
  }

  private initializeAPNs() {
    try {
      // Check if APNs credentials are configured
      const keyPath = process.env.APNS_KEY_PATH;
      const keyId = process.env.APNS_KEY_ID;
      const teamId = process.env.APNS_TEAM_ID;
      const bundleId = process.env.APNS_BUNDLE_ID || 'com.kull.app';

      if (!keyPath || !keyId || !teamId) {
        console.warn('[APNs] Missing credentials - push notifications disabled');
        console.warn('[APNs] Set APNS_KEY_PATH, APNS_KEY_ID, and APNS_TEAM_ID to enable');
        return;
      }

      this.apnProvider = new apn.Provider({
        token: {
          key: keyPath,
          keyId: keyId,
          teamId: teamId
        },
        production: process.env.NODE_ENV === 'production'
      });

      console.log(`[APNs] Initialized (${process.env.NODE_ENV === 'production' ? 'production' : 'development'})`);
    } catch (error) {
      console.error('[APNs] Failed to initialize:', error);
      this.apnProvider = null;
    }
  }

  async send(event: NotificationEvent): Promise<void> {
    const devices = this.extractDevices(event);
    if (devices.length === 0) {
      console.info(`[mobile push] no registered devices for user=${event.userId} type=${event.type}`);
      return;
    }

    // Send to all iOS devices
    const iosDevices = devices.filter(d => d.platform === 'ios' || !d.platform);

    for (const device of iosDevices) {
      try {
        await this.sendToDevice(event, device);
      } catch (error) {
        console.error(`[APNs] Failed to send to device ${this.maskToken(device.token)}:`, error);
      }
    }
  }

  private async sendToDevice(event: NotificationEvent, device: MobileDevicePayload): Promise<void> {
    if (!this.apnProvider) {
      console.log(
        `[mobile push] SIMULATION user=${event.userId} token=${this.maskToken(device.token)} type=${event.type}`,
        event.payload,
      );
      return;
    }

    const { title, body, badge, data } = this.formatNotification(event);

    const notification = new apn.Notification();
    notification.alert = {
      title,
      body
    };

    if (badge !== undefined) {
      notification.badge = badge;
    }

    notification.sound = 'default';
    notification.payload = data;
    notification.topic = process.env.APNS_BUNDLE_ID || 'com.kull.app';

    try {
      const result = await this.apnProvider.send(notification, device.token);

      if (result.failed.length > 0) {
        console.error(`[APNs] Push failed for ${this.maskToken(device.token)}:`, result.failed);
        throw new Error('APNs push notification failed');
      }

      console.log(`[APNs] Push sent to ${this.maskToken(device.token)} - type=${event.type}`);
    } catch (error) {
      console.error(`[APNs] Error sending push:`, error);
      throw error;
    }
  }

  private formatNotification(event: NotificationEvent): PushNotificationData {
    const { type, payload } = event;

    switch (type) {
      case 'shoot_complete':
        return {
          deviceToken: '',
          title: '✅ Shoot Complete!',
          body: `${payload?.imageCount || 0} images processed and rated`,
          data: {
            type: 'shoot_complete',
            shootId: payload?.shootId,
            imageCount: payload?.imageCount,
            activeCount: payload?.activeCount || 0
          },
          badge: payload?.activeCount || 0
        };

      case 'device_connected':
        return {
          deviceToken: '',
          title: '🔗 Device Connected',
          body: `${payload?.deviceName || 'Device'} is now synced`,
          data: {
            type: 'device_connected',
            deviceName: payload?.deviceName,
            deviceId: payload?.deviceId
          }
        };

      case 'device_disconnected':
        return {
          deviceToken: '',
          title: '⚠️ Device Disconnected',
          body: `${payload?.deviceName || 'Device'} is offline`,
          data: {
            type: 'device_disconnected',
            deviceName: payload?.deviceName,
            deviceId: payload?.deviceId
          }
        };

      case 'credit_low':
        return {
          deviceToken: '',
          title: '💳 Credits Running Low',
          body: `Only ${payload?.remaining || 0} credits remaining`,
          data: {
            type: 'credit_low',
            remaining: payload?.remaining
          }
        };

      case 'shoot_failed':
        return {
          deviceToken: '',
          title: '❌ Shoot Failed',
          body: `Processing failed: ${payload?.reason || 'Unknown error'}`,
          data: {
            type: 'shoot_failed',
            shootId: payload?.shootId,
            reason: payload?.reason
          }
        };

      case 'batch_complete':
        return {
          deviceToken: '',
          title: '✅ Batch Complete',
          body: `${payload?.successCount || 0} of ${payload?.imageCount || 0} images processed`,
          data: {
            type: 'batch_complete',
            batchId: payload?.batchId,
            imageCount: payload?.imageCount,
            successCount: payload?.successCount
          }
        };

      default:
        return {
          deviceToken: '',
          title: 'Kull Notification',
          body: type,
          data: { type, ...payload }
        };
    }
  }

  async sendShootComplete(deviceToken: string, shootId: string, imageCount: number, activeCount: number): Promise<void> {
    if (!this.apnProvider) {
      console.log(`[APNs] SIMULATION shoot_complete for ${this.maskToken(deviceToken)}`);
      return;
    }

    const notification = new apn.Notification();
    notification.alert = {
      title: '✅ Shoot Complete!',
      body: `${imageCount} images processed and rated`
    };
    notification.badge = activeCount;
    notification.sound = 'default';
    notification.payload = {
      type: 'shoot_complete',
      shootId,
      imageCount,
      activeCount
    };
    notification.topic = process.env.APNS_BUNDLE_ID || 'com.kull.app';

    const result = await this.apnProvider.send(notification, deviceToken);

    if (result.failed.length > 0) {
      console.error('[APNs] shoot_complete push failed:', result.failed);
      throw new Error('APNs push notification failed');
    }

    console.log(`[APNs] shoot_complete sent to ${this.maskToken(deviceToken)}`);
  }

  async sendDeviceConnected(deviceToken: string, deviceName: string): Promise<void> {
    if (!this.apnProvider) {
      console.log(`[APNs] SIMULATION device_connected for ${this.maskToken(deviceToken)}`);
      return;
    }

    const notification = new apn.Notification();
    notification.alert = {
      title: '🔗 Device Connected',
      body: `${deviceName} is now synced`
    };
    notification.sound = 'default';
    notification.payload = {
      type: 'device_connected',
      deviceName
    };
    notification.topic = process.env.APNS_BUNDLE_ID || 'com.kull.app';

    const result = await this.apnProvider.send(notification, deviceToken);

    if (result.failed.length > 0) {
      console.error('[APNs] device_connected push failed:', result.failed);
      throw new Error('APNs push notification failed');
    }

    console.log(`[APNs] device_connected sent to ${this.maskToken(deviceToken)}`);
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

  async shutdown(): Promise<void> {
    if (this.apnProvider) {
      await this.apnProvider.shutdown();
      console.log('[APNs] Provider shut down');
    }
  }
}

export default new MobilePushAdapter();
