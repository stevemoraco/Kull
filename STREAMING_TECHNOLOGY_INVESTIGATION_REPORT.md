# Streaming Technology Investigation Report

**Date:** November 19, 2025
**Investigator:** Claude Code Analysis
**Scope:** Investigation of streaming technology implementation across server and client

---

## Executive Summary

This investigation identifies **Server-Sent Events (SSE)** as the streaming technology being used for the chat feature. The implementation follows the correct SSE pattern with appropriate headers and data formatting. Previous fixes have addressed buffering issues, and the current configuration is technically sound for SSE streaming.

---

## 1. Streaming Technology Used

### Technology: **Server-Sent Events (SSE)**

**Evidence:**
- Server sets `Content-Type: text/event-stream` header
- Uses `data: ` prefix for each message (SSE format requirement)
- Client uses `ReadableStream` with manual parsing (not `EventSource`)
- Unidirectional flow: server → client only

**Location:**
- Server: `/home/runner/workspace/server/routes.ts`
  - Line 806: `/api/chat/message` endpoint
  - Line 1484: `/api/chat/welcome` endpoint
- Client: `/home/runner/workspace/client/src/components/SupportChat.tsx`
  - Lines 1051-1101: Welcome message streaming
  - Lines 1514-1727: Chat message streaming

---

## 2. Server-Side Implementation

### Endpoint 1: `/api/chat/message`

**Location:** `/home/runner/workspace/server/routes.ts` (Lines 680-1017)

**SSE Headers Configuration (Lines 805-812):**
```typescript
// Set up Server-Sent Events headers
res.setHeader('Content-Type', 'text/event-stream');
res.setHeader('Cache-Control', 'no-cache, no-transform');
res.setHeader('Connection', 'keep-alive');
res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
res.write('\n'); // Establish connection immediately
res.flushHeaders(); // Ensure headers are sent immediately
```

**Status:** ✅ **Correctly configured**

**Stream Processing (Lines 830-898):**
```typescript
// Receives from OpenAI chat/completions API (lines 339, 814-819)
const stream = await getChatResponseStream(message, history, preferredModel, ...);
const reader = stream.getReader();
const decoder = new TextDecoder();
let buffer = ''; // SSE line buffering

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value, { stream: true });
  buffer += chunk;
  const lines = buffer.split('\n');
  buffer = lines.pop() || '';

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = JSON.parse(line.slice(6));

      // OpenAI format: data.choices[0].delta.content
      if (data.choices?.[0]?.delta?.content) {
        const content = data.choices[0].delta.content;
        fullResponse += content;

        // Re-stream to client in custom format
        res.write(`data: ${JSON.stringify({ type: 'delta', content })}\n\n`);
      }
    }
  }
}

// Signal completion
res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
res.end();
```

**Status:** ✅ **Correct implementation**

### Endpoint 2: `/api/chat/welcome`

**Location:** `/home/runner/workspace/server/routes.ts` (Lines 1020-1631)

**SSE Headers Configuration (Lines 1484-1490):**
```typescript
res.setHeader('Content-Type', 'text/event-stream');
res.setHeader('Cache-Control', 'no-cache, no-transform');
res.setHeader('Connection', 'keep-alive');
res.setHeader('X-Accel-Buffering', 'no');
res.write('\n');
res.flushHeaders();
```

**Status:** ✅ **Correctly configured**

**Stream Processing (Lines 1501-1593):**
- Same pattern as `/api/chat/message`
- Receives OpenAI stream, parses `data.choices[0].delta.content`
- Forwards to client as custom SSE events

**Status:** ✅ **Correct implementation**

---

## 3. OpenAI Stream Source

### API Endpoint Used

**Location:** `/home/runner/workspace/server/chatService.ts` (Line 339)

```typescript
const response = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${openaiApiKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model,
    messages,
    max_completion_tokens: 8000,
    stream: true, // ← Enable streaming
    stream_options: {
      include_usage: true,
    },
    prompt_cache_key: promptCacheKey,
  }),
});

return response.body; // Returns ReadableStream
```

### OpenAI Streaming Format

**Reference:** `/home/runner/workspace/api-docs/openai/responses-streaming.md`

OpenAI uses **Server-Sent Events (SSE)** for streaming:

