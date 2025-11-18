/**
 * Integration tests for AnthropicAdapter with real API
 *
 * NOTE: These tests require a valid ANTHROPIC_API_KEY environment variable
 * They will be skipped if the API key is not set
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { AnthropicAdapter } from '../../../server/ai/providers/AnthropicAdapter';
import type { ProcessImageRequest } from '../../../server/ai/BaseProviderAdapter';
import fs from 'fs';
import path from 'path';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const SKIP_INTEGRATION_TESTS = !ANTHROPIC_API_KEY;

describe.skipIf(SKIP_INTEGRATION_TESTS)('AnthropicAdapter Integration Tests', () => {
  let adapter: AnthropicAdapter;

  beforeAll(() => {
    if (!ANTHROPIC_API_KEY) {
      console.log('Skipping integration tests - ANTHROPIC_API_KEY not set');
      return;
    }
    adapter = new AnthropicAdapter();
  });

  it('should process a real image and return all 1-1000 rating fields', async () => {
    // Create a simple test image (1x1 red pixel PNG)
    const testImage = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
      'base64'
    );

    const request: ProcessImageRequest = {
      image: {
        data: testImage,
        format: 'png',
        filename: 'test-integration.png'
      },
      systemPrompt: `You are a professional photo curator for wedding photography. Rate images on a 1-1000 scale across multiple dimensions.`,
      userPrompt: `Rate this image for a wedding photoshoot. Provide detailed ratings across all quality dimensions.`
    };

    const result = await adapter.processSingleImage(request);

    // Verify result structure
    expect(result).toBeDefined();
    expect(result.rating).toBeDefined();
    expect(result.cost).toBeDefined();
    expect(result.processingTimeMs).toBeGreaterThan(0);

    // Verify all technicalQuality 1-1000 fields are present
    expect(result.rating.technicalQuality.focusAccuracy).toBeGreaterThanOrEqual(1);
    expect(result.rating.technicalQuality.focusAccuracy).toBeLessThanOrEqual(1000);
    expect(result.rating.technicalQuality.exposureQuality).toBeGreaterThanOrEqual(1);
    expect(result.rating.technicalQuality.exposureQuality).toBeLessThanOrEqual(1000);
    expect(result.rating.technicalQuality.compositionScore).toBeGreaterThanOrEqual(1);
    expect(result.rating.technicalQuality.compositionScore).toBeLessThanOrEqual(1000);
    expect(result.rating.technicalQuality.lightingQuality).toBeGreaterThanOrEqual(1);
    expect(result.rating.technicalQuality.lightingQuality).toBeLessThanOrEqual(1000);
    expect(result.rating.technicalQuality.colorHarmony).toBeGreaterThanOrEqual(1);
    expect(result.rating.technicalQuality.colorHarmony).toBeLessThanOrEqual(1000);
    expect(result.rating.technicalQuality.noiseLevel).toBeGreaterThanOrEqual(1);
    expect(result.rating.technicalQuality.noiseLevel).toBeLessThanOrEqual(1000);
    expect(result.rating.technicalQuality.sharpnessDetail).toBeGreaterThanOrEqual(1);
    expect(result.rating.technicalQuality.sharpnessDetail).toBeLessThanOrEqual(1000);
    expect(result.rating.technicalQuality.dynamicRange).toBeGreaterThanOrEqual(1);
    expect(result.rating.technicalQuality.dynamicRange).toBeLessThanOrEqual(1000);
    expect(result.rating.technicalQuality.overallTechnical).toBeGreaterThanOrEqual(1);
    expect(result.rating.technicalQuality.overallTechnical).toBeLessThanOrEqual(1000);

    // Verify all subjectAnalysis 1-1000 fields are present
    expect(result.rating.subjectAnalysis.emotionIntensity).toBeGreaterThanOrEqual(1);
    expect(result.rating.subjectAnalysis.emotionIntensity).toBeLessThanOrEqual(1000);
    expect(result.rating.subjectAnalysis.genuineExpression).toBeGreaterThanOrEqual(1);
    expect(result.rating.subjectAnalysis.genuineExpression).toBeLessThanOrEqual(1000);
    expect(result.rating.subjectAnalysis.facialSharpness).toBeGreaterThanOrEqual(1);
    expect(result.rating.subjectAnalysis.facialSharpness).toBeLessThanOrEqual(1000);
    expect(result.rating.subjectAnalysis.bodyLanguage).toBeGreaterThanOrEqual(1);
    expect(result.rating.subjectAnalysis.bodyLanguage).toBeLessThanOrEqual(1000);
    expect(result.rating.subjectAnalysis.momentTiming).toBeGreaterThanOrEqual(1);
    expect(result.rating.subjectAnalysis.momentTiming).toBeLessThanOrEqual(1000);
    expect(result.rating.subjectAnalysis.storyTelling).toBeGreaterThanOrEqual(1);
    expect(result.rating.subjectAnalysis.storyTelling).toBeLessThanOrEqual(1000);
    expect(result.rating.subjectAnalysis.uniqueness).toBeGreaterThanOrEqual(1);
    expect(result.rating.subjectAnalysis.uniqueness).toBeLessThanOrEqual(1000);

    // Verify boolean fields
    expect(typeof result.rating.subjectAnalysis.eyesOpen).toBe('boolean');
    expect(typeof result.rating.subjectAnalysis.eyeContact).toBe('boolean');

    // Verify string fields
    expect(typeof result.rating.subjectAnalysis.primarySubject).toBe('string');
    expect(result.rating.subjectAnalysis.primarySubject.length).toBeGreaterThan(0);

    console.log('Integration test result:', {
      starRating: result.rating.starRating,
      processingTimeMs: result.processingTimeMs,
      costUSD: result.cost.totalCostUSD,
      userChargeUSD: result.cost.userChargeUSD,
      technicalQuality: result.rating.technicalQuality,
      subjectAnalysis: result.rating.subjectAnalysis
    });
  }, 30000); // 30 second timeout for API call

  it('should verify actual cost matches estimate', async () => {
    const testImage = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
      'base64'
    );

    const request: ProcessImageRequest = {
      image: {
        data: testImage,
        format: 'png',
        filename: 'test-cost-estimate.png'
      },
      systemPrompt: 'You are a photo curator.',
      userPrompt: 'Rate this image.'
    };

    const estimatedCost = adapter.getCostPerImage();
    const result = await adapter.processSingleImage(request);

    // Actual cost should be within reasonable range of estimate
    // (estimate is 2000 input + 500 output tokens)
    expect(result.cost.totalCostUSD).toBeGreaterThan(0);
    expect(result.cost.totalCostUSD).toBeLessThan(estimatedCost * 3); // Allow 3x variance

    // Verify 2x markup is applied
    expect(result.cost.userChargeUSD).toBeCloseTo(result.cost.totalCostUSD * 2);

    console.log('Cost comparison:', {
      estimated: estimatedCost,
      actual: result.cost.totalCostUSD,
      userCharge: result.cost.userChargeUSD,
      inputTokens: result.cost.inputTokens,
      outputTokens: result.cost.outputTokens
    });
  }, 30000);

  it('should verify response time is reasonable', async () => {
    const testImage = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
      'base64'
    );

    const request: ProcessImageRequest = {
      image: {
        data: testImage,
        format: 'png',
        filename: 'test-response-time.png'
      },
      systemPrompt: 'You are a photo curator.',
      userPrompt: 'Rate this image.'
    };

    const startTime = Date.now();
    const result = await adapter.processSingleImage(request);
    const elapsed = Date.now() - startTime;

    // Response should be within 30 seconds for a single image
    expect(elapsed).toBeLessThan(30000);
    expect(result.processingTimeMs).toBeLessThan(30000);

    console.log('Response time test:', {
      elapsedMs: elapsed,
      reportedMs: result.processingTimeMs
    });
  }, 30000);

  it('should handle different image formats (JPEG)', async () => {
    // Create a minimal JPEG (1x1 pixel)
    const testImage = Buffer.from(
      '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=',
      'base64'
    );

    const request: ProcessImageRequest = {
      image: {
        data: testImage,
        format: 'jpeg',
        filename: 'test-jpeg.jpg'
      },
      systemPrompt: 'You are a photo curator.',
      userPrompt: 'Rate this image.'
    };

    const result = await adapter.processSingleImage(request);

    expect(result.rating).toBeDefined();
    expect(result.rating.technicalQuality.focusAccuracy).toBeGreaterThanOrEqual(1);

    console.log('JPEG format test passed');
  }, 30000);

  it('should process multiple images with consistent structure', async () => {
    const testImage = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
      'base64'
    );

    const requests: ProcessImageRequest[] = [
      {
        image: { data: testImage, format: 'png', filename: 'test-1.png' },
        systemPrompt: 'You are a photo curator.',
        userPrompt: 'Rate this image.'
      },
      {
        image: { data: testImage, format: 'png', filename: 'test-2.png' },
        systemPrompt: 'You are a photo curator.',
        userPrompt: 'Rate this image.'
      }
    ];

    const results = await Promise.all(
      requests.map(req => adapter.processSingleImage(req))
    );

    expect(results).toHaveLength(2);

    // Verify both have consistent structure
    for (const result of results) {
      expect(result.rating.technicalQuality.focusAccuracy).toBeGreaterThanOrEqual(1);
      expect(result.rating.subjectAnalysis.emotionIntensity).toBeGreaterThanOrEqual(1);
      expect(result.cost.userChargeUSD).toBeGreaterThan(0);
    }

    console.log('Multiple images test passed - processed', results.length, 'images');
  }, 60000); // 60 second timeout for multiple API calls

  it('should verify model name is correct (claude-haiku-4-5-20251001)', () => {
    expect((adapter as any).modelName).toBe('claude-haiku-4-5-20251001');
  });

  it('should verify pricing constants are correct', () => {
    expect((adapter as any).INPUT_COST_PER_1M).toBe(1.00);
    expect((adapter as any).OUTPUT_COST_PER_1M).toBe(5.00);
    expect((adapter as any).BATCH_INPUT_COST_PER_1M).toBe(0.50);
    expect((adapter as any).BATCH_OUTPUT_COST_PER_1M).toBe(2.50);
  });
});

// Print helpful message if tests are skipped
if (SKIP_INTEGRATION_TESTS) {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║  Integration tests skipped - ANTHROPIC_API_KEY not set        ║
║                                                                ║
║  To run integration tests:                                     ║
║  export ANTHROPIC_API_KEY=your-api-key                         ║
║  npm test -- tests/integration/providers/anthropic.integration║
╚════════════════════════════════════════════════════════════════╝
  `);
}
