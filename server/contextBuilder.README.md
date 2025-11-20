# Context Builder - Centralized Context Infrastructure

## Overview

`contextBuilder.ts` is the single source of truth for building AI prompt context across all chat endpoints (welcome and main chat). It consolidates all context building logic into reusable, type-safe functions.

## Architecture

```
Request → buildUnifiedContext() → {
  userMetadata: string         // Device, browser, IP, location
  calculatorData: string        // ROI calculations with enriched metrics
  sectionTiming: string         // Time spent on each landing page section
  activityHistory: string       // ALL user events (clicks, hovers, inputs)
  conversationMemory: string    // Previous Q&A pairs from database
  conversationState: string     // Sales script progress tracking
  deviceFingerprint: string     // Unique device identifier
  sessionMetrics: string        // Time on site, scroll depth, engagement
}
```

## Key Functions

### Main Builder

```typescript
buildUnifiedContext(
  req: Request,
  body: any,
  sessionId: string | null,
  calculatorData: CalculatorData | null,
  sectionHistory: SectionHistoryItem[] | null,
  userActivity: ActivityEvent[] | null,
  conversationState: ConversationState | null,
  sessionMetrics: SessionMetrics
): Promise<UnifiedContext>
```

**Returns:** All context components as formatted markdown strings.

**Usage:**
```typescript
import { buildUnifiedContext, combineContextMarkdown } from './contextBuilder';

const context = await buildUnifiedContext(
  req,
  req.body,
  sessionId,
  calculatorData,
  sectionHistory,
  userActivity,
  conversationState,
  { timeOnSite: 120000, currentTime: Date.now() }
);

const fullMarkdown = combineContextMarkdown(context);
// Pass fullMarkdown to AI prompt
```

### Helper Functions

#### `buildUserMetadata(req, body)`
Extracts user metadata from request headers and body:
- IP address (with proxy/load balancer support)
- Device type (Mobile/Tablet/Desktop)
- Browser (Chrome/Safari/Firefox/Edge)
- Login status
- Timezone
- Current page and visited pages

#### `enrichCalculatorData(calculatorData)`
Adds calculated metrics to raw calculator inputs:
```typescript
Input: { shootsPerWeek: 4, hoursPerShoot: 2, billableRate: 100 }
Output: {
  ...input,
  annualShoots: 176,           // shootsPerWeek * 44
  annualHours: 352,            // shootsPerWeek * hoursPerShoot * 44
  annualCost: 35200,           // annualHours * billableRate
  weeksSaved: 8.8              // annualHours / 40
}
```

#### `buildDeviceFingerprint(req)`
Creates a unique device identifier from user agent + IP hash.

**Returns:** String like `"3f4a9b2c_1d7e8a5f"`

#### `formatTime(ms)`
Converts milliseconds to human-readable format:
- `65000` → `"1m 5s"`
- `45000` → `"45s"`

### Markdown Builders

Each builder returns formatted markdown for AI consumption:

#### `buildUserMetadataMarkdown(metadata)`
```markdown
## 👤 User Session Metadata
- **Login Status:** 🔴 Not Logged In
- **Device:** Desktop
- **Browser:** Chrome
- **IP Address:** 192.168.1.1
- **Timezone:** America/New_York
- **Current Page:** /
- **Visited Pages:** / → #calculator → #features
```

#### `buildCalculatorDataMarkdown(calculatorData)`
```markdown
## 💰 Calculator Data (Real-Time)

User's current calculator inputs:
- **Shoots per Week:** 4
- **Hours per Shoot (Culling):** 2
- **Billable Rate:** $100/hour
- **Has Manually Adjusted:** Yes
- **Has Clicked Preset:** No

**Calculated Metrics:**
- **Annual Shoots:** 176 shoots/year
- **Annual Hours Wasted on Culling:** 352 hours/year
- **Annual Cost of Manual Culling:** $35,200/year
- **Work Weeks Saved:** 8.8 weeks/year

**IMPORTANT:** Use these numbers in your sales conversation! Reference their actual values when asking questions.
```

