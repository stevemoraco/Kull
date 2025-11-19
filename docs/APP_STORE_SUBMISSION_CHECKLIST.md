# Kull App Store Submission Checklist

## Pre-Submission Requirements

### Apple Developer Account Setup

- [ ] **Enroll in Apple Developer Program** ($99/year)
  - Visit: https://developer.apple.com/programs/
  - Complete enrollment with Lander Media LLC business info
  - Wait for approval (1-2 business days)

- [ ] **Create App Store Connect Account**
  - Log in: https://appstoreconnect.apple.com/
  - Agree to latest App Store Connect agreements
  - Add team members (if needed)

- [ ] **Configure Tax & Banking Information**
  - App Store Connect → Agreements, Tax, and Banking
  - Add bank account for payouts
  - Complete W-9 (US) or tax forms (international)
  - Provide contact information

### Certificates, Identifiers & Profiles

- [ ] **Create App Identifiers**
  - Certificates, Identifiers & Profiles → Identifiers
  - macOS: `media.lander.kull`
  - iOS: `media.lander.kull.ios`
  - Enable capabilities:
    - Push Notifications
    - App Groups (for multi-device sync)
    - iCloud (CloudKit)
    - Keychain Sharing

- [ ] **Generate Certificates**
  - **macOS Developer ID Application Certificate** (for Mac App Store)
  - **iOS Distribution Certificate** (for App Store)
  - Download and install in Keychain Access

- [ ] **Create Provisioning Profiles**
  - **macOS App Store Distribution Profile** (media.lander.kull)
  - **iOS App Store Distribution Profile** (media.lander.kull.ios)
  - Download and install in Xcode

- [ ] **Enable Push Notifications**
  - Certificates, Identifiers & Profiles → Keys
  - Create APNs Auth Key
  - Download `.p8` key file (store securely, cannot re-download)
  - Note Key ID and Team ID (needed for backend push notification config)

### App Store Connect App Record

- [ ] **Create New App in App Store Connect**
  - Click "+" → New App
  - Platform: macOS + iOS (Universal Purchase)
  - Name: Kull - AI Photo Culling
  - Primary Language: English (US)
  - Bundle ID: media.lander.kull
  - SKU: kull-2025-universal

- [ ] **Configure App Information**
  - Category: Photo & Video (Primary), Productivity (Secondary)
  - Content Rights: Does not contain third-party content
  - Age Rating: 4+ (complete questionnaire)

- [ ] **Set Privacy Policy URL**
  - https://kull.lander.media/privacy
  - (Ensure page is live before submission)

- [ ] **Set Support URL**
  - https://kull.lander.media/support
  - (Create support page with FAQ, contact info)

- [ ] **Set Marketing URL** (optional)
  - https://kull.lander.media

## App Binary Preparation

### Code Signing Configuration

- [ ] **Update Xcode Project Settings**
  - Open `kull.xcodeproj` in Xcode
  - Select target "kull" → Signing & Capabilities
  - **Team:** Lander Media LLC
  - **Provisioning Profile:** Automatic (or select manually)
  - **Code Signing Identity:** Developer ID Application (for Mac), iOS Distribution (for iOS)

- [ ] **Configure Build Settings**
  - Build Settings → Code Signing
  - **Code Signing Identity (Release):** "Apple Distribution"
  - **Development Team:** [Your Team ID]
  - **Provisioning Profile (Release):** [App Store Profile]

- [ ] **Enable Hardened Runtime (macOS)**
  - Signing & Capabilities → Hardened Runtime
  - Enable all security options (already set in `kull.entitlements`)

- [ ] **Verify Entitlements**
  - Check `kull.entitlements` contains:
    - `com.apple.security.app-sandbox` = true
    - `com.apple.security.files.user-selected.read-write` = true
    - `com.apple.security.network.client` = true
    - `aps-environment` = development (change to `production` before release)

