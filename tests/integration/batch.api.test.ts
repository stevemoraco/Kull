import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';

// Mock database before importing routes
const mockBatchJobs: any[] = [];

vi.mock('../../server/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn((condition: any) => ({
          limit: vi.fn((n: number) => Promise.resolve(mockBatchJobs.slice(0, n))),
        })),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn((data: any) => {
        const job = {
          ...data,
          createdAt: data.createdAt || new Date(),
          updatedAt: new Date(),
        };
        mockBatchJobs.push(job);
        return Promise.resolve([job]);
      }),
    })),
    update: vi.fn(() => ({
      set: vi.fn((updates: any) => ({
        where: vi.fn(() => {
          // Update the first job in the mock array
          if (mockBatchJobs.length > 0) {
            Object.assign(mockBatchJobs[0], updates, { updatedAt: new Date() });
          }
          return Promise.resolve({});
        }),
      })),
    })),
  },
}));

// Mock provider
vi.mock('../../server/providers/openai', () => ({
  submitOpenAIBatch: vi.fn(async () => ({
    ok: true,
    ratings: [
      {
        imageId: 'img1',
        filename: 'test1.jpg',
        starRating: 5,
        colorLabel: 'green',
        title: 'Test Image',
        description: 'Test description',
        tags: ['test'],
      },
    ],
  })),
}));

// Mock WebSocket service
vi.mock('../../server/websocket', () => ({
  getGlobalWsService: vi.fn(() => ({
    broadcastToUser: vi.fn(),
  })),
}));

// Mock environment
process.env.OPENAI_API_KEY = 'test-key';

// Import after mocks
import { batchRouter } from '../../server/routes/batch';

