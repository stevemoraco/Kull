// Section timing intelligence layer that analyzes reading behavior and provides conversation insights

/**
 * Section timing data from frontend
 */
export interface SectionHistoryItem {
  id: string;
  title: string;
  totalTimeSpent: number; // milliseconds
}

/**
 * Analysis results with actionable intelligence
 */
export interface SectionInsights {
  topSection: {
    id: string;
    title: string;
    timeSpent: number;
    interpretation: string; // What this means for their interest
  };
  readingPattern: 'deep_reader' | 'scanner' | 'focused' | 'explorer';
  suggestedOpeners: string[]; // Conversation starters based on reading
  interestMapping: {
    [sectionId: string]: {
      timeSpent: number;
      interestLevel: 'high' | 'medium' | 'low';
      topic: string;
    };
  };
}

/**
 * Topic mapping for all website sections
 */
const SECTION_TOPIC_MAP: Record<string, string> = {
  'calculator': 'ROI calculation and cost savings',
  'pricing': 'pricing plans and costs',
  'features': 'product capabilities',
  'hero': 'landing page overview',
  'problem': 'pain points and challenges',
  'value': 'value proposition',
  'solution': 'solution and how it works',
  'testimonials': 'customer reviews and success stories',
  'referrals': 'social proof and case studies',
  'value-stack': 'benefits and value proposition',
  'final-cta': 'taking action and getting started',
  'faq': 'frequently asked questions',
  'cta': 'taking action / getting started',
  'download': 'downloading and getting started',
};

/**
 * Helper to format milliseconds into human-readable time
 */
function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

/**
 * Calculate variance of an array of numbers
 */
function calculateVariance(numbers: number[]): number {
  if (numbers.length === 0) return 0;

  const mean = numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
  const squaredDiffs = numbers.map(num => Math.pow(num - mean, 2));
  return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / numbers.length;
}

/**
 * Detect the user's reading pattern based on section timing
 */
function detectReadingPattern(sections: SectionHistoryItem[]): 'deep_reader' | 'scanner' | 'focused' | 'explorer' {
  if (sections.length === 0) return 'scanner';

  const totalTime = sections.reduce((sum, s) => sum + s.totalTimeSpent, 0);
  const avgTimePerSection = totalTime / sections.length;
  const variance = calculateVariance(sections.map(s => s.totalTimeSpent));
  const topSectionTime = sections[0].totalTimeSpent;

  // Focused: Spent most time on one section (>60% of total time)
  if (topSectionTime > totalTime * 0.6) {
    return 'focused';
  }

  // Scanner: Evenly distributed time (low variance)
  if (variance < avgTimePerSection * 0.3) {
    return 'scanner';
  }

  // Explorer: Visited many sections (5+)
  if (sections.length >= 5) {
    return 'explorer';
  }

  // Deep reader: Spent significant time on few sections
  return 'deep_reader';
}

/**
 * Get topic for a section based on ID or title
 */
function getSectionTopic(section: SectionHistoryItem): string {
  const id = section.id.toLowerCase();
  const title = section.title.toLowerCase();

  // Try to find matching topic from map
  for (const [key, value] of Object.entries(SECTION_TOPIC_MAP)) {
    if (id.includes(key) || title.includes(key)) {
      return value;
    }
  }

  // Fallback to title
  return section.title;
}

/**
 * Determine interest level based on time spent
 * Uses quartiles: top 25% = high, middle 50% = medium, bottom 25% = low
 */
function getInterestLevel(timeSpent: number, allTimes: number[]): 'high' | 'medium' | 'low' {
  const sorted = [...allTimes].sort((a, b) => b - a);
  const topQuartileIndex = Math.floor(sorted.length * 0.25);
  const bottomQuartileIndex = Math.floor(sorted.length * 0.75);

  const topQuartileThreshold = sorted[topQuartileIndex];
  const bottomQuartileThreshold = sorted[bottomQuartileIndex];

  if (timeSpent >= topQuartileThreshold) return 'high';
  if (timeSpent <= bottomQuartileThreshold) return 'low';
  return 'medium';
}

