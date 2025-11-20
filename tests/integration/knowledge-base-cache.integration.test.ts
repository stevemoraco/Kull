/**
 * Integration Tests: Knowledge Base Caching System
 *
 * Tests the complete knowledge base caching system including:
 * - Initialization at server startup
 * - Cache hit/miss behavior
 * - Cache invalidation
 * - Content correctness
 * - Performance characteristics
 */

import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import {
  getStaticKnowledgeBase,
  getCacheStatus,
  initializeKnowledgeBase,
  invalidateKnowledgeBase,
} from '../../server/knowledge/repoCache';

describe('Integration: Knowledge Base Cache', () => {
  afterEach(() => {
    // Clean up after each test
    invalidateKnowledgeBase();
  });

  describe('Initialization', () => {
    it('should initialize knowledge base on first call', async () => {
      // Ensure cache is empty
      invalidateKnowledgeBase();
      const statusBefore = getCacheStatus();
      expect(statusBefore.isCached).toBe(false);

      // Initialize
      await initializeKnowledgeBase();

      // Check status after
      const statusAfter = getCacheStatus();
      expect(statusAfter.isCached).toBe(true);
      expect(statusAfter.sizeKB).toBeGreaterThan(0);
      expect(statusAfter.timestamp).toBeTruthy();
    });

    it('should not re-fetch if already initialized', async () => {
      // Initialize once
      await initializeKnowledgeBase();
      const status1 = getCacheStatus();

      // Initialize again
      await initializeKnowledgeBase();
      const status2 = getCacheStatus();

      // Should be same cache (same timestamp)
      expect(status1.timestamp).toBe(status2.timestamp);
    });

    it('should handle initialization errors gracefully', async () => {
      // Mock fetchRepoContent to fail
      vi.mock('../../server/fetchRepo', () => ({
        getRepoContent: vi.fn().mockRejectedValue(new Error('GitHub API error')),
      }));

      // Should not throw
      await expect(initializeKnowledgeBase()).resolves.not.toThrow();

      // Clean up mock
      vi.unmock('../../server/fetchRepo');
    });
  });

  describe('Cache Behavior', () => {
    it('should return cached content on subsequent calls', async () => {
      const kb1 = await getStaticKnowledgeBase();
      const kb2 = await getStaticKnowledgeBase();
      const kb3 = await getStaticKnowledgeBase();

      // All should be identical (same reference)
      expect(kb1).toBe(kb2);
      expect(kb2).toBe(kb3);
    });

    it('should track cache status correctly', async () => {
      // Before first call
      invalidateKnowledgeBase();
      const status1 = getCacheStatus();
      expect(status1.isCached).toBe(false);
      expect(status1.sizeKB).toBeNull();

      // After first call
      await getStaticKnowledgeBase();
      const status2 = getCacheStatus();
      expect(status2.isCached).toBe(true);
      expect(status2.sizeKB).toBeGreaterThan(30); // At least 30KB
      expect(status2.timestamp).toBeTruthy();
    });

    it('should invalidate cache when requested', async () => {
      // Load cache
      await getStaticKnowledgeBase();
      expect(getCacheStatus().isCached).toBe(true);

      // Invalidate
      invalidateKnowledgeBase();
      expect(getCacheStatus().isCached).toBe(false);

      // Next call should rebuild
      const kb = await getStaticKnowledgeBase();
      expect(kb).toBeTruthy();
      expect(getCacheStatus().isCached).toBe(true);
    });

    it('should return same content after invalidation and rebuild', async () => {
      const kb1 = await getStaticKnowledgeBase();

      invalidateKnowledgeBase();

      const kb2 = await getStaticKnowledgeBase();

      // Content should be equivalent (rebuilds from same source)
      // Note: May have different timestamps, so check length equality
      expect(kb1.length).toBe(kb2.length);
      expect(kb1).toContain('GITHUB_SOURCE_CODE');
      expect(kb2).toContain('GITHUB_SOURCE_CODE');
    });
  });

  describe('Content Validation', () => {
    it('should include GitHub source code section', async () => {
      const kb = await getStaticKnowledgeBase();

      expect(kb).toContain('<GITHUB_SOURCE_CODE>');
      expect(kb).toContain('</GITHUB_SOURCE_CODE>');
    });

    it('should include behavioral patterns section', async () => {
      const kb = await getStaticKnowledgeBase();

      expect(kb).toContain('BEHAVIORAL PATTERN DEFINITIONS');
      expect(kb).toContain('High Interest Signals');
      expect(kb).toContain('Medium Interest Signals');
      expect(kb).toContain('Low Interest / Skeptical Signals');
      expect(kb).toContain('Conversion-Ready Signals');
      expect(kb).toContain('Re-Engagement Needed Signals');
    });

    it('should include section definitions', async () => {
      const kb = await getStaticKnowledgeBase();

      expect(kb).toContain('SECTION DEFINITIONS');
      expect(kb).toContain('Calculator Section');
      expect(kb).toContain('Features Section');
      expect(kb).toContain('Pricing Section');
      expect(kb).toContain('Testimonials Section');
      expect(kb).toContain('Problems Section');
    });

    it('should include objection playbook', async () => {
      const kb = await getStaticKnowledgeBase();

      expect(kb).toContain('OBJECTION PLAYBOOK');

      // Check for common objections (case-insensitive)
      const objections = [
        'too expensive',
        'need to think about it',
        'don\'t have time to learn',
        'already have a workflow',
        'cancel anytime',
        'existing lightroom workflow',
        'fine with manual culling',
        'talk to my partner',
        'not ready yet',
      ];

      const kbLowercase = kb.toLowerCase();
      objections.forEach(objection => {
        expect(kbLowercase).toContain(objection);
      });
    });

    it('should include metadata section', async () => {
      const kb = await getStaticKnowledgeBase();

      expect(kb).toContain('KNOWLEDGE BASE METADATA');
      expect(kb).toContain('github.com/stevemoraco/kull');
      expect(kb).toContain('kullai.com');
      expect(kb).toContain('Content size:');
      expect(kb).toContain('Total knowledge base size:');
    });

    it('should have expected content size', async () => {
      const kb = await getStaticKnowledgeBase();

      const sizeKB = Math.round(kb.length / 1024);

      // In test environment, KB is smaller (around 39KB)
      // In production with full repo, it's around 485KB
      expect(sizeKB).toBeGreaterThan(30); // At least 30KB
      expect(sizeKB).toBeLessThan(600); // Less than 600KB

      console.log(`[KB Content] Size: ${sizeKB}KB`);
    });

    it('should be valid markdown format', async () => {
      const kb = await getStaticKnowledgeBase();

      // Should have markdown headers
      expect(kb).toContain('**');
      expect(kb).toContain('##');

      // Should have proper structure
      expect(kb).toContain('\n\n'); // Paragraph breaks
      expect(kb).toContain('- '); // List items
    });
  });

  describe('Performance Characteristics', () => {
    it('should load cache in reasonable time on first call', async () => {
      invalidateKnowledgeBase();

      const start = performance.now();
      await getStaticKnowledgeBase();
      const loadTime = performance.now() - start;

      console.log(`[KB Perf] First load time: ${loadTime.toFixed(2)}ms`);

      // First load may take longer (needs to fetch from GitHub)
      // But should be under 5 seconds in test environment
      expect(loadTime).toBeLessThan(5000);
    });

    it('should return cached content in <10ms', async () => {
      // Warm cache
      await getStaticKnowledgeBase();

      // Measure cached access
      const iterations = 100;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        await getStaticKnowledgeBase();
        times.push(performance.now() - start);
      }

      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const max = Math.max(...times);

      console.log(`[KB Perf] Cached access: avg=${avg.toFixed(3)}ms, max=${max.toFixed(3)}ms`);

      expect(avg).toBeLessThan(10);
    });

    it('should handle concurrent access efficiently', async () => {
      // Warm cache
      await getStaticKnowledgeBase();

      // Fire 50 concurrent requests
      const concurrentRequests = 50;
      const start = performance.now();

      await Promise.all(
        Array(concurrentRequests).fill(null).map(() => getStaticKnowledgeBase())
      );

      const totalTime = performance.now() - start;
      const avgTime = totalTime / concurrentRequests;

      console.log(`[KB Perf] ${concurrentRequests} concurrent: total=${totalTime.toFixed(2)}ms, avg=${avgTime.toFixed(3)}ms`);

      // Should handle concurrency without significant slowdown
      expect(avgTime).toBeLessThan(15);
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid invalidation and reloading', async () => {
      for (let i = 0; i < 5; i++) {
        await getStaticKnowledgeBase();
        expect(getCacheStatus().isCached).toBe(true);

        invalidateKnowledgeBase();
        expect(getCacheStatus().isCached).toBe(false);
      }

      // Final state should be valid
      const kb = await getStaticKnowledgeBase();
      expect(kb).toBeTruthy();
      expect(getCacheStatus().isCached).toBe(true);
    });

    it('should handle multiple concurrent invalidations', async () => {
      await getStaticKnowledgeBase();

      // Invalidate multiple times concurrently (should be idempotent)
      invalidateKnowledgeBase();
      invalidateKnowledgeBase();
      invalidateKnowledgeBase();

      const status = getCacheStatus();
      expect(status.isCached).toBe(false);
    });

    it('should return consistent content across multiple initializations', async () => {
      const kb1 = await getStaticKnowledgeBase();
      invalidateKnowledgeBase();

      const kb2 = await getStaticKnowledgeBase();
      invalidateKnowledgeBase();

      const kb3 = await getStaticKnowledgeBase();

      // All should be consistent (same length, same sections)
      expect(kb1.length).toBe(kb2.length);
      expect(kb2.length).toBe(kb3.length);
      expect(kb1).toContain('BEHAVIORAL PATTERN DEFINITIONS');
      expect(kb2).toContain('BEHAVIORAL PATTERN DEFINITIONS');
      expect(kb3).toContain('BEHAVIORAL PATTERN DEFINITIONS');
    });
  });

  describe('Real-World Usage Patterns', () => {
    it('should simulate server startup initialization', async () => {
      // Simulate server starting with empty cache
      invalidateKnowledgeBase();

      console.log('[Simulation] Server starting...');
      const startupStart = performance.now();

      await initializeKnowledgeBase();

      const startupTime = performance.now() - startupStart;
      console.log(`[Simulation] Server startup complete in ${startupTime.toFixed(2)}ms`);

      // Should be initialized
      const status = getCacheStatus();
      expect(status.isCached).toBe(true);
    });

    it('should simulate 100 sequential chat requests', async () => {
      // Initialize cache
      await initializeKnowledgeBase();

      const requestTimes: number[] = [];

      for (let i = 0; i < 100; i++) {
        const start = performance.now();
        const kb = await getStaticKnowledgeBase();
        requestTimes.push(performance.now() - start);

        expect(kb).toBeTruthy();
      }

      const avg = requestTimes.reduce((a, b) => a + b, 0) / requestTimes.length;
      const max = Math.max(...requestTimes);

      console.log(`[Simulation] 100 requests: avg=${avg.toFixed(3)}ms, max=${max.toFixed(3)}ms`);

      // All should be fast (cached)
      expect(avg).toBeLessThan(10);
    });

    it('should simulate cache warming before production traffic', async () => {
      // Simulate pre-warming cache before deployment
      invalidateKnowledgeBase();

      const warmStart = performance.now();
      await initializeKnowledgeBase();
      const warmTime = performance.now() - warmStart;

      console.log(`[Simulation] Cache warmed in ${warmTime.toFixed(2)}ms`);

      // Verify ready for production
      const status = getCacheStatus();
      expect(status.isCached).toBe(true);
      expect(status.sizeKB).toBeGreaterThan(30);

      // First production request should be instant
      const requestStart = performance.now();
      await getStaticKnowledgeBase();
      const requestTime = performance.now() - requestStart;

      expect(requestTime).toBeLessThan(10);
    });
  });

  describe('Integration with Context Builder', () => {
    it('should be usable alongside context building', async () => {
      // Simulate building a complete prompt
      const kb = await getStaticKnowledgeBase();

      // Mock dynamic context
      const dynamicContext = `
## User Metadata
- Name: Test User
- Email: test@example.com

## Calculator Data
- Shoots per week: 2
- Hours per shoot: 4
`;

      const fullPrompt = `${kb}\n\n---\n\n${dynamicContext}`;

      // Should be properly combined
      expect(fullPrompt).toContain('GITHUB_SOURCE_CODE');
      expect(fullPrompt).toContain('BEHAVIORAL PATTERN');
      expect(fullPrompt).toContain('Test User');
      expect(fullPrompt).toContain('Shoots per week');

      // Should be sizable (>30KB in test env, >500KB in prod)
      const sizeKB = Math.round(fullPrompt.length / 1024);
      expect(sizeKB).toBeGreaterThan(30);
    });
  });

  describe('Memory Management', () => {
    it('should not leak memory on repeated cache access', async () => {
      await initializeKnowledgeBase();

      const memBefore = process.memoryUsage().heapUsed;

      // Access cache 1000 times
      for (let i = 0; i < 1000; i++) {
        await getStaticKnowledgeBase();

        if (i % 100 === 0 && global.gc) {
          global.gc();
        }
      }

      const memAfter = process.memoryUsage().heapUsed;
      const memDiff = (memAfter - memBefore) / 1024 / 1024; // MB

      console.log(`[Memory] After 1000 cache accesses: ${memDiff.toFixed(2)}MB increase`);

      // Should not leak (cache is reused, not duplicated)
      expect(memDiff).toBeLessThan(10);
    });
  });
});
