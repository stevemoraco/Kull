/**
 * Centralized Sales Script Question Definitions
 *
 * This file contains all 16 sales script questions (0-15) used throughout the Kull platform.
 * These questions follow a proven sales methodology: get permission, discover pain, build urgency, close.
 */

export interface SalesScriptQuestion {
  step: number;
  shortLabel: string;
  question: string;
  category: 'permission' | 'discovery' | 'pain' | 'commitment' | 'close';
  required: boolean;
  interpolate?: boolean; // Whether this question uses dynamic values
}

export const SALES_SCRIPT_QUESTIONS: SalesScriptQuestion[] = [
  {
    step: 0,
    shortLabel: "Permission",
    question: "let me ask you a few questions to see if you're a good fit - 15 questions, takes a few minutes. we'll put together a special offer if this makes sense. sound good?",
    category: "permission",
    required: true,
    interpolate: false
  },
  {
    step: 1,
    shortLabel: "Current reality",
    question: "i see you're doing about [shootsPerWeek × 44] shoots a year — is that accurate?",
    category: "discovery",
    required: true,
    interpolate: true
  },
  {
    step: 2,
    shortLabel: "Goal for next year",
    question: "what's your goal for next year? more shoots? less? more profitable? walk me through it.",
    category: "discovery",
    required: true
  },
  {
    step: 3,
    shortLabel: "Hours per week",
    question: "how many hours are you working each week right now?",
    category: "discovery",
    required: true
  },
  {
    step: 4,
    shortLabel: "Growth plan",
    question: "do you know how you'll grow those numbers without hiring or working more?",
    category: "pain",
    required: true
  },
  {
    step: 5,
    shortLabel: "Current workflow",
    question: "how do you expect to do that with your current workflow?",
    category: "pain",
    required: true
  },
  {
    step: 6,
    shortLabel: "Prioritize goal",
    question: "got it. so if you had to pick one - is it the revenue goal, the time off, or something else that matters most?",
    category: "pain",
    required: true
  },
  {
    step: 7,
    shortLabel: "Why that goal?",
    question: "why that specific goal?",
    category: "pain",
    required: true
  },
  {
    step: 8,
    shortLabel: "Outcome vision",
    question: "what changes in your business or life when you hit it?",
    category: "pain",
    required: true
  },
  {
    step: 9,
    shortLabel: "The bottleneck",
    question: "what's kept you from hitting that already?",
    category: "pain",
    required: true
  },
  {
    step: 10,
    shortLabel: "Position solution",
    question: "this is exactly what i specialize in: removing the workflow block that's keeping you from those numbers. (then pause answering questions for a bit to tell them ALL about the service relative to their goals and how you think it'll help them most, be very direct based on our codebase how it actually works and help them imagine what success looks like, paint the vision of Kull integrated into their life)",
    category: "commitment",
    required: true
  },
  {
    step: 11,
    shortLabel: "Commitment level",
    question: "how committed are you to hitting that? 1–10. (make sure you've finished telling them all about what life will be like after they start using Kull and they're amazed first)",
    category: "commitment",
    required: true
  },
  {
    step: 12,
    shortLabel: "Timeline urgency",
    question: "when do you want this fixed so you can hit those numbers?",
    category: "commitment",
    required: true
  },
  {
    step: 13,
    shortLabel: "Price reveal",
    question: "want the price?",
    category: "close",
    required: true
  },
  {
    step: 14,
    shortLabel: "State price",
    question: "everyday price is $5,988/year to solve exactly the problem you just described.",
    category: "close",
    required: true
  },
  {
    step: 15,
    shortLabel: "Discount close",
    question: "alright — if you'll commit to the goal you told me, i'll discount it.",
    category: "close",
    required: true
  }
];

/**
 * Get a specific question by step number
 */
export const getQuestionByStep = (step: number): SalesScriptQuestion | undefined => {
  return SALES_SCRIPT_QUESTIONS.find(q => q.step === step);
};

/**
 * Get the next unanswered question based on completed steps
 */
export const getNextUnansweredQuestion = (answeredSteps: number[]): SalesScriptQuestion | undefined => {
  return SALES_SCRIPT_QUESTIONS.find(q => !answeredSteps.includes(q.step));
};

