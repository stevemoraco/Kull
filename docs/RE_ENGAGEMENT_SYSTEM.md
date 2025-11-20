# Re-Engagement System Documentation

## Overview

The re-engagement system intelligently handles cases where users don't respond to the welcome chat messages. It avoids repeating the same question and uses contextual cues (like user activity) to determine the best approach.

## Core Philosophy

1. **Never repeat word-for-word** - Always rephrase questions if re-asking
2. **Reference activity** - If user is clicking/scrolling, mention it
3. **Know when to back off** - After 3 attempts with no response, give space
4. **Be low-pressure** - Keep it casual and friendly

## Architecture

### Files

- **`server/reEngagementLogic.ts`** - Core logic and strategy determination
- **`server/reEngagementLogic.test.ts`** - Comprehensive test suite (33 tests)
- **`server/reEngagementLogic.example.ts`** - Integration examples
- **`docs/RE_ENGAGEMENT_SYSTEM.md`** - This file

### Key Functions

#### `determineReEngagementStrategy(context: ReEngagementContext): ReEngagementStrategy`

Main decision function that determines which re-engagement approach to use.

**Input:**
```typescript
interface ReEngagementContext {
  lastAiMessage: string;              // Last message AI sent
  timeSinceLastMessage: number;       // Milliseconds since last AI message
  currentStep: number;                // Current sales script step (0-15)
  userHasResponded: boolean;          // Has user ever meaningfully engaged?
  recentActivity: UserActivityEvent[];// Clicks, scrolls, hovers since last message
  messageCount: number;               // How many consecutive AI messages without response
  conversationMessageCount: number;   // Total messages in conversation
}
```

**Output:**
```typescript
interface ReEngagementStrategy {
  approach: 'same_question_different_wording' | 'activity_based_nudge' | 'low_pressure_check_in' | 'give_space';
  suggestedMessage: string;           // Actual message to send (or empty if give_space)
  reasoning: string;                  // Why this approach was chosen
}
```

**Decision Logic:**

1. **Give Space** - If user never responded and AI sent 3+ messages
   - Don't send anything
   - Wait for user to initiate

2. **Activity-Based Nudge** - If user active (clicks/scrolls) but silent (< 60s)
   - Reference what they're doing
   - Example: "saw you click pricing - questions about that?"

3. **Same Question Different Wording** - At important steps (0, 1, 13-15) after 1-2 min
   - Reword the question using variations
   - Never repeat exact same phrasing

4. **Low-Pressure Check-In** - After 2+ minutes
   - Casual message with no pressure
   - Example: "still there? no pressure - happy to chat whenever"

#### `formatReEngagementContext(strategy: ReEngagementStrategy): string`

Formats the strategy as markdown context for AI to inject into the prompt.

**Example output:**
```markdown
## 🔄 RE-ENGAGEMENT STRATEGY

**Approach:** activity_based_nudge
**Reasoning:** User is active but not responding - reference their activity

**Suggested Message:**
"saw you click pricing - questions about that?"

**IMPORTANT INSTRUCTIONS:**
- Don't repeat your last message word-for-word
- Reference their recent activity if available (clicks, hovers, scrolls)
- Keep it casual and low-pressure
- If they still don't respond after this, back off completely
```

#### Helper Functions

- `shouldConsiderReEngagement(timeSinceLastMessage, messageCount)` - Check if enough time has passed
- `getRecentActivitySince(allActivity, sinceTimestamp)` - Filter activity to recent events
- `hasUserMeaningfullyEngaged(conversationHistory)` - Check for substantive responses (>5 words)
- `countConsecutiveAiMessages(conversationHistory)` - Count unanswered AI messages

## Question Variations

For each of the 16 sales script steps (0-15), there are 2-4 different phrasings:

### Example: Step 0 (Permission)

```typescript
[
  'do you mind if i ask you a few questions?',
  'quick question - ok if we chat for a minute?',
  'would you be open to a few questions about your workflow?',
  'can i ask you a couple quick questions to see if kull is a fit?'
]
```

### Example: Step 13 (Price Reveal)

```typescript
[
  'cool. so do you want to hear the price, or should we keep talking about the bottleneck?',
  'ready to talk pricing or want to discuss the solution more first?',
  'should i tell you what it costs or keep explaining how it works?',
  'want the price now or more details first?'
]
```

All variations maintain the **same intent** but use **different words/phrasing**.

## Activity-Based Nudges