/**
 * Generate conversation openers based on top section
 */
function generateSuggestedOpeners(topSection: SectionHistoryItem): string[] {
  const timeStr = formatTime(topSection.totalTimeSpent);
  const openers: string[] = [];
  const id = topSection.id.toLowerCase();

  if (id.includes('calculator')) {
    openers.push(`i see you spent ${timeStr} playing with the calculator - did you find your numbers?`);
    openers.push(`those calculator numbers accurate for your workflow?`);
    openers.push(`you were crunching the ROI numbers - what did you find?`);
  } else if (id.includes('pricing') || id.includes('download')) {
    openers.push(`you were looking at pricing for a while - have questions about the cost?`);
    openers.push(`you spent ${timeStr} on pricing - want to see how it compares to what you're wasting now?`);
    openers.push(`you were checking out the pricing - what's your take on the investment?`);
  } else if (id.includes('feature') || id.includes('solution')) {
    openers.push(`you were checking out features - which one interests you most?`);
    openers.push(`spent ${timeStr} reading features - what stood out?`);
    openers.push(`you were exploring how it works - any questions about the process?`);
  } else if (id.includes('problem')) {
    openers.push(`you spent time reading about pain points - which one hits hardest for you?`);
    openers.push(`those problems resonate with your workflow?`);
    openers.push(`you were reading about the challenges - which one's your biggest headache?`);
  } else if (id.includes('testimonial') || id.includes('referral')) {
    openers.push(`you were reading testimonials - any of those stories sound familiar?`);
    openers.push(`you spent ${timeStr} on case studies - which one matched your situation?`);
    openers.push(`you were checking out what other photographers say - what resonated?`);
  } else if (id.includes('value')) {
    openers.push(`you spent ${timeStr} reading about the value prop - what's most compelling for you?`);
    openers.push(`you were reading the benefits - which one matters most to your workflow?`);
    openers.push(`you were exploring the value - what would make the biggest difference?`);
  } else if (id.includes('hero')) {
    openers.push(`i see you just landed here - what brought you to kull today?`);
    openers.push(`welcome! what's the biggest bottleneck in your workflow right now?`);
    openers.push(`hey there! what are you hoping to solve?`);
  } else {
    openers.push(`you spent ${timeStr} reading ${topSection.title} - what interests you most?`);
    openers.push(`you were reading about ${topSection.title} - have questions?`);
    openers.push(`you spent some time on ${topSection.title} - what's on your mind?`);
  }

  return openers;
}

/**
 * Get interpretation of what top section focus means
 */
function getTopSectionInterpretation(topSection: SectionHistoryItem, pattern: string): string {
  const id = topSection.id.toLowerCase();

  if (id.includes('calculator')) {
    return 'User is evaluating ROI and cost savings - they\'re in analytical mode, likely price-conscious';
  } else if (id.includes('pricing') || id.includes('download')) {
    return 'User is seriously considering purchase - they\'re far along in the buying journey';
  } else if (id.includes('feature') || id.includes('solution')) {
    return 'User wants to understand capabilities and how it works - they\'re in discovery mode';
  } else if (id.includes('problem')) {
    return 'User is identifying with pain points - they\'re looking for validation that we understand their struggles';
  } else if (id.includes('testimonial') || id.includes('referral')) {
    return 'User wants social proof and validation - they\'re looking for evidence this works';
  } else if (id.includes('value')) {
    return 'User is evaluating value proposition - they want to know what\'s in it for them';
  } else if (id.includes('hero')) {
    return 'User just arrived and is getting oriented - they\'re in exploration mode';
  } else {
    return `User is focused on ${topSection.title} - ${pattern === 'focused' ? 'deep dive on one topic' : 'general interest'}`;
  }
}

/**
 * Analyze section timing data and return actionable insights
 */
