/**
 * Centralized Sales Script Question Definitions
 *
 * This file contains all 15 sales script questions used throughout the Kull platform.
 * These questions follow a proven sales methodology: discover pain, build urgency, close.
 */

export interface SalesScriptQuestion {
  step: number;
  shortLabel: string;
  question: string;
  category: 'discovery' | 'pain' | 'commitment' | 'close';
  required: boolean;
  interpolate?: boolean; // Whether this question uses dynamic values
}

export const SALES_SCRIPT_QUESTIONS: SalesScriptQuestion[] = [
  {
    step: 1,
    shortLabel: "Your goal",
    question: "i see you're doing about [shootsPerWeek × 44] shoots a year — what's your goal for next year?",
    category: "discovery",
    required: true,
    interpolate: true
  },
  {
    step: 2,
    shortLabel: "Happy with goal?",
    question: "are you happy with that number?",
    category: "discovery",
    required: true
  },
  {
    step: 3,
    shortLabel: "Hours per week",
    question: "how many hours are you working each week right now to sustain it?",
    category: "discovery",
    required: true
  },
  {
    step: 4,
    shortLabel: "Growth plan",
    question: "so if you want to grow, how are you planning to do that?",
    category: "pain",
    required: true
  },
  {
    step: 5,
    shortLabel: "Current workflow",
    question: "do you expect to be able to do that with your current workflow?",
    category: "pain",
    required: true
  },
  {
    step: 6,
    shortLabel: "Annual target",
    question: "what's your actual target for annual shoots next year?",
    category: "pain",
    required: true
  },
  {
    step: 7,
    shortLabel: "Why that goal?",
    question: "why that specific number? what drives that goal?",
    category: "pain",
    required: true
  },
  {
    step: 8,
    shortLabel: "Outcome vision",
    question: "what changes in your life when you hit that number? paint me a picture.",
    category: "pain",
    required: true
  },
  {
    step: 9,
    shortLabel: "The bottleneck",
    question: "so what's kept you from hitting that goal so far? what's the real bottleneck?",
    category: "pain",
    required: true
  },
  {
    step: 10,
    shortLabel: "Position solution",
    question: "that's exactly what i specialize in solving. would you be open to hearing how?",
    category: "commitment",
    required: true
  },
  {
    step: 11,
    shortLabel: "Commitment level",
    question: "on a scale of 1-10, how committed are you to fixing this in the next 30 days?",
    category: "commitment",
    required: true
  },
  {
    step: 12,
    shortLabel: "Timeline urgency",
    question: "when do you want this fixed? like, actually fixed — not just thinking about it.",
    category: "commitment",
    required: true
  },
  {
    step: 13,
    shortLabel: "Price reveal",
    question: "cool. so do you want to hear the price, or should we keep talking about the bottleneck?",
    category: "close",
    required: true
  },
  {
    step: 14,
    shortLabel: "State price",
    question: "the everyday price is $997/year. that's about $83/month to process unlimited shoots.",
    category: "close",
    required: true
  },
  {
    step: 15,
    shortLabel: "Discount close",
    question: "but if you'll commit right now, i'll give you founder pricing at $697/year. that's $300 off, but only if you decide today. what do you think?",
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
