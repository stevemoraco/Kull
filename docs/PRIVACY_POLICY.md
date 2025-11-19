# Kull Privacy Policy

**Last Updated:** November 18, 2025

## Introduction

Kull ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use the Kull application (macOS and iOS) and related services.

## Information We Collect

### 1. Account Information
- Email address (for authentication)
- Name (optional, for personalization)
- Payment information (processed securely through Stripe; we do not store credit card details)
- Subscription status and billing history

### 2. Device Information
- Device identifier (UUID, generated locally and stored in Keychain)
- Operating system version (macOS/iOS)
- App version
- Device model (for compatibility and support)

### 3. Photo Metadata
- **EXIF data** from uploaded photos (focal length, ISO, shutter speed, aperture, camera model, lens model, timestamp)
- **File paths** (processed locally, not stored on our servers)
- **AI-generated ratings** (star ratings, color labels, quality metrics)
- **XMP sidecar files** (generated locally and stored alongside your photos)

**Important:** We do NOT store your actual photo files on our servers. Photos are:
- Transmitted securely via HTTPS to AI providers (Anthropic, OpenAI, Google, xAI, Groq) for analysis
- Processed in memory and immediately discarded after rating generation
- Never saved to our databases or cloud storage

### 4. Usage Data
- Processing history (number of photos processed, timestamps, costs)
- AI model selections (gpt-5-nano, claude-haiku-4.5, etc.)
- Processing mode preferences (Default, Economy, Local)
- Error logs (for debugging, contains no personal data)

### 5. Network Data
- IP address (for authentication and fraud prevention)
- WebSocket connection logs (for real-time sync monitoring)

## How We Use Your Information

### Photo Processing
- Send photos to third-party AI providers (Anthropic, OpenAI, Google, xAI, Groq) for quality analysis
- Generate star ratings, color labels, and quality metrics
- Create XMP sidecar files compatible with Adobe Lightroom
- Track processing costs and deduct from your subscription balance

### Service Improvement
- Monitor rate limits and API performance
- Identify and fix errors
- Optimize AI model selection for cost and speed
- Analyze feature usage to prioritize development

### Authentication & Security
- Verify device authenticity via 6-digit codes
- Manage JWT tokens for secure API access
- Prevent unauthorized access to your account
- Detect and prevent fraudulent activity

### Customer Support
- Respond to inquiries and support requests
- Troubleshoot technical issues
- Provide updates on service status

### Billing & Payments
- Process subscription payments via Stripe
- Track usage costs (transparent 2x provider markup)
- Send invoices and payment receipts
- Manage refunds and billing disputes

## Data Storage & Security

### Local Storage (On Your Device)
- **Keychain (macOS/iOS):** JWT access and refresh tokens (encrypted by Apple)
- **UserDefaults:** Device ID, API endpoint URLs, user preferences
- **File System:** XMP sidecar files (stored alongside your photos)
- **Photos:** Never uploaded to our servers; processed in transit only

### Server Storage (Our Backend)
- **PostgreSQL Database:**
  - User accounts (email, hashed password, subscription status)
  - Credit transactions (cost per photo, timestamp, model used)
  - Device registrations (device ID, last active timestamp)
  - Processing history (photoshoot metadata, no actual images)
- **Redis Cache:** Session tokens (expire after 1 hour)
- **Log Files:** Error logs and rate limit events (retained for 30 days)

### Third-Party AI Providers
Photos are transmitted to the following providers for analysis:
- **Anthropic (Claude):** Batch API for economy mode
- **OpenAI (GPT-5):** Real-time processing for default mode
- **Google (Gemini):** Alternative model option
- **xAI (Grok):** Vision-enabled processing
- **Groq (Kimi):** Ultra-fast inference

**Provider Data Retention:**
- **Real-time requests:** Photos processed in memory, immediately discarded
- **Batch API requests:** Photos stored temporarily (10 min - 24 hrs) until batch completes, then deleted
- **Privacy policies:** Each provider has their own data retention policies (see links below)

