import jwt, { TokenExpiredError, JsonWebTokenError } from 'jsonwebtoken';
import type { DeviceJWTPayload } from '@shared/types/device';

// JWT secrets from environment
const JWT_SECRET = process.env.JWT_SECRET || 'default-jwt-secret-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'default-refresh-secret-change-in-production';

// Token expiration times
const ACCESS_TOKEN_EXPIRY = 3600; // 1 hour in seconds
const REFRESH_TOKEN_EXPIRY = 2592000; // 30 days in seconds

/**
 * Generate a short-lived access token for device authentication
 * Access tokens are used for API requests and expire after 1 hour
 */
export function generateDeviceAccessToken(
  userId: string,
  deviceId: string,
  platform: string
): string {
  const now = Math.floor(Date.now() / 1000);

  const payload: DeviceJWTPayload = {
    sub: userId,
    deviceId,
    platform: platform as any, // Cast to satisfy TypeScript - platform is validated elsewhere
    iat: now,
    exp: now + ACCESS_TOKEN_EXPIRY,
  };

  return jwt.sign(payload, JWT_SECRET);
}

/**
 * Generate a long-lived refresh token for device authentication
 * Refresh tokens are used to obtain new access tokens and expire after 30 days
 */
export function generateRefreshToken(userId: string, deviceId: string): string {
  const now = Math.floor(Date.now() / 1000);

  const payload = {
    sub: userId,
    deviceId,
    type: 'refresh',
    iat: now,
    exp: now + REFRESH_TOKEN_EXPIRY,
  };

  return jwt.sign(payload, JWT_REFRESH_SECRET);
}

/**
 * Verify and decode an access token
 * Throws an error if token is invalid or expired
 */
export function verifyAccessToken(token: string): DeviceJWTPayload {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as DeviceJWTPayload;
    return decoded;
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      throw new Error('Access token has expired');
    } else if (error instanceof JsonWebTokenError) {
      throw new Error('Invalid access token');
    }
    throw error;
  }
}

/**
 * Verify and decode a refresh token
 * Throws an error if token is invalid or expired
 */
export function verifyRefreshToken(token: string): { sub: string; deviceId: string; type: string; iat: number; exp: number } {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as any;

    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }

    return decoded;
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      throw new Error('Refresh token has expired');
    } else if (error instanceof JsonWebTokenError) {
      throw new Error('Invalid refresh token');
    }
    throw error;
  }
}

/**
 * Decode a token without verification (useful for debugging)
 * WARNING: Do not use for authentication - always use verify methods
 */
export function decodeToken(token: string): any {
  return jwt.decode(token);
}

/**
 * Check if a token is expired without throwing an error
 */
export function isTokenExpired(token: string): boolean {
  try {
    const decoded = jwt.decode(token) as any;
    if (!decoded || !decoded.exp) {
      return true;
    }
    return decoded.exp < Math.floor(Date.now() / 1000);
  } catch {
    return true;
  }
}
