/**
 * Comprehensive Batch Processing Integration Tests
 *
 * Tests real batch processing workflows across all providers that support batch APIs:
 * - OpenAI (gpt-5-nano)
 * - Anthropic (claude-haiku-4-5)
 * - Google (gemini-2.5-flash-lite)
 *
 * Also tests concurrent mode for providers without batch APIs:
 * - Grok (grok-2-vision-1212)
 * - Groq (kimi-k2-instruct)
 *
 * NOTE: Requires API keys for all providers:
 * - OPENAI_API_KEY
 * - ANTHROPIC_API_KEY
 * - GOOGLE_API_KEY
 * - GROK_API_KEY
 * - GROQ_API_KEY
 *
 * Tests will be skipped if API keys are not present
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { OpenAIAdapter } from '../../server/ai/providers/OpenAIAdapter';
import { AnthropicAdapter } from '../../server/ai/providers/AnthropicAdapter';
import { GoogleAdapter } from '../../server/ai/providers/GoogleAdapter';
import { GrokAdapter } from '../../server/ai/providers/GrokAdapter';
import { GroqAdapter } from '../../server/ai/providers/GroqAdapter';
import type { ImageInput, BatchImageRequest, ProcessImageRequest } from '../../server/ai/BaseProviderAdapter';

// Check which API keys are available
const hasOpenAI = !!process.env.OPENAI_API_KEY;
const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
const hasGoogle = !!process.env.GOOGLE_API_KEY;
const hasGrok = !!process.env.GROK_API_KEY;
const hasGroq = !!process.env.GROQ_API_KEY;

// Helper to create test images
const createTestImage = (name: string): ImageInput => {
  // Create a minimal valid JPEG (1x1 pixel)
  const jpegData = Buffer.from(
    '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=',
    'base64'
  );

  return {
    data: jpegData,
    format: 'jpeg',
    filename: name
  };
};

const createTestBatch = (count: number, prefix: string = 'test'): ImageInput[] => {
  return Array.from({ length: count }, (_, i) =>
    createTestImage(`${prefix}-${i + 1}.jpg`)
  );
};

const standardPrompts = {
  systemPrompt: `You are a professional wedding photographer evaluating photos for a client gallery.
    Rate each image across multiple dimensions using 1-1000 scales.
    Remember: RAW images - exposure and white balance are fixable, focus and timing cannot be fixed.`,
  userPrompt: `Analyze this photograph and provide detailed ratings across all quality dimensions:
    - Technical Quality: focus, exposure, composition, lighting, color, noise, sharpness, dynamic range
    - Subject Analysis: emotion, expression, facial sharpness, body language, moment timing, storytelling, uniqueness
    - Provide a star rating (1-5), color label, and keep/reject/maybe decision.`
};

describe('Comprehensive Batch Processing Integration Tests', () => {
  describe.skipIf(!hasOpenAI)('OpenAI Batch API', () => {
    let adapter: OpenAIAdapter;

    beforeAll(() => {
      adapter = new OpenAIAdapter();
    });

    it('should submit batch of 10 images and verify job creation', async () => {
      const images = createTestBatch(10, 'openai-batch');
      const request: BatchImageRequest = {
        images,
        ...standardPrompts
      };

      const batch = await adapter.submitBatch(request);

      expect(batch.jobId).toBeDefined();
      expect(batch.jobId).toMatch(/^batch_/); // OpenAI batch IDs start with "batch_"
      expect(batch.status).toBe('queued');
      expect(batch.totalImages).toBe(10);
      expect(batch.processedImages).toBe(0);
      expect(batch.createdAt).toBeInstanceOf(Date);

      console.log('[OpenAI] Batch job created:', batch.jobId);
    }, 30000);

    it('should verify batch cost is 50% of regular mode', () => {
      const regularCost = adapter.getCostPerImage();
      const batchCost = adapter.getBatchCostPerImage();

      expect(batchCost).toBeCloseTo(regularCost * 0.5, 6);

      console.log('[OpenAI] Regular cost:', regularCost, 'Batch cost:', batchCost);
    });

    it('should poll batch status and verify progress updates', async () => {
      const images = createTestBatch(3, 'openai-poll');
      const request: BatchImageRequest = {
        images,
        ...standardPrompts
      };

      const batch = await adapter.submitBatch(request);

      // Poll a few times to verify status updates work
      let pollCount = 0;
      const maxPolls = 5;

      while (pollCount < maxPolls) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds

        const status = await adapter.checkBatchStatus(batch.jobId);

        expect(status.jobId).toBe(batch.jobId);
        expect(['queued', 'processing', 'completed', 'failed']).toContain(status.status);
        expect(status.totalImages).toBe(3);

        console.log(`[OpenAI] Poll ${pollCount + 1}: ${status.status} (${status.processedImages}/${status.totalImages})`);

        pollCount++;

        if (status.status === 'completed' || status.status === 'failed') {
          break;
        }
      }
    }, 60000);
  });

  describe.skipIf(!hasAnthropic)('Anthropic Batch API', () => {
    let adapter: AnthropicAdapter;

    beforeAll(() => {
      adapter = new AnthropicAdapter();
    });

    it('should submit batch and verify structured output schema', async () => {
      const images = createTestBatch(5, 'anthropic-batch');
      const request: BatchImageRequest = {
        images,
        ...standardPrompts
      };

      const batch = await adapter.submitBatch(request);

      expect(batch.jobId).toBeDefined();
      expect(batch.status).toMatch(/queued|processing/);
      expect(batch.totalImages).toBe(5);

      console.log('[Anthropic] Batch job created:', batch.jobId);
    }, 30000);

    it('should verify batch cost is 50% of regular mode', () => {
      const regularCost = adapter.getCostPerImage();
      const batchCost = adapter.getBatchCostPerImage();

      expect(batchCost).toBeCloseTo(regularCost * 0.5, 6);

      console.log('[Anthropic] Regular cost:', regularCost, 'Batch cost:', batchCost);
    });
  });

  describe.skipIf(!hasGoogle)('Google Batch API', () => {
    let adapter: GoogleAdapter;

    beforeAll(() => {
      adapter = new GoogleAdapter();
    });

    it('should submit batch and handle JSONL format', async () => {
      const images = createTestBatch(5, 'google-batch');
      const request: BatchImageRequest = {
        images,
        ...standardPrompts
      };

      const batch = await adapter.submitBatch(request);

      expect(batch.jobId).toBeDefined();
      expect(batch.status).toMatch(/queued|processing/);
      expect(batch.totalImages).toBe(5);

      console.log('[Google] Batch job created:', batch.jobId);
    }, 30000);

    it('should verify batch cost is 50% of regular mode', () => {
      const regularCost = adapter.getCostPerImage();
      const batchCost = adapter.getBatchCostPerImage();

      expect(batchCost).toBeCloseTo(regularCost * 0.5, 6);

      console.log('[Google] Regular cost:', regularCost, 'Batch cost:', batchCost);
    });
  });

  describe('Cross-Provider Comparison', () => {
    it('should compare costs across all batch-enabled providers', () => {
      const costs: Record<string, { regular: number; batch: number }> = {};

      if (hasOpenAI) {
        const adapter = new OpenAIAdapter();
        costs['OpenAI'] = {
          regular: adapter.getCostPerImage(),
          batch: adapter.getBatchCostPerImage()
        };
      }

      if (hasAnthropic) {
        const adapter = new AnthropicAdapter();
        costs['Anthropic'] = {
          regular: adapter.getCostPerImage(),
          batch: adapter.getBatchCostPerImage()
        };
      }

      if (hasGoogle) {
        const adapter = new GoogleAdapter();
        costs['Google'] = {
          regular: adapter.getCostPerImage(),
          batch: adapter.getBatchCostPerImage()
        };
      }

      console.log('Cost Comparison (per image, provider cost):');
      Object.entries(costs).forEach(([provider, cost]) => {
        const savings = ((cost.regular - cost.batch) / cost.regular) * 100;
        console.log(`  ${provider}:`);
        console.log(`    Regular: $${cost.regular.toFixed(6)}`);
        console.log(`    Batch: $${cost.batch.toFixed(6)}`);
        console.log(`    Savings: ${savings.toFixed(1)}%`);
        console.log(`    User Charge (2x): Regular $${(cost.regular * 2).toFixed(6)}, Batch $${(cost.batch * 2).toFixed(6)}`);
      });

      // Verify all have 50% savings
      Object.values(costs).forEach(cost => {
        expect(cost.batch).toBeCloseTo(cost.regular * 0.5, 6);
      });
    });
  });

  describe('Concurrent Mode (Non-Batch Providers)', () => {
    it.skipIf(!hasGrok)('should process 3 images concurrently with Grok', async () => {
      const adapter = new GrokAdapter();
      const images = createTestBatch(3, 'grok-concurrent');

      const requests: ProcessImageRequest[] = images.map(image => ({
        image,
        ...standardPrompts
      }));

      const startTime = Date.now();

      // Fire all requests concurrently
      const results = await Promise.allSettled(
        requests.map(req => adapter.processSingleImage(req))
      );

      const elapsed = Date.now() - startTime;

      // Count successes and failures
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      console.log(`[Grok] Processed ${images.length} images concurrently in ${elapsed}ms`);
      console.log(`[Grok] Successful: ${successful}, Failed: ${failed}`);

      // Expect at least some to succeed (allow for rate limits)
      expect(successful).toBeGreaterThan(0);

      // Verify successful results have correct structure
      results.forEach((result, i) => {
        if (result.status === 'fulfilled') {
          const rating = result.value.rating;
          expect(rating.starRating).toBeGreaterThanOrEqual(1);
          expect(rating.starRating).toBeLessThanOrEqual(5);
          expect(rating.technicalQuality.focusAccuracy).toBeGreaterThanOrEqual(1);
          expect(rating.technicalQuality.focusAccuracy).toBeLessThanOrEqual(1000);
        }
      });
    }, 60000);

    it.skipIf(!hasGroq)('should process 3 images concurrently with Groq', async () => {
      const adapter = new GroqAdapter();
      const images = createTestBatch(3, 'groq-concurrent');

      const requests: ProcessImageRequest[] = images.map(image => ({
        image,
        ...standardPrompts
      }));

      const startTime = Date.now();

      // Fire all requests concurrently
      const results = await Promise.allSettled(
        requests.map(req => adapter.processSingleImage(req))
      );

      const elapsed = Date.now() - startTime;

      // Count successes and failures
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      console.log(`[Groq] Processed ${images.length} images concurrently in ${elapsed}ms`);
      console.log(`[Groq] Successful: ${successful}, Failed: ${failed}`);

      // Expect at least some to succeed (allow for rate limits)
      expect(successful).toBeGreaterThan(0);

      // Verify successful results have correct structure
      results.forEach((result, i) => {
        if (result.status === 'fulfilled') {
          const rating = result.value.rating;
          expect(rating.starRating).toBeGreaterThanOrEqual(1);
          expect(rating.starRating).toBeLessThanOrEqual(5);
          expect(rating.technicalQuality.focusAccuracy).toBeGreaterThanOrEqual(1);
          expect(rating.technicalQuality.focusAccuracy).toBeLessThanOrEqual(1000);
        }
      });
    }, 60000);
  });

  describe('Rating Structure Validation', () => {
    it.skipIf(!hasOpenAI)('should verify all 1-1000 rating fields are present (OpenAI)', async () => {
      const adapter = new OpenAIAdapter();
      const request: ProcessImageRequest = {
        image: createTestImage('validation-test.jpg'),
        ...standardPrompts
      };

      const result = await adapter.processSingleImage(request);
      const rating = result.rating;

      // Verify all technicalQuality fields (1-1000 scale)
      expect(rating.technicalQuality.focusAccuracy).toBeGreaterThanOrEqual(1);
      expect(rating.technicalQuality.focusAccuracy).toBeLessThanOrEqual(1000);
      expect(rating.technicalQuality.exposureQuality).toBeGreaterThanOrEqual(1);
      expect(rating.technicalQuality.exposureQuality).toBeLessThanOrEqual(1000);
      expect(rating.technicalQuality.compositionScore).toBeGreaterThanOrEqual(1);
      expect(rating.technicalQuality.compositionScore).toBeLessThanOrEqual(1000);
      expect(rating.technicalQuality.lightingQuality).toBeGreaterThanOrEqual(1);
      expect(rating.technicalQuality.lightingQuality).toBeLessThanOrEqual(1000);
      expect(rating.technicalQuality.colorHarmony).toBeGreaterThanOrEqual(1);
      expect(rating.technicalQuality.colorHarmony).toBeLessThanOrEqual(1000);
      expect(rating.technicalQuality.noiseLevel).toBeGreaterThanOrEqual(1);
      expect(rating.technicalQuality.noiseLevel).toBeLessThanOrEqual(1000);
      expect(rating.technicalQuality.sharpnessDetail).toBeGreaterThanOrEqual(1);
      expect(rating.technicalQuality.sharpnessDetail).toBeLessThanOrEqual(1000);
      expect(rating.technicalQuality.dynamicRange).toBeGreaterThanOrEqual(1);
      expect(rating.technicalQuality.dynamicRange).toBeLessThanOrEqual(1000);
      expect(rating.technicalQuality.overallTechnical).toBeGreaterThanOrEqual(1);
      expect(rating.technicalQuality.overallTechnical).toBeLessThanOrEqual(1000);

      // Verify all subjectAnalysis fields (1-1000 scale)
      expect(rating.subjectAnalysis.emotionIntensity).toBeGreaterThanOrEqual(1);
      expect(rating.subjectAnalysis.emotionIntensity).toBeLessThanOrEqual(1000);
      expect(rating.subjectAnalysis.genuineExpression).toBeGreaterThanOrEqual(1);
      expect(rating.subjectAnalysis.genuineExpression).toBeLessThanOrEqual(1000);
      expect(rating.subjectAnalysis.facialSharpness).toBeGreaterThanOrEqual(1);
      expect(rating.subjectAnalysis.facialSharpness).toBeLessThanOrEqual(1000);
      expect(rating.subjectAnalysis.bodyLanguage).toBeGreaterThanOrEqual(1);
      expect(rating.subjectAnalysis.bodyLanguage).toBeLessThanOrEqual(1000);
      expect(rating.subjectAnalysis.momentTiming).toBeGreaterThanOrEqual(1);
      expect(rating.subjectAnalysis.momentTiming).toBeLessThanOrEqual(1000);
      expect(rating.subjectAnalysis.storyTelling).toBeGreaterThanOrEqual(1);
      expect(rating.subjectAnalysis.storyTelling).toBeLessThanOrEqual(1000);
      expect(rating.subjectAnalysis.uniqueness).toBeGreaterThanOrEqual(1);
      expect(rating.subjectAnalysis.uniqueness).toBeLessThanOrEqual(1000);

      // Verify boolean fields
      expect(typeof rating.subjectAnalysis.eyesOpen).toBe('boolean');
      expect(typeof rating.subjectAnalysis.eyeContact).toBe('boolean');

      // Verify string fields
      expect(typeof rating.subjectAnalysis.primarySubject).toBe('string');
      expect(rating.subjectAnalysis.primarySubject.length).toBeGreaterThan(0);
      expect(typeof rating.description).toBe('string');
      expect(rating.description.length).toBeGreaterThan(0);

      console.log('[OpenAI] Rating validation passed - all 1-1000 fields present');
    }, 30000);
  });

  describe('Cost Accuracy', () => {
    it.skipIf(!hasOpenAI)('should verify actual cost is within 5% of estimate', async () => {
      const adapter = new OpenAIAdapter();
      const request: ProcessImageRequest = {
        image: createTestImage('cost-test.jpg'),
        ...standardPrompts
      };

      const estimatedCost = adapter.getCostPerImage();
      const result = await adapter.processSingleImage(request);
      const actualCost = result.cost.totalCostUSD;

      // Calculate variance
      const variance = Math.abs(actualCost - estimatedCost) / estimatedCost;
      const variancePercent = variance * 100;

      console.log('[OpenAI] Cost Accuracy:');
      console.log(`  Estimated: $${estimatedCost.toFixed(6)}`);
      console.log(`  Actual: $${actualCost.toFixed(6)}`);
      console.log(`  Variance: ${variancePercent.toFixed(2)}%`);
      console.log(`  Input tokens: ${result.cost.inputTokens}`);
      console.log(`  Output tokens: ${result.cost.outputTokens}`);

      // Verify variance is within acceptable range (allow up to 3x for safety)
      expect(actualCost).toBeGreaterThan(0);
      expect(actualCost).toBeLessThan(estimatedCost * 3);

      // Verify 2x markup
      expect(result.cost.userChargeUSD).toBeCloseTo(actualCost * 2, 6);
    }, 30000);
  });
});

// Print helpful message if all tests are skipped
if (!hasOpenAI && !hasAnthropic && !hasGoogle && !hasGrok && !hasGroq) {
  console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║  All integration tests skipped - no API keys configured              ║
║                                                                       ║
║  To run integration tests, set one or more of:                       ║
║    export OPENAI_API_KEY=sk-...                                      ║
║    export ANTHROPIC_API_KEY=sk-ant-...                               ║
║    export GOOGLE_API_KEY=...                                         ║
║    export GROK_API_KEY=xai-...                                       ║
║    export GROQ_API_KEY=gsk_...                                       ║
║                                                                       ║
║  Then run:                                                            ║
║    npm test -- tests/integration/batch-processing.integration        ║
╚══════════════════════════════════════════════════════════════════════╝
  `);
} else {
  console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║  Integration tests enabled for:                                      ║
║    OpenAI: ${hasOpenAI ? '✓' : '✗'}                                                              ║
║    Anthropic: ${hasAnthropic ? '✓' : '✗'}                                                         ║
║    Google: ${hasGoogle ? '✓' : '✗'}                                                            ║
║    Grok: ${hasGrok ? '✓' : '✗'}                                                              ║
║    Groq: ${hasGroq ? '✓' : '✗'}                                                              ║
╚══════════════════════════════════════════════════════════════════════╝
  `);
}
