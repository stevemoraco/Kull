// Manual test for activity templates
// Run with: npx tsx server/activityTemplates.test.ts

import { getActivityTemplate, fillTemplateVariables } from './activityTemplates';

console.log('🧪 Testing Activity Templates\n');
console.log('='.repeat(60));

// Test data
const calculatorData = {
  annualShoots: 88,
  hoursPerShoot: 3,
  billableRate: 75,
  annualCost: 23100,
  weeksSaved: 6.6,
};

// Test each step with different activity types
const tests = [
  { step: 1, activity: 'pricing' },
  { step: 1, activity: 'calculator' },
  { step: 1, activity: 'features' },
  { step: 2, activity: 'pricing' },
  { step: 3, activity: 'calculator' },
  { step: 5, activity: 'features' },
  { step: 9, activity: 'testimonials' },
  { step: 13, activity: 'pricing' },
];

tests.forEach(({ step, activity }) => {
  console.log(`\n📝 Step ${step} - ${activity} activity`);
  console.log('-'.repeat(60));

  const template = getActivityTemplate(step, activity);

  if (template) {
    console.log(`Template: ${template}`);

    const filled = fillTemplateVariables(template, calculatorData);
    console.log(`\nFilled: ${filled}`);

    // Check if all variables were replaced
    const hasUnfilledVars = /\{[a-zA-Z]+\}/.test(filled);
    if (hasUnfilledVars) {
      console.log('⚠️  Warning: Unfilled variables detected');
    } else {
      console.log('✅ All variables filled');
    }
  } else {
    console.log('❌ No template found');
  }
});

console.log('\n' + '='.repeat(60));

// Test with missing data
console.log('\n📝 Testing with partial data');
console.log('-'.repeat(60));

const partialData = {
  annualShoots: 100,
};

const template = getActivityTemplate(1, 'pricing');
if (template) {
  const filled = fillTemplateVariables(template, partialData);
  console.log(`Template: ${template}`);
  console.log(`Filled: ${filled}`);
}

console.log('\n' + '='.repeat(60));
console.log('\n✨ Tests complete!\n');
