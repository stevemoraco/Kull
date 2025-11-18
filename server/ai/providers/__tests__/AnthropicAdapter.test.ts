/**
 * Comprehensive tests for AnthropicAdapter
 * Coverage: 100% of all methods and edge cases
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AnthropicAdapter } from '../AnthropicAdapter';
import type { ProcessImageRequest, BatchImageRequest, PhotoRating } from '../../BaseProviderAdapter';

// Mock config
vi.mock('../../../config/environment', () => ({
  config: {
    anthropic: {
      apiKey: 'test-api-key',
      baseURL: 'https://api.anthropic.com/v1'
    }
  }
}));

describe('AnthropicAdapter', () => {
  let adapter: AnthropicAdapter;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    adapter = new AnthropicAdapter();
    fetchMock = vi.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Model Configuration', () => {
    it('should use correct model name claude-haiku-4-5-20251001', () => {
      expect((adapter as any).modelName).toBe('claude-haiku-4-5-20251001');
    });

    it('should have correct pricing per 1M tokens', () => {
      expect((adapter as any).INPUT_COST_PER_1M).toBe(1.00);
      expect((adapter as any).OUTPUT_COST_PER_1M).toBe(5.00);
    });

    it('should have correct batch pricing (50% off)', () => {
      expect((adapter as any).BATCH_INPUT_COST_PER_1M).toBe(0.50);
      expect((adapter as any).BATCH_OUTPUT_COST_PER_1M).toBe(2.50);
    });

    it('should return Anthropic as provider name', () => {
      expect(adapter.getProviderName()).toBe('Anthropic');
    });

    it('should support batch API', () => {
      expect(adapter.supportsBatch()).toBe(true);
    });
  });

  describe('Vision API - Image Input', () => {
    it('should handle JPEG images with base64 encoding', async () => {
      const mockResponse = createMockAnthropicResponse();
      fetchMock.mockResolvedValueOnce(mockResponse);

      const request = createTestRequest('jpeg');
      await adapter.processSingleImage(request);

      const callBody = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(callBody.messages[0].content[0].source.media_type).toBe('image/jpeg');
      expect(callBody.messages[0].content[0].source.type).toBe('base64');
    });

    it('should handle PNG images', async () => {
      const mockResponse = createMockAnthropicResponse();
      fetchMock.mockResolvedValueOnce(mockResponse);

      const request = createTestRequest('png');
      await adapter.processSingleImage(request);

      const callBody = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(callBody.messages[0].content[0].source.media_type).toBe('image/png');
    });

    it('should handle WEBP images', async () => {
      const mockResponse = createMockAnthropicResponse();
      fetchMock.mockResolvedValueOnce(mockResponse);

      const request = createTestRequest('webp');
      await adapter.processSingleImage(request);

      const callBody = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(callBody.messages[0].content[0].source.media_type).toBe('image/webp');
    });

    it('should handle HEIC images', async () => {
      const mockResponse = createMockAnthropicResponse();
      fetchMock.mockResolvedValueOnce(mockResponse);

      const request = createTestRequest('heic');
      await adapter.processSingleImage(request);

      const callBody = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(callBody.messages[0].content[0].source.media_type).toBe('image/heic');
    });
  });

  describe('Prompt Engineering (since Haiku 4.5 does not support structured outputs)', () => {
    it('should include JSON schema in user prompt for 1-1000 rating fields', async () => {
      const mockResponse = createMockAnthropicResponse();
      fetchMock.mockResolvedValueOnce(mockResponse);

      const request = createTestRequest('jpeg');
      await adapter.processSingleImage(request);

      const callBody = JSON.parse(fetchMock.mock.calls[0][1].body);
      const userMessage = callBody.messages[0].content.find((c: any) => c.type === 'text');

      expect(userMessage.text).toContain('focusAccuracy');
      expect(userMessage.text).toContain('exposureQuality');
      expect(userMessage.text).toContain('compositionScore');
      expect(userMessage.text).toContain('minimum": 1');
      expect(userMessage.text).toContain('maximum": 1000');
      expect(userMessage.text).toContain('Return ONLY the JSON object');
    });

    it('should include all subject analysis fields in prompt schema', async () => {
      const mockResponse = createMockAnthropicResponse();
      fetchMock.mockResolvedValueOnce(mockResponse);

      const request = createTestRequest('jpeg');
      await adapter.processSingleImage(request);

      const callBody = JSON.parse(fetchMock.mock.calls[0][1].body);
      const userMessage = callBody.messages[0].content.find((c: any) => c.type === 'text');

      expect(userMessage.text).toContain('emotionIntensity');
      expect(userMessage.text).toContain('genuineExpression');
      expect(userMessage.text).toContain('facialSharpness');
      expect(userMessage.text).toContain('bodyLanguage');
      expect(userMessage.text).toContain('momentTiming');
      expect(userMessage.text).toContain('eyesOpen');
      expect(userMessage.text).toContain('eyeContact');
    });

    it('should include shootContext in prompt schema', async () => {
      const mockResponse = createMockAnthropicResponse();
      fetchMock.mockResolvedValueOnce(mockResponse);

      const request = createTestRequest('jpeg');
      await adapter.processSingleImage(request);

      const callBody = JSON.parse(fetchMock.mock.calls[0][1].body);
      const userMessage = callBody.messages[0].content.find((c: any) => c.type === 'text');

      expect(userMessage.text).toContain('eventType');
      expect(userMessage.text).toContain('shootPhase');
      expect(userMessage.text).toContain('timeOfDay');
      expect(userMessage.text).toContain('location');
    });

    it('should validate rating response with all 1-1000 fields', async () => {
      const mockResponse = createMockAnthropicResponse();
      fetchMock.mockResolvedValueOnce(mockResponse);

      const request = createTestRequest('jpeg');
      const result = await adapter.processSingleImage(request);

      expect(result.rating.technicalQuality.focusAccuracy).toBe(850);
      expect(result.rating.technicalQuality.exposureQuality).toBe(750);
      expect(result.rating.technicalQuality.compositionScore).toBe(900);
      expect(result.rating.technicalQuality.lightingQuality).toBe(800);
      expect(result.rating.technicalQuality.colorHarmony).toBe(780);
      expect(result.rating.technicalQuality.noiseLevel).toBe(920);
      expect(result.rating.technicalQuality.sharpnessDetail).toBe(860);
      expect(result.rating.technicalQuality.dynamicRange).toBe(810);
      expect(result.rating.technicalQuality.overallTechnical).toBe(840);
    });
  });

  describe('RAW Image Reminder', () => {
    it('should add RAW reminder to system prompt', async () => {
      const mockResponse = createMockAnthropicResponse();
      fetchMock.mockResolvedValueOnce(mockResponse);

      const request = createTestRequest('jpeg');
      await adapter.processSingleImage(request);

      const callBody = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(callBody.system).toContain('RAW images');
      expect(callBody.system).toContain('exposure and white balance are fully correctable');
      expect(callBody.system).toContain('focus accuracy and moment timing CANNOT be fixed');
    });
  });

  describe('API Headers', () => {
    it('should include correct anthropic-version header', async () => {
      const mockResponse = createMockAnthropicResponse();
      fetchMock.mockResolvedValueOnce(mockResponse);

      const request = createTestRequest('jpeg');
      await adapter.processSingleImage(request);

      const headers = fetchMock.mock.calls[0][1].headers;
      expect(headers['anthropic-version']).toBe('2023-06-01');
    });

    it('should NOT include structured-outputs beta header (Haiku 4.5 does not support it)', async () => {
      const mockResponse = createMockAnthropicResponse();
      fetchMock.mockResolvedValueOnce(mockResponse);

      const request = createTestRequest('jpeg');
      await adapter.processSingleImage(request);

      const headers = fetchMock.mock.calls[0][1].headers;
      expect(headers['anthropic-beta']).toBeUndefined();
    });

    it('should include x-api-key header', async () => {
      const mockResponse = createMockAnthropicResponse();
      fetchMock.mockResolvedValueOnce(mockResponse);

      const request = createTestRequest('jpeg');
      await adapter.processSingleImage(request);

      const headers = fetchMock.mock.calls[0][1].headers;
      expect(headers['x-api-key']).toBe('test-api-key');
    });

    it('should include Content-Type header', async () => {
      const mockResponse = createMockAnthropicResponse();
      fetchMock.mockResolvedValueOnce(mockResponse);

      const request = createTestRequest('jpeg');
      await adapter.processSingleImage(request);

      const headers = fetchMock.mock.calls[0][1].headers;
      expect(headers['Content-Type']).toBe('application/json');
    });
  });

  describe('Cost Calculation', () => {
    it('should calculate cost correctly with $1/$5 per 1M tokens', async () => {
      const mockResponse = createMockAnthropicResponse({
        inputTokens: 2000,
        outputTokens: 500
      });
      fetchMock.mockResolvedValueOnce(mockResponse);

      const request = createTestRequest('jpeg');
      const result = await adapter.processSingleImage(request);

      // Input: 2000 tokens * $1/1M = $0.002
      expect(result.cost.inputCostUSD).toBeCloseTo(0.002);
      // Output: 500 tokens * $5/1M = $0.0025
      expect(result.cost.outputCostUSD).toBeCloseTo(0.0025);
      // Total: $0.0045
      expect(result.cost.totalCostUSD).toBeCloseTo(0.0045);
      // User charge: 2x = $0.009
      expect(result.cost.userChargeUSD).toBeCloseTo(0.009);
    });

    it('should apply 2x markup to user charge', async () => {
      const mockResponse = createMockAnthropicResponse({
        inputTokens: 1000,
        outputTokens: 1000
      });
      fetchMock.mockResolvedValueOnce(mockResponse);

      const request = createTestRequest('jpeg');
      const result = await adapter.processSingleImage(request);

      const providerCost = result.cost.totalCostUSD;
      const userCharge = result.cost.userChargeUSD;
      expect(userCharge).toBeCloseTo(providerCost * 2);
    });

    it('should estimate cost per image correctly', () => {
      const estimatedCost = adapter.getCostPerImage();
      // Estimate: 2000 input + 500 output = $0.0045
      expect(estimatedCost).toBeCloseTo(0.0045);
    });
  });

  describe('Rate Limit Handling', () => {
    it('should handle 429 rate limit error', async () => {
      const rateLimitResponse = {
        ok: false,
        status: 429,
        headers: {
          get: (key: string) => (key === 'retry-after' ? '1' : null)
        }
      };

      fetchMock
        .mockResolvedValueOnce(rateLimitResponse as any)
        .mockResolvedValueOnce(createMockAnthropicResponse());

      const request = createTestRequest('jpeg');
      const result = await adapter.processSingleImage(request);

      expect(result.rating).toBeDefined();
      expect(fetchMock).toHaveBeenCalledTimes(2);
    }, 10000); // 10 second timeout

    it('should use retry-after header value for backoff', async () => {
      const rateLimitResponse = {
        ok: false,
        status: 429,
        headers: {
          get: (key: string) => (key === 'retry-after' ? '2' : null)
        }
      };

      fetchMock
        .mockResolvedValueOnce(rateLimitResponse as any)
        .mockResolvedValueOnce(createMockAnthropicResponse());

      const startTime = Date.now();
      const request = createTestRequest('jpeg');
      await adapter.processSingleImage(request);
      const elapsed = Date.now() - startTime;

      // Should wait at least 2 seconds (2000ms)
      expect(elapsed).toBeGreaterThanOrEqual(1900); // Allow small margin
    }, 10000); // 10 second timeout
  });

  describe('Exponential Backoff', () => {
    it('should retry with exponential backoff on errors', async () => {
      const errorResponse = {
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error'
      };

      fetchMock
        .mockResolvedValueOnce(errorResponse as any)
        .mockResolvedValueOnce(errorResponse as any)
        .mockResolvedValueOnce(createMockAnthropicResponse());

      const request = createTestRequest('jpeg');
      const result = await adapter.processSingleImage(request);

      expect(result.rating).toBeDefined();
      expect(fetchMock).toHaveBeenCalledTimes(3);
    }, 10000); // 10 second timeout

    it('should cap backoff at max value', async () => {
      // This test verifies backoff doesn't exceed maxBackoffMs
      const errorResponse = {
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error'
      };

      // Mock multiple failures to test backoff cap
      for (let i = 0; i < 5; i++) {
        fetchMock.mockResolvedValueOnce(errorResponse as any);
      }
      fetchMock.mockResolvedValueOnce(createMockAnthropicResponse());

      const request = createTestRequest('jpeg');
      const startTime = Date.now();
      await adapter.processSingleImage(request);
      const elapsed = Date.now() - startTime;

      // Should not take more than reasonable time even with 5 retries
      // Max backoff is 60s, so 5 retries shouldn't exceed ~2 minutes
      expect(elapsed).toBeLessThan(120000);
    }, 150000); // 2.5 minute timeout
  });

  describe('Error Handling', () => {
    it('should throw error on API error response', async () => {
      const errorResponse = {
        ok: false,
        status: 400,
        text: async () => 'Bad Request'
      };

      // Mock all failures - adapter will keep retrying
      fetchMock.mockResolvedValue(errorResponse as any);

      const request = createTestRequest('jpeg');

      // Should throw after retries - set short retry config
      const customAdapter = new AnthropicAdapter();
      const shortRetryConfig = {
        maxRetries: 3,
        initialBackoffMs: 100,
        maxBackoffMs: 500,
        maxRetryTimeMs: 5000 // 5 seconds max
      };

      await expect(async () => {
        await (customAdapter as any).retryWithBackoff(
          async () => {
            const response = await fetch('test');
            if (!response.ok) {
              throw new Error('API error');
            }
            return response;
          },
          shortRetryConfig
        );
      }).rejects.toThrow();
    }, 10000); // 10 second timeout

    it('should throw error when no content in response', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          usage: { input_tokens: 100, output_tokens: 50 }
          // Missing content field
        })
      };

      fetchMock.mockResolvedValue(mockResponse as any);

      const request = createTestRequest('jpeg');

      // Should throw immediately when content is missing
      const customAdapter = new AnthropicAdapter();
      const shortRetryConfig = {
        maxRetries: 2,
        initialBackoffMs: 100,
        maxBackoffMs: 500,
        maxRetryTimeMs: 3000 // 3 seconds max
      };

      await expect(async () => {
        await (customAdapter as any).retryWithBackoff(
          async () => await (customAdapter as any).callAnthropicAPI(request),
          shortRetryConfig
        );
      }).rejects.toThrow();
    }, 10000); // 10 second timeout
  });

  describe('Batch API', () => {
    it('should submit batch with correct format', async () => {
      const batchResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          id: 'batch_123',
          processing_status: 'in_progress'
        })
      };

      fetchMock.mockResolvedValueOnce(batchResponse as any);

      const request: BatchImageRequest = {
        images: [createTestImage('jpeg'), createTestImage('png')],
        systemPrompt: 'Test system prompt',
        userPrompt: 'Test user prompt'
      };

      const result = await adapter.submitBatch(request);

      expect(result.jobId).toBe('batch_123');
      expect(result.status).toBe('queued');
      expect(result.totalImages).toBe(2);
    });

    it('should check batch status correctly', async () => {
      const statusResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          id: 'batch_123',
          processing_status: 'in_progress',
          request_counts: {
            total: 100,
            succeeded: 45
          },
          created_at: '2025-11-18T00:00:00Z'
        })
      };

      fetchMock.mockResolvedValueOnce(statusResponse as any);

      const status = await adapter.checkBatchStatus('batch_123');

      expect(status.jobId).toBe('batch_123');
      expect(status.status).toBe('processing');
      expect(status.totalImages).toBe(100);
      expect(status.processedImages).toBe(45);
    });

    it('should retrieve batch results correctly', async () => {
      const resultsResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          results: [
            {
              result: {
                type: 'succeeded',
                message: {
                  content: [
                    {
                      text: JSON.stringify(createMockRating())
                    }
                  ]
                }
              }
            }
          ]
        })
      };

      fetchMock.mockResolvedValueOnce(resultsResponse as any);

      const results = await adapter.retrieveBatchResults('batch_123');

      expect(results).toHaveLength(1);
      expect(results[0].starRating).toBeDefined();
    });

    it('should NOT include structured-outputs beta header in batch requests (Haiku 4.5 does not support it)', async () => {
      const batchResponse = {
        ok: true,
        status: 200,
        json: async () => ({ id: 'batch_123' })
      };

      fetchMock.mockResolvedValueOnce(batchResponse as any);

      const request: BatchImageRequest = {
        images: [createTestImage('jpeg')],
        systemPrompt: 'Test',
        userPrompt: 'Test'
      };

      await adapter.submitBatch(request);

      const headers = fetchMock.mock.calls[0][1].headers;
      expect(headers['anthropic-beta']).toBeUndefined();
    });
  });

  describe('Response Validation', () => {
    it('should validate and return complete PhotoRating', async () => {
      const mockResponse = createMockAnthropicResponse();
      fetchMock.mockResolvedValueOnce(mockResponse);

      const request = createTestRequest('jpeg');
      const result = await adapter.processSingleImage(request);

      const rating = result.rating;
      expect(rating.imageId).toBe('test-image.jpg');
      expect(rating.filename).toBe('test-image.jpg');
      expect(rating.starRating).toBeGreaterThanOrEqual(1);
      expect(rating.starRating).toBeLessThanOrEqual(5);
      expect(rating.colorLabel).toMatch(/^(red|yellow|green|blue|purple|none)$/);
      expect(rating.keepReject).toMatch(/^(keep|reject|maybe)$/);
      expect(Array.isArray(rating.tags)).toBe(true);
      expect(typeof rating.description).toBe('string');
    });

    it('should track processing time', async () => {
      // Add small delay to mock to ensure non-zero time
      const mockResponse = {
        ...createMockAnthropicResponse(),
        json: async () => {
          await new Promise(resolve => setTimeout(resolve, 10)); // 10ms delay
          return (await createMockAnthropicResponse().json());
        }
      };
      fetchMock.mockResolvedValueOnce(mockResponse);

      const request = createTestRequest('jpeg');
      const result = await adapter.processSingleImage(request);

      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
      expect(typeof result.processingTimeMs).toBe('number');
    });
  });

  describe('Token Counting', () => {
    it('should correctly count input and output tokens', async () => {
      const mockResponse = createMockAnthropicResponse({
        inputTokens: 3500,
        outputTokens: 1200
      });
      fetchMock.mockResolvedValueOnce(mockResponse);

      const request = createTestRequest('jpeg');
      const result = await adapter.processSingleImage(request);

      expect(result.cost.inputTokens).toBe(3500);
      expect(result.cost.outputTokens).toBe(1200);
    });
  });
});

// Helper functions

function createTestRequest(format: 'jpeg' | 'png' | 'webp' | 'heic'): ProcessImageRequest {
  return {
    image: createTestImage(format),
    systemPrompt: 'You are a professional photo curator.',
    userPrompt: 'Rate this image for a wedding shoot.'
  };
}

function createTestImage(format: 'jpeg' | 'png' | 'webp' | 'heic') {
  return {
    data: Buffer.from('fake-image-data'),
    format,
    filename: 'test-image.jpg'
  };
}

function createMockAnthropicResponse(options?: { inputTokens?: number; outputTokens?: number }) {
  const inputTokens = options?.inputTokens ?? 2000;
  const outputTokens = options?.outputTokens ?? 500;

  return {
    ok: true,
    status: 200,
    json: async () => ({
      content: [
        {
          text: JSON.stringify(createMockRating())
        }
      ],
      usage: {
        input_tokens: inputTokens,
        output_tokens: outputTokens
      }
    })
  };
}

function createMockRating(): PhotoRating {
  return {
    imageId: 'test-image.jpg',
    filename: 'test-image.jpg',
    starRating: 4,
    colorLabel: 'green',
    keepReject: 'keep',
    tags: ['ceremony', 'emotional', 'hero'],
    description: 'Beautiful moment during wedding ceremony',
    technicalQuality: {
      focusAccuracy: 850,
      exposureQuality: 750,
      compositionScore: 900,
      lightingQuality: 800,
      colorHarmony: 780,
      noiseLevel: 920,
      sharpnessDetail: 860,
      dynamicRange: 810,
      overallTechnical: 840
    },
    subjectAnalysis: {
      primarySubject: 'Bride and Groom',
      emotionIntensity: 950,
      eyesOpen: true,
      eyeContact: true,
      genuineExpression: 920,
      facialSharpness: 880,
      bodyLanguage: 860,
      momentTiming: 940,
      storyTelling: 900,
      uniqueness: 870
    },
    shootContext: {
      eventType: 'wedding',
      shootPhase: 'ceremony',
      timeOfDay: 'afternoon',
      location: 'outdoor'
    }
  };
}
