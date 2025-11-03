export type ProviderCapability = {
  id: string;
  displayName: string;
  vision: boolean;
  structuredOutput: boolean;
  offline: boolean;
  maxBatchImages: number; // per request
  estimatedCostPer1kImages: number; // credits after margin baked-in
};

export const PROVIDERS: ProviderCapability[] = [
  {
    id: "apple-intelligence",
    displayName: "Apple Intelligence (On‑Device)",
    vision: true,
    structuredOutput: true,
    offline: true,
    maxBatchImages: 10, // conservative default
    estimatedCostPer1kImages: 0,
  },
  {
    id: "openai-gpt-5",
    displayName: "OpenAI GPT‑5",
    vision: true,
    structuredOutput: true,
    offline: false,
    maxBatchImages: 20,
    estimatedCostPer1kImages: 120, // placeholder until calibrated
  },
  {
    id: "gemini-2-5-flash",
    displayName: "Gemini 2.5 Flash",
    vision: true,
    structuredOutput: true,
    offline: false,
    maxBatchImages: 20,
    estimatedCostPer1kImages: 95,
  },
];

export const getProvider = (id: string) => PROVIDERS.find((p) => p.id === id);

export const getProviderConfig = getProvider;
