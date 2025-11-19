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
 * Determines if the user has answered the question for the current step
 * and should progress to the next step.
 *
 * @param userMessage - The user's latest message
 * @param assistantQuestion - The last question the assistant asked
 * @param currentStep - The current script step (1-15)
 * @returns true if should progress to next step
 */
export function shouldProgressToNextStep(
  userMessage: string,
  assistantQuestion: string,
  currentStep: number
): boolean {
  if (!userMessage || typeof userMessage !== 'string') {
    return false;
  }

  const messageLower = userMessage.toLowerCase().trim();
  const wordCount = messageLower.split(/\s+/).length;

  // Step 1: User confirmed/denied annual shoots
  if (currentStep === 1) {
    const confirmsOrDenies = /\b(yes|no|right|wrong|correct|accurate|more|fewer|less|adjust|that'?s|about)\b/i.test(messageLower);
    const isSubstantive = wordCount >= 5;

    // Progress if they confirm/deny OR give a substantive response
    return confirmsOrDenies || isSubstantive;
  }

  // Step 2: User said if happy with number
  if (currentStep === 2) {
    const answersHappiness = /\b(yes|no|happy|unhappy|want|grow|fine|good|more|great|satisfied|content|enough|need)\b/i.test(messageLower);
    return answersHappiness || wordCount >= 3;
  }

  // Step 3-15: Default progression logic
  // Progress if response is substantive (>3 words) and not a question
  const isQuestion = messageLower.includes('?');
  const isSubstantive = wordCount >= 3;

  return !isQuestion && isSubstantive;
}

/**
 * Get the next question template for a given step
 */
export function getNextQuestion(step: number, calculatorData?: any): string {
  const questions: Record<number, string> = {
    1: calculatorData?.annualShoots
      ? `i see you're doing about ${calculatorData.annualShoots} shoots a year — is that accurate?`
      : "what's your goal for annual shoots next year?",
    2: "are you happy with that number?",
    3: "how many hours are you working each week right now?",
    4: "do you know how you'll grow those numbers without hiring or working more?",
    5: "how do you expect to do that with your current workflow?",
    6: "what's your actual target for annual shoots, revenue, or time off?",
    7: "why that specific goal?",
    8: "what changes in your business or life when you hit it?",
    9: "what's kept you from hitting that already?",
    10: "this is exactly what i specialize in: removing the workflow block that's keeping you from those numbers.",
    11: "how committed are you to hitting that? 1–10.",
    12: "when do you want this fixed so you can hit those numbers?",
    13: "want the price?",
    14: calculatorData?.annualCost
      ? `everyday price is $${calculatorData.annualCost}/year to solve exactly the problem you just described.`
      : "everyday price is based on your usage.",
    15: "alright — if you'll commit to the goal you told me, i'll discount it."
  };

  return questions[step] || questions[1];
}

/**
 * Validates if the AI response matches the expected question for the current step
 * Returns { isValid: boolean, similarity: number, expectedQuestion: string }
 */
export function validateStepQuestion(
  aiResponse: string,
  currentStep: number,
  calculatorData?: any
): { isValid: boolean; similarity: number; expectedQuestion: string } {
  const expectedQuestion = getNextQuestion(currentStep, calculatorData);

  if (!expectedQuestion) {
    return { isValid: true, similarity: 1, expectedQuestion: '' };
  }

  // Extract questions from AI response (look for question marks)
  const aiQuestions = aiResponse.split(/[.!]/).filter(s => s.includes('?')).map(s => s.trim());

  if (aiQuestions.length === 0) {
    // No questions found in response - could be a statement (step 10, 14, 15)
    // Check if it's one of the statement steps
    if ([10, 14, 15].includes(currentStep)) {
      return { isValid: true, similarity: 1, expectedQuestion };
    }
    return { isValid: false, similarity: 0, expectedQuestion };
  }

  // Normalize questions for comparison
  const normalizeQuestion = (q: string) => q.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();

  // Check if any question in the response matches the expected question
  let maxSimilarity = 0;
  for (const aiQuestion of aiQuestions) {
    const normalizedAI = normalizeQuestion(aiQuestion);
    const normalizedExpected = normalizeQuestion(expectedQuestion);

    // Calculate word overlap
    const wordsAI = new Set(normalizedAI.split(' '));
    const wordsExpected = new Set(normalizedExpected.split(' '));
    const intersection = new Set([...wordsAI].filter(x => wordsExpected.has(x)));
    const union = new Set([...wordsAI, ...wordsExpected]);
    const similarity = intersection.size / union.size;

    maxSimilarity = Math.max(maxSimilarity, similarity);
  }

  const isValid = maxSimilarity > 0.5; // >50% word overlap = valid

  return { isValid, similarity: maxSimilarity, expectedQuestion };
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
