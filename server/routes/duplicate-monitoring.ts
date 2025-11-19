// API routes for duplicate message monitoring
// Admin-only access to view duplicate detection metrics

import { Router } from 'express';
import {
  logDuplicateDetection,
  getDuplicateStats,
  getDuplicateMetrics,
  cleanupOldAlerts,
} from '../monitoring/duplicateDetection';

const router = Router();

/**
 * POST /api/admin/alert-duplicates
 * Log a duplicate detection alert from the frontend
 */
router.post('/alert-duplicates', async (req, res) => {
  try {
    const { type, stats, sessionId, messageId, userEmail, timestamp } = req.body;

    await logDuplicateDetection({
      type: type || 'frontend_duplicate',
      stats,
      sessionId,
      messageId,
      userEmail,
      duplicateCount: stats?.totalDuplicatesDetected || 0,
      timestamp: timestamp || new Date().toISOString(),
    });

    res.json({ success: true });
  } catch (error) {
    console.error('[API] Failed to log duplicate alert:', error);
    res.status(500).json({ error: 'Failed to log alert' });
  }
});

/**
 * GET /api/admin/duplicate-stats
 * Get duplicate detection statistics
 * Query params: hours (default: 24)
 */
router.get('/duplicate-stats', async (req, res) => {
  try {
    const hours = parseInt(req.query.hours as string) || 24;
    const stats = await getDuplicateStats(hours);

    res.json(stats);
  } catch (error) {
    console.error('[API] Failed to get duplicate stats:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

/**
 * GET /api/admin/duplicate-metrics
 * Get detailed duplicate metrics for dashboard
 */
router.get('/duplicate-metrics', async (req, res) => {
  try {
    const metrics = await getDuplicateMetrics();

    res.json(metrics);
  } catch (error) {
    console.error('[API] Failed to get duplicate metrics:', error);
    res.status(500).json({ error: 'Failed to get metrics' });
  }
});

/**
 * POST /api/admin/cleanup-duplicate-alerts
 * Cleanup old duplicate alerts (admin only)
 */
router.post('/cleanup-duplicate-alerts', async (req, res) => {
  try {
    const deletedCount = await cleanupOldAlerts();

    res.json({
      success: true,
      deletedCount,
      message: `Cleaned up ${deletedCount} old alerts`,
    });
  } catch (error) {
    console.error('[API] Failed to cleanup alerts:', error);
    res.status(500).json({ error: 'Failed to cleanup alerts' });
  }
});

export default router;
