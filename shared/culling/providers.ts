
import { ProviderId, ProviderIdSchema } from "./schemas";

export type ProviderCapability = {
  id: ProviderId;
  vendor: "Apple" | "OpenAI" | "Google" | "Anthropic" | "Groq" | "Custom";
  displayName: string;
  description: string;
  vision: boolean;
  structuredOutput: boolean;
  offline: boolean;
  maxBatchImages: number;
  maxParallelBatches: number;
  maxBatchMegabytes?: number;
  supportsMetadataWriteback: boolean;
  supportedOutputs: {
    stars: boolean;
    colors: boolean;
    title: boolean;
    description: boolean;
    tags: boolean;
  };
  supportsVoicePrompts: boolean;
  supportsAudioAnnotations: boolean;
  recommendedUse: string;
  estimatedCostPer1kImages: number;
};

export const PROVIDERS: ProviderCapability[] = [];

const registry = new Map<ProviderId, ProviderCapability>();

export const registerProvider = (
  capability: ProviderCapability,
): ProviderCapability => {
  registry.set(capability.id, capability);
  const existingIndex = PROVIDERS.findIndex((p) => p.id === capability.id);
  if (existingIndex >= 0) {
    PROVIDERS[existingIndex] = capability;
  } else {
    PROVIDERS.push(capability);
  }
  return capability;
};

const seedProviders: ProviderCapability[] = [
  {
    id: "apple-intelligence",
    vendor: "Apple",
    displayName: "Apple Intelligence (On-Device)",
    description:
      "Runs locally on Apple silicon for zero-cost structured culling and metadata polishing.",
    vision: true,
    structuredOutput: true,
    offline: true,
    maxBatchImages: 10,
    maxParallelBatches: 2,
    supportsMetadataWriteback: true,
    supportedOutputs: {
      stars: true,
      colors: true,
      title: true,
      description: true,
      tags: true,
    },
    supportsVoicePrompts: false,
    supportsAudioAnnotations: false,
    recommendedUse: "Primary option when running on-device and staying offline.",
    estimatedCostPer1kImages: 0,
  },
  {
    id: "openai-gpt-5",
    vendor: "OpenAI",
    displayName: "OpenAI GPT-5 Responses",
    description:
      "Highest quality cloud culling with nuanced storytelling and metadata suggestions.",
    vision: true,
    structuredOutput: true,
    offline: false,
    maxBatchImages: 20,
    maxParallelBatches: 5,
    supportsMetadataWriteback: true,
    supportedOutputs: {
      stars: true,
      colors: true,
      title: true,
      description: true,
      tags: true,
    },
    supportsVoicePrompts: true,
    supportsAudioAnnotations: true,
    recommendedUse: "Hero shoots and premium delivery where narrative quality matters most.",
    estimatedCostPer1kImages: 120,
  },
  {
    id: "gemini-2-5-flash",
    vendor: "Google",
    displayName: "Gemini 2.5 Flash",
    description:
      "Fastest cloud fallback with strong structured-output support and lower per-image cost.",
    vision: true,
    structuredOutput: true,
    offline: false,
    maxBatchImages: 20,
    maxParallelBatches: 6,
    supportsMetadataWriteback: true,
    supportedOutputs: {
      stars: true,
      colors: true,
      title: true,
      description: true,
      tags: true,
    },
    supportsVoicePrompts: true,
    supportsAudioAnnotations: false,
    recommendedUse: "High volume culling when speed is more important than narrative depth but detailed tagging is still required.",
    estimatedCostPer1kImages: 95,
  },
];

seedProviders.forEach(registerProvider);

export const listProviders = (): ProviderCapability[] => [...PROVIDERS];

export const getProvider = (id: string) => {
  const parsed = ProviderIdSchema.safeParse(id);
  if (!parsed.success) return undefined;
  return registry.get(parsed.data);
};

export const getProviderConfig = getProvider;

export const resetProviderRegistry = () => {
  registry.clear();
  PROVIDERS.splice(0, PROVIDERS.length);
  seedProviders.forEach(registerProvider);
};
