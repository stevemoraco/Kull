// Engagement analyzer to turn section timing and activity into strategic insights
// This system analyzes user behavior to provide sales recommendations

export interface SectionTimingEntry {
  id: string;
  title: string;
  totalTimeSpent: number; // milliseconds
  visitCount: number;
}

export interface UserActivityEvent {
  type: 'click' | 'hover' | 'input' | 'select' | 'scroll';
  target: string;
  value?: string;
  timestamp: number;
}

export interface CalculatorData {
  shootsPerWeek: number;
  hoursPerShoot: number;
  billableRate: number;
  hasManuallyAdjusted: boolean;
  hasClickedPreset: boolean;
}

export interface EngagementAnalysis {
  primaryInterest: string; // "ROI/Cost Savings" | "Product Features" | etc
  engagementLevel: number; // 0-100 score
  objectionSignals: string[]; // ["price_concern", "feature_doubt"]
  readyToBuy: boolean;
  confidence: number; // 0-100
  recommendedApproach: string;
  scriptAdaptations: string[];
}

/**
 * Analyze user engagement depth and provide strategic recommendations
 *
 * This function combines:
 * - Section timing data (where they spent time)
 * - User activity (what they clicked/interacted with)
 * - Calculator data (if they engaged with ROI calculator)
 *
 * @param sectionTiming - Array of section timing entries
 * @param userActivity - Array of user activity events
 * @param calculatorData - Calculator data (if available)
 * @returns Engagement analysis with strategic recommendations
 */
export function analyzeEngagement(
  sectionTiming: SectionTimingEntry[],
  userActivity: UserActivityEvent[],
  calculatorData?: CalculatorData
): EngagementAnalysis {
  // Calculate primary interest
  const primaryInterest = detectPrimaryInterest(sectionTiming, userActivity, calculatorData);

  // Calculate engagement level
  const engagementLevel = calculateEngagementLevel(sectionTiming, userActivity);

  // Detect objection signals
  const objectionSignals = detectObjectionSignals(sectionTiming, userActivity, calculatorData);

  // Assess readiness to buy
  const { ready, confidence } = assessReadiness(sectionTiming, userActivity, calculatorData);

  // Generate strategic approach
  const recommendedApproach = generateApproach(
    primaryInterest,
    objectionSignals,
    engagementLevel,
    ready
  );

  // Generate script adaptations
  const scriptAdaptations = generateScriptAdaptations(
    primaryInterest,
    objectionSignals,
    engagementLevel
  );

  return {
    primaryInterest,
    engagementLevel,
    objectionSignals,
    readyToBuy: ready,
    confidence,
    recommendedApproach,
    scriptAdaptations,
  };
}

/**
 * Detect primary interest based on section timing and activity
 *
 * Priority order:
 * 1. Calculator = ROI/Cost Savings (highest intent)
 * 2. Features = Product Capabilities
 * 3. Testimonials = Social Proof
 * 4. Pricing = Cost Evaluation
 * 5. Problem = Pain Points
 * 6. Default = General Interest
 */
function detectPrimaryInterest(
  sectionTiming: SectionTimingEntry[],
  userActivity: UserActivityEvent[],
  calculatorData?: CalculatorData
): string {
  // Sort sections by time spent
  const sortedSections = [...sectionTiming].sort(
    (a, b) => b.totalTimeSpent - a.totalTimeSpent
  );

  if (sortedSections.length === 0) {
    return 'General Interest';
  }

  const topSection = sortedSections[0];
  const sectionId = topSection.id.toLowerCase();

  // Calculator interaction is the strongest signal
  if (
    sectionId.includes('calculator') ||
    sectionId.includes('value') ||
    calculatorData?.hasManuallyAdjusted
  ) {
    return 'ROI/Cost Savings';
  }

  // Feature exploration
  if (
    sectionId.includes('feature') ||
    sectionId.includes('solution') ||
    sectionId.includes('demo')
  ) {
    return 'Product Features';
  }

  // Social proof seeking
  if (sectionId.includes('testimonial') || sectionId.includes('review')) {
    return 'Social Proof';
  }

  // Pricing evaluation
  if (sectionId.includes('pricing') || sectionId.includes('plan')) {
    return 'Cost Evaluation';
  }

  // Pain point awareness
  if (sectionId.includes('problem') || sectionId.includes('pain')) {
    return 'Pain Points';
  }

  // CTA section
  if (sectionId.includes('cta') || sectionId.includes('download')) {
    return 'Ready to Act';
  }

  return 'General Interest';
}

/**
 * Calculate engagement level (0-100 score)
 *
 * Scoring breakdown:
 * - Time on site: up to 30 points (1 point per 6 seconds)
 * - Interaction count: up to 30 points (0.5 per interaction)
 * - Section depth: up to 20 points (10 per section visited)
 * - Deep engagement: up to 20 points (5 per input/select)
 */
