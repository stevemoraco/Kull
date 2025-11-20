/**
 * RE-ENGAGEMENT LOGIC INTEGRATION EXAMPLE
 *
 * This file shows how to integrate the re-engagement logic into your chat system.
 */

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

/**
 * Example 1: Basic re-engagement check in chat endpoint
 */
async function handleChatMessage(
  userId: string,
  userMessage: string,
  conversationHistory: Array<{ role: string; content: string; timestamp: number }>,
  userActivity: UserActivityEvent[]
) {
  // Get last AI message
  const lastAiMessage = conversationHistory
    .filter(msg => msg.role === 'assistant')
    .pop();

  if (!lastAiMessage) {
    // First message - no re-engagement needed
    return generateNormalResponse(userId, userMessage, conversationHistory);
  }

  // Calculate time since last AI message
  const now = Date.now();
  const timeSinceLastMessage = now - lastAiMessage.timestamp;

  // Count consecutive AI messages (indicates user not responding)
  const consecutiveAiMessages = countConsecutiveAiMessages(conversationHistory);

  // Check if we should even consider re-engagement
  if (!shouldConsiderReEngagement(timeSinceLastMessage, consecutiveAiMessages)) {
    // Too soon - just respond normally
    return generateNormalResponse(userId, userMessage, conversationHistory);
  }

  // Get recent activity since last message
  const recentActivity = getRecentActivitySince(userActivity, lastAiMessage.timestamp);

  // Build re-engagement context
  const reEngagementContext: ReEngagementContext = {
    lastAiMessage: lastAiMessage.content,
    timeSinceLastMessage,
    currentStep: getCurrentStep(conversationHistory), // Your function to get current script step
    userHasResponded: hasUserMeaningfullyEngaged(conversationHistory),
    recentActivity,
    messageCount: consecutiveAiMessages,
    conversationMessageCount: conversationHistory.length
  };

  // Determine strategy
  const strategy = determineReEngagementStrategy(reEngagementContext);

  if (strategy.approach === 'give_space') {
    // Don't send a message - wait for user to initiate
    console.log('[Re-engagement] Backing off - user needs space');
    return null; // Or return a silent response
  }

  // Format as context for AI
  const reEngagementPrompt = formatReEngagementContext(strategy);

  // Pass to AI with re-engagement instructions
  return generateResponseWithReEngagement(
    userId,
    userMessage,
    conversationHistory,
    reEngagementPrompt
  );
}

/**
 * Example 2: Proactive re-engagement via WebSocket (when user is idle)
 *
 * Use this in a background job that checks for idle conversations
 */
async function checkIdleConversations() {
  const idleConversations = await getIdleConversations(); // Your DB query

  for (const conv of idleConversations) {
    const { userId, conversationHistory, userActivity, lastMessageTimestamp } = conv;

    const timeSinceLastMessage = Date.now() - lastMessageTimestamp;
    const consecutiveAiMessages = countConsecutiveAiMessages(conversationHistory);

    // Only check conversations where AI sent the last message
    if (conversationHistory[conversationHistory.length - 1]?.role !== 'assistant') {
      continue;
    }

    // Check if enough time has passed
    if (!shouldConsiderReEngagement(timeSinceLastMessage, consecutiveAiMessages)) {
      continue;
    }

    // Get recent activity
    const lastAiMessage = conversationHistory[conversationHistory.length - 1];
    const recentActivity = getRecentActivitySince(userActivity, lastMessageTimestamp);

    const context: ReEngagementContext = {
      lastAiMessage: lastAiMessage.content,
      timeSinceLastMessage,
      currentStep: getCurrentStep(conversationHistory),
      userHasResponded: hasUserMeaningfullyEngaged(conversationHistory),
      recentActivity,
      messageCount: consecutiveAiMessages,
      conversationMessageCount: conversationHistory.length
    };

    const strategy = determineReEngagementStrategy(context);

    if (strategy.approach === 'give_space') {
      console.log(`[Re-engagement] User ${userId} needs space - skipping`);
      continue;
    }

    // Send re-engagement message via WebSocket
    console.log(`[Re-engagement] Sending ${strategy.approach} to user ${userId}`);
    await sendWebSocketMessage(userId, {
      type: 'RE_ENGAGEMENT',
      message: strategy.suggestedMessage,
      approach: strategy.approach
    });
  }
}

/**
 * Example 3: Add re-engagement context to AI prompt
 */
function buildAIPrompt(
  userMessage: string,
  conversationHistory: Array<{ role: string; content: string; timestamp: number }>,
  reEngagementContext?: string
): string {
  let prompt = `
You are Kull's sales assistant. Your job is to guide users through the sales script.

## CONVERSATION HISTORY:
${conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')}

## USER MESSAGE:
${userMessage}
  `.trim();

  // Add re-engagement instructions if provided
  if (reEngagementContext) {
    prompt += `\n\n${reEngagementContext}`;
  }

  return prompt;
}

