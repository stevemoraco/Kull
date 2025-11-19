# Conversation Progress Integration - Code Snippets

## Complete Integration Summary

All changes made to `/home/runner/workspace/client/src/components/SupportChat.tsx`

---

## 1. Import Statement (Line 19)

```typescript
import { ConversationProgress } from '@/components/ConversationProgress';
```

---

## 2. Type Definitions (Lines 95-109)

```typescript
interface ConversationState {
  questionsAsked: Array<{ step: number; question: string }>;
  questionsAnswered: Array<{ step: number; question: string; answer: string }>;
  currentStep: number;
  totalSteps: number;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  conversationState?: ConversationState;  // NEW - optional to support old sessions
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 3. Parse Function (Lines 359-396)

```typescript
// Helper to parse conversation state from messages
function parseConversationState(messages: Message[], currentState?: ConversationState): ConversationState {
  const questionsAsked: Array<{ step: number; question: string }> = [];
  const questionsAnswered: Array<{ step: number; question: string; answer: string }> = [];

  // Simple heuristic: AI messages ending with "?" are questions
  // User messages following questions are answers
  let stepCounter = 1;
  let lastQuestion: { step: number; question: string } | null = null;

  messages.forEach((message, index) => {
    if (message.role === 'assistant') {
      // Look for questions (messages ending with ?)
      const questionMatch = message.content.match(/([^.!?]*\?)/g);
      if (questionMatch && questionMatch.length > 0) {
        // Take the last question in the message
        const question = questionMatch[questionMatch.length - 1].trim();
        lastQuestion = { step: stepCounter, question };
        questionsAsked.push(lastQuestion);
        stepCounter++;
      }
    } else if (message.role === 'user' && lastQuestion) {
      // This is an answer to the last question
      questionsAnswered.push({
        ...lastQuestion,
        answer: message.content,
      });
      lastQuestion = null;
    }
  });

  return {
    questionsAsked,
    questionsAnswered,
    currentStep: questionsAnswered.length + 1,
    totalSteps: currentState?.totalSteps || 15,
  };
}
```

---

## 4. Initial Session Creation (Lines 373-390)

```typescript
// Load all chat sessions
const [sessions, setSessions] = useState<ChatSession[]>(() => {
  const loadedSessions = loadSessions();
  console.log(`[Chat] Initial load: ${loadedSessions.length} sessions from localStorage`);
  if (loadedSessions.length === 0) {
    // Create initial persistent session with empty messages - greetings will be added via popover
    const initialSession: ChatSession = {
      id: 'main-session-persistent',
      title: 'Chat with Kull',
      messages: [],
      conversationState: {                    // NEW
        questionsAsked: [],
        questionsAnswered: [],
        currentStep: 1,
        totalSteps: 15,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    saveSessions([initialSession]);
    return [initialSession];
  }
  return loadedSessions;
});
```

---

## 5. Get Current Conversation State (Lines 462-470)

```typescript
// Get current session
const currentSession = sessions.find(s => s.id === currentSessionId);
const messages = currentSession?.messages || [];
const conversationState = currentSession?.conversationState || {
  questionsAsked: [],
  questionsAnswered: [],
  currentStep: 1,
  totalSteps: 15,
};
```

---

## 6. Update setMessages Function (Lines 472-506)

```typescript
const setMessages = (newMessages: Message[] | ((prev: Message[]) => Message[])) => {
  setSessions(prevSessions => {
    const updatedSessions = prevSessions.map(session => {
      if (session.id === currentSessionId) {
        const updatedMessages = typeof newMessages === 'function'
          ? newMessages(session.messages)
          : newMessages;

        // Parse conversation state from messages (NEW)
        const newConversationState = parseConversationState(
          updatedMessages,
          session.conversationState
        );

        // ALWAYS generate title from most recent message (user or AI)
        let title = session.title;
        if (updatedMessages.length > 0) {
          const recentMessages = [...updatedMessages].reverse();
          const lastMessage = recentMessages.find(m => m.role === 'user' || m.role === 'assistant');
          if (lastMessage) {
            let content = lastMessage.content;
            content = content.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
            content = content.replace(/[*_~`#]/g, '');
            title = content.slice(0, 50).trim() + (content.length > 50 ? '...' : '');
          }
        }

        return {
          ...session,
          messages: updatedMessages,
          conversationState: newConversationState,  // NEW
          title,
          updatedAt: new Date(),
        };
      }
      return session;
    });
    saveSessions(updatedSessions);
    saveSessionsToDatabase(updatedSessions);
    return updatedSessions;
  });
};
```

---

## 7. Send to Backend (Line 1594-1610)

```typescript
// DEEP RESEARCH LOGGING: Verify what we're sending
const payload = {
  message: messageText.trim(),
  history: freshHistory,
  userActivity: JSON.parse(sessionStorage.getItem('kull-user-activity') || '[]'),
  pageVisits: JSON.parse(sessionStorage.getItem('kull-page-visits') || '[]'),
  allSessions: sessions,
  sessionId: currentSessionId,
  sessionStartTime,
  conversationState: conversationState,  // NEW - sent to backend
  calculatorData: {
    shootsPerWeek: calculatorContext.shootsPerWeek,
    hoursPerShoot: calculatorContext.hoursPerShoot,
    billableRate: calculatorContext.billableRate,
    hasManuallyAdjusted: calculatorContext.hasManuallyAdjusted,
    hasClickedPreset: calculatorContext.hasClickedPreset,
  },
};

const response = await fetch('/api/chat/message', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    credentials: 'include',
  },
  body: JSON.stringify(payload),
  signal: controller.signal,
});
```

---

## 8. Render in UI (Lines 2281-2293)

```typescript
{/* Messages */}
<div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background">
  {/* Conversation Progress - shown when there's activity (NEW) */}
  {(conversationState.questionsAsked.length > 0 ||
    conversationState.questionsAnswered.length > 0) && (
    <ConversationProgress
      questionsAsked={conversationState.questionsAsked}
      questionsAnswered={conversationState.questionsAnswered}
      currentStep={conversationState.currentStep}
      totalSteps={conversationState.totalSteps}
    />
  )}

  {/* Chat messages */}
  {messages
    .filter(m => !m.content.includes('[Continue conversation naturally based on context]'))
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .map((message) => (
      // ... existing message rendering
    ))}
</div>
```

---

## 9. New Session Handler (Lines 1942-1955)

```typescript
const handleNewSession = () => {
  const newSession: ChatSession = {
    id: Date.now().toString(),
    title: 'New Chat',
    messages: [],
    conversationState: {                      // NEW
      questionsAsked: [],
      questionsAnswered: [],
      currentStep: 1,
      totalSteps: 15,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  setSessions(prev => {
    const updated = [newSession, ...prev];
    saveSessions(updated);
    saveSessionsToDatabase(updated);
    return updated;
  });

  setCurrentSessionId(newSession.id);
  localStorage.setItem('kull-current-session-id', newSession.id);

  // Reset session timer
  const now = Date.now();
  setSessionStartTime(now);
  localStorage.setItem('kull-session-start-time', now.toString());
};
```

---

## Backend Integration Example

The backend can now receive and use the conversation state:

```typescript
// server/routes/chat.ts
import type { ConversationState } from '../../client/src/components/SupportChat';

interface ChatMessageRequest {
  message: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  conversationState: ConversationState;  // NEW
  calculatorData: {
    shootsPerWeek: number;
    hoursPerShoot: number;
    billableRate: number;
    hasManuallyAdjusted: boolean;
    hasClickedPreset: boolean;
  };
  // ... other fields
}

app.post('/api/chat/message', async (req, res) => {
  const {
    message,
    history,
    conversationState,  // NEW - available here
    calculatorData
  } = req.body as ChatMessageRequest;

  // Use conversation state to tailor AI response
  const systemPrompt = `
You are Kull AI support agent.

Current conversation progress:
- Step: ${conversationState.currentStep} of ${conversationState.totalSteps}
- Questions asked: ${conversationState.questionsAsked.length}
- Questions answered: ${conversationState.questionsAnswered.length}

Already answered:
${conversationState.questionsAnswered.map(qa =>
  `- ${qa.question}\n  Answer: ${qa.answer}`
).join('\n')}

Guidelines:
- Don't re-ask questions already answered
- Tailor your response to their progress
- If near completion (step > 12), start providing specific recommendations
  `;

  // Generate AI response with full context
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    messages: [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: message }
    ],
    stream: true,
  });

  // Stream response...
});
```

---

## LocalStorage Structure

```typescript
// localStorage.getItem('kull-chat-sessions')
[
  {
    "id": "main-session-persistent",
    "title": "Chat about pricing",
    "messages": [
      {
        "id": "1234567890",
        "role": "assistant",
        "content": "What type of photography do you do?",
        "timestamp": "2025-11-19T10:30:00.000Z"
      },
      {
        "id": "1234567891",
        "role": "user",
        "content": "Wedding photography",
        "timestamp": "2025-11-19T10:30:15.000Z"
      }
    ],
    "conversationState": {
      "questionsAsked": [
        {
          "step": 1,
          "question": "What type of photography do you do?"
        }
      ],
      "questionsAnswered": [
        {
          "step": 1,
          "question": "What type of photography do you do?",
          "answer": "Wedding photography"
        }
      ],
      "currentStep": 2,
      "totalSteps": 15
    },
    "createdAt": "2025-11-19T10:29:00.000Z",
    "updatedAt": "2025-11-19T10:30:15.000Z"
  }
]
```

---

## State Update Flow Diagram

```
┌─────────────────┐
│ User sends msg  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│ setMessages() called    │
└────────┬────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│ parseConversationState() runs    │
│ - Scans all messages             │
│ - Finds questions (ends with ?)  │
│ - Matches answers                │
│ - Returns new state              │
└────────┬─────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│ Update session object            │
│ {                                │
│   ...session,                    │
│   messages: updatedMessages,     │
│   conversationState: newState ←─┐│
│ }                                ││
└────────┬─────────────────────────┘│
         │                          │
         ▼                          │
┌──────────────────────┐            │
│ saveSessions()       │            │
│ - To localStorage    │            │
│ - To database        │            │
└────────┬─────────────┘            │
         │                          │
         ▼                          │
┌──────────────────────────┐        │
│ Component re-renders     │        │
│ ConversationProgress     │◄───────┘
│ receives new props       │
└──────────────────────────┘
```

---

## Regex Explanation

Question detection regex:
```typescript
const questionMatch = message.content.match(/([^.!?]*\?)/g);
```

- `[^.!?]*` - Match any characters EXCEPT period, exclamation, or question mark
- `\?` - Then match a literal question mark
- `g` - Global flag (find all matches)

Examples:
- ✅ "What brings you here today?" → ["What brings you here today?"]
- ✅ "Do you shoot weddings? How many per week?" → ["Do you shoot weddings?", "How many per week?"]
- ❌ "That sounds great!" → null (no question mark)
- ❌ "I understand." → null (no question mark)

We take the LAST question in multi-question messages:
```typescript
const question = questionMatch[questionMatch.length - 1].trim();
```

---

## Complete Type Safety

All types are properly defined and checked:

```typescript
// No TypeScript errors
npm run check
✅ tsc passes successfully

// Component props match interface
<ConversationProgress
  questionsAsked={conversationState.questionsAsked}          // Array<{ step, question }>
  questionsAnswered={conversationState.questionsAnswered}    // Array<{ step, question, answer }>
  currentStep={conversationState.currentStep}                // number
  totalSteps={conversationState.totalSteps}                  // number
/>

// Optional chaining for safety
const conversationState = currentSession?.conversationState || defaultState;
```

---

## Summary

The integration is complete and includes:

1. ✅ **Type definitions** - Full TypeScript support
2. ✅ **Parse function** - Automatic question/answer detection
3. ✅ **State management** - Tracked in React state and sessions
4. ✅ **Persistence** - Saved to localStorage automatically
5. ✅ **Backend integration** - Sent with every message
6. ✅ **UI rendering** - Positioned above messages, conditional display
7. ✅ **Session isolation** - Each chat has independent progress
8. ✅ **New session support** - Fresh state on new chat
9. ✅ **Zero errors** - Build passes, no TypeScript issues

All code is production-ready and follows existing SupportChat patterns.
