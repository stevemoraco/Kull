/**
 * Repository Knowledge Base Cache
 *
 * This file handles Layer 2 of the prompt caching strategy:
 * - Loads GitHub repository content ONCE at server startup
 * - Includes behavioral intelligence framework
 * - Includes section definitions
 * - Includes objection playbook
 * - All content is STATIC and cacheable
 *
 * The knowledge base is loaded into memory at startup and served
 * from cache for all subsequent requests, minimizing fetch overhead
 * and maximizing OpenAI prompt cache hits.
 */

import { getRepoContent as fetchRepoContent } from '../fetchRepo';

/**
 * In-memory cache for the static knowledge base
 * Loaded once at server startup, persists for the lifetime of the process
 */
let cachedKnowledgeBase: string | null = null;

/**
 * Cache Metrics Tracking
 *
 * Tracks cache performance to monitor prompt caching effectiveness:
 * - hits: Number of times cache was used
 * - misses: Number of times cache had to be built
 * - totalRetrievals: Total number of retrieval attempts
 * - lastHitTime: Timestamp of most recent cache hit
 * - lastMissTime: Timestamp of most recent cache miss
 * - averageRetrievalTime: Average time to retrieve from cache
 * - retrievalTimes: Recent retrieval times (rolling window)
 */
interface CacheMetrics {
  hits: number;
  misses: number;
  totalRetrievals: number;
  lastHitTime: number | null;
  lastMissTime: number | null;
  averageRetrievalTime: number;
  retrievalTimes: number[];
}

const metrics: CacheMetrics = {
  hits: 0,
  misses: 0,
  totalRetrievals: 0,
  lastHitTime: null,
  lastMissTime: null,
  averageRetrievalTime: 0,
  retrievalTimes: [],
};

/**
 * Behavioral Pattern Definitions
 *
 * These rules help the AI interpret user activity data.
 * They are STATIC - they don't change based on the user.
 */
const BEHAVIORAL_PATTERNS = `
**BEHAVIORAL PATTERN DEFINITIONS:**

**High Interest Signals:**
- Spent >2 minutes on Calculator → Evaluating ROI, serious about cost
- Spent >1 minute on Pricing → Ready to buy, comparing options
- Adjusted calculator sliders → Personalizing to their situation
- Clicked preset buttons ("less" or "more") → Exploring different scenarios
- Selected text on page → Reading carefully, engaged
- Returned to same section multiple times → Considering specific feature

**Medium Interest Signals:**
- Spent >30 seconds on Features → Learning what the product does
- Spent >30 seconds on Testimonials → Seeking social proof
- Clicked video play button → Visual learner, wants to see it in action
- Scrolled through full page → General exploration
- Visited multiple pages → Researching the product

**Low Interest / Skeptical Signals:**
- Rapid scrolling (< 5 seconds per section) → Skimming, not engaged
- Immediate bounce from page → Not interested or wrong fit
- No interaction with calculator → Not convinced of value
- Hovering exit button → About to leave, needs intervention
- Long idle time with no activity → Distracted or reconsidering

**Conversion-Ready Signals:**
- Visited Pricing page multiple times → Price is the main blocker
- Long time on Calculator + Pricing → Doing the math, close to decision
- Clicked download/trial button → Ready to convert
- Signed in to save progress → Serious, planning to return
- Adjusted calculator to show high volume → Professional photographer, good fit

**Re-Engagement Needed Signals:**
- Left chat idle for >2 minutes → Nudge with proactive message
- Scrolled to top of page → Looking to leave, redirect to next step
- Clicked browser back button → Losing them, ask engaging question
- Switched to different tab → Distracted, bring attention back
`;

/**
 * Section Definitions
 *
 * Explains what each section of the website contains.
 * Used to interpret section timing data.
 */
const SECTION_DEFINITIONS = `
**SECTION DEFINITIONS:**

**Calculator Section (#calculator):**
- Interactive ROI calculator
- User inputs: shoots/week, hours/shoot, billable rate
- Shows: annual waste, weeks saved, cost comparison
- Purpose: Demonstrate value proposition with personalized numbers
- High time here = evaluating ROI and cost-benefit

**Features Section (#features):**
- How It Works video demonstration
- AI capabilities and workflow explanation
- Technical details: speed, accuracy, integrations
- Purpose: Educate on what the product does
- High time here = learning about capabilities

**Pricing Section (#download):**
- Pricing tiers and checkout
- Free trial information
- Download buttons for Mac/iOS apps
- Purpose: Conversion - get them to start trial
- High time here = ready to buy, comparing plans

**Testimonials Section (#referrals):**
- Case studies from real photographers
- Before/after workflow comparisons
- Social proof and credibility
- Purpose: Build trust and overcome skepticism
- High time here = seeking validation before buying

**Problems Section (Hero/Top):**
- Pain points: culling takes too long, workflow bottleneck
- Problem-solution framing
- Emotional hooks: time waste, missed opportunities
- Purpose: Resonate with their current pain
- High time here = identifying with the problem
`;

