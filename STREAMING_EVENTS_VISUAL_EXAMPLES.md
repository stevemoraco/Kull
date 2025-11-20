# Streaming Events - Visual Examples

This document shows exactly what each event type looks like in the UI.

## 1. Text Streaming (Main Content)

**Event:** `response.output_text.delta`

```
┌────────────────────────────────────────────┐
│ Assistant Message                          │
│                                            │
│ Here is the answer to your question...▊   │
│                                            │
└────────────────────────────────────────────┘
```

**Animation:** Cursor blinks at end, text appears character-by-character

**Colors:** Default message bubble colors (white bg, dark text)

---

## 2. Reasoning Summary (AI Thinking)

**Events:** `response.reasoning_summary_text.delta`, `response.reasoning_summary_text.done`

### Collapsed State:
```
┌────────────────────────────────────────────┐
│ 🧠  AI Thinking...                      ▼  │
└────────────────────────────────────────────┘
```

### Expanded State:
```
┌────────────────────────────────────────────┐
│ 🧠  AI Thinking...                      ▲  │
├────────────────────────────────────────────┤
│ I need to analyze the user's question     │
│ and search for recent information. Let    │
│ me break this down:                        │
│                                            │
│ 1. Understand the context                 │
│ 2. Search for latest data                 │
│ 3. Synthesize the information              │
│ 4. Provide a comprehensive answer          │
└────────────────────────────────────────────┘
```

**Animation:**
- Smooth height expansion when clicked
- Arrow rotates 180° when toggling
- Fade in/out transition

