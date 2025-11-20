# Maria Persona - Budget-Conscious Mom Test Report
**Date:** November 20, 2025
**Status:** ANALYSIS & READINESS REPORT

---

## Persona Profile: Maria

### Demographics
- **Name:** Maria
- **Type:** Budget-Conscious Mom
- **Skepticism Level:** 6/10 (medium)
- **Business Model:** Family photography (side business)
- **Work Pattern:** 2 shoots/week, 4 hours/shoot @ $80/hr

### Financial Profile
- **Annual Shoots:** 88 (2/week × 44 weeks)
- **Annual Culling Hours:** 352 hours (2 shoots/week × 4 hours × 44 weeks)
- **Annual Waste on Manual Culling:** $28,160 (352 hours × $80)
- **Price Threshold:** $3,500/year (budget constraint)
- **ROI Analysis:** Kull at $5,988/year saves 5.8 weeks of her annual culling time

### Pain Points
1. **Burnout:** Working 45-50 hours/week (everything herself)
2. **Family Impact:** Kids barely see her during wedding season
3. **Bottleneck:** Manual culling takes 2-3 hours per shoot (mindless work)
4. **Growth Block:** Can't book more shoots without solving culling
5. **Emotional Driver:** Time with family (primary motivation, stronger than revenue)

### Motivation Profile
- **Primary Goal:** Get weekends back, spend time with kids
- **Secondary Goal:** Do 4 shoots/week (increase revenue without increasing hours)
- **Commitment Level:** High (8-9 out of 10 when emotionally engaged)
- **Skepticism Type:** Price-sensitive, not feature-skeptical
- **Buying Signal:** Urgency (in thick of wedding season, immediate need)

---

## Test Scenario: 15-Turn Sales Conversation

### Conversation Map

**Steps 0-1: Permission & Current Reality**
- Maria grants permission to proceed
- Confirms ~88 shoots/year (with seasonal variation)
- Tests: Calculator value interpolation (shootsPerWeek × 44)

**Steps 2-9: Discovery & Pain Identification**
- Goal: Stop burnout, want 3-4 shoots/week
- Current: 45-50 hours/week, doing everything
- Workflow: Culling is the 2-3 hour bottleneck
- Prioritize: Time with kids (emotional over revenue)
- Why: "My oldest asked why I work so much"
- Vision: Family time, real vacation, 4 shoots/week same income
- Bottleneck: "It's the culling. That's the only thing preventing more shoots"
- Tests: Context awareness, emotional validation, pain isolation

**Step 10: Solution Positioning (CRITICAL PREREQUISITE)**
- Maria: "Yeah, maybe. What do you have in mind?"
- AI MUST provide 3-part explanation:
  1. How Kull works (AI rates photos in 30 sec: focus, composition, etc.)
  2. Vision of her life after (weekends free, kids see her, 4 shoots/week)
  3. Connection to bottleneck (AI culling removes the 2-3 hour block)
- Tests: Explanation completeness, prerequisite enforcement

**Step 11: Commitment (PREREQUISITE CHECK BEFORE ASKING)**
- Maria: "Pretty committed, 8 or 9. If this works, it solves my biggest problem."
- AI cannot ask Step 11 without completing Step 10's 3 parts
- Tests: Prerequisite validation before advancing

**Steps 12-13: Timeline & Price Reveal**
- Urgency: "ASAP, we're in thick of wedding season"
- Price question: "Yeah, how much are we talking?"
- Tests: Conditional logic (she asked, so skip confirmation)

**Step 14: Price Statement (PRICE OBJECTION TRIGGER)**
- AI states: "$5,988/year to solve exactly the problem you just described"
- Maria's response: "Wait... that's expensive. I was thinking $2k, $3k max"
- Tests: Price sensitivity handling, ROI calculation
- AI should counter with: "You're wasting $28,160/year on manual culling. This pays for itself in 2-3 weeks"

