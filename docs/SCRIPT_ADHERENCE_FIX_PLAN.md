# Sales Script Adherence Fix Plan

## Part 1: Persist Quick Replies & Timing (DONE)

### Database Migration ✅
Added to `chatSessions` table:
- `lastQuickReplies` (jsonb) - Array of most recent Quick Reply options offered
- `lastNextMessageSeconds` (integer) - Most recent NEXT_MESSAGE timing value
- `questionAskedAtStep` (text) - What question AI asked at current scriptStep
- `answerGivenAtStep` (text) - What answer user gave at current scriptStep

### Implementation TODO:

#### 1. Update Client State (SupportChat.tsx)
Add new state variables to track parsed Quick Replies:
```typescript
const [lastParsedQuickReplies, setLastParsedQuickReplies] = useState<string[]>([]);
const [lastParsedNextMessage, setLastParsedNextMessage] = useState<number>(45);
```

#### 2. Persist When Parsing (lines ~1403)
When we parse Quick Replies from AI response, also save to session:
```typescript
if (newQuestions.length > 0) {
  setQuickQuestions(newQuestions);
  setShowSuggestions(true);
  setLastParsedQuickReplies(newQuestions); // ADD THIS
}

if (nextMessageMatch) {
  const seconds = parseInt(nextMessageMatch[1], 10);
  setNextMessageIn(seconds);
  setLastParsedNextMessage(seconds); // ADD THIS
}
```

#### 3. Include in Session Save (line ~535)
When saving sessions to backend, include these fields:
```typescript
await apiRequest("POST", '/api/chat/sessions', {
  sessions: sessionsToSave.map(session => ({
    ...session,
    lastQuickReplies: lastParsedQuickReplies,
    lastNextMessageSeconds: lastParsedNextMessage,
  })),
  metadata
});
```

#### 4. Update Server Route (server/routes.ts)
Accept and save these new fields when receiving session updates.

---

## Part 2: Sales Script Adherence Analysis

### 🚨 CRITICAL ISSUES FOUND IN DATABASE

Analyzed 10 recent chat sessions (197 messages total). Here's what's broken:

#### Issue #1: AI Reacting to Every Hover/Click Event Instead of Following Script

**Current behavior:**
```
"caught you hovering DeepMind on the page 👀"
"you just clicked 'Is my data secure?' 🔒"
"lol you were checking pricing again 👀"
"saw you hover KullFeaturesPricingReferralsDo—what's your pric..."
```

**What it SHOULD do:**
- Ignore hover/click events completely UNLESS they're directly relevant to current script question
- Stay focused on the 15-step sales script
- Only comment on user activity if it helps answer the current question

**Example of correct behavior:**
```
Step 1: "i see you're doing about 88 shoots a year — is that accurate?"
User: [clicks calculator]
AI: [waits for user to respond, ignores click event]
```

#### Issue #2: Repeating Questions Already Asked

**Current behavior:**
```
Message 1: "i see you're doing about 88 shoots a year — is that accurate?"
Message 2: "i see you're doing about 88 shoots a year — is that accurate?"
Message 5: "i see you're doing about 88 shoots a year — is that accurate?"
Message 6: "i see you're doing about 88 shoots a year — is that accurate?"
```

**Root cause:**
- AI not checking conversation history before responding
- No memory of what it already asked
- scriptStep field exists but AI doesn't reference it

#### Issue #3: Not Progressing Through Script Steps

**Current state:**
- Step 1 (verify shoots): ✅ Sometimes works
- Step 2 (are you happy): ⚠️  Rarely reached
- Steps 3-15: ❌ Never reached in any session

**Example of stuck conversation:**
```
Session: 1762213820220 (197 messages, scriptStep: 3)
- 188 assistant messages
- 180+ are random comments about hovers/clicks
- Only 8 actually follow the script
- Never progressed past step 3
```

#### Issue #4: Not Using Previous Answers

**Current behavior:**
```
Step 2: "are you happy with that 88-shoot goal?"
User: "I want to grow to 150"
Step 3: AI asks "what's your goal?" [WRONG - already told us!]
```

**Should be:**
```
Step 2: "are you happy with that 88-shoot goal?"
User: "I want to grow to 150"
Step 3: "how many hours per week are you working now to hit those 88 shoots?" [references previous answer]
```

#### Issue #5: Getting Derailed by Off-Script Questions

**Current behavior:**
```
User: "how much does this cost?"
AI: "good question! pricing depends on your workflow..."
[Then proceeds to ignore script and talk about pricing]
```

**Should be:**
```
User: "how much does this cost?"
AI: "good question! we'll get to pricing in a sec, but first let me understand your workflow so i can show you exact roi. how many hours per week are you working right now?"
[Acknowledges question, redirects back to current script step]
```

