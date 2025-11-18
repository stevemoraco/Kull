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
 */
async function processEconomyMode(
  userId: string,
  jobId: string,
  data: ProcessBatchRequest
): Promise<void> {
  try {
    // TODO: Implement provider batch API calls
    // For now, just mark as pending and log
    console.log(`[BatchAPI] Economy mode not yet implemented for job ${jobId}`);

    await db
      .update(batchJobs)
      .set({
        status: 'pending',
        error: 'Economy mode not yet implemented',
      })
      .where(eq(batchJobs.id, jobId));

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
  // Only OpenAI and Anthropic support batch APIs
  return (
    providerId === 'openai-gpt-5' ||
    providerId.startsWith('claude-')
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
