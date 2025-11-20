# Section Timing Analyzer Usage Guide

## Overview

The Section Timing Analyzer (`server/sectionTimingAnalyzer.ts`) transforms raw section timing data from the frontend into actionable intelligence for sales conversations. It detects reading patterns, identifies top interests, and generates personalized conversation openers.

## Quick Start

```typescript
import {
  analyzeSectionTiming,
  formatSectionInsights,
  getSectionTimingSummary
} from './server/sectionTimingAnalyzer';

// Section timing data from frontend (via useSectionTiming hook)
const sectionHistory = [
  { id: 'calculator', title: 'ROI Calculator', totalTimeSpent: 45000 },
  { id: 'pricing', title: 'Pricing', totalTimeSpent: 20000 },
  { id: 'hero', title: 'Hero', totalTimeSpent: 5000 },
];

// Analyze the data
const insights = analyzeSectionTiming(sectionHistory);

// Format for AI prompt
const markdown = formatSectionInsights(insights);

// Or get a quick summary
const summary = getSectionTimingSummary(sectionHistory);
```

## Integration with Chat API

### In routes.ts

```typescript
import { analyzeSectionTiming, formatSectionInsights } from './sectionTimingAnalyzer';

// Inside /api/chat/message endpoint
if (sectionHistory && sectionHistory.length > 0) {
  const insights = analyzeSectionTiming(sectionHistory);

  if (insights) {
    const sectionMarkdown = formatSectionInsights(insights);
    userActivityMarkdown += `\n\n${sectionMarkdown}`;
  }
}

// Pass to chatService
const stream = await getChatResponseStream(
  message,
  history,
  preferredModel,
  userActivityMarkdown, // Contains section insights
  // ... other params
);
```

## Data Structures

### Input: SectionHistoryItem

```typescript
interface SectionHistoryItem {
  id: string;           // Section ID (e.g., 'calculator', 'pricing')
  title: string;        // Human-readable title (e.g., 'ROI Calculator')
  totalTimeSpent: number; // Milliseconds spent viewing this section
}
```

### Output: SectionInsights

```typescript
interface SectionInsights {
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
```

## Reading Patterns

The analyzer detects four distinct reading patterns:

### 1. Focused (>60% time on one section)
- **Pattern**: User spent most time on a single section
- **Strategy**: Go deep on that specific topic
- **Example**: 90s on calculator, 5s on hero

```typescript
{
  readingPattern: 'focused',
  topSection: { id: 'calculator', interpretation: '...' }
}
```

### 2. Scanner (evenly distributed time)
- **Pattern**: User quickly scanned multiple sections with similar time
- **Strategy**: Keep it brief and actionable
- **Example**: 10s hero, 11s calculator, 10.5s pricing, 10.2s features

```typescript
{
  readingPattern: 'scanner',
  topSection: { id: 'calculator', interpretation: '...' }
}
```

### 3. Explorer (visited 5+ sections)
- **Pattern**: User thoroughly researched many different sections
- **Strategy**: They want comprehensive information
- **Example**: Visited 6+ different sections with varied time

```typescript
{
  readingPattern: 'explorer',
  topSection: { id: 'calculator', interpretation: '...' }
}
```

### 4. Deep Reader (significant time on few sections)
- **Pattern**: Thoughtful engagement with 2-4 sections
- **Strategy**: Give them substance and depth
- **Example**: 30s calculator, 25s pricing, 5s hero

```typescript
{
  readingPattern: 'deep_reader',
  topSection: { id: 'calculator', interpretation: '...' }
}
```

## Topic Mapping

The analyzer maps section IDs to human-readable topics:

| Section ID | Topic |
|-----------|-------|
| `calculator` | ROI calculation and cost savings |
| `pricing` | pricing plans and costs |
| `features` | product capabilities |
| `hero` | landing page overview |
| `problem` | pain points and challenges |
| `value` | value proposition |
| `solution` | solution and how it works |
| `testimonials` | customer reviews and success stories |
| `referrals` | social proof and case studies |
| `value-stack` | benefits and value proposition |
| `final-cta` | taking action and getting started |
| `faq` | frequently asked questions |
| `download` | downloading and getting started |

## Suggested Openers

The analyzer generates personalized conversation starters based on the top section:

