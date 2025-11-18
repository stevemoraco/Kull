/**
 * OpenAI GPT Provider Adapter
 * Model: gpt-5-nano
 * Pricing: Input $0.05/1M tokens | Output $0.40/1M tokens
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

export class OpenAIAdapter extends BaseProviderAdapter {
  protected apiKey: string;
  protected baseURL: string;
  protected modelName = 'gpt-5-nano';

  private readonly INPUT_COST_PER_1M = 0.05;
  private readonly OUTPUT_COST_PER_1M = 0.40;
  private readonly BATCH_INPUT_COST_PER_1M = 0.025;
  private readonly BATCH_OUTPUT_COST_PER_1M = 0.20;

  constructor() {
    super();
    this.apiKey = config.openai.apiKey;
    this.baseURL = config.openai.baseURL;
  }

  async processSingleImage(request: ProcessImageRequest): Promise<ProcessingResult> {
    const startTime = Date.now();

    const result = await this.retryWithBackoff(async () => {
      return await this.callOpenAIAPI(request);
    });

    const processingTimeMs = Date.now() - startTime;

    return {
      rating: result.rating,
      cost: result.cost,
      processingTimeMs
    };
  }

  private async callOpenAIAPI(request: ProcessImageRequest): Promise<{
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
            focusAccuracy: { type: 'integer', minimum: 1, maximum: 1000 },
            exposureQuality: { type: 'integer', minimum: 1, maximum: 1000 },
            compositionScore: { type: 'integer', minimum: 1, maximum: 1000 },
            lightingQuality: { type: 'integer', minimum: 1, maximum: 1000 },
            colorHarmony: { type: 'integer', minimum: 1, maximum: 1000 },
            noiseLevel: { type: 'integer', minimum: 1, maximum: 1000 },
            sharpnessDetail: { type: 'integer', minimum: 1, maximum: 1000 },
            dynamicRange: { type: 'integer', minimum: 1, maximum: 1000 },
            overallTechnical: { type: 'integer', minimum: 1, maximum: 1000 },
            // Legacy 0-1 fields for backward compatibility
            sharpness: { type: 'number' },
            exposure: { type: 'number' },
            composition: { type: 'number' },
            overallScore: { type: 'number' }
          },
          required: ['focusAccuracy', 'exposureQuality', 'compositionScore', 'lightingQuality',
                     'colorHarmony', 'noiseLevel', 'sharpnessDetail', 'dynamicRange', 'overallTechnical']
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
            uniqueness: { type: 'integer', minimum: 1, maximum: 1000 },
            // Legacy fields for backward compatibility
            emotion: { type: 'string' },
            smiling: { type: 'boolean' },
            inFocus: { type: 'boolean' }
          },
          required: ['primarySubject', 'emotionIntensity', 'eyesOpen', 'eyeContact',
                     'genuineExpression', 'facialSharpness', 'bodyLanguage', 'momentTiming',
                     'storyTelling', 'uniqueness']
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
      required: ['starRating', 'colorLabel', 'keepReject', 'description', 'technicalQuality', 'subjectAnalysis'],
      additionalProperties: false
    };

    const body = {
      model: this.modelName,
      messages: [
        {
          role: 'system',
          content: request.systemPrompt + '\n\nREMINDER: These are RAW images - exposure and white balance issues are fixable in post-production. Focus on composition, sharpness, emotion, and moment.'
        },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
                detail: 'high'
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
        json_schema: {
          name: 'photo_rating',
          schema: responseSchema,
          strict: true
        }
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
      throw new Error(`OpenAI API error: ${response.status} ${error}`);
    }

    const data = await response.json();

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('No content in OpenAI response');
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
    // Create response schema with 1-1000 ratings for batch requests
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
          required: ['focusAccuracy', 'exposureQuality', 'compositionScore', 'lightingQuality',
                     'colorHarmony', 'noiseLevel', 'sharpnessDetail', 'dynamicRange', 'overallTechnical']
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
          required: ['primarySubject', 'emotionIntensity', 'eyesOpen', 'eyeContact',
                     'genuineExpression', 'facialSharpness', 'bodyLanguage', 'momentTiming',
                     'storyTelling', 'uniqueness']
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
      required: ['starRating', 'colorLabel', 'keepReject', 'description', 'technicalQuality', 'subjectAnalysis']
    };

    // OpenAI Batch API implementation with structured outputs
    const batchRequests = request.images.map((image, index) => ({
      custom_id: `image_${index}_${Date.now()}`,
      method: 'POST',
      url: '/v1/chat/completions',
      body: {
        model: this.modelName,
        messages: [
          {
            role: 'system',
            content: request.systemPrompt + '\n\nREMINDER: These are RAW images - exposure and white balance issues are fixable in post-production. Focus on composition, sharpness, emotion, and moment.'
          },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: `data:${this.getMimeType(image.format)};base64,${this.imageToBase64(image)}`,
                  detail: 'high'
                }
              },
              { type: 'text', text: request.userPrompt }
            ]
          }
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'photo_rating',
            schema: responseSchema,
            strict: true
          }
        },
        max_tokens: 2000
      }
    }));

    // Convert to JSONL format (one JSON object per line)
    const jsonlContent = batchRequests.map(r => JSON.stringify(r)).join('\n');

    // Upload JSONL file to OpenAI Files API
    const FormData = (await import('formdata-node')).FormData;
    const { Blob } = await import('buffer');

    const formData = new FormData();
    formData.append('purpose', 'batch');
    formData.append('file', new Blob([jsonlContent]), 'batch_input.jsonl');

    const uploadResponse = await fetch(`${this.baseURL}/files`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: formData as any
    });

    if (!uploadResponse.ok) {
      const error = await uploadResponse.text();
      throw new Error(`Failed to upload batch file: ${uploadResponse.status} ${error}`);
    }

    const fileData = await uploadResponse.json();
    const inputFileId = fileData.id;

    if (!inputFileId) {
      throw new Error('No file ID returned from OpenAI Files API');
    }

    // Create batch job with real file ID
    const batchResponse = await fetch(`${this.baseURL}/batches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        input_file_id: inputFileId,
        endpoint: '/v1/chat/completions',
        completion_window: '24h'
      })
    });

    if (!batchResponse.ok) {
      const error = await batchResponse.text();
      throw new Error(`Failed to create batch: ${batchResponse.status} ${error}`);
    }

    const batchData = await batchResponse.json();

    return {
      jobId: batchData.id,
      status: 'queued',
      totalImages: request.images.length,
      processedImages: 0,
      createdAt: new Date(),
      estimatedCompletionTime: new Date(Date.now() + 30 * 60 * 1000) // Estimate 30 minutes
    };
  }

  async checkBatchStatus(jobId: string): Promise<BatchJobStatus> {
    const response = await fetch(`${this.baseURL}/batches/${jobId}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    });

    const data = await response.json();

    const statusMap: Record<string, BatchJobStatus['status']> = {
      'validating': 'queued',
      'in_progress': 'processing',
      'finalizing': 'processing',
      'completed': 'completed',
      'failed': 'failed',
      'expired': 'failed',
      'cancelled': 'failed'
    };

    return {
      jobId: data.id,
      status: statusMap[data.status] || 'queued',
      totalImages: data.request_counts?.total || 0,
      processedImages: data.request_counts?.completed || 0,
      createdAt: new Date(data.created_at * 1000)
    };
  }

  async retrieveBatchResults(jobId: string): Promise<PhotoRating[]> {
    const status = await this.checkBatchStatus(jobId);
    if (status.status !== 'completed') {
      throw new Error(`Batch not completed: ${status.status}`);
    }

    // Download results file
    const response = await fetch(`${this.baseURL}/batches/${jobId}/results`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    });

    const resultsText = await response.text();
    const results = resultsText.split('\n').filter(Boolean).map(line => JSON.parse(line));

    const ratings: PhotoRating[] = [];
    for (const result of results) {
      if (result.response?.body?.choices?.[0]?.message?.content) {
        try {
          const ratingData = JSON.parse(result.response.body.choices[0].message.content);
          ratings.push(this.validateRating(ratingData));
        } catch (e) {
          console.error('Failed to parse rating:', e);
        }
      }
    }

    return ratings;
  }

  getCostPerImage(): number {
    const inputTokens = 2000;
    const outputTokens = 300;
    return ((inputTokens / 1_000_000) * this.INPUT_COST_PER_1M) +
           ((outputTokens / 1_000_000) * this.OUTPUT_COST_PER_1M);
  }

  getProviderName(): string {
    return 'OpenAI';
  }

  supportsBatch(): boolean {
    return true;
  }
}
