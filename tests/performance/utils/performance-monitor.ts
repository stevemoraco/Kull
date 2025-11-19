/**
 * Performance Monitoring Utilities
 *
 * Provides utilities for measuring and tracking performance metrics
 * during performance tests.
 */

export interface PerformanceMetrics {
  duration: number;
  memoryUsed: number;
  memoryTotal: number;
  throughput?: number;
  latency?: {
    min: number;
    max: number;
    avg: number;
    p50: number;
    p95: number;
    p99: number;
  };
}

export interface MemorySnapshot {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
}

export class PerformanceMonitor {
  private startTime: number;
  private memorySnapshots: MemorySnapshot[] = [];
  private measurements: number[] = [];

  constructor() {
    this.startTime = Date.now();
  }

  /**
   * Start timing an operation
   */
  start(): void {
    this.startTime = Date.now();
  }

  /**
   * Stop timing and return duration in ms
   */
  stop(): number {
    return Date.now() - this.startTime;
  }

  /**
   * Take a snapshot of current memory usage
   */
  takeMemorySnapshot(): MemorySnapshot {
    const usage = process.memoryUsage();
    const snapshot: MemorySnapshot = {
      timestamp: Date.now(),
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      external: usage.external,
      rss: usage.rss,
    };
    this.memorySnapshots.push(snapshot);
    return snapshot;
  }

  /**
   * Record a measurement (e.g., latency, duration)
   */
  recordMeasurement(value: number): void {
    this.measurements.push(value);
  }

  /**
   * Calculate latency statistics from measurements
   */
  getLatencyStats(): PerformanceMetrics['latency'] {
    if (this.measurements.length === 0) {
      return {
        min: 0,
        max: 0,
        avg: 0,
        p50: 0,
        p95: 0,
        p99: 0,
      };
    }

    const sorted = [...this.measurements].sort((a, b) => a - b);
    const sum = sorted.reduce((acc, val) => acc + val, 0);

    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: sum / sorted.length,
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
    };
  }

  /**
   * Get memory usage statistics
   */
  getMemoryStats(): {
    initial: number;
    final: number;
    peak: number;
    growth: number;
    growthPercent: number;
  } {
    if (this.memorySnapshots.length === 0) {
      return {
        initial: 0,
        final: 0,
        peak: 0,
        growth: 0,
        growthPercent: 0,
      };
    }

    const initial = this.memorySnapshots[0].heapUsed;
    const final = this.memorySnapshots[this.memorySnapshots.length - 1].heapUsed;
    const peak = Math.max(...this.memorySnapshots.map(s => s.heapUsed));
    const growth = final - initial;
    const growthPercent = (growth / initial) * 100;

    return {
      initial,
      final,
      peak,
      growth,
      growthPercent,
    };
  }

  /**
   * Get all collected metrics
   */
  getMetrics(): PerformanceMetrics {
    const duration = this.stop();
    const memoryStats = this.getMemoryStats();
    const latency = this.measurements.length > 0 ? this.getLatencyStats() : undefined;

    return {
      duration,
      memoryUsed: memoryStats.final,
      memoryTotal: memoryStats.peak,
      latency,
    };
  }

  /**
   * Format bytes to human-readable format
   */
  static formatBytes(bytes: number): string {
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  }

  /**
   * Format duration to human-readable format
   */
  static formatDuration(ms: number): string {
    if (ms < 1000) {
      return `${ms.toFixed(0)}ms`;
    }
    return `${(ms / 1000).toFixed(2)}s`;
  }

  /**
   * Print performance summary
   */
  printSummary(testName: string): void {
    const metrics = this.getMetrics();
    const memoryStats = this.getMemoryStats();

    console.log(`\n[PERF SUMMARY] ${testName}`);
    console.log(`[PERF] Duration: ${PerformanceMonitor.formatDuration(metrics.duration)}`);
    console.log(`[PERF] Memory: ${PerformanceMonitor.formatBytes(memoryStats.final)}`);
    console.log(`[PERF] Memory Growth: ${PerformanceMonitor.formatBytes(memoryStats.growth)} (${memoryStats.growthPercent.toFixed(2)}%)`);
    console.log(`[PERF] Peak Memory: ${PerformanceMonitor.formatBytes(memoryStats.peak)}`);

    if (metrics.latency) {
      console.log(`[PERF] Latency Min: ${metrics.latency.min.toFixed(2)}ms`);
      console.log(`[PERF] Latency Avg: ${metrics.latency.avg.toFixed(2)}ms`);
      console.log(`[PERF] Latency Max: ${metrics.latency.max.toFixed(2)}ms`);
      console.log(`[PERF] Latency P95: ${metrics.latency.p95.toFixed(2)}ms`);
      console.log(`[PERF] Latency P99: ${metrics.latency.p99.toFixed(2)}ms`);
    }

    if (this.measurements.length > 0) {
      console.log(`[PERF] Measurements: ${this.measurements.length}`);
    }
  }

  /**
   * Clear all collected data
   */
  reset(): void {
    this.startTime = Date.now();
    this.memorySnapshots = [];
    this.measurements = [];
  }
}