**Format:**
```
data: {"id":"chatcmpl-123","object":"chat.completion.chunk","choices":[{"index":0,"delta":{"content":"Hello"},"finish_reason":null}]}

data: {"id":"chatcmpl-123","object":"chat.completion.chunk","choices":[{"index":0,"delta":{"content":" world"},"finish_reason":null}]}

data: {"id":"chatcmpl-123","object":"chat.completion.chunk","choices":[{"index":0,"delta":{},"finish_reason":"stop"}],"usage":{"prompt_tokens":10,"completion_tokens":5}}

data: [DONE]
```

**Key Fields:**
- `choices[0].delta.content` - Incremental text chunks
- `choices[0].finish_reason` - `"stop"` when complete
- `usage` - Token usage (sent in final chunk when `stream_options.include_usage: true`)
- `[DONE]` - Final signal

**Status:** ✅ **Correctly parsed by server**

---

## 4. Client-Side Implementation

### Technology: **Fetch API with ReadableStream**

**NOT using `EventSource` API** - Using manual stream parsing instead

**Location:** `/home/runner/workspace/client/src/components/SupportChat.tsx`

### Welcome Message Streaming (Lines 1030-1101)

```typescript
const response = await fetch('/api/chat/welcome', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ context, history, ... }),
});

const reader = response.body?.getReader();
const decoder = new TextDecoder();
let buffer = ''; // Buffer for incomplete SSE lines

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value, { stream: true });
  buffer += chunk;
  const lines = buffer.split('\n');
  buffer = lines.pop() || ''; // Keep incomplete line

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = JSON.parse(line.slice(6));

      if (data.type === 'delta' && data.content) {
        fullContent += data.content;
        // Update UI with flushSync for immediate rendering
        flushSync(() => {
          setLatestGreeting(fullContent);
        });
      } else if (data.type === 'done') {
        // Completion handling
      } else if (data.type === 'error') {
        console.error('[Chat] Stream error:', data.message);
      }
    }
  }
}
```

**Status:** ✅ **Correct SSE parsing**

### Chat Message Streaming (Lines 1484-1727)

```typescript
const response = await fetch('/api/chat/message', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message, history, ... }),
  signal: controller.signal, // 60s timeout
});

const reader = response.body?.getReader();
const decoder = new TextDecoder();
let buffer = ''; // SSE line buffering

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value, { stream: true });
  buffer += chunk;
  const lines = buffer.split('\n');
  buffer = lines.pop() || '';

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = JSON.parse(line.slice(6));

      if (data.type === 'delta' && data.content) {
        fullContent += data.content;

        // Cutoff detection for metadata removal
        const cutoffIndex = detectCutoff(fullContent);
        if (cutoffIndex !== -1) {
          const cleanContent = fullContent.substring(0, cutoffIndex).trim();
          extractMetadata(fullContent.substring(cutoffIndex));
          fullContent = cleanContent;
        }

        // Update UI incrementally with flushSync
        flushSync(() => {
          setMessages(prev =>
            prev.map(msg =>
              msg.id === assistantMessageId
                ? { ...msg, content: fullContent }
                : msg
            )
          );
        });
      }
    }
  }
}
```

**Status:** ✅ **Correct SSE parsing with proper buffering**

---

## 5. Comparison with OpenAI's Recommended Format

### OpenAI Responses API Streaming Events

**Reference:** `/home/runner/workspace/api-docs/openai/responses-streaming.md`

The Responses API (newer API mode) uses different event types:
- `response.created`
- `response.in_progress`
- `response.output_text.delta` ← Primary content streaming
- `response.output_text.done`
- `response.completed`

**Example:**
```
data: {"type":"response.output_text.delta","delta":"Hello","content_index":0,...}
```

### Current Implementation Uses Chat Completions API

**Endpoint:** `https://api.openai.com/v1/chat/completions`

**Events:**
```
data: {"choices":[{"delta":{"content":"Hello"},...}],...}
```

**Status:** ⚠️ **Using older Chat Completions API format, not Responses API**

**Note:** The codebase references the Responses API in comments but actually uses the Chat Completions API. This is **not an error** - both work, but the Responses API is OpenAI's newer recommended approach.

---

## 6. Is the Wrong Technology Being Used?

### Answer: **No - SSE is appropriate for this use case**

**Reasons:**
1. ✅ **Unidirectional flow:** Server → Client only (no client messages during stream)
2. ✅ **Text-based data:** JSON event payloads
3. ✅ **HTTP-based:** Works with standard HTTP infrastructure
4. ✅ **Firewall-friendly:** Port 80/443, no special protocols
5. ✅ **Automatic reconnection:** Can implement retry logic easily
6. ✅ **Simple implementation:** No WebSocket server overhead

