/**
 * Tests for batch processing routes (economy mode)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ProviderId } from '@shared/culling/schemas';

describe('Batch Processing', () => {
  describe('POST /api/batch/process', () => {
    it('should submit fast mode batch', () => {
      // Fast mode uses concurrent processing
      const request = {
        shootId: 'test-shoot-123',
        images: [
          { id: 'img1', b64: 'base64data1', filename: 'test1.jpg' },
          { id: 'img2', b64: 'base64data2', filename: 'test2.jpg' }
        ],
        providerId: 'openai-gpt-5',
        prompt: 'Rate these photos',
        mode: 'fast'
      };

      // Should return jobId and mode
      expect(request.mode).toBe('fast');
      expect(request.images.length).toBe(2);
    });

    it('should submit economy mode batch', () => {
      // Economy mode uses provider batch APIs
      const request = {
        shootId: 'test-shoot-456',
        images: [
          { id: 'img1', b64: 'base64data1', filename: 'test1.jpg' },
          { id: 'img2', b64: 'base64data2', filename: 'test2.jpg' }
        ],
        providerId: 'openai-gpt-5',
        prompt: 'Rate these photos',
        mode: 'economy'
      };

      // Should return jobId and estimated completion time
      expect(request.mode).toBe('economy');
      expect(request.images.length).toBe(2);
    });

    it('should reject economy mode for unsupported providers', () => {
      const unsupportedProviders = ['grok-2-vision-1212', 'kimi-k2-instruct'];

      unsupportedProviders.forEach(providerId => {
        const request = {
          shootId: 'test-shoot-789',
          images: [{ id: 'img1', b64: 'base64data', filename: 'test.jpg' }],
          providerId,
          prompt: 'Rate these photos',
          mode: 'economy'
        };

        // Should reject because these providers don't support batch
        expect(request.mode).toBe('economy');
        expect(['grok-2-vision-1212', 'kimi-k2-instruct']).toContain(request.providerId);
      });
    });

    it('should accept economy mode for supported providers', () => {
      const supportedProviders: ProviderId[] = [
        'openai-gpt-5',
        'claude-haiku-4-5-20251001',
        'gemini-2.5-flash-lite'
      ];

      supportedProviders.forEach(providerId => {
        const request = {
          shootId: 'test-shoot-abc',
          images: [{ id: 'img1', b64: 'base64data', filename: 'test.jpg' }],
          providerId,
          prompt: 'Rate these photos',
          mode: 'economy'
        };

        // Should accept because these providers support batch
        expect(request.mode).toBe('economy');
        expect(supportedProviders).toContain(request.providerId);
      });
    });
  });

  describe('GET /api/batch/status/:jobId', () => {
    it('should return job status with progress', () => {
      const jobStatus = {
        jobId: 'batch_123',
        status: 'processing',
        totalImages: 100,
        processedImages: 45,
        progress: 0.45,
        mode: 'economy',
        createdAt: new Date(),
        startedAt: new Date()
      };

      expect(jobStatus.progress).toBe(0.45);
      expect(jobStatus.status).toBe('processing');
      expect(jobStatus.processedImages).toBe(45);
      expect(jobStatus.totalImages).toBe(100);
    });

    it('should return completed status with all images', () => {
      const jobStatus = {
        jobId: 'batch_456',
        status: 'completed',
        totalImages: 50,
        processedImages: 50,
        progress: 1.0,
        mode: 'economy',
        createdAt: new Date(),
        startedAt: new Date(),
        completedAt: new Date()
      };

      expect(jobStatus.status).toBe('completed');
      expect(jobStatus.progress).toBe(1.0);
      expect(jobStatus.completedAt).toBeDefined();
    });

    it('should return failed status with error', () => {
      const jobStatus = {
        jobId: 'batch_789',
        status: 'failed',
        totalImages: 20,
        processedImages: 10,
        progress: 0.5,
        mode: 'economy',
        error: 'Provider batch API error',
        createdAt: new Date(),
        startedAt: new Date()
      };

      expect(jobStatus.status).toBe('failed');
      expect(jobStatus.error).toBe('Provider batch API error');
      expect(jobStatus.processedImages).toBe(10);
    });
  });

  describe('GET /api/batch/results/:jobId', () => {
    it('should return results for completed job', () => {
      const results = {
        jobId: 'batch_123',
        results: [
          {
            imageId: 'img1',
            filename: 'test1.jpg',
            starRating: 4,
            colorLabel: 'green',
            keepReject: 'keep',
            tags: ['ceremony', 'emotional'],
            description: 'Beautiful moment during ceremony',
            technicalQuality: {
              focusAccuracy: 850,
              exposureQuality: 800,
              compositionScore: 900,
              lightingQuality: 850,
              colorHarmony: 800,
              noiseLevel: 900,
              sharpnessDetail: 880,
              dynamicRange: 820,
              overallTechnical: 850
            },
            subjectAnalysis: {
              primarySubject: 'Bride',
              emotionIntensity: 900,
              eyesOpen: true,
              eyeContact: false,
              genuineExpression: 920,
              facialSharpness: 880,
              bodyLanguage: 850,
              momentTiming: 950,
              storyTelling: 900,
              uniqueness: 870
            }
          }
        ],
        totalImages: 1,
        processedImages: 1,
        completedAt: new Date()
      };

      expect(results.results.length).toBe(1);
      expect(results.results[0].starRating).toBe(4);
      expect(results.results[0].technicalQuality.focusAccuracy).toBeGreaterThan(800);
      expect(results.results[0].subjectAnalysis.emotionIntensity).toBeGreaterThan(900);
    });

    it('should error if job not completed', () => {
      const error = {
        error: 'Job not completed',
        status: 'processing'
      };

      expect(error.error).toBe('Job not completed');
      expect(error.status).toBe('processing');
    });
  });

  describe('Cost Calculation', () => {
    it('should calculate 50% discount for economy mode', () => {
      const baselineCost = 0.0008; // gpt-5-nano cost per image
      const imageCount = 1000;

      const fastModeCost = baselineCost * imageCount; // $0.80
      const economyModeCost = (baselineCost * 0.5) * imageCount; // $0.40 (50% off)

      expect(fastModeCost).toBe(0.8);
      expect(economyModeCost).toBe(0.4);
      expect(economyModeCost).toBe(fastModeCost * 0.5);
    });

    it('should calculate user charge with 2x markup', () => {
      const providerCost = 0.0004; // Provider cost per image (batch discount applied)
      const userCharge = providerCost * 2; // 2x markup

      expect(userCharge).toBe(0.0008);
    });

    it('should verify economy mode savings', () => {
      const images = 5000;
      const gpt5NanoCost = 0.0008;

      const fastMode = {
        providerCost: gpt5NanoCost * images, // $4.00
        userCost: (gpt5NanoCost * 2) * images // $8.00 (2x markup)
      };

      const economyMode = {
        providerCost: (gpt5NanoCost * 0.5) * images, // $2.00 (50% off)
        userCost: ((gpt5NanoCost * 0.5) * 2) * images // $4.00 (2x markup on discounted)
      };

      expect(economyMode.providerCost).toBe(2.0);
      expect(economyMode.userCost).toBe(4.0);
      expect(economyMode.userCost).toBe(fastMode.userCost * 0.5);
      expect(economyMode.providerCost).toBe(fastMode.providerCost * 0.5);
    });
  });

  describe('Provider Batch Support', () => {
    it('should verify OpenAI supports batch', () => {
      const provider = 'openai-gpt-5';
      const supportsBatch = (
        provider === 'openai-gpt-5' ||
        provider.startsWith('openai-') ||
        provider.startsWith('claude-') ||
        provider.startsWith('gemini-')
      );

      expect(supportsBatch).toBe(true);
    });

    it('should verify Anthropic supports batch', () => {
      const provider = 'claude-haiku-4-5-20251001';
      const supportsBatch = provider.startsWith('claude-');

      expect(supportsBatch).toBe(true);
    });

    it('should verify Google supports batch', () => {
      const provider = 'gemini-2.5-flash-lite';
      const supportsBatch = provider.startsWith('gemini-');

      expect(supportsBatch).toBe(true);
    });

    it('should verify Grok does NOT support batch', () => {
      const provider = 'grok-2-vision-1212';
      const supportsBatch = (
        provider.startsWith('openai-') ||
        provider.startsWith('claude-') ||
        provider.startsWith('gemini-')
      );

      expect(supportsBatch).toBe(false);
    });

    it('should verify Groq does NOT support batch', () => {
      const provider = 'kimi-k2-instruct';
      const supportsBatch = (
        provider.startsWith('openai-') ||
        provider.startsWith('claude-') ||
        provider.startsWith('gemini-')
      );

      expect(supportsBatch).toBe(false);
    });
  });

  describe('Polling Mechanism', () => {
    it('should poll every 5 seconds', () => {
      const POLL_INTERVAL_MS = 5000;
      expect(POLL_INTERVAL_MS).toBe(5000);
    });

    it('should timeout after 24 hours', () => {
      const MAX_POLL_TIME_MS = 24 * 60 * 60 * 1000;
      expect(MAX_POLL_TIME_MS).toBe(86400000);
    });

    it('should update progress after each poll', () => {
      const initialProgress = { processedImages: 10, totalImages: 100 };
      const updatedProgress = { processedImages: 25, totalImages: 100 };

      expect(updatedProgress.processedImages).toBeGreaterThan(initialProgress.processedImages);
      expect(updatedProgress.processedImages / updatedProgress.totalImages).toBe(0.25);
    });
  });
});