/**
 * Helper to run a performance test with automatic monitoring
 */
export async function runPerformanceTest<T>(
  testName: string,
  testFn: (monitor: PerformanceMonitor) => Promise<T>
): Promise<{ result: T; metrics: PerformanceMetrics }> {
  const monitor = new PerformanceMonitor();

  // Force GC if available
  if (global.gc) {
    global.gc();
  }

  monitor.start();
  monitor.takeMemorySnapshot();

  const result = await testFn(monitor);

  // Force GC and take final snapshot
  if (global.gc) {
    global.gc();
  }
  await new Promise(resolve => setTimeout(resolve, 100));
  monitor.takeMemorySnapshot();

  const metrics = monitor.getMetrics();
  monitor.printSummary(testName);

  return { result, metrics };
}

/**
 * Throughput calculator
 */
export class ThroughputCalculator {
  private startTime: number;
  private itemsProcessed: number = 0;

  constructor() {
    this.startTime = Date.now();
  }

  /**
   * Record processed items
   */
  recordItems(count: number): void {
    this.itemsProcessed += count;
  }

  /**
   * Get current throughput in items/sec
   */
  getThroughput(): number {
    const duration = (Date.now() - this.startTime) / 1000;
    return this.itemsProcessed / duration;
  }

  /**
   * Get total items processed
   */
  getTotalItems(): number {
    return this.itemsProcessed;
  }

  /**
   * Get elapsed time in seconds
   */
  getElapsedTime(): number {
    return (Date.now() - this.startTime) / 1000;
  }

  /**
   * Print throughput summary
   */
  printSummary(): void {
    console.log(`[THROUGHPUT] Items: ${this.itemsProcessed}`);
    console.log(`[THROUGHPUT] Time: ${this.getElapsedTime().toFixed(2)}s`);
    console.log(`[THROUGHPUT] Rate: ${this.getThroughput().toFixed(2)} items/sec`);
  }
}

/**
 * Assert performance benchmarks
 */
export function assertPerformance(
  metrics: PerformanceMetrics,
  benchmarks: {
    maxDuration?: number;
    maxMemoryMB?: number;
    maxMemoryGrowthPercent?: number;
    minThroughput?: number;
    maxLatencyP95?: number;
  }
): void {
  if (benchmarks.maxDuration !== undefined) {
    if (metrics.duration > benchmarks.maxDuration) {
      throw new Error(
        `Performance benchmark failed: Duration ${metrics.duration}ms exceeds max ${benchmarks.maxDuration}ms`
      );
    }
  }

  if (benchmarks.maxMemoryMB !== undefined) {
    const memoryMB = metrics.memoryUsed / 1024 / 1024;
    if (memoryMB > benchmarks.maxMemoryMB) {
      throw new Error(
        `Performance benchmark failed: Memory ${memoryMB.toFixed(2)}MB exceeds max ${benchmarks.maxMemoryMB}MB`
      );
    }
  }

  if (benchmarks.maxLatencyP95 !== undefined && metrics.latency) {
    if (metrics.latency.p95 > benchmarks.maxLatencyP95) {
      throw new Error(
        `Performance benchmark failed: P95 latency ${metrics.latency.p95.toFixed(2)}ms exceeds max ${benchmarks.maxLatencyP95}ms`
      );
    }
  }
}