/**
 * Objection Playbook
 *
 * Standard responses to common objections.
 * These are STATIC - they're battle-tested responses.
 */
const OBJECTION_PLAYBOOK = `
**OBJECTION PLAYBOOK:**

**Objection: "It's too expensive"**
Response: Reference their calculator numbers - show annual waste vs. annual cost
Example: "you're wasting $12,000/year on manual culling. this is $5,988/year to get that time back. you're saving $6,000+ in year one alone."
Redirect: "what's the ROI need to look like for this to be a no-brainer?"

**Objection: "I need to think about it"**
Response: Acknowledge, then ask what specifically they need to think about
Example: "totally fair - what part are you stuck on? the price, the workflow change, or something else?"
Redirect: Don't let them leave - offer to answer specific concerns now

**Objection: "I don't have time to learn new software"**
Response: Emphasize time saved vs. time to learn
Example: "it's literally drag and drop - 5 minutes to learn, saves you hours every week. what if you got those hours back this week?"
Redirect: "what's your biggest time blocker right now?"

**Objection: "I'm not sure if the AI is accurate enough"**
Response: Social proof + free trial
Example: "every photographer says that at first. try it on 100 photos - if it's not 95%+ accurate, don't use it. but spoiler: it will be."
Redirect: "want to see what other photographers said after trying it?"

**Objection: "I already have a workflow that works"**
Response: Challenge their definition of "works"
Example: "works as in you're hitting all your goals? or works as in it's what you're used to?"
Redirect: "if you could save 10 hours a week without changing anything else, would you?"

**Objection: "Can I cancel anytime?"**
Response: Simple yes, then redirect
Example: "yep, cancel whenever. no tricks. so - [redirect to current script question]"

**Objection: "What about my existing Lightroom workflow?"**
Response: Emphasize integration, not replacement
Example: "it works WITH lightroom, not instead of it. exports XMP files, you keep your exact workflow. just faster."
Redirect: "how much time do you spend in lightroom on culling right now?"

**Objection: "I do fine with manual culling"**
Response: Reframe "fine" as opportunity cost
Example: "fine as in you're happy spending X hours/week on it? or fine as in it's just part of the job?"
Redirect: "what would you do with those hours if you got them back?"

**Objection: "I need to talk to my partner/spouse/business partner"**
Response: Help them prepare the case
Example: "totally - what do you think they'll ask? let's make sure you have the numbers to show them."
Redirect: "want me to put together the ROI breakdown so you can show them the math?"

**Objection: "I'm not ready yet"**
Response: Find out why, then address it
Example: "i get it - what needs to happen first before you're ready?"
Redirect: Based on their answer, address the blocker or schedule follow-up
`;

/**
 * Get Static Knowledge Base
 *
 * Returns the full knowledge base, loading it from GitHub if not already cached.
 * This function should be called ONCE at server startup via initializeKnowledgeBase().
 *
 * Subsequent calls will return the cached version instantly.
 *
 * @returns Promise<string> The full knowledge base as a formatted string
 */
export async function getStaticKnowledgeBase(): Promise<string> {
  const start = Date.now();
  metrics.totalRetrievals++;

  if (cachedKnowledgeBase) {
    metrics.hits++;
    metrics.lastHitTime = Date.now();
    const retrievalTime = Date.now() - start;

    // Track retrieval time (rolling window of last 100)
    metrics.retrievalTimes.push(retrievalTime);
    if (metrics.retrievalTimes.length > 100) {
      metrics.retrievalTimes.shift();
    }

    // Calculate average retrieval time
    metrics.averageRetrievalTime =
      metrics.retrievalTimes.reduce((a, b) => a + b, 0) / metrics.retrievalTimes.length;

    console.log(`[Cache] ✅ Hit: Returning cached knowledge base from memory (${retrievalTime}ms)`);
    return cachedKnowledgeBase;
  }

  metrics.misses++;
  metrics.lastMissTime = Date.now();

  console.log('[Cache] ❌ Miss: Building knowledge base for the first time...');
  cachedKnowledgeBase = await buildKnowledgeBase();
  console.log(`[Cache] Knowledge base built: ${Math.round(cachedKnowledgeBase.length / 1000)}k characters`);

  return cachedKnowledgeBase;
}