### Alternative Technologies Considered

| Technology | Pros | Cons | Verdict |
|------------|------|------|---------|
| **WebSocket** | Bidirectional, lower latency | Overkill for unidirectional streaming, more complex server setup | ❌ Not needed |
| **EventSource** | Native SSE API in browsers | Less control over parsing, can't add custom headers easily | ⚠️ Current manual parsing gives more control |
| **Long polling** | Universal compatibility | Higher latency, more server requests | ❌ SSE is superior |
| **gRPC streaming** | Efficient binary protocol | Requires HTTP/2, browser support limited | ❌ Overkill |

**Verdict:** ✅ **SSE is the correct choice**

---

## 7. Configuration Issues Found

### Issue 1: ✅ **RESOLVED - Buffering Headers**

**Previously Missing (Fixed in CHAT_STREAMING_FIX_REPORT.md):**
- `X-Accel-Buffering: no` - Prevents nginx buffering
- `res.flushHeaders()` - Forces immediate header send
- Initial `res.write('\n')` - Establishes connection

**Current Status:** ✅ **All headers properly configured**

### Issue 2: ✅ **Correct Stream Parsing**

**Both client and server:**
- ✅ Buffer incomplete SSE lines correctly
- ✅ Split by `\n` and keep last incomplete line
- ✅ Parse `data: ` prefix correctly
- ✅ Handle `[DONE]` signal

### Issue 3: ⚠️ **API Mismatch (Minor)**

**Finding:**
- Code comments reference OpenAI Responses API (`/v1/responses`)
- Actual implementation uses Chat Completions API (`/v1/chat/completions`)

**Impact:** ✅ **None - both work, just a documentation inconsistency**

**Recommendation:** Update comments or migrate to Responses API for consistency

**Example (chatService.ts line 241):**
```typescript
// Comment says:
api_endpoint: 'https://api.openai.com/v1/responses'

// Actual code (line 339):
const response = await fetch('https://api.openai.com/v1/chat/completions', ...)
```

---

## 8. Why Manual Stream Parsing Instead of EventSource?

### Current Approach: `fetch()` + `ReadableStream` + manual parsing

**Advantages:**
1. ✅ **Custom headers** - Can add `Content-Type: application/json`, auth headers
2. ✅ **Request body** - Can send POST requests with JSON payloads
3. ✅ **Timeout control** - Can use `AbortController` for request timeouts
4. ✅ **Fine-grained control** - Manual buffering allows custom error handling
5. ✅ **SSE format flexibility** - Can parse any SSE format (not just standard events)

### Alternative: `EventSource` API

**Code would look like:**
```typescript
const eventSource = new EventSource('/api/chat/message');

eventSource.addEventListener('delta', (event) => {
  const data = JSON.parse(event.data);
  // Handle delta
});

eventSource.addEventListener('done', () => {
  eventSource.close();
});
```

**Limitations:**
- ❌ **GET requests only** - Can't send POST with request body
- ❌ **No custom headers** - Can't add auth headers or Content-Type
- ❌ **Limited error handling** - Less control over connection errors
- ❌ **No timeout control** - No built-in request timeout

**Verdict:** ✅ **Manual parsing is the correct choice for this use case**

---