#### `buildSectionTimingMarkdown(sectionHistory)`
```markdown
## ⏱️ Section Reading Time

User has spent time reading these sections (sorted by time spent):
1. **Calculator** - 2m 15s (MOST INTERESTED)
2. **Features** - 1m 30s
3. **Pricing** - 45s

**🎯 Key Insight:** User is most interested in ROI calculation and cost savings

**💡 Recommendation:** Frame your questions around what they were reading. Examples:
- "i see you spent 2m 15s playing with the calculator - did you find your numbers?"
- "those calculator numbers accurate for your workflow?"

**⚠️ CRITICAL:** Reference the section they spent the most time on in your FIRST response. Show you're paying attention to what they're reading.

**🔗 If you want to scroll them to that section, use these EXACT links:**
- Calculator: [text](#calculator)
- Features/Demo: [text](#features)
- Pricing/Download: [text](#download)
- Testimonials/Reviews: [text](#referrals)
- Sign in: [text](/api/login)
```

#### `buildActivityHistoryMarkdown(userActivity, metrics?)`
```markdown
## 🖱️ User Activity History

Recent interactions (last 100 events):

1. **🖱️ CLICKED** `#calculator` - TEXT: "Calculate Your ROI" at 2:30:15 PM
2. **⌨️ TYPED** in `input[name="shootsPerWeek"]`: "4" at 2:30:18 PM
3. **👆 HOVERED** `button.preset-wedding` at 2:30:20 PM
4. **✏️ HIGHLIGHTED TEXT**: "Save 8 weeks per year" at 2:30:25 PM

**Activity Insights:**
- **Total Clicks:** 45
- **Elements Hovered:** 23
- **Input Events:** 12
- **Text Selections:** 6
```

**With Recent Activity Section** (if `metrics.lastAiMessageTime` provided):
```markdown
## 🎯 MOST RECENT ACTIVITY (Since Your Last Message)

**⏰ CURRENT TIME FOR USER:** Thursday, November 20, 2025, 2:30:45 PM EST

**🆕 NEW ACTIONS IN THE LAST 30 SECONDS:**

🔥 **JUST CLICKED** (5s ago): `#pricing` - TEXT: **"See Plans"**
⌨️ **JUST TYPED** (3s ago) in `input.email`: "photographer@example.com"

**🎯 YOUR MISSION:**
Look at the NEW ACTIONS above. What did they JUST do? React to it DIRECTLY.
- Did they click something? Ask why that interested them
- Did they highlight text? Reference that exact text
- Did they hover over something? They're curious - dig into it
- Are they reading? Ask about what they're seeing on the page

Make your message feel SPOOKY and personalized - like you're watching them in real-time (because you are 👀).
Use the exact text they clicked/highlighted in your response to prove you're paying attention!
```

#### `buildConversationMemoryMarkdown(sessionId)` (async)
```markdown
## 🧠 CONVERSATION MEMORY

Review what the user has ALREADY told you:

**Step 1 (Validate Annual Shoots):**
  You asked: "i see you're doing about 176 shoots a year — is that accurate?"
  They said: "yes that's right"

**Step 2 (Validate Ambition):**
  You asked: "what's your goal for next year? more shoots? less? more profitable?"
  They said: "I want to grow to 200 shoots without working more hours"

**CRITICAL MEMORY USAGE RULES:**
- DO NOT ask for information they already provided above
- DO reference their previous answers in your new questions
- Example: "to hit your 150-shoot goal..." NOT "what's your goal?"
- If they said "I want 200 shoots", later say "your 200-shoot goal" not "how many shoots?"
```

#### `buildConversationStateMarkdown(state)`
```markdown
## 📊 Conversation State
- **Current Script Step:** 3/16
- **Questions Asked:** 2
- **Questions Answered:** 2
- **Unanswered Questions:** 0
- **Off-Topic Messages:** 0

