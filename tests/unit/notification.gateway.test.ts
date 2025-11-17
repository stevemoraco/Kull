import { describe, expect, it, vi } from "vitest";
import { NotificationBus, type NotificationEvent } from "../../server/services/notificationService";
import { PushGateway } from "../../server/services/pushGateway";
import { EmailNotificationAdapter } from "../../server/services/adapters/emailNotificationAdapter";

const createEvent = (overrides: Partial<NotificationEvent> = {}): NotificationEvent => ({
  type: "shoot_completed",
  userId: "user-123",
  shootId: undefined,
  channels: ["desktop"],
  payload: {},
  ...overrides,
});

describe("PushGateway", () => {
  it("dispatches events to matching channel adapters", async () => {
    const bus = new NotificationBus();
    const gateway = new PushGateway(bus);
    const desktopAdapter = { name: "desktop-test", send: vi.fn().mockResolvedValue(undefined) };
    const mobileAdapter = { name: "mobile-test", send: vi.fn().mockResolvedValue(undefined) };
    gateway.register("desktop", desktopAdapter);
    gateway.register("mobile", mobileAdapter);

    bus.emitEvent(createEvent({ channels: ["desktop"] }));

    await vi.waitFor(() => {
      expect(desktopAdapter.send).toHaveBeenCalledTimes(1);
    });
    expect(mobileAdapter.send).not.toHaveBeenCalled();

    gateway.dispose();
  });

  it("logs adapter failures without stopping other deliveries", async () => {
    const bus = new NotificationBus();
    const gateway = new PushGateway(bus);
    const failing = {
      name: "desktop-fail",
      send: vi.fn().mockRejectedValue(new Error("push failed")),
    };
    const succeeding = {
      name: "desktop-ok",
      send: vi.fn().mockResolvedValue(undefined),
    };
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    gateway.register("desktop", failing as any);
    gateway.register("desktop", succeeding as any);

    bus.emitEvent(createEvent({ channels: ["desktop"] }));

    await vi.waitFor(() => {
      expect(succeeding.send).toHaveBeenCalledTimes(1);
    });
    expect(failing.send).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("[push:desktop-fail] failed"), expect.any(Error));

    gateway.dispose();
    errorSpy.mockRestore();
  });
});

describe("EmailNotificationAdapter", () => {
  it("sends report emails when payload includes report and recipient", async () => {
    const send = vi.fn().mockResolvedValue(true);
    const adapter = new EmailNotificationAdapter(send);
    const report = {
      shootName: "Sunset Shoot",
      generatedAt: new Date().toISOString(),
      narrative: "Narrative",
      stats: {
        totalImages: 10,
        heroCount: 2,
        keeperCount: 4,
        distribution: [0, 1, 2, 3, 2, 2],
        heroFilenames: [],
        averageRating: 4.2,
        tagCloud: [],
      },
      heroes: [],
      notifications: {
        desktop: { title: "Desktop", body: "Desktop body" },
        mobile: { title: "Mobile", body: "Mobile body" },
      },
    };

    const event: NotificationEvent = {
      type: "shoot_completed",
      userId: "user-123",
      shootId: undefined,
      channels: ["email"],
      payload: {
        report,
        recipientEmail: "user@example.com",
      },
    };

    await adapter.send(event);

    expect(send).toHaveBeenCalledWith({
      to: "user@example.com",
      subject: expect.stringContaining("Sunset Shoot"),
      html: expect.any(String),
      text: expect.any(String),
    });
  });

  it("ignores events missing report or recipient", async () => {
    const send = vi.fn().mockResolvedValue(true);
    const adapter = new EmailNotificationAdapter(send);
    const event: NotificationEvent = {
      type: "shoot_completed",
      userId: "user-123",
      shootId: undefined,
      channels: ["email"],
      payload: {},
    };

    await adapter.send(event);

    expect(send).not.toHaveBeenCalled();
  });
});
