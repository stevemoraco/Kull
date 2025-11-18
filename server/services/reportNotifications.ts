import type { ShootReport } from "./reportBuilder";
import { notificationBus, type NotificationChannel } from "./notificationService";

export type ReportNotificationUser = {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
};

export function emitShootCompletedNotification(
  user: ReportNotificationUser | undefined,
  report: ShootReport,
) {
  if (!user) return;
  const channels: NotificationChannel[] = ["desktop", "mobile"];
  if (user.email) channels.push("email");
  notificationBus.emitEvent({
    type: "shoot_completed",
    userId: user.id,
    shootId: undefined,
    payload: {
      report,
      shootName: report.shootName,
      recipientEmail: user.email ?? undefined,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    },
    channels,
  });
}
