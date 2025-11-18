# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Vision, Mission & Values

### Vision
Kull empowers professional photographers to focus on creativity, not tedious culling. We leverage cutting-edge AI to deliver instant, accurate photo ratings that match—and often exceed—human judgment, freeing photographers to spend time on what matters: their craft and their clients.

### Mission
Build the world's fastest, most accurate, and most affordable AI photo culling platform. Every photographer, from wedding shooters to commercial studios, should have access to enterprise-grade AI that processes thousands of photos in seconds, not hours.

### Core Values

**1. Speed Above All**
- Fire all concurrent requests immediately (up to 30,000/minute)
- Never wait when you can parallelize
- Retry failures with exponential backoff, but always prioritize completion speed
- Users shouldn't wait—photoshoots should be processed in seconds, not minutes

**2. Radical Transparency**
- Show users exactly what they're paying (2x our provider costs)
- No hidden fees, no "credit" systems that obfuscate real costs
- Display token usage and provider costs in real-time
- Admin visibility into every rate limit, every retry, every failure

**3. Relentless Reliability**
- Auto-retry until 100% success—users should never see failures
- Exponential backoff for hours if needed
- Log everything for admin debugging, show nothing to users
- Tests must be 100% green before any release

**4. Security First**
- API keys NEVER leave the server
- Keychain stores ONLY user JWT tokens
- All AI requests go through backend passthrough API
- Zero-trust architecture for all native apps

**5. Model Agnosticism**
- Support ALL major providers (Anthropic, OpenAI, Google, xAI, Groq)
- Default to cheapest models that deliver quality (gpt-5-nano, gemini-2.5-flash-lite)
- Let users choose: instant (local), fast (cloud concurrent), or economy (batch API)
- Always use latest models—deprecate old ones immediately

---

## Current AI Models (2025)

### ⚠️ CRITICAL: Deprecated Models (DO NOT USE)

The following models have been **deprecated** and must NEVER be used in any code:

**OpenAI (Deprecated):**
- ❌ gpt-4o (replaced by gpt-5)
- ❌ gpt-4o-mini (replaced by gpt-5-mini)
- ❌ gpt-4-turbo (replaced by gpt-5)
- ❌ gpt-4 (replaced by gpt-5)
- ❌ gpt-3.5-turbo (fully deprecated)

**Anthropic (Deprecated):**
- ❌ claude-3-opus (replaced by claude-opus-4.1)
- ❌ claude-3-sonnet (replaced by claude-sonnet-4.5)
- ❌ claude-3-haiku (replaced by claude-haiku-4.5)
- ❌ claude-2.x (all versions deprecated)

**Google (Deprecated):**
- ❌ gemini-1.5-pro (replaced by gemini-2.5-pro)
- ❌ gemini-1.5-flash (replaced by gemini-2.5-flash)
- ❌ gemini-1.0-pro (fully deprecated)

**IF YOU SEE ANY OF THESE MODELS IN CODE OR SUGGESTIONS, IMMEDIATELY FLAG AS ERROR AND USE CURRENT MODELS INSTEAD.**

---

### ✅ Current Models (Use These)

#### Default Models (Prioritize for Speed & Cost)

**Tier 1: Ultra-Fast & Cheap (Default)**
1. **gpt-5-nano** (OpenAI)
   - Input: $0.05/1M tokens | Output: $0.40/1M tokens
   - Vision: Yes | Batch: Yes (50% off)
   - **Primary default model**

2. **gemini-2.5-flash-lite** (Google)
   - Input: $0.10/1M tokens | Output: $0.40/1M tokens
   - Vision: Yes | Batch: Yes (50% off)
   - **Cheapest option**

3. **grok-4-mini** (xAI)
   - Pricing: TBD (competitive with gpt-5-nano)
   - Vision: Yes | Batch: No
   - **Fastest inference**

**Tier 2: Balanced Quality**
4. **claude-haiku-4.5** (Anthropic)
   - Input: $1.00/1M tokens | Output: $5.00/1M tokens
   - Vision: Yes | Batch: Yes (50% off)
   - **Best reasoning for the cost**

5. **kimi-k2-instruct** (Groq)
   - Pricing: TBD (very fast, cheap)
   - Vision: Yes | Batch: No
   - **Extremely fast inference**