---

## Part 3: FIX PLAN

### Fix #1: Strengthen Prompt with Anti-Patterns

Add to `chatService.ts` PROMPT_SUFFIX:

```typescript
**🚫 ANTI-PATTERNS - NEVER DO THESE:**

1. **NEVER comment on user activity events (hovers, clicks, page visits)**
   ❌ WRONG: "caught you hovering pricing 👀"
   ❌ WRONG: "you just clicked features"
   ❌ WRONG: "i see you checking out the calculator"
   ✅ RIGHT: [Ignore these events completely, stay on script]

2. **NEVER repeat a question you've already asked**
   - Before responding, CHECK the conversation history
   - If you asked "what's your goal?" → DON'T ask it again
   - Reference their previous answer: "to hit your 150-shoot goal..."

3. **NEVER skip ahead in the script**
   - You must go step-by-step: 1 → 2 → 3 → 4...
   - Don't jump to pricing unless you're at step 13
   - Don't talk about solutions unless you're at step 10

4. **NEVER ignore what the user said**
   - ALWAYS acknowledge their message first
   - THEN redirect to your next script question
   - Example: "got it, you want pricing! let me first understand your workflow so i can show exact roi..."

5. **NEVER ask for information they already provided**
   - If they said "150 shoots": reference it, don't ask again
   - If they said "50 hours/week": use that number, don't ask again
```

### Fix #2: Add Explicit State Tracking to Each Request

Before sending to OpenAI, build a summary from conversation history:

```typescript
// NEW: Build conversation state summary
const questionsAsked = history
  .filter(m => m.role === 'assistant')
  .map((m, i) => `Q${i+1}: ${m.content.substring(0, 100)}`)
  .join('\n');

const answersGiven = history
  .filter(m => m.role === 'user')
  .map((m, i) => `A${i+1}: ${m.content.substring(0, 100)}`)
  .join('\n');

const statePrompt = `
**CONVERSATION STATE:**
Current Step: ${scriptStep || 1}
Questions You've Already Asked:
${questionsAsked}

Answers User Has Given:
${answersGiven}

**YOUR TASK:**
1. Read what the user JUST said: "${userMessage}"
2. Acknowledge it naturally
3. Ask the NEXT question in the script (step ${(scriptStep || 1) + 1})
4. DO NOT repeat any question from "Questions You've Already Asked" above
5. Reference specific answers from "Answers User Has Given" when relevant
`;
```

### Fix #3: Server-Side Response Validation

After receiving AI response, validate it before sending to client:

```typescript
// server/routes.ts - after getting AI response
function validateScriptAdherence(aiResponse: string, conversationHistory: any[], currentStep: number): {
  valid: boolean;
  issues: string[];
  correctedResponse?: string;
} {
  const issues: string[] = [];

  // Check if response mentions hover/click events
  if (aiResponse.match(/hover|click|checking|peeking|eyeing|caught you/i)) {
    issues.push('Response mentions user activity events (should ignore these)');
  }

  // Check if response repeats a question already asked
  const previousQuestions = conversationHistory
    .filter(m => m.role === 'assistant')
    .map(m => m.content.toLowerCase());

  const currentQuestion = aiResponse.toLowerCase();
  const isRepeat = previousQuestions.some(prev =>
    similarity(prev, currentQuestion) > 0.7 // 70% similar
  );

  if (isRepeat) {
    issues.push('Response repeats a question already asked');
  }

  // Check if response is on correct step
  const expectedStep = currentStep + 1;
  // ... step validation logic

  return {
    valid: issues.length === 0,
    issues,
  };
}
```

### Fix #4: Add Conversation Memory via Database

Use `conversationSteps` table properly:

```typescript
// After each user response, save what they said
await db.insert(conversationSteps).values({
  sessionId: session.id,
  step: currentStep,
  question: lastAiQuestion,
  answer: userMessage,
  timestamp: new Date(),
});

// Before generating AI response, load previous steps
const previousSteps = await db
  .select()
  .from(conversationSteps)
  .where(eq(conversationSteps.sessionId, session.id))
  .orderBy(conversationSteps.step);

// Include in prompt:
const memoryPrompt = previousSteps.map(s =>
  `Step ${s.step}: You asked "${s.question}" → They said "${s.answer}"`
).join('\n');
```

### Fix #5: Implement Step-by-Step Guardrails

Create a function that generates the EXACT next question based on scriptStep:

