# Chris - Tire Kicker Sales Script Test Report

## Persona Profile

| Attribute | Value |
|-----------|-------|
| **Name** | Chris |
| **Archetype** | Tire Kicker |
| **Shoot Frequency** | 1 shoot/week (52/year) |
| **Culling Time** | 2 hours per shoot |
| **Billable Rate** | $60/hour |
| **Annual Time Waste on Culling** | 104 hours/year |
| **Annual Cost of Manual Culling** | $6,240/year |
| **Skepticism Level** | 8/10 (Very High) |
| **Price Threshold** | $2,000/year max |
| **Engagement Level** | Low - just browsing, no immediate need |
| **Behavior Pattern** | Evasive, very short answers, objection-focused |

---

## Expected Script Path

Based on the sales script analysis (/home/runner/workspace/server/chatService.ts), Chris should follow this journey:

### Step 0: Welcome Greeting (SKIPPED if conversation active)
- **Goal:** Hook with personalized observation
- **Expected:** Reference his activity or section reading
- **Chris likely:** Won't engage much - just glancing

### Step 1: Baseline Shoots
- **Exact Question:** "how many shoots are you doing a week?"
- **Expected Chris Answer:** "1, maybe 2 some weeks"
- **Sales Insight:** Low volume = different value prop than high-volume studios

### Step 2: Goals & Revenue
- **Exact Question:** "where do you want to take the business this year?"
- **Expected Chris Answer:** "Not really growing, just maintaining"
- **Challenge:** Chris has NO growth ambitions = harder to sell ROI

### Step 3: Current Workload
- **Exact Question:** "how many hours are you working each week right now?"
- **Expected Chris Answer:** "20-25 hours, including culling"
- **Sales Insight:** This is KEY - shows actual cost burden

### Step 4: Growth Strategy
- **Exact Question:** "do you know how you'll grow those numbers without hiring or working more?"
- **Expected Chris Response:** Deflection or "not thinking about growth"
- **Challenge:** This is where tire kickers fail - no growth vision

### Step 5-15: Remaining Script (UNLIKELY TO REACH)
- Chris will likely exit or remain non-committal through the rest

---

## Predicted Conversation Flow

### Turn 1: Welcome Message
**Status:** ✅ SENT via `/api/chat/welcome`

```
Context Sent:
- timeOnSite: 45,000ms (45 seconds)
- currentPath: "/"
- device: "Desktop"
- browser: "Chrome"
- Empty history (first message)

Expected AI Response:
- Teases about his recent activity
- One short sentence max
- References what he was looking at
- Ends with sales script question

Metadata Required:
- QUICK_REPLIES: [4 questions Chris might ask]
- NEXT_MESSAGE: [5-500 seconds for next background message]
```

**Assessment:** This endpoint should work IF the server is running correctly. The welcome endpoint has complex infrastructure:
- Calls `getChatResponseStream()` with full context
- Fetches IP geolocation (ipapi.co)
- Builds unified context with repo content
- Streams SSE responses
- Extracts metadata delimiters (␞QUICK_REPLIES, ␞NEXT_MESSAGE)

**Potential Issues:**
- If OpenAI API key missing → "Failed to generate greeting"
- If context is empty or malformed → Stream errors
- If metadata delimiters are missing from AI response → Response incomplete
- Server not responding on :5000 → Connection refused

---

### Turn 2: Chris' First Response (Tire Kicker Pattern)
**User Message:** "just checking things out. not sure this is for me."

**Expected AI Analysis:**
- Recognizes: SHORT answer, skeptical tone, low engagement signal
- Should NOT: Push hard or sound pushy
- Should: Ask about current shoot volume to understand baseline

**Expected AI Response:**
Something like: "fair enough. real Q though - roughly how many shoots do you run a week?"

**Chris' Likely Reaction:**
- Provide brief answer: "1, maybe 2 sometimes"
- Doesn't elaborate

---

