import { Router, type Request, type Response, type NextFunction } from 'express';
import { storage } from '../storage';
import {
  generateCode,
  storePendingCode,
  getCodeStatus,
  approveCode,
  deleteCode,
} from '../auth/device-codes';
import {
  generateDeviceAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from '../auth/jwt';
import type { DeviceAuthRequest, DeviceTokenResponse } from '@shared/types/device';
import { isAuthenticated, hasPaidAccessMiddleware, hasPaidAccessDevice } from '../replitAuth';

const router = Router();

// Rate limiting map for device auth requests (in-memory)
// In production, use Redis or a proper rate limiting service
const requestCounts = new Map<string, { count: number; resetAt: Date }>();

// Clean up rate limit data every 10 minutes
setInterval(() => {
  const now = new Date();
  const entries = Array.from(requestCounts.entries());
  for (const [key, data] of entries) {
    if (data.resetAt < now) {
      requestCounts.delete(key);
    }
  }
}, 10 * 60 * 1000);

/**
 * Rate limiting middleware: Max 5 requests per device per hour
 */
function rateLimitDeviceRequests(req: Request, res: Response, next: NextFunction) {
  const deviceId = req.body.deviceId;
  if (!deviceId) {
    return res.status(400).json({ error: 'Device ID is required' });
  }

  const now = new Date();
  const limitData = requestCounts.get(deviceId);

  if (!limitData || limitData.resetAt < now) {
    // Reset or create new limit
    requestCounts.set(deviceId, {
      count: 1,
      resetAt: new Date(now.getTime() + 60 * 60 * 1000), // 1 hour
    });
    return next();
  }

  if (limitData.count >= 5) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Too many authentication requests. Please try again later.',
      resetAt: limitData.resetAt,
    });
  }

  limitData.count++;
  return next();
}

/**
 * Middleware to verify device JWT tokens
 */
export async function verifyDeviceToken(req: any, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const payload = verifyAccessToken(token);

    // Verify device session is still active
    const session = await storage.getDeviceSession(payload.deviceId);
    if (!session || !session.isActive) {
      return res.status(401).json({ error: 'Device session has been revoked' });
    }

    // Update last seen timestamp
    await storage.updateDeviceLastSeen(payload.deviceId);

    // Attach user info to request
    req.user = {
      id: payload.sub,
      deviceId: payload.deviceId,
      platform: payload.platform,
    };

    next();
  } catch (error: any) {
    console.error('[Device Auth] Token verification failed:', error.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * POST /api/device-auth/request
 * Native app generates auth request and receives a code to show the user
 *
 * Native app flow:
 * 1. App generates stable deviceId (UUID, stored in Keychain)
 * 2. POST /api/device-auth/request with device info
 * 3. Display code to user: "Go to kull.ai/device-auth and enter: ABC123"
 * 4. Poll GET /api/device-auth/status/:code every 2 seconds
 * 5. When status === 'approved', receive tokens
 * 6. Store tokens in Keychain
 * 7. Use accessToken in Authorization: Bearer header for API calls
 * 8. When access token expires, use refreshToken to get new one
 * 9. On logout or revoke, delete tokens from Keychain
 */
router.post('/request', rateLimitDeviceRequests, async (req: Request, res: Response) => {
  try {
    const deviceInfo: DeviceAuthRequest = req.body;

    // Validate request
    if (!deviceInfo.deviceId || !deviceInfo.platform || !deviceInfo.deviceName || !deviceInfo.appVersion) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Missing required fields: deviceId, platform, deviceName, appVersion',
      });
    }

    // Validate platform
    if (!['macos', 'ios', 'ipados'].includes(deviceInfo.platform)) {
      return res.status(400).json({
        error: 'Invalid platform',
        message: 'Platform must be one of: macos, ios, ipados',
      });
    }

    // Generate unique code
    const code = generateCode();
    storePendingCode(code, deviceInfo);

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    res.json({
      code,
      expiresAt: expiresAt.toISOString(),
      verificationUrl: `${req.protocol}://${req.get('host')}/device-auth?code=${code}`,
    });
  } catch (error) {
    console.error('[Device Auth] Error creating request:', error);
    res.status(500).json({ error: 'Failed to create device authentication request' });
  }
});

