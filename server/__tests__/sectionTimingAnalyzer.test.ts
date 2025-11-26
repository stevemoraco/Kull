import { describe, it, expect } from 'vitest';
import {
  analyzeSectionTiming,
  formatSectionInsights,
  getSectionTimingSummary,
  SectionHistoryItem,
  SectionInsights,
} from '../sectionTimingAnalyzer';

describe('sectionTimingAnalyzer', () => {
  describe('analyzeSectionTiming', () => {
    it('should return null for empty section history', () => {
      const result = analyzeSectionTiming([]);
      expect(result).toBeNull();
    });

    it('should identify top section correctly', () => {
      const sections: SectionHistoryItem[] = [
        { id: 'hero', title: 'Hero Section', totalTimeSpent: 5000 },
        { id: 'calculator', title: 'ROI Calculator', totalTimeSpent: 45000 },
        { id: 'pricing', title: 'Pricing', totalTimeSpent: 20000 },
      ];

      const result = analyzeSectionTiming(sections);

      expect(result).not.toBeNull();
      expect(result!.topSection.id).toBe('calculator');
      expect(result!.topSection.title).toBe('ROI Calculator');
      expect(result!.topSection.timeSpent).toBe(45000);
    });

    it('should detect "focused" reading pattern when one section dominates', () => {
      const sections: SectionHistoryItem[] = [
        { id: 'calculator', title: 'Calculator', totalTimeSpent: 90000 }, // 90s - 90% of total
        { id: 'hero', title: 'Hero', totalTimeSpent: 5000 }, // 5s
        { id: 'pricing', title: 'Pricing', totalTimeSpent: 5000 }, // 5s
      ];

      const result = analyzeSectionTiming(sections);

      expect(result).not.toBeNull();
      expect(result!.readingPattern).toBe('focused');
    });

    it('should detect "scanner" reading pattern when time is evenly distributed', () => {
      const sections: SectionHistoryItem[] = [
        { id: 'hero', title: 'Hero', totalTimeSpent: 10000 },
        { id: 'calculator', title: 'Calculator', totalTimeSpent: 10100 },
        { id: 'pricing', title: 'Pricing', totalTimeSpent: 10050 },
        { id: 'features', title: 'Features', totalTimeSpent: 10020 },
      ];

      const result = analyzeSectionTiming(sections);

      expect(result).not.toBeNull();
      expect(result!.readingPattern).toBe('scanner');
    });

    it('should detect "explorer" reading pattern when visiting many sections', () => {
      const sections: SectionHistoryItem[] = [
        { id: 'hero', title: 'Hero', totalTimeSpent: 8000 },
        { id: 'calculator', title: 'Calculator', totalTimeSpent: 15000 },
        { id: 'pricing', title: 'Pricing', totalTimeSpent: 12000 },
        { id: 'features', title: 'Features', totalTimeSpent: 10000 },
        { id: 'testimonials', title: 'Testimonials', totalTimeSpent: 9000 },
        { id: 'value', title: 'Value', totalTimeSpent: 7000 },
      ];

      const result = analyzeSectionTiming(sections);

      expect(result).not.toBeNull();
      expect(result!.readingPattern).toBe('explorer');
    });

    it('should detect "deep_reader" pattern for moderate engagement', () => {
      const sections: SectionHistoryItem[] = [
        { id: 'calculator', title: 'Calculator', totalTimeSpent: 30000 }, // 30s
        { id: 'pricing', title: 'Pricing', totalTimeSpent: 25000 }, // 25s
        { id: 'hero', title: 'Hero', totalTimeSpent: 5000 }, // 5s
      ];

      const result = analyzeSectionTiming(sections);

      expect(result).not.toBeNull();
      expect(result!.readingPattern).toBe('deep_reader');
    });

    it('should generate calculator-specific openers for calculator section', () => {
      const sections: SectionHistoryItem[] = [
        { id: 'calculator', title: 'ROI Calculator', totalTimeSpent: 45000 },
        { id: 'hero', title: 'Hero', totalTimeSpent: 5000 },
      ];

      const result = analyzeSectionTiming(sections);

      expect(result).not.toBeNull();
      expect(result!.suggestedOpeners.length).toBeGreaterThan(0);
      expect(result!.suggestedOpeners.some(opener => opener.includes('calculator'))).toBe(true);
    });

    it('should generate pricing-specific openers for pricing section', () => {
      const sections: SectionHistoryItem[] = [
        { id: 'pricing', title: 'Pricing & Download', totalTimeSpent: 60000 },
        { id: 'hero', title: 'Hero', totalTimeSpent: 5000 },
      ];

      const result = analyzeSectionTiming(sections);

      expect(result).not.toBeNull();
      expect(result!.suggestedOpeners.some(opener => opener.includes('pricing'))).toBe(true);
    });

    it('should generate feature-specific openers for features section', () => {
      const sections: SectionHistoryItem[] = [
        { id: 'features', title: 'Features & Demo', totalTimeSpent: 40000 },
        { id: 'hero', title: 'Hero', totalTimeSpent: 5000 },
      ];

      const result = analyzeSectionTiming(sections);

      expect(result).not.toBeNull();
      expect(result!.suggestedOpeners.some(opener => opener.includes('feature'))).toBe(true);
    });

    it('should create interest mapping with correct levels', () => {
      const sections: SectionHistoryItem[] = [
        { id: 'calculator', title: 'Calculator', totalTimeSpent: 60000 }, // High
        { id: 'pricing', title: 'Pricing', totalTimeSpent: 30000 }, // Medium
        { id: 'hero', title: 'Hero', totalTimeSpent: 5000 }, // Low
      ];

      const result = analyzeSectionTiming(sections);

      expect(result).not.toBeNull();
      expect(result!.interestMapping['calculator'].interestLevel).toBe('high');
      expect(result!.interestMapping['hero'].interestLevel).toBe('low');
    });

    it('should map section IDs to human-readable topics', () => {
      const sections: SectionHistoryItem[] = [
        { id: 'calculator', title: 'ROI Calculator', totalTimeSpent: 30000 },
        { id: 'testimonials', title: 'Success Stories', totalTimeSpent: 20000 },
        { id: 'problem', title: 'Pain Points', totalTimeSpent: 15000 },
      ];

      const result = analyzeSectionTiming(sections);

      expect(result).not.toBeNull();
      expect(result!.interestMapping['calculator'].topic).toBe('ROI calculation and cost savings');
      expect(result!.interestMapping['testimonials'].topic).toContain('customer reviews');
      expect(result!.interestMapping['problem'].topic).toContain('pain points');
    });

    it('should provide interpretation for calculator focus', () => {
      const sections: SectionHistoryItem[] = [
        { id: 'calculator', title: 'Calculator', totalTimeSpent: 70000 },
        { id: 'hero', title: 'Hero', totalTimeSpent: 5000 },
      ];

      const result = analyzeSectionTiming(sections);

      expect(result).not.toBeNull();
      expect(result!.topSection.interpretation).toContain('ROI');
      expect(result!.topSection.interpretation).toContain('analytical');
    });

    it('should provide interpretation for pricing focus', () => {
      const sections: SectionHistoryItem[] = [
        { id: 'pricing', title: 'Pricing', totalTimeSpent: 50000 },
        { id: 'hero', title: 'Hero', totalTimeSpent: 5000 },
      ];

      const result = analyzeSectionTiming(sections);

      expect(result).not.toBeNull();
      expect(result!.topSection.interpretation).toContain('purchase');
    });

    it('should handle sections with matching keywords in title or id', () => {
      const sections: SectionHistoryItem[] = [
        { id: 'value-stack', title: 'Value Proposition', totalTimeSpent: 30000 },
        { id: 'final-cta', title: 'Get Started', totalTimeSpent: 20000 },
      ];

      const result = analyzeSectionTiming(sections);

      expect(result).not.toBeNull();
      expect(result!.interestMapping['value-stack'].topic).toContain('value');
      expect(result!.interestMapping['final-cta'].topic).toContain('action');
    });
  });

  describe('formatSectionInsights', () => {
    it('should format insights as readable markdown', () => {
      const insights: SectionInsights = {
        topSection: {
          id: 'calculator',
          title: 'ROI Calculator',
          timeSpent: 45000,
          interpretation: 'User is evaluating ROI',
        },
        readingPattern: 'focused',
        suggestedOpeners: [
          'i see you spent 45s playing with the calculator',
          'those numbers look right?',
        ],
        interestMapping: {
          calculator: {
            timeSpent: 45000,
            interestLevel: 'high',
            topic: 'ROI calculation',
          },
          hero: {
            timeSpent: 5000,
            interestLevel: 'low',
            topic: 'landing page',
          },
        },
      };

      const markdown = formatSectionInsights(insights);

      expect(markdown).toContain('SECTION READING INTELLIGENCE');
      expect(markdown).toContain('ROI Calculator');
      expect(markdown).toContain('45s');
      expect(markdown).toContain('Focused');
      expect(markdown).toContain('Suggested Conversation Openers');
      expect(markdown).toContain('i see you spent 45s');
      expect(markdown).toContain('Interest Breakdown');
      expect(markdown).toContain('high interest');
    });

    it('should include all reading pattern descriptions', () => {
      const patterns: Array<SectionInsights['readingPattern']> = [
        'deep_reader',
        'scanner',
        'focused',
        'explorer',
      ];

      patterns.forEach(pattern => {
        const insights: SectionInsights = {
          topSection: {
            id: 'test',
            title: 'Test',
            timeSpent: 10000,
            interpretation: 'Test',
          },
          readingPattern: pattern,
          suggestedOpeners: ['test'],
          interestMapping: {
            test: { timeSpent: 10000, interestLevel: 'high', topic: 'test' },
          },
        };

        const markdown = formatSectionInsights(insights);
        expect(markdown).toContain('Reading Pattern:');
      });
    });

    it('should include navigation links', () => {
      const insights: SectionInsights = {
        topSection: {
          id: 'calculator',
          title: 'Calculator',
          timeSpent: 30000,
          interpretation: 'Test',
        },
        readingPattern: 'focused',
        suggestedOpeners: ['test'],
        interestMapping: {
          calculator: { timeSpent: 30000, interestLevel: 'high', topic: 'calculator' },
        },
      };

      const markdown = formatSectionInsights(insights);

      expect(markdown).toContain('[text](#calculator)');
      expect(markdown).toContain('[text](#features)');
      expect(markdown).toContain('[text](#download)');
      expect(markdown).toContain('[text](/api/login)');
    });

    it('should show interest level emojis', () => {
      const insights: SectionInsights = {
        topSection: {
          id: 'test',
          title: 'Test',
          timeSpent: 30000,
          interpretation: 'Test',
        },
        readingPattern: 'explorer',
        suggestedOpeners: ['test'],
        interestMapping: {
          high: { timeSpent: 50000, interestLevel: 'high', topic: 'High Interest' },
          medium: { timeSpent: 25000, interestLevel: 'medium', topic: 'Medium Interest' },
          low: { timeSpent: 5000, interestLevel: 'low', topic: 'Low Interest' },
        },
      };

      const markdown = formatSectionInsights(insights);

      // Implementation uses: 🔥 High, 💡 Medium, 📊 Low
      expect(markdown).toContain('🔥'); // High interest
      expect(markdown).toContain('💡'); // Medium interest
      expect(markdown).toContain('📊'); // Low interest
    });
  });

  describe('getSectionTimingSummary', () => {
    it('should return message for empty history', () => {
      const summary = getSectionTimingSummary([]);
      expect(summary).toBe('No section timing data available');
    });

    it('should return concise summary for valid data', () => {
      const sections: SectionHistoryItem[] = [
        { id: 'calculator', title: 'Calculator', totalTimeSpent: 45000 },
        { id: 'hero', title: 'Hero', totalTimeSpent: 5000 },
      ];

      const summary = getSectionTimingSummary(sections);

      expect(summary).toContain('Calculator');
      expect(summary).toContain('45s');
    });

    it('should include reading pattern in summary', () => {
      const sections: SectionHistoryItem[] = [
        { id: 'calculator', title: 'Calculator', totalTimeSpent: 60000 },
        { id: 'pricing', title: 'Pricing', totalTimeSpent: 5000 },
        { id: 'features', title: 'Features', totalTimeSpent: 5000 },
      ];

      const summary = getSectionTimingSummary(sections);

      expect(summary).toMatch(/focused|scanner|explorer|deep reader/i);
    });
  });

  describe('time formatting', () => {
    it('should format time correctly', () => {
      const sections: SectionHistoryItem[] = [
        { id: 'test1', title: 'Test 1', totalTimeSpent: 5000 }, // 5s
        { id: 'test2', title: 'Test 2', totalTimeSpent: 65000 }, // 1m 5s
        { id: 'test3', title: 'Test 3', totalTimeSpent: 125000 }, // 2m 5s
      ];

      const result = analyzeSectionTiming(sections);

      expect(result).not.toBeNull();

      const markdown = formatSectionInsights(result!);

      expect(markdown).toContain('2m 5s'); // Top section (test3)
      expect(markdown).toContain('1m 5s'); // test2
      expect(markdown).toContain('5s'); // test1
    });
  });

  describe('edge cases', () => {
    it('should handle single section', () => {
      const sections: SectionHistoryItem[] = [
        { id: 'hero', title: 'Hero', totalTimeSpent: 10000 },
      ];

      const result = analyzeSectionTiming(sections);

      expect(result).not.toBeNull();
      expect(result!.topSection.id).toBe('hero');
      expect(result!.suggestedOpeners.length).toBeGreaterThan(0);
    });

    it('should handle sections with zero time', () => {
      const sections: SectionHistoryItem[] = [
        { id: 'calculator', title: 'Calculator', totalTimeSpent: 30000 },
        { id: 'hero', title: 'Hero', totalTimeSpent: 0 },
      ];

      const result = analyzeSectionTiming(sections);

      expect(result).not.toBeNull();
      expect(result!.topSection.id).toBe('calculator');
    });

    it('should handle unknown section IDs gracefully', () => {
      const sections: SectionHistoryItem[] = [
        { id: 'unknown-section', title: 'Unknown Section', totalTimeSpent: 20000 },
        { id: 'another-unknown', title: 'Another Unknown', totalTimeSpent: 10000 },
      ];

      const result = analyzeSectionTiming(sections);

      expect(result).not.toBeNull();
      expect(result!.topSection.id).toBe('unknown-section');
      expect(result!.suggestedOpeners.length).toBeGreaterThan(0);
    });

    it('should handle very large time values', () => {
      const sections: SectionHistoryItem[] = [
        { id: 'calculator', title: 'Calculator', totalTimeSpent: 600000 }, // 10 minutes
        { id: 'hero', title: 'Hero', totalTimeSpent: 5000 },
      ];

      const result = analyzeSectionTiming(sections);

      expect(result).not.toBeNull();

      const markdown = formatSectionInsights(result!);
      expect(markdown).toContain('10m');
    });

    it('should sort interest breakdown by time spent', () => {
      const sections: SectionHistoryItem[] = [
        { id: 'hero', title: 'Hero', totalTimeSpent: 5000 },
        { id: 'pricing', title: 'Pricing', totalTimeSpent: 30000 },
        { id: 'calculator', title: 'Calculator', totalTimeSpent: 50000 },
        { id: 'features', title: 'Features', totalTimeSpent: 20000 },
      ];

      const result = analyzeSectionTiming(sections);

      expect(result).not.toBeNull();

      const markdown = formatSectionInsights(result!);

      // Calculator should come first in the breakdown
      const calculatorIndex = markdown.indexOf('ROI calculation');
      const pricingIndex = markdown.indexOf('pricing plans');
      const featuresIndex = markdown.indexOf('product capabilities');
      const heroIndex = markdown.indexOf('landing page');

      expect(calculatorIndex).toBeLessThan(pricingIndex);
      expect(pricingIndex).toBeLessThan(featuresIndex);
      expect(featuresIndex).toBeLessThan(heroIndex);
    });
  });

  describe('interpretation accuracy', () => {
    it('should provide accurate interpretation for problem section', () => {
      const sections: SectionHistoryItem[] = [
        { id: 'problem', title: 'Problems', totalTimeSpent: 40000 },
        { id: 'hero', title: 'Hero', totalTimeSpent: 5000 },
      ];

      const result = analyzeSectionTiming(sections);

      expect(result).not.toBeNull();
      expect(result!.topSection.interpretation).toContain('pain points');
      expect(result!.topSection.interpretation).toContain('validation');
    });

    it('should provide accurate interpretation for testimonials', () => {
      const sections: SectionHistoryItem[] = [
        { id: 'testimonials', title: 'Testimonials', totalTimeSpent: 35000 },
        { id: 'hero', title: 'Hero', totalTimeSpent: 5000 },
      ];

      const result = analyzeSectionTiming(sections);

      expect(result).not.toBeNull();
      expect(result!.topSection.interpretation).toContain('social proof');
    });

    it('should provide accurate interpretation for value section', () => {
      const sections: SectionHistoryItem[] = [
        { id: 'value-stack', title: 'Value', totalTimeSpent: 30000 },
        { id: 'hero', title: 'Hero', totalTimeSpent: 5000 },
      ];

      const result = analyzeSectionTiming(sections);

      expect(result).not.toBeNull();
      expect(result!.topSection.interpretation).toContain('value proposition');
    });
  });
});
