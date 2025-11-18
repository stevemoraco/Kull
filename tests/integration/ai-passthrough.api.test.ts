import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import aiPassthroughRouter from '../../server/routes/ai-passthrough';

// Mock all provider adapters
vi.mock('../../server/ai/providers/AnthropicAdapter', () => ({
  AnthropicAdapter: vi.fn().mockImplementation(() => ({
    processSingleImage: vi.fn(async () => ({
      rating: 5,
      cost: 0.002,
      processingTimeMs: 500,
    })),
    submitBatch: vi.fn(async () => ({
      jobId: 'batch_test_123',
      status: 'processing',
      totalImages: 10,
      processedImages: 0,
    })),
    checkBatchStatus: vi.fn(async () => ({
      jobId: 'batch_test_123',
      status: 'completed',
      totalImages: 10,
      processedImages: 10,
    })),
    retrieveBatchResults: vi.fn(async () => [
      { rating: 5, cost: 0.002, processingTimeMs: 500 },
    ]),
    getCostPerImage: vi.fn(() => 0.002),
    getProviderName: vi.fn(() => 'Anthropic Claude'),
    supportsBatch: vi.fn(() => true),
  })),
}));

vi.mock('../../server/ai/providers/OpenAIAdapter', () => ({
  OpenAIAdapter: vi.fn().mockImplementation(() => ({
    processSingleImage: vi.fn(async () => ({
      rating: 5,
      cost: 0.001,
      processingTimeMs: 300,
    })),
    submitBatch: vi.fn(async () => ({
      jobId: 'batch_test_456',
      status: 'processing',
      totalImages: 10,
      processedImages: 0,
    })),
    checkBatchStatus: vi.fn(async () => ({
      jobId: 'batch_test_456',
      status: 'processing',
      totalImages: 10,
      processedImages: 5,
    })),
    retrieveBatchResults: vi.fn(async () => [
      { rating: 4, cost: 0.001, processingTimeMs: 300 },
    ]),
    getCostPerImage: vi.fn(() => 0.001),
    getProviderName: vi.fn(() => 'OpenAI GPT-5'),
    supportsBatch: vi.fn(() => true),
  })),
}));

vi.mock('../../server/ai/providers/GoogleAdapter', () => ({
  GoogleAdapter: vi.fn().mockImplementation(() => ({
    processSingleImage: vi.fn(async () => ({
      rating: 4,
      cost: 0.0005,
      processingTimeMs: 250,
    })),
    submitBatch: vi.fn(async () => {
      throw new Error('Batch API not supported');
    }),
    checkBatchStatus: vi.fn(async () => {
      throw new Error('Batch API not supported');
    }),
    retrieveBatchResults: vi.fn(async () => {
      throw new Error('Batch API not supported');
    }),
    getCostPerImage: vi.fn(() => 0.0005),
    getProviderName: vi.fn(() => 'Google Gemini'),
    supportsBatch: vi.fn(() => false),
  })),
}));

vi.mock('../../server/ai/providers/GrokAdapter', () => ({
  GrokAdapter: vi.fn().mockImplementation(() => ({
    processSingleImage: vi.fn(async () => ({
      rating: 5,
      cost: 0.0015,
      processingTimeMs: 200,
    })),
    submitBatch: vi.fn(async () => {
      throw new Error('Batch API not supported');
    }),
    checkBatchStatus: vi.fn(async () => {
      throw new Error('Batch API not supported');
    }),
    retrieveBatchResults: vi.fn(async () => {
      throw new Error('Batch API not supported');
    }),
    getCostPerImage: vi.fn(() => 0.0015),
    getProviderName: vi.fn(() => 'xAI Grok'),
    supportsBatch: vi.fn(() => false),
  })),
}));