export function analyzeSectionTiming(sectionHistory: SectionHistoryItem[]): SectionInsights | null {
  if (!sectionHistory || sectionHistory.length === 0) {
    return null;
  }

  // Sort by time spent (descending)
  const sortedSections = [...sectionHistory].sort((a, b) => b.totalTimeSpent - a.totalTimeSpent);
  const topSection = sortedSections[0];

  // Detect reading pattern
  const readingPattern = detectReadingPattern(sortedSections);

  // Generate suggested openers
  const suggestedOpeners = generateSuggestedOpeners(topSection);

  // Build interest mapping
  const allTimes = sortedSections.map(s => s.totalTimeSpent);
  const interestMapping: SectionInsights['interestMapping'] = {};

  sortedSections.forEach(section => {
    interestMapping[section.id] = {
      timeSpent: section.totalTimeSpent,
      interestLevel: getInterestLevel(section.totalTimeSpent, allTimes),
      topic: getSectionTopic(section),
    };
  });

  return {
    topSection: {
      id: topSection.id,
      title: topSection.title,
      timeSpent: topSection.totalTimeSpent,
      interpretation: getTopSectionInterpretation(topSection, readingPattern),
    },
    readingPattern,
    suggestedOpeners,
    interestMapping,
  };
}

/**
 * Format section insights as markdown for AI prompt
 */
export function formatSectionInsights(insights: SectionInsights): string {
  const { topSection, readingPattern, suggestedOpeners, interestMapping } = insights;

  // Reading pattern descriptions
  const patternDescriptions: Record<typeof readingPattern, string> = {
    deep_reader: 'Deep Reader - Spends significant time on few sections, thoughtful engagement',
    scanner: 'Scanner - Evenly distributed time across sections, quick overview',
    focused: 'Focused - Most time on one specific section, highly targeted interest',
    explorer: 'Explorer - Visited many sections, comprehensive research mode',
  };

  let markdown = `## ⏱️ SECTION READING INTELLIGENCE

**Top Section:** ${topSection.title} (${formatTime(topSection.timeSpent)})
**Interpretation:** ${topSection.interpretation}

**Reading Pattern:** ${patternDescriptions[readingPattern]}

**Suggested Conversation Openers:**
${suggestedOpeners.map((opener, i) => `${i + 1}. "${opener}"`).join('\n')}

**Interest Breakdown:**
${Object.entries(interestMapping)
  .sort((a, b) => b[1].timeSpent - a[1].timeSpent)
  .map(([id, data]) => {
    const emoji = data.interestLevel === 'high' ? '🔥' : data.interestLevel === 'medium' ? '👀' : '👁️';
    return `${emoji} **${data.topic}**: ${formatTime(data.timeSpent)} (${data.interestLevel} interest)`;
  })
  .join('\n')}

**💡 Strategic Guidance:**
- Use the top section (${topSection.title}) to personalize your FIRST question
- Reference their reading time naturally: "i see you spent ${formatTime(topSection.timeSpent)} on..."
- Match their reading pattern: ${readingPattern === 'focused' ? 'Go deep on their specific interest' : readingPattern === 'scanner' ? 'Keep it brief and actionable' : readingPattern === 'explorer' ? 'They want comprehensive info' : 'They\'re thoughtful, give them substance'}
- Show you\'re paying attention to what they\'re reading

**🔗 Scroll them to relevant sections using these EXACT links:**
- Calculator: [text](#calculator)
- Features: [text](#features)
- Pricing: [text](#download)
- Testimonials: [text](#referrals)
- Sign In: [text](/api/login)
`;

  return markdown;
}

/**
 * Get a summary of section timing for quick reference
 */
export function getSectionTimingSummary(sectionHistory: SectionHistoryItem[]): string {
  if (!sectionHistory || sectionHistory.length === 0) {
    return 'No section timing data available';
  }

  const insights = analyzeSectionTiming(sectionHistory);
  if (!insights) {
    return 'Unable to analyze section timing';
  }

  const { topSection, readingPattern } = insights;
  return `${readingPattern.replace('_', ' ')} - Most time on ${topSection.title} (${formatTime(topSection.timeSpent)})`;
}
