import { describe, it, expect } from "vitest";
import { telemetryStore } from "../../server/services/batchTelemetry";

describe("batch telemetry store", () => {
  it("tracks batches and rate limits", () => {
    telemetryStore.reset();
    telemetryStore.record({ type: "scheduled", providerId: "openai-gpt-5", batchId: "b1", total: 20, createdAt: 0 });
    telemetryStore.record({ type: "started", providerId: "openai-gpt-5", batchId: "b1", startedAt: 10 });
    telemetryStore.record({ type: "rate_limit", providerId: "openai-gpt-5", batchId: "b1", retryAfterMs: 5000, observedAt: Date.now() });
    telemetryStore.record({ type: "completed", providerId: "openai-gpt-5", batchId: "b1", completedAt: 30, tookMs: 20 });

    const snapshots = telemetryStore.snapshots();
    expect(snapshots.length).toBeGreaterThan(0);
    const provider = snapshots.find((snapshot) => snapshot.providerId === "openai-gpt-5");
    expect(provider?.recentBatches[0].status).toBe("completed");
    expect(provider?.rateLimit.events.length).toBeGreaterThan(0);
  });
});
