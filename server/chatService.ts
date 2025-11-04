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

CRITICAL: Your FIRST line must ALWAYS be a markdown link that navigates to the most relevant page on the Kull AI website that shows what your answer is about.

Below is the complete codebase from github.com/stevemoraco/kull - use this as your source of truth.`;

// Instructions after repo content
const PROMPT_SUFFIX = `

RESPONSE FORMAT (FOLLOW EXACTLY):

1. **FIRST LINE - NAVIGATION LINK (REQUIRED):**
   - You MUST start your response with a markdown link: [descriptive text](URL)
   - The URL must be the most relevant page from the Kull AI website that shows what you're about to explain
   - Examples:
     * For pricing questions: [View our pricing plans](/pricing)
     * For installation questions: [Download Kull AI](/dashboard)
     * For trial questions: [Manage your subscription](/dashboard)
     * For feature questions: [See Kull AI features](/)
   - The page will auto-navigate to this link immediately
   - This link must show the user the information you're discussing

2. **BODY - YOUR ANSWER (2-4 paragraphs):**
   - Answer the user's question thoroughly
   - Use markdown formatting (bold, italic, lists)
   - Reference specific features, code, or documentation from the repository

3. **END - FOLLOW-UP QUESTIONS (REQUIRED):**
   - You MUST end with: ␞FOLLOW_UP_QUESTIONS: question1 | question2 | question3 | question4
   - CRITICAL: Start with the exact character "␞" (Unicode U+241E)
   - Provide exactly 4 relevant follow-up questions separated by |
   - Make these actual natural questions, NOT placeholders

EXAMPLE RESPONSE:
[View our pricing plans](/pricing)

Our pricing is designed to be simple and transparent. We offer a **14-day free trial** for all new users to explore Kull AI's features. After your trial, you can choose between our monthly or annual subscription plans.

The trial includes full access to all AI models, unlimited photo ratings, and all premium features. You won't be charged until the trial period ends, and you can cancel anytime before then.

␞FOLLOW_UP_QUESTIONS: How do I cancel my trial? | What payment methods do you accept? | Can I switch plans later? | Do you offer refunds?

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
        model: 'gpt-4o-mini',
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
