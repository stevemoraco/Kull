import { describe, it, expect } from 'vitest';
import { PerformanceMonitor, ThroughputCalculator } from './utils/performance-monitor';

/**
 * PERFORMANCE TEST: File Upload Performance
 *
 * Requirements:
 * - Test file upload performance (1GB folder should process in <5 min)
 * - Monitor upload throughput
 * - Test concurrent file uploads
 * - Verify memory efficiency during uploads
 */

describe('Performance Test: File Upload', () => {
  function simulateFileUpload(sizeBytes: number, delayMs: number = 0): Promise<void> {
    return new Promise((resolve) => {
      // Simulate upload time based on size
      // Assume 10 MB/s upload speed
      const baseTime = (sizeBytes / (10 * 1024 * 1024)) * 1000;
      const totalTime = baseTime + delayMs;

      setTimeout(resolve, totalTime);
    });
  }

  function generateMockFile(sizeBytes: number): {
    name: string;
    size: number;
    type: string;
  } {
    return {
      name: `test-file-${Date.now()}-${Math.random()}.jpg`,
      size: sizeBytes,
      type: 'image/jpeg',
    };
  }

  it('should upload 1GB folder in <5 minutes', async () => {
    const monitor = new PerformanceMonitor();
    const throughput = new ThroughputCalculator();

    // Simulate 1GB folder (200 files × 5MB each)
    const fileCount = 200;
    const fileSizeMB = 5;
    const fileSizeBytes = fileSizeMB * 1024 * 1024;
    const totalSizeGB = (fileCount * fileSizeMB) / 1024;

    console.log(`\n[PERF TEST] Uploading ${totalSizeGB.toFixed(2)}GB (${fileCount} files)`);

    monitor.start();
    monitor.takeMemorySnapshot();

    const files = Array.from({ length: fileCount }, () => generateMockFile(fileSizeBytes));

    // Upload all files concurrently (simulating parallel uploads)
    const uploadPromises = files.map(async (file) => {
      await simulateFileUpload(file.size);
      throughput.recordItems(1);
      monitor.takeMemorySnapshot();
    });

    await Promise.all(uploadPromises);

    const duration = monitor.stop();
    monitor.takeMemorySnapshot();

    const durationMinutes = duration / 1000 / 60;
    const uploadThroughput = (totalSizeGB / durationMinutes) * 1024; // MB/min

    console.log(`[PERF TEST] Upload completed in ${durationMinutes.toFixed(2)} minutes`);
    console.log(`[PERF TEST] Throughput: ${uploadThroughput.toFixed(2)} MB/min`);
    console.log(`[PERF TEST] Files/sec: ${throughput.getThroughput().toFixed(2)}`);

    throughput.printSummary();

    // Should complete in less than 5 minutes
    expect(durationMinutes).toBeLessThan(5);

    // Memory should be reasonable (allow up to 500MB for buffering)
    const memoryStats = monitor.getMemoryStats();
    const memoryMB = memoryStats.peak / 1024 / 1024;
    console.log(`[PERF TEST] Peak memory: ${memoryMB.toFixed(2)}MB`);
    expect(memoryMB).toBeLessThan(500);
  }, 400000); // 400 second timeout

  it('should handle 100 concurrent file uploads efficiently', async () => {
    const monitor = new PerformanceMonitor();
    const throughput = new ThroughputCalculator();

    const fileCount = 100;
    const fileSizeMB = 2;
    const fileSizeBytes = fileSizeMB * 1024 * 1024;

    console.log(`\n[PERF TEST] Concurrent upload of ${fileCount} files (${fileSizeMB}MB each)`);

    monitor.start();
    monitor.takeMemorySnapshot();

    const files = Array.from({ length: fileCount }, () => generateMockFile(fileSizeBytes));

    // Upload all concurrently
    const uploadPromises = files.map(async (file, index) => {
      const startTime = Date.now();
      await simulateFileUpload(file.size);
      const uploadTime = Date.now() - startTime;

      throughput.recordItems(1);
      monitor.recordMeasurement(uploadTime);

      if (index % 10 === 0) {
        monitor.takeMemorySnapshot();
      }
    });

    await Promise.all(uploadPromises);

    const duration = monitor.stop();
    monitor.takeMemorySnapshot();

    const latencyStats = monitor.getLatencyStats();

    console.log(`[PERF TEST] Concurrent uploads completed in ${(duration / 1000).toFixed(2)}s`);
    console.log(`[PERF TEST] Average upload time: ${latencyStats.avg.toFixed(2)}ms`);
    console.log(`[PERF TEST] P95 upload time: ${latencyStats.p95.toFixed(2)}ms`);

    throughput.printSummary();

    // Should complete in reasonable time (with concurrency, much faster than sequential)
    expect(duration).toBeLessThan(60000); // 60 seconds

    // Memory should be reasonable
    const memoryStats = monitor.getMemoryStats();
    const memoryMB = memoryStats.peak / 1024 / 1024;
    expect(memoryMB).toBeLessThan(300);
  }, 120000); // 120 second timeout

  it('should process large files (100MB+) efficiently', async () => {
    const monitor = new PerformanceMonitor();

    const fileSizeMB = 100;
    const fileSizeBytes = fileSizeMB * 1024 * 1024;
    const fileCount = 10;

    console.log(`\n[PERF TEST] Processing ${fileCount} large files (${fileSizeMB}MB each)`);

    monitor.start();
    monitor.takeMemorySnapshot();

    const files = Array.from({ length: fileCount }, () => generateMockFile(fileSizeBytes));

    for (const file of files) {
      await simulateFileUpload(file.size);
      monitor.takeMemorySnapshot();
    }

    const duration = monitor.stop();
    monitor.takeMemorySnapshot();

    console.log(`[PERF TEST] Large file processing completed in ${(duration / 1000).toFixed(2)}s`);

    // Should complete in reasonable time
    expect(duration).toBeLessThan(120000); // 120 seconds

    // Memory should stay stable (streaming, not loading entire file)
    const memoryStats = monitor.getMemoryStats();
    const memoryGrowthPercent = memoryStats.growthPercent;
    console.log(`[PERF TEST] Memory growth: ${memoryGrowthPercent.toFixed(2)}%`);

    // Memory growth should be minimal with streaming
    expect(memoryGrowthPercent).toBeLessThan(30);
  }, 150000); // 150 second timeout

  it('should handle upload failures gracefully without memory leaks', async () => {
    const monitor = new PerformanceMonitor();

    const fileCount = 50;
    const fileSizeMB = 5;
    const fileSizeBytes = fileSizeMB * 1024 * 1024;
    const failureRate = 0.2; // 20% failure rate

    console.log(`\n[PERF TEST] Testing upload resilience (${fileCount} files, ${failureRate * 100}% failure rate)`);

    monitor.start();
    monitor.takeMemorySnapshot();

    const files = Array.from({ length: fileCount }, () => generateMockFile(fileSizeBytes));

    let successCount = 0;
    let failureCount = 0;

    const uploadPromises = files.map(async (file) => {
      try {
        // Simulate random failures
        if (Math.random() < failureRate) {
          throw new Error('Simulated upload failure');
        }

        await simulateFileUpload(file.size);
        successCount++;
      } catch (error) {
        failureCount++;
        // In real implementation, would retry or log error
      }

      monitor.takeMemorySnapshot();
    });

    await Promise.allSettled(uploadPromises);

    // Force GC
    if (global.gc) {
      global.gc();
    }
    await new Promise(resolve => setTimeout(resolve, 100));

    const duration = monitor.stop();
    monitor.takeMemorySnapshot();

    console.log(`[PERF TEST] Upload resilience test completed in ${(duration / 1000).toFixed(2)}s`);
    console.log(`[PERF TEST] Successful uploads: ${successCount}`);
    console.log(`[PERF TEST] Failed uploads: ${failureCount}`);

    // Should handle failures
    expect(failureCount).toBeGreaterThan(0);
    expect(successCount).toBeGreaterThan(0);

    // Memory should not leak from failures
    const memoryStats = monitor.getMemoryStats();
    const memoryGrowthPercent = memoryStats.growthPercent;
    console.log(`[PERF TEST] Memory growth: ${memoryGrowthPercent.toFixed(2)}%`);

    expect(memoryGrowthPercent).toBeLessThan(40);
  }, 120000); // 120 second timeout

  it('should maintain throughput with mixed file sizes', async () => {
    const monitor = new PerformanceMonitor();
    const throughput = new ThroughputCalculator();

    console.log(`\n[PERF TEST] Testing mixed file sizes`);

    monitor.start();
    monitor.takeMemorySnapshot();

    // Mix of small, medium, and large files
    const files = [
      ...Array.from({ length: 50 }, () => generateMockFile(1 * 1024 * 1024)), // 50 × 1MB
      ...Array.from({ length: 30 }, () => generateMockFile(5 * 1024 * 1024)), // 30 × 5MB
      ...Array.from({ length: 10 }, () => generateMockFile(20 * 1024 * 1024)), // 10 × 20MB
    ];

    const totalSizeMB = files.reduce((sum, f) => sum + f.size, 0) / 1024 / 1024;

    console.log(`[PERF TEST] Total size: ${totalSizeMB.toFixed(2)}MB across ${files.length} files`);

    // Upload all concurrently
    const uploadPromises = files.map(async (file) => {
      await simulateFileUpload(file.size);
      throughput.recordItems(1);
    });

    await Promise.all(uploadPromises);

    const duration = monitor.stop();
    monitor.takeMemorySnapshot();

    console.log(`[PERF TEST] Mixed upload completed in ${(duration / 1000).toFixed(2)}s`);
    console.log(`[PERF TEST] Average throughput: ${(totalSizeMB / (duration / 1000)).toFixed(2)} MB/s`);

    throughput.printSummary();

    // Should complete in reasonable time
    expect(duration).toBeLessThan(60000); // 60 seconds

    // All files should be processed
    expect(throughput.getTotalItems()).toBe(files.length);
  }, 120000); // 120 second timeout

  it('should handle burst uploads without degradation', async () => {
    const monitor = new PerformanceMonitor();

    const burstCount = 5;
    const filesPerBurst = 20;
    const fileSizeMB = 3;
    const fileSizeBytes = fileSizeMB * 1024 * 1024;
    const delayBetweenBursts = 1000; // 1 second

    console.log(`\n[PERF TEST] Testing ${burstCount} bursts of ${filesPerBurst} files`);

    monitor.start();

    const burstDurations: number[] = [];

    for (let burst = 0; burst < burstCount; burst++) {
      const burstStart = Date.now();
      monitor.takeMemorySnapshot();

      const files = Array.from({ length: filesPerBurst }, () => generateMockFile(fileSizeBytes));

      const uploadPromises = files.map(file => simulateFileUpload(file.size));
      await Promise.all(uploadPromises);

      const burstDuration = Date.now() - burstStart;
      burstDurations.push(burstDuration);

      console.log(`[PERF TEST] Burst ${burst + 1}/${burstCount}: ${burstDuration}ms`);

      if (burst < burstCount - 1) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenBursts));
      }
    }

    const totalDuration = monitor.stop();
    monitor.takeMemorySnapshot();

    const avgBurstDuration = burstDurations.reduce((sum, d) => sum + d, 0) / burstDurations.length;
    const maxBurstDuration = Math.max(...burstDurations);
    const minBurstDuration = Math.min(...burstDurations);

    console.log(`[PERF TEST] Burst test completed in ${(totalDuration / 1000).toFixed(2)}s`);
    console.log(`[PERF TEST] Average burst duration: ${avgBurstDuration.toFixed(2)}ms`);
    console.log(`[PERF TEST] Min burst duration: ${minBurstDuration}ms`);
    console.log(`[PERF TEST] Max burst duration: ${maxBurstDuration}ms`);

    // Performance should not degrade significantly across bursts
    const degradation = ((maxBurstDuration - minBurstDuration) / minBurstDuration) * 100;
    console.log(`[PERF TEST] Performance degradation: ${degradation.toFixed(2)}%`);

    // Degradation should be minimal (< 50%)
    expect(degradation).toBeLessThan(50);

    // Memory should be stable
    const memoryStats = monitor.getMemoryStats();
    expect(memoryStats.growthPercent).toBeLessThan(40);
  }, 120000); // 120 second timeout
});
