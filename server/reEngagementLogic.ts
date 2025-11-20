/**
 * Re-engagement logic for handling cases where users don't respond
 *
 * This module provides intelligent re-engagement strategies that:
 * - Avoid repeating the same question word-for-word
 * - Reference user activity when relevant
 * - Know when to back off after multiple attempts
 * - Adjust approach based on conversation context
 */

export interface ReEngagementContext {
  lastAiMessage: string;
  timeSinceLastMessage: number; // milliseconds
  currentStep: number;
  userHasResponded: boolean; // Has user ever responded in this conversation?
  recentActivity: UserActivityEvent[]; // Activity since last message
  messageCount: number; // How many messages AI has sent without response
  conversationMessageCount: number; // Total messages in conversation
}

export interface UserActivityEvent {
  type: 'click' | 'hover' | 'input' | 'select' | 'scroll';
  target: string;
  value?: string;
  timestamp: number;
}

export interface ReEngagementStrategy {
  approach: 'same_question_different_wording' | 'activity_based_nudge' | 'low_pressure_check_in' | 'give_space';
  suggestedMessage: string;
  reasoning: string;
}

/**
 * Determines the best re-engagement strategy based on context
 */
export function determineReEngagementStrategy(
  context: ReEngagementContext
): ReEngagementStrategy {
  // If they've never responded and AI has sent 3+ messages
  if (!context.userHasResponded && context.messageCount >= 3) {
    return {
      approach: 'give_space',
      suggestedMessage: '',
      reasoning: 'User not engaging after 3 attempts - back off completely'
    };
  }

  // If recent activity (clicks, scrolls) but no text response
  if (context.recentActivity.length > 0 && context.timeSinceLastMessage < 60000) {
    return {
      approach: 'activity_based_nudge',
      suggestedMessage: generateActivityNudge(context.recentActivity),
      reasoning: 'User is active but not responding - reference their activity'
    };
  }

  // If moderate time (1-2 min) and at important step (Step 0, 1, 13+)
  const importantSteps = [0, 1, 13, 14, 15];
  if (
    context.timeSinceLastMessage > 60000 &&
    context.timeSinceLastMessage < 120000 &&
    importantSteps.includes(context.currentStep)
  ) {
    return {
      approach: 'same_question_different_wording',
      suggestedMessage: rewordQuestion(context.lastAiMessage, context.currentStep),
      reasoning: 'Important step - gentle re-ask with different wording'
    };
  }

  // If long time (2+ min) - casual check-in
  if (context.timeSinceLastMessage > 120000) {
    return {
      approach: 'low_pressure_check_in',
      suggestedMessage: generateCasualCheckIn(context.currentStep),
      reasoning: 'Long pause - casual check-in without pressure'
    };
  }

  // Default: wait longer
  return {
    approach: 'give_space',
    suggestedMessage: '',
    reasoning: 'Too soon to re-engage - give them more time'
  };
}

/**
 * Generate activity-based nudges based on recent user actions
 */
function generateActivityNudge(activity: UserActivityEvent[]): string {
  if (activity.length === 0) {
    return 'still browsing? let me know if you have questions';
  }

  // Get the most recent meaningful action
  const lastAction = activity[activity.length - 1];

  if (lastAction.type === 'click') {
    const element = extractElement(lastAction.target);
    return `you clicked "${element}" - questions about that?`;
  }

  if (lastAction.type === 'hover') {
    const element = extractElement(lastAction.target);
    return `you were looking at ${element} - curious about something?`;
  }

  if (lastAction.type === 'scroll') {
    // Check if they scrolled to specific sections
    const target = lastAction.target.toLowerCase();
    if (target.includes('pricing')) {
      return 'you were checking out pricing - want to understand how it works?';
    }
    if (target.includes('feature')) {
      return 'you were looking at features - questions?';
    }
    if (target.includes('calculator')) {
      return 'you were scrolling through the calculator - want to talk numbers?';
    }
    return 'you were scrolling - anything interest you?';
  }

  if (lastAction.type === 'input' || lastAction.type === 'select') {
    const element = extractElement(lastAction.target);
    return `you were adjusting ${element} - want to talk about those numbers?`;
  }

  return 'still exploring? let me know if you have questions';
}

/**
 * Extract a human-readable element name from a target string
 */
