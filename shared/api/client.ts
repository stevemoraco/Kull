import type { ProviderCapability } from "../culling/providers";

export type CreditSummary = {
  balance: number;
  planId: string;
  planDisplayName: string;
  monthlyAllowance: number;
  estimatedShootsRemaining: number;
};

export class KullClient {
  constructor(private baseURL: string) {}

  async getCreditSummary(): Promise<CreditSummary> {
    const r = await fetch(this.baseURL + "/api/kull/credits/summary", {
      credentials: "include",
    });
    if (!r.ok) throw new Error("credit summary failed");
    return r.json();
  }

  async listModels(): Promise<ProviderCapability[]> {
    const r = await fetch(this.baseURL + "/api/kull/models", {
      credentials: "include",
    });
    if (!r.ok) throw new Error("models failed");
    const json = await r.json();
    return json.providers ?? [];
  }

  async listPrompts(opts: { search?: string; shootType?: string } = {}) {
    const u = new URL(this.baseURL + "/api/kull/prompts");
    if (opts.search) u.searchParams.set("search", opts.search);
    if (opts.shootType) u.searchParams.set("shootType", opts.shootType);
    const r = await fetch(u.toString(), { credentials: "include" });
    if (!r.ok) throw new Error("prompts failed");
    return r.json();
  }

  async runOpenAI(args: {
    model: string;
    images: { id: string; url?: string; b64?: string; filename?: string; relativePath?: string }[];
    prompt: string;
    baseDir?: string;
    report?: boolean;
    providerOrder?: string[];
    allowFallback?: boolean;
    shootName?: string;
    previewBaseUrl?: string;
    heroLimit?: number;
  }) {
    const r = await fetch(this.baseURL + "/api/kull/run/openai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(args),
    });
    if (!r.ok) throw new Error("run openai failed");
    return r.json();
  }

  async writeSidecars(args: {
    baseDir: string;
    updates: {
      imageId: string;
      filename?: string;
      starRating?: number;
      colorLabel?: string;
      title?: string;
      description?: string;
      tags?: string[];
    }[];
  }) {
    const r = await fetch(this.baseURL + "/api/kull/metadata/write", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(args),
    });
    if (!r.ok) throw new Error("write sidecars failed");
    return r.json();
  }

  async generateReport(args: { shootName: string; ratings: any[]; previewBaseUrl?: string; heroLimit?: number }) {
    const r = await fetch(this.baseURL + "/api/kull/report/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(args),
    });
    if (!r.ok) throw new Error("report failed");
    return r.json();
  }

  async getFolderCatalog() {
    const r = await fetch(this.baseURL + "/api/kull/folders", {
      credentials: "include",
    });
    if (!r.ok) throw new Error("folders failed");
    return r.json();
  }

  async initiateDeviceLink(args: { deviceName?: string } = {}) {
    const r = await fetch(this.baseURL + "/api/device/link/initiate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(args),
      credentials: "include",
    });
    if (!r.ok) throw new Error("device link initiate failed");
    return r.json();
  }

  async approveDeviceLink(args: { code: string; deviceName?: string }) {
    const r = await fetch(this.baseURL + "/api/device/link/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(args),
      credentials: "include",
    });
    if (!r.ok) throw new Error("device link approve failed");
    return r.json();
  }

  async pollDeviceLink(args: { pollToken: string }) {
    const r = await fetch(this.baseURL + "/api/device/link/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(args),
      credentials: "include",
    });
    if (!r.ok) throw new Error("device link status failed");
    return r.json();
  }
}
