# Kull Monorepo

Kull helps professional photographers cull, rate, describe, and tag entire shoots in minutes. The project now ships as a unified monorepo that powers:

- A macOS menubar app with drag-and-drop shoot ingestion, multi-model batching, and Lightroom-ready metadata output.
- An iOS/iPadOS companion that mirrors progress, manages prompts, and lets you trigger culls from the couch.
- A sales/marketing site and subscription backend (already live) that manage accounts, credits, and onboarding.
- A prompt marketplace where photographers share their favorite culling strategies.

Apple Intelligence runs entirely on-device for unlimited, zero-cost processing, while cloud providers (Gemini, Grok, Groq, Claude, GPT, etc.) give you the fastest possible turnaround with structured outputs.

## Repository Layout

```
apps/
  api/              # Express + Drizzle backend that powers auth, billing, prompts, and orchestration APIs
  web/              # Vite/React marketing site (existing sales funnel)
  mac-menubar/      # SwiftUI/AppKit menubar client (Xcode project scaffold coming next)
  mobile-companion/ # SwiftUI iOS/iPad app (mirrors status, manages prompts, triggers remote culls)

packages/
  shared/           # TypeScript types, EXIF/IPTC utilities, credit helpers, provider adapters
  prompt-presets/   # Default prompt definitions and seed data for the marketplace

api-docs/           # Captured markdown references for every AI provider (responses, batch, vision, pricing, models, etc.)
agents.md           # Multi-agent coordination plan for desktop, mobile, backend, and marketplace work
design_guidelines.md# Design language used on the marketing site
```

This repo will also host Xcode workspaces, DMG build scripts, and any platform-specific tooling as the native apps come online.

## Core Experience

1. **Drop a shoot folder** onto the menubar window or pick one via the file picker. We store security-scoped bookmarks so Kull can keep the folder in sync.
2. **Choose an AI model** ranked by effective cost per 1,000 images. Apple Intelligence is always available offline; cloud providers use your monthly credit allowance.
3. **Pick a culling profile** – e.g. Standard, Wedding Storytelling, Corporate Event, Sports, Portrait, Product, Real Estate – or search the community prompt marketplace. Each profile defines star + color usage and can optionally title, describe, and tag your images.
4. **Run the batch**. Kull reads EXIF data, resolves GPS coordinates to addresses + nearby venues, adds your photographer bio, and feeds the AI structured-output prompts (up to provider batch limits). Jobs run in parallel with exponential backoff for rate limits.
5. **Review progress** in the menubar indicator (`127 / 500 • ⏱ 00:14`) or on your phone. Credit usage, provider breakdowns, and ETAs stay in sync across devices.
6. **Sync back to Lightroom**. Kull writes XMP sidecars (and embedded metadata where possible). The UI reminds you to run Lightroom’s “Synchronize Metadata” so star ratings, colors, captions, and keywords appear immediately.
7. **Get a shoot report** featuring the top 5★ selects, a quick narrative summary, and links to client-ready exports.

## Default Culling Profiles

| Profile              | Stars & Colors (Lightroom labels)                                                                 |
| -------------------- | ------------------------------------------------------------------------------------------------ |
| Standard             | 1★ = reject (Red), 2★ = duplicates (none), 3★ = usable (Yellow), 4★ = strong keeper (Green), 5★ = hero (Blue) |
| Wedding Storytelling | 1★ miss focus (Red), 2★ redundant family (none), 3★ detail/B-roll (Yellow), 4★ moments (Purple), 5★ portraits (Blue) |
| Corporate Event      | 1★ blink/blur (Red), 2★ repetitive speaker (none), 3★ documentation (Yellow), 4★ press-ready (Green), 5★ marketing hero (Blue) |
| Sports Action        | 1★ missed action (Red), 2★ early/late frame (none), 3★ solid play (Yellow), 4★ highlight (Green), 5★ cover shot (Blue) |
| Portrait Session     | 1★ eyes closed (Red), 2★ awkward pose (none), 3★ deliverable (Yellow), 4★ portfolio (Green), 5★ banner (Purple) |
| Product / E‑commerce | 1★ lighting issue (Red), 2★ framing drift (none), 3★ listing image (Yellow), 4★ feature image (Green), 5★ campaign hero (Blue) |
| Real Estate          | 1★ exposure issue (Red), 2★ redundant angle (none), 3★ MLS ready (Yellow), 4★ marketing brochure (Green), 5★ cover/front (Blue) |

