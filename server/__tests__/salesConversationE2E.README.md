# Adversarial AI Sales Conversation E2E Testing Framework

## Overview

This testing framework simulates full end-to-end sales conversations between:
- **Kull Sales AI** (the AI sales assistant)
- **Customer AI** (simulated photographer personas with realistic behavior patterns)

**Purpose:** Validate that the sales AI can successfully guide diverse customer personas through the full 16-step sales script (steps 0-15) and achieve a close rate of 80-90%.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Test Runner                                   │
│  (orchestrates conversation, detects issues, generates reports)  │
└────────────┬───────────────────────────────────┬────────────────┘
             │                                   │
             │                                   │
    ┌────────▼────────┐                 ┌────────▼────────┐
    │   Sales AI      │                 │  Customer AI    │
    │                 │                 │                 │
    │ - Follows       │◄───messages────►│ - Simulates     │
    │   16-step       │                 │   persona       │
    │   script        │                 │   behavior      │
    │ - Adapts to     │                 │ - Realistic     │
    │   persona       │                 │   responses     │
    │ - Closes deals  │                 │ - Shows         │
    │                 │                 │   frustration   │
    └─────────────────┘                 └─────────────────┘
```

### Components

1. **Photographer Personas (20 total)**
   - Diverse backgrounds, communication styles, skepticism levels
   - Examples: Hot Lead, Skeptical Veteran, Price-Sensitive Newbie, Tire Kicker, etc.

2. **Customer AI Simulator**
   - Uses GPT-4o-mini to generate realistic customer responses
   - Adapts to persona traits (direct/evasive, short/long answers, skepticism level)
   - Shows frustration when questions are repeated
   - Reacts authentically to price reveals

3. **Test Runner**
   - Orchestrates full conversation via API calls
   - Tracks progression through 16 steps
   - Detects issues (loops, repetitions, off-topic tangents)
   - Generates comprehensive reports

4. **Issue Detection System**
   - Repeated questions (same question asked 2+ times)
   - Infinite loops (stuck on same step for 5+ turns)
   - Off-script tangents (AI goes off-topic)
   - Premature jumps (skips questions without answers)
   - Missing trial link (reaches step 15 but no link sent)
   - Customer frustration (negative sentiment at end)

## How to Run

### Prerequisites

1. Set environment variable:
   ```bash
   export OPENAI_API_KEY="your-api-key-here"
   ```

2. Ensure sales AI endpoints are running:
   - `POST /api/chat/welcome` - Start conversation
   - `POST /api/chat/message` - Send user message, get AI response

### Run Tests

```bash
# Run just the E2E test file
npm test -- salesConversationE2E

# Run with specific personas (first 5 only)
npm test -- salesConversationE2E --run

# Run comprehensive test (all 20 personas)
npm test -- salesConversationE2E --run --timeout=3600000
```

### Test Output

```
================================================================================
ADVERSARIAL AI SALES CONVERSATION TESTING FRAMEWORK
================================================================================
Testing 20 photographer personas
Target: 80-90% close rate across all personas

================================================================================
STARTING CONVERSATION: Sarah - Hot Lead Wedding Photographer
================================================================================

AI: do you mind if i ask you a few questions to figure out...

Customer: sure, go ahead

AI (Step 1): i see you're doing about 132 shoots a year — is that accurate?

Customer: yes that's about right

[... conversation continues ...]

✅ SUCCESS: Reached step 15 and sent trial link!

================================================================================
FINAL RESULTS
================================================================================
Close Rate: 85.0% (17/20)
Average Turns: 24.3
Average Time: 45.2s
================================================================================

FAILURE ANALYSIS:

1. Mike - Skeptical Portrait Photographer
   Final Step: 9/16
   Turns: 28
   Sentiment: frustrated
   Issues: Repeated question: "how many hours are you working..."

2. Chris - Tire Kicker / Just Browsing
   Final Step: 6/16
   Turns: 35
   Sentiment: neutral
   Issues: Infinite loop detected (stuck on same step for 5+ turns)

