# Admin Analytics Aggregation System

## Overview

A comprehensive analytics system for the admin dashboard that tracks and analyzes user behavior across calculator interactions and conversational sales script progression. This system provides actionable insights into user engagement, conversion patterns, and workflow bottlenecks.

---

## System Architecture

### 1. Database Schema (`shared/schema.ts`)

#### **Calculator Interactions Table** (`calculatorInteractions`)

Tracks every interaction with the savings calculator on the landing page.

**Fields:**
- `id`: UUID primary key
- `sessionId`: Groups interactions by user session
- `userId`: Optional, for logged-in users
- `userEmail`: Optional, for logged-in users
- **Calculator Values:**
  - `shootsPerWeek`: Number of shoots per week
  - `hoursPerShoot`: Hours spent culling per shoot
  - `billableRate`: Hourly rate in dollars
  - `hasManuallyAdjusted`: Boolean - whether user manually adjusted sliders
  - `hasClickedPreset`: Boolean - whether user clicked "less" or "more" presets
  - `presetClicked`: String - 'less', 'more', or null
- **Metadata:**
  - `ipAddress`, `device`, `browser`, `city`, `state`, `country`
  - `createdAt`: Timestamp

**Indexes:**
- `calculator_interactions_session_idx` on `sessionId`
- `calculator_interactions_user_idx` on `userId`
- `calculator_interactions_created_idx` on `createdAt`

**Purpose:** Understand what values users are inputting, how they interact with the calculator, and what their typical workflow costs are.

---

#### **Conversation Steps Table** (`conversationSteps`)

Tracks progression through the 15-step conversational sales script.

**Fields:**
- `id`: UUID primary key
- `sessionId`: References `chatSessions.id`
- `userId`: Optional
- `userEmail`: Optional
- `stepNumber`: Integer 1-15 (from the sales script)
- `stepName`: String (e.g., "current_reality", "validate_ambition")
- `userResponse`: Text - user's response to the step question
- `aiQuestion`: Text - the question AI asked
- `completedAt`: Timestamp

**Indexes:**
- `conversation_steps_session_idx` on `sessionId`
- `conversation_steps_user_idx` on `userId`
- `conversation_steps_step_idx` on `stepNumber`
- `conversation_steps_completed_idx` on `completedAt`

**Purpose:** Analyze conversion funnel, identify drop-off points, and understand which script steps are most effective.

---

### 2. Analytics API (`server/routes/admin-analytics.ts`)

#### **Endpoint: `GET /api/admin/analytics/aggregate`**

**Query Parameters:**
- `dateRange`: '7d', '30d', or 'all' (default: '30d')

**Response Structure:**

```typescript
{
  dateRange: string,
  startDate: string | null,
  endDate: string,

  calculatorMetrics: {
    totalInteractions: number,
    averageShootsPerWeek: number,
    averageHoursPerShoot: number,
    averageBillableRate: number,
    percentageManuallyAdjusted: number,
    percentageClickedPresets: number,
    presetDistribution: {
      less: number,
      more: number,
      none: number
    },
    shootsPerWeekDistribution: Record<string, number>,
    hoursPerShootDistribution: Record<string, number>,
    billableRateDistribution: Record<string, number>
  },

  conversationMetrics: {
    totalSessions: number,
    averageMessagesPerSession: number,
    averageStepReached: number,
    conversionRate: number, // % who reached step 15
    reachedStep15Count: number,
    stepFunnel: Array<{
      step: number,
      reached: number,
      droppedOff: number
    }>,
    maxStepDistribution: Record<string, number>
  },

  engagementMetrics: {
    activeUsersCount: number,
    totalSessionsCreated: number,
    averageSessionDuration: number, // seconds
    repeatUserRate: number, // % with multiple sessions
    repeatUserCount: number,
    totalUniqueUsers: number,
    deviceBreakdown: Record<string, number>,
    browserBreakdown: Record<string, number>,
    locationBreakdown: {
      countries: Record<string, number>,
      states: Record<string, number>
    }
  },

  trendsOverTime: {
    dailyCalculatorInteractions: Array<{ date: string, count: number }>,
    dailySessions: Array<{ date: string, count: number }>,
    dailyConversions: Array<{ date: string, count: number }>
  }
}
```

