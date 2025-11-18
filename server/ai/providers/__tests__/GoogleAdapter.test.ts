import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GoogleAdapter } from '../GoogleAdapter';
import { ImageInput, BatchImageRequest } from '../../BaseProviderAdapter';

// Mock fetch globally
global.fetch = vi.fn();

describe('GoogleAdapter', () => {
  let adapter: GoogleAdapter;
  let testImage: ImageInput;

  beforeEach(() => {
    adapter = new GoogleAdapter();
    testImage = {
      data: Buffer.from('fake-image-data'),
      format: 'jpeg',
      filename: 'test-image.jpg'
    };
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Provider Metadata', () => {
    it('should return correct provider name', () => {
      expect(adapter.getProviderName()).toBe('Google');
    });

    it('should support batch processing', () => {
      expect(adapter.supportsBatch()).toBe(true);
    });

    it('should calculate cost per image correctly', () => {
      const cost = adapter.getCostPerImage();
      // 2000 input tokens * $0.10/1M + 1500 output tokens * $0.40/1M
      const expected = (2000 / 1_000_000) * 0.10 + (1500 / 1_000_000) * 0.40;
      expect(cost).toBeCloseTo(expected, 6);
    });

    it('should provide 50% discount for batch cost', () => {
      const regularCost = adapter.getCostPerImage();
      const batchCost = adapter.getBatchCostPerImage();
      expect(batchCost).toBeCloseTo(regularCost * 0.5, 6);
    });
  });

  describe('Response Schema', () => {
    it('should include all 1-1000 scale technical quality fields', () => {
      const schema = (adapter as any).getResponseSchema();
      const techProps = schema.properties.technicalQuality.properties;

      expect(techProps.focusAccuracy).toBeDefined();
      expect(techProps.focusAccuracy.minimum).toBe(1);
      expect(techProps.focusAccuracy.maximum).toBe(1000);

      expect(techProps.exposureQuality).toBeDefined();
      expect(techProps.compositionScore).toBeDefined();
      expect(techProps.lightingQuality).toBeDefined();
      expect(techProps.colorHarmony).toBeDefined();
      expect(techProps.noiseLevel).toBeDefined();
      expect(techProps.sharpnessDetail).toBeDefined();
      expect(techProps.dynamicRange).toBeDefined();
      expect(techProps.overallTechnical).toBeDefined();
    });

    it('should include all 1-1000 scale subject analysis fields', () => {
      const schema = (adapter as any).getResponseSchema();
      const subjectProps = schema.properties.subjectAnalysis.properties;

      expect(subjectProps.emotionIntensity).toBeDefined();
      expect(subjectProps.emotionIntensity.minimum).toBe(1);
      expect(subjectProps.emotionIntensity.maximum).toBe(1000);

      expect(subjectProps.genuineExpression).toBeDefined();
      expect(subjectProps.facialSharpness).toBeDefined();
      expect(subjectProps.bodyLanguage).toBeDefined();
      expect(subjectProps.momentTiming).toBeDefined();
      expect(subjectProps.storyTelling).toBeDefined();
      expect(subjectProps.uniqueness).toBeDefined();
    });

    it('should include shoot context fields', () => {
      const schema = (adapter as any).getResponseSchema();
      const contextProps = schema.properties.shootContext.properties;

      expect(contextProps.eventType).toBeDefined();
      expect(contextProps.shootPhase).toBeDefined();
      expect(contextProps.timeOfDay).toBeDefined();
      expect(contextProps.location).toBeDefined();
    });

    it('should maintain backward compatibility with legacy 0-1 fields', () => {
      const schema = (adapter as any).getResponseSchema();
      const techProps = schema.properties.technicalQuality.properties;

      expect(techProps.sharpness).toBeDefined();
      expect(techProps.sharpness.minimum).toBe(0);
      expect(techProps.sharpness.maximum).toBe(1);

      expect(techProps.exposure).toBeDefined();
      expect(techProps.composition).toBeDefined();
      expect(techProps.overallScore).toBeDefined();
    });
  });

  describe('Batch Submission', () => {
    it('should create valid JSONL format', async () => {
      const images = [testImage];
      const request: BatchImageRequest = {
        images,
        systemPrompt: 'You are a photo expert',
        userPrompt: 'Rate this image'
      };

      // Mock successful file upload flow
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ 'X-Goog-Upload-URL': 'https://upload.url' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ file: { uri: 'files/test-123' } })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            name: 'projects/test/jobs/job-123',
            state: 'JOB_STATE_PENDING',
            createTime: new Date().toISOString()
          })
        });

      await adapter.submitBatch(request);

      // Check that upload was called with JSONL content
      const uploadCall = (global.fetch as any).mock.calls[1];
      const uploadedContent = uploadCall[1].body.toString();

      // Parse the JSONL line
      const jsonlLine = JSON.parse(uploadedContent);
      expect(jsonlLine.key).toMatch(/^image-0-/);
      expect(jsonlLine.request.contents).toBeDefined();
      expect(jsonlLine.request.generationConfig.responseMimeType).toBe('application/json');
    });

    it('should upload file correctly using resumable upload', async () => {
      const images = [testImage];
      const request: BatchImageRequest = {
        images,
        systemPrompt: 'Test prompt',
        userPrompt: 'Rate this'
      };

      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ 'X-Goog-Upload-URL': 'https://upload.url/session-123' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ file: { uri: 'files/uploaded-456' } })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            name: 'projects/test/jobs/batch-789',
            state: 'JOB_STATE_PENDING',
            createTime: new Date().toISOString()
          })
        });

      await adapter.submitBatch(request);

      // Verify initiate upload call
      const initiateCall = (global.fetch as any).mock.calls[0];
      expect(initiateCall[0]).toContain('/upload/v1beta/files');
      expect(initiateCall[1].headers['X-Goog-Upload-Protocol']).toBe('resumable');
      expect(initiateCall[1].headers['X-Goog-Upload-Command']).toBe('start');

      // Verify file upload call
      const uploadCall = (global.fetch as any).mock.calls[1];
      expect(uploadCall[0]).toBe('https://upload.url/session-123');
      expect(uploadCall[1].headers['X-Goog-Upload-Command']).toBe('upload, finalize');
    });

    it('should return batch job with correct structure', async () => {
      const images = [testImage, { ...testImage, filename: 'test2.jpg' }];
      const request: BatchImageRequest = {
        images,
        systemPrompt: 'Test',
        userPrompt: 'Rate'
      };

      const expectedJobName = 'projects/my-project/jobs/batch-12345';
      const expectedCreateTime = '2025-01-15T10:00:00Z';

      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ 'X-Goog-Upload-URL': 'https://upload.url' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ file: { uri: 'files/test' } })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            name: expectedJobName,
            state: 'JOB_STATE_PENDING',
            createTime: expectedCreateTime,
            metadata: {
              estimatedCompletionTime: '2025-01-16T10:00:00Z'
            }
          })
        });

      const result = await adapter.submitBatch(request);

      expect(result.jobId).toBe(expectedJobName);
      expect(result.status).toBe('queued');
      expect(result.totalImages).toBe(2);
      expect(result.processedImages).toBe(0);
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.estimatedCompletionTime).toBeInstanceOf(Date);
    });

    it('should handle upload errors', async () => {
      const request: BatchImageRequest = {
        images: [testImage],
        systemPrompt: 'Test',
        userPrompt: 'Rate'
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: async () => 'Access denied'
      });

      await expect(adapter.submitBatch(request)).rejects.toThrow(
        'Failed to initiate resumable upload: 403'
      );
    });

    it('should handle missing upload URL', async () => {
      const request: BatchImageRequest = {
        images: [testImage],
        systemPrompt: 'Test',
        userPrompt: 'Rate'
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: new Headers() // No X-Goog-Upload-URL header
      });

      await expect(adapter.submitBatch(request)).rejects.toThrow(
        'No upload URL returned from Google API'
      );
    });

    it('should handle large batches (1000+ images)', async () => {
      const images = Array.from({ length: 1200 }, (_, i) => ({
        ...testImage,
        filename: `image-${i}.jpg`
      }));

      const request: BatchImageRequest = {
        images,
        systemPrompt: 'Test',
        userPrompt: 'Rate'
      };

      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ 'X-Goog-Upload-URL': 'https://upload.url' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ file: { uri: 'files/large-batch' } })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            name: 'projects/test/jobs/large-batch-job',
            state: 'JOB_STATE_PENDING',
            createTime: new Date().toISOString()
          })
        });

      const result = await adapter.submitBatch(request);
      expect(result.totalImages).toBe(1200);

      // Verify JSONL has all images
      const uploadCall = (global.fetch as any).mock.calls[1];
      const uploadedContent = uploadCall[1].body.toString();
      const lines = uploadedContent.split('\n');
      expect(lines.length).toBe(1200);
    });

    it('should include RAW image reminder in prompts', async () => {
      const request: BatchImageRequest = {
        images: [testImage],
        systemPrompt: 'Rate photos',
        userPrompt: 'Analyze quality'
      };

      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ 'X-Goog-Upload-URL': 'https://upload.url' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ file: { uri: 'files/test' } })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            name: 'projects/test/jobs/job',
            state: 'JOB_STATE_PENDING',
            createTime: new Date().toISOString()
          })
        });

      await adapter.submitBatch(request);

      const uploadCall = (global.fetch as any).mock.calls[1];
      const uploadedContent = uploadCall[1].body.toString();
      const jsonlLine = JSON.parse(uploadedContent);
      const textPart = jsonlLine.request.contents[0].parts[1].text;

      expect(textPart).toContain('RAW images');
      expect(textPart).toContain('exposure and white balance are fully correctable');
      expect(textPart).toContain('Focus accuracy and moment timing cannot be fixed');
    });
  });

  describe('Batch Status Checking', () => {
    it('should map Google states correctly', async () => {
      const testCases = [
        { googleState: 'JOB_STATE_PENDING', expectedStatus: 'queued' },
        { googleState: 'JOB_STATE_RUNNING', expectedStatus: 'processing' },
        { googleState: 'JOB_STATE_SUCCEEDED', expectedStatus: 'completed' },
        { googleState: 'JOB_STATE_FAILED', expectedStatus: 'failed' },
        { googleState: 'JOB_STATE_CANCELLED', expectedStatus: 'failed' },
        { googleState: 'JOB_STATE_EXPIRED', expectedStatus: 'failed' }
      ];

      for (const { googleState, expectedStatus } of testCases) {
        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            name: 'projects/test/jobs/job-123',
            state: googleState,
            createTime: new Date().toISOString(),
            metadata: {}
          })
        });

        const result = await adapter.checkBatchStatus('projects/test/jobs/job-123');
        expect(result.status).toBe(expectedStatus);
      }
    });

    it('should handle status check errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => 'Job not found'
      });

      await expect(
        adapter.checkBatchStatus('projects/test/jobs/nonexistent')
      ).rejects.toThrow('Failed to check batch status: 404');
    });

    it('should track progress correctly', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          name: 'projects/test/jobs/job-123',
          state: 'JOB_STATE_RUNNING',
          createTime: '2025-01-15T10:00:00Z',
          metadata: {
            totalTaskCount: 100,
            completedTaskCount: 47
          }
        })
      });

      const result = await adapter.checkBatchStatus('projects/test/jobs/job-123');

      expect(result.totalImages).toBe(100);
      expect(result.processedImages).toBe(47);
      expect(result.status).toBe('processing');
    });

    it('should include error message when job fails', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          name: 'projects/test/jobs/job-123',
          state: 'JOB_STATE_FAILED',
          createTime: new Date().toISOString(),
          error: {
            message: 'Invalid API key'
          },
          metadata: {}
        })
      });

      const result = await adapter.checkBatchStatus('projects/test/jobs/job-123');

      expect(result.status).toBe('failed');
      expect(result.error).toBe('Invalid API key');
    });

    it('should store output file URI when completed', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          name: 'projects/test/jobs/job-123',
          state: 'JOB_STATE_SUCCEEDED',
          createTime: new Date().toISOString(),
          metadata: {
            totalTaskCount: 10,
            completedTaskCount: 10,
            outputFileUri: 'files/output-results-789'
          }
        })
      });

      const result = await adapter.checkBatchStatus('projects/test/jobs/job-123');

      expect(result.status).toBe('completed');
      expect((result as any).outputFileUri).toBe('files/output-results-789');
    });
  });

  describe('Batch Results Retrieval', () => {
    it('should throw error if job not complete', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          name: 'projects/test/jobs/job-123',
          state: 'JOB_STATE_RUNNING',
          createTime: new Date().toISOString(),
          metadata: {}
        })
      });

      await expect(
        adapter.retrieveBatchResults('projects/test/jobs/job-123')
      ).rejects.toThrow('is not complete');
    });

    it('should throw error if no output file URI', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          name: 'projects/test/jobs/job-123',
          state: 'JOB_STATE_SUCCEEDED',
          createTime: new Date().toISOString(),
          metadata: {
            // No outputFileUri
          }
        })
      });

      await expect(
        adapter.retrieveBatchResults('projects/test/jobs/job-123')
      ).rejects.toThrow('No output file URI found');
    });

    it('should parse JSONL results correctly', async () => {
      // Mock status check
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          name: 'projects/test/jobs/job-123',
          state: 'JOB_STATE_SUCCEEDED',
          createTime: new Date().toISOString(),
          metadata: {
            outputFileUri: 'files/results-456'
          }
        })
      });

      // Mock results download
      const jsonlResults = [
        {
          key: 'image-0-photo1.jpg',
          response: {
            candidates: [{
              content: {
                parts: [{
                  text: JSON.stringify({
                    starRating: 5,
                    colorLabel: 'green',
                    keepReject: 'keep',
                    description: 'Beautiful sunset',
                    tags: ['landscape', 'sunset'],
                    technicalQuality: {
                      focusAccuracy: 950,
                      exposureQuality: 900,
                      sharpness: 0.95,
                      exposure: 0.90,
                      composition: 0.88,
                      overallScore: 0.91
                    },
                    subjectAnalysis: {
                      primarySubject: 'Landscape',
                      emotionIntensity: 800,
                      eyesOpen: true,
                      smiling: false,
                      inFocus: true
                    }
                  })
                }]
              }
            }]
          }
        },
        {
          key: 'image-1-photo2.jpg',
          response: {
            candidates: [{
              content: {
                parts: [{
                  text: JSON.stringify({
                    starRating: 3,
                    colorLabel: 'none',
                    keepReject: 'maybe',
                    description: 'Average shot',
                    tags: ['portrait'],
                    technicalQuality: {
                      focusAccuracy: 600,
                      sharpness: 0.6,
                      exposure: 0.5,
                      composition: 0.6,
                      overallScore: 0.57
                    },
                    subjectAnalysis: {
                      primarySubject: 'Person',
                      eyesOpen: true,
                      smiling: true,
                      inFocus: true
                    }
                  })
                }]
              }
            }]
          }
        }
      ].map(r => JSON.stringify(r)).join('\n');

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        text: async () => jsonlResults
      });

      const results = await adapter.retrieveBatchResults('projects/test/jobs/job-123');

      expect(results).toHaveLength(2);
      expect(results[0].filename).toBe('photo1.jpg');
      expect(results[0].starRating).toBe(5);
      expect(results[0].description).toBe('Beautiful sunset');
      expect(results[1].filename).toBe('photo2.jpg');
      expect(results[1].starRating).toBe(3);
    });

    it('should skip error responses in JSONL', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            name: 'projects/test/jobs/job-123',
            state: 'JOB_STATE_SUCCEEDED',
            createTime: new Date().toISOString(),
            metadata: { outputFileUri: 'files/results' }
          })
        });

      const jsonlResults = [
        {
          key: 'image-0-success.jpg',
          response: {
            candidates: [{
              content: {
                parts: [{
                  text: JSON.stringify({
                    starRating: 4,
                    colorLabel: 'blue',
                    keepReject: 'keep',
                    description: 'Good photo',
                    technicalQuality: { sharpness: 0.8, exposure: 0.7, composition: 0.75, overallScore: 0.75 },
                    subjectAnalysis: { primarySubject: 'Person', eyesOpen: true, smiling: true, inFocus: true }
                  })
                }]
              }
            }]
          }
        },
        {
          key: 'image-1-error.jpg',
          error: { message: 'Image too large' }
        },
        {
          key: 'image-2-another-success.jpg',
          response: {
            candidates: [{
              content: {
                parts: [{
                  text: JSON.stringify({
                    starRating: 3,
                    colorLabel: 'yellow',
                    keepReject: 'maybe',
                    description: 'Okay photo',
                    technicalQuality: { sharpness: 0.6, exposure: 0.6, composition: 0.6, overallScore: 0.6 },
                    subjectAnalysis: { primarySubject: 'Object', eyesOpen: false, smiling: false, inFocus: true }
                  })
                }]
              }
            }]
          }
        }
      ].map(r => JSON.stringify(r)).join('\n');

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        text: async () => jsonlResults
      });

      const results = await adapter.retrieveBatchResults('projects/test/jobs/job-123');

      expect(results).toHaveLength(2); // Only successful results
      expect(results[0].filename).toBe('success.jpg');
      expect(results[1].filename).toBe('another-success.jpg');
    });

    it('should handle filenames with hyphens correctly', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            name: 'projects/test/jobs/job-123',
            state: 'JOB_STATE_SUCCEEDED',
            createTime: new Date().toISOString(),
            metadata: { outputFileUri: 'files/results' }
          })
        });

      const jsonlResults = JSON.stringify({
        key: 'image-0-wedding-2025-01-15-ceremony-shot-123.jpg',
        response: {
          candidates: [{
            content: {
              parts: [{
                text: JSON.stringify({
                  starRating: 5,
                  colorLabel: 'green',
                  keepReject: 'keep',
                  description: 'Perfect moment',
                  technicalQuality: { sharpness: 0.95, exposure: 0.90, composition: 0.92, overallScore: 0.92 },
                  subjectAnalysis: { primarySubject: 'Couple', eyesOpen: true, smiling: true, inFocus: true }
                })
              }]
            }
          }]
        }
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        text: async () => jsonlResults
      });

      const results = await adapter.retrieveBatchResults('projects/test/jobs/job-123');

      expect(results).toHaveLength(1);
      expect(results[0].filename).toBe('wedding-2025-01-15-ceremony-shot-123.jpg');
    });

    it('should handle download errors', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            name: 'projects/test/jobs/job-123',
            state: 'JOB_STATE_SUCCEEDED',
            createTime: new Date().toISOString(),
            metadata: { outputFileUri: 'files/results' }
          })
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 403,
          text: async () => 'Access denied'
        });

      await expect(
        adapter.retrieveBatchResults('projects/test/jobs/job-123')
      ).rejects.toThrow('Failed to download batch results: 403');
    });
  });

  describe('Vision Input Support', () => {
    it('should handle different image formats in batch mode', async () => {
      const images = [
        { data: Buffer.from('jpeg-data'), format: 'jpeg' as const, filename: 'test.jpg' },
        { data: Buffer.from('png-data'), format: 'png' as const, filename: 'test.png' },
        { data: Buffer.from('webp-data'), format: 'webp' as const, filename: 'test.webp' },
        { data: Buffer.from('heic-data'), format: 'heic' as const, filename: 'test.heic' }
      ];

      const request: BatchImageRequest = {
        images,
        systemPrompt: 'Test',
        userPrompt: 'Rate'
      };

      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ 'X-Goog-Upload-URL': 'https://upload.url' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ file: { uri: 'files/test' } })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            name: 'projects/test/jobs/job',
            state: 'JOB_STATE_PENDING',
            createTime: new Date().toISOString()
          })
        });

      const result = await adapter.submitBatch(request);
      expect(result.totalImages).toBe(4);

      // Verify correct MIME types were used
      const uploadCall = (global.fetch as any).mock.calls[1];
      const uploadedContent = uploadCall[1].body.toString();
      const lines = uploadedContent.split('\n');

      expect(lines[0]).toContain('image/jpeg');
      expect(lines[1]).toContain('image/png');
      expect(lines[2]).toContain('image/webp');
      expect(lines[3]).toContain('image/heic');
    });
  });
});
