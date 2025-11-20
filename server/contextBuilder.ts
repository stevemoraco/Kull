// Centralized context building infrastructure for unified prompt architecture
// Consolidates all context building logic for both welcome and chat endpoints

import type { Request } from 'express';
import type { ConversationState } from './storage';
import { db } from './db';
import { conversationSteps } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { generateStateContext } from './conversationStateManager';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface UnifiedContext {
  userMetadata: string;
  calculatorData: string;
  sectionTiming: string;
  activityHistory: string;
  conversationMemory: string;
  conversationState: string;
  deviceFingerprint: string;
  sessionMetrics: string;
}

export interface UserMetadata {
  userName?: string;
  userEmail?: string;
  isLoggedIn: boolean;
  device: string;
  browser: string;
  ip: string;
  timezone?: string;
  currentPath?: string;
  visitedPages?: string[];
  recentActivity?: any[];
}

export interface CalculatorData {
  shootsPerWeek: number;
  hoursPerShoot: number;
  billableRate: number;
  hasManuallyAdjusted: boolean;
  hasClickedPreset: boolean;
}

export interface EnrichedCalculatorData extends CalculatorData {
  annualShoots: number;
  annualHours: number;
  annualCost: number;
  weeksSaved: number;
}

export interface SectionHistoryItem {
  id: string;
  title: string;
  totalTimeSpent: number;
}

export interface ActivityEvent {
  type: 'click' | 'hover' | 'input' | 'select';
  target: string;
  value?: string;
  timestamp: string;
}

