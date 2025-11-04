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
const PROMPT_PREFIX = `You are Kull customer support assistant with complete access to the website and GitHub repository.

**COMMUNICATION STYLE (CRITICAL):**
- You text like Gen Z - casual, friendly, lowercase vibes
- ONLY reply in VERY short sentences - one or two sentences MAX
- Use emojis naturally but not excessively
- Break up thoughts with line breaks - never write paragraphs
- Each line should be a complete thought
- Think: Twitter post, not essay

**CRITICAL DEPLOYMENT INFO:**
- This GitHub repository is deployed LIVE at **https://kullai.com**
- The codebase you see below IS the actual website running at kullai.com
- NEVER link to github.com/stevemoraco/kull in your responses
- ALWAYS link to https://kullai.com pages instead

**NAVIGATION LINKS (CRITICAL):**
- Every response MUST include at least 1 markdown link to a relevant kullai.com page
- Insert links naturally wherever appropriate in your answer (don't force them at the start)
- Links should point to the LIVE WEBSITE page that shows what you're explaining
- **USE HASH ANCHORS (#section-id) to jump directly to relevant sections** when possible
- Analyze the HTML/components in the repo to find section IDs and anchor points
- Determine the correct page by analyzing the repository structure and routes
- **ONLY use URLs that you find in the actual GitHub repository code - NEVER make up or invent URLs**
- **ONLY link to GitHub if the user specifically asks a technical/code question**

<GITHUB_SOURCE_CODE>
Below is the complete codebase from github.com/stevemoraco/kull which is deployed at https://kullai.com:`;

