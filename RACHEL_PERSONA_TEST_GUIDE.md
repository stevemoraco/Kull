# Rachel Persona Test Guide - Quick Start

**Persona:** Rachel - Enterprise Studio Owner
**Difficulty:** Medium (Skepticism 5/10)
**Expected Outcome:** Should reach Step 14-15 with trial link
**Estimated Duration:** 18-24 conversational turns

---

## TL;DR - Run It Now

```bash
# Make sure server is running on localhost:5000
npm run dev

# In another terminal:
npm test -- salesConversationE2E --run

# Look for Rachel's conversation in output
```

---

## Rachel's Profile

### Business Metrics
- **Shoots per week:** 10 (440 annually)
- **Team size:** 3 photographers
- **Culling time per shoot:** 4 hours
- **Billable rate:** $250/hour
- **Current annual waste:** $440,000 on manual culling alone

### Personality
- **Communication style:** Verbose, detailed, professional
- **Skepticism level:** 5/10 (medium - wants proof but not resistant)
- **Key trait:** Data-driven, thinks in terms of ROI
- **Price sensitivity:** Medium ($15,000 threshold)
- **Buying signal:** Asks about team management, specific metrics

### Main Goal
Double annual revenue to $500k WITHOUT team working more hours

### Main Pain Point
Manual photo culling is slow and inconsistent between team members

---

## Expected Conversation Flow

### Phase 1: Discovery (Turns 1-3)
```
AI:  "i see you're doing about 440 shoots a year — is that accurate?"
Rachel: "yes, 10 shoots a week is accurate. sometimes 12 when we're busy"

AI:  "what's your goal for next year? more shoots? less? more profitable?"
Rachel: "i want to double revenue to $500k, but without the team working more.
         plus i want to take 6 weeks off next year"
```

**Key indicators Rachel is engaged:**
- ✓ Shares specific numbers (10/week, $500k goal)
- ✓ Mentions team dynamics (team working, photographers)
- ✓ Personal motivation (travel, family time)

### Phase 2: Current State (Turns 4-6)
```
AI:  "how many hours are you working each week right now?"
Rachel: "my team is doing about 50-60 hours a week between the three of us.
         thats a lot of culling and editing"

AI:  "how do you expect to do that with your current workflow?"
Rachel: "we need better systems. right now culling takes forever.
         and different people rate the same shots differently"
```

**Key indicators Rachel is identifying the pain:**
- ✓ Acknowledges team time investment (50-60 hours)
- ✓ Names the specific problem (culling slowness)
- ✓ Mentions consistency issue (different ratings)

### Phase 3: Bottleneck & Solution (Turns 7-10)
```
AI:  "what's kept you from hitting that already?"
Rachel: "honestly the culling workflow is killing us.
         photo selection is manual, slow, and inconsistent"

AI:  [Explains Kull: AI analyzes focus, composition, lighting in 30 seconds.
      Paints vision: "Imagine turning 4-hour culling sessions into 1 hour.
      Your team rates photos consistently. More time for editing, less time culling."]

Rachel: [Asks about team coordination, learning curve, integration]
```

**Key indicators Rachel sees the solution:**
- ✓ Nods to pain being real and significant
- ✓ Asks implementation questions (team, integration, timeline)
- ✓ Mentally calculating ROI in her head

### Phase 4: Commitment & Timeline (Turns 11-12)
```
AI:  "how committed are you to hitting that? 1–10"
Rachel: "8 or 9. we've been talking about fixing this for a year"

AI:  "when do you want this fixed?"
Rachel: "next quarter. we're booked solid through the end of the year"
```

**Key indicators Rachel is ready:**
- ✓ High commitment score (8-9)
- ✓ Specific timeline (next quarter)
- ✓ Acknowledges urgency (been discussing a year)

### Phase 5: Close (Turns 13-15)
```
AI:  "everyday price is $5,988/year to solve exactly the problem you just described"
Rachel: [No objection - she just did the math: $440k waste / $5,988 = 74x ROI]

AI:  "alright — if you'll commit to the goal you told me, i'll discount it.
      [start your free trial here](#download)"
Rachel: [Clicks trial link → SUCCESS]
```

**Key indicators Rachel converts:**
- ✓ Accepts price without objection
- ✓ ROI math is obvious ($440k vs $6k)
- ✓ Clicks trial to move forward

---

## What To Watch For

### ✅ Good Signs (Conversation is on track)
- Shares specific numbers without being pushed
- Asks clarifying questions about how Kull works
- Mentions team dynamics or scaling challenges
- Acknowledges time/cost problem
- Asks about trial or implementation details

### ⚠️ Warning Signs (May need course correction)
- Very short answers ("yes", "no", "idk")
- Avoids sharing specific numbers
- Changes subject to pricing/objections before step 10
- Starts expressing frustration
- Long silence (5+ message gaps)