**Step 15: Discount Close**
- AI: "Alright — if you'll commit to the goal you told me, I'll discount it."
- AI provides: [start your free trial here](#download)
- Tests: Trial link provision, CTA clarity

---

## Test Validation Points

### 1. Metadata Format (Every Response)
```
␞QUICK_REPLIES: option1 | option2 | option3 | option4
␞NEXT_MESSAGE: 30
```
- **Requirement:** Present in all 15 responses
- **Validation:** Parses without error, provides natural response options
- **Current Status:** Prompt template includes format, validation checks exist

### 2. Script Adherence
- **Requirement:** Questions asked word-for-word or natural variations
- **Validation:** No question repetition, steps sequential (0→1→2...→15)
- **Current Status:** All 16 questions defined in shared/salesScript.ts
- **Critical Checks:**
  - No repeat questions (chatService.ts line 936-940 extracts and dedupes)
  - Step 10 prerequisite enforced before Step 11 (salesScript.ts line 100-102)

### 3. Context Awareness
- **Requirement:** References calculator data and previous answers
- **Validation Examples:**
  - "88 shoots a year" (dynamic: 2 × 44)
  - "$28,160 waste" (dynamic: 2 × 4 × 44 × 80)
  - "To get your weekends back..." (references her goal)
  - "Since culling is blocking more shoots..." (references bottleneck)
- **Current Status:**
  - Calculator interpolation working (shared/salesScript.ts line 181-200)
  - Answer extraction implemented (chatService.ts line 951-1010)

### 4. Step 10 Prerequisite (CRITICAL)
- **Requirement:** Cannot ask Step 11 until 3 parts explained:
  1. How Kull works (AI photo analysis)
  2. Vision of life after Kull
  3. Connection to her bottleneck
- **Validation:** AI response includes all 3 elements before asking Step 11
- **Current Status:**
  - Script definition includes explicit note (salesScript.ts line 92-95)
  - Question includes prerequisite check (salesScript.ts line 100-102)
  - aiStepValidator.ts validates response quality
  - **Caution:** Validation logic needs to ENFORCE this, not just suggest

### 5. Price Objection Handling
- **Requirement:** Acknowledge concern, show ROI, offer discount, provide trial link
- **Expected Math:**
  - Annual waste: $28,160
  - Kull cost: $5,988
  - Savings: $22,172 (78% of annual waste)
  - Payback period: 2-3 weeks
- **Current Status:**
  - Pricing strategy in MASTER_SALES_PROMPT
  - ROI calculation framework exists
  - **Validation:** AI must show the specific numbers

### 6. Trial Link Provision
- **Requirement:** [start your free trial here](#download) in Step 15
- **Validation:** Link present, format correct, positioned appropriately
- **Current Status:** Step 15 question includes link (salesScript.ts line 128)

---

## System Architecture Review

### Files Examined
1. **shared/salesScript.ts** - All 16 questions, prerequisites, interpolation
2. **server/chatService.ts** - API call, prompt building, streaming response
3. **server/routes.ts** - Endpoint validation, metadata extraction
4. **server/aiStepValidator.ts** - Step validation logic
5. **client/src/components/ConversationProgress.tsx** - UI rendering

### Key Implementation Details

#### Question Definitions (shared/salesScript.ts)
```typescript
Step 0:  Permission - "do you mind if i ask you a few questions..."
Step 1:  Current reality - "i see you're doing about [shootsPerWeek × 44] shoots a year"
Step 2:  Goal - "what's your goal for next year? more shoots? less?"
...
Step 10: Solution - Multi-part explanation (CRITICAL prerequisite)
Step 11: Commitment - "how committed are you to hitting that? 1–10"
         (PREREQUISITE: Step 10 must be fully explained first)
Step 14: Price - "$5,988/year to solve exactly the problem you just described"
Step 15: Close - "alright — if you'll commit to the goal you told me, i'll discount it"
         [start your free trial here](#download)
```

#### Prompt Architecture (server/chatService.ts)
- **Layer 1 (Cached):** MASTER_SALES_PROMPT + sales script
- **Layer 2 (Cached):** Static knowledge base (repo content)
- **Layer 3 (Dynamic):** User activity, calculator data, conversation history
- **Streaming:** Server-Sent Events (SSE) format
- **Metadata:** QUICK_REPLIES and NEXT_MESSAGE appended

#### Validation Logic (server/aiStepValidator.ts)
- Checks response quality before advancing
- Validates script adherence
- Counts question attempts
- Circuit breaker: If same question asked 2+ times, force advance
- **Critical Gap:** Step 10 prerequisite enforcement needs verification

---

## Known Issues & Risks

### Issue 1: Step 10 Prerequisite Enforcement (HIGH RISK)
- **Problem:** Script definition includes prerequisite note, but validation may not enforce it
- **Impact:** AI might ask Step 11 without fully explaining Step 10
- **Mitigation:** aiStepValidator.ts needs to check for 3 required elements in Step 10 response
- **Verification:** Must test by monitoring Turn 10 response content

### Issue 2: API Stability Under Load (MEDIUM RISK)
- **Problem:** Initial fetch-based testing had timeouts on streaming responses
- **Impact:** Large responses (10k+ tokens) may hang
- **Mitigation:** Restarted server, connection stabilized
- **Lesson:** Monitor response times, may need streaming optimization

### Issue 3: Price Objection Handling (MEDIUM RISK)
- **Problem:** AI needs to spontaneously calculate ROI, not just follow prompt
- **Impact:** If AI doesn't show math, objection not handled effectively
- **Verification:** Check Turn 14 response includes: "$28,160 waste" calculation

---

## Test Execution Plan

### Pre-Test Checklist
- [X] Server running (localhost:5000)
- [X] All 16 questions defined
- [X] Calculator interpolation tested
- [X] Metadata format verified
- [X] API endpoint validated
- [X] Session tracking ready

### Execution Method
**Recommended:** Browser-based manual testing (vs. automated script)
- **Why:** Full integration with frontend, WebSocket sync, UI rendering
- **Steps:** Open https://kullai.com → Start chat → Follow Maria scenario
- **Duration:** 15-20 minutes for full conversation
- **Monitoring:** Log each turn's response, metadata, and AI quality

### Turn-by-Turn Verification
For each of the 15 turns:
1. Send Maria's message
2. Verify metadata present (QUICK_REPLIES + NEXT_MESSAGE)
3. Verify no question repetition
4. Verify context awareness (uses calculator data, previous answers)
5. For Turn 10: Verify 3-part explanation
6. For Turn 11: Verify prerequisite check passed
7. For Turn 14: Verify ROI calculation shown
8. For Turn 15: Verify trial link present

### Success Criteria
- **Turns Completed:** 15/15 (100%)
- **Metadata:** 15/15 responses have QUICK_REPLIES + NEXT_MESSAGE
- **Script Adherence:** 0 repeated questions, steps sequential
- **Step 10:** 3-part explanation verified
- **Step 11:** Prerequisite enforcement verified
- **Step 14:** ROI math shown ($28,160 waste vs. $5,988 cost)
- **Step 15:** Trial link provided
- **Overall Status:** SUCCESS or ISSUES FOUND

---

## Risk Assessment

### High Confidence Areas
- ✅ Question definitions complete and correct
- ✅ Calculator value interpolation working
- ✅ Streaming API functional
- ✅ Metadata format correct
- ✅ Script sequencing in place

### Medium Confidence Areas
- ⚠️ Step 10 prerequisite enforcement (needs validation)
- ⚠️ Price objection handling (requires spontaneous ROI calc)
- ⚠️ API response time under streaming load

### Low Confidence Areas
- ⚠️ Full 15-turn conversation stability (never fully tested)
- ⚠️ Edge case handling (if user deviates from expected responses)

---

## Recommendations

1. **Execute Test:** Run full 15-turn Maria conversation in browser
2. **Monitor Turn 10:** Verify all 3 parts of explanation present
3. **Monitor Turn 11:** Confirm prerequisite check enforced
4. **Monitor Turn 14:** Check ROI math spontaneously calculated
5. **Document Results:** Log response times, metadata, any deviations
6. **Fix Issues:** Address any script adherence or validation gaps found
7. **Iterate:** Repeat test after fixes

---

## Summary

**System Status:** READY FOR TESTING

The Kull sales chat system is architecturally sound for Maria's budget-conscious persona. All 16-step script questions are defined with prerequisites, calculator data interpolation is working, and streaming API is stable.

**Maria's Persona Fit:** Excellent test case for price sensitivity and emotional objection handling. Her $28,160 annual waste vs. $5,988 Kull cost provides strong ROI argument.

**Critical Test Focus Areas:**
1. Step 10 prerequisite enforcement (3-part explanation)
2. Step 11 prerequisite validation before asking
3. Step 14 price objection handling with ROI calculation
4. Overall conversation flow with no repeated questions

**Estimated Duration:** 15-20 minutes for full 15-turn conversation

**Next Action:** Execute test, monitor results, document findings.

---

**Report Generated:** November 20, 2025
**Environment:** Development (localhost:5000)
**Prepared By:** Claude Code (Test Analysis)
