# Inline Comments Guide for Streaming Code

This guide provides copy-paste inline comments for the critical streaming sections. Add these to prevent future breaks.

---

## server/chatService.ts

### Line 1093 (Before openai.responses.create call)

```typescript
// ============================================================================
// CRITICAL: OpenAI Responses API (NOT Chat Completions)
// ============================================================================
// WHY: Responses API = 40-80% better caching, supports gpt-5-nano
// MODEL: gpt-5-nano (NOT gpt-4o - it won't work with Responses API)
// COST: $0.05/1M input tokens (6x cheaper than gpt-4o)
// CACHING: store: true + reasoning blocks = massive cost savings
//
// DO NOT CHANGE TO:
// ❌ openai.chat.completions.create() - deprecated, worse caching
// ❌ model: 'gpt-4o' - doesn't work with Responses API
// ❌ stream: false - user waits 5-10s (terrible UX)
// ❌ store: false - no caching, 40-80% cost increase
//
// See: STREAMING_ARCHITECTURE_DOCUMENTATION.md
// ============================================================================
```

### Line 1115 (Message conversion loop)

```typescript
// ============================================================================
// MESSAGE CONVERSION: Chat Completions → Responses API Format
// ============================================================================
// Responses API uses "input" parameter (NOT "messages")
// System role → User role with [SYSTEM CONTEXT] prefix (better caching)
//
// DO NOT CHANGE: This conversion is required by Responses API
// ============================================================================
```

### Line 1171 (Reasoning blocks inclusion)

```typescript
// ============================================================================
// REASONING BLOCKS: Critical for Prompt Caching Performance
// ============================================================================
// Including previous reasoning blocks improves cache hit rate by 40-80%
// These are ENCRYPTED (we can't read them), just pass through
// They tell OpenAI "this is a continuation of that conversation"
//
// DO NOT SKIP: Without reasoning blocks, caching degrades significantly
// ============================================================================
```

### Line 1268 (API call parameters)

```typescript
// ============================================================================
// RESPONSES API PARAMETERS - DO NOT MODIFY WITHOUT TESTING
// ============================================================================
// model: 'gpt-5-nano' - MUST be gpt-5 series (NOT gpt-4o)
// stream: true - MUST be true for token-by-token streaming
// store: true - MUST be true for prompt caching (40-80% cost savings)
// reasoning.effort: 'minimal' - Fast responses, low cost
// include: ['reasoning.encrypted_content'] - For caching (REQUIRED)
//
// CHANGING ANY OF THESE WILL BREAK:
// - Streaming UX (user waits for full response)
// - Prompt caching (costs increase 40-80%)
// - Model compatibility (gpt-5-nano won't work)
//
// See: STREAMING_ARCHITECTURE_DOCUMENTATION.md for full explanation
// ============================================================================
```

### Line 1343 (Chunk processing loop - text deltas)

```typescript
// ====================================================================
// STREAMING TEXT CHUNKS - Token-by-token conversion
// ====================================================================
// Responses API sends: { type: 'response.output_text.delta', delta: 'Hello' }
// We convert to: { choices: [{ delta: { content: 'Hello' } }] }
//
// WHY: routes.ts expects Chat Completions format (data.choices[0].delta.content)
// DO NOT CHANGE: Changing this format breaks routes.ts streaming parser
// ====================================================================
```

### Line 1366 (Reasoning block capture)

```typescript
// ====================================================================
// REASONING BLOCK CAPTURE - For prompt caching (DO NOT STREAM)
// ====================================================================
// These are ENCRYPTED reasoning summaries from the AI
// We SAVE them to DB and include in future requests for better caching
// We DO NOT stream them to client (they're encrypted gibberish)
//
// Impact: 40-80% cache hit rate improvement
// DO NOT SKIP: Critical for cost optimization
// ====================================================================
```

---

## server/routes.ts

### Line 866 (SSE headers setup)

