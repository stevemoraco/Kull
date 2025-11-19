import { Router } from 'express';
import { verifyDeviceToken } from './device-auth';
import { storage } from '../storage';
import mobilePushAdapter from '../services/adapters/mobilePushAdapter';

const router = Router();

/**
 * Register device token for push notifications
 * POST /api/notifications/register
 */
router.post('/notifications/register', verifyDeviceToken, async (req, res) => {
  try {
    if (!req.user || !('id' in req.user)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const userId = req.user.id as string;

    const { deviceToken, deviceId, platform } = req.body;

    if (!deviceToken || !deviceId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: deviceToken, deviceId'
      });
    }

    if (!['iOS', 'android'].includes(platform)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid platform. Must be iOS or android'
      });
    }

    // Store device token in database
    const tokenId = await storage.upsertDeviceToken({
      userId,
      deviceId,
      deviceToken,
      platform: platform.toLowerCase() as 'ios' | 'android',
      updatedAt: new Date()
    });

    console.log(`[notifications] Registered device token for user=${userId} device=${deviceId} platform=${platform}`);

    res.json({
      success: true,
      message: 'Device token registered successfully',
      tokenId
    });
  } catch (error) {
    console.error('Device token registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed'
    });
  }
});

/**
 * Unregister device token (e.g., on logout)
 * DELETE /api/notifications/unregister
 */
router.delete('/notifications/unregister', verifyDeviceToken, async (req, res) => {
  try {
    if (!req.user || !('id' in req.user)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const userId = req.user.id as string;

    const { deviceId } = req.body;

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: deviceId'
      });
    }

    await storage.deleteDeviceToken(userId, deviceId);

    console.log(`[notifications] Unregistered device token for user=${userId} device=${deviceId}`);

    res.json({
      success: true,
      message: 'Device token unregistered successfully'
    });
  } catch (error) {
    console.error('Device token unregistration error:', error);
    res.status(500).json({
      success: false,
      error: 'Unregistration failed'
    });
  }
});

/**
 * Get all registered device tokens for current user
 * GET /api/notifications/devices
 */
router.get('/notifications/devices', verifyDeviceToken, async (req, res) => {
  try {
    if (!req.user || !('id' in req.user)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const userId = req.user.id as string;

    const devices = await storage.getDeviceTokens(userId);

    res.json({
      success: true,
      devices: devices.map(d => ({
        deviceId: d.deviceId,
        platform: d.platform,
        registered: d.updatedAt
      }))
    });
  } catch (error) {
    console.error('Device tokens fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch device tokens'
    });
  }
});

/**
 * Send test notification (for debugging)
 * POST /api/notifications/test
 */
router.post('/notifications/test', verifyDeviceToken, async (req, res) => {
  try {
    if (!req.user || !('id' in req.user)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const userId = req.user.id as string;

    const { deviceId, type = 'shoot_complete' } = req.body;

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: deviceId'
      });
    }

    const devices = await storage.getDeviceTokens(userId);
    const device = devices.find(d => d.deviceId === deviceId);

    if (!device) {
      return res.status(404).json({
        success: false,
        error: 'Device not found'
      });
    }

    // Send test notification based on type
    switch (type) {
      case 'shoot_complete':
        await mobilePushAdapter.sendShootComplete(
          device.deviceToken,
          'test-shoot-123',
          1247,
          2
        );
        break;

      case 'device_connected':
        await mobilePushAdapter.sendDeviceConnected(
          device.deviceToken,
          'Test Device'
        );
        break;

      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid notification type'
        });
    }

    res.json({
      success: true,
      message: `Test notification sent to ${device.platform} device`
    });
  } catch (error) {
    console.error('Test notification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send test notification'
    });
  }
});

/**
 * Update notification preferences
 * PUT /api/notifications/preferences
 */
router.put('/notifications/preferences', verifyDeviceToken, async (req, res) => {
  try {
    if (!req.user || !('id' in req.user)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const userId = req.user.id as string;

    const preferences = req.body;

    // Validate preferences
    const validKeys = ['shootComplete', 'deviceConnection', 'creditLow', 'batchComplete', 'shootFailed'];
    const invalidKeys = Object.keys(preferences).filter(k => !validKeys.includes(k));

    if (invalidKeys.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Invalid preference keys: ${invalidKeys.join(', ')}`
      });
    }

    await storage.updateNotificationPreferences(userId, preferences);

    res.json({
      success: true,
      message: 'Notification preferences updated'
    });
  } catch (error) {
    console.error('Notification preferences update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update preferences'
    });
  }
});

/**
 * Get notification preferences
 * GET /api/notifications/preferences
 */
router.get('/notifications/preferences', verifyDeviceToken, async (req, res) => {
  try {
    if (!req.user || !('id' in req.user)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const userId = req.user.id as string;

    const preferences = await storage.getNotificationPreferences(userId);

    res.json({
      success: true,
      preferences: preferences || {
        shootComplete: true,
        deviceConnection: true,
        creditLow: true,
        batchComplete: true,
        shootFailed: true
      }
    });
  } catch (error) {
    console.error('Notification preferences fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch preferences'
    });
  }
});

export default router;
