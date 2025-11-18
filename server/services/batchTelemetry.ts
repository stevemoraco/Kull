import EventEmitter from "events";

export type BatchStatus = "pending" | "running" | "completed" | "failed";

export type BatchEvent =
  | { type: "scheduled"; providerId: string; batchId: string; total: number; createdAt: number }
  | { type: "started"; providerId: string; batchId: string; startedAt: number }
  | { type: "completed"; providerId: string; batchId: string; completedAt: number; tookMs: number }
  | { type: "failed"; providerId: string; batchId: string; failedAt: number; error?: string }
  | { type: "rate_limit"; providerId: string; batchId: string; retryAfterMs: number; observedAt: number };

export type ProviderSnapshot = {
  providerId: string;
  recentBatches: {
    batchId: string;
    status: BatchStatus;
    totalImages: number;
    startedAt?: number;
    completedAt?: number;
    failedAt?: number;
    tookMs?: number;
    error?: string;
  }[];
  rateLimit: {
    lastTriggeredAt?: number;
    retryAfterMs?: number;
    events: { observedAt: number; retryAfterMs: number }[];
  };
};

const RETAIN_BATCHES = 50;
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;

class BatchTelemetryStore extends EventEmitter {
  private readonly providers = new Map<string, ProviderSnapshot>();

  record(event: BatchEvent): void {
    switch (event.type) {
      case "scheduled":
        this.ensureProvider(event.providerId);
        this.insertOrUpdate(event.providerId, {
          batchId: event.batchId,
          status: "pending",
          totalImages: event.total,
        });
        break;
      case "started":
        this.ensureProvider(event.providerId);
        this.insertOrUpdate(event.providerId, {
          batchId: event.batchId,
          status: "running",
          startedAt: event.startedAt,
        });
        break;
      case "completed":
        this.ensureProvider(event.providerId);
        this.insertOrUpdate(event.providerId, {
          batchId: event.batchId,
          status: "completed",
          completedAt: event.completedAt,
          tookMs: event.tookMs,
        });
        break;
      case "failed":
        this.ensureProvider(event.providerId);
        this.insertOrUpdate(event.providerId, {
          batchId: event.batchId,
          status: "failed",
          failedAt: event.failedAt,
          error: event.error,
        });
        break;
      case "rate_limit": {
        const snapshot = this.ensureProvider(event.providerId);
        snapshot.rateLimit.lastTriggeredAt = event.observedAt;
        snapshot.rateLimit.retryAfterMs = event.retryAfterMs;
        snapshot.rateLimit.events.push({ observedAt: event.observedAt, retryAfterMs: event.retryAfterMs });
        snapshot.rateLimit.events = snapshot.rateLimit.events.filter(
          (entry) => entry.observedAt >= Date.now() - RATE_LIMIT_WINDOW_MS,
        );
        break;
      }
    }
    this.emit("updated");
  }

  private ensureProvider(providerId: string): ProviderSnapshot {
    let snapshot = this.providers.get(providerId);
    if (!snapshot) {
      snapshot = {
        providerId,
        recentBatches: [],
        rateLimit: { events: [] },
      };
      this.providers.set(providerId, snapshot);
    }
    return snapshot;
  }

  private insertOrUpdate(providerId: string, update: {
    batchId: string;
    status: BatchStatus;
    totalImages?: number;
    startedAt?: number;
    completedAt?: number;
    failedAt?: number;
    tookMs?: number;
    error?: string;
  }) {
    const snapshot = this.ensureProvider(providerId);
    const existingIndex = snapshot.recentBatches.findIndex((batch) => batch.batchId === update.batchId);
    const existing = existingIndex >= 0 ? snapshot.recentBatches[existingIndex] : undefined;
    const merged = {
      batchId: update.batchId,
      status: update.status,
      totalImages: update.totalImages ?? existing?.totalImages ?? 0,
      startedAt: update.startedAt ?? existing?.startedAt,
      completedAt: update.completedAt ?? existing?.completedAt,
      failedAt: update.failedAt ?? existing?.failedAt,
      tookMs: update.tookMs ?? existing?.tookMs,
      error: update.error ?? existing?.error,
    };
    if (existingIndex >= 0) {
      snapshot.recentBatches[existingIndex] = merged;
    } else {
      snapshot.recentBatches.unshift(merged);
    }
    snapshot.recentBatches = snapshot.recentBatches.slice(0, RETAIN_BATCHES);
  }

  snapshots(): ProviderSnapshot[] {
    return Array.from(this.providers.values()).map((snapshot) => ({
      providerId: snapshot.providerId,
      recentBatches: snapshot.recentBatches.map((batch) => ({ ...batch })),
      rateLimit: {
        lastTriggeredAt: snapshot.rateLimit.lastTriggeredAt,
        retryAfterMs: snapshot.rateLimit.retryAfterMs,
        events: [...snapshot.rateLimit.events],
      },
    }));
  }

  reset(): void {
    this.providers.clear();
    this.removeAllListeners();
  }
}

export const telemetryStore = new BatchTelemetryStore();