[...]
```

## Persona Traits

Each persona has the following attributes:

```typescript
interface PhotographerPersona {
  name: string;                    // "Sarah - Hot Lead Wedding Photographer"
  background: string;              // Backstory and context
  communicationStyle:              // How they communicate
    'direct' |                     //   - Get to the point, no fluff
    'verbose' |                    //   - Detailed, provide context
    'evasive' |                    //   - Vague, non-committal
    'casual';                      //   - Friendly, conversational
  answerLength:                    // Response length
    'short' |                      //   - 1-5 words
    'medium' |                     //   - 1-2 sentences
    'long';                        //   - 2-4 sentences
  skepticism: number;              // 1-10 scale (1=trusting, 10=very skeptical)
  willingToShareNumbers: boolean;  // Shares specific numbers vs vague
  frustrationTriggers: string[];   // What makes them frustrated
  buyingSignals: string[];         // What indicates buying intent
  priceObjections: boolean;        // Will they object to $5,988/year?
  priceThreshold: number;          // Max they're willing to pay
  shootsPerWeek: number;           // For calculator
  hoursPerShoot: number;           // For calculator
  billableRate: number;            // For calculator
  mainGoal: string;                // Their primary goal
  mainPainPoint: string;           // Their main bottleneck
}
```

## Example Personas

### 1. Sarah - Hot Lead Wedding Photographer
- **Communication:** Direct, medium-length answers
- **Skepticism:** Low (3/10)
- **Price Threshold:** $10,000/year
- **Main Goal:** Scale to 200 weddings/year without burning out
- **Expected Outcome:** Quick close (15-20 turns)

### 2. Mike - Skeptical Portrait Photographer
- **Communication:** Evasive, short answers
- **Skepticism:** Very high (9/10)
- **Price Threshold:** $3,000/year (below offer price)
- **Main Pain:** "Tried Photo Mechanic AI - sucked. Wasted money"
- **Expected Outcome:** Challenging, may not close

### 3. Chris - Tire Kicker / Just Browsing
- **Communication:** Evasive, short answers
- **Skepticism:** High (8/10)
- **Price Threshold:** $2,000/year (way below)
- **Main Goal:** "Just looking around, no immediate need"
- **Expected Outcome:** Very challenging, likely won't close

### 4. Jason - Impulsive Early Adopter
- **Communication:** Casual, short answers
- **Skepticism:** Very low (2/10)
- **Price Threshold:** $10,000/year
- **Main Pain:** "Culling is boring AF"
- **Expected Outcome:** Very fast close (10-15 turns)

## Success Criteria

### Individual Conversation Success

A conversation is considered **successful** if:
1. ✅ Reaches step 14 or 15 (price revealed + discount offered)
2. ✅ Trial link is sent (`[start your free trial](#download)`)
3. ✅ No issues detected (no loops, repetitions, or breakdowns)
4. ✅ Customer sentiment is not "frustrated"

### Overall Test Suite Success

The test suite passes if:
1. ✅ Close rate is between 80-90% across all personas
2. ✅ No fatal errors or crashes
3. ✅ Average conversation completes in <60 seconds
4. ✅ All high-quality leads (skepticism <5) close successfully

## Troubleshooting

### Common Issues

**Issue:** Customer AI shows frustration early
- **Cause:** Sales AI repeating questions
- **Fix:** Check conversation state management, ensure questions aren't re-asked

**Issue:** Infinite loop (stuck on same step)
- **Cause:** Validation not advancing step despite substantive answers
- **Fix:** Review step validation logic (heuristic + AI validator)

**Issue:** Low close rate (<80%)
- **Cause:** Too aggressive or too passive sales approach
- **Fix:** Adjust sales script prompts, review failed transcripts

**Issue:** Tests timeout
- **Cause:** API calls taking too long or hanging
- **Fix:** Increase timeout, check API endpoint health

## Extending the Framework

### Adding New Personas

```typescript
const newPersona: PhotographerPersona = {
  name: "Your Name - Description",
  background: "...",
  communicationStyle: "direct",
  answerLength: "medium",
  skepticism: 5,
  willingToShareNumbers: true,
  frustrationTriggers: ["trigger1", "trigger2"],
  buyingSignals: ["signal1", "signal2"],
  priceObjections: false,
  priceThreshold: 8000,
  shootsPerWeek: 2,
  hoursPerShoot: 4,
  billableRate: 100,
  mainGoal: "Your goal here",
  mainPainPoint: "Your pain point here"
};

photographerPersonas.push(newPersona);
```

### Adding New Issue Detection

```typescript
// In detectIssues() function
function detectIssues(transcript: Message[], issues: string[]): void {
  // ... existing checks ...

  // Add new check
  if (yourCondition) {
    issues.push('Your issue description');
  }
}
```

### Customizing Customer AI Behavior

The Customer AI prompt can be customized in `CustomerSimulator.buildCustomerPrompt()`:

```typescript
private buildCustomerPrompt(
  aiMessage: string,
  conversationHistory: Message[],
  currentStep: number
): string {
  // Modify prompt here to change customer behavior
  return `Your custom prompt...`;
}
```

## Performance Metrics

### Target Benchmarks

- **Close Rate:** 80-90% across all 20 personas
- **Average Turns to Close:** 20-30 turns
- **Average Time per Conversation:** 30-60 seconds
- **High-Quality Leads (skepticism <5):** 95%+ close rate
- **Difficult Leads (skepticism >7):** 50-70% close rate

### Expected Results by Persona Type

| Persona Type | Expected Close Rate | Avg Turns |
|--------------|---------------------|-----------|
| Hot Leads | 95-100% | 15-20 |
| High-Quality | 90-95% | 20-25 |
| Moderate | 80-90% | 25-30 |
| Skeptical | 60-80% | 30-35 |
| Tire Kickers | 40-60% | 35+ |

## Files

- `/server/__tests__/salesConversationE2E.test.ts` - Main test file (1060 lines)
- `/server/__tests__/salesConversationE2E.README.md` - This documentation
- `/shared/salesScript.ts` - 16-step sales script definitions

## Next Steps

1. **Integrate with actual API endpoints** (currently using mocks)
2. **Run full test suite** with all 20 personas
3. **Analyze failure patterns** and optimize sales AI prompts
4. **Add more personas** based on real customer data
5. **Implement parallel execution** for faster test runs
6. **Add video recordings** of conversations for review

## Support

For questions or issues:
- Review conversation transcripts in test output
- Check issue detection logs
- Examine persona traits vs conversation outcomes
- Adjust sales AI prompts in `/server/prompts/staticContent.ts`

---

**Last Updated:** 2025-11-20
