import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BatchProcessor } from '../../server/ai/BatchProcessor';
import type { ImageInput, ProviderAdapter } from '../../server/ai/BatchProcessor';

/**
 * PERFORMANCE TEST: Concurrent Users (100 simultaneous sessions)
 *
 * Requirements:
 * - Test 100 simultaneous user sessions processing images
 * - Verify no resource conflicts or deadlocks
 * - Monitor total system throughput
 * - Ensure fair resource allocation across users
 * - Validate session isolation (no cross-user data leakage)
 */

// Mock WebSocket service
const mockBroadcastToUser = vi.fn();
const mockWsService = {
  broadcastToUser: mockBroadcastToUser,
};

vi.mock('../../server/websocket', () => ({
  getGlobalWsService: vi.fn(() => mockWsService),
}));

interface UserSession {
  userId: string;
  shootId: string;
  imageCount: number;
  startTime: number;
  endTime?: number;
  results?: any[];
  error?: Error;
}

describe('Performance Test: Concurrent Users', () => {
  let processor: BatchProcessor;
  let mockProvider: ProviderAdapter;
  let userSessions: UserSession[] = [];

  beforeEach(() => {
    processor = new BatchProcessor({
      maxRetryTime: 21600000, // 6 hours
      initialBackoff: 100,
      maxBackoff: 60000,
      rateLimitBackoff: 1000,
      broadcastProgress: true,
    });

    // Mock provider with realistic delays
    mockProvider = {
      processSingleImage: vi.fn(async (input) => {
        // Simulate realistic processing time
        const delay = Math.floor(Math.random() * 100) + 50;
        await new Promise(resolve => setTimeout(resolve, delay));

        return {
          imageId: input.image.id,
          filename: input.image.filename || input.image.id,
          starRating: Math.floor(Math.random() * 5) + 1 as 1 | 2 | 3 | 4 | 5,
          colorLabel: 'green',
          keepReject: 'keep',
          title: `Image ${input.image.id}`,
          description: `Processed for ${input.image.id}`,
          tags: ['test'],
        };
      }),
    };

    userSessions = [];
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  function getMemoryUsageMB(): number {
    const usage = process.memoryUsage();
    return Math.round(usage.heapUsed / 1024 / 1024);
  }

  async function simulateUserSession(
    userId: string,
    imageCount: number,
    delayMs: number = 0
  ): Promise<UserSession> {
    // Optional startup delay to stagger users
    if (delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }

    const session: UserSession = {
      userId,
      shootId: `shoot_${userId}`,
      imageCount,
      startTime: Date.now(),
    };

    userSessions.push(session);

    try {
      const images: ImageInput[] = Array.from({ length: imageCount }, (_, i) => ({
        id: `${userId}_img_${i}`,
        filename: `${userId}_test_${i}.jpg`,
      }));

      const results = await processor.processConcurrent(
        userId,
        session.shootId,
        images,
        mockProvider,
        'Rate this image'
      );

      session.endTime = Date.now();
      session.results = results;

      return session;
    } catch (error) {
      session.endTime = Date.now();
      session.error = error as Error;
      return session;
    }
  }

  it('should handle 100 concurrent users without crashing', async () => {
    const userCount = 100;
    const imagesPerUser = 100; // 10,000 total images

    console.log(`\n[PERF TEST] Starting ${userCount} concurrent users`);
    console.log(`[PERF TEST] ${imagesPerUser} images per user (${userCount * imagesPerUser} total)`);
    console.log(`[PERF TEST] Initial memory: ${getMemoryUsageMB()}MB`);

    const startTime = Date.now();

    // Launch all users concurrently
    const sessionPromises = Array.from({ length: userCount }, (_, i) =>
      simulateUserSession(`user_${i}`, imagesPerUser)
    );

    // Track memory every 5 seconds
    const memorySnapshots: number[] = [];
    const memoryInterval = setInterval(() => {
      const memMB = getMemoryUsageMB();
      memorySnapshots.push(memMB);
      console.log(`[PERF TEST] Memory: ${memMB}MB | Active sessions: ${userSessions.filter(s => !s.endTime).length}`);
    }, 5000);

    // Wait for all sessions to complete
    await Promise.allSettled(sessionPromises);

    clearInterval(memoryInterval);
    const duration = Date.now() - startTime;
    const finalMemory = getMemoryUsageMB();

    // Analyze results
    const completedSessions = userSessions.filter(s => s.results);
    const failedSessions = userSessions.filter(s => s.error);
    const totalImages = userSessions.reduce((sum, s) => sum + s.imageCount, 0);
    const totalProcessed = userSessions.reduce((sum, s) => sum + (s.results?.length || 0), 0);
    const avgDurationPerUser = userSessions.reduce((sum, s) => sum + ((s.endTime || 0) - s.startTime), 0) / userCount;

    console.log(`\n[PERF TEST] Concurrent Users Test Completed`);
    console.log(`[PERF TEST] Total duration: ${(duration / 1000).toFixed(2)}s`);
    console.log(`[PERF TEST] Successful users: ${completedSessions.length}/${userCount}`);
    console.log(`[PERF TEST] Failed users: ${failedSessions.length}`);
    console.log(`[PERF TEST] Total images processed: ${totalProcessed}/${totalImages}`);
    console.log(`[PERF TEST] Average time per user: ${(avgDurationPerUser / 1000).toFixed(2)}s`);
    console.log(`[PERF TEST] Overall throughput: ${(totalProcessed / (duration / 1000)).toFixed(2)} images/sec`);
    console.log(`[PERF TEST] Final memory: ${finalMemory}MB`);
    console.log(`[PERF TEST] Max memory: ${Math.max(...memorySnapshots)}MB`);

    // Assertions
    expect(completedSessions.length).toBe(userCount);
    expect(failedSessions.length).toBe(0);
    expect(totalProcessed).toBe(totalImages);

    // Memory should stay under 2GB even with 100 concurrent users
    const maxMemoryMB = 2048;
    expect(finalMemory).toBeLessThan(maxMemoryMB);
    expect(Math.max(...memorySnapshots)).toBeLessThan(maxMemoryMB);

    // All users should complete in reasonable time
    const maxDurationMs = 10 * 60 * 1000; // 10 minutes
    expect(duration).toBeLessThan(maxDurationMs);

    // Verify session isolation - no cross-user data
    for (const session of userSessions) {
      if (session.results) {
        for (const result of session.results) {
          if (result.success && result.data?.imageId) {
            // Image ID should start with user ID
            expect(result.data.imageId.startsWith(session.userId)).toBe(true);
          }
        }
      }
    }
  }, 600000); // 10 minute timeout

  it('should handle staggered user arrivals', async () => {
    const userCount = 50;
    const imagesPerUser = 50;
    const staggerDelayMs = 100; // 100ms between each user

    console.log(`\n[PERF TEST] Testing staggered arrivals (${userCount} users, ${staggerDelayMs}ms apart)`);

    const startTime = Date.now();

    // Launch users with staggered delays
    const sessionPromises = Array.from({ length: userCount }, (_, i) =>
      simulateUserSession(`user_stagger_${i}`, imagesPerUser, i * staggerDelayMs)
    );

    await Promise.allSettled(sessionPromises);

    const duration = Date.now() - startTime;

    const completedSessions = userSessions.filter(s => s.results);
    const totalProcessed = userSessions.reduce((sum, s) => sum + (s.results?.length || 0), 0);

    console.log(`[PERF TEST] Staggered test completed in ${(duration / 1000).toFixed(2)}s`);
    console.log(`[PERF TEST] Completed users: ${completedSessions.length}/${userCount}`);
    console.log(`[PERF TEST] Total processed: ${totalProcessed}/${userCount * imagesPerUser}`);

    expect(completedSessions.length).toBe(userCount);
    expect(totalProcessed).toBe(userCount * imagesPerUser);
  }, 300000); // 5 minute timeout

  it('should maintain fair resource allocation across users', async () => {
    const userCount = 20;
    const imagesPerUser = 100;

    console.log(`\n[PERF TEST] Testing fair resource allocation (${userCount} users)`);

    const startTime = Date.now();

    const sessionPromises = Array.from({ length: userCount }, (_, i) =>
      simulateUserSession(`user_fair_${i}`, imagesPerUser)
    );

    await Promise.allSettled(sessionPromises);

    const duration = Date.now() - startTime;

    // Calculate completion times for each user
    const completionTimes = userSessions.map(s => (s.endTime || 0) - s.startTime);
    const avgCompletionTime = completionTimes.reduce((sum, t) => sum + t, 0) / completionTimes.length;
    const minCompletionTime = Math.min(...completionTimes);
    const maxCompletionTime = Math.max(...completionTimes);
    const variance = completionTimes.map(t => Math.pow(t - avgCompletionTime, 2)).reduce((sum, v) => sum + v, 0) / completionTimes.length;
    const stdDev = Math.sqrt(variance);

    console.log(`[PERF TEST] Resource allocation test completed in ${(duration / 1000).toFixed(2)}s`);
    console.log(`[PERF TEST] Average completion time: ${(avgCompletionTime / 1000).toFixed(2)}s`);
    console.log(`[PERF TEST] Min completion time: ${(minCompletionTime / 1000).toFixed(2)}s`);
    console.log(`[PERF TEST] Max completion time: ${(maxCompletionTime / 1000).toFixed(2)}s`);
    console.log(`[PERF TEST] Standard deviation: ${(stdDev / 1000).toFixed(2)}s`);
    console.log(`[PERF TEST] Variance ratio: ${(stdDev / avgCompletionTime * 100).toFixed(2)}%`);

    // Fair allocation: completion times should not vary by more than 50%
    const varianceRatio = (stdDev / avgCompletionTime) * 100;
    expect(varianceRatio).toBeLessThan(50);

    // No user should take more than 2x the average time
    expect(maxCompletionTime).toBeLessThan(avgCompletionTime * 2);
  }, 300000); // 5 minute timeout

  it('should handle mixed workload sizes across users', async () => {
    const userCount = 30;

    console.log(`\n[PERF TEST] Testing mixed workload sizes (${userCount} users)`);

    const startTime = Date.now();

    // Create users with varying workload sizes
    const sessionPromises = Array.from({ length: userCount }, (_, i) => {
      let imageCount;
      if (i % 3 === 0) {
        imageCount = 10; // Small workload
      } else if (i % 3 === 1) {
        imageCount = 100; // Medium workload
      } else {
        imageCount = 500; // Large workload
      }
      return simulateUserSession(`user_mixed_${i}`, imageCount);
    });

    await Promise.allSettled(sessionPromises);

    const duration = Date.now() - startTime;

    // Analyze by workload size
    const smallWorkloads = userSessions.filter((_, i) => i % 3 === 0);
    const mediumWorkloads = userSessions.filter((_, i) => i % 3 === 1);
    const largeWorkloads = userSessions.filter((_, i) => i % 3 === 2);

    const avgSmall = smallWorkloads.reduce((sum, s) => sum + ((s.endTime || 0) - s.startTime), 0) / smallWorkloads.length;
    const avgMedium = mediumWorkloads.reduce((sum, s) => sum + ((s.endTime || 0) - s.startTime), 0) / mediumWorkloads.length;
    const avgLarge = largeWorkloads.reduce((sum, s) => sum + ((s.endTime || 0) - s.startTime), 0) / largeWorkloads.length;

    console.log(`[PERF TEST] Mixed workload test completed in ${(duration / 1000).toFixed(2)}s`);
    console.log(`[PERF TEST] Small workloads (10 imgs): avg ${(avgSmall / 1000).toFixed(2)}s`);
    console.log(`[PERF TEST] Medium workloads (100 imgs): avg ${(avgMedium / 1000).toFixed(2)}s`);
    console.log(`[PERF TEST] Large workloads (500 imgs): avg ${(avgLarge / 1000).toFixed(2)}s`);

    // All sessions should complete successfully
    expect(userSessions.every(s => s.results)).toBe(true);

    // Large workloads should take proportionally longer (but with concurrency, not linearly)
    expect(avgLarge).toBeGreaterThan(avgMedium);
    expect(avgMedium).toBeGreaterThan(avgSmall);
  }, 300000); // 5 minute timeout

  it('should handle rapid user churn (users joining and leaving)', async () => {
    const waves = 5;
    const usersPerWave = 20;
    const imagesPerUser = 50;

    console.log(`\n[PERF TEST] Testing rapid user churn (${waves} waves, ${usersPerWave} users/wave)`);

    const allSessions: UserSession[] = [];
    const startTime = Date.now();

    for (let wave = 0; wave < waves; wave++) {
      console.log(`[PERF TEST] Starting wave ${wave + 1}/${waves}`);

      userSessions = []; // Reset for this wave

      const wavePromises = Array.from({ length: usersPerWave }, (_, i) =>
        simulateUserSession(`user_wave${wave}_${i}`, imagesPerUser)
      );

      await Promise.allSettled(wavePromises);

      allSessions.push(...userSessions);

      // Short delay between waves
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const duration = Date.now() - startTime;

    const totalUsers = waves * usersPerWave;
    const completedUsers = allSessions.filter(s => s.results).length;
    const totalProcessed = allSessions.reduce((sum, s) => sum + (s.results?.length || 0), 0);

    console.log(`[PERF TEST] User churn test completed in ${(duration / 1000).toFixed(2)}s`);
    console.log(`[PERF TEST] Total users: ${totalUsers}`);
    console.log(`[PERF TEST] Completed users: ${completedUsers}`);
    console.log(`[PERF TEST] Total images processed: ${totalProcessed}`);

    expect(completedUsers).toBe(totalUsers);
    expect(totalProcessed).toBe(totalUsers * imagesPerUser);
  }, 300000); // 5 minute timeout
});
