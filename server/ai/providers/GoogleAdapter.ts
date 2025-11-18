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

    const responseSchema = this.getResponseSchema();

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
    const responseSchema = this.getResponseSchema();

    // Build inline requests (Google supports up to 20MB inline)
    const inlineRequests = request.images.map((image, index) => {
      const base64Image = this.imageToBase64(image);
      const mimeType = this.getMimeType(image.format);

      return {
        key: `image-${index}-${image.filename}`,
        request: {
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
                  text: `${request.systemPrompt}\n\n${request.userPrompt}\n\nREMINDER: These are RAW images - exposure and white balance are fully correctable in post-production. Rate exposure quality based on whether detail is retained, not current brightness. Focus accuracy and moment timing cannot be fixed - prioritize these heavily.`
                }
              ]
            }
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema
          }
        }
      };
    });

    // Submit batch job using inline requests
    const batchUrl = `${this.baseURL}/models/${this.modelName}:batchGenerateContent`;

    const batchResponse = await fetch(batchUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': this.apiKey
      },
      body: JSON.stringify({
        batch: {
          displayName: `kull-batch-${Date.now()}`,
          requests: inlineRequests
        }
      })
    });

    if (!batchResponse.ok) {
      const error = await batchResponse.text();
      throw new Error(`Google Batch API submission failed: ${batchResponse.status} ${error}`);
    }

    const batchJob = await batchResponse.json();

    // Extract estimated completion time if available
    let estimatedCompletionTime: Date | undefined;
    if (batchJob.metadata?.estimatedCompletionTime) {
      estimatedCompletionTime = new Date(batchJob.metadata.estimatedCompletionTime);
    } else {
      // Default estimate: 24 hours from now (per Google docs)
      estimatedCompletionTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
    }

    return {
      jobId: batchJob.name, // Job name from Google API
      status: this.mapGoogleJobState(batchJob.state),
      totalImages: request.images.length,
      processedImages: 0,
      createdAt: new Date(),
      estimatedCompletionTime
    };
  }

  /**
   * Map Google job state to our standard status
   */
  private mapGoogleJobState(state: string): 'queued' | 'processing' | 'completed' | 'failed' {
    const stateMap: Record<string, 'queued' | 'processing' | 'completed' | 'failed'> = {
      'JOB_STATE_PENDING': 'queued',
      'JOB_STATE_RUNNING': 'processing',
      'JOB_STATE_SUCCEEDED': 'completed',
      'JOB_STATE_FAILED': 'failed',
      'JOB_STATE_CANCELLED': 'failed',
      'JOB_STATE_EXPIRED': 'failed'
    };
    return stateMap[state] || 'queued';
  }

  async checkBatchStatus(jobId: string): Promise<BatchJobStatus> {
    const statusUrl = `${this.baseURL}/${jobId}`;

    const response = await fetch(statusUrl, {
      method: 'GET',
      headers: {
        'x-goog-api-key': this.apiKey
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to check batch status: ${response.status} ${error}`);
    }

    const jobData = await response.json();

    // Calculate progress from stats if available
    const totalTasks = parseInt(jobData.batchStats?.requestCount || '0');
    const successfulTasks = parseInt(jobData.batchStats?.successfulRequestCount || '0');
    const failedTasks = parseInt(jobData.batchStats?.failedRequestCount || '0');
    const completedTasks = successfulTasks + failedTasks;

    const status: BatchJobStatus = {
      jobId: jobData.name,
      status: this.mapGoogleJobState(jobData.state),
      totalImages: totalTasks,
      processedImages: completedTasks,
      createdAt: new Date(jobData.createTime),
      estimatedCompletionTime: jobData.endTime
        ? new Date(jobData.endTime)
        : new Date(Date.now() + 24 * 60 * 60 * 1000) // Default 24h estimate
    };

    // Add error if job failed
    if (jobData.error) {
      status.error = jobData.error.message || 'Batch job failed';
    }

    // Store the complete job data for retrieval (includes inline responses)
    (status as any)._jobData = jobData;

    return status;
  }

  async retrieveBatchResults(jobId: string): Promise<PhotoRating[]> {
    // First check if job is complete
    const status = await this.checkBatchStatus(jobId);

    if (status.status !== 'completed') {
      throw new Error(
        `Batch job ${jobId} is not complete. Current status: ${status.status}`
      );
    }

    // Get job data from status (contains inline responses)
    const jobData = (status as any)._jobData;
    if (!jobData) {
      throw new Error('No job data found in batch status');
    }

    // Handle inline responses (most common for our use case)
    if (jobData.dest?.inlinedResponses?.inlinedResponses) {
      return this.parseInlineResponses(jobData.dest.inlinedResponses.inlinedResponses);
    }

    // Handle file-based responses (for very large batches)
    if (jobData.dest?.responsesFile) {
      return this.parseFileResponses(jobData.dest.responsesFile);
    }

    throw new Error('No results found in completed batch job');
  }

  /**
   * Parse inline batch responses
   */
  private parseInlineResponses(inlinedResponses: any[]): PhotoRating[] {
    const results: PhotoRating[] = [];

    for (const item of inlinedResponses) {
      try {
        // Check if this is an error response
        if (item.error) {
          console.error(`Error in batch result:`, item.error);
          continue;
        }

        // Extract the response content
        const response = item.response;
        if (!response?.candidates?.[0]?.content?.parts?.[0]?.text) {
          console.error(`No content in batch result for key ${item.metadata?.key}`);
          continue;
        }

        const content = response.candidates[0].content.parts[0].text;
        const ratingData = JSON.parse(content);

        // Extract filename from metadata key (format: "image-{index}-{filename}")
        const key = item.metadata?.key || '';
        const keyParts = key.split('-');
        const filename = keyParts.slice(2).join('-'); // Handle filenames with hyphens

        ratingData.imageId = filename;
        ratingData.filename = filename;

        const rating = this.validateRating(ratingData);
        results.push(rating);
      } catch (err) {
        console.error(`Failed to parse inline batch result:`, err);
        continue;
      }
    }

    return results;
  }

  /**
   * Parse file-based batch responses
   */
  private async parseFileResponses(fileId: string): Promise<PhotoRating[]> {
    // Download results file
    const downloadUrl = `${this.baseURL.replace('/v1beta', '')}/download/v1beta/${fileId}?alt=media`;

    const response = await fetch(downloadUrl, {
      method: 'GET',
      headers: {
        'x-goog-api-key': this.apiKey
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to download batch results: ${response.status} ${error}`);
    }

    const jsonlContent = await response.text();

    // Parse JSONL results
    const results: PhotoRating[] = [];
    const lines = jsonlContent.split('\n').filter(line => line.trim());

    for (const line of lines) {
      try {
        const resultData = JSON.parse(line);

        // Check if this is an error response
        if (resultData.error) {
          console.error(`Error in batch result for key ${resultData.key}:`, resultData.error);
          continue;
        }

        // Extract the response content
        const response = resultData.response;
        if (!response?.candidates?.[0]?.content?.parts?.[0]?.text) {
          console.error(`No content in batch result for key ${resultData.key}`);
          continue;
        }

        const content = response.candidates[0].content.parts[0].text;
        const ratingData = JSON.parse(content);

        // Extract filename from key (format: "image-{index}-{filename}")
        const keyParts = resultData.key.split('-');
        const filename = keyParts.slice(2).join('-'); // Handle filenames with hyphens

        ratingData.imageId = filename;
        ratingData.filename = filename;

        const rating = this.validateRating(ratingData);
        results.push(rating);
      } catch (err) {
        console.error(`Failed to parse batch result line:`, err);
        continue;
      }
    }

    return results;
  }

  getCostPerImage(): number {
    const inputTokens = 2000;
    const outputTokens = 1500;
    return ((inputTokens / 1_000_000) * this.INPUT_COST_PER_1M) +
           ((outputTokens / 1_000_000) * this.OUTPUT_COST_PER_1M);
  }

  getBatchCostPerImage(): number {
    return this.getCostPerImage() * 0.5; // 50% discount for batch API
  }

  getProviderName(): string {
    return 'Google';
  }

  supportsBatch(): boolean {
    return true;
  }

  /**
   * Get complete response schema with all 1-1000 scale fields
   */
  private getResponseSchema() {
    return {
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
            // Legacy 0-1 fields for compatibility
            sharpness: { type: 'number', minimum: 0, maximum: 1 },
            exposure: { type: 'number', minimum: 0, maximum: 1 },
            composition: { type: 'number', minimum: 0, maximum: 1 },
            overallScore: { type: 'number', minimum: 0, maximum: 1 }
          }
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
            // Legacy fields for compatibility
            emotion: { type: 'string' },
            smiling: { type: 'boolean' },
            inFocus: { type: 'boolean' }
          }
        },
        similarityGroup: { type: 'string' },
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
      required: ['starRating', 'colorLabel', 'keepReject', 'description']
    };
  }
}