/**
 * GET /api/device-auth/status/:code
 * Native app polls this endpoint to check if code has been approved
 */
router.get('/status/:code', async (req: Request, res: Response) => {
  try {
    const { code } = req.params;

    if (!code || code.length !== 6) {
      return res.status(400).json({ error: 'Invalid code format' });
    }

    const pending = getCodeStatus(code.toUpperCase());

    if (!pending) {
      return res.json({ status: 'expired' });
    }

    if (!pending.approved || !pending.userId) {
      return res.json({
        status: 'pending',
        deviceId: pending.deviceId,
      });
    }

    // Code has been approved - generate tokens
    const user = await storage.getUser(pending.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate JWT tokens
    const accessToken = generateDeviceAccessToken(user.id, pending.deviceId, pending.platform);
    const refreshToken = generateRefreshToken(user.id, pending.deviceId);

    // Create or update device session in database
    await storage.createDeviceSession({
      userId: user.id,
      deviceId: pending.deviceId,
      platform: pending.platform,
      deviceName: pending.deviceName,
      appVersion: pending.appVersion,
      jwtToken: refreshToken,
      lastSeen: new Date(),
      isActive: true,
    });

    // Delete the code (one-time use)
    deleteCode(code.toUpperCase());

    const response: DeviceTokenResponse = {
      accessToken,
      refreshToken,
      expiresIn: 3600, // 1 hour
      user: {
        id: user.id,
        email: user.email || '',
        firstName: user.firstName || undefined,
        lastName: user.lastName || undefined,
      },
    };

    return res.json({
      status: 'approved',
      deviceId: pending.deviceId,
      userId: pending.userId,
      tokens: response,
    });
  } catch (error) {
    console.error('[Device Auth] Error checking status:', error);
    res.status(500).json({ error: 'Failed to check authentication status' });
  }
});

/**
 * POST /api/device-auth/approve
 * Browser endpoint: User approves device after logging in
 * Requires authentication via session (not device token)
 * Note: No paid access required - all authenticated users can link devices
 * Payment checks happen at photo processing time, not device linking
 */
router.post('/approve', isAuthenticated, async (req: any, res: Response) => {
  try {
    // Check if user is authenticated via session
    if (!req.user?.claims?.sub) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { code } = req.body;
    if (!code || code.length !== 6) {
      return res.status(400).json({ error: 'Invalid code format' });
    }

    const userId = req.user.claims.sub;
    const normalizedCode = code.toUpperCase();

    // Verify code exists and is not expired
    const pending = getCodeStatus(normalizedCode);
    if (!pending) {
      return res.status(404).json({ error: 'Code not found or expired' });
    }

    // Approve the code
    const approved = approveCode(normalizedCode, userId);
    if (!approved) {
      return res.status(400).json({ error: 'Failed to approve code' });
    }

    // Get user details
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate tokens immediately
    const accessToken = generateDeviceAccessToken(user.id, pending.deviceId, pending.platform);
    const refreshToken = generateRefreshToken(user.id, pending.deviceId);

    // Create device session
    await storage.createDeviceSession({
      userId: user.id,
      deviceId: pending.deviceId,
      platform: pending.platform,
      deviceName: pending.deviceName,
      appVersion: pending.appVersion,
      jwtToken: refreshToken,
      lastSeen: new Date(),
      isActive: true,
    });

    console.log(`[Device Auth] Device ${pending.deviceId} approved for user ${userId}`);

    const response: DeviceTokenResponse = {
      accessToken,
      refreshToken,
      expiresIn: 3600,
      user: {
        id: user.id,
        email: user.email || '',
        firstName: user.firstName || undefined,
        lastName: user.lastName || undefined,
      },
    };

    res.json(response);
  } catch (error: any) {
    console.error('[Device Auth] Error approving device:', error);
    // Return more specific error info for debugging
    const errorMessage = error?.message || 'Unknown error';
    const errorCode = error?.code || 'UNKNOWN';
    res.status(500).json({
      error: 'Failed to approve device',
      detail: errorMessage,
      code: errorCode
    });
  }
});

/**
 * POST /api/device-auth/refresh
 * Native app uses refresh token to get a new access token
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken, deviceId } = req.body;

    if (!refreshToken || !deviceId) {
      return res.status(400).json({ error: 'Missing refreshToken or deviceId' });
    }

    // Verify refresh token
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch (error: any) {
      return res.status(401).json({ error: error.message });
    }

    // Verify device ID matches
    if (payload.deviceId !== deviceId) {
      return res.status(401).json({ error: 'Device ID mismatch' });
    }

    // Verify device session is still active
    const session = await storage.getDeviceSession(deviceId);
    if (!session || !session.isActive) {
      return res.status(401).json({ error: 'Device session has been revoked' });
    }

    // Verify stored refresh token matches
    if (session.jwtToken !== refreshToken) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    // Generate new access token
    const accessToken = generateDeviceAccessToken(payload.sub, deviceId, session.platform);

    // Update last seen
    await storage.updateDeviceLastSeen(deviceId);

    res.json({
      accessToken,
      expiresIn: 3600,
    });
  } catch (error) {
    console.error('[Device Auth] Error refreshing token:', error);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
});

/**
 * POST /api/device-auth/revoke
 * Revoke a device session (logout)
 * Can be called by the device itself or by the user from web
 */
router.post('/revoke', verifyDeviceToken, hasPaidAccessDevice, async (req: any, res: Response) => {
  try {
    const deviceId = req.body.deviceId || req.user.deviceId;

    if (!deviceId) {
      return res.status(400).json({ error: 'Device ID is required' });
    }

    // Verify user owns this device
    const session = await storage.getDeviceSession(deviceId);
    if (!session || session.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await storage.revokeDeviceSession(deviceId);

    console.log(`[Device Auth] Device ${deviceId} revoked for user ${req.user.id}`);

    res.json({ success: true });
  } catch (error) {
    console.error('[Device Auth] Error revoking device:', error);
    res.status(500).json({ error: 'Failed to revoke device' });
  }
});

/**
 * GET /api/device-auth/sessions
 * Get all active device sessions for the authenticated user
 * Requires device token authentication and paid access
 */
router.get('/sessions', verifyDeviceToken, hasPaidAccessDevice, async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const currentDeviceId = req.user.deviceId;

    const sessions = await storage.getUserDeviceSessions(userId);

    const response = sessions.map(session => ({
      id: session.id,
      deviceId: session.deviceId,
      platform: session.platform,
      deviceName: session.deviceName,
      lastSeen: session.lastSeen,
      isCurrentDevice: session.deviceId === currentDeviceId,
      createdAt: session.createdAt,
    }));

    res.json(response);
  } catch (error) {
    console.error('[Device Auth] Error fetching sessions:', error);
    res.status(500).json({ error: 'Failed to fetch device sessions' });
  }
});