### Answers Collected So Far:
1. **Step 1**: "i see you're doing about 176 shoots a year — is that accurate?" → "yes that's right"
2. **Step 2**: "what's your goal for next year? more shoots? less?" → "I want to grow to 200 shoots without working more hours"
```

#### `buildSessionMetrics(metrics)`
```markdown
## ⏱️ Session Metrics
- **Time on Site:** 2m 15s
- **Scroll Position:** 2400px (75% down the page)
- **🔥 Highly Engaged:** User has scrolled >70% of the page
```

## Data Flow

### Welcome Endpoint Flow

```
/api/chat/welcome receives request
  ↓
Extract: context, calculatorData, sectionHistory from body
  ↓
buildUnifiedContext(
  req,
  body,
  sessionId,
  calculatorData,
  sectionHistory,
  context.userActivity,  // All events (not filtered)
  null,                  // No conversation state yet
  { timeOnSite, currentTime }
)
  ↓
combineContextMarkdown(context)
  ↓
Pass to AI prompt → Generate welcome greeting
```

### Chat Message Flow

```
/api/chat/message receives request
  ↓
Extract: message, userActivity, calculatorData, sectionHistory from body
  ↓
Load conversationState from database
  ↓
buildUnifiedContext(
  req,
  body,
  sessionId,
  calculatorData,
  sectionHistory,
  userActivity,           // All events (not filtered)
  conversationState,      // Sales script tracking
  { timeOnSite, currentTime, lastAiMessageTime }
)
  ↓
combineContextMarkdown(context)
  ↓
Pass to AI prompt → Generate response → Update conversation state
```

## Key Features

### 1. All Activity Events Included

**CRITICAL:** `buildActivityHistoryMarkdown()` includes **ALL** user activity events, not filtered by time. This ensures the AI has complete context of user behavior.

The filtering for "recent activity" only happens in the markdown formatting (the `## 🎯 MOST RECENT ACTIVITY` section), not in the data passed to the builder.

### 2. Temporal Markers

Activity history uses temporal markers to help AI prioritize:
- **🔥 MOST RECENT** - Actions since last AI message
- **📊 EARLIER** - All previous activity

### 3. Markdown Formatting for AI

