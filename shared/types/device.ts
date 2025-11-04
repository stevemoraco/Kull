// Device authentication and session management types

export type DevicePlatform = 'macos' | 'ios' | 'ipados';

export interface Device {
  id: string;
  userId: string;
  deviceId: string; // client-generated stable ID
  platform: DevicePlatform;
  deviceName: string;
  appVersion: string;
  pushToken?: string; // for iOS push notifications
  lastSeen: Date;
  isActive: boolean;
  createdAt: Date;
}

export interface DeviceAuthRequest {
  deviceId: string;
  platform: DevicePlatform;
  deviceName: string;
  appVersion: string;
}

export interface DeviceAuthCode {
  code: string; // one-time code shown in browser
  expiresAt: Date;
}

export interface DeviceTokenResponse {
  accessToken: string; // JWT for API calls
  refreshToken: string; // long-lived refresh token
  expiresIn: number; // seconds
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
}

export interface RefreshTokenRequest {
  refreshToken: string;
  deviceId: string;
}

export interface RevokeDeviceRequest {
  deviceId?: string; // if not provided, revoke current device
}

export interface DeviceSession {
  id: string;
  deviceId: string;
  platform: DevicePlatform;
  deviceName: string;
  lastSeen: Date;
  isCurrentDevice: boolean;
}

// JWT payload structure for device tokens
export interface DeviceJWTPayload {
  sub: string; // userId
  deviceId: string;
  platform: DevicePlatform;
  iat: number; // issued at
  exp: number; // expires at
}