Each preset exposes independent toggles for Title, Description, and Tag generation so you can decide how much metadata the AI should produce.

## AI Providers

- **Apple Intelligence** – on-device, no data leaves the Mac, unlimited usage.
- **Google Gemini** – 2.5 Pro, 2.5 Flash, Nano “Banana”.
- **Groq** – Groq/LLaMA vision endpoints and Moonshot Kimi K2.
- **Grok (xAI)** – Grok-4 Fast reasoning models with async + streaming guides.
- **Anthropic Claude** – Haiku 4.5, Sonnet 4.5, Opus 4.1 with batch/image/structured APIs.
- **OpenAI** – GPT-5, GPT-5-Codex, GPT-Image, Responses API, streaming, models endpoint.

### Desktop Auth Handshake

- The desktop app calls `POST /api/device/link/initiate` to obtain a short verification code and poll token, then opens the hosted approval page with that code.
- After the user authenticates in the browser, the approval flow invokes `POST /api/device/link/approve` so the server can tie the code to the signed-in account.
- The desktop app polls `POST /api/device/link/status`; when the link is approved the response upgrades the poll request into a full session cookie, so future API calls reuse the same authenticated middleware as the web app.
- Device sessions are tagged internally and bypass the OIDC refresh-token flow, so revoking a desktop login is as simple as signing out or expiring the server session.

### iOS Companion App Snapshot

- The SwiftUI client talks to the same REST endpoints (`/api/auth/user`, `/api/kull/credits/summary`, `/api/kull/folders`, `/api/prompts`) via a lightweight `KullAPIClient`.
- Tabs include Dashboard (credits/plan summary), Folders (remote catalog synced from the menubar app), Marketplace (prompt search), and Profile (session refresh & logout).
- View models are fully async/await with unit coverage, and the package builds cleanly under `swift test` so we can iterate without Xcode.

All official docs are mirrored under `api-docs/` for offline development, including responses, batch, streaming, structured outputs, and pricing for every provider.

## Getting Started (Web/API)

```bash
npm install
npm run dev        # Starts the Express API + Vite dev server
npm run check      # Type checking
npm run build      # Production build (Vite + bundled API)
npm start          # Run the bundled API in production mode
```

Environment variables (e.g., `DATABASE_URL`, provider keys) live in the standard `.env` files referenced by the backend. The desktop and mobile apps will pull signed tokens from the API to access AI providers without shipping secrets.

- `MAPBOX_ACCESS_TOKEN` (optional) lets the EXIF pipeline resolve GPS coordinates to human-readable addresses and nearby venues for tagging. Without it, GPS enrichment simply returns empty results.

## Native App Bootstrapping

1. Install the latest Xcode and Swift toolchain.
2. Open or create the forthcoming workspaces under `apps/mac-menubar` and `apps/mobile-companion`.
3. Use the shared TypeScript packages through generated bindings (we’ll ship codegen helpers so Swift can consume the structured-output schemas).
4. DMG packaging and Mac App Store notarization scripts will live alongside the macOS project; TestFlight builds will come from the iOS workspace.

Until the Xcode targets are live, the README and `agents.md` serve as the source of truth for cross-team coordination.

## Prompt Marketplace & Accounts

- Prompt marketplace entries are stored server-side and cached locally for lightning-fast search.
- Every saved prompt records the generated system prompt, first message, optional sample output, AI quality score, and community votes.
- Users authenticate through the existing Lander site; the desktop app opens the browser for login, then reactivates itself with the granted session.
- Credits align with existing subscription tiers. Users can top up in $500/$1,000 blocks directly from desktop or mobile.

## Contributing

1. Fork the repository, create a branch, and make your changes.
2. Run the appropriate linting/build commands for any package you touch.
3. Open a pull request describing the change, screenshots for UI work, and any migration notes.

We welcome contributions to presets, AI adapters, UI/UX polish, and documentation. For bug reports or feature requests, please open an issue with reproduction steps.

## Roadmap Highlights

- Xcode project scaffolding for macOS/iOS with shared Swift packages.
- AI shoot report composer with automatic hero summaries.
- Background processing service that watches for new folders and auto-suggests runs.
- Prompt marketplace web UI (browse and vote without installing the app first).
- Windows client exploration once Apple Intelligence parity is validated.

Have feedback, ideas, or example prompts? Drop them in the prompt marketplace once the desktop app is live—or open an issue here on GitHub. We’re building this with working photographers in mind, and the community’s input keeps Kull sharp.
