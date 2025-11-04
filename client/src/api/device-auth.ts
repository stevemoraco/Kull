import type { DeviceTokenResponse } from '@shared/types/device';

const API_BASE = '/api/device-auth';

export interface CodeStatusResponse {
  status: 'pending' | 'approved' | 'expired';
  deviceId?: string;
  userId?: string;
  tokens?: DeviceTokenResponse;
}

export interface DeviceSessionInfo {
  id: string;
  deviceId: string;
  platform: string;
  deviceName: string;
  lastSeen: Date;
  isCurrentDevice: boolean;
  createdAt: Date;
}

/**
 * Check the status of a device authentication code
 */
export async function getCodeStatus(code: string): Promise<CodeStatusResponse> {
  const response = await fetch(`${API_BASE}/status/${code.toUpperCase()}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to check code status');
  }
  return response.json();
}

/**
 * Approve a device authentication request
 * Requires user to be authenticated via session
 */
export async function approveDevice(code: string): Promise<DeviceTokenResponse> {
  const response = await fetch(`${API_BASE}/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code: code.toUpperCase() }),
    credentials: 'include', // Important for session cookies
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to approve device');
  }

  return response.json();
}

/**
 * Get all active device sessions for the authenticated user
 * Requires device token authentication
 */
export async function getUserDevices(accessToken: string): Promise<DeviceSessionInfo[]> {
  const response = await fetch(`${API_BASE}/sessions`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch device sessions');
  }

  const sessions = await response.json();

  // Convert date strings to Date objects
  return sessions.map((session: any) => ({
    ...session,
    lastSeen: new Date(session.lastSeen),
    createdAt: new Date(session.createdAt),
  }));
}

/**
 * Revoke a specific device session
 * Requires device token authentication
 */
export async function revokeDevice(deviceId: string, accessToken: string): Promise<void> {
  const response = await fetch(`${API_BASE}/revoke`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ deviceId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to revoke device');
  }
}

/**
 * Revoke all device sessions except the current one
 * Requires device token authentication
 */
export async function revokeAllDevices(accessToken: string): Promise<{ revokedCount: number }> {
  const response = await fetch(`${API_BASE}/revoke-all`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to revoke devices');
  }

  return response.json();
}

/**
 * Refresh an access token using a refresh token
 * Used by native apps to get new access tokens
 */
export async function refreshAccessToken(refreshToken: string, deviceId: string): Promise<{ accessToken: string; expiresIn: number }> {
  const response = await fetch(`${API_BASE}/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refreshToken, deviceId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to refresh token');
  }

  return response.json();
}
