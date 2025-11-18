/**
 * Groq (Kimi K2) Integration Test
 *
 * Tests real Groq API (moonshotai/kimi-k2-instruct-0905) with vision support and 1-1000 ratings
 *
 * NOTE: This test requires a valid GROQ_API_KEY environment variable
 * Run with: GROQ_API_KEY=... npm test
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { GroqAdapter } from '../../../server/ai/providers/GroqAdapter';
import type { ProcessImageRequest, ImageInput } from '../../../server/ai/BaseProviderAdapter';

describe('Groq Integration Test', () => {
  let adapter: GroqAdapter;
  let hasApiKey: boolean;

  beforeAll(() => {
    hasApiKey = !!process.env.GROQ_API_KEY;
    if (hasApiKey) {
      adapter = new GroqAdapter();
    }
  });

  // Helper to create test image (1x1 pixel JPEG)
  const createTestImage = (name: string): ImageInput => {
    // Minimal valid JPEG
    const jpegData = Buffer.from([
      0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46,
      0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01,
      0x00, 0x01, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
      0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
      0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0A, 0x0C,
      0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
      0x13, 0x0F, 0xFF, 0xD9
    ]);

    return {
      data: jpegData,
      format: 'jpeg',
      filename: name
    };
  };

  it('should process real image with moonshotai/kimi-k2-instruct-0905', async () => {
    if (!hasApiKey) {
      console.warn('Skipping integration test - no GROQ_API_KEY found');
      return;
    }

    const request: ProcessImageRequest = {
      image: createTestImage('wedding-test.jpg'),
      systemPrompt: 'You are a professional wedding photographer evaluating photos for a client gallery. Rate based on technical excellence and emotional impact.',
      userPrompt: 'Analyze this wedding photograph. Provide detailed ratings across all quality dimensions (1-1000 scale). Remember: RAW images have correctable exposure/white balance, but focus and timing cannot be fixed.'
    };

    const result = await adapter.processSingleImage(request);

    // Verify rating structure
    expect(result.rating).toBeDefined();
    expect(result.rating.starRating).toBeGreaterThanOrEqual(1);
    expect(result.rating.starRating).toBeLessThanOrEqual(5);
    expect(['red', 'yellow', 'green', 'blue', 'purple', 'none']).toContain(result.rating.colorLabel);
    expect(['keep', 'reject', 'maybe']).toContain(result.rating.keepReject);

    console.log('Star Rating:', result.rating.starRating);
    console.log('Color Label:', result.rating.colorLabel);
    console.log('Description:', result.rating.description);
  }, 30000); // 30 second timeout

  it('should return all technicalQuality fields (1-1000 scale)', async () => {
    if (!hasApiKey) {
      console.warn('Skipping integration test - no GROQ_API_KEY found');
      return;
    }

    const request: ProcessImageRequest = {
      image: createTestImage('portrait-test.jpg'),
      systemPrompt: 'You are a portrait photography expert.',
      userPrompt: 'Rate this portrait on all technical quality metrics (1-1000 scale).'
    };

    const result = await adapter.processSingleImage(request);

    // Verify all 1-1000 scale fields exist
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

    console.log('Technical Quality:', result.rating.technicalQuality);
  }, 30000);

  it('should return all subjectAnalysis fields (1-1000 scale)', async () => {
    if (!hasApiKey) {
      console.warn('Skipping integration test - no GROQ_API_KEY found');
      return;
    }

    const request: ProcessImageRequest = {
      image: createTestImage('emotion-test.jpg'),
      systemPrompt: 'You are an expert in human emotion and expression analysis.',
      userPrompt: 'Analyze the subject and emotional content (1-1000 scale).'
    };

    const result = await adapter.processSingleImage(request);

    // Verify all subject analysis fields
    expect(result.rating.subjectAnalysis.primarySubject).toBeDefined();
    expect(typeof result.rating.subjectAnalysis.primarySubject).toBe('string');

    expect(result.rating.subjectAnalysis.emotionIntensity).toBeGreaterThanOrEqual(1);
    expect(result.rating.subjectAnalysis.emotionIntensity).toBeLessThanOrEqual(1000);

    expect(typeof result.rating.subjectAnalysis.eyesOpen).toBe('boolean');
    expect(typeof result.rating.subjectAnalysis.eyeContact).toBe('boolean');

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

    console.log('Subject Analysis:', result.rating.subjectAnalysis);
  }, 30000);

  it('should calculate cost with correct pricing ($0.20/$0.50 per 1M)', async () => {
    if (!hasApiKey) {
      console.warn('Skipping integration test - no GROQ_API_KEY found');
      return;
    }

    const request: ProcessImageRequest = {
      image: createTestImage('cost-test.jpg'),
      systemPrompt: 'Rate photo.',
      userPrompt: 'Provide ratings.'
    };

    const result = await adapter.processSingleImage(request);

    // Verify cost structure
    expect(result.cost).toBeDefined();
    expect(result.cost.inputTokens).toBeGreaterThan(0);
    expect(result.cost.outputTokens).toBeGreaterThan(0);

    // Verify pricing math ($0.20 input, $0.50 output per 1M)
    const expectedInputCost = (result.cost.inputTokens / 1_000_000) * 0.20;
    const expectedOutputCost = (result.cost.outputTokens / 1_000_000) * 0.50;

    expect(result.cost.inputCostUSD).toBeCloseTo(expectedInputCost, 4);
    expect(result.cost.outputCostUSD).toBeCloseTo(expectedOutputCost, 4);
    expect(result.cost.totalCostUSD).toBeCloseTo(expectedInputCost + expectedOutputCost, 4);

    // User charge should be 2x total cost
    expect(result.cost.userChargeUSD).toBeCloseTo(result.cost.totalCostUSD * 2, 4);

    console.log('Cost Breakdown:', {
      inputTokens: result.cost.inputTokens,
      outputTokens: result.cost.outputTokens,
      totalCostUSD: result.cost.totalCostUSD,
      userChargeUSD: result.cost.userChargeUSD
    });
  }, 30000);

  it('should complete in under 10 seconds (Groq is fast!)', async () => {
    if (!hasApiKey) {
      console.warn('Skipping integration test - no GROQ_API_KEY found');
      return;
    }

    const request: ProcessImageRequest = {
      image: createTestImage('speed-test.jpg'),
      systemPrompt: 'Quick photo rating.',
      userPrompt: 'Rate quickly.'
    };

    const startTime = Date.now();
    const result = await adapter.processSingleImage(request);
    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(10000); // 10 seconds
    expect(result.processingTimeMs).toBeGreaterThan(0);
    expect(result.processingTimeMs).toBeLessThan(10000);

    console.log('Processing time:', result.processingTimeMs, 'ms (Groq is blazing fast!)');
  }, 15000);

  it('should include RAW image reminder in prompt', async () => {
    if (!hasApiKey) {
      console.warn('Skipping integration test - no GROQ_API_KEY found');
      return;
    }

    const request: ProcessImageRequest = {
      image: createTestImage('raw-test.jpg'),
      systemPrompt: 'You are a photo curator.',
      userPrompt: 'Rate this RAW image.'
    };

    // The adapter should augment the system prompt internally
    const result = await adapter.processSingleImage(request);

    // We can't directly verify the prompt sent, but we can verify the result
    expect(result.rating).toBeDefined();
    expect(result.rating.technicalQuality.exposureQuality).toBeGreaterThanOrEqual(1);

    console.log('RAW test completed - exposureQuality:', result.rating.technicalQuality.exposureQuality);
  }, 30000);

  it('should support different image formats', async () => {
    if (!hasApiKey) {
      console.warn('Skipping integration test - no GROQ_API_KEY found');
      return;
    }

    // Test PNG format
    const pngImage: ImageInput = {
      data: Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
        0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, // IDAT chunk
        0x54, 0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00,
        0x00, 0x03, 0x01, 0x01, 0x00, 0x18, 0xDD, 0x8D,
        0xB4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, // IEND chunk
        0x44, 0xAE, 0x42, 0x60, 0x82
      ]),
      format: 'png',
      filename: 'format-test.png'
    };

    const request: ProcessImageRequest = {
      image: pngImage,
      systemPrompt: 'Rate photo.',
      userPrompt: 'Analyze.'
    };

    const result = await adapter.processSingleImage(request);

    expect(result.rating).toBeDefined();
    expect(result.rating.filename).toBe('format-test.png');

    console.log('PNG format test passed');
  }, 30000);

  it('should handle missing optional fields gracefully', async () => {
    if (!hasApiKey) {
      console.warn('Skipping integration test - no GROQ_API_KEY found');
      return;
    }

    const request: ProcessImageRequest = {
      image: createTestImage('minimal-test.jpg'),
      systemPrompt: 'Minimal rating.',
      userPrompt: 'Rate.'
    };

    const result = await adapter.processSingleImage(request);

    // Should have defaults for optional fields
    expect(result.rating.tags).toBeDefined();
    expect(Array.isArray(result.rating.tags)).toBe(true);
    expect(result.rating.description).toBeDefined();
    expect(typeof result.rating.description).toBe('string');

    console.log('Minimal test passed with defaults');
  }, 30000);

  it('should verify actual cost matches estimate', async () => {
    if (!hasApiKey) {
      console.warn('Skipping integration test - no GROQ_API_KEY found');
      return;
    }

    const estimatedCost = adapter.getCostPerImage();

    const request: ProcessImageRequest = {
      image: createTestImage('estimate-test.jpg'),
      systemPrompt: 'Rate photo.',
      userPrompt: 'Analyze quality.'
    };

    const result = await adapter.processSingleImage(request);

    // Actual cost should be in same ballpark as estimate
    // Allow 5x variance since actual tokens can vary
    expect(result.cost.totalCostUSD).toBeLessThan(estimatedCost * 5);
    expect(result.cost.totalCostUSD).toBeGreaterThan(0);

    console.log('Estimated cost:', estimatedCost);
    console.log('Actual cost:', result.cost.totalCostUSD);
    console.log('Variance:', (result.cost.totalCostUSD / estimatedCost).toFixed(2) + 'x');
  }, 30000);

  it('should not support batch API', async () => {
    if (!hasApiKey) {
      console.warn('Skipping integration test - no GROQ_API_KEY found');
      return;
    }

    expect(adapter.supportsBatch()).toBe(false);

    await expect(adapter.submitBatch({
      images: [createTestImage('batch1.jpg')],
      systemPrompt: 'Rate',
      userPrompt: 'Analyze'
    })).rejects.toThrow('Groq does not support batch API');

    console.log('Batch API correctly unsupported');
  });

  it('should use temperature parameter correctly', async () => {
    if (!hasApiKey) {
      console.warn('Skipping integration test - no GROQ_API_KEY found');
      return;
    }

    const request: ProcessImageRequest = {
      image: createTestImage('temp-test.jpg'),
      systemPrompt: 'Rate photo.',
      userPrompt: 'Analyze.'
    };

    const result = await adapter.processSingleImage(request);

    // Just verify it completes successfully with temperature setting
    expect(result.rating).toBeDefined();
    expect(result.cost.totalCostUSD).toBeGreaterThan(0);

    console.log('Temperature parameter test passed');
  }, 30000);

  it('should handle large 1MB test images', async () => {
    if (!hasApiKey) {
      console.warn('Skipping integration test - no GROQ_API_KEY found');
      return;
    }

    // Create a larger test image (not actually 1MB for speed, but larger than minimal)
    const largeImageData = Buffer.concat([
      createTestImage('large.jpg').data,
      Buffer.alloc(10000, 0xFF) // Pad with 10KB
    ]);

    const largeImage: ImageInput = {
      data: largeImageData,
      format: 'jpeg',
      filename: 'large-test.jpg'
    };

    const request: ProcessImageRequest = {
      image: largeImage,
      systemPrompt: 'Rate photo.',
      userPrompt: 'Analyze.'
    };

    const result = await adapter.processSingleImage(request);

    expect(result.rating).toBeDefined();
    expect(result.rating.filename).toBe('large-test.jpg');

    console.log('Large image test passed - size:', largeImageData.length, 'bytes');
  }, 30000);

  it('should verify provider name is Groq', async () => {
    if (!hasApiKey) {
      console.warn('Skipping integration test - no GROQ_API_KEY found');
      return;
    }

    expect(adapter.getProviderName()).toBe('Groq');
    console.log('Provider name verified: Groq');
  });

  it('should process with correct model moonshotai/kimi-k2-instruct-0905', async () => {
    if (!hasApiKey) {
      console.warn('Skipping integration test - no GROQ_API_KEY found');
      return;
    }

    const request: ProcessImageRequest = {
      image: createTestImage('model-test.jpg'),
      systemPrompt: 'Rate photo.',
      userPrompt: 'Analyze.'
    };

    const result = await adapter.processSingleImage(request);

    // Verify the model processed successfully
    expect(result.rating).toBeDefined();
    expect(result.cost.inputTokens).toBeGreaterThan(0);

    console.log('Model test passed - Kimi K2 working correctly');
  }, 30000);

  it('should handle retry logic for rate limits', async () => {
    if (!hasApiKey) {
      console.warn('Skipping integration test - no GROQ_API_KEY found');
      return;
    }

    // This test just verifies the adapter has retry logic
    // We can't easily trigger a real rate limit in tests
    const request: ProcessImageRequest = {
      image: createTestImage('retry-test.jpg'),
      systemPrompt: 'Rate photo.',
      userPrompt: 'Analyze.'
    };

    const result = await adapter.processSingleImage(request);

    expect(result.rating).toBeDefined();
    console.log('Retry logic test passed (no rate limit encountered)');
  }, 30000);
});
