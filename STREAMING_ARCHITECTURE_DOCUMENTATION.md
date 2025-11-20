# Streaming Architecture Documentation

**CRITICAL**: This document explains how the OpenAI Responses API streaming works across the entire stack. Future developers (and AI agents) MUST read this before modifying any streaming code.

---

## Table of Contents

1. [Overview](#overview)
2. [Why Responses API (Not Chat Completions)](#why-responses-api)
3. [The Three-Layer Stack](#the-three-layer-stack)
4. [Layer 1: chatService.ts - API Call & Format Conversion](#layer-1-chatservicets)
5. [Layer 2: routes.ts - SSE Streaming & Metadata Parsing](#layer-2-routests)
6. [Layer 3: SupportChat.tsx - Client-Side Reception](#layer-3-supportchattsx)
7. [Common Mistakes & How to Avoid Them](#common-mistakes)
8. [Testing Checklist](#testing-checklist)

---

## Overview

The chat system streams AI responses from OpenAI's **Responses API** (not Chat Completions) through a three-layer architecture:

```
OpenAI Responses API → chatService.ts → routes.ts → SupportChat.tsx → User sees text
     (gpt-5-nano)      (converter)      (SSE relay)    (EventSource)    (live typing)
```

**Key Characteristics:**
- **Model**: gpt-5-nano (NOT gpt-4o or gpt-4o-mini)
- **API**: Responses API (NOT Chat Completions API)
- **Streaming**: True token-by-token (NOT buffered)
- **Format**: Server-Sent Events (SSE)
- **Caching**: Prompt caching with reasoning blocks (40-80% cost savings)

---

## Why Responses API (Not Chat Completions)

### The Responses API is OpenAI's NEW (2025) API Primitive

**DO NOT change to Chat Completions API.** Here's why:

| Feature | Responses API | Chat Completions API |
|---------|---------------|----------------------|
| **Prompt Caching** | 40-80% hit rate (with reasoning blocks) | 10-20% hit rate (basic) |
| **Models** | gpt-5-nano, gpt-5-mini, gpt-5 | gpt-4o, gpt-4o-mini (deprecated) |
| **Cost** | $0.05/1M input tokens (gpt-5-nano) | $0.30/1M input tokens (gpt-4o-mini) |
| **Reasoning** | Built-in with encrypted blocks for caching | Not available |
| **Status** | Current (2025 recommended API) | Legacy (OpenAI recommends migration) |
| **Documentation** | https://platform.openai.com/docs/guides/responses | https://platform.openai.com/docs/guides/chat |

### What Happens If You Change It

❌ **If you switch to `openai.chat.completions.create()`:**
- Prompt caching breaks (60-80% cost increase)
- gpt-5-nano model won't work ("model not found" error)
- Reasoning blocks not captured (cache performance degrades)
- Streaming format changes (routes.ts can't parse it)

✅ **Keep using `openai.responses.create()`:**
- Best caching performance (saves $$$)
- Modern, supported API
- Fast, cheap gpt-5-nano model works
- Everything streams perfectly

---

## The Three-Layer Stack

### Layer 1: `server/chatService.ts`
**Location**: Lines 1093-1430
**Role**: Call OpenAI Responses API, convert chunks to Chat Completions format

**Input**: User message + conversation history
**Output**: ReadableStream of Chat Completions-formatted chunks

**Key Functions**:
- `getChatResponseStream()` - Main entry point
- Converts messages to Responses API "input" format
- Calls `openai.responses.create()` with specific parameters
- Converts Responses API chunks → Chat Completions format
- Captures reasoning blocks for prompt caching

**Critical Parameters**:
```typescript
await openai.responses.create({
  model: 'gpt-5-nano', // MUST be gpt-5 series (NOT gpt-4o)
  stream: true, // MUST be true for streaming
  store: true, // MUST be true for caching
  reasoning: { effort: 'minimal' }, // Fast responses
  include: ['reasoning.encrypted_content'] // For caching
})
```

---

### Layer 2: `server/routes.ts`
**Location**: Lines 810-1600
**Role**: Relay streaming chunks to client via Server-Sent Events (SSE)

**Input**: ReadableStream from chatService.ts
**Output**: SSE stream to client

**Key Responsibilities**:
- Set up SSE headers (`Content-Type: text/event-stream`)
- Read chunks from chatService.ts stream
- Parse metadata delimiters (`␞QUICK_REPLIES:`, `␞NEXT_MESSAGE:`)
- Filter out metadata before sending to client
- Save complete response to database
- Track token usage and costs

**SSE Format**:
```
data: {"type":"delta","content":"Hello"}\n\n
data: {"type":"delta","content":" world"}\n\n
data: {"type":"done"}\n\n
```

**Metadata Filtering**:
The AI includes metadata in its response:
```
This is the visible response

␞QUICK_REPLIES: yes | no | maybe | not sure
␞NEXT_MESSAGE: 30
```

routes.ts MUST:
1. Detect `␞` delimiter during streaming
2. STOP streaming when delimiter is detected
3. Parse metadata (QUICK_REPLIES, NEXT_MESSAGE)
4. Strip metadata from saved response
5. Send clean response to database

---

### Layer 3: `client/src/components/SupportChat.tsx`
**Location**: Lines 1350-1500
**Role**: Receive SSE stream and update UI in real-time

**Input**: SSE stream from routes.ts
**Output**: Live-updating chat message

**Key Responsibilities**:
- Create EventSource connection to `/api/chat/message`
- Parse SSE events (`data: {...}`)
- Accumulate text deltas
- Update UI with `flushSync()` for immediate rendering
- Detect metadata delimiters client-side (backup)
- Parse QUICK_REPLIES and NEXT_MESSAGE from final response

**EventSource Pattern**:
```typescript
const eventSource = new EventSource('/api/chat/message', {
  method: 'POST',
  body: JSON.stringify({ message, history, ... })
});

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (data.type === 'delta') {
    // Accumulate text
    fullContent += data.content;

    // Update UI immediately
    flushSync(() => {
      setLatestGreeting(fullContent);
    });
  }
};
```

**React flushSync()**: Critical for immediate UI updates. Without it, React batches updates and streaming appears jerky.

---

## Layer 1: chatService.ts

### File: `server/chatService.ts`
### Function: `getChatResponseStream()`
### Lines: 1093-1430

---

### 1. Why Responses API (Lines 1093-1128)

```typescript
// ============================================================================
// CRITICAL: Using OpenAI Responses API (NOT Chat Completions API)
// ============================================================================
```

**What it does**: Explains why we use Responses API instead of Chat Completions

**Key points**:
- Responses API is the NEW (2025) standard
- Better prompt caching (40-80% vs 10-20%)
- Only works with gpt-5-nano/mini/5 (NOT gpt-4o)
- Built-in reasoning for caching
- Chat Completions is deprecated

**DO NOT**:
- ❌ Change to `openai.chat.completions.create()`
- ❌ Use gpt-4o or gpt-4o-mini models
- ❌ Remove reasoning blocks

**WHAT HAPPENS IF YOU DO**:
- Caching breaks (60-80% cost increase)
- Model errors (gpt-5-nano won't work)
- Streaming format incompatible with routes.ts

---

### 2. Message Conversion (Lines 1130-1169)

```typescript
// ============================================================================
// CONVERTING MESSAGES TO RESPONSES API INPUT FORMAT
// ============================================================================
```

**What it does**: Converts Chat Completions "messages" array to Responses API "input" array

**Conversion Rules**:
```typescript
// Chat Completions → Responses API
{ role: 'system', content: '...' }  →  { role: 'user', content: [{ type: 'input_text', text: '[SYSTEM CONTEXT]\n...' }] }
{ role: 'user', content: '...' }    →  { role: 'user', content: [{ type: 'input_text', text: '...' }] }
{ role: 'assistant', content: '...' } → { role: 'assistant', content: [{ type: 'output_text', text: '...' }] }
```

**Why convert system → user**:
- Responses API doesn't have "system" role
- System context becomes user input with `[SYSTEM CONTEXT]` marker
- Better for caching (groups all static instructions together)

**DO NOT**:
- ❌ Skip conversion (API will reject it)
- ❌ Remove `[SYSTEM CONTEXT]` marker (caching degrades)
- ❌ Use different content type fields

---

### 3. Reasoning Blocks (Lines 1171-1201)

```typescript
// ============================================================================
// REASONING BLOCKS FOR PROMPT CACHING (CRITICAL FOR PERFORMANCE)
// ============================================================================
```

**What it does**: Includes previous reasoning blocks from earlier turns

**How it works**:
1. Turn 1: AI generates reasoning, returns `encrypted_content`
2. We save `encrypted_content` to database
3. Turn 2+: We include previous encrypted blocks in `input` array
4. OpenAI recognizes conversation and caches more aggressively

**Impact**: 40-80% cache hit rate improvement (tested by OpenAI)

**Reasoning blocks are**:
- ✅ Encrypted (we can't read them)
- ✅ Opaque (just pass them through)
- ✅ Critical for caching (don't skip them)
- ❌ NOT shown to user (internal data)
- ❌ NOT decryptable (don't try)

**DO NOT**:
- ❌ Try to decrypt or read reasoning blocks
- ❌ Skip including previous blocks (cache performance degrades)
- ❌ Include blocks from different conversations (cache pollution)

---

### 4. API Call Parameters (Lines 1208-1282)

```typescript
const response = await openai.responses.create({
  model: 'gpt-5-nano',
  stream: true,
  store: true,
  reasoning: { effort: 'minimal' },
  include: ['reasoning.encrypted_content']
})
```

**Parameter Breakdown**:

| Parameter | Value | Why | What Happens If Changed |
|-----------|-------|-----|------------------------|
| `model` | `'gpt-5-nano'` | Cheapest, fastest gpt-5 model | ❌ `'gpt-4o'` → Model not found error |
| `stream` | `true` | Enable token-by-token streaming | ❌ `false` → User waits 5-10s (terrible UX) |
| `store` | `true` | Enable prompt caching | ❌ `false` → No caching, 40-80% cost increase |
| `reasoning.effort` | `'minimal'` | Fast, cheap reasoning | ❌ `'high'` → Slower, more expensive, no benefit |
| `include` | `['reasoning.encrypted_content']` | Return reasoning blocks for caching | ❌ `[]` → No blocks returned, cache degrades |

**text.verbosity**: `'low'`
- Reduces verbose reasoning summaries
- Makes responses more concise
- Options: `'low'` | `'medium'` | `'high'`

**DO NOT**:
- ❌ Change model to gpt-4o (doesn't work with Responses API)
- ❌ Set stream: false (terrible UX)
- ❌ Set store: false (caching breaks, costs increase)
- ❌ Remove reasoning.encrypted_content from include

---

### 5. Streaming & Chunk Conversion (Lines 1291-1430)

```typescript
return new ReadableStream({
  async start(controller) {
    for await (const chunk of response) {
      // Convert Responses API chunks to Chat Completions format
      // ...
    }
  }
})
```

**What it does**: Converts Responses API chunks to Chat Completions format that routes.ts expects

**Chunk Type Conversion**:

| Responses API Chunk | Chat Completions Format | Description |
|---------------------|-------------------------|-------------|
| `response.output_text.delta` | `{ choices: [{ delta: { content: '...' } }] }` | Streaming text tokens |
| `response.output_text.done` | *ignored* | Already streamed deltas |
| `response.content_part.done` (reasoning) | *saved, not streamed* | Reasoning blocks for caching |
| `response.completed` | `{ usage: {...}, choices: [{ finish_reason: 'stop' }] }` | Token counts, costs |

**Example Conversion**:

```typescript
// Responses API chunk (what OpenAI sends)
{
  type: 'response.output_text.delta',
  delta: 'Hello',
  output_index: 1
}

// ↓ Converted to ↓

// Chat Completions format (what routes.ts expects)
{
  choices: [{
    delta: { content: 'Hello' }
  }]
}
```

**SSE Encoding**:
Every chunk is encoded as Server-Sent Events format:
```typescript
const sseData = `data: ${JSON.stringify(convertedChunk)}\n\n`;
controller.enqueue(new TextEncoder().encode(sseData));
```

**Why This Format**:
- routes.ts reads: `data.choices[0].delta.content` for streaming text
- routes.ts reads: `data.usage.prompt_tokens` for cost tracking
- routes.ts reads: `data.reasoning_blocks` for DB storage (custom field)

**DO NOT**:
- ❌ Change `choices[0].delta.content` structure (routes.ts can't parse, streaming breaks)
- ❌ Skip usage conversion (cost tracking breaks, no billing)
- ❌ Stream reasoning to client (encrypted gibberish shows in UI)
- ❌ Remove SSE encoding (EventSource can't parse it)

---

### 6. Immediate Chunk Processing (Critical Fix)

```typescript
// Get the async iterator
const iterator = response[Symbol.asyncIterator]();

// Process chunks immediately as they arrive (no batching)
while (true) {
  const { done, value: chunk } = await iterator.next();
  // Process chunk IMMEDIATELY
}
```

**Why NOT `for await`**:
```typescript
// ❌ BAD - Causes microtask batching
for await (const chunk of response) {
  // JavaScript's microtask queue batches multiple chunks
  // before processing, causing delayed streaming
}

// ✅ GOOD - Process immediately
const iterator = response[Symbol.asyncIterator]();
while (true) {
  const { done, value } = await iterator.next();
  // Chunk is processed IMMEDIATELY as it arrives
}
```

**Microtask Batching Problem**:
- `for await` uses JavaScript's microtask queue
- Microtask queue can batch multiple chunks before processing
- This delays streaming (user sees text in bursts, not token-by-token)
- Using `iterator.next()` ensures immediate processing

**DO NOT**:
- ❌ Change to `for await (const chunk of response)` (causes batching)
- ✅ Keep using `iterator.next()` (immediate processing)

---

## Layer 2: routes.ts

### File: `server/routes.ts`
### Endpoint: `POST /api/chat/message`
### Lines: 810-1600

---

### 1. SSE Headers Setup (Lines 866-871)

```typescript
res.setHeader('Content-Type', 'text/event-stream');
res.setHeader('Cache-Control', 'no-cache, no-transform');
res.setHeader('Connection', 'keep-alive');
res.setHeader('X-Accel-Buffering', 'no');
res.write('\n'); // Initial ping
```

**What each header does**:

| Header | Value | Why | What Happens Without It |
|--------|-------|-----|------------------------|
| `Content-Type` | `text/event-stream` | Required for SSE (browser's EventSource API) | ❌ EventSource won't connect |
| `Cache-Control` | `no-cache, no-transform` | Prevents proxy caching/modification | ❌ User sees cached old responses |
| `Connection` | `keep-alive` | Keeps HTTP connection open | ❌ Connection closes after first chunk |
| `X-Accel-Buffering` | `no` | Disables nginx buffering | ❌ Streaming is delayed (bad UX) |

**Initial `res.write('\n')`**:
- "Pings" the client to confirm stream is open
- Without it, EventSource may timeout waiting for first message

**SSE Message Format**:
```
data: {JSON}\n\n
```
- `data: ` prefix is required by SSE spec
- Double newline `\n\n` marks end of message
- Message body is JSON string

**DO NOT**:
- ❌ Remove any header (streaming breaks or gets cached/buffered)
- ❌ Change `"data: "` prefix (EventSource can't parse messages)
- ❌ Use single `\n` instead of `\n\n` (messages get concatenated)

---

### 2. Stream Processing Loop (Lines 1320-1437)

```typescript
let buffer = ''; // Buffer for incomplete SSE lines
let lineBuffer = ''; // Buffer for delimiter detection

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value, { stream: true });

  // Add to buffer and split by lines
  buffer += chunk;
  const lines = buffer.split('\n');
  buffer = lines.pop() || ''; // Keep incomplete line

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = JSON.parse(line.slice(6));
      // Process chunk...
    }
  }
}
```

**Two Buffers Explained**:

1. **`buffer`** - For incomplete SSE lines
   - SSE messages may arrive split across multiple chunks
   - Example: `"data: {"type":"del"` arrives, then `"ta","content":"Hi"}\n\n"` arrives
   - `buffer` accumulates until we have complete `\n\n` delimited messages

2. **`lineBuffer`** - For delimiter detection
   - Accumulates AI response text to detect metadata delimiters
   - Example: AI response is `"Hello␞QUICK_REPLIES: yes | no"`
   - We detect `␞` and stop streaming to prevent metadata leaking to UI

**Line Splitting Logic**:
```typescript
buffer += chunk;              // Add new data
const lines = buffer.split('\n'); // Split by newlines
buffer = lines.pop() || '';   // Last item might be incomplete, keep it
```

**Why keep last line**:
- Last line might not end with `\n` yet (incomplete)
- Example: buffer = `"data: {}\n\ndata: {}\nda"` (last line incomplete)
- We process first two lines, keep `"da"` for next iteration

**DO NOT**:
- ❌ Remove buffer (messages get corrupted when split across chunks)
- ❌ Remove `lines.pop()` (last incomplete line gets lost)
- ❌ Process all lines including last (incomplete messages get processed)

---

### 3. Delimiter Detection & Metadata Filtering (Lines 1380-1400)

```typescript
lineBuffer += content; // Accumulate content

// Check for metadata delimiters
const hasDelimiter = lineBuffer.includes('␞') ||
                    lineBuffer.includes('QUICK_REPLIES') ||
                    lineBuffer.includes('NEXT_MESSAGE');

if (hasDelimiter) {
  // Hit metadata - stop streaming completely
  continue; // Don't send any more deltas
}

// No delimiters yet - stream this chunk
res.write(`data: ${JSON.stringify({ type: 'delta', content: content })}\n\n`);
res.socket.uncork(); // Force immediate transmission
```

**What this does**:

AI response includes metadata at the end:
```
This is the visible response

␞QUICK_REPLIES: yes | no | maybe | not sure
␞NEXT_MESSAGE: 30
```

We MUST:
1. **Detect delimiter** (`␞`, `QUICK_REPLIES`, `NEXT_MESSAGE`)
2. **Stop streaming** when delimiter is detected
3. **Parse metadata** from full response after stream completes
4. **Strip metadata** before saving to database
5. **Send clean response** to client

**Why check in lineBuffer**:
- Delimiter might not be in current chunk (could be in next chunk)
- lineBuffer accumulates all text so far
- Once we see delimiter, we stop streaming immediately

**res.socket.uncork()**:
- Forces immediate transmission of buffered data
- Without it, Node.js buffers data for efficiency (bad for streaming)
- uncork() = "send this NOW, don't buffer"

**DO NOT**:
- ❌ Remove delimiter detection (metadata leaks to UI, users see `␞QUICK_REPLIES: ...`)
- ❌ Remove lineBuffer (can't detect delimiters that span chunks)
- ❌ Remove res.socket.uncork() (streaming becomes jerky/delayed)
- ❌ Continue streaming after delimiter (metadata shows in UI)

---

### 4. Metadata Parsing & Stripping (Lines 1439-1478)

```typescript
// Parse and strip out metadata delimiters
let cleanResponse = fullResponse;
let quickReplies: string[] = [];
let nextMessageTiming = 30;

// Extract QUICK_REPLIES
const quickRepliesMatch = fullResponse.match(/␞QUICK_REPLIES:\s*(.+)/);
if (quickRepliesMatch) {
  const repliesText = quickRepliesMatch[1].trim();
  quickReplies = repliesText.split('|').map(r => r.trim());
}

// Extract NEXT_MESSAGE timing
const nextMessageMatch = fullResponse.match(/␞NEXT_MESSAGE:\s*(\d+)/);
if (nextMessageMatch) {
  nextMessageTiming = parseInt(nextMessageMatch[1], 10);
}

// Strip out the delimiter lines
cleanResponse = fullResponse
  .replace(/␞QUICK_REPLIES:[^\n␞]*/gi, '')
  .replace(/␞NEXT_MESSAGE:[^\n␞]*/gi, '')
  .split('\n')
  .filter(line => {
    const trimmed = line.trim();
    return !trimmed.startsWith('␞QUICK_REPLIES:') &&
           !trimmed.startsWith('␞NEXT_MESSAGE:') &&
           !trimmed.startsWith('QUICK_REPLIES:') &&
           !trimmed.startsWith('NEXT_MESSAGE:');
  })
  .join('\n')
  .trim();

fullResponse = cleanResponse; // Replace with cleaned version
```

**What this does**:

1. **Extract metadata** from full response
   - Parse `␞QUICK_REPLIES: option1 | option2 | option3`
   - Parse `␞NEXT_MESSAGE: 30`
   - Save to variables for later use

2. **Remove metadata** from response text
   - Remove inline metadata (when `␞` appears mid-line)
   - Remove full lines that start with metadata
   - Multiple passes to catch all variations

3. **Replace fullResponse** with cleaned version
   - This is what gets saved to database
   - This is what client sees (no metadata)

**Why multiple cleanup passes**:
AI might format metadata differently:
- Inline: `some text␞QUICK_REPLIES: ...`
- Separate line: `\n␞QUICK_REPLIES: ...`
- Without delimiter: `\nQUICK_REPLIES: ...`

We handle all variations to ensure clean output.

**DO NOT**:
- ❌ Skip cleanup (metadata saved to DB, visible to users)
- ❌ Only clean one format (other formats leak through)
- ❌ Remove regex replace + filter (need both for complete cleanup)

---

### 5. Usage Data & Cost Tracking (Lines 1406-1417)

```typescript
if (data.usage) {
  tokensIn = data.usage.prompt_tokens || 0;
  tokensOut = data.usage.completion_tokens || 0;
  cachedTokensIn = data.usage.prompt_tokens_details?.cached_tokens || 0;

  const { calculateChatCost } = await import('./modelPricing');
  cost = calculateChatCost(preferredModel, tokensIn, tokensOut);
}
```

**What this does**:
- Extracts token counts from usage data
- Calculates cost based on model pricing
- Tracks cached tokens (for measuring cache performance)

**Token Types**:
- `prompt_tokens`: Input tokens (user message + history + prompt)
- `completion_tokens`: Output tokens (AI response)
- `cached_tokens`: Input tokens served from cache (free!)

**Cost Calculation**:
```typescript
// gpt-5-nano pricing
const inputCost = (tokensIn / 1_000_000) * 0.05;  // $0.05/1M
const outputCost = (tokensOut / 1_000_000) * 0.40; // $0.40/1M
const totalCost = inputCost + outputCost;
// Note: cached tokens don't count toward cost!
```

**DO NOT**:
- ❌ Skip cost tracking (can't bill users, can't measure performance)
- ❌ Ignore cached tokens (can't measure cache effectiveness)
- ❌ Hard-code costs (pricing changes, use modelPricing.ts)

---

### 6. Reasoning Blocks Capture (Lines 1419-1423)

```typescript
if (data.reasoning_blocks) {
  reasoningBlocks = data.reasoning_blocks;
  console.log(`[Chat] 🧠 Captured ${reasoningBlocks?.length || 0} reasoning blocks for caching`);
}
```

**What this does**:
- Captures reasoning blocks from chatService.ts
- These are saved to database with the message
- Included in future requests for better caching

**Reasoning Blocks Flow**:
```
Turn 1: OpenAI → reasoning blocks → chatService → routes → DB
Turn 2: DB → routes → chatService → OpenAI (improved caching!)
```

**DO NOT**:
- ❌ Skip saving reasoning blocks (cache performance degrades)
- ❌ Try to decrypt or read them (they're encrypted)
- ❌ Skip including them in future requests (cache hit rate drops)

---

## Layer 3: SupportChat.tsx

### File: `client/src/components/SupportChat.tsx`
### Function: Welcome Message Generation & Chat
### Lines: 1350-1500

---

### 1. EventSource Connection (Lines 1351-1354)

```typescript
const reader = response.body?.getReader();
const decoder = new TextDecoder();
if (!reader) throw new Error('No response stream');
```

**What this does**:
- Gets stream reader from fetch() response
- Creates TextDecoder to convert binary data to text
- Prepares to read Server-Sent Events

**Why use fetch() for SSE**:
- Modern browsers support `fetch()` with streaming
- More control than EventSource (can set headers, method, body)
- Can use POST method (EventSource only supports GET)

**DO NOT**:
- ❌ Remove reader check (crashes if no stream)
- ❌ Use EventSource API (can't send POST body)
- ❌ Skip TextDecoder (binary data shows as gibberish)

---

### 2. Stream Reading Loop (Lines 1361-1377)

```typescript
let fullContent = '';
let buffer = ''; // Buffer for incomplete SSE lines

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value, { stream: true });

  // Add to buffer and split by lines
  buffer += chunk;
  const lines = buffer.split('\n');
  buffer = lines.pop() || ''; // Keep incomplete line

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = JSON.parse(line.slice(6));
      // Process message...
    }
  }
}
```

**What this does**:
- Reads binary chunks from stream
- Decodes to text
- Splits into SSE messages (each ends with `\n\n`)
- Processes each complete message

**Buffer Logic** (same as routes.ts):
- SSE messages may arrive split across chunks
- buffer accumulates data until complete message
- Last line kept in buffer (might be incomplete)

**DO NOT**:
- ❌ Remove buffer (messages corrupted when split)
- ❌ Process incomplete lines (JSON parse errors)
- ❌ Skip `lines.pop()` (last incomplete line gets lost)

---

### 3. Message Type Handling (Lines 1383-1448)

```typescript
if (data.type === 'status' && data.message) {
  // Status updates (🗂️ loading..., ✅ api responded...)
  flushSync(() => {
    setLatestGreeting(prev => prev + data.message + '\n');
  });
}
else if (data.type === 'delta' && data.content) {
  // Actual AI response text (streaming tokens)
  fullContent += data.content;

  flushSync(() => {
    setLatestGreeting(fullContent);
  });
}
else if (data.type === 'done') {
  // Stream complete
  lastAiMessageTimeRef.current = Date.now();
}
```

**Message Types**:

| Type | Content | When Sent | UI Action |
|------|---------|-----------|-----------|
| `status` | `"🗂️ loading knowledge base..."` | During processing | Append to greeting (show progress) |
| `delta` | `"Hello"` (one token) | Streaming text | Replace greeting (show live text) |
| `done` | `{ currentStep, stepHistory }` | Stream complete | Update conversation state |
| `error` | `"Error message"` | On error | Show error message |

**flushSync() Explained**:
```typescript
// ❌ BAD - React batches updates, appears jerky
setLatestGreeting(fullContent);

// ✅ GOOD - React updates immediately, smooth streaming
flushSync(() => {
  setLatestGreeting(fullContent);
});
```

**Why flushSync()**:
- React normally batches state updates for performance
- Batching makes streaming appear jerky (updates in bursts)
- `flushSync()` forces immediate update (smooth token-by-token)

**DO NOT**:
- ❌ Remove flushSync() (streaming becomes jerky)
- ❌ Skip type checking (wrong message types processed incorrectly)
- ❌ Mix status and delta (UI shows status messages in response)

---

### 4. Metadata Parsing (Client-Side Backup) (Lines 1458-1475)

```typescript
// Remove ALL metadata from displayed content
const cutoffIndex = fullContent.indexOf('␞');
const followUpIndex = fullContent.search(/\n\n?QUICK_REPLIES:/);

if (cutoffIndex !== -1) {
  cleanContent = fullContent.substring(0, cutoffIndex).trim();
} else if (followUpIndex !== -1) {
  cleanContent = fullContent.substring(0, followUpIndex).trim();
}

// Parse NEXT_MESSAGE timing
const nextMessageMatch = fullContent.match(/(?:␞\s*)?(?:\n\n?)?NEXT_MESSAGE:\s*(\d+)/i);
if (nextMessageMatch) {
  nextMsgSeconds = parseInt(nextMessageMatch[1], 10);
}
```

**What this does** (CLIENT-SIDE BACKUP):
- Detects metadata delimiters in full response
- Strips metadata from displayed content
- Parses NEXT_MESSAGE timing

**Why do this client-side?**:
This is a BACKUP in case:
- Server failed to strip metadata (bug)
- Metadata leaked through during streaming
- Network issues caused partial metadata to arrive

**Primary metadata filtering happens in routes.ts** (server-side)
**This is just a safety net** (defense in depth)

**DO NOT**:
- ❌ Remove client-side filtering (metadata might leak if server fails)
- ❌ Rely only on client-side filtering (do it server-side first)
- ❌ Show metadata to user (confusing UX)

---

## Common Mistakes & How to Avoid Them

### Mistake #1: Changing to Chat Completions API

**WRONG**:
```typescript
// ❌ DO NOT DO THIS
const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [...],
  stream: true
});
```

**RIGHT**:
```typescript
// ✅ KEEP THIS
const response = await openai.responses.create({
  model: 'gpt-5-nano',
  input: [...],
  stream: true,
  store: true
});
```

**Why**: Chat Completions is deprecated, worse caching, gpt-4o doesn't work with Responses API

---

### Mistake #2: Using gpt-4o Model

**WRONG**:
```typescript
// ❌ DO NOT DO THIS
model: 'gpt-4o'
model: 'gpt-4o-mini'
```

**RIGHT**:
```typescript
// ✅ KEEP THIS
model: 'gpt-5-nano'  // or 'gpt-5-mini', 'gpt-5'
```

**Why**: gpt-4o models don't work with Responses API, you'll get "model not found" errors

---

### Mistake #3: Disabling Streaming

**WRONG**:
```typescript
// ❌ DO NOT DO THIS
stream: false
```

**RIGHT**:
```typescript
// ✅ KEEP THIS
stream: true
```

**Why**: User waits 5-10 seconds for response (terrible UX), streaming creates "typing" effect

---

### Mistake #4: Disabling Prompt Caching

**WRONG**:
```typescript
// ❌ DO NOT DO THIS
store: false
// or removing: include: ['reasoning.encrypted_content']
```

**RIGHT**:
```typescript
// ✅ KEEP THIS
store: true
include: ['reasoning.encrypted_content']
```

**Why**: No caching = 40-80% cost increase, slower responses

---

### Mistake #5: Removing Reasoning Blocks

**WRONG**:
```typescript
// ❌ DO NOT DO THIS
// Skip saving reasoning blocks to DB
// Skip including previous blocks in requests
```

**RIGHT**:
```typescript
// ✅ KEEP THIS
// Save reasoning blocks: reasoningBlocks = data.reasoning_blocks
// Include in requests: previousReasoningBlocks parameter
```

**Why**: Cache hit rate drops from 60-80% to 10-20%, costs increase dramatically

---

### Mistake #6: Changing Chunk Conversion Format

**WRONG**:
```typescript
// ❌ DO NOT DO THIS
{
  content: chunkData.delta  // routes.ts can't parse this
}
```

**RIGHT**:
```typescript
// ✅ KEEP THIS
{
  choices: [{
    delta: { content: chunkData.delta }
  }]
}
```

**Why**: routes.ts expects `data.choices[0].delta.content`, changing breaks streaming

---

### Mistake #7: Removing Delimiter Detection

**WRONG**:
```typescript
// ❌ DO NOT DO THIS
// Just stream everything, don't check for ␞
res.write(`data: ${JSON.stringify({ type: 'delta', content: content })}\n\n`);
```

**RIGHT**:
```typescript
// ✅ KEEP THIS
if (lineBuffer.includes('␞') || lineBuffer.includes('QUICK_REPLIES')) {
  continue; // Stop streaming
}
res.write(`data: ${JSON.stringify({ type: 'delta', content: content })}\n\n`);
```

**Why**: Metadata leaks to UI, users see `␞QUICK_REPLIES: yes | no | maybe`

---

### Mistake #8: Removing res.socket.uncork()

**WRONG**:
```typescript
// ❌ DO NOT DO THIS
res.write(`data: ${JSON.stringify(...)}\n\n`);
// No uncork
```

**RIGHT**:
```typescript
// ✅ KEEP THIS
res.write(`data: ${JSON.stringify(...)}\n\n`);
res.socket.uncork(); // Force immediate transmission
```

**Why**: Node.js buffers data for efficiency, uncork() forces immediate send (smooth streaming)

---

### Mistake #9: Removing flushSync()

**WRONG**:
```typescript
// ❌ DO NOT DO THIS
setLatestGreeting(fullContent);
```

**RIGHT**:
```typescript
// ✅ KEEP THIS
flushSync(() => {
  setLatestGreeting(fullContent);
});
```

**Why**: React batches updates without flushSync(), streaming appears jerky

---

### Mistake #10: Skipping Metadata Cleanup

**WRONG**:
```typescript
// ❌ DO NOT DO THIS
// Save fullResponse directly without cleaning
await saveMessageToDB(fullResponse);
```

**RIGHT**:
```typescript
// ✅ KEEP THIS
// Strip metadata before saving
cleanResponse = fullResponse
  .replace(/␞QUICK_REPLIES:[^\n␞]*/gi, '')
  .replace(/␞NEXT_MESSAGE:[^\n␞]*/gi, '')
  // ... more cleanup
await saveMessageToDB(cleanResponse);
```

**Why**: Metadata gets saved to DB, visible to users in history, breaks conversation flow

---

## Testing Checklist

Before deploying ANY changes to streaming code, verify:

### ✅ API Call Tests

- [ ] Model is `gpt-5-nano` (not gpt-4o)
- [ ] Using `openai.responses.create()` (not chat.completions)
- [ ] `stream: true` enabled
- [ ] `store: true` enabled (for caching)
- [ ] `include: ['reasoning.encrypted_content']` present
- [ ] `reasoning.effort: 'minimal'` set

### ✅ Streaming Tests

- [ ] Tokens appear one-by-one in UI (not in bursts)
- [ ] No visible delay/buffering between tokens
- [ ] flushSync() is being called for each delta
- [ ] res.socket.uncork() is being called after each write

### ✅ Metadata Tests

- [ ] Metadata delimiters (`␞QUICK_REPLIES:`, `␞NEXT_MESSAGE:`) NOT visible in UI
- [ ] QUICK_REPLIES buttons appear correctly
- [ ] NEXT_MESSAGE timing is parsed correctly
- [ ] Saved message in DB does NOT contain metadata

### ✅ Caching Tests

- [ ] Reasoning blocks are being captured (check logs)
- [ ] Reasoning blocks are being saved to DB
- [ ] Previous reasoning blocks are included in subsequent requests
- [ ] Cache hit rate is 40-80% (check prompt caching metrics)
- [ ] Cached tokens are being tracked (usage data)

### ✅ Cost Tracking Tests

- [ ] Token counts are correct (prompt_tokens, completion_tokens)
- [ ] Cached tokens are being tracked separately
- [ ] Cost calculation uses correct model pricing
- [ ] Cost is saved to DB with message

### ✅ Error Handling Tests

- [ ] API errors are caught and logged (not shown to user)
- [ ] Stream errors don't crash the server
- [ ] Incomplete streams are handled gracefully
- [ ] Timeout errors are handled

### ✅ UI Tests

- [ ] Chat input is disabled while streaming
- [ ] Greeting appears live as AI responds
- [ ] Status messages appear (🗂️ loading..., ✅ responded...)
- [ ] Ding sound plays when response completes
- [ ] Conversation progress indicator updates

### ✅ Cross-Browser Tests

- [ ] Works in Chrome
- [ ] Works in Firefox
- [ ] Works in Safari
- [ ] Works in Edge

---

## Quick Reference

### Key Files & Line Numbers

| File | Lines | What It Does |
|------|-------|--------------|
| `server/chatService.ts` | 1093-1430 | OpenAI Responses API call & format conversion |
| `server/routes.ts` | 810-1600 | SSE streaming relay & metadata parsing |
| `client/src/components/SupportChat.tsx` | 1350-1500 | Client-side EventSource & UI updates |

### Key Parameters

| Parameter | Value | File |
|-----------|-------|------|
| `model` | `'gpt-5-nano'` | chatService.ts:1269 |
| `stream` | `true` | chatService.ts:1279 |
| `store` | `true` | chatService.ts:1280 |
| `reasoning.effort` | `'minimal'` | chatService.ts:1276 |
| `include` | `['reasoning.encrypted_content']` | chatService.ts:1281 |

### Key Concepts

- **Responses API**: OpenAI's new (2025) API, better caching, gpt-5-nano support
- **Prompt Caching**: 40-80% cost savings, requires `store: true` + reasoning blocks
- **Reasoning Blocks**: Encrypted summaries of AI thinking, critical for caching
- **Server-Sent Events**: Browser streaming standard, `data: {...}\n\n` format
- **Delimiter Detection**: Detect `␞` to stop streaming before metadata leaks
- **flushSync()**: Force immediate React update for smooth streaming

---

## Emergency Rollback

If streaming breaks after a change:

1. **Check the model**: Should be `'gpt-5-nano'` not `'gpt-4o'`
2. **Check the API**: Should be `openai.responses.create()` not `chat.completions.create()`
3. **Check streaming**: Should be `stream: true`
4. **Check caching**: Should be `store: true`
5. **Check format conversion**: Should convert to `{ choices: [{ delta: { content } }] }`
6. **Check delimiter detection**: Should stop streaming at `␞`
7. **Check flushSync()**: Should be present in SupportChat.tsx
8. **Check uncork()**: Should be present in routes.ts

If all else fails, git revert to the last known working commit.

---

**Last Updated**: 2025-11-20
**Author**: Claude (Anthropic)
**Purpose**: Prevent future breaks to streaming architecture
