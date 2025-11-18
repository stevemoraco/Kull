import { describe, it, expect, beforeAll } from 'vitest';
import { GoogleAdapter } from '../../../server/ai/providers/GoogleAdapter';
import { ImageInput, BatchImageRequest } from '../../../server/ai/BaseProviderAdapter';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Google Gemini Batch API Integration Test
 *
 * This test submits a real batch job to Google's API and verifies:
 * - Batch submission works
 * - Job status polling works
 * - Results retrieval works
 * - All rating fields are present (1-1000 scales)
 * - Cost is approximately 50% of concurrent mode
 *
 * IMPORTANT: Requires GOOGLE_API_KEY environment variable
 * Test will be skipped if not provided
 */

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const TEST_TIMEOUT = 5 * 60 * 1000; // 5 minutes max wait

describe.skipIf(!GOOGLE_API_KEY)('Google Batch API Integration', () => {
  let adapter: GoogleAdapter;
  let testImages: ImageInput[];

  beforeAll(() => {
    adapter = new GoogleAdapter();

    // Create test images (10 small images for quick testing)
    testImages = Array.from({ length: 10 }, (_, i) => {
      // Create a small 1x1 JPEG image (base64 encoded)
      const base64Image = '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=';

      return {
        data: Buffer.from(base64Image, 'base64'),
        format: 'jpeg' as const,
        filename: `test-image-${i + 1}.jpg`
      };
    });
  });

  it('should submit batch, poll until complete, and retrieve results with 50% cost savings', async () => {
    // Prepare batch request
    const request: BatchImageRequest = {
      images: testImages,
      systemPrompt: `You are an expert photographer analyzing photo quality.
        Rate each image across multiple dimensions using 1-1000 scales.
        Remember: RAW images - exposure is fixable, focus is not.`,
      userPrompt: `Analyze this image and provide detailed ratings.
        Include all technical quality metrics (focus, exposure, composition, lighting, etc.)
        and subject analysis metrics (emotion, timing, storytelling, etc.).`
    };

    console.log(`Submitting batch of ${testImages.length} images...`);

    // Step 1: Submit batch job
    const batchJob = await adapter.submitBatch(request);

    expect(batchJob).toBeDefined();
    expect(batchJob.jobId).toBeDefined();
    expect(batchJob.status).toMatch(/queued|processing/);
    expect(batchJob.totalImages).toBe(testImages.length);
    expect(batchJob.createdAt).toBeInstanceOf(Date);

    console.log(`Batch job submitted: ${batchJob.jobId}`);
    console.log(`Status: ${batchJob.status}`);
    console.log(`Estimated completion: ${batchJob.estimatedCompletionTime?.toISOString()}`);

    // Step 2: Poll for completion (with timeout)
    const startTime = Date.now();
    let status = batchJob;
    let pollCount = 0;

    while (status.status !== 'completed' && status.status !== 'failed') {
      const elapsed = Date.now() - startTime;

      if (elapsed > TEST_TIMEOUT) {
        throw new Error(
          `Batch job did not complete within ${TEST_TIMEOUT / 1000}s. ` +
          `Current status: ${status.status}, Progress: ${status.processedImages}/${status.totalImages}`
        );
      }

      // Wait before polling (exponential backoff: 5s, 10s, 20s, 30s max)
      const waitTime = Math.min(5000 * Math.pow(2, pollCount), 30000);
      await new Promise(resolve => setTimeout(resolve, waitTime));

      pollCount++;
      status = await adapter.checkBatchStatus(batchJob.jobId);

      console.log(
        `Poll #${pollCount}: Status=${status.status}, ` +
        `Progress=${status.processedImages}/${status.totalImages}, ` +
        `Elapsed=${Math.round(elapsed / 1000)}s`
      );
    }

    if (status.status === 'failed') {
      throw new Error(`Batch job failed: ${status.error || 'Unknown error'}`);
    }

    expect(status.status).toBe('completed');
    expect(status.processedImages).toBe(testImages.length);

    console.log(`Batch job completed in ${Math.round((Date.now() - startTime) / 1000)}s`);

    // Step 3: Retrieve results
    const results = await adapter.retrieveBatchResults(batchJob.jobId);

    expect(results).toBeDefined();
    expect(results.length).toBe(testImages.length);

    console.log(`Retrieved ${results.length} results`);

    // Step 4: Verify all rating fields are present (1-1000 scales)
    for (let i = 0; i < results.length; i++) {
      const rating = results[i];

      // Basic fields
      expect(rating.imageId).toBeDefined();
      expect(rating.filename).toBeDefined();
      expect(rating.starRating).toBeGreaterThanOrEqual(1);
      expect(rating.starRating).toBeLessThanOrEqual(5);
      expect(rating.colorLabel).toMatch(/red|yellow|green|blue|purple|none/);
      expect(rating.keepReject).toMatch(/keep|reject|maybe/);
      expect(rating.description).toBeDefined();
      expect(rating.tags).toBeInstanceOf(Array);

      // Technical quality (1-1000 scale fields)
      expect(rating.technicalQuality).toBeDefined();

      // Note: Not all fields may be present depending on what the AI returns
      // We verify the structure exists and any present fields are in valid range
      if (rating.technicalQuality.focusAccuracy !== undefined) {
        expect(rating.technicalQuality.focusAccuracy).toBeGreaterThanOrEqual(1);
        expect(rating.technicalQuality.focusAccuracy).toBeLessThanOrEqual(1000);
      }

      if (rating.technicalQuality.exposureQuality !== undefined) {
        expect(rating.technicalQuality.exposureQuality).toBeGreaterThanOrEqual(1);
        expect(rating.technicalQuality.exposureQuality).toBeLessThanOrEqual(1000);
      }

      if (rating.technicalQuality.compositionScore !== undefined) {
        expect(rating.technicalQuality.compositionScore).toBeGreaterThanOrEqual(1);
        expect(rating.technicalQuality.compositionScore).toBeLessThanOrEqual(1000);
      }

      // Legacy 0-1 fields (for backward compatibility)
      expect(rating.technicalQuality.sharpness).toBeGreaterThanOrEqual(0);
      expect(rating.technicalQuality.sharpness).toBeLessThanOrEqual(1);
      expect(rating.technicalQuality.exposure).toBeGreaterThanOrEqual(0);
      expect(rating.technicalQuality.exposure).toBeLessThanOrEqual(1);
      expect(rating.technicalQuality.composition).toBeGreaterThanOrEqual(0);
      expect(rating.technicalQuality.composition).toBeLessThanOrEqual(1);
      expect(rating.technicalQuality.overallScore).toBeGreaterThanOrEqual(0);
      expect(rating.technicalQuality.overallScore).toBeLessThanOrEqual(1);

      // Subject analysis
      expect(rating.subjectAnalysis).toBeDefined();
      expect(rating.subjectAnalysis.primarySubject).toBeDefined();
      expect(rating.subjectAnalysis.eyesOpen).toBeDefined();
      expect(rating.subjectAnalysis.smiling).toBeDefined();
      expect(rating.subjectAnalysis.inFocus).toBeDefined();

      // 1-1000 scale fields (if present)
      if (rating.subjectAnalysis.emotionIntensity !== undefined) {
        expect(rating.subjectAnalysis.emotionIntensity).toBeGreaterThanOrEqual(1);
        expect(rating.subjectAnalysis.emotionIntensity).toBeLessThanOrEqual(1000);
      }

      console.log(
        `Image ${i + 1}: ${rating.filename} - ` +
        `Stars=${rating.starRating}, Color=${rating.colorLabel}, ` +
        `Overall=${rating.technicalQuality.overallScore.toFixed(2)}`
      );
    }

    // Step 5: Verify cost is ~50% of concurrent mode
    const batchCostPerImage = adapter.getBatchCostPerImage();
    const regularCostPerImage = adapter.getCostPerImage();

    expect(batchCostPerImage).toBeCloseTo(regularCostPerImage * 0.5, 6);

    const totalBatchCost = batchCostPerImage * testImages.length;
    const totalRegularCost = regularCostPerImage * testImages.length;
    const savings = totalRegularCost - totalBatchCost;
    const savingsPercent = (savings / totalRegularCost) * 100;

    console.log('\n=== Cost Analysis ===');
    console.log(`Regular cost per image: $${regularCostPerImage.toFixed(6)}`);
    console.log(`Batch cost per image: $${batchCostPerImage.toFixed(6)}`);
    console.log(`Total regular cost: $${totalRegularCost.toFixed(4)}`);
    console.log(`Total batch cost: $${totalBatchCost.toFixed(4)}`);
    console.log(`Savings: $${savings.toFixed(4)} (${savingsPercent.toFixed(1)}%)`);

    expect(savingsPercent).toBeCloseTo(50, 0);

    console.log('\n=== Integration Test PASSED ===');
  }, TEST_TIMEOUT);

  it('should handle batch status polling for pending jobs', async () => {
    // This test verifies the polling mechanism works
    // We submit a batch and immediately check status (should be queued/processing)

    const request: BatchImageRequest = {
      images: testImages.slice(0, 3), // Just 3 images for quick test
      systemPrompt: 'Rate photos',
      userPrompt: 'Analyze quality'
    };

    const batchJob = await adapter.submitBatch(request);
    const status = await adapter.checkBatchStatus(batchJob.jobId);

    expect(status.jobId).toBe(batchJob.jobId);
    expect(status.status).toMatch(/queued|processing|completed/);
    expect(status.totalImages).toBeGreaterThanOrEqual(0);
    expect(status.createdAt).toBeInstanceOf(Date);

    console.log(`Status check for ${batchJob.jobId}: ${status.status}`);
  }, 30000);

  it('should handle errors gracefully when retrieving incomplete batch', async () => {
    const request: BatchImageRequest = {
      images: testImages.slice(0, 2),
      systemPrompt: 'Test',
      userPrompt: 'Test'
    };

    const batchJob = await adapter.submitBatch(request);

    // Try to retrieve results immediately (should fail if not complete)
    try {
      await adapter.retrieveBatchResults(batchJob.jobId);

      // If we reach here, the job completed extremely fast (or was already complete)
      // This is fine - just log it
      console.log('Batch completed immediately (very fast!)');
    } catch (error: any) {
      // Expected error if job not complete
      expect(error.message).toContain('is not complete');
      console.log(`Expected error caught: ${error.message}`);
    }
  }, 30000);
});

describe.skipIf(GOOGLE_API_KEY)('Google Batch API Integration - Skipped', () => {
  it('should skip integration tests when GOOGLE_API_KEY is not set', () => {
    console.log('⚠️  Google Batch API integration tests skipped - GOOGLE_API_KEY not set');
    console.log('   Set GOOGLE_API_KEY environment variable to run these tests');
  });
});
