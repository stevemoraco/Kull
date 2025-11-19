import { EventEmitter } from "events";

export type NotificationChannel = "email" | "desktop" | "mobile";

export type NotificationEvent = {
  type: "shoot_completed" | "shoot_failed" | "credit_low" | "shoot_complete" | "device_connected" | "device_disconnected" | "batch_complete";
  userId: string;
  shootId?: string;
  payload: Record<string, unknown>;
  channels: NotificationChannel[];
};

export class NotificationBus extends EventEmitter {
  emitEvent(event: NotificationEvent) {
    this.emit("notification", event);
  }
}

export const notificationBus = new NotificationBus();