function calculateEngagementLevel(
  sectionTiming: SectionTimingEntry[],
  userActivity: UserActivityEvent[]
): number {
  let score = 0;

  // 1. Time on site (max 30 points)
  const totalTime = sectionTiming.reduce((sum, s) => sum + s.totalTimeSpent, 0);
  const timeScore = Math.min(Math.floor(totalTime / 1000 / 6), 30); // 1 point per 6 seconds
  score += timeScore;

  // 2. Interaction count (max 30 points)
  const interactionScore = Math.min(Math.floor(userActivity.length * 0.5), 30);
  score += interactionScore;

  // 3. Section depth (max 20 points)
  // Count sections with meaningful time (> 5 seconds)
  const sectionsVisited = sectionTiming.filter(s => s.totalTimeSpent > 5000).length;
  const sectionScore = Math.min(sectionsVisited * 10, 20);
  score += sectionScore;

  // 4. Deep engagement signals (max 20 points)
  const deepSignals = userActivity.filter(e =>
    e.type === 'input' || e.type === 'select'
  ).length;
  const deepScore = Math.min(deepSignals * 5, 20);
  score += deepScore;

  return Math.min(Math.round(score), 100);
}

/**
 * Detect objection signals from user behavior
 *
 * Signals include:
 * - Price concern: Highlighted price + low engagement with value sections
 * - Feature doubt: Time on features but didn't engage with CTA
 * - Social proof needed: Multiple visits to testimonials
 * - Trust issues: Visited privacy/terms/security pages
 * - Comparison shopping: Quick visits to multiple sections
 */
function detectObjectionSignals(
  sectionTiming: SectionTimingEntry[],
  userActivity: UserActivityEvent[],
  calculatorData?: CalculatorData
): string[] {
  const objections: string[] = [];

  // Price concern detection
  const pricingSection = sectionTiming.find(s =>
    s.id.toLowerCase().includes('pricing') || s.id.toLowerCase().includes('plan')
  );

  if (pricingSection && pricingSection.totalTimeSpent > 10000) {
    // Spent >10s on pricing
    const priceClicks = userActivity.filter(e =>
      e.type === 'click' &&
      (e.target.toLowerCase().includes('price') || e.target.toLowerCase().includes('plan'))
    ).length;

    if (priceClicks >= 3) {
      objections.push('price_concern');
    }
  }

  // Feature doubt detection
  const featureSection = sectionTiming.find(s =>
    s.id.toLowerCase().includes('feature') || s.id.toLowerCase().includes('solution')
  );

  if (featureSection && featureSection.totalTimeSpent > 15000) {
    // Spent >15s on features but didn't click CTA
    const ctaClicks = userActivity.filter(e =>
      e.type === 'click' &&
      (e.target.toLowerCase().includes('cta') ||
       e.target.toLowerCase().includes('download') ||
       e.target.toLowerCase().includes('start'))
    ).length;

    if (ctaClicks === 0) {
      objections.push('feature_doubt');
    }
  }

  // Social proof needed detection
  const testimonialSection = sectionTiming.find(s =>
    s.id.toLowerCase().includes('testimonial') || s.id.toLowerCase().includes('review')
  );

  if (testimonialSection && testimonialSection.visitCount > 1) {
    objections.push('needs_social_proof');
  }

  // Trust issues detection
  const securityIndicators = userActivity.filter(e =>
    e.target.toLowerCase().includes('privacy') ||
    e.target.toLowerCase().includes('security') ||
    e.target.toLowerCase().includes('terms') ||
    e.target.toLowerCase().includes('gdpr')
  ).length;

  if (securityIndicators > 0) {
    objections.push('trust_concerns');
  }

  // Comparison shopping detection
  // Quick visits (<5s) to many sections (>5 sections)
  const quickVisits = sectionTiming.filter(s =>
    s.totalTimeSpent > 0 && s.totalTimeSpent < 5000
  ).length;

  if (quickVisits > 5) {
    objections.push('comparison_shopping');
  }

  // Calculator abandonment detection
  if (calculatorData && calculatorData.hasClickedPreset && !calculatorData.hasManuallyAdjusted) {
    // Clicked preset but didn't customize = not serious yet
    objections.push('not_personalizing');
  }

  return objections;
}

/**
 * Assess readiness to buy
 *
 * Scoring factors:
 * - Visited calculator: 30 points
 * - Visited features: 20 points
 * - Visited pricing: 25 points
 * - Visited testimonials: 15 points
 * - Adjusted calculator: 10 points
 *
 * Ready if score >= 60
 */
