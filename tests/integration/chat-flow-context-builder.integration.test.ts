/**
 * E2E Tests: Chat Flow with Context Builder & Knowledge Base Integration
 *
 * This comprehensive test suite verifies that the Context Builder and Knowledge Base
 * caching work correctly in real production scenarios.
 *
 * Coverage:
 * 1. Context Builder Integration - All context sections included
 * 2. Knowledge Base Caching - Performance and correctness
 * 3. Full Chat Conversation Flow - Multi-turn state management
 * 4. Error Handling - Graceful degradation
 */

import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import http from 'http';
import {
  buildUnifiedContext,
  combineContextMarkdown,
  buildCalculatorDataMarkdown,
  buildSectionTimingMarkdown,
  buildActivityHistoryMarkdown,
  buildConversationMemoryMarkdown,
  type CalculatorData,
  type SectionHistoryItem,
  type ActivityEvent,
  type SessionMetrics,
} from '../../server/contextBuilder';
import {
  getStaticKnowledgeBase,
  getCacheStatus,
  initializeKnowledgeBase,
  invalidateKnowledgeBase,
} from '../../server/knowledge/repoCache';
import {
  mockCalculatorData,
  mockSectionHistory,
  mockActivity,
  mockSessionMetrics,
  buildMockRequest,
} from '../../server/__tests__/fixtures/mockData';

// Mock database for conversation memory
vi.mock('../../server/db', () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue([
            {
              stepNumber: 1,
              stepName: 'permission',
              aiQuestion: 'do you mind if i ask a few questions to figure out if you\'re a good fit for kull?',
              userResponse: 'sure, go ahead',
            },
            {
              stepNumber: 2,
              stepName: 'volume_validation',
              aiQuestion: 'awesome! i see you\'re doing about 88 shoots/year — is that accurate?',
              userResponse: 'yeah that\'s about right, maybe closer to 90',
            },
          ])
        })
      })
    })
  }
}));

