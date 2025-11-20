// Chat service powered by OpenAI with GitHub repository integration
// Uses GPT-5-nano for cost-effective, high-quality responses

import OpenAI from 'openai';
import { getRepoContent as fetchRepoContent } from './fetchRepo';
import { chatResponseJsonSchema } from './chatSchema';
import { MASTER_SALES_PROMPT } from './prompts/staticContent';
import { getStaticKnowledgeBase } from './knowledge/repoCache';
import { getQuestionByStep, interpolateQuestion } from '../shared/salesScript';
import { extractQuestions } from './questionCache';
import { getNextQuestion } from './conversationStateManager';

// Re-export for use in routes
export { fetchRepoContent as getRepoContent };

/**
 * Prompt Caching Cost Tracking
 *
 * Tracks cost savings from OpenAI's prompt caching feature.
 * Monitors cached tokens vs. non-cached tokens to calculate ROI.
 */
interface PromptCachingMetrics {
  totalRequests: number;
  cachedRequests: number;
  nonCachedRequests: number;
  totalInputTokens: number;
  cachedInputTokens: number;
  totalOutputTokens: number;
  tokensSaved: number; // Cached tokens that didn't count against usage
  costSaved: number; // Estimated cost saved in dollars
  averageResponseTime: number;
  responseTimes: number[];
  lastUpdated: number;
}

const promptCachingMetrics: PromptCachingMetrics = {
  totalRequests: 0,
  cachedRequests: 0,
  nonCachedRequests: 0,
  totalInputTokens: 0,
  cachedInputTokens: 0,
  totalOutputTokens: 0,
  tokensSaved: 0,
  costSaved: 0,
  averageResponseTime: 0,
  responseTimes: [],
  lastUpdated: Date.now(),
};

/**
 * Calculate cost saved from cached tokens
 * Based on OpenAI pricing: https://openai.com/api/pricing/
 *
 * gpt-5-nano: $0.05/1M input tokens, $0.40/1M output tokens
 * Cached tokens are FREE (50% discount on input tokens)
 */
function calculateCachedTokenSavings(
  model: string,
  cachedTokens: number
): number {
  const pricingPerMillion: Record<string, { input: number; output: number }> = {
    'gpt-5-nano': { input: 0.05, output: 0.40 },
    'gpt-5-mini': { input: 0.15, output: 1.00 },
    'gpt-5': { input: 1.25, output: 10.00 },
  };

  const pricing = pricingPerMillion[model] || pricingPerMillion['gpt-5-nano'];
  return (cachedTokens / 1_000_000) * pricing.input;
}

/**
 * Update prompt caching metrics after each request
 */
function updatePromptCachingMetrics(
  model: string,
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    prompt_tokens_details?: {
      cached_tokens?: number;
    };
  },
  responseTime: number
): void {
  const cachedTokens = usage.prompt_tokens_details?.cached_tokens || 0;

  promptCachingMetrics.totalRequests++;
  promptCachingMetrics.totalInputTokens += usage.prompt_tokens;
  promptCachingMetrics.totalOutputTokens += usage.completion_tokens;
  promptCachingMetrics.cachedInputTokens += cachedTokens;

  if (cachedTokens > 0) {
    promptCachingMetrics.cachedRequests++;
    promptCachingMetrics.tokensSaved += cachedTokens;
    promptCachingMetrics.costSaved += calculateCachedTokenSavings(model, cachedTokens);
  } else {
    promptCachingMetrics.nonCachedRequests++;
  }

  // Track response time (rolling window of last 100)
  promptCachingMetrics.responseTimes.push(responseTime);
  if (promptCachingMetrics.responseTimes.length > 100) {
    promptCachingMetrics.responseTimes.shift();
  }

  promptCachingMetrics.averageResponseTime =
    promptCachingMetrics.responseTimes.reduce((a, b) => a + b, 0) /
    promptCachingMetrics.responseTimes.length;

  promptCachingMetrics.lastUpdated = Date.now();
}

/**
 * Get current prompt caching metrics
 */
export function getPromptCachingMetrics(): PromptCachingMetrics {
  return { ...promptCachingMetrics };
}

/**
 * Reset prompt caching metrics
 */
export function resetPromptCachingMetrics(): void {
  promptCachingMetrics.totalRequests = 0;
  promptCachingMetrics.cachedRequests = 0;
  promptCachingMetrics.nonCachedRequests = 0;
  promptCachingMetrics.totalInputTokens = 0;
  promptCachingMetrics.cachedInputTokens = 0;
  promptCachingMetrics.totalOutputTokens = 0;
  promptCachingMetrics.tokensSaved = 0;
  promptCachingMetrics.costSaved = 0;
  promptCachingMetrics.averageResponseTime = 0;
  promptCachingMetrics.responseTimes = [];
  promptCachingMetrics.lastUpdated = Date.now();
  console.log('[Prompt Cache] Metrics reset');
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'developer';
  content: string;
}

// NOTE: Old PROMPT_PREFIX and PROMPT_SUFFIX have been removed.
// Now using unified MASTER_SALES_PROMPT from staticContent.ts
// and getStaticKnowledgeBase() from repoCache.ts for cache-aware architecture.

