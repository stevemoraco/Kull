import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BatchProcessor } from '../../server/ai/BatchProcessor';
import type { ImageInput, ProviderAdapter } from '../../server/ai/BatchProcessor';

/**
 * PERFORMANCE TEST: Large Batch Processing (10,000 images)
 *
 * Requirements:
 * - Test 10,000-image batch in Fast mode (concurrent processing)
 * - Verify 30k/min rate limit handling (should throttle gracefully, not crash)
 * - Ensure completion time is reasonable (< 5 minutes for mock provider)
 * - Monitor memory usage (backend should stay <2GB, never leak)
 * - Verify all images are processed (100% success rate with retries)
 */

// Mock WebSocket service
const mockBroadcastToUser = vi.fn();
const mockWsService = {
  broadcastToUser: mockBroadcastToUser,
};

vi.mock('../../server/websocket', () => ({
  getGlobalWsService: vi.fn(() => mockWsService),
}));

describe('Performance Test: Large Batch Processing', () => {
  let processor: BatchProcessor;
  let mockProvider: ProviderAdapter;
  let memorySnapshots: number[] = [];

  beforeEach(() => {
    processor = new BatchProcessor({
      maxRetryTime: 21600000, // 6 hours (as per production)
      initialBackoff: 100,
      maxBackoff: 60000, // 60 seconds max
      rateLimitBackoff: 1000, // 1 second for rate limits
      broadcastProgress: true,
    });

    // Mock provider with realistic delays and occasional failures
    let callCount = 0;
    mockProvider = {
      processSingleImage: vi.fn(async (input) => {
        callCount++;

        // Simulate realistic processing time (50-200ms)
        const delay = Math.floor(Math.random() * 150) + 50;
        await new Promise(resolve => setTimeout(resolve, delay));

        // Simulate 2% failure rate (should be retried)
        if (Math.random() < 0.02) {
          const error: any = new Error('Simulated provider error');
          error.statusCode = 500;
          throw error;
        }

        // Simulate rate limiting at 30k/min (500/sec)
        // If we're processing too fast, throw rate limit error
        if (callCount % 500 === 0) {
          const error: any = new Error('Rate limit exceeded');
          error.statusCode = 429;
          throw error;
        }

        return {
          imageId: input.image.id,
          filename: input.image.filename || input.image.id,
          starRating: Math.floor(Math.random() * 5) + 1 as 1 | 2 | 3 | 4 | 5,
          colorLabel: ['red', 'yellow', 'green', 'blue', 'purple', 'none'][Math.floor(Math.random() * 6)] as any,
          keepReject: ['keep', 'reject', 'maybe'][Math.floor(Math.random() * 3)] as any,
          title: `Image ${input.image.id}`,
          description: `Processed image ${input.image.id}`,
          tags: ['test', 'performance'],
          technicalQuality: {
            focusAccuracy: Math.floor(Math.random() * 1000),
            exposureQuality: Math.floor(Math.random() * 1000),
            compositionScore: Math.floor(Math.random() * 1000),
            lightingQuality: Math.floor(Math.random() * 1000),
            colorHarmony: Math.floor(Math.random() * 1000),
            noiseLevel: Math.floor(Math.random() * 1000),
            sharpnessDetail: Math.floor(Math.random() * 1000),
            dynamicRange: Math.floor(Math.random() * 1000),
            overallTechnical: Math.floor(Math.random() * 1000),
          },
          subjectAnalysis: {
            primarySubject: 'Person',
            emotionIntensity: Math.floor(Math.random() * 1000),
            eyesOpen: true,
            eyeContact: Math.random() > 0.5,
            genuineExpression: Math.floor(Math.random() * 1000),
            facialSharpness: Math.floor(Math.random() * 1000),
            bodyLanguage: Math.floor(Math.random() * 1000),
            momentTiming: Math.floor(Math.random() * 1000),
            storyTelling: Math.floor(Math.random() * 1000),
            uniqueness: Math.floor(Math.random() * 1000),
          },
        };
      }),
    };

    memorySnapshots = [];
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  function getMemoryUsageMB(): number {
    const usage = process.memoryUsage();
    return Math.round(usage.heapUsed / 1024 / 1024);
  }

  function recordMemorySnapshot() {
    const memoryMB = getMemoryUsageMB();
    memorySnapshots.push(memoryMB);
  }

  it('should process 10,000 images concurrently without crashing', async () => {
    // Generate 10,000 test images
    const imageCount = 10000;
    const images: ImageInput[] = Array.from({ length: imageCount }, (_, i) => ({
      id: `img_${i}`,
      filename: `test_${i}.jpg`,
    }));

    console.log(`\n[PERF TEST] Starting 10,000 image batch processing`);
    console.log(`[PERF TEST] Initial memory: ${getMemoryUsageMB()}MB`);

    const startTime = Date.now();
    recordMemorySnapshot();

    // Track progress every 1000 images
    const progressInterval = setInterval(() => {
      recordMemorySnapshot();
      console.log(`[PERF TEST] Memory: ${getMemoryUsageMB()}MB`);
    }, 5000);

    const results = await processor.processConcurrent(
      'user123',
      'shoot_large_batch',
      images,
      mockProvider,
      'Rate this image for professional photography'
    );

    clearInterval(progressInterval);
    const duration = Date.now() - startTime;
    const finalMemory = getMemoryUsageMB();
    recordMemorySnapshot();

    console.log(`\n[PERF TEST] Completed 10,000 images in ${(duration / 1000).toFixed(2)}s`);
    console.log(`[PERF TEST] Final memory: ${finalMemory}MB`);
    console.log(`[PERF TEST] Memory snapshots: ${memorySnapshots.join(', ')}MB`);
    console.log(`[PERF TEST] Images per second: ${(imageCount / (duration / 1000)).toFixed(2)}`);
    console.log(`[PERF TEST] Average time per image: ${(duration / imageCount).toFixed(2)}ms`);

    // Assertions
    expect(results).toHaveLength(imageCount);

    // All images should eventually succeed (with retries)
    const successCount = results.filter(r => r.success).length;
    const successRate = (successCount / imageCount) * 100;
    console.log(`[PERF TEST] Success rate: ${successRate.toFixed(2)}%`);

    // Should have at least 95% success rate (allowing for some failures after max retry time)
    expect(successRate).toBeGreaterThan(95);

    // Processing should complete in reasonable time
    // With concurrent processing, even 10k images should complete in < 5 minutes
    const maxDurationMs = 5 * 60 * 1000; // 5 minutes
    expect(duration).toBeLessThan(maxDurationMs);

    // Memory should stay under 2GB
    const maxMemoryMB = 2048;
    expect(finalMemory).toBeLessThan(maxMemoryMB);

    // Memory should not leak - final memory should be within 50% of initial
    const initialMemory = memorySnapshots[0];
    const memoryGrowth = ((finalMemory - initialMemory) / initialMemory) * 100;
    console.log(`[PERF TEST] Memory growth: ${memoryGrowth.toFixed(2)}%`);

    // Allow up to 50% memory growth (some growth is expected, but not unbounded)
    expect(memoryGrowth).toBeLessThan(50);

    // Should have broadcast progress updates
    expect(mockBroadcastToUser).toHaveBeenCalled();
    // Should broadcast roughly once per image (allowing for some variance)
    const broadcastCount = mockBroadcastToUser.mock.calls.length;
    console.log(`[PERF TEST] WebSocket broadcasts: ${broadcastCount}`);
    expect(broadcastCount).toBeGreaterThan(imageCount * 0.9);
  }, 400000); // 400 second timeout

  it('should handle rate limit throttling gracefully', async () => {
    // Create a provider that consistently hits rate limits
    const rateLimitProvider: ProviderAdapter = {
      processSingleImage: vi.fn(async (input) => {
        // Simulate very aggressive rate limiting (every 10th request)
        const callNum = (rateLimitProvider.processSingleImage as any).mock.calls.length;

        if (callNum % 10 === 0) {
          const error: any = new Error('Rate limit exceeded');
          error.statusCode = 429;
          throw error;
        }

        await new Promise(resolve => setTimeout(resolve, 10));

        return {
          imageId: input.image.id,
          filename: input.image.filename || input.image.id,
          starRating: 5,
          colorLabel: 'green',
          keepReject: 'keep',
        };
      }),
    };

    const images: ImageInput[] = Array.from({ length: 1000 }, (_, i) => ({
      id: `img_${i}`,
      filename: `test_${i}.jpg`,
    }));

    console.log(`\n[PERF TEST] Testing rate limit handling with 1000 images`);

    const startTime = Date.now();
    const results = await processor.processConcurrent(
      'user123',
      'shoot_rate_limit',
      images,
      rateLimitProvider,
      'Rate this image'
    );
    const duration = Date.now() - startTime;

    console.log(`[PERF TEST] Rate limit test completed in ${(duration / 1000).toFixed(2)}s`);

    // Should complete all images despite rate limits
    expect(results).toHaveLength(1000);

    // Should have high success rate (retries should handle rate limits)
    const successCount = results.filter(r => r.success).length;
    expect(successCount).toBeGreaterThan(950);

    // Should have made retry attempts
    const totalAttempts = results.reduce((sum, r) => sum + (r.attempts || 1), 0);
    expect(totalAttempts).toBeGreaterThan(1000); // More attempts than images due to retries

    console.log(`[PERF TEST] Total attempts: ${totalAttempts} (avg ${(totalAttempts / 1000).toFixed(2)} per image)`);
  }, 120000); // 120 second timeout

  it('should maintain performance with varying image sizes', async () => {
    // Simulate different processing times for different "image sizes"
    const sizeVariantProvider: ProviderAdapter = {
      processSingleImage: vi.fn(async (input) => {
        // Simulate processing time based on "image size" (encoded in filename)
        const imageNum = parseInt(input.image.id.split('_')[1] || '0');
        let delay;

        if (imageNum % 3 === 0) {
          delay = 200; // "Large" images
        } else if (imageNum % 3 === 1) {
          delay = 100; // "Medium" images
        } else {
          delay = 50; // "Small" images
        }

        await new Promise(resolve => setTimeout(resolve, delay));

        return {
          imageId: input.image.id,
          filename: input.image.filename || input.image.id,
          starRating: 4,
          colorLabel: 'green',
          keepReject: 'keep',
        };
      }),
    };

    const images: ImageInput[] = Array.from({ length: 3000 }, (_, i) => ({
      id: `img_${i}`,
      filename: `test_${i}.jpg`,
    }));

    console.log(`\n[PERF TEST] Testing with varying image sizes (3000 images)`);

    const startTime = Date.now();
    const results = await processor.processConcurrent(
      'user123',
      'shoot_size_variant',
      images,
      sizeVariantProvider,
      'Rate this image'
    );
    const duration = Date.now() - startTime;

    console.log(`[PERF TEST] Completed in ${(duration / 1000).toFixed(2)}s`);

    expect(results).toHaveLength(3000);
    expect(results.every(r => r.success)).toBe(true);

    // Should complete in reasonable time (concurrent processing handles varying sizes well)
    expect(duration).toBeLessThan(90000); // 90 seconds
  }, 120000); // 120 second timeout

  it('should track and report retry statistics', async () => {
    // Provider with controlled failure rate
    let attemptCount = 0;
    const retryTestProvider: ProviderAdapter = {
      processSingleImage: vi.fn(async (input) => {
        attemptCount++;

        // Fail first 2 attempts for every 10th image
        const imageNum = parseInt(input.image.id.split('_')[1] || '0');
        if (imageNum % 10 === 0 && attemptCount % 3 !== 0) {
          throw new Error('Simulated transient error');
        }

        await new Promise(resolve => setTimeout(resolve, 10));

        return {
          imageId: input.image.id,
          filename: input.image.filename || input.image.id,
          starRating: 5,
          colorLabel: 'green',
          keepReject: 'keep',
        };
      }),
    };

    const images: ImageInput[] = Array.from({ length: 500 }, (_, i) => ({
      id: `img_${i}`,
      filename: `test_${i}.jpg`,
    }));

    console.log(`\n[PERF TEST] Testing retry statistics tracking`);

    const results = await processor.processConcurrent(
      'user123',
      'shoot_retry_stats',
      images,
      retryTestProvider,
      'Rate this image'
    );

    // Calculate retry statistics
    const imagesWithRetries = results.filter(r => (r.attempts || 1) > 1);
    const totalRetries = results.reduce((sum, r) => sum + ((r.attempts || 1) - 1), 0);
    const avgAttempts = results.reduce((sum, r) => sum + (r.attempts || 1), 0) / results.length;

    console.log(`[PERF TEST] Images requiring retries: ${imagesWithRetries.length}`);
    console.log(`[PERF TEST] Total retry attempts: ${totalRetries}`);
    console.log(`[PERF TEST] Average attempts per image: ${avgAttempts.toFixed(2)}`);

    expect(imagesWithRetries.length).toBeGreaterThan(0);
    expect(totalRetries).toBeGreaterThan(0);
    expect(results.every(r => r.success)).toBe(true);
  }, 60000); // 60 second timeout
});
