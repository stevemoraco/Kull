import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  registerProviderExecutor,
  removeProviderExecutor,
  runOrchestratedCulling,
} from "../../server/services/batchOrchestrator";
import type { BatchImagePayload } from "../../server/orchestrator";
import type { IStorage } from "../../server/storage";
import { buildShootReport } from "../../server/services/reportBuilder";
import { emitShootCompletedNotification } from "../../server/services/reportNotifications";
import { notificationBus, type NotificationEvent } from "../../server/services/notificationService";

const { submitMock } = vi.hoisted(() => ({
  submitMock: vi.fn(),
}));

vi.mock("../../server/providers/openai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../server/providers/openai")>();
  return {
    ...actual,
    submitOpenAIBatch: submitMock,
  };
});

const sampleImages: BatchImagePayload[] = [
  {
    id: "img-1",
    filename: "IMG_0001.JPG",
    url: "https://example.com/IMG_0001.JPG",
  },
];

const createStorageStub = (overrides: Partial<IStorage> = {}) => {
  const defaults: Partial<IStorage> = {
    getCreditSummary: vi.fn().mockResolvedValue({
      balance: 500,
      planId: "studio",
      planDisplayName: "Studio",
      monthlyAllowance: 1000,
      estimatedShootsRemaining: 25,
      ledger: [],
    }),
    recordCreditEntry: vi.fn(),
  };
  return {
    ...defaults,
    ...overrides,
  } as unknown as IStorage;
};

const waitForNotification = (): Promise<NotificationEvent> =>
  new Promise((resolve) => {
    const handler = (event: NotificationEvent) => {
      notificationBus.off("notification", handler);
      resolve(event);
    };
    notificationBus.on("notification", handler);
  });

describe("regression: orchestrated pipelines", () => {
  afterEach(() => {
    submitMock.mockReset();
    removeProviderExecutor("apple-intelligence");
  });

  it("runs Apple Intelligence when executor is available and emits notifications", async () => {
    const recordCreditEntry = vi.fn();
    const storage = createStorageStub({ recordCreditEntry });
    registerProviderExecutor(
      "apple-intelligence",
      vi.fn(async ({ images }) =>
        images.map((image, index) => ({
          imageId: image.id,
          starRating: index === 0 ? 5 : 4,
          filename: image.filename,
        })),
      ),
    );

    const result = await runOrchestratedCulling(storage, {
      userId: "user-apple",
      prompt: "Cull this shoot",
      images: sampleImages,
    });

    expect(result.providerId).toBe("apple-intelligence");
    expect(result.ratings).toHaveLength(1);
    expect(recordCreditEntry).not.toHaveBeenCalled();

    const report = await buildShootReport({
      shootName: "Apple Shoot",
      ratings: result.ratings.map((rating) => ({
        imageId: rating.imageId,
        filename: rating.filename,
        starRating: rating.starRating,
      })),
    });

    const notificationPromise = waitForNotification();
    emitShootCompletedNotification(
      {
        id: "user-apple",
        email: "steve@kullai.com",
        firstName: "Steve",
        lastName: "Moraco",
      },
      report,
    );

    const event = await notificationPromise;
    expect(event.userId).toBe("user-apple");
    expect(event.channels).toEqual(expect.arrayContaining(["desktop", "mobile", "email"]));
    expect(event.payload?.report).toMatchObject({
      shootName: "Apple Shoot",
    });
  });

  it("falls back to OpenAI when Apple executor errors and still emits notifications", async () => {
    const recordCreditEntry = vi.fn();
    const storage = createStorageStub({ recordCreditEntry });
    registerProviderExecutor(
      "apple-intelligence",
      vi.fn(async () => {
        throw new Error("device-offline");
      }),
    );
    submitMock.mockResolvedValue({
      ok: true,
      ratings: [{ imageId: "img-1", starRating: 4, filename: "IMG_0001.JPG" }],
    });

    const result = await runOrchestratedCulling(storage, {
      userId: "user-openai",
      prompt: "Cull this shoot",
      images: sampleImages,
      allowFallback: true,
      providerOptions: {
        "openai-gpt-5": { apiKey: "sk-test", model: "gpt-5" },
      },
    });

    expect(result.providerId).toBe("openai-gpt-5");
    expect(result.attempts[0]).toMatchObject({
      providerId: "apple-intelligence",
      status: "failed",
    });
    expect(recordCreditEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-openai",
        entryType: "debit",
        credits: expect.any(Number),
      }),
    );

    const report = await buildShootReport({
      shootName: "Fallback Shoot",
      ratings: result.ratings.map((rating) => ({
        imageId: rating.imageId,
        filename: rating.filename,
        starRating: rating.starRating,
      })),
    });

    const notificationPromise = waitForNotification();
    emitShootCompletedNotification(
      {
        id: "user-openai",
        email: "team@kullai.com",
      },
      report,
    );

    const event = await notificationPromise;
    expect(event.userId).toBe("user-openai");
    expect(event.channels).toEqual(expect.arrayContaining(["email"]));
    expect(event.payload?.report?.stats.totalImages).toBe(1);
  });
});