All context is formatted as markdown because:
- Easier for AI to parse and understand
- Clear hierarchical structure (##, ###)
- Visual markers (🔥, 👤, 💰) help AI identify sections
- Examples and recommendations inline

### 4. Type Safety

All functions use TypeScript interfaces:
- `UnifiedContext` - Main return type
- `UserMetadata` - User info
- `CalculatorData` - Raw inputs
- `EnrichedCalculatorData` - With calculations
- `SectionHistoryItem` - Section timing
- `ActivityEvent` - User interactions
- `SessionMetrics` - Session data

### 5. Error Handling

- Database failures don't crash the request
- Missing data returns empty strings (not errors)
- Async functions catch and log errors
- Console logs for admin debugging

## Integration Example

### Before (routes.ts - duplicated logic):

```typescript
// routes.ts line 807 (main chat)
const userMetadataMarkdown = `## 👤 User Session Metadata...`;
// ... 200 lines of context building ...

// routes.ts line 1816 (welcome)
const contextMarkdown = `# User Session Context...`;
// ... 200 lines of duplicated context building ...
```

### After (with contextBuilder.ts):

```typescript
// routes.ts (both endpoints)
import { buildUnifiedContext, combineContextMarkdown } from './contextBuilder';

const context = await buildUnifiedContext(
  req,
  req.body,
  sessionId,
  calculatorData,
  sectionHistory,
  userActivity,
  conversationState,
  sessionMetrics
);

const fullContext = combineContextMarkdown(context);
// Use fullContext in AI prompt
```

## Benefits

1. **DRY Principle** - Single source of truth for all context building
2. **Type Safety** - Full TypeScript interfaces and type checking
3. **Testability** - Pure functions easy to unit test
4. **Maintainability** - Changes in one place affect all endpoints
5. **Consistency** - Welcome and chat get identical context formatting
6. **Debugging** - Clear console logs for each section
7. **Performance** - Async loading of conversation memory doesn't block other sections

## Testing

### Unit Tests (Recommended)

```typescript
import { describe, it, expect } from 'vitest';
import { enrichCalculatorData, formatTime } from './contextBuilder';

describe('enrichCalculatorData', () => {
  it('calculates annual metrics correctly', () => {
    const input = {
      shootsPerWeek: 4,
      hoursPerShoot: 2,
      billableRate: 100,
      hasManuallyAdjusted: true,
      hasClickedPreset: false
    };

    const result = enrichCalculatorData(input);

    expect(result.annualShoots).toBe(176);
    expect(result.annualHours).toBe(352);
    expect(result.annualCost).toBe(35200);
    expect(result.weeksSaved).toBe(8.8);
  });
});

describe('formatTime', () => {
  it('formats time correctly', () => {
    expect(formatTime(65000)).toBe('1m 5s');
    expect(formatTime(45000)).toBe('45s');
    expect(formatTime(125000)).toBe('2m 5s');
  });
});
```

### Integration Tests (Recommended)

```typescript
import { describe, it, expect } from 'vitest';
import { buildUnifiedContext, combineContextMarkdown } from './contextBuilder';

describe('buildUnifiedContext', () => {
  it('builds complete context with all sections', async () => {
    const mockReq = {
      headers: {
        'user-agent': 'Mozilla/5.0...',
        'x-real-ip': '192.168.1.1'
      }
    };

    const context = await buildUnifiedContext(
      mockReq as any,
      { timezone: 'America/New_York' },
      'test-session',
      { shootsPerWeek: 4, hoursPerShoot: 2, billableRate: 100, hasManuallyAdjusted: true, hasClickedPreset: false },
      [{ id: 'calculator', title: 'Calculator', totalTimeSpent: 135000 }],
      [{ type: 'click', target: '#calculator', value: 'Calculate', timestamp: new Date().toISOString() }],
      null,
      { timeOnSite: 120000, currentTime: Date.now() }
    );

    expect(context.userMetadata).toContain('User Session Metadata');
    expect(context.calculatorData).toContain('Calculator Data');
    expect(context.sectionTiming).toContain('Section Reading Time');
    expect(context.activityHistory).toContain('User Activity History');
  });
});
```

## Next Steps

### Phase 1: Replace Existing Code (Priority)
- [ ] Update `/api/chat/message` endpoint to use `buildUnifiedContext()`
- [ ] Update `/api/chat/welcome` endpoint to use `buildUnifiedContext()`
- [ ] Remove duplicated context building logic from routes.ts
- [ ] Test both endpoints produce identical context format

### Phase 2: Add Tests
- [ ] Unit tests for all helper functions
- [ ] Integration tests for `buildUnifiedContext()`
- [ ] Snapshot tests for markdown output

### Phase 3: Enhancements
- [ ] Add IP geolocation data (ipapi.co, ip-api.com) to userMetadata
- [ ] Add hardware info (CPU cores, GPU, memory) from context
- [ ] Add connection quality metrics (downlink, RTT)
- [ ] Add performance metrics (page load, DOM ready)

## Related Files

- `/home/runner/workspace/server/routes.ts` - Chat endpoints (to be refactored)
- `/home/runner/workspace/server/conversationStateManager.ts` - Sales script tracking
- `/home/runner/workspace/server/storage.ts` - Database operations
- `/home/runner/workspace/shared/schema.ts` - conversationSteps table

## Support

For questions or issues with context building:
1. Check console logs (search for `[Context Builder]`)
2. Verify all required parameters are passed to `buildUnifiedContext()`
3. Check that sessionId exists if expecting conversation memory
4. Ensure database connection is working for async operations
