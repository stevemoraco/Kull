import type { DeviceAuthRequest } from "@shared/types/device";

interface PendingCode {
  code: string;
  deviceId: string;
  platform: string;
  deviceName: string;
  appVersion: string;
  expiresAt: Date;
  userId?: string;
  approved: boolean;
}

// In-memory storage for pending device codes
// In production, consider using Redis for distributed systems
const pendingCodes = new Map<string, PendingCode>();

// Clean up expired codes every 5 minutes
setInterval(() => {
  const now = new Date();
  const entries = Array.from(pendingCodes.entries());
  for (const [code, pending] of entries) {
    if (pending.expiresAt < now) {
      pendingCodes.delete(code);
      console.log(`[Device Auth] Cleaned up expired code: ${code}`);
    }
  }
}, 5 * 60 * 1000);

/**
 * Generate a random 6-character alphanumeric code
 * Uses characters that are easy to read and type (no 0/O, 1/I/l)
 */
export function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }

  // Ensure code is unique
  if (pendingCodes.has(code)) {
    return generateCode();
  }

  return code;
}

/**
 * Store a pending device authorization code
 */
export function storePendingCode(code: string, deviceInfo: DeviceAuthRequest): void {
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  pendingCodes.set(code, {
    code,
    ...deviceInfo,
    expiresAt,
    approved: false,
  });

  console.log(`[Device Auth] Created code ${code} for device ${deviceInfo.deviceId}, expires at ${expiresAt.toISOString()}`);
}

/**
 * Get the status of a pending code
 * Returns undefined if code doesn't exist or has expired
 */
export function getCodeStatus(code: string): PendingCode | undefined {
  const pending = pendingCodes.get(code);
  if (!pending) {
    return undefined;
  }

  // Check if expired
  if (pending.expiresAt < new Date()) {
    pendingCodes.delete(code);
    console.log(`[Device Auth] Code ${code} has expired`);
    return undefined;
  }

  return pending;
}

/**
 * Mark a code as approved and associate with a user
 */
export function approveCode(code: string, userId: string): boolean {
  const pending = pendingCodes.get(code);
  if (!pending) {
    return false;
  }

  if (pending.expiresAt < new Date()) {
    pendingCodes.delete(code);
    return false;
  }

  pending.userId = userId;
  pending.approved = true;

  console.log(`[Device Auth] Code ${code} approved for user ${userId}`);
  return true;
}

/**
 * Delete a code (after successful authentication or cancellation)
 */
export function deleteCode(code: string): void {
  pendingCodes.delete(code);
  console.log(`[Device Auth] Deleted code ${code}`);
}

/**
 * Get all pending codes (for debugging/admin purposes)
 */
export function getAllPendingCodes(): PendingCode[] {
  const now = new Date();
  return Array.from(pendingCodes.values()).filter(code => code.expiresAt > now);
}
