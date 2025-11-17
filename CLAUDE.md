# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Kull is a photography culling platform that helps professional photographers rate, describe, and tag entire shoots using AI. The application consists of:

- **Web application** (Vite + React) - Sales/marketing site and subscription backend
- **Express API** (TypeScript) - Authentication, billing, prompts marketplace, and orchestration APIs
- **Future native apps** - macOS menubar app and iOS/iPadOS companion (planned)

The current implementation is a monolithic full-stack web app with planned expansion to native desktop and mobile clients.

## Development Commands

```bash
# Development
npm run dev          # Start Express API + Vite dev server (hot reload)

# Type checking
npm run check        # TypeScript type checking across all files

# Production
npm run build        # Build client (Vite) + bundle server (esbuild)
npm start            # Run bundled production server

# Database
npm run db:push      # Push schema changes to database (Drizzle)
```

## Architecture

### Directory Structure

- `client/` - React frontend (Vite)
  - `src/components/` - UI components (shadcn/ui + custom)
  - `src/pages/` - Page components (routed via wouter)
  - `src/services/` - API clients and WebSocket service
  - `src/hooks/` - React hooks for data fetching and state
- `server/` - Express backend
  - `routes/` - API route handlers (prompts, credits, device-auth, sync, reports, exports)
  - `auth/` - Device authentication and JWT token management
  - `storage.ts` - Database abstraction layer (implements IStorage interface)
  - `websocket.ts` - WebSocket server for real-time sync
  - `chatService.ts` - Support chat integration
- `shared/` - Shared TypeScript code
  - `schema.ts` - Drizzle database schema and Zod validation
  - `types/` - TypeScript types for sync, credits, devices, marketplace, reports

### Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Wouter (routing), TanStack Query
- **Backend**: Express, TypeScript, Drizzle ORM, PostgreSQL (Neon serverless)
- **Real-time**: WebSocket (ws library) for bidirectional sync
- **Authentication**: Replit Auth (web), JWT tokens (native devices)
- **Payments**: Stripe (subscriptions + one-time credit purchases)
- **Forms**: React Hook Form + Zod validation

### Database Schema

All database tables are defined in `shared/schema.ts`:

- `users` - User accounts with Stripe subscription data
- `prompts` - Marketplace prompts for culling profiles
- `promptVotes` - User votes on prompts (quality scoring)
- `creditTransactions` - Credit purchases and usage tracking
- `deviceSessions` - Native device authentication sessions
- `shootReports` - Generated shoot summaries with hero images
- `shootProgress` - Real-time shoot processing progress
- `chatSessions` - Support chat conversation history
- `supportQueries` - Individual support messages with cost tracking
- `referrals` - Photographer referral program
- `emailQueue` - Scheduled email campaigns

Access patterns use the `storage.ts` abstraction (implements `IStorage` interface). Always use `storage.*` methods rather than direct Drizzle queries.

## Key Systems

### 1. WebSocket Real-Time Sync

Location: `server/websocket.ts`, `client/src/services/websocket.ts`

**Server-side**: WebSocket server on `/ws` path manages user connection pools and broadcasts sync messages (shoot progress, credit updates, prompt changes, device connections).

**Client-side**: Singleton WebSocket service with auto-reconnection, exponential backoff, and type-safe message handling.

**Authentication**:
- Web apps: `ws://host/ws?token=userId`
- Native apps: `ws://host/ws?token=userId:deviceId`

**Triggering sync from server**:
```typescript
import { getGlobalWsService } from './websocket';
const wsService = getGlobalWsService();
if (wsService) {
  wsService.broadcastToUser(userId, message);
}
```

**Message types**: See `shared/types/sync.ts` for all SyncMessage types (SHOOT_PROGRESS, CREDIT_UPDATE, DEVICE_CONNECTED, PROMPT_CHANGE).

### 2. Credits System

Location: `server/routes/credits.ts`, `client/src/components/credits/`

Users purchase credit packages ($500 = 50k credits, $1000 = 110k credits with bonus) via Stripe. Credits are deducted when using AI culling features. All transactions tracked in `creditTransactions` table with running balance.

**Key endpoints**:
- `GET /api/credits/balance` - Current balance
- `POST /api/credits/purchase` - Create Stripe PaymentIntent
- `POST /api/credits/purchase-confirm` - Confirm payment and add credits
- `POST /api/credits/deduct` - Deduct credits for AI usage
- `GET /api/credits/usage-summary` - Usage breakdown by provider

**Stripe webhooks**: `POST /api/stripe/webhook` handles `payment_intent.succeeded` and `payment_intent.payment_failed` events.

### 3. Device Authentication

Location: `server/routes/device-auth.ts`, `server/auth/`