function extractElement(target: string): string {
  // Try to extract readable text from common patterns
  // Examples: "button.pricing-cta" → "pricing", "slider.shoots-per-week" → "shoots per week"

  // Remove common prefixes
  let clean = target
    .replace(/^(button|link|div|span|input|select)\./i, '')
    .replace(/[-_]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2') // camelCase to spaces
    .toLowerCase()
    .trim();

  // Truncate if too long
  if (clean.length > 40) {
    clean = clean.substring(0, 40) + '...';
  }

  return clean || 'that';
}

/**
 * Generate casual check-in messages
 */
function generateCasualCheckIn(currentStep: number): string {
  const checkIns = [
    'still there? no pressure - happy to chat whenever',
    'take your time - just let me know when you\'re ready',
    'no rush - i\'ll be here when you want to continue',
    'still around? totally fine if you need a minute'
  ];

  // Use step to pick a consistent message (same step = same message)
  const index = currentStep % checkIns.length;
  return checkIns[index];
}

/**
 * Reword a question for a specific step with different phrasing
 */
function rewordQuestion(originalQuestion: string, step: number): string {
  const variations = QUESTION_VARIATIONS[step];

  if (!variations || variations.length === 0) {
    return originalQuestion; // No variations available
  }

  // Find a variation that's different from the original
  const normalized = normalizeText(originalQuestion);

  for (const variation of variations) {
    const variationNormalized = normalizeText(variation);
    if (variationNormalized !== normalized) {
      return variation;
    }
  }

  // If all variations match (shouldn't happen), return first one
  return variations[0];
}

/**
 * Normalize text for comparison (lowercase, remove punctuation/whitespace)
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Question variations for each sales script step
 * Each step has 2-4 variations with different wording but same intent
 */
const QUESTION_VARIATIONS: Record<number, string[]> = {
  0: [
    'do you mind if i ask you a few questions?',
    'quick question - ok if we chat for a minute?',
    'would you be open to a few questions about your workflow?',
    'can i ask you a couple quick questions to see if kull is a fit?'
  ],
  1: [
    'is that number accurate?',
    'does that match your reality?',
    'sound about right for your situation?',
    'that look correct to you?'
  ],
  2: [
    'are you happy with that number?',
    'is that where you want to be?',
    'satisfied with those numbers or want to grow?',
    'does that feel like enough or are you aiming higher?'
  ],
  3: [
    'how many hours are you working each week right now?',
    'what does your weekly workload look like?',
    'how many hours per week are you putting in?',
    'what\'s your typical work week look like hour-wise?'
  ],
  4: [
    'so if you want to grow, how are you planning to do that?',
    'what\'s your strategy for scaling up?',
    'how do you plan to hit those bigger numbers?',
    'got a plan for how to grow without burning out?'
  ],
  5: [
    'do you expect to be able to do that with your current workflow?',
    'can your current process handle that growth?',
    'will your existing workflow support those goals?',
    'think your current setup can scale to that level?'
  ],
  6: [
    'what\'s your actual target for annual shoots next year?',
    'what number are you really aiming for?',
    'if you had to pick a specific goal, what would it be?',
    'what\'s the dream number for next year?'
  ],
  7: [
    'why that specific number? what drives that goal?',
    'what makes that number meaningful to you?',
    'why is that your target?',
    'what\'s behind that goal - what are you really after?'
  ],
  8: [
    'what changes in your life when you hit that number? paint me a picture.',
    'describe what life looks like when you achieve that.',
    'how does your day-to-day change when you get there?',
    'what does success actually look like for you?'
  ],
  9: [
    'so what\'s kept you from hitting that goal so far? what\'s the real bottleneck?',
    'what\'s been blocking you from getting there?',
    'what\'s the biggest thing standing in your way?',
    'if you had to name one thing holding you back, what would it be?'
  ],
  10: [
    'that\'s exactly what i specialize in solving. would you be open to hearing how?',
    'i can help with exactly that. want to hear more?',
    'this is what kull was built to fix. interested in learning how?',
    'that bottleneck is what we solve. curious how it works?'
  ],
  11: [
    'on a scale of 1-10, how committed are you to fixing this in the next 30 days?',
    'how serious are you about solving this? give me a number 1-10.',
    '1 to 10 - how important is fixing this right now?',
    'rate your commitment to making this happen: 1-10?'
  ],
  12: [
    'when do you want this fixed? like, actually fixed - not just thinking about it.',
    'what\'s your timeline for solving this?',
    'when do you need this problem gone?',
    'if you could wave a wand, when would this be solved?'
  ],
  13: [
    'cool. so do you want to hear the price, or should we keep talking about the bottleneck?',
    'ready to talk pricing or want to discuss the solution more first?',
    'should i tell you what it costs or keep explaining how it works?',
    'want the price now or more details first?'
  ],
  14: [
    'everyday price is $5,988/year to solve exactly the problem you just described. that\'s $499/month billed annually for unlimited processing.',
    'it\'s $5,988 annually - $499/month for unlimited processing.',
    'regular pricing is $5,988/year to solve exactly what you described.',
    'the cost is $5,988/year - that\'s $499/month billed annually for unlimited culling.'
  ],
  15: [
    'alright — if you\'ll commit to the goal you told me, i\'ll discount it. [start your free trial here](#download)',
    'here\'s the thing - commit to your goal and i\'ll work out a discount for you. [start your free trial here](#download)',
    'tell you what - if you\'re ready to commit to what you told me, i\'ll make this work for you. [start your free trial here](#download)',
    'commit to your goal and i\'ll discount this for you. [start your free trial here](#download)'
  ]
};

/**
 * Format re-engagement context as markdown for AI
 */
export function formatReEngagementContext(strategy: ReEngagementStrategy): string {
  if (strategy.approach === 'give_space') {
    return `
## 🔄 RE-ENGAGEMENT: DON'T SEND MESSAGE

User needs space - they're not responding.
Wait for them to initiate or engage with the site.
Don't send any message right now.
    `.trim();
  }

  return `
## 🔄 RE-ENGAGEMENT STRATEGY

**Approach:** ${strategy.approach}
**Reasoning:** ${strategy.reasoning}

**Suggested Message:**
"${strategy.suggestedMessage}"

**IMPORTANT INSTRUCTIONS:**
- Don't repeat your last message word-for-word
- Reference their recent activity if available (clicks, hovers, scrolls)
- Keep it casual and low-pressure
- If they still don't respond after this, back off completely
- Make sure the message feels natural and conversational
- Use lowercase, friendly tone (like texting a friend)
  `.trim();
}

/**
 * Check if enough time has passed to consider re-engagement
 */
export function shouldConsiderReEngagement(
  timeSinceLastMessage: number,
  messageCount: number
): boolean {
  // Don't re-engage too quickly
  const minimumWaitTime = 30000; // 30 seconds

  // After 3+ messages without response, require longer wait
  if (messageCount >= 3) {
    const extendedWaitTime = 120000; // 2 minutes
    return timeSinceLastMessage >= extendedWaitTime;
  }

  return timeSinceLastMessage >= minimumWaitTime;
}

/**
 * Extract recent activity since a given timestamp
 */
export function getRecentActivitySince(
  allActivity: UserActivityEvent[],
  sinceTimestamp: number
): UserActivityEvent[] {
  return allActivity.filter(event => event.timestamp > sinceTimestamp);
}

/**
 * Determine if user has meaningfully engaged in the conversation
 * (more than just one-word answers)
 */
export function hasUserMeaningfullyEngaged(
  conversationHistory: Array<{ role: string; content: string }>
): boolean {
  const userMessages = conversationHistory.filter(msg => msg.role === 'user');

  if (userMessages.length === 0) {
    return false;
  }

  // Check if any user message has >5 words
  const hasSubstantiveMessage = userMessages.some(msg => {
    const wordCount = msg.content.trim().split(/\s+/).length;
    return wordCount > 5;
  });

  return hasSubstantiveMessage;
}

/**
 * Count consecutive messages from AI without user response
 */
export function countConsecutiveAiMessages(
  conversationHistory: Array<{ role: string; content: string }>
): number {
  let count = 0;

  // Count from end of conversation backwards
  for (let i = conversationHistory.length - 1; i >= 0; i--) {
    if (conversationHistory[i].role === 'assistant') {
      count++;
    } else if (conversationHistory[i].role === 'user') {
      break;
    }
  }

  return count;
}
