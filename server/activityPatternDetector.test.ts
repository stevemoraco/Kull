/**
 * Tests for Activity Pattern Detection Engine
 */

import { describe, it, expect } from 'vitest';
import {
  detectActivityPatterns,
  calculatePurchaseIntent,
  formatPatternInsights,
  testHelpers,
  type ActivityEvent,
} from './activityPatternDetector';

describe('Activity Pattern Detector', () => {
  const now = new Date();
  const minuteAgo = new Date(now.getTime() - 60000);
  const twoMinutesAgo = new Date(now.getTime() - 120000);

  describe('detectRepeatedClicks', () => {
    it('should detect elements clicked multiple times', () => {
      const events: ActivityEvent[] = [
        { type: 'click', target: 'pricing', timestamp: twoMinutesAgo },
        { type: 'click', target: 'pricing', timestamp: minuteAgo },
        { type: 'click', target: 'pricing', timestamp: now },
        { type: 'click', target: 'calculator', timestamp: now },
      ];

      const repeated = testHelpers.detectRepeatedClicks(events);

      expect(repeated).toHaveLength(1);
      expect(repeated[0].element).toBe('pricing');
      expect(repeated[0].count).toBe(3);
    });

    it('should normalize target names', () => {
      const events: ActivityEvent[] = [
        { type: 'click', target: 'button-pricing', timestamp: twoMinutesAgo },
        { type: 'click', target: 'nav-pricing', timestamp: minuteAgo },
        { type: 'click', target: 'link-pricing-1', timestamp: now },
      ];

      const repeated = testHelpers.detectRepeatedClicks(events);

      expect(repeated).toHaveLength(1);
      expect(repeated[0].element).toBe('pricing');
      expect(repeated[0].count).toBe(3);
    });

    it('should filter out single clicks', () => {
      const events: ActivityEvent[] = [
        { type: 'click', target: 'pricing', timestamp: twoMinutesAgo },
        { type: 'click', target: 'features', timestamp: minuteAgo },
        { type: 'click', target: 'calculator', timestamp: now },
      ];

      const repeated = testHelpers.detectRepeatedClicks(events);

      expect(repeated).toHaveLength(0);
    });
  });

  describe('detectTopicsOfInterest', () => {
    it('should extract topics from targets', () => {
      const events: ActivityEvent[] = [
        { type: 'click', target: 'pricing-section', timestamp: twoMinutesAgo },
        { type: 'click', target: 'calculator-shoots', timestamp: minuteAgo },
        { type: 'click', target: 'pricing-download', timestamp: now },
      ];

      const topics = testHelpers.detectTopicsOfInterest(events);

      expect(topics).toContain('pricing');
      expect(topics).toContain('calculator');
    });

    it('should rank topics by frequency', () => {
      const events: ActivityEvent[] = [
        { type: 'click', target: 'pricing', timestamp: twoMinutesAgo },
        { type: 'click', target: 'pricing', timestamp: minuteAgo },
        { type: 'click', target: 'calculator', timestamp: now },
      ];

      const topics = testHelpers.detectTopicsOfInterest(events);

      expect(topics[0]).toBe('pricing'); // Most frequent should be first
    });
  });

  describe('detectHesitationSignals', () => {
    it('should detect calculator engagement without download', () => {
      const events: ActivityEvent[] = [
        { type: 'calculator_change', target: 'calculator', timestamp: twoMinutesAgo },
        { type: 'calculator_change', target: 'calculator', timestamp: minuteAgo },
        { type: 'calculator_change', target: 'calculator', timestamp: now },
        { type: 'calculator_change', target: 'calculator', timestamp: now },
      ];

      const signals = testHelpers.detectHesitationSignals(events);

      expect(signals.some(s => s.includes('calculator'))).toBe(true);
    });

    it('should detect pricing view without download', () => {
      const events: ActivityEvent[] = [
        { type: 'click', target: 'pricing', timestamp: twoMinutesAgo },
        { type: 'click', target: 'features', timestamp: now },
      ];

      const signals = testHelpers.detectHesitationSignals(events);

      expect(signals.some(s => s.includes('pricing'))).toBe(true);
    });

    it('should not flag hesitation if user downloads', () => {
      const events: ActivityEvent[] = [
        { type: 'calculator_change', target: 'calculator', timestamp: twoMinutesAgo },
        { type: 'click', target: 'pricing', timestamp: minuteAgo },
        { type: 'click', target: 'download', timestamp: now },
      ];

      const signals = testHelpers.detectHesitationSignals(events);

      expect(signals).toHaveLength(0);
    });
  });

  describe('calculatePurchaseIntent', () => {
    it('should give high score for calculator + pricing clicks', () => {
      const events: ActivityEvent[] = [
        { type: 'calculator_change', target: 'calculator', timestamp: twoMinutesAgo },
        { type: 'calculator_change', target: 'calculator', timestamp: minuteAgo },
        { type: 'click', target: 'pricing', timestamp: now },
        { type: 'click', target: 'download', timestamp: now },
      ];

      const intent = calculatePurchaseIntent(events);

      expect(intent).toBeGreaterThan(20); // 2 calculator changes (10) + 2 pricing/download clicks (20) = 30
    });

    it('should give low score for browsing only', () => {
      const events: ActivityEvent[] = [
        { type: 'click', target: 'about', timestamp: twoMinutesAgo },
        { type: 'click', target: 'contact', timestamp: now },
      ];

      const intent = calculatePurchaseIntent(events);

      expect(intent).toBeLessThan(20);
    });

    it('should cap score at 100', () => {
      const events: ActivityEvent[] = [];
      // Generate many high-intent events
      for (let i = 0; i < 50; i++) {
        events.push({ type: 'click', target: 'pricing', timestamp: now });
        events.push({ type: 'calculator_change', target: 'calculator', timestamp: now });
      }

      const intent = calculatePurchaseIntent(events);

      expect(intent).toBeLessThanOrEqual(100);
    });
  });

  describe('determineJourneyPhase', () => {
    it('should identify awareness phase for browsing', () => {
      const events: ActivityEvent[] = [
        { type: 'click', target: 'about', timestamp: twoMinutesAgo },
        { type: 'click', target: 'features', timestamp: now },
      ];

      const phase = testHelpers.determineJourneyPhase(events);

      expect(phase).toBe('awareness');
    });

    it('should identify consideration with calculator engagement', () => {
      const events: ActivityEvent[] = [
        { type: 'calculator_change', target: 'calculator', timestamp: twoMinutesAgo },
        { type: 'calculator_change', target: 'calculator', timestamp: now },
      ];

      const phase = testHelpers.determineJourneyPhase(events);

      expect(phase).toBe('consideration');
    });

    it('should identify decision with high intent', () => {
      const events: ActivityEvent[] = [
        // High intent: calculator + pricing + download - need 60+ intent score
        { type: 'calculator_change', target: 'calculator', timestamp: twoMinutesAgo },
        { type: 'calculator_change', target: 'calculator', timestamp: twoMinutesAgo },
        { type: 'calculator_change', target: 'calculator', timestamp: twoMinutesAgo },
        { type: 'calculator_change', target: 'calculator', timestamp: twoMinutesAgo },
        { type: 'calculator_change', target: 'calculator', timestamp: minuteAgo },
        { type: 'calculator_change', target: 'calculator', timestamp: minuteAgo },
        { type: 'click', target: 'pricing', timestamp: minuteAgo },
        { type: 'click', target: 'pricing', timestamp: minuteAgo },
        { type: 'click', target: 'download', timestamp: now },
        { type: 'click', target: 'testimonial', timestamp: now },
        { type: 'click', target: 'testimonial', timestamp: now },
        { type: 'click', target: 'features', timestamp: now },
      ];

      const phase = testHelpers.determineJourneyPhase(events);

      expect(phase).toBe('decision');
    });

    it('should identify abandonment with hesitation signals', () => {
      const events: ActivityEvent[] = [
        { type: 'calculator_change', target: 'calculator', timestamp: twoMinutesAgo },
        { type: 'calculator_change', target: 'calculator', timestamp: twoMinutesAgo },
        { type: 'calculator_change', target: 'calculator', timestamp: twoMinutesAgo },
        { type: 'calculator_change', target: 'calculator', timestamp: twoMinutesAgo },
        { type: 'hover', target: 'download', timestamp: minuteAgo },
        { type: 'hover', target: 'download', timestamp: minuteAgo },
        { type: 'hover', target: 'download', timestamp: minuteAgo },
        { type: 'click', target: 'pricing', timestamp: now },
      ];

      const phase = testHelpers.determineJourneyPhase(events);

      expect(phase).toBe('abandonment');
    });
  });

  describe('analyzeCalculatorEngagement', () => {
    it('should track calculator adjustments', () => {
      const events: ActivityEvent[] = [
        {
          type: 'calculator_change',
          target: 'calculator',
          timestamp: twoMinutesAgo,
          value: { shootsPerWeek: 2, hoursPerShoot: 8, billableRate: 150 },
        },
        {
          type: 'calculator_change',
          target: 'calculator',
          timestamp: minuteAgo,
          value: { shootsPerWeek: 3, hoursPerShoot: 8, billableRate: 150 },
        },
        {
          type: 'calculator_change',
          target: 'calculator',
          timestamp: now,
          value: { shootsPerWeek: 4, hoursPerShoot: 10, billableRate: 200 },
        },
      ];

      const engagement = testHelpers.analyzeCalculatorEngagement(events);

      expect(engagement.adjustmentCount).toBe(3);
      expect(engagement.finalValues.shootsPerWeek).toBe(4);
      expect(engagement.finalValues.billableRate).toBe(200);
      expect(engagement.timeSpent).toBeGreaterThan(0);
    });

    it('should handle no calculator engagement', () => {
      const events: ActivityEvent[] = [
        { type: 'click', target: 'pricing', timestamp: now },
      ];

      const engagement = testHelpers.analyzeCalculatorEngagement(events);

      expect(engagement.adjustmentCount).toBe(0);
      expect(engagement.timeSpent).toBe(0);
    });
  });

  describe('calculateTimeToValue', () => {
    it('should calculate time until first value interaction', () => {
      const events: ActivityEvent[] = [
        { type: 'click', target: 'home', timestamp: twoMinutesAgo },
        { type: 'click', target: 'about', timestamp: minuteAgo },
        { type: 'calculator_change', target: 'calculator', timestamp: now },
      ];

      const timeToValue = testHelpers.calculateTimeToValue(events);

      expect(timeToValue).toBeGreaterThan(60); // More than 1 minute
    });

    it('should handle immediate value interaction', () => {
      const events: ActivityEvent[] = [
        { type: 'calculator_change', target: 'calculator', timestamp: now },
      ];

      const timeToValue = testHelpers.calculateTimeToValue(events);

      expect(timeToValue).toBe(0);
    });
  });

  describe('detectActivityPatterns (integration)', () => {
    it('should detect all patterns from complex activity', () => {
      const events = [
        { type: 'click', target: 'home', timestamp: new Date('2025-01-01T10:00:00Z') },
        { type: 'click', target: 'pricing', timestamp: new Date('2025-01-01T10:01:00Z') },
        { type: 'calculator_change', target: 'calculator', timestamp: new Date('2025-01-01T10:02:00Z'), value: { shootsPerWeek: 2 } },
        { type: 'calculator_change', target: 'calculator', timestamp: new Date('2025-01-01T10:03:00Z'), value: { shootsPerWeek: 3 } },
        { type: 'click', target: 'pricing', timestamp: new Date('2025-01-01T10:04:00Z') },
        { type: 'click', target: 'testimonials', timestamp: new Date('2025-01-01T10:05:00Z') },
        { type: 'click', target: 'pricing', timestamp: new Date('2025-01-01T10:06:00Z') },
      ];

      const patterns = detectActivityPatterns(events);

      expect(patterns.repeatedClicks.length).toBeGreaterThan(0);
      expect(patterns.repeatedClicks[0].element).toBe('pricing');
      expect(patterns.topicsOfInterest).toContain('pricing');
      expect(patterns.topicsOfInterest).toContain('calculator');
      expect(patterns.purchaseIntent).toBeGreaterThan(30);
      expect(patterns.journeyPhase).toBe('consideration');
      expect(patterns.calculatorEngagement.adjustmentCount).toBe(2);
      expect(patterns.timeToValue).toBeGreaterThan(0);
    });

    it('should handle empty activity', () => {
      const patterns = detectActivityPatterns([]);

      expect(patterns.repeatedClicks).toHaveLength(0);
      expect(patterns.topicsOfInterest).toHaveLength(0);
      expect(patterns.purchaseIntent).toBe(0);
      expect(patterns.journeyPhase).toBe('awareness');
    });
  });

  describe('formatPatternInsights', () => {
    it('should format insights as markdown', () => {
      const patterns = detectActivityPatterns([
        { type: 'click', target: 'pricing', timestamp: twoMinutesAgo },
        { type: 'calculator_change', target: 'calculator', timestamp: minuteAgo, value: { shootsPerWeek: 3 } },
        { type: 'click', target: 'pricing', timestamp: now },
      ]);

      const markdown = formatPatternInsights(patterns);

      expect(markdown).toContain('BEHAVIORAL INTELLIGENCE');
      expect(markdown).toContain('Purchase Intent Score:');
      expect(markdown).toContain('Journey Phase:');
      expect(markdown).toContain('Recommended Approach:');
    });

    it('should include calculator data when available', () => {
      const patterns = detectActivityPatterns([
        {
          type: 'calculator_change',
          target: 'calculator',
          timestamp: now,
          value: { shootsPerWeek: 4, billableRate: 200 },
        },
      ]);

      const markdown = formatPatternInsights(patterns);

      expect(markdown).toContain('Calculator Engagement:');
      expect(markdown).toContain('Shoots/week: 4');
      expect(markdown).toContain('Billable rate: $200/hr');
    });

    it('should include hesitation signals when detected', () => {
      const patterns = detectActivityPatterns([
        { type: 'calculator_change', target: 'calculator', timestamp: twoMinutesAgo },
        { type: 'calculator_change', target: 'calculator', timestamp: minuteAgo },
        { type: 'calculator_change', target: 'calculator', timestamp: now },
        { type: 'calculator_change', target: 'calculator', timestamp: now },
      ]);

      const markdown = formatPatternInsights(patterns);

      expect(markdown).toContain('Abandonment Signals:');
    });
  });

  describe('getRecommendedApproach', () => {
    it('should recommend closing for high intent decision phase', () => {
      const patterns = detectActivityPatterns([
        // Add more high-intent events to reach decision phase - need 60+ intent score
        { type: 'calculator_change', target: 'calculator', timestamp: twoMinutesAgo },
        { type: 'calculator_change', target: 'calculator', timestamp: twoMinutesAgo },
        { type: 'calculator_change', target: 'calculator', timestamp: twoMinutesAgo },
        { type: 'calculator_change', target: 'calculator', timestamp: twoMinutesAgo },
        { type: 'calculator_change', target: 'calculator', timestamp: minuteAgo },
        { type: 'calculator_change', target: 'calculator', timestamp: minuteAgo },
        { type: 'click', target: 'pricing', timestamp: minuteAgo },
        { type: 'click', target: 'pricing', timestamp: minuteAgo },
        { type: 'click', target: 'download', timestamp: now },
        { type: 'click', target: 'testimonial', timestamp: now },
        { type: 'click', target: 'testimonial', timestamp: now },
        { type: 'click', target: 'features', timestamp: now },
      ]);

      const approach = testHelpers.getRecommendedApproach(patterns);

      expect(approach).toContain('CLOSE');
    });

    it('should recommend addressing pricing concerns for abandonment', () => {
      const patterns = detectActivityPatterns([
        { type: 'click', target: 'pricing', timestamp: twoMinutesAgo },
        { type: 'calculator_change', target: 'calculator', timestamp: twoMinutesAgo },
        { type: 'calculator_change', target: 'calculator', timestamp: twoMinutesAgo },
        { type: 'calculator_change', target: 'calculator', timestamp: minuteAgo },
        { type: 'calculator_change', target: 'calculator', timestamp: minuteAgo },
        { type: 'hover', target: 'download', timestamp: minuteAgo },
        { type: 'hover', target: 'download', timestamp: minuteAgo },
        { type: 'hover', target: 'download', timestamp: now },
      ]);

      const approach = testHelpers.getRecommendedApproach(patterns);

      // Should detect abandonment pattern
      expect(approach).toMatch(/ABANDONMENT|CALCULATOR|PRICING/);
    });

    it('should recommend discovery for awareness phase', () => {
      const patterns = detectActivityPatterns([
        { type: 'click', target: 'about', timestamp: now },
      ]);

      const approach = testHelpers.getRecommendedApproach(patterns);

      expect(approach).toContain('AWARENESS');
    });
  });
});
