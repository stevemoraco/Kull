import { pushGateway } from "./pushGateway";
import { DesktopPushAdapter } from "./adapters/desktopPushAdapter";
import { MobilePushAdapter } from "./adapters/mobilePushAdapter";
import { EmailNotificationAdapter } from "./adapters/emailNotificationAdapter";

let bootstrapped = false;

export function bootstrapNotificationAdapters() {
  if (bootstrapped) return;
  bootstrapped = true;
  pushGateway.register("desktop", new DesktopPushAdapter());
  pushGateway.register("mobile", new MobilePushAdapter());
  pushGateway.register("email", new EmailNotificationAdapter());
}
