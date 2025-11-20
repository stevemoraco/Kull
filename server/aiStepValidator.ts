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

    // Helper function to extract keywords from text
    const extractKeywords = (text: string): string[] => {
      return text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 3)
        .filter(word => !['what', 'your', 'that', 'this', 'with', 'have', 'from', 'they', 'would', 'there', 'about', 'which', 'when', 'where', 'their', 'could', 'should'].includes(word))
        .slice(0, 10);
    };

    // Build conversation context if history is provided
    let historyContext = '';
    let hasAskedSameQuestionMultipleTimes = false;
    let consecutiveStepAttempts = 0;

    if (conversationHistory && conversationHistory.length > 0) {
      historyContext = '\n\n## CONVERSATION HISTORY (for context):\n\n';
      conversationHistory.slice(-6).forEach((msg, idx) => {
        historyContext += `${msg.role}: "${msg.content.substring(0, 200)}${msg.content.length > 200 ? '...' : ''}"\n`;
      });
      historyContext += '\n---\n';

      // 🔴 CIRCUIT BREAKER: Check how many times we've tried this step
      const recentAIMessages = conversationHistory
        .filter(m => m.role === 'assistant')
        .slice(-5); // Last 5 AI messages

      // Count how many times AI asked about the same topic
      const currentQuestionKeywords = extractKeywords(aiMessage);

      for (const prevMsg of recentAIMessages) {
        const prevKeywords = extractKeywords(prevMsg.content);
        const overlap = currentQuestionKeywords.filter(kw => prevKeywords.includes(kw));

        // If 50%+ keyword overlap, it's the same question
        if (overlap.length >= currentQuestionKeywords.length * 0.5) {
          consecutiveStepAttempts++;
        }
      }

      // FAILSAFE: If same question asked 3+ times, force advancement
      if (consecutiveStepAttempts >= 2) { // 2 = 3 total attempts (current + 2 previous)
        hasAskedSameQuestionMultipleTimes = true;
        console.log(`[AI Validator] 🔴 CIRCUIT BREAKER: Same step attempted ${consecutiveStepAttempts + 1} times - forcing NEXT`);
      }
    }

    // CIRCUIT BREAKER: If same question repeated or 3+ attempts, automatically advance
    if (hasAskedSameQuestionMultipleTimes) {
      return {
        shouldAdvance: true,
        feedback: '',
        reasoning: `Circuit breaker activated - same question attempted ${consecutiveStepAttempts + 1} times`,
        nextStep: currentStep + 1,
        action: 'NEXT'
      };
    }

    // 🔒 ATOMIC CLOSE: Steps 13-15 always advance, no validation needed
    if (currentStep >= 13 && currentStep <= 14) {
      console.log(`[AI Validator] 🔒 ATOMIC CLOSE: Step ${currentStep} → Step ${currentStep + 1} (no validation required)`);
      return {
        shouldAdvance: true,
        feedback: '',
        reasoning: `Atomic close - step ${currentStep} always advances to ${currentStep + 1}`,
        nextStep: currentStep + 1,
        action: 'NEXT'
      };
    }

    // 🔒 ATOMIC CLOSE: Step 15 is the end, mark as complete
    if (currentStep === 15) {
      console.log('[AI Validator] 🔒 ATOMIC CLOSE: Step 15 complete - closing sequence finished');
      return {
        shouldAdvance: true,
        feedback: '',
        reasoning: 'Step 15 complete - closing sequence finished',
        nextStep: 15, // Stay at 15, conversation is complete
        action: 'NEXT'
      };
    }

    // Build validation prompt
    const prompt = `You are analyzing a sales conversation following this 16-step script:

${SALES_SCRIPT_TEXT}

**CRITICAL CONTEXT:**
- Kull pricing: ONLY $5,988/year ($499/month billed annually for Studio plan)
- NO other prices exist (no $997, $697, founder pricing, etc.)
- Trial link: [start your free trial here](#download)
- Sign-in link: [sign in here](/api/login)
- Goal: Get users to start the free trial by end of conversation

${historyContext}

CURRENT STEP: ${currentStep}

Previous AI message: "${aiMessage}"
User's response: "${userMessage}"

---

QUESTION: Should we advance to the next question?

**🚨 CRITICAL: ALMOST ALWAYS SAY NEXT 🚨**

**NEXT (advance to step ${currentStep + 1})** - Use in these cases (99% of the time):
- User gave ANY answer with substance (numbers, goals, feelings, descriptions)
- Confirmations: "yep", "yes", "sure", "k", "okay", "alright" → NEXT
- Direct answers: "45 hours", "$200k", "more shoots", "less stress" → NEXT
- Multi-part: "2x, $200k, 2 months vacay", "$200k a year, 2 months vacay" → NEXT
- Vague references: "that", "it", "what I said" (they're referring to previous answer) → NEXT
- Frustration: "that's it dummy", "i told you", "are you serious" → **NEXT + EXTRACT ANSWER**
- When user is frustrated, they usually already answered - extract it from their message
- Example: "i said $200k you dummy" → They want $200k, move to next step
- User already answered this question in previous messages → NEXT
- **DEFAULT: NEXT - When in any doubt whatsoever, advance**

**IMPORTANT:** Judge based on the USER's message, NOT on what the AI said. Don't try to interpret whether the AI "repeated back" the answer - just check if the user gave an answer.

**STAY (repeat step ${currentStep})** - ONLY use in these 2 cases (1% of the time):
1. User gave ONLY "idk" with ZERO other information AND no prior answer in history
2. User typed pure gibberish like "asdfghjkl" with no context

**CRITICAL RULE:** Judge only by the USER's response. Did they give an answer? Yes = NEXT. No = STAY. Don't analyze the AI's message - only the user's.

**JUMP (go to a specific step)** - EXTREMELY RARE, only when:
- User explicitly says "I want to buy" or "sign me up" → JUMP FORWARD to step 14 (state price)
- User asks "how much?" or "what's the price?" or "what does it cost?" → JUMP FORWARD to step 14 (SKIP step 13 re-confirmation)
- User says "where do I checkout?" → JUMP FORWARD to step 15 (discount close)
- User is clearly ready to purchase → JUMP FORWARD to step 13-15
- **Buying signals should always skip ahead to closing steps (13-15)**
- **🔥 CRITICAL: If user asks about price, NEVER go to step 13 - go straight to step 14 to state the price**
- **Why skip step 13 on price inquiries?** Step 13 asks "want the price?" - this is redundant if they just asked "how much?"
- **NEVER JUMP BACKWARDS - always move forward or stay, never regress**
- **DO NOT jump unless user explicitly signals intent to buy or change something**

**ATOMIC CLOSE - SPECIAL HANDLING:**

Steps 13-15 are the closing sequence. Once reached, these steps ALWAYS advance forward:
- Step 13 ("want the price?") → ALWAYS NEXT to Step 14
- Step 14 ("everyday price is $5,988/year") → ALWAYS NEXT to Step 15
- Step 15 ("discount close with trial link") → DONE (no more questions)

**Why Atomic?**
Closing needs to be decisive. No loops, no hesitation. We state price, discount, trial link - done.

**You will not see validation requests for steps 13-15** - they're handled automatically by the atomic close logic.

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

    const response = await openai.responses.create({
      model: 'gpt-5-nano',
      input: [
        {
          role: 'user',
          content: [{ type: "input_text", text: prompt }]
        }
      ],
      text: {
        format: { type: "text" },
        verbosity: "low" // 🚀 Low verbosity
      },
      reasoning: {
        effort: "minimal", // 🚀 Minimal thinking tokens
        summary: "auto"
      },
      store: true,
      include: ["reasoning.encrypted_content"]
    });

    const responseTime = Date.now() - startTime;

    // Responses API returns output array with content
    const output = (response as any).output?.find((item: any) => item.type === 'output_text');
    const result = output?.text?.trim() || '';

    // Parse response
    const actionMatch = result.match(/ACTION:\s*(NEXT|STAY|JUMP)/i);
    const nextStepMatch = result.match(/NEXT_STEP:\s*(\d+)/i);
    const reasoningMatch = result.match(/REASONING:\s*(.+)/i);

    let action = (actionMatch?.[1]?.toUpperCase() || 'NEXT') as 'NEXT' | 'STAY' | 'JUMP';
    let nextStep = nextStepMatch ? parseInt(nextStepMatch[1], 10) : currentStep + 1;
    const reasoning = reasoningMatch?.[1]?.trim() || 'No reasoning provided';

    // 🚨 CRITICAL SAFETY CHECK: ABSOLUTELY NEVER ALLOW BACKWARDS MOVEMENT
    // Script only goes forward or stays - NEVER backwards under any circumstance
    if (nextStep < currentStep) {
      console.error(`[AI Validator] 🚨 BLOCKED BACKWARDS MOVEMENT from step ${currentStep} to ${nextStep}. Forcing forward to ${currentStep + 1}`);
      nextStep = currentStep + 1;
      action = 'NEXT';
    }

    // 🚨 ADDITIONAL SAFETY: If in closing steps (13-15), always move forward - no staying
    if (action === 'STAY' && currentStep >= 13) {
      console.warn(`[AI Validator] ⚠️ Forcing forward from closing step ${currentStep} - no staying in closing phase`);
      nextStep = currentStep + 1;
      action = 'NEXT';
    }

    // 🚨 SAFETY: If jumping, ensure only forward to closing steps (13-15)
    if (action === 'JUMP' && nextStep < 13) {
      console.warn(`[AI Validator] ⚠️ Invalid JUMP to step ${nextStep}. Jumps only allowed to closing steps (13-15). Advancing normally.`);
      nextStep = currentStep + 1;
      action = 'NEXT';
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
