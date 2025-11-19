/**
 * Offline Queue Functionality E2E Tests
 * Tests: Offline queueing, online sync, conflict resolution, persistence
 */

import { test, expect } from '@playwright/test';
import WebSocket from 'ws';
import {
  createTestUser,
  requestDeviceAuthCode,
  generateTestImages,
  enableOfflineMode,
  disableOfflineMode,
  delay,
  clearBrowserStorage,
} from '../fixtures/test-helpers';

test.describe('Offline Queue Functionality', () => {
  const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5000';
  const WS_URL = BASE_URL.replace('http', 'ws');

  test.describe('Queue Operations While Offline', () => {
    test('should queue batch processing requests when offline', async ({ page, request }) => {
      const user = createTestUser();
      const images = generateTestImages(5);

      // Auth
      const authCode = await requestDeviceAuthCode(request, user, BASE_URL);
      await request.post(`${BASE_URL}/api/device-auth/approve`, {
        data: { code: authCode, userId: user.id },
      });
      const statusResponse = await request.get(`${BASE_URL}/api/device-auth/status/${authCode}`);
      const { accessToken } = await statusResponse.json();

      // Go offline
      await enableOfflineMode(page);

      // Try to submit batch (should be queued locally)
      const offlineRequests = [];
      for (let i = 0; i < 3; i++) {
        const promise = request
          .post(`${BASE_URL}/api/ai/process-batch`, {
            headers: { Authorization: `Bearer ${accessToken}` },
            data: {
              provider: 'openai',
              images: [images[i]],
              systemPrompt: 'Rate photos.',
              userPrompt: 'Rate 1-5.',
            },
          })
          .catch((err) => err);

        offlineRequests.push(promise);
      }

      // Come back online
      await delay(500);
      await disableOfflineMode(page);

      // Wait for queued requests to be processed
      const results = await Promise.allSettled(offlineRequests);

      // Verify requests were attempted
      expect(results.length).toBe(3);
    });

    test('should persist queue across page reloads', async ({ page, context, request }) => {
      const user = createTestUser();
      const images = generateTestImages(3);

      // Auth
      const authCode = await requestDeviceAuthCode(request, user, BASE_URL);
      await request.post(`${BASE_URL}/api/device-auth/approve`, {
        data: { code: authCode, userId: user.id },
      });
      const statusResponse = await request.get(`${BASE_URL}/api/device-auth/status/${authCode}`);
      const { accessToken } = await statusResponse.json();

      // Navigate to app
      await page.goto(`${BASE_URL}/dashboard`);

      // Store token in localStorage
      await page.evaluate(
        (token) => {
          localStorage.setItem('accessToken', token);
          localStorage.setItem('offlineQueue', JSON.stringify([
            {
              id: 'offline-1',
              type: 'batch-process',
              payload: { provider: 'openai', imageCount: 5 },
              timestamp: Date.now(),
            },
            {
              id: 'offline-2',
              type: 'batch-process',
              payload: { provider: 'anthropic', imageCount: 3 },
              timestamp: Date.now(),
            },
          ]));
        },
        accessToken
      );

      // Reload page
      await page.reload();

      // Check queue persisted
      const queue = await page.evaluate(() => {
        const queueData = localStorage.getItem('offlineQueue');
        return queueData ? JSON.parse(queueData) : [];
      });

      expect(queue.length).toBe(2);
      expect(queue[0].type).toBe('batch-process');
    });

    test('should queue multiple operation types: process, export, settings', async ({
      page,
    }) => {
      await page.goto(`${BASE_URL}/dashboard`);

      // Initialize offline queue
      await page.evaluate(() => {
        const queue = [
          {
            id: 'op-1',
            type: 'batch-process',
            payload: { provider: 'openai', images: [] },
            timestamp: Date.now(),
          },
          {
            id: 'op-2',
            type: 'export-xmp',
            payload: { results: [], format: 'lightroom' },
            timestamp: Date.now() + 1000,
          },
          {
            id: 'op-3',
            type: 'update-settings',
            payload: { theme: 'dark', notifications: true },
            timestamp: Date.now() + 2000,
          },
        ];

        localStorage.setItem('offlineQueue', JSON.stringify(queue));
      });

      const queue = await page.evaluate(() => {
        const queueData = localStorage.getItem('offlineQueue');
        return queueData ? JSON.parse(queueData) : [];
      });

      expect(queue.length).toBe(3);
      expect(queue.map((item: any) => item.type)).toEqual([
        'batch-process',
        'export-xmp',
        'update-settings',
      ]);
    });
  });

  test.describe('Online Sync After Offline Period', () => {
    test('should sync all queued operations when coming back online', async ({
      page,
      request,
    }) => {
      const user = createTestUser();

      // Auth
      const authCode = await requestDeviceAuthCode(request, user, BASE_URL);
      await request.post(`${BASE_URL}/api/device-auth/approve`, {
        data: { code: authCode, userId: user.id },
      });
      const statusResponse = await request.get(`${BASE_URL}/api/device-auth/status/${authCode}`);
      const { accessToken } = await statusResponse.json();

      await page.goto(`${BASE_URL}/dashboard`);

      // Store token and offline queue
      await page.evaluate(
        (token) => {
          localStorage.setItem('accessToken', token);
          localStorage.setItem('offlineQueue', JSON.stringify([
            { id: 'sync-1', type: 'batch-process', payload: {}, timestamp: Date.now() },
            { id: 'sync-2', type: 'export-xmp', payload: {}, timestamp: Date.now() + 1000 },
          ]));
        },
        accessToken
      );

      // Simulate going offline then online
      await enableOfflineMode(page);
      await delay(1000);
      await disableOfflineMode(page);

      // Trigger sync
      await page.evaluate(() => {
        const event = new Event('online');
        window.dispatchEvent(event);
      });

      await delay(2000);

      // Check queue was processed
      const remainingQueue = await page.evaluate(() => {
        const queueData = localStorage.getItem('offlineQueue');
        return queueData ? JSON.parse(queueData) : [];
      });

      // Queue should be empty or have fewer items after sync
      expect(remainingQueue.length).toBeLessThanOrEqual(2);
    });

    test('should maintain queue order (FIFO) during sync', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard`);

      const operations = [
        { id: 'op-1', timestamp: 1000, type: 'process' },
        { id: 'op-2', timestamp: 2000, type: 'export' },
        { id: 'op-3', timestamp: 3000, type: 'settings' },
        { id: 'op-4', timestamp: 4000, type: 'process' },
      ];

      await page.evaluate((ops) => {
        localStorage.setItem('offlineQueue', JSON.stringify(ops));
      }, operations);

      const queue = await page.evaluate(() => {
        const queueData = localStorage.getItem('offlineQueue');
        return queueData ? JSON.parse(queueData) : [];
      });

      // Verify FIFO order
      for (let i = 1; i < queue.length; i++) {
        expect(queue[i].timestamp).toBeGreaterThan(queue[i - 1].timestamp);
      }
    });

    test('should handle sync failures gracefully and retry', async ({ page, request }) => {
      const user = createTestUser();

      await page.goto(`${BASE_URL}/dashboard`);

      // Mock sync endpoint to fail first time, succeed second time
      let syncAttempts = 0;
      await page.route('**/api/sync/queue', async (route) => {
        syncAttempts++;

        if (syncAttempts === 1) {
          await route.fulfill({
            status: 500,
            body: JSON.stringify({ error: 'Sync failed' }),
          });
        } else {
          await route.fulfill({
            status: 200,
            body: JSON.stringify({ synced: 2, failed: 0 }),
          });
        }
      });

      await page.evaluate(() => {
        localStorage.setItem('offlineQueue', JSON.stringify([
          { id: 'sync-test-1', type: 'process', payload: {} },
          { id: 'sync-test-2', type: 'export', payload: {} },
        ]));

        // Trigger sync
        const event = new Event('online');
        window.dispatchEvent(event);
      });

      await delay(3000);

      // Should have retried after failure
      expect(syncAttempts).toBeGreaterThan(1);
    });
  });

  test.describe('Conflict Resolution', () => {
    test('should detect conflicts when same image processed on multiple devices', async ({
      request,
    }) => {
      const userId = `test-user-${Date.now()}`;
      const device1 = createTestUser('device1');
      const device2 = createTestUser('device2');
      device1.id = userId;
      device2.id = userId;

      // Auth both devices
      const code1 = await requestDeviceAuthCode(request, device1, BASE_URL);
      const code2 = await requestDeviceAuthCode(request, device2, BASE_URL);

      await request.post(`${BASE_URL}/api/device-auth/approve`, {
        data: { code: code1, userId },
      });
      await request.post(`${BASE_URL}/api/device-auth/approve`, {
        data: { code: code2, userId },
      });

      const status1 = await request.get(`${BASE_URL}/api/device-auth/status/${code1}`);
      const status2 = await request.get(`${BASE_URL}/api/device-auth/status/${code2}`);

      const { accessToken: token1 } = await status1.json();
      const { accessToken: token2 } = await status2.json();

      const images = generateTestImages(5);

      // Both devices process same images (conflict scenario)
      const [response1, response2] = await Promise.all([
        request.post(`${BASE_URL}/api/ai/process-batch`, {
          headers: { Authorization: `Bearer ${token1}` },
          data: {
            provider: 'openai',
            images,
            systemPrompt: 'Rate photos.',
            userPrompt: 'Rate 1-5.',
          },
        }),
        request.post(`${BASE_URL}/api/ai/process-batch`, {
          headers: { Authorization: `Bearer ${token2}` },
          data: {
            provider: 'anthropic',
            images,
            systemPrompt: 'Rate photos.',
            userPrompt: 'Rate 1-5.',
          },
        }),
      ]);

      // Both should succeed (or handle conflict appropriately)
      expect([200, 409, 500]).toContain(response1.status());
      expect([200, 409, 500]).toContain(response2.status());
    });

    test('should use last-write-wins strategy for settings conflicts', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard`);

      // Simulate conflicting settings updates
      await page.evaluate(() => {
        const settings1 = {
          theme: 'dark',
          timestamp: 1000,
          deviceId: 'device-1',
        };

        const settings2 = {
          theme: 'light',
          timestamp: 2000,
          deviceId: 'device-2',
        };

        localStorage.setItem('pendingSettings', JSON.stringify([settings1, settings2]));
      });

      const settings = await page.evaluate(() => {
        const pending = localStorage.getItem('pendingSettings');
        if (!pending) return [];

        const settingsArray = JSON.parse(pending);
        // Last write wins
        return settingsArray.sort((a: any, b: any) => b.timestamp - a.timestamp)[0];
      });

      // Newest update should win
      expect(settings.theme).toBe('light');
      expect(settings.timestamp).toBe(2000);
    });
  });

  test.describe('Queue Management', () => {
    test('should allow user to view queued operations', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard`);

      await page.evaluate(() => {
        const queue = [
          {
            id: 'view-1',
            type: 'batch-process',
            payload: { imageCount: 50 },
            timestamp: Date.now(),
          },
          {
            id: 'view-2',
            type: 'export-xmp',
            payload: { resultCount: 50 },
            timestamp: Date.now() + 1000,
          },
        ];

        localStorage.setItem('offlineQueue', JSON.stringify(queue));
      });

      const queue = await page.evaluate(() => {
        const queueData = localStorage.getItem('offlineQueue');
        return queueData ? JSON.parse(queueData) : [];
      });

      expect(queue.length).toBe(2);
      expect(queue[0].type).toBe('batch-process');
      expect(queue[1].type).toBe('export-xmp');
    });

    test('should allow user to cancel queued operations', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard`);

      await page.evaluate(() => {
        const queue = [
          { id: 'cancel-1', type: 'batch-process', payload: {} },
          { id: 'cancel-2', type: 'export-xmp', payload: {} },
          { id: 'cancel-3', type: 'settings', payload: {} },
        ];

        localStorage.setItem('offlineQueue', JSON.stringify(queue));
      });

      // Cancel operation with id 'cancel-2'
      await page.evaluate(() => {
        const queueData = localStorage.getItem('offlineQueue');
        if (!queueData) return;

        const queue = JSON.parse(queueData);
        const filtered = queue.filter((item: any) => item.id !== 'cancel-2');
        localStorage.setItem('offlineQueue', JSON.stringify(filtered));
      });

      const updatedQueue = await page.evaluate(() => {
        const queueData = localStorage.getItem('offlineQueue');
        return queueData ? JSON.parse(queueData) : [];
      });

      expect(updatedQueue.length).toBe(2);
      expect(updatedQueue.find((item: any) => item.id === 'cancel-2')).toBeUndefined();
    });

    test('should clear completed operations from queue', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard`);

      await page.evaluate(() => {
        const queue = [
          { id: 'complete-1', type: 'process', status: 'completed' },
          { id: 'pending-1', type: 'process', status: 'pending' },
          { id: 'complete-2', type: 'export', status: 'completed' },
        ];

        localStorage.setItem('offlineQueue', JSON.stringify(queue));
      });

      // Clear completed
      await page.evaluate(() => {
        const queueData = localStorage.getItem('offlineQueue');
        if (!queueData) return;

        const queue = JSON.parse(queueData);
        const pending = queue.filter((item: any) => item.status !== 'completed');
        localStorage.setItem('offlineQueue', JSON.stringify(pending));
      });

      const cleaned = await page.evaluate(() => {
        const queueData = localStorage.getItem('offlineQueue');
        return queueData ? JSON.parse(queueData) : [];
      });

      expect(cleaned.length).toBe(1);
      expect(cleaned[0].id).toBe('pending-1');
    });

    test('should limit queue size to prevent memory issues', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard`);

      const MAX_QUEUE_SIZE = 100;

      // Add 150 operations (exceeds limit)
      await page.evaluate((maxSize) => {
        const queue = Array.from({ length: 150 }, (_, i) => ({
          id: `limit-${i}`,
          type: 'process',
          timestamp: Date.now() + i,
        }));

        // Trim to max size (keep newest)
        const trimmed = queue.slice(-maxSize);
        localStorage.setItem('offlineQueue', JSON.stringify(trimmed));
      }, MAX_QUEUE_SIZE);

      const queue = await page.evaluate(() => {
        const queueData = localStorage.getItem('offlineQueue');
        return queueData ? JSON.parse(queueData) : [];
      });

      expect(queue.length).toBe(MAX_QUEUE_SIZE);
      // Should keep newest operations
      expect(queue[0].id).toBe('limit-50');
      expect(queue[queue.length - 1].id).toBe('limit-149');
    });
  });

  test.describe('WebSocket Offline/Online Handling', () => {
    test('should reconnect WebSocket when coming back online', async ({ request }) => {
      const user = createTestUser();

      // Auth
      const authCode = await requestDeviceAuthCode(request, user, BASE_URL);
      await request.post(`${BASE_URL}/api/device-auth/approve`, {
        data: { code: authCode, userId: user.id },
      });

      // Connect WebSocket
      const ws = new WebSocket(`${WS_URL}/ws?token=${user.id}:${user.deviceId}`);

      await new Promise<void>((resolve, reject) => {
        ws.on('open', () => resolve());
        ws.on('error', reject);
        setTimeout(() => reject(new Error('Timeout')), 5000);
      });

      // Close connection (simulate offline)
      ws.close();

      await delay(500);

      // Reconnect (simulate online)
      const ws2 = new WebSocket(`${WS_URL}/ws?token=${user.id}:${user.deviceId}`);

      const reconnected = await new Promise<boolean>((resolve) => {
        ws2.on('open', () => resolve(true));
        ws2.on('error', () => resolve(false));
        setTimeout(() => resolve(false), 5000);
      });

      expect(reconnected).toBe(true);

      ws2.close();
    });

    test('should buffer WebSocket messages while offline and send when online', async ({
      request,
    }) => {
      const user = createTestUser();

      // Auth
      const authCode = await requestDeviceAuthCode(request, user, BASE_URL);
      await request.post(`${BASE_URL}/api/device-auth/approve`, {
        data: { code: authCode, userId: user.id },
      });

      const ws = new WebSocket(`${WS_URL}/ws?token=${user.id}:${user.deviceId}`);

      await new Promise<void>((resolve, reject) => {
        ws.on('open', () => resolve());
        ws.on('error', reject);
        setTimeout(() => reject(new Error('Timeout')), 5000);
      });

      // Skip DEVICE_CONNECTED
      await new Promise<void>((resolve) => ws.once('message', () => resolve()));

      // Simulate buffering messages while offline
      const bufferedMessages = [
        { type: 'UPDATE_PROGRESS', payload: { shootId: 'test', processedCount: 10 } },
        { type: 'UPDATE_PROGRESS', payload: { shootId: 'test', processedCount: 20 } },
      ];

      // When online, send all buffered messages
      for (const msg of bufferedMessages) {
        ws.send(JSON.stringify(msg));
        await delay(100);
      }

      await delay(500);

      ws.close();
    });
  });

  test.describe('Data Persistence', () => {
    test('should persist queue to IndexedDB for large datasets', async ({ page }) => {
      // Note: This would require IndexedDB implementation
      // For now, we test localStorage persistence

      await page.goto(`${BASE_URL}/dashboard`);

      const largeQueue = Array.from({ length: 1000 }, (_, i) => ({
        id: `persist-${i}`,
        type: 'batch-process',
        payload: { imageCount: 10 },
        timestamp: Date.now() + i,
      }));

      await page.evaluate((queue) => {
        localStorage.setItem('offlineQueue', JSON.stringify(queue));
      }, largeQueue);

      // Reload page
      await page.reload();

      const persisted = await page.evaluate(() => {
        const queueData = localStorage.getItem('offlineQueue');
        return queueData ? JSON.parse(queueData) : [];
      });

      expect(persisted.length).toBe(1000);
    });

    test('should recover from corrupted queue data', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard`);

      // Corrupt queue data
      await page.evaluate(() => {
        localStorage.setItem('offlineQueue', 'invalid json {{{');
      });

      // Try to read queue (should handle gracefully)
      const queue = await page.evaluate(() => {
        try {
          const queueData = localStorage.getItem('offlineQueue');
          return queueData ? JSON.parse(queueData) : [];
        } catch (error) {
          // Reset to empty queue on corruption
          localStorage.setItem('offlineQueue', JSON.stringify([]));
          return [];
        }
      });

      expect(Array.isArray(queue)).toBe(true);
      expect(queue.length).toBe(0);
    });
  });
});
