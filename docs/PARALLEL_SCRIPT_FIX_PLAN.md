# Parallel Execution Plan: Sales Script Fixes
## Based on Last 2 Hours of Real Chat Data

---

## 📊 ACTUAL ISSUES FOUND (Not Assumptions)

### ✅ What's WORKING (Keep/Enhance):
- **Activity Integration: 72% success rate** - AI is successfully working site activity into script questions
- Examples:
  ```
  "you just clicked 'Is my data secure?' 🔒
   how many shoots you run per month?"
  ```

### 🚨 CRITICAL ISSUES (Must Fix):

**Issue #1: Script Progression Blocked**
- 86% of sessions stuck at Step 1
- 14% reach Step 2
- **0% reach Step 3+**
- Root cause: `scriptStep` field not incrementing after user answers

**Issue #2: Massive Question Repetition**
- **50% of all questions are repeats** (14 out of 28 questions)
- Same exact question asked multiple times:
  ```
  "i see you're doing about 88 shoots a year — is that accurate?"
  [asked 5+ times in single session]
  ```

**Issue #3: Low Context Usage**
- Only 46% of questions reference previous answers
- AI not remembering what user already said
- Asking for information already provided

---

## 🎯 PARALLEL AGENT EXECUTION PLAN

### Agent A: Script Progression System
**GOAL:** Get sessions reaching Step 3+ (currently 0%)

**Files to modify:**
- `server/routes.ts` - POST /api/chat/message endpoint
- `server/storage.ts` - Add updateChatSessionStep function
- `server/conversationStateManager.ts` - NEW FILE