**Provider Privacy Policies:**
- [Anthropic Privacy Policy](https://www.anthropic.com/privacy)
- [OpenAI Privacy Policy](https://openai.com/privacy)
- [Google AI Privacy](https://ai.google.dev/gemini-api/terms)
- [xAI Privacy Policy](https://x.ai/legal/privacy-policy)
- [Groq Privacy Policy](https://groq.com/privacy-policy/)

### Apple Intelligence (On-Device Processing)
- When using "Local (On-Device)" mode on macOS 15+
- Photos NEVER leave your device
- Processed by Apple's VisionFoundationModel
- Zero cost, complete privacy
- No data sent to Kull servers or third-party AI providers

## Data Sharing

### We NEVER Sell Your Data
We do not sell, rent, or trade your personal information to third parties for marketing purposes.

### Third-Party Services We Use
1. **AI Providers** (Anthropic, OpenAI, Google, xAI, Groq)
   - Purpose: Photo quality analysis
   - Data shared: Photos (in transit only), EXIF metadata
   - Retention: Immediate deletion (real-time) or temporary storage (batch API)

2. **Stripe** (Payment Processing)
   - Purpose: Subscription billing
   - Data shared: Email, payment method, billing address
   - Retention: Per Stripe's data retention policy

3. **AWS / Google Cloud** (Infrastructure)
   - Purpose: Backend hosting, database storage
   - Data shared: All data stored on our servers (encrypted)
   - Retention: Per our data retention policy

### Legal Requirements
We may disclose your information if required by law, such as:
- Court orders or subpoenas
- Law enforcement requests
- National security requirements
- Protection of our rights or safety of others

## Your Privacy Rights

### GDPR Rights (EU/EEA Users)
- **Right to Access:** Request a copy of all data we hold about you
- **Right to Rectification:** Correct inaccurate or incomplete data
- **Right to Erasure:** Delete your account and all associated data
- **Right to Restriction:** Limit how we process your data
- **Right to Data Portability:** Export your data in a machine-readable format
- **Right to Object:** Opt out of certain data processing activities
- **Right to Withdraw Consent:** Revoke consent for data processing

### CCPA Rights (California Users)
- **Right to Know:** Request disclosure of data collection and sharing practices
- **Right to Delete:** Request deletion of personal information
- **Right to Opt-Out:** Opt out of sale of personal information (we do not sell data)
- **Right to Non-Discrimination:** Equal service regardless of privacy rights exercised

### Exercising Your Rights
Email: **privacy@lander.media**
Response time: Within 30 days

To delete your account:
1. Log in to Kull web dashboard
2. Go to Settings → Account
3. Click "Delete Account"
4. Confirm deletion (this action is irreversible)

**Data Retention After Deletion:**
- Immediate: JWT tokens invalidated, device registrations deleted
- 7 days: User account, subscription data, processing history deleted
- 30 days: Backup archives purged
- Permanent: Aggregated analytics (no personal identifiers)

## Children's Privacy

Kull is not intended for users under the age of 13 (or 16 in the EU). We do not knowingly collect personal information from children. If we discover that a child has provided us with personal information, we will delete it immediately.

## Cookies & Tracking

### Web Application
- **Session Cookies:** Authentication (expires after 1 hour)
- **Persistent Cookies:** "Remember Me" functionality (expires after 30 days)
- **Analytics:** None (we do not use Google Analytics or similar tracking)

### Native Apps (macOS/iOS)
- **No Cookies:** Native apps use Keychain for authentication, not cookies
- **No Tracking:** We do not use third-party analytics SDKs (no Firebase, Mixpanel, etc.)
- **Crash Reports:** Optional crash reporting via Apple's Crash Reporter (requires user consent)

## Data Security

### Encryption
- **In Transit:** All network communication uses TLS 1.3 (HTTPS/WSS)
- **At Rest:** Database encrypted with AES-256
- **Keychain:** Encrypted by Apple's Secure Enclave (hardware-backed)

### Access Controls
- **JWT Tokens:** Short-lived (1 hour) with refresh token rotation
- **API Keys:** Server-side only, never sent to clients
- **Admin Panel:** IP-restricted, requires 2FA

### Security Audits
- Regular penetration testing by third-party security firms
- Automated vulnerability scanning via Snyk
- Dependency updates within 48 hours of critical CVEs

### Incident Response
In the event of a data breach:
1. Affected users notified within 72 hours
2. Details disclosed: what data was compromised, when, and how
3. Mitigation steps provided (password reset, re-authentication)
4. Regulatory authorities notified (GDPR/CCPA requirements)

## International Data Transfers

### Data Processing Locations
- **Primary Servers:** United States (AWS us-east-1)
- **Backup Servers:** United States (AWS us-west-2)
- **AI Providers:** Various global regions (see provider privacy policies)

### GDPR Compliance (EU Users)
We rely on **Standard Contractual Clauses (SCCs)** approved by the European Commission for data transfers outside the EU/EEA. If you are an EU user, your data may be processed in the United States under these protections.

## Changes to This Privacy Policy

We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated "Last Updated" date. Significant changes will be announced via:
- Email notification to all users
- In-app notification (banner on dashboard)
- Blog post on kull.lander.media

Continued use of Kull after changes constitutes acceptance of the updated Privacy Policy.

## Contact Us

**Privacy Questions or Requests:**
Email: **privacy@lander.media**
Response time: Within 30 days

**General Support:**
Email: **steve@lander.media**
Website: **https://kull.lander.media**

**Data Protection Officer:**
Steve Moraco
Lander Media LLC
Email: **dpo@lander.media**

## App Store Compliance

### iOS App Privacy Nutrition Label
The following data types are collected and linked to your identity:
- **Contact Info:** Email address
- **Identifiers:** Device ID (UUID)
- **Usage Data:** Processing history, model selections
- **Financial Info:** Subscription status, transaction history

The following data types are NOT collected:
- **Location:** Never accessed
- **Photos:** Processed in transit, never stored
- **Contacts:** Never accessed
- **Browsing History:** Never tracked
- **Search History:** Never tracked
- **Health & Fitness:** Never accessed
- **Sensitive Info:** Never accessed

### macOS App Sandbox Permissions
Kull requests the following permissions:
- **File Access (User-Selected):** Read photos from folders you select
- **Network:** Send photos to AI providers, sync with cloud
- **Push Notifications:** Alert you when processing completes (optional)

Kull does NOT request:
- **Camera:** Never accesses camera directly
- **Microphone:** Never accessed
- **Screen Recording:** Never accessed
- **Accessibility:** Never accessed
- **Full Disk Access:** Never requested

---

**This Privacy Policy is effective as of November 18, 2025.**
