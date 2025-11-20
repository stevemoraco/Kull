// Quick validation tests for contextBuilder
// Run with: npm test -- contextBuilder.test.ts

import { describe, it, expect } from 'vitest';
import {
  enrichCalculatorData,
  formatTime,
  buildUserMetadataMarkdown,
  buildCalculatorDataMarkdown,
  buildSessionMetrics,
  combineContextMarkdown,
  type CalculatorData,
  type UserMetadata,
  type SessionMetrics,
  type UnifiedContext
} from './contextBuilder';

describe('contextBuilder - Helper Functions', () => {
  describe('enrichCalculatorData', () => {
    it('calculates annual metrics correctly', () => {
      const input: CalculatorData = {
        shootsPerWeek: 4,
        hoursPerShoot: 2,
        billableRate: 100,
        hasManuallyAdjusted: true,
        hasClickedPreset: false
      };

      const result = enrichCalculatorData(input);

      expect(result.annualShoots).toBe(176); // 4 * 44
      expect(result.annualHours).toBe(352); // 4 * 2 * 44
      expect(result.annualCost).toBe(35200); // 352 * 100
      expect(result.weeksSaved).toBe(8.8); // 352 / 40
    });

    it('preserves original data', () => {
      const input: CalculatorData = {
        shootsPerWeek: 3,
        hoursPerShoot: 1.5,
        billableRate: 150,
        hasManuallyAdjusted: false,
        hasClickedPreset: true
      };

      const result = enrichCalculatorData(input);

      expect(result.shootsPerWeek).toBe(3);
      expect(result.hoursPerShoot).toBe(1.5);
      expect(result.billableRate).toBe(150);
      expect(result.hasManuallyAdjusted).toBe(false);
      expect(result.hasClickedPreset).toBe(true);
    });
  });

  describe('formatTime', () => {
    it('formats minutes and seconds', () => {
      expect(formatTime(65000)).toBe('1m 5s');
      expect(formatTime(125000)).toBe('2m 5s');
      expect(formatTime(3600000)).toBe('60m 0s');
    });

    it('formats seconds only', () => {
      expect(formatTime(45000)).toBe('45s');
      expect(formatTime(5000)).toBe('5s');
      expect(formatTime(59000)).toBe('59s');
    });

    it('handles zero', () => {
      expect(formatTime(0)).toBe('0s');
    });

    it('rounds down to nearest second', () => {
      expect(formatTime(5999)).toBe('5s');
      expect(formatTime(65999)).toBe('1m 5s');
    });
  });
});