When user is active but silent, reference their behavior:

### Click Events
```
"saw you click 'pricing' - questions about that?"
"noticed you clicked start trial - want to talk about it?"
```

### Hover Events
```
"noticed you hovering on features - curious about something?"
"saw you hover on that - questions?"
```

### Scroll Events
```
"saw you checking out pricing - want to understand how it works?"
"noticed you looking at features - questions?"
"saw you scrolling - anything catch your eye?"
```

### Input/Select Events (Calculator)
```
"noticed you adjusting shoots per week - want to talk about those numbers?"
"saw you playing with the calculator - questions about your workflow?"
```

## Integration Guide

### Step 1: Track User Activity

Frontend sends activity events:

```typescript
// Frontend tracking
function trackActivity(type: string, target: string, value?: string) {
  fetch('/api/activity', {
    method: 'POST',
    body: JSON.stringify({
      type,
      target,
      value,
      timestamp: Date.now()
    })
  });
}

// Track clicks
document.addEventListener('click', (e) => {
  const target = e.target.closest('[data-track]');
  if (target) {
    trackActivity('click', target.dataset.track);
  }
});

// Track calculator changes
sliderElement.addEventListener('input', (e) => {
  trackActivity('input', 'slider.shoots-per-week', e.target.value);
});
```

### Step 2: Store Activity (Backend)

```typescript
// Store in Redis (expires after 1 hour)
async function trackUserActivity(userId: string, event: ActivityEvent) {
  const key = `user_activity:${userId}`;
  await redis.lpush(key, JSON.stringify(event));
  await redis.ltrim(key, 0, 99); // Keep last 100
  await redis.expire(key, 3600);
}
```

### Step 3: Check for Re-Engagement in Chat Endpoint

```typescript
import {
  determineReEngagementStrategy,
  formatReEngagementContext,
  shouldConsiderReEngagement,
  getRecentActivitySince,
  hasUserMeaningfullyEngaged,
  countConsecutiveAiMessages
} from './reEngagementLogic';

app.post('/api/chat', async (req, res) => {
  const { userId, message } = req.body;

  // Get conversation history
  const history = await getConversationHistory(userId);

  // Get user activity
  const activity = await getUserActivity(userId);

  // Check if re-engagement needed
  const lastAiMessage = history.filter(m => m.role === 'assistant').pop();

  if (lastAiMessage) {
    const timeSince = Date.now() - lastAiMessage.timestamp;
    const consecutiveAI = countConsecutiveAiMessages(history);

    if (shouldConsiderReEngagement(timeSince, consecutiveAI)) {
      const recentActivity = getRecentActivitySince(activity, lastAiMessage.timestamp);

      const context = {
        lastAiMessage: lastAiMessage.content,
        timeSinceLastMessage: timeSince,
        currentStep: getCurrentStep(history),
        userHasResponded: hasUserMeaningfullyEngaged(history),
        recentActivity,
        messageCount: consecutiveAI,
        conversationMessageCount: history.length
      };

      const strategy = determineReEngagementStrategy(context);

      if (strategy.approach === 'give_space') {
        // Don't respond - return 204 No Content
        return res.status(204).send();
      }

      // Add re-engagement context to AI prompt
      const reEngagementPrompt = formatReEngagementContext(strategy);
      const aiPrompt = buildPrompt(message, history, reEngagementPrompt);

      const response = await callOpenAI(aiPrompt);
      return res.json({ message: response });
    }
  }

  // Normal response
  const response = await generateNormalResponse(message, history);
  res.json({ message: response });
});
```

### Step 4: Background Checker (Optional)

For proactive re-engagement via WebSocket:

```typescript
// Run every 30 seconds
setInterval(async () => {
  const idleConversations = await db.query(`
    SELECT user_id, conversation_history, last_message_timestamp
    FROM conversations
    WHERE last_message_role = 'assistant'
    AND last_message_timestamp < NOW() - INTERVAL '1 minute'
    AND last_message_timestamp > NOW() - INTERVAL '10 minutes'
  `);

  for (const conv of idleConversations) {
    // Check re-engagement logic
    const context = buildReEngagementContext(conv);
    const strategy = determineReEngagementStrategy(context);

    if (strategy.approach !== 'give_space') {
      // Send via WebSocket
      websocket.sendToUser(conv.user_id, {
        type: 'RE_ENGAGEMENT',
        message: strategy.suggestedMessage
      });
    }
  }
}, 30000);
```

