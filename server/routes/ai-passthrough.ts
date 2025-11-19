/**
 * AI Passthrough API
 *
 * Provides passthrough API for native apps to use AI providers without storing API keys.
 * Supports ultra-high concurrency (up to 30k requests/min) with exponential backoff retry.
 */

import { Router, Request, Response } from 'express';
import { AnthropicAdapter } from '../ai/providers/AnthropicAdapter';
import { OpenAIAdapter } from '../ai/providers/OpenAIAdapter';
import { GoogleAdapter } from '../ai/providers/GoogleAdapter';
import { GrokAdapter } from '../ai/providers/GrokAdapter';
import { GroqAdapter } from '../ai/providers/GroqAdapter';
import { BaseProviderAdapter, ImageInput, ProcessImageRequest } from '../ai/BaseProviderAdapter';
import {
  logRequest,
  logRateLimitHit as logHealthRateLimit,
  incrementActiveRequests,
  decrementActiveRequests
} from '../services/providerHealthMonitor';

const router = Router();

// Provider registry
const providers: Record<string, BaseProviderAdapter> = {
  'anthropic': new AnthropicAdapter(),
  'openai': new OpenAIAdapter(),
  'google': new GoogleAdapter(),
  'grok': new GrokAdapter(),
  'groq': new GroqAdapter()
};

// In-memory monitoring (circular buffers)
const MAX_LOG_SIZE = 100;

interface RateLimitLog {
  provider: string;
  timestamp: Date;
  retryAfter: number;
}

interface ErrorLog {
  provider: string;
  error: string;
  timestamp: Date;
  imageId?: string;
}

interface ActiveJob {
  jobId: string;
  provider: string;
  totalImages: number;
  processedImages: number;
  startTime: Date;
  status: string;
}

export const rateLimitLog: RateLimitLog[] = [];
export const errorLog: ErrorLog[] = [];
export const activeJobs: Map<string, ActiveJob> = new Map();

function logRateLimit(provider: string, retryAfter: number) {
  rateLimitLog.push({
    provider,
    timestamp: new Date(),
    retryAfter
  });
  if (rateLimitLog.length > MAX_LOG_SIZE) {
    rateLimitLog.shift();
  }
  // Also log to health monitor
  logHealthRateLimit(provider, retryAfter);
}

function logError(provider: string, error: string, imageId?: string) {
  errorLog.push({
    provider,
    error,
    timestamp: new Date(),
    imageId
  });
  if (errorLog.length > MAX_LOG_SIZE) {
    errorLog.shift();
  }
  console.error(`[${provider}] Error:`, error);
}

/**
 * GET /api/ai/providers
 * List available providers and their pricing
 */
router.get('/providers', (req: Request, res: Response) => {
  const providerInfo = Object.entries(providers).map(([key, adapter]) => ({
    id: key,
    name: adapter.getProviderName(),
    costPerImage: adapter.getCostPerImage(),
    userChargePerImage: adapter.getCostPerImage() * 2,
    supportsBatch: adapter.supportsBatch()
  }));

  res.json({
    providers: providerInfo,
    markup: '2x'
  });
});

/**
 * POST /api/ai/process-single
 * Process a single image with the specified provider
 *
 * Body:
 * - provider: string (anthropic, openai, google, grok, groq)
 * - image: { data: base64 string, format: jpeg|png|webp|heic, filename: string }
 * - systemPrompt: string
 * - userPrompt: string
 */
router.post('/process-single', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const { provider } = req.body;

  try {
    const { image, systemPrompt, userPrompt } = req.body;

    if (!provider || !providers[provider]) {
      return res.status(400).json({
        error: 'Invalid provider. Must be one of: anthropic, openai, google, grok, groq'
      });
    }

    if (!image || !image.data || !image.format || !image.filename) {
      return res.status(400).json({
        error: 'Invalid image. Must include data (base64), format, and filename'
      });
    }

    if (!systemPrompt || !userPrompt) {
      return res.status(400).json({
        error: 'Both systemPrompt and userPrompt are required'
      });
    }

    const adapter = providers[provider];

    // Track active request
    incrementActiveRequests(provider);

    // Convert base64 string to Buffer
    const imageBuffer = Buffer.from(image.data, 'base64');

    const imageInput: ImageInput = {
      data: imageBuffer,
      format: image.format,
      filename: image.filename,
      metadata: image.metadata
    };

    const request: ProcessImageRequest = {
      image: imageInput,
      systemPrompt,
      userPrompt
    };

    // Process with automatic retry
    const result = await adapter.processSingleImage(request);

    // Calculate latency
    const latency = Date.now() - startTime;

    // Log successful request
    logRequest(provider, latency, true, result.cost.totalCostUSD);

    // Decrement active requests
    decrementActiveRequests(provider);

    res.json({
      rating: result.rating,
      cost: result.cost,
      processingTimeMs: result.processingTimeMs,
      provider: adapter.getProviderName()
    });

  } catch (error: any) {
    const providerName = provider || 'unknown';
    const latency = Date.now() - startTime;

    if (error.status === 429) {
      logRateLimit(providerName, error.retryAfter || 0);
    }

    logError(providerName, error.message || String(error), req.body.image?.filename);

    // Log failed request
    logRequest(providerName, latency, false, 0, error.message);

    // Decrement active requests
    decrementActiveRequests(providerName);

    res.status(500).json({
      error: 'Failed to process image',
      message: error.message || String(error)
    });
  }
});

