# Kull AI - AI-Powered Photo Rating Sales Funnel

## Overview
Kull AI is a premium SaaS application that uses 5 advanced AI models you can choose from (Gemini, Grok, Kimi k2, Claude, GPT-5) to rate photos in Lightroom with 1-5 stars in real-time using low-cost batch APIs when possible. This is a high-converting sales funnel website built following Alex Hormozi's Grand Slam Offer framework.

## Current State
- **Status**: Advanced Trial System Complete - Stripe pre-authorization, SendGrid emails, and customer support chat
- **Last Updated**: November 3, 2025 (evening)
- **Deployment URL**: kullai.com

## Project Architecture

### Tech Stack
- **Frontend**: React + TypeScript, Tailwind CSS, Shadcn UI
- **Backend**: Express.js, Node.js
- **Database**: PostgreSQL (Neon)
- **Authentication**: Replit Auth (OIDC)
- **Payments**: Stripe Subscriptions
- **Email**: SendGrid (planned for future)

### Phase 2 - Advanced Trial System (November 3, 2025 - Evening)

#### Stripe Pre-Authorization Trial System
- **SetupIntent Flow**: Card verification without immediate charging
- **Pre-Authorization Holds**: Verifies cards can handle full annual amount ($1,188 Professional, $5,988 Studio)
- **Smart Downgrade**: Automatically offers monthly billing if annual authorization fails
- **Trial Conversion**: Automatic subscription activation after 24 hours with saved payment method
- **Status Progression**: none → trial → active (prevents duplicate trials)
- **Trial Cancellation**: Cancel anytime during trial with automatic email cancellation

#### SendGrid Email Automation
- **Welcome Email (5min)**: Sent 5 minutes after trial starts with installation instructions
- **Installation Check (1hr)**: Follow-up at 1 hour to ensure successful app installation
- **Trial Ending Warning (18hr)**: First reminder 6 hours before trial ends with cancellation instructions
- **Final Warning (23hr)**: Urgent reminder 1 hour before trial ends with last chance to cancel
- **Email Queue System**: Database-backed queue with scheduling, retry logic, and cancellation
- **Cron Job Endpoint**: `/api/cron/process-emails` for automated email sending
- **Smart Cancellation**: Emails automatically cancelled when user converts or cancels trial

#### Customer Support Chat
- **Floating Chat Widget**: Appears on all pages for instant support access
- **Knowledge Base**: Comprehensive answers for installation, AI models, ratings, billing, troubleshooting
- **Pattern Matching**: Intelligent responses to common questions
- **Quick Questions**: Pre-populated questions for new users
- **Chat History**: Message history with timestamps
- **Backend Endpoint**: `/api/chat/message` for processing support requests

### Phase 1 - MVP Features (Original Implementation)

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
- **Stripe Pre-Authorization**: SetupIntent for card verification before trial
- **Authorization Holds**: Places hold for annual amount to verify card capacity
- **Smart Fallback**: Offers monthly billing if annual amount can't be authorized
- Two pricing tiers:
  - Professional: $99/mo ($1,188/year - save $396)
  - Studio: $499/mo ($5,988/year - save $2,004)
- Annual billing with monthly price display
- Trial conversion with saved payment methods
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
- Stripe fields: stripeCustomerId, stripeSubscriptionId, stripePaymentMethodId, stripeSetupIntentId
- Subscription: subscriptionTier, subscriptionStatus (none, trial, active, canceled, past_due)
- Trial tracking: trialStartedAt, trialEndsAt, trialConvertedAt, specialOfferExpiresAt
- App tracking: appInstalledAt
- Timestamps: createdAt, updatedAt

#### Email Queue Table
- id, userId, emailType (welcome_5min, installation_check_1hr, trial_ending_18hr)
- recipientEmail, subject, htmlBody, textBody
- metadata (JSON for user-specific data)
- scheduledFor, sentAt, failedAt, errorMessage
- retryCount, cancelled
- createdAt

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

#### Trial & Subscriptions
- `POST /api/trial/setup-intent` - Create SetupIntent for card verification (protected)
  - Request body: `{ tier: 'professional' | 'studio' }`
  - Returns: `{ clientSecret, customerId }`
- `POST /api/trial/confirm` - Confirm trial and place authorization hold (protected)
  - Request body: `{ setupIntentId, tier }`
  - Returns: `{ success, user, authorizationId }` or 402 with downgrade offer
