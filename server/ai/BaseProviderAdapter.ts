/**
 * Base Provider Adapter for AI Photo Culling
 *
 * All provider adapters MUST extend this class and implement all abstract methods.
 * This ensures consistent interface across Anthropic, OpenAI, Google, Grok, and Groq.
 */

export interface ImageInput {
  data: Buffer;
  format: 'jpeg' | 'png' | 'webp' | 'heic';
  filename: string;
  metadata?: ImageMetadata;
}

export interface ImageMetadata {
  captureDate?: string;
  cameraMake?: string;
  cameraModel?: string;
  lensModel?: string;
  exposure?: {
    shutterSpeed?: string;
    aperture?: string;
    iso?: number;
    focalLength?: string;
    exposureCompensation?: string;
  };
  gps?: {
    latitude?: number;
    longitude?: number;
    altitude?: number;
    resolvedAddress?: string;
    nearbyVenues?: Array<{
      name: string;
      category: string;
      distanceMeters: number;
    }>;
  };
  iptc?: {
    title?: string;
    description?: string;
    keywords?: string[];
    people?: string[];
    clientName?: string;
    eventName?: string;
    location?: string;
  };
}

export interface PhotoRating {
  imageId: string;
  filename: string;
  starRating: 1 | 2 | 3 | 4 | 5;
  colorLabel: 'red' | 'yellow' | 'green' | 'blue' | 'purple' | 'none';
  keepReject: 'keep' | 'reject' | 'maybe';
  tags: string[];
  description: string;
  technicalQuality: {
    sharpness: number;     // 0-1
    exposure: number;      // 0-1
    composition: number;   // 0-1
    overallScore: number;  // 0-1
  };
  subjectAnalysis: {
    primarySubject: string;
    emotion: string;
    eyesOpen: boolean;
    smiling: boolean;
    inFocus: boolean;
  };
}

export interface ProcessImageRequest {
  image: ImageInput;
  systemPrompt: string;
  userPrompt: string;
}

export interface BatchImageRequest {
  images: ImageInput[];
  systemPrompt: string;
  userPrompt: string;
}

export interface BatchJob {
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  totalImages: number;
  processedImages: number;
  createdAt: Date;
  estimatedCompletionTime?: Date;
}

export interface BatchJobStatus extends BatchJob {
  results?: PhotoRating[];
  error?: string;
}

export interface CostBreakdown {
  inputTokens: number;
  outputTokens: number;
  inputCostUSD: number;
  outputCostUSD: number;
  totalCostUSD: number;
  userChargeUSD: number; // 2x markup
}

export interface ProcessingResult {
  rating: PhotoRating;
  cost: CostBreakdown;
  processingTimeMs: number;
}

export interface RetryConfig {
  maxRetries: number;
  initialBackoffMs: number;
  maxBackoffMs: number;
  maxRetryTimeMs: number; // 6 hours
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 1000,
  initialBackoffMs: 1000,
  maxBackoffMs: 60000,
  maxRetryTimeMs: 6 * 60 * 60 * 1000 // 6 hours
};

/**
 * Base class for all AI provider adapters
 */
export abstract class BaseProviderAdapter {
  protected abstract apiKey: string;
  protected abstract baseURL: string;
  protected abstract modelName: string;

  /**
   * Process a single image and return rating + cost
   * This method MUST handle retries with exponential backoff internally
   */
  abstract processSingleImage(request: ProcessImageRequest): Promise<ProcessingResult>;

  /**
   * Submit a batch job (if provider supports batch API)
   * @throws Error if batch processing not supported
   */
  abstract submitBatch(request: BatchImageRequest): Promise<BatchJob>;

  /**
   * Check batch job status
   * @throws Error if batch processing not supported
   */
  abstract checkBatchStatus(jobId: string): Promise<BatchJobStatus>;

  /**
   * Retrieve completed batch results
   * @throws Error if batch processing not supported or job not complete
   */
  abstract retrieveBatchResults(jobId: string): Promise<PhotoRating[]>;

  /**
   * Get cost per image in USD (provider cost, NOT user cost)
   * User will be charged 2x this amount
   */
  abstract getCostPerImage(): number;

  /**
   * Get provider name for logging and monitoring
   */
  abstract getProviderName(): string;

  /**
   * Check if provider supports batch API
   */
  abstract supportsBatch(): boolean;

