# OpenAI Prompt Cache Warming System

## Overview

The cache warming system keeps OpenAI's prompt cache "hot" by periodically sending minimal requests with the static prompt content (system prompt + codebase). This significantly improves response times and reduces costs for production chat requests.

## How It Works

### Cache Layers

OpenAI's prompt caching works in layers:

1. **Layer 1 (System Prompt)**: The master sales script and instructions (~2-5k chars)
2. **Layer 2 (Knowledge Base)**: The complete codebase from GitHub (~150k+ chars)
3. **Layer 3+ (Dynamic)**: User-specific data, conversation history (NOT cached, changes per request)

### Cache TTL (Time To Live)

- OpenAI's prompt cache TTL: **5-10 minutes**
- Our warming interval: **4 minutes**
- This ensures the cache stays hot continuously

### Cost Savings

**Without cache warming:**
- First request: Full input tokens charged (~150k tokens ≈ $0.10-0.20)
- Subsequent requests: Same cost if cache expired

**With cache warming:**
- Warming cost: ~$0.001 per warmup (minimal output tokens)
- Production requests: **50-90% discount** on input tokens (cached tokens are cheaper)
- Net savings: **Massive** for high-traffic periods

## Implementation

### Files Created

- `/home/runner/workspace/server/cacheWarmer.ts` - Main cache warming module

### Files Modified

- `/home/runner/workspace/server/index.ts` - Integration point (startup + interval)

### Integration Points

**server/index.ts (lines 161-168):**

```typescript
// Warm OpenAI prompt cache immediately on startup
log('[Cache Warmer] Warming OpenAI prompt cache on startup...');
warmPromptCache().catch(err => {
  log(`[Cache Warmer] Initial cache warming failed: ${err.message}`);
});

// Start cache warming interval (every 4 minutes to keep cache hot)
startCacheWarmerInterval();
```

## API Reference

### `warmPromptCache(): Promise<void>`

Warms the prompt cache by sending a minimal request to OpenAI.

**Behavior:**
- Fetches the static knowledge base (codebase) from `getRepoContent()`
- Sends request with:
  - Model: `gpt-5-nano` (matches production)
  - System prompt: Master sales script
  - Developer context: Codebase content
  - User message: "warmup" (minimal)
  - Max tokens: 1 (we only care about caching input)
- Logs timing and cache size
- **Gracefully fails**: Errors are logged but don't crash the server

**Example Log Output:**
```
[Cache Warmer] 🔥 Starting prompt cache warming...
[Cache Warmer] 📚 Knowledge base loaded in 234ms (156k chars)
[Cache Warmer] ✅ Prompt cache warmed successfully in 892ms (API: 658ms)
[Cache Warmer] 💾 Cached 158k chars of static content
```

### `startCacheWarmerInterval(): void`

Starts the periodic cache warming interval.

**Behavior:**
- Registers `setInterval` to call `warmPromptCache()` every 4 minutes
- Logs when interval starts and each warmup execution
- **Fault tolerant**: Errors during warmup don't stop the interval

**Example Log Output:**
```
[Cache Warmer] ⏰ Starting cache warming interval (every 4 minutes)
[Cache Warmer] ✅ Cache warming interval registered

... 4 minutes later ...

[Cache Warmer] 🔄 Running scheduled cache warm-up...
[Cache Warmer] 🔥 Starting prompt cache warming...
[Cache Warmer] 📚 Knowledge base loaded in 189ms (156k chars)
[Cache Warmer] ✅ Prompt cache warmed successfully in 743ms (API: 554ms)
```

## Error Handling

### Graceful Degradation

The cache warmer is designed to **never crash the server**:

1. **No API key**: Logs warning and skips warming
2. **Network errors**: Logs error, server continues
3. **OpenAI API errors**: Logs error, server continues
4. **Interval failures**: Logs error, interval continues

### Example Error Logs

```
[Cache Warmer] OpenAI API key not configured, skipping cache warming
```

```
[Cache Warmer] ❌ Failed to warm cache: Network request failed
```

```
[Cache Warmer] ❌ Interval warming failed: Rate limit exceeded
```

## Monitoring

### What to Monitor

1. **Cache hit rate**: Check OpenAI dashboard for cached token usage
2. **Warming frequency**: Ensure interval logs appear every 4 minutes
3. **Warming failures**: Watch for error logs
4. **API timing**: `API: XXXms` should be consistent (faster = cache working)

### Success Indicators

