# Kull AI - AI-Powered Photo Rating Sales Funnel

## Overview
Kull AI is a premium SaaS application that uses 5 advanced AI models (Gemini, Grok, Groq, Claude, OpenAI) to rate photos in Lightroom with 1-5 stars in real-time. This is a high-converting sales funnel website built following Alex Hormozi's Grand Slam Offer framework.

## Current State
- **Status**: MVP Complete - Full sales funnel with authentication, pricing, and referral system
- **Last Updated**: November 3, 2025
- **Deployment URL**: kullai.com

## Project Architecture

### Tech Stack
- **Frontend**: React + TypeScript, Tailwind CSS, Shadcn UI
- **Backend**: Express.js, Node.js
- **Database**: PostgreSQL (Neon)
- **Authentication**: Replit Auth (OIDC)
- **Payments**: Stripe Subscriptions
- **Email**: SendGrid (planned for future)

### Key Features Implemented

#### Landing Page (Public)
- Hero section with compelling value proposition
- Problem section highlighting photographer pain points
- Solution section showcasing 5 AI models
- Value stack with core + bonus features
- Pricing section ($99/mo Professional, $499/mo Studio)
- Referral program explanation (1-10 photographer referrals)
- FAQ accordion
- Footer with legal info and branding

#### Authentication
- Replit Auth integration (Google, GitHub, X, Apple, Email)
- Automatic 1-day free trial on signup
- 24-hour special offer timer (3 extra months free on annual plans)
- Session management with PostgreSQL

#### Home Page (Authenticated)
- Welcome message with trial status
- Urgency banner showing 24-hour special offer countdown
- Download links for Mac DMG and iOS app
- Pricing cards for plan selection
- Referral form with bonus tracking
- Real-time referral stats

#### Subscription & Checkout
- Stripe Elements integration for secure payment
- Two pricing tiers:
  - Professional: $99/mo ($1,188/year - save $396)
  - Studio: $499/mo ($5,988/year - save $2,004)
- Annual billing with monthly price display
- Automatic subscription management

#### Referral System
- Track up to 10 photographer referrals
- Bonus tiers:
  - 1 referral: Bonus features
  - 3 referrals: 1 month free
  - 5 referrals: Priority support upgrade
  - 10 referrals: 3 months free
- Real-time referral status tracking
- Email invitation system

### Database Schema

#### Users Table
- Core fields: id, email, firstName, lastName, profileImageUrl
- Stripe fields: stripeCustomerId, stripeSubscriptionId
- Subscription: subscriptionTier, subscriptionStatus
- Trial tracking: trialStartedAt, trialEndsAt, specialOfferExpiresAt
- Timestamps: createdAt, updatedAt

#### Referrals Table
- id, referrerId, referredEmail, referredUserId
- status ('pending', 'completed')
- bonusUnlocked (1, 3, 5, or 10)
- createdAt

#### Sessions Table
- Managed by Replit Auth
- sid, sess, expire

### API Endpoints

#### Authentication
- `GET /api/login` - Start Replit Auth flow
- `GET /api/callback` - Auth callback handler
- `GET /api/logout` - End user session
- `GET /api/auth/user` - Get current user (protected)

#### Subscriptions
- `POST /api/trial/start` - Start 1-day free trial (protected)
- `POST /api/create-subscription` - Create Stripe subscription (protected)
  - Request body: `{ tier: 'professional' | 'studio' }`
  - Returns: `{ subscriptionId, clientSecret }`

#### Referrals
- `POST /api/referrals` - Create referral (protected)
  - Request body: `{ referredEmail: string }`
- `GET /api/referrals` - Get user's referrals (protected)

### Design System