### ❌ Dead Signs (Conversation may be ending)
- "I'm not sure I'm a good fit"
- "Let me think about it"
- "Do you have competitors?" (starts comparing)
- "What's your price?" (asked before step 13)
- Repetitive AI questions (same step asked 2x)

---

## How the Test System Works

### 1. Customer AI Simulation
The test doesn't use a real person - it uses **gpt-5-mini** to simulate Rachel based on her persona traits:

```typescript
{
  personality: "verbose, detailed, professional",
  businessModel: "enterprise studio owner",
  answerLength: "long", // 2-3 sentences
  skepticism: 5, // Medium - wants proof
  willingToShareNumbers: true, // Will give specific metrics
  frustrationTriggers: ["generic advice", "treating us like solopreneur"],
  mainGoal: "Double revenue without working more",
  mainPainPoint: "Manual culling, team inconsistency"
}
```

### 2. Test Runner Orchestration
For each turn:
1. AI asks current step's question
2. Customer AI generates realistic Rachel response
3. Test analyzes if response moves to next step
4. If stuck (same step 3x), circuit breaker forces advancement
5. Conversation continues until step 15 or max 50 turns

### 3. Issue Detection
Test automatically detects:
- **Repeated questions:** Same step asked 2+ consecutive times
- **Infinite loops:** 5+ turns without step advancement
- **Sentiment decay:** Response quality getting worse
- **Price objections:** How Rachel handles cost discussion

