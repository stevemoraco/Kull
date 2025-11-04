// Chat service powered by OpenAI with GitHub repository integration
// Uses GPT-4o-mini for cost-effective, high-quality responses

import { getRepoContent } from './fetchRepo';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'developer';
  content: string;
}

// Instructions before repo content
const PROMPT_PREFIX = `You are customer support for this website.

Below is the complete codebase from github.com/stevemoraco/kull - use this as your source of truth.`;

// Instructions after repo content
const PROMPT_SUFFIX = `

INSTRUCTIONS:

1. EVERY response MUST start with a markdown link [text](url) - the page will auto-navigate to the first link
2. EVERY response MUST end with: FOLLOW_UP_QUESTIONS: followed by 4 natural, relevant follow-up questions separated by | (pipe character). Make these actual questions the user might want to ask next, NOT placeholders. Example format: "FOLLOW_UP_QUESTIONS: How do I install the app? | What plans are available? | Can I get a refund? | Where's the download link?"
3. Keep responses 2-4 paragraphs
4. Use markdown formatting (bold, italic, lists, etc)

Answer based on the codebase above.`;


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
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        instructions, // High-priority instructions with full repo content
        input, // Conversation history
        max_output_tokens: 500,
        stream: true,
      }),
    });

    if (!response.ok || !response.body) {
      const errorText = await response.text();
      console.error('[Chat] OpenAI API error:', errorText);
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

FOLLOW_UP_QUESTIONS: Refresh the page? | Try again later? | Contact support? | Visit homepage?`;
}
