/**
 * Grok Adapter Unit Tests
 * Tests for vision support, 1-1000 ratings, RAW reminders, and correct model name
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GrokAdapter } from '../GrokAdapter';
import type { ProcessImageRequest, BatchImageRequest, ImageInput } from '../../BaseProviderAdapter';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

describe('GrokAdapter', () => {
  let adapter: GrokAdapter;

  const mockImage: ImageInput = {
    data: Buffer.from('fake-image-data'),
    format: 'jpeg',
    filename: 'test.jpg'
  };

  beforeEach(() => {
    adapter = new GrokAdapter();
    // Override retry config for faster tests
    (adapter as any).retryWithBackoff = async function<T>(
      operation: () => Promise<T>,
      config = { maxRetries: 3, initialBackoffMs: 10, maxBackoffMs: 100, maxRetryTimeMs: 1000 }
    ): Promise<T> {
      let attempt = 0;
      let backoffMs = config.initialBackoffMs;
      const startTime = Date.now();

      while (true) {
        try {
          return await operation();
        } catch (error: any) {
          attempt++;
          const elapsedMs = Date.now() - startTime;

          if (elapsedMs >= config.maxRetryTimeMs || attempt >= config.maxRetries) {
            throw error;
          }

          if (error.status === 429 && error.retryAfter) {
            backoffMs = error.retryAfter * 1000;
          }

          backoffMs = Math.min(backoffMs, config.maxBackoffMs);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
          backoffMs = Math.min(backoffMs * 2, config.maxBackoffMs);
        }
      }
    };
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Model Configuration', () => {
    it('should use correct model name grok-2-vision-1212', () => {
      expect((adapter as any).modelName).toBe('grok-2-vision-1212');
    });

    it('should use correct pricing $2/$10 per 1M tokens', () => {
      const INPUT_COST = (adapter as any).INPUT_COST_PER_1M;
      const OUTPUT_COST = (adapter as any).OUTPUT_COST_PER_1M;

      expect(INPUT_COST).toBe(2.00);
      expect(OUTPUT_COST).toBe(10.00);
    });

    it('should return xAI Grok as provider name', () => {
      expect(adapter.getProviderName()).toBe('xAI Grok');
    });

    it('should not support batch API', () => {
      expect(adapter.supportsBatch()).toBe(false);
    });
  });

  describe('Vision Support', () => {
    it('should process single image with vision input', async () => {
      const request: ProcessImageRequest = {
        image: mockImage,
        systemPrompt: 'You are a photo curator',
        userPrompt: 'Rate this photo'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify({
                starRating: 4,
                colorLabel: 'green',
                keepReject: 'keep',
                description: 'Great shot',
                tags: ['portrait'],
                technicalQuality: {
                  focusAccuracy: 850,
                  exposureQuality: 700,
                  compositionScore: 900,
                  lightingQuality: 800,
                  colorHarmony: 750,
                  noiseLevel: 900,
                  sharpnessDetail: 880,
                  dynamicRange: 820,
                  overallTechnical: 850
                },
                subjectAnalysis: {
                  primarySubject: 'Person',
                  emotionIntensity: 750,
                  eyesOpen: true,
                  eyeContact: true,
                  genuineExpression: 800,
                  facialSharpness: 900,
                  bodyLanguage: 780,
                  momentTiming: 820,
                  storyTelling: 760,
                  uniqueness: 650
                }
              })
            }
          }],
          usage: {
            prompt_tokens: 2000,
            completion_tokens: 300
          }
        })
      } as any);

      const result = await adapter.processSingleImage(request);

      expect(result.rating.starRating).toBe(4);
      expect(result.rating.technicalQuality.focusAccuracy).toBe(850);
      expect(result.rating.subjectAnalysis.emotionIntensity).toBe(750);
      expect(result.cost.totalCostUSD).toBeGreaterThan(0);
    });

    it('should encode image as base64 correctly', async () => {
      const request: ProcessImageRequest = {
        image: mockImage,
        systemPrompt: 'Rate photo',
        userPrompt: 'Analyze'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify({
                starRating: 3,
                colorLabel: 'none',
                keepReject: 'maybe',
                description: 'Test',
                tags: [],
                technicalQuality: {
                  focusAccuracy: 500,
                  exposureQuality: 500,
                  compositionScore: 500,
                  lightingQuality: 500,
                  colorHarmony: 500,
                  noiseLevel: 500,
                  sharpnessDetail: 500,
                  dynamicRange: 500,
                  overallTechnical: 500
                },
                subjectAnalysis: {
                  primarySubject: 'Unknown',
                  emotionIntensity: 500,
                  eyesOpen: true,
                  eyeContact: false,
                  genuineExpression: 500,
                  facialSharpness: 500,
                  bodyLanguage: 500,
                  momentTiming: 500,
                  storyTelling: 500,
                  uniqueness: 500
                }
              })
            }
          }],
          usage: { prompt_tokens: 1000, completion_tokens: 200 }
        })
      } as any);

      await adapter.processSingleImage(request);

      const apiCall = mockFetch.mock.calls[0];
      const body = JSON.parse(apiCall[1].body);

      expect(body.messages[1].content[0].type).toBe('image_url');
      expect(body.messages[1].content[0].image_url.url).toContain('data:image/jpeg;base64,');
    });

    it('should set correct MIME types for different formats', async () => {
      const formats: Array<{ format: 'jpeg' | 'png' | 'webp' | 'heic'; mime: string }> = [
        { format: 'jpeg', mime: 'image/jpeg' },
        { format: 'png', mime: 'image/png' },
        { format: 'webp', mime: 'image/webp' },
        { format: 'heic', mime: 'image/heic' }
      ];

      for (const { format, mime } of formats) {
        const testImage: ImageInput = {
          data: Buffer.from('test'),
          format,
          filename: `test.${format}`
        };

        const request: ProcessImageRequest = {
          image: testImage,
          systemPrompt: 'Rate',
          userPrompt: 'Analyze'
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            choices: [{
              message: {
                content: JSON.stringify({
                  starRating: 3,
                  colorLabel: 'none',
                  keepReject: 'maybe',
                  description: 'Test',
                  tags: [],
                  technicalQuality: {
                    focusAccuracy: 500,
                    exposureQuality: 500,
                    compositionScore: 500,
                    lightingQuality: 500,
                    colorHarmony: 500,
                    noiseLevel: 500,
                    sharpnessDetail: 500,
                    dynamicRange: 500,
                    overallTechnical: 500
                  },
                  subjectAnalysis: {
                    primarySubject: 'Test',
                    emotionIntensity: 500,
                    eyesOpen: true,
                    eyeContact: false,
                    genuineExpression: 500,
                    facialSharpness: 500,
                    bodyLanguage: 500,
                    momentTiming: 500,
                    storyTelling: 500,
                    uniqueness: 500
                  }
                })
              }
            }],
            usage: { prompt_tokens: 1000, completion_tokens: 200 }
          })
        } as any);

        await adapter.processSingleImage(request);

        const apiCall = mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
        const body = JSON.parse(apiCall[1].body);

        expect(body.messages[1].content[0].image_url.url).toContain(`data:${mime};base64,`);
      }
    });
  });

  describe('1-1000 Scale Rating Fields', () => {
    it('should return all required technicalQuality fields (1-1000 scale)', async () => {
      const request: ProcessImageRequest = {
        image: mockImage,
        systemPrompt: 'Rate',
        userPrompt: 'Analyze'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify({
                starRating: 5,
                colorLabel: 'blue',
                keepReject: 'keep',
                description: 'Excellent',
                tags: ['sharp', 'vibrant'],
                technicalQuality: {
                  focusAccuracy: 980,
                  exposureQuality: 920,
                  compositionScore: 950,
                  lightingQuality: 940,
                  colorHarmony: 960,
                  noiseLevel: 990,
                  sharpnessDetail: 975,
                  dynamicRange: 930,
                  overallTechnical: 960
                },
                subjectAnalysis: {
                  primarySubject: 'Bride',
                  emotionIntensity: 950,
                  eyesOpen: true,
                  eyeContact: true,
                  genuineExpression: 980,
                  facialSharpness: 990,
                  bodyLanguage: 940,
                  momentTiming: 970,
                  storyTelling: 960,
                  uniqueness: 900
                }
              })
            }
          }],
          usage: { prompt_tokens: 2500, completion_tokens: 400 }
        })
      } as any);

      const result = await adapter.processSingleImage(request);

      expect(result.rating.technicalQuality.focusAccuracy).toBe(980);
      expect(result.rating.technicalQuality.exposureQuality).toBe(920);
      expect(result.rating.technicalQuality.compositionScore).toBe(950);
      expect(result.rating.technicalQuality.lightingQuality).toBe(940);
      expect(result.rating.technicalQuality.colorHarmony).toBe(960);
      expect(result.rating.technicalQuality.noiseLevel).toBe(990);
      expect(result.rating.technicalQuality.sharpnessDetail).toBe(975);
      expect(result.rating.technicalQuality.dynamicRange).toBe(930);
      expect(result.rating.technicalQuality.overallTechnical).toBe(960);
    });

    it('should return all required subjectAnalysis fields (1-1000 scale)', async () => {
      const request: ProcessImageRequest = {
        image: mockImage,
        systemPrompt: 'Rate',
        userPrompt: 'Analyze'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify({
                starRating: 4,
                colorLabel: 'green',
                keepReject: 'keep',
                description: 'Great moment',
                tags: ['emotional', 'candid'],
                technicalQuality: {
                  focusAccuracy: 850,
                  exposureQuality: 800,
                  compositionScore: 880,
                  lightingQuality: 860,
                  colorHarmony: 840,
                  noiseLevel: 870,
                  sharpnessDetail: 860,
                  dynamicRange: 850,
                  overallTechnical: 860
                },
                subjectAnalysis: {
                  primarySubject: 'Groom',
                  emotionIntensity: 920,
                  eyesOpen: true,
                  eyeContact: false,
                  genuineExpression: 950,
                  facialSharpness: 880,
                  bodyLanguage: 900,
                  momentTiming: 980,
                  storyTelling: 940,
                  uniqueness: 870
                }
              })
            }
          }],
          usage: { prompt_tokens: 2200, completion_tokens: 350 }
        })
      } as any);

      const result = await adapter.processSingleImage(request);

      expect(result.rating.subjectAnalysis.primarySubject).toBe('Groom');
      expect(result.rating.subjectAnalysis.emotionIntensity).toBe(920);
      expect(result.rating.subjectAnalysis.eyesOpen).toBe(true);
      expect(result.rating.subjectAnalysis.eyeContact).toBe(false);
      expect(result.rating.subjectAnalysis.genuineExpression).toBe(950);
      expect(result.rating.subjectAnalysis.facialSharpness).toBe(880);
      expect(result.rating.subjectAnalysis.bodyLanguage).toBe(900);
      expect(result.rating.subjectAnalysis.momentTiming).toBe(980);
      expect(result.rating.subjectAnalysis.storyTelling).toBe(940);
      expect(result.rating.subjectAnalysis.uniqueness).toBe(870);
    });

    it('should validate rating output structure with defaults', async () => {
      const request: ProcessImageRequest = {
        image: mockImage,
        systemPrompt: 'Rate',
        userPrompt: 'Analyze'
      };

      // Return incomplete response to test defaults
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify({
                starRating: 3,
                colorLabel: 'none',
                keepReject: 'maybe',
                description: 'Basic photo',
                tags: []
              })
            }
          }],
          usage: { prompt_tokens: 1500, completion_tokens: 250 }
        })
      } as any);

      const result = await adapter.processSingleImage(request);

      // Should have default values for missing fields (500 = middle)
      expect(result.rating.technicalQuality.focusAccuracy).toBe(500);
      expect(result.rating.technicalQuality.overallTechnical).toBe(500);
      expect(result.rating.subjectAnalysis.emotionIntensity).toBe(500);
      expect(result.rating.subjectAnalysis.primarySubject).toBe('Unknown');
    });
  });

  describe('RAW Image Reminder', () => {
    it('should include RAW image reminder in system prompt', async () => {
      const request: ProcessImageRequest = {
        image: mockImage,
        systemPrompt: 'You are a professional photo curator',
        userPrompt: 'Rate this wedding photo'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify({
                starRating: 4,
                colorLabel: 'green',
                keepReject: 'keep',
                description: 'Nice',
                tags: ['wedding'],
                technicalQuality: {
                  focusAccuracy: 800,
                  exposureQuality: 600,
                  compositionScore: 850,
                  lightingQuality: 750,
                  colorHarmony: 700,
                  noiseLevel: 800,
                  sharpnessDetail: 820,
                  dynamicRange: 780,
                  overallTechnical: 790
                },
                subjectAnalysis: {
                  primarySubject: 'Couple',
                  emotionIntensity: 850,
                  eyesOpen: true,
                  eyeContact: true,
                  genuineExpression: 900,
                  facialSharpness: 820,
                  bodyLanguage: 870,
                  momentTiming: 890,
                  storyTelling: 880,
                  uniqueness: 750
                }
              })
            }
          }],
          usage: { prompt_tokens: 2100, completion_tokens: 320 }
        })
      } as any);

      await adapter.processSingleImage(request);

      const apiCall = mockFetch.mock.calls[0];
      const body = JSON.parse(apiCall[1].body);
      const systemContent = body.messages[0].content;

      expect(systemContent).toContain('CRITICAL RAW IMAGE REMINDER');
      expect(systemContent).toContain('RAW images');
      expect(systemContent).toContain('Exposure and white balance are FULLY correctable');
      expect(systemContent).toContain('focus accuracy and moment timing CANNOT be fixed');
    });
  });

  describe('Cost Calculation', () => {
    it('should calculate cost correctly with $2/$10 per 1M tokens', async () => {
      const request: ProcessImageRequest = {
        image: mockImage,
        systemPrompt: 'Rate',
        userPrompt: 'Analyze'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify({
                starRating: 3,
                colorLabel: 'none',
                keepReject: 'maybe',
                description: 'OK',
                tags: [],
                technicalQuality: {
                  focusAccuracy: 600,
                  exposureQuality: 650,
                  compositionScore: 620,
                  lightingQuality: 610,
                  colorHarmony: 630,
                  noiseLevel: 640,
                  sharpnessDetail: 615,
                  dynamicRange: 625,
                  overallTechnical: 625
                },
                subjectAnalysis: {
                  primarySubject: 'Person',
                  emotionIntensity: 600,
                  eyesOpen: true,
                  eyeContact: true,
                  genuineExpression: 620,
                  facialSharpness: 630,
                  bodyLanguage: 610,
                  momentTiming: 640,
                  storyTelling: 615,
                  uniqueness: 580
                }
              })
            }
          }],
          usage: {
            prompt_tokens: 1000000,  // 1M tokens
            completion_tokens: 500000 // 0.5M tokens
          }
        })
      } as any);

      const result = await adapter.processSingleImage(request);

      // 1M input * $2.00 = $2.00
      expect(result.cost.inputCostUSD).toBe(2.00);
      // 0.5M output * $10.00 = $5.00
      expect(result.cost.outputCostUSD).toBe(5.00);
      // Total = $7.00
      expect(result.cost.totalCostUSD).toBe(7.00);
      // User charge = 2x = $14.00
      expect(result.cost.userChargeUSD).toBe(14.00);
    });

    it('should apply 2x markup for user charge', async () => {
      const request: ProcessImageRequest = {
        image: mockImage,
        systemPrompt: 'Rate',
        userPrompt: 'Analyze'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify({
                starRating: 3,
                colorLabel: 'none',
                keepReject: 'maybe',
                description: 'Test',
                tags: [],
                technicalQuality: {
                  focusAccuracy: 500,
                  exposureQuality: 500,
                  compositionScore: 500,
                  lightingQuality: 500,
                  colorHarmony: 500,
                  noiseLevel: 500,
                  sharpnessDetail: 500,
                  dynamicRange: 500,
                  overallTechnical: 500
                },
                subjectAnalysis: {
                  primarySubject: 'Test',
                  emotionIntensity: 500,
                  eyesOpen: true,
                  eyeContact: false,
                  genuineExpression: 500,
                  facialSharpness: 500,
                  bodyLanguage: 500,
                  momentTiming: 500,
                  storyTelling: 500,
                  uniqueness: 500
                }
              })
            }
          }],
          usage: {
            prompt_tokens: 2000,
            completion_tokens: 300
          }
        })
      } as any);

      const result = await adapter.processSingleImage(request);

      expect(result.cost.userChargeUSD).toBe(result.cost.totalCostUSD * 2);
    });

    it('should estimate cost per image correctly', () => {
      const estimatedCost = adapter.getCostPerImage();

      // Estimate: 2000 input tokens + 300 output tokens
      // (2000 / 1M) * $2.00 + (300 / 1M) * $10.00
      // = 0.004 + 0.003 = 0.007
      expect(estimatedCost).toBeCloseTo(0.007, 3);
    });
  });

  describe('Error Handling', () => {
    it('should handle rate limit errors (429) with retry', async () => {
      const request: ProcessImageRequest = {
        image: mockImage,
        systemPrompt: 'Rate',
        userPrompt: 'Analyze'
      };

      // First call: 429 rate limit
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Map([['retry-after', '2']]),
        json: async () => ({ error: 'Rate limit exceeded' })
      } as any);

      // Second call: success
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify({
                starRating: 3,
                colorLabel: 'none',
                keepReject: 'maybe',
                description: 'Test',
                tags: [],
                technicalQuality: {
                  focusAccuracy: 500,
                  exposureQuality: 500,
                  compositionScore: 500,
                  lightingQuality: 500,
                  colorHarmony: 500,
                  noiseLevel: 500,
                  sharpnessDetail: 500,
                  dynamicRange: 500,
                  overallTechnical: 500
                },
                subjectAnalysis: {
                  primarySubject: 'Test',
                  emotionIntensity: 500,
                  eyesOpen: true,
                  eyeContact: false,
                  genuineExpression: 500,
                  facialSharpness: 500,
                  bodyLanguage: 500,
                  momentTiming: 500,
                  storyTelling: 500,
                  uniqueness: 500
                }
              })
            }
          }],
          usage: { prompt_tokens: 1000, completion_tokens: 200 }
        })
      } as any);

      const result = await adapter.processSingleImage(request);

      expect(result.rating.starRating).toBe(3);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should handle network errors gracefully', async () => {
      const request: ProcessImageRequest = {
        image: mockImage,
        systemPrompt: 'Rate',
        userPrompt: 'Analyze'
      };

      // Mock persistent network errors
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(adapter.processSingleImage(request)).rejects.toThrow('Network error');
    }, 10000);

    it('should throw error for missing content in response', async () => {
      const request: ProcessImageRequest = {
        image: mockImage,
        systemPrompt: 'Rate',
        userPrompt: 'Analyze'
      };

      // Mock persistent empty response
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: []
        })
      } as any);

      await expect(adapter.processSingleImage(request)).rejects.toThrow('No content in Grok response');
    }, 10000);

    it('should handle API errors with status codes', async () => {
      const request: ProcessImageRequest = {
        image: mockImage,
        systemPrompt: 'Rate',
        userPrompt: 'Analyze'
      };

      // Mock persistent API error
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error'
      } as any);

      await expect(adapter.processSingleImage(request)).rejects.toThrow('Grok API error');
    }, 10000);
  });

  describe('Batch API', () => {
    it('should throw error for batch processing (not supported)', async () => {
      const request: BatchImageRequest = {
        images: [mockImage, mockImage],
        systemPrompt: 'Rate',
        userPrompt: 'Analyze'
      };

      await expect(adapter.submitBatch(request)).rejects.toThrow(
        'Grok does not support batch API'
      );
    });

    it('should throw error for checkBatchStatus', async () => {
      await expect(adapter.checkBatchStatus('test-job')).rejects.toThrow(
        'Grok does not support batch API'
      );
    });

    it('should throw error for retrieveBatchResults', async () => {
      await expect(adapter.retrieveBatchResults('test-job')).rejects.toThrow(
        'Grok does not support batch API'
      );
    });
  });

  describe('Retry and Backoff', () => {
    it('should use exponential backoff on failures', async () => {
      const request: ProcessImageRequest = {
        image: mockImage,
        systemPrompt: 'Rate',
        userPrompt: 'Analyze'
      };

      // Fail twice, then succeed
      mockFetch
        .mockRejectedValueOnce(new Error('Temporary error'))
        .mockRejectedValueOnce(new Error('Temporary error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            choices: [{
              message: {
                content: JSON.stringify({
                  starRating: 3,
                  colorLabel: 'none',
                  keepReject: 'maybe',
                  description: 'Test',
                  tags: [],
                  technicalQuality: {
                    focusAccuracy: 500,
                    exposureQuality: 500,
                    compositionScore: 500,
                    lightingQuality: 500,
                    colorHarmony: 500,
                    noiseLevel: 500,
                    sharpnessDetail: 500,
                    dynamicRange: 500,
                    overallTechnical: 500
                  },
                  subjectAnalysis: {
                    primarySubject: 'Test',
                    emotionIntensity: 500,
                    eyesOpen: true,
                    eyeContact: false,
                    genuineExpression: 500,
                    facialSharpness: 500,
                    bodyLanguage: 500,
                    momentTiming: 500,
                    storyTelling: 500,
                    uniqueness: 500
                  }
                })
              }
            }],
            usage: { prompt_tokens: 1000, completion_tokens: 200 }
          })
        } as any);

      const result = await adapter.processSingleImage(request);

      expect(result.rating.starRating).toBe(3);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    }, 10000);

    it('should detect rate limits from error message', async () => {
      const request: ProcessImageRequest = {
        image: mockImage,
        systemPrompt: 'Rate',
        userPrompt: 'Analyze'
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: {
          get: (key: string) => key === 'retry-after' ? '1' : null
        },
        json: async () => ({ error: 'Rate limit exceeded' })
      } as any);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify({
                starRating: 3,
                colorLabel: 'none',
                keepReject: 'maybe',
                description: 'Test',
                tags: [],
                technicalQuality: {
                  focusAccuracy: 500,
                  exposureQuality: 500,
                  compositionScore: 500,
                  lightingQuality: 500,
                  colorHarmony: 500,
                  noiseLevel: 500,
                  sharpnessDetail: 500,
                  dynamicRange: 500,
                  overallTechnical: 500
                },
                subjectAnalysis: {
                  primarySubject: 'Test',
                  emotionIntensity: 500,
                  eyesOpen: true,
                  eyeContact: false,
                  genuineExpression: 500,
                  facialSharpness: 500,
                  bodyLanguage: 500,
                  momentTiming: 500,
                  storyTelling: 500,
                  uniqueness: 500
                }
              })
            }
          }],
          usage: { prompt_tokens: 1000, completion_tokens: 200 }
        })
      } as any);

      await adapter.processSingleImage(request);

      expect(mockFetch).toHaveBeenCalledTimes(2);
    }, 10000);
  });

  describe('Request Structure', () => {
    it('should send correct API request structure', async () => {
      const request: ProcessImageRequest = {
        image: mockImage,
        systemPrompt: 'System prompt',
        userPrompt: 'User prompt'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify({
                starRating: 3,
                colorLabel: 'none',
                keepReject: 'maybe',
                description: 'Test',
                tags: [],
                technicalQuality: {
                  focusAccuracy: 500,
                  exposureQuality: 500,
                  compositionScore: 500,
                  lightingQuality: 500,
                  colorHarmony: 500,
                  noiseLevel: 500,
                  sharpnessDetail: 500,
                  dynamicRange: 500,
                  overallTechnical: 500
                },
                subjectAnalysis: {
                  primarySubject: 'Test',
                  emotionIntensity: 500,
                  eyesOpen: true,
                  eyeContact: false,
                  genuineExpression: 500,
                  facialSharpness: 500,
                  bodyLanguage: 500,
                  momentTiming: 500,
                  storyTelling: 500,
                  uniqueness: 500
                }
              })
            }
          }],
          usage: { prompt_tokens: 1000, completion_tokens: 200 }
        })
      } as any);

      await adapter.processSingleImage(request);

      const apiCall = mockFetch.mock.calls[0];
      const [url, options] = apiCall;
      const body = JSON.parse(options.body);

      expect(url).toContain('/chat/completions');
      expect(options.method).toBe('POST');
      expect(options.headers['Content-Type']).toBe('application/json');
      expect(options.headers['Authorization']).toContain('Bearer');
      expect(body.model).toBe('grok-2-vision-1212');
      expect(body.response_format.type).toBe('json_schema');
      expect(body.response_format.json_schema.name).toBe('photo_rating');
      expect(body.response_format.json_schema.strict).toBe(true);
      expect(body.response_format.json_schema.schema).toBeDefined();
      expect(body.max_tokens).toBe(2000);
      expect(body.messages).toHaveLength(2);
      expect(body.messages[0].role).toBe('system');
      expect(body.messages[1].role).toBe('user');
    });

    it('should include both text and image in user message', async () => {
      const request: ProcessImageRequest = {
        image: mockImage,
        systemPrompt: 'System',
        userPrompt: 'User text'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify({
                starRating: 3,
                colorLabel: 'none',
                keepReject: 'maybe',
                description: 'Test',
                tags: [],
                technicalQuality: {
                  focusAccuracy: 500,
                  exposureQuality: 500,
                  compositionScore: 500,
                  lightingQuality: 500,
                  colorHarmony: 500,
                  noiseLevel: 500,
                  sharpnessDetail: 500,
                  dynamicRange: 500,
                  overallTechnical: 500
                },
                subjectAnalysis: {
                  primarySubject: 'Test',
                  emotionIntensity: 500,
                  eyesOpen: true,
                  eyeContact: false,
                  genuineExpression: 500,
                  facialSharpness: 500,
                  bodyLanguage: 500,
                  momentTiming: 500,
                  storyTelling: 500,
                  uniqueness: 500
                }
              })
            }
          }],
          usage: { prompt_tokens: 1000, completion_tokens: 200 }
        })
      } as any);

      await adapter.processSingleImage(request);

      const apiCall = mockFetch.mock.calls[0];
      const body = JSON.parse(apiCall[1].body);
      const userContent = body.messages[1].content;

      expect(userContent).toHaveLength(2);
      expect(userContent[0].type).toBe('image_url');
      expect(userContent[1].type).toBe('text');
      expect(userContent[1].text).toBe('User text');
    });
  });

  describe('Response Processing', () => {
    it('should track processing time', async () => {
      const request: ProcessImageRequest = {
        image: mockImage,
        systemPrompt: 'Rate',
        userPrompt: 'Analyze'
      };

      // Add a small delay to ensure time passes
      mockFetch.mockImplementationOnce((async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return {
          ok: true,
          json: async () => ({
            choices: [{
              message: {
                content: JSON.stringify({
                  starRating: 3,
                  colorLabel: 'none',
                  keepReject: 'maybe',
                  description: 'Test',
                  tags: [],
                  technicalQuality: {
                    focusAccuracy: 500,
                    exposureQuality: 500,
                    compositionScore: 500,
                    lightingQuality: 500,
                    colorHarmony: 500,
                    noiseLevel: 500,
                    sharpnessDetail: 500,
                    dynamicRange: 500,
                    overallTechnical: 500
                  },
                  subjectAnalysis: {
                    primarySubject: 'Test',
                    emotionIntensity: 500,
                    eyesOpen: true,
                    eyeContact: false,
                    genuineExpression: 500,
                    facialSharpness: 500,
                    bodyLanguage: 500,
                    momentTiming: 500,
                    storyTelling: 500,
                    uniqueness: 500
                  }
                })
              }
            }],
            usage: { prompt_tokens: 1000, completion_tokens: 200 }
          })
        };
      }) as any);

      const result = await adapter.processSingleImage(request);

      expect(result.processingTimeMs).toBeGreaterThan(0);
      expect(typeof result.processingTimeMs).toBe('number');
    });

    it('should set imageId and filename on rating', async () => {
      const request: ProcessImageRequest = {
        image: mockImage,
        systemPrompt: 'Rate',
        userPrompt: 'Analyze'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify({
                starRating: 3,
                colorLabel: 'none',
                keepReject: 'maybe',
                description: 'Test',
                tags: [],
                technicalQuality: {
                  focusAccuracy: 500,
                  exposureQuality: 500,
                  compositionScore: 500,
                  lightingQuality: 500,
                  colorHarmony: 500,
                  noiseLevel: 500,
                  sharpnessDetail: 500,
                  dynamicRange: 500,
                  overallTechnical: 500
                },
                subjectAnalysis: {
                  primarySubject: 'Test',
                  emotionIntensity: 500,
                  eyesOpen: true,
                  eyeContact: false,
                  genuineExpression: 500,
                  facialSharpness: 500,
                  bodyLanguage: 500,
                  momentTiming: 500,
                  storyTelling: 500,
                  uniqueness: 500
                }
              })
            }
          }],
          usage: { prompt_tokens: 1000, completion_tokens: 200 }
        })
      } as any);

      const result = await adapter.processSingleImage(request);

      expect(result.rating.imageId).toBe('test.jpg');
      expect(result.rating.filename).toBe('test.jpg');
    });
  });
});