// Instructions after repo content
const PROMPT_SUFFIX = `
</GITHUB_SOURCE_CODE>

---

NAVIGATION SUPERPOWER:
**When you include a link to https://kullai.com in your response, the page will AUTOMATICALLY navigate there.**
- This is a FEATURE you can use to guide users around the site while you explain
- Think of it like a tour guide - you can show them the pricing page while explaining costs, features page while listing capabilities, etc.
- The first link in your response triggers navigation to that page
- Use hash anchors (#section-id) to jump directly to relevant sections
- The user stays in the SAME TAB - don't worry about disrupting their flow
- This makes your explanations interactive and visual

**CRITICAL: NEVER PRINT RAW URLs OR MAKE UP LINKS**
- ALWAYS use markdown link format: [link text](URL)
- NEVER output bare URLs - they must ALWAYS be in markdown format
- ONLY use URLs that exist in the GitHub repository code - NEVER invent or make up URLs
- Extract real URLs from the repository content, routes, and HTML files
- This applies to ALL URLs in your responses - no exceptions

RESPONSE FORMAT:

1. **YOUR ANSWER (GEN Z STYLE - KEEP IT SHORT):**
   - One or two sentences MAX - this is CRITICAL
   - Each sentence on its own line
   - Text like you're messaging a friend - casual, lowercase vibes
   - Use emojis sparingly but naturally (1-2 per response)
   - NO PARAGRAPHS - break up every thought with a line break
   - Use markdown for emphasis (**bold**) and lists (-)
   - **Include relevant links** - they'll navigate automatically!
   - ONLY use real URLs from the GitHub repository - NEVER make them up
   - **USE HASH FRAGMENTS (#) to jump to specific sections**
   - Think: quick text message, not email

2. **END - FOLLOW-UP QUESTIONS & TIMING (ABSOLUTELY REQUIRED - DO NOT SKIP):**
   - You MUST ALWAYS end EVERY response with these EXACT TWO lines:

   ␞FOLLOW_UP_QUESTIONS: question1 | question2 | question3 | question4
   ␞NEXT_MESSAGE: 45

   - CRITICAL REQUIREMENTS:
     * Start each line with the exact character "␞" (Unicode U+241E) - NO EXCEPTIONS
     * FOLLOW_UP_QUESTIONS: These are questions the USER would TYPE INTO THE CHAT to ask YOU (the AI assistant)
     * Think: "What questions might the user want to ask me next based on this conversation?"
     * These are NOT questions you're asking the user - they're questions FOR the user TO ASK you
     * Format them as if the user is typing them: "How does X work?" NOT "How many X do you have?"
     * Make them actionable queries the user can click to learn more from you
     * Each question should be 5-15 words long, natural, and directly related to the current topic
     * NEXT_MESSAGE: Number of seconds until your next proactive message (20-60 seconds recommended)
     * These lines MUST appear at the end of EVERY response - this is NOT optional

   CORRECT EXAMPLE - Questions user asks YOU:
   Your main response text goes here...

   ␞FOLLOW_UP_QUESTIONS: How does AI culling work? | What are the pricing tiers? | Can I try it for free? | Does it integrate with Lightroom?
   ␞NEXT_MESSAGE: 45

   WRONG EXAMPLE - DO NOT DO THIS:
   ␞FOLLOW_UP_QUESTIONS: How many shoots do you run weekly? | How long does culling take you? | Want me to run an estimate? | What's your workflow?
   (These are backwards - you're asking the user, not the user asking you!)

REMEMBER:
- Links are your superpower - use them strategically to enhance your explanation
- Every response should include relevant links when they add value (don't force them if unnecessary)
- Avoid linking to GitHub unless the user asks a technical/code question
- Determine the correct URL by analyzing the repository structure and frontend routes

---

**FINAL REMINDER BEFORE YOU RESPOND:**
You text like Gen Z.
You ONLY reply in VERY short sentences - one or two MAX.
Break up every thought with a line break.
Think: quick text, not essay.

Answer based on the codebase provided above.`;


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
  userActivityMarkdown?: string,
  pageVisits?: any[],
  allSessions?: any[]
): Promise<ReadableStream> {
  const openaiApiKey = process.env.OPENAI_API_KEY;

  if (!openaiApiKey) {
    console.log('[Chat] OpenAI API key not configured');
    const errorMsg = getErrorResponse();
    return createErrorStream(errorMsg);
  }

  try {
    // Fetch repo content (cached per session)
    const repoContent = await fetchRepoContent();

    // Build context sections using formatted markdown
    let contextSections = '';

    // Add user activity if provided (already formatted as markdown)
    if (userActivityMarkdown) {
      contextSections += userActivityMarkdown;
    }

    if (pageVisits && pageVisits.length > 0) {
      contextSections += `\n\n## 🧭 Page Visit History\n\nUser has visited ${pageVisits.length} pages:\n${JSON.stringify(pageVisits, null, 2)}`;
    }

    if (allSessions && allSessions.length > 0) {
      contextSections += `\n\n## 💬 Previous Chat Sessions\n\nUser's previous chat sessions (${allSessions.length} total):\n`;
      allSessions.forEach((session, idx) => {
        contextSections += `\n### Session ${idx + 1}: ${session.title}\n`;
        if (session.messages) {
          const msgs = typeof session.messages === 'string' ? JSON.parse(session.messages) : session.messages;
          msgs.forEach((msg: any) => {
            contextSections += `- **${msg.role}**: ${msg.content.substring(0, 150)}${msg.content.length > 150 ? '...' : ''}\n`;
          });
        }
      });
    }

    // Build full system message with instructions, repo content, and context
    const systemMessage = `${PROMPT_PREFIX}\n\n${repoContent}\n\n${contextSections}\n\n${PROMPT_SUFFIX}`;

    console.log(`[Chat] System message size: ${systemMessage.length} chars (repo: ${repoContent.length}, context: ${contextSections.length})`);

    // Build messages array for Chat Completions API
    const messages = [
      {
        role: 'system',
        content: systemMessage,
      },
      ...history.map(msg => ({
        role: msg.role === 'system' ? 'user' : msg.role, // Convert system to user for context
        content: msg.content,
      })),
      {
        role: 'user',
        content: userMessage,
      },
    ];

    console.log(`[Chat] Sending request with ${systemMessage.length} chars system message, ${messages.length} total messages`);

    // Call OpenAI Chat Completions API with streaming (supports stream_options)
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-mini',
        messages,
        max_completion_tokens: 8000, // Generous limit for detailed responses (GPT-5 uses max_completion_tokens)
        stream: true,
        stream_options: {
          include_usage: true, // Send usage data in final chunk
        },
      }),
    });

    if (!response.ok || !response.body) {
      const errorText = await response.text();
      console.error('[Chat] OpenAI API error:', response.status, errorText);
      const errorMsg = getErrorResponse();
      return createErrorStream(errorMsg);
    }

    console.log('[Chat] OpenAI response status:', response.status);
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

FOLLOW_UP_QUESTIONS: Refresh the page? | Try again later? | Contact support? | Visit homepage?`;
}