/**
 * POST /api/device-auth/revoke-all
 * Revoke all device sessions except the current one
 */
router.post('/revoke-all', verifyDeviceToken, hasPaidAccessDevice, async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const currentDeviceId = req.user.deviceId;

    // Get all user devices
    const sessions = await storage.getUserDeviceSessions(userId);

    // Revoke all except current
    let revokedCount = 0;
    for (const session of sessions) {
      if (session.deviceId !== currentDeviceId) {
        await storage.revokeDeviceSession(session.deviceId);
        revokedCount++;
      }
    }

    console.log(`[Device Auth] Revoked ${revokedCount} devices for user ${userId}, kept current device ${currentDeviceId}`);

    res.json({
      success: true,
      revokedCount,
    });
  } catch (error) {
    console.error('[Device Auth] Error revoking all devices:', error);
    res.status(500).json({ error: 'Failed to revoke devices' });
  }
});

/**
 * POST /api/device-auth/update-push-token
 * Update push notification token for a device
 */
router.post('/update-push-token', verifyDeviceToken, hasPaidAccessDevice, async (req: any, res: Response) => {
  try {
    const { pushToken } = req.body;
    const deviceId = req.user.deviceId;

    if (!pushToken) {
      return res.status(400).json({ error: 'Push token is required' });
    }

    await storage.updateDevicePushToken(deviceId, pushToken);

    console.log(`[Device Auth] Updated push token for device ${deviceId}`);

    res.json({ success: true });
  } catch (error) {
    console.error('[Device Auth] Error updating push token:', error);
    res.status(500).json({ error: 'Failed to update push token' });
  }
});