export interface SessionMetrics {
  timeOnSite: number;
  currentTime?: number;
  lastAiMessageTime?: number;
  scrollY?: number;
  scrollDepth?: number;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extract user metadata from request and body
 */
export function buildUserMetadata(req: Request, body: any): UserMetadata {
  // Extract IP address (check various headers for proxy/load balancer scenarios)
  const ip = req.headers['cf-connecting-ip'] as string ||
             req.headers['x-real-ip'] as string ||
             (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
             (req as any).connection?.remoteAddress ||
             (req as any).socket?.remoteAddress ||
             'unknown';

  // Parse user agent for device and browser
  const userAgent = req.headers['user-agent'] || '';
  let device = 'Desktop';
  if (/mobile/i.test(userAgent)) device = 'Mobile';
  else if (/tablet|ipad/i.test(userAgent)) device = 'Tablet';

  let browser = 'Unknown';
  if (/chrome/i.test(userAgent) && !/edg/i.test(userAgent)) browser = 'Chrome';
  else if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) browser = 'Safari';
  else if (/firefox/i.test(userAgent)) browser = 'Firefox';
  else if (/edg/i.test(userAgent)) browser = 'Edge';

  return {
    userName: body.userName || (req as any).user?.claims?.name,
    userEmail: body.userEmail || (req as any).user?.claims?.email,
    isLoggedIn: !!(req as any).user,
    device,
    browser,
    ip,
    timezone: body.timezone,
    currentPath: body.currentPath,
    visitedPages: body.visitedPages,
    recentActivity: body.recentActivity,
  };
}

/**
 * Enrich calculator data with calculated metrics
 */
export function enrichCalculatorData(calculatorData: CalculatorData): EnrichedCalculatorData {
  const annualShoots = calculatorData.shootsPerWeek * 44;
  const annualHours = calculatorData.shootsPerWeek * calculatorData.hoursPerShoot * 44;
  const annualCost = annualHours * calculatorData.billableRate;
  const weeksSaved = annualHours / 40;

  return {
    ...calculatorData,
    annualShoots,
    annualHours,
    annualCost,
    weeksSaved,
  };
}

/**
 * Format time in human-readable format (minutes and seconds)
 */
export function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

/**
 * Build device fingerprint from user agent and IP
 */
export function buildDeviceFingerprint(req: Request): string {
  const userAgent = req.headers['user-agent'] || '';
  const ip = req.headers['cf-connecting-ip'] as string ||
             req.headers['x-real-ip'] as string ||
             (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
             'unknown';

  // Simple hash function for fingerprinting
  const hash = (str: string): string => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  };

  return `${hash(userAgent)}_${hash(ip)}`;
}

/**
 * Build session metrics markdown
 */
export function buildSessionMetrics(metrics: SessionMetrics): string {
  const minutes = Math.floor(metrics.timeOnSite / 60000);
  const seconds = Math.floor((metrics.timeOnSite % 60000) / 1000);
  const timeOnSiteFormatted = minutes > 0
    ? `${minutes}m ${seconds}s`
    : `${seconds}s`;

  let markdown = `## ⏱️ Session Metrics\n`;
  markdown += `- **Time on Site:** ${timeOnSiteFormatted}\n`;

  if (metrics.scrollY !== undefined && metrics.scrollDepth !== undefined) {
    markdown += `- **Scroll Position:** ${metrics.scrollY}px (${metrics.scrollDepth}% down the page)\n`;

    if (metrics.scrollDepth > 70) {
      markdown += `- **🔥 Highly Engaged:** User has scrolled >70% of the page\n`;
    } else if (metrics.scrollDepth < 20) {
      markdown += `- **⚠️ Early Stage:** User just started reading\n`;
    }
  }

  return markdown;
}

/**
 * Build user metadata markdown
 */
export function buildUserMetadataMarkdown(metadata: UserMetadata): string {
  let markdown = `## 👤 User Session Metadata\n`;

  if (metadata.userName) {
    markdown += `- **Name:** ${metadata.userName}\n`;
  }
  if (metadata.userEmail) {
    markdown += `- **Email:** ${metadata.userEmail}\n`;
  }

  markdown += `- **Login Status:** ${metadata.isLoggedIn ? '🟢 Logged In' : '🔴 Not Logged In'}\n`;
  markdown += `- **Device:** ${metadata.device}\n`;
  markdown += `- **Browser:** ${metadata.browser}\n`;
  markdown += `- **IP Address:** ${metadata.ip}\n`;

  if (metadata.timezone) {
    markdown += `- **Timezone:** ${metadata.timezone}\n`;
  }
  if (metadata.currentPath) {
    markdown += `- **Current Page:** ${metadata.currentPath}\n`;
  }
  if (metadata.visitedPages && metadata.visitedPages.length > 0) {
    markdown += `- **Visited Pages:** ${metadata.visitedPages.join(' → ')}\n`;
  }
  if (metadata.recentActivity && metadata.recentActivity.length > 0) {
    markdown += `- **Recent Activity (last ${Math.min(5, metadata.recentActivity.length)} actions):**\n`;
    markdown += metadata.recentActivity.slice(-5).map((a: any) => `  - ${a.action}: ${a.target}`).join('\n') + '\n';
  }

  return markdown;
}

/**
 * Build calculator data markdown with enriched calculations
 */
export function buildCalculatorDataMarkdown(calculatorData: CalculatorData | null): string {
  if (!calculatorData) {
    return '';
  }

  const enriched = enrichCalculatorData(calculatorData);

  let markdown = `\n\n## 💰 Calculator Data (Real-Time)\n\n`;
  markdown += `User's current calculator inputs:\n`;
  markdown += `- **Shoots per Week:** ${enriched.shootsPerWeek}\n`;
  markdown += `- **Hours per Shoot (Culling):** ${enriched.hoursPerShoot}\n`;
  markdown += `- **Billable Rate:** $${enriched.billableRate}/hour\n`;
  markdown += `- **Has Manually Adjusted:** ${enriched.hasManuallyAdjusted ? 'Yes' : 'No'}\n`;
  markdown += `- **Has Clicked Preset:** ${enriched.hasClickedPreset ? 'Yes' : 'No'}\n\n`;

  markdown += `**Calculated Metrics:**\n`;
  markdown += `- **Annual Shoots:** ${enriched.annualShoots} shoots/year\n`;
  markdown += `- **Annual Hours Wasted on Culling:** ${Math.round(enriched.annualHours)} hours/year\n`;
  markdown += `- **Annual Cost of Manual Culling:** $${Math.round(enriched.annualCost).toLocaleString()}/year\n`;
  markdown += `- **Work Weeks Saved:** ${enriched.weeksSaved.toFixed(1)} weeks/year\n\n`;

  markdown += `**IMPORTANT:** Use these numbers in your sales conversation! Reference their actual values when asking questions.\n`;

  return markdown;
}

/**
 * Build section timing markdown with insights
 */
export function buildSectionTimingMarkdown(sectionHistory: SectionHistoryItem[] | null): string {
  if (!sectionHistory || sectionHistory.length === 0) {
    return '';
  }

  // Sort sections by total time spent (descending)
  const sortedSections = [...sectionHistory].sort((a, b) => b.totalTimeSpent - a.totalTimeSpent);

  let markdown = `\n\n## ⏱️ Section Reading Time\n\n`;
  markdown += `User has spent time reading these sections (sorted by time spent):\n`;

  sortedSections.forEach((section, idx) => {
    const timeStr = formatTime(section.totalTimeSpent);
    const marker = idx === 0 ? ' (MOST INTERESTED)' : '';
    markdown += `${idx + 1}. **${section.title}** - ${timeStr}${marker}\n`;
  });

  // Add insights based on top section
  if (sortedSections.length > 0) {
    const topSection = sortedSections[0];
    const topicMap: Record<string, string> = {
      'calculator': 'ROI calculation and cost savings',
      'pricing': 'pricing plans and costs',
      'features': 'product capabilities',
      'hero': 'the landing page (just arrived)',
      'problem': 'pain points and challenges',
      'value': 'the value proposition',
      'testimonials': 'customer reviews and success stories',
      'faq': 'frequently asked questions',
      'cta': 'taking action / getting started',
    };

    let topicInsight = topSection.title.toLowerCase();
    for (const [key, value] of Object.entries(topicMap)) {
      if (topSection.id.toLowerCase().includes(key) || topSection.title.toLowerCase().includes(key)) {
        topicInsight = value;
        break;
      }
    }

    markdown += `\n**🎯 Key Insight:** User is most interested in ${topicInsight}\n\n`;
    markdown += `**💡 Recommendation:** Frame your questions around what they were reading. Examples:\n`;

    // Add contextual examples based on top section
    const timeStr = formatTime(topSection.totalTimeSpent);
    if (topSection.id.toLowerCase().includes('calculator')) {
      markdown += `- "i see you spent ${timeStr} playing with the calculator - did you find your numbers?"\n`;
      markdown += `- "those calculator numbers accurate for your workflow?"\n`;
    } else if (topSection.id.toLowerCase().includes('pricing')) {
      markdown += `- "you were looking at pricing for a while - have questions about the cost?"\n`;
      markdown += `- "you spent ${timeStr} on pricing - want to see how it compares to what you're wasting now?"\n`;
    } else if (topSection.id.toLowerCase().includes('feature')) {
      markdown += `- "you were checking out features - which one interests you most?"\n`;
      markdown += `- "spent ${timeStr} reading features - what stood out?"\n`;
    } else if (topSection.id.toLowerCase().includes('problem')) {
      markdown += `- "you spent time reading about pain points - which one hits hardest for you?"\n`;
      markdown += `- "those problems resonate with your workflow?"\n`;
    } else if (topSection.id.toLowerCase().includes('testimonial')) {
      markdown += `- "you were reading testimonials - any of those stories sound familiar?"\n`;
      markdown += `- "you spent ${timeStr} on case studies - which one matched your situation?"\n`;
    } else {
      markdown += `- "you spent ${timeStr} reading ${topSection.title} - what interests you most?"\n`;
    }

    markdown += `\n**⚠️ CRITICAL:** Reference the section they spent the most time on in your FIRST response. Show you're paying attention to what they're reading.\n\n`;
    markdown += `**🔗 If you want to scroll them to that section, use these EXACT links:**\n`;
    markdown += `- Calculator: [text](#calculator)\n`;
    markdown += `- Features/Demo: [text](#features)\n`;
    markdown += `- Pricing/Download: [text](#download)\n`;
    markdown += `- Testimonials/Reviews: [text](#referrals)\n`;
    markdown += `- Sign in: [text](/api/login)\n`;
  }

  return markdown;
}

/**
 * Build activity history markdown with ALL events (not filtered by time)
 */
export function buildActivityHistoryMarkdown(userActivity: ActivityEvent[] | null, metrics?: SessionMetrics): string {
  if (!userActivity || userActivity.length === 0) {
    return '\n\n## 🖱️ User Activity History\n\n- No recent activity tracked\n';
  }

  let markdown = `\n\n## 🖱️ User Activity History\n\n`;
  markdown += `Recent interactions (last ${userActivity.length} events):\n\n`;

  // Map all activity events
  userActivity.forEach((event, idx) => {
    const time = new Date(event.timestamp);
    const timeStr = time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    if (event.type === 'click') {
      const elementText = event.value ? ` - TEXT: "${event.value}"` : '';
      markdown += `${idx + 1}. **🖱️ CLICKED** \`${event.target}\`${elementText} at ${timeStr}\n`;
    } else if (event.type === 'hover') {
      markdown += `${idx + 1}. **👆 HOVERED** \`${event.target}\` at ${timeStr}\n`;
    } else if (event.type === 'input') {
      const displayValue = event.value && event.value.length > 0
        ? `"${event.value}"`
        : '(empty)';
      markdown += `${idx + 1}. **⌨️ TYPED** in \`${event.target}\`: ${displayValue} at ${timeStr}\n`;
    } else if (event.type === 'select') {
      markdown += `${idx + 1}. **✏️ HIGHLIGHTED TEXT**: "${event.value}" at ${timeStr}\n`;
    }
  });

  // Add activity insights
  markdown += `\n**Activity Insights:**\n`;
  markdown += `- **Total Clicks:** ${userActivity.filter(e => e.type === 'click').length}\n`;
  markdown += `- **Elements Hovered:** ${userActivity.filter(e => e.type === 'hover').length}\n`;
  markdown += `- **Input Events:** ${userActivity.filter(e => e.type === 'input').length}\n`;
  markdown += `- **Text Selections:** ${userActivity.filter(e => e.type === 'select').length}\n`;

  // Add recent activity section if metrics provided
  if (metrics?.currentTime && metrics?.lastAiMessageTime) {
    const secondsSinceLastMessage = Math.round((metrics.currentTime - metrics.lastAiMessageTime) / 1000);

    markdown += `\n\n## 🎯 MOST RECENT ACTIVITY (Since Your Last Message)\n\n`;
    markdown += `**⏰ CURRENT TIME FOR USER:** ${new Date(metrics.currentTime).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    })}\n\n`;

    markdown += `**🆕 NEW ACTIONS IN THE LAST ${secondsSinceLastMessage} SECONDS:**\n\n`;

    const recentActivity = userActivity.filter(e => {
      const eventTime = new Date(e.timestamp).getTime();
      return eventTime > metrics.lastAiMessageTime!;
    });

    if (recentActivity.length > 0) {
      recentActivity.forEach(event => {
        const time = new Date(event.timestamp);
        const secondsAgo = Math.round((metrics.currentTime! - time.getTime()) / 1000);

        if (event.type === 'click') {
          const elementText = event.value ? ` - TEXT: **"${event.value}"**` : '';
          markdown += `🔥 **JUST CLICKED** (${secondsAgo}s ago): \`${event.target}\`${elementText}\n`;
        } else if (event.type === 'hover') {
          markdown += `**JUST HOVERED** (${secondsAgo}s ago): \`${event.target}\`\n`;
        } else if (event.type === 'input') {
          const displayValue = event.value && event.value.length > 0 ? `"${event.value}"` : '(empty)';
          markdown += `⌨️ **JUST TYPED** (${secondsAgo}s ago) in \`${event.target}\`: ${displayValue}\n`;
        } else if (event.type === 'select') {
          markdown += `✏️ **JUST HIGHLIGHTED** (${secondsAgo}s ago): **"${event.value}"**\n`;
        }
      });
    } else {
      markdown += `- No new activity since your last message (they might be reading or thinking)\n`;
    }

    markdown += `\n**🎯 YOUR MISSION:**\n`;
    markdown += `Look at the NEW ACTIONS above. What did they JUST do? React to it DIRECTLY.\n`;
    markdown += `- Did they click something? Ask why that interested them\n`;
    markdown += `- Did they highlight text? Reference that exact text\n`;
    markdown += `- Did they hover over something? They're curious - dig into it\n`;
    markdown += `- Are they reading? Ask about what they're seeing on the page\n\n`;
    markdown += `Make your message feel personalized based on their real-time activity.\n`;
    markdown += `Use the exact text they clicked/highlighted in your response to prove you're paying attention!\n`;
  }

  return markdown;
}

/**
 * Load and format conversation memory from database
 */
export async function buildConversationMemoryMarkdown(sessionId: string | null): Promise<string> {
  if (!sessionId) {
    return '';
  }

  try {
    const loadedSteps = await db
      .select()
      .from(conversationSteps)
      .where(eq(conversationSteps.sessionId, sessionId))
      .orderBy(conversationSteps.stepNumber);

    if (loadedSteps.length === 0) {
      return '';
    }

    let markdown = '\n\n## 🧠 CONVERSATION MEMORY\n\n';
    markdown += 'Review what the user has ALREADY told you:\n\n';

    loadedSteps.forEach((step: any, index: number) => {
      markdown += `**${step.stepName}:**\n`;
      if (step.aiQuestion) {
        const questionPreview = step.aiQuestion.substring(0, 150) + (step.aiQuestion.length > 150 ? '...' : '');
        markdown += `  You asked: "${questionPreview}"\n`;
      }
      if (step.userResponse) {
        markdown += `  They said: "${step.userResponse}"\n`;
      }
      markdown += '\n';
    });

    markdown += '\n**CRITICAL MEMORY USAGE RULES:**\n';
    markdown += '- DO NOT ask for information they already provided above\n';
    markdown += '- DO reference their previous answers in your new questions\n';
    markdown += '- Example: "to hit your 150-shoot goal..." NOT "what\'s your goal?"\n';
    markdown += '- If they said "I want 200 shoots", later say "your 200-shoot goal" not "how many shoots?"\n\n';

    console.log(`[Context Builder] Loaded ${loadedSteps.length} previous Q&A pairs for session ${sessionId}`);

    return markdown;
  } catch (error) {
    console.error('[Context Builder] Failed to load conversation memory:', error);
    return '';
  }
}

/**
 * Format conversation state markdown
 */
export function buildConversationStateMarkdown(state: ConversationState | null): string {
  if (!state) {
    return '';
  }

  return generateStateContext(state);
}

// ============================================================================
// MAIN CONTEXT BUILDER
// ============================================================================

/**
 * Build unified context for AI prompts
 * Consolidates all context building logic into a single source of truth
 */
export async function buildUnifiedContext(
  req: Request,
  body: any,
  sessionId: string | null,
  calculatorData: CalculatorData | null,
  sectionHistory: SectionHistoryItem[] | null,
  userActivity: ActivityEvent[] | null,
  conversationState: ConversationState | null,
  sessionMetrics: SessionMetrics
): Promise<UnifiedContext> {
  // Extract and build all context components
  const metadata = buildUserMetadata(req, body);

  const userMetadataMarkdown = buildUserMetadataMarkdown(metadata);
  const calculatorDataMarkdown = buildCalculatorDataMarkdown(calculatorData);
  const sectionTimingMarkdown = buildSectionTimingMarkdown(sectionHistory);
  const activityHistoryMarkdown = buildActivityHistoryMarkdown(userActivity, sessionMetrics);
  const conversationMemoryMarkdown = await buildConversationMemoryMarkdown(sessionId);
  const conversationStateMarkdown = buildConversationStateMarkdown(conversationState);
  const deviceFingerprintMarkdown = `## 🔐 Device Fingerprint\n- **ID:** ${buildDeviceFingerprint(req)}\n`;
  const sessionMetricsMarkdown = buildSessionMetrics(sessionMetrics);

  return {
    userMetadata: userMetadataMarkdown,
    calculatorData: calculatorDataMarkdown,
    sectionTiming: sectionTimingMarkdown,
    activityHistory: activityHistoryMarkdown,
    conversationMemory: conversationMemoryMarkdown,
    conversationState: conversationStateMarkdown,
    deviceFingerprint: deviceFingerprintMarkdown,
    sessionMetrics: sessionMetricsMarkdown,
  };
}

/**
 * Combine all context into a single markdown document
 */
export function combineContextMarkdown(context: UnifiedContext): string {
  return [
    context.userMetadata,
    context.sessionMetrics,
    context.deviceFingerprint,
    context.calculatorData,
    context.sectionTiming,
    context.activityHistory,
    context.conversationMemory,
    context.conversationState,
  ].filter(Boolean).join('\n');
}
