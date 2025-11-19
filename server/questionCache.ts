// Question cache system for preventing duplicate questions
// Tracks all questions asked per session and detects similarity using Dice coefficient

interface QuestionRecord {
  question: string;
  askedAt: Date;
  normalized: string;
}

// In-memory cache: sessionId -> array of questions asked
const sessionQuestions = new Map<string, QuestionRecord[]>();

// Cache cleanup: Remove sessions after 1 hour of inactivity
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

// Start periodic cleanup
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, questions] of Array.from(sessionQuestions.entries())) {
    if (questions.length > 0) {
      const lastAsked = Math.max(...questions.map(q => q.askedAt.getTime()));
      if (now - lastAsked > CACHE_TTL_MS) {
        sessionQuestions.delete(sessionId);
        console.log(`[QuestionCache] Cleaned up expired session: ${sessionId}`);
      }
    }
  }
}, CLEANUP_INTERVAL_MS);

/**
 * Normalize a question for comparison
 * - Lowercase
 * - Remove punctuation
 * - Remove extra whitespace
 * - Sort words alphabetically
 */
export function normalizeQuestion(question: string): string {
  return question
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ') // Collapse whitespace
    .trim()
    .split(' ')
    .sort()
    .join(' ');
}

/**
 * Calculate Dice coefficient similarity between two strings
 * Returns value between 0 (completely different) and 1 (identical)
 *
 * Dice coefficient = (2 * |intersection|) / (|set1| + |set2|)
 */
export function similarity(str1: string, str2: string): number {
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
 * Add a question to the cache for a session
 */
export function addQuestion(sessionId: string, question: string): void {
  const normalized = normalizeQuestion(question);

  if (!sessionQuestions.has(sessionId)) {
    sessionQuestions.set(sessionId, []);
  }

  const questions = sessionQuestions.get(sessionId)!;
  questions.push({
    question,
    askedAt: new Date(),
    normalized,
  });

  console.log(`[QuestionCache] Added question for session ${sessionId}: "${question.substring(0, 80)}..."`);
}

/**
 * Check if a similar question has been asked before
 * Returns true if similarity > 0.7 (70%)
 */
export function hasAskedBefore(sessionId: string, question: string): boolean {
  const questions = sessionQuestions.get(sessionId) || [];
  const normalized = normalizeQuestion(question);

  for (const q of questions) {
    const sim = similarity(q.normalized, normalized);
    if (sim > 0.7) {
      console.log(`[QuestionCache] 🚫 REPEAT DETECTED: "${question.substring(0, 60)}..." (${(sim * 100).toFixed(1)}% similar to previous)`);
      return true;
    }
  }

  return false;
}

/**
 * Get all questions asked in a session
 */
export function getQuestionsAsked(sessionId: string): string[] {
  return (sessionQuestions.get(sessionId) || []).map(q => q.question);
}

/**
 * Extract questions from a message (sentences ending with ?)
 */
export function extractQuestions(content: string): string[] {
  // Match sentences ending with ? (including multiline)
  const questionPattern = /[^.!?]*\?/g;
  const matches = content.match(questionPattern);

  if (!matches) return [];

  return matches
    .map(q => q.trim())
    .filter(q => q.length > 10) // Ignore very short questions like "ok?"
    .filter((q, i, arr) => arr.indexOf(q) === i); // Dedupe
}

/**
 * Clear cache for a specific session (useful for testing or logout)
 */
export function clearSession(sessionId: string): void {
  sessionQuestions.delete(sessionId);
  console.log(`[QuestionCache] Cleared session: ${sessionId}`);
}

/**
 * Get cache statistics (for monitoring)
 */
export function getCacheStats(): { totalSessions: number; totalQuestions: number; oldestSession: Date | null } {
  let totalQuestions = 0;
  let oldestSession: Date | null = null;

  for (const questions of sessionQuestions.values()) {
    totalQuestions += questions.length;
    if (questions.length > 0) {
      const oldest = new Date(Math.min(...questions.map(q => q.askedAt.getTime())));
      if (!oldestSession || oldest < oldestSession) {
        oldestSession = oldest;
      }
    }
  }

  return {
    totalSessions: sessionQuestions.size,
    totalQuestions,
    oldestSession,
  };
}
