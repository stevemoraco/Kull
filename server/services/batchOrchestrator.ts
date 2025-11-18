import type { ProviderId } from "@shared/culling/schemas";
import { getProvider, type ProviderCapability } from "@shared/culling/providers";
import { estimateCostForImages, sortProvidersByCost } from "@shared/utils/cost";
import type { BatchImagePayload } from "../orchestrator";
import { runBatches } from "../orchestrator";
import type { RatingResult } from "../providers/openai";
import { submitOpenAIBatch } from "../providers/openai";
import type { IStorage } from "../storage";

type ProviderRunOptions = {
  model?: string;
  apiKey?: string;
};

export type OrchestratedRunArgs = {
  userId: string;
  prompt: string;
  images: BatchImagePayload[];
  providerOrder?: ProviderId[];
  allowFallback?: boolean;
  providerOptions?: Partial<Record<ProviderId, ProviderRunOptions>>;
};

type ProviderAttempt = {
  providerId: ProviderId;
  status: "skipped" | "failed" | "success";
  reason?: string;
  durationMs: number;
};

export type OrchestratedRunResult = {
  providerId: ProviderId;
  ratings: RatingResult[];
  creditsCharged: number;
  attempts: ProviderAttempt[];
};

type ProviderExecutor = (args: {
  provider: ProviderCapability;
  images: BatchImagePayload[];
  prompt: string;
  options?: ProviderRunOptions;
}) => Promise<RatingResult[]>;

const providerExecutors: Partial<Record<ProviderId, ProviderExecutor>> = {
  "openai-gpt-5": async ({ provider, images, prompt, options }) => {
    const apiKey = options?.apiKey ?? process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("Missing OPENAI_API_KEY");
    }
    const model = options?.model ?? "gpt-5";
    const imageMap = new Map(images.map((img) => [img.id, img]));
    const ratings = await runBatches({
      providerId: provider.id,
      imageIds: images.map((img) => img.id),
      toPayload: async (id) => {
        const payload = imageMap.get(id);
        if (!payload) {
          throw new Error(`Image payload ${id} missing`);
        }
        return payload;
      },
      prompt,
      submit: async ({ images: batch }) =>
        submitOpenAIBatch({
          apiKey,
          model,
          images: batch,
          prompt,
        }),
      concurrency: provider.maxParallelBatches,
      maxRetries: 5,
    });
    return ratings as RatingResult[];
  },
};

export function registerProviderExecutor(id: ProviderId, executor: ProviderExecutor) {
  providerExecutors[id] = executor;
}

export function removeProviderExecutor(id: ProviderId) {
  delete providerExecutors[id];
}

const ensureProviderOrder = (
  explicitOrder: ProviderId[] | undefined,
  allowFallback: boolean | undefined,
): ProviderId[] => {
  const seen = new Set<ProviderId>();
  const order: ProviderId[] = [];
  const hadExplicitOrder = Boolean(explicitOrder?.length);

  const pushUnique = (id: ProviderId) => {
    if (seen.has(id)) return;
    seen.add(id);
    order.push(id);
  };

  const fallbackOrder = sortProvidersByCost().map((p) => p.id);

  if (explicitOrder?.length) {
    explicitOrder.forEach((id) => pushUnique(id));
    if (allowFallback) {
      fallbackOrder.forEach((id) => pushUnique(id));
    }
  } else {
    fallbackOrder.forEach((id) => pushUnique(id));
  }

  if (!hadExplicitOrder && !order.includes("apple-intelligence")) {
    const apple = "apple-intelligence" as ProviderId;
    order.unshift(apple);
    seen.add(apple);
  }

  return order;
};

export async function runOrchestratedCulling(
  storage: IStorage,
  args: OrchestratedRunArgs,
): Promise<OrchestratedRunResult> {
  if (!args.images.length) {
    throw new Error("No images provided");
  }

  const attempts: ProviderAttempt[] = [];
  const order = ensureProviderOrder(args.providerOrder, args.allowFallback);
  const creditSummary = await storage.getCreditSummary(args.userId);
  let availableCredits = Math.max(0, Math.floor(creditSummary.balance));

  for (const providerId of order) {
    const provider = getProvider(providerId);
    if (!provider) {
      attempts.push({
        providerId,
        status: "skipped",
        reason: "provider-unknown",
        durationMs: 0,
      });
      continue;
    }

    const executor = providerExecutors[providerId];
    if (!executor) {
      attempts.push({
        providerId,
        status: "skipped",
        reason: "executor-unavailable",
        durationMs: 0,
      });
      continue;
    }

    const started = Date.now();
    const estimatedCost = Math.ceil(estimateCostForImages(providerId, args.images.length));
    if (estimatedCost > 0 && availableCredits < estimatedCost) {
      attempts.push({
        providerId,
        status: "skipped",
        reason: "insufficient-credits",
        durationMs: Date.now() - started,
      });
      continue;
    }

    try {
      const ratings = await executor({
        provider,
        images: args.images,
        prompt: args.prompt,
        options: args.providerOptions?.[providerId],
      });

      if (!Array.isArray(ratings) || !ratings.length) {
        attempts.push({
          providerId,
          status: "failed",
          reason: "empty-response",
          durationMs: Date.now() - started,
        });
        continue;
      }

      if (estimatedCost > 0) {
        await storage.recordCreditEntry({
          userId: args.userId,
          entryType: "debit",
          credits: estimatedCost,
          description: `${provider.displayName} batch (${args.images.length} images)`,
          metadata: {
            providerId,
            imagesProcessed: args.images.length,
          },
        });
        availableCredits -= estimatedCost;
      }

      attempts.push({
        providerId,
        status: "success",
        durationMs: Date.now() - started,
      });

      return {
        providerId,
        ratings,
        creditsCharged: estimatedCost > 0 ? estimatedCost : 0,
        attempts,
      };
    } catch (error) {
      const durationMs = Date.now() - started;
      attempts.push({
        providerId,
        status: "failed",
        reason: error instanceof Error ? error.message : "unknown-error",
        durationMs,
      });
    }
  }

  const errors = attempts
    .filter((attempt) => attempt.status === "failed")
    .map((attempt) => `${attempt.providerId}: ${attempt.reason}`)
    .join("; ");

  throw new Error(errors || "All providers skipped");
}