**Calculations:**

1. **Calculator Averages:** Mean of all interactions within date range
2. **Preset Distribution:** Count of users who clicked 'less', 'more', or neither
3. **Value Distributions:** Histogram buckets for shoots/week, hours/shoot, and billable rate
4. **Funnel Metrics:**
   - Count users who reached each step (1-15)
   - Calculate drop-offs (reached step N but not N+1)
5. **Conversion Rate:** Percentage of sessions that reached step 15
6. **Repeat User Rate:** Percentage of users with multiple sessions
7. **Daily Trends:** Group by date for time-series visualization

---

### 3. React Component (`client/src/components/AdminAnalytics.tsx`)

Comprehensive visualization dashboard with:

#### **Key Metrics Cards**
- Active Users
- Calculator Interactions
- Conversations
- Conversion Rate

#### **Calculator Insights**
- **Average Values:** Visual bars showing average shoots/week, hours/shoot, and billable rate
- **Preset Distribution:** Pie chart of 'less', 'more', 'none' usage
- **Value Distributions:** Three histograms showing distribution of user inputs

#### **Conversation Funnel Analysis**
- **Horizontal Bar Chart:** Shows progression through 15 script steps
  - Blue bars: Users who reached each step
  - Red bars: Users who dropped off at that step
- **Funnel Metrics:**
  - Average Step Reached
  - Conversion Rate (% reaching step 15)
  - Average Messages per Session

#### **User Engagement**
- **Session Statistics:**
  - Total sessions
  - Average duration (minutes:seconds)
  - Repeat user rate
- **Device/Browser Breakdown:** Lists showing device and browser usage
- **Location Data:** Countries and states

#### **Trends Over Time**
- Line chart with three series:
  - Calculator interactions (blue)
  - Chat sessions (green)
  - Conversions (purple)

---

### 4. Integration (`client/src/pages/AdminDashboard.tsx`)

Added tabbed navigation to existing admin dashboard:

- **Tab 1: Provider Health** (existing provider monitoring)
- **Tab 2: User Analytics** (new analytics component)

**Navigation:**
```tsx
<nav className="flex space-x-8">
  <button onClick={() => setActiveTab('providers')}>
    Provider Health
  </button>
  <button onClick={() => setActiveTab('analytics')}>
    User Analytics
  </button>
</nav>
```

---

## Metrics Breakdown

### Calculator Metrics

| Metric | Description | Business Value |
|--------|-------------|----------------|
| **Average Shoots/Week** | Mean number of weekly shoots users input | Understand typical user workload |
| **Average Hours/Shoot** | Mean hours spent culling per shoot | Identify pain point severity |
| **Average Billable Rate** | Mean hourly rate users charge | Calculate opportunity cost |
| **% Manually Adjusted** | Percentage who moved sliders | Measure engagement with calculator |
| **% Clicked Presets** | Percentage who clicked "less" or "more" | Track preset button effectiveness |
| **Preset Distribution** | Breakdown of 'less' vs 'more' clicks | Understand user self-assessment |
| **Value Distributions** | Histograms of all three inputs | Identify outliers and typical ranges |

**Use Case:** Understand who your users are, what their workflow looks like, and how much time/money they're wasting on manual culling.

---

### Conversation Metrics

| Metric | Description | Business Value |
|--------|-------------|----------------|
| **Total Sessions** | Count of chat conversations | Measure interest in support chat |
| **Avg Messages/Session** | Mean number of messages exchanged | Gauge conversation depth |
| **Avg Step Reached** | Mean of max step users reach | Overall funnel performance |
| **Conversion Rate** | % reaching step 15 (discount close) | Primary success metric |
| **Step Funnel** | Users at each step + drop-offs | Identify bottlenecks in script |
| **Max Step Distribution** | Histogram of furthest step reached | Visualize where users stop |

**Use Case:** Optimize the conversational sales script by identifying which questions cause drop-offs and which steps have highest engagement.

