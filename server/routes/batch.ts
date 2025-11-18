import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { batchProcessor } from '../ai/BatchProcessor';
import type { ImageInput } from '../ai/BatchProcessor';
import { submitOpenAIBatch } from '../providers/openai';
import type { BatchImagePayload } from '../orchestrator';
import { getProvider } from '@shared/culling/providers';
import type { ProviderId } from '@shared/culling/schemas';
import { db } from '../db';
import { batchJobs } from '@shared/schema';
import { eq } from 'drizzle-orm';

export const batchRouter = Router();

/**
 * Request schemas
 */
const ProcessBatchSchema = z.object({
  shootId: z.string(),
  images: z.array(
    z.object({
      id: z.string(),
      url: z.string().optional(),
      b64: z.string().optional(),
      filename: z.string().optional(),
      metadata: z.any().optional(),
      tags: z.array(z.string()).optional(),
    })
  ),
  providerId: z.string(),
  prompt: z.string(),
  systemPrompt: z.string().optional(),
  mode: z.enum(['fast', 'economy']).default('fast'),
});

type ProcessBatchRequest = z.infer<typeof ProcessBatchSchema>;

/**
 * POST /api/batch/process
 *
 * Process a batch of images with specified provider
 *
 * Modes:
 * - fast: Ultra-high concurrency, fire all images at once
 * - economy: Use provider batch API if available (50% off)
 */
batchRouter.post('/process', async (req: Request, res: Response) => {
  try {
    // Validate request
    const validationResult = ProcessBatchSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: validationResult.error.errors,
      });
    }

    const data: ProcessBatchRequest = validationResult.data;

    // Get user ID from session/auth
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Validate provider
    const provider = getProvider(data.providerId as ProviderId);
    if (!provider) {
      return res.status(400).json({ error: 'Invalid provider' });
    }

    console.log(
      `[BatchAPI] Processing ${data.images.length} images for user ${userId} with ${data.providerId} in ${data.mode} mode`
    );

    // Create batch job record
    const jobId = `batch_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    await db.insert(batchJobs).values({
      id: jobId,
      userId,
      shootId: data.shootId,
      providerId: data.providerId as ProviderId,
      status: 'processing',
      totalImages: data.images.length,
      processedImages: 0,
      mode: data.mode,
      createdAt: new Date(),
      startedAt: new Date(),
    });

    // Process based on mode
    if (data.mode === 'fast') {
      // Fast mode: Ultra-high concurrency
      processFastMode(userId, jobId, data).catch(error => {
        console.error('[BatchAPI] Fast mode processing error:', error);
        updateJobStatus(jobId, 'failed', error.message);
      });

      return res.status(202).json({
        jobId,
        message: 'Batch processing started',
        mode: 'fast',
        totalImages: data.images.length,
      });

    } else {
      // Economy mode: Use provider batch API if available
      if (!supportsEconomyMode(data.providerId as ProviderId)) {
        return res.status(400).json({
          error: 'Provider does not support economy mode',
        });
      }

      processEconomyMode(userId, jobId, data).catch(error => {
        console.error('[BatchAPI] Economy mode processing error:', error);
        updateJobStatus(jobId, 'failed', error.message);
      });

      return res.status(202).json({
        jobId,
        message: 'Batch job submitted to provider',
        mode: 'economy',
        totalImages: data.images.length,
        estimatedCompletionTime: '10-30 minutes',
      });
    }

  } catch (error: any) {
    console.error('[BatchAPI] Error processing batch:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
});

/**
 * GET /api/batch/status/:jobId
 *
 * Get status of a batch job
 */
batchRouter.get('/status/:jobId', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get job from database
    const jobs = await db
      .select()
      .from(batchJobs)
      .where(eq(batchJobs.id, jobId))
      .limit(1);

    if (!jobs.length) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const job = jobs[0];

    // Verify ownership
    if (job.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    return res.json({
      jobId: job.id,
      status: job.status,
      totalImages: job.totalImages,
      processedImages: job.processedImages,
      progress: job.totalImages > 0 ? job.processedImages / job.totalImages : 0,
      mode: job.mode,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      error: job.error,
    });

  } catch (error: any) {
    console.error('[BatchAPI] Error getting job status:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
});

/**
 * GET /api/batch/results/:jobId
 *
 * Get results of a completed batch job
 */
batchRouter.get('/results/:jobId', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get job from database
    const jobs = await db
      .select()
      .from(batchJobs)
      .where(eq(batchJobs.id, jobId))
      .limit(1);

    if (!jobs.length) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const job = jobs[0];

    // Verify ownership
    if (job.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Check if job is completed
    if (job.status !== 'completed') {
      return res.status(400).json({
        error: 'Job not completed',
        status: job.status,
      });
    }

    return res.json({
      jobId: job.id,
      results: job.results || [],
      totalImages: job.totalImages,
      processedImages: job.processedImages,
      completedAt: job.completedAt,
    });

  } catch (error: any) {
    console.error('[BatchAPI] Error getting job results:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
});

/**
 * POST /api/batch/cancel/:jobId
 *
 * Cancel a running batch job
 */
batchRouter.post('/cancel/:jobId', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get job from database
    const jobs = await db
      .select()
      .from(batchJobs)
      .where(eq(batchJobs.id, jobId))
      .limit(1);

    if (!jobs.length) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const job = jobs[0];

    // Verify ownership
    if (job.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Check if job can be cancelled
    if (job.status !== 'processing') {
      return res.status(400).json({
        error: 'Job cannot be cancelled',
        status: job.status,
      });
    }

    // Update job status
    await db
      .update(batchJobs)
      .set({
        status: 'failed',
        error: 'Cancelled by user',
        completedAt: new Date(),
      })
      .where(eq(batchJobs.id, jobId));

    return res.json({
      jobId: job.id,
      message: 'Job cancelled successfully',
    });

  } catch (error: any) {
    console.error('[BatchAPI] Error cancelling job:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
});

/**
 * Helper: Get provider adapter by ID
 */
function getProviderAdapter(providerId: ProviderId): any {
  // Import adapters
  const { OpenAIAdapter } = require('../ai/providers/OpenAIAdapter');
  const { AnthropicAdapter } = require('../ai/providers/AnthropicAdapter');
  const { GoogleAdapter } = require('../ai/providers/GoogleAdapter');

  if (providerId === 'openai-gpt-5' || providerId.startsWith('openai-')) {
    return new OpenAIAdapter();
  } else if (providerId.startsWith('claude-')) {
    return new AnthropicAdapter();
  } else if (providerId.startsWith('gemini-')) {
    return new GoogleAdapter();
  } else {
    throw new Error(`Unsupported provider: ${providerId}`);
  }
}

/**
 * Helper: Get default system prompt for photo rating
 */
function getDefaultSystemPrompt(): string {
  return `You are an expert professional photographer with decades of experience in photo culling and selection. Your task is to rate photographs with exceptional accuracy and insight.