vi.mock('../../server/ai/providers/GroqAdapter', () => ({
  GroqAdapter: vi.fn().mockImplementation(() => ({
    processSingleImage: vi.fn(async () => ({
      rating: 4,
      cost: 0.001,
      processingTimeMs: 150,
    })),
    submitBatch: vi.fn(async () => {
      throw new Error('Batch API not supported');
    }),
    checkBatchStatus: vi.fn(async () => {
      throw new Error('Batch API not supported');
    }),
    retrieveBatchResults: vi.fn(async () => {
      throw new Error('Batch API not supported');
    }),
    getCostPerImage: vi.fn(() => 0.001),
    getProviderName: vi.fn(() => 'Groq Kimi'),
    supportsBatch: vi.fn(() => false),
  })),
}));

describe('AI Passthrough API Integration Tests', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json({ limit: '50mb' }));
    app.use('/api/ai', aiPassthroughRouter);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/ai/providers', () => {
    it('should return list of all available providers', async () => {
      const response = await request(app).get('/api/ai/providers');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('providers');
      expect(response.body).toHaveProperty('markup', '2x');
      expect(Array.isArray(response.body.providers)).toBe(true);
      expect(response.body.providers.length).toBe(5); // anthropic, openai, google, grok, groq
    });

    it('should return provider details with correct structure', async () => {
      const response = await request(app).get('/api/ai/providers');

      expect(response.status).toBe(200);

      const provider = response.body.providers[0];
      expect(provider).toHaveProperty('id');
      expect(provider).toHaveProperty('name');
      expect(provider).toHaveProperty('costPerImage');
      expect(provider).toHaveProperty('userChargePerImage');
      expect(provider).toHaveProperty('supportsBatch');

      // Verify 2x markup
      expect(provider.userChargePerImage).toBe(provider.costPerImage * 2);
    });
  });

  describe('POST /api/ai/process-single', () => {
    const testImageBase64 = Buffer.from('fake-image-data').toString('base64');

    it('should process a single image with valid provider', async () => {
      const response = await request(app)
        .post('/api/ai/process-single')
        .send({
          provider: 'openai',
          image: {
            data: testImageBase64,
            format: 'jpeg',
            filename: 'test.jpg',
          },
          systemPrompt: 'Rate this image',
          userPrompt: 'Analyze quality',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('rating');
      expect(response.body).toHaveProperty('cost');
      expect(response.body).toHaveProperty('processingTimeMs');
      expect(response.body).toHaveProperty('provider');
    });

    it('should reject request with invalid provider', async () => {
      const response = await request(app)
        .post('/api/ai/process-single')
        .send({
          provider: 'invalid-provider',
          image: {
            data: testImageBase64,
            format: 'jpeg',
            filename: 'test.jpg',
          },
          systemPrompt: 'Rate this image',
          userPrompt: 'Analyze quality',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid provider');
    });

    it('should reject request with missing image data', async () => {
      const response = await request(app)
        .post('/api/ai/process-single')
        .send({
          provider: 'openai',
          image: {
            format: 'jpeg',
            filename: 'test.jpg',
          },
          systemPrompt: 'Rate this image',
          userPrompt: 'Analyze quality',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid image');
    });

    it('should reject request with missing prompts', async () => {
      const response = await request(app)
        .post('/api/ai/process-single')
        .send({
          provider: 'openai',
          image: {
            data: testImageBase64,
            format: 'jpeg',
            filename: 'test.jpg',
          },
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('systemPrompt and userPrompt are required');
    });

    it('should work with all supported providers', async () => {
      const providers = ['anthropic', 'openai', 'google', 'grok', 'groq'];

      for (const provider of providers) {
        const response = await request(app)
          .post('/api/ai/process-single')
          .send({
            provider,
            image: {
              data: testImageBase64,
              format: 'jpeg',
              filename: 'test.jpg',
            },
            systemPrompt: 'Rate this image',
            userPrompt: 'Analyze quality',
          });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('rating');
      }
    });
  });

  describe('POST /api/ai/process-batch', () => {
    const testImages = Array.from({ length: 3 }, (_, i) => ({
      data: Buffer.from(`fake-image-${i}`).toString('base64'),
      format: 'jpeg',
      filename: `test${i}.jpg`,
    }));

    it('should process batch with concurrent requests (no batch API)', async () => {
      const response = await request(app)
        .post('/api/ai/process-batch')
        .send({
          provider: 'openai',
          images: testImages,
          systemPrompt: 'Rate these images',
          userPrompt: 'Analyze quality',
          useBatchAPI: false,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('results');
      expect(response.body).toHaveProperty('summary');
      expect(Array.isArray(response.body.results)).toBe(true);
      expect(response.body.results.length).toBe(testImages.length);
      expect(response.body.summary.totalImages).toBe(testImages.length);
      expect(response.body.summary).toHaveProperty('successful');
      expect(response.body.summary).toHaveProperty('failed');
      expect(response.body.summary).toHaveProperty('totalTimeMs');
    });

    it('should reject batch request with invalid provider', async () => {
      const response = await request(app)
        .post('/api/ai/process-batch')
        .send({
          provider: 'invalid-provider',
          images: testImages,
          systemPrompt: 'Rate these images',
          userPrompt: 'Analyze quality',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid provider');
    });

    it('should reject batch request with empty images array', async () => {
      const response = await request(app)
        .post('/api/ai/process-batch')
        .send({
          provider: 'openai',
          images: [],
          systemPrompt: 'Rate these images',
          userPrompt: 'Analyze quality',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Images must be a non-empty array');
    });

    it('should reject batch API request for unsupported provider', async () => {
      const response = await request(app)
        .post('/api/ai/process-batch')
        .send({
          provider: 'google', // Does not support batch API
          images: testImages,
          systemPrompt: 'Rate these images',
          userPrompt: 'Analyze quality',
          useBatchAPI: true,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('does not support batch API');
    });

    it('should submit batch job for supported provider', async () => {
      const response = await request(app)
        .post('/api/ai/process-batch')
        .send({
          provider: 'anthropic', // Supports batch API
          images: testImages,
          systemPrompt: 'Rate these images',
          userPrompt: 'Analyze quality',
          useBatchAPI: true,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('jobId');
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('totalImages');
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('GET /api/ai/batch-status/:jobId', () => {
    it('should return batch status for valid job', async () => {
      const response = await request(app).get('/api/ai/batch-status/batch_test_456?provider=openai');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('jobId');
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('totalImages');
      expect(response.body).toHaveProperty('processedImages');
    });

    it('should reject request without provider parameter', async () => {
      const response = await request(app).get('/api/ai/batch-status/batch_test_123');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Valid provider query parameter required');
    });

    it('should reject request for unsupported provider', async () => {
      const response = await request(app).get('/api/ai/batch-status/batch_test_123?provider=google');

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('does not support batch API');
    });
  });

  describe('GET /api/ai/batch-results/:jobId', () => {
    it('should return batch results for completed job', async () => {
      const response = await request(app).get('/api/ai/batch-results/batch_test_123?provider=anthropic');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('jobId');
      expect(response.body).toHaveProperty('results');
      expect(response.body).toHaveProperty('totalResults');
      expect(Array.isArray(response.body.results)).toBe(true);
    });

    it('should reject request without provider parameter', async () => {
      const response = await request(app).get('/api/ai/batch-results/batch_test_123');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Valid provider query parameter required');
    });

    it('should reject request for unsupported provider', async () => {
      const response = await request(app).get('/api/ai/batch-results/batch_test_123?provider=groq');

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('does not support batch API');
    });
  });

  describe('Ultra-high concurrency simulation', () => {
    it('should handle 100 concurrent image requests', async () => {
      const testImageBase64 = Buffer.from('fake-image-data').toString('base64');
      const images = Array.from({ length: 100 }, (_, i) => ({
        data: testImageBase64,
        format: 'jpeg',
        filename: `test${i}.jpg`,
      }));

      const response = await request(app)
        .post('/api/ai/process-batch')
        .send({
          provider: 'openai',
          images,
          systemPrompt: 'Rate these images',
          userPrompt: 'Analyze quality',
          useBatchAPI: false,
        });

      expect(response.status).toBe(200);
      expect(response.body.results.length).toBe(100);
      expect(response.body.summary.totalImages).toBe(100);
      expect(response.body.summary.totalTimeMs).toBeGreaterThanOrEqual(0); // With mocked provider, might be 0
    }, 10000); // 10 second timeout for this test
  });
});
