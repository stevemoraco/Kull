# Agents & System Roles

This document coordinates the multi-agent workflow that will build and run Kull across macOS, iOS/iPadOS, and the existing web platform.

## 1. Menubar Orchestrator (macOS)

- **Surface**: Dedicated macOS window launched from the menu bar status item (not a transient popover). It accepts folder drops or lets the user browse for a shoot directory.
- **Onboarding**:
  - Triggers browser-based auth against the existing Lander backend, then deep-links back into the app with the session token.
  - Captures photographer “About me” bio, optional profile photo, and default Lightroom catalog/bookmarked folders (stored via security-scoped bookmarks).
  - For text fields (bio, prompt notes, folder annotations) offers “Speak instead” buttons that call the OpenAI transcription API.
- **Batch Prep**:
  - Lists available AI backends, sorted by effective price per 1,000 images (Apple Intelligence marked as `$0 / offline`). Cost display already includes the private 50 % margin so the user only sees credit consumption.
  - Offers default culling profiles plus marketplace/custom prompts (see §3). Each profile exposes toggles for “Generate Title”, “Generate Description”, and “Generate Tags”.
  - Resolves EXIF GPS to a human-friendly address via CoreLocation and fetches surrounding Point-of-Interest metadata so the AI understands venue context.
  - Builds structured-output requests containing up to the provider’s batch limit (e.g., 20 images) with: filename, preview blob, EXIF + address, photographer bio, prompt instructions.
- **Execution**:
  - Fires simultaneous batches up to provider rate limits. When rate-limited, jobs use exponential backoff with jitter until accepted.
  - Writes star ratings, color labels, titles, captions, keywords, and any additional IPTC metadata to XMP sidecars (and embedded metadata where supported).
  - Maintains a progress HUD in the menubar (`127 / 500 · ⏱ 00:14`) and a detailed window showing per-provider throughput, spend, and ETA.
  - Warns before a run if available credits will be exhausted; gives options to (a) auto-switch to offline Apple Intelligence, (b) buy more credits ($500/$1,000 packs), or (c) cancel.
  - When the run finishes, displays a shoot report with thumbnails of 5★ images plus a narrative summary for quick client handoff.
  - Prompts user to “Synchronize Metadata” in Lightroom (with bundled screenshot) so the library reflects ratings/colors.

## 2. Prompt Marketplace & Presets

- **Default Profiles** (all use Adobe Lightroom color labels):
  - **Standard**:  
    - ⭐ 1 = Reject (blurred/out of focus) · Red label  
    - ⭐ 2 = Technical duplicate/near-miss · No label  
    - ⭐ 3 = Usable (client proof) · Yellow label  
    - ⭐ 4 = Strong keeper · Green label  
    - ⭐ 5 = Hero/select · Blue label
  - **Wedding Storytelling**: 1★ (missed focus, Red), 2★ (family duplicate, no label), 3★ (detail/B-roll, Yellow), 4★ (moment keeper, Purple for album), 5★ (signature portraits, Blue).
  - **Corporate Event**: 1★ (blinks/motion blur, Red), 2★ (redundant speaker shots, no label), 3★ (documentation, Yellow), 4★ (press-ready, Green), 5★ (marketing hero, Blue).
  - **Sports Action**: 1★ (missed action, Red), 2★ (late/early frames, no label), 3★ (solid play, Yellow), 4★ (highlight, Green), 5★ (cover shot, Blue).
  - **Portrait Session**: 1★ (eyes closed, Red), 2★ (awkward expression, no label), 3★ (deliverable pose, Yellow), 4★ (portfolio, Green), 5★ (banner image, Purple for retouch).
  - **Product / E‑commerce**: 1★ (lighting issue, Red), 2★ (composition drift, no label), 3★ (usable listing image, Yellow), 4★ (feature image, Green), 5★ (hero campaign shot, Blue).
  - **Real Estate**: 1★ (exposure issues, Red), 2★ (redundant angle, no label), 3★ (MLS grade, Yellow), 4★ (marketing brochure, Green), 5★ (cover/front shot, Blue).