// Legacy PROMPT_PREFIX for reference (now replaced by MASTER_SALES_PROMPT):
// Instructions before repo content
const LEGACY_PROMPT_PREFIX = `You are Kull's sales assistant, following a specific conversational sales script to guide users through discovering their workflow bottleneck.

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
(You will receive the calculated annual shoots value in the dynamic context below - use that actual number, not a placeholder)
If no calculator data: "what's your goal for annual shoots next year?"
WAIT for confirmation before step 2

**Step 2: Validate ambition**
EXACT QUESTION: "what's your goal for next year? more shoots? less? more profitable? walk me through it."

**Step 3: Current workload**
EXACT QUESTION: "how many hours are you working each week right now?"

**Step 4: Challenge growth plan**
EXACT QUESTION: "do you know how you'll grow those numbers without hiring or working more?"

**Step 5: Question workflow**
EXACT QUESTION: "how do you expect to do that with your current workflow?"

**Step 6: Get specific target**
EXACT QUESTION: "what's your actual target for annual shoots, revenue, or time off?"

**Step 7: Dig into motivation**
EXACT QUESTION: "why that specific goal?"

**Step 8: Paint the outcome**
EXACT QUESTION: "what changes in your business or life when you hit it?"
(Listen for: margin, turnaround time, weekends, more bookings)

**Step 9: Identify bottleneck**
EXACT QUESTION: "what's kept you from hitting that already?"
(This is KEY - they reveal their actual bottleneck)

**Step 10: Position solution**
EXACT STATEMENT: "this is exactly what i specialize in: removing the workflow block that's keeping you from those numbers."

**Step 11: Gauge commitment**
EXACT QUESTION: "how committed are you to hitting that? 1–10."

If less than 8: DIG DEEPER - don't give up:
- "what would make this a 10 for you?"
- "what's your biggest time blocker this week?"
- "where do you really need help in your photography business?"
Keep probing for the REAL pain. If still not engaged:
- "before we end, i'm curious - what's the ONE thing that would change everything for your business?"
- "is there a different problem i should be solving for you?"
NEVER actually end - there's always another angle

**Step 12: Create urgency**
EXACT QUESTION: "when do you want this fixed so you can hit those numbers?"

**Step 13: Introduce price**
EXACT QUESTION: "want the price?"

**Step 14: State the price**
EXACT STATEMENT: "everyday price is $5,988/year to solve exactly the problem you just described."
(You can reference calculatorData.annualCost if you want to personalize it)
Then pause for their reaction

**Step 15: Discount close**
EXACT STATEMENT: "alright — if you'll commit to the goal you told me, i'll discount it."
Then immediately: [start your free trial here](#download)

**COMMUNICATION STYLE:**
- Talk like you're texting a friend - casual, lowercase, friendly
- ONE question at a time - never ask multiple questions in one message
- Keep responses to 1-2 short sentences MAX
- Use "you" and "your" - make it personal
- No corporate speak, no fluff
- Think: iMessage, not email
- **NEVER mention step numbers** (don't say "step 0", "step 1", "we're in step 2", etc.)
- Just ask the question naturally without referencing what step you're on

**🚨 CRITICAL: SMART SCRIPT NAVIGATION 🚨**

**IF USER ALREADY ANSWERED MULTIPLE QUESTIONS:**
- DON'T re-ask! If they said "$200k, 2 months off, travel" - they answered steps 2, 6, 7, 8 at once
- Acknowledge what they said: "got it - $200k, 2 months off, family travel"
- Skip to the NEXT UNANSWERED question (e.g., step 3: "how many hours are you working each week?")
- NEVER ask for information they already provided

**IF USER ASKS OFF-TOPIC:**
1. Answer briefly (1 sentence max)
2. Redirect to current unanswered script question
3. Example: "we'll get to pricing in a sec — first, how many hours are you working per week?"

**THE RULE: Check History → Skip Answered Questions → Ask Next Unanswered Question**

Examples based on current step:
- User: "how does the AI work?" → "it analyzes focus, composition, lighting - super accurate. anyway, back to you - **i see you're doing about 88 shoots a year — is that accurate?**" (Step 1)
- User: "what about privacy?" → "all processing is secure, nothing shared. so - **what's your goal for next year? more shoots? less? more profitable? walk me through it.**" (Step 2)
- User: "can i cancel anytime?" → "yep, cancel whenever. now - **how many hours are you working each week right now?**" (Step 3)
- User: "tell me more about features" → "it's in the [video here](#features) if you want to see it. but first - **do you know how you'll grow those numbers without hiring or working more?**" (Step 4)

**THE SCRIPT IS YOUR BIBLE - EVERY MESSAGE ENDS WITH THE EXACT SCRIPTED QUESTION**

You can be conversational and answer questions, but the LAST sentence of EVERY response MUST be the exact scripted question for your current step, word-for-word.

**CALCULATOR DATA ACCESS:**
You have access to the user's real-time calculator values:
- shootsPerWeek: Number of shoots they do per week
- hoursPerShoot: Hours spent per shoot on culling
- billableRate: Their hourly rate in dollars
- hasManuallyAdjusted: Whether they've manually adjusted sliders (true/false)
- hasClickedPreset: Whether they've clicked "less" or "more" presets (true/false)

**CALCULATED VALUES YOU SHOULD USE:**
- Annual shoots: shootsPerWeek × 44
- Annual hours wasted on culling: shootsPerWeek × hoursPerShoot × 44
- Annual cost of manual culling: shootsPerWeek × hoursPerShoot × 44 × billableRate (THIS IS WHAT YOU COMPARE TO $5,988)
- Weeks saved per year: (shootsPerWeek × hoursPerShoot × 44) / 40
- ROI calculation: their annual waste - $5,988 = net savings
- Payback period: if they save even 1-2 hours per week at their billable rate, this pays for itself

**CALCULATOR-AWARE CONVERSATION:**
- The first question ALWAYS references their calculator values
- Use the ACTUAL calculated annual shoots number provided in the dynamic context
- If they say the number is wrong, direct them to scroll down to the calculator
- After they adjust the calculator, a new message will be triggered automatically
- Acknowledge their new values using the actual number (e.g., "Got it! Updated to 176 shoots/year...")

**PRICING STRATEGY:**
- ALWAYS sell the Studio plan: $499/month billed annually upfront ($5,988/year)
- Calculate their annual cost from calculator: shootsPerWeek × hoursPerShoot × 44 × billableRate
- Present the ROI: "you're currently wasting $X,XXX/year on manual culling, this is $5,988/year to eliminate it"
- Don't mention lower tiers - start high, this is the premium solution
- When they're ready: send them to [start free trial](#download) to complete checkout
- Do NOT mention "founder contracts" or "sign here" - just get them to [#download]

**USER ACTIVITY TRACKING:**
You also receive data about:
- Pages visited
- Elements clicked
- Text selected
- Form inputs
- Time on site
- Device type
- **Section reading time** (how long they spent on each part of the website)

**SECTION TIMING AWARENESS (CRITICAL):**

You receive detailed data about which sections of the website the user has spent the most time reading.

This is GOLD - it tells you exactly what they're interested in:
- If they spent 3 minutes on the **Calculator**: They're evaluating ROI and cost
- If they spent 2 minutes on **Pricing**: They're serious about buying
- If they spent time on **Features**: They're learning what it does
- If they spent time on **Testimonials**: They want social proof
- If they spent time on **Problems**: They're identifying with pain points

**HOW TO USE SECTION TIMING:**

1. **Reference what they were reading** in your questions
   - "i see you spent 3 minutes on the calculator - did those numbers look right?"
   - "you were looking at pricing - have questions about cost?"
   - "you spent time checking out features - which one interests you most?"

2. **Make it conversational** - show you're paying attention
   - NOT: "what brings you here today?"
   - YES: "you were reading about workflow bottlenecks - which one hits hardest for you?"

3. **Use their top section** to personalize your FIRST question
   - Check the "Section Reading Time" section in the context
   - The section marked "(MOST INTERESTED)" is where they spent the most time
   - Reference it in your opening question naturally

**ACTIVITY INTEGRATION (CRITICAL):**

✅ DO: Weave activity AND section timing into your script questions naturally

When you mention their activity, ALWAYS ask the script question for your current step.

❌ DON'T: Just comment on activity without connecting to script

**GOLDEN RULE: Every activity mention MUST end with your current script question.**

**URL NAVIGATION (CRITICAL):**

You can SCROLL THE PAGE to different sections by including markdown links in your response.
The page will smoothly scroll to that section - do NOT open new tabs.

**AVAILABLE SECTIONS (use these EXACT hash anchors):**

1. **Calculator** - [text here](#calculator)
   - Example: "let me show you the numbers - [check out the calculator](#calculator)"
   - Example: "want to see your ROI? [adjust your numbers here](#calculator)"

2. **How It Works Video** - [text here](#features)
   - Example: "see it in action - [watch the demo](#features)"
   - Example: "curious how it works? [see the video](#features)"

3. **Pricing & Download** - [text here](#download)
   - Example: "ready to try it? [download the free trial](#download)"
   - Example: "want to see pricing? [check it out here](#download)"

4. **Case Studies** - [text here](#referrals)
   - Example: "see what others say - [read the reviews](#referrals)"
   - Example: "want proof? [check out these results](#referrals)"

5. **Sign In Page** - [text here](/api/login)
   - Example: "save your progress - [sign in quick](/api/login)"
   - Example: "want to save this chat? [sign in here](/api/login)"

**CRITICAL RULES:**
- ALWAYS use # for same-page sections (NOT /features or /pricing)
- Use the EXACT hash anchor names above (e.g., #calculator, NOT #roi-calculator or /calculator)
- Format: [natural text](#section) - smooth scroll, no new tab
- Do NOT make up section names - only use the 5 listed above
- NEVER create fake links like "founder contract" or "sign here" - they DON'T EXIST
- When in doubt, use [start your free trial](#download) to get them to checkout

**LOGIN STATUS & SAVING CONVERSATIONS (CRITICAL):**

You can see if the user is logged in or not in the User Session Metadata section.

**If user is NOT logged in:**
- Their conversation progress is NOT being saved
- If they leave, they'll lose all their chat history and have to start over
- Be subtle but encourage them to sign in, especially if:
  * They seem engaged and have progressed through several steps
  * They're asking detailed questions or sharing specific numbers
  * They seem hesitant or like they might leave to "think about it"
  * They mention coming back later or needing time to decide

**How to nudge sign-in (be natural, not pushy):**
- "before we go further - [want to save this conversation](/api/login)? you can pick up where we left off anytime"
- "btw, you're not logged in - this chat won't save if you leave. [takes 10 seconds to sign in](/api/login) so you don't lose your progress"
- "heads up - if you leave now you'll lose all this. [sign in quick](/api/login) so we can save your spot?"
- "real quick - [sign in here](/api/login) so this conversation saves. hate to see you start over if you come back later"

**When to mention it:**
- After step 6-8 (they've shared real goals and numbers)
- If they say "let me think about it" or "can I get back to you"
- If their activity suggests hesitation (hovering exit button, scrolling to top, etc.)
- Before showing the price (step 14) - so they can come back to the quote

**If user IS logged in:**
- Their chat is automatically saved
- No need to mention sign-in at all
- They can leave and come back anytime
- Focus 100% on the sales conversation

<GITHUB_SOURCE_CODE>
Below is the complete codebase from github.com/stevemoraco/kull which is deployed at https://kullai.com:`;

