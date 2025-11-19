import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BatchProcessor } from '../../server/ai/BatchProcessor';
import type { ImageInput, ProviderAdapter } from '../../server/ai/BatchProcessor';

/**
 * PERFORMANCE TEST: Memory Leak Detection
 *
 * Requirements:
 * - Test 6-hour retry loop simulation (ensure no memory leaks over time)
 * - Monitor memory usage over extended operations
 * - Verify garbage collection effectiveness
 * - Test for memory leaks in error handling and retry logic
 * - Ensure memory stays stable over repeated operations
 */

// Mock WebSocket service
const mockBroadcastToUser = vi.fn();
const mockWsService = {
  broadcastToUser: mockBroadcastToUser,
};

vi.mock('../../server/websocket', () => ({
  getGlobalWsService: vi.fn(() => mockWsService),
}));

interface MemorySnapshot {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
}

describe('Performance Test: Memory Leak Detection', () => {
  let processor: BatchProcessor;
  let memorySnapshots: MemorySnapshot[] = [];

  beforeEach(() => {
    processor = new BatchProcessor({
      maxRetryTime: 21600000, // 6 hours
      initialBackoff: 100,
      maxBackoff: 60000,
      rateLimitBackoff: 1000,
      broadcastProgress: true,
    });

    memorySnapshots = [];
  });

  afterEach(() => {
    vi.clearAllMocks();
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  });

  function takeMemorySnapshot(): MemorySnapshot {
    const usage = process.memoryUsage();
    const snapshot: MemorySnapshot = {
      timestamp: Date.now(),
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      external: usage.external,
      rss: usage.rss,
    };
    memorySnapshots.push(snapshot);
    return snapshot;
  }

  function analyzeMemoryTrend(): {
    initial: number;
    final: number;
    growth: number;
    growthPercent: number;
    avgGrowthRate: number;
    isLeaking: boolean;
  } {
    if (memorySnapshots.length < 2) {
      throw new Error('Not enough memory snapshots');
    }

    const initial = memorySnapshots[0].heapUsed;
    const final = memorySnapshots[memorySnapshots.length - 1].heapUsed;
    const growth = final - initial;
    const growthPercent = (growth / initial) * 100;
    const duration = memorySnapshots[memorySnapshots.length - 1].timestamp - memorySnapshots[0].timestamp;
    const avgGrowthRate = growth / (duration / 1000); // bytes per second

    // Consider it leaking if growth is > 30% and consistently increasing
    const isLeaking = growthPercent > 30 && avgGrowthRate > 1000; // More than 1KB/sec growth

    return {
      initial,
      final,
      growth,
      growthPercent,
      avgGrowthRate,
      isLeaking,
    };
  }

  function formatBytes(bytes: number): string {
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  }

  it('should not leak memory during repeated batch processing', async () => {
    const cycles = 10;
    const imagesPerCycle = 100;

    console.log(`\n[PERF TEST] Memory leak test: ${cycles} cycles of ${imagesPerCycle} images`);

    // Force GC before starting
    if (global.gc) {
      global.gc();
    }

    takeMemorySnapshot();

    const mockProvider: ProviderAdapter = {
      processSingleImage: vi.fn(async (input) => {
        // Simulate processing
        await new Promise(resolve => setTimeout(resolve, 10));

        return {
          imageId: input.image.id,
          filename: input.image.filename || input.image.id,
          starRating: 4,
          colorLabel: 'green',
          keepReject: 'keep',
        };
      }),
    };

    for (let cycle = 0; cycle < cycles; cycle++) {
      const images: ImageInput[] = Array.from({ length: imagesPerCycle }, (_, i) => ({
        id: `cycle${cycle}_img${i}`,
        filename: `cycle${cycle}_test${i}.jpg`,
      }));

      await processor.processConcurrent(
        'user_memory_test',
        `shoot_cycle_${cycle}`,
        images,
        mockProvider,
        'Rate this image'
      );

      // Force GC between cycles
      if (global.gc) {
        global.gc();
      }

      const snapshot = takeMemorySnapshot();
      console.log(`[PERF TEST] Cycle ${cycle + 1}/${cycles}: Heap used = ${formatBytes(snapshot.heapUsed)}`);
    }

    // Final GC and snapshot
    if (global.gc) {
      global.gc();
    }
    await new Promise(resolve => setTimeout(resolve, 100));
    takeMemorySnapshot();

    // Analyze memory trend
    const analysis = analyzeMemoryTrend();

    console.log(`\n[PERF TEST] Memory Analysis:`);
    console.log(`[PERF TEST]   Initial heap: ${formatBytes(analysis.initial)}`);
    console.log(`[PERF TEST]   Final heap: ${formatBytes(analysis.final)}`);
    console.log(`[PERF TEST]   Growth: ${formatBytes(analysis.growth)} (${analysis.growthPercent.toFixed(2)}%)`);
    console.log(`[PERF TEST]   Growth rate: ${(analysis.avgGrowthRate / 1024).toFixed(2)} KB/sec`);
    console.log(`[PERF TEST]   Leaking: ${analysis.isLeaking ? 'YES ⚠️' : 'NO ✓'}`);

    // Should not be leaking
    expect(analysis.isLeaking).toBe(false);

    // Memory growth should be reasonable (< 30%)
    expect(analysis.growthPercent).toBeLessThan(30);
  }, 120000); // 2 minute timeout

  it('should handle long-running retry loops without memory leaks', async () => {
    // Simulate a long retry scenario (compressed time)
    const iterations = 50; // Simulate 50 retry attempts
    const imagesPerIteration = 10;

    console.log(`\n[PERF TEST] Testing ${iterations} retry iterations`);

    if (global.gc) {
      global.gc();
    }
    takeMemorySnapshot();

    let attemptCount = 0;
    const retryProvider: ProviderAdapter = {
      processSingleImage: vi.fn(async (input) => {
        attemptCount++;

        // Simulate retry behavior: fail first 3 attempts, then succeed
        if (attemptCount % 4 !== 0) {
          const error: any = new Error('Simulated failure for retry test');
          error.statusCode = 500;
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

    for (let iter = 0; iter < iterations; iter++) {
      const images: ImageInput[] = Array.from({ length: imagesPerIteration }, (_, i) => ({
        id: `retry_iter${iter}_img${i}`,
        filename: `retry_${iter}_${i}.jpg`,
      }));

      await processor.processConcurrent(
        'user_retry_memory',
        `shoot_retry_${iter}`,
        images,
        retryProvider,
        'Rate this image'
      );

      if (iter % 10 === 0) {
        if (global.gc) {
          global.gc();
        }
        const snapshot = takeMemorySnapshot();
        console.log(`[PERF TEST] Iteration ${iter}/${iterations}: Heap = ${formatBytes(snapshot.heapUsed)}`);
      }
    }

    if (global.gc) {
      global.gc();
    }
    await new Promise(resolve => setTimeout(resolve, 100));
    takeMemorySnapshot();

    const analysis = analyzeMemoryTrend();

    console.log(`\n[PERF TEST] Retry Memory Analysis:`);
    console.log(`[PERF TEST]   Total retry attempts: ${attemptCount}`);
    console.log(`[PERF TEST]   Initial heap: ${formatBytes(analysis.initial)}`);
    console.log(`[PERF TEST]   Final heap: ${formatBytes(analysis.final)}`);
    console.log(`[PERF TEST]   Growth: ${formatBytes(analysis.growth)} (${analysis.growthPercent.toFixed(2)}%)`);
    console.log(`[PERF TEST]   Leaking: ${analysis.isLeaking ? 'YES ⚠️' : 'NO ✓'}`);

    expect(analysis.isLeaking).toBe(false);
    expect(analysis.growthPercent).toBeLessThan(40);
  }, 120000); // 2 minute timeout

  it('should handle WebSocket broadcast memory correctly', async () => {
    // Test that WebSocket broadcasting doesn't leak memory
    const cycles = 20;
    const messagesPerCycle = 100;

    console.log(`\n[PERF TEST] Testing WebSocket broadcast memory (${cycles} cycles)`);

    if (global.gc) {
      global.gc();
    }
    takeMemorySnapshot();

    const mockProvider: ProviderAdapter = {
      processSingleImage: vi.fn(async (input) => {
        await new Promise(resolve => setTimeout(resolve, 5));
        return {
          imageId: input.image.id,
          filename: input.image.filename || input.image.id,
          starRating: 4,
          colorLabel: 'green',
          keepReject: 'keep',
        };
      }),
    };

    for (let cycle = 0; cycle < cycles; cycle++) {
      const images: ImageInput[] = Array.from({ length: messagesPerCycle }, (_, i) => ({
        id: `ws_cycle${cycle}_img${i}`,
        filename: `ws_${cycle}_${i}.jpg`,
      }));

      await processor.processConcurrent(
        `user_ws_${cycle}`,
        `shoot_ws_${cycle}`,
        images,
        mockProvider,
        'Rate this image'
      );

      if (cycle % 5 === 0) {
        if (global.gc) {
          global.gc();
        }
        const snapshot = takeMemorySnapshot();
        console.log(`[PERF TEST] Cycle ${cycle}/${cycles}: Heap = ${formatBytes(snapshot.heapUsed)}, Broadcasts = ${mockBroadcastToUser.mock.calls.length}`);
      }
    }

    if (global.gc) {
      global.gc();
    }
    await new Promise(resolve => setTimeout(resolve, 100));
    takeMemorySnapshot();

    const analysis = analyzeMemoryTrend();
    const totalBroadcasts = mockBroadcastToUser.mock.calls.length;

    console.log(`\n[PERF TEST] WebSocket Memory Analysis:`);
    console.log(`[PERF TEST]   Total broadcasts: ${totalBroadcasts}`);
    console.log(`[PERF TEST]   Initial heap: ${formatBytes(analysis.initial)}`);
    console.log(`[PERF TEST]   Final heap: ${formatBytes(analysis.final)}`);
    console.log(`[PERF TEST]   Growth: ${formatBytes(analysis.growth)} (${analysis.growthPercent.toFixed(2)}%)`);
    console.log(`[PERF TEST]   Leaking: ${analysis.isLeaking ? 'YES ⚠️' : 'NO ✓'}`);

    expect(analysis.isLeaking).toBe(false);
    expect(totalBroadcasts).toBe(cycles * messagesPerCycle);
  }, 120000); // 2 minute timeout

  it('should handle error objects without memory leaks', async () => {
    // Test that error handling doesn't accumulate memory
    const cycles = 30;
    const imagesPerCycle = 50;

    console.log(`\n[PERF TEST] Testing error handling memory (${cycles} cycles)`);

    if (global.gc) {
      global.gc();
    }
    takeMemorySnapshot();

    let callCount = 0;
    const errorProvider: ProviderAdapter = {
      processSingleImage: vi.fn(async (input) => {
        callCount++;

        // 50% error rate to stress error handling
        if (Math.random() < 0.5) {
          const error: any = new Error(`Simulated error ${callCount}`);
          error.statusCode = Math.random() < 0.5 ? 429 : 500;
          error.details = {
            timestamp: Date.now(),
            imageId: input.image.id,
            callCount,
            stackTrace: new Error().stack,
          };
          throw error;
        }

        await new Promise(resolve => setTimeout(resolve, 5));

        return {
          imageId: input.image.id,
          filename: input.image.filename || input.image.id,
          starRating: 3,
          colorLabel: 'yellow',
          keepReject: 'maybe',
        };
      }),
    };

    for (let cycle = 0; cycle < cycles; cycle++) {
      const images: ImageInput[] = Array.from({ length: imagesPerCycle }, (_, i) => ({
        id: `error_cycle${cycle}_img${i}`,
        filename: `error_${cycle}_${i}.jpg`,
      }));

      await processor.processConcurrent(
        'user_error_memory',
        `shoot_error_${cycle}`,
        images,
        errorProvider,
        'Rate this image'
      );

      if (cycle % 5 === 0) {
        if (global.gc) {
          global.gc();
        }
        const snapshot = takeMemorySnapshot();
        console.log(`[PERF TEST] Cycle ${cycle}/${cycles}: Heap = ${formatBytes(snapshot.heapUsed)}, Calls = ${callCount}`);
      }
    }

    if (global.gc) {
      global.gc();
    }
    await new Promise(resolve => setTimeout(resolve, 100));
    takeMemorySnapshot();

    const analysis = analyzeMemoryTrend();

    console.log(`\n[PERF TEST] Error Handling Memory Analysis:`);
    console.log(`[PERF TEST]   Total calls: ${callCount}`);
    console.log(`[PERF TEST]   Initial heap: ${formatBytes(analysis.initial)}`);
    console.log(`[PERF TEST]   Final heap: ${formatBytes(analysis.final)}`);
    console.log(`[PERF TEST]   Growth: ${formatBytes(analysis.growth)} (${analysis.growthPercent.toFixed(2)}%)`);
    console.log(`[PERF TEST]   Leaking: ${analysis.isLeaking ? 'YES ⚠️' : 'NO ✓'}`);

    expect(analysis.isLeaking).toBe(false);
  }, 120000); // 2 minute timeout

  it('should maintain stable memory with mixed success/failure over time', async () => {
    // Long-running test with mixed results
    const duration = 60000; // 60 seconds
    const batchSize = 50;
    const batchInterval = 3000; // New batch every 3 seconds

    console.log(`\n[PERF TEST] Long-running mixed workload test (${duration / 1000}s)`);

    if (global.gc) {
      global.gc();
    }
    takeMemorySnapshot();

    const mixedProvider: ProviderAdapter = {
      processSingleImage: vi.fn(async (input) => {
        // Random outcomes
        const outcome = Math.random();

        if (outcome < 0.1) {
          // 10% rate limit errors
          const error: any = new Error('Rate limit');
          error.statusCode = 429;
          throw error;
        } else if (outcome < 0.2) {
          // 10% other errors
          throw new Error('Random error');
        }

        // 80% success
        await new Promise(resolve => setTimeout(resolve, Math.random() * 50));

        return {
          imageId: input.image.id,
          filename: input.image.filename || input.image.id,
          starRating: Math.floor(Math.random() * 5) + 1 as any,
          colorLabel: ['red', 'yellow', 'green'][Math.floor(Math.random() * 3)] as any,
          keepReject: ['keep', 'reject', 'maybe'][Math.floor(Math.random() * 3)] as any,
        };
      }),
    };

    const startTime = Date.now();
    let batchCount = 0;
    const processingPromises: Promise<any>[] = [];

    while (Date.now() - startTime < duration) {
      const images: ImageInput[] = Array.from({ length: batchSize }, (_, i) => ({
        id: `longrun_batch${batchCount}_img${i}`,
        filename: `longrun_${batchCount}_${i}.jpg`,
      }));

      const promise = processor.processConcurrent(
        'user_longrun',
        `shoot_longrun_${batchCount}`,
        images,
        mixedProvider,
        'Rate this image'
      );

      processingPromises.push(promise);
      batchCount++;

      // Take periodic memory snapshots
      if (batchCount % 3 === 0) {
        if (global.gc) {
          global.gc();
        }
        const snapshot = takeMemorySnapshot();
        const elapsed = (Date.now() - startTime) / 1000;
        console.log(`[PERF TEST] ${elapsed.toFixed(0)}s: Heap = ${formatBytes(snapshot.heapUsed)}, Batches = ${batchCount}`);
      }

      await new Promise(resolve => setTimeout(resolve, batchInterval));
    }

    // Wait for all batches to complete
    console.log(`[PERF TEST] Waiting for ${processingPromises.length} batches to complete...`);
    await Promise.allSettled(processingPromises);

    if (global.gc) {
      global.gc();
    }
    await new Promise(resolve => setTimeout(resolve, 100));
    takeMemorySnapshot();

    const analysis = analyzeMemoryTrend();

    console.log(`\n[PERF TEST] Long-Running Memory Analysis:`);
    console.log(`[PERF TEST]   Duration: ${duration / 1000}s`);
    console.log(`[PERF TEST]   Batches processed: ${batchCount}`);
    console.log(`[PERF TEST]   Initial heap: ${formatBytes(analysis.initial)}`);
    console.log(`[PERF TEST]   Final heap: ${formatBytes(analysis.final)}`);
    console.log(`[PERF TEST]   Growth: ${formatBytes(analysis.growth)} (${analysis.growthPercent.toFixed(2)}%)`);
    console.log(`[PERF TEST]   Growth rate: ${(analysis.avgGrowthRate / 1024).toFixed(2)} KB/sec`);
    console.log(`[PERF TEST]   Leaking: ${analysis.isLeaking ? 'YES ⚠️' : 'NO ✓'}`);

    expect(analysis.isLeaking).toBe(false);
    expect(analysis.growthPercent).toBeLessThan(50); // Allow slightly more growth for long-running
  }, 180000); // 3 minute timeout
});