/**
 * Example 4: Integration with conversationStateManager
 */
import { updateStateAfterInteraction } from './conversationStateManager';

async function handleChatWithStateManagement(
  userId: string,
  userMessage: string,
  conversationState: any, // Your ConversationState type
  conversationHistory: Array<{ role: string; content: string; timestamp: number }>,
  userActivity: UserActivityEvent[]
) {
  // Get last AI message
  const lastAiMessage = conversationHistory
    .filter(msg => msg.role === 'assistant')
    .pop();

  if (!lastAiMessage) {
    // First message
    const aiResponse = await generateNormalResponse(userId, userMessage, conversationHistory);
    const newState = updateStateAfterInteraction(conversationState, userMessage, aiResponse);
    return { response: aiResponse, state: newState };
  }

  const now = Date.now();
  const timeSinceLastMessage = now - lastAiMessage.timestamp;
  const consecutiveAiMessages = countConsecutiveAiMessages(conversationHistory);

  // Check if re-engagement is needed
  if (shouldConsiderReEngagement(timeSinceLastMessage, consecutiveAiMessages)) {
    const recentActivity = getRecentActivitySince(userActivity, lastAiMessage.timestamp);

    const context: ReEngagementContext = {
      lastAiMessage: lastAiMessage.content,
      timeSinceLastMessage,
      currentStep: conversationState.currentStep,
      userHasResponded: hasUserMeaningfullyEngaged(conversationHistory),
      recentActivity,
      messageCount: consecutiveAiMessages,
      conversationMessageCount: conversationHistory.length
    };

    const strategy = determineReEngagementStrategy(context);

    if (strategy.approach === 'give_space') {
      // Don't respond
      return { response: null, state: conversationState };
    }

    // Generate response with re-engagement context
    const reEngagementPrompt = formatReEngagementContext(strategy);
    const aiResponse = await generateResponseWithReEngagement(
      userId,
      userMessage,
      conversationHistory,
      reEngagementPrompt
    );

    const newState = updateStateAfterInteraction(conversationState, userMessage, aiResponse);
    return { response: aiResponse, state: newState };
  }

  // Normal response
  const aiResponse = await generateNormalResponse(userId, userMessage, conversationHistory);
  const newState = updateStateAfterInteraction(conversationState, userMessage, aiResponse);
  return { response: aiResponse, state: newState };
}

/**
 * Example 5: Real-time activity tracking
 *
 * Frontend sends activity events, backend stores them
 */
interface ActivityEvent {
  userId: string;
  type: 'click' | 'hover' | 'input' | 'select' | 'scroll';
  target: string;
  value?: string;
  timestamp: number;
}

// Store in Redis or database
async function trackUserActivity(event: ActivityEvent) {
  // Store last 100 events per user
  const key = `user_activity:${event.userId}`;
  await redis.lpush(key, JSON.stringify(event));
  await redis.ltrim(key, 0, 99); // Keep only last 100
  await redis.expire(key, 3600); // Expire after 1 hour
}

// Retrieve for re-engagement
async function getUserActivity(userId: string): Promise<UserActivityEvent[]> {
  const key = `user_activity:${userId}`;
  const events = await redis.lrange(key, 0, -1);
  return events.map(e => JSON.parse(e));
}

/**
 * Example 6: Scheduled re-engagement checker (cron job)
 *
 * Run every 30 seconds to check for idle conversations
 */
async function scheduleReEngagementChecker() {
  setInterval(async () => {
    try {
      await checkIdleConversations();
    } catch (error) {
      console.error('[Re-engagement Checker] Error:', error);
    }
  }, 30000); // Every 30 seconds
}

// Placeholder helper functions (you'll implement these)
function getCurrentStep(conversationHistory: any[]): number {
  // Your logic to extract current step from conversation
  return 0;
}

async function generateNormalResponse(userId: string, userMessage: string, history: any[]): Promise<string> {
  // Your normal AI response generation
  return 'Response';
}

async function generateResponseWithReEngagement(
  userId: string,
  userMessage: string,
  history: any[],
  reEngagementPrompt: string
): Promise<string> {
  // Your AI response generation with re-engagement context
  return 'Re-engagement response';
}

async function getIdleConversations(): Promise<any[]> {
  // Your DB query for idle conversations
  return [];
}

async function sendWebSocketMessage(userId: string, message: any): Promise<void> {
  // Your WebSocket send logic
}

// Redis client (mock)
const redis = {
  lpush: async (key: string, value: string) => {},
  ltrim: async (key: string, start: number, end: number) => {},
  expire: async (key: string, seconds: number) => {},
  lrange: async (key: string, start: number, end: number) => []
};

export {
  handleChatMessage,
  checkIdleConversations,
  buildAIPrompt,
  handleChatWithStateManagement,
  trackUserActivity,
  getUserActivity,
  scheduleReEngagementChecker
};
