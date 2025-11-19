/**
 * Admin Authentication Middleware
 *
 * Verifies that the requesting user has admin privileges.
 * Admin user is determined by ADMIN_USER_ID environment variable.
 */

import { Request, Response, NextFunction } from 'express';
import { verifyDeviceToken } from '../routes/device-auth';
import { config } from '../config/environment';

/**
 * Middleware to require admin authentication
 * Works with both session auth (web) and device token auth (native apps)
 *
 * Usage:
 *   router.get('/admin/endpoint', requireAdmin, handler);
 */
export async function requireAdmin(req: any, res: Response, next: NextFunction) {
  // Check if user is authenticated
  // Could be via session (req.user.claims.sub) or device token (req.user.id)
  const userId = req.user?.claims?.sub || req.user?.id;

  if (!userId) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'You must be logged in to access this endpoint',
    });
  }

  // Check if user is admin
  if (userId !== config.adminUserId) {
    return res.status(403).json({
      error: 'Admin access required',
      message: 'This endpoint requires administrator privileges',
    });
  }

  // User is admin, proceed
  next();
}

/**
 * Middleware to require admin authentication with device token
 * This verifies device token first, then checks admin status
 *
 * Usage:
 *   router.get('/admin/endpoint', requireAdminDevice, handler);
 */
export async function requireAdminDevice(req: any, res: Response, next: NextFunction) {
  // First verify device token
  await new Promise<void>((resolve, reject) => {
    verifyDeviceToken(req, res, (err?: any) => {
      if (err) reject(err);
      else resolve();
    });
  }).catch(err => {
    // Token verification failed, response already sent
    return;
  });

  // Now check admin status
  requireAdmin(req, res, next);
}
