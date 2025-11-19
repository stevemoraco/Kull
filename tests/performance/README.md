# Performance & Load Testing Suite

Comprehensive performance and load testing for the Kull platform.

## Overview

This test suite validates the platform's performance under various stress conditions:

- **Large Batch Processing**: 10,000-image concurrent processing
- **Concurrent Users**: 100 simultaneous user sessions
- **WebSocket Throughput**: 1000 messages/sec broadcast
- **Memory Leak Detection**: Extended retry loop simulation
- **Database Query Performance**: All queries <100ms
- **File Upload Performance**: 1GB folder processing <5 min

## Running Tests

### All Performance Tests

```bash
npm run test:performance
```

### Individual Test Suites

```bash
# Large batch processing (10,000 images)
npm run test:perf:batch

# Concurrent users (100 simultaneous sessions)
npm run test:perf:users

# WebSocket throughput
npm run test:perf:websocket

# Memory leak detection
npm run test:perf:memory

# Database query benchmarks
npm run test:perf:database

# File upload performance
npm run test:perf:upload
```

### Watch Mode

```bash
npm run test:performance:watch
```

## Performance Benchmarks

### Large Batch Processing

**File**: `large-batch.perf.test.ts`

**Requirements**:
- Process 10,000 images concurrently
- Complete in <5 minutes
- Memory usage <2GB
- Memory growth <50%
- 95%+ success rate with retries
- Handle 30k/min rate limiting gracefully

**Key Tests**:
- 10,000 image concurrent processing
- Rate limit throttling (429 errors)
- Mixed image sizes (varying processing times)
- Retry statistics tracking

### Concurrent Users

**File**: `concurrent-users.perf.test.ts`

**Requirements**:
- Support 100 simultaneous users
- No resource conflicts or deadlocks
- Fair resource allocation
- Session isolation (no cross-user data)
- Memory usage <2GB total

**Key Tests**:
- 100 concurrent users (100 images each)
- Staggered user arrivals
- Fair resource allocation (variance <50%)
- Mixed workload sizes
- Rapid user churn (5 waves)

### WebSocket Throughput

**File**: `websocket-throughput.perf.test.ts`

**Requirements**:
- Handle 1000 messages/sec
- No message loss under load
- Support 100 concurrent connections
- Average latency <50ms
- P95 latency <100ms
- Connection stability over time

**Key Tests**:
- 1000 messages/sec throughput
- Broadcast to 100 devices
- Latency measurement under load
- Rapid connect/disconnect cycles
- Message burst handling
- Extended connection stability (30s)

### Memory Leak Detection

**File**: `memory-leak.perf.test.ts`

**Requirements**:
- No memory leaks over extended operations
- Memory growth <30% over repeated operations
- Effective garbage collection
- Stable memory with retry loops
- Backend memory <2GB

**Key Tests**:
- Repeated batch processing (10 cycles)
- Long-running retry loops (50 iterations)
- WebSocket broadcast memory (20 cycles)
- Error handling memory (30 cycles)
- Mixed success/failure (60s continuous)

### Database Query Performance

**File**: `database-query.perf.test.ts`

**Requirements**:
- All simple queries <100ms
- Complex queries <200ms
- Efficient indexing
- Scalable with large datasets
- Transaction performance <200ms avg

**Key Tests**:
- User by ID query
- User by email query
- Paginated queries
- Aggregation queries
- Date range filtering
- Bulk inserts (1000 records)
- Join queries
- 100 concurrent queries
- Complex aggregations with grouping
- 1000 user scalability
- Text search queries
- Transaction load (50 transactions)

### File Upload Performance

**File**: `file-upload.perf.test.ts`

**Requirements**:
- 1GB folder upload <5 minutes
- 100 concurrent uploads
- Large file support (100MB+)
- Memory efficient (streaming)
- Graceful failure handling

**Key Tests**:
- 1GB folder upload (200 × 5MB files)
- 100 concurrent uploads
- Large file processing (10 × 100MB)
- Upload failure resilience
- Mixed file sizes
- Burst uploads

## Test Configuration

### Node Options

All performance tests run with specific Node.js options:

```bash
NODE_OPTIONS='--expose-gc --max-old-space-size=4096'
```

- `--expose-gc`: Enables manual garbage collection for memory tests
- `--max-old-space-size=4096`: Increases heap size to 4GB for large batch tests

### Test Timeouts

Individual tests have extended timeouts:

- Large batch processing: 400 seconds
- Concurrent users: 600 seconds (10 minutes)
- WebSocket tests: 60 seconds
- Memory leak tests: 180 seconds (3 minutes)
- Database tests: 30 seconds
- File upload tests: 400 seconds

## Performance Monitoring

### Built-in Utilities

The test suite includes performance monitoring utilities in `utils/performance-monitor.ts`:

**PerformanceMonitor**:
- Duration tracking
- Memory snapshot collection
- Latency statistics (min, max, avg, p50, p95, p99)
- Memory analysis (growth, peak, trend)
- Automatic reporting

**ThroughputCalculator**:
- Item counting
- Throughput calculation (items/sec)
- Elapsed time tracking

**Helper Functions**:
- `runPerformanceTest()`: Automatic monitoring wrapper
- `assertPerformance()`: Benchmark validation

### Example Usage

```typescript
import { PerformanceMonitor } from './utils/performance-monitor';

const monitor = new PerformanceMonitor();

monitor.start();
monitor.takeMemorySnapshot();

// Run test...

monitor.recordMeasurement(latencyMs);
monitor.takeMemorySnapshot();

const metrics = monitor.getMetrics();
monitor.printSummary('Test Name');
```

## Performance Reports

### Report Generation

Performance reports can be generated using `utils/report-generator.ts`:

```typescript
import { ReportGenerator } from './utils/report-generator';

const generator = new ReportGenerator();

generator.addResult({
  testName: 'Test Name',
  suite: 'Suite Name',
  duration: 1000,
  passed: true,
  metrics: {
    throughput: 100,
    memoryUsedMB: 512,
    latencyAvg: 50,
  },
  benchmark: {
    maxDuration: 2000,
    maxMemoryMB: 1024,
  },
});

generator.saveReports('./performance-reports');
```

### Report Formats

Reports are generated in three formats:

1. **JSON**: Machine-readable format for CI/CD
2. **Markdown**: Human-readable summary with tables
3. **HTML**: Visual report with charts

### Report Contents

- Test summary (passed/failed counts)
- Duration metrics
- Memory usage statistics
- Throughput measurements
- Latency percentiles (P95, P99)
- Benchmark compliance
- Recommendations

## Best Practices

### Running Performance Tests

1. **Close Other Applications**: Minimize interference
2. **Use Consistent Environment**: Same hardware, OS state
3. **Run Multiple Times**: Average results over 3+ runs
4. **Monitor System Resources**: CPU, memory, disk I/O
5. **Check for Background Processes**: Disable auto-updates, backups

### Interpreting Results

1. **Duration**: Should be consistent across runs (±10%)
2. **Memory**: Watch for growth trends, not absolute values
3. **Throughput**: Compare to baseline, not just benchmarks
4. **Latency**: Focus on P95/P99, not just averages
5. **Error Rates**: Should be 0% or match expected failure simulation

### Debugging Performance Issues

1. **Enable Verbose Logging**: Use `--reporter=verbose`
2. **Profile with Chrome DevTools**: Run with `--inspect`
3. **Use Heap Snapshots**: Take snapshots at intervals
4. **Check Database Indexes**: Slow queries often need indexes
5. **Monitor Network**: WebSocket tests can be affected by network

## CI/CD Integration

### GitHub Actions Example

```yaml
- name: Run Performance Tests
  run: npm run test:performance
  timeout-minutes: 30
  env:
    NODE_OPTIONS: --expose-gc --max-old-space-size=4096

- name: Upload Performance Report
  uses: actions/upload-artifact@v3
  with:
    name: performance-report
    path: performance-reports/
```

### Performance Regression Detection

Compare current results against baseline:

```bash
# Save baseline
npm run test:performance > baseline.txt

# Compare after changes
npm run test:performance > current.txt
diff baseline.txt current.txt
```

## Troubleshooting

### Out of Memory Errors

Increase heap size:

```bash
NODE_OPTIONS='--max-old-space-size=8192' npm run test:performance
```

### Timeout Errors

Individual tests have their own timeout configuration in the test files. Increase if needed:

```typescript
it('test name', async () => {
  // Test code
}, 600000); // Increase timeout to 10 minutes
```

### Database Connection Errors

Ensure database is running and accessible:

```bash
npm run db:push  # Sync schema
```

### WebSocket Connection Failures

Check that server starts correctly and port is available.

## Performance Baselines

### Expected Results (Development Machine)

- **Large Batch (10k images)**: ~120-180 seconds
- **Concurrent Users (100)**: ~90-180 seconds
- **WebSocket (1000 msgs/sec)**: <10 seconds
- **Memory Leak Tests**: Memory growth <30%
- **Database Queries**: 95%+ queries <50ms
- **File Upload (1GB)**: ~60-120 seconds

*Note: Actual results vary by hardware*

## Additional Resources

- [Vitest Performance Documentation](https://vitest.dev/guide/performance.html)
- [Node.js Performance Best Practices](https://nodejs.org/en/docs/guides/simple-profiling/)
- [WebSocket Performance Guide](https://www.npmjs.com/package/ws#performance)

## Support

For performance-related questions or issues, contact the development team.
