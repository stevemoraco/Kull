# Activity Integration Testing Guide

## Overview

Enhanced activity integration weaves user activity (hovers, clicks, page visits) into script questions naturally. This guide shows how to test the implementation.

## What Was Implemented

### 1. Activity Templates (`server/activityTemplates.ts`)
- Templates for all 15 script steps
- Each step has templates for: pricing, calculator, features, security, testimonials
- Templates acknowledge activity AND include script question
- Variables filled with calculator data

### 2. Activity Detection (`server/activityDetector.ts`)
- Detects activity type from user activity stream
- Prioritizes clicks over hovers (stronger intent signal)
- Returns: 'pricing', 'calculator', 'features', 'security', 'testimonials', or null
- Validates that activity mentions include script questions

### 3. Enhanced Prompt (`server/chatService.ts`)
- Updated PROMPT_PREFIX with activity integration guidance
- Examples of GOOD integration (activity + question)
- Examples of BAD integration (activity without question)
- Golden rule: Every activity mention MUST end with script question

### 4. Routes Integration (`server/routes.ts`)
- Detects activity type before calling AI
- Injects activity template into prompt
- Validates response after AI completes
- Logs success/failure for monitoring

## Manual Testing

### Test 1: Pricing Hover (Step 1)

**Setup:**
1. Open chat widget
2. Hover over pricing section multiple times
3. Send first message to AI

**Expected Behavior:**
```
AI: "i see you checking pricing — we'll get there! first, i see you're doing about 88 shoots/year based on your calculator — is that accurate?"
```

**Validation:**
- ✅ Mentions pricing activity
- ✅ Asks Step 1 script question
- ✅ Uses actual calculator data

**Log output:**
```
[Activity Integration] Detected pricing activity, suggesting template for Step 1
[Activity Integration] ✅ Successfully integrated activity into script
```

---

### Test 2: Calculator Interaction (Step 1)

**Setup:**
1. Open chat widget
2. Adjust calculator sliders (shoots/week, hours/shoot)
3. Click "less" or "more" presets
4. Send first message to AI

**Expected Behavior:**
```
AI: "nice! love when people play with the numbers. i see about 88 shoots/year in there — is that right?"
```

**Validation:**
- ✅ Mentions calculator activity
- ✅ Asks Step 1 script question
- ✅ Uses updated calculator values

---

### Test 3: Features Hover (Step 1)

**Setup:**
1. Open chat widget
2. Hover over features section
3. Click feature details
4. Send first message to AI

**Expected Behavior:**
```
AI: "checking out features? the ai culling is the big one. speaking of, you're doing about 88 shoots/year — accurate?"
```

**Validation:**
- ✅ Mentions features activity
- ✅ Asks Step 1 script question
- ✅ Natural transition

---

### Test 4: Security Concerns (Step 1)

**Setup:**
1. Open chat widget
2. Hover over security badges
3. Click data privacy link
4. Send first message to AI

**Expected Behavior:**
```
AI: "great question about security — your photos are safe (all encrypted, deleted after processing). first though: i see about 88 shoots/year — accurate?"
```

**Validation:**
- ✅ Addresses security concern
- ✅ Asks Step 1 script question
- ✅ Reassures user

---

### Test 5: Activity at Different Steps

**Setup:**
1. Progress to Step 3 ("how many hours per week?")
2. Hover over pricing section
3. Send next message

**Expected Behavior:**
```
AI: "we'll get to pricing soon, promise. first: how many hours are you working each week right now to sustain those 88 shoots?"
```

**Validation:**
- ✅ Acknowledges pricing interest
- ✅ Asks Step 3 question (not Step 1)
- ✅ Keeps script flowing

---

### Test 6: No Activity Detected

**Setup:**
1. Open chat widget
2. Don't interact with page elements
3. Send first message immediately

**Expected Behavior:**
```
AI: "i see you're doing about 88 shoots a year (based on your calculator settings) — is that accurate?"
```

**Validation:**
- ✅ Default Step 1 question
- ✅ No activity mention
- ✅ Still references calculator data

---

## Automated Testing

### Run Unit Tests

```bash
# Test activity detection
npx tsx server/activityDetector.test.ts

# Test activity templates
npx tsx server/activityTemplates.test.ts
```

### Expected Output

