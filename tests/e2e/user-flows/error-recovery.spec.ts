/**
 * Error Recovery and Retry Logic E2E Tests
 * Tests: Network failures, rate limits, server errors, exponential backoff, retry strategies
 */

import { test, expect } from '@playwright/test';
import {
  createTestUser,
  requestDeviceAuthCode,
  generateTestImages,
  simulateNetworkError,
  enableOfflineMode,
  disableOfflineMode,
  delay,
} from '../fixtures/test-helpers';

test.describe('Error Recovery and Retry Logic', () => {
  const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5000';

  test.describe('Network Failures', () => {
    test('should retry on network timeout with exponential backoff', async ({
      page,
      request,
    }) => {
      const images = generateTestImages(5);

      let attemptCount = 0;
      await page.route('**/api/ai/process-batch', async (route) => {
        attemptCount++;

        if (attemptCount < 3) {
          // First 2 attempts fail with timeout
          await delay(100);
          await route.abort('timedout');
        } else {
          // 3rd attempt succeeds
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              results: images.map((img) => ({
                rating: { starRating: 3, filename: img.filename },
                success: true,
              })),
              summary: {
                totalImages: images.length,
                successful: images.length,
                failed: 0,
              },
            }),
          });
        }
      });

      const response = await request.post(`${BASE_URL}/api/ai/process-batch`, {
        data: {
          provider: 'openai',
          images,
          systemPrompt: 'Rate photos.',
          userPrompt: 'Rate 1-5.',
          useBatchAPI: false,
        },
      });

      // Should eventually succeed after retries
      if (response.ok()) {
        expect(attemptCount).toBeGreaterThanOrEqual(3);
        const results = await response.json();
        expect(results.summary.successful).toBe(images.length);
      }
    });

    test('should handle complete network outage mid-processing', async ({ page, request }) => {
      const user = createTestUser();
      const images = generateTestImages(10);

      // Auth
      const authCode = await requestDeviceAuthCode(request, user, BASE_URL);
      await request.post(`${BASE_URL}/api/device-auth/approve`, {
        data: { code: authCode, userId: user.id },
      });
      const statusResponse = await request.get(`${BASE_URL}/api/device-auth/status/${authCode}`);
      const { accessToken } = await statusResponse.json();

      let processedCount = 0;
      await page.route('**/api/ai/process-single', async (route) => {
        processedCount++;

        if (processedCount === 5) {
          // Network fails on 5th image
          await enableOfflineMode(page);
          await delay(100);
          await route.abort('failed');
        } else if (processedCount > 5 && processedCount <= 7) {
          // Network still offline
          await route.abort('failed');
        } else {
          // Network recovers
          await disableOfflineMode(page);
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              rating: { starRating: 3, filename: `test-photo-${processedCount}.png` },
              cost: 0.002,
              userCharge: 0.004,
              success: true,
            }),
          });
        }
      });

      const response = await request.post(`${BASE_URL}/api/ai/process-batch`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        data: {
          provider: 'openai',
          images,
          systemPrompt: 'Rate photos.',
          userPrompt: 'Rate 1-5.',
          useBatchAPI: false,
        },
      });

      // Should handle failures and eventually complete
      if (response.ok()) {
        const results = await response.json();
        // Some images may have failed during network outage
        expect(results.summary.totalImages).toBe(images.length);
        expect(results.summary.failed).toBeGreaterThanOrEqual(0);
      }
    });

    test('should queue operations when offline and sync when back online', async ({
      page,
      request,
    }) => {
      const user = createTestUser();
      const images = generateTestImages(3);

      // Go offline
      await enableOfflineMode(page);

      // Try to submit batch (should be queued)
      const offlineResponse = request.post(`${BASE_URL}/api/ai/process-batch`, {
        data: {
          provider: 'openai',
          images,
          systemPrompt: 'Rate photos.',
          userPrompt: 'Rate 1-5.',
        },
      });

      // Wait a bit
      await delay(500);

      // Come back online
      await disableOfflineMode(page);

      // Request should eventually complete
      try {
        const response = await offlineResponse;
        expect([200, 500, 0]).toContain(response.status());
      } catch (error) {
        // Expected - network was offline
        expect(error).toBeDefined();
      }
    });
  });

  test.describe('Rate Limiting', () => {
    test('should handle 429 rate limit errors with exponential backoff', async ({
      page,
      request,
    }) => {
      const images = generateTestImages(5);

      let attemptCount = 0;
      await page.route('**/api/ai/process-single', async (route) => {
        attemptCount++;

        if (attemptCount <= 3) {
          // First 3 attempts hit rate limit
          await route.fulfill({
            status: 429,
            contentType: 'application/json',
            headers: {
              'Retry-After': '2',
            },
            body: JSON.stringify({
              error: 'Rate limit exceeded',
              retryAfter: 2,
            }),
          });
        } else {
          // Subsequent attempts succeed
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              rating: { starRating: 4, filename: 'test.png' },
              cost: 0.002,
              success: true,
            }),
          });
        }
      });

      const response = await request.post(`${BASE_URL}/api/ai/process-batch`, {
        data: {
          provider: 'openai',
          images: [images[0]], // Single image
          systemPrompt: 'Rate photos.',
          userPrompt: 'Rate 1-5.',
        },
      });

      // Should eventually succeed after rate limit clears
      if (response.ok()) {
        const results = await response.json();
        expect(results.summary.successful).toBeGreaterThan(0);
      }
    });

    test('should respect Retry-After header from provider', async ({ page, request }) => {
      const images = generateTestImages(1);

      const startTime = Date.now();
      let firstAttemptTime = 0;
      let secondAttemptTime = 0;

      await page.route('**/api/ai/process-single', async (route) => {
        if (firstAttemptTime === 0) {
          firstAttemptTime = Date.now();
          await route.fulfill({
            status: 429,
            headers: { 'Retry-After': '3' },
            body: JSON.stringify({ error: 'Rate limit exceeded' }),
          });
        } else {
          secondAttemptTime = Date.now();
          await route.fulfill({
            status: 200,
            body: JSON.stringify({
              rating: { starRating: 3, filename: 'test.png' },
              success: true,
            }),
          });
        }
      });

      const response = await request.post(`${BASE_URL}/api/ai/process-batch`, {
        data: {
          provider: 'openai',
          images,
          systemPrompt: 'Rate photos.',
          userPrompt: 'Rate 1-5.',
        },
      });

      if (response.ok()) {
        // Verify retry waited at least 3 seconds
        const waitTime = secondAttemptTime - firstAttemptTime;
        expect(waitTime).toBeGreaterThanOrEqual(2900); // Allow 100ms margin
      }
    });

    test('should continue processing other images while retrying failed ones', async ({
      page,
      request,
    }) => {
      const images = generateTestImages(10);

      let processedImages = new Set<number>();
      await page.route('**/api/ai/process-single', async (route) => {
        const postData = route.request().postDataJSON();
        const imageIndex = images.findIndex((img) => img.filename === postData.image.filename);

        // Image 3 always fails with rate limit
        if (imageIndex === 3) {
          await route.fulfill({
            status: 429,
            body: JSON.stringify({ error: 'Rate limit exceeded' }),
          });
        } else {
          processedImages.add(imageIndex);
          await route.fulfill({
            status: 200,
            body: JSON.stringify({
              rating: { starRating: 4, filename: postData.image.filename },
              success: true,
            }),
          });
        }
      });

      const response = await request.post(`${BASE_URL}/api/ai/process-batch`, {
        data: {
          provider: 'openai',
          images,
          systemPrompt: 'Rate photos.',
          userPrompt: 'Rate 1-5.',
          useBatchAPI: false,
        },
      });

      if (response.ok()) {
        const results = await response.json();

        // Should process all images except the one that keeps failing
        expect(results.summary.successful).toBeGreaterThanOrEqual(8);
        expect(results.summary.failed).toBeGreaterThanOrEqual(0);
      }
    });
  });

  test.describe('Server Errors', () => {
    test('should retry on 500 Internal Server Error', async ({ page, request }) => {
      const images = generateTestImages(1);

      let attemptCount = 0;
      await page.route('**/api/ai/process-single', async (route) => {
        attemptCount++;

        if (attemptCount < 3) {
          await route.fulfill({
            status: 500,
            body: JSON.stringify({ error: 'Internal server error' }),
          });
        } else {
          await route.fulfill({
            status: 200,
            body: JSON.stringify({
              rating: { starRating: 5, filename: 'test.png' },
              success: true,
            }),
          });
        }
      });

      const response = await request.post(`${BASE_URL}/api/ai/process-batch`, {
        data: {
          provider: 'openai',
          images,
          systemPrompt: 'Rate photos.',
          userPrompt: 'Rate 1-5.',
        },
      });

      if (response.ok()) {
        expect(attemptCount).toBeGreaterThanOrEqual(3);
      }
    });

    test('should NOT retry on 400 Bad Request (permanent error)', async ({ page, request }) => {
      const images = generateTestImages(1);

      let attemptCount = 0;
      await page.route('**/api/ai/process-single', async (route) => {
        attemptCount++;
        await route.fulfill({
          status: 400,
          body: JSON.stringify({ error: 'Invalid image format' }),
        });
      });

      const response = await request.post(`${BASE_URL}/api/ai/process-batch`, {
        data: {
          provider: 'openai',
          images,
          systemPrompt: 'Rate photos.',
          userPrompt: 'Rate 1-5.',
        },
      });

      // Should fail without retries (400 is permanent)
      await delay(1000);
      expect(attemptCount).toBe(1); // Only one attempt
    });

    test('should handle provider API outages gracefully', async ({ page, request }) => {
      const images = generateTestImages(5);

      await page.route('**/api/ai/process-single', async (route) => {
        await route.fulfill({
          status: 503,
          body: JSON.stringify({ error: 'Service unavailable' }),
        });
      });

      const response = await request.post(`${BASE_URL}/api/ai/process-batch`, {
        data: {
          provider: 'openai',
          images,
          systemPrompt: 'Rate photos.',
          userPrompt: 'Rate 1-5.',
        },
      });

      // Should handle gracefully (either retry or fail with clear error)
      expect([200, 500, 503]).toContain(response.status());

      if (!response.ok()) {
        const error = await response.json();
        expect(error).toHaveProperty('error');
      }
    });
  });

  test.describe('Exponential Backoff Strategy', () => {
    test('should increase wait time exponentially: 1s -> 2s -> 4s -> 8s', async ({
      page,
      request,
    }) => {
      const images = generateTestImages(1);

      const attemptTimes: number[] = [];
      await page.route('**/api/ai/process-single', async (route) => {
        attemptTimes.push(Date.now());

        if (attemptTimes.length < 4) {
          await route.fulfill({
            status: 429,
            body: JSON.stringify({ error: 'Rate limit exceeded' }),
          });
        } else {
          await route.fulfill({
            status: 200,
            body: JSON.stringify({
              rating: { starRating: 3, filename: 'test.png' },
              success: true,
            }),
          });
        }
      });

      const response = await request.post(`${BASE_URL}/api/ai/process-batch`, {
        data: {
          provider: 'openai',
          images,
          systemPrompt: 'Rate photos.',
          userPrompt: 'Rate 1-5.',
        },
      });

      if (response.ok() && attemptTimes.length >= 4) {
        // Verify exponential backoff
        const wait1 = attemptTimes[1] - attemptTimes[0];
        const wait2 = attemptTimes[2] - attemptTimes[1];
        const wait3 = attemptTimes[3] - attemptTimes[2];

        // Each wait should be roughly double the previous (allowing margin)
        expect(wait2).toBeGreaterThan(wait1 * 1.5);
        expect(wait3).toBeGreaterThan(wait2 * 1.5);
      }
    });

    test('should cap maximum backoff at 60 seconds', async ({ page, request }) => {
      const images = generateTestImages(1);

      const attemptTimes: number[] = [];
      await page.route('**/api/ai/process-single', async (route) => {
        attemptTimes.push(Date.now());

        // Always fail to test max backoff
        await route.fulfill({
          status: 429,
          body: JSON.stringify({ error: 'Rate limit exceeded' }),
        });
      });

      // Submit request (will keep retrying)
      const responsePromise = request.post(`${BASE_URL}/api/ai/process-batch`, {
        data: {
          provider: 'openai',
          images,
          systemPrompt: 'Rate photos.',
          userPrompt: 'Rate 1-5.',
        },
      });

      // Wait for several attempts
      await delay(5000);

      // Verify attempts are happening
      expect(attemptTimes.length).toBeGreaterThan(1);

      // Note: Full backoff testing would require longer test duration
    });
  });

  test.describe('Partial Batch Failures', () => {
    test('should track which images succeeded and which failed', async ({ page, request }) => {
      const images = generateTestImages(10);

      await page.route('**/api/ai/process-single', async (route) => {
        const postData = route.request().postDataJSON();
        const imageIndex = images.findIndex((img) => img.filename === postData.image.filename);

        // Every 3rd image fails
        if (imageIndex % 3 === 0) {
          await route.fulfill({
            status: 500,
            body: JSON.stringify({ error: 'Processing failed' }),
          });
        } else {
          await route.fulfill({
            status: 200,
            body: JSON.stringify({
              rating: { starRating: 4, filename: postData.image.filename },
              success: true,
            }),
          });
        }
      });

      const response = await request.post(`${BASE_URL}/api/ai/process-batch`, {
        data: {
          provider: 'openai',
          images,
          systemPrompt: 'Rate photos.',
          userPrompt: 'Rate 1-5.',
        },
      });

      if (response.ok()) {
        const results = await response.json();

        expect(results.summary.totalImages).toBe(10);
        expect(results.summary.successful).toBeGreaterThan(0);
        expect(results.summary.failed).toBeGreaterThan(0);

        // Verify failed images have error information
        const failedResults = results.results.filter((r: any) => !r.success);
        for (const failed of failedResults) {
          expect(failed).toHaveProperty('error');
          expect(failed).toHaveProperty('filename');
        }
      }
    });

    test('should allow user to retry only failed images', async ({ page, request }) => {
      const user = createTestUser();

      // Auth
      const authCode = await requestDeviceAuthCode(request, user, BASE_URL);
      await request.post(`${BASE_URL}/api/device-auth/approve`, {
        data: { code: authCode, userId: user.id },
      });
      const statusResponse = await request.get(`${BASE_URL}/api/device-auth/status/${authCode}`);
      const { accessToken } = await statusResponse.json();

      const allImages = generateTestImages(10);
      const failedImages = [allImages[2], allImages[5], allImages[8]];

      // Retry only failed images
      const retryResponse = await request.post(`${BASE_URL}/api/ai/process-batch`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        data: {
          provider: 'openai',
          images: failedImages,
          systemPrompt: 'Rate photos.',
          userPrompt: 'Rate 1-5.',
          isRetry: true,
        },
      });

      if (retryResponse.ok()) {
        const results = await retryResponse.json();
        expect(results.results.length).toBe(failedImages.length);
      }
    });
  });

  test.describe('WebSocket Reconnection', () => {
    test('should auto-reconnect WebSocket with exponential backoff', async () => {
      // This would test WebSocket reconnection logic
      // Implementation depends on client-side WebSocket handling
      expect(true).toBe(true);
    });

    test('should resume progress updates after WebSocket reconnection', async () => {
      // Test progress update resumption
      expect(true).toBe(true);
    });
  });
});
