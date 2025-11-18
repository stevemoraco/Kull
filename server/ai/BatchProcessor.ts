import { EventEmitter } from 'events';
import type { ProviderId } from '@shared/culling/schemas';
import type { BatchImagePayload } from '../orchestrator';
import type { RatingResult } from '../providers/openai';
import { getGlobalWsService } from '../websocket';
import type { ShootProgressData } from '@shared/types/sync';

export interface ImageInput {
  id: string;
  url?: string;
  b64?: string;
  filename?: string;
  metadata?: any;
  tags?: string[];
}

export interface ProcessingResult {
  imageId: string;
  success: boolean;
  rating?: RatingResult;
  error?: string;
  attempts: number;
  totalRetryTime: number;
}

export interface BatchProcessorOptions {
  maxRetryTime?: number; // Max retry time in ms (default: 6 hours)
  initialBackoff?: number; // Initial backoff in ms (default: 1000)
  maxBackoff?: number; // Max backoff in ms (default: 60000)
  rateLimitBackoff?: number; // Backoff for rate limits (default: 1000)
  broadcastProgress?: boolean; // Whether to broadcast progress updates (default: true)
}

export interface ProviderAdapter {
  processSingleImage(input: {
    image: ImageInput;
    prompt: string;
    systemPrompt?: string;
  }): Promise<RatingResult>;
}

/**
 * Ultra-high concurrency batch processor
 *
 * Features:
 * - Fires ALL photos simultaneously (thousands at once)
 * - Exponential backoff retry: 1s→2s→4s→8s→16s→32s→60s
 * - Retries for up to 6 hours on failures
 * - Real-time progress broadcasting via WebSocket
 * - Never shows failures to users (logs for admin)
 * - Different backoff strategies for rate limits vs other errors
 */
export class BatchProcessor extends EventEmitter {
  private readonly options: Required<BatchProcessorOptions>;
  private readonly SIX_HOURS_MS = 6 * 60 * 60 * 1000;

  constructor(options: BatchProcessorOptions = {}) {
    super();
    this.options = {
      maxRetryTime: options.maxRetryTime ?? this.SIX_HOURS_MS,
      initialBackoff: options.initialBackoff ?? 1000,
      maxBackoff: options.maxBackoff ?? 60000,
      rateLimitBackoff: options.rateLimitBackoff ?? 1000,
      broadcastProgress: options.broadcastProgress ?? true,
    };
  }