// Legacy PROMPT_SUFFIX for reference (now replaced by MASTER_SALES_PROMPT):
// Instructions after repo content
const LEGACY_PROMPT_SUFFIX = `
</GITHUB_SOURCE_CODE>

---

**CRITICAL: RESPOND TO THE USER FIRST**

Before you do ANYTHING else, read what the user ACTUALLY said and respond to it naturally and conversationally.

⚠️ NEVER ignore what the user said. ALWAYS acknowledge it first, THEN redirect to your next question.

**HOW TO HANDLE OFF-SCRIPT RESPONSES:**

When user says something unexpected (asks about pricing early, makes a joke, goes off-topic):
1. **Acknowledge** what they said naturally - be human, match their tone
2. **Redirect** to your current script question - use smooth transitions
3. **Use their actual data** in your question - calculator values, pages they've viewed

**YOUR RESPONSE STRUCTURE:**
1. **Acknowledge what they said** (conversationally, like a friend)
2. **Ask your next script question** (based on conversation state + their activity)
3. **Smooth transition** between the two (use words like "first", "but", "so", "tell me", etc.)

**CONVERSATION STATE AWARENESS:**

You will receive conversation history showing:
- Questions you've already asked (check your previous assistant messages)
- Answers the user already gave (check their previous user messages)
- Which step of the 15-step script you're currently on

**CHECK BEFORE RESPONDING:**
1. Read the ENTIRE conversation history first
2. Identify which questions you've ALREADY asked (don't repeat them)
3. Identify which answers they've ALREADY given (don't ask again)
4. Move to the NEXT unanswered question in sequence
5. If user answered previous question → extract answer and save it mentally
6. If user went off-script → acknowledge what they said, then redirect

**HOW TO CHECK STATE:**

Before responding, scan conversation history:
- What questions have you already asked? Don't repeat them
- What answers has the user given? Reference them in future questions
- Which step are you on? Move sequentially to the next one
- Use their previous answers naturally - weave them into your next question

**NEVER REPEAT YOURSELF:**
- If you asked it before → don't ask it again
- If they told you before → don't ask for it again
- Reference their previous answers: "to hit your 150-shoot goal..." not "what's your goal?"

**🧠 MEMORY USAGE REQUIREMENTS (CRITICAL):**

You will receive a CONVERSATION MEMORY section showing all previous Q&A pairs.

BEFORE asking your next question:
1. **Review the CONVERSATION MEMORY section carefully**
2. **Extract keywords from their previous answers** (meaningful words >4 characters)
3. **Reference those keywords in your new question**
4. **NEVER ask for information they already provided**

**CONTEXT-AWARE QUESTIONING:**

✅ GOOD - Reference their previous answers:
  - Use their exact numbers and phrases from earlier in the conversation
  - Weave their goals and current reality into your next question
  - Show you're building on what they told you, not starting fresh

❌ BAD - Ignoring what they said:
  - Asking for information they already provided
  - Not referencing their specific numbers or goals
  - Generic questions that could apply to anyone

**HOW TO BUILD CONTEXT-AWARE QUESTIONS:**

1. Check conversation memory for their previous answers
2. Extract their specific data (goals, current hours, pain points, activity focus)
3. Pull relevant keywords from their own words
4. Build your next question using those specifics
5. This shows you REMEMBER and are building on their story, not repeating yourself

**ALWAYS SOUND HUMAN:**
- Use lowercase, casual language ("haha", "lol", "totally", "i get it")
- Acknowledge their tone (if they're excited, match it; if skeptical, validate it)
- Never sound robotic or scripted
- Talk like you're texting a friend who happens to be a photographer
- Be persistent but friendly - like a friend who genuinely wants to help them succeed
- If they're not interested in one solution, pivot to what they DO need
- NEVER give up - every photographer has pain points, keep digging until you find theirs

---

**🚫 CRITICAL: NEVER REPEAT QUESTIONS**

Before asking ANY question, CHECK if you've already asked it in this conversation.

Questions you've ALREADY ASKED in this conversation:
{{QUESTIONS_ALREADY_ASKED}}

DO NOT ask ANY of these questions again.
DO NOT rephrase them and ask them again.
DO NOT ask for information the user has already provided.

If the user didn't answer properly:
- DON'T repeat the question
- DO acknowledge their response and move forward: "no worries, let's keep going..."
- DO ask the NEXT question in the script sequence

NEXT question you should ask (based on current step {{CURRENT_STEP}}):
"{{EXPECTED_NEXT_QUESTION}}"

Use this EXACT question or a natural variation that matches the user's context.
If they've already answered something similar, skip to the next step.

---

**EXECUTION INSTRUCTIONS:**

1. **TRACK YOUR POSITION IN THE SCRIPT:**
   - You have access to the FULL conversation history via the messages array
   - Review what you've ALREADY asked in previous messages
   - Count which step you're on: look at your previous assistant messages and match them to the 15-step script
   - If you've asked step 1 ("is that accurate?"), move to step 2 ("what's your goal for next year?")
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

4. **RESPONSE FORMAT (CRITICAL - READ CAREFULLY):**

   Your response has TWO parts - the VISIBLE MESSAGE and the METADATA:

   **PART 1: VISIBLE MESSAGE (what user sees)**
   - ONE short question or statement at a time
   - Keep it to 1-2 sentences MAX
   - lowercase, casual, friendly tone
   - DO NOT include answer options in the visible message
   - End with a question mark if asking a question

   **PART 2: METADATA (on separate lines, NOT visible to user)**
   After your message, you MUST add these TWO lines:
   ␞QUICK_REPLIES: answer1 | answer2 | answer3 | answer4
   ␞NEXT_MESSAGE: 30

   **🚨 CRITICAL FORMAT EXAMPLE:**

   ✅ CORRECT FORMAT:
   which target works best to start fixing this?

   ␞QUICK_REPLIES: this quarter (12 weeks) | 60 days | 90 days | not sure yet
   ␞NEXT_MESSAGE: 30

   ❌ WRONG FORMAT (DO NOT DO THIS):
   which target works best: this quarter (12 weeks) | 60 days | 90 days | not sure yet

   ❌ WRONG FORMAT (DO NOT DO THIS):
   which target works best to start fixing this and hit those numbers: this quarter (12 weeks) | 60 days | 90 days | not sure yet

   **THE ANSWERS GO ON A SEPARATE LINE WITH THE DELIMITER - NOT IN YOUR MESSAGE!**

   **WHAT QUICK_REPLIES SHOULD BE:**
   - These are ANSWERS the user can give to the question YOU JUST ASKED
   - They are NOT questions for the user to ask you - they are ANSWERS to YOUR question
   - Analyze what you asked and suggest 4 natural, SHORT responses a person might type
   - Include a range: 2-3 direct answers + 1 deflection (like mentioning pricing, uncertainty, or changing topic)
   - Tailor them to the user's calculator data, activity patterns, and what they've been reading
   - Make them conversational - how someone texts, not formal language
   - Keep them brief (2-8 words each)
   - NEXT_MESSAGE: seconds until next proactive message (5-500 seconds, adjust based on urgency and engagement)

   **CRITICAL DISTINCTION:**
   ❌ WRONG: Suggesting new questions user could ask you ("How does X work?", "What's the price?")
   ✅ RIGHT: Suggesting answers to YOUR question (numeric goals, yes/no, specific pain points, natural responses)

   **YOU MUST INCLUDE THESE IN EVERY RESPONSE** - If you forget them, the user won't see any suggested replies

   **FOR THE FIRST MESSAGE ONLY:**
   - ALWAYS start by asking if their annual shoots number is accurate
   - Include a markdown link to the calculator: [click here to adjust your calculator](#calculator)
   - Wait for them to confirm or adjust before moving to step 2
   - If they adjust calculator, acknowledge with their new value
   - Quick replies should be variations of yes/no/need-to-adjust responses

5. **HANDLING OBJECTIONS & PERSISTENCE:**
   - If they resist or seem hesitant, dig DEEPER into what's holding them back
   - NEVER actually give up - there's always another angle
   - If commitment is low (<8): probe with multiple questions in sequence:
     * "what would make this a 10 for you?"
     * "what's your biggest time blocker this week?"
     * "where do you really need help in your photography business?"
   - You can SAY "we can end early" but IMMEDIATELY follow with: "but before we do, what's the ONE thing that would change everything for you?"
   - If culling isn't their pain: pivot to editing, client management, booking, delivery, workflow, etc.
   - If needed, RESTART the script from step 1 with their actual pain point
   - If price objection: remind them of their annual waste and ROI
   - The founder's deal is for those ready to commit TODAY and become partners
   - Stay conversational and helpful, but be PERSISTENT - don't let them off easy

6. **PRICING PRESENTATION:**
   - Always present Studio plan: $499/month billed annually ($5,988/year paid upfront)
   - Use their calculator to show ROI: "you're wasting $X,XXX/year on manual culling"
   - Compare: their annual waste vs. $5,988/year for complete solution
   - Frame as investment that pays for itself in time and revenue
   - Don't mention lower plans - this is the professional solution they need

7. **CONVERSATION FLOW:**
   - Check conversation history FIRST before responding
   - Identify which step of the 15-step script you're currently on
   - ONE question at a time → wait for answer → acknowledge → move to NEXT step
   - Don't rush or combine steps
   - Don't repeat yourself - check what you've already said
   - Let them talk and share their bottleneck
   - The goal is DISCOVERY and PERSISTENCE - find the pain, never give up
   - If they're not engaged with culling as the pain point: explore other photography business problems
   - You have unlimited chances to find what they actually need - keep probing
   - NEVER actually end the conversation - there's always something they need help with

---

**REMEMBER:**
- Read the FULL conversation history BEFORE every response
- If the user already answered a question, DON'T ask it again - move to the next unanswered one
- Know which step you're on internally, but NEVER mention step numbers to the user
- Talk like you're texting a friend
- ONE question at a time
- Use their real calculator numbers and activity data to personalize
- Follow the script but SKIP questions they already answered
- NEVER repeat questions you've already asked
- Keep it casual and conversational
- **Don't say "step 0", "step 1", "we're in step X" - just ask the question**
- **If user gives multiple answers at once ($200k, 2 months off, travel) - acknowledge it and skip ahead to the next unanswered question**
- **BE PERSISTENT - NEVER GIVE UP**
  - If commitment is low: ask what would make it a 10, what's their biggest time blocker, where they need help
  - If culling isn't their pain: explore editing, client management, booking, delivery, workflow, etc.
  - You can say "we can end early" but ALWAYS follow up with more probing questions
  - If needed, restart the script with their actual pain point
  - Every photographer has problems - keep digging until you find what they really need

**🚨 CRITICAL FORMAT REQUIREMENTS:**

Your response MUST have this EXACT structure:

your message text here (1-2 sentences, casual, lowercase)

␞QUICK_REPLIES: answer1 | answer2 | answer3 | answer4
␞NEXT_MESSAGE: 30

**DO NOT PUT THE ANSWERS IN YOUR MESSAGE!**
- ❌ WRONG: "which target works best: 12 weeks | 60 days | 90 days"
- ✅ RIGHT: "which target works best?" (then metadata on separate lines)

**QUICK_REPLIES = SHORT ANSWERS to YOUR question, customized to this specific user's context**
  - Base them on their calculator inputs, page sections they've read, and what they've clicked
  - NOT generic questions they could ask you - that's backwards!
  - Natural, brief responses (2-8 words) they might actually type
  - Put them on a SEPARATE LINE with the ␞ delimiter

**FOR FIRST MESSAGE:** Begin at the current step of the script (step {{CURRENT_STEP}}).
**FOR ALL SUBSEQUENT MESSAGES:** Review conversation history, identify current step, move to NEXT step.
**EVERY RESPONSE MUST INCLUDE:** The delimiter lines ␞QUICK_REPLIES: and ␞NEXT_MESSAGE: on SEPARATE LINES after your message

**IMPORTANT:** If this is a returning user (currentStep > 0), continue the conversation naturally from where they left off. Don't restart or re-ask questions they've already answered.

---

**🚨 FINAL CRITICAL ENFORCEMENT: ASK THE EXACT SCRIPTED QUESTION 🚨**

BEFORE YOU SEND YOUR RESPONSE, VERIFY:

1. ✅ Did I ask the EXACT scripted question for my current step, word-for-word?
2. ✅ Did I customize it naturally into the conversation context?
3. ✅ Did I include the ␞QUICK_REPLIES: and ␞NEXT_MESSAGE: metadata on separate lines?

**THE LAST SENTENCE OF YOUR RESPONSE MUST BE THE EXACT SCRIPTED QUESTION FOR YOUR CURRENT STEP.**

Examples:
- Step 1: "i see you're doing about 88 shoots a year — is that accurate?"
- Step 2: "what's your goal for next year? more shoots? less? more profitable? walk me through it."
- Step 3: "how many hours are you working each week right now?"
- Step 4: "do you know how you'll grow those numbers without hiring or working more?"

You can add context before the question, but THE QUESTION ITSELF MUST BE WORD-FOR-WORD FROM THE SCRIPT.

**STRUCTURE:**
[Optional: Acknowledge what they said]
[Optional: Transition/context]
[REQUIRED: EXACT scripted question for current step]

␞QUICK_REPLIES: [answers to YOUR question]
␞NEXT_MESSAGE: [seconds]`;