```typescript
// ============================================================================
// SERVER-SENT EVENTS (SSE) HEADERS - REQUIRED FOR STREAMING
// ============================================================================
// text/event-stream: Required for browser EventSource API
// no-cache: Prevents proxies from caching responses
// keep-alive: Keeps connection open for streaming
// X-Accel-Buffering: no - Disables nginx buffering (critical for streaming)
//
// DO NOT REMOVE ANY HEADER: Each is required for proper streaming
// See: STREAMING_ARCHITECTURE_DOCUMENTATION.md for full explanation
// ============================================================================
```

### Line 1322 (Buffer for incomplete SSE lines)

```typescript
// ============================================================================
// SSE LINE BUFFERING - Handles incomplete messages across chunks
// ============================================================================
// SSE messages may arrive split across multiple network chunks
// Example: "data: {"type":"del" arrives, then "ta"}\n\n" arrives
// Buffer accumulates until we have complete \n\n delimited messages
//
// DO NOT REMOVE: Without buffer, messages get corrupted
// ============================================================================
let buffer = ''; // Buffer for incomplete SSE lines
let lineBuffer = ''; // Buffer for delimiter detection
```

### Line 1380 (Delimiter detection)

```typescript
// ====================================================================
// METADATA DELIMITER DETECTION - CRITICAL FOR CLEAN STREAMING
// ====================================================================
// AI response includes metadata at end:
// "This is the response␞QUICK_REPLIES: yes | no | maybe"
//
// We MUST:
// 1. Detect delimiter (␞, QUICK_REPLIES, NEXT_MESSAGE)
// 2. STOP streaming when delimiter detected
// 3. Parse metadata after stream completes
// 4. Strip metadata before saving to DB
//
// DO NOT REMOVE: Metadata will leak to UI, users see ugly ␞QUICK_REPLIES: ...
// ====================================================================
const hasDelimiter = lineBuffer.includes('␞') ||
                    lineBuffer.includes('QUICK_REPLIES') ||
                    lineBuffer.includes('NEXT_MESSAGE');

if (hasDelimiter) {
  // Hit metadata - stop streaming completely
  continue; // Don't send any more deltas
}
```

### Line 1398 (res.socket.uncork)

```typescript
// Send chunk immediately (don't buffer)
res.write(`data: ${JSON.stringify({ type: 'delta', content: content })}\n\n`);
res.socket.uncork(); // CRITICAL: Force immediate transmission (no buffering)
// Without uncork(), Node.js buffers data for efficiency, causing jerky streaming
```

### Line 1439 (Metadata cleanup)

```typescript
// ============================================================================
// METADATA STRIPPING - Remove all delimiter lines from response
// ============================================================================
// AI includes metadata: ␞QUICK_REPLIES: ... and ␞NEXT_MESSAGE: ...
// We MUST remove these before saving to DB and showing to user
//
// Multiple cleanup passes handle all variations:
// - Inline: "text␞QUICK_REPLIES: ..."
// - Separate line: "\n␞QUICK_REPLIES: ..."
// - Without delimiter: "\nQUICK_REPLIES: ..."
//
// DO NOT SKIP: Metadata gets saved to DB, visible in conversation history
// ============================================================================
```

---

## client/src/components/SupportChat.tsx

### Line 1357 (Buffer for incomplete SSE lines)

```typescript
// ============================================================================
// SSE LINE BUFFERING - Same logic as server-side
// ============================================================================
// SSE messages may arrive split across network chunks
// Buffer accumulates until complete message (ends with \n\n)
//
// DO NOT REMOVE: Messages get corrupted without buffer
// ============================================================================
let buffer = ''; // Buffer for incomplete SSE lines
```

### Line 1413 (flushSync for immediate updates)

