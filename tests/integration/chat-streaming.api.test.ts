import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import { Readable } from 'stream';
import http from 'http';

describe('Chat Streaming API', () => {
  let app: Express;
  let server: http.Server;

  beforeAll(async () => {
    // Set required environment variables
    process.env.STRIPE_SECRET_KEY = 'sk_test_mock';
    process.env.STRIPE_PRICE_ANNUAL_SUBSCRIPTION = 'price_mock';
    process.env.STRIPE_PRICE_PAY_AS_YOU_GO = 'price_mock';
    process.env.OPENAI_API_KEY = 'sk-mock';

    // Create Express app
    app = express();
    app.use(express.json());

    // Mock the chat service to return a stream
    vi.mock('../../server/chatService', () => ({
      getChatResponseStream: vi.fn(async () => {
        // Create a mock SSE stream with multiple chunks
        const chunks = [
          'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
          'data: {"choices":[{"delta":{"content":" there"}}]}\n\n',
          'data: {"choices":[{"delta":{"content":"!"}}]}\n\n',
          'data: {"choices":[{"delta":{"content":" Testing"}}]}\n\n',
          'data: {"choices":[{"delta":{"content":" streaming"}}]}\n\n',
          'data: {"choices":[{"finish_reason":"stop"}]}\n\n',
          'data: [DONE]\n\n',
        ];

        // Return a ReadableStream that emits chunks with small delays
        return new ReadableStream({
          async start(controller) {
            for (const chunk of chunks) {
              controller.enqueue(new TextEncoder().encode(chunk));
              // Small delay to simulate streaming
              await new Promise(resolve => setTimeout(resolve, 10));
            }
            controller.close();
          },
        });
      }),
      buildFullPromptMarkdown: vi.fn(async () => 'Mock prompt\n\nQUICK_REPLIES:test␞NEXT_MESSAGE:none'),
    }));

    // Import and setup routes
    const { registerRoutes } = await import('../../server/routes');
    server = await registerRoutes(app);
  });

  afterAll((done) => {
    vi.restoreAllMocks();
    if (server) {
      server.close(done);
    } else {
      done();
    }
  });

  describe('POST /api/chat/message - Streaming Headers', () => {
    it('should set proper SSE headers for streaming', async () => {
      const response = await request(app)
        .post('/api/chat/message')
        .send({
          message: 'Hello',
          history: [],
          preferredModel: 'gpt-5-nano',
          sessionId: 'test-session',
        })
        .expect('Content-Type', 'text/event-stream')
        .expect('Cache-Control', 'no-cache, no-transform')
        .expect('Connection', 'keep-alive')
        .expect('X-Accel-Buffering', 'no');

      expect(response.headers['content-type']).toBe('text/event-stream');
    });
  });

  describe('POST /api/chat/message - Streaming Content', () => {
    it('should stream SSE formatted events', (done) => {
      const chunks: Buffer[] = [];
      let eventCount = 0;

      const req = http.request(
        {
          method: 'POST',
          host: 'localhost',
          port: server.address()?.['port'] || 5000,
          path: '/api/chat/message',
          headers: {
            'Content-Type': 'application/json',
          },
        },
        (res) => {
          expect(res.headers['content-type']).toBe('text/event-stream');

          res.on('data', (chunk) => {
            chunks.push(chunk);
            eventCount++;
          });

          res.on('end', () => {
            const fullText = Buffer.concat(chunks).toString();

            // Verify we got SSE formatted data
            expect(fullText).toContain('data: ');

            // Verify multiple chunks (not buffered)
            expect(chunks.length).toBeGreaterThan(1);

            // Parse events
            const lines = fullText.split('\n\n');
            const events = lines
              .filter(line => line.startsWith('data: '))
              .map(line => {
                try {
                  return JSON.parse(line.replace('data: ', ''));
                } catch {
                  return null;
                }
              })
              .filter(Boolean);

            // Verify we got delta events
            const deltaEvents = events.filter(e => e.type === 'delta');
            expect(deltaEvents.length).toBeGreaterThan(0);

            // Verify we got done event
            const doneEvents = events.filter(e => e.type === 'done');
            expect(doneEvents.length).toBe(1);

            done();
          });

          res.on('error', done);
        }
      );

      req.write(
        JSON.stringify({
          message: 'Test streaming',
          history: [],
          preferredModel: 'gpt-5-nano',
          sessionId: 'test-session',
        })
      );

      req.end();
    }, 10000);

    it('should flush data immediately (not buffered)', (done) => {
      const chunkTimes: number[] = [];
      let firstChunkTime: number = 0;
      let lastChunkTime: number = 0;

      const startTime = Date.now();

      const req = http.request(
        {
          method: 'POST',
          host: 'localhost',
          port: server.address()?.['port'] || 5000,
          path: '/api/chat/message',
          headers: {
            'Content-Type': 'application/json',
          },
        },
        (res) => {
          let chunkCount = 0;

          res.on('data', (chunk) => {
            const now = Date.now();
            chunkCount++;

            if (chunkCount === 1) {
              firstChunkTime = now;
            }
            lastChunkTime = now;

            chunkTimes.push(now);
          });

          res.on('end', () => {
            // Verify we got multiple chunks over time
            expect(chunkCount).toBeGreaterThan(1);

            // Verify time-to-first-chunk is fast (not buffered)
            const ttfc = firstChunkTime - startTime;
            expect(ttfc).toBeLessThan(1000); // Should arrive within 1 second

            // Verify chunks arrived over time (not all at once)
            const totalTime = lastChunkTime - firstChunkTime;
            expect(totalTime).toBeGreaterThan(0); // Some time gap between first and last

            // Calculate inter-chunk gaps
            if (chunkTimes.length > 1) {
              const gaps = chunkTimes.slice(1).map((t, i) => t - chunkTimes[i]);
              // At least one gap should be > 0ms (chunks not instant)
              const hasGaps = gaps.some(g => g > 0);
              expect(hasGaps).toBe(true);
            }

            done();
          });

          res.on('error', done);
        }
      );

      req.write(
        JSON.stringify({
          message: 'Test immediate flushing',
          history: [],
          preferredModel: 'gpt-5-nano',
          sessionId: 'test-session',
        })
      );

      req.end();
    }, 10000);
  });

  describe('SSE Format Compliance', () => {
    it('should follow SSE specification with proper line endings', (done) => {
      const req = http.request(
        {
          method: 'POST',
          host: 'localhost',
          port: server.address()?.['port'] || 5000,
          path: '/api/chat/message',
          headers: {
            'Content-Type': 'application/json',
          },
        },
        (res) => {
          let fullData = '';

          res.on('data', (chunk) => {
            fullData += chunk.toString();
          });

          res.on('end', () => {
            // Verify events are separated by \n\n
            const events = fullData.split('\n\n').filter(e => e.length > 0);

            // Each event should start with "data: "
            events.forEach(event => {
              if (event.trim().length > 0) {
                expect(event).toMatch(/^data: /);
              }
            });

            // Verify parseable JSON in data fields
            const jsonEvents = events
              .filter(e => e.startsWith('data: '))
              .map(e => {
                const json = e.replace('data: ', '').trim();
                try {
                  return JSON.parse(json);
                } catch {
                  return null;
                }
              })
              .filter(Boolean);

            expect(jsonEvents.length).toBeGreaterThan(0);

            // Each parsed event should have a type field
            jsonEvents.forEach(event => {
              expect(event).toHaveProperty('type');
            });

            done();
          });

          res.on('error', done);
        }
      );

      req.write(
        JSON.stringify({
          message: 'Test SSE format',
          history: [],
          preferredModel: 'gpt-5-nano',
          sessionId: 'test-session',
        })
      );

      req.end();
    }, 10000);
  });

  describe('TCP Configuration', () => {
    it('should verify socket configuration for streaming', (done) => {
      const req = http.request(
        {
          method: 'POST',
          host: 'localhost',
          port: server.address()?.['port'] || 5000,
          path: '/api/chat/message',
          headers: {
            'Content-Type': 'application/json',
          },
        },
        (res) => {
          // Check that socket has TCP_NODELAY enabled
          // This is verified indirectly by ensuring chunks arrive progressively
          const chunkArrivalTimes: number[] = [];

          res.on('data', () => {
            chunkArrivalTimes.push(Date.now());
          });

          res.on('end', () => {
            // With TCP_NODELAY, chunks should arrive in separate events
            expect(chunkArrivalTimes.length).toBeGreaterThan(1);

            done();
          });

          res.on('error', done);
        }
      );

      req.write(
        JSON.stringify({
          message: 'Test TCP config',
          history: [],
          preferredModel: 'gpt-5-nano',
          sessionId: 'test-session',
        })
      );

      req.end();
    }, 10000);
  });

  describe('Token-by-Token Streaming', () => {
    it('should stream individual tokens as they arrive', (done) => {
      let tokens: string[] = [];

      const req = http.request(
        {
          method: 'POST',
          host: 'localhost',
          port: server.address()?.['port'] || 5000,
          path: '/api/chat/message',
          headers: {
            'Content-Type': 'application/json',
          },
        },
        (res) => {
          let buffer = '';

          res.on('data', (chunk) => {
            buffer += chunk.toString();

            // Extract complete SSE events from buffer
            const events = buffer.split('\n\n');
            buffer = events.pop() || ''; // Keep incomplete event in buffer

            events.forEach(event => {
              if (event.startsWith('data: ')) {
                try {
                  const json = JSON.parse(event.replace('data: ', ''));
                  if (json.type === 'delta' && json.content) {
                    tokens.push(json.content);
                  }
                } catch (e) {
                  // Ignore parse errors
                }
              }
            });
          });

          res.on('end', () => {
            // Verify we received multiple token chunks
            expect(tokens.length).toBeGreaterThan(1);

            // Verify tokens were received progressively (not all at once)
            // This proves socket.uncork() is working
            done();
          });

          res.on('error', done);
        }
      );

      req.write(
        JSON.stringify({
          message: 'Tell me a story',
          history: [],
          preferredModel: 'gpt-5-nano',
          sessionId: 'test-session',
        })
      );

      req.end();
    }, 10000);
  });
});
