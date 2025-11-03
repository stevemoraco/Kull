// Chat service powered by OpenAI with GitHub repository integration
// Uses GPT-4o-mini for cost-effective, high-quality responses

import { getRepoContent } from './fetchRepo';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
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


export async function getChatResponse(
  userMessage: string,
  history: ChatMessage[]
): Promise<{ message: string; tokensIn: number; tokensOut: number; cost: number }> {
  const openaiApiKey = process.env.OPENAI_API_KEY;

  if (!openaiApiKey) {
    console.log('[Chat] OpenAI API key not configured');
    const errorMsg = getErrorResponse();
    return { message: errorMsg, tokensIn: 0, tokensOut: 0, cost: 0 };
  }

  try {
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
      ...history.slice(-10), // Keep last 10 messages for context
      {
        role: 'user',
        content: userMessage,
      },
    ];

    // Call OpenAI API
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
        stream: false, // We'll implement streaming in the next iteration
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Chat] OpenAI API error:', errorText);
      const errorMsg = getErrorResponse();
      return { message: errorMsg, tokensIn: 0, tokensOut: 0, cost: 0 };
    }

    const data = await response.json();
    const assistantMessage = data.choices[0]?.message?.content;
    const usage = data.usage;

    if (!assistantMessage) {
      const errorMsg = getErrorResponse();
      return { message: errorMsg, tokensIn: 0, tokensOut: 0, cost: 0 };
    }

    // Calculate cost based on GPT-4o-mini pricing
    // Input: $0.150 / 1M tokens, Output: $0.600 / 1M tokens
    const tokensIn = usage?.prompt_tokens || 0;
    const tokensOut = usage?.completion_tokens || 0;
    const costIn = (tokensIn / 1_000_000) * 0.150;
    const costOut = (tokensOut / 1_000_000) * 0.600;
    const totalCost = costIn + costOut;

    console.log(`[Chat] Response generated: ${tokensIn} tokens in, ${tokensOut} tokens out, $${totalCost.toFixed(6)} cost`);

    return {
      message: assistantMessage,
      tokensIn,
      tokensOut,
      cost: totalCost,
    };
  } catch (error) {
    console.error('[Chat] Error calling OpenAI:', error);
    const errorMsg = getErrorResponse();
    return { message: errorMsg, tokensIn: 0, tokensOut: 0, cost: 0 };
  }
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