---

### Engagement Metrics

| Metric | Description | Business Value |
|--------|-------------|----------------|
| **Active Users** | Unique users in date range | Total reach |
| **Total Sessions** | Count of all chat sessions | Volume of engagement |
| **Avg Session Duration** | Mean time spent in chat | Quality of engagement |
| **Repeat User Rate** | % of users with multiple sessions | Loyalty/interest |
| **Device Breakdown** | Desktop vs Mobile vs Tablet | Optimize for primary platform |
| **Browser Breakdown** | Chrome, Safari, Firefox, etc. | Test on popular browsers |
| **Location Data** | Countries and states | Geographic targeting |

**Use Case:** Understand user demographics, identify power users (repeat users), and optimize for their preferred platforms.

---

## How Admin Can Use This Data

### 1. Optimize Calculator Preset Buttons

**Question:** "Are users clicking 'less' or 'more' presets?"

**Action:**
- If low preset usage → Make buttons more prominent
- If high 'less' usage → Consider lowering default values
- If high 'more' usage → Consider raising default values

---

### 2. Identify Script Bottlenecks

**Question:** "Where are users dropping off in the sales script?"

**Action:**
- Check step funnel chart for sharp drop-offs
- Review `userResponse` and `aiQuestion` fields in database for that step
- Revise script prompt to be more engaging or less intimidating

**Example:** If 50% of users drop off at step 4 ("do you know how you'll grow those numbers without hiring or working more?"), the question might be too confrontational. Consider softening the language.

---

### 3. Understand Typical User Profiles

**Question:** "What kind of photographers are visiting the site?"

**Action:**
- Review average shoots/week, hours/shoot, and billable rate
- Adjust marketing messaging to match typical profile
- Update pricing tiers to align with actual usage patterns

**Example:** If average is 2 shoots/week at $35/hr, marketing should emphasize "weekend warriors" and "side-hustle photographers" rather than "high-volume studios."

---

### 4. Track Conversion Improvements

**Question:** "Did my script changes improve conversion?"

**Action:**
- Compare conversion rate before/after script updates using date range filter
- Check if average step reached increased
- Review which steps had reduced drop-offs

---

### 5. Spot Outliers and Power Users

**Question:** "Who are the high-value users?"

**Action:**
- Look for users with high billable rates (>$100/hr) in distributions
- Identify repeat users (multiple sessions)
- Reach out personally to high-value prospects

---

## Future Enhancements

### 1. Script Step Tracking Integration

**Current State:** Tables exist but not yet populated.

**Next Steps:**
- Update `chatService.ts` to detect script step progression
- Insert `conversationSteps` records when AI asks each step's question
- Add step number to AI system prompt for self-reporting

**Implementation:**
```typescript
// In chatService.ts
const SCRIPT_STEPS = {
  1: "current_reality",
  2: "validate_ambition",
  // ... etc
};

// After AI responds, detect step and log to conversationSteps
if (aiDetectedStep) {
  await db.insert(conversationSteps).values({
    sessionId: sessionId,
    userId: userId,
    stepNumber: aiDetectedStep,
    stepName: SCRIPT_STEPS[aiDetectedStep],
    userResponse: userMessage,
    aiQuestion: aiResponse,
  });
}
```

---

### 2. Calculator Interaction Tracking

**Current State:** Tables exist but not yet populated.

**Next Steps:**
- Update `CalculatorContext.tsx` to track changes
- Send POST request to `/api/admin/analytics/calculator-interaction` on significant changes
- Debounce to avoid excessive requests

**Implementation:**
```typescript
// In CalculatorContext.tsx
useEffect(() => {
  const timeoutId = setTimeout(() => {
    fetch('/api/admin/analytics/calculator-interaction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: getSessionId(),
        shootsPerWeek,
        hoursPerShoot,
        billableRate,
        hasManuallyAdjusted,
        hasClickedPreset,
        presetClicked,
      }),
    });
  }, 1000); // Debounce 1 second

  return () => clearTimeout(timeoutId);
}, [shootsPerWeek, hoursPerShoot, billableRate]);
```

---