  /**
   * Exponential backoff retry with 1s→2s→4s→8s→16s→32s→60s (max)
   * Retries for up to 6 hours
   */
  protected async retryWithBackoff<T>(
    operation: () => Promise<T>,
    config: RetryConfig = DEFAULT_RETRY_CONFIG
  ): Promise<T> {
    let attempt = 0;
    let backoffMs = config.initialBackoffMs;
    const startTime = Date.now();

    while (true) {
      try {
        return await operation();
      } catch (error: any) {
        attempt++;
        const elapsedMs = Date.now() - startTime;

        // Check if we've exceeded max retry time
        if (elapsedMs >= config.maxRetryTimeMs) {
          console.error(
            `[${this.getProviderName()}] Retry timeout after ${elapsedMs}ms (${attempt} attempts)`
          );
          throw error;
        }

        // Check if we've exceeded max retries
        if (attempt >= config.maxRetries) {
          console.error(
            `[${this.getProviderName()}] Max retries (${config.maxRetries}) exceeded`
          );
          throw error;
        }

        // For rate limit errors, use retry-after header if available
        if (error.status === 429 && error.retryAfter) {
          backoffMs = error.retryAfter * 1000;
        }

        // Cap backoff at max
        backoffMs = Math.min(backoffMs, config.maxBackoffMs);

        console.warn(
          `[${this.getProviderName()}] Retry attempt ${attempt} after ${backoffMs}ms (error: ${error.message || error})`
        );

        // Wait before retry
        await this.sleep(backoffMs);

        // Exponential backoff for next attempt
        backoffMs = Math.min(backoffMs * 2, config.maxBackoffMs);
      }
    }
  }

  /**
   * Sleep utility for backoff
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Convert image to base64 for API requests
   */
  protected imageToBase64(image: ImageInput): string {
    return image.data.toString('base64');
  }

  /**
   * Get MIME type for image format
   */
  protected getMimeType(format: string): string {
    const mimeTypes: Record<string, string> = {
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'webp': 'image/webp',
      'heic': 'image/heic'
    };
    return mimeTypes[format] || 'image/jpeg';
  }

  /**
   * Calculate user charge (2x provider cost)
   */
  protected calculateUserCharge(providerCostUSD: number): number {
    return providerCostUSD * 2;
  }

  /**
   * Validate rating response structure
   */
  protected validateRating(rating: Partial<PhotoRating>): PhotoRating {
    // Ensure all required fields exist with defaults
    return {
      imageId: rating.imageId || '',
      filename: rating.filename || '',
      starRating: this.clampStarRating(rating.starRating),
      colorLabel: this.validateColorLabel(rating.colorLabel),
      keepReject: this.validateKeepReject(rating.keepReject, rating.starRating),
      tags: rating.tags || [],
      description: rating.description || '',
      technicalQuality: {
        sharpness: this.clamp01(rating.technicalQuality?.sharpness),
        exposure: this.clamp01(rating.technicalQuality?.exposure),
        composition: this.clamp01(rating.technicalQuality?.composition),
        overallScore: this.clamp01(rating.technicalQuality?.overallScore)
      },
      subjectAnalysis: {
        primarySubject: rating.subjectAnalysis?.primarySubject || 'Unknown',
        emotion: rating.subjectAnalysis?.emotion || 'Neutral',
        eyesOpen: rating.subjectAnalysis?.eyesOpen ?? true,
        smiling: rating.subjectAnalysis?.smiling ?? false,
        inFocus: rating.subjectAnalysis?.inFocus ?? true
      }
    };
  }

  private clampStarRating(value: any): 1 | 2 | 3 | 4 | 5 {
    const num = Number(value);
    // Use 3 as default only if value is not a valid number
    const normalizedNum = isNaN(num) ? 3 : num;
    const clamped = Math.max(1, Math.min(5, Math.round(normalizedNum)));
    return clamped as 1 | 2 | 3 | 4 | 5;
  }

  private validateColorLabel(value: any): 'red' | 'yellow' | 'green' | 'blue' | 'purple' | 'none' {
    const valid = ['red', 'yellow', 'green', 'blue', 'purple', 'none'];
    return valid.includes(value) ? value : 'none';
  }

  private validateKeepReject(value: any, starRating?: any): 'keep' | 'reject' | 'maybe' {
    const valid = ['keep', 'reject', 'maybe'];
    if (valid.includes(value)) return value;

    // Infer from star rating if not provided
    const stars = Number(starRating) || 3;
    if (stars >= 4) return 'keep';
    if (stars <= 2) return 'reject';
    return 'maybe';
  }

  private clamp01(value: any): number {
    const num = Number(value);
    if (isNaN(num)) return 0.5;
    return Math.max(0, Math.min(1, num));
  }
}