**Tasks:**
1. **Create Conversation State Manager** (`server/conversationStateManager.ts`):
   ```typescript
   // Determines if user answered question and should progress
   export function shouldProgressToNextStep(
     userMessage: string,
     assistantQuestion: string,
     currentStep: number
   ): boolean {
     // Step 1: User confirmed/denied annual shoots
     if (currentStep === 1) {
       const confirmsOrDenies = /yes|no|right|wrong|correct|more|fewer|adjust/i.test(userMessage);
       return confirmsOrDenies || userMessage.split(' ').length > 5;
     }

     // Step 2: User said if happy with number
     if (currentStep === 2) {
       return /yes|no|happy|want|grow|fine|good|more/i.test(userMessage);
     }

     // Default: if response > 3 words and not a question
     const isQuestion = userMessage.includes('?');
     const isSubstantive = userMessage.split(' ').length >= 3;
     return !isQuestion && isSubstantive;
   }

   export function getNextQuestion(step: number, context: any): string {
     const questions: Record<number, string> = {
       1: `i see you're doing about ${context.annualShoots} shoots a year — is that accurate?`,
       2: `are you happy with that ${context.annualShoots}-shoot number?`,
       3: `how many hours are you working each week right now?`,
       4: `do you know how you'll grow without hiring or working more?`,
       // ... all 15 steps
     };
     return questions[step] || '';
   }
   ```

2. **Update routes.ts to increment scriptStep**:
   ```typescript
   // After AI responds, check if we should progress
   const fullResponse = /* collected response */;

   if (shouldProgressToNextStep(message, lastAssistantMessage, session.scriptStep)) {
     await db.update(chatSessions)
       .set({
         scriptStep: (session.scriptStep || 1) + 1,
         questionAskedAtStep: fullResponse,
         updatedAt: new Date(),
       })
       .where(eq(chatSessions.id, sessionId));
   }
   ```

3. **Add step validation** - If AI response doesn't match expected question for step, log warning

**Success Metric:** 50%+ of sessions reach Step 3+ within 10 messages

---

### Agent B: Question Memory & Deduplication
**GOAL:** Reduce question repetition from 50% to <10%

**Files to modify:**
- `server/chatService.ts` - PROMPT_PREFIX and getChatResponseStream
- `server/questionCache.ts` - NEW FILE

**Tasks:**
1. **Create Question Cache** (`server/questionCache.ts`):
   ```typescript
   interface QuestionRecord {
     question: string;
     askedAt: Date;
     normalized: string;
   }

   const sessionQuestions = new Map<string, QuestionRecord[]>();

   export function addQuestion(sessionId: string, question: string) {
     const normalized = normalizeQuestion(question);
     if (!sessionQuestions.has(sessionId)) {
       sessionQuestions.set(sessionId, []);
     }
     sessionQuestions.get(sessionId)!.push({
       question,
       askedAt: new Date(),
       normalized,
     });
   }

   export function hasAskedBefore(sessionId: string, question: string): boolean {
     const questions = sessionQuestions.get(sessionId) || [];
     const normalized = normalizeQuestion(question);
     return questions.some(q => similarity(q.normalized, normalized) > 0.7);
   }

   export function getQuestionsAsked(sessionId: string): string[] {
     return (sessionQuestions.get(sessionId) || []).map(q => q.question);
   }
   ```

2. **Add to PROMPT_PREFIX** (chatService.ts line ~210):
   ```typescript
   **🚫 CRITICAL: NEVER REPEAT QUESTIONS**

   Before asking ANY question, CHECK if you've already asked it.

   Questions you've ALREADY ASKED in this conversation:
   ${questionsAlreadyAsked.map((q, i) => `${i + 1}. "${q}"`).join('\n')}

   DO NOT ask ANY of these questions again.
   DO NOT rephrase and ask them again.
   If user didn't answer, acknowledge and move forward: "no worries, let's keep going..."

   NEXT question you should ask (based on step ${scriptStep}):
   "${expectedNextQuestion}"
   ```

3. **Build questions list before sending to AI**:
   ```typescript
   // Extract all questions from conversation history
   const questionsAlreadyAsked = history
     .filter(m => m.role === 'assistant')
     .flatMap(m => extractQuestions(m.content))
     .filter((q, i, arr) => arr.indexOf(q) === i); // dedupe

   const expectedNextQuestion = getNextQuestion(scriptStep, calculatorData);
   ```

4. **Post-response validation**:
   ```typescript
   // After AI responds, check if it repeated a question
   const newQuestions = extractQuestions(aiResponse);
   for (const q of newQuestions) {
     if (hasAskedBefore(sessionId, q)) {
       console.warn(`[REPEAT DETECTED] AI asked: "${q}" (already asked before)`);
       // Log to database for monitoring
     }
     addQuestion(sessionId, q);
   }
   ```

**Success Metric:** <10% question repetition rate

---

### Agent C: Context Memory & Answer Tracking
**GOAL:** Increase context usage from 46% to 80%+

**Files to modify:**
- `server/chatService.ts` - PROMPT_SUFFIX
- `server/storage.ts` - Use conversationSteps table
- `shared/schema.ts` - Ensure conversationSteps schema is correct

**Tasks:**
1. **Save user answers to database** (routes.ts):
   ```typescript
   // After user sends message
   const previousAIMessage = session.messages[session.messages.length - 1];

   await db.insert(conversationSteps).values({
     sessionId: session.id,
     step: session.scriptStep || 1,
     question: previousAIMessage?.content || '',
     answer: userMessage,
     timestamp: new Date(),
   });
   ```

2. **Load conversation memory before AI response**:
   ```typescript
   const conversationMemory = await db
     .select()
     .from(conversationSteps)
     .where(eq(conversationSteps.sessionId, session.id))
     .orderBy(conversationSteps.step);

   const memoryPrompt = `
   **CONVERSATION MEMORY:**
   ${conversationMemory.map(m => `
   Step ${m.step}:
     You asked: "${m.question}"
     They said: "${m.answer}"
   `).join('\n')}

   **USE THIS MEMORY:**
   - Reference their previous answers in your next question
   - Example: "to hit your ${targetShoots}-shoot goal..." (not "what's your goal?")
   - Don't ask for information they already gave you
   `;
   ```

3. **Add to PROMPT_SUFFIX** (chatService.ts):
   ```typescript
   **MEMORY USAGE REQUIREMENTS:**

   Before asking your next question:
   1. Review the CONVERSATION MEMORY above
   2. Find answers they've already given
   3. Reference those answers in your question
   4. NEVER ask for information they already provided

   Good example:
     User said: "I want to hit 150 shoots"
     Your question: "how many hours per week are you working now to sustain those 150 shoots?"

   Bad example:
     User said: "I want to hit 150 shoots"
     Your question: "what's your goal for shoots?" [WRONG - they already told you!]
   ```

4. **Track context usage metric**:
   ```typescript
   function measuresContextUsage(aiQuestion: string, conversationMemory: any[]): boolean {
     // Extract keywords from previous answers
     const answerKeywords = conversationMemory
       .flatMap(m => extractKeywords(m.answer));

     // Check if AI question references any keywords
     return answerKeywords.some(kw => aiQuestion.toLowerCase().includes(kw));
   }
   ```

**Success Metric:** 80%+ of questions reference previous answers

---

### Agent D: Enhanced Activity Integration
**GOAL:** Increase activity integration from 72% to 90%+

**Files to modify:**
- `server/chatService.ts` - PROMPT_PREFIX
- `client/src/components/SupportChat.tsx` - Activity event handling

**Tasks:**
1. **Enhance activity prompt** (chatService.ts PROMPT_PREFIX):
   ```typescript
   **ACTIVITY INTEGRATION (ENHANCED):**

   You receive user activity data (clicks, hovers, page visits).

   ✅ DO: Weave activity into your script questions naturally

   Examples of GOOD activity integration:
   - User hovers pricing → "i see you're curious about pricing — let me understand your workflow first so i can show exact roi. how many shoots per month?"
   - User clicks calculator → "nice! adjust those numbers and i'll recalc your annual shoots. what's your target?"
   - User hovers features → "checking out features? the AI culling could save you hours. how many hours per shoot are you spending now?"

   ❌ DON'T: Just comment on activity without connecting to script

   Bad example: "caught you hovering pricing 👀" [NO SCRIPT QUESTION]

   RULE: Every activity mention MUST end with your current script question.
   ```

2. **Add activity templates per script step**:
   ```typescript
   const activityTemplates: Record<number, Record<string, string>> = {
     1: {
       'pricing': "i see you checking pricing — we'll get there! first, i see you're doing about {shoots} shoots/year — accurate?",
       'calculator': "nice, calculator time! i see about {shoots} shoots/year in there — is that right?",
       'features': "checking features? the ai culling is the big one. speaking of, you're doing about {shoots} shoots/year — accurate?",
     },
     2: {
       'pricing': "pricing time soon! but first: are you happy with that {shoots}-shoot goal or want to grow?",
       // ... more templates
     },
     // ... all steps
   };
   ```

3. **Detect activity type and inject template**:
   ```typescript
   // When building prompt, detect if user activity mentions specific areas
   const activityType = detectActivityType(userActivity); // 'pricing', 'calculator', etc.
   const template = activityTemplates[scriptStep]?.[activityType];

   if (template) {
     const activityPrompt = `
     **ACTIVITY DETECTED:**
     User just ${activityType === 'pricing' ? 'checked pricing' : 'interacted with ' + activityType}

     Use this template as your response:
     "${template}"

     Fill in the {variables} with actual data from calculator.
     `;
     // Add to prompt
   }
   ```

4. **Validate activity integration**:
   ```typescript
   function hasActivityIntegration(response: string, activity: any[]): boolean {
     const mentionsActivity = /pricing|calculator|feature|hover|click/i.test(response);
     const hasScriptQuestion = /\?$/.test(response.trim());
     return !mentionsActivity || (mentionsActivity && hasScriptQuestion);
   }
   ```

**Success Metric:** 90%+ activity mentions include script question

---

### Agent E: Quick Replies Persistence
**GOAL:** Persist parsed Quick Replies for analysis

**Files to modify:**
- `client/src/components/SupportChat.tsx` - Session save logic
- `server/routes.ts` - POST /api/chat/sessions endpoint

**Tasks:**
1. **Complete database migration** - Ensure columns exist:
   - `lastQuickReplies` (jsonb)
   - `lastNextMessageSeconds` (integer)
   - `questionAskedAtStep` (text)
   - `answerGivenAtStep` (text)

2. **Update client to track parsed values** (SupportChat.tsx ~1403):
   ```typescript
   const [lastParsedQuickReplies, setLastParsedQuickReplies] = useState<string[]>([]);
   const [lastParsedNextMessage, setLastParsedNextMessage] = useState<number>(45);

   // When parsing Quick Replies
   if (newQuestions.length > 0) {
     setQuickQuestions(newQuestions);
     setShowSuggestions(true);
     setLastParsedQuickReplies(newQuestions); // ADD
   }

   if (nextMessageMatch) {
     const seconds = parseInt(nextMessageMatch[1], 10);
     setNextMessageIn(seconds);
     setLastParsedNextMessage(seconds); // ADD
   }
   ```

3. **Include in session save** (~535):
   ```typescript
   const sessionsToSave = Object.values(sessionData).map(session => ({
     ...session,
     lastQuickReplies: lastParsedQuickReplies,
     lastNextMessageSeconds: lastParsedNextMessage,
   }));
   ```

4. **Update server to save** (routes.ts):
   ```typescript
   await db.insert(chatSessions)
     .values({
       ...sessionData,
       lastQuickReplies: session.lastQuickReplies || null,
       lastNextMessageSeconds: session.lastNextMessageSeconds || null,
     })
     .onConflictDoUpdate({
       target: chatSessions.id,
       set: {
         lastQuickReplies: session.lastQuickReplies,
         lastNextMessageSeconds: session.lastNextMessageSeconds,
         // ... other fields
       },
     });
   ```

5. **Update analysis script** to verify persistence

**Success Metric:** 100% of sessions have Quick Replies persisted

---

### Agent F: Response Validation & Monitoring
**GOAL:** Real-time monitoring and auto-correction

**Files to modify:**
- `server/responseValidator.ts` - NEW FILE
- `server/routes.ts` - POST /api/chat/message
- `server/routes/admin-analytics.ts` - Add compliance dashboard

**Tasks:**
1. **Create Response Validator** (`server/responseValidator.ts`):
   ```typescript
   export interface ValidationResult {
     valid: boolean;
     issues: string[];
     severity: 'info' | 'warning' | 'critical';
   }

   export function validateResponse(
     aiResponse: string,
     conversationHistory: any[],
     currentStep: number,
     activityData: any[]
   ): ValidationResult {
     const issues: string[] = [];

     // Check 1: Repeated question
     const questions = extractQuestions(aiResponse);
     const previousQuestions = conversationHistory
       .filter(m => m.role === 'assistant')
       .flatMap(m => extractQuestions(m.content));

     for (const q of questions) {
       if (previousQuestions.some(pq => similarity(q, pq) > 0.7)) {
         issues.push(`REPEATED_QUESTION: "${q}"`);
       }
     }

     // Check 2: Activity mentioned without script question
     const mentionsActivity = /hover|click|checking|pricing/i.test(aiResponse);
     const hasQuestion = questions.length > 0;
     if (mentionsActivity && !hasQuestion) {
       issues.push(`ACTIVITY_WITHOUT_SCRIPT: Activity mentioned but no script question`);
     }

     // Check 3: Expected question missing
     const expectedQ = getNextQuestion(currentStep, {});
     const hasExpectedQ = questions.some(q => similarity(q, expectedQ) > 0.5);
     if (!hasExpectedQ) {
       issues.push(`OFF_SCRIPT: Expected "${expectedQ}" but got different question`);
     }

     return {
       valid: issues.length === 0,
       issues,
       severity: issues.length > 2 ? 'critical' : issues.length > 0 ? 'warning' : 'info',
     };
   }
   ```

2. **Validate before sending response** (routes.ts):
   ```typescript
   const fullResponse = /* AI response */;
   const validation = validateResponse(fullResponse, history, scriptStep, userActivity);

   if (!validation.valid) {
     console.warn(`[VALIDATION FAILED]`, validation.issues);
     // Log to database
     await db.insert(validationLogs).values({
       sessionId,
       response: fullResponse,
       issues: validation.issues,
       severity: validation.severity,
       timestamp: new Date(),
     });
   }

   // Send response anyway (don't block user), but log for review
   ```

3. **Add admin compliance dashboard** (admin-analytics.ts):
   ```typescript
   // GET /api/admin/script-compliance
   router.get('/script-compliance', async (req, res) => {
     const metrics = {
       progressionRate: await getProgressionRate(), // % reaching step 3+
       repetitionRate: await getRepetitionRate(),   // % of repeated questions
       contextUsageRate: await getContextUsageRate(), // % using previous answers
       activityIntegrationRate: await getActivityIntegrationRate(), // % activity + script
     };

     const recentIssues = await db
       .select()
       .from(validationLogs)
       .orderBy(desc(validationLogs.timestamp))
       .limit(50);

     res.json({ metrics, recentIssues });
   });
   ```

4. **Create monitoring dashboard page** - Real-time view of script compliance

**Success Metric:** Admin dashboard showing all 4 metrics in green (>80%)

---

## 🚀 EXECUTION ORDER (Parallel)

### Phase 1: Critical Fixes (Run in Parallel)
**Launch all 3 agents simultaneously:**

1. **Agent A** - Script Progression System (1-2 hours)
2. **Agent B** - Question Memory & Deduplication (1-2 hours)
3. **Agent C** - Context Memory & Answer Tracking (1-2 hours)

**Wait for completion, then test:**
- Start fresh chat session
- Go through steps 1-3
- Verify progression works
- Verify no repeated questions
- Verify context usage

### Phase 2: Enhancements (Run in Parallel)
**After Phase 1 completes, launch 2 agents:**

4. **Agent D** - Enhanced Activity Integration (1 hour)
5. **Agent E** - Quick Replies Persistence (30 min)

**Test enhancements:**
- Hover pricing, check AI response
- Click calculator, check AI response
- Verify Quick Replies saved to DB

### Phase 3: Monitoring (Run Solo)
**After Phase 2 completes:**

6. **Agent F** - Response Validation & Monitoring (1-2 hours)

**Test monitoring:**
- Check admin dashboard shows metrics
- Trigger intentional bad responses
- Verify validation catches issues

---

## 📈 SUCCESS METRICS (Before vs After)

| Metric | Before | Target | How to Measure |
|--------|--------|--------|----------------|
| **Script Progression** | 0% reach step 3+ | 50%+ reach step 3+ | `SELECT COUNT(*) FROM chat_sessions WHERE script_step >= 3` |
| **Question Repetition** | 50% repeats | <10% repeats | Run analyze-recent-chats script |
| **Context Usage** | 46% use context | 80%+ use context | Check "Used previous answers" metric |
| **Activity Integration** | 72% integrate | 90%+ integrate | Check "Worked activity into script" metric |
| **Quick Replies Persistence** | 0% persisted | 100% persisted | `SELECT COUNT(*) FROM chat_sessions WHERE last_quick_replies IS NOT NULL` |

---

## 🧪 TESTING PLAN

### Manual Testing (After Each Phase)
1. **Fresh Chat Test:**
   - Clear browser storage
   - Open chat widget
   - Go through all 15 script steps
   - Record which step you get stuck at

2. **Repetition Test:**
   - Give vague answers: "maybe", "idk", "not sure"
   - Verify AI doesn't repeat question
   - Verify AI acknowledges and moves forward

3. **Context Test:**
   - Say "I want 200 shoots per year"
   - 3 messages later, verify AI says "your 200-shoot goal" (not "what's your goal?")

4. **Activity Test:**
   - Hover pricing while on step 1
   - Verify AI mentions pricing BUT also asks step 1 question
   - Click calculator
   - Verify AI references calculator AND asks question

### Automated Testing
```typescript
// tests/integration/script-progression.test.ts
describe('Script Progression', () => {
  it('should progress from step 1 to step 3+', async () => {
    const session = await createTestSession();

    // Step 1
    await sendMessage(session, 'yes that\'s right');
    await expect(getScriptStep(session)).resolves.toBe(2);

    // Step 2
    await sendMessage(session, 'I want to grow');
    await expect(getScriptStep(session)).resolves.toBe(3);

    // Step 3
    await sendMessage(session, 'about 50 hours per week');
    await expect(getScriptStep(session)).resolves.toBe(4);
  });

  it('should not repeat questions', async () => {
    const session = await createTestSession();
    const questions: string[] = [];

    for (let i = 0; i < 5; i++) {
      const response = await sendMessage(session, 'maybe');
      const newQuestions = extractQuestions(response);
      questions.push(...newQuestions);
    }

    // Check for duplicates
    const duplicates = questions.filter((q, i) =>
      questions.findIndex(q2 => similarity(q, q2) > 0.7) !== i
    );

    expect(duplicates.length).toBe(0);
  });
});
```

---

## 📝 NOTES FOR AGENTS

- **Agent A**: Focus on `shouldProgressToNextStep` logic - this is the key blocker
- **Agent B**: The question cache is critical - must work across page reloads
- **Agent C**: Use `conversationSteps` table properly - it exists but isn't being used
- **Agent D**: Don't reduce activity responsiveness - ENHANCE it
- **Agent E**: Database migration may still be running - wait for completion
- **Agent F**: Validation should log, not block - we want data for analysis

---

## 🎯 FINAL OUTCOME

After all agents complete:
- **Users will progress through all 15 script steps** (not stuck at step 1)
- **AI will remember conversation** (no repeated questions)
- **AI will reference previous answers** ("your 150-shoot goal", not "what's your goal?")
- **Activity integration will be seamless** (hover pricing → pricing + script question)
- **Admin dashboard will show compliance metrics** (real-time monitoring)

**The chat will feel natural, remember context, progress through the sales script, AND be responsive to user activity.**