#### Colors
- Primary: Purple (#8B5CF6) - Used for CTAs, accents, highlights
- Background: Light gray (#FAFAFA) / Dark gray (#141414)
- Cards: Slightly elevated from background
- Text hierarchy: Default, Secondary (muted), Tertiary (very muted)

#### Typography
- Font: Inter (400-900 weights)
- Hero headlines: 5xl-7xl, font-black
- Section headers: 3xl-5xl, font-bold
- Body: base-lg, leading-relaxed
- CTAs: lg-xl, font-semibold, uppercase tracking

#### Components
- Buttons: Shadcn Button with hover-elevate/active-elevate-2
- Cards: rounded-2xl, shadow-lg, hover-elevate
- Forms: Shadcn Form + react-hook-form + zod validation
- Icons: Lucide React

### User Journey

#### New User Flow
1. Land on homepage → See hero + value proposition
2. Click "Start Free Trial" → Redirect to /api/login
3. Sign in with Replit Auth → Auto-create account with 1-day trial
4. Redirect to /home → See welcome, trial status, 24h offer timer
5. Browse pricing → Select plan → Checkout page
6. Complete Stripe payment → Subscription activated
7. Access download links for Mac DMG and iOS app
8. Optionally refer photographers → Unlock bonuses

#### Referral Flow
1. User enters photographer email in referral form
2. System creates pending referral record
3. When referee signs up (detected by email match) → Status: completed
4. Bonus unlocked based on total completed referrals
5. User sees real-time stats and progress

### Environment Variables

#### Required
- `DATABASE_URL` - PostgreSQL connection string (auto-configured)
- `SESSION_SECRET` - Session encryption key (auto-configured)
- `REPL_ID` - Replit project ID (auto-configured)
- `VITE_STRIPE_PUBLIC_KEY` - Stripe publishable key (configured)
- `STRIPE_SECRET_KEY` - Stripe secret key (configured)

#### Optional
- `STRIPE_PROFESSIONAL_PRICE_ID` - Stripe price ID for Professional tier
- `STRIPE_STUDIO_PRICE_ID` - Stripe price ID for Studio tier
- `ISSUER_URL` - OIDC issuer (defaults to Replit)

### Running the Project

#### Development
```bash
npm run dev
```
- Runs on http://0.0.0.0:5000
- Auto-reloads on file changes
- Vite HMR for frontend
- tsx watch for backend

#### Database
```bash
npm run db:push        # Push schema changes
npm run db:push --force # Force push if conflicts
```

### SEO & Social Sharing

#### Meta Tags
- Title: "Kull AI - AI-Powered Photo Rating for Lightroom | Rate 1000+ Photos in Minutes"
- Description: Detailed value proposition for search engines
- Open Graph tags for Facebook/LinkedIn sharing
- Twitter Card tags for Twitter sharing
- Custom OG image: https://kullai.com/og-image.jpg

#### Social Sharing Features
- iMessage preview optimization
- Rich link previews across all platforms
- Structured data for search engines

### Branding & Legal

#### Footer Information
- Copyright: © 2025 Lander Media
- Address: 31 N Tejon St Colorado Springs CO 80903
- Powered by: heydata.org
- Links: Privacy, Terms, Refunds, Support, Contact

### Future Enhancements (Not in MVP)

#### Email Integration
- SendGrid for transactional emails
- Welcome email on signup
- Trial reminder (20 hours remaining)
- Special offer expiration warning
- Referral invitation emails
- Payment receipts

#### Analytics & Tracking
- User behavior tracking
- Conversion funnel analysis
- A/B testing framework
- Heatmaps and session recordings

#### Features
- Referral dashboard with sharing tools
- User account settings
- Subscription management portal
- Download history tracking
- Video testimonials
- Live user count display
- Exit intent popup with discount

### Notes

#### Design Philosophy
- Mobile-first responsive design
- Grand Slam Offer framework (value stacking, urgency, scarcity)
- Professional photography aesthetic
- High contrast, clear CTAs
- Minimal friction in signup/checkout flow

#### Conversion Optimization
- Multiple CTAs throughout page
- Social proof (500+ photographers)
- Risk reversal (1-day free trial, cancel anytime)
- Scarcity (24-hour special offer)
- Value stacking (show total value vs. price)
- Clear benefit statements (no jargon)

#### Technical Decisions
- Annual billing by default (better LTV)
- Stripe over custom payment (security, compliance)
- Replit Auth over custom (faster to market, better UX)
- PostgreSQL over NoSQL (relational data, ACID compliance)
- Shadcn UI over custom components (consistency, accessibility)