/**
 * Build Knowledge Base
 *
 * Internal function that fetches repo content and combines it with
 * behavioral intelligence, section definitions, and objection playbook.
 *
 * This is called ONCE at startup and the result is cached in memory.
 *
 * @returns Promise<string> The formatted knowledge base
 */
async function buildKnowledgeBase(): Promise<string> {
  const startTime = Date.now();

  // Fetch GitHub repository content (cached in fetchRepo.ts)
  const repoContent = await fetchRepoContent();

  const fetchTime = Date.now() - startTime;
  console.log(`[Cache] Fetched repo content in ${fetchTime}ms`);

  // Combine all static knowledge into one cacheable block
  const knowledgeBase = `
<GITHUB_SOURCE_CODE>
${repoContent}
</GITHUB_SOURCE_CODE>

${BEHAVIORAL_PATTERNS}

${SECTION_DEFINITIONS}

${OBJECTION_PLAYBOOK}

---

**KNOWLEDGE BASE METADATA:**
- Repository: github.com/stevemoraco/kull
- Deployed at: https://kullai.com
- Last updated: ${new Date().toISOString()}
- Content size: ${Math.round(repoContent.length / 1000)}k characters
- Total knowledge base size: ${Math.round((repoContent.length + BEHAVIORAL_PATTERNS.length + SECTION_DEFINITIONS.length + OBJECTION_PLAYBOOK.length) / 1000)}k characters

This knowledge base is STATIC and should be cached by OpenAI's prompt caching system.
It will be refreshed on server restart or manual cache invalidation.
`;

  return knowledgeBase;
}

/**
 * Initialize Knowledge Base
 *
 * Call this function at server startup to pre-load the knowledge base into memory.
 * This ensures the first request doesn't have to wait for GitHub API calls.
 *
 * Usage:
 *   import { initializeKnowledgeBase } from './knowledge/repoCache';
 *
 *   // In server startup (index.ts)
 *   await initializeKnowledgeBase();
 *
 * @returns Promise<void>
 */
export async function initializeKnowledgeBase(): Promise<void> {
  console.log('[Cache] Initializing knowledge base at server startup...');
  const startTime = Date.now();

  try {
    await getStaticKnowledgeBase();
    const totalTime = Date.now() - startTime;
    console.log(`[Cache] ✅ Knowledge base initialized in ${totalTime}ms`);
    console.log('[Cache] Prompt caching optimization ready');
  } catch (error) {
    console.error('[Cache] ❌ Failed to initialize knowledge base:', error);
    console.error('[Cache] Server will continue, but first request will be slower');
  }
}

/**
 * Invalidate Knowledge Base Cache
 *
 * Force a refresh of the knowledge base on the next request.
 * Useful for manual cache busting after codebase updates.
 *
 * Usage:
 *   import { invalidateKnowledgeBase } from './knowledge/repoCache';
 *   invalidateKnowledgeBase();
 *
 * @returns void
 */
export function invalidateKnowledgeBase(): void {
  console.log('[Cache] Invalidating knowledge base cache...');
  cachedKnowledgeBase = null;
  console.log('[Cache] Cache invalidated - next request will rebuild');
}

/**
 * Get Cache Status
 *
 * Returns information about the current cache state.
 * Useful for debugging and monitoring.
 *
 * @returns object Cache status information
 */
export function getCacheStatus(): {
  isCached: boolean;
  sizeKB: number | null;
  timestamp: string | null;
} {
  return {
    isCached: cachedKnowledgeBase !== null,
    sizeKB: cachedKnowledgeBase ? Math.round(cachedKnowledgeBase.length / 1024) : null,
    timestamp: cachedKnowledgeBase ? new Date().toISOString() : null,
  };
}

/**
 * Get Cache Metrics
 *
 * Returns detailed cache performance metrics for monitoring and optimization.
 * Useful for admin dashboard to track prompt caching effectiveness.
 *
 * @returns CacheMetrics Cache performance statistics
 */
export function getCacheMetrics(): CacheMetrics {
  return { ...metrics };
}

/**
 * Reset Cache Metrics
 *
 * Resets all cache metrics to zero. Useful for testing or starting fresh measurements.
 */
export function resetCacheMetrics(): void {
  metrics.hits = 0;
  metrics.misses = 0;
  metrics.totalRetrievals = 0;
  metrics.lastHitTime = null;
  metrics.lastMissTime = null;
  metrics.averageRetrievalTime = 0;
  metrics.retrievalTimes = [];
  console.log('[Cache] Metrics reset');
}