describe('contextBuilder - Markdown Builders', () => {
  describe('buildUserMetadataMarkdown', () => {
    it('includes all metadata fields', () => {
      const metadata: UserMetadata = {
        userName: 'John Doe',
        userEmail: 'john@example.com',
        isLoggedIn: true,
        device: 'Desktop',
        browser: 'Chrome',
        ip: '192.168.1.1',
        timezone: 'America/New_York',
        currentPath: '/calculator',
        visitedPages: ['/', '/features', '/pricing'],
        recentActivity: [
          { action: 'click', target: '#calculator' },
          { action: 'input', target: 'shootsPerWeek' }
        ]
      };

      const markdown = buildUserMetadataMarkdown(metadata);

      expect(markdown).toContain('## 👤 User Session Metadata');
      expect(markdown).toContain('John Doe');
      expect(markdown).toContain('john@example.com');
      expect(markdown).toContain('🟢 Logged In');
      expect(markdown).toContain('Desktop');
      expect(markdown).toContain('Chrome');
      expect(markdown).toContain('192.168.1.1');
      expect(markdown).toContain('America/New_York');
      expect(markdown).toContain('/calculator');
      expect(markdown).toContain('/ → /features → /pricing');
    });

    it('handles logged out user', () => {
      const metadata: UserMetadata = {
        isLoggedIn: false,
        device: 'Mobile',
        browser: 'Safari',
        ip: '10.0.0.1'
      };

      const markdown = buildUserMetadataMarkdown(metadata);

      expect(markdown).toContain('🔴 Not Logged In');
      expect(markdown).not.toContain('Name:');
      expect(markdown).not.toContain('Email:');
    });
  });

  describe('buildCalculatorDataMarkdown', () => {
    it('includes enriched calculations', () => {
      const data: CalculatorData = {
        shootsPerWeek: 4,
        hoursPerShoot: 2,
        billableRate: 100,
        hasManuallyAdjusted: true,
        hasClickedPreset: false
      };

      const markdown = buildCalculatorDataMarkdown(data);

      expect(markdown).toContain('## 💰 Calculator Data');
      expect(markdown).toContain('Shoots per Week:** 4');
      expect(markdown).toContain('Hours per Shoot (Culling):** 2');
      expect(markdown).toContain('Billable Rate:** $100/hour');
      expect(markdown).toContain('Annual Shoots:** 176');
      expect(markdown).toContain('Annual Hours Wasted on Culling:** 352');
      expect(markdown).toContain('Annual Cost of Manual Culling:** $35,200');
      expect(markdown).toContain('Work Weeks Saved:** 8.8');
      expect(markdown).toContain('Has Manually Adjusted:** Yes');
      expect(markdown).toContain('Has Clicked Preset:** No');
    });

    it('returns empty string for null data', () => {
      const markdown = buildCalculatorDataMarkdown(null);
      expect(markdown).toBe('');
    });
  });

  describe('buildSessionMetrics', () => {
    it('formats session metrics', () => {
      const metrics: SessionMetrics = {
        timeOnSite: 135000, // 2m 15s
        scrollY: 2400,
        scrollDepth: 75
      };

      const markdown = buildSessionMetrics(metrics);

      expect(markdown).toContain('## ⏱️ Session Metrics');
      expect(markdown).toContain('Time on Site:** 2m 15s');
      expect(markdown).toContain('Scroll Position:** 2400px (75% down the page)');
      expect(markdown).toContain('🔥 Highly Engaged');
    });

    it('marks early stage users', () => {
      const metrics: SessionMetrics = {
        timeOnSite: 15000,
        scrollY: 100,
        scrollDepth: 10
      };

      const markdown = buildSessionMetrics(metrics);

      expect(markdown).toContain('⚠️ Early Stage');
      expect(markdown).not.toContain('🔥 Highly Engaged');
    });

    it('handles missing scroll data', () => {
      const metrics: SessionMetrics = {
        timeOnSite: 60000
      };

      const markdown = buildSessionMetrics(metrics);

      expect(markdown).toContain('Time on Site:** 1m 0s');
      expect(markdown).not.toContain('Scroll Position');
    });
  });
});

describe('contextBuilder - Integration', () => {
  describe('combineContextMarkdown', () => {
    it('combines all context sections', () => {
      const context: UnifiedContext = {
        userMetadata: '## 👤 User Session Metadata\n- Device: Desktop',
        calculatorData: '## 💰 Calculator Data\n- Annual Shoots: 176',
        sectionTiming: '## ⏱️ Section Reading Time\n1. Calculator - 2m 15s',
        activityHistory: '## 🖱️ User Activity History\n1. Clicked #calculator',
        conversationMemory: '## 🧠 CONVERSATION MEMORY\nStep 1: ...',
        conversationState: '## 📊 Conversation State\nStep: 3/16',
        deviceFingerprint: '## 🔐 Device Fingerprint\nID: abc123',
        sessionMetrics: '## ⏱️ Session Metrics\nTime on Site: 2m 15s'
      };

      const combined = combineContextMarkdown(context);

      expect(combined).toContain('👤 User Session Metadata');
      expect(combined).toContain('💰 Calculator Data');
      expect(combined).toContain('⏱️ Section Reading Time');
      expect(combined).toContain('🖱️ User Activity History');
      expect(combined).toContain('🧠 CONVERSATION MEMORY');
      expect(combined).toContain('📊 Conversation State');
      expect(combined).toContain('🔐 Device Fingerprint');
      expect(combined).toContain('⏱️ Session Metrics');
    });

    it('filters out empty sections', () => {
      const context: UnifiedContext = {
        userMetadata: '## 👤 User Session Metadata\n- Device: Desktop',
        calculatorData: '',
        sectionTiming: '',
        activityHistory: '## 🖱️ User Activity History\n1. Clicked #calculator',
        conversationMemory: '',
        conversationState: '',
        deviceFingerprint: '## 🔐 Device Fingerprint\nID: abc123',
        sessionMetrics: '## ⏱️ Session Metrics\nTime on Site: 2m 15s'
      };

      const combined = combineContextMarkdown(context);

      expect(combined).toContain('👤 User Session Metadata');
      expect(combined).toContain('🖱️ User Activity History');
      expect(combined).toContain('🔐 Device Fingerprint');
      expect(combined).toContain('⏱️ Session Metrics');
      expect(combined).not.toContain('💰 Calculator Data');
      expect(combined).not.toContain('🧠 CONVERSATION MEMORY');
    });
  });
});
