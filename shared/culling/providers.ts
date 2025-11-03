import { ProviderId } from "./schemas";

type ProviderConfig = {
  id: ProviderId;
  displayName: string;
  maxBatchSize: number;
  baseCostPerThousandImagesUSD: number; // raw provider cost before margin
  supportsStructuredOutput: boolean;
  supportsVision: boolean;
  onDevice: boolean;
};

export const PROVIDERS: Record<ProviderId, ProviderConfig> = {
  "apple-intelligence": {
    id: "apple-intelligence",
    displayName: "Apple Intelligence",
    maxBatchSize: 10,
    baseCostPerThousandImagesUSD: 0,
    supportsStructuredOutput: true,
    supportsVision: true,
    onDevice: true,
  },
  "openai-gpt-5": {
    id: "openai-gpt-5",
    displayName: "OpenAI GPT-5",
    maxBatchSize: 20,
    baseCostPerThousandImagesUSD: 1.0,
    supportsStructuredOutput: true,
    supportsVision: true,
    onDevice: false,
  },
  "openai-gpt-5-codex": {
    id: "openai-gpt-5-codex",
    displayName: "OpenAI GPT-5 Codex",
    maxBatchSize: 20,
    baseCostPerThousandImagesUSD: 1.1,
    supportsStructuredOutput: true,
    supportsVision: false,
    onDevice: false,
  },
  "openai-gpt-image": {
    id: "openai-gpt-image",
    displayName: "OpenAI GPT Image",
    maxBatchSize: 10,
    baseCostPerThousandImagesUSD: 1.4,
    supportsStructuredOutput: true,
    supportsVision: true,
    onDevice: false,
  },
  "gemini-2-5-pro": {
    id: "gemini-2-5-pro",
    displayName: "Gemini 2.5 Pro",
    maxBatchSize: 16,
    baseCostPerThousandImagesUSD: 0.9,
    supportsStructuredOutput: true,
    supportsVision: true,
    onDevice: false,
  },
  "gemini-2-5-flash": {
    id: "gemini-2-5-flash",
    displayName: "Gemini 2.5 Flash",
    maxBatchSize: 16,
    baseCostPerThousandImagesUSD: 0.75,
    supportsStructuredOutput: true,
    supportsVision: true,
    onDevice: false,
  },
  "gemini-nano-banana": {
    id: "gemini-nano-banana",
    displayName: "Gemini Nano Banana",
    maxBatchSize: 8,
    baseCostPerThousandImagesUSD: 0.2,
    supportsStructuredOutput: true,
    supportsVision: true,
    onDevice: true,
  },
  "grok-4-fast": {
    id: "grok-4-fast",
    displayName: "Grok 4 Fast",
    maxBatchSize: 20,
    baseCostPerThousandImagesUSD: 1.1,
    supportsStructuredOutput: true,
    supportsVision: true,
    onDevice: false,
  },
  "groq-vision": {
    id: "groq-vision",
    displayName: "Groq Vision",
    maxBatchSize: 20,
    baseCostPerThousandImagesUSD: 0.95,
    supportsStructuredOutput: true,
    supportsVision: true,
    onDevice: false,
  },
  "claude-haiku-4-5": {
    id: "claude-haiku-4-5",
    displayName: "Claude Haiku 4.5",
    maxBatchSize: 20,
    baseCostPerThousandImagesUSD: 0.85,
    supportsStructuredOutput: true,
    supportsVision: true,
    onDevice: false,
  },
  "claude-sonnet-4-5": {
    id: "claude-sonnet-4-5",
    displayName: "Claude Sonnet 4.5",
    maxBatchSize: 20,
    baseCostPerThousandImagesUSD: 1.1,
    supportsStructuredOutput: true,
    supportsVision: true,
    onDevice: false,
  },
  "claude-opus-4-1": {
    id: "claude-opus-4-1",
    displayName: "Claude Opus 4.1",
    maxBatchSize: 16,
    baseCostPerThousandImagesUSD: 1.5,
    supportsStructuredOutput: true,
    supportsVision: true,
    onDevice: false,
  },
};

export const getProviderConfig = (id: ProviderId): ProviderConfig => {
  const config = PROVIDERS[id];
  if (!config) {
    throw new Error(`Unknown provider: ${id}`);
  }
  return config;
};