### Turn 3: Chris Mentions Usage
**User Message:** "yeah, i do maybe 1 shoot a week. spend a couple hours culling but its not that bad"

**Critical Insight:**
- ✅ Answered Step 1 (1 shoot/week)
- ✅ Mentioned culling time (2 hours)
- ✅ **Minimizes problem** ("but its not that bad") - CLASSIC TIRE KICKER

**Expected AI Response:**
- Skip to Step 3: "how many hours are you working each week?"
- Don't re-ask questions already answered
- Use calculator: 1 shoot × 2 hours × 44 weeks = **88 hours/year wasted**
- At $60/hr = **$5,280/year in pure manual labor**

**Chris' Likely Reaction:**
- "30-35 hours a week including client calls and editing"
- Won't see the $5,280 waste immediately (needs recalculation)

---

### Turn 4: Chris Deflects on Goals
**User Message:** "not sure, just want to streamline things i guess. what else do you offer?"

**Critical Deflection Signals:**
- **"not sure"** = Avoids commitment
- **"just want to streamline"** = Vague, no specific goals
- **"what else do you offer?"** = Off-topic, tries to switch to product questions
- Should NOT jump to product features yet

**Expected AI Response (Per Script):**
1. Answer briefly: "Full feature list is [here](#features)"
2. Redirect: "But first - where do you want to take this business next year? more shoots? less time?"
3. This is Step 2: Goals & Revenue

**Chris' Likely Reaction:**
- "I'm fine where I am" OR "Maybe more in a few years"
- **This is where tire kickers fail** - no growth ambitions
- No urgency = No need for time-saving tool = Can't justify $5,988/year

---

## Key Challenges with Chris (Tire Kicker)

| Challenge | Why It Matters | Script Mitigation |
|-----------|----------------|-------------------|
| **Low volume** | 1 shoot/week = only $5,280/year waste (vs $20k+ for high-volume) | Still meaningful, but harder to justify tool cost |
| **No growth ambitions** | Can't sell "save time to take more clients" | Pivot to: "more TIME OFF with same income" |
| **Minimizes problem** | Says culling "isn't that bad" | Show actual math: 88 hours/year = ~2.5 weeks of lost time |
| **High skepticism** | Questions whether AI can really work | Need proof: show accuracy metrics, testimonials from similar shooters |
| **Low price tolerance** | Max $2,000/year vs $5,988 ask | Economy batch API pricing or 3-month trial might work |
| **Evasive answers** | Won't give clear yes/no responses | Ask more specific, yes/no questions |
| **Off-topic deflection** | Wants to learn features, not ROI | Keep redirecting back to script steps |

---

## Trial Link Decision

**Question:** Should Chris get a trial link?

**Answer:** ❌ **NOT YET** (but not STUCK either)

**Reasoning:**
- Chris hasn't reached Step 13 (Price Introduction)
- Chris hasn't committed to any goal (Step 2)
- Tire kickers need social proof first (testimonials, case studies)
- Chris needs to see HIS actual ROI calculation before believing value

**Triggering Trial Link:**
Trial link should only appear after:
1. ✅ Step 2: Stated some goal (even "more time off")
2. ✅ Step 11: Commitment level ≥ 6/10
3. ✅ Step 13: Price stated ($5,988/year)
4. ✅ Step 14: Agreement to commitment

**For Chris specifically:**
- Would likely need Economy option (batch API, cheaper)
- OR emphasize: "Save 4+ hours/week = extended weekends every week"
- OR point to similar case study (small studio, low volume)

---

## Test Execution Challenges Encountered

### Server Infrastructure Issues

1. **Port 5000 Already in Use**
   - Server was still running from previous test
   - Required process cleanup before restart

2. **Welcome Endpoint Complex Architecture**
   - `/api/chat/welcome` calls `getChatResponseStream()`
   - Requires full context building (repo content, IP geolocation, user activity)
   - Uses Server-Sent Events (SSE) streaming
   - Must extract metadata delimiters from AI response
   - If any step fails → "Failed to generate greeting"