Rate each image across multiple technical and artistic dimensions on a 1-1000 scale:
- 1-200: Poor quality
- 201-400: Below average
- 401-600: Average
- 601-800: Good quality
- 801-1000: Excellent/exceptional

Focus on:
1. Technical quality (focus, exposure, composition, lighting)
2. Subject analysis (emotion, expression, moment timing)
3. Overall artistic merit

CRITICAL: These are RAW images - exposure and white balance are fully correctable. Rate exposure quality based on whether detail is retained, not current brightness. Focus accuracy and moment timing cannot be fixed in post-production - prioritize these heavily.`;
}

/**
 * Helper: Poll batch job for completion
 */
async function pollBatchCompletion(
  userId: string,
  jobId: string,
  shootId: string,
  adapter: any,
  providerBatchId: string
): Promise<void> {
  const POLL_INTERVAL_MS = 5000; // Poll every 5 seconds
  const MAX_POLL_TIME_MS = 24 * 60 * 60 * 1000; // 24 hours max
  const startTime = Date.now();

  console.log(`[BatchAPI] Starting batch polling for job ${jobId} (provider: ${providerBatchId})`);

  while (Date.now() - startTime < MAX_POLL_TIME_MS) {
    try {
      // Check batch status
      const status = await adapter.checkBatchStatus(providerBatchId);

      // Update database with progress
      await db
        .update(batchJobs)
        .set({
          processedImages: status.processedImages,
        })
        .where(eq(batchJobs.id, jobId));

      // Broadcast progress via WebSocket
      const wsService = getGlobalWsService();
      if (wsService) {
        wsService.broadcastToUser(userId, {
          type: 'SHOOT_PROGRESS',
          data: {
            shootId,
            status: 'processing',
            processedCount: status.processedImages,
            totalCount: status.totalImages,
            provider: adapter.getProviderName(),
            eta: undefined
          },
          timestamp: Date.now(),
          deviceId: 'server',
          userId
        });
      }

      // Check if completed
      if (status.status === 'completed') {
        console.log(`[BatchAPI] Batch ${providerBatchId} completed, retrieving results`);

        // Retrieve results
        const ratings = await adapter.retrieveBatchResults(providerBatchId);

        // Update database with results
        await db
          .update(batchJobs)
          .set({
            status: 'completed',
            processedImages: ratings.length,
            results: ratings,
            completedAt: new Date(),
          })
          .where(eq(batchJobs.id, jobId));

        // Broadcast completion
        if (wsService) {
          wsService.broadcastToUser(userId, {
            type: 'SHOOT_PROGRESS',
            data: {
              shootId,
              status: 'completed',
              processedCount: ratings.length,
              totalCount: status.totalImages,
              provider: adapter.getProviderName(),
              eta: 0
            },
            timestamp: Date.now(),
            deviceId: 'server',
            userId
          });
        }

        console.log(`[BatchAPI] Batch ${jobId} completed: ${ratings.length} results`);
        return;
      }

      // Check if failed
      if (status.status === 'failed') {
        throw new Error(status.error || 'Batch job failed');
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));

    } catch (error: any) {
      console.error(`[BatchAPI] Polling error for job ${jobId}:`, error);
      await updateJobStatus(jobId, 'failed', error.message);
      throw error;
    }
  }

  // Timeout reached
  const timeoutError = 'Batch processing timeout (24 hours exceeded)';
  await updateJobStatus(jobId, 'failed', timeoutError);
  throw new Error(timeoutError);
}

/**
 * Helper: Process in fast mode (ultra-high concurrency)
 */
async function processFastMode(
  userId: string,
  jobId: string,
  data: ProcessBatchRequest
): Promise<void> {
  try {
    // Create provider adapter wrapper
    const providerAdapter = {
      async processSingleImage(input: {
        image: ImageInput;
        prompt: string;
        systemPrompt?: string;
      }) {
        // Convert to BatchImagePayload format
        const payload: BatchImagePayload = {
          id: input.image.id,
          url: input.image.url,
          b64: input.image.b64,
          filename: input.image.filename,
          metadata: input.image.metadata,
          tags: input.image.tags,
        };

        // Use OpenAI for now (other providers can be added)
        const result = await submitOpenAIBatch({
          apiKey: process.env.OPENAI_API_KEY!,
          model: 'gpt-5',
          images: [payload],
          prompt: input.prompt,
        });

        if (!result.ok || !result.ratings || result.ratings.length === 0) {
          throw new Error('Failed to process image');
        }

        return result.ratings[0];
      },
    };

    // Process all images concurrently
    const results = await batchProcessor.processConcurrent(
      userId,
      data.shootId,
      data.images,
      providerAdapter,
      data.prompt,
      data.systemPrompt
    );

    // Update job with results
    await db
      .update(batchJobs)
      .set({
        status: 'completed',
        processedImages: results.filter(r => r.success).length,
        results: results.map(r => r.rating),
        completedAt: new Date(),
      })
      .where(eq(batchJobs.id, jobId));

    console.log(`[BatchAPI] Fast mode completed for job ${jobId}: ${results.filter(r => r.success).length}/${results.length} successful`);

  } catch (error: any) {
    console.error('[BatchAPI] Fast mode error:', error);
    await updateJobStatus(jobId, 'failed', error.message);
    throw error;
  }
}

/**
 * Helper: Process in economy mode (provider batch API)
 * Uses provider batch APIs for 50% discount on processing cost
 */
async function processEconomyMode(
  userId: string,
  jobId: string,
  data: ProcessBatchRequest
): Promise<void> {
  try {
    // Get the appropriate provider adapter
    const adapter = getProviderAdapter(data.providerId as ProviderId);

    if (!adapter.supportsBatch()) {
      throw new Error(`Provider ${data.providerId} does not support batch API`);
    }

    console.log(`[BatchAPI] Submitting economy mode batch to ${data.providerId} for job ${jobId}`);

    // Convert images to ImageInput format
    const images = data.images.map(img => ({
      data: img.b64 ? Buffer.from(img.b64, 'base64') : Buffer.alloc(0), // Will be handled by adapter
      format: (img.filename?.split('.').pop()?.toLowerCase() as any) || 'jpeg',
      filename: img.filename || img.id,
      metadata: img.metadata
    }));

    // Submit batch to provider
    const batchJob = await adapter.submitBatch({
      images,
      systemPrompt: data.systemPrompt || getDefaultSystemPrompt(),
      userPrompt: data.prompt
    });

    // Store provider batch job ID in database
    await db
      .update(batchJobs)
      .set({
        status: 'processing',
        providerJobId: batchJob.jobId,
      })
      .where(eq(batchJobs.id, jobId));

    console.log(`[BatchAPI] Batch submitted to provider: ${batchJob.jobId}`);

    // Start polling for batch completion
    pollBatchCompletion(userId, jobId, data.shootId, adapter, batchJob.jobId).catch(error => {
      console.error('[BatchAPI] Batch polling error:', error);
      updateJobStatus(jobId, 'failed', error.message);
    });

  } catch (error: any) {
    console.error('[BatchAPI] Economy mode error:', error);
    await updateJobStatus(jobId, 'failed', error.message);
    throw error;
  }
}

/**
 * Helper: Check if provider supports economy mode
 */
function supportsEconomyMode(providerId: ProviderId): boolean {
  // OpenAI, Anthropic, and Google support batch APIs
  return (
    providerId === 'openai-gpt-5' ||
    providerId.startsWith('openai-') ||
    providerId.startsWith('claude-') ||
    providerId.startsWith('gemini-')
  );
}

/**
 * Helper: Update job status
 */
async function updateJobStatus(
  jobId: string,
  status: 'processing' | 'completed' | 'failed',
  error?: string
): Promise<void> {
  try {
    await db
      .update(batchJobs)
      .set({
        status,
        error,
        completedAt: status !== 'processing' ? new Date() : undefined,
      })
      .where(eq(batchJobs.id, jobId));
  } catch (err) {
    console.error('[BatchAPI] Error updating job status:', err);
  }
}
