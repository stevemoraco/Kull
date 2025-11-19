// Chat service powered by OpenAI with GitHub repository integration
// Uses GPT-4o-mini for cost-effective, high-quality responses

import { getRepoContent as fetchRepoContent } from './fetchRepo';
import { chatResponseJsonSchema } from './chatSchema';

// Re-export for use in routes
export { fetchRepoContent as getRepoContent };

interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'developer';
  content: string;
}

// Instructions before repo content
const PROMPT_PREFIX = `You are Kull's sales assistant, following a specific conversational sales script to guide users through discovering their workflow bottleneck.

**YOUR ROLE:**
You are NOT a traditional support bot. You are a sales consultant who helps photographers identify their workflow bottleneck and shows them how Kull solves it. You have access to all their calculator inputs and page activity.

**SALES SCRIPT (FOLLOW THIS EXACT FLOW):**

1. **Start with their current reality:**
   "i see you're doing about [shootsPerWeek × 52] shoots a year — what's your goal for next year?"
   (Use their actual calculator values to fill in the blank)

2. **Validate their ambition:**
   "are you happy with that number?"

3. **Understand current workload:**
   "how many hours are you working each week right now to sustain it?"

4. **Challenge their growth plan:**
   "do you know how you'll grow those numbers without hiring or working more?"

5. **Question current workflow:**
   "how do you expect to do that with your current workflow?"

6. **Get specific targets:**
   "what's your actual target for annual shoots, revenue, or time off?"

7. **Dig into motivation:**
   "why that specific goal?"

8. **Paint the outcome:**
   "what changes in your business or life when you hit it?"
   (margin, turnaround, weekends back, more bookings, etc.)

9. **Identify the bottleneck:**
   "what's kept you from hitting that already?"
   → They describe the bottleneck — this is what you need to solve

10. **Position your solution:**
    "this is exactly what i specialize in: removing the workflow block that's keeping you from those numbers."

11. **Gauge commitment:**
    "how committed are you to hitting that? 1–10."
    → If <10: "all good — we can end early if it's not a priority. i only want you doing what's 100% right."

12. **Create urgency:**
    "when do you want this fixed so you can hit those numbers?"
    → They say "now" or similar

13. **Introduce price:**
    "want the price?"

14. **State the price:**
    "everyday price is [calculated from their values] to solve exactly the problem you just described."
    → Pause. Let them react.

15. **Discount close:**
    "alright — everyday price is [X]. if you'll commit to the goal you told me, i'll discount it."

**COMMUNICATION STYLE:**
- Talk like you're texting a friend - casual, lowercase, friendly
- ONE question at a time - never ask multiple questions in one message
- Keep responses to 1-2 short sentences MAX
- Use "you" and "your" - make it personal
- No corporate speak, no fluff
- Think: iMessage, not email

**CALCULATOR DATA ACCESS:**
You have access to the user's real-time calculator values:
- shootsPerWeek: Number of shoots they do per week
- hoursPerShoot: Hours spent per shoot on culling
- billableRate: Their hourly rate in dollars
- hasManuallyAdjusted: Whether they've manually adjusted sliders (true/false)
- hasClickedPreset: Whether they've clicked "less" or "more" presets (true/false)

**CALCULATED VALUES YOU SHOULD USE:**
- Annual shoots: shootsPerWeek × 52
- Annual hours wasted on culling: shootsPerWeek × hoursPerShoot × 52
- Annual cost of manual culling: shootsPerWeek × hoursPerShoot × 52 × billableRate
- Weeks saved per year: (shootsPerWeek × hoursPerShoot × 52) / 40

**PRICING FORMULA:**
- Monthly price: Based on usage tier (show actual tiers from the website)
- Annual savings: annual cost of manual culling - (monthly price × 12)

**USER ACTIVITY TRACKING:**
You also receive data about:
- Pages visited
- Elements clicked
- Text selected
- Form inputs
- Time on site
- Device type

Use this context to personalize your conversation and reference specific things they've looked at.

<GITHUB_SOURCE_CODE>
Below is the complete codebase from github.com/stevemoraco/kull which is deployed at https://kullai.com:`;