All tests should pass:
```
✅ Pricing hover - detected: pricing
✅ Calculator interaction - detected: calculator
✅ Features exploration - detected: features
✅ Security concerns - detected: security
✅ Testimonials - detected: testimonials
✅ Mixed activity - pricing click wins
✅ Valid - activity + question
✅ Invalid - activity without question
```

---

## Monitoring

### Server Logs to Watch

**Success case:**
```
[Activity Integration] Detected pricing activity, suggesting template for Step 1
[Activity Integration] ✅ Successfully integrated activity into script
```

**Warning case (AI didn't follow template):**
```
[Activity Integration] Detected calculator activity, suggesting template for Step 1
[Activity Integration] ❌ Response mentioned activity without script question
```

### Admin Dashboard (Future)

Track metrics:
- Activity detection rate (% of messages with detected activity)
- Integration success rate (% of activity mentions that include questions)
- Most common activity types by script step

---

## Common Issues & Fixes

### Issue: AI mentions activity but no question

**Example:**
```
AI: "caught you hovering pricing 👀"
```

**Log:**
```
[Activity Integration] ❌ Response mentioned activity without script question
```

**Fix:**
- Prompt already includes templates and examples
- AI should follow the template more closely
- Check if prompt is being truncated

---

### Issue: AI doesn't mention activity at all

**Example:**
```
User hovers pricing
AI: "i see you're doing about 88 shoots — is that accurate?"
```

**Diagnosis:**
- Check if activity detection ran: `[Activity Integration] Detected ...`
- If no log, activity might not match keywords
- Check userActivity array contains events

**Fix:**
- Verify frontend is tracking hovers correctly
- Check activity detector keyword patterns

---

### Issue: Wrong template for step

**Example:**
```
User at Step 5, hovers pricing
AI uses Step 1 template instead of Step 5
```

**Diagnosis:**
- Check currentStep value in logs
- Verify conversationState.currentStep is updating

**Fix:**
- Ensure Agent A (Script Progression) is working
- Check scriptStep increments in database

---

## Success Criteria

### Before Implementation
- 72% activity integration rate
- Many responses comment on activity without asking questions

### After Implementation (Target)
- 90%+ activity integration rate
- Every activity mention includes script question
- Natural transitions between activity and script

### How to Measure

1. **Start 10 test sessions**
2. **Interact with different page elements** (pricing, calculator, features)
3. **Count responses:**
   - Total messages with activity mentioned: X
   - Messages with activity + question: Y
   - Integration rate: (Y / X) × 100%

**Target: 90%+ integration rate**

---

## Example Conversation Flow

**User:** *hovers pricing* → "how much does this cost?"

**AI (Step 1):**
```
i see you checking pricing — we'll get there! first, i see you're doing about 88 shoots/year based on your calculator — is that accurate?
```

**User:** "yes that's right"

**AI (Step 2):**
```
are you happy with that 88-shoot number or looking to grow?
```

**User:** *clicks calculator* → "I want to do more"

**AI (Step 3):**
```
adjusting those numbers? smart. so how many hours per week are you working right now?
```

**User:** "about 50 hours"

**AI (Step 4):**
```
do you know how you'll grow without hiring or working even more than 50 hours?
```

---

## Rollback Plan

If activity integration causes issues:

1. **Disable template injection:**
   ```typescript
   // In routes.ts, comment out activity detection block:
   // const activityType = detectActivityType(userActivity);
   ```

2. **Keep enhanced prompt:**
   - Prompt guidance is still valuable even without templates

3. **Monitor logs:**
   - Check for errors in activity detection
   - Fix and re-enable

---

## Next Steps

1. **Deploy to production**
2. **Monitor logs for 24 hours**
3. **Measure integration rate** (target: 90%+)
4. **Collect user feedback** (does activity integration feel natural?)
5. **Iterate on templates** based on real usage

---

## Related Files

- `/home/runner/workspace/server/activityTemplates.ts` - All templates
- `/home/runner/workspace/server/activityDetector.ts` - Detection logic
- `/home/runner/workspace/server/chatService.ts` - Enhanced prompt
- `/home/runner/workspace/server/routes.ts` - Integration point
- `/home/runner/workspace/docs/PARALLEL_SCRIPT_FIX_PLAN.md` - Overall plan

---

**Last Updated:** 2025-11-19
**Agent:** Agent D - Enhanced Activity Integration
