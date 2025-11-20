# Engagement Analyzer Integration Guide

## Overview

The engagement analyzer transforms section timing and user activity data into strategic sales insights. It analyzes:

- **Primary Interest**: What the user cares about most (ROI, Features, Social Proof, etc.)
- **Engagement Level**: 0-100 score based on time, interactions, and depth
- **Objection Signals**: Price concerns, feature doubts, trust issues, etc.
- **Ready to Buy**: Boolean + confidence score
- **Recommended Approach**: Strategic guidance (WARM_UP, CLOSE_MODE, VALUE_FOCUS, etc.)
- **Script Adaptations**: Specific recommendations for the sales script

## Integration Example

### In Chat Service (server/chatService.ts or server/routes.ts)

```typescript
import {
  analyzeEngagement,
  formatEngagementForContext,
  type SectionTimingEntry,
  type UserActivityEvent,
  type CalculatorData,
} from './engagementAnalyzer';

// When processing a chat message, include engagement analysis in context

// Example: In the chat message handler
async function handleChatMessage(
  userId: string,
  message: string,
  session: ChatSession
) {
  // 1. Get section timing data (from session storage or tracking)
  const sectionTiming: SectionTimingEntry[] = session.sectionHistory || [];

  // 2. Get user activity data (from activity tracking)
  const userActivity: UserActivityEvent[] = session.activityHistory || [];

  // 3. Get calculator data if available
  const calculatorData: CalculatorData | undefined = session.calculatorData;

  // 4. Run engagement analysis
  const engagementAnalysis = analyzeEngagement(
    sectionTiming,
    userActivity,
    calculatorData
  );

  // 5. Format for AI context
  const engagementContext = formatEngagementForContext(engagementAnalysis);

  // 6. Include in system prompt or context
  const systemPrompt = `
${baseSystemPrompt}

${engagementContext}

**CRITICAL: Use the engagement analysis above to:**
1. ${engagementAnalysis.recommendedApproach}
2. Adapt your approach based on detected objections
3. Reference their primary interest (${engagementAnalysis.primaryInterest})
4. Follow these script adaptations:
${engagementAnalysis.scriptAdaptations.map(a => `   - ${a}`).join('\n')}
`;

  // 7. Send to AI with enhanced context
  const response = await sendToAI(systemPrompt, message);

  return response;
}
```

### Example Output

When a user has:
- 2 minutes on calculator
- 1.5 minutes on features
- 30 seconds on pricing
- Adjusted calculator manually
- Clicked 3 features

The analyzer will return:

```json
{
  "primaryInterest": "ROI/Cost Savings",
  "engagementLevel": 72,
  "objectionSignals": [],
  "readyToBuy": true,
  "confidence": 85,
  "recommendedApproach": "CLOSE_MODE: High engagement and strong buying signals. Move through discovery quickly and present offer.",
  "scriptAdaptations": [
    "Lead with calculator insights - reference their specific numbers early",
    "Frame questions around business growth and time saved",
    "Use concrete ROI examples when presenting offer",
    "Move faster - they're engaged and ready",
    "Don't over-explain, get to the offer"
  ]
}
```

### Formatted Context for AI

```markdown
## 🎯 Engagement Analysis

**Primary Interest:** ROI/Cost Savings
**Engagement Level:** 72/100 👍
**Ready to Buy:** ✅ YES (Confidence: 85%)

**📋 Recommended Approach:**
CLOSE_MODE: High engagement and strong buying signals. Move through discovery quickly and present offer.

**🔧 Script Adaptations:**
- Lead with calculator insights - reference their specific numbers early
- Frame questions around business growth and time saved
- Use concrete ROI examples when presenting offer
- Move faster - they're engaged and ready
- Don't over-explain, get to the offer
```

## Engagement Level Scoring

```
Score = Time Score + Interaction Score + Section Depth + Deep Engagement

Time Score (max 30):
  - 1 point per 6 seconds on site
  - Caps at 30 points (3 minutes)

Interaction Score (max 30):
  - 0.5 points per interaction (click, hover, etc.)
  - Caps at 30 points (60 interactions)

Section Depth (max 20):
  - 10 points per section visited (>5s)
  - Caps at 20 points (2+ sections)

Deep Engagement (max 20):
  - 5 points per input/select interaction
  - Caps at 20 points (4+ deep signals)

Total: 0-100
```

## Readiness Assessment

```
Readiness Score = Calculator + Features + Pricing + Testimonials + Adjustment

Calculator (30 points):
  - 30 points if >30s on calculator
  - 15 points if 10-30s

Features (20 points):
  - 20 points if visited features section

Pricing (25 points):
  - 25 points if visited pricing section

Testimonials (15 points):
  - 15 points if visited testimonials

Calculator Adjustment (10 points):
  - 10 points if manually adjusted calculator

Ready if score >= 60
```

## Objection Signals

### Price Concern
- >10s on pricing section
- 3+ clicks on pricing elements

### Feature Doubt
- >15s on features section
- No CTA clicks

### Needs Social Proof
- Multiple visits to testimonials section

### Trust Concerns
- Clicked privacy/security/terms links

### Comparison Shopping
- Quick visits (<5s) to many sections (>5 sections)

### Not Personalizing
- Clicked calculator preset but didn't adjust

## Strategic Approaches

### WARM_UP
- Engagement < 30
- Focus on discovery questions
- Build rapport first

### CLOSE_MODE
- Engagement >= 70 + Ready to buy
- Move through discovery quickly
- Present offer

### VALUE_FOCUS
- Price concerns detected
- Emphasize ROI and cost justification
- Use calculator data heavily

### DEMO_MODE
- Feature doubts detected
- Emphasize proof points
- Use case studies

### SOCIAL_PROOF
- Needs social proof
- Reference testimonials
- Use success stories

### BUILD_TRUST
- Trust concerns detected
- Address security proactively
- Be transparent

### ROI_FOCUS
- Primary interest = ROI/Cost Savings
- Lead with numbers
- Focus on business impact

### FEATURE_FOCUS
- Primary interest = Product Features
- Deep dive into capabilities
- Explain how it works

## Testing

Run tests:
```bash
npm test tests/unit/engagementAnalyzer.test.ts
```

All 43 tests cover:
- Primary interest detection
- Engagement level calculation
- Objection signal detection
- Readiness assessment
- Strategic approach generation
- Script adaptation generation
- Edge cases

## Future Enhancements

1. **Machine Learning**: Train on successful conversions to improve scoring
2. **A/B Testing**: Test different engagement thresholds
3. **Real-time Updates**: Stream engagement analysis as user browses
4. **Personalization**: Learn individual user patterns
5. **Predictive Scoring**: Predict conversion likelihood
