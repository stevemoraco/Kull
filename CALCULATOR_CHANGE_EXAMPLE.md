# Calculator Change Detection - Code Examples

## Quick Reference Guide

### 1. CalculatorContext - Observer Pattern

```typescript
// FILE: /home/runner/workspace/client/src/contexts/CalculatorContext.tsx

// New interface for calculator values
interface CalculatorValues {
  shootsPerWeek: number;
  hoursPerShoot: number;
  billableRate: number;
}

// Added to context interface
interface CalculatorContextType {
  // ... existing properties ...
  registerChangeListener: (listener: (values: CalculatorValues) => void) => () => void;
}

// Implementation
export function CalculatorProvider({ children }: { children: ReactNode }) {
  // State
  const [shootsPerWeek, setShootsPerWeekState] = useState(2);
  const [hoursPerShoot, setHoursPerShootState] = useState(1.5);
  const [billableRate, setBillableRateState] = useState(35);

  // Listener storage
  const listenersRef = useRef<Set<(values: CalculatorValues) => void>>(new Set());

  // Notify all listeners
  const notifyListeners = useCallback((values: CalculatorValues) => {
    listenersRef.current.forEach(listener => {
      try {
        listener(values);
      } catch (error) {
        console.error('[Calculator] Error in change listener:', error);
      }
    });
  }, []);

  // Wrapped setters that detect changes
  const setShootsPerWeek = useCallback((value: number) => {
    setShootsPerWeekState(prev => {
      if (prev !== value) {
        const newValues = { shootsPerWeek: value, hoursPerShoot, billableRate };
        setTimeout(() => notifyListeners(newValues), 0);
      }
      return value;
    });
  }, [hoursPerShoot, billableRate, notifyListeners]);

  // Register/unregister listeners
  const registerChangeListener = useCallback((listener: (values: CalculatorValues) => void) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  return (
    <CalculatorContext.Provider
      value={{
        shootsPerWeek,
        hoursPerShoot,
        billableRate,
        setShootsPerWeek,
        setHoursPerShoot,
        setBillableRate,
        registerChangeListener, // ← NEW: Exposed to consumers
      }}
    >
      {children}
    </CalculatorContext.Provider>
  );
}
```

---

### 2. SupportChat - Automated Message Trigger

```typescript
// FILE: /home/runner/workspace/client/src/components/SupportChat.tsx

export function SupportChat() {
  const calculatorContext = useCalculator();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Automated message sender (system-triggered, not user-triggered)
  const sendAutomatedMessage = useCallback(async (systemPrompt: string) => {
    // Safety checks
    if (!isOpen || messages.length === 0) {
      console.log('[Chat] Skipping automated message - chat not active');
      return;
    }

    if (isLoading) {
      console.log('[Chat] Skipping automated message - already loading');
      return;
    }

    console.log('[Chat] Sending automated message:', systemPrompt);

    // Create "Thinking..." placeholder
    const assistantMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: '__THINKING__',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, assistantMessage]);
    setIsLoading(true);

    try {
      // Prepare payload with full context
      const payload = {
        message: systemPrompt, // ← System message, not user message
        history: messages,
        calculatorData: {
          shootsPerWeek: calculatorContext.shootsPerWeek,
          hoursPerShoot: calculatorContext.hoursPerShoot,
          billableRate: calculatorContext.billableRate,
        },
        // ... other context ...
      };

      // POST to AI endpoint
      const response = await fetch('/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      // Stream response via SSE
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              const parsed = JSON.parse(data);
              if (parsed.content) {
                fullContent += parsed.content;
                // Update message in real-time
                setMessages(prev => {
                  const updated = [...prev];
                  const lastMsg = updated[updated.length - 1];
                  if (lastMsg && lastMsg.role === 'assistant') {
                    lastMsg.content = fullContent;
                  }
                  return updated;
                });
              }
            }
          }
        }
      }

      // Play notification sound
      playCyberpunkDing();
    } catch (error) {
      console.error('[Chat] Error in sendAutomatedMessage:', error);
      setMessages(prev => prev.filter(msg => msg.id !== assistantMessage.id));
    } finally {
      setIsLoading(false);
    }
  }, [isOpen, messages, isLoading, calculatorContext]);

  // ========================================
  // CALCULATOR CHANGE LISTENER
  // ========================================
  useEffect(() => {
    const handleCalculatorChange = (values: {
      shootsPerWeek: number;
      hoursPerShoot: number;
      billableRate: number;
    }) => {
      console.log('[Chat] Calculator values changed:', values);

      // Only trigger if chat is active
      if (messages.length > 0 && isOpen) {
        // Calculate derived values
        const annualShoots = values.shootsPerWeek * 52;
        const annualHours = annualShoots * values.hoursPerShoot;
        const annualRevenue = annualHours * values.billableRate;

        // Create system prompt
        const systemPrompt = `[CALCULATOR UPDATE] User adjusted calculator values:
- ${annualShoots} shoots/year (${values.shootsPerWeek} per week)
- ${values.hoursPerShoot} hours per shoot
- $${values.billableRate}/hour billable rate
- ${annualHours.toFixed(0)} hours/year spent culling
- $${annualRevenue.toLocaleString()} annual revenue lost