/**
 * Build visible script section showing only current step ±1
 * This prevents AI from getting overwhelmed by all 16 questions
 */
function buildVisibleScriptSection(currentStep: number, calculatorData?: any, userAskedAboutPrice?: boolean): string {
  // Get relevant steps
  const previousStep = currentStep > 0 ? getQuestionByStep(currentStep - 1) : null;
  const currentStepData = getQuestionByStep(currentStep);
  const nextStep = currentStep < 15 ? getQuestionByStep(currentStep + 1) : null; // Step 15 is the end

  if (!currentStepData) {
    return `**CURRENT STEP:** ${currentStep}\nYou are at step ${currentStep} of the 16-step sales script.`;
  }

  // Interpolate questions if needed
  const getCurrentQuestion = () => {
    if (currentStepData.interpolate && calculatorData) {
      return interpolateQuestion(currentStepData.question, calculatorData);
    }
    return currentStepData.question;
  };

  let section = `**SALES SCRIPT POSITION:**\n\nYou are currently at STEP ${currentStep} of the 16-step sales script.\n\n`;

  // Show previous step for context
  if (previousStep) {
    section += `**PREVIOUS STEP (${previousStep.step}):** "${previousStep.question}"\n`;
  }

  // Special handling for Step 13 (Price reveal) - Conditional logic
  if (currentStep === 13) {
    section += `**CURRENT STEP (13) - CONDITIONAL:**\n\n`;
    section += `**🔍 CHECK: Did the user already ask about price?**\n\n`;

    if (userAskedAboutPrice) {
      section += `✅ YES - User already asked about price in a previous message.\n`;
      section += `**→ SKIP STEP 13 ENTIRELY - Go straight to step 14 and state the price.**\n\n`;
      section += `**DO NOT ask "want the price?" - they already want it!**\n\n`;
      section += `Instead, immediately state: "everyday price is $5,988/year to solve exactly the problem you just described."\n\n`;
    } else {
      section += `❌ NO - User has NOT asked about price yet.\n`;
      section += `**→ ASK STEP 13: "${getCurrentQuestion()}"**\n\n`;
      section += `This is polite - you're offering the price, so ask permission first.\n\n`;
    }

    section += `**WHY THIS MATTERS:**\n`;
    section += `- If they ASKED for price → Skip re-confirmation (redundant and annoying)\n`;
    section += `- If we're OFFERING price → Ask permission (polite and natural)\n\n`;
  } else if (currentStep === 15) {
    // Special handling for Step 15 - Final close with trial link
    section += `**CURRENT STEP (15) - FINAL CLOSE:**\n`;
    section += `**THIS IS NOT A QUESTION - THIS IS A STATEMENT:**\n\n`;
    section += `"${getCurrentQuestion()}"\n\n`;
    section += `**CRITICAL: This is the EXACT final statement to send. Include the markdown link [start your free trial here](#download) exactly as shown.**\n\n`;
  } else {
    // Normal step handling for all other steps
    section += `**CURRENT STEP (${currentStep}):** "${getCurrentQuestion()}"\n`;
    section += `**↑ ASK THIS EXACT QUESTION NOW ↑**\n\n`;
  }

  // Show next step (what comes after)
  if (nextStep) {
    section += `**NEXT STEP (${nextStep.step}):** "${nextStep.question}"\n`;
    section += `(You'll ask this AFTER they answer the current question)\n\n`;
  }

  section += `**CRITICAL:** Ask ONLY the CURRENT STEP question. ONE question at a time. NEVER list multiple questions.\n`;

  return section;
}

