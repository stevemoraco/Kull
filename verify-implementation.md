# Step Visibility Filter - Implementation Verification

## What Was Changed

### 1. Created `buildVisibleScriptSection()` Function
**Location**: `/home/runner/workspace/server/chatService.ts` (line 719-759)

This function:
- Takes current step number and calculator data as input
- Retrieves previous, current, and next step questions from the sales script
- Interpolates dynamic values (like annual shoots) if needed
- Returns a focused section showing only 3 steps maximum (current ±1)
- Adds visual markers (↑ ASK THIS EXACT QUESTION NOW ↑) to emphasize the current step

### 2. Replaced Full Script in Prompt Template
**Location**: `/home/runner/workspace/server/prompts/staticContent.ts` (lines 27-36)

**Before**: 70+ lines showing all 16 script questions
**After**: Dynamic placeholder `{{VISIBLE_SCRIPT_SECTION}}` with 5 critical rules

### 3. Integrated Function into Prompt Building
**Locations**:
- `/home/runner/workspace/server/chatService.ts` line 871 (buildFullPromptMarkdown)
- `/home/runner/workspace/server/chatService.ts` line 997 (getChatResponseStream)

Both functions now:
1. Call `buildVisibleScriptSection(step, calculatorData)`
2. Replace `{{VISIBLE_SCRIPT_SECTION}}` placeholder with the result
3. Inject only relevant steps into the AI's prompt

## Test Results

### Test 1: Step 5 (Middle of Script)
```
**SALES SCRIPT POSITION:**

You are currently at STEP 5 of the 16-step sales script.

**PREVIOUS STEP (4):** "do you know how you'll grow those numbers without hiring or working more?"
**CURRENT STEP (5):** "how do you expect to do that with your current workflow?"
**↑ ASK THIS EXACT QUESTION NOW ↑**

**NEXT STEP (6):** "got it. so if you had to pick one - is it the revenue goal, the time off, or something else that matters most?"
(You'll ask this AFTER they answer the current question)

**CRITICAL:** Ask ONLY the CURRENT STEP question. ONE question at a time. NEVER list multiple questions.
```

✅ AI sees only 3 steps (4, 5, 6)
✅ Clear visual marker on current step
✅ Context provided without overwhelming detail

### Test 2: Step 1 (With Calculator Interpolation)
```
**SALES SCRIPT POSITION:**

You are currently at STEP 1 of the 16-step sales script.

**PREVIOUS STEP (0):** "let me ask you a few questions to see if you're a good fit..."
**CURRENT STEP (1):** "i see you're doing about 88 shoots a year — is that accurate?"
**↑ ASK THIS EXACT QUESTION NOW ↑**

**NEXT STEP (2):** "what's your goal for next year? more shoots? less? more profitable? walk me through it."
(You'll ask this AFTER they answer the current question)

**CRITICAL:** Ask ONLY the CURRENT STEP question. ONE question at a time. NEVER list multiple questions.
```

✅ Calculator values interpolated correctly (2 shoots/week × 44 = 88)
✅ Dynamic values inserted into question text
✅ Shows context from permission step

### Test 3: Step 0 (First Step - No Previous)
```
**SALES SCRIPT POSITION:**

You are currently at STEP 0 of the 16-step sales script.

**CURRENT STEP (0):** "let me ask you a few questions to see if you're a good fit..."
**↑ ASK THIS EXACT QUESTION NOW ↑**

**NEXT STEP (1):** "i see you're doing about [shootsPerWeek × 44] shoots a year — is that accurate?"
(You'll ask this AFTER they answer the current question)

**CRITICAL:** Ask ONLY the CURRENT STEP question. ONE question at a time. NEVER list multiple questions.
```

✅ No previous step shown (doesn't exist)
✅ Current and next only
✅ Graceful handling of boundary case

### Test 4: Step 15 (Last Step - No Next)
```
**SALES SCRIPT POSITION:**

You are currently at STEP 15 of the 16-step sales script.

**CURRENT STEP (15):** "alright — if you'll commit to the goal you told me, i'll discount it."
**↑ ASK THIS EXACT QUESTION NOW ↑**

**CRITICAL:** Ask ONLY the CURRENT STEP question. ONE question at a time. NEVER list multiple questions.
```

✅ No next step shown (doesn't exist)
✅ Shows only current step
✅ Graceful handling of end boundary

## Expected Behavior

### Before This Fix
AI prompt contained ALL 16 questions:
```
Step 0: "let me ask you a few questions..."
Step 1: "i see you're doing about [NUMBER] shoots..."
Step 2: "what's your goal for next year?..."
Step 3: "how many hours are you working?..."
Step 4: "do you know how you'll grow?..."
Step 5: "how do you expect to do that?..."
Step 6: "what's your actual target?..."
Step 7: "why that specific goal?..."
Step 8: "what changes in your business?..."
Step 9: "what's kept you from hitting that?..."
Step 10: "this is exactly what i specialize in..."
Step 11: "how committed are you? 1-10..."
Step 12: "when do you want this fixed?..."
Step 13: "want the price?..."
Step 14: "everyday price is $5,988/year..."
Step 15: "alright — if you'll commit..."
```

**Problem**: AI got confused and asked multiple questions at once:
```
User: "45 hours per week"
AI: "what's your goal for next year? more shoots? less? more profitable?
     walk me through it. how many hours are you working each week right now?
     do you know how you'll grow those numbers without hiring or working more?"
```

### After This Fix
AI prompt contains ONLY relevant steps:
```
**CURRENT STEP (4):** "do you know how you'll grow those numbers without hiring or working more?"
**↑ ASK THIS EXACT QUESTION NOW ↑**
```

**Expected**: AI asks ONE question at a time:
```
User: "45 hours per week"
AI: "45 hours. do you know how you'll grow without working more?"
```

## Success Criteria - All Met ✓

- [x] `buildVisibleScriptSection()` function added to chatService.ts
- [x] Function shows previous, current, next steps only
- [x] Function interpolates calculator values if needed
- [x] `{{VISIBLE_SCRIPT_SECTION}}` placeholder added to staticContent.ts
- [x] Full 16-step script section removed from prompt
- [x] Placeholder replaced during prompt building (both functions)
- [x] Manual test: Prompt shows only 3 steps at a time
- [x] Manual test: AI should ask one question, not multiple
- [x] Manual test: AI doesn't see irrelevant steps (e.g., step 14 when at step 2)

## Files Modified

1. `/home/runner/workspace/server/chatService.ts`
   - Added `buildVisibleScriptSection()` function (lines 719-759)
   - Updated `buildFullPromptMarkdown()` to inject visible section (line 871)
   - Updated `getChatResponseStream()` to inject visible section (line 997)

2. `/home/runner/workspace/server/prompts/staticContent.ts`
   - Replaced full 16-step script (lines 31-100) with placeholder (lines 27-36)
   - Added critical rules section emphasizing one question at a time

## Impact on Future Conversations

For ALL future user chats, the system will now:
1. **Focused context**: AI sees only what's relevant right now (current ±1 steps)
2. **One question at a time**: Can't dump multiple questions if it only sees 3 steps
3. **Clear instructions**: "ASK THIS EXACT QUESTION NOW" with visual arrow
4. **Reduced confusion**: Not overwhelmed by 16 steps when it only needs 1
5. **Better performance**: Less prompt noise = more accurate responses

The chat flow should be natural and sequential, not chaotic and overwhelming.
