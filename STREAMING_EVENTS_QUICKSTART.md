# Streaming Events Display - Quick Start Guide

**Get ALL Responses API events displaying beautifully in 5 minutes!**

## Step 1: Install Dependencies (30 seconds)

```bash
npm install framer-motion
```

## Step 2: Copy the Component (1 minute)

The component is already created at:
```
/home/runner/workspace/client/src/components/StreamingEventDisplay.tsx
```

No need to create it - it's ready to use!

## Step 3: Import in SupportChat.tsx (30 seconds)

Add these imports at the top of `/home/runner/workspace/client/src/components/SupportChat.tsx`:

```tsx
import {
  StreamingEventDisplay,
  useStreamingState,
  type StreamingEvent
} from './StreamingEventDisplay';
```

## Step 4: Add the Hook (15 seconds)

Inside your SupportChat component, add:

```tsx
const { state: streamingState, handleEvent } = useStreamingState();
```

## Step 5: Pass Events to the Hook (1 minute)

Find where you parse SSE events (around line 1994). Add ONE LINE:

```tsx
for (const line of lines) {
  if (line.startsWith('data: ')) {
    try {
      const data = JSON.parse(line.slice(6));

      // ADD THIS LINE:
      handleEvent(data as StreamingEvent);

      // Your existing handlers continue below...
      if (data.type === 'status' && data.message) {
        // ... existing code
      }
    } catch (e) {
      console.error('[SSE] Parse error:', e);
    }
  }
}
```

## Step 6: Render the Component (30 seconds)

Find where you render assistant messages (around line 2400). Add the component:

```tsx
{msg.role === 'assistant' && (
  <div className="message-content">
    {/* ADD THIS: */}
    <StreamingEventDisplay state={streamingState} />

    {/* Your existing content: */}
    <ReactMarkdown>{msg.content}</ReactMarkdown>
  </div>
)}
```

## Step 7: Test It! (1 minute)

1. Start your dev server: `npm run dev`
2. Open the chat
3. Send a message
4. Watch for streaming events!

Currently, you'll see:
- ✅ Text streaming (already working)
- ✅ Reasoning summaries (if enabled)
- ⏳ Web search (when implemented)
- ⏳ Function calls (when implemented)
- ⏳ Code interpreter (when implemented)
- ⏳ Image generation (when implemented)

## What You Get Immediately

Even without server changes, the component will:

1. **Display text streaming** - Your existing delta events work automatically
2. **Show reasoning** - If reasoning events are sent, they'll appear
3. **Handle all event types** - When you add more events, they'll "just work"
4. **Look beautiful** - Professional animations and design

## Next Steps (Optional)

### To Enable More Event Types:

Update your server to pass through more events. See:
- `/home/runner/workspace/STREAMING_EVENT_DISPLAY_INTEGRATION.md` (detailed guide)
- `/home/runner/workspace/server/chatService.ts` lines 1331-1410 (where to add handlers)

### To Customize Appearance:

```tsx
<StreamingEventDisplay
  state={streamingState}
  className="my-custom-class"
/>
```

Then add CSS:

```css
.my-custom-class .reasoning-display {
  border-color: #your-color;
}
```

### To Control Reasoning Expansion:

```tsx
const [reasoningExpanded, setReasoningExpanded] = useState(false);

<StreamingEventDisplay
  state={streamingState}
  reasoningExpanded={reasoningExpanded}
  onReasoningToggle={() => setReasoningExpanded(!reasoningExpanded)}
/>
```

## Troubleshooting

### "Cannot find module './StreamingEventDisplay'"

Make sure the file exists at:
```
/home/runner/workspace/client/src/components/StreamingEventDisplay.tsx
```

### "framer-motion not found"

Run: `npm install framer-motion`

### "Events not showing up"

1. Check console for SSE events: `console.log('[SSE]', data)`
2. Verify `handleEvent(data)` is being called
3. Check data.type matches expected event types

### "Animations not working"

1. Ensure framer-motion is installed
2. Check for CSS conflicts
3. Try clearing browser cache

