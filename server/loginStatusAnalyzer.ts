// Login status analysis and strategic sign-in prompting
import type { ConversationState } from './storage';

export interface LoginStatusInsights {
  isLoggedIn: boolean;
  conversationValue: {
    scriptProgress: number; // 0-15
    informationShared: string[]; // What they've told us
    engagementScore: number; // 0-100
    timeInvested: number; // Milliseconds
  };
  shouldPromptSignIn: boolean;
  promptingStrategy: string;
  suggestedPrompts: string[];
  risk: 'low' | 'medium' | 'high'; // Risk of losing this lead if they leave
}

/**
 * Calculates the value of the current conversation based on engagement metrics
 */
function calculateConversationValue(
  conversationState: ConversationState,
  engagementScore: number,
  sessionStartTime: number,
  currentStep: number
) {
  const timeInvested = Date.now() - sessionStartTime;

  // Extract what they've shared from answered questions
  const informationShared: string[] = [];
  if (conversationState?.questionsAnswered) {
    conversationState.questionsAnswered.forEach((qa) => {
      informationShared.push(`${qa.question}: ${qa.answer}`);
    });
  }

  return {
    scriptProgress: currentStep,
    informationShared,
    engagementScore,
    timeInvested
  };
}

/**
 * Determines if we should prompt the user to sign in now
 */
function shouldPromptSignIn(
  isLoggedIn: boolean,
  currentStep: number,
  engagementScore: number,
  timeInvested: number
): boolean {
  if (isLoggedIn) return false;

  // Prompt if:
  // - Past step 6 (shared real goals/numbers)
  // - High engagement (80+)
  // - Approaching price reveal (step 13+)
  // - Significant time invested (4+ minutes)

  return (
    currentStep >= 6 ||
    engagementScore >= 80 ||
    currentStep >= 13 ||
    timeInvested >= 240000 // 4 minutes
  );
}

/**
 * Determines the prompting strategy based on conversation context
 */
function generatePromptingStrategy(
  currentStep: number,
  conversationValue: {
    scriptProgress: number;
    informationShared: string[];
    engagementScore: number;
    timeInvested: number;
  }
): string {
  if (currentStep >= 13) {
    return 'urgent_price_quote'; // About to show price
  } else if (conversationValue.timeInvested >= 300000) {
    return 'time_investment'; // Spent 5+ minutes
  } else if (currentStep >= 6) {
    return 'goal_preservation'; // They've shared goals/numbers
  } else {
    return 'gentle_suggestion'; // Casual mention
  }
}

/**
 * Extracts a goal from an information shared string
 */
function extractGoal(infoString: string): string {
  // Look for patterns like "goal: X" or "target: X"
  const match = infoString.match(/(?:goal|target|want|achieve):\s*(.+)/i);
  if (match && match[1]) {
    return match[1].trim();
  }
  return 'your goals';
}

/**
 * Generates suggested prompts based on the prompting strategy
 */
function generateSuggestedPrompts(
  strategy: string,
  conversationValue: {
    scriptProgress: number;
    informationShared: string[];
    engagementScore: number;
    timeInvested: number;
  }
): string[] {
  const prompts: string[] = [];

  switch (strategy) {
    case 'urgent_price_quote':
      prompts.push(`we're about to get to pricing for your specific situation - [sign in quick](/api/login) so you can come back to this quote?`);
      prompts.push(`before i show you the price - [save this conversation](/api/login) so you don't lose it?`);
      break;

    case 'goal_preservation':
      const goal = conversationValue.informationShared.find((s: string) =>
        s.toLowerCase().includes('goal') ||
        s.toLowerCase().includes('target') ||
        s.toLowerCase().includes('want')
      );
      if (goal) {
        prompts.push(`before we keep going on ${extractGoal(goal)}, [sign in quick](/api/login) so this saves?`);
      }
      prompts.push(`you've shared your real numbers - [save this conversation](/api/login) so you don't lose it?`);
      break;

    case 'time_investment':
      const minutes = Math.floor(conversationValue.timeInvested / 60000);
      prompts.push(`you've spent ${minutes} minutes sharing your situation - [sign in](/api/login) so you don't have to start over?`);
      prompts.push(`we're ${minutes} minutes in - [quick sign in](/api/login) to save your progress?`);
      break;

    case 'gentle_suggestion':
      prompts.push(`btw - [sign in](/api/login) to save this conversation in case you need to come back to it?`);
      prompts.push(`heads up - [sign in](/api/login) if you want to save this for later?`);
      break;
  }

  return prompts;
}

/**
 * Calculates the risk level of losing this lead if they leave
 */
function calculateRiskLevel(
  currentStep: number,
  engagementScore: number,
  timeInvested: number
): 'low' | 'medium' | 'high' {
  // High risk: Deep in conversation, high engagement, approaching price
  if (currentStep >= 10 || engagementScore >= 80 || timeInvested >= 300000) {
    return 'high';
  }

  // Medium risk: Shared goals/numbers, moderate engagement
  if (currentStep >= 6 || engagementScore >= 60 || timeInvested >= 180000) {
    return 'medium';
  }

  // Low risk: Early conversation
  return 'low';
}

/**
 * Analyzes login status and provides strategic sign-in prompting guidance
 */
export function analyzeLoginStatus(
  isLoggedIn: boolean,
  conversationState: ConversationState,
  engagementScore: number,
  sessionStartTime: number,
  currentStep: number
): LoginStatusInsights {
  const conversationValue = calculateConversationValue(
    conversationState,
    engagementScore,
    sessionStartTime,
    currentStep
  );

  const shouldPrompt = shouldPromptSignIn(
    isLoggedIn,
    currentStep,
    engagementScore,
    conversationValue.timeInvested
  );

  const promptingStrategy = generatePromptingStrategy(
    currentStep,
    conversationValue
  );

  const suggestedPrompts = generateSuggestedPrompts(
    promptingStrategy,
    conversationValue
  );

  const risk = calculateRiskLevel(
    currentStep,
    engagementScore,
    conversationValue.timeInvested
  );

  return {
    isLoggedIn,
    conversationValue,
    shouldPromptSignIn: shouldPrompt,
    promptingStrategy,
    suggestedPrompts,
    risk
  };
}

/**
 * Formats login status insights as markdown for inclusion in AI context
 */
export function formatLoginStatusInsights(insights: LoginStatusInsights): string {
  if (insights.isLoggedIn) {
    return `## 🔐 LOGIN STATUS

**Status:** 🟢 Logged In
**Conversation Auto-Saving:** Yes
**No action needed** - focus on the sale`;
  }

  const minutes = Math.floor(insights.conversationValue.timeInvested / 60000);
  const seconds = Math.floor((insights.conversationValue.timeInvested % 60000) / 1000);

  return `## 🔐 LOGIN STATUS & STRATEGY

**Status:** 🔴 Not Logged In

**Conversation Value at Risk:**
- Script Progress: ${insights.conversationValue.scriptProgress} of 15 questions answered
- Information Shared: ${insights.conversationValue.informationShared.length} pieces
- Engagement Score: ${insights.conversationValue.engagementScore}/100
- Time Invested: ${minutes}m ${seconds}s

**Risk Level:** ${insights.risk.toUpperCase()} - If they leave now, they lose all this progress

${insights.shouldPromptSignIn ? `
**PROMPT SIGN-IN NOW:**
Strategy: ${insights.promptingStrategy}

Suggested prompts (pick one and integrate naturally):
${insights.suggestedPrompts.map((p, i) => `${i + 1}. "${p}"`).join('\n')}
` : `
**WAIT TO PROMPT:**
Not yet critical - focus on building value first
`}`;
}
