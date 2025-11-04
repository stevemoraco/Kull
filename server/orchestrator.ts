import { getProvider } from "@shared";

export type SubmitBatchFn = (args: {
  providerId: string;
  images: { id: string; url?: string; b64?: string }[];
  prompt: string;
}) => Promise<{ ok: boolean; retryAfterMs?: number; ratings?: any[] }>;

export async function runBatches(args: {
  providerId: string;
  imageIds: string[];
  toPayload: (id: string) => Promise<{ id: string; url?: string; b64?: string }>;
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
    const payload = await Promise.all(ids.map(args.toPayload));
    let attempt = 0;
    while (attempt <= (args.maxRetries ?? 5)) {
      const res = await args.submit({ providerId: args.providerId, images: payload, prompt: args.prompt });
      if (res.ok) { if (Array.isArray(res.ratings)) allRatings.push(...res.ratings); return; }
      const backoff = res.retryAfterMs ?? (2 ** attempt) * 1000 + Math.floor(Math.random() * 500);
      await new Promise((r) => setTimeout(r, backoff));
      attempt += 1;
    }
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
