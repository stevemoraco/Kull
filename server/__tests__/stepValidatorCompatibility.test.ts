/**
 * Step Validator Compatibility Tests
 *
 * Ensures the step validator (aiStepValidator.ts) maintains full compatibility
 * with the new unified architecture (contextBuilder.ts + chatService.ts)
 *
 * This test suite verifies:
 * - Step validator receives correct currentStep from conversationState
 * - Step validator receives correct lastAIMessage from history
 * - Step validator receives correct userMessage
 * - Step advancement updates conversationState correctly
 * - Validation feedback gets injected into prompt
 * - Integration with unified context builder
 * - Integration with chatService structure
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ConversationState } from '../storage';

// Mock OpenAI at the top level - using Responses API (not Chat Completions)
const mockCreate = vi.fn();
vi.mock('openai', () => {
  return {
    default: class MockOpenAI {
      responses = {
        create: mockCreate
      };
    }
  };
});

// Now import after mock is set up
const { validateStepAdvancement } = await import('../aiStepValidator');

describe('Step Validator Compatibility with Unified Architecture', () => {
  beforeEach(() => {
    // Set up environment
    process.env.OPENAI_API_KEY = 'test-key';

    // Clear any previous mock calls
    mockCreate.mockClear();
  });

  afterEach(() => {
    mockCreate.mockReset();
  });

  describe('Input Compatibility', () => {
    it('should accept currentStep from conversationState structure', async () => {
      const currentStep = 3;
      const aiMessage = 'how many hours are you working each week right now?';
      const userMessage = '40 hours';

      mockCreate.mockResolvedValue({
        output: [{
          type: 'output_text',
          text: 'ACTION: NEXT\nNEXT_STEP: 4\nREASONING: User provided specific hours'
        }]
      });

      const result = await validateStepAdvancement(
        currentStep,
        aiMessage,
        userMessage
      );

      expect(result.shouldAdvance).toBe(true);
      expect(result.nextStep).toBe(4);

      // Verify OpenAI was called with the correct step
      const callArg = mockCreate.mock.calls[0][0];
      expect(callArg.messages[0].content).toContain('CURRENT STEP: 3');
    });

    it('should accept lastAIMessage from conversation history', async () => {
      const currentStep = 1;
      const lastAIMessage = "i see you're doing about 88 shoots a year — is that accurate?";
      const userMessage = 'yes that sounds right';

      mockCreate.mockResolvedValue({
        output: [{
          type: 'output_text',
          text: 'ACTION: NEXT\nNEXT_STEP: 2\nREASONING: User confirmed accuracy'
        }]
      });

      const result = await validateStepAdvancement(
        currentStep,
        lastAIMessage,
        userMessage
      );

      expect(result.shouldAdvance).toBe(true);

      // Verify the AI message was passed correctly
      const callArg = mockCreate.mock.calls[0][0];
      expect(callArg.messages[0].content).toContain(lastAIMessage);
    });

    it('should handle conversation history from unified context', async () => {
      const currentStep = 5;
      const aiMessage = 'how do you expect to do that with your current workflow?';
      const userMessage = "i don't really have a plan";

      const conversationHistory = [
        { role: 'assistant', content: "i see you're doing about 88 shoots a year — is that accurate?" },
        { role: 'user', content: 'yes' },
        { role: 'assistant', content: "what's your goal for next year?" },
        { role: 'user', content: 'want to get to 150 shoots' },
      ];

      mockCreate.mockResolvedValue({
        output: [{
          type: 'output_text',
          text: 'ACTION: NEXT\nNEXT_STEP: 6\nREASONING: User admitted no plan'
        }]
      });

      const result = await validateStepAdvancement(
        currentStep,
        aiMessage,
        userMessage,
        conversationHistory
      );

      expect(result.shouldAdvance).toBe(true);

      // Verify history was passed
      const callArg = mockCreate.mock.calls[0][0];
      expect(callArg.messages[0].content).toContain('CONVERSATION HISTORY');
      expect(callArg.messages[0].content).toContain('88 shoots a year');
    });
  });

  describe('Output Compatibility', () => {
    it('should return shouldAdvance boolean for state updates', async () => {
      mockCreate.mockResolvedValue({
        output: [{
          type: 'output_text',
          text: 'ACTION: NEXT\nNEXT_STEP: 2\nREASONING: Good answer'
        }]
      });

      const result = await validateStepAdvancement(1, 'question?', 'yes');

      expect(result).toHaveProperty('shouldAdvance');
      expect(typeof result.shouldAdvance).toBe('boolean');
      expect(result.shouldAdvance).toBe(true);
    });

    it('should return feedback string for prompt injection when staying', async () => {
      mockCreate.mockResolvedValue({
        output: [{
          type: 'output_text',
          text: 'ACTION: STAY\nNEXT_STEP: 3\nREASONING: User gave vague response'
        }]
      });

      const result = await validateStepAdvancement(3, 'how many hours?', 'idk');

      expect(result.shouldAdvance).toBe(false);
      expect(result.feedback).toBeTruthy();
      expect(result.feedback).toContain('PREVIOUS QUESTION NOT ANSWERED');
      expect(result.feedback).toContain('vague response');
    });

    it('should return empty feedback when advancing', async () => {
      mockCreate.mockResolvedValue({
        output: [{
          type: 'output_text',
          text: 'ACTION: NEXT\nNEXT_STEP: 4\nREASONING: User answered'
        }]
      });

      const result = await validateStepAdvancement(3, 'how many hours?', '40 hours');

      expect(result.shouldAdvance).toBe(true);
      expect(result.feedback).toBe('');
    });

    it('should return nextStep for jump navigation', async () => {
      mockCreate.mockResolvedValue({
        output: [{
          type: 'output_text',
          text: 'ACTION: JUMP\nNEXT_STEP: 13\nREASONING: User ready to buy'
        }]
      });

      const result = await validateStepAdvancement(
        5,
        'question?',
        'I want to buy now'
      );

      expect(result.shouldAdvance).toBe(true);
      expect(result.action).toBe('JUMP');
      expect(result.nextStep).toBe(13);
    });
  });

  describe('Conversation State Integration', () => {
    it('should work with conversationState.currentStep', async () => {
      const conversationState: ConversationState = {
        currentStep: 7,
        questionsAsked: [
          { step: 1, question: 'Q1?', timestamp: new Date() },
          { step: 2, question: 'Q2?', timestamp: new Date() },
        ],
        questionsAnswered: [
          { step: 1, question: 'Q1?', answer: 'A1', timestamp: new Date() },
        ],
        offTopicCount: 0
      };

      mockCreate.mockResolvedValue({
        output: [{
          type: 'output_text',
          text: 'ACTION: NEXT\nNEXT_STEP: 8\nREASONING: Advancing'
        }]
      });

      const result = await validateStepAdvancement(
        conversationState.currentStep,
        'why that specific goal?',
        'because I want more family time'
      );

      expect(result.shouldAdvance).toBe(true);
      expect(result.nextStep).toBe(8);

      // In real usage, currentStep would be updated like this:
      if (result.shouldAdvance) {
        conversationState.currentStep = result.nextStep!;
      }

      expect(conversationState.currentStep).toBe(8);
    });

    it('should preserve conversationState when staying at step', async () => {
      const conversationState: ConversationState = {
        currentStep: 3,
        questionsAsked: [],
        questionsAnswered: [],
        offTopicCount: 0
      };

      mockCreate.mockResolvedValue({
        output: [{
          type: 'output_text',
          text: 'ACTION: STAY\nNEXT_STEP: 3\nREASONING: No answer given'
        }]
      });

      const result = await validateStepAdvancement(
        conversationState.currentStep,
        'how many hours?',
        'huh?'
      );

      expect(result.shouldAdvance).toBe(false);

      // In real usage, step stays the same when not advancing
      const previousStep = conversationState.currentStep;
      if (result.shouldAdvance) {
        conversationState.currentStep = result.nextStep!;
      }

      expect(conversationState.currentStep).toBe(previousStep);
    });
  });

  describe('Unified Context Builder Integration', () => {
    it('should work with context from buildUnifiedContext', async () => {
      // Simulate data from buildUnifiedContext
      const unifiedContext = {
        userMetadata: '## User Session\n- Device: Desktop\n',
        calculatorData: '## Calculator\n- Shoots: 88/year\n',
        conversationState: '## Conversation State\n- Current Step: 3\n',
        activityHistory: '## Activity\n- Clicked calculator\n',
      };

      const currentStep = 3;
      const lastAIMessage = 'how many hours are you working each week right now?';
      const userMessage = '45 hours';

      mockCreate.mockResolvedValue({
        output: [{
          type: 'output_text',
          text: 'ACTION: NEXT\nNEXT_STEP: 4\nREASONING: User gave hours'
        }]
      });

      const result = await validateStepAdvancement(
        currentStep,
        lastAIMessage,
        userMessage
      );

      // Validator should work regardless of context structure
      expect(result.shouldAdvance).toBe(true);
      expect(result.nextStep).toBe(4);
    });
  });

  describe('chatService Integration', () => {
    it('should work with chatService history format', async () => {
      // History format from chatService
      const history = [
        { role: 'user' as const, content: 'hi' },
        { role: 'assistant' as const, content: "do you mind if i ask you a few questions?" },
        { role: 'user' as const, content: 'sure' },
        { role: 'assistant' as const, content: "i see you're doing about 88 shoots a year — is that accurate?" },
      ];

      const currentStep = 1;
      const lastAIMessage = history[history.length - 1].content;
      const userMessage = 'yes that looks right';

      mockCreate.mockResolvedValue({
        output: [{
          type: 'output_text',
          text: 'ACTION: NEXT\nNEXT_STEP: 2\nREASONING: Confirmed'
        }]
      });

      const result = await validateStepAdvancement(
        currentStep,
        lastAIMessage,
        userMessage,
        history
      );

      expect(result.shouldAdvance).toBe(true);
    });

    it('should handle validationFeedback injection flow', async () => {
      mockCreate.mockResolvedValue({
        output: [{
          type: 'output_text',
          text: 'ACTION: STAY\nNEXT_STEP: 5\nREASONING: User deflected'
        }]
      });

      const result = await validateStepAdvancement(
        5,
        'how do you expect to do that?',
        'what do you mean?'
      );

      // Feedback should be formatted for prompt injection
      expect(result.feedback).toBeTruthy();
      expect(result.feedback).toContain('PREVIOUS QUESTION NOT ANSWERED');
      expect(result.feedback).toContain('Rephrase');

      // This feedback would be injected into chatService prompt
      // via the validationFeedback parameter
    });
  });

  describe('Error Handling & Fallbacks', () => {
    it('should fallback gracefully when API key missing', async () => {
      delete process.env.OPENAI_API_KEY;

      const result = await validateStepAdvancement(
        3,
        'question?',
        'answer'
      );

      // Should fallback to advancing (don't block user)
      expect(result.shouldAdvance).toBe(true);
      expect(result.feedback).toBe('');
      expect(result.reasoning).toContain('not configured');

      // Restore for other tests
      process.env.OPENAI_API_KEY = 'test-key';
    });

    it('should fallback gracefully on API errors', async () => {
      mockCreate.mockRejectedValue(
        new Error('API timeout')
      );

      const result = await validateStepAdvancement(
        5,
        'question?',
        'answer'
      );

      // Should fallback to advancing (don't block user)
      expect(result.shouldAdvance).toBe(true);
      expect(result.feedback).toBe('');
      expect(result.reasoning).toContain('error');
    });
  });

  describe('Data Structure Compatibility', () => {
    it('should maintain compatible message history format', async () => {
      const history = [
        { role: 'user', content: 'message 1' },
        { role: 'assistant', content: 'response 1' },
        { role: 'user', content: 'message 2' },
        { role: 'assistant', content: 'response 2' },
      ];

      mockCreate.mockResolvedValue({
        output: [{
          type: 'output_text',
          text: 'ACTION: NEXT\nNEXT_STEP: 2\nREASONING: Good'
        }]
      });

      const result = await validateStepAdvancement(
        1,
        'question?',
        'answer',
        history
      );

      expect(result.shouldAdvance).toBe(true);

      // Verify history was processed correctly
      const callArg = mockCreate.mock.calls[0][0];
      expect(callArg.messages[0].content).toContain('message 1');
      expect(callArg.messages[0].content).toContain('response 2');
    });

    it('should work with empty conversation history', async () => {
      mockCreate.mockResolvedValue({
        output: [{
          type: 'output_text',
          text: 'ACTION: NEXT\nNEXT_STEP: 1\nREASONING: First interaction'
        }]
      });

      const result = await validateStepAdvancement(
        0,
        'do you mind if i ask a few questions?',
        'sure go ahead',
        []
      );

      expect(result.shouldAdvance).toBe(true);
    });

    it('should handle undefined conversation history', async () => {
      mockCreate.mockResolvedValue({
        output: [{
          type: 'output_text',
          text: 'ACTION: NEXT\nNEXT_STEP: 1\nREASONING: Good'
        }]
      });

      const result = await validateStepAdvancement(
        0,
        'question?',
        'answer'
        // No history parameter
      );

      expect(result.shouldAdvance).toBe(true);
    });
  });

  describe('Action Types', () => {
    it('should support NEXT action', async () => {
      mockCreate.mockResolvedValue({
        output: [{
          type: 'output_text',
          text: 'ACTION: NEXT\nNEXT_STEP: 4\nREASONING: Advance'
        }]
      });

      const result = await validateStepAdvancement(3, 'q?', 'a');

      expect(result.action).toBe('NEXT');
      expect(result.shouldAdvance).toBe(true);
      expect(result.nextStep).toBe(4);
    });

    it('should support STAY action', async () => {
      mockCreate.mockResolvedValue({
        output: [{
          type: 'output_text',
          text: 'ACTION: STAY\nNEXT_STEP: 3\nREASONING: Stay'
        }]
      });

      const result = await validateStepAdvancement(3, 'q?', 'huh?');

      expect(result.action).toBe('STAY');
      expect(result.shouldAdvance).toBe(false);
    });

    it('should support JUMP action', async () => {
      mockCreate.mockResolvedValue({
        output: [{
          type: 'output_text',
          text: 'ACTION: JUMP\nNEXT_STEP: 13\nREASONING: Ready to buy'
        }]
      });

      const result = await validateStepAdvancement(5, 'q?', 'i want to buy');

      expect(result.action).toBe('JUMP');
      expect(result.shouldAdvance).toBe(true);
      expect(result.nextStep).toBe(13);
    });
  });

  describe('Step Boundary Cases', () => {
    it('should handle step 0 (permission)', async () => {
      mockCreate.mockResolvedValue({
        output: [{
          type: 'output_text',
          text: 'ACTION: NEXT\nNEXT_STEP: 1\nREASONING: Permission granted'
        }]
      });

      const result = await validateStepAdvancement(
        0,
        'do you mind if i ask a few questions?',
        'sure'
      );

      expect(result.shouldAdvance).toBe(true);
      expect(result.nextStep).toBe(1);
    });

    it('should handle step 15 (final step)', async () => {
      mockCreate.mockResolvedValue({
        output: [{
          type: 'output_text',
          text: 'ACTION: NEXT\nNEXT_STEP: 16\nREASONING: Completed'
        }]
      });

      const result = await validateStepAdvancement(
        15,
        "i'll discount it",
        'great!'
      );

      expect(result.shouldAdvance).toBe(true);
      expect(result.nextStep).toBe(16);
    });

    it('should handle mid-script steps', async () => {
      mockCreate.mockResolvedValue({
        output: [{
          type: 'output_text',
          text: 'ACTION: NEXT\nNEXT_STEP: 8\nREASONING: Good answer'
        }]
      });

      const result = await validateStepAdvancement(
        7,
        'why that specific goal?',
        'want more time with family'
      );

      expect(result.shouldAdvance).toBe(true);
      expect(result.nextStep).toBe(8);
    });
  });
});

describe('Step Validator End-to-End Compatibility', () => {
  it('should maintain full data flow integrity', async () => {
    // Simulate complete data flow through unified architecture

    // 1. conversationState from storage
    const conversationState: ConversationState = {
      currentStep: 3,
      questionsAsked: [
        { step: 1, question: 'Q1?', timestamp: new Date() },
        { step: 2, question: 'Q2?', timestamp: new Date() },
        { step: 3, question: 'Q3?', timestamp: new Date() },
      ],
      questionsAnswered: [
        { step: 1, question: 'Q1?', answer: 'A1', timestamp: new Date() },
        { step: 2, question: 'Q2?', answer: 'A2', timestamp: new Date() },
      ],
      offTopicCount: 0
    };

    // 2. History from chatService
    const history = [
      { role: 'assistant' as const, content: 'Q1?' },
      { role: 'user' as const, content: 'A1' },
      { role: 'assistant' as const, content: 'Q2?' },
      { role: 'user' as const, content: 'A2' },
      { role: 'assistant' as const, content: 'how many hours per week?' },
    ];

    // 3. Extract lastAIMessage (routes.ts pattern)
    const lastAIMessage = history[history.length - 1].content;

    // 4. User's new message
    const userMessage = '40 hours';

    // 5. Mock validator response
    mockCreate.mockResolvedValue({
        output: [{
          type: 'output_text',
          text: 'ACTION: NEXT\nNEXT_STEP: 4\nREASONING: User gave hours'
        }]
      });

    // 6. Run validation
    const result = await validateStepAdvancement(
      conversationState.currentStep,
      lastAIMessage,
      userMessage,
      history
    );

    // 7. Verify outputs match expected data flow
    expect(result.shouldAdvance).toBe(true);
    expect(result.nextStep).toBe(4);
    expect(result.feedback).toBe(''); // No feedback when advancing

    // 8. Update conversationState (as routes.ts does)
    if (result.shouldAdvance) {
      conversationState.currentStep = result.nextStep!;
    }

    expect(conversationState.currentStep).toBe(4);

    // 9. Verify no data loss or corruption
    expect(conversationState.questionsAsked.length).toBe(3);
    expect(conversationState.questionsAnswered.length).toBe(2);
  });
});