describe('E2E: Chat Flow with Context Builder & Knowledge Base', () => {
  let app: Express;
  let server: http.Server;

  beforeAll(async () => {
    // Set required environment variables
    process.env.STRIPE_SECRET_KEY = 'sk_test_mock';
    process.env.STRIPE_PRICE_ANNUAL_SUBSCRIPTION = 'price_mock';
    process.env.STRIPE_PRICE_PAY_AS_YOU_GO = 'price_mock';
    process.env.OPENAI_API_KEY = 'sk-mock';

    // Initialize Knowledge Base before server starts
    console.log('[E2E Setup] Initializing Knowledge Base...');
    await initializeKnowledgeBase();

    // Create Express app (we'll use the context builder directly, not full routes)
    app = express();
    app.use(express.json());
  });

  afterAll(() => {
    vi.restoreAllMocks();
    if (server) {
      server.close();
    }
  });

  describe('Test Suite 1: Context Builder Integration', () => {
    it('should include all context sections in buildUnifiedContext', async () => {
      const req = buildMockRequest();
      const sessionId = 'test-session-123';

      const context = await buildUnifiedContext(
        req as any,
        {
          userName: 'Test User',
          userEmail: 'test@example.com',
          timezone: 'America/Los_Angeles',
          currentPath: '/pricing',
          visitedPages: ['/', '/pricing'],
        },
        sessionId,
        mockCalculatorData,
        mockSectionHistory,
        mockActivity,
        null, // conversationState
        mockSessionMetrics
      );

      // Verify all context sections are present
      expect(context).toHaveProperty('userMetadata');
      expect(context).toHaveProperty('calculatorData');
      expect(context).toHaveProperty('sectionTiming');
      expect(context).toHaveProperty('activityHistory');
      expect(context).toHaveProperty('conversationMemory');
      expect(context).toHaveProperty('conversationState');
      expect(context).toHaveProperty('deviceFingerprint');
      expect(context).toHaveProperty('sessionMetrics');

      // All sections should have content (not empty strings)
      expect(context.userMetadata.length).toBeGreaterThan(0);
      expect(context.calculatorData.length).toBeGreaterThan(0);
      expect(context.sectionTiming.length).toBeGreaterThan(0);
      expect(context.activityHistory.length).toBeGreaterThan(0);
      expect(context.sessionMetrics.length).toBeGreaterThan(0);
    });

    it('should include user metadata with correct information', async () => {
      const req = buildMockRequest();

      const context = await buildUnifiedContext(
        req as any,
        {
          userName: 'John Photographer',
          userEmail: 'john@studio.com',
          timezone: 'America/New_York',
          currentPath: '/pricing',
        },
        'session-456',
        null,
        null,
        null,
        null,
        { timeOnSite: 60000 }
      );

      expect(context.userMetadata).toContain('John Photographer');
      expect(context.userMetadata).toContain('john@studio.com');
      expect(context.userMetadata).toContain('America/New_York');
      expect(context.userMetadata).toContain('/pricing');
      expect(context.userMetadata).toContain('🔴 Not Logged In');
    });

    it('should include calculator data with computed metrics', async () => {
      const req = buildMockRequest();

      const context = await buildUnifiedContext(
        req as any,
        {},
        null,
        mockCalculatorData, // 2 shoots/week, 4 hours/shoot, $150/hour
        null,
        null,
        null,
        { timeOnSite: 30000 }
      );

      expect(context.calculatorData).toContain('Shoots per Week');
      expect(context.calculatorData).toContain('2');
      expect(context.calculatorData).toContain('4');
      expect(context.calculatorData).toContain('$150');
      expect(context.calculatorData).toContain('88 shoots/year'); // 2 * 44
      expect(context.calculatorData).toContain('352 hours/year'); // 2 * 4 * 44
    });

    it('should include all activity events (not filtered)', async () => {
      const req = buildMockRequest();

      // Mock activity has 7 events
      const activityMarkdown = buildActivityHistoryMarkdown(mockActivity, mockSessionMetrics);

      // Should include ALL events
      expect(activityMarkdown).toContain('Total Clicks:');
      expect(activityMarkdown).toContain('Elements Hovered:');
      expect(activityMarkdown).toContain('Input Events:');
      expect(activityMarkdown).toContain('Text Selections:');

      // Count event markers (each event should be numbered)
      const eventMatches = activityMarkdown.match(/^\d+\./gm);
      expect(eventMatches).toBeTruthy();
      expect(eventMatches!.length).toBe(mockActivity.length);
    });

    it('should include section timing sorted by time spent', async () => {
      const sectionMarkdown = buildSectionTimingMarkdown(mockSectionHistory);

      // ROI Calculator has most time (45s), should be first
      expect(sectionMarkdown).toContain('ROI Calculator');
      expect(sectionMarkdown).toContain('45s (MOST INTERESTED)');
      expect(sectionMarkdown).toContain('🎯 Key Insight');

      // Should include recommendation based on top section
      expect(sectionMarkdown).toContain('💡 Recommendation');
      expect(sectionMarkdown).toContain('calculator');
    });

    it('should include conversation memory from database', async () => {
      const memoryMarkdown = await buildConversationMemoryMarkdown('test-session-123');

      // Should have loaded 2 Q&A pairs from mock
      expect(memoryMarkdown).toContain('CONVERSATION MEMORY');
      expect(memoryMarkdown).toContain('permission'); // stepName, not "Step 1"
      expect(memoryMarkdown).toContain('volume_validation'); // stepName, not "Step 2"
      expect(memoryMarkdown).toContain('do you mind if i ask');
      expect(memoryMarkdown).toContain('sure, go ahead');
      expect(memoryMarkdown).toContain('88 shoots/year');
      expect(memoryMarkdown).toContain('CRITICAL MEMORY USAGE RULES');
    });

    it('should combine all context sections into unified markdown', async () => {
      const req = buildMockRequest();

      const context = await buildUnifiedContext(
        req as any,
        {
          userName: 'Test User',
          userEmail: 'test@example.com',
        },
        'session-789',
        mockCalculatorData,
        mockSectionHistory,
        mockActivity,
        null,
        mockSessionMetrics
      );

      const combined = combineContextMarkdown(context);

      // Should include all major section headers
      expect(combined).toContain('👤 User Session Metadata');
      expect(combined).toContain('⏱️ Session Metrics');
      expect(combined).toContain('💰 Calculator Data');
      expect(combined).toContain('⏱️ Section Reading Time');
      expect(combined).toContain('🖱️ User Activity History');
      expect(combined).toContain('🧠 CONVERSATION MEMORY');

      // Should be properly formatted markdown
      expect(combined).toContain('##');
      expect(combined).toContain('**');
      expect(combined).toContain('-');
    });
  });

  describe('Test Suite 2: Knowledge Base Caching', () => {
    it('should return cached knowledge base on subsequent calls', async () => {
      // First call
      const start1 = Date.now();
      const kb1 = await getStaticKnowledgeBase();
      const time1 = Date.now() - start1;

      // Second call (should be cached)
      const start2 = Date.now();
      const kb2 = await getStaticKnowledgeBase();
      const time2 = Date.now() - start2;

      // Both should return equivalent content (same length)
      expect(kb1.length).toBe(kb2.length);

      // Second call should be MUCH faster (<10ms)
      expect(time2).toBeLessThan(10);

      console.log(`[Cache Test] First call: ${time1}ms, Second call: ${time2}ms`);
    });

    it('should have knowledge base with reasonable size', async () => {
      const kb = await getStaticKnowledgeBase();

      // Test env can have minimal KB, prod has ~485KB
      const sizeKB = Math.round(kb.length / 1024);
      expect(sizeKB).toBeGreaterThan(5); // At least 5KB
      expect(sizeKB).toBeLessThan(600); // Less than 600KB

      console.log(`[Cache Test] Knowledge base size: ${sizeKB}KB`);
    });

    it('should return correct cache status', async () => {
      // Ensure cache is loaded
      await getStaticKnowledgeBase();

      const status = getCacheStatus();

      expect(status.isCached).toBe(true);
      expect(status.sizeKB).toBeGreaterThan(5); // At least 5KB
      expect(status.timestamp).toBeTruthy();
    });

    it('should invalidate and rebuild cache when requested', async () => {
      // Get current cache
      const kb1 = await getStaticKnowledgeBase();
      const status1 = getCacheStatus();
      expect(status1.isCached).toBe(true);

      // Invalidate cache
      invalidateKnowledgeBase();
      const status2 = getCacheStatus();
      expect(status2.isCached).toBe(false);

      // Next call should rebuild
      const kb2 = await getStaticKnowledgeBase();
      const status3 = getCacheStatus();
      expect(status3.isCached).toBe(true);

      // Content should be equivalent (rebuilds from same source)
      expect(kb1.length).toBe(kb2.length);
    });

    it('should include all required sections in knowledge base', async () => {
      const kb = await getStaticKnowledgeBase();

      // Should include GitHub source code
      expect(kb).toContain('GITHUB_SOURCE_CODE');

      // Should include behavioral patterns
      expect(kb).toContain('BEHAVIORAL PATTERN DEFINITIONS');
      expect(kb).toContain('High Interest Signals');
      expect(kb).toContain('Conversion-Ready Signals');

      // Should include section definitions
      expect(kb).toContain('SECTION DEFINITIONS');
      expect(kb).toContain('Calculator Section');
      expect(kb).toContain('Pricing Section');

      // Should include objection playbook
      expect(kb).toContain('OBJECTION PLAYBOOK');
      expect(kb).toContain('too expensive');
      expect(kb).toContain('need to think about it');

      // Should include metadata
      expect(kb).toContain('KNOWLEDGE BASE METADATA');
      expect(kb).toContain('github.com/stevemoraco/kull');
      expect(kb).toContain('kullai.com');
    });

    it('should return cached knowledge base in <10ms', async () => {
      // Warm up cache
      await getStaticKnowledgeBase();

      // Time multiple cached calls
      const times: number[] = [];
      for (let i = 0; i < 10; i++) {
        const start = Date.now();
        await getStaticKnowledgeBase();
        times.push(Date.now() - start);
      }

      // Average should be <10ms
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      expect(avg).toBeLessThan(10);

      console.log(`[Cache Perf] Average cached access time: ${avg.toFixed(2)}ms`);
      console.log(`[Cache Perf] Min: ${Math.min(...times)}ms, Max: ${Math.max(...times)}ms`);
    });
  });

  describe('Test Suite 3: Full Chat Conversation Flow', () => {
    it('should maintain conversation state across multiple turns', async () => {
      const req = buildMockRequest();
      const sessionId = 'multi-turn-session';

      // Turn 1: Initial greeting
      const context1 = await buildUnifiedContext(
        req as any,
        {},
        sessionId,
        null,
        null,
        null,
        null,
        { timeOnSite: 5000 }
      );

      expect(context1.conversationMemory).toContain('permission'); // stepName from mock data

      // Turn 2: After user fills calculator
      const context2 = await buildUnifiedContext(
        req as any,
        {},
        sessionId,
        mockCalculatorData,
        mockSectionHistory,
        null,
        null,
        { timeOnSite: 60000 }
      );

      // Should now have calculator data
      expect(context2.calculatorData).toContain('Shoots per Week');
      expect(context2.conversationMemory).toContain('volume_validation'); // stepName from mock data
    });

    it('should accumulate activity history across interactions', async () => {
      const req = buildMockRequest();

      // Start with no activity
      const context1 = await buildUnifiedContext(
        req as any,
        {},
        null,
        null,
        null,
        [],
        null,
        { timeOnSite: 5000 }
      );

      expect(context1.activityHistory).toContain('No recent activity tracked');

      // Add activity
      const context2 = await buildUnifiedContext(
        req as any,
        {},
        null,
        null,
        null,
        mockActivity,
        null,
        { timeOnSite: 120000 }
      );

      expect(context2.activityHistory).toContain('Total Clicks:');
      expect(context2.activityHistory).not.toContain('No recent activity');
    });

    it('should track section timing accumulation', async () => {
      const req = buildMockRequest();

      // Initial sections (short time)
      const initialSections: SectionHistoryItem[] = [
        { id: 'hero', title: 'Hero', totalTimeSpent: 5000 },
      ];

      const context1 = await buildUnifiedContext(
        req as any,
        {},
        null,
        null,
        initialSections,
        null,
        null,
        { timeOnSite: 5000 }
      );

      expect(context1.sectionTiming).toContain('Hero');

      // Updated sections (more time)
      const context2 = await buildUnifiedContext(
        req as any,
        {},
        null,
        null,
        mockSectionHistory, // Now includes calculator with 45s
        null,
        null,
        { timeOnSite: 120000 }
      );

      expect(context2.sectionTiming).toContain('ROI Calculator');
      expect(context2.sectionTiming).toContain('45s (MOST INTERESTED)');
    });

    it('should update session metrics as time progresses', async () => {
      const req = buildMockRequest();

      // Early stage (5 seconds)
      const context1 = await buildUnifiedContext(
        req as any,
        {},
        null,
        null,
        null,
        null,
        null,
        { timeOnSite: 5000, scrollDepth: 10, scrollY: 100 }
      );

      expect(context1.sessionMetrics).toContain('5s');
      expect(context1.sessionMetrics).toContain('Early Stage');

      // Highly engaged (2 minutes, deep scroll)
      const context2 = await buildUnifiedContext(
        req as any,
        {},
        null,
        null,
        null,
        null,
        null,
        { timeOnSite: 120000, scrollDepth: 85, scrollY: 2000 }
      );

      expect(context2.sessionMetrics).toContain('2m 0s');
      expect(context2.sessionMetrics).toContain('Highly Engaged');
    });
  });

  describe('Test Suite 4: Error Handling', () => {
    it('should handle missing calculator data gracefully', async () => {
      const req = buildMockRequest();

      const context = await buildUnifiedContext(
        req as any,
        {},
        null,
        null, // No calculator data
        mockSectionHistory,
        mockActivity,
        null,
        { timeOnSite: 60000 }
      );

      // Should have empty string for calculator data
      expect(context.calculatorData).toBe('');

      // But other sections should still work
      expect(context.sectionTiming).toContain('ROI Calculator');
      expect(context.activityHistory).toContain('Total Clicks');
    });

    it('should handle missing section history gracefully', async () => {
      const req = buildMockRequest();

      const context = await buildUnifiedContext(
        req as any,
        {},
        null,
        mockCalculatorData,
        null, // No section history
        mockActivity,
        null,
        { timeOnSite: 60000 }
      );

      // Should have empty string for section timing
      expect(context.sectionTiming).toBe('');

      // But other sections should still work
      expect(context.calculatorData).toContain('Shoots per Week');
      expect(context.activityHistory).toContain('Total Clicks');
    });

    it('should handle missing activity gracefully', async () => {
      const req = buildMockRequest();

      const context = await buildUnifiedContext(
        req as any,
        {},
        null,
        mockCalculatorData,
        mockSectionHistory,
        null, // No activity
        null,
        { timeOnSite: 60000 }
      );

      // Should show "no activity" message
      expect(context.activityHistory).toContain('No recent activity tracked');

      // But other sections should still work
      expect(context.calculatorData).toContain('Shoots per Week');
      expect(context.sectionTiming).toContain('ROI Calculator');
    });

    it('should handle database failure loading memory', async () => {
      // Mock database error
      const originalDb = vi.mocked((await import('../../server/db')).db);
      vi.mocked((await import('../../server/db')).db).select = vi.fn().mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const memoryMarkdown = await buildConversationMemoryMarkdown('failing-session');

      // Should return empty string on error (graceful degradation)
      expect(memoryMarkdown).toBe('');

      // Restore mock
      vi.mocked((await import('../../server/db')).db).select = originalDb.select;
    });

    it('should handle invalid session ID gracefully', async () => {
      const req = buildMockRequest();

      const context = await buildUnifiedContext(
        req as any,
        {},
        'non-existent-session', // Session doesn't exist
        mockCalculatorData,
        mockSectionHistory,
        mockActivity,
        null,
        { timeOnSite: 60000 }
      );

      // Should still build context successfully
      expect(context.calculatorData).toContain('Shoots per Week');
      expect(context.sectionTiming).toContain('ROI Calculator');

      // Conversation memory might be empty but shouldn't crash
      expect(context.conversationMemory).toBeDefined();
    });

    it('should handle empty arrays gracefully', async () => {
      const req = buildMockRequest();

      const context = await buildUnifiedContext(
        req as any,
        {},
        null,
        mockCalculatorData,
        [], // Empty section history
        [], // Empty activity
        null,
        { timeOnSite: 60000 }
      );

      // Empty sections should return empty strings
      expect(context.sectionTiming).toBe('');
      expect(context.activityHistory).toContain('No recent activity');

      // But calculator should still work
      expect(context.calculatorData).toContain('Shoots per Week');
    });

    it('should handle minimal data without crashing', async () => {
      const req = buildMockRequest();

      const context = await buildUnifiedContext(
        req as any,
        {}, // Empty body
        null, // No session
        null, // No calculator
        null, // No sections
        null, // No activity
        null, // No state
        { timeOnSite: 1000 } // Minimal metrics
      );

      // Should have basic metadata even with no data
      expect(context.userMetadata).toContain('User Session Metadata');
      expect(context.sessionMetrics).toContain('Session Metrics');
      expect(context.deviceFingerprint).toContain('Device Fingerprint');

      // Optional sections should be empty
      expect(context.calculatorData).toBe('');
      expect(context.sectionTiming).toBe('');
    });
  });

  describe('Test Suite 5: Integration with Knowledge Base', () => {
    it('should combine context with knowledge base for complete prompt', async () => {
      const req = buildMockRequest();

      // Build unified context
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

      // Get knowledge base
      const kb = await getStaticKnowledgeBase();

      // Combine into full prompt
      const combinedContext = combineContextMarkdown(context);
      const fullPrompt = `${kb}\n\n---\n\n${combinedContext}`;

      // Full prompt should have both static and dynamic content
      expect(fullPrompt).toContain('GITHUB_SOURCE_CODE'); // Static
      expect(fullPrompt).toContain('BEHAVIORAL PATTERN DEFINITIONS'); // Static
      expect(fullPrompt).toContain('Test User'); // Dynamic
      expect(fullPrompt).toContain('test@example.com'); // Dynamic
      expect(fullPrompt).toContain('Shoots per Week'); // Dynamic
      expect(fullPrompt).toContain('ROI Calculator'); // Dynamic

      // Should be sizable (test env has minimal KB, prod >500KB)
      const sizeKB = Math.round(fullPrompt.length / 1024);
      expect(sizeKB).toBeGreaterThan(5);

      console.log(`[Integration] Full prompt size: ${sizeKB}KB`);
    });
  });
});
