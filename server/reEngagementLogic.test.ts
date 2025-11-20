import { describe, it, expect } from 'vitest';
import {
  determineReEngagementStrategy,
  formatReEngagementContext,
  shouldConsiderReEngagement,
  getRecentActivitySince,
  hasUserMeaningfullyEngaged,
  countConsecutiveAiMessages,
  type ReEngagementContext,
  type UserActivityEvent
} from './reEngagementLogic';

describe('Re-engagement Logic', () => {
  describe('determineReEngagementStrategy', () => {
    it('should give space after 3+ attempts with no user response', () => {
      const context: ReEngagementContext = {
        lastAiMessage: 'do you mind if i ask you a few questions?',
        timeSinceLastMessage: 90000, // 1.5 minutes
        currentStep: 0,
        userHasResponded: false,
        recentActivity: [],
        messageCount: 3,
        conversationMessageCount: 3
      };

      const strategy = determineReEngagementStrategy(context);

      expect(strategy.approach).toBe('give_space');
      expect(strategy.suggestedMessage).toBe('');
      expect(strategy.reasoning).toContain('not engaging after 3 attempts');
    });

    it('should use activity-based nudge when user is active but silent', () => {
      const context: ReEngagementContext = {
        lastAiMessage: 'is that number accurate?',
        timeSinceLastMessage: 45000, // 45 seconds
        currentStep: 1,
        userHasResponded: true,
        recentActivity: [
          {
            type: 'click',
            target: 'button.pricing-cta',
            timestamp: Date.now()
          }
        ],
        messageCount: 1,
        conversationMessageCount: 5
      };

      const strategy = determineReEngagementStrategy(context);

      expect(strategy.approach).toBe('activity_based_nudge');
      expect(strategy.suggestedMessage).toContain('pricing');
    });

    it('should reword question at important steps after 1-2 minutes', () => {
      const context: ReEngagementContext = {
        lastAiMessage: 'do you mind if i ask you a few questions?',
        timeSinceLastMessage: 90000, // 1.5 minutes
        currentStep: 0, // Important step
        userHasResponded: true,
        recentActivity: [],
        messageCount: 1,
        conversationMessageCount: 5
      };

      const strategy = determineReEngagementStrategy(context);

      expect(strategy.approach).toBe('same_question_different_wording');
      expect(strategy.suggestedMessage).not.toBe(context.lastAiMessage);
      expect(strategy.suggestedMessage.length).toBeGreaterThan(0);
    });

    it('should use casual check-in after 2+ minutes', () => {
      const context: ReEngagementContext = {
        lastAiMessage: 'how many hours are you working each week?',
        timeSinceLastMessage: 150000, // 2.5 minutes
        currentStep: 3,
        userHasResponded: true,
        recentActivity: [],
        messageCount: 1,
        conversationMessageCount: 8
      };

      const strategy = determineReEngagementStrategy(context);

      expect(strategy.approach).toBe('low_pressure_check_in');
      // Should be a low-pressure casual message (may vary by step)
      expect(strategy.suggestedMessage.length).toBeGreaterThan(0);
      expect(strategy.suggestedMessage.toLowerCase()).toMatch(/still|time|rush|ready/);
    });

    it('should give space if not enough time has passed', () => {
      const context: ReEngagementContext = {
        lastAiMessage: 'is that accurate?',
        timeSinceLastMessage: 20000, // 20 seconds
        currentStep: 1,
        userHasResponded: true,
        recentActivity: [],
        messageCount: 1,
        conversationMessageCount: 3
      };

      const strategy = determineReEngagementStrategy(context);

      expect(strategy.approach).toBe('give_space');
      expect(strategy.reasoning).toContain('Too soon');
    });
  });

  describe('Activity-based nudges', () => {
    it('should reference clicks in nudge messages', () => {
      const context: ReEngagementContext = {
        lastAiMessage: 'test',
        timeSinceLastMessage: 45000,
        currentStep: 1,
        userHasResponded: true,
        recentActivity: [
          {
            type: 'click',
            target: 'button.start-trial',
            timestamp: Date.now()
          }
        ],
        messageCount: 1,
        conversationMessageCount: 3
      };

      const strategy = determineReEngagementStrategy(context);

      expect(strategy.suggestedMessage).toContain('click');
      expect(strategy.suggestedMessage).toContain('start trial');
    });

    it('should reference hovers in nudge messages', () => {
      const context: ReEngagementContext = {
        lastAiMessage: 'test',
        timeSinceLastMessage: 45000,
        currentStep: 1,
        userHasResponded: true,
        recentActivity: [
          {
            type: 'hover',
            target: 'div.feature-card',
            timestamp: Date.now()
          }
        ],
        messageCount: 1,
        conversationMessageCount: 3
      };

      const strategy = determineReEngagementStrategy(context);

      expect(strategy.suggestedMessage).toContain('hover');
      expect(strategy.suggestedMessage).toContain('feature');
    });

    it('should reference scrolling to pricing section', () => {
      const context: ReEngagementContext = {
        lastAiMessage: 'test',
        timeSinceLastMessage: 45000,
        currentStep: 1,
        userHasResponded: true,
        recentActivity: [
          {
            type: 'scroll',
            target: 'section.pricing',
            timestamp: Date.now()
          }
        ],
        messageCount: 1,
        conversationMessageCount: 3
      };

      const strategy = determineReEngagementStrategy(context);

      expect(strategy.suggestedMessage).toContain('pricing');
    });

    it('should reference calculator adjustments', () => {
      const context: ReEngagementContext = {
        lastAiMessage: 'test',
        timeSinceLastMessage: 45000,
        currentStep: 1,
        userHasResponded: true,
        recentActivity: [
          {
            type: 'input',
            target: 'slider.shoots-per-week',
            value: '4',
            timestamp: Date.now()
          }
        ],
        messageCount: 1,
        conversationMessageCount: 3
      };

      const strategy = determineReEngagementStrategy(context);

      expect(strategy.suggestedMessage).toContain('shoots per week');
    });
  });

  describe('Question rewording', () => {
    it('should provide different wording for step 0 permission', () => {
      const context: ReEngagementContext = {
        lastAiMessage: 'do you mind if i ask you a few questions?',
        timeSinceLastMessage: 90000,
        currentStep: 0,
        userHasResponded: true,
        recentActivity: [],
        messageCount: 1,
        conversationMessageCount: 3
      };

      const strategy = determineReEngagementStrategy(context);

      expect(strategy.approach).toBe('same_question_different_wording');
      expect(strategy.suggestedMessage).not.toBe(context.lastAiMessage);
      // Should still be asking for permission
      expect(strategy.suggestedMessage.toLowerCase()).toMatch(/question|chat|ask/);
    });

    it('should provide different wording for step 1 accuracy check', () => {
      const context: ReEngagementContext = {
        lastAiMessage: 'is that number accurate?',
        timeSinceLastMessage: 90000,
        currentStep: 1,
        userHasResponded: true,
        recentActivity: [],
        messageCount: 1,
        conversationMessageCount: 5
      };

      const strategy = determineReEngagementStrategy(context);

      expect(strategy.approach).toBe('same_question_different_wording');
      expect(strategy.suggestedMessage).not.toBe(context.lastAiMessage);
      // Should still be checking accuracy/correctness
      expect(strategy.suggestedMessage.toLowerCase()).toMatch(/match|right|correct|accurate|sound/);
    });

    it('should not repeat the exact same question', () => {
      const originalQuestion = 'do you mind if i ask you a few questions?';
      const context: ReEngagementContext = {
        lastAiMessage: originalQuestion,
        timeSinceLastMessage: 90000,
        currentStep: 0,
        userHasResponded: true,
        recentActivity: [],
        messageCount: 1,
        conversationMessageCount: 3
      };

      const strategy = determineReEngagementStrategy(context);

      // Normalize both strings for comparison
      const normalize = (s: string) => s.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();

      expect(normalize(strategy.suggestedMessage)).not.toBe(normalize(originalQuestion));
    });
  });

  describe('formatReEngagementContext', () => {
    it('should format give_space strategy correctly', () => {
      const strategy = {
        approach: 'give_space' as const,
        suggestedMessage: '',
        reasoning: 'Test reasoning'
      };

      const formatted = formatReEngagementContext(strategy);

      expect(formatted).toContain('DON\'T SEND MESSAGE');
      expect(formatted).toContain('Wait for them to initiate');
    });

    it('should format activity_based_nudge strategy with instructions', () => {
      const strategy = {
        approach: 'activity_based_nudge' as const,
        suggestedMessage: 'saw you click pricing - questions?',
        reasoning: 'User active but not responding'
      };

      const formatted = formatReEngagementContext(strategy);

      expect(formatted).toContain('RE-ENGAGEMENT STRATEGY');
      expect(formatted).toContain('activity_based_nudge');
      expect(formatted).toContain('saw you click pricing');
      expect(formatted).toContain('Don\'t repeat your last message');
    });

    it('should include important instructions for AI', () => {
      const strategy = {
        approach: 'same_question_different_wording' as const,
        suggestedMessage: 'quick question - ok if we chat?',
        reasoning: 'Important step'
      };

      const formatted = formatReEngagementContext(strategy);

      expect(formatted).toContain('Reference their recent activity');
      expect(formatted).toContain('low-pressure');
      expect(formatted).toContain('back off completely');
    });
  });

  describe('shouldConsiderReEngagement', () => {
    it('should require 30s minimum wait time', () => {
      expect(shouldConsiderReEngagement(20000, 1)).toBe(false);
      expect(shouldConsiderReEngagement(30000, 1)).toBe(true);
      expect(shouldConsiderReEngagement(45000, 1)).toBe(true);
    });

    it('should require 2min wait after 3+ attempts', () => {
      expect(shouldConsiderReEngagement(60000, 3)).toBe(false); // 1 min
      expect(shouldConsiderReEngagement(120000, 3)).toBe(true); // 2 min
      expect(shouldConsiderReEngagement(150000, 4)).toBe(true); // 2.5 min
    });
  });

  describe('getRecentActivitySince', () => {
    it('should filter activity after timestamp', () => {
      const now = Date.now();
      const activities: UserActivityEvent[] = [
        { type: 'click', target: 'old', timestamp: now - 100000 },
        { type: 'scroll', target: 'recent1', timestamp: now - 30000 },
        { type: 'hover', target: 'recent2', timestamp: now - 10000 }
      ];

      const recent = getRecentActivitySince(activities, now - 60000);

      expect(recent).toHaveLength(2);
      expect(recent[0].target).toBe('recent1');
      expect(recent[1].target).toBe('recent2');
    });

    it('should return empty array if no recent activity', () => {
      const now = Date.now();
      const activities: UserActivityEvent[] = [
        { type: 'click', target: 'old', timestamp: now - 100000 }
      ];

      const recent = getRecentActivitySince(activities, now - 50000);

      expect(recent).toHaveLength(0);
    });
  });

  describe('hasUserMeaningfullyEngaged', () => {
    it('should return true for substantive messages (>5 words)', () => {
      const conversation = [
        { role: 'assistant', content: 'hello' },
        { role: 'user', content: 'yes i would like to talk about my workflow issues' }
      ];

      expect(hasUserMeaningfullyEngaged(conversation)).toBe(true);
    });

    it('should return false for one-word answers', () => {
      const conversation = [
        { role: 'assistant', content: 'hello' },
        { role: 'user', content: 'yes' }
      ];

      expect(hasUserMeaningfullyEngaged(conversation)).toBe(false);
    });

    it('should return false for empty conversation', () => {
      expect(hasUserMeaningfullyEngaged([])).toBe(false);
    });

    it('should return false if only assistant messages', () => {
      const conversation = [
        { role: 'assistant', content: 'hello' },
        { role: 'assistant', content: 'are you there?' }
      ];

      expect(hasUserMeaningfullyEngaged(conversation)).toBe(false);
    });
  });

  describe('countConsecutiveAiMessages', () => {
    it('should count consecutive assistant messages at end', () => {
      const conversation = [
        { role: 'user', content: 'hi' },
        { role: 'assistant', content: 'hello' },
        { role: 'assistant', content: 'are you there?' },
        { role: 'assistant', content: 'still there?' }
      ];

      expect(countConsecutiveAiMessages(conversation)).toBe(3);
    });

    it('should return 0 if last message is from user', () => {
      const conversation = [
        { role: 'assistant', content: 'hello' },
        { role: 'user', content: 'hi' }
      ];

      expect(countConsecutiveAiMessages(conversation)).toBe(0);
    });

    it('should stop counting when hitting user message', () => {
      const conversation = [
        { role: 'assistant', content: 'old message' },
        { role: 'user', content: 'response' },
        { role: 'assistant', content: 'hello' },
        { role: 'assistant', content: 'are you there?' }
      ];

      expect(countConsecutiveAiMessages(conversation)).toBe(2);
    });

    it('should return 0 for empty conversation', () => {
      expect(countConsecutiveAiMessages([])).toBe(0);
    });
  });

  describe('Edge cases', () => {
    it('should handle missing activity gracefully', () => {
      const context: ReEngagementContext = {
        lastAiMessage: 'test',
        timeSinceLastMessage: 45000,
        currentStep: 1,
        userHasResponded: true,
        recentActivity: [],
        messageCount: 1,
        conversationMessageCount: 3
      };

      const strategy = determineReEngagementStrategy(context);

      // Should not crash, should give space
      expect(strategy.approach).toBe('give_space');
    });

    it('should handle very long time gaps (>10 minutes)', () => {
      const context: ReEngagementContext = {
        lastAiMessage: 'test',
        timeSinceLastMessage: 600000, // 10 minutes
        currentStep: 5,
        userHasResponded: true,
        recentActivity: [],
        messageCount: 1,
        conversationMessageCount: 10
      };

      const strategy = determineReEngagementStrategy(context);

      expect(strategy.approach).toBe('low_pressure_check_in');
    });

    it('should handle step numbers outside 0-15 range', () => {
      const context: ReEngagementContext = {
        lastAiMessage: 'test',
        timeSinceLastMessage: 90000,
        currentStep: 99, // Invalid step
        userHasResponded: true,
        recentActivity: [],
        messageCount: 1,
        conversationMessageCount: 3
      };

      // Should not crash
      const strategy = determineReEngagementStrategy(context);
      expect(strategy).toBeDefined();
    });
  });

  describe('Integration scenarios', () => {
    it('should handle first-time visitor who never responded', () => {
      const context: ReEngagementContext = {
        lastAiMessage: 'do you mind if i ask you a few questions?',
        timeSinceLastMessage: 45000, // Less time to prioritize activity
        currentStep: 0,
        userHasResponded: false,
        recentActivity: [
          { type: 'scroll', target: 'section.features', timestamp: Date.now() - 10000 }
        ],
        messageCount: 1,
        conversationMessageCount: 1
      };

      const strategy = determineReEngagementStrategy(context);

      // Should try activity-based nudge since they're scrolling and time < 60s
      expect(strategy.approach).toBe('activity_based_nudge');
      expect(strategy.suggestedMessage.toLowerCase()).toMatch(/scroll|features|browsing/);
    });

    it('should back off after multiple attempts on same user', () => {
      const context: ReEngagementContext = {
        lastAiMessage: 'still there?',
        timeSinceLastMessage: 300000, // 5 minutes
        currentStep: 0,
        userHasResponded: false,
        recentActivity: [],
        messageCount: 3,
        conversationMessageCount: 3
      };

      const strategy = determineReEngagementStrategy(context);

      // Should give up after 3 attempts
      expect(strategy.approach).toBe('give_space');
      expect(strategy.suggestedMessage).toBe('');
    });

    it('should re-engage returning user at critical pricing step', () => {
      const context: ReEngagementContext = {
        lastAiMessage: 'want the price?',
        timeSinceLastMessage: 90000,
        currentStep: 13, // Critical pricing step
        userHasResponded: true,
        recentActivity: [],
        messageCount: 1,
        conversationMessageCount: 20
      };

      const strategy = determineReEngagementStrategy(context);

      // Should reword the question since it's an important step
      expect(strategy.approach).toBe('same_question_different_wording');
      expect(strategy.suggestedMessage.toLowerCase()).toMatch(/price|pricing|cost/);
    });
  });
});
