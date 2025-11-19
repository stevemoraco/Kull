# Conversation Progress UI - Visual Integration Guide

## UI Layout

```
┌─────────────────────────────────────────────────────┐
│  Kull Support                               [□] [X] │ ← Header
│  Has access to entire github repo...               │
│  ┌───────────┬────────┬─────────────┬────────────┐ │
│  │ History   │ New    │ Pause/Play  │ Close      │ │
│  └───────────┴────────┴─────────────┴────────────┘ │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │ Conversation Progress            ▼            │ │ ← ConversationProgress
│  │ [60%] 3 of 5 questions answered               │ │   Component
│  │                                               │ │   (NEW!)
│  │ ✓ What type of photography do you do?        │ │
│  │   → Wedding photography                       │ │
│  │                                               │ │
│  │ ✓ How many shoots per week?                  │ │
│  │   → About 2-3                                 │ │
│  │                                               │ │
│  │ ✓ What's your hourly rate?                   │ │
│  │   → $150/hour                                 │ │
│  │                                               │ │
│  │ ● What's your biggest pain point?  ← YOU ARE HERE │
│  │                                               │ │
│  │ ○ 2 more questions...                    ▼   │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │ 👤 User: Hi, I need help with pricing       │   │ ← Chat Messages
│  └─────────────────────────────────────────────┘   │   (Existing)
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │ 🤖 AI: I'd be happy to help! What type of   │   │
│  │    photography do you specialize in?        │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │ 👤 User: Wedding photography                │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
├─────────────────────────────────────────────────────┤
│  Quick Replies (4)                             ▼   │
│  ┌──────────────┐ ┌──────────────┐                 │
│  │ How to...    │ │ Pricing      │ ...             │
│  └──────────────┘ └──────────────┘                 │
├─────────────────────────────────────────────────────┤
│  [Type your message...]                      [📤]  │
└─────────────────────────────────────────────────────┘
```

## Component States

### 1. Collapsed State (Default on mobile)
```
┌───────────────────────────────────────────┐
│ [60%] Conversation Progress        ▼     │
│       3 of 5 questions answered           │
└───────────────────────────────────────────┘
```

### 2. Expanded State
```
┌───────────────────────────────────────────┐
│ [60%] Conversation Progress        ▲     │
│       3 of 5 questions answered           │
│                                           │
│ Answered Questions:                       │
│ ┌───────────────────────────────────────┐ │
│ │ ✓ What type of photography?          │ │ ← Green checkmark
│ │   → Wedding photography               │ │   Slide-in animation
│ └───────────────────────────────────────┘ │
│                                           │
│ ┌───────────────────────────────────────┐ │
│ │ ✓ How many shoots per week?           │ │
│ │   → About 2-3                         │ │
│ └───────────────────────────────────────┘ │
│                                           │
│ Current Question:                         │
│ ┌───────────────────────────────────────┐ │
│ │ ● What's your biggest pain point?     │ │ ← Blue highlight
│ │   YOU ARE HERE ───────                │ │   Pulse animation
│ └───────────────────────────────────────┘ │
│                                           │
│ ┌───────────────────────────────────────┐ │
│ │ ○ 2 more questions...             ▼  │ │ ← Clickable to expand
│ └───────────────────────────────────────┘ │
└───────────────────────────────────────────┘
```

### 3. With Upcoming Questions Expanded
```
┌───────────────────────────────────────────┐
│ ○ 2 more questions...             ▲      │
│                                           │
│ ┌───────────────────────────────────────┐ │
│ │ 5  What features matter most?         │ │ ← Gray, semi-transparent
│ └───────────────────────────────────────┘ │
│                                           │
│ ┌───────────────────────────────────────┐ │
│ │ 6  When do you need to start?         │ │
│ └───────────────────────────────────────┘ │
└───────────────────────────────────────────┘
```

### 4. Empty State (No questions yet)
```
Component is hidden when:
- questionsAsked.length === 0
- questionsAnswered.length === 0
```

## Animation Flow

### When AI Asks Question
```
1. AI message: "What type of photography do you specialize in?"
2. parseConversationState() detects question (ends with "?")
3. Question added to questionsAsked array
4. Component updates: Shows in "Current Question" section
5. Blue pulse animation on current question box
```

### When User Answers
```
1. User message: "Wedding photography"
2. parseConversationState() matches with previous question
3. Question moved from questionsAsked to questionsAnswered
4. currentStep increments (3 → 4)
5. Smooth slide animation as question moves up to "Answered" section
6. Green checkmark fade-in
7. Answer text slides in with border-left animation
8. Progress circle animates to new percentage (40% → 60%)
```

## Color Scheme

Follows existing Kull teal theme:

- **Answered questions**: Green (`text-green-500`, `border-green-200`)
- **Current question**: Blue (`text-blue-500`, `border-blue-400`, pulse animation)
- **Upcoming questions**: Gray (`text-gray-400`, `border-gray-200`, 60% opacity)
- **Background**: Gradient gray (`from-gray-50 to-gray-100`)
- **Progress circle**: Green for filled portion, gray for empty

## Responsive Behavior

