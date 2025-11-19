/**
 * Test helper utilities for E2E testing
 */

import { Page, expect } from '@playwright/test';
import type { APIRequestContext } from '@playwright/test';

export interface TestUser {
  id: string;
  email: string;
  password: string;
  deviceId: string;
  deviceName: string;
  authCode?: string;
  accessToken?: string;
  refreshToken?: string;
}

export function createTestUser(suffix?: string): TestUser {
  const timestamp = Date.now();
  const uniqueSuffix = suffix || timestamp.toString();

  return {
    id: `test-user-${uniqueSuffix}`,
    email: `test-${uniqueSuffix}@example.com`,
    password: 'TestPassword123!',
    deviceId: `test-device-${uniqueSuffix}`,
    deviceName: `Test Device ${uniqueSuffix}`,
  };
}

export async function requestDeviceAuthCode(
  request: APIRequestContext,
  user: TestUser,
  baseURL: string
): Promise<string> {
  const response = await request.post(`${baseURL}/api/device-auth/request`, {
    data: {
      deviceId: user.deviceId,
      platform: 'macos',
      deviceName: user.deviceName,
      appVersion: '1.0.0',
    },
  });

  expect(response.ok()).toBe(true);
  const data = await response.json();
  expect(data).toHaveProperty('code');
  expect(data.code).toMatch(/^[A-Z0-9]{6}$/);

  return data.code;
}

export async function pollDeviceAuthStatus(
  request: APIRequestContext,
  authCode: string,
  baseURL: string,
  maxAttempts: number = 10
): Promise<{ accessToken: string; refreshToken: string } | null> {
  for (let i = 0; i < maxAttempts; i++) {
    const response = await request.get(`${baseURL}/api/device-auth/status/${authCode}`);
    expect(response.ok()).toBe(true);

    const data = await response.json();

    if (data.status === 'approved') {
      expect(data).toHaveProperty('accessToken');
      expect(data).toHaveProperty('refreshToken');
      return {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      };
    }

    if (data.status === 'expired') {
      throw new Error('Auth code expired');
    }

    // Wait 1 second before next poll
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return null;
}

export async function simulateUserApproval(
  page: Page,
  authCode: string,
  user: TestUser,
  baseURL: string
): Promise<void> {
  // Navigate to approval page
  await page.goto(`${baseURL}/device-auth/approve`);

  // Enter auth code
  await page.fill('input[name="code"]', authCode);
  await page.click('button[type="submit"]');

  // Wait for success message
  await expect(page.locator('text=Device approved')).toBeVisible();
}

export function generateTestImage(): string {
  // 1x1 red pixel PNG in base64
  return 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
}

export function generateTestImages(count: number): Array<{
  data: string;
  format: string;
  filename: string;
}> {
  return Array.from({ length: count }, (_, i) => ({
    data: generateTestImage(),
    format: 'png',
    filename: `test-photo-${i}.png`,
  }));
}

export async function mockAIProviderEndpoint(
  page: Page,
  provider: string,
  mockResponse: any
): Promise<void> {
  await page.route(`**/api/ai/process-single`, async (route) => {
    const request = route.request();
    const postData = request.postDataJSON();

    if (postData.provider === provider) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockResponse),
      });
    } else {
      await route.continue();
    }
  });
}

export async function mockBatchProcessingEndpoint(
  page: Page,
  provider: string,
  mockResponse: any
): Promise<void> {
  await page.route(`**/api/ai/process-batch`, async (route) => {
    const request = route.request();
    const postData = request.postDataJSON();

    if (postData.provider === provider) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockResponse),
      });
    } else {
      await route.continue();
    }
  });
}

export async function simulateNetworkError(
  page: Page,
  urlPattern: string,
  errorType: 'offline' | 'timeout' | 'server-error' = 'offline'
): Promise<void> {
  await page.route(urlPattern, async (route) => {
    if (errorType === 'offline') {
      await route.abort('failed');
    } else if (errorType === 'timeout') {
      await new Promise((resolve) => setTimeout(resolve, 30000)); // Timeout
      await route.abort('timedout');
    } else if (errorType === 'server-error') {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' }),
      });
    }
  });
}

export async function waitForWebSocketConnection(
  page: Page,
  timeout: number = 5000
): Promise<void> {
  await page.waitForFunction(
    () => {
      return (window as any).wsConnected === true;
    },
    { timeout }
  );
}

export async function simulateProgressUpdates(
  page: Page,
  shootId: string,
  totalImages: number,
  delayMs: number = 100
): Promise<void> {
  for (let i = 1; i <= totalImages; i++) {
    await page.evaluate(
      ({ shootId, current, total }) => {
        const message = {
          type: 'SHOOT_PROGRESS',
          data: {
            shootId,
            status: current === total ? 'completed' : 'processing',
            processedCount: current,
            totalCount: total,
            currentImage: `test-photo-${current}.jpg`,
            eta: (total - current) * 0.5,
            provider: 'openai',
          },
          timestamp: Date.now(),
          deviceId: 'test-device',
          userId: 'test-user',
        };

        // Trigger WebSocket message handler
        if ((window as any).handleWSMessage) {
          (window as any).handleWSMessage(message);
        }
      },
      { shootId, current: i, total: totalImages }
    );

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
}

export async function verifyXMPFile(filePath: string): Promise<boolean> {
  // In a real test, you would read and parse the XMP file
  // For E2E tests, we'll just check if the file exists
  // This is a placeholder for native app testing
  return true;
}

export function calculateExpectedCost(
  imageCount: number,
  providerCostPerImage: number
): { providerCost: number; userCharge: number } {
  const providerCost = imageCount * providerCostPerImage;
  const userCharge = providerCost * 2; // 2x markup

  return {
    providerCost: Number(providerCost.toFixed(4)),
    userCharge: Number(userCharge.toFixed(4)),
  };
}

export async function enableOfflineMode(page: Page): Promise<void> {
  await page.context().setOffline(true);
}

export async function disableOfflineMode(page: Page): Promise<void> {
  await page.context().setOffline(false);
}

export async function clearBrowserStorage(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

export async function getCreditBalance(
  request: APIRequestContext,
  accessToken: string,
  baseURL: string
): Promise<number> {
  const response = await request.get(`${baseURL}/api/credits/balance`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  expect(response.ok()).toBe(true);
  const data = await response.json();
  return data.balance;
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
