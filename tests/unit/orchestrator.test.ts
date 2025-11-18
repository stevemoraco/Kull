import { describe, it, expect } from "vitest";
import { runBatches, type SubmitBatchFn } from "../../server/orchestrator";

describe("orchestrator", () => {
  it("runs batches and aggregates ratings", async () => {
    const imageIds = Array.from({ length: 7 }).map((_, i) => `img-${i + 1}`);
    const submit: SubmitBatchFn = async ({ images }) => {
      // Simulate a rate limit on the first call to test retry path
      if (images[0].id === "img-1" && !((submit as any)._called)) {
        (submit as any)._called = true;
        return { ok: false, retryAfterMs: 10 };
      }
      return {
        ok: true,
        ratings: images.map((x) => ({ imageId: x.id, starRating: 3 })),
      } as any;
    };

    const ratings = await runBatches({
      providerId: "openai-gpt-5",
      imageIds,
      toPayload: async (id) => ({ id, url: `https://example.com/${id}.jpg`, filename: `${id}.jpg` }),
      prompt: "test",
      submit,
      concurrency: 2,
      maxRetries: 2,
    });

    expect(ratings.length).toBe(7);
    expect(ratings[0].starRating).toBe(3);
  });
});