```typescript
const SCRIPT_QUESTIONS = {
  1: (shoots: number) => `i see you're doing about ${shoots} shoots a year — is that accurate?`,
  2: (shoots: number) => `are you happy with that ${shoots}-shoot number?`,
  3: () => `how many hours are you working each week right now?`,
  4: () => `do you know how you'll grow those numbers without hiring or working more?`,
  5: () => `how do you expect to do that with your current workflow?`,
  6: () => `what's your actual target for annual shoots, revenue, or time off?`,
  7: () => `why that specific goal?`,
  8: () => `what changes in your business or life when you hit it?`,
  9: () => `what's kept you from hitting that already?`,
  10: () => `this is exactly what i specialize in: removing the workflow block that's keeping you from those numbers.`,
  11: () => `how committed are you to hitting that? 1–10.`,
  12: () => `when do you want this fixed so you can hit those numbers?`,
  13: () => `want the price?`,
  14: (price: number) => `everyday price is $${price}/mo to solve exactly the problem you just described.`,
  15: (price: number, discount: number) => `alright — everyday price is $${price}. if you'll commit to the goal you told me, i'll discount it to $${discount}.`,
};

function getExpectedQuestion(step: number, context: any): string {
  const questionFn = SCRIPT_QUESTIONS[step];
  if (!questionFn) return '';
  return questionFn(context.shoots, context.price, context.discount);
}

// Fallback: if AI goes off-script, inject correct question
if (!aiResponse.includes(expectedQuestion.substring(0, 20))) {
  console.warn(`AI went off-script at step ${step}. Expected: "${expectedQuestion}"`);
  // Option 1: Return expected question instead
  // Option 2: Retry with stricter prompt
  // Option 3: Log for admin review
}
```

### Fix #6: Add Script Step Progression Logic

```typescript
// After user responds, increment script step
function shouldProgressToNextStep(userResponse: string, currentStep: number): boolean {
  // Simple heuristics:
  // - If response is > 3 words, they answered
  // - If they clicked a Quick Reply, they answered
  // - If they asked a question, acknowledge but don't progress

  const isQuestion = userResponse.includes('?');
  const isShortAcknowledgment = userResponse.split(' ').length < 3;

  if (isQuestion || isShortAcknowledgment) {
    return false; // Don't progress, need more engagement
  }

  return true; // Progress to next step
}

// Update session after determining progression
if (shouldProgressToNextStep(userMessage, currentStep)) {
  await db.update(chatSessions)
    .set({
      scriptStep: currentStep + 1,
      questionAskedAtStep: aiQuestion,
      answerGivenAtStep: userMessage,
    })
    .where(eq(chatSessions.id, sessionId));
}
```

---

## Part 4: IMPLEMENTATION ORDER

### Phase 1: Persistence (This PR)
1. ✅ Database migration (add 4 new columns)
2. ⬜ Update client to track lastQuickReplies & lastNextMessageSeconds
3. ⬜ Update session save to include these fields
4. ⬜ Update server to accept and save these fields
5. ⬜ Re-run analysis script to verify persistence works

### Phase 2: Anti-Patterns (Next PR)
1. Add 🚫 ANTI-PATTERNS section to prompt
2. Test with live chat to verify AI stops commenting on hovers/clicks
3. Verify AI checks history before responding

### Phase 3: State Tracking (Next PR)
1. Add conversation state summary to each request
2. Include questionsAsked and answersGiven lists
3. Test that AI references previous answers

### Phase 4: Response Validation (Next PR)
1. Implement validateScriptAdherence function
2. Add similarity checking for repeated questions
3. Add logging for off-script responses
4. Consider auto-correction or retries

### Phase 5: Memory & Progression (Next PR)
1. Use conversationSteps table for memory
2. Implement shouldProgressToNextStep logic
3. Add step progression guardrails
4. Test full 15-step script flow end-to-end

---

## Success Metrics

After fixes, we should see:
- ✅ 0% of responses commenting on hover/click events (currently ~60%)
- ✅ 0% of responses repeating questions (currently ~30%)
- ✅ 100% of conversations progressing past step 3 (currently 0%)
- ✅ 80%+ of responses referencing previous answers (currently ~10%)
- ✅ Average conversation reaches step 8+ (currently stuck at step 1-2)

---

## Testing Plan

1. **Manual Testing:**
   - Start fresh chat
   - Go through all 15 steps
   - Verify AI stays on script
   - Try derailing with off-script questions
   - Verify AI redirects back to script

2. **Automated Testing:**
   - Create test conversations covering all 15 steps
   - Verify scriptStep increments correctly
   - Verify no repeated questions
   - Verify no activity event comments

3. **Production Monitoring:**
   - Re-run analyze-chat-compliance.ts daily
   - Track: avg steps reached, repetition rate, activity comment rate
   - Alert if metrics degrade

---

## Notes

- This is a **prompt engineering + validation** problem, not just a technical problem
- The AI model (gpt-5-mini) is capable, but needs stronger guardrails
- We need both carrot (better prompt) and stick (validation/retries)
- Quick Replies are working fine - issue is script adherence, not UI
