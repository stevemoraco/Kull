/**
 * Example usage of Activity Pattern Detector
 *
 * This demonstrates how to use the pattern detector to analyze user behavior
 * and generate sales intelligence insights.
 */

import { detectActivityPatterns, formatPatternInsights } from './activityPatternDetector';

// Example 1: High-Intent User (Ready to Buy)
console.log('='.repeat(80));
console.log('EXAMPLE 1: High-Intent User (Ready to Buy)');
console.log('='.repeat(80));

const highIntentActivity = [
  { type: 'click', target: 'home', timestamp: new Date('2025-01-01T10:00:00Z') },
  { type: 'calculator_change', target: 'calculator', timestamp: new Date('2025-01-01T10:01:00Z'), value: { shootsPerWeek: 2, hoursPerShoot: 8, billableRate: 150 } },
  { type: 'calculator_change', target: 'calculator', timestamp: new Date('2025-01-01T10:02:00Z'), value: { shootsPerWeek: 3, hoursPerShoot: 8, billableRate: 150 } },
  { type: 'calculator_change', target: 'calculator', timestamp: new Date('2025-01-01T10:03:00Z'), value: { shootsPerWeek: 4, hoursPerShoot: 10, billableRate: 200 } },
  { type: 'calculator_change', target: 'calculator', timestamp: new Date('2025-01-01T10:04:00Z'), value: { shootsPerWeek: 4, hoursPerShoot: 10, billableRate: 200 } },
  { type: 'calculator_change', target: 'calculator', timestamp: new Date('2025-01-01T10:05:00Z'), value: { shootsPerWeek: 5, hoursPerShoot: 10, billableRate: 200 } },
  { type: 'click', target: 'pricing', timestamp: new Date('2025-01-01T10:06:00Z') },
  { type: 'click', target: 'pricing', timestamp: new Date('2025-01-01T10:07:00Z') },
  { type: 'click', target: 'testimonials', timestamp: new Date('2025-01-01T10:08:00Z') },
  { type: 'click', target: 'testimonials', timestamp: new Date('2025-01-01T10:09:00Z') },
  { type: 'click', target: 'download', timestamp: new Date('2025-01-01T10:10:00Z') },
];

const patterns1 = detectActivityPatterns(highIntentActivity);
console.log(formatPatternInsights(patterns1));

// Example 2: Calculator Engagement Without Conversion (Abandonment Risk)
console.log('\n');
console.log('='.repeat(80));
console.log('EXAMPLE 2: Calculator Engagement Without Conversion (Abandonment Risk)');
console.log('='.repeat(80));

const abandonmentActivity = [
  { type: 'click', target: 'home', timestamp: new Date('2025-01-01T10:00:00Z') },
  { type: 'calculator_change', target: 'calculator', timestamp: new Date('2025-01-01T10:01:00Z'), value: { shootsPerWeek: 3 } },
  { type: 'calculator_change', target: 'calculator', timestamp: new Date('2025-01-01T10:02:00Z'), value: { shootsPerWeek: 4 } },
  { type: 'calculator_change', target: 'calculator', timestamp: new Date('2025-01-01T10:03:00Z'), value: { shootsPerWeek: 2 } },
  { type: 'calculator_change', target: 'calculator', timestamp: new Date('2025-01-01T10:04:00Z'), value: { shootsPerWeek: 3 } },
  { type: 'hover', target: 'download', timestamp: new Date('2025-01-01T10:05:00Z') },
  { type: 'hover', target: 'download', timestamp: new Date('2025-01-01T10:06:00Z') },
  { type: 'hover', target: 'download', timestamp: new Date('2025-01-01T10:07:00Z') },
  { type: 'click', target: 'pricing', timestamp: new Date('2025-01-01T10:08:00Z') },
  { type: 'click', target: 'features', timestamp: new Date('2025-01-01T10:09:00Z') },
];

const patterns2 = detectActivityPatterns(abandonmentActivity);
console.log(formatPatternInsights(patterns2));

// Example 3: Early Awareness (Just Browsing)
console.log('\n');
console.log('='.repeat(80));
console.log('EXAMPLE 3: Early Awareness (Just Browsing)');
console.log('='.repeat(80));

const awarenessActivity = [
  { type: 'click', target: 'home', timestamp: new Date('2025-01-01T10:00:00Z') },
  { type: 'click', target: 'about', timestamp: new Date('2025-01-01T10:01:00Z') },
  { type: 'click', target: 'features', timestamp: new Date('2025-01-01T10:02:00Z') },
  { type: 'click', target: 'testimonials', timestamp: new Date('2025-01-01T10:03:00Z') },
];

const patterns3 = detectActivityPatterns(awarenessActivity);
console.log(formatPatternInsights(patterns3));

// Example 4: Consideration Phase (Active Evaluation)
console.log('\n');
console.log('='.repeat(80));
console.log('EXAMPLE 4: Consideration Phase (Active Evaluation)');
console.log('='.repeat(80));

const considerationActivity = [
  { type: 'click', target: 'home', timestamp: new Date('2025-01-01T10:00:00Z') },
  { type: 'click', target: 'features', timestamp: new Date('2025-01-01T10:01:00Z') },
  { type: 'click', target: 'demo', timestamp: new Date('2025-01-01T10:02:00Z') },
  { type: 'calculator_change', target: 'calculator', timestamp: new Date('2025-01-01T10:03:00Z'), value: { shootsPerWeek: 3, billableRate: 175 } },
  { type: 'calculator_change', target: 'calculator', timestamp: new Date('2025-01-01T10:04:00Z'), value: { shootsPerWeek: 4, billableRate: 200 } },
  { type: 'click', target: 'testimonials', timestamp: new Date('2025-01-01T10:05:00Z') },
  { type: 'click', target: 'testimonials', timestamp: new Date('2025-01-01T10:06:00Z') },
  { type: 'click', target: 'features', timestamp: new Date('2025-01-01T10:07:00Z') },
];

const patterns4 = detectActivityPatterns(considerationActivity);
console.log(formatPatternInsights(patterns4));

// Example 5: Repeated Pricing Clicks (Price Sensitive)
console.log('\n');
console.log('='.repeat(80));
console.log('EXAMPLE 5: Repeated Pricing Clicks (Price Sensitive)');
console.log('='.repeat(80));

const priceSensitiveActivity = [
  { type: 'click', target: 'home', timestamp: new Date('2025-01-01T10:00:00Z') },
  { type: 'click', target: 'pricing', timestamp: new Date('2025-01-01T10:01:00Z') },
  { type: 'click', target: 'features', timestamp: new Date('2025-01-01T10:02:00Z') },
  { type: 'click', target: 'pricing', timestamp: new Date('2025-01-01T10:03:00Z') },
  { type: 'click', target: 'testimonials', timestamp: new Date('2025-01-01T10:04:00Z') },
  { type: 'click', target: 'pricing', timestamp: new Date('2025-01-01T10:05:00Z') },
  { type: 'click', target: 'pricing', timestamp: new Date('2025-01-01T10:06:00Z') },
];

const patterns5 = detectActivityPatterns(priceSensitiveActivity);
console.log(formatPatternInsights(patterns5));

export {};
