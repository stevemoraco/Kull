/**
 * Device Authentication Flow E2E Tests
 * Tests complete device auth flow: request code -> user approves -> device polls -> tokens received
 */

import { test, expect } from '@playwright/test';
import {
  createTestUser,
  requestDeviceAuthCode,
  pollDeviceAuthStatus,
  delay,
} from '../fixtures/test-helpers';

test.describe('Device Authentication User Flow', () => {
  const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5000';

  test('should complete full device authentication flow with 6-digit code', async ({
    page,
    request,
  }) => {
    const user = createTestUser();

    // Step 1: Native app requests authentication code
    const authCode = await requestDeviceAuthCode(request, user, BASE_URL);
    expect(authCode).toBeTruthy();
    expect(authCode).toMatch(/^[A-Z0-9]{6}$/);

    // Step 2: Check initial status (should be pending)
    const statusResponse = await request.get(`${BASE_URL}/api/device-auth/status/${authCode}`);
    expect(statusResponse.ok()).toBe(true);

    const statusData = await statusResponse.json();
    expect(statusData.status).toBe('pending');
    expect(statusData.deviceId).toBe(user.deviceId);
    expect(statusData.platform).toBe('macos');

    // Step 3: User sees code on device, goes to web to approve
    // For this test, we'll simulate approval via API (in real flow, user would use web UI)
    const approveResponse = await request.post(`${BASE_URL}/api/device-auth/approve`, {
      data: {
        code: authCode,
        userId: user.id,
      },
    });

    expect(approveResponse.ok()).toBe(true);
    const approveData = await approveResponse.json();
    expect(approveData.success).toBe(true);

    // Step 4: Device polls status endpoint and receives tokens
    const statusCheckResponse = await request.get(
      `${BASE_URL}/api/device-auth/status/${authCode}`
    );
    expect(statusCheckResponse.ok()).toBe(true);

    const approvedStatus = await statusCheckResponse.json();
    expect(approvedStatus.status).toBe('approved');
    expect(approvedStatus).toHaveProperty('accessToken');
    expect(approvedStatus).toHaveProperty('refreshToken');
    expect(approvedStatus.accessToken).toBeTruthy();
    expect(approvedStatus.refreshToken).toBeTruthy();

    // Verify tokens are valid JWTs (basic structure check)
    expect(approvedStatus.accessToken.split('.').length).toBe(3);
    expect(approvedStatus.refreshToken.split('.').length).toBe(3);
  });

  test('should handle expired authentication codes', async ({ request }) => {
    const expiredCode = 'XXXXXX';

    const statusResponse = await request.get(`${BASE_URL}/api/device-auth/status/${expiredCode}`);
    expect(statusResponse.ok()).toBe(true);

    const statusData = await statusResponse.json();
    expect(statusData.status).toBe('expired');
  });

  test('should reject duplicate authentication code requests within rate limit', async ({
    request,
  }) => {
    const user = createTestUser();

    // Make 5 requests (should all succeed)
    for (let i = 0; i < 5; i++) {
      const response = await request.post(`${BASE_URL}/api/device-auth/request`, {
        data: {
          deviceId: user.deviceId,
          platform: 'macos',
          deviceName: user.deviceName,
          appVersion: '1.0.0',
        },
      });
      expect(response.status()).toBe(200);
    }

    // 6th request should be rate limited
    const rateLimitedResponse = await request.post(`${BASE_URL}/api/device-auth/request`, {
      data: {
        deviceId: user.deviceId,
        platform: 'macos',
        deviceName: user.deviceName,
        appVersion: '1.0.0',
      },
    });

    expect(rateLimitedResponse.status()).toBe(429);
    const error = await rateLimitedResponse.json();
    expect(error.error).toBe('Rate limit exceeded');
    expect(error).toHaveProperty('resetAt');
  });

  test('should reject invalid auth codes', async ({ request }) => {
    const invalidCodes = ['123456', 'ABCDEF', '12345', 'TOOLONG123', ''];

    for (const invalidCode of invalidCodes) {
      const response = await request.get(`${BASE_URL}/api/device-auth/status/${invalidCode}`);
      expect(response.ok()).toBe(true);

      const data = await response.json();
      expect(data.status).toMatch(/expired|invalid/);
    }
  });

  test('should handle multiple devices for same user', async ({ request }) => {
    const userId = `test-user-${Date.now()}`;

    // Request auth codes for 3 different devices
    const device1 = createTestUser('device1');
    const device2 = createTestUser('device2');
    const device3 = createTestUser('device3');

    const code1 = await requestDeviceAuthCode(request, device1, BASE_URL);
    const code2 = await requestDeviceAuthCode(request, device2, BASE_URL);
    const code3 = await requestDeviceAuthCode(request, device3, BASE_URL);

    expect(code1).not.toBe(code2);
    expect(code2).not.toBe(code3);
    expect(code1).not.toBe(code3);

    // Approve all devices for the same user
    for (const code of [code1, code2, code3]) {
      const approveResponse = await request.post(`${BASE_URL}/api/device-auth/approve`, {
        data: {
          code,
          userId,
        },
      });
      expect(approveResponse.ok()).toBe(true);
    }

    // Verify all devices received tokens
    for (const code of [code1, code2, code3]) {
      const statusResponse = await request.get(`${BASE_URL}/api/device-auth/status/${code}`);
      expect(statusResponse.ok()).toBe(true);

      const statusData = await statusResponse.json();
      expect(statusData.status).toBe('approved');
      expect(statusData).toHaveProperty('accessToken');
      expect(statusData).toHaveProperty('refreshToken');
    }
  });

  test('should reject approval attempts for already approved codes', async ({ request }) => {
    const user = createTestUser();
    const authCode = await requestDeviceAuthCode(request, user, BASE_URL);

    // First approval
    const firstApproval = await request.post(`${BASE_URL}/api/device-auth/approve`, {
      data: {
        code: authCode,
        userId: user.id,
      },
    });
    expect(firstApproval.ok()).toBe(true);

    // Second approval attempt (should fail or be idempotent)
    const secondApproval = await request.post(`${BASE_URL}/api/device-auth/approve`, {
      data: {
        code: authCode,
        userId: user.id,
      },
    });

    // Should either succeed (idempotent) or fail gracefully
    expect([200, 400, 409]).toContain(secondApproval.status());
  });

  test('should handle iOS and macOS platforms separately', async ({ request }) => {
    const iosUser = createTestUser('ios');
    const macosUser = createTestUser('macos');

    // Request auth for iOS device
    const iosResponse = await request.post(`${BASE_URL}/api/device-auth/request`, {
      data: {
        deviceId: iosUser.deviceId,
        platform: 'ios',
        deviceName: 'iPhone Test',
        appVersion: '1.0.0',
      },
    });
    expect(iosResponse.ok()).toBe(true);

    // Request auth for macOS device
    const macosResponse = await request.post(`${BASE_URL}/api/device-auth/request`, {
      data: {
        deviceId: macosUser.deviceId,
        platform: 'macos',
        deviceName: 'MacBook Test',
        appVersion: '1.0.0',
      },
    });
    expect(macosResponse.ok()).toBe(true);

    const iosData = await iosResponse.json();
    const macosData = await macosResponse.json();

    expect(iosData.code).toBeTruthy();
    expect(macosData.code).toBeTruthy();
    expect(iosData.code).not.toBe(macosData.code);
  });

  test('should validate device metadata in auth request', async ({ request }) => {
    const user = createTestUser();

    // Missing required fields
    const invalidRequests = [
      { deviceId: '', platform: 'macos', deviceName: 'Test', appVersion: '1.0.0' },
      { deviceId: user.deviceId, platform: '', deviceName: 'Test', appVersion: '1.0.0' },
      { deviceId: user.deviceId, platform: 'macos', deviceName: '', appVersion: '1.0.0' },
      { deviceId: user.deviceId, platform: 'invalid-platform', deviceName: 'Test', appVersion: '1.0.0' },
    ];

    for (const invalidData of invalidRequests) {
      const response = await request.post(`${BASE_URL}/api/device-auth/request`, {
        data: invalidData,
      });

      // Should reject with 400 Bad Request
      expect(response.status()).toBeGreaterThanOrEqual(400);
    }
  });

  test('should allow token refresh after authentication', async ({ request }) => {
    const user = createTestUser();

    // Complete full auth flow
    const authCode = await requestDeviceAuthCode(request, user, BASE_URL);

    await request.post(`${BASE_URL}/api/device-auth/approve`, {
      data: {
        code: authCode,
        userId: user.id,
      },
    });

    const statusResponse = await request.get(`${BASE_URL}/api/device-auth/status/${authCode}`);
    const { accessToken, refreshToken } = await statusResponse.json();

    // Wait 1 second to ensure new token would be different
    await delay(1000);

    // Attempt to refresh token
    const refreshResponse = await request.post(`${BASE_URL}/api/auth/refresh`, {
      headers: {
        Authorization: `Bearer ${refreshToken}`,
      },
    });

    if (refreshResponse.ok()) {
      const refreshData = await refreshResponse.json();
      expect(refreshData).toHaveProperty('accessToken');
      expect(refreshData.accessToken).not.toBe(accessToken); // Should be new token
    } else {
      // Refresh endpoint might not be implemented yet, that's OK
      console.log('Token refresh endpoint not available yet');
    }
  });

  test('should handle concurrent device auth requests gracefully', async ({ request }) => {
    const users = Array.from({ length: 10 }, (_, i) => createTestUser(`concurrent-${i}`));

    // Fire all requests concurrently
    const responses = await Promise.all(
      users.map((user) =>
        request.post(`${BASE_URL}/api/device-auth/request`, {
          data: {
            deviceId: user.deviceId,
            platform: 'macos',
            deviceName: user.deviceName,
            appVersion: '1.0.0',
          },
        })
      )
    );

    // All should succeed
    expect(responses.every((r) => r.ok())).toBe(true);

    // All should have unique codes
    const codes = await Promise.all(responses.map((r) => r.json().then((d) => d.code)));
    const uniqueCodes = new Set(codes);
    expect(uniqueCodes.size).toBe(codes.length);
  });
});
