/**
 * Tests for Repository Cache Module
 *
 * Verifies that the knowledge base cache system works correctly
 * and provides the expected performance benefits.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  getStaticKnowledgeBase,
  initializeKnowledgeBase,
  invalidateKnowledgeBase,
  getCacheStatus,
} from '../repoCache';

describe('Repository Cache', () => {
  beforeEach(() => {
    // Clear cache between tests
    invalidateKnowledgeBase();
  });

  it('should load knowledge base on first call', async () => {
    const startTime = Date.now();
    const knowledgeBase = await getStaticKnowledgeBase();
    const loadTime = Date.now() - startTime;

    expect(knowledgeBase).toBeDefined();
    expect(typeof knowledgeBase).toBe('string');
    expect(knowledgeBase.length).toBeGreaterThan(1000);
    expect(knowledgeBase).toContain('GITHUB_SOURCE_CODE');
    expect(knowledgeBase).toContain('BEHAVIORAL_PATTERN_DEFINITIONS');
    expect(knowledgeBase).toContain('SECTION_DEFINITIONS');
    expect(knowledgeBase).toContain('OBJECTION_PLAYBOOK');

    console.log(`First load took ${loadTime}ms`);
  });

  it('should return cached knowledge base on subsequent calls', async () => {
    // First call - loads from GitHub
    const firstStartTime = Date.now();
    const firstResult = await getStaticKnowledgeBase();
    const firstLoadTime = Date.now() - firstStartTime;

    // Second call - should return from cache instantly
    const secondStartTime = Date.now();
    const secondResult = await getStaticKnowledgeBase();
    const secondLoadTime = Date.now() - secondStartTime;

    expect(firstResult).toBe(secondResult); // Same reference
    expect(secondLoadTime).toBeLessThan(firstLoadTime); // Much faster
    expect(secondLoadTime).toBeLessThan(100); // < 100ms

    console.log(`First load: ${firstLoadTime}ms, Second load: ${secondLoadTime}ms`);
    console.log(`Speedup: ${Math.round(firstLoadTime / secondLoadTime)}x faster`);
  });

  it('should initialize knowledge base successfully', async () => {
    await initializeKnowledgeBase();

    const status = getCacheStatus();
    expect(status.isCached).toBe(true);
    expect(status.sizeKB).toBeGreaterThan(0);
    expect(status.timestamp).toBeDefined();
  });

  it('should invalidate cache correctly', async () => {
    // Load cache
    await getStaticKnowledgeBase();
    let status = getCacheStatus();
    expect(status.isCached).toBe(true);

    // Invalidate
    invalidateKnowledgeBase();
    status = getCacheStatus();
    expect(status.isCached).toBe(false);
    expect(status.sizeKB).toBeNull();
  });

  it('should report correct cache status', async () => {
    // Before loading
    let status = getCacheStatus();
    expect(status.isCached).toBe(false);
    expect(status.sizeKB).toBeNull();

    // After loading
    await getStaticKnowledgeBase();
    status = getCacheStatus();
    expect(status.isCached).toBe(true);
    expect(status.sizeKB).toBeGreaterThan(0);
    expect(status.timestamp).toBeDefined();

    console.log('Cache status:', status);
  });

  it('should include all required sections in knowledge base', async () => {
    const kb = await getStaticKnowledgeBase();

    // Check for behavioral patterns
    expect(kb).toContain('High Interest Signals');
    expect(kb).toContain('Medium Interest Signals');
    expect(kb).toContain('Low Interest / Skeptical Signals');
    expect(kb).toContain('Conversion-Ready Signals');
    expect(kb).toContain('Re-Engagement Needed Signals');

    // Check for section definitions
    expect(kb).toContain('Calculator Section');
    expect(kb).toContain('Features Section');
    expect(kb).toContain('Pricing Section');
    expect(kb).toContain('Testimonials Section');
    expect(kb).toContain('Problems Section');

    // Check for objection playbook
    expect(kb).toContain('It\'s too expensive');
    expect(kb).toContain('I need to think about it');
    expect(kb).toContain('I don\'t have time to learn new software');
    expect(kb).toContain('I\'m not sure if the AI is accurate enough');
    expect(kb).toContain('I already have a workflow that works');
  });

  it('should be performant for repeated calls', async () => {
    // Prime the cache
    await getStaticKnowledgeBase();

    // Measure 100 cached calls
    const startTime = Date.now();
    for (let i = 0; i < 100; i++) {
      await getStaticKnowledgeBase();
    }
    const totalTime = Date.now() - startTime;
    const avgTime = totalTime / 100;

    expect(avgTime).toBeLessThan(10); // < 10ms average per call
    console.log(`Average cached call time: ${avgTime.toFixed(2)}ms`);
  });
});
