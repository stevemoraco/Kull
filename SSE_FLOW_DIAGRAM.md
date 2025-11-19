# Server-Sent Events (SSE) Flow Diagram

## Complete Request-Response Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          KULL SSE STREAMING FLOW                             │
└─────────────────────────────────────────────────────────────────────────────┘

    CLIENT (Browser)          BACKEND (Express)           OPENAI API
    ════════════════          ═════════════════           ══════════
         │                           │                          │
         │  POST /api/chat/message   │                          │
         │──────────────────────────>│                          │
         │  {message, history, ...}  │                          │
         │                           │                          │
         │                           │  Set SSE Headers:        │
         │                           │  - Content-Type:         │
         │                           │    text/event-stream     │
         │                           │  - Cache-Control:        │
         │                           │    no-cache              │
         │                           │  - Connection:           │
         │                           │    keep-alive            │
         │                           │  - X-Accel-Buffering: no │
         │                           │                          │
         │                           │  res.write('\n')         │
         │                           │  res.flushHeaders() ←────┼──── CRITICAL!
         │                           │                          │
         │  ✅ SSE Connection Ready  │                          │
         │<─────────────────────────┼│                          │
         │                           │                          │
         │                           │  POST /v1/chat/...       │
         │                           │  {stream: true, ...}     │
         │                           │─────────────────────────>│
         │                           │                          │
         │                           │                          │  ┌──────────┐
         │                           │                          │  │ GPT-5    │
         │                           │                          │  │ Generate │
         │                           │                          │<─┤ Token 1  │
         │                           │                          │  └──────────┘
         │                           │  data: {"choices":[...]} │
         │                           │<─────────────────────────┤
         │                           │                          │
         │                           │  PARSE:                  │
         │                           │  - Extract delta.content │
         │                           │  - Build simplified JSON │
         │                           │                          │
         │                           │  res.write(              │
         │                           │   `data: {"type":        │
         │                           │    "delta","content":    │
         │                           │    "Hello"}\n\n`         │
         │                           │  )                       │
         │                           │                          │
         │  data: {"type":"delta",   │                          │
         │   "content":"Hello"}      │                          │
         │<─────────────────────────┼│                          │
         │                           │                          │
         │  FRONTEND PARSE:          │                          │  ┌──────────┐
         │  1. line.startsWith('data:')                         │  │ GPT-5    │
         │  2. JSON.parse(line.slice(6))                        │  │ Generate │
         │  3. if (data.type==='delta')                         │<─┤ Token 2  │
         │      append content       │                          │  └──────────┘
         │  4. flushSync() → React   │  data: {"choices":[...]} │
         │     re-renders NOW        │<─────────────────────────┤
         │                           │                          │
         │  ✅ "Hello" visible       │  res.write(              │
         │                           │   `data: {"type":        │
         │                           │    "delta","content":    │
         │                           │    " world"}\n\n`        │
         │                           │  )                       │
         │                           │                          │
         │  data: {"type":"delta",   │                          │
         │   "content":" world"}     │                          │
         │<─────────────────────────┼│                          │
         │                           │                          │
         │  ✅ "Hello world" visible │                          │
         │                           │                          │
         │                           │  data: [DONE]            │
         │                           │<─────────────────────────┤
         │                           │                          │
         │                           │  res.write(              │
         │                           │   `data: {"type":        │
         │                           │    "done"}\n\n`          │
         │                           │  )                       │
         │                           │  res.end()               │
         │                           │                          │
         │  data: {"type":"done"}    │                          │
         │<─────────────────────────┼│                          │
         │                           │                          │
         │  ✅ Stream Complete       │                          │
         │  ✅ Enable input          │                          │
         │  ✅ Play notification     │                          │
         │                           │                          │
```

## Format Transformation Detail

```
┌──────────────────────────────────────────────────────────────────────┐
│                  OPENAI FORMAT → KULL FORMAT                         │
└──────────────────────────────────────────────────────────────────────┘

OPENAI SENDS (verbose):
╔═══════════════════════════════════════════════════════════════════╗
║ data: {                                                           ║
║   "id": "chatcmpl-9a1B2c3D4e5F",                                  ║
║   "object": "chat.completion.chunk",                              ║
║   "created": 1763572636,                                          ║
║   "model": "gpt-5-mini",                                          ║
║   "choices": [                                                    ║
║     {                                                             ║
║       "index": 0,                                                 ║
║       "delta": {                                                  ║
║         "content": "Hello"           ←───────────── EXTRACT THIS  ║
║       },                                                          ║
║       "logprobs": null,                                           ║
║       "finish_reason": null                                       ║
║     }                                                             ║
║   ]                                                               ║
║ }\n\n                                                             ║
╚═══════════════════════════════════════════════════════════════════╝
                              │
                              │ Backend Transformation
                              │ (lines 867-874, 1538-1544)
                              ▼
KULL SENDS (simplified):
╔═══════════════════════════════════════════════════════════════════╗
║ data: {"type":"delta","content":"Hello"}\n\n                     ║
╚═══════════════════════════════════════════════════════════════════╝