Native apps authenticate via 6-digit verification codes. Flow:
1. Device requests code: `POST /api/device-auth/request-code`
2. User approves on web: `POST /api/device-auth/approve`
3. Device polls for approval: `GET /api/device-auth/poll/:code`
4. Device receives JWT token for API access

Device sessions tracked in `deviceSessions` table with push tokens for notifications.

### 4. Prompt Marketplace

Location: `server/routes/prompts.ts`, `client/src/components/marketplace/`

Community-driven marketplace for culling prompts. Each prompt defines:
- Profile type (standard, wedding, corporate, sports, portrait, product, real estate)
- System prompt and first message for AI
- Star/color rating schema (Lightroom-compatible)
- Quality score (calculated from user votes)

**Key endpoints**:
- `GET /api/prompts` - List prompts with filters (profile, tags, featured, authorId)
- `POST /api/prompts` - Create new prompt
- `POST /api/prompts/:id/vote` - Vote on prompt quality
- `POST /api/prompts/:id/use` - Increment usage counter

### 5. Shoot Reports

Location: `server/routes/reports.ts`, `client/src/components/reports/`

Auto-generated reports after shoot processing containing:
- Top 5-star hero images
- Narrative summary
- Processing statistics (provider usage, credit spend, processing time)
- Client-ready export links

Stored in `shootReports` table, accessed via:
- `GET /api/reports` - List user's reports
- `GET /api/reports/:id` - Get specific report
- `POST /api/reports` - Create new report

## Data Flow Patterns

### Client Data Fetching

Uses custom hooks wrapping fetch calls (not TanStack Query by default, though it's installed):

```typescript
// Example: useCredits hook
const { balance, loading, error, refetch } = useCredits();
```

### Server Response Format

Most endpoints return:
- Success: `{ data: T }` or direct object
- Error: `{ message: string, error?: any }`

### Real-time Updates

When data changes on server that affects multiple clients:
1. Update database via `storage.*` methods
2. Broadcast WebSocket message via `getGlobalWsService()`
3. Clients receive message and update UI (refetch or optimistic update)

## Native App Integration (Future)

The codebase is structured to support upcoming native apps:

### macOS Menubar App
- Drag-and-drop shoot ingestion
- Local AI processing (Apple Intelligence) or cloud providers
- Real-time sync via WebSocket
- Lightroom XMP metadata export

### iOS/iPadOS Companion
- Monitor shoot progress from mobile
- Browse/vote on marketplace prompts
- Purchase credits
- Trigger remote culls

### Native API Access
- Authenticate via device code flow (6-digit codes)
- Receive JWT tokens for API access
- WebSocket format: `ws://host/ws?token=userId:deviceId`
- Use same REST endpoints as web app

## Important Notes

### Authentication Context
- Web users: Replit Auth with session cookies
- Admin access: Restricted to `steve@lander.media`
- Native devices: JWT tokens from device-auth flow
- WebSocket auth: Query param token (`?token=...`)

### Credit Pricing
- All credit amounts stored in cents (100 credits = $1.00)
- $500 package = 50,000 credits
- $1000 package = 110,000 credits (includes 10k bonus)
- Provider margins already included in displayed costs

### Lightroom Integration
Culling profiles define star ratings and color labels matching Adobe Lightroom's schema:
- Stars: 1-5 (reject to hero)
- Colors: Red, Yellow, Green, Blue, Purple (or none)
- Metadata written to XMP sidecars for sync

### Email Campaigns
Drip campaigns and transactional emails queued in `emailQueue` table, processed by `emailService.ts`. Cancel drip emails when user converts or requests refund.

### Support Chat
Support chat widget powered by Claude API with prompt caching. Each query tracked in `supportQueries` with token usage and cost. Full conversations saved in `chatSessions`.

## Common Patterns

### Adding a new API endpoint
1. Define route in `server/routes/*.ts`
2. Add storage method to `storage.ts` if database access needed
3. Export router and mount in `server/routes.ts`
4. Create client-side API function in `client/src/api/*.ts`
5. Create React hook if state management needed

### Adding a new WebSocket message type
1. Define type in `shared/types/sync.ts`
2. Handle in `server/websocket.ts` message handlers
3. Handle in `client/src/services/websocket.ts` onMessage
4. Update React hooks to respond to new message type

### Adding a new database table
1. Define in `shared/schema.ts` with Drizzle schema
2. Add storage methods to `IStorage` interface and `DatabaseStorage` class
3. Run `npm run db:push` to update database
4. Create API endpoints and client hooks as needed

## Testing Considerations

- No test suite currently implemented
- Manual testing via browser DevTools and API clients
- WebSocket testing: Use browser console or dedicated WS client
- Stripe testing: Use test mode with `4242 4242 4242 4242` card