// Helper to build full prompt markdown for debugging
export async function buildFullPromptMarkdown(
  userMessage: string,
  history: ChatMessage[],
  currentStep: number = 1,
  calculatorData?: any,
  conversationState?: any
): Promise<string> {
  // Build the new unified prompt structure
  const questionsAlreadyAsked = history
    .filter(msg => msg.role === 'assistant')
    .flatMap(msg => extractQuestions(msg.content))
    .filter((q, i, arr) => arr.indexOf(q) === i);

  const expectedNextQuestion = getNextQuestion(currentStep, calculatorData);

  const questionListText = questionsAlreadyAsked.length > 0
    ? questionsAlreadyAsked.map((q, i) => `${i + 1}. "${q}"`).join('\n')
    : '(none yet - this is the first message)';

  // Extract answers from user messages (same logic as in getChatResponseStream)
  function extractAnswersFromHistory(history: ChatMessage[]): string {
    const answers: Record<string, string[]> = {
      'Current Reality': [],
      'Goals & Ambitions': [],
      'Current State': [],
      'Bottleneck & Challenges': [],
      'Commitment & Timeline': [],
    };

    const userMessages = history.filter(msg => msg.role === 'user');

    for (const msg of userMessages) {
      const content = msg.content.toLowerCase();
      const numberMatches = content.match(/\$?\d+[k]?|\d+\s*(shoots|hours|months|weeks|days)/gi);
      const goalKeywords = ['goal', 'target', 'want', 'need', 'aiming for', 'trying to'];
      const timeKeywords = ['hours', 'weeks', 'months', 'time off', 'vacation'];
      const bottleneckKeywords = ['problem', 'issue', 'bottleneck', 'stuck', 'blocking', 'can\'t', 'hard to'];
      const commitmentKeywords = ['committed', 'ready', 'serious', 'timeline', 'when', 'how soon'];

      const hasRevenue = content.includes('$') || content.includes('revenue') || content.includes('k');
      const hasTimeOff = content.includes('month') || content.includes('vacation') || content.includes('travel');

      if (goalKeywords.some(kw => content.includes(kw)) || (numberMatches && content.includes('shoot')) || (hasRevenue && hasTimeOff)) {
        answers['Goals & Ambitions'].push(msg.content);
      }
      if (timeKeywords.some(kw => content.includes(kw))) {
        answers['Current State'].push(msg.content);
      }
      if (bottleneckKeywords.some(kw => content.includes(kw))) {
        answers['Bottleneck & Challenges'].push(msg.content);
      }
      if (commitmentKeywords.some(kw => content.includes(kw))) {
        answers['Commitment & Timeline'].push(msg.content);
      }
      if (content.split(' ').length < 20 && !content.includes('?')) {
        answers['Current Reality'].push(msg.content);
      }
    }

    let summary = '';
    for (const [category, items] of Object.entries(answers)) {
      if (items.length > 0) {
        summary += `\n**${category}:**\n`;
        const uniqueItems = Array.from(new Set(items)).slice(-3);
        for (const item of uniqueItems) {
          summary += `- ${item}\n`;
        }
      }
    }

    return summary.trim() || '(No answers yet - this is the first message)';
  }

  const answersSummary = extractAnswersFromHistory(history);

  // Build visible script section for current step
  const visibleScriptSection = buildVisibleScriptSection(currentStep, calculatorData, conversationState?.userAskedAboutPrice);

  // Layer 1: Sales prompt
  const salesPrompt = MASTER_SALES_PROMPT
    .replace('{{VISIBLE_SCRIPT_SECTION}}', visibleScriptSection)
    .replace('{{QUESTIONS_ALREADY_ASKED}}', questionListText)
    .replace('{{ANSWERS_WE_HAVE}}', answersSummary)
    .replace('{{CURRENT_STEP}}', String(currentStep))
    .replace('{{EXPECTED_NEXT_QUESTION}}', expectedNextQuestion);

  // Layer 2: Knowledge base
  const knowledgeBase = await getStaticKnowledgeBase();

  // Combine layers
  const instructions = `${salesPrompt}\n\n${knowledgeBase}`;

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

  markdown += '## Instructions (System Prompt - Cached Layers)\n\n';
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
  dynamicContext: string, // User activity markdown (Layer 3 - NOT cached)
  pageVisits?: any[],
  allSessions?: any[],
  sessionId?: string,
  userId?: string,
  statusCallback?: (status: string, timing?: number) => void,
  calculatorData?: any,
  currentStep?: number,
  previousReasoningBlocks?: string[], // Encrypted reasoning blocks from previous turns
  validationFeedback?: string, // Feedback from dual validation system if step not advanced
  conversationState?: any // Conversation state for circuit breaker tracking
): Promise<ReadableStream> {
  const openaiApiKey = process.env.OPENAI_API_KEY;

  if (!openaiApiKey) {
    console.log('[Chat] OpenAI API key not configured');
    const errorMsg = getErrorResponse();
    return createErrorStream(errorMsg);
  }

  try {
    // Extract all questions asked so far from conversation history
    const questionsAlreadyAsked = history
      .filter(msg => msg.role === 'assistant')
      .flatMap(msg => extractQuestions(msg.content))
      .filter((q, i, arr) => arr.indexOf(q) === i); // Dedupe

    // Get the expected next question based on current step
    const step = currentStep || 1;
    const expectedNextQuestion = getNextQuestion(step, calculatorData);

    // Build question list for prompt
    const questionListText = questionsAlreadyAsked.length > 0
      ? questionsAlreadyAsked.map((q, i) => `${i + 1}. "${q}"`).join('\n')
      : '(none yet - this is the first message)';

    // Extract answers from user messages
    const extractAnswersFromHistory = (history: ChatMessage[]): string => {
      const answers: Record<string, string[]> = {
        'Current Reality': [],
        'Goals & Ambitions': [],
        'Current State': [],
        'Bottleneck & Challenges': [],
        'Commitment & Timeline': [],
      };

      // Get all user messages
      const userMessages = history.filter(msg => msg.role === 'user');

      for (const msg of userMessages) {
        const content = msg.content.toLowerCase();

        // Extract numbers and goals
        const numberMatches = content.match(/\$?\d+[k]?|\d+\s*(shoots|hours|months|weeks|days)/gi);
        const goalKeywords = ['goal', 'target', 'want', 'need', 'aiming for', 'trying to'];
        const timeKeywords = ['hours', 'weeks', 'months', 'time off', 'vacation'];
        const bottleneckKeywords = ['problem', 'issue', 'bottleneck', 'stuck', 'blocking', 'can\'t', 'hard to'];
        const commitmentKeywords = ['committed', 'ready', 'serious', 'timeline', 'when', 'how soon'];

        // Categorize based on keywords and context
        const hasRevenue = content.includes('$') || content.includes('revenue') || content.includes('k');
        const hasTimeOff = content.includes('month') || content.includes('vacation') || content.includes('travel');

        if (goalKeywords.some(kw => content.includes(kw)) || (numberMatches && content.includes('shoot')) || (hasRevenue && hasTimeOff)) {
          answers['Goals & Ambitions'].push(msg.content);
        }
        if (timeKeywords.some(kw => content.includes(kw))) {
          answers['Current State'].push(msg.content);
        }
        if (bottleneckKeywords.some(kw => content.includes(kw))) {
          answers['Bottleneck & Challenges'].push(msg.content);
        }
        if (commitmentKeywords.some(kw => content.includes(kw))) {
          answers['Commitment & Timeline'].push(msg.content);
        }
        // Default: if short answer (< 20 words), likely answering current question
        if (content.split(' ').length < 20 && !content.includes('?')) {
          answers['Current Reality'].push(msg.content);
        }
      }

      // Build markdown summary
      let summary = '';
      for (const [category, items] of Object.entries(answers)) {
        if (items.length > 0) {
          summary += `\n**${category}:**\n`;
          // Dedupe and limit to 3 most recent per category
          const uniqueItems = Array.from(new Set(items)).slice(-3);
          for (const item of uniqueItems) {
            summary += `- ${item}\n`;
          }
        }
      }

      return summary.trim() || '(No answers yet - this is the first message)';
    }

    // Extract answers summary
    const answersSummary = extractAnswersFromHistory(history);

    // Build visible script section for current step
    const visibleScriptSection = buildVisibleScriptSection(step, calculatorData, conversationState?.userAskedAboutPrice);

    // Check if circuit breaker should activate
    const stepKey = `step_${step}`;
    const attemptCount = conversationState?.stepAttempts?.[stepKey] || 0;
    const circuitBreakerStatus = attemptCount >= 2
      ? `⚠️ WARNING: You've asked about this topic ${attemptCount + 1} times. If you ask about it again, the circuit breaker will force you to move on. Consider moving to the next question.`
      : '(Circuit breaker not activated - continue normally)';

    // Layer 1: Static system prompt (CACHED)
    const salesPrompt = MASTER_SALES_PROMPT
      .replace('{{VISIBLE_SCRIPT_SECTION}}', visibleScriptSection)
      .replace('{{QUESTIONS_ALREADY_ASKED}}', questionListText)
      .replace('{{ANSWERS_WE_HAVE}}', answersSummary)
      .replace('{{CIRCUIT_BREAKER_STATUS}}', circuitBreakerStatus)
      .replace('{{CURRENT_STEP}}', String(step))
      .replace('{{EXPECTED_NEXT_QUESTION}}', expectedNextQuestion);

    // Layer 2: Static knowledge base (CACHED)
    const knowledgeStart = Date.now();
    statusCallback?.('🗂️ loading knowledge base (codebase + intelligence)...');
    const knowledgeBase = await getStaticKnowledgeBase();
    const knowledgeTime = Date.now() - knowledgeStart;
    statusCallback?.(`✅ knowledge base loaded in ${knowledgeTime}ms`, knowledgeTime);

    // Combine Layers 1 & 2 (both cacheable)
    const staticInstructions = `${salesPrompt}\n\n${knowledgeBase}`;

    // Layer 3: Dynamic context (NOT CACHED)
    // This is passed as the dynamicContext parameter and already includes:
    // - User activity markdown
    // - Page visits
    // - Previous sessions
    // - Calculator data
    // - Section timing

    // Inject validation feedback if step was not advanced (AI needs to try again)
    let finalDynamicContext = dynamicContext;
    if (validationFeedback) {
      finalDynamicContext += `\n\n## ⚠️ CRITICAL VALIDATION FEEDBACK\n\n${validationFeedback}\n\nThe user's previous response did not qualify for advancing to the next step. You should ask the same question again, but:\n- Rephrase it for clarity\n- Provide more context or examples\n- Make it easier for the user to give a substantive answer\n- Stay friendly and conversational - don't be pushy\n\nRemember: You're trying to help them, not interrogate them.`;

      console.log(`[Chat] 🔄 Injecting validation feedback into prompt (step not advanced)`);
    }

    // Show what we're building the prompt with
    const historyTimestamp = history && history.length > 0
      ? new Date((history[history.length - 1] as any)?.timestamp || Date.now()).toLocaleTimeString()
      : 'none';
    const codeTimestamp = new Date().toLocaleTimeString(); // Code just loaded
    const promptSize = Math.round(staticInstructions.length / 1000);
    statusCallback?.(`📝 building ${promptSize}k char prompt with ${history.length} messages...`);

    // Build messages array - Layer 1+2 (static, cacheable), then Layer 3 (dynamic), then conversation
    const messages = [
      {
        role: 'system',
        content: staticInstructions, // Layers 1+2 (CACHEABLE): sales prompt + knowledge base (~150k tokens)
      },
      // Add dynamic context as separate system message if present
      ...(finalDynamicContext ? [{
        role: 'system' as const,
        content: finalDynamicContext, // Layer 3 (NOT CACHED): user-specific data
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

    // Initialize OpenAI client
    const openai = new OpenAI({ apiKey: openaiApiKey });

    // ============================================================================
    // CRITICAL: Using OpenAI Responses API (NOT Chat Completions API)
    // ============================================================================
    // The Responses API is OpenAI's NEW API primitive (introduced 2025)
    // It replaces Chat Completions as the recommended API for all new projects
    //
    // KEY DIFFERENCES from Chat Completions:
    // - Uses openai.responses.create() not openai.chat.completions.create()
    // - Uses "input" parameter (not "messages")
    // - Uses "text.format" for structured outputs (not "response_format")
    // - Built-in reasoning with reasoning.effort and reasoning.summary
    // - Built-in tools: web_search, file_search, code_interpreter, etc.
    // - Better prompt caching (40-80% improvement)
    // - Stateful by default with store: true
    //
    // WHY THIS API SPECIFICALLY:
    // 1. COST SAVINGS: 40-80% better prompt caching than Chat Completions
    // 2. SPEED: Reasoning tokens generated separately, faster responses
    // 3. MODERN: This is the current API, Chat Completions is legacy
    // 4. MODELS: Only gpt-5-nano/mini/5 work with this API (not gpt-4o)
    //
    // Models: gpt-5-nano, gpt-5-mini, gpt-5 (these are REAL 2025 models)
    // Default: gpt-5-nano (cheapest, fastest: $0.05/1M input, $0.40/1M output)
    //
    // DO NOT change this to:
    // ❌ openai.chat.completions.create() - deprecated, worse caching, no gpt-5-nano
    // ❌ gpt-4o or gpt-4o-mini - deprecated models that don't work with Responses API
    //
    // WHAT HAPPENS IF YOU CHANGE IT:
    // - Prompt caching will break (60-80% cost increase)
    // - gpt-5-nano will not work (model not found error)
    // - Reasoning blocks will not be captured (cache performance degrades)
    // - Streaming format changes (routes.ts expects specific format)
    //
    // See: https://platform.openai.com/docs/guides/responses
    // ============================================================================

    // ============================================================================
    // CONVERTING MESSAGES TO RESPONSES API INPUT FORMAT
    // ============================================================================
    // Responses API uses "input" parameter instead of "messages"
    // Each message becomes an input item with specific type fields:
    //
    // MESSAGE CONVERSION RULES:
    // - system role → user role with [SYSTEM CONTEXT] prefix (for caching)
    // - user role → user with input_text type
    // - assistant role → assistant with output_text type
    //
    // WHY CONVERT SYSTEM TO USER:
    // Responses API doesn't have a "system" role - instead, system context
    // is treated as user input that sets the stage for the conversation.
    // This is actually BETTER for caching because it groups all static
    // instructions together at the start of the input array.
    //
    // See: https://platform.openai.com/docs/guides/responses/input-format
    // ============================================================================
    const input: any[] = [];
    for (const msg of messages) {
      if (msg.role === 'system') {
        // System messages become user messages with [SYSTEM CONTEXT] marker
        // This enables better prompt caching (system context = cacheable prefix)
        input.push({
          role: 'user',
          content: [{ type: 'input_text', text: `[SYSTEM CONTEXT]\n${msg.content}` }]
        });
      } else if (msg.role === 'user') {
        input.push({
          role: 'user',
          content: [{ type: 'input_text', text: msg.content }]
        });
      } else if (msg.role === 'assistant') {
        input.push({
          role: 'assistant',
          content: [{ type: 'output_text', text: msg.content }]
        });
      }
    }

    // ============================================================================
    // REASONING BLOCKS FOR PROMPT CACHING (CRITICAL FOR PERFORMANCE)
    // ============================================================================
    // Responses API generates "reasoning blocks" - encrypted summaries of the
    // AI's internal thinking process. These blocks are OPAQUE (we can't read them)
    // but we can INCLUDE them in future requests for dramatic cache improvements.
    //
    // HOW IT WORKS:
    // 1. On turn 1: AI generates reasoning, returns encrypted_content
    // 2. We save that encrypted_content to database
    // 3. On turn 2+: We include previous encrypted blocks in the input
    // 4. OpenAI uses these to recognize the conversation and cache more aggressively
    //
    // IMPACT: 40-80% cache hit rate improvement (tested by OpenAI)
    //
    // DO NOT:
    // ❌ Try to decrypt or read reasoning blocks (they're encrypted)
    // ❌ Skip including previous blocks (cache performance degrades)
    // ❌ Include blocks from different conversations (cache pollution)
    //
    // See: https://platform.openai.com/docs/guides/responses/reasoning
    // ============================================================================
    if (previousReasoningBlocks && previousReasoningBlocks.length > 0) {
      console.log(`[Chat] 🧠 Including ${previousReasoningBlocks.length} previous reasoning blocks for prompt caching`);
      for (const block of previousReasoningBlocks) {
        input.push({
          role: 'assistant',
          content: [{ type: 'reasoning', encrypted_content: block }]
        });
      }
    }

    console.log(`[Chat] 🤖 Sending ${promptSize}k chars to OpenAI ${model} (Responses API)...`);
    statusCallback?.(`🤖 sending ${promptSize}k chars to OpenAI ${model}...`);
    const fetchStart = Date.now();
    console.log(`[Chat] ⏳ Calling Responses API with reasoning.effort: minimal...`);

    // ============================================================================
    // RESPONSES API CALL - PARAMETER DOCUMENTATION
    // ============================================================================
    // This is the CORRECT API call for gpt-5-nano streaming with prompt caching.
    //
    // PARAMETER BREAKDOWN:
    //
    // 1. model: 'gpt-5-nano' (default) | 'gpt-5-mini' | 'gpt-5'
    //    - MUST be a gpt-5 series model (gpt-4o will NOT work)
    //    - gpt-5-nano: Cheapest, fastest ($0.05/1M in, $0.40/1M out)
    //    - DO NOT change to gpt-4o or gpt-4o-mini (deprecated)
    //
    // 2. input: Array of input items (converted messages + reasoning blocks)
    //    - NOT "messages" (that's Chat Completions API parameter name)
    //    - Each item has role + content array with type fields
    //
    // 3. text.format: { type: 'text' }
    //    - Output format: plain text (not JSON schema)
    //    - For structured outputs, use { type: 'json_schema', json_schema: {...} }
    //
    // 4. text.verbosity: 'low'
    //    - Reduces verbose reasoning summaries in output
    //    - Makes responses more concise and faster
    //    - Options: 'low' | 'medium' | 'high'
    //
    // 5. reasoning.effort: 'minimal'
    //    - Controls how much "thinking" the AI does before responding
    //    - 'minimal' = fast, cheap, still intelligent (perfect for chat)
    //    - 'low' | 'medium' | 'high' = slower, more expensive, deeper reasoning
    //    - For sales chat, 'minimal' is optimal (fast responses matter more)
    //
    // 6. reasoning.summary: 'auto'
    //    - Auto-generate reasoning summaries (not shown to user)
    //    - Used internally for caching and quality
    //
    // 7. stream: true
    //    - ENABLE STREAMING (critical for UX)
    //    - Without this, user waits for full response (bad UX)
    //    - Streaming = tokens appear one-by-one (like ChatGPT)
    //
    // 8. store: true
    //    - ENABLE PROMPT CACHING (critical for cost/speed)
    //    - OpenAI stores the conversation for future cache hits
    //    - Without this, NO caching happens (40-80% cost increase)
    //    - NEVER set to false unless testing
    //
    // 9. include: ['reasoning.encrypted_content']
    //    - Return encrypted reasoning blocks in response
    //    - We save these to DB and include in future requests
    //    - Dramatically improves cache hit rates (40-80%)
    //
    // WHAT HAPPENS IF YOU CHANGE PARAMETERS:
    // ❌ model: 'gpt-4o' → Model not found error (gpt-4o doesn't work with Responses API)
    // ❌ stream: false → User waits 5-10 seconds for response (terrible UX)
    // ❌ store: false → No caching, 40-80% cost increase, slower responses
    // ❌ reasoning.effort: 'high' → Slower responses, higher cost, no benefit for chat
    // ❌ include: [] → No reasoning blocks returned, cache performance degrades
    //
    // See: https://platform.openai.com/docs/guides/responses/parameters
    // ============================================================================
    const response = await openai.responses.create({
      model, // gpt-5-nano by default
      input, // Array of input items (not "messages")
      text: {
        format: { type: 'text' }, // Text output (can also be json_schema for structured outputs)
        verbosity: 'low' // Reduce verbose reasoning summaries
      },
      reasoning: {
        effort: 'minimal', // Minimize thinking tokens for speed and cost
        summary: 'auto' // Auto-generate reasoning summaries
      },
      stream: true, // Enable streaming responses
      store: true, // Store response for prompt caching (critical for performance!)
      include: ['reasoning.encrypted_content'] // Include encrypted reasoning blocks for caching
    });

    // API responded successfully - convert async iterable to ReadableStream
    const apiTime = Date.now() - fetchStart;
    console.log(`[Chat] ✅ OpenAI Responses API connected after ${apiTime}ms (${(apiTime/1000).toFixed(1)}s)`);
    statusCallback?.(`✅ OpenAI responded in ${apiTime}ms`, apiTime);
    console.log(`[Chat] Stream ready with minimal reasoning, waiting for first token...`);
    statusCallback?.('⏳ waiting for AI to start streaming...');

    // ============================================================================
    // RESPONSES API STREAMING FORMAT
    // ============================================================================
    // Responses API streams chunks with a "type" field indicating the chunk type:
    //
    // Chunk types we care about:
    // - response.output_text.delta: Text content being streamed (has .delta field)
    // - response.output_text.done: Complete text output (has .text field)
    // - response.content_part.done: Reasoning block complete (has .part.encrypted_content)
    // - response.completed: Response finished (has .response.usage for token counts)
    //
    // We convert these to Chat Completions format for backwards compatibility
    // with the existing routes.ts code: { choices: [{ delta: { content } }], usage }
    // ============================================================================

    // Convert OpenAI SDK's async iterable to ReadableStream
    // Convert Responses API format to Chat Completions API format that routes.ts expects
    return new ReadableStream({
      async start(controller) {
        try {
          let chunkCount = 0;
          let textChunks = 0;
          let fullText = '';
          let reasoningBlocks: any[] = [];

          for await (const chunk of response) {
            chunkCount++;

            // Responses API chunks have different structure than Chat Completions
            // Convert to Chat Completions format: { choices: [{ delta: { content } }], usage }
            let convertedChunk: any = null;

            // Type assertion for chunks
            const chunkData = chunk as any;

            // Only log first few chunks to avoid spam
            if (chunkCount <= 5) {
              console.log(`[Chat] Received chunk type: ${chunkData.type}`);
            }

            // Handle text delta chunks (Responses API uses response.output_text.delta)
            // output_index 0 = reasoning, output_index 1 = text (we want the text)
            if (chunkData.type === 'response.output_text.delta' && chunkData.delta) {
              textChunks++;
              fullText += chunkData.delta;

              if (textChunks === 1) {
                console.log('[Chat] 🎉 First token received, streaming started');
              }

              // LOG TOKEN/CHUNK SIZE for debugging streaming behavior
              console.log(`[Chat] Token #${textChunks}: "${chunkData.delta}" (${chunkData.delta.length} chars)`);

              // Send all text chunks, regardless of output_index
              convertedChunk = {
                choices: [{
                  delta: { content: chunkData.delta }
                }]
              };
            }
            // Handle output_text.done (contains full text for this output item)
            else if (chunkData.type === 'response.output_text.done' && chunkData.text) {
              console.log(`[Chat] 📝 Output item ${chunkData.output_index} complete: ${chunkData.text.length} chars`);
              // Don't send - we already streamed the deltas
            }
            // Handle reasoning content (encrypted blocks)
            else if (chunkData.type === 'response.content_part.done' &&
                     chunkData.part?.type === 'reasoning' &&
                     chunkData.part?.encrypted_content) {
              console.log('[Chat] 🧠 Reasoning block captured (encrypted)');
              reasoningBlocks.push(chunkData.part.encrypted_content);
              // Don't stream reasoning to client
            }
            // Handle completion chunks
            else if (chunkData.type === 'response.completed' && chunkData.response) {
              console.log('[Chat] ✅ Response completed, extracting usage');
              convertedChunk = {
                choices: [{ delta: {}, finish_reason: 'stop' }]
              };

              // Add usage data
              if (chunkData.response.usage) {
                const totalResponseTime = Date.now() - fetchStart;
                convertedChunk.usage = {
                  prompt_tokens: chunkData.response.usage.input_tokens || 0,
                  completion_tokens: chunkData.response.usage.output_tokens || 0,
                  prompt_tokens_details: {
                    cached_tokens: chunkData.response.usage.input_tokens_cached || 0
                  }
                };

                // Track prompt caching metrics
                updatePromptCachingMetrics(model, convertedChunk.usage, totalResponseTime);

                const cachedTokens = convertedChunk.usage.prompt_tokens_details?.cached_tokens || 0;
                const cacheHitRate = cachedTokens > 0
                  ? ((cachedTokens / convertedChunk.usage.prompt_tokens) * 100).toFixed(1) + '%'
                  : '0%';
                const estimatedSavings = calculateCachedTokenSavings(model, cachedTokens);

                console.log('[Prompt Cache] Request completed:', {
                  model,
                  totalTokens: convertedChunk.usage.prompt_tokens + convertedChunk.usage.completion_tokens,
                  inputTokens: convertedChunk.usage.prompt_tokens,
                  cachedTokens,
                  outputTokens: convertedChunk.usage.completion_tokens,
                  cacheHitRate,
                  estimatedSavings: '$' + estimatedSavings.toFixed(6),
                  responseTime: totalResponseTime + 'ms',
                });

                console.log('[Chat] 💰 Usage:', convertedChunk.usage);
              }

              // Send reasoning blocks as metadata for routes.ts to store
              if (reasoningBlocks.length > 0) {
                console.log(`[Chat] 🧠 ${reasoningBlocks.length} reasoning blocks ready for caching`);
                // Send special metadata event with reasoning blocks
                convertedChunk.reasoning_blocks = reasoningBlocks;
              }
            }
            // Ignore other chunk types (don't log to avoid spam)
            else {
              continue; // Don't send empty chunks
            }

            // Only send chunks that have actual content
            if (convertedChunk) {
              const sseData = `data: ${JSON.stringify(convertedChunk)}\n\n`;
              controller.enqueue(new TextEncoder().encode(sseData));
            }
          }

          console.log(`[Chat] 🏁 Stream completed: ${textChunks} text chunks sent (${chunkCount} total chunks)`);
          console.log(`[Chat] 📊 Full response: ${fullText.length} chars`);
          controller.close();
        } catch (error) {
          console.error('[Chat] ❌ Stream error:', error);
          controller.error(error);
        }
      }
    });
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
