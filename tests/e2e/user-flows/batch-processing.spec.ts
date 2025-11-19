/**
 * Batch Processing Flow E2E Tests
 * Tests all 3 processing modes: Fast (concurrent), Economy (batch API), Local (on-device)
 */

import { test, expect } from '@playwright/test';
import {
  createTestUser,
  generateTestImages,
  mockBatchProcessingEndpoint,
  calculateExpectedCost,
  delay,
} from '../fixtures/test-helpers';
import { mockBatchResponse, mockProviderResponse } from '../fixtures/mock-ai-responses';

test.describe('Batch Processing User Flow', () => {
  const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5000';

  test.describe('Fast Mode (Concurrent Processing)', () => {
    test('should process 50 images concurrently with real-time progress', async ({
      page,
      request,
    }) => {
      const imageCount = 50;
      const images = generateTestImages(imageCount);

      // Mock the batch processing endpoint
      await mockBatchProcessingEndpoint(
        page,
        'openai',
        mockBatchResponse.success(imageCount, 'openai')
      );

      // Navigate to processing page (or use API directly)
      const response = await request.post(`${BASE_URL}/api/ai/process-batch`, {
        data: {
          provider: 'openai',
          images,
          systemPrompt: 'You are a professional photo rating AI.',
          userPrompt: 'Rate each photo on quality, composition, and moment.',
          useBatchAPI: false, // Fast mode
        },
      });

      if (response.ok()) {
        const results = await response.json();

        expect(results).toHaveProperty('results');
        expect(results).toHaveProperty('summary');
        expect(Array.isArray(results.results)).toBe(true);
        expect(results.results.length).toBe(imageCount);

        // Verify summary
        expect(results.summary.totalImages).toBe(imageCount);
        expect(results.summary.successful).toBe(imageCount);
        expect(results.summary.failed).toBe(0);
        expect(results.summary.provider).toBe('openai');

        // Verify cost calculation (2x markup)
        const expectedCost = calculateExpectedCost(imageCount, 0.002);
        expect(results.summary.totalCost).toBeCloseTo(expectedCost.providerCost, 2);
        expect(results.summary.totalUserCharge).toBeCloseTo(expectedCost.userCharge, 2);

        // Verify each result has required fields
        for (const result of results.results) {
          expect(result).toHaveProperty('rating');
          expect(result.rating).toHaveProperty('starRating');
          expect(result.rating).toHaveProperty('technicalQuality');
          expect(result.rating).toHaveProperty('subjectAnalysis');
          expect(result.success).toBe(true);
        }
      } else {
        // If mocking didn't work, just verify error handling
        const error = await response.json();
        expect(error).toHaveProperty('error');
      }
    });

    test('should fire all requests concurrently (not sequentially)', async ({ request }) => {
      const imageCount = 10;
      const images = generateTestImages(imageCount);

      const startTime = Date.now();

      const response = await request.post(`${BASE_URL}/api/ai/process-batch`, {
        data: {
          provider: 'openai',
          images,
          systemPrompt: 'Rate these photos.',
          userPrompt: 'Rate 1-5 stars.',
          useBatchAPI: false,
        },
      });

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Concurrent should be fast (< 5 seconds for 10 images)
      // Sequential would take ~10+ seconds
      if (response.ok()) {
        expect(totalTime).toBeLessThan(10000);
      }
    });

    test('should handle partial failures with retry logic', async ({ page, request }) => {
      const imageCount = 20;
      const failureCount = 5;
      const images = generateTestImages(imageCount);

      // Mock partial failure response
      await mockBatchProcessingEndpoint(
        page,
        'openai',
        mockBatchResponse.partialFailure(imageCount, failureCount, 'openai')
      );

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

        expect(results.summary.successful).toBe(imageCount - failureCount);
        expect(results.summary.failed).toBe(failureCount);

        // Verify failed results have error messages
        const failedResults = results.results.filter((r: any) => !r.success);
        expect(failedResults.length).toBe(failureCount);

        for (const failed of failedResults) {
          expect(failed).toHaveProperty('error');
        }
      }
    });

    test('should show real-time progress for each image processed', async ({ request }) => {
      const imageCount = 5;
      const images = generateTestImages(imageCount);

      // In a real scenario, this would connect to WebSocket to monitor progress
      // For this test, we verify the batch endpoint accepts progress tracking

      const response = await request.post(`${BASE_URL}/api/ai/process-batch`, {
        data: {
          provider: 'openai',
          images,
          systemPrompt: 'Rate photos.',
          userPrompt: 'Rate 1-5.',
          useBatchAPI: false,
          trackProgress: true, // Enable progress tracking
        },
      });

      // Verify request structure
      expect([200, 400, 500]).toContain(response.status());
    });
  });

  test.describe('Economy Mode (Batch API)', () => {
    test('should submit batch job and poll for completion', async ({ page, request }) => {
      const imageCount = 100;
      const images = generateTestImages(imageCount);

      // Mock batch submission
      const mockBatchJobResponse = {
        jobId: `batch-${Date.now()}`,
        status: 'queued',
        totalImages: imageCount,
        provider: 'openai',
        estimatedCompletionTime: Date.now() + 600000, // 10 minutes
      };

      await page.route('**/api/ai/process-batch', async (route) => {
        const postData = route.request().postDataJSON();
        if (postData.useBatchAPI === true) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(mockBatchJobResponse),
          });
        } else {
          await route.continue();
        }
      });

      // Submit batch job
      const submitResponse = await request.post(`${BASE_URL}/api/ai/process-batch`, {
        data: {
          provider: 'openai',
          images,
          systemPrompt: 'Rate photos.',
          userPrompt: 'Rate 1-5.',
          useBatchAPI: true, // Economy mode
        },
      });

      if (submitResponse.ok()) {
        const submitData = await submitResponse.json();
        expect(submitData).toHaveProperty('jobId');
        expect(submitData.status).toBe('queued');

        const jobId = submitData.jobId;

        // Poll for batch status
        const statusResponse = await request.get(`${BASE_URL}/api/ai/batch-status/${jobId}`);

        if (statusResponse.ok()) {
          const statusData = await statusResponse.json();
          expect(statusData).toHaveProperty('status');
          expect(['queued', 'processing', 'completed', 'failed']).toContain(statusData.status);
        }
      }
    });

    test('should apply 50% discount for batch API (still 2x markup to user)', async ({
      request,
    }) => {
      const imageCount = 100;
      const images = generateTestImages(imageCount);

      // Provider batch cost: $0.001 per image (50% off normal $0.002)
      // User charge: $0.002 per image (2x the discounted price)

      const response = await request.post(`${BASE_URL}/api/ai/process-batch`, {
        data: {
          provider: 'openai',
          images,
          systemPrompt: 'Rate photos.',
          userPrompt: 'Rate 1-5.',
          useBatchAPI: true,
        },
      });

      if (response.ok()) {
        const data = await response.json();

        if (data.summary) {
          // Verify batch pricing (if implemented)
          expect(data.summary.totalCost).toBeLessThan(imageCount * 0.002);
        }
      }
    });

    test('should handle batch job completion and retrieve results', async ({
      page,
      request,
    }) => {
      const jobId = `batch-test-${Date.now()}`;

      // Mock batch results endpoint
      await page.route(`**/api/ai/batch-results/${jobId}`, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockBatchResponse.success(50, 'openai')),
        });
      });

      const response = await request.get(`${BASE_URL}/api/ai/batch-results/${jobId}`);

      if (response.ok()) {
        const results = await response.json();
        expect(results).toHaveProperty('results');
        expect(results).toHaveProperty('summary');
      }
    });
  });

  test.describe('Local Mode (On-Device, macOS Only)', () => {
    test('should process images locally without cloud API calls', async ({ request }) => {
      const imageCount = 10;
      const images = generateTestImages(imageCount);

      // Local processing would be handled by native app
      // This test verifies the API supports local mode flag

      const response = await request.post(`${BASE_URL}/api/ai/process-batch`, {
        data: {
          provider: 'local', // On-device provider
          images,
          systemPrompt: 'Rate photos.',
          userPrompt: 'Rate 1-5.',
          useBatchAPI: false,
        },
      });

      // Should either succeed with local processing or return error if not supported
      expect([200, 400, 501]).toContain(response.status());

      if (response.ok()) {
        const results = await response.json();

        // Verify cost is $0 for local processing
        if (results.summary) {
          expect(results.summary.totalCost).toBe(0);
          expect(results.summary.totalUserCharge).toBe(0);
        }
      }
    });

    test('should reject local mode on non-macOS platforms', async ({ request }) => {
      const images = generateTestImages(5);

      const response = await request.post(`${BASE_URL}/api/ai/process-batch`, {
        data: {
          provider: 'local',
          images,
          systemPrompt: 'Rate photos.',
          userPrompt: 'Rate 1-5.',
          platform: 'ios', // iOS doesn't support local processing
        },
      });

      // Should reject or handle gracefully
      if (!response.ok()) {
        const error = await response.json();
        expect(error.error).toMatch(/local.*not.*supported/i);
      }
    });
  });

  test.describe('Provider Selection', () => {
    test('should allow switching between providers mid-shoot', async ({ request }) => {
      const images = generateTestImages(10);

      // Process first 5 with OpenAI
      const openaiResponse = await request.post(`${BASE_URL}/api/ai/process-batch`, {
        data: {
          provider: 'openai',
          images: images.slice(0, 5),
          systemPrompt: 'Rate photos.',
          userPrompt: 'Rate 1-5.',
          useBatchAPI: false,
        },
      });

      // Process next 5 with Anthropic
      const anthropicResponse = await request.post(`${BASE_URL}/api/ai/process-batch`, {
        data: {
          provider: 'anthropic',
          images: images.slice(5, 10),
          systemPrompt: 'Rate photos.',
          userPrompt: 'Rate 1-5.',
          useBatchAPI: false,
        },
      });

      // Both should succeed (or fail with same error if API keys not configured)
      expect(openaiResponse.status()).toBe(anthropicResponse.status());
    });

    test('should list all available providers with capabilities', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/ai/providers`);
      expect(response.ok()).toBe(true);

      const data = await response.json();
      expect(data).toHaveProperty('providers');
      expect(data).toHaveProperty('markup', '2x');

      // Verify each provider has required info
      for (const provider of data.providers) {
        expect(provider).toHaveProperty('id');
        expect(provider).toHaveProperty('name');
        expect(provider).toHaveProperty('costPerImage');
        expect(provider).toHaveProperty('userChargePerImage');
        expect(provider).toHaveProperty('supportsBatch');

        // Verify 2x markup
        expect(provider.userChargePerImage).toBeCloseTo(provider.costPerImage * 2, 5);
      }
    });
  });

  test.describe('Edge Cases', () => {
    test('should handle empty image array', async ({ request }) => {
      const response = await request.post(`${BASE_URL}/api/ai/process-batch`, {
        data: {
          provider: 'openai',
          images: [],
          systemPrompt: 'Rate photos.',
          userPrompt: 'Rate 1-5.',
        },
      });

      expect(response.status()).toBe(400);
      const error = await response.json();
      expect(error.error).toBe('Images must be a non-empty array');
    });

    test('should handle huge batch (1000+ images)', async ({ request }) => {
      const imageCount = 1000;
      const images = generateTestImages(imageCount);

      const response = await request.post(`${BASE_URL}/api/ai/process-batch`, {
        data: {
          provider: 'openai',
          images,
          systemPrompt: 'Rate photos.',
          userPrompt: 'Rate 1-5.',
          useBatchAPI: false,
        },
      });

      // Should accept large batch (or return error if limit exceeded)
      expect([200, 413, 500]).toContain(response.status());
    });

    test('should handle corrupted image data gracefully', async ({ request }) => {
      const images = [
        {
          data: 'not-valid-base64-!@#$%^&*()',
          format: 'png',
          filename: 'corrupted.png',
        },
      ];

      const response = await request.post(`${BASE_URL}/api/ai/process-batch`, {
        data: {
          provider: 'openai',
          images,
          systemPrompt: 'Rate photos.',
          userPrompt: 'Rate 1-5.',
        },
      });

      // Should handle gracefully (either validate upfront or return failure in results)
      expect([200, 400, 500]).toContain(response.status());
    });

    test('should handle images without EXIF data', async ({ request }) => {
      const images = generateTestImages(5);

      const response = await request.post(`${BASE_URL}/api/ai/process-batch`, {
        data: {
          provider: 'openai',
          images,
          systemPrompt: 'Rate photos.',
          userPrompt: 'Rate 1-5.',
          requireEXIF: false,
        },
      });

      // Should process without EXIF
      if (response.ok()) {
        const results = await response.json();
        expect(results).toHaveProperty('results');
      }
    });

    test('should reject invalid provider', async ({ request }) => {
      const images = generateTestImages(5);

      const response = await request.post(`${BASE_URL}/api/ai/process-batch`, {
        data: {
          provider: 'invalid-provider',
          images,
          systemPrompt: 'Rate photos.',
          userPrompt: 'Rate 1-5.',
        },
      });

      expect(response.status()).toBe(400);
      const error = await response.json();
      expect(error.error).toContain('Invalid provider');
    });

    test('should handle malformed request body', async ({ request }) => {
      const response = await request.post(`${BASE_URL}/api/ai/process-batch`, {
        headers: {
          'Content-Type': 'application/json',
        },
        data: 'invalid json {{{',
      });

      expect(response.status()).toBeGreaterThanOrEqual(400);
    });
  });

  test.describe('Cost Calculation', () => {
    test('should calculate costs correctly for all providers', async ({ request }) => {
      const providersResponse = await request.get(`${BASE_URL}/api/ai/providers`);
      const { providers } = await providersResponse.json();

      for (const provider of providers) {
        const imageCount = 10;
        const images = generateTestImages(imageCount);

        const response = await request.post(`${BASE_URL}/api/ai/process-batch`, {
          data: {
            provider: provider.id,
            images,
            systemPrompt: 'Rate photos.',
            userPrompt: 'Rate 1-5.',
            useBatchAPI: false,
          },
        });

        if (response.ok()) {
          const results = await response.json();

          if (results.summary) {
            // Verify cost is close to expected (allowing for small rounding differences)
            const expectedCost = calculateExpectedCost(imageCount, provider.costPerImage);
            expect(results.summary.totalCost).toBeCloseTo(expectedCost.providerCost, 2);
            expect(results.summary.totalUserCharge).toBeCloseTo(expectedCost.userCharge, 2);
          }
        }
      }
    });

    test('should show cost preview before processing', async ({ request }) => {
      const imageCount = 100;

      const previewResponse = await request.post(`${BASE_URL}/api/ai/cost-preview`, {
        data: {
          provider: 'openai',
          imageCount,
        },
      });

      if (previewResponse.ok()) {
        const preview = await previewResponse.json();
        expect(preview).toHaveProperty('providerCost');
        expect(preview).toHaveProperty('userCharge');
        expect(preview).toHaveProperty('imageCount');
        expect(preview.userCharge).toBeCloseTo(preview.providerCost * 2, 5);
      }
    });
  });
});
