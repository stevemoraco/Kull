/**
 * Test script for response validation system
 *
 * Run with: npx tsx server/test-validation.ts
 */

import {
  validateResponse,
  extractQuestions,
  calculateSimilarity,
  getExpectedQuestion,
  extractKeywords,
} from './responseValidator';

// Test data
const testCases = [
  {
    name: 'Valid response with expected question',
    aiResponse: "i see you're doing about 88 shoots a year — is that accurate?",
    conversationHistory: [],
    currentStep: 1,
    expectedValid: true,
  },
  {
    name: 'Repeated question detection',
    aiResponse: "i see you're doing about 88 shoots a year — is that accurate?",
    conversationHistory: [
      {
        role: 'assistant' as const,
        content: "so you're doing around 88 shoots per year, right?",
      },
      { role: 'user' as const, content: 'yes' },
    ],
    currentStep: 1,
    expectedValid: false,
  },
  {
    name: 'Activity mentioned without script question',
    aiResponse: "i see you're checking out the pricing page!",
    conversationHistory: [],
    currentStep: 1,
    expectedValid: false,
  },
  {
    name: 'Activity with script question (valid)',
    aiResponse:
      "i see you're curious about pricing — let me understand your workflow first. how many shoots are you doing per year?",
    conversationHistory: [],
    currentStep: 1,
    expectedValid: true,
  },
  {
    name: 'Context usage - references previous answer',
    aiResponse: "are you happy with that 150-shoot goal?",
    conversationHistory: [
      {
        role: 'assistant' as const,
        content: "how many shoots do you want to do next year?",
      },
      { role: 'user' as const, content: 'I want to hit 150 shoots' },
    ],
    currentStep: 2,
    expectedValid: true,
  },
  {
    name: 'Off-script question',
    aiResponse: "what camera do you use?",
    conversationHistory: [],
    currentStep: 1,
    expectedValid: false,
  },
];

console.log('🧪 Testing Response Validation System\n');
console.log('='.repeat(60));

// Debug test for repeated question detection
console.log('\n🔍 Debugging Repeated Question Detection:');
const q1 = "so you're doing around 88 shoots per year, right?";
const q2 = "i see you're doing about 88 shoots a year — is that accurate?";
const extracted1 = extractQuestions(q1);
const extracted2 = extractQuestions(q2);
console.log(`  Q1: "${q1}"`);
console.log(`  Q2: "${q2}"`);
console.log(`  Extracted Q1: ${JSON.stringify(extracted1)}`);
console.log(`  Extracted Q2: ${JSON.stringify(extracted2)}`);
if (extracted1.length > 0 && extracted2.length > 0) {
  const sim = calculateSimilarity(extracted1[0], extracted2[0]);
  console.log(`  Similarity: ${(sim * 100).toFixed(1)}% (threshold: 70%)`);
  console.log(`  Would detect: ${sim > 0.7 ? 'YES ✅' : 'NO ❌'}`);
}

// Test helper functions first
console.log('\n📝 Testing Helper Functions:');

// Test extractQuestions
const testText =
  "hey there! how many shoots are you doing? that's interesting. want to see pricing?";
const questions = extractQuestions(testText);
console.log(`✓ extractQuestions: Found ${questions.length} questions`);
console.log(`  Questions: ${JSON.stringify(questions)}`);

// Test calculateSimilarity
const sim1 = calculateSimilarity(
  "how many shoots are you doing",
  "how many shoots do you do"
);
const sim2 = calculateSimilarity(
  "how many shoots are you doing",
  "what camera do you use"
);
console.log(`✓ calculateSimilarity: Similar sentences = ${(sim1 * 100).toFixed(1)}%`);
console.log(`✓ calculateSimilarity: Different sentences = ${(sim2 * 100).toFixed(1)}%`);

// Test getExpectedQuestion
const expectedQ1 = getExpectedQuestion(1, { annualShoots: 88 });
const expectedQ2 = getExpectedQuestion(2);
console.log(`✓ getExpectedQuestion(1): "${expectedQ1.substring(0, 50)}..."`);
console.log(`✓ getExpectedQuestion(2): "${expectedQ2}"`);

// Test extractKeywords
const keywords = extractKeywords(
  "I want to hit 150 shoots next year and grow my revenue"
);
console.log(`✓ extractKeywords: ${keywords.join(', ')}`);

// Test main validation function
console.log('\n🔍 Testing Validation Cases:');
console.log('='.repeat(60));

let passCount = 0;
let failCount = 0;

testCases.forEach((testCase, index) => {
  console.log(`\nTest ${index + 1}: ${testCase.name}`);
  console.log('-'.repeat(60));

  const result = validateResponse(
    testCase.aiResponse,
    testCase.conversationHistory,
    testCase.currentStep
  );

  console.log(`  AI Response: "${testCase.aiResponse.substring(0, 60)}..."`);
  console.log(`  Valid: ${result.valid}`);
  console.log(`  Severity: ${result.severity}`);
  console.log(`  Issues: ${result.issues.length > 0 ? result.issues.join(', ') : 'None'}`);
  console.log(`  Metrics:`);
  console.log(`    - Repeated Question: ${result.metrics.hasRepeatedQuestion}`);
  console.log(`    - Activity Without Script: ${result.metrics.hasActivityWithoutScript}`);
  console.log(`    - Off Script: ${result.metrics.isOffScript}`);
  console.log(`    - Uses Context: ${result.metrics.usesContext}`);

  // Check if test passed
  const testPassed = result.valid === testCase.expectedValid;
  if (testPassed) {
    console.log(`  ✅ PASS`);
    passCount++;
  } else {
    console.log(`  ❌ FAIL - Expected valid=${testCase.expectedValid}, got ${result.valid}`);
    failCount++;
  }
});

// Summary
console.log('\n' + '='.repeat(60));
console.log('📊 Test Summary:');
console.log(`  Total Tests: ${testCases.length}`);
console.log(`  Passed: ${passCount} ✅`);
console.log(`  Failed: ${failCount} ❌`);
console.log(`  Success Rate: ${((passCount / testCases.length) * 100).toFixed(1)}%`);
console.log('='.repeat(60));

if (failCount === 0) {
  console.log('\n✨ All tests passed!');
  process.exit(0);
} else {
  console.log('\n⚠️  Some tests failed.');
  process.exit(1);
}
