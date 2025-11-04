// Chat service powered by OpenAI with GitHub repository integration
// Uses GPT-4o-mini for cost-effective, high-quality responses

import { getRepoContent } from './fetchRepo';
import { chatResponseJsonSchema } from './chatSchema';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'developer';
  content: string;
}

// Instructions before repo content
const PROMPT_PREFIX = `You are Kull customer support assistant with complete access to the website and GitHub repository.

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
- Example: [check out our pricing](https://kullai.com/pricing#enterprise) for details
- Analyze the HTML/components in the repo to find section IDs and anchor points
- Determine the correct page by analyzing the repository structure and routes
- **ONLY link to GitHub if the user specifically asks a technical/code question**

Below is the complete codebase from github.com/stevemoraco/kull which is deployed at https://kullai.com:`;

// Instructions after repo content
const PROMPT_SUFFIX = `

NAVIGATION SUPERPOWER:
**When you include a link to https://kullai.com in your response, the page will AUTOMATICALLY navigate there.**
- This is a FEATURE you can use to guide users around the site while you explain
- Think of it like a tour guide - you can show them the pricing page while explaining costs, features page while listing capabilities, etc.
- The first link in your response triggers navigation to that page
- Use hash anchors (#section-id) to jump directly to relevant sections
- The user stays in the SAME TAB - don't worry about disrupting their flow
- This makes your explanations interactive and visual

RESPONSE FORMAT:

1. **YOUR ANSWER (2-4 paragraphs):**
   - Answer the user's question thoroughly and naturally
   - Use markdown formatting (bold, italic, lists)
   - **Include relevant links to show them around** - remember, they'll navigate automatically!
   - Insert links naturally where they add value (e.g., "Let me show you [our pricing options](https://kullai.com/pricing#professional)")
   - Use FULL URLs with https://kullai.com domain (NOT relative paths like /pricing)
   - **USE HASH FRAGMENTS (#) to jump to specific sections** (analyze the HTML/JSX for id attributes)
   - Reference specific features, code, or documentation from the repository

   Examples of good link usage:
   - "Here's [how the AI culling works](https://kullai.com/features#ai-culling)" ← Takes them to features page, scrolls to AI section
   - "Check out [our Professional tier](https://kullai.com/pricing#professional)" ← Shows pricing, highlights that tier
   - "The [installation guide](https://kullai.com/docs#installation) walks through setup" ← Opens docs at exact section

2. **END - FOLLOW-UP QUESTIONS & TIMING (REQUIRED):**
   - You MUST end with these TWO lines:

   ␞FOLLOW_UP_QUESTIONS: question1 | question2 | question3 | question4
   ␞NEXT_MESSAGE: 45

   - CRITICAL: Start each line with the exact character "␞" (Unicode U+241E)
   - FOLLOW_UP_QUESTIONS: Provide exactly 4 relevant follow-up questions separated by |
   - NEXT_MESSAGE: Number of seconds until your next proactive message (20-60 seconds recommended)
   - Make questions actual natural questions, NOT placeholders

REMEMBER:
- Links are your superpower - use them strategically to enhance your explanation
- Every response should include relevant links when they add value (don't force them if unnecessary)
- Avoid linking to GitHub unless the user asks a technical/code question
- Determine the correct URL by analyzing the repository structure and frontend routes

Answer based on the codebase provided above.`;


// Helper to build full prompt markdown for debugging
export async function buildFullPromptMarkdown(
  userMessage: string,
  history: ChatMessage[]
): Promise<string> {
  const repoContent = await getRepoContent();
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