- [ ] **Update Version Numbers**
  - Target → General → Identity
  - **Version:** 1.0 (user-facing version, matches App Store listing)
  - **Build:** 1 (increment with each upload, e.g., 1, 2, 3...)

### Privacy Descriptions (Info.plist)

- [ ] **Verify All Privacy Strings Present**
  - `NSPhotoLibraryUsageDescription`
  - `NSPhotoLibraryAddUsageDescription`
  - `NSDocumentsFolderUsageDescription` (macOS)
  - `NSDownloadsFolderUsageDescription` (macOS)
  - `NSRemovableVolumesUsageDescription` (macOS)

- [ ] **Test Privacy Prompts**
  - Run app on device/simulator
  - Trigger file access, verify user-friendly prompt appears

### Build for Release

- [ ] **Clean Build Folder**
  - Xcode → Product → Clean Build Folder (Cmd+Shift+K)

- [ ] **Archive App**
  - Xcode → Product → Archive (Cmd+Shift+B for Release scheme, then Archive)
  - Wait for archive to complete (~5-10 minutes)
  - Archive should appear in Organizer window

- [ ] **Validate Archive**
  - Organizer → Archives → Select latest archive
  - Click "Validate App"
  - Select App Store Connect distribution method
  - Choose automatic signing (or manual if using specific profiles)
  - Wait for validation (~2-5 minutes)
  - Fix any errors/warnings (common issues below)

### Common Validation Errors & Fixes

**Error: "Missing or invalid entitlement"**
- **Fix:** Check `kull.entitlements` matches App ID capabilities in Apple Developer portal
- **Fix:** Ensure hardened runtime entitlements are correct

**Error: "App uses non-public API"**
- **Fix:** Remove any private framework usage
- **Fix:** Use only public Apple APIs

**Error: "Invalid provisioning profile"**
- **Fix:** Regenerate provisioning profile in Apple Developer portal
- **Fix:** Download and install updated profile in Xcode

**Error: "Missing privacy usage description"**
- **Fix:** Add missing `NSPhotoLibraryUsageDescription` (or other) to Info.plist

**Warning: "Missing marketing icon"**
- **Fix:** Add 1024x1024 app icon to `Assets.xcassets/AppIcon.appiconset/`

## App Assets

### App Icons

- [ ] **Generate All Required Icon Sizes**
  - See `/home/runner/workspace/docs/APP_ICON_SPECIFICATIONS.md`
  - macOS: 16x16 through 1024x1024 (@1x and @2x)
  - iOS: 20x20 through 1024x1024 (@1x, @2x, @3x)
  - iPad: All required sizes

- [ ] **Add Icons to Xcode Asset Catalog**
  - Open `Assets.xcassets/AppIcon.appiconset/`
  - Drag icons to appropriate slots
  - Verify all slots filled (Xcode shows warnings for missing sizes)

- [ ] **Validate App Icon**
  - Build app, check icon appears in Dock (macOS) and Home Screen (iOS)
  - No warnings in Xcode Organizer after archiving

### Screenshots

- [ ] **Capture Required Screenshots**
  - See `/home/runner/workspace/docs/SCREENSHOT_SPECIFICATIONS.md`
  - iPhone 6.7" (1290 x 2796): 3-10 screenshots
  - iPhone 6.5" (1242 x 2688): 3-10 screenshots
  - iPad Pro 12.9" (2048 x 2732): 3-10 screenshots
  - macOS (2880 x 1800): 1-10 screenshots

- [ ] **Design Screenshots in Figma/Sketch**
  - Add device frames, headlines, annotations
  - Export as PNG, sRGB color space
  - Validate pixel dimensions with `sips -g pixelWidth -g pixelHeight`

- [ ] **Upload to App Store Connect**
  - App Store Connect → App Store tab → Screenshots
  - Drag screenshots to device size slots
  - Preview on device to ensure legibility

### App Previews (Optional)

- [ ] **Record App Preview Videos**
  - 30 seconds max per video
  - iPhone: Portrait or landscape
  - iPad: Landscape recommended
  - macOS: 16:10 aspect ratio
  - Use QuickTime Screen Recording or Xcode Simulator