  /**
   * Process all images concurrently with retry logic
   * Fires ALL images at once, no batching, no queuing
   */
  async processConcurrent(
    userId: string,
    shootId: string,
    images: ImageInput[],
    provider: ProviderAdapter,
    prompt: string,
    systemPrompt?: string
  ): Promise<ProcessingResult[]> {
    if (!images.length) {
      throw new Error('No images provided');
    }

    console.log(`[BatchProcessor] Starting concurrent processing of ${images.length} images for user ${userId}`);

    // Fire ALL images at once - no batching, no limits
    const promises = images.map((image, index) =>
      this.processWithRetry(
        userId,
        shootId,
        image,
        provider,
        prompt,
        systemPrompt,
        index,
        images.length
      )
    );

    // Wait for all to complete
    const results = await Promise.allSettled(promises);

    // Extract successful results and log failures
    const processingResults: ProcessingResult[] = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        // Log failure for admin, but don't expose to user
        console.error(
          `[BatchProcessor] Image ${index} (${images[index].id}) failed after all retries:`,
          result.reason
        );
        return {
          imageId: images[index].id,
          success: false,
          error: result.reason?.message || 'Unknown error',
          attempts: 0,
          totalRetryTime: 0,
        };
      }
    });

    const successCount = processingResults.filter(r => r.success).length;
    console.log(
      `[BatchProcessor] Completed: ${successCount}/${images.length} successful (${((successCount / images.length) * 100).toFixed(1)}%)`
    );

    return processingResults;
  }

  /**
   * Process a single image with exponential backoff retry
   * Retries for up to 6 hours on failures
   */
  private async processWithRetry(
    userId: string,
    shootId: string,
    image: ImageInput,
    provider: ProviderAdapter,
    prompt: string,
    systemPrompt: string | undefined,
    index: number,
    total: number,
    attempt: number = 0,
    startTime: number = Date.now()
  ): Promise<ProcessingResult> {
    const elapsedTime = Date.now() - startTime;

    try {
      // Process the image
      const rating = await provider.processSingleImage({
        image,
        prompt,
        systemPrompt,
      });

      // Broadcast progress update
      if (this.options.broadcastProgress) {
        this.broadcastProgress(userId, shootId, index + 1, total, 'processing');
      }

      return {
        imageId: image.id,
        success: true,
        rating,
        attempts: attempt + 1,
        totalRetryTime: elapsedTime,
      };

    } catch (error: any) {
      // Check if we should retry
      if (!this.shouldRetry(elapsedTime, attempt)) {
        console.error(
          `[BatchProcessor] Image ${image.id} failed permanently after ${attempt + 1} attempts (${(elapsedTime / 1000).toFixed(1)}s)`,
          error.message
        );
        throw error;
      }

      // Calculate backoff delay
      const delay = this.calculateBackoff(attempt, error);

      // Log retry for admin visibility
      console.warn(
        `[BatchProcessor] Image ${image.id} attempt ${attempt + 1} failed: ${error.message}. Retrying in ${delay}ms`
      );

      // Wait before retry
      await this.sleep(delay);

      // Retry recursively
      return this.processWithRetry(
        userId,
        shootId,
        image,
        provider,
        prompt,
        systemPrompt,
        index,
        total,
        attempt + 1,
        startTime
      );
    }
  }

  /**
   * Determine if we should retry based on elapsed time
   */
  private shouldRetry(elapsedTime: number, attempt: number): boolean {
    // Always retry if we haven't exceeded max retry time (6 hours)
    return elapsedTime < this.options.maxRetryTime;
  }

  /**
   * Calculate exponential backoff delay
   * Rate limits: Aggressive retry (1s→2s→4s→8s→16s→32s→60s max)
   * Other errors: Cautious retry (2s→4s→8s→16s→32s→60s→120s max)
   */
  private calculateBackoff(attempt: number, error: any): number {
    const isRateLimit = this.isRateLimitError(error);

    if (isRateLimit) {
      // Aggressive retry for rate limits
      const backoff = Math.pow(2, attempt) * this.options.rateLimitBackoff;
      return Math.min(backoff, this.options.maxBackoff);
    } else {
      // Cautious retry for other errors
      const backoff = Math.pow(2, attempt) * this.options.initialBackoff * 2;
      return Math.min(backoff, this.options.maxBackoff * 2); // Max 2 minutes
    }
  }

  /**
   * Check if error is a rate limit error
   */
  private isRateLimitError(error: any): boolean {
    if (!error) return false;

    // Check status code
    if (error.statusCode === 429 || error.status === 429) {
      return true;
    }

    // Check error message
    const message = (error.message || '').toLowerCase();
    return (
      message.includes('rate limit') ||
      message.includes('too many requests') ||
      message.includes('quota exceeded') ||
      message.includes('429')
    );
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Broadcast progress update via WebSocket
   */
  private broadcastProgress(
    userId: string,
    shootId: string,
    processed: number,
    total: number,
    status: 'processing' | 'completed' | 'failed'
  ): void {
    const wsService = getGlobalWsService();
    if (!wsService) {
      console.warn('[BatchProcessor] WebSocket service not available for progress updates');
      return;
    }

    const progressData: ShootProgressData = {
      shootId,
      status,
      processedCount: processed,
      totalCount: total,
      provider: 'batch-processor',
      eta: this.estimateETA(processed, total),
    };

    wsService.broadcastToUser(userId, {
      type: 'SHOOT_PROGRESS',
      data: progressData,
      timestamp: Date.now(),
      deviceId: 'server',
      userId,
    });
  }

  /**
   * Estimate time remaining in seconds
   */
  private estimateETA(processed: number, total: number): number | undefined {
    if (processed === 0 || processed >= total) {
      return undefined;
    }

    // Rough estimate: assume 2 seconds per image on average
    const remaining = total - processed;
    return remaining * 2;
  }
}

/**
 * Global singleton instance
 */
export const batchProcessor = new BatchProcessor();