## Testing Without Real Events

Want to see what each event looks like? Use the test component:

```tsx
import { TestStreamingEvents } from './STREAMING_EVENTS_INTEGRATION_EXAMPLE';

// In your app:
<TestStreamingEvents />
```

Click the buttons to see:
- Reasoning animation
- Web search indicator
- Function call display
- Code execution
- Image generation
- All events at once!

## Example Event Types

Here's what each event looks like when it arrives:

```javascript
// Text streaming (already working)
{ type: 'delta', content: 'Hello' }

// Reasoning
{ type: 'reasoning_delta', content: 'Let me think...', item_id: '123' }
{ type: 'reasoning_done', text: 'Full reasoning summary', item_id: '123' }

// Web search
{ type: 'web_search_in_progress', item_id: '456' }
{ type: 'web_search_searching', item_id: '456' }
{ type: 'web_search_completed', item_id: '456' }

// Function calls
{ type: 'function_call_done', name: 'getUser', arguments: '{"id":"123"}', item_id: '789' }

// Code interpreter
{ type: 'code_interpreter_code_done', code: 'print("hello")', item_id: '012' }

// Image generation
{ type: 'image_gen_partial_image', image_data: 'base64...', item_id: '345', partial_index: 0 }
```

## Performance Tips

The component is optimized, but for best performance:

1. **Debounce rapid events**: If you get 100+ deltas per second, consider batching
2. **Clean up old state**: Reset state when starting a new message
3. **Use React.memo**: For large chat histories, memoize message components

Example cleanup:

```tsx
const sendMessage = async (text: string) => {
  // Reset streaming state for new message
  setState({
    isReasoningVisible: false,
    reasoningText: '',
    webSearchActive: false,
    fileSearchActive: false,
    functionCalls: new Map(),
    codeInterpreter: new Map(),
    images: new Map(),
  });

  // ... rest of your code
};
```

## Advanced Usage

### Multiple Streaming States

Track separate state for each message:

```tsx
const [messageStates, setMessageStates] = useState<Map<string, StreamingState>>(new Map());

// When handling events, use message-specific state
const currentState = messageStates.get(currentMessageId);
```

### Custom Event Types

Add your own event types:

```tsx
// In StreamingEventDisplay.tsx, add to union:
export type StreamingEvent =
  | TextDeltaEvent
  | ReasoningDeltaEvent
  // ... existing types
  | CustomEvent;  // Your new type

export interface CustomEvent {
  type: 'custom_event';
  data: any;
}

// Add handler in useStreamingState:
if (event.type === 'custom_event') {
  // Handle your custom event
}
```

### Analytics Integration

Track user interactions:

```tsx
const handleReasoningToggle = () => {
  analytics.track('reasoning_expanded', {
    messageId: currentMessageId,
    reasoningLength: state.reasoningText.length
  });
  // ... toggle logic
};
```

## Resources

- **Full Documentation**: `/home/runner/workspace/STREAMING_EVENT_DISPLAY_INTEGRATION.md`
- **Visual Examples**: `/home/runner/workspace/STREAMING_EVENTS_VISUAL_EXAMPLES.md`
- **Code Example**: `/home/runner/workspace/STREAMING_EVENTS_INTEGRATION_EXAMPLE.tsx`
- **Component Source**: `/home/runner/workspace/client/src/components/StreamingEventDisplay.tsx`
- **OpenAI Responses API**: https://platform.openai.com/docs/guides/responses

## Summary

You now have a production-ready system for displaying ALL Responses API streaming events!

**What works immediately:**
- ✅ Text streaming
- ✅ Beautiful animations
- ✅ Interactive components
- ✅ Type-safe code

**What you can enable:**
- 🔄 Reasoning summaries
- 🔄 Web search indicators
- 🔄 Function call displays
- 🔄 Code execution views
- 🔄 Image generation progress
- 🔄 40+ other event types

**Time to integrate:** ~5 minutes

**Lines of code to add:** ~10

**Complexity:** Low - it just works!

Enjoy building beautiful AI experiences! 🚀
