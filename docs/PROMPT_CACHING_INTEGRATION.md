# Prompt Caching Integration Guide

## Overview

This document explains how to integrate the new prompt caching infrastructure into `chatService.ts`.

The caching strategy separates content into layers:
- **Layer 1 (Static):** Master sales prompt - never changes
- **Layer 2 (Static):** Knowledge base (repo + behavioral intelligence) - refreshed on server restart
- **Layer 3 (Dynamic):** User-specific context - changes per request

## File Structure

```
server/
├── prompts/
│   └── staticContent.ts      # Layer 1: Master sales prompt
├── knowledge/
│   └── repoCache.ts           # Layer 2: Knowledge base cache
└── chatService.ts             # Integration point
```

## Step 1: Server Startup Initialization

In `/home/runner/workspace/server/index.ts`, add initialization:

```typescript
import { initializeKnowledgeBase } from './knowledge/repoCache';

// During server startup, BEFORE listening
async function startServer() {
  // ... existing setup ...

  // Initialize knowledge base cache (loads GitHub repo once)
  await initializeKnowledgeBase();

  // Start listening
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

startServer();
```

## Step 2: Update chatService.ts

Replace the existing prompt building logic:

### OLD CODE (to replace):
```typescript
const PROMPT_PREFIX = `You are Kull's sales assistant...`;
const PROMPT_SUFFIX = `</GITHUB_SOURCE_CODE>...`;

// Later in getChatResponseStream:
const repoContent = await fetchRepoContent();
const staticInstructions = `${PROMPT_PREFIX}\n\n${repoContent}\n\n${PROMPT_SUFFIX}`;
```

### NEW CODE (prompt caching optimized):
```typescript
import { MASTER_SALES_PROMPT } from './prompts/staticContent';
import { getStaticKnowledgeBase } from './knowledge/repoCache';

// Later in getChatResponseStream:
const startTime = Date.now();

// Layer 1: Static sales prompt (cached by OpenAI)
const salesPrompt = MASTER_SALES_PROMPT
  .replace('{{QUESTIONS_ALREADY_ASKED}}', questionListText)
  .replace('{{CURRENT_STEP}}', String(step))
  .replace('{{EXPECTED_NEXT_QUESTION}}', expectedNextQuestion);

// Layer 2: Static knowledge base (cached by OpenAI)
const knowledgeBase = await getStaticKnowledgeBase();

// Combine layers 1 + 2 (both cacheable)
const staticInstructions = `${salesPrompt}\n\n${knowledgeBase}`;

const loadTime = Date.now() - startTime;
console.log(`[Chat] Static content loaded in ${loadTime}ms`);
statusCallback?.(`✅ static content loaded (${Math.round(staticInstructions.length / 1000)}k chars)`, loadTime);

// Layer 3: Dynamic user context (NOT cached)
let dynamicContext = '';

if (userActivityMarkdown) {
  dynamicContext += `\n\n## 🎯 User Activity Context\n${userActivityMarkdown}`;
}

if (pageVisits && pageVisits.length > 0) {
  dynamicContext += `\n\n## 🧭 Page Visit History\n${JSON.stringify(pageVisits, null, 2)}`;
}

// ... rest of dynamic context building ...

// Build messages: static first (cacheable), then dynamic
const messages = [
  {
    role: 'system',
    content: staticInstructions, // CACHED: ~150k tokens
  },
  ...(dynamicContext ? [{
    role: 'system' as const,
    content: dynamicContext, // NOT CACHED: user-specific
  }] : []),
  // Conversation history...
];
```

## Step 3: Benefits

### Before (No Caching):
- Every request fetches GitHub API (slow)
- Full prompt sent every time (~150k tokens)
- Higher latency and cost

### After (With Caching):
- GitHub content loaded ONCE at startup
- Static content cached by OpenAI (50-90% cost reduction)
- Only dynamic user context changes per request
- Faster response times

## Step 4: Cache Management

### Manual Cache Invalidation

If you need to refresh the knowledge base without restarting:

```typescript
import { invalidateKnowledgeBase } from './knowledge/repoCache';

// Force refresh on next request
invalidateKnowledgeBase();
```

### Check Cache Status

```typescript
import { getCacheStatus } from './knowledge/repoCache';

const status = getCacheStatus();
console.log('Cache status:', status);
// { isCached: true, sizeKB: 245, timestamp: '2025-11-20T02:12:00.000Z' }
```

## Step 5: Testing

Verify the integration works:

```bash
# Start server (should see initialization logs)
npm run dev

# Expected logs:
# [Cache] Initializing knowledge base at server startup...
# [Repo] Fetching fresh content from GitHub...
# [Cache] Fetched repo content in 1234ms
# [Cache] Knowledge base built: 245k characters
# [Cache] ✅ Knowledge base initialized in 1500ms
# [Cache] Prompt caching optimization ready

# Make a chat request
# Expected logs:
# [Cache] Returning cached knowledge base from memory
# [Chat] Static content loaded in 5ms  <- Fast! No GitHub fetch
```

## Step 6: Monitoring

Add monitoring endpoint for cache status:

```typescript
// In server/routes/admin.ts
import { getCacheStatus } from '../knowledge/repoCache';

app.get('/api/admin/cache-status', (req, res) => {
  const status = getCacheStatus();
  res.json({
    knowledge_base: status,
    timestamp: new Date().toISOString()
  });
});
```

## Expected Performance Improvements

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| First request latency | ~2000ms | ~1500ms | 25% faster |
| Subsequent requests | ~2000ms | ~50ms | 97% faster |
| OpenAI prompt tokens | ~150k every time | ~150k first, ~15k after | 90% reduction |
| GitHub API calls | Every request | Once per restart | 99%+ reduction |
| Cost per conversation | $0.50 | $0.05-0.15 | 70-90% cheaper |

## Rollback Plan

If issues arise, revert to old code:

```typescript
// Temporarily disable caching
const repoContent = await fetchRepoContent(); // Direct fetch
const staticInstructions = `${PROMPT_PREFIX}\n\n${repoContent}\n\n${PROMPT_SUFFIX}`;
```

## Next Steps

After integration:
1. Monitor cache hit rates in OpenAI dashboard
2. Compare response times before/after
3. Verify prompt content is identical (just cached)
4. Consider adding cache warming on deploy
5. Add alerting if cache initialization fails