### Calculator Section
```
"i see you spent 45s playing with the calculator - did you find your numbers?"
"those calculator numbers accurate for your workflow?"
"you were crunching the ROI numbers - what did you find?"
```

### Pricing Section
```
"noticed you were reading pricing for a while - have questions about the cost?"
"you spent 1m 5s on pricing - want to see how it compares to what you're wasting now?"
"saw you checking out the pricing - what's your take on the investment?"
```

### Features Section
```
"you were checking out features - which one caught your eye?"
"spent 40s reading features - what stood out?"
"saw you exploring how it works - any questions about the process?"
```

### Problem Section
```
"you spent time reading about pain points - which one hits hardest for you?"
"those problems resonate with your workflow?"
"saw you reading about the challenges - which one's your biggest headache?"
```

### Testimonials Section
```
"saw you reading testimonials - any of those stories sound familiar?"
"you spent 35s on case studies - which one matched your situation?"
"noticed you checking out what other photographers say - what resonated?"
```

## Markdown Output Format

```markdown
## ⏱️ SECTION READING INTELLIGENCE

**Top Section:** ROI Calculator (45s)
**Interpretation:** User is evaluating ROI and cost savings - they're in analytical mode, likely price-conscious

**Reading Pattern:** Focused - Most time on one specific section, highly targeted interest

**Suggested Conversation Openers:**
1. "i see you spent 45s playing with the calculator - did you find your numbers?"
2. "those calculator numbers accurate for your workflow?"
3. "you were crunching the ROI numbers - what did you find?"

**Interest Breakdown:**
🔥 **ROI calculation and cost savings**: 45s (high interest)
👀 **pricing plans and costs**: 20s (medium interest)
👁️ **landing page overview**: 5s (low interest)

**💡 Strategic Guidance:**
- Use the top section (ROI Calculator) to personalize your FIRST question
- Reference their reading time naturally: "i see you spent 45s on..."
- Match their reading pattern: Go deep on their specific interest
- Show you're paying attention to what they're reading

**🔗 Scroll them to relevant sections using these EXACT links:**
- Calculator: [text](#calculator)
- Features: [text](#features)
- Pricing: [text](#download)
- Testimonials: [text](#referrals)
- Sign In: [text](/api/login)
```

## Interest Levels

Interest levels are determined using quartiles:

- **High interest (🔥)**: Top 25% of time spent
- **Medium interest (👀)**: Middle 50% of time spent
- **Low interest (👁️)**: Bottom 25% of time spent

```typescript
// Example with 4 sections
const sections = [
  { id: 'calc', totalTimeSpent: 60000 },  // High (top 25%)
  { id: 'price', totalTimeSpent: 30000 }, // Medium
  { id: 'feat', totalTimeSpent: 25000 },  // Medium
  { id: 'hero', totalTimeSpent: 5000 },   // Low (bottom 25%)
];

const insights = analyzeSectionTiming(sections);
insights.interestMapping['calc'].interestLevel; // 'high'
insights.interestMapping['hero'].interestLevel; // 'low'
```

## Helper Functions

### formatSectionInsights()

Converts `SectionInsights` object into markdown for AI prompts.

```typescript
const markdown = formatSectionInsights(insights);
// Returns formatted markdown string (see example above)
```

### getSectionTimingSummary()

Returns a one-line summary for logging or quick reference.

```typescript
const summary = getSectionTimingSummary(sectionHistory);
// Returns: "focused - Most time on ROI Calculator (45s)"
```

## Usage in AI Prompts

The section timing intelligence is injected into the AI's context as markdown:

```typescript
// In chatService.ts, the prompt includes:
let dynamicContext = '';

if (sectionHistory && sectionHistory.length > 0) {
  const insights = analyzeSectionTiming(sectionHistory);
  if (insights) {
    dynamicContext += formatSectionInsights(insights);
  }
}

// This gets added to the system message
const messages = [
  {
    role: 'system',
    content: staticInstructions + dynamicContext,
  },
  // ... conversation history
];
```

## Testing

Run the test suite:

```bash
npm test server/__tests__/sectionTimingAnalyzer.test.ts
```

Smoke test:

```bash
bun run test-section-analyzer.js
```

## Best Practices

### 1. Always check for null
```typescript
const insights = analyzeSectionTiming(sectionHistory);
if (insights) {
  // Use insights
}
```