- ✅ Cache warmer logs appear every 4 minutes
- ✅ Production requests show high `cached_tokens` in usage
- ✅ No error logs from cache warmer
- ✅ First-token-latency is low (<1s) for production requests

### Failure Indicators

- ❌ No cache warmer logs (interval not running)
- ❌ Frequent error logs
- ❌ Production requests have 0 `cached_tokens`
- ❌ First-token-latency is high (>3s) consistently

## Configuration

### Environment Variables

- `OPENAI_API_KEY` (required): OpenAI API key for chat completions

### Constants (in cacheWarmer.ts)

```typescript
const intervalMs = 4 * 60 * 1000; // 4 minutes - adjust if needed
```

**Recommendation:** Keep at 4 minutes (balance between cost and cache freshness)

- **Too frequent** (<2 min): Wastes API calls
- **Too infrequent** (>5 min): Cache may expire between warmups

## Testing

### Manual Test

1. Start the server: `npm run dev`
2. Watch for startup logs:
   ```
   [Cache Warmer] Warming OpenAI prompt cache on startup...
   [Cache Warmer] 🔥 Starting prompt cache warming...
   [Cache Warmer] ✅ Prompt cache warmed successfully in XXXms
   [Cache Warmer] ⏰ Starting cache warming interval (every 4 minutes)
   ```
3. Wait 4 minutes, check for interval log:
   ```
   [Cache Warmer] 🔄 Running scheduled cache warm-up...
   ```

### Automated Test

Run the test script:

```bash
node /tmp/test-cache-warmer.js
```

Expected output:
```
✅ cacheWarmer.ts file exists
✅ warmPromptCache function exported
✅ startCacheWarmerInterval function exported
✅ OpenAI import present
✅ getRepoContent import present
✅ Cache warmer imported in server/index.ts
✅ warmPromptCache called on startup
✅ startCacheWarmerInterval called
🎉 All checks passed!
```

## Cost Analysis

### Warming Costs

- **Frequency**: 15 warmups/hour (every 4 minutes)
- **Input tokens**: ~150,000 per warmup (system + codebase)
- **Output tokens**: 1 per warmup (max_tokens: 1)
- **Cost per warmup**: ~$0.001 (gpt-5-nano pricing)
- **Cost per hour**: ~$0.015
- **Cost per day**: ~$0.36
- **Cost per month**: ~$10.80

### Savings from Cache

Assume 100 production chat requests/day:

**Without caching:**
- Input cost: 100 × 150k tokens × $0.05/1M = $0.75/day
- Monthly: $22.50

**With caching (90% hit rate):**
- Cached input: 100 × 135k tokens × $0.01/1M = $0.135/day (cached tokens are cheaper)
- Uncached input: 100 × 15k tokens × $0.05/1M = $0.075/day
- Warming cost: $0.36/day
- Monthly: $17.55

**Net savings: $4.95/month** (plus faster response times)

**Break-even point**: ~40-50 chat requests/day

## Troubleshooting

### Cache warmer not running

**Check:**
1. Server logs for `[Cache Warmer]` messages
2. `OPENAI_API_KEY` environment variable is set
3. No TypeScript compilation errors

**Fix:**
```bash
npm run check  # Check for TypeScript errors
npm run dev    # Restart server
```

### Cache not being used in production

**Check:**
1. Production requests use same model (`gpt-5-nano`)
2. Production system prompt matches `MASTER_SALES_PROMPT`
3. OpenAI dashboard shows cached token usage

**Fix:**
- Ensure `chatService.ts` uses identical system prompt structure
- Verify model name is exact match

### High warming costs

**Check:**
1. Interval frequency (should be 4 minutes)
2. Multiple servers running (each warms separately)

**Fix:**
- Reduce interval frequency (max 5 minutes to avoid expiration)
- Use single centralized cache warmer if running multiple instances

## Future Enhancements

Potential improvements:

1. **Dynamic interval**: Adjust based on traffic patterns
2. **Cache metrics**: Track cache hit rate in database
3. **Multi-model support**: Warm cache for multiple models
4. **Adaptive warming**: Skip warmup if production request just cached
5. **Cost tracking**: Log daily/monthly warming costs

## References

- OpenAI Prompt Caching: https://platform.openai.com/docs/guides/prompt-caching
- OpenAI Pricing: https://openai.com/api/pricing/
- Kull Chat Service: `/home/runner/workspace/server/chatService.ts`
- Kull Repo Cache: `/home/runner/workspace/server/fetchRepo.ts`

---

**Last Updated**: 2025-11-20
**Author**: Claude Code
**Status**: Production Ready