**Colors:**
- Background: Purple-50 (#FAF5FF)
- Border: Purple-200 (#E9D5FF)
- Text: Purple-900 (#581C87)
- Hover: Purple-100 (#F3E8FF)

**Interactive:** Click header to expand/collapse

---

## 3. Web Search

**Events:**
- `response.web_search_call.in_progress`
- `response.web_search_call.searching`
- `response.web_search_call.completed`

### Active Search:
```
┌────────────────────────────────────────────┐
│  🔍  Searching the web...                  │
│       Finding relevant information         │
└────────────────────────────────────────────┘
```

**Animation:**
- Search icon (🔍) spins continuously
- Fade in when search starts
- Fade out when complete (after 0.5s delay)

**Colors:**
- Background: Blue-50 (#EFF6FF)
- Border: Blue-200 (#BFDBFE)
- Title: Blue-900 (#1E3A8A)
- Subtitle: Blue-700 (#1D4ED8)

**Duration:** Shows while searching, disappears when completed

---

## 4. File Search

**Events:**
- `response.file_search_call.in_progress`
- `response.file_search_call.searching`
- `response.file_search_call.completed`

### Active Search:
```
┌────────────────────────────────────────────┐
│  📁  Searching files...                    │
│       Looking through documents            │
└────────────────────────────────────────────┘
```

**Animation:**
- Folder icon (📁) spins continuously
- Fade in/out like web search

**Colors:**
- Background: Green-50 (#F0FDF4)
- Border: Green-200 (#BBF7D0)
- Title: Green-900 (#14532D)
- Subtitle: Green-700 (#15803D)

**Duration:** Shows while searching, disappears when completed

---

## 5. Function Calls

**Events:**
- `response.function_call_arguments.delta`
- `response.function_call_arguments.done`

### In Progress:
```
┌────────────────────────────────────────────┐
│  ⚡  Calling function: getUserProfile      │
│  ┌────────────────────────────────────────┐│
│  │ {                                      ││
│  │   "userId": "12345",                   ││
│  │   "includeHistory": true▊              ││
│  └────────────────────────────────────────┘│
└────────────────────────────────────────────┘
```

### Completed:
```
┌────────────────────────────────────────────┐
│  ✅  Calling function: getUserProfile      │
│  ┌────────────────────────────────────────┐│
│  │ {                                      ││
│  │   "userId": "12345",                   ││
│  │   "includeHistory": true,              ││
│  │   "fields": ["name", "email"]          ││
│  │ }                                      ││
│  └────────────────────────────────────────┘│
└────────────────────────────────────────────┘
```

**Animation:**
- Slide in from left (-20px)
- Lightning bolt (⚡) changes to checkmark (✅) when complete
- Arguments stream in character-by-character

**Colors:**
- Background: Orange-50 (#FFF7ED)
- Border: Orange-200 (#FED7AA)
- Title: Orange-900 (#7C2D12)
- Code block: White background
- Code text: Orange-800 (#9A3412)

**Font:** Monospace for arguments (code block)

---

## 6. Code Interpreter

**Events:**
- `response.code_interpreter_call.in_progress`
- `response.code_interpreter_call.interpreting`
- `response.code_interpreter_call.code.delta`
- `response.code_interpreter_call.code.done`
- `response.code_interpreter_call.completed`

### In Progress:
```
┌────────────────────────────────────────────┐
│  ⚙️  Code Execution                        │
├────────────────────────────────────────────┤
│  import pandas as pd                       │
│  df = pd.read_csv('data.csv')              │
│  print(df.head())▊                         │
└────────────────────────────────────────────┘
```

### Completed:
```
┌────────────────────────────────────────────┐
│  ✅  Code Execution                        │
├────────────────────────────────────────────┤
│  import pandas as pd                       │
│  df = pd.read_csv('data.csv')              │
│  print(df.head())                          │
│  print(df.describe())                      │
└────────────────────────────────────────────┘
```

**Animation:**
- Slide up from bottom (20px)
- Gear icon (⚙️) changes to checkmark (✅) when complete
- Code streams in line-by-line

**Colors:**
- Header background: Gray-100 (#F3F4F6)
- Header text: Gray-900 (#111827)
- Code background: Gray-900 (#111827)
- Code text: Green-400 (#4ADE80) - terminal style
- Border: Gray-200 (#E5E7EB)

**Font:** Monospace (font-mono) for code

**Syntax Highlighting:** Could be enhanced with a library like Prism.js

---

## 7. Image Generation

**Events:**
- `response.image_generation_call.in_progress`
- `response.image_generation_call.generating`
- `response.image_generation_call.partial_image`
- `response.image_generation_call.completed`

### Generating (First Partial):
```
┌────────────────────────────────────────────┐
│  🎨  Generating image... (1 update)        │
│  ┌────────────────────────────────────────┐│
│  │                                        ││
│  │  [Blurry image preview]                ││
│  │                                        ││
│  └────────────────────────────────────────┘│
└────────────────────────────────────────────┘
```

### Generating (Multiple Updates):
```
┌────────────────────────────────────────────┐
│  🎨  Generating image... (5 updates)       │
│  ┌────────────────────────────────────────┐│
│  │                                        ││
│  │  [Progressively clearer image]         ││
│  │                                        ││
│  └────────────────────────────────────────┘│
└────────────────────────────────────────────┘
```

**Animation:**
- Scale in from 95% to 100%
- Each partial update fades in with blur effect
- Blur gradually reduces: blur(10px) → blur(0px)
- Update counter increments with each partial

**Colors:**
- Background: Pink-50 (#FDF2F8)
- Border: Pink-200 (#FBCFE8)
- Title: Pink-900 (#831843)
- Update counter: Pink-600 (#DB2777)

**Image Display:**
- Base64 data URL: `data:image/png;base64,{image_data}`
- Rounded corners (rounded-lg)
- Full width of container
- Progressive enhancement as more partials arrive

---

## 8. Complete Response Flow Example

Here's what a complex response might look like with multiple events:

```
┌────────────────────────────────────────────┐
│ 🧠  AI Thinking...                      ▼  │  ← Collapsible reasoning
└────────────────────────────────────────────┘

┌────────────────────────────────────────────┐
│  🔍  Searching the web...                  │  ← Active web search
│       Finding relevant information         │
└────────────────────────────────────────────┘

┌────────────────────────────────────────────┐
│  ⚡  Calling function: fetchData            │  ← Function call
│  ┌────────────────────────────────────────┐│
│  │ { "query": "AI trends 2025" }          ││
│  └────────────────────────────────────────┘│
└────────────────────────────────────────────┘

┌────────────────────────────────────────────┐
│ Based on recent trends, AI in 2025 will    │  ← Streaming text
│ focus on multimodal capabilities...▊       │
└────────────────────────────────────────────┘
```

**Order of appearance:**
1. Reasoning appears first (if present)
2. Web/file search indicators show while searching
3. Function calls appear when executed
4. Code interpreter shows if code is run
5. Images generate and stream in
6. Final text content streams last

**All events are independent** - they don't block each other and can appear/disappear at any time during the response.

---

## 9. Mobile Responsive Behavior

On mobile (< 768px width):

```
┌──────────────────────┐
│ 🧠  AI Thinking... ▼ │  ← Full width
└──────────────────────┘

┌──────────────────────┐
│  🔍  Searching...    │  ← Compact text
│      Finding info    │
└──────────────────────┘

┌──────────────────────┐
│  ⚡  Calling:        │  ← Function name only
│      getUserData     │
│  ┌──────────────────┐│  ← Scrollable args
│  │ { "id": "123" }  ││
│  └──────────────────┘│
└──────────────────────┘

┌──────────────────────┐
│ Text content here... │
└──────────────────────┘
```

**Responsive adjustments:**
- Reduced padding (px-3 py-2 instead of px-4 py-3)
- Smaller text (text-sm instead of text-base)
- Compact icons (text-lg instead of text-2xl)
- Horizontal scroll for code/args if needed

---

## 10. Dark Mode Variations

For dark mode support, add these color adjustments:

### Reasoning (Dark):
- Background: Purple-900/20
- Border: Purple-700/30
- Text: Purple-100

### Web Search (Dark):
- Background: Blue-900/20
- Border: Blue-700/30
- Text: Blue-100

### Function Calls (Dark):
- Background: Orange-900/20
- Border: Orange-700/30
- Text: Orange-100
- Code block: Gray-800 background

### Code Interpreter (Dark):
- Header: Gray-800
- Code block: Black
- Text: Green-300

### Image Generation (Dark):
- Background: Pink-900/20
- Border: Pink-700/30
- Text: Pink-100

---

## 11. Accessibility Features

All components include:

- **Semantic HTML**: Proper button, div, pre tags
- **ARIA labels**: "Click to expand reasoning"
- **Keyboard navigation**: Tab through interactive elements
- **Focus indicators**: Clear focus rings on interactive items
- **Screen reader text**: Hidden labels for icons
- **Motion reduction**: respects `prefers-reduced-motion`

Example with reduced motion:

```tsx
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  // No scale/rotate animations if user prefers reduced motion
  transition={{
    duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 0.3
  }}
>
```

---

## 12. Performance Considerations

- **Lazy rendering**: Only render visible components
- **Memoization**: Use React.memo for event components
- **Debouncing**: Don't re-render on every single delta
- **Cleanup**: Remove completed events after 2-3 seconds

Example optimization:

```tsx
// Batch text deltas to avoid 100+ re-renders
const [debouncedContent, setDebouncedContent] = useState('');

useEffect(() => {
  const timer = setTimeout(() => {
    setDebouncedContent(fullContent);
  }, 50); // 50ms debounce

  return () => clearTimeout(timer);
}, [fullContent]);
```

---

## Summary

This visual guide shows you exactly what each streaming event looks like in the UI. Use it as a reference when:

1. **Designing custom styles** - See the colors and layouts
2. **Testing event handlers** - Know what to expect
3. **Debugging issues** - Compare actual vs expected appearance
4. **Presenting to stakeholders** - Show what users will see

All components are fully implemented in `StreamingEventDisplay.tsx` and ready to use!