### 2. Reference top section in first message
```typescript
if (insights) {
  const opener = insights.suggestedOpeners[0];
  // Use in AI prompt or as conversation starter
}
```

### 3. Match reading pattern to response style
```typescript
const pattern = insights.readingPattern;

if (pattern === 'scanner') {
  // Keep responses brief and actionable
} else if (pattern === 'deep_reader' || pattern === 'focused') {
  // Provide depth and substance
} else if (pattern === 'explorer') {
  // Comprehensive information
}
```

### 4. Log summaries for debugging
```typescript
const summary = getSectionTimingSummary(sectionHistory);
console.log(`[Chat] Section analysis: ${summary}`);
```

## Examples

### Example 1: Focused on Calculator

**Input:**
```typescript
const sections = [
  { id: 'calculator', title: 'ROI Calculator', totalTimeSpent: 90000 },
  { id: 'hero', title: 'Hero', totalTimeSpent: 5000 },
];
```

**Output:**
```typescript
{
  topSection: {
    id: 'calculator',
    title: 'ROI Calculator',
    timeSpent: 90000,
    interpretation: 'User is evaluating ROI and cost savings - they\'re in analytical mode, likely price-conscious'
  },
  readingPattern: 'focused',
  suggestedOpeners: [
    'i see you spent 1m 30s playing with the calculator - did you find your numbers?',
    'those calculator numbers accurate for your workflow?',
    'you were crunching the ROI numbers - what did you find?'
  ],
  interestMapping: {
    calculator: {
      timeSpent: 90000,
      interestLevel: 'high',
      topic: 'ROI calculation and cost savings'
    },
    hero: {
      timeSpent: 5000,
      interestLevel: 'low',
      topic: 'landing page overview'
    }
  }
}
```

### Example 2: Explorer Pattern

**Input:**
```typescript
const sections = [
  { id: 'hero', title: 'Hero', totalTimeSpent: 8000 },
  { id: 'calculator', title: 'Calculator', totalTimeSpent: 15000 },
  { id: 'pricing', title: 'Pricing', totalTimeSpent: 12000 },
  { id: 'features', title: 'Features', totalTimeSpent: 10000 },
  { id: 'testimonials', title: 'Testimonials', totalTimeSpent: 9000 },
  { id: 'value', title: 'Value', totalTimeSpent: 7000 },
];
```

**Output:**
```typescript
{
  topSection: {
    id: 'calculator',
    title: 'Calculator',
    timeSpent: 15000,
    interpretation: 'User is evaluating ROI and cost savings - they\'re in analytical mode, likely price-conscious'
  },
  readingPattern: 'explorer',
  // ... 6 sections in interestMapping
}
```

## Common Issues

### Issue: Pattern not detecting correctly

**Problem**: Scanner pattern expected but getting "deep_reader"

**Solution**: Ensure times are very evenly distributed (variance < 30% of mean)

```typescript
// Too much variance - will be deep_reader
const bad = [
  { id: 'a', totalTimeSpent: 10000 },
  { id: 'b', totalTimeSpent: 15000 }, // +50% variance
];

// Good - will be scanner
const good = [
  { id: 'a', totalTimeSpent: 10000 },
  { id: 'b', totalTimeSpent: 10100 }, // +1% variance
  { id: 'c', totalTimeSpent: 10050 }, // +0.5% variance
];
```

### Issue: Empty suggested openers

**Problem**: `suggestedOpeners` array is empty or generic

**Solution**: Check that section ID matches known patterns in `SECTION_TOPIC_MAP`

```typescript
// Will use generic openers
{ id: 'unknown-section', title: 'Unknown' }

// Will use calculator-specific openers
{ id: 'roi-calculator', title: 'Calculator' } // matches "calculator"
```

## Future Enhancements

Potential improvements for future iterations:

1. **Time-of-day analysis**: Detect if user is browsing at optimal times
2. **Session comparison**: Compare current session to previous sessions
3. **Conversion scoring**: Predict likelihood of conversion based on reading pattern
4. **A/B testing**: Test different opener strategies based on patterns
5. **Real-time adjustments**: Dynamically adjust suggestions as user continues browsing

## Support

For questions or issues:
1. Check the test suite for examples: `server/__tests__/sectionTimingAnalyzer.test.ts`
2. Run smoke tests: `bun run test-section-analyzer.js`
3. Review the implementation: `server/sectionTimingAnalyzer.ts`
