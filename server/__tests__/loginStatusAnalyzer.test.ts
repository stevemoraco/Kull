import { describe, it, expect } from 'vitest';
import { analyzeLoginStatus, formatLoginStatusInsights } from '../loginStatusAnalyzer';
import type { ConversationState } from '../storage';

describe('loginStatusAnalyzer', () => {
  const createMockConversationState = (
    currentStep: number,
    answersCount: number
  ): ConversationState => {
    const questionsAnswered = Array.from({ length: answersCount }, (_, i) => ({
      step: i,
      question: `Question ${i}?`,
      answer: `Answer ${i}`,
      timestamp: new Date()
    }));

    return {
      questionsAsked: questionsAnswered.map(qa => ({
        step: qa.step,
        question: qa.question,
        timestamp: qa.timestamp
      })),
      questionsAnswered,
      currentStep,
      offTopicCount: 0
    };
  };

  describe('analyzeLoginStatus', () => {
    it('should not prompt sign-in when user is logged in', () => {
      const conversationState = createMockConversationState(10, 5);
      const sessionStartTime = Date.now() - 300000; // 5 minutes ago

      const insights = analyzeLoginStatus(
        true, // isLoggedIn
        conversationState,
        80,
        sessionStartTime,
        10
      );

      expect(insights.isLoggedIn).toBe(true);
      expect(insights.shouldPromptSignIn).toBe(false);
    });

    it('should prompt sign-in when past step 6', () => {
      const conversationState = createMockConversationState(7, 4);
      const sessionStartTime = Date.now() - 120000; // 2 minutes ago

      const insights = analyzeLoginStatus(
        false, // isLoggedIn
        conversationState,
        50,
        sessionStartTime,
        7
      );

      expect(insights.isLoggedIn).toBe(false);
      expect(insights.shouldPromptSignIn).toBe(true);
      expect(insights.promptingStrategy).toBe('goal_preservation');
    });

    it('should prompt sign-in with high engagement score (80+)', () => {
      const conversationState = createMockConversationState(3, 2);
      const sessionStartTime = Date.now() - 60000; // 1 minute ago

      const insights = analyzeLoginStatus(
        false,
        conversationState,
        85,
        sessionStartTime,
        3
      );

      expect(insights.shouldPromptSignIn).toBe(true);
    });

    it('should prompt sign-in when approaching price reveal (step 13+)', () => {
      const conversationState = createMockConversationState(13, 10);
      const sessionStartTime = Date.now() - 180000; // 3 minutes ago

      const insights = analyzeLoginStatus(
        false,
        conversationState,
        60,
        sessionStartTime,
        13
      );

      expect(insights.shouldPromptSignIn).toBe(true);
      expect(insights.promptingStrategy).toBe('urgent_price_quote');
    });

    it('should prompt sign-in after 4+ minutes invested', () => {
      const conversationState = createMockConversationState(5, 3);
      const sessionStartTime = Date.now() - 250000; // 4+ minutes ago

      const insights = analyzeLoginStatus(
        false,
        conversationState,
        50,
        sessionStartTime,
        5
      );

      expect(insights.shouldPromptSignIn).toBe(true);
    });

    it('should not prompt sign-in when early in conversation', () => {
      const conversationState = createMockConversationState(2, 1);
      const sessionStartTime = Date.now() - 60000; // 1 minute ago

      const insights = analyzeLoginStatus(
        false,
        conversationState,
        40,
        sessionStartTime,
        2
      );

      expect(insights.shouldPromptSignIn).toBe(false);
    });

    it('should calculate conversation value correctly', () => {
      const conversationState = createMockConversationState(8, 5);
      const sessionStartTime = Date.now() - 180000; // 3 minutes ago

      const insights = analyzeLoginStatus(
        false,
        conversationState,
        70,
        sessionStartTime,
        8
      );

      expect(insights.conversationValue.scriptProgress).toBe(8);
      expect(insights.conversationValue.informationShared.length).toBe(5);
      expect(insights.conversationValue.engagementScore).toBe(70);
      expect(insights.conversationValue.timeInvested).toBeGreaterThanOrEqual(180000);
    });

    it('should use urgent_price_quote strategy at step 13+', () => {
      const conversationState = createMockConversationState(14, 10);
      const sessionStartTime = Date.now() - 300000;

      const insights = analyzeLoginStatus(
        false,
        conversationState,
        75,
        sessionStartTime,
        14
      );

      expect(insights.promptingStrategy).toBe('urgent_price_quote');
      expect(insights.suggestedPrompts.some(p => p.includes('pricing'))).toBe(true);
    });

    it('should use goal_preservation strategy at step 8-12', () => {
      const conversationState = createMockConversationState(10, 7);
      const sessionStartTime = Date.now() - 200000;

      const insights = analyzeLoginStatus(
        false,
        conversationState,
        65,
        sessionStartTime,
        10
      );

      expect(insights.promptingStrategy).toBe('goal_preservation');
    });

    it('should use time_investment strategy after 5+ minutes', () => {
      const conversationState = createMockConversationState(5, 3);
      const sessionStartTime = Date.now() - 320000; // 5+ minutes

      const insights = analyzeLoginStatus(
        false,
        conversationState,
        60,
        sessionStartTime,
        5
      );

      expect(insights.promptingStrategy).toBe('time_investment');
      expect(insights.suggestedPrompts.some(p => p.includes('minutes'))).toBe(true);
    });

    it('should use gentle_suggestion strategy early on', () => {
      const conversationState = createMockConversationState(4, 2);
      const sessionStartTime = Date.now() - 120000; // 2 minutes

      const insights = analyzeLoginStatus(
        false,
        conversationState,
        50,
        sessionStartTime,
        4
      );

      expect(insights.promptingStrategy).toBe('gentle_suggestion');
    });

    it('should assess risk as high for deep conversations', () => {
      const conversationState = createMockConversationState(12, 9);
      const sessionStartTime = Date.now() - 400000; // 6+ minutes

      const insights = analyzeLoginStatus(
        false,
        conversationState,
        85,
        sessionStartTime,
        12
      );

      expect(insights.risk).toBe('high');
    });

    it('should assess risk as medium for mid-conversation', () => {
      const conversationState = createMockConversationState(7, 4);
      const sessionStartTime = Date.now() - 200000; // 3+ minutes

      const insights = analyzeLoginStatus(
        false,
        conversationState,
        65,
        sessionStartTime,
        7
      );

      expect(insights.risk).toBe('medium');
    });

    it('should assess risk as low for early conversation', () => {
      const conversationState = createMockConversationState(2, 1);
      const sessionStartTime = Date.now() - 60000; // 1 minute

      const insights = analyzeLoginStatus(
        false,
        conversationState,
        40,
        sessionStartTime,
        2
      );

      expect(insights.risk).toBe('low');
    });

    it('should include information shared in conversation value', () => {
      const conversationState: ConversationState = {
        questionsAsked: [
          { step: 1, question: 'What is your goal?', timestamp: new Date() },
          { step: 2, question: 'How many hours?', timestamp: new Date() }
        ],
        questionsAnswered: [
          { step: 1, question: 'What is your goal?', answer: '100 shoots', timestamp: new Date() },
          { step: 2, question: 'How many hours?', answer: '40 hours', timestamp: new Date() }
        ],
        currentStep: 3,
        offTopicCount: 0
      };

      const sessionStartTime = Date.now() - 120000;

      const insights = analyzeLoginStatus(
        false,
        conversationState,
        60,
        sessionStartTime,
        3
      );

      expect(insights.conversationValue.informationShared).toContain('What is your goal?: 100 shoots');
      expect(insights.conversationValue.informationShared).toContain('How many hours?: 40 hours');
    });
  });

  describe('formatLoginStatusInsights', () => {
    it('should format logged-in status correctly', () => {
      const conversationState = createMockConversationState(5, 3);
      const sessionStartTime = Date.now() - 120000;

      const insights = analyzeLoginStatus(
        true,
        conversationState,
        60,
        sessionStartTime,
        5
      );

      const formatted = formatLoginStatusInsights(insights);

      expect(formatted).toContain('🟢 Logged In');
      expect(formatted).toContain('Auto-Saving');
      expect(formatted).toContain('No action needed');
    });

    it('should format logged-out status with prompting recommendation', () => {
      const conversationState = createMockConversationState(8, 5);
      const sessionStartTime = Date.now() - 180000;

      const insights = analyzeLoginStatus(
        false,
        conversationState,
        70,
        sessionStartTime,
        8
      );

      const formatted = formatLoginStatusInsights(insights);

      expect(formatted).toContain('🔴 Not Logged In');
      expect(formatted).toContain('Script Progress: 8 of 15 questions answered');
      expect(formatted).toContain('Information Shared: 5 pieces');
      expect(formatted).toContain('Engagement Score: 70/100');
      expect(formatted).toContain('Time Invested: 3m');
      expect(formatted).toContain('PROMPT SIGN-IN NOW');
      expect(formatted).toContain('goal_preservation');
      expect(formatted).toContain('Suggested prompts');
    });

    it('should format logged-out status without prompting when early', () => {
      const conversationState = createMockConversationState(2, 1);
      const sessionStartTime = Date.now() - 60000;

      const insights = analyzeLoginStatus(
        false,
        conversationState,
        40,
        sessionStartTime,
        2
      );

      const formatted = formatLoginStatusInsights(insights);

      expect(formatted).toContain('🔴 Not Logged In');
      expect(formatted).toContain('WAIT TO PROMPT');
      expect(formatted).toContain('focus on building value first');
    });

    it('should include risk level in formatting', () => {
      const conversationState = createMockConversationState(12, 9);
      const sessionStartTime = Date.now() - 400000;

      const insights = analyzeLoginStatus(
        false,
        conversationState,
        85,
        sessionStartTime,
        12
      );

      const formatted = formatLoginStatusInsights(insights);

      expect(formatted).toContain('HIGH');
      expect(formatted).toContain('Risk Level');
    });

    it('should format time correctly (minutes and seconds)', () => {
      const conversationState = createMockConversationState(5, 3);
      const sessionStartTime = Date.now() - 185000; // 3m 5s

      const insights = analyzeLoginStatus(
        false,
        conversationState,
        60,
        sessionStartTime,
        5
      );

      const formatted = formatLoginStatusInsights(insights);

      expect(formatted).toContain('3m 5s');
    });

    it('should include suggested prompts in formatting', () => {
      const conversationState = createMockConversationState(13, 10);
      const sessionStartTime = Date.now() - 300000;

      const insights = analyzeLoginStatus(
        false,
        conversationState,
        80,
        sessionStartTime,
        13
      );

      const formatted = formatLoginStatusInsights(insights);

      expect(formatted).toContain('Suggested prompts');
      expect(formatted).toContain('1. "');
      expect(formatted).toContain('[sign in');
    });
  });

  describe('edge cases', () => {
    it('should handle empty conversation state', () => {
      const conversationState: ConversationState = {
        questionsAsked: [],
        questionsAnswered: [],
        currentStep: 0,
        offTopicCount: 0
      };

      const sessionStartTime = Date.now();

      const insights = analyzeLoginStatus(
        false,
        conversationState,
        0,
        sessionStartTime,
        0
      );

      expect(insights.conversationValue.informationShared.length).toBe(0);
      expect(insights.risk).toBe('low');
      expect(insights.shouldPromptSignIn).toBe(false);
    });

    it('should handle very long session (10+ minutes)', () => {
      const conversationState = createMockConversationState(10, 8);
      const sessionStartTime = Date.now() - 600000; // 10 minutes

      const insights = analyzeLoginStatus(
        false,
        conversationState,
        75,
        sessionStartTime,
        10
      );

      expect(insights.risk).toBe('high');
      expect(insights.shouldPromptSignIn).toBe(true);
    });

    it('should handle maximum engagement score', () => {
      const conversationState = createMockConversationState(5, 3);
      const sessionStartTime = Date.now() - 120000;

      const insights = analyzeLoginStatus(
        false,
        conversationState,
        100,
        sessionStartTime,
        5
      );

      expect(insights.shouldPromptSignIn).toBe(true);
      expect(insights.conversationValue.engagementScore).toBe(100);
    });

    it('should handle step 15 (final step)', () => {
      const conversationState = createMockConversationState(15, 12);
      const sessionStartTime = Date.now() - 500000;

      const insights = analyzeLoginStatus(
        false,
        conversationState,
        90,
        sessionStartTime,
        15
      );

      expect(insights.promptingStrategy).toBe('urgent_price_quote');
      expect(insights.risk).toBe('high');
      expect(insights.shouldPromptSignIn).toBe(true);
    });
  });
});