- `POST /api/trial/downgrade-monthly` - Downgrade to monthly if annual fails (protected)
  - Request body: `{ setupIntentId, tier }`
  - Returns: `{ success, user, billing, authorizationId }`
- `POST /api/trial/convert` - Convert trial to paid subscription (protected)
  - Request body: `{ billing: 'annual' | 'monthly' }`
  - Returns: `{ success, user, subscription }`
- `POST /api/trial/cancel` - Cancel active trial (protected)
- `POST /api/app/installed` - Mark app as installed (protected)

#### Referrals
- `POST /api/referrals` - Create referral (protected)
  - Request body: `{ referredEmail: string }`
- `GET /api/referrals` - Get user's referrals (protected)

#### Email & Support
- `POST /api/cron/process-emails` - Process pending email queue (cron job, requires secret)
- `POST /api/chat/message` - Handle customer support chat messages
  - Request body: `{ message: string, history: Message[] }`
  - Returns: `{ message: string }`

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

#### New User Flow (Updated with Pre-Authorization)
1. Land on homepage → See hero + value proposition
2. Click "Start Free Trial" → Redirect to /api/login
3. Sign in with Replit Auth → Auto-create account (status='none')
4. Redirect to /home → See pricing options and 24h special offer timer
5. Select plan (Professional or Studio) → Redirect to /checkout?plan=X
6. Checkout page:
   - Enter card details (Stripe Elements with SetupIntent)
   - System verifies card can handle annual amount
   - If annual fails → Offer downgrade to monthly billing
   - If successful → Trial starts (status='trial')
7. Receive 3 automated emails:
   - 5min: Welcome + installation instructions
   - 1hr: Installation check-in
   - 18hr: Trial ending reminder (6hrs before end)
8. Trial period (24 hours):
   - Access to customer support chat on all pages
   - Download links available
   - Can cancel anytime with zero charge
9. After 24 hours:
   - Auto-convert to paid subscription
   - Stripe charges saved payment method
   - Status changes to 'active'
10. Optionally refer photographers → Unlock bonuses

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

#### Stripe Price IDs (To Be Configured)
- `STRIPE_PROFESSIONAL_ANNUAL_PRICE_ID` - Professional annual plan price ID
- `STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID` - Professional monthly plan price ID
- `STRIPE_STUDIO_ANNUAL_PRICE_ID` - Studio annual plan price ID
- `STRIPE_STUDIO_MONTHLY_PRICE_ID` - Studio monthly plan price ID

#### Email & Jobs
- `SENDGRID_API_KEY` - SendGrid API key for transactional emails (pending)
- `CRON_SECRET` - Secret for authenticating cron job requests

#### Optional
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

### Completed Advanced Features (Phase 2)
✅ Stripe pre-authorization with card holds
✅ SendGrid transactional email sequences
✅ Customer support chat interface
✅ Email queue and scheduling system
✅ Smart downgrade flow for failed authorizations
✅ Trial conversion automation

### Future Enhancements (Not Yet Implemented)

#### Email Integration (Pending SendGrid API Key)
- ✅ Email templates created (welcome, installation check, trial ending)
- ✅ Email queue system implemented
- ✅ Automated scheduling at 5min, 1hr, 18hr intervals
- ⏳ Waiting for SendGrid API key to activate sending
- Future: Referral invitation emails, payment receipts

#### Analytics & Tracking
- User behavior tracking
- Conversion funnel analysis
- A/B testing framework
- Heatmaps and session recordings

#### Features
- Enhanced referral dashboard with sharing tools
- User account settings page
- Self-service subscription management portal
- Download history tracking
- Video testimonials section
- Live user count display
- Exit intent popup with discount
- GitHub documentation integration for chat (currently using knowledge base)

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
- **Pre-Authorization over immediate charging**: Better user experience, verifies card capacity
- **Annual billing by default**: Better LTV, larger upfront validation
- **Smart downgrade to monthly**: Reduces friction, increases conversion
- **Email queue system**: Reliable delivery, retry logic, easy monitoring
- **Pattern-matching chatbot**: Works without API keys, can upgrade to LLM later
- Stripe over custom payment (security, compliance)
- Replit Auth over custom (faster to market, better UX)
- PostgreSQL over NoSQL (relational data, ACID compliance)
- Shadcn UI over custom components (consistency, accessibility)