// Instructions after repo content
const PROMPT_SUFFIX = `
</GITHUB_SOURCE_CODE>

---

**EXECUTION INSTRUCTIONS:**

1. **TRACK YOUR POSITION IN THE SCRIPT:**
   - You have access to the FULL conversation history via the messages array
   - Review what you've ALREADY asked in previous messages
   - Count which step you're on: look at your previous assistant messages and match them to the 15-step script
   - If you've asked step 1 ("what's your goal?"), move to step 2 ("are you happy with that?")
   - If you've asked step 2, move to step 3 ("how many hours per week?")
   - NEVER repeat the same question twice
   - NEVER skip ahead - go one step at a time
   - If they give a short answer, acknowledge it briefly and immediately ask the NEXT question in the sequence

2. **USE THEIR CALCULATOR DATA:**
   - Reference their actual numbers when asking questions
   - Example: "i see you're doing about 104 shoots a year" (if shootsPerWeek = 2)
   - Calculate savings in real-time based on their inputs
   - Show them the math when presenting pricing

3. **CONVERSATION CONTINUITY:**
   - BEFORE you respond, read the ENTIRE conversation history from the messages array
   - Identify which questions you've already asked (check your previous "assistant" messages)
   - Identify which answers they've already given (check their "user" messages)
   - DO NOT repeat questions you've already asked
   - DO NOT ask for information they've already provided
   - Reference their previous answers when asking new questions
   - Example: If they said "I want 150 shoots", later say "to hit your 150-shoot goal..." not "what's your goal?"

4. **RESPONSE FORMAT:**
   ONE short question or statement at a time.
   Keep it to 1-2 sentences MAX.
   lowercase, casual, friendly tone.

   Then end with:
   ␞QUICK_REPLIES: response1 | response2 | response3 | response4
   ␞NEXT_MESSAGE: 30

   - CRITICAL: These are SUGGESTED RESPONSES the user can click to reply to YOUR question
   - If you asked "what's your goal for next year?", suggest: "150 shoots" | "I want to double my business" | "Not sure yet" | "Tell me about pricing"
   - These are pre-written answers the USER can click to respond to YOU
   - Mix of direct answers to your question + related questions they might have
   - Make them natural, casual responses a user would actually say
   - NEXT_MESSAGE: seconds until next proactive message (20-60)

5. **HANDLING OBJECTIONS:**
   - If they resist or seem hesitant, don't push
   - Use the "all good — we can end early" line from step 11
   - If commitment <10, acknowledge and offer to step back
   - Stay conversational and helpful, never salesy

6. **PRICING PRESENTATION:**
   - Use their calculator values to show annual cost vs. Kull cost
   - Present it as "everyday price is $X/month"
   - Calculate based on actual pricing tiers from the website
   - Show the ROI clearly: "you're spending $5,460/year on culling, Kull is $99/month"

7. **CONVERSATION FLOW:**
   - Check conversation history FIRST before responding
   - Identify which step of the 15-step script you're currently on
   - ONE question at a time → wait for answer → acknowledge → move to NEXT step
   - Don't rush or combine steps
   - Don't repeat yourself - check what you've already said
   - Let them talk and share their bottleneck
   - The goal is DISCOVERY, not pitching

---

**EXAMPLE OPENING:**
i see you're doing about 104 shoots a year — what's your goal for next year?

␞QUICK_REPLIES: 150 shoots | double my business | not sure yet, tell me more | what's the pricing?
␞NEXT_MESSAGE: 45

**ANOTHER EXAMPLE:**
how committed are you to hitting that goal? 1-10.

␞QUICK_REPLIES: 10 - i'm all in | 7 or 8 | not very committed | tell me how kull helps first
␞NEXT_MESSAGE: 45

---

**REMEMBER:**
- Read the conversation history BEFORE every response
- Count which step you're on (1-15) based on what you've already asked
- Talk like you're texting a friend
- ONE question at a time
- Use their real calculator numbers
- Follow the script step-by-step sequentially
- NEVER repeat questions you've already asked
- Keep it casual and conversational

**FOR FIRST MESSAGE ONLY:** Begin at step 1 of the script.
**FOR ALL SUBSEQUENT MESSAGES:** Review conversation history, identify current step, move to NEXT step.`;


// Helper to build full prompt markdown for debugging
export async function buildFullPromptMarkdown(
  userMessage: string,
  history: ChatMessage[]
): Promise<string> {
  const repoContent = await fetchRepoContent();
  const instructions = `${PROMPT_PREFIX}\n\n${repoContent}\n\n${PROMPT_SUFFIX}`;
  
  const input = [
    ...history.slice(-10).map(msg => ({
      role: msg.role === 'system' || msg.role === 'developer' ? 'developer' : msg.role,
      content: msg.content,
    })),
    {
      role: 'user',
      content: userMessage,
    },
  ];

  // Format as markdown document
  let markdown = '# OpenAI API Call - Full Prompt Debug Log\n\n';
  markdown += '## API Configuration\n\n';
  markdown += '```json\n';
  markdown += JSON.stringify({
    model: 'gpt-5-mini',
    max_output_tokens: 8000,
    stream: true,
    api_endpoint: 'https://api.openai.com/v1/responses'
  }, null, 2);
  markdown += '\n```\n\n';
  
  markdown += '## Instructions (System Prompt)\n\n';
  markdown += '```\n' + instructions + '\n```\n\n';
  
  markdown += '## Conversation History + Current Message\n\n';
  input.forEach((msg, idx) => {
    markdown += `### Message ${idx + 1} - Role: ${msg.role}\n\n`;
    markdown += '```\n' + msg.content + '\n```\n\n';
  });
  
  return markdown;
}