```typescript
// ============================================================================
// IMMEDIATE UI UPDATE - flushSync() for smooth streaming
// ============================================================================
// React normally batches updates for performance
// Batching makes streaming appear jerky (updates in bursts)
// flushSync() forces IMMEDIATE update (smooth token-by-token)
//
// DO NOT REMOVE: Streaming becomes jerky without flushSync()
// ============================================================================
if (data.type === 'delta' && data.content) {
  fullContent += data.content;

  // Update UI immediately with flushSync (not batched)
  flushSync(() => {
    setLatestGreeting(fullContent);
  });
}
```

### Line 1467 (Client-side metadata cleanup)

```typescript
// ============================================================================
// CLIENT-SIDE METADATA CLEANUP - Backup safety net
// ============================================================================
// Primary cleanup happens server-side (routes.ts)
// This is a BACKUP in case metadata leaks through due to:
// - Server bug
// - Network issues
// - Partial metadata arrival
//
// Defense in depth: Always filter client-side too
// ============================================================================
const cutoffIndex = fullContent.indexOf('␞');
const followUpIndex = fullContent.search(/\n\n?QUICK_REPLIES:/);

if (cutoffIndex !== -1) {
  cleanContent = fullContent.substring(0, cutoffIndex).trim();
} else if (followUpIndex !== -1) {
  cleanContent = fullContent.substring(0, followUpIndex).trim();
}
```

---

## Quick Reference: What NOT to Change

### ❌ NEVER CHANGE THESE

#### In chatService.ts:
- `openai.responses.create()` → Don't change to `chat.completions.create()`
- `model: 'gpt-5-nano'` → Don't change to `'gpt-4o'`
- `stream: true` → Don't change to `false`
- `store: true` → Don't change to `false`
- `include: ['reasoning.encrypted_content']` → Don't remove
- `{ choices: [{ delta: { content } }] }` format → Don't change structure

#### In routes.ts:
- SSE headers → Don't remove any
- `buffer` variable → Don't remove
- Delimiter detection → Don't remove
- `res.socket.uncork()` → Don't remove
- Metadata stripping → Don't skip

#### In SupportChat.tsx:
- `buffer` variable → Don't remove
- `flushSync()` → Don't remove
- Client-side metadata cleanup → Don't remove

---

## Testing After Changes

Run this checklist after ANY modification to streaming code:

```bash
# 1. Start dev server
npm run dev

# 2. Open browser to http://localhost:5000

# 3. Open chat widget

# 4. Send a message

# 5. Verify:
✅ Tokens appear one-by-one (smooth streaming, not jerky)
✅ No metadata visible (no ␞QUICK_REPLIES: or ␞NEXT_MESSAGE:)
✅ Quick reply buttons appear correctly
✅ No console errors
✅ Response saves to DB correctly (check without metadata)

# 6. Check logs:
grep "🧠 Captured.*reasoning blocks" logs/*.log
# Should see reasoning blocks being captured

grep "Cache hit rate" logs/*.log
# Should see 40-80% cache hit rate after a few messages
```

---

## Emergency Rollback Commands

If streaming breaks after a change:

```bash
# 1. Check what changed
git diff server/chatService.ts server/routes.ts client/src/components/SupportChat.tsx

# 2. If you changed the API call:
git checkout server/chatService.ts
# Undo changes to chatService.ts

# 3. If you changed streaming relay:
git checkout server/routes.ts
# Undo changes to routes.ts

# 4. If you changed UI:
git checkout client/src/components/SupportChat.tsx
# Undo changes to SupportChat.tsx

# 5. Restart server
npm run dev

# 6. Test again
```

---

## Key Documentation Files

| File | Purpose |
|------|---------|
| `STREAMING_ARCHITECTURE_DOCUMENTATION.md` | Complete technical explanation of streaming architecture |
| `INLINE_COMMENTS_GUIDE.md` (this file) | Copy-paste inline comments for code |
| `CLAUDE.md` | Project-wide instructions (includes streaming warnings) |

**Read these BEFORE modifying streaming code!**

---

Last Updated: 2025-11-20
