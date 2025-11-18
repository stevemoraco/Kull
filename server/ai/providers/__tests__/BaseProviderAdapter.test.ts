import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BaseProviderAdapter, ImageInput, ProcessImageRequest, PhotoRating } from '../../BaseProviderAdapter';

// Mock implementation for testing
class MockProviderAdapter extends BaseProviderAdapter {
  protected apiKey = 'test-key';
  protected baseURL = 'https://test.api.com';
  protected modelName = 'test-model';

  async processSingleImage(request: ProcessImageRequest) {
    return {
      rating: this.validateRating({
        imageId: request.image.filename,
        filename: request.image.filename,
        starRating: 5,
        colorLabel: 'green',
        keepReject: 'keep',
        tags: ['test'],
        description: 'Test image',
        technicalQuality: {
          sharpness: 0.9,
          exposure: 0.8,
          composition: 0.85,
          overallScore: 0.85
        },
        subjectAnalysis: {
          primarySubject: 'Person',
          emotion: 'Happy',
          eyesOpen: true,
          smiling: true,
          inFocus: true
        }
      }),
      cost: {
        inputTokens: 1000,
        outputTokens: 500,
        inputCostUSD: 0.001,
        outputCostUSD: 0.002,
        totalCostUSD: 0.003,
        userChargeUSD: 0.006
      },
      processingTimeMs: 100
    };
  }

  async submitBatch() {
    throw new Error('Not implemented');
  }

  async checkBatchStatus() {
    throw new Error('Not implemented');
  }

  async retrieveBatchResults() {
    throw new Error('Not implemented');
  }

  getCostPerImage() {
    return 0.005;
  }

  getProviderName() {
    return 'Mock Provider';
  }

  supportsBatch() {
    return false;
  }
}

describe('BaseProviderAdapter', () => {
  let adapter: MockProviderAdapter;
  let testImage: ImageInput;

  beforeEach(() => {
    adapter = new MockProviderAdapter();
    testImage = {
      data: Buffer.from('test-image-data'),
      format: 'jpeg',
      filename: 'test.jpg'
    };
  });

  it('should validate rating with all required fields', async () => {
    const request: ProcessImageRequest = {
      image: testImage,
      systemPrompt: 'Test system prompt',
      userPrompt: 'Test user prompt'
    };

    const result = await adapter.processSingleImage(request);

    expect(result.rating).toBeDefined();
    expect(result.rating.starRating).toBeGreaterThanOrEqual(1);
    expect(result.rating.starRating).toBeLessThanOrEqual(5);
    expect(result.rating.colorLabel).toBe('green');
    expect(result.rating.keepReject).toBe('keep');
  });

  it('should calculate user charge as 2x provider cost', () => {
    const providerCost = 0.005;
    const userCharge = adapter['calculateUserCharge'](providerCost);
    expect(userCharge).toBe(0.010);
  });

  it('should convert image to base64', () => {
    const base64 = adapter['imageToBase64'](testImage);
    expect(base64).toBe(testImage.data.toString('base64'));
  });

  it('should get correct MIME type for image format', () => {
    expect(adapter['getMimeType']('jpeg')).toBe('image/jpeg');
    expect(adapter['getMimeType']('png')).toBe('image/png');
    expect(adapter['getMimeType']('webp')).toBe('image/webp');
    expect(adapter['getMimeType']('heic')).toBe('image/heic');
  });

  it('should clamp star rating between 1 and 5', () => {
    const rating1 = adapter['validateRating']({ starRating: 0 } as any);
    expect(rating1.starRating).toBe(1);

    const rating2 = adapter['validateRating']({ starRating: 10 } as any);
    expect(rating2.starRating).toBe(5);

    const rating3 = adapter['validateRating']({ starRating: 3.7 } as any);
    expect(rating3.starRating).toBe(4);
  });

  it('should validate color labels', () => {
    const rating = adapter['validateRating']({ colorLabel: 'invalid' } as any);
    expect(rating.colorLabel).toBe('none');

    const rating2 = adapter['validateRating']({ colorLabel: 'red' } as any);
    expect(rating2.colorLabel).toBe('red');
  });

  it('should infer keepReject from star rating', () => {
    const rating1 = adapter['validateRating']({ starRating: 5 } as any);
    expect(rating1.keepReject).toBe('keep');

    const rating2 = adapter['validateRating']({ starRating: 1 } as any);
    expect(rating2.keepReject).toBe('reject');

    const rating3 = adapter['validateRating']({ starRating: 3 } as any);
    expect(rating3.keepReject).toBe('maybe');
  });

  it('should have correct provider name', () => {
    expect(adapter.getProviderName()).toBe('Mock Provider');
  });

  it('should return correct batch support status', () => {
    expect(adapter.supportsBatch()).toBe(false);
  });
});
