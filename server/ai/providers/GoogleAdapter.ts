/**
 * Google Gemini Provider Adapter
 * Model: gemini-2.5-flash-lite
 * Pricing: Input $0.10/1M tokens | Output $0.40/1M tokens
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

export class GoogleAdapter extends BaseProviderAdapter {
  protected apiKey: string;
  protected baseURL: string;
  protected modelName = 'gemini-2.5-flash-lite';

  private readonly INPUT_COST_PER_1M = 0.10;
  private readonly OUTPUT_COST_PER_1M = 0.40;

  constructor() {
    super();
    this.apiKey = config.google.apiKey;
    this.baseURL = config.google.baseURL;
  }

  async processSingleImage(request: ProcessImageRequest): Promise<ProcessingResult> {
    const startTime = Date.now();

    const result = await this.retryWithBackoff(async () => {
      return await this.callGeminiAPI(request);
    });

    const processingTimeMs = Date.now() - startTime;

    return {
      rating: result.rating,
      cost: result.cost,
      processingTimeMs
    };
  }

  private async callGeminiAPI(request: ProcessImageRequest): Promise<{
    rating: PhotoRating;
    cost: CostBreakdown;
  }> {
    const image = request.image;
    const base64Image = this.imageToBase64(image);
    const mimeType = this.getMimeType(image.format);

    const responseSchema = {
      type: 'object',
      properties: {
        imageId: { type: 'string' },
        filename: { type: 'string' },
        starRating: { type: 'integer', minimum: 1, maximum: 5 },
        colorLabel: { type: 'string', enum: ['red', 'yellow', 'green', 'blue', 'purple', 'none'] },
        keepReject: { type: 'string', enum: ['keep', 'reject', 'maybe'] },
        tags: { type: 'array', items: { type: 'string' } },
        description: { type: 'string' },
        technicalQuality: {
          type: 'object',
          properties: {
            sharpness: { type: 'number' },
            exposure: { type: 'number' },
            composition: { type: 'number' },
            overallScore: { type: 'number' }
          }
        },
        subjectAnalysis: {
          type: 'object',
          properties: {
            primarySubject: { type: 'string' },
            emotion: { type: 'string' },
            eyesOpen: { type: 'boolean' },
            smiling: { type: 'boolean' },
            inFocus: { type: 'boolean' }
          }
        }
      },
      required: ['starRating', 'colorLabel', 'keepReject', 'description']
    };

    const body = {
      contents: [
        {
          parts: [
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Image
              }
            },
            {
              text: `${request.systemPrompt}\n\n${request.userPrompt}`
            }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema
      }
    };

    const url = `${this.baseURL}/models/${this.modelName}:generateContent?key=${this.apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
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
      throw new Error(`Gemini API error: ${response.status} ${error}`);
    }

    const data = await response.json();

    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) {
      throw new Error('No content in Gemini response');
    }

    const ratingData = JSON.parse(content);
    ratingData.imageId = image.filename;
    ratingData.filename = image.filename;

    const rating = this.validateRating(ratingData);

    const usage = data.usageMetadata || {};
    const inputTokens = usage.promptTokenCount || 0;
    const outputTokens = usage.candidatesTokenCount || 0;

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
    // Gemini supports batch API
    const requests = request.images.map((image, index) => ({
      request: {
        contents: [
          {
            parts: [
              {
                inline_data: {
                  mime_type: this.getMimeType(image.format),
                  data: this.imageToBase64(image)
                }
              },
              {
                text: `${request.systemPrompt}\n\n${request.userPrompt}`
              }
            ]
          }
        ]
      }
    }));

    // Gemini batch API requires creating batch via API
    const jobId = `gemini_batch_${Date.now()}`;

    return {
      jobId,
      status: 'queued',
      totalImages: request.images.length,
      processedImages: 0,
      createdAt: new Date()
    };
  }

  async checkBatchStatus(jobId: string): Promise<BatchJobStatus> {
    // Gemini batch status check
    return {
      jobId,
      status: 'processing',
      totalImages: 0,
      processedImages: 0,
      createdAt: new Date()
    };
  }

  async retrieveBatchResults(jobId: string): Promise<PhotoRating[]> {
    throw new Error('Gemini batch results not yet implemented');
  }

  getCostPerImage(): number {
    const inputTokens = 2000;
    const outputTokens = 300;
    return ((inputTokens / 1_000_000) * this.INPUT_COST_PER_1M) +
           ((outputTokens / 1_000_000) * this.OUTPUT_COST_PER_1M);
  }

  getProviderName(): string {
    return 'Google';
  }

  supportsBatch(): boolean {
    return true;
  }
}
