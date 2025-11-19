# Calculator Change Detection & AI Auto-Reply Implementation

## Overview
This implementation adds automatic AI acknowledgment when users adjust calculator values during a chat session. When the user changes shoots per week, hours per shoot, or billable rate while chatting, the AI automatically responds to acknowledge the change and relate it to the ongoing conversation.

## Changes Made

### 1. CalculatorContext Enhancement (`/home/runner/workspace/client/src/contexts/CalculatorContext.tsx`)

**Added:**
- `CalculatorValues` interface for type safety
- `registerChangeListener()` method to allow components to subscribe to calculator changes
- Observer pattern implementation using `useRef<Set>` to store listeners
- Wrapped setter functions that detect value changes and notify all registered listeners
- Automatic cleanup mechanism via returned unregister function

**Key Features:**
- Only notifies listeners when values actually change (prevents duplicate notifications)
- Error handling for listener callbacks
- Asynchronous notification using `setTimeout` to avoid blocking state updates
- Maintains backward compatibility with existing calculator usage

**Example Usage:**
```typescript
const unregister = calculatorContext.registerChangeListener((values) => {
  console.log('Calculator changed:', values);
  // React to calculator change
});

// Later, cleanup:
return () => unregister();
```

---

### 2. SupportChat Component Enhancement (`/home/runner/workspace/client/src/components/SupportChat.tsx`)

**Added:**

#### A. `sendAutomatedMessage()` Function
- Sends system-triggered AI messages (not user-initiated)
- Includes all context: calculator data, history, activity, page visits
- Streams AI response using SSE (Server-Sent Events)
- Plays cyberpunk notification sound on completion
- Gracefully handles errors without showing to user
- Prevents interruption if already loading
- Only triggers if chat is active and has at least 1 message

**Safety Checks:**
```typescript
if (!isOpen || messages.length === 0) {
  console.log('[Chat] Skipping automated message - chat not active');
  return;
}

if (isLoading) {
  console.log('[Chat] Skipping automated message - already loading');
  return;
}
```

#### B. Calculator Change Listener (`useEffect` hook)
- Registers listener when component mounts
- Calculates derived values (annual shoots, hours, revenue)
- Constructs detailed system prompt for AI
- Triggers `sendAutomatedMessage()` with calculator context
- Unregisters listener on unmount (cleanup)

**System Prompt Format:**
```typescript
const systemPrompt = `[CALCULATOR UPDATE] User adjusted calculator values:
- ${annualShoots} shoots/year (${values.shootsPerWeek} per week)
- ${values.hoursPerShoot} hours per shoot
- $${values.billableRate}/hour billable rate
- ${annualHours.toFixed(0)} hours/year spent culling
- $${annualRevenue.toLocaleString()} annual revenue lost

Please acknowledge this change naturally in 1-2 sentences and relate it to our conversation.`;
```

---

## How It Works

### Flow Diagram
```
User adjusts calculator slider
    ↓
CalculatorContext setter called
    ↓
Value change detected (prev !== new)
    ↓
notifyListeners() triggered (async)
    ↓
SupportChat's handleCalculatorChange() callback invoked
    ↓
Check: isOpen && messages.length > 0 && !isLoading
    ↓
Calculate annual values
    ↓
Create system prompt with calculator context
    ↓
sendAutomatedMessage() called
    ↓
Add "Thinking..." placeholder message
    ↓
POST to /api/chat/message with system prompt
    ↓
Stream AI response via SSE
    ↓
Update message with AI acknowledgment
    ↓
Play notification sound
    ↓
User sees AI's contextual response
```

---

## Example Scenarios

### Scenario 1: User increases shoots per week
**User Action:** Adjusts slider from 2 → 5 shoots/week

**System Prompt Sent:**
```
[CALCULATOR UPDATE] User adjusted calculator values:
- 260 shoots/year (5 per week)
- 1.5 hours per shoot
- $35/hour billable rate
- 390 hours/year spent culling
- $13,650 annual revenue lost

Please acknowledge this change naturally in 1-2 sentences and relate it to our conversation.
```

**AI Response Example:**
> "Wow, 260 shoots per year - that's a serious workload! With Kull handling the culling, you'd reclaim 390 hours annually, which translates to $13,650 in lost revenue you could redirect to actual client work or creative projects."

---

### Scenario 2: User adjusts billable rate mid-conversation
**User Action:** Changes rate from $35 → $100/hour

**System Prompt Sent:**
```
[CALCULATOR UPDATE] User adjusted calculator values:
- 104 shoots/year (2 per week)
- 1.5 hours per shoot
- $100/hour billable rate
- 156 hours/year spent culling
- $15,600 annual revenue lost

Please acknowledge this change naturally in 1-2 sentences and relate it to our conversation.
```

