// GPT-5 Model Pricing Configuration
// Updated: November 4, 2025

export const MODEL_PRICING = {
  'gpt-5-nano': {
    name: 'GPT-5 Nano',
    description: 'Fastest, most cost-efficient version of GPT-5',
    inputPer1M: 0.05,   // $0.05 per 1M input tokens
    outputPer1M: 0.40,  // $0.40 per 1M output tokens
    reasoning: 'Average',
    speed: 'Very fast',
    contextWindow: 400000,
    maxOutput: 128000,
  },
  'gpt-5-mini': {
    name: 'GPT-5 Mini',
    description: 'Balanced performance and cost',
    inputPer1M: 0.25,   // $0.25 per 1M input tokens
    outputPer1M: 2.00,  // $2.00 per 1M output tokens (inferred)
    reasoning: 'Good',
    speed: 'Fast',
    contextWindow: 400000,
    maxOutput: 128000,
  },
  'gpt-5': {
    name: 'GPT-5',
    description: 'Best model for coding and agentic tasks',
    inputPer1M: 1.25,   // $1.25 per 1M input tokens
    outputPer1M: 10.00, // $10.00 per 1M output tokens
    reasoning: 'Higher',
    speed: 'Medium',
    contextWindow: 400000,
    maxOutput: 128000,
  },
} as const;

export type ChatModel = keyof typeof MODEL_PRICING;

/**
 * Calculate cost for a chat completion
 * @param model - The model used
 * @param inputTokens - Number of input tokens
 * @param outputTokens - Number of output tokens
 * @returns Cost in dollars
 */
export function calculateChatCost(
  model: ChatModel,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = MODEL_PRICING[model];
  const inputCost = (inputTokens / 1_000_000) * pricing.inputPer1M;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPer1M;
  return inputCost + outputCost;
}

/**
 * Format cost as currency string
 */
export function formatCost(cost: number): string {
  if (cost < 0.01) {
    return `$${(cost * 100).toFixed(4)}¢`;
  }
  return `$${cost.toFixed(4)}`;
}
