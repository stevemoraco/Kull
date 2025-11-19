// Manual test for activity detection
// Run with: npx tsx server/activityDetector.test.ts

import { detectActivityType, getActivityDescription, validateActivityIntegration } from './activityDetector';

// Test data: simulated user activity
const testActivities = [
  // Test 1: Pricing hover
  {
    name: 'Pricing hover',
    activity: [
      { type: 'hover', target: 'pricing-section', timestamp: Date.now() - 5000 },
      { type: 'hover', target: 'price-card-starter', timestamp: Date.now() - 3000 },
      { type: 'click', target: 'pricing-details', timestamp: Date.now() - 1000 },
    ],
    expected: 'pricing'
  },

  // Test 2: Calculator interaction
  {
    name: 'Calculator interaction',
    activity: [
      { type: 'click', target: 'calculator-slider-shoots', timestamp: Date.now() - 5000 },
      { type: 'input', target: 'shoots-per-week-input', value: '3', timestamp: Date.now() - 3000 },
      { type: 'click', target: 'preset-more', timestamp: Date.now() - 1000 },
    ],
    expected: 'calculator'
  },

  // Test 3: Features exploration
  {
    name: 'Features exploration',
    activity: [
      { type: 'hover', target: 'features-section', timestamp: Date.now() - 5000 },
      { type: 'hover', target: 'ai-culling-feature', timestamp: Date.now() - 3000 },
      { type: 'click', target: 'feature-details', timestamp: Date.now() - 1000 },
    ],
    expected: 'features'
  },

  // Test 4: Security concerns
  {
    name: 'Security concerns',
    activity: [
      { type: 'hover', target: 'security-badge', timestamp: Date.now() - 5000 },
      { type: 'click', target: 'data-privacy-link', timestamp: Date.now() - 3000 },
      { type: 'hover', target: 'encryption-info', timestamp: Date.now() - 1000 },
    ],
    expected: 'security'
  },

  // Test 5: Testimonials
  {
    name: 'Testimonials',
    activity: [
      { type: 'hover', target: 'testimonials-section', timestamp: Date.now() - 5000 },
      { type: 'click', target: 'customer-review-1', timestamp: Date.now() - 3000 },
      { type: 'hover', target: 'photographer-quote', timestamp: Date.now() - 1000 },
    ],
    expected: 'testimonials'
  },

  // Test 6: Mixed activity (clicks should win)
  {
    name: 'Mixed activity - pricing click wins',
    activity: [
      { type: 'hover', target: 'features-section', timestamp: Date.now() - 5000 },
      { type: 'hover', target: 'testimonials', timestamp: Date.now() - 4000 },
      { type: 'click', target: 'pricing-button', timestamp: Date.now() - 1000 },
    ],
    expected: 'pricing'
  },
];

// Validation tests
const validationTests = [
  {
    name: 'Valid - activity + question',
    response: "i see you're checking pricing — let me understand your workflow first. how many shoots per year?",
    hadActivity: true,
    expected: true
  },
  {
    name: 'Invalid - activity without question',
    response: "caught you hovering pricing 👀",
    hadActivity: true,
    expected: false
  },
  {
    name: 'Valid - no activity mentioned',
    response: "how many shoots do you do per year?",
    hadActivity: false,
    expected: true
  },
  {
    name: 'Valid - activity mentioned with question',
    response: "nice calculator work! what's your target for annual shoots?",
    hadActivity: true,
    expected: true
  },
];

console.log('🧪 Testing Activity Detection\n');
console.log('=' .repeat(60));

// Test activity detection
testActivities.forEach(test => {
  const detected = detectActivityType(test.activity as any);
  const description = getActivityDescription(detected);
  const passed = detected === test.expected;

  console.log(`\n${passed ? '✅' : '❌'} ${test.name}`);
  console.log(`   Expected: ${test.expected}`);
  console.log(`   Detected: ${detected}`);
  console.log(`   Description: ${description}`);
});

console.log('\n' + '='.repeat(60));
console.log('\n🧪 Testing Activity Integration Validation\n');
console.log('=' .repeat(60));

// Test validation
validationTests.forEach(test => {
  const result = validateActivityIntegration(test.response, test.hadActivity);
  const passed = result === test.expected;

  console.log(`\n${passed ? '✅' : '❌'} ${test.name}`);
  console.log(`   Response: "${test.response}"`);
  console.log(`   Had activity: ${test.hadActivity}`);
  console.log(`   Expected valid: ${test.expected}`);
  console.log(`   Result: ${result ? 'valid' : 'invalid'}`);
});

console.log('\n' + '='.repeat(60));
console.log('\n✨ Tests complete!\n');