function assessReadiness(
  sectionTiming: SectionTimingEntry[],
  userActivity: UserActivityEvent[],
  calculatorData?: CalculatorData
): { ready: boolean; confidence: number } {
  let readyScore = 0;

  // Calculator engagement (30 points)
  const calculatorSection = sectionTiming.find(s =>
    s.id.toLowerCase().includes('calculator') || s.id.toLowerCase().includes('value')
  );
  if (calculatorSection && calculatorSection.totalTimeSpent > 30000) {
    readyScore += 30;
  } else if (calculatorSection && calculatorSection.totalTimeSpent > 10000) {
    readyScore += 15;
  }

  // Features exploration (20 points)
  const featuresSection = sectionTiming.find(s =>
    s.id.toLowerCase().includes('feature') || s.id.toLowerCase().includes('solution')
  );
  if (featuresSection && featuresSection.totalTimeSpent > 0) {
    readyScore += 20;
  }

  // Pricing review (25 points)
  const pricingSection = sectionTiming.find(s =>
    s.id.toLowerCase().includes('pricing') || s.id.toLowerCase().includes('plan')
  );
  if (pricingSection && pricingSection.totalTimeSpent > 0) {
    readyScore += 25;
  }

  // Testimonials review (15 points)
  const testimonialsSection = sectionTiming.find(s =>
    s.id.toLowerCase().includes('testimonial') || s.id.toLowerCase().includes('review')
  );
  if (testimonialsSection && testimonialsSection.totalTimeSpent > 0) {
    readyScore += 15;
  }

  // Calculator adjustment (10 points)
  if (calculatorData?.hasManuallyAdjusted) {
    readyScore += 10;
  }

  return {
    ready: readyScore >= 60,
    confidence: readyScore,
  };
}

/**
 * Generate recommended approach based on analysis
 */
function generateApproach(
  primaryInterest: string,
  objections: string[],
  engagementLevel: number,
  ready: boolean
): string {
  // High engagement + ready - close mode (highest priority)
  if (engagementLevel >= 70 && ready) {
    return 'CLOSE_MODE: High engagement and strong buying signals. Move through discovery quickly and present offer.';
  }

  // Price concerns - value focus (check before low engagement)
  if (objections.includes('price_concern')) {
    return 'VALUE_FOCUS: User is price-sensitive. Emphasize ROI, time savings, and cost justification. Use calculator data heavily.';
  }

  // Feature doubts - demo mode
  if (objections.includes('feature_doubt')) {
    return 'DEMO_MODE: User needs to see it work. Emphasize proof points, case studies, and concrete examples.';
  }

  // Needs social proof
  if (objections.includes('needs_social_proof')) {
    return 'SOCIAL_PROOF: User needs validation. Reference specific testimonials, success stories, and use cases.';
  }

  // Trust concerns
  if (objections.includes('trust_concerns')) {
    return 'BUILD_TRUST: Address security, privacy, and reliability upfront. Be transparent about data handling.';
  }

  // Comparison shopping
  if (objections.includes('comparison_shopping')) {
    return 'DIFFERENTIATE: User is comparing options. Focus on unique value props and what makes Kull different.';
  }

  // Low engagement - warm them up (after objection checks)
  if (engagementLevel < 30) {
    return 'WARM_UP: User is just browsing. Focus on discovery questions and building rapport. Don\'t rush to pitch.';
  }

  // ROI focused
  if (primaryInterest === 'ROI/Cost Savings') {
    return 'ROI_FOCUS: Lead with numbers and business impact. User is analytical and wants hard data.';
  }

  // Feature focused
  if (primaryInterest === 'Product Features') {
    return 'FEATURE_FOCUS: Deep dive into capabilities and use cases. User wants to understand how it works.';
  }

  // Default balanced approach
  return 'BALANCED: Standard discovery flow. Adapt based on their responses to early questions.';
}

/**
 * Generate script adaptations based on engagement patterns
 */
