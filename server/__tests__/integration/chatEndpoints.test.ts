/**
 * Integration Tests for Chat Context Building
 *
 * Tests the unified context architecture for both welcome and main chat endpoints
 *
 * NOTE: These tests verify the context building logic and intelligence layers,
 * ensuring all components work together correctly.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  mockSessionContext,
  mockCalculatorData,
  mockSectionHistory,
  mockActivity,
  mockHistory,
  mockRecentActivity,
  mockLoggedInUser,
  mockMobileContext,
  mockNoCalculatorData,
  mockMinimalSectionHistory,
  mockEmptyActivity,
  mockReEngagementScenario,
  mockHighVolumeCalculatorData,
  mockSessionMetrics,
} from '../fixtures/mockData';
import {
  buildUnifiedContext,
  buildUserMetadata,
  buildUserMetadataMarkdown,
  buildCalculatorDataMarkdown,
  buildSectionTimingMarkdown,
  buildActivityHistoryMarkdown,
  buildSessionMetrics,
  enrichCalculatorData,
  formatTime,
  combineContextMarkdown,
} from '../../contextBuilder';
import type { Request } from 'express';

// Mock database for conversation memory
vi.mock('../../db', () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue([])
        })
      })
    })
  }
}));

describe('Context Building Integration Tests', () => {
  const createMockRequest = (overrides: any = {}): Request => ({
    headers: {
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'cf-connecting-ip': '192.168.1.100',
      ...overrides.headers,
    },
    body: {},
    user: overrides.user || null,
    ...overrides,
  } as any as Request);

  describe('buildUnifiedContext - Complete Integration', () => {
    it('should build complete unified context with all layers', async () => {
      const req = createMockRequest();
      const context = await buildUnifiedContext(
        req,
        {
          userName: 'Test User',
          userEmail: 'test@example.com',
          timezone: 'America/Los_Angeles',
          currentPath: '/pricing',
          visitedPages: ['/', '/pricing'],
          recentActivity: mockActivity,
        },
        'session-123',
        mockCalculatorData,
        mockSectionHistory,
        mockActivity,
        null, // conversationState
        mockSessionMetrics
      );

      // Verify all context layers are present
      expect(context).toHaveProperty('userMetadata');
      expect(context).toHaveProperty('calculatorData');
      expect(context).toHaveProperty('sectionTiming');
      expect(context).toHaveProperty('activityHistory');
      expect(context).toHaveProperty('conversationMemory');
      expect(context).toHaveProperty('conversationState');
      expect(context).toHaveProperty('deviceFingerprint');
      expect(context).toHaveProperty('sessionMetrics');

      // Verify user metadata includes key info
      expect(context.userMetadata).toContain('Test User');
      expect(context.userMetadata).toContain('test@example.com');

      // Verify calculator data is present
      expect(context.calculatorData).toContain('Shoots per Week');
      expect(context.calculatorData).toContain('2'); // from mockCalculatorData

      // Verify section timing analysis
      expect(context.sectionTiming).toContain('Section Reading Time');
      expect(context.sectionTiming).toContain('ROI Calculator'); // top section in mock

      // Verify activity history
      expect(context.activityHistory).toContain('User Activity History');
    });

    it('should handle minimal context (no optional data)', async () => {
      const req = createMockRequest();
      const context = await buildUnifiedContext(
        req,
        {},
        null, // no sessionId
        null, // no calculatorData
        null, // no sectionHistory
        null, // no userActivity
        null, // no conversationState
        { timeOnSite: 5000 }
      );

      // Should still have basic layers
      expect(context.userMetadata).toBeTruthy();
      expect(context.sessionMetrics).toBeTruthy();
      expect(context.deviceFingerprint).toBeTruthy();

      // Optional layers should be empty strings
      expect(context.calculatorData).toBe('');
      expect(context.sectionTiming).toBe('');
    });

    it('should handle logged in user correctly', async () => {
      const req = createMockRequest({
        user: {
          claims: {
            sub: 'user-123',
            email: 'logged-in@example.com',
            name: 'Logged In User',
          },
        },
      });

      const context = await buildUnifiedContext(
        req,
        {},
        'session-456',
        null,
        null,
        null,
        null,
        { timeOnSite: 120000 }
      );

      expect(context.userMetadata).toContain('Logged In User');
      expect(context.userMetadata).toContain('logged-in@example.com');
      expect(context.userMetadata).toContain('🟢 Logged In');
    });

    it('should handle mobile device correctly', async () => {
      const req = createMockRequest({
        headers: {
          'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Safari/604.1',
        },
      });

      const metadata = buildUserMetadata(req, {});
      expect(metadata.device).toBe('Mobile');
      expect(metadata.browser).toBe('Safari');
    });

    it('should handle tablet device correctly', async () => {
      const req = createMockRequest({
        headers: {
          'user-agent': 'Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X) AppleWebKit/605.1.15',
        },
      });

      const metadata = buildUserMetadata(req, {});
      expect(metadata.device).toBe('Tablet');
    });
  });

  describe('Calculator Data Processing', () => {
    it('should enrich calculator data with computed values', () => {
      const enriched = enrichCalculatorData(mockCalculatorData);

      expect(enriched.annualShoots).toBe(88); // 2 shoots/week * 44 weeks
      expect(enriched.annualHours).toBe(352); // 88 shoots * 4 hours
      expect(enriched.annualCost).toBe(52800); // 352 hours * $150/hour
      expect(enriched.weeksSaved).toBeCloseTo(8.8); // 352 hours / 40 hours/week
    });

    it('should format calculator data markdown correctly', () => {
      const markdown = buildCalculatorDataMarkdown(mockCalculatorData);

      expect(markdown).toContain('## 💰 Calculator Data');
      expect(markdown).toContain('**Shoots per Week:** 2'); // Using markdown format
      expect(markdown).toContain('**Hours per Shoot (Culling):** 4');
      expect(markdown).toContain('**Billable Rate:** $150/hour');
      expect(markdown).toContain('**Annual Shoots:** 88 shoots/year');
      expect(markdown).toContain('**Annual Hours Wasted on Culling:** 352 hours/year');
    });

    it('should return empty string for null calculator data', () => {
      const markdown = buildCalculatorDataMarkdown(null);
      expect(markdown).toBe('');
    });

    it('should handle high-volume photographer data', () => {
      const enriched = enrichCalculatorData(mockHighVolumeCalculatorData);

      expect(enriched.annualShoots).toBe(264); // 6 shoots/week * 44 weeks
      expect(enriched.annualHours).toBe(792); // 264 shoots * 3 hours
      expect(enriched.annualCost).toBe(198000); // 792 hours * $250/hour
    });
  });

  describe('Section Timing Analysis', () => {
    it('should identify top section correctly', () => {
      const markdown = buildSectionTimingMarkdown(mockSectionHistory);

      expect(markdown).toContain('## ⏱️ Section Reading Time');
      expect(markdown).toContain('**ROI Calculator** - 45s (MOST INTERESTED)'); // Using markdown format
      expect(markdown).toContain('🎯 Key Insight');
    });

    it('should provide contextual recommendations', () => {
      const markdown = buildSectionTimingMarkdown(mockSectionHistory);

      expect(markdown).toContain('💡 Recommendation');
      expect(markdown).toContain('calculator');
    });

    it('should return empty string for null section history', () => {
      const markdown = buildSectionTimingMarkdown(null);
      expect(markdown).toBe('');
    });

    it('should return empty string for empty section history', () => {
      const markdown = buildSectionTimingMarkdown([]);
      expect(markdown).toBe('');
    });

    it('should sort sections by time spent', () => {
      const markdown = buildSectionTimingMarkdown(mockSectionHistory);

      // Calculator (45s) should be first
      const lines = markdown.split('\n');
      const firstSection = lines.find(l => l.match(/^1\./));
      expect(firstSection).toContain('ROI Calculator');
    });
  });

  describe('Activity History Processing', () => {
    it('should format activity history with all events', () => {
      const markdown = buildActivityHistoryMarkdown(mockActivity);

      expect(markdown).toContain('## 🖱️ User Activity History');
      expect(markdown).toContain('Total Clicks:');
      expect(markdown).toContain('Elements Hovered:');
    });

    it('should include recent activity when metrics provided', () => {
      const markdown = buildActivityHistoryMarkdown(mockActivity, mockSessionMetrics);

      expect(markdown).toContain('MOST RECENT ACTIVITY');
      expect(markdown).toContain('YOUR MISSION:');
    });

    it('should handle empty activity gracefully', () => {
      const markdown = buildActivityHistoryMarkdown([]);

      expect(markdown).toContain('No recent activity tracked');
    });

    it('should handle null activity gracefully', () => {
      const markdown = buildActivityHistoryMarkdown(null);

      expect(markdown).toContain('No recent activity tracked');
    });
  });

  describe('User Metadata Formatting', () => {
    it('should include all metadata fields', () => {
      const metadata = {
        userName: 'John Smith',
        userEmail: 'john@example.com',
        isLoggedIn: true,
        device: 'Desktop',
        browser: 'Chrome',
        ip: '192.168.1.100',
        timezone: 'America/Los_Angeles',
        currentPath: '/pricing',
        visitedPages: ['/', '/pricing', '/features'],
        recentActivity: [],
      };

      const markdown = buildUserMetadataMarkdown(metadata);

      expect(markdown).toContain('John Smith');
      expect(markdown).toContain('john@example.com');
      expect(markdown).toContain('🟢 Logged In');
      expect(markdown).toContain('Desktop');
      expect(markdown).toContain('Chrome');
      expect(markdown).toContain('192.168.1.100');
      expect(markdown).toContain('America/Los_Angeles');
      expect(markdown).toContain('/pricing');
      expect(markdown).toContain('/ → /pricing → /features');
    });

    it('should handle not logged in user', () => {
      const metadata = {
        userName: undefined,
        userEmail: undefined,
        isLoggedIn: false,
        device: 'Mobile',
        browser: 'Safari',
        ip: '203.0.113.42',
      };

      const markdown = buildUserMetadataMarkdown(metadata);

      expect(markdown).toContain('🔴 Not Logged In');
      expect(markdown).not.toContain('Name:');
      expect(markdown).not.toContain('Email:');
    });
  });

  describe('Session Metrics Formatting', () => {
    it('should format time on site correctly', () => {
      const metrics = {
        timeOnSite: 120000, // 2 minutes
      };

      const markdown = buildSessionMetrics(metrics);

      expect(markdown).toContain('2m 0s');
    });

    it('should handle seconds only', () => {
      const metrics = {
        timeOnSite: 45000, // 45 seconds
      };

      const markdown = buildSessionMetrics(metrics);

      expect(markdown).toContain('45s');
    });

    it('should include scroll depth when provided', () => {
      const metrics = {
        timeOnSite: 60000,
        scrollY: 1500,
        scrollDepth: 75,
      };

      const markdown = buildSessionMetrics(metrics);

      expect(markdown).toContain('**Scroll Position:** 1500px (75% down the page)'); // Using markdown format
    });

    it('should detect high engagement', () => {
      const metrics = {
        timeOnSite: 60000,
        scrollY: 2000,
        scrollDepth: 85,
      };

      const markdown = buildSessionMetrics(metrics);

      expect(markdown).toContain('🔥 Highly Engaged');
    });

    it('should detect early stage user', () => {
      const metrics = {
        timeOnSite: 5000,
        scrollY: 100,
        scrollDepth: 10,
      };

      const markdown = buildSessionMetrics(metrics);

      expect(markdown).toContain('⚠️ Early Stage');
    });
  });

  describe('Time Formatting Utility', () => {
    it('should format time correctly for minutes and seconds', () => {
      expect(formatTime(125000)).toBe('2m 5s');
      expect(formatTime(60000)).toBe('1m 0s');
      expect(formatTime(45000)).toBe('45s');
      expect(formatTime(0)).toBe('0s');
    });
  });

  describe('Combined Context Markdown', () => {
    it('should combine all context sections', async () => {
      const req = createMockRequest();
      const unifiedContext = await buildUnifiedContext(
        req,
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

      const combined = combineContextMarkdown(unifiedContext);

      // Should include all major sections
      expect(combined).toContain('👤 User Session Metadata');
      expect(combined).toContain('⏱️ Session Metrics');
      expect(combined).toContain('💰 Calculator Data');
      expect(combined).toContain('⏱️ Section Reading Time');
      expect(combined).toContain('🖱️ User Activity History');
    });

    it('should filter out empty sections', async () => {
      const req = createMockRequest();
      const unifiedContext = await buildUnifiedContext(
        req,
        {},
        null,
        null, // no calculator data
        null, // no section history
        null, // no activity
        null,
        { timeOnSite: 5000 }
      );

      const combined = combineContextMarkdown(unifiedContext);

      // Should not include empty sections
      expect(combined).not.toContain('💰 Calculator Data');
      expect(combined).not.toContain('⏱️ Section Reading Time');
    });
  });

  describe('IP Address Extraction', () => {
    it('should extract IP from cf-connecting-ip header', () => {
      const req = createMockRequest({
        headers: {
          'cf-connecting-ip': '203.0.113.42',
        },
      });

      const metadata = buildUserMetadata(req, {});
      expect(metadata.ip).toBe('203.0.113.42');
    });

    it('should fall back to x-forwarded-for header', () => {
      const req = createMockRequest({
        headers: {
          'x-forwarded-for': '198.51.100.42, 192.0.2.1',
        },
      });

      const metadata = buildUserMetadata(req, {});
      expect(metadata.ip).toBe('198.51.100.42'); // First IP in list
    });

    it('should fall back to x-real-ip header', () => {
      const req = createMockRequest({
        headers: {
          'x-real-ip': '192.0.2.100',
        },
      });

      const metadata = buildUserMetadata(req, {});
      expect(metadata.ip).toBe('192.0.2.100');
    });
  });

  describe('Browser Detection', () => {
    it('should detect Chrome', () => {
      const req = createMockRequest({
        headers: {
          'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });

      const metadata = buildUserMetadata(req, {});
      expect(metadata.browser).toBe('Chrome');
    });

    it('should detect Safari', () => {
      const req = createMockRequest({
        headers: {
          'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
        },
      });

      const metadata = buildUserMetadata(req, {});
      expect(metadata.browser).toBe('Safari');
    });

    it('should detect Firefox', () => {
      const req = createMockRequest({
        headers: {
          'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:120.0) Gecko/20100101 Firefox/120.0',
        },
      });

      const metadata = buildUserMetadata(req, {});
      expect(metadata.browser).toBe('Firefox');
    });

    it('should detect Edge', () => {
      const req = createMockRequest({
        headers: {
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
        },
      });

      const metadata = buildUserMetadata(req, {});
      expect(metadata.browser).toBe('Edge');
    });
  });

  describe('Real-World Scenarios', () => {
    it('should handle complete user journey with all context', async () => {
      // Simulate a user who has:
      // - Spent 2 minutes on site
      // - Used the calculator
      // - Read multiple sections
      // - Has recent activity
      // - Is logged in

      const req = createMockRequest({
        user: {
          claims: {
            sub: 'user-456',
            email: 'photographer@studio.com',
            name: 'Pro Photographer',
          },
        },
      });

      const context = await buildUnifiedContext(
        req,
        {
          userName: 'Pro Photographer',
          userEmail: 'photographer@studio.com',
          timezone: 'America/New_York',
          currentPath: '/pricing',
          visitedPages: ['/', '/features', '/pricing'],
        },
        'session-pro-1',
        mockHighVolumeCalculatorData, // High-volume photographer
        mockSectionHistory,
        mockActivity,
        null,
        {
          timeOnSite: 180000, // 3 minutes
          scrollY: 2000,
          scrollDepth: 85,
          currentTime: Date.now(),
          lastAiMessageTime: Date.now() - 30000, // 30s ago
        }
      );

      const combined = combineContextMarkdown(context);

      // Should have rich context
      expect(combined).toContain('Pro Photographer');
      expect(combined).toContain('photographer@studio.com');
      expect(combined).toContain('🟢 Logged In');
      expect(combined).toContain('6'); // shoots per week from mockHighVolumeCalculatorData
      expect(combined).toContain('ROI Calculator');
      expect(combined).toContain('🔥 Highly Engaged');
    });

    it('should handle brand new visitor with minimal context', async () => {
      // Simulate a user who just arrived (no history, no activity)

      const req = createMockRequest();

      const context = await buildUnifiedContext(
        req,
        {},
        null, // no session yet
        null, // hasn't used calculator
        mockMinimalSectionHistory, // just arrived at hero
        mockEmptyActivity, // no activity yet
        null,
        {
          timeOnSite: 5000, // Just 5 seconds
          scrollY: 0,
          scrollDepth: 5,
        }
      );

      const combined = combineContextMarkdown(context);

      // Should have minimal but valid context
      expect(combined).toContain('👤 User Session Metadata');
      expect(combined).toContain('⏱️ Session Metrics');
      expect(combined).toContain('5s'); // time on site
      expect(combined).toContain('⚠️ Early Stage');
    });
  });
});