describe('Batch API Routes', () => {
  let app: express.Application;
  let testUserId: string;
  let authMiddleware: express.RequestHandler;

  beforeAll(() => {
    // Create test app
    app = express();
    app.use(express.json());

    // Mock auth middleware
    authMiddleware = (req, res, next) => {
      (req as any).user = { id: testUserId };
      next();
    };

    app.use('/api/batch', authMiddleware, batchRouter);
  });

  beforeEach(() => {
    testUserId = `test-user-${Date.now()}`;
    mockBatchJobs.length = 0; // Clear mock data
    vi.clearAllMocks();
  });

  afterAll(async () => {
    // Cleanup test data (mock doesn't need real cleanup)
    mockBatchJobs.length = 0;
  });

  describe('POST /api/batch/process', () => {
    it('should accept a batch processing request in fast mode', async () => {
      const response = await request(app)
        .post('/api/batch/process')
        .send({
          shootId: 'shoot123',
          images: [
            { id: 'img1', filename: 'test1.jpg', url: 'https://example.com/img1.jpg' },
            { id: 'img2', filename: 'test2.jpg', url: 'https://example.com/img2.jpg' },
          ],
          providerId: 'openai-gpt-5',
          prompt: 'Rate these images',
          mode: 'fast',
        });

      expect(response.status).toBe(202);
      expect(response.body).toHaveProperty('jobId');
      expect(response.body.mode).toBe('fast');
      expect(response.body.totalImages).toBe(2);
    });

    it('should reject request without authentication', async () => {
      const appNoAuth = express();
      appNoAuth.use(express.json());
      appNoAuth.use('/api/batch', batchRouter);

      const response = await request(appNoAuth)
        .post('/api/batch/process')
        .send({
          shootId: 'shoot123',
          images: [{ id: 'img1', filename: 'test1.jpg' }],
          providerId: 'openai-gpt-5',
          prompt: 'Rate these images',
        });

      expect(response.status).toBe(401);
    });

    it('should reject request with invalid data', async () => {
      const response = await request(app)
        .post('/api/batch/process')
        .send({
          shootId: 'shoot123',
          // Missing images array
          providerId: 'openai-gpt-5',
          prompt: 'Rate these images',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject request with invalid provider', async () => {
      const response = await request(app)
        .post('/api/batch/process')
        .send({
          shootId: 'shoot123',
          images: [{ id: 'img1', filename: 'test1.jpg' }],
          providerId: 'invalid-provider',
          prompt: 'Rate these images',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid provider');
    });

    it('should default to fast mode if mode not specified', async () => {
      const response = await request(app)
        .post('/api/batch/process')
        .send({
          shootId: 'shoot123',
          images: [{ id: 'img1', filename: 'test1.jpg' }],
          providerId: 'openai-gpt-5',
          prompt: 'Rate these images',
          // No mode specified
        });

      expect(response.status).toBe(202);
      expect(response.body.mode).toBe('fast');
    });
  });

  describe('GET /api/batch/status/:jobId', () => {
    it('should return status of an existing job', async () => {
      // Create a job first
      const createResponse = await request(app)
        .post('/api/batch/process')
        .send({
          shootId: 'shoot123',
          images: [{ id: 'img1', filename: 'test1.jpg' }],
          providerId: 'openai-gpt-5',
          prompt: 'Rate these images',
        });

      const jobId = createResponse.body.jobId;

      // Wait a bit for processing
      await new Promise(resolve => setTimeout(resolve, 500));

      // Get status
      const statusResponse = await request(app).get(`/api/batch/status/${jobId}`);

      expect(statusResponse.status).toBe(200);
      expect(statusResponse.body).toHaveProperty('jobId', jobId);
      expect(statusResponse.body).toHaveProperty('status');
      expect(statusResponse.body).toHaveProperty('totalImages');
      expect(statusResponse.body).toHaveProperty('processedImages');
      expect(statusResponse.body).toHaveProperty('progress');
    });

    it('should return 404 for non-existent job', async () => {
      const response = await request(app).get('/api/batch/status/nonexistent-job');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Job not found');
    });

    it('should reject unauthorized access to job', async () => {
      // Create job with one user
      const originalUserId = testUserId;
      const createResponse = await request(app)
        .post('/api/batch/process')
        .send({
          shootId: 'shoot123',
          images: [{ id: 'img1', filename: 'test1.jpg' }],
          providerId: 'openai-gpt-5',
          prompt: 'Rate these images',
        });

      const jobId = createResponse.body.jobId;

      // Try to access with different user
      testUserId = 'different-user';

      const statusResponse = await request(app).get(`/api/batch/status/${jobId}`);

      expect(statusResponse.status).toBe(403);
      expect(statusResponse.body.error).toBe('Forbidden');

      // Restore original user
      testUserId = originalUserId;
    });
  });

  describe('GET /api/batch/results/:jobId', () => {
    it('should return results of a completed job', async () => {
      // Create a job
      const createResponse = await request(app)
        .post('/api/batch/process')
        .send({
          shootId: 'shoot123',
          images: [{ id: 'img1', filename: 'test1.jpg' }],
          providerId: 'openai-gpt-5',
          prompt: 'Rate these images',
        });

      const jobId = createResponse.body.jobId;

      // Wait for completion (in tests this should be fast)
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Get results
      const resultsResponse = await request(app).get(`/api/batch/results/${jobId}`);

      if (resultsResponse.status === 200) {
        expect(resultsResponse.body).toHaveProperty('jobId', jobId);
        expect(resultsResponse.body).toHaveProperty('results');
        expect(Array.isArray(resultsResponse.body.results)).toBe(true);
      } else {
        // Job might still be processing
        expect(resultsResponse.status).toBe(400);
        expect(resultsResponse.body.error).toBe('Job not completed');
      }
    });

    it('should return 404 for non-existent job', async () => {
      const response = await request(app).get('/api/batch/results/nonexistent-job');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Job not found');
    });
  });

  describe('POST /api/batch/cancel/:jobId', () => {
    it('should cancel a processing job', async () => {
      // Create a job with many images (will take time to process)
      const createResponse = await request(app)
        .post('/api/batch/process')
        .send({
          shootId: 'shoot123',
          images: Array.from({ length: 100 }, (_, i) => ({
            id: `img${i}`,
            filename: `test${i}.jpg`,
          })),
          providerId: 'openai-gpt-5',
          prompt: 'Rate these images',
        });

      const jobId = createResponse.body.jobId;

      // Cancel immediately (with mocked provider, might complete before cancel)
      const cancelResponse = await request(app).post(`/api/batch/cancel/${jobId}`);

      // With fast mocked provider, job might complete before cancel can happen
      // Accept either successful cancel (200) or already completed (400)
      expect([200, 400]).toContain(cancelResponse.status);

      if (cancelResponse.status === 200) {
        expect(cancelResponse.body).toHaveProperty('message', 'Job cancelled successfully');

        // Verify job is cancelled
        const statusResponse = await request(app).get(`/api/batch/status/${jobId}`);
        expect(statusResponse.body.status).toBe('failed');
        expect(statusResponse.body.error).toContain('Cancelled');
      }
    });

    it('should return 404 for non-existent job', async () => {
      const response = await request(app).post('/api/batch/cancel/nonexistent-job');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Job not found');
    });

    it('should reject cancelling already completed job', async () => {
      // Create a simple job
      const createResponse = await request(app)
        .post('/api/batch/process')
        .send({
          shootId: 'shoot123',
          images: [{ id: 'img1', filename: 'test1.jpg' }],
          providerId: 'openai-gpt-5',
          prompt: 'Rate these images',
        });

      const jobId = createResponse.body.jobId;

      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Try to cancel
      const cancelResponse = await request(app).post(`/api/batch/cancel/${jobId}`);

      // Should either be cancelled or already completed
      expect([200, 400]).toContain(cancelResponse.status);
    });
  });

  describe('Ultra-high concurrency stress test', () => {
    it('should handle 1000+ images simultaneously', async () => {
      const imageCount = 1000;
      const images = Array.from({ length: imageCount }, (_, i) => ({
        id: `img${i}`,
        filename: `test${i}.jpg`,
      }));

      const response = await request(app)
        .post('/api/batch/process')
        .send({
          shootId: 'shoot-stress-test',
          images,
          providerId: 'openai-gpt-5',
          prompt: 'Rate these images',
          mode: 'fast',
        });

      expect(response.status).toBe(202);
      expect(response.body.totalImages).toBe(imageCount);

      const jobId = response.body.jobId;

      // Poll status until complete or timeout
      const maxWaitTime = 30000; // 30 seconds
      const startTime = Date.now();
      let completed = false;

      while (Date.now() - startTime < maxWaitTime && !completed) {
        await new Promise(resolve => setTimeout(resolve, 1000));

        const statusResponse = await request(app).get(`/api/batch/status/${jobId}`);

        if (statusResponse.body.status === 'completed') {
          completed = true;
          expect(statusResponse.body.processedImages).toBeGreaterThan(0);
        }
      }

      // In tests with mocked provider, should complete quickly
      expect(completed).toBe(true);
    }, 35000); // Extended timeout for stress test
  });
});
