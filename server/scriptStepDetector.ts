/**
 * Script Step Detector
 *
 * Analyzes AI assistant messages to identify which step of the 15-step sales script
 * is currently being executed in a conversation.
 */

interface ScriptStepPattern {
  step: number;
  keywords: string[];
  patterns: RegExp[];
  description: string;
}

/**
 * 15-step sales script patterns for detection
 * Based on the script in server/chatService.ts lines 21-73
 */
const SCRIPT_STEPS: ScriptStepPattern[] = [
  {
    step: 1,
    description: "Start with their current reality",
    keywords: ["goal", "next year", "shoots", "year"],
    patterns: [
      /what'?s your goal for next year/i,
      /goal for next year/i,
      /doing about \d+ shoots/i,
      /\d+ shoots a year/i,
    ],
  },
  {
    step: 2,
    description: "Validate their ambition",
    keywords: ["happy", "number"],
    patterns: [
      /are you happy with that number/i,
      /happy with that/i,
      /satisfied with that/i,
    ],
  },
  {
    step: 3,
    description: "Understand current workload",
    keywords: ["hours", "working", "week"],
    patterns: [
      /how many hours/i,
      /working each week/i,
      /hours.*per week/i,
      /hours.*week/i,
    ],
  },
  {
    step: 4,
    description: "Challenge their growth plan",
    keywords: ["grow", "hiring", "working more"],
    patterns: [
      /how.*grow.*without hiring/i,
      /grow.*numbers.*without/i,
      /without hiring or working more/i,
      /know how.*grow/i,
    ],
  },
  {
    step: 5,
    description: "Question current workflow",
    keywords: ["expect", "workflow", "current"],
    patterns: [
      /expect to do that/i,
      /with your current workflow/i,
      /current workflow/i,
      /expect.*workflow/i,
    ],
  },
  {
    step: 6,
    description: "Get specific targets",
    keywords: ["target", "shoots", "revenue", "time off"],
    patterns: [
      /actual target/i,
      /target for annual/i,
      /annual shoots.*revenue/i,
      /specific.*target/i,
    ],
  },
  {
    step: 7,
    description: "Dig into motivation",
    keywords: ["why", "specific", "goal"],
    patterns: [
      /why that specific goal/i,
      /why that/i,
      /what made you choose/i,
      /why.*goal/i,
    ],
  },
  {
    step: 8,
    description: "Paint the outcome",
    keywords: ["changes", "business", "life", "hit"],
    patterns: [
      /what changes/i,
      /changes in your business/i,
      /when you hit it/i,
      /life when you hit/i,
    ],
  },
  {
    step: 9,
    description: "Identify the bottleneck",
    keywords: ["kept", "hitting", "already"],
    patterns: [
      /what'?s kept you from hitting/i,
      /kept you from/i,
      /stopped you from/i,
      /prevented you from/i,
    ],
  },
  {
    step: 10,
    description: "Position your solution",
    keywords: ["specialize", "removing", "workflow block"],
    patterns: [
      /exactly what i specialize/i,
      /removing the workflow/i,
      /workflow block/i,
      /specialize in/i,
    ],
  },
  {
    step: 11,
    description: "Gauge commitment",
    keywords: ["committed", "1-10", "1–10"],
    patterns: [
      /how committed/i,
      /committed.*1.*10/i,
      /1-10|1–10/i,
      /rate.*commitment/i,
    ],
  },
  {
    step: 12,
    description: "Create urgency",
    keywords: ["when", "fixed", "hit those numbers"],
    patterns: [
      /when do you want.*fixed/i,
      /want this fixed/i,
      /hit those numbers/i,
      /timeline.*fix/i,
    ],
  },
  {
    step: 13,
    description: "Introduce price",
    keywords: ["price", "want the price"],
    patterns: [
      /want the price/i,
      /ready.*price/i,
      /talk about pricing/i,
      /discuss.*cost/i,
    ],
  },
  {
    step: 14,
    description: "State the price",
    keywords: ["everyday price", "solve exactly"],
    patterns: [
      /everyday price/i,
      /price is/i,
      /solve exactly the problem/i,
      /costs.*month/i,
    ],
  },
  {
    step: 15,
    description: "Discount close",
    keywords: ["commit", "discount", "goal you told me"],
    patterns: [
      /i'?ll discount it/i,
      /if you'?ll commit/i,
      /commit to the goal/i,
      /discount.*commit/i,
    ],
  },
];

/**
 * Detects which script step (1-15) an AI assistant message corresponds to
 * Returns null if no clear step is detected
 */
export function detectScriptStep(assistantMessage: string): number | null {
  if (!assistantMessage || typeof assistantMessage !== 'string') {
    return null;
  }

  const messageLower = assistantMessage.toLowerCase();

  // Check each step's patterns
  for (const step of SCRIPT_STEPS) {
    // Check regex patterns first (more specific)
    for (const pattern of step.patterns) {
      if (pattern.test(messageLower)) {
        return step.step;
      }
    }

    // Check if multiple keywords are present (fallback detection)
    const keywordMatches = step.keywords.filter(keyword =>
      messageLower.includes(keyword.toLowerCase())
    );

    // If at least 2 keywords match, consider it a match
    if (keywordMatches.length >= 2) {
      return step.step;
    }
  }

  return null;
}

/**
 * Analyzes a full conversation history and returns the highest script step reached
 * This is useful for determining the current position in the sales script
 */
export function detectCurrentScriptStep(messages: Array<{ role: string; content: string }>): number | null {
  let highestStep: number | null = null;

  // Iterate through messages in order to find the highest step reached
  for (const message of messages) {
    if (message.role === 'assistant') {
      const step = detectScriptStep(message.content);
      if (step !== null && (highestStep === null || step > highestStep)) {
        highestStep = step;
      }
    }
  }

  return highestStep;
}

/**
 * Returns a human-readable description of a script step
 */
export function getScriptStepDescription(step: number): string {
  const stepData = SCRIPT_STEPS.find(s => s.step === step);
  return stepData ? stepData.description : `Step ${step}`;
}

/**
 * Returns all 15 script step patterns (useful for documentation/debugging)
 */
export function getAllScriptSteps(): ScriptStepPattern[] {
  return SCRIPT_STEPS;
}
