/**
 * Activity Pattern Detection Engine
 *
 * Analyzes user activity and surfaces behavioral insights for sales intelligence.
 * Detects patterns like repeated clicks, topics of interest, hesitation signals,
 * purchase intent, journey phase, and calculator engagement.
 */

export interface ActivityEvent {
  type: 'click' | 'hover' | 'scroll' | 'calculator_change' | 'page_view';
  target?: string;
  value?: any;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface RepeatedClick {
  element: string;
  count: number;
  lastClick: Date;
}

export interface CalculatorEngagement {
  adjustmentCount: number;
  finalValues: {
    shootsPerWeek?: number;
    hoursPerShoot?: number;
    billableRate?: number;
  };
  timeSpent: number; // seconds
}

export interface ActivityPatterns {
  repeatedClicks: RepeatedClick[];
  topicsOfInterest: string[];
  hesitationSignals: string[];
  purchaseIntent: number; // 0-100 score
  journeyPhase: 'awareness' | 'consideration' | 'decision' | 'abandonment';
  calculatorEngagement: CalculatorEngagement;
  timeToValue: number; // Seconds until they saw value prop
}

/**
 * Detect all activity patterns from raw user activity data
 */
export function detectActivityPatterns(userActivity: any[]): ActivityPatterns {
  // Normalize activity to ActivityEvent format
  const events = normalizeActivity(userActivity);

  return {
    repeatedClicks: detectRepeatedClicks(events),
    topicsOfInterest: detectTopicsOfInterest(events),
    hesitationSignals: detectHesitationSignals(events),
    purchaseIntent: calculatePurchaseIntent(events),
    journeyPhase: determineJourneyPhase(events),
    calculatorEngagement: analyzeCalculatorEngagement(events),
    timeToValue: calculateTimeToValue(events),
  };
}

/**
 * Normalize various activity formats into consistent ActivityEvent structure
 */
function normalizeActivity(activity: any[]): ActivityEvent[] {
  if (!Array.isArray(activity)) {
    return [];
  }

  return activity.map(item => {
    // Handle different activity formats
    if (item.type && item.timestamp) {
      return {
        type: item.type,
        target: item.target || item.element || item.page,
        value: item.value || item.data,
        timestamp: typeof item.timestamp === 'string' ? new Date(item.timestamp) : item.timestamp,
        metadata: item.metadata || {},
      };
    }

    // Fallback for basic objects
    return {
      type: 'click' as const,
      target: item.target || item.page || 'unknown',
      value: item.value,
      timestamp: new Date(item.timestamp || item.createdAt || Date.now()),
      metadata: item,
    };
  }).filter(event => event.timestamp instanceof Date && !isNaN(event.timestamp.getTime()));
}

/**
 * Detect elements clicked 2+ times (indicates strong interest)
 */
function detectRepeatedClicks(events: ActivityEvent[]): RepeatedClick[] {
  const clickCounts = new Map<string, { count: number; lastClick: Date }>();

  events
    .filter(e => e.type === 'click' && e.target)
    .forEach(e => {
      const target = normalizeTarget(e.target!);
      const existing = clickCounts.get(target) || { count: 0, lastClick: e.timestamp };

      clickCounts.set(target, {
        count: existing.count + 1,
        lastClick: e.timestamp > existing.lastClick ? e.timestamp : existing.lastClick,
      });
    });

  // Filter to only repeated clicks (2+)
  const repeated: RepeatedClick[] = [];
  clickCounts.forEach((data, element) => {
    if (data.count >= 2) {
      repeated.push({
        element,
        count: data.count,
        lastClick: data.lastClick,
      });
    }
  });

  // Sort by count descending
  return repeated.sort((a, b) => b.count - a.count);
}

/**
 * Normalize target strings to consistent format for grouping
 */
function normalizeTarget(target: string): string {
  return target
    .toLowerCase()
    .replace(/^(button-|link-|nav-)/, '') // Remove common prefixes
    .replace(/-\d+$/, '') // Remove trailing numbers
    .replace(/[-_]/g, ' ') // Convert to spaces
    .trim();
}

/**
 * Extract topics of interest from click targets and page views
 */
function detectTopicsOfInterest(events: ActivityEvent[]): string[] {
  const topicCounts = new Map<string, number>();

  events.forEach(e => {
    const target = e.target?.toLowerCase() || '';

    // Extract topics from target
    const topics = extractTopics(target);
    topics.forEach(topic => {
      topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
    });
  });

  // Sort by frequency and return top topics
  return Array.from(topicCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([topic]) => topic);
}

/**
 * Extract semantic topics from target strings
 */
function extractTopics(target: string): string[] {
  const topics: string[] = [];

  // Define topic keywords
  const topicMap: Record<string, string[]> = {
    'pricing': ['pricing', 'price', 'cost', 'download', 'payment', 'checkout'],
    'calculator': ['calculator', 'shoots', 'savings', 'billable'],
    'features': ['features', 'demo', 'how it works', 'capabilities', 'watch'],
    'testimonials': ['testimonials', 'reviews', 'referral', 'testimonial'],
    'support': ['support', 'help', 'chat', 'contact', 'faq'],
    'security': ['security', 'privacy', 'terms', 'gdpr'],
    'value': ['value', 'roi', 'benefit', 'save', 'time'],
  };

  Object.entries(topicMap).forEach(([topic, keywords]) => {
    if (keywords.some(keyword => target.includes(keyword))) {
      topics.push(topic);
    }
  });

  return topics;
}

/**
 * Detect abandonment signals (exit intent, back button, etc.)
 */
function detectHesitationSignals(events: ActivityEvent[]): string[] {
  const signals: string[] = [];

  // Check for rapid back-and-forth scrolling
  const scrollEvents = events.filter(e => e.type === 'scroll');
  if (hasRapidScrolling(scrollEvents)) {
    signals.push('rapid scrolling (confusion or seeking information)');
  }

  // Check for repeated visits to same section without action
  const clickTargets = events.filter(e => e.type === 'click').map(e => e.target);
  const uniqueTargets = new Set(clickTargets);
  if (clickTargets.length > 10 && uniqueTargets.size < 5) {
    signals.push('clicking same elements repeatedly (indecision)');
  }

  // Check for hover without click on CTAs
  const hoverEvents = events.filter(e => e.type === 'hover');
  const ctaHovers = hoverEvents.filter(e =>
    e.target?.toLowerCase().includes('download') ||
    e.target?.toLowerCase().includes('pricing') ||
    e.target?.toLowerCase().includes('get started')
  );
  if (ctaHovers.length > 2 && !clickTargets.some(t => t?.toLowerCase().includes('download'))) {
    signals.push('hovering over CTAs without clicking (hesitation)');
  }

  // Check for calculator engagement without proceeding
  const calculatorEvents = events.filter(e =>
    e.type === 'calculator_change' ||
    e.target?.toLowerCase().includes('calculator')
  );
  const downloadClicks = events.filter(e =>
    e.type === 'click' &&
    e.target?.toLowerCase().includes('download')
  );
  if (calculatorEvents.length > 3 && downloadClicks.length === 0) {
    signals.push('adjusted calculator but didn\'t proceed to download');
  }

  // Check for viewing pricing but not downloading
  const pricingViews = events.filter(e =>
    e.target?.toLowerCase().includes('pricing')
  );
  if (pricingViews.length > 0 && downloadClicks.length === 0) {
    signals.push('viewed pricing but hasn\'t downloaded yet');
  }

  return signals;
}

/**
 * Check for rapid back-and-forth scrolling pattern
 */
function hasRapidScrolling(scrollEvents: ActivityEvent[]): boolean {
  if (scrollEvents.length < 5) return false;

  // Check for direction changes within short time windows
  let directionChanges = 0;
  for (let i = 1; i < scrollEvents.length; i++) {
    const timeDiff = scrollEvents[i].timestamp.getTime() - scrollEvents[i - 1].timestamp.getTime();
    if (timeDiff < 2000) { // Within 2 seconds
      directionChanges++;
    }
  }

  return directionChanges >= 4;
}

/**
 * Calculate purchase intent score (0-100)
 */
export function calculatePurchaseIntent(events: ActivityEvent[]): number {
  let score = 0;

  // Calculator usage = high intent (30 points max)
  const calculatorInteractions = events.filter(e =>
    e.type === 'calculator_change' ||
    e.target?.includes('calculator') ||
    e.target?.includes('shoots') ||
    e.target?.includes('billable')
  );
  score += Math.min(calculatorInteractions.length * 5, 30);

  // Pricing/download clicks = high intent (30 points max)
  const pricingClicks = events.filter(e =>
    e.type === 'click' && (
      e.target?.includes('pricing') ||
      e.target?.includes('download') ||
      e.target?.includes('get started') ||
      e.target?.includes('checkout')
    )
  );
  score += Math.min(pricingClicks.length * 10, 30);

  // Feature/demo views = medium intent (20 points max)
  const featureViews = events.filter(e =>
    e.target?.includes('feature') ||
    e.target?.includes('demo') ||
    e.target?.includes('how it works') ||
    e.target?.includes('watch')
  );
  score += Math.min(featureViews.length * 3, 20);

  // Testimonial/referral views = need social proof (20 points max)
  const testimonialViews = events.filter(e =>
    e.target?.includes('testimonial') ||
    e.target?.includes('referral') ||
    e.target?.includes('review')
  );
  score += Math.min(testimonialViews.length * 5, 20);

  return Math.min(score, 100);
}

/**
 * Determine user's journey phase based on behavior
 */
function determineJourneyPhase(events: ActivityEvent[]): 'awareness' | 'consideration' | 'decision' | 'abandonment' {
  const intent = calculatePurchaseIntent(events);
  const hesitation = detectHesitationSignals(events);
  const hasCalculatorEngagement = events.some(e =>
    e.type === 'calculator_change' ||
    e.target?.includes('calculator')
  );
  const hasPricingView = events.some(e =>
    e.target?.includes('pricing') ||
    e.target?.includes('download')
  );

  // Abandonment: High hesitation signals
  if (hesitation.length >= 3) {
    return 'abandonment';
  }

  // Decision: High intent + calculator engagement + pricing view
  if (intent >= 60 && hasCalculatorEngagement && hasPricingView) {
    return 'decision';
  }

  // Consideration: Calculator engagement or pricing view
  if (hasCalculatorEngagement || hasPricingView) {
    return 'consideration';
  }

  // Awareness: Just browsing
  return 'awareness';
}

/**
 * Analyze calculator engagement patterns
 */
function analyzeCalculatorEngagement(events: ActivityEvent[]): CalculatorEngagement {
  const calculatorEvents = events.filter(e =>
    e.type === 'calculator_change' ||
    e.target?.includes('calculator')
  );

  if (calculatorEvents.length === 0) {
    return {
      adjustmentCount: 0,
      finalValues: {},
      timeSpent: 0,
    };
  }

  // Get final values from last calculator event
  const lastEvent = calculatorEvents[calculatorEvents.length - 1];
  const finalValues = lastEvent.value || lastEvent.metadata?.calculatorData || {};

  // Calculate time spent (first to last calculator interaction)
  const firstInteraction = calculatorEvents[0].timestamp;
  const lastInteraction = lastEvent.timestamp;
  const timeSpent = Math.floor((lastInteraction.getTime() - firstInteraction.getTime()) / 1000);

  return {
    adjustmentCount: calculatorEvents.length,
    finalValues: {
      shootsPerWeek: finalValues.shootsPerWeek,
      hoursPerShoot: finalValues.hoursPerShoot,
      billableRate: finalValues.billableRate,
    },
    timeSpent,
  };
}

/**
 * Calculate time until user saw value proposition
 */
function calculateTimeToValue(events: ActivityEvent[]): number {
  if (events.length === 0) return 0;

  const firstEvent = events[0];

  // Find first value interaction (calculator, features, testimonials)
  const valueEvent = events.find(e =>
    e.target?.includes('calculator') ||
    e.target?.includes('feature') ||
    e.target?.includes('demo') ||
    e.target?.includes('testimonial') ||
    e.target?.includes('value') ||
    e.type === 'calculator_change'
  );

  if (!valueEvent) {
    // No value interaction yet
    const lastEvent = events[events.length - 1];
    return Math.floor((lastEvent.timestamp.getTime() - firstEvent.timestamp.getTime()) / 1000);
  }

  return Math.floor((valueEvent.timestamp.getTime() - firstEvent.timestamp.getTime()) / 1000);
}

/**
 * Format patterns as markdown for display to sales agent
 */
export function formatPatternInsights(patterns: ActivityPatterns): string {
  const sections: string[] = [];

  // Header
  sections.push('## 🎯 BEHAVIORAL INTELLIGENCE\n');

  // Purchase intent
  const intentEmoji = patterns.purchaseIntent >= 70 ? '🔥' : patterns.purchaseIntent >= 40 ? '⚡' : '📊';
  sections.push(`**Purchase Intent Score:** ${intentEmoji} ${patterns.purchaseIntent}/100\n`);

  // Journey phase
  const phaseEmoji = {
    awareness: '👀',
    consideration: '🤔',
    decision: '✅',
    abandonment: '⚠️',
  }[patterns.journeyPhase];
  sections.push(`**Journey Phase:** ${phaseEmoji} ${patterns.journeyPhase.toUpperCase()}\n`);

  // Repeated clicks (if any)
  if (patterns.repeatedClicks.length > 0) {
    sections.push('**Detected Patterns:**');
    patterns.repeatedClicks.slice(0, 5).forEach(c => {
      sections.push(`- Clicked "${c.element}" ${c.count} times (strong interest)`);
    });
    sections.push('');
  }

  // Topics of interest
  if (patterns.topicsOfInterest.length > 0) {
    sections.push('**Topics of Interest:**');
    patterns.topicsOfInterest.forEach((topic, i) => {
      sections.push(`${i + 1}. ${topic}`);
    });
    sections.push('');
  }

  // Calculator engagement
  if (patterns.calculatorEngagement.adjustmentCount > 0) {
    sections.push('**Calculator Engagement:**');
    sections.push(`- ${patterns.calculatorEngagement.adjustmentCount} adjustments made`);
    sections.push(`- Time spent: ${patterns.calculatorEngagement.timeSpent}s`);

    const { finalValues } = patterns.calculatorEngagement;
    if (finalValues.shootsPerWeek) {
      sections.push(`- Shoots/week: ${finalValues.shootsPerWeek}`);
    }
    if (finalValues.hoursPerShoot) {
      sections.push(`- Hours/shoot: ${finalValues.hoursPerShoot}`);
    }
    if (finalValues.billableRate) {
      sections.push(`- Billable rate: $${finalValues.billableRate}/hr`);
    }
    sections.push('');
  }

  // Time to value
  if (patterns.timeToValue > 0) {
    sections.push(`**Time to Value:** ${patterns.timeToValue}s (time until first value interaction)\n`);
  }

  // Hesitation signals
  if (patterns.hesitationSignals.length > 0) {
    sections.push('**⚠️ Abandonment Signals:**');
    patterns.hesitationSignals.forEach(signal => {
      sections.push(`- ${signal}`);
    });
    sections.push('');
  }

  // Recommended approach
  sections.push('**Recommended Approach:**');
  sections.push(getRecommendedApproach(patterns));

  return sections.join('\n');
}

/**
 * Generate strategic recommendations based on patterns
 */
function getRecommendedApproach(patterns: ActivityPatterns): string {
  const { journeyPhase, purchaseIntent, hesitationSignals, calculatorEngagement, topicsOfInterest } = patterns;

  // Abandonment phase
  if (journeyPhase === 'abandonment') {
    if (hesitationSignals.some(s => s.includes('pricing'))) {
      return '🚨 **ADDRESS PRICING CONCERNS IMMEDIATELY**\n- They viewed pricing but didn\'t proceed\n- Offer to explain value vs cost\n- Ask what budget they had in mind\n- Consider offering limited-time discount';
    }
    if (hesitationSignals.some(s => s.includes('calculator'))) {
      return '🚨 **CALCULATOR ENGAGEMENT WITHOUT CONVERSION**\n- They saw the value but didn\'t act\n- Ask what\'s holding them back\n- Reinforce the ROI they calculated\n- Create urgency with time-limited offer';
    }
    return '🚨 **HIGH ABANDONMENT RISK**\n- Multiple hesitation signals detected\n- Slow down and ask permission-based questions\n- Identify the specific objection\n- Don\'t push - build trust first';
  }

  // Decision phase
  if (journeyPhase === 'decision') {
    if (purchaseIntent >= 80) {
      return '🎯 **READY TO CLOSE**\n- Very high purchase intent\n- Present offer directly\n- Create urgency with time-limited bonus\n- Ask for the sale confidently';
    }
    return '🎯 **CLOSE TO DECISION**\n- Strong intent signals detected\n- Address final objections\n- Reinforce value and urgency\n- Guide toward next step (trial or demo)';
  }

  // Consideration phase
  if (journeyPhase === 'consideration') {
    if (calculatorEngagement.adjustmentCount > 3) {
      return '🤔 **DEEP CALCULATOR ENGAGEMENT**\n- They\'re seriously evaluating ROI\n- Reference their specific numbers in conversation\n- Show how others with similar metrics succeeded\n- Move toward commitment question';
    }
    if (topicsOfInterest.includes('features')) {
      return '🤔 **FEATURE-FOCUSED**\n- Interested in capabilities\n- Demo specific features they viewed\n- Connect features to their pain points\n- Get commitment before showing more';
    }
    if (topicsOfInterest.includes('testimonials')) {
      return '🤔 **NEEDS SOCIAL PROOF**\n- Seeking validation from others\n- Share specific case studies matching their profile\n- Offer to connect them with current customer\n- Build credibility before asking for sale';
    }
    return '🤔 **ACTIVELY EVALUATING**\n- Engaged but not ready to buy yet\n- Ask discovery questions to understand needs\n- Focus on pain points, not features\n- Build urgency around their goals';
  }

  // Awareness phase
  return '👀 **EARLY AWARENESS STAGE**\n- Just starting to explore\n- Ask permission to ask questions\n- Focus on discovery, not selling\n- Understand their current situation first';
}

/**
 * Export for testing
 */
export const testHelpers = {
  normalizeActivity,
  detectRepeatedClicks,
  detectTopicsOfInterest,
  detectHesitationSignals,
  determineJourneyPhase,
  analyzeCalculatorEngagement,
  calculateTimeToValue,
  normalizeTarget,
  extractTopics,
  hasRapidScrolling,
  getRecommendedApproach,
};