### Mobile (< 768px)
- Component starts collapsed to save space
- Touch-friendly expand/collapse button
- Full-width layout
- Smaller font sizes (text-xs, text-sm)

### Desktop (≥ 768px)
- Component starts expanded
- Hover effects on questions
- Larger circular progress indicator
- Additional spacing and padding

## Integration Points

### 1. Data Flow: Messages → State
```
User types message
    ↓
setMessages() called
    ↓
parseConversationState() runs
    ↓
Scans all messages for questions/answers
    ↓
Returns new ConversationState
    ↓
State saved to session.conversationState
    ↓
ConversationProgress component re-renders
```

### 2. Data Flow: State → Backend
```
User sends message
    ↓
sendMessage() creates payload
    ↓
Includes conversationState object
    ↓
POST /api/chat/message
    ↓
Backend receives full conversation context
```

### 3. Data Flow: LocalStorage Persistence
```
Session updated
    ↓
saveSessions() called
    ↓
JSON.stringify(sessions) including conversationState
    ↓
localStorage.setItem('kull-chat-sessions', ...)
    ↓
Page refresh
    ↓
loadSessions() restores full state
```

## Example Conversation Flow

```
Step 1:
AI: "Hi! What brings you to Kull today?"
    → questionsAsked: [{ step: 1, question: "What brings you to Kull today?" }]
    → currentStep: 1

User: "I need help pricing my service"
    → questionsAnswered: [{ step: 1, question: "...", answer: "I need help pricing my service" }]
    → currentStep: 2
    → Progress: 6% (1/15)

Step 2:
AI: "Great! What type of photography do you specialize in?"
    → questionsAsked: [{ step: 2, question: "What type of photography..." }]
    → currentStep: 2

User: "Wedding photography"
    → questionsAnswered: [{ step: 2, question: "...", answer: "Wedding photography" }]
    → currentStep: 3
    → Progress: 13% (2/15)

Step 3:
AI: "How many wedding shoots do you typically do per week?"
    → questionsAsked: [{ step: 3, question: "How many wedding shoots..." }]
    → currentStep: 3

User: "About 2-3"
    → questionsAnswered: [{ step: 3, question: "...", answer: "About 2-3" }]
    → currentStep: 4
    → Progress: 20% (3/15)

... continues until totalSteps (15) reached
```

## Backend Usage Example

```typescript
// server/routes/chat.ts
app.post('/api/chat/message', async (req, res) => {
  const { message, history, conversationState, calculatorData } = req.body;

  // Use conversation state to tailor response
  if (conversationState.currentStep === 1) {
    // First interaction - ask qualifying questions
  } else if (conversationState.currentStep < 5) {
    // Early stage - gather basic info
  } else if (conversationState.currentStep >= 10) {
    // Late stage - provide specific recommendations
  }

  // Check if specific questions already answered
  const askedAboutPhotographyType = conversationState.questionsAnswered.some(
    qa => qa.question.toLowerCase().includes('photography')
  );

  if (!askedAboutPhotographyType) {
    // Ask about photography type
  } else {
    // Skip, already answered
  }

  // Generate response...
});
```

## Testing the Integration

### Manual Test Steps

1. **Open chat** - Progress component should be hidden (no questions yet)
2. **AI sends greeting with question** - Component appears with 1 question in "Current"
3. **User answers** - Question moves to "Answered" section with animation
4. **AI asks follow-up** - New question appears in "Current", progress updates
5. **Collapse component** - Click chevron, component minimizes
6. **Expand component** - Click chevron again, smooth expand animation
7. **Refresh page** - All progress state persists
8. **Open Network tab** - Verify conversationState sent in POST payload
9. **Switch sessions** - Each session has independent progress
10. **Start new chat** - Fresh progress (0 questions answered)

### Automated Test Ideas

```typescript
describe('ConversationProgress Integration', () => {
  it('should hide when no questions asked', () => {
    // Assert component not visible when questionsAsked.length === 0
  });

  it('should parse questions from AI messages', () => {
    // Send AI message with question mark
    // Assert question appears in conversationState.questionsAsked
  });

  it('should mark question as answered when user responds', () => {
    // AI asks question
    // User sends response
    // Assert question moved to questionsAnswered
  });

  it('should persist to localStorage', () => {
    // Create conversation with questions
    // Refresh page
    // Assert conversationState restored
  });

  it('should send to backend in payload', () => {
    // Mock fetch
    // Send message
    // Assert payload includes conversationState
  });

  it('should update progress percentage', () => {
    // Answer 3 of 15 questions
    // Assert progress shows 20%
  });
});
```

## Summary

The ConversationProgress component is now fully integrated into SupportChat with:

✅ **Automatic state tracking** - Parses questions/answers from messages
✅ **Real-time updates** - Smooth animations as conversation progresses
✅ **LocalStorage persistence** - Survives page refresh
✅ **Backend integration** - Sent with every chat message
✅ **Session isolation** - Each chat has independent progress
✅ **Mobile responsive** - Adapts to screen size
✅ **Type-safe** - Full TypeScript support
✅ **Zero errors** - Build passes successfully

The implementation is production-ready and provides users with clear visibility into their conversation progress with the AI support agent.