**Tier 3: Premium (User Opt-In)**
6. **gpt-5** (OpenAI)
   - Input: $1.25/1M tokens | Output: $10.00/1M tokens
   - Vision: Yes | Batch: Yes (50% off)

7. **claude-sonnet-4.5** (Anthropic)
   - Input: $3.00/1M tokens | Output: $15.00/1M tokens
   - Vision: Yes | Batch: Yes (50% off)
   - **Best overall quality**

8. **gemini-2.5-pro** (Google)
   - Input: $1.25/1M tokens | Output: $10.00/1M tokens
   - Vision: Yes | Batch: Yes (50% off)

**Tier 4: On-Device (Free, macOS Only)**
9. **Apple Intelligence** (VisionFoundationModel)
   - Cost: $0.00 (on-device)
   - Vision: Yes | Batch: No
   - **Free but slowest, macOS 15+ required**

---

### Pricing Model

**ALWAYS charge 2x our provider costs (50% margin).**

Example calculation:
```
Provider cost per image: $0.002
User cost: $0.004 (2x markup)

For 1000 images:
Provider cost: $2.00
User pays: $4.00
Kull profit: $2.00
```

**Display to users:**
- "This photoshoot will cost $4.00 (1000 images × $0.004)"
- "Processing with gpt-5-nano"
- Do NOT use "credits" language—just show dollar amounts from their annual subscription

**Batch API discount:**
- Economy mode uses batch APIs: 50% off provider cost
- Still charge 2x markup on the discounted price

---

## AI Processing Architecture

### Image Processing Model: 1 Image = 1 API Call

**CRITICAL**: Each image gets its own individual API call. Do NOT batch multiple images into a single API request.

**Correct approach:**
```typescript
// Fire 1,247 individual API calls concurrently
const promises = images.map(image =>
  provider.processSingleImage({ image, prompt })
);
await Promise.allSettled(promises); // All fire simultaneously
```

**Optional context images** (if affordable):
- May include 2-3 nearby images for temporal context
- Example: "This is image 47 of a wedding ceremony sequence"
- Only if token budget allows (not required)

