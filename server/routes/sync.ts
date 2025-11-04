import { Router } from 'express';
import type { WebSocketService } from '../websocket';
import { SyncMessage, ShootProgressData, CreditUpdateData, PromptChangeData } from '@shared/types/sync';

export function createSyncRouter(wsService: WebSocketService) {
  const router = Router();

  // POST /api/sync/shoot-progress
  // Called by native app or processing worker to broadcast shoot progress
  router.post('/shoot-progress', async (req, res) => {
    try {
      const { userId, shootId, status, processedCount, totalCount, currentImage, eta, provider, errorMessage } = req.body as ShootProgressData & { userId: string };

      if (!userId || !shootId) {
        return res.status(400).json({ error: 'userId and shootId are required' });
      }

      const progressData: ShootProgressData = {
        shootId,
        status,
        processedCount,
        totalCount,
        currentImage,
        eta,
        provider,
        errorMessage,
      };

      const message: SyncMessage = {
        type: 'SHOOT_PROGRESS',
        data: progressData,
        timestamp: Date.now(),
        deviceId: 'server',
        userId,
      };

      // Broadcast to all user's devices
      wsService.broadcastToUser(userId, message);

      console.log(`[Sync] Broadcasted shoot progress for shootId=${shootId}, userId=${userId}`);
      res.json({ success: true, message: 'Progress update sent' });
    } catch (error) {
      console.error('[Sync] Error broadcasting shoot progress:', error);
      res.status(500).json({ error: 'Failed to broadcast progress update' });
    }
  });

  // POST /api/sync/credit-update
  // Called by credit system after purchase/deduction
  router.post('/credit-update', async (req, res) => {
    try {
      const { userId, newBalance, change, reason } = req.body as CreditUpdateData;

      if (!userId || newBalance === undefined || change === undefined) {
        return res.status(400).json({ error: 'userId, newBalance, and change are required' });
      }

      const creditData: CreditUpdateData = {
        userId,
        newBalance,
        change,
        reason,
      };

      const message: SyncMessage = {
        type: 'CREDIT_UPDATE',
        data: creditData,
        timestamp: Date.now(),
        deviceId: 'server',
        userId,
      };

      // Broadcast to all user's devices
      wsService.broadcastToUser(userId, message);

      console.log(`[Sync] Broadcasted credit update for userId=${userId}, change=${change}, newBalance=${newBalance}`);
      res.json({ success: true, message: 'Credit update sent' });
    } catch (error) {
      console.error('[Sync] Error broadcasting credit update:', error);
      res.status(500).json({ error: 'Failed to broadcast credit update' });
    }
  });

  // POST /api/sync/prompt-change
  // Called by marketplace after prompt created/updated/voted
  router.post('/prompt-change', async (req, res) => {
    try {
      const { promptId, action, userIds } = req.body as PromptChangeData & { userIds?: string[] };

      if (!promptId || !action) {
        return res.status(400).json({ error: 'promptId and action are required' });
      }

      const promptData: PromptChangeData = {
        promptId,
        action,
      };

      const message: SyncMessage = {
        type: 'PROMPT_CHANGE',
        data: promptData,
        timestamp: Date.now(),
        deviceId: 'server',
      };

      // If specific userIds provided, broadcast to them; otherwise broadcast to all
      if (userIds && userIds.length > 0) {
        userIds.forEach(userId => {
          wsService.broadcastToUser(userId, { ...message, userId });
        });
        console.log(`[Sync] Broadcasted prompt change to ${userIds.length} users`);
      } else {
        // For marketplace changes, we might want to broadcast to all connected users
        // For now, just log - this would need a different implementation
        console.log(`[Sync] Prompt change logged: promptId=${promptId}, action=${action}`);
      }

      res.json({ success: true, message: 'Prompt change notification sent' });
    } catch (error) {
      console.error('[Sync] Error broadcasting prompt change:', error);
      res.status(500).json({ error: 'Failed to broadcast prompt change' });
    }
  });

  // GET /api/sync/status
  // Health check endpoint to verify sync service is running
  router.get('/status', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: Date.now(),
      service: 'websocket-sync',
    });
  });

  return router;
}
