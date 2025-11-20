// OpenAI Prompt Cache Warming System
// Keeps the static prompt content (system prompt + codebase) hot in OpenAI's cache
// by sending periodic warmup requests with minimal tokens

import OpenAI from 'openai';
import { getStaticKnowledgeBase } from './knowledge/repoCache';

// Master sales prompt (static content - Layer 1 cache)
const MASTER_SALES_PROMPT = `You are Kull's sales assistant, following a specific conversational sales script to guide users through discovering their workflow bottleneck.

**YOUR ROLE:**
You are NOT a traditional support bot. You are a sales consultant who helps photographers identify their workflow bottleneck and shows them how Kull solves it. You have access to all their calculator inputs and page activity.

**🚨 CRITICAL: EXACT SCRIPTED QUESTIONS - WORD-FOR-WORD 🚨**

You MUST ask these EXACT questions at each step. You can answer the user's questions and be conversational, but you MUST work in the EXACT scripted question for your current step. Customize it naturally into the conversation, but the core question MUST be asked verbatim.

**SALES SCRIPT (ASK THESE EXACT QUESTIONS IN ORDER):**

**Step 0: Get permission (START HERE - ALWAYS ASK THIS FIRST)**
EXACT QUESTION: "do you mind if i ask you a few questions to figure out if you're a good fit for kull and it's worth your time/money? just 15 questions, a few minutes and we'll put together a special offer for you if you're a good fit."

WAIT for response. If yes/sure/ok → move to step 1
If hesitate → "totally get it - just want to make sure we're not wasting your time. sound fair?"

**Step 1: Current reality**
EXACT QUESTION: "i see you're doing about [NUMBER] shoots a year — is that accurate?"
(The actual number comes from calculatorData.annualShoots and will be substituted automatically)
If no calculator data: "what's your goal for annual shoots next year?"
WAIT for confirmation before step 2

[Script continues through Step 15...]

**COMMUNICATION STYLE:**
- Talk like you're texting a friend - casual, lowercase, friendly
- ONE question at a time - never ask multiple questions in one message
- Keep responses to 1-2 short sentences MAX
- Use "you" and "your" - make it personal
- No corporate speak, no fluff
- Think: iMessage, not email

[Additional instructions...]`;

/**
 * Warms the OpenAI prompt cache by sending a minimal request
 * This caches Layers 1 (system prompt) and 2 (codebase/knowledge base)
 * TTL is typically 5-10 minutes, so we re-warm every 4 minutes
 */
export async function warmPromptCache(): Promise<void> {
  const openaiApiKey = process.env.OPENAI_API_KEY;

  if (!openaiApiKey) {
    console.warn('[Cache Warmer] OpenAI API key not configured, skipping cache warming');
    return;
  }

  try {
    console.log('[Cache Warmer] 🔥 Starting prompt cache warming...');

    const openai = new OpenAI({ apiKey: openaiApiKey });

    // Get the static knowledge base from cache (codebase + intelligence)
    const knowledgeBaseStart = Date.now();
    const knowledgeBase = await getStaticKnowledgeBase();
    const knowledgeBaseTime = Date.now() - knowledgeBaseStart;
    console.log(`[Cache Warmer] 📚 Knowledge base retrieved from cache in ${knowledgeBaseTime}ms (${Math.round(knowledgeBase.length / 1000)}k chars)`);

    // Send minimal request to cache Layers 1 + 2
    // Using gpt-5-nano (default model) to match production usage
    const apiStart = Date.now();
    await openai.responses.create({
      model: 'gpt-5-nano',
      input: [
        {
          role: "system",
          content: [{ type: "input_text", text: MASTER_SALES_PROMPT }] // Layer 1: System prompt
        },
        {
          role: "developer",
          content: [{ type: "input_text", text: knowledgeBase }] // Layer 2: Knowledge base (codebase)
        },
        {
          role: "user",
          content: [{ type: "input_text", text: "warmup" }] // Minimal user message to trigger processing
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

    const apiTime = Date.now() - apiStart;
    const totalTime = Date.now() - knowledgeBaseStart;

    console.log(`[Cache Warmer] ✅ Prompt cache warmed successfully in ${totalTime}ms (API: ${apiTime}ms)`);
    console.log(`[Cache Warmer] 💾 Cached ${Math.round((MASTER_SALES_PROMPT.length + knowledgeBase.length) / 1000)}k chars of static content`);
  } catch (error: any) {
    console.error('[Cache Warmer] ❌ Failed to warm cache:', error?.message || error);
    // Don't throw - server can still start even if cache warming fails
    // This is a performance optimization, not a critical feature
  }
}

/**
 * Starts the cache warming interval
 * Re-warms every 4 minutes to keep cache hot (TTL is typically 5-10min)
 */
export function startCacheWarmerInterval(): void {
  const intervalMs = 4 * 60 * 1000; // 4 minutes

  console.log('[Cache Warmer] ⏰ Starting cache warming interval (every 4 minutes)');

  setInterval(async () => {
    try {
      console.log('[Cache Warmer] 🔄 Running scheduled cache warm-up...');
      await warmPromptCache();
    } catch (error: any) {
      console.error('[Cache Warmer] ❌ Interval warming failed:', error?.message || error);
      // Continue - don't stop the interval on errors
    }
  }, intervalMs);

  console.log('[Cache Warmer] ✅ Cache warming interval registered');
}
