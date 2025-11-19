// Activity detector to identify user's current focus from activity stream

export type ActivityType = 'pricing' | 'calculator' | 'features' | 'security' | 'testimonials' | null;

/**
 * Activity event from frontend tracking
 */
interface UserActivityEvent {
  type: 'click' | 'hover' | 'input' | 'select' | 'scroll';
  target: string;
  value?: string;
  timestamp: number;
}

/**
 * Detect what the user is currently interested in based on recent activity
 *
 * Strategy:
 * - Look at last 10 events (most recent activity)
 * - Prioritize clicks over hovers (clicks = stronger intent)
 * - Check for keywords in target/value fields
 * - Return the most relevant activity type
 *
 * @param userActivity - Array of activity events from frontend
 * @returns Activity type or null if no specific activity detected
 */
export function detectActivityType(userActivity: UserActivityEvent[]): ActivityType {
  if (!userActivity || userActivity.length === 0) {
    return null;
  }

  // Get recent activity (last 10 events)
  const recentActivity = userActivity.slice(-10);

  // Separate clicks from other events (clicks = stronger signal)
  const recentClicks = recentActivity.filter(a => a.type === 'click');
  const recentHovers = recentActivity.filter(a => a.type === 'hover');

  // Check clicks first (stronger intent signal)
  const clickActivity = detectFromEvents(recentClicks);
  if (clickActivity) return clickActivity;

  // Fall back to hovers (weaker signal, but still useful)
  const hoverActivity = detectFromEvents(recentHovers);
  if (hoverActivity) return hoverActivity;

  // Check all recent events as fallback
  return detectFromEvents(recentActivity);
}

/**
 * Detect activity type from a set of events
 */
function detectFromEvents(events: UserActivityEvent[]): ActivityType {
  if (events.length === 0) return null;

  // Count occurrences of each activity type
  const activityScores = {
    pricing: 0,
    calculator: 0,
    features: 0,
    security: 0,
    testimonials: 0,
  };

  events.forEach(event => {
    const text = `${event.target} ${event.value || ''}`.toLowerCase();

    // Pricing indicators (strongest signals first)
    if (
      /pricing|price|cost|payment|subscribe|subscription|plan|tier/i.test(text) ||
      /\$|dollar|monthly|annual|yr|\/mo/i.test(text)
    ) {
      activityScores.pricing += event.type === 'click' ? 3 : 1;
    }

    // Calculator indicators
    if (
      /calculator|slider|shoots.*week|hours.*shoot|billable.*rate|input/i.test(text) ||
      /preset|less|more|adjust/i.test(text) ||
      event.target.includes('calculator') ||
      event.target.includes('slider') ||
      event.target.includes('input')
    ) {
      activityScores.calculator += event.type === 'click' ? 3 : 1;
    }

    // Features indicators
    if (
      /feature|culling|ai|automation|workflow|benefit|capability/i.test(text) ||
      /rating|star|selection|export|lightroom/i.test(text)
    ) {
      activityScores.features += event.type === 'click' ? 3 : 1;
    }

    // Security indicators
    if (
      /security|secure|encrypt|privacy|data|safe|gdpr|compliance/i.test(text) ||
      /protect|delete|store|upload/i.test(text)
    ) {
      activityScores.security += event.type === 'click' ? 3 : 1;
    }

    // Testimonials indicators
    if (
      /testimonial|review|customer|photographer|case.*study/i.test(text) ||
      /client|user.*story|success/i.test(text)
    ) {
      activityScores.testimonials += event.type === 'click' ? 3 : 1;
    }
  });

  // Find highest scoring activity
  const entries = Object.entries(activityScores) as [ActivityType, number][];
  const sorted = entries.sort((a, b) => b[1] - a[1]);

  // Return highest score if it's > 0
  if (sorted[0][1] > 0) {
    return sorted[0][0];
  }

  return null;
}

/**
 * Get a human-readable description of the detected activity
 * Useful for logging and debugging
 */
export function getActivityDescription(activityType: ActivityType): string {
  switch (activityType) {
    case 'pricing':
      return 'checking pricing information';
    case 'calculator':
      return 'interacting with calculator';
    case 'features':
      return 'exploring features';
    case 'security':
      return 'reviewing security/privacy';
    case 'testimonials':
      return 'reading testimonials';
    default:
      return 'browsing';
  }
}

/**
 * Check if activity integration is valid
 * Activity mentions must be accompanied by script questions
 *
 * @param response - AI response text
 * @param hadActivityDetected - Whether we detected activity for this response
 * @returns True if integration is valid, false if activity mentioned without question
 */
export function validateActivityIntegration(
  response: string,
  hadActivityDetected: boolean
): boolean {
  const mentionsActivity = /pricing|calculator|feature|hover|click|checking|adjusting|exploring/i.test(response);
  const hasQuestion = /\?/.test(response);

  // If we detected activity and AI mentioned it, ensure there's a question
  if (hadActivityDetected && mentionsActivity && !hasQuestion) {
    console.warn('[Activity Integration] ❌ Mentioned activity but no script question found');
    return false;
  }

  return true;
}