- [ ] **Edit Videos**
  - Add intro/outro titles (optional)
  - No third-party logos (except app integrations like Lightroom)
  - Export: H.264 or HEVC codec, MP4 or MOV format

- [ ] **Upload to App Store Connect**
  - App Store Connect → App Previews section
  - Drag videos to device size slots

## App Metadata

### App Store Listing

- [ ] **Write App Description**
  - See `/home/runner/workspace/docs/APP_STORE_DESCRIPTION.md`
  - 4,000 character max
  - Highlight key benefits, use cases, pricing

- [ ] **Add Keywords**
  - See `/home/runner/workspace/docs/APP_STORE_KEYWORDS.md`
  - 100 characters max (commas don't count)
  - Focus on high-intent, low-competition keywords

- [ ] **Write Promotional Text**
  - 170 character max
  - Can update without new version submission
  - Highlight current promo or key feature

- [ ] **Set Subtitle**
  - 30 character max
  - "AI-Powered Photo Selection"

- [ ] **What's New (Release Notes)**
  - 4,000 character max
  - For v1.0: "Initial release. AI photo culling for professional photographers."

### Pricing & Availability

- [ ] **Set Pricing Model**
  - Free app with In-App Purchases (annual subscriptions)
  - OR Paid upfront (if using one-time purchase model)
  - Set price: FREE (subscriptions handled via IAP)

- [ ] **Configure In-App Purchases** (if applicable)
  - App Store Connect → In-App Purchases → "+"
  - Type: Auto-Renewable Subscription
  - Reference Name: "Kull Annual Subscription"
  - Product ID: `media.lander.kull.annual`
  - Subscription Duration: 1 Year
  - Price: $199/year (or chosen price tier)

- [ ] **Set Availability**
  - All countries/regions (or specific markets)
  - Automatically release after approval (or manual release)

- [ ] **Set Pre-Order** (optional)
  - Enable pre-order if you want to build anticipation
  - Set release date 2-90 days in future

### App Privacy

- [ ] **Complete App Privacy Questionnaire**
  - App Store Connect → App Privacy → Edit
  - Answer all questions truthfully (see below)

**Data Types Collected:**
- **Contact Info:** Email address (for authentication)
- **Identifiers:** Device ID (UUID)
- **Usage Data:** Processing history, model selections
- **Financial Info:** Subscription status, transaction history

**Data Types NOT Collected:**
- Location
- Photos (processed in transit, not stored)
- Contacts
- Browsing History
- Health & Fitness

**Data Use:**
- App Functionality (authentication, processing)
- Analytics (opt-in only)
- Product Personalization (model recommendations)

**Data Linked to User:**
- Email, device ID, usage data, financial info

**Data Not Linked to User:**
- Aggregated analytics (no personal identifiers)

- [ ] **Review Privacy Nutrition Label Preview**
  - App Store Connect → App Privacy → Preview
  - Ensure accuracy matches privacy policy

### App Review Information

- [ ] **Create Demo Account**
  - Email: appstore-reviewer@lander.media
  - Password: (Generate secure password, store in 1Password)
  - Pre-load with $100 balance for testing

- [ ] **Prepare Sample Photos**
  - Create "Sample_Wedding_Shoot" folder with 50 RAW photos
  - Upload to cloud storage (Dropbox, Google Drive) with public link
  - Include link in App Review Notes

- [ ] **Write App Review Notes**
  - See `/home/runner/workspace/docs/APP_STORE_DESCRIPTION.md` (Review Notes section)
  - Include:
    - Demo account credentials
    - Testing instructions (step-by-step)
    - Link to sample photos
    - Privacy notes (photos sent to OpenAI/Anthropic)
    - Contact email for issues

- [ ] **Add Review Contact Info**
  - First Name: Steve
  - Last Name: Moraco
  - Phone: [Your phone number]
  - Email: steve@lander.media

## Upload & Submission

### Upload Build to App Store Connect

- [ ] **Upload via Xcode Organizer**
  - Organizer → Archives → Select latest archive
  - Click "Distribute App"
  - Choose "App Store Connect"
  - Select distribution options:
    - Upload symbols: YES (for crash reports)
    - Manage version: Automatically (or manually select version)
  - Click "Upload"
  - Wait for upload (~10-30 minutes depending on file size)

- [ ] **Verify Upload Success**
  - App Store Connect → Activity tab
  - Build should appear with status "Processing" → "Ready to Submit"
  - Processing takes 10-60 minutes

### Attach Build to Version

- [ ] **Select Build**
  - App Store Connect → App Store tab → Build section
  - Click "+" next to Build
  - Select uploaded build from list
  - Wait for "Missing Compliance" button to appear

- [ ] **Answer Export Compliance Questions**
  - Click "Missing Compliance"
  - Question: "Is your app designed to use cryptography or does it contain or incorporate cryptography?"
  - Answer: YES (HTTPS uses encryption)
  - Question: "Does your app contain encryption that is exempt from regulation?"
  - Answer: YES (standard HTTPS encryption)
  - Submit

### Submit for Review

- [ ] **Review All Sections**
  - App Information: Complete
  - Pricing & Availability: Complete
  - App Privacy: Complete
  - App Store tab:
    - Screenshots: Uploaded
    - Description: Written
    - Keywords: Set
    - Support/Privacy URLs: Set
    - Build: Attached

- [ ] **Click "Add for Review"**
  - Top-right corner of App Store tab
  - Confirm submission

- [ ] **Submit to App Store**
  - Click "Submit for Review" button
  - Review summary page
  - Confirm all information correct
  - Click "Submit"

### Post-Submission

- [ ] **Monitor Review Status**
  - App Store Connect → App Store tab → Status
  - Statuses:
    - "Waiting for Review" (1-3 days typically)
    - "In Review" (Apple reviewing, 1-24 hours)
    - "Pending Developer Release" (approved, waiting for manual release)
    - "Ready for Sale" (live on App Store!)

- [ ] **Respond to Rejection** (if applicable)
  - Read rejection reason in Resolution Center
  - Fix issues in code/metadata
  - Increment build number
  - Re-archive, validate, upload
  - Resubmit with reply to Resolution Center

- [ ] **Release App** (if manual release chosen)
  - App Store Connect → Versions → Click "Release This Version"

## macOS Notarization (Required)

- [ ] **Notarize macOS App**
  - Xcode automatically notarizes when uploading to App Store Connect
  - For distribution outside App Store (DMG, PKG):
    - Use `xcrun notarytool submit` command
    - Wait for Apple to notarize (~5-15 minutes)
    - Staple notarization ticket: `xcrun stapler staple kull.app`

## TestFlight Beta Testing (Optional, but Recommended)

- [ ] **Enable TestFlight**
  - App Store Connect → TestFlight tab
  - Upload build (same process as App Store submission)

- [ ] **Configure Test Information**
  - Test Information → Edit
  - Beta App Description: (same as App Store description)
  - Beta App Review Information: (same as App Store review info)
  - Feedback Email: steve@lander.media

- [ ] **Add Internal Testers** (Lander Media team)
  - TestFlight → Internal Testing → "+"
  - Add email addresses of team members
  - Testers receive invite email

- [ ] **Add External Testers** (Beta users)
  - TestFlight → External Testing → "+"
  - Create group: "Wedding Photographers Beta"
  - Add up to 10,000 testers
  - Submit for Beta App Review (required for external testing)

- [ ] **Distribute TestFlight Link**
  - Public link: https://testflight.apple.com/join/[your-code]
  - Share with beta community (Reddit, Twitter, email list)

- [ ] **Collect Feedback**
  - Monitor TestFlight Feedback tab
  - Respond to crash reports
  - Iterate and upload new builds

## Post-Launch Checklist

### Day 1 (Launch Day)

- [ ] **Verify App Live**
  - Search "Kull" in App Store
  - Download and install on fresh device
  - Test basic functionality

- [ ] **Announce Launch**
  - Email beta testers
  - Post on social media (Twitter, Instagram, LinkedIn)
  - Submit to ProductHunt
  - Contact photography blogs (PetaPixel, Fstoppers)

- [ ] **Monitor Reviews**
  - App Store Connect → Ratings & Reviews
  - Respond to reviews within 24 hours
  - Thank positive reviews, address negative feedback

### Week 1

- [ ] **Track Metrics**
  - App Store Connect → Analytics
  - Impressions, product page views, downloads
  - Conversion rate (views → downloads)

- [ ] **Monitor Crashes**
  - App Store Connect → TestFlight → Crashes (if still testing)
  - Xcode → Organizer → Crashes (production)
  - Fix critical crashes and submit update

- [ ] **Gather User Feedback**
  - Email first 100 users asking for feedback
  - Monitor support email (steve@lander.media)
  - Track feature requests in issue tracker

### Month 1

- [ ] **Prepare Version 1.1**
  - Prioritize bug fixes from crash reports
  - Add most-requested features
  - Update screenshots if UI changes

- [ ] **Run App Store Optimization Tests**
  - App Store Connect → Product Page Optimization
  - Test headline variations
  - Test screenshot order

- [ ] **Localize for Top Markets**
  - Identify top 3 non-English markets (App Store Connect → Analytics)
  - Translate app metadata (description, keywords, screenshots)
  - Submit localized versions

## Final Pre-Submission Checklist

**Before clicking "Submit for Review", confirm:**

- [ ] App builds and runs on physical device (not just simulator)
- [ ] All privacy descriptions present and accurate
- [ ] App icons present for all required sizes
- [ ] Screenshots uploaded for all device sizes
- [ ] Privacy policy URL is live and accessible
- [ ] Support URL is live with contact info
- [ ] Demo account credentials work
- [ ] Sample photos accessible via public link
- [ ] App Review Notes complete with testing instructions
- [ ] Export compliance questions answered
- [ ] Build attached to version in App Store Connect
- [ ] All warnings in Xcode Organizer resolved
- [ ] Version number matches App Store listing
- [ ] Pricing and availability set correctly
- [ ] App privacy questionnaire complete

**If all boxes checked: Click "Submit for Review"**

---

## Common Rejection Reasons & How to Avoid

### 1. Guideline 2.1 - App Completeness
**Rejection:** "App crashed on launch" or "Could not log in with provided credentials"
**Fix:** Test demo account on fresh device, ensure server is running, include clear instructions

### 2. Guideline 5.1.1 - Privacy
**Rejection:** "App accesses user data without permission prompt"
**Fix:** Add all required `NSPhotoLibraryUsageDescription` keys to Info.plist

### 3. Guideline 2.3.1 - Accurate Metadata
**Rejection:** "Screenshots do not match app functionality"
**Fix:** Update screenshots to reflect current UI, remove mockups

### 4. Guideline 4.2 - Minimum Functionality
**Rejection:** "App does not provide sufficient functionality"
**Fix:** Ensure demo account can process photos, show value immediately

### 5. Guideline 3.1.1 - In-App Purchases
**Rejection:** "App requires purchase outside of App Store"
**Fix:** Use In-App Purchases for subscriptions, not external payment links

---

## Resources

**Apple Documentation:**
- [App Store Connect Help](https://help.apple.com/app-store-connect/)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)

**Kull-Specific Docs:**
- `/home/runner/workspace/docs/APP_ICON_SPECIFICATIONS.md`
- `/home/runner/workspace/docs/APP_STORE_DESCRIPTION.md`
- `/home/runner/workspace/docs/APP_STORE_KEYWORDS.md`
- `/home/runner/workspace/docs/SCREENSHOT_SPECIFICATIONS.md`
- `/home/runner/workspace/docs/PRIVACY_POLICY.md`

---

**Last Updated:** November 18, 2025
