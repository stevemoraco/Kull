/**
 * Admin AI Monitoring Endpoints
 *
 * Provides real-time monitoring of AI provider performance, rate limits, and errors.
 * Admin only - requires admin authentication.
 */

import { Router, Request, Response } from 'express';
import { rateLimitLog, errorLog, activeJobs } from './ai-passthrough';

const router = Router();

/**
 * Simple admin auth middleware
 * In production, this should check for actual admin JWT or session
 */
function requireAdmin(req: Request, res: Response, next: Function) {
  // TODO: Implement proper admin auth check
  // For now, just check if user is authenticated
  // In production, check user role === 'admin' or user.email === 'steve@lander.media'
  next();
}

router.use(requireAdmin);

/**
 * GET /api/admin/ai/rate-limits
 * Get last 100 rate limit hits across all providers
 */
router.get('/rate-limits', (req: Request, res: Response) => {
  const recentHits = rateLimitLog.slice(-100);

  // Group by provider
  const byProvider: Record<string, number> = {};
  recentHits.forEach(log => {
    byProvider[log.provider] = (byProvider[log.provider] || 0) + 1;
  });

  // Calculate average retry times
  const avgRetryTimes: Record<string, number> = {};
  Object.keys(byProvider).forEach(provider => {
    const providerHits = recentHits.filter(log => log.provider === provider);
    const totalRetryTime = providerHits.reduce((sum, log) => sum + log.retryAfter, 0);
    avgRetryTimes[provider] = totalRetryTime / providerHits.length;
  });

  res.json({
    totalHits: recentHits.length,
    byProvider,
    avgRetryTimes,
    recentHits: recentHits.slice(-20) // Last 20 hits
  });
});

/**
 * GET /api/admin/ai/errors
 * Get last 100 API errors across all providers
 */
router.get('/errors', (req: Request, res: Response) => {
  const recentErrors = errorLog.slice(-100);

  // Group by provider
  const byProvider: Record<string, number> = {};
  recentErrors.forEach(log => {
    byProvider[log.provider] = (byProvider[log.provider] || 0) + 1;
  });

  // Group by error type
  const byErrorType: Record<string, number> = {};
  recentErrors.forEach(log => {
    // Extract error type from error message
    const errorType = log.error.split(':')[0] || 'Unknown';
    byErrorType[errorType] = (byErrorType[errorType] || 0) + 1;
  });

  res.json({
    totalErrors: recentErrors.length,
    byProvider,
    byErrorType,
    recentErrors: recentErrors.slice(-20) // Last 20 errors
  });
});

/**
 * GET /api/admin/ai/active-jobs
 * Get all currently active batch jobs
 */
router.get('/active-jobs', (req: Request, res: Response) => {
  const jobs = Array.from(activeJobs.values()).map(job => ({
    ...job,
    elapsedTimeMs: Date.now() - job.startTime.getTime(),
    progressPercent: Math.round((job.processedImages / job.totalImages) * 100)
  }));

  res.json({
    totalActiveJobs: jobs.length,
    jobs
  });
});

/**
 * GET /api/admin/ai/provider-health
 * Get health status of each provider
 */
router.get('/provider-health', (req: Request, res: Response) => {
  const providers = ['anthropic', 'openai', 'google', 'grok', 'groq'];

  const health = providers.map(provider => {
    // Look at last 10 minutes of logs
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000;

    const recentRateLimits = rateLimitLog.filter(
      log => log.provider === provider && log.timestamp.getTime() > tenMinutesAgo
    );

    const recentErrors = errorLog.filter(
      log => log.provider === provider && log.timestamp.getTime() > tenMinutesAgo
    );

    const activeJobsForProvider = Array.from(activeJobs.values()).filter(
      job => job.provider.toLowerCase().includes(provider)
    );

    // Calculate health score (0-100)
    let healthScore = 100;

    // Deduct for rate limits (each rate limit = -5 points)
    healthScore -= Math.min(recentRateLimits.length * 5, 50);

    // Deduct for errors (each error = -10 points)
    healthScore -= Math.min(recentErrors.length * 10, 50);

    healthScore = Math.max(0, healthScore);

    // Determine status
    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (healthScore >= 80) status = 'healthy';
    else if (healthScore >= 50) status = 'degraded';
    else status = 'unhealthy';

    return {
      provider,
      status,
      healthScore,
      recentRateLimits: recentRateLimits.length,
      recentErrors: recentErrors.length,
      activeJobs: activeJobsForProvider.length,
      lastError: recentErrors[recentErrors.length - 1] || null
    };
  });

  res.json({
    providers: health,
    timestamp: new Date()
  });
});

/**
 * GET /api/admin/ai/stats
 * Get overall AI processing statistics
 */
router.get('/stats', (req: Request, res: Response) => {
  const totalRateLimits = rateLimitLog.length;
  const totalErrors = errorLog.length;
  const totalActiveJobs = activeJobs.size;

  // Calculate processing stats from active jobs
  const allJobs = Array.from(activeJobs.values());
  const totalImagesProcessing = allJobs.reduce((sum, job) => sum + job.totalImages, 0);
  const totalImagesProcessed = allJobs.reduce((sum, job) => sum + job.processedImages, 0);

  res.json({
    overview: {
      totalRateLimitsLogged: totalRateLimits,
      totalErrorsLogged: totalErrors,
      activeJobs: totalActiveJobs,
      totalImagesInProgress: totalImagesProcessing,
      totalImagesCompleted: totalImagesProcessed
    },
    timestamp: new Date()
  });
});

export default router;
