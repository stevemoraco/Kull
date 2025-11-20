/**
 * AI-powered step validation using GPT-5-nano
 *
 * This validator provides a redundant check alongside regex pattern matching
 * to determine if a user's response qualifies for advancing to the next step
 * in the sales script.
 *
 * Benefits:
 * - Catches edge cases that regex misses (weird wording, typos, etc.)
 * - Provides feedback for improving AI responses when stuck
 * - Fast and cheap (GPT-5-nano, <200 tokens per call)
 */

import OpenAI from 'openai';
import { SALES_SCRIPT_TEXT } from '../shared/salesScript';

interface ValidationResult {
  shouldAdvance: boolean;
  feedback: string;
  reasoning?: string;
  nextStep?: number; // NEW: Specific step to jump to (if different from currentStep + 1)
  action?: 'NEXT' | 'STAY' | 'JUMP'; // NEW: What action to take
}

/**
 * Validates if a user response qualifies for advancing past the current step
 *
 * @param currentStep - Current step number (0-15)
 * @param aiMessage - The question the AI asked
 * @param userMessage - The user's response
 * @param conversationHistory - Full chat history for context (optional)
 * @returns Validation result with shouldAdvance boolean and feedback
 */
export async function validateStepAdvancement(
  currentStep: number,
  aiMessage: string,
  userMessage: string,
  conversationHistory?: Array<{ role: string; content: string }>
): Promise<ValidationResult> {
  const openaiApiKey = process.env.OPENAI_API_KEY;

  if (!openaiApiKey) {
    console.warn('[AI Validator] OpenAI API key not configured, skipping AI validation');
    return {
      shouldAdvance: true, // Fallback to trusting regex if API unavailable
      feedback: '',
      reasoning: 'API key not configured'
    };
  }

  try {
    const openai = new OpenAI({ apiKey: openaiApiKey });

    // Build conversation context if history is provided
    let historyContext = '';
    if (conversationHistory && conversationHistory.length > 0) {
      historyContext = '\n\n## CONVERSATION HISTORY (for context):\n\n';
      conversationHistory.slice(-6).forEach((msg, idx) => {
        historyContext += `${msg.role}: "${msg.content.substring(0, 200)}${msg.content.length > 200 ? '...' : ''}"\n`;
      });
      historyContext += '\n---\n';
    }

    // Build validation prompt
    const prompt = `You are analyzing a sales conversation following this 16-step script:

${SALES_SCRIPT_TEXT}

${historyContext}

CURRENT STEP: ${currentStep}

Previous AI message: "${aiMessage}"
User's response: "${userMessage}"

---

QUESTION: What should happen next in this conversation?

**SMART NAVIGATION OPTIONS:**

**NEXT (advance to step ${currentStep + 1})** - Use when:
- User gave a good answer and we should move to the next question
- Confirmations like "yep", "yes", "sure", "okay", "alright"
- Direct answers like "45 hours", "$200k", "$200k revenue", "I want more shoots"
- Brief acknowledgments like "hi", "hello", "got it"
- User already answered this in conversation history
- **DEFAULT TO NEXT - be generous, not strict**

**STAY (repeat step ${currentStep})** - Use RARELY when:
- User gave a completely vague non-answer ("idk", "huh?", "???")
- User typed random characters or gibberish
- **ONLY if truly impossible to interpret as any kind of answer**

**JUMP (go to a specific step)** - EXTREMELY RARE, only when:
- User explicitly says "I want to buy" or "sign me up" → JUMP FORWARD to step 13 (introduce price)
- User is clearly ready to purchase → JUMP FORWARD to step 13-15
- **NEVER JUMP BACKWARDS - always move forward or stay, never regress**
- **DO NOT jump unless user explicitly signals intent to buy or change something**

**CRITICAL RULES:**
- **DEFAULT TO NEXT** - When in doubt, advance the conversation
- **NEVER JUMP BACKWARDS** - You can only jump forward (to closing steps)
- Check conversation history! If user already answered earlier, say NEXT
- If user is frustrated ("i already told you"), they probably answered - say NEXT
- Brief confirmations ("yep", "hello") = NEXT
- Be generous with what counts as an answer - we're qualifying, not interrogating

Reply in this EXACT format:
ACTION: NEXT or STAY or JUMP
NEXT_STEP: ${currentStep + 1} (or specific step number if JUMP)
REASONING: One sentence explaining why`;

    const startTime = Date.now();

    const response = await openai.chat.completions.create({
      model: 'gpt-5-nano',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_completion_tokens: 100,
      temperature: 0.3, // Low temperature for consistent yes/no decisions
    });

    const responseTime = Date.now() - startTime;
    const result = response.choices[0]?.message?.content?.trim() || '';

    // Parse response
    const actionMatch = result.match(/ACTION:\s*(NEXT|STAY|JUMP)/i);
    const nextStepMatch = result.match(/NEXT_STEP:\s*(\d+)/i);
    const reasoningMatch = result.match(/REASONING:\s*(.+)/i);

    const action = (actionMatch?.[1]?.toUpperCase() || 'NEXT') as 'NEXT' | 'STAY' | 'JUMP';
    let nextStep = nextStepMatch ? parseInt(nextStepMatch[1], 10) : currentStep + 1;
    const reasoning = reasoningMatch?.[1]?.trim() || 'No reasoning provided';

    // SAFETY CHECK: Never allow jumping backwards (except to step 1 for explicit restart)
    if (action === 'JUMP' && nextStep < currentStep && nextStep !== 1) {
      console.warn(`[AI Validator] ⚠️ Blocked backwards jump from step ${currentStep} to ${nextStep}. Advancing normally instead.`);
      nextStep = currentStep + 1;
    }

    // SAFETY CHECK: Never allow jumping backwards to step 1 unless user explicitly asked to restart
    if (action === 'JUMP' && nextStep === 1 && currentStep > 1) {
      const userWantsRestart = userMessage.toLowerCase().includes('restart') ||
                               userMessage.toLowerCase().includes('start over') ||
                               userMessage.toLowerCase().includes('begin again');
      if (!userWantsRestart) {
        console.warn(`[AI Validator] ⚠️ Blocked backwards jump to step 1 without explicit restart request. Advancing normally.`);
        nextStep = currentStep + 1;
      }
    }

    // Determine if we should advance
    const shouldAdvance = action !== 'STAY';

    // Build feedback string for injection into next prompt if staying
    const feedback = !shouldAdvance
      ? `⚠️ PREVIOUS QUESTION NOT ANSWERED SUFFICIENTLY: ${reasoning}\n\nRephrase the question or provide more context to help the user give a better answer. DO NOT mention step numbers to the user.`
      : '';

    const actionSymbol = action === 'NEXT' ? '→' : action === 'JUMP' ? '⚡' : '🔄';
    console.log(`[AI Validator] Step ${currentStep} ${actionSymbol} ${action === 'STAY' ? 'STAY' : `Step ${nextStep}`} (${responseTime}ms)`);
    console.log(`[AI Validator] Reasoning: ${reasoning}`);

    return {
      shouldAdvance,
      feedback,
      reasoning,
      nextStep,
      action
    };

  } catch (error) {
    console.error('[AI Validator] Error calling OpenAI:', error);

    // Fallback: Default to YES (advance) if AI validator fails
    // This prevents users from getting stuck due to API issues
    return {
      shouldAdvance: true,
      feedback: '',
      reasoning: 'Validator error - defaulting to YES to avoid blocking user'
    };
  }
}

/**
 * Get validation statistics (for monitoring/debugging)
 */
export function getValidationStats() {
  // TODO: Add caching/stats tracking if needed
  return {
    totalValidations: 0,
    averageResponseTime: 0,
    advanceRate: 0
  };
}