**Why 1:1 architecture:**
- Maximize parallelization (30k requests/min)
- Independent retries per image (one failure doesn't block batch)
- Real-time progress updates (WebSocket after each image)
- Simpler error handling and cost tracking

### Structured Rating Output (CRITICAL)

**AI must return detailed numerical ratings across multiple dimensions:**

```typescript
interface PhotoRating {
  // Core metadata
  imageId: string;
  filename: string;

  // Lightroom-compatible (primary outputs)
  starRating: 1 | 2 | 3 | 4 | 5;  // Final composite score
  colorLabel: 'red' | 'yellow' | 'green' | 'blue' | 'purple' | 'none';
  keepReject: 'keep' | 'reject' | 'maybe';

  // Detailed quality metrics (1-1000 scale for slider adjustments)
  technicalQuality: {
    focusAccuracy: number;        // 1-1000: Tack-sharp (1000) to blurry (1)
    exposureQuality: number;      // 1-1000: Proper exposure (remind: RAW = fixable)
    compositionScore: number;     // 1-1000: Rule of thirds, framing, balance
    lightingQuality: number;      // 1-1000: Direction, quality, mood
    colorHarmony: number;         // 1-1000: Color balance, saturation
    noiseLevel: number;           // 1-1000: Clean (1000) to noisy (1) (inverted)
    sharpnessDetail: number;      // 1-1000: Edge definition, detail retention
    dynamicRange: number;         // 1-1000: Highlight/shadow detail
    overallTechnical: number;     // 1-1000: Composite technical score
  };

  // Subject & moment analysis (1-1000 scale)
  subjectAnalysis: {
    primarySubject: string;       // "Bride", "Groom", "Couple", "Family", etc.
    emotionIntensity: number;     // 1-1000: Peak emotion capture
    eyesOpen: boolean;            // Critical for portraits
    eyeContact: boolean;          // Looking at camera vs candid
    genuineExpression: number;    // 1-1000: Natural vs posed/fake
    facialSharpness: number;      // 1-1000: Face in focus (critical)
    bodyLanguage: number;         // 1-1000: Natural, confident posture
    momentTiming: number;         // 1-1000: Peak action/decisive moment
    storyTelling: number;         // 1-1000: Narrative strength
    uniqueness: number;           // 1-1000: Novel vs duplicate/similar
  };

  // Context & metadata
  tags: string[];                 // ["ceremony", "kiss", "emotional", "hero"]
  description: string;            // Natural language: "Bride laughing during vows..."
  similarityGroup?: string;       // Group ID for near-duplicate detection
  shootContext?: {
    eventType: string;            // "wedding", "portrait", "corporate", etc.
    shootPhase: string;           // "ceremony", "reception", "prep", etc.
    timeOfDay: string;            // "golden-hour", "midday", "evening"
    location: string;             // "indoor", "outdoor", "church", etc.
  };
}
```

**Why detailed ratings:**
- **Post-processing adjustments**: Users can tweak sliders after AI finishes
  - "Make focus more important" → boost focusAccuracy weight
  - "More loose selections" → lower all thresholds
  - "Only peak moments" → filter emotionIntensity > 900
- **Re-ranking without re-processing**: Change criteria, recalculate stars instantly
- **Learning user preferences**: Track which ratings users agree/disagree with
- **Transparency**: Users see why AI chose 5 stars vs 3 stars

**Prompt reminders for LLM:**
- "These are RAW images - exposure and white balance are fully correctable in post"
- "Rate exposure quality on whether detail is retained, not current brightness"
- "Focus and moment timing cannot be fixed - prioritize these heavily"

### Post-Processing Rating Adjustment UI

Before "Export to Lightroom", user can adjust:

```typescript
interface RatingWeights {
  focusAccuracy: number;        // 0.0-2.0 multiplier (default 1.0)
  emotionIntensity: number;     // 0.0-2.0 multiplier
  compositionScore: number;     // 0.0-2.0 multiplier
  momentTiming: number;         // 0.0-2.0 multiplier
  // ... all other metrics

  strictnessLevel: number;      // 0.0-1.0: Looser (more 5-stars) to Stricter
}

// Recalculate stars based on new weights
function recalculateStars(rating: PhotoRating, weights: RatingWeights): 1|2|3|4|5 {
  const weightedScore =
    (rating.technicalQuality.focusAccuracy * weights.focusAccuracy) +
    (rating.subjectAnalysis.emotionIntensity * weights.emotionIntensity) +
    // ... all dimensions

  // Apply strictness to threshold
  const threshold = getThreshold(weights.strictnessLevel);
  return scoreToStars(weightedScore, threshold);
}
```

**Batch API discount:**
- Provider cost: 50% off (e.g., $0.001 per image)
- User cost: Still 2x ($0.002 per image)
- User saves 50%, we maintain 50% margin

---

## Project Overview

Kull is a professional AI photo culling platform with:
- **Web application** (Vite + React) - Sales, dashboard, admin panel
- **Express API** (TypeScript) - Authentication, billing, AI orchestration
- **Universal Native App** (Swift, macOS + iOS) - Local processing, cloud sync, real-time progress

---

## Architecture

### Universal App Structure

```
apps/
└── Kull Universal App/
    └── kull/
        ├── kull.xcodeproj         # Xcode project
        ├── kull/                  # App source
        │   ├── kullApp.swift      # Main entry (macOS + iOS)
        │   ├── KullMenubarApp.swift
        │   ├── KullMobileApp.swift
        │   ├── Auth/
        │   │   ├── AuthView.swift
        │   │   ├── AuthViewModel.swift
        │   │   ├── KeychainManager.swift
        │   │   └── DeviceIDManager.swift
        │   ├── Services/
        │   │   ├── CloudAIService.swift
        │   │   ├── WebSocketService.swift
        │   │   ├── KullAPIClient.swift
        │   │   └── EnvironmentConfig.swift
        │   └── ... (other Swift files)
        └── kullTests/
```

**ALL NATIVE APP DEVELOPMENT HAPPENS IN `apps/Kull Universal App/kull/`**

Old `apps/mac-menubar/` and `apps/mobile-companion/` are deprecated—code has been migrated to universal app.

---

### Backend Structure

```
server/
├── config/
│   └── environment.ts         # Centralized config (API keys server-side only)
├── ai/
│   ├── BaseProviderAdapter.ts
│   ├── providers/
│   │   ├── AnthropicAdapter.ts
│   │   ├── OpenAIAdapter.ts
│   │   ├── GoogleAdapter.ts
│   │   ├── GrokAdapter.ts
│   │   └── GroqAdapter.ts
│   ├── BatchProcessor.ts
│   └── BatchJobQueue.ts
├── routes/
│   ├── ai-passthrough.ts      # NEW: Passthrough API for native apps
│   ├── batch.ts               # NEW: Batch processing endpoints
│   ├── device-auth.ts
│   ├── credits.ts
│   ├── prompts.ts
│   └── reports.ts
└── ... (existing files)
```

---

## Key Systems

### 1. AI Provider Passthrough API (NEW)

**Architecture:** Native apps NEVER store provider API keys. All AI requests go through backend.

```
Native App → Backend Passthrough API → Provider API
  (JWT auth)   (Provider API key)      (OpenAI, Anthropic, etc.)
```

**Endpoints:**
- `POST /api/ai/process-single` - Process one image, return result + cost
- `POST /api/ai/process-batch` - Submit batch job (if provider supports)
- `GET /api/ai/batch-status/:jobId` - Check batch progress
- `GET /api/ai/batch-results/:jobId` - Retrieve completed results
- `GET /api/ai/providers` - List available providers and pricing

**Concurrency Strategy:**
- Fire ALL photos simultaneously (up to 30k/min rate limit)
- Exponential backoff on rate limit errors: 1s → 2s → 4s → 8s → 16s → 32s → 60s (max)
- Retry for up to 6 hours on failures
- Different backoff for different errors (rate limits = aggressive, others = cautious)
- Never show failures to users—only log for admin

**Security:**
- All provider API keys stored in `server/config/environment.ts`
- Loaded from environment variables (NEVER commit to repo)
- Native apps send JWT Bearer token, backend validates and proxies to provider
- Keychain stores ONLY user JWT tokens (access + refresh)

---

### 2. WebSocket Real-Time Sync

**Server:** `server/websocket.ts` (fully implemented)
**Native Client:** `apps/Kull Universal App/kull/kull/WebSocketService.swift` (NEW)

**Authentication:**
- Web: `ws://host/ws?token=userId`
- Native: `ws://host/ws?token=userId:deviceId`

**Message Types** (`shared/types/sync.ts`):
- `SHOOT_PROGRESS` - Real-time progress updates (every image processed)
- `CREDIT_UPDATE` - Balance changes (immediate)
- `DEVICE_CONNECTED` / `DEVICE_DISCONNECTED` - Multi-device sync
- `PROMPT_CHANGE` - Marketplace updates

**Native Implementation:**
- Use `URLSessionWebSocketTask` (native iOS/macOS)
- Auto-reconnect with exponential backoff
- Type-safe message handlers via `SyncCoordinator`

---

### 3. Device Authentication

**Flow:**
1. Native app requests 6-digit code: `POST /api/device-auth/request`
2. User enters code on web: `POST /api/device-auth/approve`
3. Native app polls: `GET /api/device-auth/status/:code`
4. Backend returns JWT access + refresh tokens
5. Native app stores tokens in Keychain (NEVER stores provider API keys)

**Token Management:**
- Access token: 1 hour expiry
- Refresh token: 30 days expiry
- Auto-refresh when <5 minutes remaining
- On 401 error: refresh token and retry request

---

### 4. Credits System → Pricing Transparency

**OLD (Deprecated):** "Credits" abstraction (confusing)
**NEW:** Show real costs to users

**Display in UI:**
```
Processing 1,247 images with gpt-5-nano
Estimated cost: $4.98
(Provider: $2.49 | Kull: $2.49)
```

**Backend tracking:**
- Still use `creditTransactions` table for accounting
- Convert token costs to dollars: `(inputTokens * inputCost + outputTokens * outputCost) / 1_000_000`
- Charge user: `providerCost * 2`
- Deduct from user's annual subscription balance

**Annual Subscription:**
- Users pay upfront (e.g., $1000/year)
- Balance decreases as they process shoots
- Show remaining balance in dashboard
- Alert when <$100 remaining

---

### 5. Native App Processing Modes

**User selects ONE of three modes:**

**1. Default (Fast)**
- Uses cloud models: gpt-5-nano, gemini-2.5-flash-lite
- Fires ALL photos simultaneously (up to 30k/min)
- Fastest completion (seconds for 1000 images)
- Costs 2x provider pricing

**2. Economy (Batch API)**
- Uses provider batch APIs (50% off provider cost, still 2x to user)
- User cost: Same 2x provider cost, but provider is 50% cheaper
- Submits batch, polls for completion (may take 10 minutes - 24 hours)
- Best for non-urgent shoots

**3. Local (On-Device, macOS Only)**
- Uses Apple Intelligence VisionFoundationModel
- Free ($0.00 cost)
- Very slow (processes sequentially on device)
- Complete privacy (no data sent to cloud)

**UI Example:**
```
┌─────────────────────────────────┐
│ Processing Mode                 │
├─────────────────────────────────┤
│ ○ Default (Fast)                │
│   1000 images in ~30 seconds    │
│   Cost: $4.00                   │
├─────────────────────────────────┤
│ ○ Economy (Batch)               │
│   1000 images in ~10-30 minutes │
│   Cost: $2.00 (50% off)         │
├─────────────────────────────────┤
│ ○ Local (On-Device)             │
│   1000 images in ~2 hours       │
│   Cost: FREE                    │
└─────────────────────────────────┘
```

---

## Platform-Specific Features

### iOS/iPadOS Apps

**Authentication Flow**: Custom onboarding required (different from macOS)
- Download app from App Store
- Open app → "Welcome to Kull" screen with benefits
- "Sign In" → Opens Safari with web login
- After web login → Deep link `kull://auth-success?token=...` launches app logged in
- NO manual code copying - fully automated

**File Access Pattern**: iOS restrictions require different approach
- Cannot browse arbitrary folders like macOS
- Use `UIDocumentPickerViewController` for folder selection
- Process files in app sandbox (iOS security model)
- Export XMP via share sheet back to original location

**iPad-Specific Optimizations**:
- Split-view layouts for multitasking
- Landscape-optimized UI
- Larger touch targets (44pt minimum)
- Keyboard shortcuts (Cmd+N, Cmd+,, etc.)
- Support for iPad Pro 12.9", iPad mini, standard iPad

**iOS Companion Features** (vs full macOS app):
- Monitor shoot progress in real-time
- Browse marketplace, purchase credits
- Trigger remote culls (processed on Mac)
- Push notifications for completion
- Designed as monitoring/management tool

## Development Commands

```bash
# Backend development
npm run dev          # Start Express API + Vite dev server
npm run check        # TypeScript type checking
npm run build        # Build for production
npm start            # Run production server

# Database
npm run db:push      # Push Drizzle schema changes

# Native app (from apps/Kull Universal App/kull/)
open kull.xcodeproj  # Open in Xcode
# Build: Cmd+B
# Run: Cmd+R
# Test: Cmd+U
```

---

## Testing Requirements

**ALL agents must write tests with 100% pass rate before completing.**

**Test Coverage Target: 90%+ (Full coverage)**

**Required Tests:**

**Backend:**
- Unit tests for all provider adapters
- Integration tests for passthrough API
- Batch processing end-to-end tests
- Token refresh flow tests
- WebSocket message handling tests
- Credit/pricing calculation tests

**Native App:**
- Unit tests for KeychainManager, DeviceIDManager
- Unit tests for CloudAIService, WebSocketService
- Integration tests for auth flow
- UI tests for critical paths (auth, processing, settings)
- Mock all network requests in tests

**Test Framework:**
- Backend: Vitest (already configured)
- Native: XCTest (built into Xcode)

**Running Tests:**
```bash
# Backend
npm test

# Native app
cd apps/Kull\ Universal\ App/kull/
xcodebuild test -scheme kull -destination 'platform=macOS'
```

**Tests must be 100% green before marking any task complete.**

---

## Common Patterns

### Adding a New Provider Adapter

1. Create `server/ai/providers/NewProviderAdapter.ts`
2. Extend `BaseProviderAdapter`
3. Implement all abstract methods:
   - `processSingleImage()`
   - `submitBatch()` (throw error if not supported)
   - `checkBatchStatus()`
   - `retrieveBatchResults()`
   - `getCostPerImage()` - return cost in dollars
   - `getProviderName()`
   - `supportsBatch()`
4. Register in `server/routes/ai-passthrough.ts`
5. Add to `CloudAIService.swift` enum
6. Write tests for all methods
7. Document pricing in this file

### Adding a New WebSocket Message Type

1. Define in `shared/types/sync.ts`
2. Add handler in `server/websocket.ts`
3. Create Swift model in `SyncMessageModels.swift`
4. Register handler in `SyncCoordinator.swift`
5. Update UI to respond to message

### Adding a New API Endpoint

1. Define route in `server/routes/*.ts`
2. Add JWT verification middleware: `verifyDeviceToken`
3. Add storage method to `storage.ts` if needed
4. Call provider adapters if AI-related
5. Broadcast WebSocket updates if state changes
6. Update Swift `KullAPIClient.swift` to call endpoint
7. Write integration tests

---

## Admin Dashboard

**Location:** `client/src/pages/AdminDashboard.tsx` (existing)

**NEW Section (add to bottom):**

### AI Processing Monitor

Display real-time metrics:
- **Rate Limits:** Show provider rate limit hits per minute
- **Errors:** List all API errors with timestamps
- **Retry Stats:** Show retry counts and backoff durations
- **Active Jobs:** List all in-progress batch jobs
- **Provider Health:** Green/yellow/red status per provider

**New Endpoints:**
- `GET /api/admin/rate-limits` - Last 100 rate limit hits
- `GET /api/admin/errors` - Last 100 errors
- `GET /api/admin/active-jobs` - Current batch jobs
- `GET /api/admin/provider-health` - Status of each provider

**Implementation:** Agent B should add these routes during passthrough API work.

---

## API Documentation References

**All API docs stored in `api-docs/` directory:**

```
api-docs/
├── anthropic/
│   ├── batch-api.md
│   ├── image-input.md
│   ├── models.md
│   ├── pricing.md
│   └── structured-output.md
├── openai/
│   ├── batch-api.md
│   ├── image-input.md
│   ├── models.md
│   ├── pricing.md
│   └── structured-output.md
├── google/
│   ├── batch-api.md
│   ├── image-input.md
│   ├── models.md
│   ├── pricing.md
│   └── structured-output.md
├── grok/
│   ├── batch-api.md
│   ├── image-input.md
│   ├── models.md
│   └── structured-output.md
└── groq/
    ├── batch-api.md
    ├── image-input.md
    ├── models.md
    └── structured-output.md
```

**When implementing provider adapters, ALWAYS reference these docs for:**
- Correct model names (use current, not deprecated)
- Request/response formats
- Pricing (calculate 2x markup for users)
- Batch API usage (if supported)
- Error handling strategies

---

## Implementation Plan

**Comprehensive plan:** `/home/runner/workspace/docs/UNIVERSAL_APP_IMPLEMENTATION_PLAN.md`

**All agents must:**
1. Read this CLAUDE.md first
2. Reference the implementation plan for their specific role
3. Check API docs before implementing provider integrations
4. Write tests as they code (not after)
5. Ensure 100% test pass rate before completing

---

## Critical Reminders

### ❌ NEVER DO THESE:
1. Use deprecated models (gpt-4o, claude-3-*, gemini-1.5-*)
2. Store provider API keys in Keychain or native apps
3. Show errors to users (only log for admin)
4. Use "credits" language in UI (show dollar amounts)
5. Hardcode API URLs (use `EnvironmentConfig`)
6. Skip tests
7. Batch complete tasks before tests pass

### ✅ ALWAYS DO THESE:
1. Use current models (gpt-5-nano, claude-haiku-4.5, etc.)
2. Store ONLY JWT tokens in Keychain
3. Fire all requests concurrently (up to 30k/min)
4. Retry with exponential backoff for hours
5. Charge 2x provider costs (50% margin)
6. Show real costs to users, not "credits"
7. Write tests as you code
8. Make tests 100% green before marking complete

---

## Support & Questions

- **Documentation Issues:** Update this file immediately
- **API Questions:** Check `api-docs/` directory first
- **Architecture Questions:** Check `/home/runner/workspace/docs/UNIVERSAL_APP_IMPLEMENTATION_PLAN.md`
- **Admin Access:** steve@lander.media only

---

**Last Updated:** 2025-11-18
**Next Review:** When new AI models are released or deprecated