/**
 * GET /api/device-auth/sessions/web
 * Get all active device sessions for the authenticated user (web-based, uses session auth)
 * This is for web browsers where users are logged in via OAuth
 */
router.get('/sessions/web', isAuthenticated, hasPaidAccessMiddleware, async (req: any, res: Response) => {
  try {
    const userId = req.user.claims.sub;

    const sessions = await storage.getUserDeviceSessions(userId);

    const response = sessions.map(session => ({
      id: session.id,
      deviceId: session.deviceId,
      platform: session.platform,
      deviceName: session.deviceName,
      lastSeen: session.lastSeen,
      isCurrentDevice: false, // Web session doesn't have a device ID
      createdAt: session.createdAt,
    }));

    res.json(response);
  } catch (error) {
    console.error('[Device Auth] Error fetching sessions:', error);
    res.status(500).json({ error: 'Failed to fetch device sessions' });
  }
});

/**
 * DELETE /api/device-auth/sessions/web/:deviceId
 * Revoke a specific device session (web-based, uses session auth)
 */
router.delete('/sessions/web/:deviceId', isAuthenticated, hasPaidAccessMiddleware, async (req: any, res: Response) => {
  try {
    const userId = req.user.claims.sub;
    const { deviceId } = req.params;

    if (!deviceId) {
      return res.status(400).json({ error: 'Device ID is required' });
    }

    // Verify user owns this device
    const session = await storage.getDeviceSession(deviceId);
    if (!session || session.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await storage.revokeDeviceSession(deviceId);

    console.log(`[Device Auth] Device ${deviceId} revoked for user ${userId} via web`);

    res.json({ success: true });
  } catch (error) {
    console.error('[Device Auth] Error revoking device:', error);
    res.status(500).json({ error: 'Failed to revoke device' });
  }
});

/**
 * PATCH /api/device-auth/sessions/web/:deviceId
 * Rename a device session (web-based, uses session auth)
 */
router.patch('/sessions/web/:deviceId', isAuthenticated, hasPaidAccessMiddleware, async (req: any, res: Response) => {
  try {
    const userId = req.user.claims.sub;
    const { deviceId } = req.params;
    const { deviceName } = req.body;

    if (!deviceId) {
      return res.status(400).json({ error: 'Device ID is required' });
    }

    if (!deviceName || deviceName.trim().length === 0) {
      return res.status(400).json({ error: 'Device name is required' });
    }

    // Verify user owns this device
    const session = await storage.getDeviceSession(deviceId);
    if (!session || session.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await storage.updateDeviceName(deviceId, deviceName.trim());

    console.log(`[Device Auth] Device ${deviceId} renamed to "${deviceName}" for user ${userId}`);

    res.json({ success: true });
  } catch (error) {
    console.error('[Device Auth] Error renaming device:', error);
    res.status(500).json({ error: 'Failed to rename device' });
  }
});

/**
 * DELETE /api/device-auth/sessions/web/revoke-all
 * Revoke all device sessions (web-based, uses session auth)
 */
router.delete('/sessions/web/revoke-all', isAuthenticated, hasPaidAccessMiddleware, async (req: any, res: Response) => {
  try {
    const userId = req.user.claims.sub;

    // Get all user devices
    const sessions = await storage.getUserDeviceSessions(userId);

    // Revoke all devices
    let revokedCount = 0;
    for (const session of sessions) {
      await storage.revokeDeviceSession(session.deviceId);
      revokedCount++;
    }

    console.log(`[Device Auth] Revoked all ${revokedCount} devices for user ${userId} via web`);

    res.json({
      success: true,
      revokedCount,
    });
  } catch (error) {
    console.error('[Device Auth] Error revoking all devices:', error);
    res.status(500).json({ error: 'Failed to revoke devices' });
  }
});

export default router;
