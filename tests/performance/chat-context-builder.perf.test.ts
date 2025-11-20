/**
 * Performance Benchmarks: Context Builder & Knowledge Base
 *
 * Measures execution time for context building operations
 * to ensure they meet performance targets.
 *
 * Targets:
 * - Context building: <50ms
 * - Knowledge base cached access: <10ms
 * - Full prompt assembly: <100ms
 * - Full /api/chat/message endpoint: <2000ms (with AI call)
 */

import { describe, it, expect, beforeAll, vi } from 'vitest';
import {
  buildUnifiedContext,
  combineContextMarkdown,
  buildCalculatorDataMarkdown,
  buildSectionTimingMarkdown,
  buildActivityHistoryMarkdown,
  buildUserMetadataMarkdown,
  buildSessionMetrics,
  buildConversationMemoryMarkdown,
  enrichCalculatorData,
} from '../../server/contextBuilder';
import {
  getStaticKnowledgeBase,
  initializeKnowledgeBase,
} from '../../server/knowledge/repoCache';
import {
  mockCalculatorData,
  mockSectionHistory,
  mockActivity,
  mockSessionMetrics,
  buildMockRequest,
} from '../../server/__tests__/fixtures/mockData';

// Mock database
vi.mock('../../server/db', () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue([
            {
              stepNumber: 1,
              stepName: 'permission',
              aiQuestion: 'do you mind if i ask a few questions?',
              userResponse: 'sure',
            },
          ])
        })
      })
    })
  }
}));