function generateScriptAdaptations(
  primaryInterest: string,
  objections: string[],
  engagementLevel: number
): string[] {
  const adaptations: string[] = [];

  // Primary interest adaptations
  if (primaryInterest === 'ROI/Cost Savings') {
    adaptations.push('Lead with calculator insights - reference their specific numbers early');
    adaptations.push('Frame questions around business growth and time saved');
    adaptations.push('Use concrete ROI examples when presenting offer');
  } else if (primaryInterest === 'Product Features') {
    adaptations.push('Emphasize specific features they reviewed in your questions');
    adaptations.push('Use technical details and workflow explanations');
    adaptations.push('Reference feature comparisons they may have seen');
  } else if (primaryInterest === 'Social Proof') {
    adaptations.push('Reference testimonials from similar photographers');
    adaptations.push('Name-drop specific customers or case studies');
    adaptations.push('Use social proof language throughout');
  }

  // Objection-specific adaptations
  if (objections.includes('price_concern')) {
    adaptations.push('Address pricing early and transparently');
    adaptations.push('Break down cost per shoot to make it tangible');
    adaptations.push('Emphasize value and ROI before revealing price');
  }

  if (objections.includes('feature_doubt')) {
    adaptations.push('Offer specific examples and proof points');
    adaptations.push('Reference demo video or trial offer');
    adaptations.push('Use before/after comparisons');
  }

  if (objections.includes('needs_social_proof')) {
    adaptations.push('Lead with testimonials and success stories');
    adaptations.push('Mention number of photographers using Kull');
    adaptations.push('Reference specific results from similar users');
  }

  if (objections.includes('trust_concerns')) {
    adaptations.push('Address security and privacy proactively');
    adaptations.push('Mention encryption, data deletion, and compliance');
    adaptations.push('Emphasize reliability and uptime');
  }

  if (objections.includes('comparison_shopping')) {
    adaptations.push('Differentiate from competitors without naming them');
    adaptations.push('Focus on unique value propositions');
    adaptations.push('Emphasize speed, accuracy, and cost advantages');
  }

  if (objections.includes('not_personalizing')) {
    adaptations.push('Encourage them to input their actual numbers');
    adaptations.push('Ask about their specific situation to make it real');
  }

  // Engagement level adaptations
  if (engagementLevel < 30) {
    adaptations.push('Take it slow - focus on building rapport first');
    adaptations.push('Ask more discovery questions before pitching');
  } else if (engagementLevel >= 70) {
    adaptations.push('Move faster - they\'re engaged and ready');
    adaptations.push('Don\'t over-explain, get to the offer');
  }

  return adaptations.length > 0 ? adaptations : ['Use standard script approach'];
}

/**
 * Get a human-readable summary of the engagement analysis
 * Useful for admin dashboards and logging
 */
export function getEngagementSummary(analysis: EngagementAnalysis): string {
  const lines: string[] = [];

  lines.push(`Primary Interest: ${analysis.primaryInterest}`);
  lines.push(`Engagement Level: ${analysis.engagementLevel}/100`);
  lines.push(`Ready to Buy: ${analysis.readyToBuy ? 'YES' : 'NO'} (${analysis.confidence}% confidence)`);

  if (analysis.objectionSignals.length > 0) {
    lines.push(`Objections: ${analysis.objectionSignals.join(', ')}`);
  }

  lines.push(`Recommended Approach: ${analysis.recommendedApproach}`);

  if (analysis.scriptAdaptations.length > 0) {
    lines.push(`Script Adaptations:`);
    analysis.scriptAdaptations.forEach(adaptation => {
      lines.push(`  - ${adaptation}`);
    });
  }

  return lines.join('\n');
}

/**
 * Format engagement analysis for display in chat context
 * Used by the sales script AI to understand user's engagement
 */
export function formatEngagementForContext(analysis: EngagementAnalysis): string {
  return `
## 🎯 Engagement Analysis

**Primary Interest:** ${analysis.primaryInterest}
**Engagement Level:** ${analysis.engagementLevel}/100 ${getEngagementEmoji(analysis.engagementLevel)}
**Ready to Buy:** ${analysis.readyToBuy ? '✅ YES' : '⏳ NOT YET'} (Confidence: ${analysis.confidence}%)

${analysis.objectionSignals.length > 0 ? `**⚠️ Detected Objections:**
${analysis.objectionSignals.map(o => `- ${formatObjection(o)}`).join('\n')}
` : ''}

**📋 Recommended Approach:**
${analysis.recommendedApproach}

**🔧 Script Adaptations:**
${analysis.scriptAdaptations.map(a => `- ${a}`).join('\n')}
`;
}

function getEngagementEmoji(level: number): string {
  if (level >= 80) return '🔥';
  if (level >= 60) return '👍';
  if (level >= 40) return '😐';
  if (level >= 20) return '😕';
  return '😴';
}

function formatObjection(objection: string): string {
  const labels: Record<string, string> = {
    price_concern: 'Price Concern (spent time reviewing pricing)',
    feature_doubt: 'Feature Doubt (reviewed features but didn\'t engage)',
    needs_social_proof: 'Needs Social Proof (multiple visits to testimonials)',
    trust_concerns: 'Trust Concerns (reviewed security/privacy)',
    comparison_shopping: 'Comparison Shopping (quick visits to many sections)',
    not_personalizing: 'Not Personalizing (clicked preset but didn\'t adjust)',
  };

  return labels[objection] || objection;
}
