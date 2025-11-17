import { getProvider } from "@shared";
import type { ImageMetadata } from "@shared/culling";
import { telemetryStore } from "./services/batchTelemetry";

export type SubmitBatchFn = (args: {
  providerId: string;
  images: BatchImagePayload[];
  prompt: string;
}) => Promise<{ ok: boolean; retryAfterMs?: number; ratings?: any[] }>;

export type BatchImagePayload = {
  id: string;
  url?: string;
  b64?: string;
  filename?: string;
  metadata?: ImageMetadata;
  tags?: string[];
};

export async function runBatches(args: {
  providerId: string;
  imageIds: string[];
  toPayload: (id: string) => Promise<BatchImagePayload>;
  prompt: string;
  submit: SubmitBatchFn;
  concurrency?: number;
  maxRetries?: number;
}): Promise<any[]> {
  const provider = getProvider(args.providerId);
  if (!provider) throw new Error("Unknown provider");
  const size = provider.maxBatchImages;
  const groups: string[][] = [];
  for (let i = 0; i < args.imageIds.length; i += size) {
    groups.push(args.imageIds.slice(i, i + size));
  }

  const concurrency = Math.max(args.concurrency ?? 3, 1);
  let index = 0;
  const inFlight: Promise<void>[] = [];
  const allRatings: any[] = [];

  const runOne = async (ids: string[]) => {
    const batchId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const payload = await Promise.all(ids.map(args.toPayload));
    telemetryStore.record({
      type: "scheduled",
      providerId: args.providerId,
      batchId,
      total: payload.length,
      createdAt: Date.now(),
    });
    let attempt = 0;
    let startedAt: number | undefined;
    while (attempt <= (args.maxRetries ?? 5)) {
      if (attempt === 0) {
        startedAt = Date.now();
        telemetryStore.record({
          type: "started",
          providerId: args.providerId,
          batchId,
          startedAt,
        });
      }
      const res = await args.submit({ providerId: args.providerId, images: payload, prompt: args.prompt });
      if (res.ok) {
        if (Array.isArray(res.ratings)) allRatings.push(...res.ratings);
        const completedAt = Date.now();
        telemetryStore.record({
          type: "completed",
          providerId: args.providerId,
          batchId,
          completedAt,
          tookMs: startedAt ? completedAt - startedAt : 0,
        });
        return;
      }
      const backoff = res.retryAfterMs ?? (2 ** attempt) * 1000 + Math.floor(Math.random() * 500);
      telemetryStore.record({
        type: "rate_limit",
        providerId: args.providerId,
        batchId,
        retryAfterMs: backoff,
        observedAt: Date.now(),
      });
      await new Promise((r) => setTimeout(r, backoff));
      attempt += 1;
    }
    telemetryStore.record({
      type: "failed",
      providerId: args.providerId,
      batchId,
      failedAt: Date.now(),
      error: "Batch failed after retries",
    });
    throw new Error("Batch failed after retries");
  };

  const pump = async () => {
    while (index < groups.length) {
      const group = groups[index++];
      await runOne(group);
    }
  };

  for (let c = 0; c < concurrency; c++) inFlight.push(pump());
  await Promise.all(inFlight);
  return allRatings;
}