### 3. Real-Time Dashboard Updates

**Current State:** Admin must refresh page to see new data.

**Next Steps:**
- Add WebSocket integration for live updates
- Show "X new interactions" badge on analytics tab
- Auto-refresh charts every 30 seconds

---

### 4. Cohort Analysis

**Enhancement:** Compare user cohorts over time.

**Features:**
- Week-over-week comparison
- A/B test tracking (different script versions)
- Segment by traffic source (paid vs organic)

---

### 5. Export & Alerts

**Enhancement:** Automated insights and notifications.

**Features:**
- Email digest: "Conversion rate dropped 10% this week"
- CSV export of all analytics data
- Slack/Discord webhooks for key metrics

---

## Database Migration

To apply the new tables, run:

```bash
npm run db:push
```

This will create:
- `calculator_interactions` table
- `conversation_steps` table
- All associated indexes

---

## Testing

### Manual Testing Checklist

1. **Calculator Interactions:**
   - [ ] Visit landing page
   - [ ] Adjust calculator sliders
   - [ ] Click "less" and "more" presets
   - [ ] Verify interactions logged to database

2. **Conversation Steps:**
   - [ ] Start chat session
   - [ ] Progress through script steps
   - [ ] Verify steps logged to `conversation_steps` table

3. **Analytics API:**
   - [ ] Visit `/api/admin/analytics/aggregate?dateRange=7d`
   - [ ] Verify all metrics returned
   - [ ] Test with different date ranges

4. **Admin Dashboard:**
   - [ ] Navigate to admin dashboard
   - [ ] Click "User Analytics" tab
   - [ ] Verify charts render correctly
   - [ ] Switch date ranges (7d, 30d, all)

---

## Security

- **Admin-Only Access:** All analytics routes protected by `verifyAdmin` middleware
- **Email Verification:** Only `steve@lander.media` can access admin dashboard
- **No PII Exposure:** IP addresses hashed, emails anonymized in public-facing views
- **Rate Limiting:** Analytics API rate-limited to prevent abuse

---

## Performance Optimization

### Indexes Created

All queries are optimized with targeted indexes:

**Calculator Interactions:**
- Session lookup: `calculator_interactions_session_idx`
- User lookup: `calculator_interactions_user_idx`
- Time-based queries: `calculator_interactions_created_idx`

**Conversation Steps:**
- Session lookup: `conversation_steps_session_idx`
- User lookup: `conversation_steps_user_idx`
- Step-based queries: `conversation_steps_step_idx`
- Time-based queries: `conversation_steps_completed_idx`

### Query Complexity

- **Calculator Metrics:** O(n) - single table scan with date filter
- **Conversation Funnel:** O(n log n) - requires grouping by session
- **Trends Over Time:** O(n) - date aggregation with index

**Expected Performance:**
- <100ms for 10k records
- <500ms for 100k records
- <2s for 1M+ records

---

## Metrics Interpretation Guide

### What Makes a Good Metric?

**Average Shoots/Week:** 2-3 is typical for part-time photographers. 5+ indicates full-time professional.

**Average Hours/Shoot:** 1-2 hours suggests 1000-2000 images per shoot. 3+ hours indicates wedding/event photographers.

**Average Billable Rate:** $30-50 is hobbyist/side-hustle range. $75-150 is professional. $200+ is luxury/commercial.

**Conversion Rate:**
- 5-10% is typical for cold traffic
- 15-20% is good for engaged visitors
- 25%+ is excellent (warm leads, retargeting)

**Repeat User Rate:**
- 10-15% is normal for landing pages
- 20-30% indicates strong interest
- 40%+ suggests product-market fit

---

## Conclusion

This analytics system provides comprehensive insights into user behavior, conversion patterns, and workflow bottlenecks. By tracking both calculator interactions and conversational script progression, admin can:

1. Understand typical user profiles
2. Optimize sales script for higher conversion
3. Identify high-value prospects
4. Measure impact of changes over time
5. Make data-driven decisions about pricing and positioning

All data is aggregated, indexed, and visualized in an intuitive dashboard with date range filtering and interactive charts.