describe('Performance: Context Builder', () => {
  beforeAll(async () => {
    // Pre-warm cache
    await initializeKnowledgeBase();
  });

  describe('Individual Component Performance', () => {
    it('should enrich calculator data in <5ms', () => {
      const iterations = 1000;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        enrichCalculatorData(mockCalculatorData);
        times.push(performance.now() - start);
      }

      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const max = Math.max(...times);
      const min = Math.min(...times);

      console.log(`[Perf] enrichCalculatorData: avg=${avg.toFixed(3)}ms, min=${min.toFixed(3)}ms, max=${max.toFixed(3)}ms`);

      expect(avg).toBeLessThan(5);
    });

    it('should build calculator markdown in <10ms', () => {
      const iterations = 1000;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        buildCalculatorDataMarkdown(mockCalculatorData);
        times.push(performance.now() - start);
      }

      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const max = Math.max(...times);

      console.log(`[Perf] buildCalculatorDataMarkdown: avg=${avg.toFixed(3)}ms, max=${max.toFixed(3)}ms`);

      expect(avg).toBeLessThan(10);
    });

    it('should build section timing markdown in <15ms', () => {
      const iterations = 1000;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        buildSectionTimingMarkdown(mockSectionHistory);
        times.push(performance.now() - start);
      }

      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const max = Math.max(...times);

      console.log(`[Perf] buildSectionTimingMarkdown: avg=${avg.toFixed(3)}ms, max=${max.toFixed(3)}ms`);

      expect(avg).toBeLessThan(15);
    });

    it('should build activity history markdown in <20ms', () => {
      const iterations = 1000;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        buildActivityHistoryMarkdown(mockActivity, mockSessionMetrics);
        times.push(performance.now() - start);
      }

      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const max = Math.max(...times);

      console.log(`[Perf] buildActivityHistoryMarkdown: avg=${avg.toFixed(3)}ms, max=${max.toFixed(3)}ms`);

      expect(avg).toBeLessThan(20);
    });

    it('should build user metadata markdown in <5ms', () => {
      const req = buildMockRequest();
      const iterations = 1000;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        buildUserMetadataMarkdown({
          userName: 'Test User',
          userEmail: 'test@example.com',
          isLoggedIn: false,
          device: 'Desktop',
          browser: 'Chrome',
          ip: '192.168.1.1',
          timezone: 'America/Los_Angeles',
        });
        times.push(performance.now() - start);
      }

      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const max = Math.max(...times);

      console.log(`[Perf] buildUserMetadataMarkdown: avg=${avg.toFixed(3)}ms, max=${max.toFixed(3)}ms`);

      expect(avg).toBeLessThan(5);
    });

    it('should build session metrics in <5ms', () => {
      const iterations = 1000;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        buildSessionMetrics(mockSessionMetrics);
        times.push(performance.now() - start);
      }

      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const max = Math.max(...times);

      console.log(`[Perf] buildSessionMetrics: avg=${avg.toFixed(3)}ms, max=${max.toFixed(3)}ms`);

      expect(avg).toBeLessThan(5);
    });
  });

  describe('Unified Context Building Performance', () => {
    it('should build unified context in <50ms', async () => {
      const req = buildMockRequest();
      const iterations = 100;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        await buildUnifiedContext(
          req as any,
          {
            userName: 'Test User',
            userEmail: 'test@example.com',
          },
          'session-123',
          mockCalculatorData,
          mockSectionHistory,
          mockActivity,
          null,
          mockSessionMetrics
        );
        times.push(performance.now() - start);
      }

      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const max = Math.max(...times);
      const min = Math.min(...times);
      const p95 = times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)];

      console.log(`[Perf] buildUnifiedContext: avg=${avg.toFixed(3)}ms, min=${min.toFixed(3)}ms, max=${max.toFixed(3)}ms, p95=${p95.toFixed(3)}ms`);

      expect(avg).toBeLessThan(50);
      expect(p95).toBeLessThan(100); // 95th percentile under 100ms
    });

    it('should combine context markdown in <10ms', async () => {
      const req = buildMockRequest();
      const iterations = 1000;

      // Build context once
      const context = await buildUnifiedContext(
        req as any,
        {},
        'session-123',
        mockCalculatorData,
        mockSectionHistory,
        mockActivity,
        null,
        mockSessionMetrics
      );

      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        combineContextMarkdown(context);
        times.push(performance.now() - start);
      }

      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const max = Math.max(...times);

      console.log(`[Perf] combineContextMarkdown: avg=${avg.toFixed(3)}ms, max=${max.toFixed(3)}ms`);

      expect(avg).toBeLessThan(10);
    });

    it('should build context with all data in <100ms (p95)', async () => {
      const req = buildMockRequest();
      const iterations = 100;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();

        const context = await buildUnifiedContext(
          req as any,
          {
            userName: 'Test User',
            userEmail: 'test@example.com',
            timezone: 'America/Los_Angeles',
            currentPath: '/pricing',
            visitedPages: ['/', '/features', '/pricing'],
          },
          'session-perf-test',
          mockCalculatorData,
          mockSectionHistory,
          mockActivity,
          null,
          mockSessionMetrics
        );

        combineContextMarkdown(context);

        times.push(performance.now() - start);
      }

      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const p95 = times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)];
      const max = Math.max(...times);

      console.log(`[Perf] Full context build + combine: avg=${avg.toFixed(3)}ms, p95=${p95.toFixed(3)}ms, max=${max.toFixed(3)}ms`);

      expect(p95).toBeLessThan(100);
    });
  });

  describe('Knowledge Base Performance', () => {
    it('should return cached knowledge base in <10ms', async () => {
      const iterations = 100;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        await getStaticKnowledgeBase();
        times.push(performance.now() - start);
      }

      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const max = Math.max(...times);
      const min = Math.min(...times);

      console.log(`[Perf] getStaticKnowledgeBase (cached): avg=${avg.toFixed(3)}ms, min=${min.toFixed(3)}ms, max=${max.toFixed(3)}ms`);

      expect(avg).toBeLessThan(10);
      expect(max).toBeLessThan(20); // Even worst case should be fast
    });

    it('should access cached KB at high concurrency', async () => {
      const concurrentRequests = 50;
      const start = performance.now();

      // Fire 50 concurrent requests
      const promises = Array(concurrentRequests).fill(null).map(() =>
        getStaticKnowledgeBase()
      );

      await Promise.all(promises);

      const totalTime = performance.now() - start;
      const avgTime = totalTime / concurrentRequests;

      console.log(`[Perf] ${concurrentRequests} concurrent KB access: total=${totalTime.toFixed(3)}ms, avg=${avgTime.toFixed(3)}ms`);

      expect(avgTime).toBeLessThan(10);
    });
  });

  describe('Full Prompt Assembly Performance', () => {
    it('should assemble full prompt (KB + context) in <100ms', async () => {
      const req = buildMockRequest();
      const iterations = 50;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();

        // Build context
        const context = await buildUnifiedContext(
          req as any,
          {
            userName: 'Test User',
            userEmail: 'test@example.com',
          },
          'session-123',
          mockCalculatorData,
          mockSectionHistory,
          mockActivity,
          null,
          mockSessionMetrics
        );

        // Get KB
        const kb = await getStaticKnowledgeBase();

        // Combine
        const combinedContext = combineContextMarkdown(context);
        const fullPrompt = `${kb}\n\n---\n\n${combinedContext}`;

        times.push(performance.now() - start);
      }

      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const max = Math.max(...times);
      const p95 = times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)];

      console.log(`[Perf] Full prompt assembly: avg=${avg.toFixed(3)}ms, p95=${p95.toFixed(3)}ms, max=${max.toFixed(3)}ms`);

      expect(avg).toBeLessThan(100);
    });
  });

  describe('Scalability Tests', () => {
    it('should handle large activity history (100+ events) in <50ms', async () => {
      // Generate 100 activity events
      const largeActivity = Array(100).fill(null).map((_, i) => ({
        type: 'click' as const,
        target: `button-${i}`,
        value: `Action ${i}`,
        timestamp: new Date(Date.now() - i * 1000).toISOString(),
      }));

      const iterations = 50;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        buildActivityHistoryMarkdown(largeActivity, mockSessionMetrics);
        times.push(performance.now() - start);
      }

      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const max = Math.max(...times);

      console.log(`[Perf] 100 activity events: avg=${avg.toFixed(3)}ms, max=${max.toFixed(3)}ms`);

      expect(avg).toBeLessThan(50);
    });

    it('should handle large section history (20+ sections) in <30ms', async () => {
      // Generate 20 sections
      const largeSections = Array(20).fill(null).map((_, i) => ({
        id: `section-${i}`,
        title: `Section ${i}`,
        totalTimeSpent: Math.floor(Math.random() * 60000),
      }));

      const iterations = 50;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        buildSectionTimingMarkdown(largeSections);
        times.push(performance.now() - start);
      }

      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const max = Math.max(...times);

      console.log(`[Perf] 20 sections: avg=${avg.toFixed(3)}ms, max=${max.toFixed(3)}ms`);

      expect(avg).toBeLessThan(30);
    });
  });

  describe('Memory Efficiency', () => {
    it('should not leak memory on repeated context builds', async () => {
      const req = buildMockRequest();
      const iterations = 1000;

      const memBefore = process.memoryUsage().heapUsed;

      for (let i = 0; i < iterations; i++) {
        const context = await buildUnifiedContext(
          req as any,
          {},
          `session-${i}`,
          mockCalculatorData,
          mockSectionHistory,
          mockActivity,
          null,
          mockSessionMetrics
        );

        combineContextMarkdown(context);

        // Force GC every 100 iterations if available
        if (i % 100 === 0 && global.gc) {
          global.gc();
        }
      }

      const memAfter = process.memoryUsage().heapUsed;
      const memDiff = (memAfter - memBefore) / 1024 / 1024; // MB

      console.log(`[Perf] Memory after ${iterations} builds: ${memDiff.toFixed(2)}MB increase`);

      // Should not leak more than 50MB after 1000 iterations
      expect(memDiff).toBeLessThan(50);
    });
  });

  describe('Comparison: Old vs New', () => {
    it('should maintain similar or better performance than sequential building', async () => {
      const req = buildMockRequest();
      const iterations = 50;

      // New approach: unified context
      const newTimes: number[] = [];
      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        const context = await buildUnifiedContext(
          req as any,
          {},
          'session-123',
          mockCalculatorData,
          mockSectionHistory,
          mockActivity,
          null,
          mockSessionMetrics
        );
        combineContextMarkdown(context);
        newTimes.push(performance.now() - start);
      }

      // Old approach: sequential building (simulated)
      const oldTimes: number[] = [];
      for (let i = 0; i < iterations; i++) {
        const start = performance.now();

        // Simulate old sequential approach
        buildUserMetadataMarkdown({
          userName: 'Test',
          userEmail: 'test@test.com',
          isLoggedIn: false,
          device: 'Desktop',
          browser: 'Chrome',
          ip: '1.1.1.1',
        });
        buildCalculatorDataMarkdown(mockCalculatorData);
        buildSectionTimingMarkdown(mockSectionHistory);
        buildActivityHistoryMarkdown(mockActivity);
        buildSessionMetrics(mockSessionMetrics);
        await buildConversationMemoryMarkdown('session-123');

        oldTimes.push(performance.now() - start);
      }

      const newAvg = newTimes.reduce((a, b) => a + b, 0) / newTimes.length;
      const oldAvg = oldTimes.reduce((a, b) => a + b, 0) / oldTimes.length;
      const improvement = ((oldAvg - newAvg) / oldAvg) * 100;

      console.log(`[Perf] Old approach: ${oldAvg.toFixed(3)}ms`);
      console.log(`[Perf] New approach: ${newAvg.toFixed(3)}ms`);
      console.log(`[Perf] Difference: ${improvement.toFixed(1)}% ${improvement > 0 ? 'faster' : 'slower'}`);

      // Both should be reasonably fast (<100ms average)
      expect(newAvg).toBeLessThan(100);
      expect(oldAvg).toBeLessThan(100);
    });
  });
});
