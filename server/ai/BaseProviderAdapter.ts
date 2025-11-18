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

  // Detailed quality metrics (1-1000 scale for slider adjustments)
  technicalQuality: {
    focusAccuracy: number;        // 1-1000: Tack-sharp (1000) to blurry (1)
    exposureQuality: number;      // 1-1000: Proper exposure (RAW = fixable)
    compositionScore: number;     // 1-1000: Rule of thirds, framing, balance
    lightingQuality: number;      // 1-1000: Direction, quality, mood
    colorHarmony: number;         // 1-1000: Color balance, saturation
    noiseLevel: number;           // 1-1000: Clean (1000) to noisy (1) (inverted)
    sharpnessDetail: number;      // 1-1000: Edge definition, detail retention
    dynamicRange: number;         // 1-1000: Highlight/shadow detail
    overallTechnical: number;     // 1-1000: Composite technical score

    // Legacy fields (0-1 scale) - deprecated but kept for compatibility
    sharpness?: number;           // 0-1
    exposure?: number;            // 0-1
    composition?: number;         // 0-1
    overallScore?: number;        // 0-1
  };

  // Subject & moment analysis (1-1000 scale)
  subjectAnalysis: {
    primarySubject: string;       // "Bride", "Groom", "Couple", "Family", etc.
    emotionIntensity: number;     // 1-1000: Peak emotion capture
    eyesOpen: boolean;            // Critical for portraits
    eyeContact: boolean;          // Looking at camera vs candid
    genuineExpression: number;    // 1-1000: Natural vs posed/fake
    facialSharpness: number;      // 1-1000: Face in focus (critical)
    bodyLanguage: number;         // 1-1000: Natural, confident posture
    momentTiming: number;         // 1-1000: Peak action/decisive moment
    storyTelling: number;         // 1-1000: Narrative strength
    uniqueness: number;           // 1-1000: Novel vs duplicate/similar

    // Legacy fields - deprecated but kept for compatibility
    emotion?: string;
    smiling?: boolean;
    inFocus?: boolean;
  };

  // Context & metadata (optional)
  similarityGroup?: string;       // Group ID for near-duplicate detection
  shootContext?: {
    eventType: string;            // "wedding", "portrait", "corporate", etc.
    shootPhase: string;           // "ceremony", "reception", "prep", etc.
    timeOfDay: string;            // "golden-hour", "midday", "evening"
    location: string;             // "indoor", "outdoor", "church", etc.
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
        // New 1-1000 scale fields
        focusAccuracy: this.clamp1to1000(rating.technicalQuality?.focusAccuracy),
        exposureQuality: this.clamp1to1000(rating.technicalQuality?.exposureQuality),
        compositionScore: this.clamp1to1000(rating.technicalQuality?.compositionScore),
        lightingQuality: this.clamp1to1000(rating.technicalQuality?.lightingQuality),
        colorHarmony: this.clamp1to1000(rating.technicalQuality?.colorHarmony),
        noiseLevel: this.clamp1to1000(rating.technicalQuality?.noiseLevel),
        sharpnessDetail: this.clamp1to1000(rating.technicalQuality?.sharpnessDetail),
        dynamicRange: this.clamp1to1000(rating.technicalQuality?.dynamicRange),
        overallTechnical: this.clamp1to1000(rating.technicalQuality?.overallTechnical),
        // Legacy 0-1 scale fields (optional)
        sharpness: rating.technicalQuality?.sharpness !== undefined
          ? this.clamp01(rating.technicalQuality.sharpness)
          : undefined,
        exposure: rating.technicalQuality?.exposure !== undefined
          ? this.clamp01(rating.technicalQuality.exposure)
          : undefined,
        composition: rating.technicalQuality?.composition !== undefined
          ? this.clamp01(rating.technicalQuality.composition)
          : undefined,
        overallScore: rating.technicalQuality?.overallScore !== undefined
          ? this.clamp01(rating.technicalQuality.overallScore)
          : undefined
      },
      subjectAnalysis: {
        primarySubject: rating.subjectAnalysis?.primarySubject || 'Unknown',
        // New 1-1000 scale fields
        emotionIntensity: this.clamp1to1000(rating.subjectAnalysis?.emotionIntensity),
        eyesOpen: rating.subjectAnalysis?.eyesOpen ?? true,
        eyeContact: rating.subjectAnalysis?.eyeContact ?? false,
        genuineExpression: this.clamp1to1000(rating.subjectAnalysis?.genuineExpression),
        facialSharpness: this.clamp1to1000(rating.subjectAnalysis?.facialSharpness),
        bodyLanguage: this.clamp1to1000(rating.subjectAnalysis?.bodyLanguage),
        momentTiming: this.clamp1to1000(rating.subjectAnalysis?.momentTiming),
        storyTelling: this.clamp1to1000(rating.subjectAnalysis?.storyTelling),
        uniqueness: this.clamp1to1000(rating.subjectAnalysis?.uniqueness),
        // Legacy fields (optional)
        emotion: rating.subjectAnalysis?.emotion,
        smiling: rating.subjectAnalysis?.smiling,
        inFocus: rating.subjectAnalysis?.inFocus
      },
      similarityGroup: rating.similarityGroup,
      shootContext: rating.shootContext
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

  private clamp1to1000(value: any): number {
    const num = Number(value);
    if (isNaN(num)) return 500; // Default to middle value
    return Math.max(1, Math.min(1000, Math.round(num)));
  }
}
