/**
 * Admin Health Monitoring Endpoints
 *
 * Comprehensive real-time health monitoring for all AI providers.
 * Provides detailed metrics, historical data, and WebSocket updates.
 * Admin only - requires admin authentication.
 */

import { Router, Request, Response } from 'express';
import { requireAdmin } from '../middleware/adminAuth';
import {
  getAllProviderMetrics,
  getProviderMetrics,
  ProviderMetrics
} from '../services/providerHealthMonitor';
import { getGlobalWsService } from '../websocket';
import { SyncMessage } from '@shared/types/sync';

const router = Router();

// Apply admin authentication to all routes in this router
router.use(requireAdmin);

/**
 * GET /api/admin/ai/health
 * Get comprehensive health metrics for all providers
 */
router.get('/health', (req: Request, res: Response) => {
  const metrics = getAllProviderMetrics();

  // Calculate overall system health
  const avgHealthScore = metrics.reduce((sum, m) => sum + m.healthScore, 0) / metrics.length;
  const healthyProviders = metrics.filter(m => m.status === 'healthy').length;
  const degradedProviders = metrics.filter(m => m.status === 'degraded').length;
  const unhealthyProviders = metrics.filter(m => m.status === 'unhealthy').length;

  const totalActiveRequests = metrics.reduce((sum, m) => sum + m.activeRequests, 0);
  const totalRequestsToday = metrics.reduce((sum, m) => sum + m.requestsToday, 0);
  const totalCostToday = metrics.reduce((sum, m) => sum + m.costToday, 0);

  res.json({
    timestamp: new Date(),
    overall: {
      healthScore: Math.round(avgHealthScore),
      healthyProviders,
      degradedProviders,
      unhealthyProviders,
      totalActiveRequests,
      totalRequestsToday,
      totalCostToday: Math.round(totalCostToday * 100) / 100
    },
    providers: metrics
  });
});

/**
 * GET /api/admin/ai/health/:provider
 * Get detailed health metrics for a specific provider
 */
router.get('/health/:provider', (req: Request, res: Response) => {
  const { provider } = req.params;

  const validProviders = ['anthropic', 'openai', 'google', 'grok', 'groq'];
  if (!validProviders.includes(provider)) {
    return res.status(400).json({
      error: 'Invalid provider',
      message: `Provider must be one of: ${validProviders.join(', ')}`
    });
  }

  const metrics = getProviderMetrics(provider);

  res.json({
    timestamp: new Date(),
    metrics
  });
});

/**
 * POST /api/admin/ai/health/broadcast
 * Manually trigger a health update broadcast to all admin clients
 */
router.post('/health/broadcast', (req: Request, res: Response) => {
  broadcastHealthUpdate();

  res.json({
    success: true,
    message: 'Health update broadcasted to all admin clients',
    timestamp: new Date()
  });
});

// Track if we've logged the "not available" warning to avoid spam during startup
let wsNotAvailableLogged = false;

/**
 * Broadcast provider health update via WebSocket
 */
export function broadcastHealthUpdate() {
  const wsService = getGlobalWsService();
  if (!wsService) {
    // Only log once to avoid spam during startup
    if (!wsNotAvailableLogged) {
      console.warn('[Admin Health] WebSocket service not available (will retry silently)');
      wsNotAvailableLogged = true;
    }
    return;
  }

  // Reset flag once WebSocket is available
  if (wsNotAvailableLogged) {
    console.log('[Admin Health] WebSocket service now available');
    wsNotAvailableLogged = false;
  }

  const metrics = getAllProviderMetrics();

  const message: SyncMessage = {
    type: 'PROVIDER_HEALTH',
    data: {
      providers: metrics,
      timestamp: new Date()
    },
    timestamp: Date.now(),
    deviceId: 'server',
    userId: 'admin'
  };

  wsService.broadcastToAdmins(message);
  console.log('[Admin Health] Broadcasted health update to admins');
}

// Auto-broadcast health updates every 10 seconds
setInterval(() => {
  broadcastHealthUpdate();
}, 10000);

export default router;