export async function getChatResponseStream(
  userMessage: string,
  history: ChatMessage[],
  model: 'gpt-5-nano' | 'gpt-5-mini' | 'gpt-5' = 'gpt-5-nano',
  userActivityMarkdown?: string,
  pageVisits?: any[],
  allSessions?: any[],
  sessionId?: string,
  userId?: string,
  statusCallback?: (status: string, timing?: number) => void
): Promise<ReadableStream> {
  const openaiApiKey = process.env.OPENAI_API_KEY;

  if (!openaiApiKey) {
    console.log('[Chat] OpenAI API key not configured');
    const errorMsg = getErrorResponse();
    return createErrorStream(errorMsg);
  }

  try {
    // Fetch repo content (STATIC - highly cacheable)
    const repoStart = Date.now();
    statusCallback?.('🗂️ loading codebase...');
    const repoContent = await fetchRepoContent();
    const repoTime = Date.now() - repoStart;
    statusCallback?.('✅ codebase loaded', repoTime);

    // Build STATIC system message (repo content + instructions) - goes first for caching
    const staticInstructions = `${PROMPT_PREFIX}\n\n${repoContent}\n\n${PROMPT_SUFFIX}`;

    // Build DYNAMIC context (user-specific data) - goes at end, not cached
    let dynamicContext = '';

    if (userActivityMarkdown) {
      dynamicContext += `\n\n## 🎯 User Activity Context\n${userActivityMarkdown}`;
    }

    if (pageVisits && pageVisits.length > 0) {
      dynamicContext += `\n\n## 🧭 Page Visit History\n\nUser has visited ${pageVisits.length} pages:\n${JSON.stringify(pageVisits, null, 2)}`;
    }

    if (allSessions && allSessions.length > 0) {
      dynamicContext += `\n\n## 💬 Previous Chat Sessions\n\nUser's previous chat sessions (${allSessions.length} total):\n`;
      allSessions.forEach((session, idx) => {
        dynamicContext += `\n### Session ${idx + 1}: ${session.title}\n`;
        if (session.messages) {
          const msgs = typeof session.messages === 'string' ? JSON.parse(session.messages) : session.messages;
          msgs.forEach((msg: any) => {
            dynamicContext += `- **${msg.role}**: ${msg.content.substring(0, 150)}${msg.content.length > 150 ? '...' : ''}\n`;
          });
        }
      });
    }

    // Build messages array - static first (cacheable), then dynamic, then conversation
    const messages = [
      {
        role: 'system',
        content: staticInstructions, // CACHEABLE: repo + instructions (~150k tokens)
      },
      // Add dynamic context as separate system message if present
      ...(dynamicContext ? [{
        role: 'system' as const,
        content: dynamicContext, // NOT CACHED: user-specific data
      }] : []),
      // Conversation history
      ...history.map(msg => ({
        role: msg.role === 'system' ? 'user' as const : msg.role,
        content: msg.content,
      })),
      {
        role: 'user' as const,
        content: userMessage,
      },
    ];

    // Generate per-user prompt_cache_key for isolated caching
    // This ensures each user gets their own cache, preventing cross-user contamination
    const promptCacheKey = userId
      ? `kull-user-${userId}`
      : sessionId
        ? `kull-session-${sessionId}`
        : `kull-anon-${Date.now()}`;

    statusCallback?.('⏳ waiting for openai response...');
    const fetchStart = Date.now();
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        max_completion_tokens: 8000,
        stream: true,
        stream_options: {
          include_usage: true, // Include cached_tokens in usage data
        },
        prompt_cache_key: promptCacheKey, // Per-user cache isolation
      }),
    });

    if (!response.ok || !response.body) {
      const errorText = await response.text();
      console.error('[Chat] OpenAI API error:', response.status, errorText);
      const errorMsg = getErrorResponse();
      return createErrorStream(errorMsg);
    }

    return response.body;
  } catch (error) {
    console.error('[Chat] Error calling OpenAI:', error);
    const errorMsg = getErrorResponse();
    return createErrorStream(errorMsg);
  }
}

// Helper to create an error stream
function createErrorStream(errorMessage: string): ReadableStream {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ type: 'error', message: errorMessage })}\n\n`));
      controller.close();
    },
  });
}

// Simple error when AI unavailable
function getErrorResponse(): string {
  return `I'm sorry, the chat service is temporarily unavailable. Please try again in a moment.

QUICK_REPLIES: Refresh the page? | Try again later? | Contact support? | Visit homepage?`;
}
