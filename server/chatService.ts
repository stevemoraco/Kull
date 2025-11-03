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
2. EVERY response MUST end with: FOLLOW_UP_QUESTIONS: Question 1? | Question 2? | Question 3? | Question 4?
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

    // Build system prompt with repo content
    const systemPrompt = `${PROMPT_PREFIX}\n\n${repoContent}\n\n${PROMPT_SUFFIX}`;

    // Build messages array for Responses API
    const input = [
      {
        role: 'developer',
        content: systemPrompt,
      },
      ...history.slice(-10).map(msg => ({
        role: msg.role === 'system' ? 'developer' : msg.role,
        content: msg.content,
      })),
      {
        role: 'user',
        content: userMessage,
      },
    ];

    // Call OpenAI Responses API with streaming
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        input,
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

// Export streaming version for future use
export async function getChatResponseStream(
  userMessage: string,
  history: ChatMessage[]
): Promise<ReadableStream> {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  
  if (!openaiApiKey) {
    // Return error as stream
    const errorMessage = getErrorResponse();
    return new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(errorMessage));
        controller.close();
      },
    });
  }

  // Fetch repo content (cached per session)
  const repoContent = await getRepoContent();

  // Build system prompt with repo content
  const systemPrompt = `${PROMPT_PREFIX}\n\n${repoContent}\n\n${PROMPT_SUFFIX}`;

  // Build messages array with system prompt
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: systemPrompt,
    },
    ...history.slice(-10),
    {
      role: 'user',
      content: userMessage,
    },
  ];

  // Call OpenAI API with streaming
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.7,
      max_tokens: 500,
      stream: true,
    }),
  });

  if (!response.ok || !response.body) {
    const errorMessage = getErrorResponse();
    return new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(errorMessage));
        controller.close();
      },
    });
  }

  return response.body;
}