3. **Missing Dependencies**
   - Test needed: node-fetch, proper TypeScript compilation
   - Real server needs full environment setup

---

## Expected Test Results

### ✅ If Everything Works

| Metric | Expected Value |
|--------|-----------------|
| **Turn 1** | Welcome greeting sent |
| **Turn 2** | AI asks Step 1 (shoots/week) |
| **Turn 3** | AI acknowledges 1 shoot/week, asks Step 3 (hours/week) |
| **Turn 4** | AI recognizes deflection, re-asks Step 2 (goals) |
| **Final Step** | Step 4 or 5 (depending on Chris' answers) |
| **Trial Link** | NOT shown (Chris hasn't committed to goal) |
| **Status** | ENGAGED but SKEPTICAL - In Script |

### ❌ If Server Issues

```
Response: {"message":"Failed to generate greeting"}
Status: 500 Internal Server Error

Root Causes to Check:
1. OpenAI API key: process.env.OPENAI_API_KEY missing
2. Database: Failed to load conversation state
3. IP Geolocation: Timeout or blocked API call
4. chatService: getChatResponseStream() threw error
5. Metadata extraction: AI response missing ␞QUICK_REPLIES or ␞NEXT_MESSAGE
```

---

## Recommendations

### 1. For Tire Kicker Handling
- Add special tier: "Small Studio Plan" ($1,500/year, limited to 2 shoots/week)
- Lead with case study: "Sarah, 1-2 shoots/week, saves 4+ hours"
- Emphasize: "Time off with same income" (not growth)

### 2. For Chris Specifically
- **Step 1 Response:** "Got it - 1 shoot/week × 2 hours = 88 hours/year you could get back"
- **Step 2 Response:** "Even if you're not growing, what would you do with those 88 hours back?"
- **Step 11 (Commitment):** "1-10, how much would you like those hours back?"

### 3. For Script Improvements
- Add circuit breaker for tire kickers (after 3+ deflections, offer different product)
- Track "evasiveness score" based on answer lengths
- Auto-suggest batch API mode for low-volume shooters
- Add testimonials filter: show only <2 shoots/week case studies

---

## Report Metadata

| Field | Value |
|-------|-------|
| **Test Date** | 2025-11-20 |
| **Persona** | Chris - Tire Kicker |
| **Turns Planned** | 4 |
| **Final Step Reached** | (Pending server execution) |
| **Trial Link** | NOT expected at Turn 4 |
| **Issues** | Server infrastructure startup challenges |
| **Status** | ANALYSIS COMPLETE - Ready for live test |
| **Recommendation** | Deploy fixes, retry full conversation flow |

---

## Files Analyzed

- `/home/runner/workspace/server/chatService.ts` - Sales script system (911+ lines reviewed)
- `/home/runner/workspace/server/routes.ts` - Welcome endpoint (lines 1817-2931 analyzed)
- `/home/runner/workspace/shared/salesScript.ts` - Script questions and steps
- `/home/runner/workspace/server/conversationStateManager.ts` - State tracking
- `/home/runner/workspace/server/prompts/staticContent.ts` - Master sales prompt

---

## Conclusion

Chris (Tire Kicker) presents a **realistic test case** for the sales script because:

1. **Low volume:** Forces script to address ROI for non-growth photographers
2. **High skepticism:** Tests whether AI can overcome objections
3. **Evasiveness:** Validates script's ability to redirect off-topic questions
4. **Price sensitivity:** Shows where script fails if ROI isn't compelling

**Expected Outcome:** Chris should reach Step 4-5 but likely exit before Step 13 (Price) unless the AI:
- Successfully quantifies his time waste ($5,280/year)
- Pivots value to "time off" instead of "growth"
- Provides proof (case studies, testimonials, accuracy metrics)
- Offers payment flexibility (batch API, smaller tier, trial)

**Current Status:** ✅ **Analysis Ready** → Test execution blocked by server startup issues → Recommend restart server and re-run complete conversation flow