Please acknowledge this change naturally in 1-2 sentences and relate it to our conversation.`;

        // Trigger automated AI response
        sendAutomatedMessage(systemPrompt);
      }
    };

    // Register listener (returns cleanup function)
    const unregister = calculatorContext.registerChangeListener(handleCalculatorChange);

    // Cleanup on unmount
    return () => {
      unregister();
    };
  }, [calculatorContext, messages.length, isOpen, sendAutomatedMessage]);

  // ... rest of component ...
}
```

---

## Usage Flow

### When User Adjusts Calculator

```
┌─────────────────────────────────────────────────────────────┐
│ User drags slider: Shoots per week (2 → 5)                 │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ CalculatorContext.setShootsPerWeek(5)                      │
│   - Detects change: prev (2) !== new (5)                   │
│   - Calls notifyListeners({ shootsPerWeek: 5, ... })      │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ SupportChat.handleCalculatorChange(values)                 │
│   - Checks: isOpen && messages.length > 0 && !isLoading   │
│   - Calculates: annualShoots = 5 * 52 = 260               │
│   - Creates system prompt with context                      │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ sendAutomatedMessage(systemPrompt)                         │
│   - Adds "Thinking..." placeholder message                 │
│   - POSTs to /api/chat/message with:                       │
│     • System prompt: "[CALCULATOR UPDATE] ..."            │
│     • Full context: history, calculator data, activity     │
│   - Streams AI response via SSE                            │
│   - Updates message in real-time                            │
│   - Plays notification sound                                │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ AI responds naturally:                                      │
│ "At 260 shoots per year, you'd save 390 hours annually.   │
│  That's $13,650 in lost revenue you could redirect!"       │
└─────────────────────────────────────────────────────────────┘
```

---

## Example System Prompts

### Example 1: Shoots per week changed
```
[CALCULATOR UPDATE] User adjusted calculator values:
- 156 shoots/year (3 per week)
- 1.5 hours per shoot
- $35/hour billable rate
- 234 hours/year spent culling
- $8,190 annual revenue lost

Please acknowledge this change naturally in 1-2 sentences and relate it to our conversation.
```

**Possible AI Response:**
> "I see you've adjusted to 3 shoots per week - that's 156 annual shoots consuming 234 hours of your time. At $35/hour, that's $8,190 in opportunity cost that Kull could help you reclaim."

---

### Example 2: Billable rate changed
```
[CALCULATOR UPDATE] User adjusted calculator values:
- 104 shoots/year (2 per week)
- 1.5 hours per shoot
- $150/hour billable rate
- 156 hours/year spent culling
- $23,400 annual revenue lost

Please acknowledge this change naturally in 1-2 sentences and relate it to our conversation.
```

**Possible AI Response:**
> "Wow, at $150/hour, those 156 hours spent culling represent $23,400 annually - that's a compelling ROI for automation. Kull would basically pay for itself in the first month."

---

## Testing the Implementation

### Manual Test Steps

1. **Open the application**
   ```bash
   npm run dev
   ```

2. **Open the chat widget**
   - Click the chat icon in the bottom right
   - Send at least 1 message (e.g., "Hello")

3. **Adjust any calculator slider**
   - Shoots per week
   - Hours per shoot
   - Billable rate

4. **Observe the result**
   - "Thinking..." message appears
   - AI responds acknowledging the change
   - Notification sound plays
   - Response relates to conversation context

### Console Logging

You'll see these logs:
```
[Chat] Calculator values changed: { shootsPerWeek: 5, hoursPerShoot: 1.5, billableRate: 35 }
[Chat] Sending automated message: [CALCULATOR UPDATE] User adjusted...
[Chat] Automated message payload prepared
[Chat] Automated message completed: At 260 shoots per year...
```

---

## Key Benefits

1. **Context Awareness**: AI knows when user adjusts calculator
2. **Natural Conversation**: Responses feel organic, not robotic
3. **User Engagement**: Interactive elements drive conversation
4. **Real-time Feedback**: Instant acknowledgment of changes
5. **Extensible Pattern**: Can be reused for other event triggers

---

## Technical Notes

### Why `setTimeout(..., 0)`?
Ensures listeners are notified AFTER React's state update completes, preventing stale closure issues.

### Why check `messages.length > 0`?
Prevents automated messages before user has interacted. First interaction shows user is engaged.

### Why check `isLoading`?
Prevents interrupting an ongoing AI response, which would create a confusing UX.

### Why separate `sendAutomatedMessage` from `sendMessage`?
Different UX concerns:
- `sendMessage`: User-triggered, adds user message to history
- `sendAutomatedMessage`: System-triggered, no user message added

### Why the `[CALCULATOR UPDATE]` prefix?
Helps AI understand this is a system event, not user input. AI can respond contextually.

---

## Files Modified

- `/home/runner/workspace/client/src/contexts/CalculatorContext.tsx` (115 lines)
- `/home/runner/workspace/client/src/components/SupportChat.tsx` (+190 lines)

---

## Conclusion

This implementation creates a reactive, intelligent chat experience where the AI automatically responds to calculator adjustments. The observer pattern keeps the code decoupled and extensible, making it easy to add similar triggers for other user interactions in the future.
