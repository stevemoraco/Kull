# Kull AI - AI-Powered Photo Rating Sales Funnel

### Overview
Kull AI is a premium SaaS application designed to empower photographers by using advanced AI models (Gemini, Grok, Kimi k2, Claude, GPT-5) to rate photos in Lightroom with 1-5 stars in real-time. This project is a high-converting sales funnel website built on Alex Hormozi's Grand Slam Offer framework, aiming for significant market potential in the photography industry. It provides a seamless user journey from trial to paid subscription, incorporating sophisticated payment, referral, and AI-powered customer support systems.

### User Preferences
I prefer simple language in explanations. I want iterative development with clear communication at each step. Ask before making major changes or decisions. Do not make changes to the existing folder structure unless explicitly requested. I prefer detailed explanations for complex technical decisions.

### System Architecture
Kull AI is built with a modern web stack. The **Frontend** uses React with TypeScript, Tailwind CSS, and Shadcn UI for a responsive and consistent user experience. **UI/UX decisions** emphasize a mobile-first, responsive design following the Grand Slam Offer framework with high contrast, clear CTAs, and a professional photography aesthetic. **Backend** services are powered by Express.js and Node.js. **Technical implementations** include a robust pre-authorization trial system using Stripe's SetupIntent, a database-backed email queue for transactional communications via SendGrid, and an AI-powered customer support chat.

**Feature Specifications**:
- **Authentication**: Replit Auth provides secure login with various providers and integrates a 1-day free trial with a 24-hour special offer timer.
- **Subscription Management**: Supports two pricing tiers (Professional and Studio) with annual billing as default and a smart downgrade option to monthly if annual authorization fails.
- **Referral System**: Tracks up to 10 photographer referrals, offering bonus tiers and real-time status updates.
- **Self-Service & Support**: Features an instant self-service refund system and a chat-first customer support strategy, leveraging an AI chatbot with GitHub context.

**System Design Choices**:
- **Database**: PostgreSQL (Neon) is used for relational data, ensuring ACID compliance.
- **Payment Processing**: Stripe Subscriptions handle all payment logic securely.
- **Email Automation**: SendGrid for automated trial-related emails, managed by a robust email queue system with scheduling and retry logic.
- **Customer Support**: Integrates OpenAI's GPT-4o-mini for cost-effective, 24/7 AI-powered chat support, providing comprehensive answers sourced from project documentation and GitHub repository context.
- **No Public Email Addresses**: To funnel support through the AI chat first, reducing manual support burden.
- **SEO & Social Sharing**: Implemented with comprehensive meta tags (Open Graph, Twitter Cards) and custom OG images for optimal discoverability and sharing.

### External Dependencies
- **PostgreSQL (Neon)**: Main database for user, subscription, referral, and email queue data.
- **Stripe**: Handles all payment processing, subscriptions, pre-authorizations, and refunds.
- **Replit Auth**: Provides user authentication and session management.
- **SendGrid**: Used for sending automated transactional emails. (API Key pending activation)
- **OpenAI**: Powers the AI customer support chat using GPT-4o-mini.
- **Lucide React**: Provides icons for the UI.