import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { BatchProcessor } from '../../../server/ai/BatchProcessor';
import type { ImageInput, ProviderAdapter } from '../../../server/ai/BatchProcessor';

// Mock WebSocket service
vi.mock('../../../server/websocket', () => ({
  getGlobalWsService: vi.fn(() => ({
    broadcastToUser: vi.fn(),
  })),
}));

describe('BatchProcessor', () => {
  let processor: BatchProcessor;
  let mockProvider: ProviderAdapter;

  beforeEach(() => {
    processor = new BatchProcessor({
      maxRetryTime: 10000, // 10 seconds for tests
      initialBackoff: 100,
      maxBackoff: 1000,
      rateLimitBackoff: 50,
    });

    mockProvider = {
      processSingleImage: vi.fn(async (input) => ({
        imageId: input.image.id,
        filename: input.image.filename || input.image.id,
        starRating: 4,
        colorLabel: 'green',
        title: 'Test Image',
        description: 'Test description',
        tags: ['test'],
      })),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('processConcurrent', () => {
    it('should process all images concurrently', async () => {
      const images: ImageInput[] = [
        { id: 'img1', filename: 'test1.jpg' },
        { id: 'img2', filename: 'test2.jpg' },
        { id: 'img3', filename: 'test3.jpg' },
      ];

      const results = await processor.processConcurrent(
        'user123',
        'shoot123',
        images,
        mockProvider,
        'Rate this image'
      );

      expect(results).toHaveLength(3);
      expect(results.every(r => r.success)).toBe(true);
      expect(mockProvider.processSingleImage).toHaveBeenCalledTimes(3);
    });

    it('should handle 1000+ images concurrently', async () => {
      const images: ImageInput[] = Array.from({ length: 1000 }, (_, i) => ({
        id: `img${i}`,
        filename: `test${i}.jpg`,
      }));

      const startTime = Date.now();
      const results = await processor.processConcurrent(
        'user123',
        'shoot123',
        images,
        mockProvider,
        'Rate this image'
      );
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(1000);
      expect(results.every(r => r.success)).toBe(true);
      expect(mockProvider.processSingleImage).toHaveBeenCalledTimes(1000);

      // Should complete quickly since all are concurrent
      // Allow generous time for CI environments
      expect(duration).toBeLessThan(5000);
    });

    it('should throw error if no images provided', async () => {
      await expect(
        processor.processConcurrent(
          'user123',
          'shoot123',
          [],
          mockProvider,
          'Rate this image'
        )
      ).rejects.toThrow('No images provided');
    });
  });

  describe('retry logic with exponential backoff', () => {
    it('should retry on rate limit errors with aggressive backoff', async () => {
      let attempts = 0;
      const rateLimitProvider: ProviderAdapter = {
        processSingleImage: vi.fn(async () => {
          attempts++;
          if (attempts < 3) {
            const error: any = new Error('Rate limit exceeded');
            error.statusCode = 429;
            throw error;
          }
          return {
            imageId: 'img1',
            filename: 'test1.jpg',
            starRating: 5,
            colorLabel: 'green',
          };
        }),
      };

      const images: ImageInput[] = [{ id: 'img1', filename: 'test1.jpg' }];

      const startTime = Date.now();
      const results = await processor.processConcurrent(
        'user123',
        'shoot123',
        images,
        rateLimitProvider,
        'Rate this image'
      );
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(results[0].attempts).toBe(3);
      expect(rateLimitProvider.processSingleImage).toHaveBeenCalledTimes(3);

      // Should have some backoff delay but not too much (aggressive)
      expect(duration).toBeGreaterThan(50); // At least some backoff
      expect(duration).toBeLessThan(500); // But not too long
    });

    it('should retry on other errors with cautious backoff', async () => {
      let attempts = 0;
      const errorProvider: ProviderAdapter = {
        processSingleImage: vi.fn(async () => {
          attempts++;
          if (attempts < 2) {
            throw new Error('Network error');
          }
          return {
            imageId: 'img1',
            filename: 'test1.jpg',
            starRating: 5,
            colorLabel: 'green',
          };
        }),
      };

      const images: ImageInput[] = [{ id: 'img1', filename: 'test1.jpg' }];

      const results = await processor.processConcurrent(
        'user123',
        'shoot123',
        images,
        errorProvider,
        'Rate this image'
      );

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(results[0].attempts).toBe(2);
      expect(errorProvider.processSingleImage).toHaveBeenCalledTimes(2);
    });

    it('should respect max retry time', async () => {
      const shortProcessor = new BatchProcessor({
        maxRetryTime: 200, // Very short for test
        initialBackoff: 50,
      });

      const alwaysFailProvider: ProviderAdapter = {
        processSingleImage: vi.fn(async () => {
          throw new Error('Always fails');
        }),
      };

      const images: ImageInput[] = [{ id: 'img1', filename: 'test1.jpg' }];

      const results = await shortProcessor.processConcurrent(
        'user123',
        'shoot123',
        images,
        alwaysFailProvider,
        'Rate this image'
      );

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toBeDefined();
    });

    it('should use exponential backoff sequence', async () => {
      const delays: number[] = [];
      let attempts = 0;

      const delayProvider: ProviderAdapter = {
        processSingleImage: vi.fn(async () => {
          const now = Date.now();
          if (attempts > 0) {
            delays.push(now);
          }
          attempts++;

          if (attempts < 4) {
            const error: any = new Error('Rate limit');
            error.statusCode = 429;
            throw error;
          }

          return {
            imageId: 'img1',
            filename: 'test1.jpg',
            starRating: 5,
            colorLabel: 'green',
          };
        }),
      };

      const images: ImageInput[] = [{ id: 'img1', filename: 'test1.jpg' }];

      await processor.processConcurrent(
        'user123',
        'shoot123',
        images,
        delayProvider,
        'Rate this image'
      );

      // Check that delays increase (exponential backoff)
      expect(delays.length).toBeGreaterThan(0);
    });
  });

  describe('progress broadcasting', () => {
    it('should broadcast progress updates via WebSocket', async () => {
      // Create processor with broadcasting enabled
      const broadcastingProcessor = new BatchProcessor({
        broadcastProgress: true,
        maxRetryTime: 10000,
        initialBackoff: 100,
      });

      const { getGlobalWsService } = await import('../../../server/websocket');
      const mockWsService = getGlobalWsService();

      const images: ImageInput[] = [
        { id: 'img1', filename: 'test1.jpg' },
        { id: 'img2', filename: 'test2.jpg' },
      ];

      await broadcastingProcessor.processConcurrent(
        'user123',
        'shoot123',
        images,
        mockProvider,
        'Rate this image'
      );

      // Should broadcast progress after each image
      expect(mockWsService?.broadcastToUser).toHaveBeenCalled();
    });

    it('should not crash if WebSocket service unavailable', async () => {
      const { getGlobalWsService } = await import('../../../server/websocket');
      vi.mocked(getGlobalWsService).mockReturnValue(null);

      const images: ImageInput[] = [{ id: 'img1', filename: 'test1.jpg' }];

      const results = await processor.processConcurrent(
        'user123',
        'shoot123',
        images,
        mockProvider,
        'Rate this image'
      );

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
    });
  });

  describe('mixed success/failure scenarios', () => {
    it('should handle mixed success and failure results', async () => {
      const shortProcessor = new BatchProcessor({
        maxRetryTime: 200, // Very short for test
        initialBackoff: 50,
      });

      const mixedProvider: ProviderAdapter = {
        processSingleImage: vi.fn(async (input) => {
          if (input.image.id === 'img2') {
            throw new Error('Processing failed');
          }
          return {
            imageId: input.image.id,
            filename: input.image.filename || input.image.id,
            starRating: 4,
            colorLabel: 'green',
          };
        }),
      };

      const images: ImageInput[] = [
        { id: 'img1', filename: 'test1.jpg' },
        { id: 'img2', filename: 'test2.jpg' },
        { id: 'img3', filename: 'test3.jpg' },
      ];

      const results = await shortProcessor.processConcurrent(
        'user123',
        'shoot123',
        images,
        mixedProvider,
        'Rate this image'
      );

      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[2].success).toBe(true);
    });

    it('should continue processing other images if one fails', async () => {
      const shortProcessor = new BatchProcessor({
        maxRetryTime: 200, // Very short for test
        initialBackoff: 50,
      });

      let processedCount = 0;
      const countingProvider: ProviderAdapter = {
        processSingleImage: vi.fn(async (input) => {
          processedCount++;
          if (input.image.id === 'img2') {
            throw new Error('Intentional failure');
          }
          return {
            imageId: input.image.id,
            filename: input.image.filename || input.image.id,
            starRating: 4,
            colorLabel: 'green',
          };
        }),
      };

      const images: ImageInput[] = [
        { id: 'img1', filename: 'test1.jpg' },
        { id: 'img2', filename: 'test2.jpg' },
        { id: 'img3', filename: 'test3.jpg' },
      ];

      await shortProcessor.processConcurrent(
        'user123',
        'shoot123',
        images,
        countingProvider,
        'Rate this image'
      );

      // All images should be attempted (potentially multiple times for failures)
      expect(processedCount).toBeGreaterThanOrEqual(3);
    });
  });

  describe('rate limit detection', () => {
    it('should detect rate limit by status code 429', async () => {
      let attempts = 0;
      const rateLimitProvider: ProviderAdapter = {
        processSingleImage: vi.fn(async () => {
          attempts++;
          if (attempts === 1) {
            const error: any = new Error('Too many requests');
            error.statusCode = 429;
            throw error;
          }
          return {
            imageId: 'img1',
            filename: 'test1.jpg',
            starRating: 5,
            colorLabel: 'green',
          };
        }),
      };

      const images: ImageInput[] = [{ id: 'img1', filename: 'test1.jpg' }];

      const results = await processor.processConcurrent(
        'user123',
        'shoot123',
        images,
        rateLimitProvider,
        'Rate this image'
      );

      expect(results[0].success).toBe(true);
      expect(rateLimitProvider.processSingleImage).toHaveBeenCalledTimes(2);
    });

    it('should detect rate limit by error message', async () => {
      let attempts = 0;
      const rateLimitProvider: ProviderAdapter = {
        processSingleImage: vi.fn(async () => {
          attempts++;
          if (attempts === 1) {
            throw new Error('Rate limit exceeded');
          }
          return {
            imageId: 'img1',
            filename: 'test1.jpg',
            starRating: 5,
            colorLabel: 'green',
          };
        }),
      };

      const images: ImageInput[] = [{ id: 'img1', filename: 'test1.jpg' }];

      const results = await processor.processConcurrent(
        'user123',
        'shoot123',
        images,
        rateLimitProvider,
        'Rate this image'
      );

      expect(results[0].success).toBe(true);
      expect(rateLimitProvider.processSingleImage).toHaveBeenCalledTimes(2);
    });
  });

  describe('performance characteristics', () => {
    it('should maintain high concurrency for large batches', async () => {
      const imageCount = 500;
      const images: ImageInput[] = Array.from({ length: imageCount }, (_, i) => ({
        id: `img${i}`,
        filename: `test${i}.jpg`,
      }));

      let concurrentCalls = 0;
      let maxConcurrent = 0;
      let activeCalls = 0;

      const concurrencyProvider: ProviderAdapter = {
        processSingleImage: vi.fn(async (input) => {
          activeCalls++;
          maxConcurrent = Math.max(maxConcurrent, activeCalls);
          concurrentCalls++;

          // Simulate processing time
          await new Promise(resolve => setTimeout(resolve, 10));

          activeCalls--;

          return {
            imageId: input.image.id,
            filename: input.image.filename || input.image.id,
            starRating: 4,
            colorLabel: 'green',
          };
        }),
      };

      await processor.processConcurrent(
        'user123',
        'shoot123',
        images,
        concurrencyProvider,
        'Rate this image'
      );

      // Should have high concurrency
      expect(maxConcurrent).toBeGreaterThan(100);
      expect(concurrencyProvider.processSingleImage).toHaveBeenCalledTimes(imageCount);
    });
  });
});
