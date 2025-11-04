// Chat service powered by OpenAI with GitHub repository integration
// Uses GPT-4o-mini for cost-effective, high-quality responses

import { getRepoContent } from './fetchRepo';
import { chatResponseJsonSchema } from './chatSchema';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'developer';
  content: string;
}

// Instructions before repo content
const PROMPT_PREFIX = `You are Kull AI customer support assistant with complete access to the website and GitHub repository.

**CRITICAL DEPLOYMENT INFO:**
- This GitHub repository is deployed LIVE at **https://kullai.com**
- The codebase you see below IS the actual website running at kullai.com
- NEVER link to github.com/stevemoraco/kull in your responses
- ALWAYS link to https://kullai.com pages instead

**YOUR FIRST LINE MUST:**
- Be a markdown link to a relevant kullai.com page: [text](https://kullai.com/path)
- Navigate users to the WEBSITE page that shows what you're explaining
- Determine the correct page by analyzing the repository structure and routes
- **USE HASH ANCHORS (#section-id) to jump directly to the relevant section** when possible
- Analyze the HTML/components in the repo to find section IDs and anchor points

Below is the complete codebase from github.com/stevemoraco/kull which is deployed at https://kullai.com:`;

// Instructions after repo content
const PROMPT_SUFFIX = `

RESPONSE FORMAT (FOLLOW EXACTLY):

1. **FIRST LINE - NAVIGATION LINK (REQUIRED):**
   - You MUST start your response with a markdown link: [descriptive text](URL)
   - The URL MUST be a kullai.com website page, NOT a GitHub link
   - Use FULL URLs with https://kullai.com domain
   - **USE HASH FRAGMENTS (#) to navigate to specific sections** when answering about particular features, pricing tiers, or page sections
   - **ONLY link to GitHub if the user specifically asks a technical/code question**
   - Analyze the repository to determine which pages exist and link to the most relevant one
   - Search the HTML/JSX for id attributes and section markers to find exact anchor points
   - The page will auto-navigate to this link immediately and scroll to the anchor
   - This link must show the user the EXACT information you're discussing on the LIVE WEBSITE

2. **BODY - YOUR ANSWER (2-4 paragraphs):**
   - Answer the user's question thoroughly
   - Use markdown formatting (bold, italic, lists)
   - Reference specific features, code, or documentation from the repository

3. **END - FOLLOW-UP QUESTIONS (REQUIRED):**
   - You MUST end with: ␞FOLLOW_UP_QUESTIONS: question1 | question2 | question3 | question4
   - CRITICAL: Start with the exact character "␞" (Unicode U+241E)
   - Provide exactly 4 relevant follow-up questions separated by |
   - Make these actual natural questions, NOT placeholders

REMEMBER:
- Always link to https://kullai.com pages (NOT GitHub) unless the user asks a technical question about code
- Determine the correct URL by analyzing the repository structure and frontend routes
- Use full https://kullai.com URLs

Answer based on the codebase provided above.`;


export async function getChatResponseStream(
  userMessage: string,
  history: ChatMessage[]
): Promise<ReadableStream> {
  const openaiApiKey = process.env.OPENAI_API_KEY;

  if (!openaiApiKey) {
    console.log('[Chat] OpenAI API key not configured');
    const errorMsg = getErrorResponse();
    return createErrorStream(errorMsg);
  }

  try {
    // Fetch repo content (cached per session)
    const repoContent = await getRepoContent();

    // Build full instructions with repo content
    const instructions = `${PROMPT_PREFIX}\n\n${repoContent}\n\n${PROMPT_SUFFIX}`;

    // Build input array with conversation history (no system prompt in input)
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

    console.log(`[Chat] Sending request with ${instructions.length} chars of instructions (includes repo), ${input.length} messages in history`);

    // Call OpenAI Responses API with streaming
    // TODO: Re-enable structured outputs after debugging
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-mini',
        instructions, // High-priority instructions with full repo content
        input, // Conversation history
        max_output_tokens: 8000, // Generous limit for detailed responses
        stream: true,
        /* Temporarily disabled - debugging streaming
        text: {
          format: {
            type: 'json_schema',
            name: 'chat_response',
            schema: chatResponseJsonSchema,
            strict: true,
          },
        },
        */
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
