/**
 * Response Validation & Monitoring
 *
 * Validates AI responses against script compliance metrics:
 * 1. Repeated Question Check - Detects duplicate questions
 * 2. Activity Without Script Check - Ensures activity mentions include script questions
 * 3. Off-Script Check - Verifies expected questions are asked
 * 4. Context Usage Check - Ensures AI references previous answers
 */

/**
 * Validation result interface
 */
export interface ValidationResult {
  valid: boolean;
  issues: string[];
  severity: 'info' | 'warning' | 'critical';
  metrics: {
    hasRepeatedQuestion: boolean;
    hasActivityWithoutScript: boolean;
    isOffScript: boolean;
    usesContext: boolean;
  };
}

/**
 * Message interface for conversation history
 */
interface Message {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Extract questions from AI response text
 * Looks for sentences ending with '?' that appear to be questions
 */
export function extractQuestions(text: string): string[] {
  if (!text) return [];

  // Match sentences ending with ? (including multiline)
  const questionPattern = /[^.!?]*\?/g;
  const matches = text.match(questionPattern);

  if (!matches) return [];

  return matches
    .map(q => q.trim())
    .filter(q => q.length > 10) // Ignore very short questions like "ok?"
    .filter((q, i, arr) => arr.indexOf(q) === i); // Dedupe
}

/**
 * Calculate text similarity using Dice coefficient (same as questionCache)
 * Returns a value between 0 and 1 (1 = identical, 0 = no overlap)
 */
export function calculateSimilarity(text1: string, text2: string): number {
  if (!text1 || !text2) return 0;

  // Normalize texts
  const normalize = (text: string) =>
    text.toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\s+/g, ' ') // Collapse whitespace
      .trim();

  const str1 = normalize(text1);
  const str2 = normalize(text2);

  if (str1.length === 0 || str2.length === 0) return 0;
  if (str1 === str2) return 1;

  // Create bigrams (pairs of consecutive characters)
  const bigrams1 = new Set<string>();
  const bigrams2 = new Set<string>();

  for (let i = 0; i < str1.length - 1; i++) {
    bigrams1.add(str1.substring(i, i + 2));
  }

  for (let i = 0; i < str2.length - 1; i++) {
    bigrams2.add(str2.substring(i, i + 2));
  }

  // If either string is too short, fall back to simple equality
  if (bigrams1.size === 0 || bigrams2.size === 0) {
    return str1 === str2 ? 1.0 : 0.0;
  }

  // Count intersection
  let intersection = 0;
  const bigrams1Array = Array.from(bigrams1);
  for (const bigram of bigrams1Array) {
    if (bigrams2.has(bigram)) {
      intersection++;
    }
  }

  // Calculate Dice coefficient
  return (2.0 * intersection) / (bigrams1.size + bigrams2.size);
}

/**
 * Get expected question for a given script step
 */
export function getExpectedQuestion(step: number, calculatorData?: any): string {
  const annualShoots = calculatorData?.shootsPerWeek
    ? Math.round(calculatorData.shootsPerWeek * 52)
    : 88;

  const questions: Record<number, string> = {
    1: `i see you're doing about ${annualShoots} shoots a year — is that accurate?`,
    2: `are you happy with that ${annualShoots}-shoot number?`,
    3: `how many hours are you working each week right now?`,
    4: `do you know how you'll grow without hiring or working more?`,
    5: `what's holding you back from hitting your revenue goals?`,
    6: `if you could free up 10 hours a week, what would you do with it?`,
    7: `have you tried any AI tools for culling before?`,
    8: `what would change if you could cull 1000 photos in 30 seconds?`,
    9: `want to see what kull can do for your workflow?`,
    10: `ready to try it with your own photos?`,
    11: `what's your biggest concern about switching to AI culling?`,
    12: `want me to walk you through the pricing?`,
    13: `makes sense to start with professional or studio tier?`,
    14: `want to start your 7-day free trial now?`,
    15: `what email should i send the trial link to?`,
  };

  return questions[step] || '';
}

/**
 * Extract keywords from user answers for context checking
 */
export function extractKeywords(text: string): string[] {
  if (!text) return [];

  // Remove common words
  const stopWords = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
    'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
    'to', 'was', 'will', 'with', 'i', 'me', 'my', 'we', 'you', 'your'
  ]);

  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.has(word))
    .slice(0, 10); // Take top 10 keywords
}

/**
 * Main validation function
 * Validates AI response against multiple criteria
 */
