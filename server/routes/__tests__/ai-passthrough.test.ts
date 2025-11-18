import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import aiPassthroughRouter from '../ai-passthrough';

// Mock the adapters
vi.mock('../../ai/providers/AnthropicAdapter', () => ({
  AnthropicAdapter: vi.fn().mockImplementation(() => ({
    getProviderName: () => 'Anthropic',
    getCostPerImage: () => 0.003,
    supportsBatch: () => true,
    processSingleImage: vi.fn().mockResolvedValue({
      rating: {
        imageId: 'test.jpg',
        filename: 'test.jpg',
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
      },
      cost: {
        inputTokens: 2000,
        outputTokens: 500,
        inputCostUSD: 0.002,
        outputCostUSD: 0.0025,
        totalCostUSD: 0.0045,
        userChargeUSD: 0.009
      },
      processingTimeMs: 150
    })
  }))
}));

vi.mock('../../ai/providers/OpenAIAdapter', () => ({
  OpenAIAdapter: vi.fn().mockImplementation(() => ({
    getProviderName: () => 'OpenAI',
    getCostPerImage: () => 0.0011,
    supportsBatch: () => true,
    processSingleImage: vi.fn()
  }))
}));

vi.mock('../../ai/providers/GoogleAdapter', () => ({
  GoogleAdapter: vi.fn().mockImplementation(() => ({
    getProviderName: () => 'Google',
    getCostPerImage: () => 0.0009,
    supportsBatch: () => true,
    processSingleImage: vi.fn()
  }))
}));

vi.mock('../../ai/providers/GrokAdapter', () => ({
  GrokAdapter: vi.fn().mockImplementation(() => ({
    getProviderName: () => 'xAI Grok',
    getCostPerImage: () => 0.0007,
    supportsBatch: () => false,
    processSingleImage: vi.fn()
  }))
}));

vi.mock('../../ai/providers/GroqAdapter', () => ({
  GroqAdapter: vi.fn().mockImplementation(() => ({
    getProviderName: () => 'Groq',
    getCostPerImage: () => 0.0007,
    supportsBatch: () => false,
    processSingleImage: vi.fn()
  }))
}));

describe('AI Passthrough API', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/ai', aiPassthroughRouter);
  });

  describe('GET /api/ai/providers', () => {
    it('should return list of available providers', async () => {
      const response = await request(app)
        .get('/api/ai/providers')
        .expect(200);

      expect(response.body).toHaveProperty('providers');
      expect(response.body).toHaveProperty('markup', '2x');
      expect(response.body.providers).toBeInstanceOf(Array);
      expect(response.body.providers.length).toBeGreaterThan(0);

      const anthropic = response.body.providers.find((p: any) => p.id === 'anthropic');
      expect(anthropic).toBeDefined();
      expect(anthropic.name).toBe('Anthropic');
      expect(anthropic.supportsBatch).toBe(true);
      expect(anthropic.userChargePerImage).toBe(anthropic.costPerImage * 2);
    });
  });

  describe('POST /api/ai/process-single', () => {
    it('should process a single image successfully', async () => {
      const testImage = {
        provider: 'anthropic',
        image: {
          data: Buffer.from('test-image-data').toString('base64'),
          format: 'jpeg',
          filename: 'test.jpg'
        },
        systemPrompt: 'You are a photo rating assistant',
        userPrompt: 'Rate this photo'
      };

      const response = await request(app)
        .post('/api/ai/process-single')
        .send(testImage)
        .expect(200);

      expect(response.body).toHaveProperty('rating');
      expect(response.body).toHaveProperty('cost');
      expect(response.body).toHaveProperty('processingTimeMs');
      expect(response.body).toHaveProperty('provider', 'Anthropic');

      expect(response.body.rating.starRating).toBeGreaterThanOrEqual(1);
      expect(response.body.rating.starRating).toBeLessThanOrEqual(5);
      expect(response.body.cost.userChargeUSD).toBeGreaterThan(response.body.cost.totalCostUSD);
    });

    it('should return 400 for invalid provider', async () => {
      const response = await request(app)
        .post('/api/ai/process-single')
        .send({
          provider: 'invalid',
          image: { data: '', format: 'jpeg', filename: 'test.jpg' },
          systemPrompt: 'test',
          userPrompt: 'test'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for missing image data', async () => {
      const response = await request(app)
        .post('/api/ai/process-single')
        .send({
          provider: 'anthropic',
          systemPrompt: 'test',
          userPrompt: 'test'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for missing prompts', async () => {
      const response = await request(app)
        .post('/api/ai/process-single')
        .send({
          provider: 'anthropic',
          image: { data: 'test', format: 'jpeg', filename: 'test.jpg' }
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/ai/process-batch', () => {
    it('should reject batch API request for providers without batch support', async () => {
      const response = await request(app)
        .post('/api/ai/process-batch')
        .send({
          provider: 'grok',
          images: [
            { data: 'test', format: 'jpeg', filename: 'test1.jpg' }
          ],
          systemPrompt: 'test',
          userPrompt: 'test',
          useBatchAPI: true
        })
        .expect(400);

      expect(response.body.error).toContain('does not support batch API');
    });

    it('should return 400 for empty images array', async () => {
      const response = await request(app)
        .post('/api/ai/process-batch')
        .send({
          provider: 'anthropic',
          images: [],
          systemPrompt: 'test',
          userPrompt: 'test'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });
});
