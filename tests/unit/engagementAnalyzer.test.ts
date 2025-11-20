import { describe, it, expect } from 'vitest';
import {
  analyzeEngagement,
  getEngagementSummary,
  formatEngagementForContext,
  type SectionTimingEntry,
  type UserActivityEvent,
  type CalculatorData,
} from '../../server/engagementAnalyzer';

describe('EngagementAnalyzer', () => {
  describe('analyzeEngagement', () => {
    it('should detect ROI/Cost Savings as primary interest when calculator is used', () => {
      const sectionTiming: SectionTimingEntry[] = [
        { id: 'calculator', title: 'ROI Calculator', totalTimeSpent: 45000, visitCount: 2 },
        { id: 'hero', title: 'Hero', totalTimeSpent: 10000, visitCount: 1 },
      ];

      const userActivity: UserActivityEvent[] = [
        { type: 'input', target: 'calculator-shoots', timestamp: Date.now() },
        { type: 'input', target: 'calculator-hours', timestamp: Date.now() },
      ];

      const calculatorData: CalculatorData = {
        shootsPerWeek: 3,
        hoursPerShoot: 2,
        billableRate: 150,
        hasManuallyAdjusted: true,
        hasClickedPreset: true,
      };

      const analysis = analyzeEngagement(sectionTiming, userActivity, calculatorData);

      expect(analysis.primaryInterest).toBe('ROI/Cost Savings');
      expect(analysis.engagementLevel).toBeGreaterThan(30); // 9 (time) + 1 (interactions) + 20 (sections) + 10 (inputs) = 40
    });

    it('should detect Product Features as primary interest when features section is top', () => {
      const sectionTiming: SectionTimingEntry[] = [
        { id: 'features', title: 'Features', totalTimeSpent: 50000, visitCount: 1 },
        { id: 'hero', title: 'Hero', totalTimeSpent: 10000, visitCount: 1 },
      ];

      const userActivity: UserActivityEvent[] = [
        { type: 'click', target: 'feature-culling', timestamp: Date.now() },
      ];

      const analysis = analyzeEngagement(sectionTiming, userActivity);

      expect(analysis.primaryInterest).toBe('Product Features');
    });

    it('should detect Social Proof as primary interest', () => {
      const sectionTiming: SectionTimingEntry[] = [
        { id: 'testimonials', title: 'Testimonials', totalTimeSpent: 60000, visitCount: 3 },
        { id: 'hero', title: 'Hero', totalTimeSpent: 10000, visitCount: 1 },
      ];

      const userActivity: UserActivityEvent[] = [];

      const analysis = analyzeEngagement(sectionTiming, userActivity);

      expect(analysis.primaryInterest).toBe('Social Proof');
    });

    it('should detect Cost Evaluation as primary interest', () => {
      const sectionTiming: SectionTimingEntry[] = [
        { id: 'pricing', title: 'Pricing', totalTimeSpent: 40000, visitCount: 2 },
        { id: 'hero', title: 'Hero', totalTimeSpent: 10000, visitCount: 1 },
      ];

      const userActivity: UserActivityEvent[] = [];

      const analysis = analyzeEngagement(sectionTiming, userActivity);

      expect(analysis.primaryInterest).toBe('Cost Evaluation');
    });
  });

  describe('calculateEngagementLevel', () => {
    it('should calculate high engagement for active user', () => {
      const sectionTiming: SectionTimingEntry[] = [
        { id: 'calculator', title: 'Calculator', totalTimeSpent: 60000, visitCount: 2 },
        { id: 'features', title: 'Features', totalTimeSpent: 45000, visitCount: 1 },
        { id: 'pricing', title: 'Pricing', totalTimeSpent: 30000, visitCount: 1 },
      ];

      const userActivity: UserActivityEvent[] = [
        { type: 'input', target: 'shoots', timestamp: Date.now() },
        { type: 'input', target: 'hours', timestamp: Date.now() },
        { type: 'select', target: 'preset', timestamp: Date.now() },
        { type: 'click', target: 'feature', timestamp: Date.now() },
        { type: 'click', target: 'pricing', timestamp: Date.now() },
        { type: 'hover', target: 'cta', timestamp: Date.now() },
      ];

      const analysis = analyzeEngagement(sectionTiming, userActivity);

      // 22 (time: 135s / 6 = 22.5) + 3 (interactions: 6 * 0.5) + 20 (3 sections) + 15 (3 inputs/selects) = 60
      expect(analysis.engagementLevel).toBeGreaterThan(55);
    });

    it('should calculate low engagement for passive user', () => {
      const sectionTiming: SectionTimingEntry[] = [
        { id: 'hero', title: 'Hero', totalTimeSpent: 5000, visitCount: 1 },
      ];

      const userActivity: UserActivityEvent[] = [];

      const analysis = analyzeEngagement(sectionTiming, userActivity);

      expect(analysis.engagementLevel).toBeLessThan(30);
    });

    it('should give points for time on site', () => {
      const sectionTiming: SectionTimingEntry[] = [
        { id: 'features', title: 'Features', totalTimeSpent: 180000, visitCount: 1 }, // 3 minutes = 30 points
      ];

      const userActivity: UserActivityEvent[] = [];

      const analysis = analyzeEngagement(sectionTiming, userActivity);

      // Should get 30 points from time alone
      expect(analysis.engagementLevel).toBeGreaterThanOrEqual(30);
    });

    it('should give points for interactions', () => {
      const sectionTiming: SectionTimingEntry[] = [
        { id: 'hero', title: 'Hero', totalTimeSpent: 1000, visitCount: 1 },
      ];

      // 60 interactions = 30 points
      const userActivity: UserActivityEvent[] = Array(60).fill(null).map((_, i) => ({
        type: 'click' as const,
        target: `button-${i}`,
        timestamp: Date.now(),
      }));

      const analysis = analyzeEngagement(sectionTiming, userActivity);

      // Should get 30 points from interactions
      expect(analysis.engagementLevel).toBeGreaterThanOrEqual(30);
    });

    it('should give points for section depth', () => {
      const sectionTiming: SectionTimingEntry[] = [
        { id: 'hero', title: 'Hero', totalTimeSpent: 6000, visitCount: 1 },
        { id: 'features', title: 'Features', totalTimeSpent: 6000, visitCount: 1 },
      ];

      const userActivity: UserActivityEvent[] = [];

      const analysis = analyzeEngagement(sectionTiming, userActivity);

      // Should get 20 points for 2 sections visited
      expect(analysis.engagementLevel).toBeGreaterThanOrEqual(20);
    });

    it('should give points for deep engagement (inputs/selects)', () => {
      const sectionTiming: SectionTimingEntry[] = [
        { id: 'calculator', title: 'Calculator', totalTimeSpent: 1000, visitCount: 1 },
      ];

      const userActivity: UserActivityEvent[] = [
        { type: 'input', target: 'shoots', timestamp: Date.now() },
        { type: 'input', target: 'hours', timestamp: Date.now() },
        { type: 'select', target: 'preset', timestamp: Date.now() },
        { type: 'input', target: 'rate', timestamp: Date.now() },
      ];

      const analysis = analyzeEngagement(sectionTiming, userActivity);

      // Should get 20 points for 4 deep signals (4 * 5 = 20)
      expect(analysis.engagementLevel).toBeGreaterThanOrEqual(20);
    });

    it('should cap engagement level at 100', () => {
      const sectionTiming: SectionTimingEntry[] = [
        { id: 'calculator', title: 'Calculator', totalTimeSpent: 300000, visitCount: 5 },
        { id: 'features', title: 'Features', totalTimeSpent: 300000, visitCount: 5 },
        { id: 'pricing', title: 'Pricing', totalTimeSpent: 300000, visitCount: 5 },
      ];

      const userActivity: UserActivityEvent[] = Array(200).fill(null).map((_, i) => ({
        type: i % 2 === 0 ? 'input' as const : 'click' as const,
        target: `target-${i}`,
        timestamp: Date.now(),
      }));

      const analysis = analyzeEngagement(sectionTiming, userActivity);

      expect(analysis.engagementLevel).toBe(100);
    });
  });

  describe('detectObjectionSignals', () => {
    it('should detect price_concern when user reviews pricing multiple times', () => {
      const sectionTiming: SectionTimingEntry[] = [
        { id: 'pricing', title: 'Pricing', totalTimeSpent: 15000, visitCount: 2 },
      ];

      const userActivity: UserActivityEvent[] = [
        { type: 'click', target: 'pricing-plan-1', timestamp: Date.now() },
        { type: 'click', target: 'pricing-plan-2', timestamp: Date.now() },
        { type: 'click', target: 'pricing-plan-3', timestamp: Date.now() },
      ];

      const analysis = analyzeEngagement(sectionTiming, userActivity);

      expect(analysis.objectionSignals).toContain('price_concern');
    });

    it('should detect feature_doubt when user reviews features but does not click CTA', () => {
      const sectionTiming: SectionTimingEntry[] = [
        { id: 'features', title: 'Features', totalTimeSpent: 20000, visitCount: 1 },
      ];

      const userActivity: UserActivityEvent[] = [
        { type: 'click', target: 'feature-culling', timestamp: Date.now() },
        { type: 'click', target: 'feature-export', timestamp: Date.now() },
      ];

      const analysis = analyzeEngagement(sectionTiming, userActivity);

      expect(analysis.objectionSignals).toContain('feature_doubt');
    });

    it('should NOT detect feature_doubt when user clicks CTA', () => {
      const sectionTiming: SectionTimingEntry[] = [
        { id: 'features', title: 'Features', totalTimeSpent: 20000, visitCount: 1 },
      ];

      const userActivity: UserActivityEvent[] = [
        { type: 'click', target: 'feature-culling', timestamp: Date.now() },
        { type: 'click', target: 'cta-download', timestamp: Date.now() },
      ];

      const analysis = analyzeEngagement(sectionTiming, userActivity);

      expect(analysis.objectionSignals).not.toContain('feature_doubt');
    });

    it('should detect needs_social_proof when user visits testimonials multiple times', () => {
      const sectionTiming: SectionTimingEntry[] = [
        { id: 'testimonials', title: 'Testimonials', totalTimeSpent: 10000, visitCount: 3 },
      ];

      const userActivity: UserActivityEvent[] = [];

      const analysis = analyzeEngagement(sectionTiming, userActivity);

      expect(analysis.objectionSignals).toContain('needs_social_proof');
    });

    it('should detect trust_concerns when user reviews privacy/security', () => {
      const sectionTiming: SectionTimingEntry[] = [
        { id: 'features', title: 'Features', totalTimeSpent: 10000, visitCount: 1 },
      ];

      const userActivity: UserActivityEvent[] = [
        { type: 'click', target: 'privacy-policy', timestamp: Date.now() },
      ];

      const analysis = analyzeEngagement(sectionTiming, userActivity);

      expect(analysis.objectionSignals).toContain('trust_concerns');
    });

    it('should detect comparison_shopping when user quickly visits many sections', () => {
      const sectionTiming: SectionTimingEntry[] = [
        { id: 'hero', title: 'Hero', totalTimeSpent: 2000, visitCount: 1 },
        { id: 'features', title: 'Features', totalTimeSpent: 3000, visitCount: 1 },
        { id: 'pricing', title: 'Pricing', totalTimeSpent: 2500, visitCount: 1 },
        { id: 'testimonials', title: 'Testimonials', totalTimeSpent: 1500, visitCount: 1 },
        { id: 'faq', title: 'FAQ', totalTimeSpent: 2000, visitCount: 1 },
        { id: 'cta', title: 'CTA', totalTimeSpent: 1000, visitCount: 1 },
      ];

      const userActivity: UserActivityEvent[] = [];

      const analysis = analyzeEngagement(sectionTiming, userActivity);

      expect(analysis.objectionSignals).toContain('comparison_shopping');
    });

    it('should detect not_personalizing when user clicks preset but does not adjust', () => {
      const sectionTiming: SectionTimingEntry[] = [
        { id: 'calculator', title: 'Calculator', totalTimeSpent: 10000, visitCount: 1 },
      ];

      const userActivity: UserActivityEvent[] = [];

      const calculatorData: CalculatorData = {
        shootsPerWeek: 3,
        hoursPerShoot: 2,
        billableRate: 150,
        hasManuallyAdjusted: false,
        hasClickedPreset: true,
      };

      const analysis = analyzeEngagement(sectionTiming, userActivity, calculatorData);

      expect(analysis.objectionSignals).toContain('not_personalizing');
    });

    it('should NOT detect not_personalizing when user adjusts calculator', () => {
      const sectionTiming: SectionTimingEntry[] = [
        { id: 'calculator', title: 'Calculator', totalTimeSpent: 10000, visitCount: 1 },
      ];

      const userActivity: UserActivityEvent[] = [];

      const calculatorData: CalculatorData = {
        shootsPerWeek: 3,
        hoursPerShoot: 2,
        billableRate: 150,
        hasManuallyAdjusted: true,
        hasClickedPreset: true,
      };

      const analysis = analyzeEngagement(sectionTiming, userActivity, calculatorData);

      expect(analysis.objectionSignals).not.toContain('not_personalizing');
    });
  });

  describe('assessReadiness', () => {
    it('should mark user as ready when they meet threshold', () => {
      const sectionTiming: SectionTimingEntry[] = [
        { id: 'calculator', title: 'Calculator', totalTimeSpent: 40000, visitCount: 1 },
        { id: 'features', title: 'Features', totalTimeSpent: 20000, visitCount: 1 },
        { id: 'pricing', title: 'Pricing', totalTimeSpent: 15000, visitCount: 1 },
        { id: 'testimonials', title: 'Testimonials', totalTimeSpent: 10000, visitCount: 1 },
      ];

      const userActivity: UserActivityEvent[] = [];

      const calculatorData: CalculatorData = {
        shootsPerWeek: 3,
        hoursPerShoot: 2,
        billableRate: 150,
        hasManuallyAdjusted: true,
        hasClickedPreset: true,
      };

      const analysis = analyzeEngagement(sectionTiming, userActivity, calculatorData);

      expect(analysis.readyToBuy).toBe(true);
      expect(analysis.confidence).toBeGreaterThanOrEqual(60);
    });

    it('should mark user as not ready when below threshold', () => {
      const sectionTiming: SectionTimingEntry[] = [
        { id: 'hero', title: 'Hero', totalTimeSpent: 10000, visitCount: 1 },
      ];

      const userActivity: UserActivityEvent[] = [];

      const analysis = analyzeEngagement(sectionTiming, userActivity);

      expect(analysis.readyToBuy).toBe(false);
      expect(analysis.confidence).toBeLessThan(60);
    });

    it('should give 30 points for calculator engagement (>30s)', () => {
      const sectionTiming: SectionTimingEntry[] = [
        { id: 'calculator', title: 'Calculator', totalTimeSpent: 35000, visitCount: 1 },
      ];

      const userActivity: UserActivityEvent[] = [];

      const analysis = analyzeEngagement(sectionTiming, userActivity);

      expect(analysis.confidence).toBe(30);
    });

    it('should give 15 points for moderate calculator engagement (10-30s)', () => {
      const sectionTiming: SectionTimingEntry[] = [
        { id: 'calculator', title: 'Calculator', totalTimeSpent: 15000, visitCount: 1 },
      ];

      const userActivity: UserActivityEvent[] = [];

      const analysis = analyzeEngagement(sectionTiming, userActivity);

      expect(analysis.confidence).toBe(15);
    });

    it('should give points for each section visited', () => {
      const sectionTiming: SectionTimingEntry[] = [
        { id: 'features', title: 'Features', totalTimeSpent: 1000, visitCount: 1 },
        { id: 'pricing', title: 'Pricing', totalTimeSpent: 1000, visitCount: 1 },
        { id: 'testimonials', title: 'Testimonials', totalTimeSpent: 1000, visitCount: 1 },
      ];

      const userActivity: UserActivityEvent[] = [];

      const analysis = analyzeEngagement(sectionTiming, userActivity);

      // 20 (features) + 25 (pricing) + 15 (testimonials) = 60
      expect(analysis.confidence).toBe(60);
      expect(analysis.readyToBuy).toBe(true);
    });

    it('should give 10 points for calculator adjustment', () => {
      const sectionTiming: SectionTimingEntry[] = [];

      const userActivity: UserActivityEvent[] = [];

      const calculatorData: CalculatorData = {
        shootsPerWeek: 3,
        hoursPerShoot: 2,
        billableRate: 150,
        hasManuallyAdjusted: true,
        hasClickedPreset: false,
      };

      const analysis = analyzeEngagement(sectionTiming, userActivity, calculatorData);

      expect(analysis.confidence).toBe(10);
    });
  });

  describe('generateApproach', () => {
    it('should recommend WARM_UP for low engagement', () => {
      const sectionTiming: SectionTimingEntry[] = [
        { id: 'hero', title: 'Hero', totalTimeSpent: 3000, visitCount: 1 },
      ];

      const userActivity: UserActivityEvent[] = [];

      const analysis = analyzeEngagement(sectionTiming, userActivity);

      expect(analysis.recommendedApproach).toContain('WARM_UP');
    });

    it('should recommend CLOSE_MODE for high engagement + ready', () => {
      const sectionTiming: SectionTimingEntry[] = [
        { id: 'value-calculator', title: 'Value Calculator', totalTimeSpent: 40000, visitCount: 2 }, // 40s on calculator for 30 pts readiness
        { id: 'solution', title: 'Solution', totalTimeSpent: 90000, visitCount: 1 }, // 1.5 minutes
        { id: 'pricing', title: 'Pricing', totalTimeSpent: 60000, visitCount: 1 }, // 1 minute
        { id: 'testimonials', title: 'Testimonials', totalTimeSpent: 30000, visitCount: 1 }, // 30 seconds
        { id: 'problem', title: 'Problem', totalTimeSpent: 30000, visitCount: 1 }, // Extra section for depth
      ];

      const userActivity: UserActivityEvent[] = [
        { type: 'input', target: 'email', timestamp: Date.now() },
        { type: 'input', target: 'name', timestamp: Date.now() },
        { type: 'select', target: 'tier', timestamp: Date.now() },
        { type: 'click', target: 'solution-1', timestamp: Date.now() },
        { type: 'click', target: 'solution-2', timestamp: Date.now() },
        { type: 'click', target: 'cta', timestamp: Date.now() },
        { type: 'click', target: 'testimonial-1', timestamp: Date.now() },
        { type: 'click', target: 'testimonial-2', timestamp: Date.now() },
        ...Array(10).fill(null).map((_, i) => ({
          type: 'click' as const,
          target: `extra-${i}`,
          timestamp: Date.now(),
        })), // Add more clicks for engagement
      ];

      const calculatorData: CalculatorData = {
        shootsPerWeek: 3,
        hoursPerShoot: 2,
        billableRate: 150,
        hasManuallyAdjusted: true,
        hasClickedPreset: true,
      };

      const analysis = analyzeEngagement(sectionTiming, userActivity, calculatorData);

      // Should have: 30 (time: 250s = 41.6) + 9 (interactions: 18 * 0.5) + 20 (5 sections * 10, but capped at 20) + 15 (3 inputs/selects) = 74
      // Should be ready: 30 (calc >30s) + 0 (features) + 25 (pricing) + 15 (testimonials) + 10 (adjusted) = 80
      expect(analysis.readyToBuy).toBe(true);
      expect(analysis.engagementLevel).toBeGreaterThanOrEqual(70);
      expect(analysis.recommendedApproach).toContain('CLOSE_MODE');
    });

    it('should recommend VALUE_FOCUS for price concerns', () => {
      const sectionTiming: SectionTimingEntry[] = [
        { id: 'pricing', title: 'Pricing', totalTimeSpent: 60000, visitCount: 1 }, // Enough time for 30+ engagement
        { id: 'features', title: 'Features', totalTimeSpent: 30000, visitCount: 1 },
      ];

      const userActivity: UserActivityEvent[] = [
        { type: 'click', target: 'pricing-plan-1', timestamp: Date.now() },
        { type: 'click', target: 'pricing-plan-2', timestamp: Date.now() },
        { type: 'click', target: 'pricing-plan-3', timestamp: Date.now() },
      ];

      const analysis = analyzeEngagement(sectionTiming, userActivity);

      expect(analysis.recommendedApproach).toContain('VALUE_FOCUS');
    });

    it('should recommend DEMO_MODE for feature doubts', () => {
      const sectionTiming: SectionTimingEntry[] = [
        { id: 'features', title: 'Features', totalTimeSpent: 30000, visitCount: 1 },
      ];

      const userActivity: UserActivityEvent[] = [
        { type: 'click', target: 'feature-culling', timestamp: Date.now() },
      ];

      const analysis = analyzeEngagement(sectionTiming, userActivity);

      expect(analysis.recommendedApproach).toContain('DEMO_MODE');
    });

    it('should recommend SOCIAL_PROOF for social proof needs', () => {
      const sectionTiming: SectionTimingEntry[] = [
        { id: 'testimonials', title: 'Testimonials', totalTimeSpent: 20000, visitCount: 3 },
      ];

      const userActivity: UserActivityEvent[] = [];

      const analysis = analyzeEngagement(sectionTiming, userActivity);

      expect(analysis.recommendedApproach).toContain('SOCIAL_PROOF');
    });

    it('should recommend BUILD_TRUST for trust concerns', () => {
      const sectionTiming: SectionTimingEntry[] = [
        { id: 'features', title: 'Features', totalTimeSpent: 15000, visitCount: 1 },
      ];

      const userActivity: UserActivityEvent[] = [
        { type: 'click', target: 'privacy-policy', timestamp: Date.now() },
      ];

      const analysis = analyzeEngagement(sectionTiming, userActivity);

      expect(analysis.recommendedApproach).toContain('BUILD_TRUST');
    });

    it('should recommend ROI_FOCUS for ROI primary interest', () => {
      const sectionTiming: SectionTimingEntry[] = [
        { id: 'calculator', title: 'Calculator', totalTimeSpent: 120000, visitCount: 1 }, // 2 minutes = 20 points
        { id: 'value-stack', title: 'Value Stack', totalTimeSpent: 60000, visitCount: 1 }, // 1 minute = 10 points
      ];

      const userActivity: UserActivityEvent[] = [
        { type: 'input', target: 'shoots', timestamp: Date.now() },
        { type: 'input', target: 'hours', timestamp: Date.now() },
      ];

      const calculatorData: CalculatorData = {
        shootsPerWeek: 3,
        hoursPerShoot: 2,
        billableRate: 150,
        hasManuallyAdjusted: true,
        hasClickedPreset: true,
      };

      const analysis = analyzeEngagement(sectionTiming, userActivity, calculatorData);

      // Should have: 30 (time) + 1 (interactions) + 20 (sections) + 10 (inputs) = 61 engagement
      expect(analysis.recommendedApproach).toContain('ROI_FOCUS');
    });
  });

  describe('generateScriptAdaptations', () => {
    it('should suggest ROI adaptations for ROI primary interest', () => {
      const sectionTiming: SectionTimingEntry[] = [
        { id: 'calculator', title: 'Calculator', totalTimeSpent: 40000, visitCount: 1 },
      ];

      const userActivity: UserActivityEvent[] = [];

      const calculatorData: CalculatorData = {
        shootsPerWeek: 3,
        hoursPerShoot: 2,
        billableRate: 150,
        hasManuallyAdjusted: true,
        hasClickedPreset: true,
      };

      const analysis = analyzeEngagement(sectionTiming, userActivity, calculatorData);

      expect(analysis.scriptAdaptations.some(a => a.includes('calculator'))).toBe(true);
      expect(analysis.scriptAdaptations.some(a => a.includes('ROI'))).toBe(true);
    });

    it('should suggest feature adaptations for Product Features interest', () => {
      const sectionTiming: SectionTimingEntry[] = [
        { id: 'features', title: 'Features', totalTimeSpent: 50000, visitCount: 1 },
      ];

      const userActivity: UserActivityEvent[] = [];

      const analysis = analyzeEngagement(sectionTiming, userActivity);

      expect(analysis.scriptAdaptations.some(a => a.includes('feature'))).toBe(true);
    });

    it('should suggest price adaptations for price concerns', () => {
      const sectionTiming: SectionTimingEntry[] = [
        { id: 'pricing', title: 'Pricing', totalTimeSpent: 25000, visitCount: 1 },
      ];

      const userActivity: UserActivityEvent[] = [
        { type: 'click', target: 'pricing-plan-1', timestamp: Date.now() },
        { type: 'click', target: 'pricing-plan-2', timestamp: Date.now() },
        { type: 'click', target: 'pricing-plan-3', timestamp: Date.now() },
      ];

      const analysis = analyzeEngagement(sectionTiming, userActivity);

      expect(analysis.scriptAdaptations.some(a => a.toLowerCase().includes('pricing') || a.toLowerCase().includes('price'))).toBe(true);
    });

    it('should suggest slow approach for low engagement', () => {
      const sectionTiming: SectionTimingEntry[] = [
        { id: 'hero', title: 'Hero', totalTimeSpent: 3000, visitCount: 1 },
      ];

      const userActivity: UserActivityEvent[] = [];

      const analysis = analyzeEngagement(sectionTiming, userActivity);

      expect(analysis.scriptAdaptations.some(a => a.includes('slow'))).toBe(true);
    });

    it('should suggest fast approach for high engagement', () => {
      const sectionTiming: SectionTimingEntry[] = [
        { id: 'solution', title: 'Solution', totalTimeSpent: 180000, visitCount: 2 }, // 3 minutes
        { id: 'value-stack', title: 'Value Stack', totalTimeSpent: 120000, visitCount: 1 }, // 2 minutes
        { id: 'pricing', title: 'Pricing', totalTimeSpent: 120000, visitCount: 1 }, // 2 minutes
      ];

      const userActivity: UserActivityEvent[] = [
        ...Array(40).fill(null).map((_, i) => ({
          type: 'click' as const,
          target: `target-${i}`,
          timestamp: Date.now(),
        })),
        // Add some inputs for deep engagement
        { type: 'input' as const, target: 'email', timestamp: Date.now() },
        { type: 'input' as const, target: 'name', timestamp: Date.now() },
      ];

      const analysis = analyzeEngagement(sectionTiming, userActivity);

      // Should have: 30 (time: 7 min = 420s/6 = 70, capped at 30) + 20 (interactions: 40 * 0.5, capped at 30 but we have 42 total) + 20 (3 sections) + 10 (2 inputs) = 80
      expect(analysis.engagementLevel).toBeGreaterThanOrEqual(70);
      expect(analysis.scriptAdaptations.some(a => a.includes('Move faster'))).toBe(true);
    });
  });

  describe('getEngagementSummary', () => {
    it('should generate readable summary', () => {
      const sectionTiming: SectionTimingEntry[] = [
        { id: 'calculator', title: 'Calculator', totalTimeSpent: 40000, visitCount: 1 },
      ];

      const userActivity: UserActivityEvent[] = [];

      const calculatorData: CalculatorData = {
        shootsPerWeek: 3,
        hoursPerShoot: 2,
        billableRate: 150,
        hasManuallyAdjusted: true,
        hasClickedPreset: true,
      };

      const analysis = analyzeEngagement(sectionTiming, userActivity, calculatorData);
      const summary = getEngagementSummary(analysis);

      expect(summary).toContain('Primary Interest:');
      expect(summary).toContain('Engagement Level:');
      expect(summary).toContain('Ready to Buy:');
      expect(summary).toContain('Recommended Approach:');
    });
  });

  describe('formatEngagementForContext', () => {
    it('should format for chat context', () => {
      const sectionTiming: SectionTimingEntry[] = [
        { id: 'calculator', title: 'Calculator', totalTimeSpent: 40000, visitCount: 1 },
      ];

      const userActivity: UserActivityEvent[] = [];

      const calculatorData: CalculatorData = {
        shootsPerWeek: 3,
        hoursPerShoot: 2,
        billableRate: 150,
        hasManuallyAdjusted: true,
        hasClickedPreset: true,
      };

      const analysis = analyzeEngagement(sectionTiming, userActivity, calculatorData);
      const formatted = formatEngagementForContext(analysis);

      expect(formatted).toContain('## 🎯 Engagement Analysis');
      expect(formatted).toContain('**Primary Interest:**');
      expect(formatted).toContain('**Engagement Level:**');
      expect(formatted).toContain('**Ready to Buy:**');
      expect(formatted).toContain('**📋 Recommended Approach:**');
      expect(formatted).toContain('**🔧 Script Adaptations:**');
    });

    it('should include objections when present', () => {
      const sectionTiming: SectionTimingEntry[] = [
        { id: 'pricing', title: 'Pricing', totalTimeSpent: 25000, visitCount: 1 },
      ];

      const userActivity: UserActivityEvent[] = [
        { type: 'click', target: 'pricing-plan-1', timestamp: Date.now() },
        { type: 'click', target: 'pricing-plan-2', timestamp: Date.now() },
        { type: 'click', target: 'pricing-plan-3', timestamp: Date.now() },
      ];

      const analysis = analyzeEngagement(sectionTiming, userActivity);
      const formatted = formatEngagementForContext(analysis);

      expect(formatted).toContain('**⚠️ Detected Objections:**');
      expect(formatted).toContain('Price Concern');
    });
  });

  describe('edge cases', () => {
    it('should handle empty section timing', () => {
      const sectionTiming: SectionTimingEntry[] = [];
      const userActivity: UserActivityEvent[] = [];

      const analysis = analyzeEngagement(sectionTiming, userActivity);

      expect(analysis.primaryInterest).toBe('General Interest');
      expect(analysis.engagementLevel).toBe(0);
      expect(analysis.readyToBuy).toBe(false);
    });

    it('should handle empty user activity', () => {
      const sectionTiming: SectionTimingEntry[] = [
        { id: 'hero', title: 'Hero', totalTimeSpent: 10000, visitCount: 1 },
      ];
      const userActivity: UserActivityEvent[] = [];

      const analysis = analyzeEngagement(sectionTiming, userActivity);

      expect(analysis).toBeDefined();
      expect(analysis.engagementLevel).toBeGreaterThan(0);
    });

    it('should handle missing calculator data', () => {
      const sectionTiming: SectionTimingEntry[] = [
        { id: 'features', title: 'Features', totalTimeSpent: 20000, visitCount: 1 },
      ];
      const userActivity: UserActivityEvent[] = [];

      const analysis = analyzeEngagement(sectionTiming, userActivity, undefined);

      expect(analysis).toBeDefined();
      expect(analysis.primaryInterest).toBe('Product Features');
    });
  });
});
