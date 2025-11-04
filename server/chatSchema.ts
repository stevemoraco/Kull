// Zod schema for structured chat responses
import { z } from 'zod';

export const ChatResponseSchema = z.object({
  navigationUrl: z.string().describe('A markdown link URL that the page will auto-navigate to. Must be a valid URL from the Kull AI website or documentation.'),
  responseText: z.string().describe('The main response text in markdown format. Should be 2-4 paragraphs with proper formatting (bold, italic, lists, etc).'),
  followUpQuestions: z.array(z.string()).length(4).describe('Exactly 4 natural, relevant follow-up questions the user might want to ask next. Make these actual questions, NOT placeholders.')
});

export type ChatResponse = z.infer<typeof ChatResponseSchema>;

// JSON Schema for OpenAI Responses API
export const chatResponseJsonSchema = {
  type: 'object' as const,
  properties: {
    navigationUrl: {
      type: 'string',
      description: 'A markdown link URL that the page will auto-navigate to. Must be a valid URL from the Kull AI website or documentation.'
    },
    responseText: {
      type: 'string',
      description: 'The main response text in markdown format. Should be 2-4 paragraphs with proper formatting (bold, italic, lists, etc).'
    },
    followUpQuestions: {
      type: 'array',
      description: 'Exactly 4 natural, relevant follow-up questions the user might want to ask next. Make these actual questions, NOT placeholders.',
      items: {
        type: 'string'
      },
      minItems: 4,
      maxItems: 4
    }
  },
  required: ['navigationUrl', 'responseText', 'followUpQuestions'],
  additionalProperties: false
};
