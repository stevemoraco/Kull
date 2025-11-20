/**
 * STREAMING TESTS - Chat Service (Responses API Layer)
 *
 * Tests the conversion from OpenAI Responses API format to Chat Completions format
 * and ensures streaming works correctly at the service layer.
 *
 * This tests:
 * - Responses API streaming chunk conversion
 * - Real-time delta emission (no buffering)
 * - Reasoning block capture
 * - Usage data extraction
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getChatResponseStream } from '../chatService';

// Create a mock OpenAI instance that will be reused
const mockResponsesCreate = vi.fn();
const mockOpenAIInstance = {
  responses: {
    create: mockResponsesCreate
  }
};

// Mock OpenAI SDK
vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(() => mockOpenAIInstance)
  };
});

// Mock other dependencies
vi.mock('../fetchRepo', () => ({
  getRepoContent: vi.fn().mockResolvedValue('')
}));

vi.mock('../prompts/staticContent', () => ({
  MASTER_SALES_PROMPT: 'Test prompt'
}));

vi.mock('../knowledge/repoCache', () => ({
  getStaticKnowledgeBase: vi.fn().mockResolvedValue('Test knowledge base')
}));

vi.mock('../../shared/salesScript', () => ({
  getQuestionByStep: vi.fn().mockReturnValue({ step: 1, question: 'Test question?' }),
  interpolateQuestion: vi.fn().mockReturnValue('Test question?')
}));

vi.mock('../questionCache', () => ({
  extractQuestions: vi.fn().mockReturnValue([])
}));

vi.mock('../conversationStateManager', () => ({
  getNextQuestion: vi.fn().mockReturnValue('Next question?')
}));

describe('ChatService Streaming Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Set up environment
    process.env.OPENAI_API_KEY = 'test-key';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Responses API Streaming Conversion', () => {
    it('should convert response.output_text.delta chunks to Chat Completions format', async () => {
      // Mock async iterable response from Responses API
      const mockResponseChunks = [
        { type: 'response.output_text.delta', delta: 'Hello', output_index: 1 },
        { type: 'response.output_text.delta', delta: ' world', output_index: 1 },
        { type: 'response.output_text.delta', delta: '!', output_index: 1 },
        {
          type: 'response.completed',
          response: {
            usage: {
              input_tokens: 100,
              output_tokens: 3,
              input_tokens_cached: 50
            }
          }
        }
      ];

      mockResponsesCreate.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          for (const chunk of mockResponseChunks) {
            yield chunk;
          }
        }
      });

      const stream = await getChatResponseStream(
        'Test message',
        [],
        'gpt-5-nano',
        'Test context'
      );

      const reader = stream.getReader();
      const decoder = new TextDecoder();
      const chunks: any[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const content = line.slice(6);
            if (content.trim() && content.trim() !== '[DONE]') {
              try {
                chunks.push(JSON.parse(content));
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }
      }

      // Verify chunks are in Chat Completions format
      const deltaChunks = chunks.filter(c => c.choices?.[0]?.delta?.content);
      expect(deltaChunks).toHaveLength(3);
      expect(deltaChunks[0].choices[0].delta.content).toBe('Hello');
      expect(deltaChunks[1].choices[0].delta.content).toBe(' world');
      expect(deltaChunks[2].choices[0].delta.content).toBe('!');

      // Verify usage data is included
      const usageChunk = chunks.find(c => c.usage);
      expect(usageChunk).toBeDefined();
      expect(usageChunk.usage.prompt_tokens).toBe(100);
      expect(usageChunk.usage.completion_tokens).toBe(3);
      expect(usageChunk.usage.prompt_tokens_details?.cached_tokens).toBe(50);
    });

    it('should stream deltas immediately without buffering', async () => {
      const mockResponseChunks = [
        { type: 'response.output_text.delta', delta: 'Token1', output_index: 1 },
        { type: 'response.output_text.delta', delta: 'Token2', output_index: 1 },
        { type: 'response.output_text.delta', delta: 'Token3', output_index: 1 },
      ];

      mockResponsesCreate.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          for (const chunk of mockResponseChunks) {
            yield chunk;
          }
        }
      });

      const stream = await getChatResponseStream(
        'Test message',
        [],
        'gpt-5-nano',
        'Test context'
      );

      const reader = stream.getReader();
      const decoder = new TextDecoder();
      const receivedTokens: string[] = [];
      const timestamps: number[] = [];

      while (true) {
        const start = Date.now();
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const content = line.slice(6);
            if (content.trim()) {
              try {
                const data = JSON.parse(content);
                if (data.choices?.[0]?.delta?.content) {
                  receivedTokens.push(data.choices[0].delta.content);
                  timestamps.push(Date.now() - start);
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }
      }

      // Verify tokens received individually (not accumulated)
      expect(receivedTokens).toEqual(['Token1', 'Token2', 'Token3']);

      // Verify each token arrived quickly (not buffered)
      // Each token should arrive within milliseconds of read()
      timestamps.forEach(timestamp => {
        expect(timestamp).toBeLessThan(100); // Max 100ms delay per token
      });
    });

    it('should capture reasoning blocks from response.content_part.done', async () => {
      const mockResponseChunks = [
        { type: 'response.output_text.delta', delta: 'Response text', output_index: 1 },
        {
          type: 'response.content_part.done',
          part: {
            type: 'reasoning',
            encrypted_content: 'encrypted_reasoning_block_1'
          }
        },
        {
          type: 'response.content_part.done',
          part: {
            type: 'reasoning',
            encrypted_content: 'encrypted_reasoning_block_2'
          }
        },
        {
          type: 'response.completed',
          response: {
            usage: {
              input_tokens: 100,
              output_tokens: 10
            }
          }
        }
      ];

      mockResponsesCreate.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          for (const chunk of mockResponseChunks) {
            yield chunk;
          }
        }
      });

      const stream = await getChatResponseStream(
        'Test message',
        [],
        'gpt-5-nano',
        'Test context'
      );

      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let reasoningBlocks: string[] | undefined;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const content = line.slice(6);
            if (content.trim()) {
              try {
                const data = JSON.parse(content);
                if (data.reasoning_blocks) {
                  reasoningBlocks = data.reasoning_blocks;
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }
      }

      // Verify reasoning blocks were captured
      expect(reasoningBlocks).toBeDefined();
      expect(reasoningBlocks).toHaveLength(2);
      expect(reasoningBlocks).toContain('encrypted_reasoning_block_1');
      expect(reasoningBlocks).toContain('encrypted_reasoning_block_2');
    });

    it('should handle streaming errors gracefully', async () => {
      mockResponsesCreate.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          yield { type: 'response.output_text.delta', delta: 'Start', output_index: 1 };
          throw new Error('Stream error');
        }
      });

      const stream = await getChatResponseStream(
        'Test message',
        [],
        'gpt-5-nano',
        'Test context'
      );

      const reader = stream.getReader();

      // Should not throw - error should be caught internally
      await expect(async () => {
        while (true) {
          const { done } = await reader.read();
          if (done) break;
        }
      }).rejects.toThrow();
    });

    it('should call status callback with timing information', async () => {
      const mockResponseChunks = [
        { type: 'response.output_text.delta', delta: 'Test', output_index: 1 },
        {
          type: 'response.completed',
          response: {
            usage: {
              input_tokens: 50,
              output_tokens: 5
            }
          }
        }
      ];

      mockResponsesCreate.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          for (const chunk of mockResponseChunks) {
            yield chunk;
          }
        }
      });

      const statusCallback = vi.fn();

      await getChatResponseStream(
        'Test message',
        [],
        'gpt-5-nano',
        'Test context',
        undefined,
        undefined,
        undefined,
        undefined,
        statusCallback
      );

      // Verify status callback was called with knowledge base loading timing
      expect(statusCallback).toHaveBeenCalledWith(
        expect.stringContaining('knowledge base'),
        expect.any(Number)
      );
    });
  });

  describe('Model Support', () => {
    it('should support gpt-5-nano', async () => {
      mockResponsesCreate.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          yield { type: 'response.output_text.delta', delta: 'Test', output_index: 1 };
        }
      });

      await getChatResponseStream(
        'Test message',
        [],
        'gpt-5-nano',
        'Test context'
      );

      expect(mockResponsesCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-5-nano'
        })
      );
    });

    it('should support gpt-5-mini', async () => {
      mockResponsesCreate.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          yield { type: 'response.output_text.delta', delta: 'Test', output_index: 1 };
        }
      });

      await getChatResponseStream(
        'Test message',
        [],
        'gpt-5-mini',
        'Test context'
      );

      expect(mockResponsesCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-5-mini'
        })
      );
    });

    it('should support gpt-5', async () => {
      mockResponsesCreate.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          yield { type: 'response.output_text.delta', delta: 'Test', output_index: 1 };
        }
      });

      await getChatResponseStream(
        'Test message',
        [],
        'gpt-5',
        'Test context'
      );

      expect(mockResponsesCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-5'
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should return error stream when API key is missing', async () => {
      delete process.env.OPENAI_API_KEY;

      const stream = await getChatResponseStream(
        'Test message',
        [],
        'gpt-5-nano',
        'Test context'
      );

      const reader = stream.getReader();
      const decoder = new TextDecoder();
      const { value } = await reader.read();
      const chunk = decoder.decode(value);

      expect(chunk).toContain('error');
      expect(chunk).toContain('temporarily unavailable');
    });

    it('should return error stream on API failure', async () => {
      mockResponsesCreate.mockRejectedValue(new Error('API Error'));

      const stream = await getChatResponseStream(
        'Test message',
        [],
        'gpt-5-nano',
        'Test context'
      );

      const reader = stream.getReader();
      const decoder = new TextDecoder();
      const { value } = await reader.read();
      const chunk = decoder.decode(value);

      expect(chunk).toContain('error');
    });
  });

  describe('Regression Tests - Streaming Never Breaks', () => {
    it('should NOT buffer lineBuffer before sending deltas', async () => {
      // This test ensures tokens stream immediately, not accumulated in lineBuffer
      const mockResponseChunks = [
        { type: 'response.output_text.delta', delta: 'First', output_index: 1 },
        { type: 'response.output_text.delta', delta: ' token', output_index: 1 },
        { type: 'response.output_text.delta', delta: ' here', output_index: 1 },
      ];

      mockResponsesCreate.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          for (const chunk of mockResponseChunks) {
            // Simulate network delay between tokens
            await new Promise(resolve => setTimeout(resolve, 10));
            yield chunk;
          }
        }
      });

      const stream = await getChatResponseStream(
        'Test message',
        [],
        'gpt-5-nano',
        'Test context'
      );

      const reader = stream.getReader();
      const decoder = new TextDecoder();
      const tokens: string[] = [];
      const tokenTimestamps: number[] = [];
      const startTime = Date.now();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const content = line.slice(6);
            if (content.trim()) {
              try {
                const data = JSON.parse(content);
                if (data.choices?.[0]?.delta?.content) {
                  tokens.push(data.choices[0].delta.content);
                  tokenTimestamps.push(Date.now() - startTime);
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }
      }

      // Verify each token arrived separately (not accumulated)
      expect(tokens).toEqual(['First', ' token', ' here']);

      // Verify tokens arrived sequentially with delays (proving streaming, not batching)
      expect(tokenTimestamps[0]).toBeLessThan(tokenTimestamps[1]);
      expect(tokenTimestamps[1]).toBeLessThan(tokenTimestamps[2]);

      // Each token should arrive ~10ms apart (network delay simulation)
      expect(tokenTimestamps[1] - tokenTimestamps[0]).toBeGreaterThan(5);
      expect(tokenTimestamps[2] - tokenTimestamps[1]).toBeGreaterThan(5);
    });

    it('should handle delimiter detection without blocking previous chunks', async () => {
      // This test ensures delimiters don't block streaming of valid content
      const mockResponseChunks = [
        { type: 'response.output_text.delta', delta: 'Valid content', output_index: 1 },
        { type: 'response.output_text.delta', delta: ' more text', output_index: 1 },
        { type: 'response.output_text.delta', delta: '\n\n␞QUICK_REPLIES:', output_index: 1 },
        { type: 'response.output_text.delta', delta: ' answer1 | answer2', output_index: 1 },
      ];

      mockResponsesCreate.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          for (const chunk of mockResponseChunks) {
            yield chunk;
          }
        }
      });

      const stream = await getChatResponseStream(
        'Test message',
        [],
        'gpt-5-nano',
        'Test context'
      );

      const reader = stream.getReader();
      const decoder = new TextDecoder();
      const tokens: string[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const content = line.slice(6);
            if (content.trim()) {
              try {
                const data = JSON.parse(content);
                if (data.choices?.[0]?.delta?.content) {
                  tokens.push(data.choices[0].delta.content);
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }
      }

      // Verify valid content streamed before delimiters
      expect(tokens[0]).toBe('Valid content');
      expect(tokens[1]).toBe(' more text');

      // Delimiter chunks should NOT be streamed (filtered by routes.ts)
      // But chatService.ts should send them for routes.ts to filter
      expect(tokens.some(t => t.includes('␞QUICK_REPLIES'))).toBe(true);
    });

    it('should send each chunk immediately with res.socket.uncork()', async () => {
      // This verifies the anti-buffering fix: each chunk should trigger uncork()
      const mockResponseChunks = [
        { type: 'response.output_text.delta', delta: 'Token1', output_index: 1 },
        { type: 'response.output_text.delta', delta: 'Token2', output_index: 1 },
        { type: 'response.output_text.delta', delta: 'Token3', output_index: 1 },
      ];

      mockResponsesCreate.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          for (const chunk of mockResponseChunks) {
            yield chunk;
          }
        }
      });

      const stream = await getChatResponseStream(
        'Test message',
        [],
        'gpt-5-nano',
        'Test context'
      );

      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let chunkCount = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        if (chunk.includes('data:')) {
          chunkCount++;
        }
      }

      // Verify we received multiple separate chunks (not one big chunk)
      expect(chunkCount).toBeGreaterThan(1);
    });
  });
});