- **Marketplace Flow**:
  - Presets are stored in `packages/prompt-presets` and replicated to the backend so they sync across devices.
  - Users can browse/search all prompts even offline (local cache synced on startup). Voting, comments, and AI/human ratings sync when the network returns.
  - Custom prompt creation wizard asks for free-form instructions, generates the system prompt + first message, and allows editing before saving.
  - On completion, the AI analyzer runs once to score how well the prompt performed; users can override with their own rating.
  - Each prompt carries the creator’s avatar (from the profile photo) and username (email prefix + numeric suffix if needed).

## 3. Backend & Shared Services

- **API Gateway (apps/api)** continues to serve the web sales funnel and new orchestration endpoints. Tasks:
  - Authenticate desktop/mobile clients, issue OAuth tokens, manage credit balances, and expose marketplace APIs.
  - Proxy AI calls when we must mask provider keys; otherwise deliver signed credentials for direct-from-device usage.
  - Track batch job state (queued/running/completed), structured output payloads, billing events, and prompt telemetry.
- **Shared Packages** (`packages/shared`) supply:
  - Type-safe schemas for prompts, jobs, credit ledgers, Lightroom metadata updates.
  - Utilities for EXIF parsing, IPTC writing, and Apple Intelligence request formatting.
  - Credit accounting helpers that always include the baked-in 50 % margin before presenting numbers to the user.
- **Prompt Presets Package** (`packages/prompt-presets`) will publish default strategies and example datasets for seeding new accounts.

## 4. Mobile Companion

- **Capabilities**:
  - Mirrors the menubar dashboard: job counts, ETA, spend, AI/self ratings for the active prompt.
  - Lets the user browse the Mac’s authorized folder tree (synced via backend) and trigger new culls remotely. Launch succeeds only if the Mac app is online; otherwise, queue persists until reconnection.
  - Provides quick access to prompt marketplace, credit purchase, and profile management.
- **Limitations**: No raw thumbnails transferred to mobile to avoid storage/privacy headaches; focus is on orchestration, status, and prompt management.

## 5. Model Catalogue

- **Apple Intelligence**: On-device, free to run, unlimited photos; slower throughput but zero credits. Runs entirely within macOS/iOS frameworks and never touches the network.
- **Cloud Providers**: Gemini (2.5 Pro/Flash/Nano “Banana”), Groq (LLaMA/Vision, Kimi K2), Grok-4 Fast, Claude Haiku/Sonnet/Opus, GPT-5/GPT-5-Codex/GPT-Image models. Each exposes batch, streaming, structured outputs per the captured docs in `/API Docs`.
- **UI Presentation**: Model picker sorts by effective $/1K images (post-margin) and flags capabilities (Vision, Structured, Tags, Offline, etc.).

## 6. Distribution & Tooling

- macOS menubar app ships both as a signed DMG (for immediate distribution) and via the Mac App Store (submit once sandboxed permissions are proven).
- iOS/iPadOS universal app (App Store) shares code with macOS via Swift packages for structured-output parsing, prompt marketplace, and credit accounting.
- Repo structure:
  - `apps/web`: existing sales funnel (Vite/React).
  - `apps/api`: Express/Drizzle backend.
  - `apps/mac-menubar`: SwiftUI/AppKit menubar target.
  - `apps/mobile-companion`: SwiftUI iOS/iPad app.
  - `packages/shared`: TypeScript shared logic.
  - `packages/prompt-presets`: seed prompts + schema.
- Build scripts remain in the root `package.json` while we introduce language-specific toolchains (Xcode workspaces will sit under `apps/mac-menubar` and `apps/mobile-companion`).

## 7. Next Steps

1. Scaffold Xcode projects for macOS/iOS apps, wiring them to the shared TypeScript orchestration via gRPC/WebSockets.
2. Implement prompt marketplace endpoints and local caching layer.
3. Add credit-usage forecasting so the user is warned before a run if they’ll exceed their allowance.
4. Build AI shoot report generator leveraging the structured output payloads and saved hero frames.

This plan aligns with the live sales site, backend services already in the repo, and the expanded product vision captured in the conversation above.
