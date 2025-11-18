/**
 * xAI Grok Provider Adapter
 * Model: grok-2-vision-1212
 * Pricing: Input $2.00/1M tokens | Output $10.00/1M tokens
 * Batch API: Not supported (use concurrent requests)
 * Context: 32K tokens | Vision: Yes
 */

import { config } from '../../config/environment';
import {
  BaseProviderAdapter,
  ImageInput,
  PhotoRating,
  ProcessImageRequest,
  BatchImageRequest,
  BatchJob,
  BatchJobStatus,
  ProcessingResult,
  CostBreakdown
} from '../BaseProviderAdapter';

export class GrokAdapter extends BaseProviderAdapter {
  protected apiKey: string;
  protected baseURL: string;
  protected modelName = 'grok-2-vision-1212';

  private readonly INPUT_COST_PER_1M = 2.00;
  private readonly OUTPUT_COST_PER_1M = 10.00;

  constructor() {
    super();
    this.apiKey = config.grok.apiKey;
    this.baseURL = config.grok.baseURL;
  }

  async processSingleImage(request: ProcessImageRequest): Promise<ProcessingResult> {
    const startTime = Date.now();

    const result = await this.retryWithBackoff(async () => {
      return await this.callGrokAPI(request);
    });

    const processingTimeMs = Date.now() - startTime;

    return {
      rating: result.rating,
      cost: result.cost,
      processingTimeMs
    };
  }

  private async callGrokAPI(request: ProcessImageRequest): Promise<{
    rating: PhotoRating;
    cost: CostBreakdown;
  }> {
    const image = request.image;
    const base64Image = this.imageToBase64(image);
    const mimeType = this.getMimeType(image.format);

    // Augment system prompt with RAW image reminder
    const enhancedSystemPrompt = `${request.systemPrompt}

CRITICAL RAW IMAGE REMINDER: These are RAW images. Exposure and white balance are FULLY correctable in post-processing - do not penalize for these. However, focus accuracy and moment timing CANNOT be fixed later - these are permanent.`;

    const body = {
      model: this.modelName,
      messages: [
        {
          role: 'system',
          content: enhancedSystemPrompt
        },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`
              }
            },
            {
              type: 'text',
              text: request.userPrompt
            }
          ]
        }
      ],
      response_format: {
        type: 'json_object'
      },
      max_tokens: 2000
    };

    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(body)
    });

    if (response.status === 429) {
      const retryAfter = response.headers.get('retry-after');
      throw {
        status: 429,
        retryAfter: retryAfter ? parseInt(retryAfter) : 2,
        message: 'Rate limit exceeded'
      };
    }

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Grok API error: ${response.status} ${error}`);
    }

    const data = await response.json();

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('No content in Grok response');
    }

    const ratingData = JSON.parse(content);
    ratingData.imageId = image.filename;
    ratingData.filename = image.filename;

    const rating = this.validateRating(ratingData);

    const usage = data.usage || {};
    const inputTokens = usage.prompt_tokens || 0;
    const outputTokens = usage.completion_tokens || 0;

    const inputCostUSD = (inputTokens / 1_000_000) * this.INPUT_COST_PER_1M;
    const outputCostUSD = (outputTokens / 1_000_000) * this.OUTPUT_COST_PER_1M;
    const totalCostUSD = inputCostUSD + outputCostUSD;
    const userChargeUSD = this.calculateUserCharge(totalCostUSD);

    const cost: CostBreakdown = {
      inputTokens,
      outputTokens,
      inputCostUSD,
      outputCostUSD,
      totalCostUSD,
      userChargeUSD
    };

    return { rating, cost };
  }

  async submitBatch(request: BatchImageRequest): Promise<BatchJob> {
    throw new Error('Grok does not support batch API. Use concurrent single requests instead.');
  }

  async checkBatchStatus(jobId: string): Promise<BatchJobStatus> {
    throw new Error('Grok does not support batch API');
  }

  async retrieveBatchResults(jobId: string): Promise<PhotoRating[]> {
    throw new Error('Grok does not support batch API');
  }

  getCostPerImage(): number {
    const inputTokens = 2000;
    const outputTokens = 300;
    return ((inputTokens / 1_000_000) * this.INPUT_COST_PER_1M) +
           ((outputTokens / 1_000_000) * this.OUTPUT_COST_PER_1M);
  }

  getProviderName(): string {
    return 'xAI Grok';
  }

  supportsBatch(): boolean {
    return false;
  }
}