export function validateResponse(
  aiResponse: string,
  conversationHistory: Message[],
  currentStep: number,
  activityData?: any[],
  calculatorData?: any
): ValidationResult {
  const issues: string[] = [];
  const metrics = {
    hasRepeatedQuestion: false,
    hasActivityWithoutScript: false,
    isOffScript: false,
    usesContext: false,
  };

  // Extract questions from current AI response
  const currentQuestions = extractQuestions(aiResponse);

  // Check 1: Repeated Question Detection
  const previousQuestions: string[] = [];
  for (const msg of conversationHistory) {
    if (msg.role === 'assistant') {
      previousQuestions.push(...extractQuestions(msg.content));
    }
  }

  for (const currentQ of currentQuestions) {
    for (const previousQ of previousQuestions) {
      const similarity = calculateSimilarity(currentQ, previousQ);
      if (similarity > 0.6) { // 60% threshold - allows for some variation in wording
        metrics.hasRepeatedQuestion = true;
        issues.push(`REPEATED_QUESTION: "${currentQ}" (${Math.round(similarity * 100)}% similar to previous)`);
        break;
      }
    }
  }

  // Check 2: Activity Without Script Question
  const activityMentioned = /hover|click|checking|pricing|calculator|feature/i.test(aiResponse);
  const hasQuestion = currentQuestions.length > 0 || aiResponse.includes('?');

  if (activityMentioned && !hasQuestion) {
    metrics.hasActivityWithoutScript = true;
    issues.push('ACTIVITY_WITHOUT_SCRIPT: Activity mentioned but no script question asked');
  }

  // Check 3: Off-Script Detection
  if (currentStep >= 1 && currentStep <= 15) {
    const expectedQ = getExpectedQuestion(currentStep, calculatorData);
    let hasExpectedQuestion = false;

    for (const currentQ of currentQuestions) {
      const similarity = calculateSimilarity(currentQ, expectedQ);
      if (similarity > 0.4) { // Lower threshold to 40% to allow for variation
        hasExpectedQuestion = true;
        break;
      }
    }

    // Only flag as off-script if:
    // 1. No questions match expected question (similarity < 40%)
    // 2. There are questions in the response
    // 3. Activity was NOT mentioned (if activity mentioned, allow more flexibility)
    if (!hasExpectedQuestion && currentQuestions.length > 0 && !activityMentioned) {
      metrics.isOffScript = true;
      issues.push(`OFF_SCRIPT: Expected "${expectedQ}" but AI asked different question at step ${currentStep}`);
    }
  }

  // Check 4: Context Usage
  // Extract keywords from recent user answers
  const recentAnswers = conversationHistory
    .filter(msg => msg.role === 'user')
    .slice(-5) // Last 5 user messages
    .map(msg => msg.content)
    .join(' ');

  const answerKeywords = extractKeywords(recentAnswers);
  const responseKeywords = extractKeywords(aiResponse);

  // Check if AI response references any user answer keywords
  let usesAnyContext = false;
  for (const keyword of answerKeywords) {
    if (responseKeywords.includes(keyword) || aiResponse.toLowerCase().includes(keyword)) {
      usesAnyContext = true;
      break;
    }
  }

  metrics.usesContext = usesAnyContext;

  if (conversationHistory.length > 4 && !usesAnyContext) {
    issues.push('LOW_CONTEXT_USAGE: AI question does not reference previous user answers');
  }

  // Determine overall validity and severity
  const valid = issues.length === 0;
  let severity: 'info' | 'warning' | 'critical' = 'info';

  if (issues.length > 2) {
    severity = 'critical';
  } else if (issues.length > 0) {
    severity = 'warning';
  }

  return {
    valid,
    issues,
    severity,
    metrics,
  };
}

/**
 * Calculate progression rate from chat sessions
 * Returns percentage of sessions that reached step 3+
 */
export function calculateProgressionRate(sessions: any[]): number {
  if (sessions.length === 0) return 0;
  const reachedStep3 = sessions.filter(s => (s.scriptStep || 0) >= 3).length;
  return (reachedStep3 / sessions.length) * 100;
}

/**
 * Calculate repetition rate from validation logs
 * Returns percentage of responses with repeated questions
 */
export function calculateRepetitionRate(validationLogs: ValidationResult[]): number {
  if (validationLogs.length === 0) return 0;
  const withRepeats = validationLogs.filter(v => v.metrics.hasRepeatedQuestion).length;
  return (withRepeats / validationLogs.length) * 100;
}

/**
 * Calculate context usage rate from validation logs
 * Returns percentage of responses that use context
 */
export function calculateContextUsageRate(validationLogs: ValidationResult[]): number {
  if (validationLogs.length === 0) return 0;
  const withContext = validationLogs.filter(v => v.metrics.usesContext).length;
  return (withContext / validationLogs.length) * 100;
}

/**
 * Calculate activity integration rate from validation logs
 * Returns percentage of activity mentions that include script questions
 */
export function calculateActivityIntegrationRate(validationLogs: ValidationResult[]): number {
  if (validationLogs.length === 0) return 0;
  const withoutActivityScript = validationLogs.filter(v => v.metrics.hasActivityWithoutScript).length;
  return ((validationLogs.length - withoutActivityScript) / validationLogs.length) * 100;
}