### 4. Success Criteria
Rachel is marked **SUCCESS** if:
- ✓ Reaches step 14 or 15 (close sequence)
- ✓ Accepts price without major objection
- ✓ Final response includes trial link (#download)
- ✓ No infinite loops or repeat questions
- ✓ Conversation sentiment stays neutral/positive

---

## Running the Test

### Option A: Full Test Suite (All 20 Personas)
```bash
# Start server
npm run dev

# Run tests (10-15 minutes)
npm test -- salesConversationE2E --run --timeout=900000

# Output shows:
# - Rachel's full transcript
# - Final step (should be 14-15)
# - Any issues detected
# - Close rate (Rachel contribution: 1/1 = 100%)
```

### Option B: Extract Rachel-Only
The E2E test includes Rachel as persona #16 ("Rachel - Overthinking analyst") but you can create a focused variant:

```typescript
// server/__tests__/rachel-persona-test.ts
import { describe, it, expect } from 'vitest';
import { testSalesConversation } from './salesConversationE2E.test';

describe('Rachel Persona - Enterprise Studio Owner', () => {
  it('should guide Rachel to trial signup', async () => {
    const rachel = {
      name: "Rachel - Enterprise Studio Owner",
      // ... (use config from this guide)
    };

    const result = await testSalesConversation(rachel);

    expect(result.finalStep).toBeGreaterThanOrEqual(14);
    expect(result.trialLinkClicked).toBe(true);
    expect(result.issues).toHaveLength(0);
  });
});
```

### Option C: Manual API Testing
```bash
# Start server
npm run dev

# Open another terminal and test manually
SESSION_ID="rachel-$(date +%s)"

# Step 1: Welcome
curl -X POST http://localhost:5000/api/chat/welcome \
  -H "Content-Type: application/json" \
  -d '{
    "context": {"type": "initial"},
    "sessionId": "'$SESSION_ID'",
    "calculatorData": {
      "shootsPerWeek": 10,
      "hoursPerShoot": 4,
      "billableRate": 250
    }
  }'

# Step 2: First message
curl -X POST http://localhost:5000/api/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "message": "yes, 10 shoots a week is accurate. sometimes 12 when busy",
    "sessionId": "'$SESSION_ID'",
    "calculatorData": {
      "shootsPerWeek": 10,
      "hoursPerShoot": 4,
      "billableRate": 250
    },
    "history": []
  }'
```

---

## Interpreting Results

### Perfect Outcome ✅
```
RACHEL TEST RESULTS
Persona: Rachel - Enterprise Studio Owner
Final Step: 15 (Complete!)
Turns: 22
Trial Link: YES ✓
Issues: None
Sentiment: Positive (ready to buy)
ROI Identified: Yes ($440k saved vs $6k cost = 73x ROI)
Close: SUCCESS ✓
```

### Good Outcome ✓
```
RACHEL TEST RESULTS
Persona: Rachel - Enterprise Studio Owner
Final Step: 14 (Price stated)
Turns: 20
Trial Link: [next turn - user would click]
Issues: None
Sentiment: Neutral→Positive
ROI: Identified around turn 8
Close: SUCCESS ✓
```

### Concerning Outcome ⚠️
```
RACHEL TEST RESULTS
Persona: Rachel - Enterprise Studio Owner
Final Step: 10 (Still in solution positioning)
Turns: 25+
Issues: [1] "Same question asked twice: 'how committed are you'"
Sentiment: Neutral→Confused
ROI: Not clearly communicated
Close: STUCK ✗

ACTION: Review steps 10-11 positioning, ensure Kull benefits are clear
```

### Failed Outcome ❌
```
RACHEL TEST RESULTS
Persona: Rachel - Enterprise Studio Owner
Final Step: 5 (Still in discovery)
Turns: 30+
Issues: [3] "Infinite loop on step 3", "Repeated hour question"
Sentiment: Positive→Frustrated
ROI: Not mentioned
Close: FAILED ✗

ACTION: Critical - check if step validation is working, verify prompt cache
```

---

## Troubleshooting

### "Test times out (takes >5 minutes)"
- **Cause:** OpenAI API slow or overloaded
- **Fix:** Check API status at status.openai.com
- **Workaround:** Run with `--timeout=600000` (10 minutes)

### "Rachel's responses are too short"
- **Cause:** Customer AI not following persona profile
- **Fix:** Check that persona specifies `answerLength: "long"`
- **Verify:** Persona should have minimum 2-3 sentence responses

### "Same question asked multiple times"
- **Cause:** Step validation not working or too strict
- **Fix:** Check `aiStepValidator.ts` circuit breaker threshold
- **Current:** Should auto-advance after 3 attempts

### "Rachel says yes/no to everything"
- **Cause:** Customer AI not parsing question context
- **Fix:** Ensure prompt template includes persona instructions
- **Debug:** Add logging to see what instruction gpt-5-mini is receiving

### "Trial link not clickable in final response"
- **Cause:** Markdown rendering issue or link format wrong
- **Check:** Response should have `[start your free trial here](#download)`
- **Verify:** Hash link (not /api/download) and proper markdown format

---

## Key Metrics to Track

### Per Rachel Conversation
- **Turns to close:** How many back-and-forths before trial link?
- **Turns per step:** Average turns spent at each phase
- **ROI recognition:** Which turn mentions $440k vs $6k?
- **Objections handled:** What concerns raised and how addressed?
- **Sentiment trajectory:** Does Rachel get more positive/confident?

### Across All Personas
- **Close rate:** Should be 80-90%
- **Average turns:** Should be 20-30 per conversation
- **Issue rate:** <10% should have repeated questions
- **Persona variation:** How close rate differs by skepticism level

---

## Next Steps After Test

### If Rachel Succeeds ✅
- You're done! System is working as designed
- Can move on to optimizing for other difficult personas
- Consider A/B testing different closing techniques

### If Rachel Struggles ⚠️
1. **Review transcript:** What specific turn broke down?
2. **Check prompt:** Is MASTER_SALES_PROMPT sending the right context?
3. **Verify calculator:** Are Rachel's metrics calculated correctly ($440k waste)?
4. **Test step validator:** Is AI validator accepting substantive answers?
5. **Run again:** Sometimes due to API latency, worth retrying once

### For Continuous Improvement
- [ ] Add Rachel's conversation to baseline dataset
- [ ] Track close rate trends week-over-week
- [ ] Collect real customer feedback on this conversation pattern
- [ ] Update sales script based on successful approaches
- [ ] A/B test: This script vs alternative positioning

---

## Reference: Rachel's ROI Math

```
CURRENT STATE (Manual Culling):
- Shoots per year: 10 shoots/week × 44 weeks = 440 shoots
- Culling time per shoot: 4 hours
- Total annual culling time: 440 × 4 = 1,760 hours
- At billable rate of $250/hour = $440,000 annual waste

KULL IMPACT (Estimate):
- Reduces per-shoot culling: 4 hours → 1.5 hours (save 2.5 hours)
- Annual time saved: 440 × 2.5 = 1,100 hours
- At $250/hour = $275,000 annual savings

KULL COST:
- Annual: $5,988 (Studio plan)
- Daily: $16.40
- Per shoot: $13.60

ROI CALCULATION:
- Annual savings: $275,000
- Kull cost: $5,988
- Net benefit: $275,000 - $5,988 = $269,012
- ROI: 46x ($269,012 ÷ $5,988)
- Payback period: 8.2 days ($5,988 ÷ $275,000 × 365)

CONCLUSION: Kull pays for itself in less than 2 weeks.
This is an OBVIOUS financial decision for Rachel.
```

The AI should highlight this math during the conversation (steps 7-10) so Rachel understands the opportunity.

---

## Final Checklist

Before running the test:

- [ ] Server is running (`npm run dev`)
- [ ] OpenAI API key is set (`echo $OPENAI_API_KEY`)
- [ ] Database is accessible (check storage.ts connection)
- [ ] Test suite can import sales script (`shared/salesScript.ts`)
- [ ] Rachel persona defined with all required fields
- [ ] Calculator data set: 10 shoots, 4 hours, $250/hr
- [ ] Expected result: Step 14-15, trial link clicked

After running the test:

- [ ] Review full conversation transcript
- [ ] Check for any repeated questions
- [ ] Verify ROI math was communicated
- [ ] Confirm trial link present in final response
- [ ] Log any issues for future optimization
- [ ] Compare Rachel's close rate to overall average (should be above 80%)

---

**Good luck! Rachel should be an easy win - the numbers speak for themselves.**