## Testing

### Run Tests

```bash
npm test -- reEngagementLogic.test.ts
```

### Test Coverage

- ✅ All 33 tests passing
- ✅ 100% coverage of decision logic
- ✅ All edge cases handled
- ✅ Integration scenarios tested

### Key Test Scenarios

1. **Backing off after 3 attempts**
   - User never responded, AI sent 3 messages → Give space

2. **Activity-based nudges**
   - User clicks pricing → Reference pricing
   - User scrolls features → Reference features
   - User adjusts calculator → Reference calculator

3. **Question rewording**
   - Never repeat same question word-for-word
   - Maintain same intent with different phrasing

4. **Timing logic**
   - < 30s → Wait
   - 30s - 60s → Activity nudge if active
   - 60s - 120s → Reword question at important steps
   - 120s+ → Casual check-in

5. **Edge cases**
   - Empty activity array
   - Missing conversation history
   - Invalid step numbers
   - Very long time gaps (10+ minutes)

## Timing Configuration

### Current Thresholds

```typescript
const MINIMUM_WAIT_TIME = 30000;      // 30 seconds
const ACTIVITY_WINDOW = 60000;        // 1 minute for activity nudges
const REWORDING_WINDOW_MIN = 60000;   // 1 minute min for rewording
const REWORDING_WINDOW_MAX = 120000;  // 2 minutes max for rewording
const CASUAL_CHECKIN_TIME = 120000;   // 2+ minutes for casual check-in
const EXTENDED_WAIT_TIME = 120000;    // 2 minutes after 3+ attempts
```

### Important Steps (Rewording Priority)

Steps where rewording is prioritized:
- **Step 0** - Permission (critical first impression)
- **Step 1** - Accuracy check (validates calculator data)
- **Step 13** - Price reveal (critical decision point)
- **Step 14** - State price (closing sequence)
- **Step 15** - Discount close (final offer)

## Best Practices

### DO:

✅ Track all meaningful user interactions (clicks, scrolls, inputs)
✅ Reference activity in nudges when available
✅ Use different wording when re-asking questions
✅ Back off after 3 unanswered messages
✅ Keep messages casual and low-pressure
✅ Test edge cases thoroughly

### DON'T:

❌ Repeat the exact same question twice
❌ Send more than 3 messages without a response
❌ Reference activity that's old (>1 minute)
❌ Be pushy or aggressive in re-engagement
❌ Skip the "give_space" strategy
❌ Ignore timing thresholds

## Monitoring

### Metrics to Track

1. **Re-engagement rate** - % of users who respond after re-engagement
2. **Strategy distribution** - Which approaches are used most
3. **Backing off rate** - % of conversations where we give space
4. **Activity correlation** - Does referencing activity improve response rate?

### Logging

```typescript
console.log(`[Re-engagement] User ${userId} - Strategy: ${strategy.approach}`);
console.log(`[Re-engagement] Reasoning: ${strategy.reasoning}`);
console.log(`[Re-engagement] Message count: ${context.messageCount}`);
console.log(`[Re-engagement] Time since last: ${context.timeSinceLastMessage}ms`);
```

## Future Enhancements

### Potential Improvements

1. **Machine learning** - Learn which strategies work best per user segment
2. **A/B testing** - Test different timing thresholds
3. **Personalization** - Adjust based on user behavior patterns
4. **Sentiment analysis** - Detect frustration and back off sooner
5. **Multi-channel** - Re-engage via email/SMS if chat fails

## Troubleshooting

### Issue: AI repeats same question

**Cause:** Re-engagement logic not being called
**Fix:** Ensure `formatReEngagementContext()` output is being added to AI prompt

### Issue: Too many re-engagement attempts

**Cause:** `messageCount` not incrementing correctly
**Fix:** Use `countConsecutiveAiMessages()` to calculate properly

### Issue: Activity not being referenced

**Cause:** Activity events not being stored or retrieved
**Fix:** Check activity tracking endpoint and Redis storage

### Issue: Backing off too early

**Cause:** `userHasResponded` incorrectly set to `false`
**Fix:** Use `hasUserMeaningfullyEngaged()` to check properly

## Support

For questions or issues:
- Check tests: `server/reEngagementLogic.test.ts`
- Review examples: `server/reEngagementLogic.example.ts`
- See source: `server/reEngagementLogic.ts`

## License

Part of the Kull platform - internal use only.