BENEFITS:
✅ ~80% smaller payload (180 bytes → 45 bytes)
✅ Faster JSON parsing (no deep nesting)
✅ Type-based discrimination (type field)
✅ Consistent structure across all message types
```

## Edge Case Handling

```
┌──────────────────────────────────────────────────────────────────────┐
│              EDGE CASE: INCOMPLETE CHUNK RECEIVED                    │
└──────────────────────────────────────────────────────────────────────┘

NETWORK DELIVERS CHUNKS:

Chunk 1:  "data: {\"type\":\"de"
Chunk 2:  "lta\",\"content\":\"Hello\"}\n\n"

FRONTEND BUFFER STRATEGY:

buffer = ""

─ Receive Chunk 1 ─────────────────────────────────────────────────
buffer = "data: {\"type\":\"de"
lines = buffer.split('\n')  →  ["data: {\"type\":\"de"]
buffer = lines.pop()        →  "data: {\"type\":\"de"  ← KEEP IN BUFFER
Complete lines: 0           →  SKIP PARSING (incomplete)

─ Receive Chunk 2 ─────────────────────────────────────────────────
buffer = "data: {\"type\":\"delta\",\"content\":\"Hello\"}\n\n"
lines = buffer.split('\n')  →  ["data: {...}", "", ""]
buffer = lines.pop()        →  ""  ← Last empty line goes to buffer
Complete lines: 2           →  PARSE FIRST LINE ✅

RESULT:
✅ No data loss
✅ No premature parsing
✅ No JSON parse errors
```

## Newline Handling in JSON Values

```
┌──────────────────────────────────────────────────────────────────────┐
│         EDGE CASE: CONTENT WITH ACTUAL NEWLINE CHARACTER            │
└──────────────────────────────────────────────────────────────────────┘

USER RECEIVES AI RESPONSE WITH NEWLINE:
"Hello\nworld"

BACKEND ENCODING:
─────────────────────────────────────────────────────────────────────
JSON.stringify({ type: 'delta', content: "Hello\nworld" })
                                           ↓
                                         \\n (escaped)
                                           ↓
OUTPUT: {"type":"delta","content":"Hello\\nworld"}

FULL SSE FORMAT:
data: {"type":"delta","content":"Hello\\nworld"}\n\n
                                         ↑      ↑
                              JSON escaped    SSE line terminator

FRONTEND PARSING:
─────────────────────────────────────────────────────────────────────
line = "data: {\"type\":\"delta\",\"content\":\"Hello\\nworld\"}"
extracted = line.slice(6)  →  "{\"type\":\"delta\",\"content\":\"Hello\\nworld\"}"
parsed = JSON.parse(extracted)
                    ↓
        Automatic unescaping by JSON.parse()
                    ↓
parsed.content = "Hello\nworld"  ✅ CORRECT

RESULT:
✅ Newlines in content are preserved
✅ SSE format remains valid
✅ No ambiguity between content newlines and format newlines
```

## Real-Time Rendering with flushSync()

```
┌──────────────────────────────────────────────────────────────────────┐
│                 REACT RENDER OPTIMIZATION                            │
└──────────────────────────────────────────────────────────────────────┘

WITHOUT flushSync():
────────────────────────────────────────────────────────────────────
Token arrives → State update → Batch with other updates → Render later
                                                            ↓
                                           User sees: "Hello     " (delayed)
                                                      "Hello worl" (delayed)
                                                      "Hello world" (delayed)

WITH flushSync():
────────────────────────────────────────────────────────────────────
Token arrives → State update → FORCE IMMEDIATE RENDER → User sees NOW
                                        ↓
                          flushSync(() => {
                            setMessages(prev =>
                              prev.map(msg =>
                                msg.id === id
                                  ? { ...msg, content: newContent }
                                  : msg
                              )
                            );
                          });

RESULT:
✅ Sub-millisecond UI updates
✅ True real-time streaming experience
✅ Characters appear as they're generated
```

## Error Handling Flow

```
┌──────────────────────────────────────────────────────────────────────┐
│                       ERROR SCENARIOS                                │
└──────────────────────────────────────────────────────────────────────┘

SCENARIO 1: Invalid JSON from OpenAI
────────────────────────────────────────────────────────────────────
Backend receives: "data: {invalid json}\n\n"
                       ↓
                  try { JSON.parse() }
                  catch (e) {
                    // Skip invalid line silently
                  }
                       ↓
Result: ✅ Stream continues, no crash

SCENARIO 2: Network timeout
────────────────────────────────────────────────────────────────────
Frontend: No data for 30 seconds
                       ↓
            resetStreamTimeout() triggers
                       ↓
            reader.cancel()
                       ↓
            throw Error('Stream timeout')
                       ↓
Result: ✅ User sees error toast, can retry

SCENARIO 3: OpenAI error response
────────────────────────────────────────────────────────────────────
OpenAI sends: data: {"error":{"message":"Rate limit exceeded"}}\n\n
                       ↓
Backend detects: if (data.error)
                       ↓
Transforms to: data: {"type":"error","message":"Rate limit..."}\n\n
                       ↓
Frontend receives: if (data.type === 'error')
                       ↓
Result: ✅ User sees error message in chat
```

---

**Note:** This diagram represents the actual implementation in:
- `/home/runner/workspace/server/routes.ts`
- `/home/runner/workspace/client/src/components/SupportChat.tsx`
- `/home/runner/workspace/server/chatService.ts`