/**
 * Get all questions in a specific category
 */
export const getQuestionsByCategory = (category: SalesScriptQuestion['category']): SalesScriptQuestion[] => {
  return SALES_SCRIPT_QUESTIONS.filter(q => q.category === category);
};

/**
 * Get total number of questions
 */
export const getTotalQuestions = (): number => {
  return SALES_SCRIPT_QUESTIONS.length;
};

/**
 * Calculate progress percentage based on answered steps
 */
export const calculateProgress = (answeredSteps: number[]): number => {
  return Math.round((answeredSteps.length / SALES_SCRIPT_QUESTIONS.length) * 100);
};

/**
 * Check if all required questions have been answered
 */
export const areAllRequiredQuestionsAnswered = (answeredSteps: number[]): boolean => {
  const requiredQuestions = SALES_SCRIPT_QUESTIONS.filter(q => q.required);
  return requiredQuestions.every(q => answeredSteps.includes(q.step));
};

/**
 * Interpolate dynamic values into question text
 * Example: "[shootsPerWeek × 44]" becomes "88" if shootsPerWeek = 2
 */
export const interpolateQuestion = (
  question: string,
  values: Record<string, number | string>
): string => {
  let interpolated = question;

  // Replace [shootsPerWeek × 44] pattern
  if (values.shootsPerWeek) {
    const annualShoots = Number(values.shootsPerWeek) * 44;
    interpolated = interpolated.replace(/\[shootsPerWeek × 44\]/g, String(annualShoots));
  }

  // Replace any other [variable] patterns
  Object.keys(values).forEach(key => {
    const pattern = new RegExp(`\\[${key}\\]`, 'g');
    interpolated = interpolated.replace(pattern, String(values[key]));
  });

  return interpolated;
};

/**
 * Get question text with interpolated values if applicable
 */
export const getInterpolatedQuestion = (
  step: number,
  values?: Record<string, number | string>
): string => {
  const question = getQuestionByStep(step);
  if (!question) return '';

  if (question.interpolate && values) {
    return interpolateQuestion(question.question, values);
  }

  return question.question;
};

/**
 * Full sales script text for AI validation
 * Used by aiStepValidator.ts to show context
 */
export const SALES_SCRIPT_TEXT = `
KULL SALES SCRIPT (16 Steps):

Step 0: Get Permission
"do you mind if i ask you a few questions to figure out if you're a good fit for kull and it's worth your time/money? just 15 questions, a few minutes and we'll put together a special offer for you if you're a good fit."

Step 1: Current Reality (Your Goal)
"i see you're doing about [shootsPerWeek × 44] shoots a year — what's your goal for next year?"

Step 2: Happy with Goal?
"are you happy with that number?"

Step 3: Hours per Week
"how many hours are you working each week right now to sustain it?"

Step 4: Growth Plan
"so if you want to grow, how are you planning to do that?"

Step 5: Current Workflow
"do you expect to be able to do that with your current workflow?"

Step 6: Prioritize Goal
"got it. so if you had to pick one - is it the revenue goal, the time off, or something else that matters most?"

Step 7: Why That Goal?
"why that specific number? what drives that goal?"

Step 8: Outcome Vision
"what changes in your life when you hit that number? paint me a picture."

Step 9: The Bottleneck
"so what's kept you from hitting that goal so far? what's the real bottleneck?"

Step 10: Position Solution
"that's exactly what i specialize in solving. would you be open to hearing how?"

Step 11: Commitment Level
"on a scale of 1-10, how committed are you to fixing this in the next 30 days?"

Step 12: Timeline Urgency
"when do you want this fixed? like, actually fixed — not just thinking about it."

Step 13: Price Reveal
"cool. so do you want to hear the price, or should we keep talking about the bottleneck?"

Step 14: State Price
"everyday price is $5,988/year to solve exactly the problem you just described. that's $499/month billed annually for unlimited processing."

Step 15: Discount Close
"alright — if you'll commit to the goal you told me, i'll discount it. [start your free trial here](#download)"
`.trim();