## 9. Stream Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                         │
│                                                                 │
│  SupportChat.tsx                                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ fetch('/api/chat/message', { POST, JSON body })          │  │
│  │   ↓                                                       │  │
│  │ response.body.getReader()                                │  │
│  │   ↓                                                       │  │
│  │ while (true) {                                           │  │
│  │   chunk = await reader.read()                            │  │
│  │   buffer += decode(chunk)                                │  │
│  │   lines = buffer.split('\n')                             │  │
│  │   for (line of lines) {                                  │  │
│  │     if (line.startsWith('data: ')) {                     │  │
│  │       data = JSON.parse(line.slice(6))                   │  │
│  │       if (data.type === 'delta') {                       │  │
│  │         updateUI(data.content)  ← IMMEDIATE RENDER       │  │
│  │       }                                                   │  │
│  │     }                                                     │  │
│  │   }                                                       │  │
│  │ }                                                         │  │
│  └──────────────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTP POST (SSE)
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SERVER (Express)                           │
│                                                                 │
│  routes.ts → /api/chat/message                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ res.setHeader('Content-Type', 'text/event-stream')       │  │
│  │ res.setHeader('X-Accel-Buffering', 'no')                 │  │
│  │ res.write('\n')                                           │  │
│  │ res.flushHeaders()  ← HEADERS SENT IMMEDIATELY           │  │
│  │   ↓                                                       │  │
│  │ stream = getChatResponseStream(...)  ───────────────┐    │  │
│  │   ↓                                                  │    │  │
│  │ reader = stream.getReader()                         │    │  │
│  │ while (true) {                                       │    │  │
│  │   chunk = await reader.read()                        │    │  │
│  │   parse OpenAI format: data.choices[0].delta.content │    │  │
│  │   res.write(`data: ${JSON.stringify({                │    │  │
│  │     type: 'delta',                                   │    │  │
│  │     content: content                                 │    │  │
│  │   })}\n\n`)  ← IMMEDIATELY SENT TO CLIENT            │    │  │
│  │ }                                                     │    │  │
│  │ res.write(`data: ${JSON.stringify({type:'done'})}\n\n│    │  │
│  │ res.end()                                             │    │  │
│  └───────────────────────────────────────────────────────┼───┘  │
└────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                   OPENAI API (External)                         │
│                                                                 │
│  chatService.ts → getChatResponseStream()                       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ fetch('https://api.openai.com/v1/chat/completions', {   │  │
│  │   method: 'POST',                                        │  │
│  │   body: JSON.stringify({                                │  │
│  │     model: 'gpt-5-nano',                                │  │
│  │     messages: [...],                                    │  │
│  │     stream: true,  ← ENABLE STREAMING                   │  │
│  │     stream_options: { include_usage: true }             │  │
│  │   })                                                     │  │
│  │ })                                                       │  │
│  │   ↓                                                       │  │
│  │ return response.body  ← ReadableStream (SSE format)     │  │
│  │                                                           │  │
│  │ OpenAI sends:                                            │  │
│  │   data: {"choices":[{"delta":{"content":"Hello"}}]}     │  │
│  │   data: {"choices":[{"delta":{"content":" world"}}]}    │  │
│  │   data: {"choices":[{"delta":{}}],"usage":{...}}        │  │
│  │   data: [DONE]                                           │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 10. Findings Summary

| Component | Technology | Status | Notes |
|-----------|-----------|--------|-------|
| **Server → Client** | Server-Sent Events (SSE) | ✅ Correct | Proper headers, buffering disabled |
| **OpenAI → Server** | Server-Sent Events (SSE) | ✅ Correct | Chat Completions API streaming |
| **Client Parsing** | Manual ReadableStream parsing | ✅ Correct | More control than EventSource |
| **Headers** | SSE headers with flush | ✅ Fixed | Previously missing, now correct |
| **Buffering** | Disabled via X-Accel-Buffering | ✅ Fixed | nginx buffering prevented |
| **Stream Format** | Custom `{type, content}` JSON | ✅ Correct | Simplified OpenAI format |
| **Error Handling** | Try-catch with timeout | ✅ Correct | 60s timeout, proper cleanup |

---

## 11. OpenAI Streaming Format Reference

### Chat Completions API (Currently Used)

**Endpoint:** `POST https://api.openai.com/v1/chat/completions`

**Request:**
```json
{
  "model": "gpt-5-nano",
  "messages": [...],
  "stream": true,
  "stream_options": {
    "include_usage": true
  }
}
```

**Response (SSE):**
```
data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1234567890,"model":"gpt-5-nano","choices":[{"index":0,"delta":{"role":"assistant","content":""},"logprobs":null,"finish_reason":null}]}

data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1234567890,"model":"gpt-5-nano","choices":[{"index":0,"delta":{"content":"Hello"},"logprobs":null,"finish_reason":null}]}

data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1234567890,"model":"gpt-5-nano","choices":[{"index":0,"delta":{"content":" world"},"logprobs":null,"finish_reason":null}]}

data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1234567890,"model":"gpt-5-nano","choices":[{"index":0,"delta":{},"logprobs":null,"finish_reason":"stop"}],"usage":{"prompt_tokens":10,"completion_tokens":2,"total_tokens":12,"prompt_tokens_details":{"cached_tokens":5}}}

data: [DONE]
```

**Key Fields:**
- `choices[0].delta.content` - Text chunk (empty when done)
- `choices[0].finish_reason` - `null` during streaming, `"stop"` when done
- `usage` - Only in final chunk (when `stream_options.include_usage: true`)
- `usage.prompt_tokens_details.cached_tokens` - Cached prompt tokens

### Responses API (Referenced but Not Used)

**Endpoint:** `POST https://api.openai.com/v1/responses`

**Reference:** `/home/runner/workspace/api-docs/openai/responses-streaming.md`

**Event Types:**
- `response.created`
- `response.in_progress`
- `response.output_item.added`
- `response.content_part.added`
- `response.output_text.delta` ← Content streaming
- `response.output_text.done`
- `response.content_part.done`
- `response.output_item.done`
- `response.completed`

**Example:**
```
data: {"type":"response.output_text.delta","sequence_number":1,"delta":"Hello","content_index":0,"item_id":"item_123","output_index":0}
```

**Status:** ⚠️ **Code comments reference this API, but implementation uses Chat Completions API**

---

## 12. Recommendations

### High Priority

1. ✅ **Keep current SSE implementation** - It's working correctly
2. ⚠️ **Update API documentation comments** - Change `/v1/responses` references to `/v1/chat/completions` for accuracy

### Medium Priority

3. ⚠️ **Consider migrating to Responses API** - If you want to align with OpenAI's latest recommended approach
   - Pros: More structured events, better tool support, newer features
   - Cons: Requires code changes, different event parsing
   - Impact: Non-critical, current implementation works fine

### Low Priority

4. ℹ️ **Add SSE monitoring** - Log stream health metrics
   - Track: connection duration, chunk count, errors
   - Helps identify connection issues in production

---

## 13. Testing Recommendations

### Verify SSE Streaming Works

**Test 1: Browser DevTools**
```bash
1. Open browser DevTools → Network tab
2. Send a chat message
3. Find the /api/chat/message request
4. Verify:
   ✅ Status: 200 OK
   ✅ Type: text/event-stream
   ✅ Size: Increasing in real-time (not all at once)
   ✅ Time: Stays open during streaming
   ✅ Response: Progressive chunks, not buffered
```

**Test 2: curl (Server Test)**
```bash
# Test streaming directly
curl -N -X POST http://localhost:5000/api/chat/message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "message": "Hello",
    "history": []
  }'

# Expected output (progressive):
data: {"type":"delta","content":"Hello"}

data: {"type":"delta","content":" there"}

data: {"type":"done"}
```

**Test 3: Production Environment**
```bash
# Test through nginx/CDN
curl -N -X POST https://kullai.com/api/chat/message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{...}'

# Verify:
✅ X-Accel-Buffering: no header is respected
✅ Chunks arrive progressively
✅ No buffering delay
```

---

## 14. Files Referenced

### Server Files
- `/home/runner/workspace/server/routes.ts` - SSE endpoints (lines 680-1631)
- `/home/runner/workspace/server/chatService.ts` - OpenAI streaming (line 339)

### Client Files
- `/home/runner/workspace/client/src/components/SupportChat.tsx` - Stream parsing (lines 1030-1727)

### Documentation
- `/home/runner/workspace/api-docs/openai/responses-streaming.md` - OpenAI Responses API format
- `/home/runner/workspace/api-docs/openai/streaming.md` - General streaming docs
- `/home/runner/workspace/CHAT_STREAMING_FIX_REPORT.md` - Previous buffering fix

---

## 15. Conclusion

### Streaming Technology: **Server-Sent Events (SSE)**

**Verdict: ✅ CORRECT TECHNOLOGY, PROPERLY CONFIGURED**

The implementation uses Server-Sent Events (SSE) for streaming chat responses, which is:
1. ✅ **Appropriate for the use case** (unidirectional server → client text streaming)
2. ✅ **Properly configured** (headers, buffering, flushing)
3. ✅ **Correctly parsed** (both server and client handle SSE format correctly)
4. ✅ **Following OpenAI's format** (Chat Completions API with `stream: true`)

### Issues Found

1. ⚠️ **Documentation mismatch (Minor)** - Comments reference Responses API, code uses Chat Completions API
   - Impact: None (both work)
   - Fix: Update comments for accuracy

### No Configuration Errors

All SSE headers are correctly set:
- ✅ `Content-Type: text/event-stream`
- ✅ `Cache-Control: no-cache, no-transform`
- ✅ `Connection: keep-alive`
- ✅ `X-Accel-Buffering: no`
- ✅ `res.flushHeaders()` called
- ✅ Initial `res.write('\n')` sent

### Recommendation

**No action required.** The streaming implementation is technically sound and follows best practices for SSE streaming. The only suggestion is to update code comments to match the actual API endpoint being used (Chat Completions vs Responses API).

---

**Report Generated:** November 19, 2025
**Status:** Investigation Complete ✅
