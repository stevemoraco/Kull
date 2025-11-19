// Conversation state management for sales script tracking
import type { ConversationState, QuestionRecord, AnswerRecord } from './storage';

// Sales script steps mapping
const SALES_SCRIPT_STEPS = {
  CURRENT_REALITY: 1,
  VALIDATE_AMBITION: 2,
  CURRENT_WORKLOAD: 3,
  CHALLENGE_GROWTH: 4,
  QUESTION_WORKFLOW: 5,
  GET_SPECIFIC_TARGETS: 6,
  DIG_MOTIVATION: 7,
  PAINT_OUTCOME: 8,
  IDENTIFY_BOTTLENECK: 9,
  POSITION_SOLUTION: 10,
  GAUGE_COMMITMENT: 11,
  CREATE_URGENCY: 12,
  INTRODUCE_PRICE: 13,
  STATE_PRICE: 14,
  DISCOUNT_CLOSE: 15
};

// Question patterns for each step
const STEP_QUESTION_PATTERNS: Record<number, RegExp[]> = {
  1: [/goal for next year/i, /how many shoots.*next year/i, /target.*next year/i],
  2: [/happy with that/i, /satisfied with.*number/i, /is that enough/i],
  3: [/how many hours.*working/i, /hours.*per week/i, /weekly.*hours/i],
  4: [/how.*grow.*without/i, /plan.*increase.*without/i, /expand.*without/i],
  5: [/current workflow/i, /existing.*process/i, /how.*doing.*now/i],
  6: [/actual target/i, /specific.*goal/i, /what.*exactly.*want/i],
  7: [/why.*goal/i, /what.*motivates/i, /reason.*target/i],
  8: [/what changes/i, /impact.*life/i, /what.*different/i],
  9: [/what.*kept you/i, /blocking.*you/i, /preventing.*from/i],
  10: [/specialize in/i, /removing.*block/i, /this is what i do/i],
  11: [/how committed/i, /1.{0,2}10/i, /rate.*commitment/i],
  12: [/when.*want.*fixed/i, /timeline/i, /when.*need/i],
  13: [/want.*price/i, /ready.*pricing/i, /see.*cost/i],
  14: [/everyday price/i, /price is/i, /\$\d+/],
  15: [/discount/i, /commit.*goal/i, /special.*offer/i]
};

// Answer patterns for common responses
interface AnswerPattern {
  pattern: RegExp;
  extractValue: (match: RegExpMatchArray) => string;
}

const ANSWER_PATTERNS: AnswerPattern[] = [
  // Numeric goals (shoots, revenue, hours)
  {
    pattern: /(\d+)\s*(shoots?|sessions?|bookings?)/i,
    extractValue: (match) => `${match[1]} ${match[2]}`
  },
  {
    pattern: /\$\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
    extractValue: (match) => `$${match[1]}`
  },
  {
    pattern: /(\d+)\s*(hours?|weeks?|days?)/i,
    extractValue: (match) => `${match[1]} ${match[2]}`
  },
  // Yes/No responses
  {
    pattern: /\b(yes|yeah|yep|sure|definitely|absolutely)\b/i,
    extractValue: (match) => match[1].toLowerCase()
  },
  {
    pattern: /\b(no|nope|not really|nah)\b/i,
    extractValue: (match) => match[1].toLowerCase()
  },
  // Commitment ratings (1-10)
  {
    pattern: /\b([1-9]|10)\b/,
    extractValue: (match) => match[1]
  },
  // Time-based responses
  {
    pattern: /\b(now|asap|immediately|today|this week|next week|next month)\b/i,
    extractValue: (match) => match[1].toLowerCase()
  }
];

/**
 * Detects which step a question belongs to
 */
export function detectQuestionStep(question: string): number | null {
  for (const [step, patterns] of Object.entries(STEP_QUESTION_PATTERNS)) {
    if (patterns.some(pattern => pattern.test(question))) {
      return parseInt(step);
    }
  }
  return null;
}

/**
 * Extracts an answer from user message based on the last question asked
 */
export function extractAnswer(userMessage: string, lastQuestion: QuestionRecord | undefined): string | null {
  if (!lastQuestion) return null;

  const message = userMessage.trim();

  // Try each answer pattern
  for (const { pattern, extractValue } of ANSWER_PATTERNS) {
    const match = message.match(pattern);
    if (match) {
      return extractValue(match);
    }
  }

  // If no pattern matches but message is short (< 100 chars), use it as-is
  // This captures freeform responses like "I want more time with my family"
  if (message.length < 100 && message.length > 0) {
    return message;
  }

  return null;
}

