import { notificationBus, NotificationBus, type NotificationChannel, type NotificationEvent } from "./notificationService";

export interface PushAdapter {
  name: string;
  send(event: NotificationEvent): Promise<void>;
}

export class PushGateway {
  private adapters: Map<NotificationChannel, PushAdapter[]> = new Map();
  private handler: (event: NotificationEvent) => void;

  constructor(private bus: NotificationBus = notificationBus) {
    this.handler = (event) => {
      this.dispatch(event).catch((error) => {
        console.error("Notification dispatch failed", error);
      });
    };
    this.bus.on("notification", this.handler);
  }

  register(channel: NotificationChannel, adapter: PushAdapter) {
    const list = this.adapters.get(channel) ?? [];
    list.push(adapter);
    this.adapters.set(channel, list);
  }

  dispose() {
    this.bus.off("notification", this.handler);
    this.adapters.clear();
  }

  private async dispatch(event: NotificationEvent) {
    const deliveries: Promise<void>[] = [];
    for (const channel of event.channels) {
      const adapters = this.adapters.get(channel) ?? [];
      for (const adapter of adapters) {
        deliveries.push(
          adapter.send(event).catch((error) => {
            console.error(`[push:${adapter.name}] failed`, error);
          }),
        );
      }
    }
    await Promise.all(deliveries);
  }
}

export const pushGateway = new PushGateway();