/**
 * POST /api/ai/process-batch
 * Process multiple images concurrently with ultra-high throughput
 *
 * Body:
 * - provider: string
 * - images: Array<{ data: base64, format, filename }>
 * - systemPrompt: string
 * - userPrompt: string
 * - useBatchAPI: boolean (optional, default: false for providers without batch API)
 */
router.post('/process-batch', async (req: Request, res: Response) => {
  try {
    const { provider, images, systemPrompt, userPrompt, useBatchAPI = false } = req.body;

    if (!provider || !providers[provider]) {
      return res.status(400).json({
        error: 'Invalid provider'
      });
    }

    if (!Array.isArray(images) || images.length === 0) {
      return res.status(400).json({
        error: 'Images must be a non-empty array'
      });
    }

    if (!systemPrompt || !userPrompt) {
      return res.status(400).json({
        error: 'Both systemPrompt and userPrompt are required'
      });
    }

    const adapter = providers[provider];

    // If batch API requested but not supported, use concurrent requests
    if (useBatchAPI && !adapter.supportsBatch()) {
      return res.status(400).json({
        error: `Provider ${provider} does not support batch API. Use concurrent single requests instead.`
      });
    }

    if (useBatchAPI && adapter.supportsBatch()) {
      // Use provider's batch API
      const imageInputs: ImageInput[] = images.map(img => ({
        data: Buffer.from(img.data, 'base64'),
        format: img.format,
        filename: img.filename,
        metadata: img.metadata
      }));

      const job = await adapter.submitBatch({
        images: imageInputs,
        systemPrompt,
        userPrompt
      });

      // Track active job
      activeJobs.set(job.jobId, {
        jobId: job.jobId,
        provider: adapter.getProviderName(),
        totalImages: job.totalImages,
        processedImages: job.processedImages,
        startTime: new Date(),
        status: job.status
      });

      return res.json({
        jobId: job.jobId,
        status: job.status,
        totalImages: job.totalImages,
        message: 'Batch job submitted successfully. Use /api/ai/batch-status/:jobId to check progress.'
      });
    }

    // Ultra-high concurrency: Fire ALL requests simultaneously
    console.log(`[${adapter.getProviderName()}] Starting concurrent processing of ${images.length} images`);

    const startTime = Date.now();

    // Create all promises at once
    const promises = images.map(async (img, index) => {
      const imageInput: ImageInput = {
        data: Buffer.from(img.data, 'base64'),
        format: img.format,
        filename: img.filename,
        metadata: img.metadata
      };

      const request: ProcessImageRequest = {
        image: imageInput,
        systemPrompt,
        userPrompt
      };

      try {
        return await adapter.processSingleImage(request);
      } catch (error: any) {
        logError(adapter.getProviderName(), error.message || String(error), img.filename);
        // Return partial result with error
        return {
          rating: null,
          cost: null,
          processingTimeMs: Date.now() - startTime,
          error: error.message || String(error),
          filename: img.filename
        };
      }
    });

    // Wait for ALL to complete (with retries handled internally)
    const results = await Promise.all(promises);

    const totalTime = Date.now() - startTime;
    const successful = results.filter(r => r.rating !== null).length;
    const failed = results.length - successful;

    console.log(`[${adapter.getProviderName()}] Completed ${images.length} images in ${totalTime}ms (${successful} success, ${failed} failed)`);

    res.json({
      results,
      summary: {
        totalImages: images.length,
        successful,
        failed,
        totalTimeMs: totalTime,
        averageTimePerImageMs: totalTime / images.length,
        provider: adapter.getProviderName()
      }
    });

  } catch (error: any) {
    const provider = req.body.provider || 'unknown';
    logError(provider, error.message || String(error));

    res.status(500).json({
      error: 'Failed to process batch',
      message: error.message || String(error)
    });
  }
});

/**
 * GET /api/ai/batch-status/:jobId
 * Check status of a batch job
 */
router.get('/batch-status/:jobId', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const { provider } = req.query;

    if (!provider || typeof provider !== 'string' || !providers[provider]) {
      return res.status(400).json({
        error: 'Valid provider query parameter required'
      });
    }

    const adapter = providers[provider];

    if (!adapter.supportsBatch()) {
      return res.status(400).json({
        error: `Provider ${provider} does not support batch API`
      });
    }

    const status = await adapter.checkBatchStatus(jobId);

    // Update active jobs tracking
    if (activeJobs.has(jobId)) {
      const job = activeJobs.get(jobId)!;
      job.processedImages = status.processedImages;
      job.status = status.status;

      if (status.status === 'completed' || status.status === 'failed') {
        activeJobs.delete(jobId);
      }
    }

    res.json(status);

  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to check batch status',
      message: error.message || String(error)
    });
  }
});

/**
 * GET /api/ai/batch-results/:jobId
 * Retrieve results from a completed batch job
 */
router.get('/batch-results/:jobId', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const { provider } = req.query;

    if (!provider || typeof provider !== 'string' || !providers[provider]) {
      return res.status(400).json({
        error: 'Valid provider query parameter required'
      });
    }

    const adapter = providers[provider];

    if (!adapter.supportsBatch()) {
      return res.status(400).json({
        error: `Provider ${provider} does not support batch API`
      });
    }

    const results = await adapter.retrieveBatchResults(jobId);

    // Clean up from active jobs
    activeJobs.delete(jobId);

    res.json({
      jobId,
      results,
      totalResults: results.length
    });

  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to retrieve batch results',
      message: error.message || String(error)
    });
  }
});

export default router;