/**
 * Detects if a message is off-topic (not related to sales conversation)
 */
export function isOffTopic(userMessage: string, conversationState: ConversationState): boolean {
  const message = userMessage.toLowerCase();

  // Check for common off-topic indicators
  const offTopicPatterns = [
    /how does.*work/i,
    /what is.*feature/i,
    /can you.*help.*with/i,
    /support/i,
    /technical.*issue/i,
    /bug/i,
    /error/i,
    /problem.*with/i,
    /how.*use/i,
    /tutorial/i,
    /documentation/i,
    /demo/i
  ];

  // If user is asking technical/support questions instead of answering
  if (offTopicPatterns.some(pattern => pattern.test(message))) {
    return true;
  }

  // If user hasn't answered recent questions and keeps asking unrelated things
  if (conversationState.questionsAsked.length > conversationState.questionsAnswered.length + 2) {
    return true;
  }

  return false;
}

/**
 * Updates conversation state after processing AI response and user message
 */
export function updateStateAfterInteraction(
  currentState: ConversationState,
  userMessage: string,
  aiResponse: string
): ConversationState {
  const now = new Date();

  // Check if AI asked a new question
  const aiQuestionMatch = aiResponse.match(/(what|how|why|when|do you|are you|is|would you)[^.?!]*[?]/i);
  const aiQuestion = aiQuestionMatch ? aiQuestionMatch[0].trim() : null;

  // Detect which step this question belongs to
  let detectedStep = currentState.currentStep;
  if (aiQuestion) {
    const stepFromQuestion = detectQuestionStep(aiQuestion);
    if (stepFromQuestion !== null) {
      detectedStep = stepFromQuestion;
    }
  }

  // Check if user answered the last question
  const lastQuestion = currentState.questionsAsked[currentState.questionsAsked.length - 1];
  const extractedAnswer = extractAnswer(userMessage, lastQuestion);

  // Check if message is off-topic
  const messageIsOffTopic = isOffTopic(userMessage, currentState);

  const newState: ConversationState = {
    questionsAsked: [...currentState.questionsAsked],
    questionsAnswered: [...currentState.questionsAnswered],
    currentStep: detectedStep,
    offTopicCount: messageIsOffTopic ? currentState.offTopicCount + 1 : currentState.offTopicCount
  };

  // Add new question if detected
  if (aiQuestion) {
    newState.questionsAsked.push({
      step: detectedStep,
      question: aiQuestion,
      timestamp: now
    });
  }

  // Add answer if detected
  if (extractedAnswer && lastQuestion) {
    newState.questionsAnswered.push({
      step: lastQuestion.step,
      question: lastQuestion.question,
      answer: extractedAnswer,
      timestamp: now
    });

    // Advance to next step after answer
    if (newState.currentStep < 15) {
      newState.currentStep = detectedStep + 1;
    }
  }

  return newState;
}

/**
 * Generates context string to pass to AI about conversation state
 */
export function generateStateContext(state: ConversationState): string {
  const answeredCount = state.questionsAnswered.length;
  const askedCount = state.questionsAsked.length;
  const unansweredCount = askedCount - answeredCount;

  let context = `\n\n## 📊 Conversation State\n`;
  context += `- **Current Script Step:** ${state.currentStep}/15\n`;
  context += `- **Questions Asked:** ${askedCount}\n`;
  context += `- **Questions Answered:** ${answeredCount}\n`;
  context += `- **Unanswered Questions:** ${unansweredCount}\n`;
  context += `- **Off-Topic Messages:** ${state.offTopicCount}\n`;

  if (state.offTopicCount > 3) {
    context += `\n⚠️ **User is going off-topic frequently.** Acknowledge this playfully: "I know we're jumping around! That's cool. Let me just grab a few quick details: [question]"\n`;
  }

  if (state.questionsAnswered.length > 0) {
    context += `\n### Answers Collected So Far:\n`;
    state.questionsAnswered.forEach((answer, idx) => {
      context += `${idx + 1}. **Step ${answer.step}**: "${answer.question}" → "${answer.answer}"\n`;
    });
  }

  if (unansweredCount > 0) {
    context += `\n### Pending Answers:\n`;
    const unanswered = state.questionsAsked.slice(-unansweredCount);
    unanswered.forEach((q, idx) => {
      context += `${idx + 1}. **Step ${q.step}**: "${q.question}"\n`;
    });
  }

  return context;
}
