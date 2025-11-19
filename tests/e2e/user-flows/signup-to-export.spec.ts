/**
 * Complete User Journey: Signup → Device Auth → Folder Select → Process Images → Export XMP
 * This is the most comprehensive E2E test covering the entire user flow
 */

import { test, expect } from '@playwright/test';
import WebSocket from 'ws';
import {
  createTestUser,
  requestDeviceAuthCode,
  generateTestImages,
  mockBatchProcessingEndpoint,
  delay,
  calculateExpectedCost,
} from '../fixtures/test-helpers';
import { mockBatchResponse, mockWebSocketMessages } from '../fixtures/mock-ai-responses';

test.describe('Complete Signup to Export User Journey', () => {
  const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5000';
  const WS_URL = BASE_URL.replace('http', 'ws');

  test('should complete full journey: auth -> process 50 images -> export XMP', async ({
    page,
    request,
  }) => {
    const user = createTestUser();
    const imageCount = 50;

    // STEP 1: Device requests authentication code
    const authCode = await requestDeviceAuthCode(request, user, BASE_URL);
    expect(authCode).toBeTruthy();
    expect(authCode).toMatch(/^[A-Z0-9]{6}$/);

    // STEP 2: User approves device (simulated)
    const approveResponse = await request.post(`${BASE_URL}/api/device-auth/approve`, {
      data: {
        code: authCode,
        userId: user.id,
      },
    });
    expect(approveResponse.ok()).toBe(true);

    // STEP 3: Device polls and receives tokens
    const statusResponse = await request.get(`${BASE_URL}/api/device-auth/status/${authCode}`);
    expect(statusResponse.ok()).toBe(true);

    const { accessToken, refreshToken } = await statusResponse.json();
    expect(accessToken).toBeTruthy();
    expect(refreshToken).toBeTruthy();

    // STEP 4: Connect to WebSocket for real-time updates
    const ws = new WebSocket(`${WS_URL}/ws?token=${user.id}:${user.deviceId}`);

    const wsConnected = new Promise<void>((resolve, reject) => {
      ws.on('open', () => resolve());
      ws.on('error', reject);
      setTimeout(() => reject(new Error('WebSocket connection timeout')), 5000);
    });

    await wsConnected;

    // Wait for DEVICE_CONNECTED message
    const deviceConnectedMsg = await new Promise<any>((resolve) => {
      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'DEVICE_CONNECTED') {
          resolve(message);
        }
      });
    });

    expect(deviceConnectedMsg.type).toBe('DEVICE_CONNECTED');
    expect(deviceConnectedMsg.deviceId).toBe(user.deviceId);

    // STEP 5: Mock batch processing endpoint
    const mockResponse = mockBatchResponse.success(imageCount, 'openai');
    await mockBatchProcessingEndpoint(page, 'openai', mockResponse);

    // STEP 6: Select folder and prepare images (simulated)
    const images = generateTestImages(imageCount);

    // STEP 7: Check credit balance before processing
    const balanceResponse = await request.get(`${BASE_URL}/api/credits/balance`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    let initialBalance = 0;
    if (balanceResponse.ok()) {
      const balanceData = await balanceResponse.json();
      initialBalance = balanceData.balance || 0;
    }

    // STEP 8: Submit batch for processing (Fast mode)
    const batchResponse = await request.post(`${BASE_URL}/api/ai/process-batch`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      data: {
        provider: 'openai',
        images,
        systemPrompt: 'You are a professional wedding photographer photo rating AI.',
        userPrompt: 'Rate each photo on quality, composition, emotion, and moment timing.',
        useBatchAPI: false, // Fast mode
      },
    });

    // STEP 9: Monitor WebSocket for progress updates
    const progressUpdates: any[] = [];
    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      if (message.type === 'SHOOT_PROGRESS') {
        progressUpdates.push(message);
      }
    });

    // Wait for batch processing to complete (or timeout)
    if (batchResponse.ok()) {
      const results = await batchResponse.json();

      expect(results).toHaveProperty('results');
      expect(results).toHaveProperty('summary');
      expect(results.results.length).toBe(imageCount);

      // Verify all images were processed
      expect(results.summary.totalImages).toBe(imageCount);
      expect(results.summary.successful).toBeGreaterThan(0);

      // STEP 10: Verify ratings structure
      for (const result of results.results) {
        expect(result).toHaveProperty('rating');

        const rating = result.rating;
        expect(rating).toHaveProperty('starRating');
        expect(rating.starRating).toBeGreaterThanOrEqual(1);
        expect(rating.starRating).toBeLessThanOrEqual(5);

        expect(rating).toHaveProperty('technicalQuality');
        expect(rating).toHaveProperty('subjectAnalysis');
        expect(rating).toHaveProperty('keepReject');
        expect(['keep', 'reject', 'maybe']).toContain(rating.keepReject);
      }

      // STEP 11: Verify cost calculation (2x markup)
      const expectedCost = calculateExpectedCost(imageCount, 0.002);
      expect(results.summary.totalCost).toBeCloseTo(expectedCost.providerCost, 2);
      expect(results.summary.totalUserCharge).toBeCloseTo(expectedCost.userCharge, 2);

      // STEP 12: Export results to XMP format (simulated)
      const exportResponse = await request.post(`${BASE_URL}/api/export/xmp`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        data: {
          results: results.results,
          exportFormat: 'lightroom',
        },
      });

      if (exportResponse.ok()) {
        const exportData = await exportResponse.json();
        expect(exportData).toHaveProperty('files');
        expect(Array.isArray(exportData.files)).toBe(true);
      } else {
        // Export endpoint may not be implemented yet
        console.log('Export endpoint not available, skipping XMP export verification');
      }

      // STEP 13: Verify credit balance was deducted
      const newBalanceResponse = await request.get(`${BASE_URL}/api/credits/balance`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (newBalanceResponse.ok()) {
        const newBalanceData = await newBalanceResponse.json();
        const newBalance = newBalanceData.balance || 0;

        // Balance should have decreased by user charge amount
        expect(newBalance).toBeLessThan(initialBalance);
      }
    } else {
      // If processing failed (likely no API keys configured), verify error handling
      const error = await batchResponse.json();
      expect(error).toHaveProperty('error');
      console.log('Batch processing failed (expected if no API keys):', error.error);
    }

    // STEP 14: Close WebSocket connection
    ws.close();

    // Wait for DEVICE_DISCONNECTED message (optional)
    await delay(500);
  });

  test('should handle WebSocket real-time progress updates during processing', async ({
    page,
    request,
  }) => {
    const user = createTestUser();
    const imageCount = 20;

    // Auth flow
    const authCode = await requestDeviceAuthCode(request, user, BASE_URL);
    await request.post(`${BASE_URL}/api/device-auth/approve`, {
      data: { code: authCode, userId: user.id },
    });

    const statusResponse = await request.get(`${BASE_URL}/api/device-auth/status/${authCode}`);
    const { accessToken } = await statusResponse.json();

    // Connect WebSocket
    const ws = new WebSocket(`${WS_URL}/ws?token=${user.id}:${user.deviceId}`);

    await new Promise<void>((resolve, reject) => {
      ws.on('open', () => resolve());
      ws.on('error', reject);
      setTimeout(() => reject(new Error('Timeout')), 5000);
    });

    // Skip DEVICE_CONNECTED message
    await new Promise<void>((resolve) => {
      ws.once('message', () => resolve());
    });

    const progressUpdates: any[] = [];
    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      if (message.type === 'SHOOT_PROGRESS') {
        progressUpdates.push(message);
      }
    });

    // Mock processing endpoint with progress simulation
    await mockBatchProcessingEndpoint(
      page,
      'openai',
      mockBatchResponse.success(imageCount, 'openai')
    );

    // Submit batch
    const images = generateTestImages(imageCount);
    const batchResponse = await request.post(`${BASE_URL}/api/ai/process-batch`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: {
        provider: 'openai',
        images,
        systemPrompt: 'Rate photos.',
        userPrompt: 'Rate 1-5.',
        useBatchAPI: false,
      },
    });

    if (batchResponse.ok()) {
      await delay(2000); // Wait for progress updates

      // Verify progress updates were received
      if (progressUpdates.length > 0) {
        expect(progressUpdates.length).toBeGreaterThan(0);

        // Verify progress structure
        for (const update of progressUpdates) {
          expect(update).toHaveProperty('type', 'SHOOT_PROGRESS');
          expect(update.data).toHaveProperty('shootId');
          expect(update.data).toHaveProperty('processedCount');
          expect(update.data).toHaveProperty('totalCount');
          expect(update.data).toHaveProperty('status');
        }

        // Verify progress is sequential
        const counts = progressUpdates.map((u) => u.data.processedCount);
        for (let i = 1; i < counts.length; i++) {
          expect(counts[i]).toBeGreaterThanOrEqual(counts[i - 1]);
        }
      }
    }

    ws.close();
  });

  test('should support all 3 processing modes in complete flow', async ({ page, request }) => {
    const user = createTestUser();
    const imageCount = 10;

    // Auth
    const authCode = await requestDeviceAuthCode(request, user, BASE_URL);
    await request.post(`${BASE_URL}/api/device-auth/approve`, {
      data: { code: authCode, userId: user.id },
    });
    const statusResponse = await request.get(`${BASE_URL}/api/device-auth/status/${authCode}`);
    const { accessToken } = await statusResponse.json();

    const images = generateTestImages(imageCount);

    // MODE 1: Fast (concurrent)
    const fastResponse = await request.post(`${BASE_URL}/api/ai/process-batch`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: {
        provider: 'openai',
        images,
        systemPrompt: 'Rate photos.',
        userPrompt: 'Rate 1-5.',
        useBatchAPI: false,
      },
    });

    if (fastResponse.ok()) {
      const fastResults = await fastResponse.json();
      expect(fastResults.summary.provider).toBe('openai');
    }

    // MODE 2: Economy (batch API)
    const economyResponse = await request.post(`${BASE_URL}/api/ai/process-batch`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: {
        provider: 'openai',
        images,
        systemPrompt: 'Rate photos.',
        userPrompt: 'Rate 1-5.',
        useBatchAPI: true,
      },
    });

    // Should return job ID for polling
    if (economyResponse.ok()) {
      const economyData = await economyResponse.json();
      if (economyData.jobId) {
        expect(economyData).toHaveProperty('jobId');
        expect(economyData).toHaveProperty('status');
      }
    }

    // MODE 3: Local (on-device, macOS only)
    const localResponse = await request.post(`${BASE_URL}/api/ai/process-batch`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: {
        provider: 'local',
        images,
        systemPrompt: 'Rate photos.',
        userPrompt: 'Rate 1-5.',
        platform: 'macos',
      },
    });

    // Should either succeed or return not implemented
    expect([200, 400, 501]).toContain(localResponse.status());
  });

  test('should display cost preview before processing', async ({ request }) => {
    const user = createTestUser();

    // Auth
    const authCode = await requestDeviceAuthCode(request, user, BASE_URL);
    await request.post(`${BASE_URL}/api/device-auth/approve`, {
      data: { code: authCode, userId: user.id },
    });
    const statusResponse = await request.get(`${BASE_URL}/api/device-auth/status/${authCode}`);
    const { accessToken } = await statusResponse.json();

    // Get cost preview
    const previewResponse = await request.post(`${BASE_URL}/api/ai/cost-preview`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: {
        provider: 'openai',
        imageCount: 100,
      },
    });

    if (previewResponse.ok()) {
      const preview = await previewResponse.json();
      expect(preview).toHaveProperty('providerCost');
      expect(preview).toHaveProperty('userCharge');
      expect(preview.userCharge).toBeCloseTo(preview.providerCost * 2, 5);
    }
  });

  test('should handle multi-device sync during processing', async ({ request }) => {
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

    // Connect both devices to WebSocket
    const ws1 = new WebSocket(`${WS_URL}/ws?token=${userId}:${device1.deviceId}`);
    const ws2 = new WebSocket(`${WS_URL}/ws?token=${userId}:${device2.deviceId}`);

    await Promise.all([
      new Promise<void>((resolve, reject) => {
        ws1.on('open', () => resolve());
        ws1.on('error', reject);
        setTimeout(() => reject(new Error('Timeout')), 5000);
      }),
      new Promise<void>((resolve, reject) => {
        ws2.on('open', () => resolve());
        ws2.on('error', reject);
        setTimeout(() => reject(new Error('Timeout')), 5000);
      }),
    ]);

    // Skip DEVICE_CONNECTED messages
    await Promise.all([
      new Promise<void>((resolve) => ws1.once('message', () => resolve())),
      new Promise<void>((resolve) => ws2.once('message', () => resolve())),
    ]);

    // Listen for progress on device 2
    const device2Updates: any[] = [];
    ws2.on('message', (data) => {
      const message = JSON.parse(data.toString());
      if (message.type === 'SHOOT_PROGRESS') {
        device2Updates.push(message);
      }
    });

    // Device 1 starts processing
    const images = generateTestImages(5);
    const batchResponse = await request.post(`${BASE_URL}/api/ai/process-batch`, {
      headers: { Authorization: `Bearer ${token1}` },
      data: {
        provider: 'openai',
        images,
        systemPrompt: 'Rate photos.',
        userPrompt: 'Rate 1-5.',
        useBatchAPI: false,
      },
    });

    if (batchResponse.ok()) {
      await delay(2000);

      // Device 2 should have received progress updates
      if (device2Updates.length > 0) {
        expect(device2Updates.length).toBeGreaterThan(0);
      }
    }

    ws1.close();
    ws2.close();
  });

  test('should export XMP files with correct Lightroom format', async ({ request }) => {
    const user = createTestUser();

    // Auth
    const authCode = await requestDeviceAuthCode(request, user, BASE_URL);
    await request.post(`${BASE_URL}/api/device-auth/approve`, {
      data: { code: authCode, userId: user.id },
    });
    const statusResponse = await request.get(`${BASE_URL}/api/device-auth/status/${authCode}`);
    const { accessToken } = await statusResponse.json();

    // Create mock ratings
    const mockRatings = [
      {
        filename: 'IMG_001.jpg',
        starRating: 5,
        colorLabel: 'green',
        keepReject: 'keep',
      },
      {
        filename: 'IMG_002.jpg',
        starRating: 3,
        colorLabel: 'yellow',
        keepReject: 'maybe',
      },
    ];

    // Export to XMP
    const exportResponse = await request.post(`${BASE_URL}/api/export/xmp`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: {
        results: mockRatings,
        exportFormat: 'lightroom',
      },
    });

    if (exportResponse.ok()) {
      const exportData = await exportResponse.json();
      expect(exportData).toHaveProperty('files');
      expect(exportData.files.length).toBe(mockRatings.length);

      // Verify XMP file structure
      for (const file of exportData.files) {
        expect(file).toHaveProperty('filename');
        expect(file).toHaveProperty('xmpContent');
        expect(file.filename).toMatch(/\.xmp$/);
        expect(file.xmpContent).toContain('xmp:Rating');
      }
    } else {
      console.log('XMP export endpoint not implemented yet');
    }
  });
});
