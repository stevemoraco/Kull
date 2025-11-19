import { emailTemplatesReport } from "../../emailTemplatesReport";
import type { ShootReport } from "../reportBuilder";
import type { NotificationEvent } from "../notificationService";
import type { PushAdapter } from "../pushGateway";

type ReportPayload = {
  report?: ShootReport;
  recipientEmail?: string;
};

type EmailSender = (args: { to: string; subject: string; html: string; text: string }) => Promise<unknown>;

export class EmailNotificationAdapter implements PushAdapter {
  name = "email-report";

  constructor(private deliver?: EmailSender) {}

  async send(event: NotificationEvent): Promise<void> {
    const payload = this.parsePayload(event);
    if (!payload || !payload.report || !payload.recipientEmail) return;

    const template = emailTemplatesReport.shootReport(payload.report);
    const deliver = await this.ensureDeliver();
    await deliver({
      to: payload.recipientEmail,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  private async ensureDeliver(): Promise<EmailSender> {
    if (this.deliver) return this.deliver;
    const module = await import("../../emailService");
    this.deliver = module.sendEmail;
    return module.sendEmail;
  }

  private parsePayload(event: NotificationEvent): ReportPayload | undefined {
    const raw = event.payload as Record<string, unknown> | undefined;
    if (!raw) return undefined;
    const report = raw.report as ShootReport | undefined;
    const recipientEmail = raw.recipientEmail as string | undefined;
    if (!report || !recipientEmail) return undefined;
    return { report, recipientEmail };
  }
}
