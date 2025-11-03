# Kull AI - AI-Powered Photo Rating Sales Funnel

### Overview
Kull AI is a premium SaaS application designed to empower photographers with a universal Mac/iPhone/iPad app that uses advanced AI models (Gemini, Grok, Kimi k2, Claude, GPT-5) to rate, organize, title, describe, tag, and color-code photos from any folder on your Mac with 1-5 stars in real-time. This project is a high-converting sales funnel website built on Alex Hormozi's Grand Slam Offer framework, aiming for significant market potential in the photography industry. It provides a seamless user journey from trial to paid subscription, incorporating sophisticated payment, referral, and AI-powered customer support systems.

### User Preferences
I prefer simple language in explanations. I want iterative development with clear communication at each step. Ask before making major changes or decisions. Do not make changes to the existing folder structure unless explicitly requested. I prefer detailed explanations for complex technical decisions.

### System Architecture
Kull AI is built with a modern web stack. The **Frontend** uses React with TypeScript, Tailwind CSS, and Shadcn UI for a responsive and consistent user experience. **UI/UX decisions** emphasize a mobile-first, responsive design following the Grand Slam Offer framework with high contrast, clear CTAs, and a professional photography aesthetic. **Backend** services are powered by Express.js and Node.js. **Technical implementations** include a robust pre-authorization trial system using Stripe's SetupIntent, a database-backed email queue for transactional communications via SendGrid, and an AI-powered customer support chat.

**Feature Specifications**:
- **Authentication**: Replit Auth provides secure login with various providers and integrates a 1-day free trial with a 24-hour special offer timer.
- **Subscription Management**: Supports two pricing tiers (Professional and Studio) with annual billing as default and a smart downgrade option to monthly if annual authorization fails.
- **Referral System**: Comprehensive referral program with full Stripe integration:
  - Multi-email submission (3 stacked fields by default, add more with "Add Photographer" button)
  - Purple glow visual highlight on first email field to draw attention
  - Real-time reward milestone reminders positioned below "Send Invites" button for mobile visibility
  - Dynamic milestone tracking that accounts for existing referrals
  - Reward tiers: 1 month free (3 referrals sent), 3 months free (10 referrals sent OR 3 referrals completed), priority support (5 referrals sent)
  - Personalized invitation emails sent to referred photographers from referrer's name and email
  - Beautiful SendGrid-powered referral invitation emails with full referrer details
  - **Stripe Checkout Integration**: Earned bonuses automatically adjust pricing during checkout, showing discounted amounts and applying reduced authorization holds
  - **Smart Monthly Downgrade**: When annual authorization fails, monthly downgrade dialog displays bonus-aware pricing and skips PaymentIntent creation for $0 amounts
  - Both referrer and referred photographer receive rewards when signup completes
- **Self-Service & Support**: Features an instant self-service refund system with mandatory survey (capturing reason, recommendation, feedback) and optional voice transcription, plus chat-first customer support strategy leveraging an AI chatbot with GitHub context.

**System Design Choices**:
- **Database**: PostgreSQL (Neon) is used for relational data, ensuring ACID compliance.
- **Payment Processing**: Stripe Subscriptions handle all payment logic securely.
- **Email Automation**: Comprehensive SendGrid-powered email system with four distinct sequences:
  - **Post-Checkout Sequence**: 5min welcome email + 45min installation check + 6hr trial ending warning + 1hr final reminder
  - **Non-Checkout Drip Campaign**: For users who sign up but don't start trial within 2 hours, automated drip emails at 2hr, 6hr, 11hr, 16hr, and 21hr intervals providing educational content, tutorials, FAQs, and value
  - **Referral Invitation Emails**: Personalized emails to referred photographers with referrer's name/email, explaining 1-day trial offer and mutual rewards for both parties
  - **Smart Scheduling**: Drip campaign automatically cancelled when user starts trial; all emails sent from steve@kullai.com with "Steve Moraco, Founder" signature and include links to support, refunds, terms, and contact pages; emails designed with beautiful HTML matching website aesthetic
- **Customer Support**: Integrates OpenAI's GPT-4o-mini for cost-effective, 24/7 AI-powered chat support, providing comprehensive answers sourced from project documentation and GitHub repository context.
- **No Public Email Addresses**: To funnel support through the AI chat first, reducing manual support burden.
- **SEO & Social Sharing**: Implemented with comprehensive meta tags (Open Graph, Twitter Cards) and custom OG images for optimal discoverability and sharing.

### External Dependencies
- **PostgreSQL (Neon)**: Main database for user, subscription, referral, and email queue data.
- **Stripe**: Handles all payment processing, subscriptions, pre-authorizations, and refunds.
- **Replit Auth**: Provides user authentication and session management.
- **SendGrid**: Fully integrated for automated transactional emails with 10 beautiful HTML templates (including referral invitations), database-backed email queue, retry logic, and 1-minute processor interval
- **OpenAI**: Powers the AI customer support chat using GPT-4o-mini.
- **Lucide React**: Provides icons for the UI.