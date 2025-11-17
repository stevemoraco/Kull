import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { runOrchestratedCulling } from "../../server/services/batchOrchestrator";
import type { BatchImagePayload } from "../../server/orchestrator";
import type { IStorage } from "../../server/storage";

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
    url: "https://example.com/img-1.jpg",
    filename: "IMG_0001.JPG",
  },
];

const createStorageStub = (overrides: Partial<IStorage> = {}) => {
  const defaults: Partial<IStorage> = {
    getCreditSummary: vi.fn().mockResolvedValue({
      balance: 10,
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

describe("runOrchestratedCulling", () => {
  beforeEach(() => {
    submitMock.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("executes the first provider when credits are sufficient", async () => {
    submitMock.mockResolvedValue({ ok: true, ratings: [{ imageId: "img-1", starRating: 4 }] });
    const recordCreditEntry = vi.fn();
    const storage = createStorageStub({ recordCreditEntry });

    const result = await runOrchestratedCulling(storage, {
      userId: "user-1",
      prompt: "Rate images",
      images: sampleImages,
      providerOrder: ["openai-gpt-5"],
      providerOptions: {
        "openai-gpt-5": { apiKey: "sk-test", model: "gpt-5" },
      },
    });

    expect(result.providerId).toBe("openai-gpt-5");
    expect(result.ratings).toHaveLength(1);
    expect(recordCreditEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        entryType: "debit",
        credits: 1,
        metadata: expect.objectContaining({ providerId: "openai-gpt-5", imagesProcessed: 1 }),
      }),
    );
    expect(result.attempts).toHaveLength(1);
    expect(result.attempts[0].status).toBe("success");
  });

  it("skips providers when credits are insufficient", async () => {
    submitMock.mockResolvedValue({ ok: true, ratings: [{ imageId: "img-1", starRating: 5 }] });
    const storage = createStorageStub({
      getCreditSummary: vi.fn().mockResolvedValue({
        balance: 0,
        planId: "professional",
        planDisplayName: "Professional",
        monthlyAllowance: 500,
        estimatedShootsRemaining: 0,
        ledger: [],
      }),
    });

    await expect(
      runOrchestratedCulling(storage, {
        userId: "user-2",
        prompt: "Rate images",
        images: sampleImages,
        providerOrder: ["openai-gpt-5"],
        providerOptions: {
          "openai-gpt-5": { apiKey: "sk-test", model: "gpt-5" },
        },
      }),
    ).rejects.toThrow(/All providers skipped/);
  });

  it("falls back to the next provider when executors are unavailable", async () => {
    submitMock.mockResolvedValue({ ok: true, ratings: [{ imageId: "img-1", starRating: 4 }] });
    const storage = createStorageStub();

    const result = await runOrchestratedCulling(storage, {
      userId: "user-3",
      prompt: "Rate images",
      images: sampleImages,
      allowFallback: true,
      providerOptions: {
        "openai-gpt-5": { apiKey: "sk-test", model: "gpt-5" },
      },
    });

    expect(result.providerId).toBe("openai-gpt-5");
    expect(result.attempts[0]).toMatchObject({
      providerId: "apple-intelligence",
      status: "skipped",
      reason: "executor-unavailable",
    });
    expect(result.attempts.some((attempt) => attempt.status === "success")).toBe(true);
  });
});
