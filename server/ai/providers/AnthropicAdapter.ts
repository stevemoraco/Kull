/**
 * Anthropic Claude Provider Adapter
 * Model: claude-haiku-4-5-20251001 (Claude Haiku 4.5)
 * Pricing: Input $1.00/1M tokens | Output $5.00/1M tokens
 * Batch API: Supported (50% off)
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

export class AnthropicAdapter extends BaseProviderAdapter {
  protected apiKey: string;
  protected baseURL: string;
  protected modelName = 'claude-haiku-4-5-20251001';

  // Pricing per million tokens
  private readonly INPUT_COST_PER_1M = 1.00;
  private readonly OUTPUT_COST_PER_1M = 5.00;
  private readonly BATCH_INPUT_COST_PER_1M = 0.50;  // 50% off
  private readonly BATCH_OUTPUT_COST_PER_1M = 2.50; // 50% off

  constructor() {
    super();
    this.apiKey = config.anthropic.apiKey;
    this.baseURL = config.anthropic.baseURL;
  }

  async processSingleImage(request: ProcessImageRequest): Promise<ProcessingResult> {
    const startTime = Date.now();

    const result = await this.retryWithBackoff(async () => {
      return await this.callAnthropicAPI(request);
    });

    const processingTimeMs = Date.now() - startTime;

    return {
      rating: result.rating,
      cost: result.cost,
      processingTimeMs
    };
  }

  private async callAnthropicAPI(request: ProcessImageRequest): Promise<{
    rating: PhotoRating;
    cost: CostBreakdown;
  }> {
    const image = request.image;
    const base64Image = this.imageToBase64(image);
    const mimeType = this.getMimeType(image.format);

    // Build structured output schema with 1-1000 rating scale
    const responseSchema = {
      type: 'object',
      properties: {
        imageId: { type: 'string' },
        filename: { type: 'string' },
        starRating: { type: 'integer', minimum: 1, maximum: 5 },
        colorLabel: {
          type: 'string',
          enum: ['red', 'yellow', 'green', 'blue', 'purple', 'none']
        },
        keepReject: {
          type: 'string',
          enum: ['keep', 'reject', 'maybe']
        },
        tags: {
          type: 'array',
          items: { type: 'string' }
        },
        description: { type: 'string' },
        technicalQuality: {
          type: 'object',
          properties: {
            // New 1-1000 scale fields
            focusAccuracy: { type: 'integer', minimum: 1, maximum: 1000 },
            exposureQuality: { type: 'integer', minimum: 1, maximum: 1000 },
            compositionScore: { type: 'integer', minimum: 1, maximum: 1000 },
            lightingQuality: { type: 'integer', minimum: 1, maximum: 1000 },
            colorHarmony: { type: 'integer', minimum: 1, maximum: 1000 },
            noiseLevel: { type: 'integer', minimum: 1, maximum: 1000 },
            sharpnessDetail: { type: 'integer', minimum: 1, maximum: 1000 },
            dynamicRange: { type: 'integer', minimum: 1, maximum: 1000 },
            overallTechnical: { type: 'integer', minimum: 1, maximum: 1000 }
          },
          required: [
            'focusAccuracy',
            'exposureQuality',
            'compositionScore',
            'lightingQuality',
            'colorHarmony',
            'noiseLevel',
            'sharpnessDetail',
            'dynamicRange',
            'overallTechnical'
          ]
        },
        subjectAnalysis: {
          type: 'object',
          properties: {
            primarySubject: { type: 'string' },
            emotionIntensity: { type: 'integer', minimum: 1, maximum: 1000 },
            eyesOpen: { type: 'boolean' },
            eyeContact: { type: 'boolean' },
            genuineExpression: { type: 'integer', minimum: 1, maximum: 1000 },
            facialSharpness: { type: 'integer', minimum: 1, maximum: 1000 },
            bodyLanguage: { type: 'integer', minimum: 1, maximum: 1000 },
            momentTiming: { type: 'integer', minimum: 1, maximum: 1000 },
            storyTelling: { type: 'integer', minimum: 1, maximum: 1000 },
            uniqueness: { type: 'integer', minimum: 1, maximum: 1000 }
          },
          required: [
            'primarySubject',
            'emotionIntensity',
            'eyesOpen',
            'eyeContact',
            'genuineExpression',
            'facialSharpness',
            'bodyLanguage',
            'momentTiming',
            'storyTelling',
            'uniqueness'
          ]
        },
        shootContext: {
          type: 'object',
          properties: {
            eventType: { type: 'string' },
            shootPhase: { type: 'string' },
            timeOfDay: { type: 'string' },
            location: { type: 'string' }
          }
        }
      },
      required: [
        'imageId',
        'filename',
        'starRating',
        'colorLabel',
        'keepReject',
        'tags',
        'description',
        'technicalQuality',
        'subjectAnalysis'
      ]
    };

    // Add RAW reminder to system prompt
    const enhancedSystemPrompt = `${request.systemPrompt}

CRITICAL REMINDER: These are RAW images - exposure and white balance are fully correctable in post-processing. When rating exposureQuality, focus on whether detail is retained in highlights and shadows, NOT the current brightness or color temperature. However, focus accuracy and moment timing CANNOT be fixed in post - prioritize these heavily in your ratings.`;

    const body = {
      model: this.modelName,
      max_tokens: 4096,
      system: enhancedSystemPrompt,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType,
                data: base64Image
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
        type: 'json_schema',
        schema: responseSchema
      }
    };

    const response = await fetch(`${this.baseURL}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2025-11-01',
        'anthropic-beta': 'structured-outputs-2025-11-13',
        'x-api-key': this.apiKey
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
      throw new Error(`Anthropic API error: ${response.status} ${error}`);
    }

    const data = await response.json();

    // Extract rating from response
    const content = data.content?.[0]?.text;
    if (!content) {
      throw new Error('No content in Anthropic response');
    }

    const ratingData = JSON.parse(content);
    ratingData.imageId = image.filename;
    ratingData.filename = image.filename;

    const rating = this.validateRating(ratingData);

    // Calculate cost
    const usage = data.usage || {};
    const inputTokens = usage.input_tokens || 0;
    const outputTokens = usage.output_tokens || 0;

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
    // Anthropic supports batch API
    const requests = request.images.map((image, index) => ({
      custom_id: `image_${index}_${Date.now()}`,
      params: {
        model: this.modelName,
        max_tokens: 4096,
        system: request.systemPrompt,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: this.getMimeType(image.format),
                  data: this.imageToBase64(image)
                }
              },
              {
                type: 'text',
                text: request.userPrompt
              }
            ]
          }
        ]
      }
    }));

    const response = await fetch(`${this.baseURL}/messages/batches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2025-11-01',
        'anthropic-beta': 'structured-outputs-2025-11-13',
        'x-api-key': this.apiKey
      },
      body: JSON.stringify({ requests })
    });

    if (!response.ok) {
      throw new Error(`Failed to submit batch: ${response.status}`);
    }

    const data = await response.json();

    return {
      jobId: data.id,
      status: 'queued',
      totalImages: request.images.length,
      processedImages: 0,
      createdAt: new Date(),
      estimatedCompletionTime: new Date(Date.now() + 10 * 60 * 1000) // ~10 mins
    };
  }

  async checkBatchStatus(jobId: string): Promise<BatchJobStatus> {
    const response = await fetch(`${this.baseURL}/messages/batches/${jobId}`, {
      headers: {
        'anthropic-version': '2025-11-01',
        'anthropic-beta': 'structured-outputs-2025-11-13',
        'x-api-key': this.apiKey
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to check batch status: ${response.status}`);
    }

    const data = await response.json();

    const statusMap: Record<string, BatchJobStatus['status']> = {
      'in_progress': 'processing',
      'ended': 'completed',
      'canceling': 'processing',
      'canceled': 'failed'
    };

    return {
      jobId: data.id,
      status: statusMap[data.processing_status] || 'queued',
      totalImages: data.request_counts?.total || 0,
      processedImages: data.request_counts?.succeeded || 0,
      createdAt: new Date(data.created_at),
      error: data.processing_status === 'canceled' ? 'Batch canceled' : undefined
    };
  }

  async retrieveBatchResults(jobId: string): Promise<PhotoRating[]> {
    const response = await fetch(`${this.baseURL}/messages/batches/${jobId}/results`, {
      headers: {
        'anthropic-version': '2025-11-01',
        'anthropic-beta': 'structured-outputs-2025-11-13',
        'x-api-key': this.apiKey
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to retrieve batch results: ${response.status}`);
    }

    const data = await response.json();
    const ratings: PhotoRating[] = [];

    for (const result of data.results || []) {
      if (result.result?.type === 'succeeded') {
        const content = result.result.message?.content?.[0]?.text;
        if (content) {
          try {
            const ratingData = JSON.parse(content);
            ratings.push(this.validateRating(ratingData));
          } catch (e) {
            console.error('Failed to parse rating:', e);
          }
        }
      }
    }

    return ratings;
  }

  getCostPerImage(): number {
    // Estimate: ~2000 input tokens (image) + ~500 output tokens
    const inputTokens = 2000;
    const outputTokens = 500;
    const inputCost = (inputTokens / 1_000_000) * this.INPUT_COST_PER_1M;
    const outputCost = (outputTokens / 1_000_000) * this.OUTPUT_COST_PER_1M;
    return inputCost + outputCost;
  }

  getProviderName(): string {
    return 'Anthropic';
  }

  supportsBatch(): boolean {
    return true;
  }
}