**AI Response Example:**
> "At $100/hour, those 156 hours spent culling represent $15,600 in lost revenue - that's a compelling ROI case for automation. Kull would pay for itself in just a few weeks at your rate."

---

## Technical Implementation Details

### Observer Pattern
- **Publisher:** `CalculatorContext` (notifies when values change)
- **Subscribers:** Any component that calls `registerChangeListener()`
- **Current subscriber:** `SupportChat` component
- **Future extensibility:** Other components can subscribe to calculator changes

### Performance Considerations
1. **Debouncing:** Uses `setTimeout(..., 0)` to avoid blocking state updates
2. **Change Detection:** Only notifies when value actually changes (prevents duplicate triggers)
3. **Cleanup:** Listeners are automatically unregistered on unmount
4. **Error Handling:** Listener errors are caught and logged, preventing cascade failures

### Type Safety
- `CalculatorValues` interface ensures consistent data shape
- TypeScript enforces correct usage of `registerChangeListener`
- Callback return type enforces unregister function

---

## Testing Recommendations

### Manual Testing
1. Open chat and send at least 1 message
2. Adjust any calculator slider
3. Verify AI responds with acknowledgment
4. Verify notification sound plays
5. Verify response relates to conversation context

### Edge Cases to Test
- [ ] Adjust calculator BEFORE opening chat (should not trigger)
- [ ] Adjust calculator with 0 messages (should not trigger)
- [ ] Adjust calculator while AI is already responding (should skip)
- [ ] Rapidly adjust multiple sliders (should queue properly)
- [ ] Close and reopen chat (listener should re-register)

### Integration Testing
```typescript
// Test calculator change detection
test('calculator change triggers AI response', async () => {
  const { getByRole, getByText } = render(
    <CalculatorProvider>
      <SupportChat />
    </CalculatorProvider>
  );

  // Open chat and send message
  fireEvent.click(getByRole('button', { name: /chat/i }));
  fireEvent.change(getByRole('textbox'), { target: { value: 'Hello' } });
  fireEvent.click(getByRole('button', { name: /send/i }));

  // Wait for AI response
  await waitFor(() => getByText(/hello/i));

  // Adjust calculator
  const slider = getByRole('slider', { name: /shoots per week/i });
  fireEvent.change(slider, { target: { value: 5 } });

  // Verify AI acknowledges change
  await waitFor(() =>
    expect(getByText(/260 shoots/i)).toBeInTheDocument()
  );
});
```

---

## Future Enhancements

### Potential Improvements
1. **Debounce rapid changes:** Wait 2-3 seconds after last change before triggering
2. **Group multiple changes:** If user adjusts 3 sliders quickly, send 1 combined update
3. **Visual indicator:** Show subtle pulse/glow on chat icon when calculator changes
4. **Undo/redo:** Allow user to revert calculator changes within chat
5. **A/B testing:** Track conversion rates with/without automated acknowledgments

### Additional Use Cases
This pattern can be extended to trigger automated AI messages for:
- User clicks on pricing plans
- User visits specific pages (e.g., documentation)
- User hovers over features for extended time
- User encounters errors or confusion signals
- Session idle time thresholds

---

## File Locations

### Modified Files
- `/home/runner/workspace/client/src/contexts/CalculatorContext.tsx`
- `/home/runner/workspace/client/src/components/SupportChat.tsx`

### Lines Changed
- **CalculatorContext.tsx:** Complete refactor (115 lines)
- **SupportChat.tsx:** Added ~190 lines (sendAutomatedMessage + useEffect listener)

---

## Verification Checklist

- [x] CalculatorContext exposes `registerChangeListener()` method
- [x] SupportChat registers calculator change listener
- [x] Listener only triggers when chat is active (isOpen && messages.length > 0)
- [x] Listener skips if AI is already responding (isLoading check)
- [x] System prompt includes all calculator values
- [x] System prompt includes derived annual values
- [x] sendAutomatedMessage() streams response via SSE
- [x] Notification sound plays on completion
- [x] Listener unregisters on component unmount
- [x] TypeScript types are correct
- [x] No type errors introduced
- [x] Error handling prevents crashes
- [x] Console logging for debugging

---

## Summary

This implementation creates a reactive, context-aware chat experience where the AI automatically acknowledges when users adjust calculator values. The solution uses an observer pattern to decouple the calculator from the chat, making it extensible for future features. The automated messages feel natural and help maintain conversation flow while demonstrating that the AI is aware of user actions across the entire application.

**Key Benefits:**
- Enhanced conversational UX
- Real-time context awareness
- Increased user engagement
- Demonstrates AI intelligence
- Minimal performance overhead
- Clean, maintainable architecture
