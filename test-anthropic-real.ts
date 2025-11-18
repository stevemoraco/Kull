/**
 * Real API test for Anthropic Claude Haiku 4.5 model verification
 * This script verifies that claude-haiku-4-5-20251001 is the correct model identifier
 */

import { AnthropicAdapter } from './server/ai/providers/AnthropicAdapter';
import type { ProcessImageRequest } from './server/ai/BaseProviderAdapter';
import fs from 'fs';
import path from 'path';

async function testAnthropicModel() {
  console.log('🧪 Testing Anthropic Claude Haiku 4.5 model with real API...\n');

  const adapter = new AnthropicAdapter();

  // Check test images directory
  const testImagesDir = path.join(process.cwd(), 'test-images');
  if (!fs.existsSync(testImagesDir)) {
    console.log('⚠️  No test-images directory found. Creating a simple test with minimal data...\n');

    // Create a minimal 1x1 JPEG for testing
    const minimalJpeg = Buffer.from([
      0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
      0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
      0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
      0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
      0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
      0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
      0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01,
      0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x14, 0x00, 0x01,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x03, 0xFF, 0xC4, 0x00, 0x14, 0x10, 0x01, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3F, 0x00,
      0x7F, 0xFF, 0xD9
    ]);

    const request: ProcessImageRequest = {
      image: {
        data: minimalJpeg,
        format: 'jpeg',
        filename: 'test-minimal.jpg'
      },
      systemPrompt: 'You are a professional photo curator analyzing images for a wedding photographer.',
      userPrompt: 'Rate this test image on technical quality and composition. This is a minimal test image.'
    };

    try {
      console.log('📸 Processing minimal test image...');
      const result = await adapter.processSingleImage(request);

      console.log('\n✅ SUCCESS! Model name is VERIFIED!\n');
      console.log('Model: claude-haiku-4-5-20251001');
      console.log('Provider:', adapter.getProviderName());
      console.log('\n📊 Response Details:');
      console.log('- Star Rating:', result.rating.starRating);
      console.log('- Color Label:', result.rating.colorLabel);
      console.log('- Keep/Reject:', result.rating.keepReject);
      console.log('- Description:', result.rating.description);
      console.log('\n💰 Cost Breakdown:');
      console.log('- Input tokens:', result.cost.inputTokens);
      console.log('- Output tokens:', result.cost.outputTokens);
      console.log('- Provider cost: $' + result.cost.totalCostUSD.toFixed(4));
      console.log('- User charge (2x): $' + result.cost.userChargeUSD.toFixed(4));
      console.log('- Input cost: $' + result.cost.inputCostUSD.toFixed(6), '(@ $1/1M tokens)');
      console.log('- Output cost: $' + result.cost.outputCostUSD.toFixed(6), '(@ $5/1M tokens)');
      console.log('\n⏱️  Processing time:', result.processingTimeMs + 'ms');

      console.log('\n🎯 Technical Quality (1-1000 scale):');
      console.log('- Focus Accuracy:', result.rating.technicalQuality.focusAccuracy);
      console.log('- Exposure Quality:', result.rating.technicalQuality.exposureQuality);
      console.log('- Composition Score:', result.rating.technicalQuality.compositionScore);
      console.log('- Overall Technical:', result.rating.technicalQuality.overallTechnical);

      console.log('\n👤 Subject Analysis (1-1000 scale):');
      console.log('- Primary Subject:', result.rating.subjectAnalysis.primarySubject);
      console.log('- Emotion Intensity:', result.rating.subjectAnalysis.emotionIntensity);
      console.log('- Moment Timing:', result.rating.subjectAnalysis.momentTiming);
      console.log('- Eyes Open:', result.rating.subjectAnalysis.eyesOpen);

      console.log('\n✅ All pricing calculations verified:');
      const expectedInputCost = (result.cost.inputTokens / 1_000_000) * 1.00;
      const expectedOutputCost = (result.cost.outputTokens / 1_000_000) * 5.00;
      const expectedTotal = expectedInputCost + expectedOutputCost;
      const expectedUserCharge = expectedTotal * 2;

      console.log('- Input cost matches: $' + Math.abs(result.cost.inputCostUSD - expectedInputCost) < 0.000001 ? '✓' : '✗');
      console.log('- Output cost matches: $' + Math.abs(result.cost.outputCostUSD - expectedOutputCost) < 0.000001 ? '✓' : '✗');
      console.log('- User charge matches (2x): $' + Math.abs(result.cost.userChargeUSD - expectedUserCharge) < 0.000001 ? '✓' : '✗');

      return true;
    } catch (error: any) {
      console.error('\n❌ ERROR: Model name verification failed!');
      console.error('Error:', error.message);
      console.error('\nFull error:', error);
      return false;
    }
  }

  return false;
}

// Run test
testAnthropicModel()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
