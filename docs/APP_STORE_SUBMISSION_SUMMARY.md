# Kull App Store Submission - Complete Summary

## Overview

This document provides a comprehensive summary of all App Store submission preparation work completed for Kull Universal App (macOS + iOS).

**Status:** Ready for submission preparation
**Last Updated:** November 18, 2025

---

## Documents Created

All documentation has been created and is located in `/home/runner/workspace/docs/`:

### 1. Privacy & Compliance
- **PRIVACY_POLICY.md** - Complete privacy policy covering GDPR, CCPA, data collection, and usage
- Location: `/home/runner/workspace/docs/PRIVACY_POLICY.md`
- URL to host: https://kull.lander.media/privacy

### 2. App Store Listing
- **APP_STORE_DESCRIPTION.md** - Marketing copy, description, release notes, review instructions
- **APP_STORE_KEYWORDS.md** - Keyword strategy, ASO optimization, localization plan
- Locations:
  - `/home/runner/workspace/docs/APP_STORE_DESCRIPTION.md`
  - `/home/runner/workspace/docs/APP_STORE_KEYWORDS.md`

### 3. Visual Assets
- **APP_ICON_SPECIFICATIONS.md** - Complete icon size guide for macOS and iOS
- **SCREENSHOT_SPECIFICATIONS.md** - Screenshot requirements, design guidelines, content strategy
- Locations:
  - `/home/runner/workspace/docs/APP_ICON_SPECIFICATIONS.md`
  - `/home/runner/workspace/docs/SCREENSHOT_SPECIFICATIONS.md`

### 4. Technical Setup
- **CODE_SIGNING_NOTARIZATION.md** - Code signing certificates, provisioning profiles, notarization process
- **APP_STORE_SUBMISSION_CHECKLIST.md** - Complete step-by-step submission checklist
- **TESTFLIGHT_BETA_GUIDE.md** - Beta testing setup, tester management, feedback collection
- Locations:
  - `/home/runner/workspace/docs/CODE_SIGNING_NOTARIZATION.md`
  - `/home/runner/workspace/docs/APP_STORE_SUBMISSION_CHECKLIST.md`
  - `/home/runner/workspace/docs/TESTFLIGHT_BETA_GUIDE.md`

---

## Configuration Files Updated

### 1. Info.plist
**Location:** `/home/runner/workspace/apps/Kull Universal App/kull/kull/Info.plist`

**Changes Made:**
- Added all required privacy usage descriptions (NSPhotoLibraryUsageDescription, etc.)
- Configured App Transport Security for secure connections
- Added supported document types (RAW formats)
- Defined URL schemes for deep linking (kull://)
- Set up multi-scene support for iOS
- Configured iPad multitasking support

**Key Additions:**
```xml
<!-- Privacy Descriptions -->
<key>NSPhotoLibraryUsageDescription</key>
<string>Kull needs access to your photo library to analyze and rate your images...</string>

<!-- Network Security -->
<key>NSAppTransportSecurity</key>
<dict>
  <key>NSAllowsArbitraryLoads</key>
  <false/>
</dict>

<!-- Document Types (RAW support) -->
<key>CFBundleDocumentTypes</key>
<array>
  <!-- Canon CR2/CR3, Nikon NEF, Sony ARW, Fuji RAF, etc. -->
</array>
```

### 2. Entitlements
**Location:** `/home/runner/workspace/apps/Kull Universal App/kull/kull/kull.entitlements`

**Changes Made:**
- Enabled App Sandbox (macOS security requirement)
- Configured file access permissions (user-selected read-write)
- Added network client entitlement for AI API calls
- Enabled hardened runtime (macOS notarization requirement)
- Configured push notifications (production environment)
- Set up keychain sharing
- Added data protection for iOS

**Key Additions:**
```xml
<!-- App Sandbox (macOS) -->
<key>com.apple.security.app-sandbox</key>
<true/>

<!-- File Access -->
<key>com.apple.security.files.user-selected.read-write</key>
<true/>

<!-- Network -->
<key>com.apple.security.network.client</key>
<true/>

<!-- Hardened Runtime -->
<key>com.apple.security.cs.allow-jit</key>
<false/>

<!-- Push Notifications -->
<key>aps-environment</key>
<string>development</string>  <!-- Change to "production" before release -->
```

---

## App Store Assets Required

### App Icons (TO DO)
**Specification:** `/home/runner/workspace/docs/APP_ICON_SPECIFICATIONS.md`

**Required Sizes:**
- **macOS:** 16x16 through 1024x1024 (@1x and @2x) = 10 files
- **iOS/iPhone:** 20x20 through 1024x1024 (@2x and @3x) = 10 files
- **iPad:** 20x20 through 83.5x83.5 (@1x and @2x) = 8 files
- **Total:** 28 icon files

**Location to Add:** `/home/runner/workspace/apps/Kull Universal App/kull/kull/Assets.xcassets/AppIcon.appiconset/`

**Next Steps:**
1. Design master icon (1024x1024 PNG, no transparency)
2. Use script in APP_ICON_SPECIFICATIONS.md to generate all sizes
3. Add to Xcode asset catalog
4. Validate in Xcode (no missing sizes)

### Screenshots (TO DO)
**Specification:** `/home/runner/workspace/docs/SCREENSHOT_SPECIFICATIONS.md`

**Required Sizes:**
- **iPhone 6.7":** 1290 x 2796 pixels (3-10 screenshots)
- **iPhone 6.5":** 1242 x 2688 pixels (3-10 screenshots)
- **iPad Pro 12.9":** 2048 x 2732 pixels (3-10 screenshots)
- **macOS:** 2880 x 1800 pixels (1-10 screenshots)

**Content Strategy:**
1. Hero/Value Proposition: "1,000 Photos Rated in 30 Seconds"
2. Before/After: Unrated vs. rated photos
3. Lightroom Integration: XMP export to Lightroom
4. AI Quality Metrics: Detailed scoring breakdown
5. Transparent Pricing: No hidden fees
6. Multi-Device Sync (iOS): Monitor from iPhone
7. Processing Modes (macOS): Default, Economy, Local

**Next Steps:**
1. Process sample wedding shoot (1,247 photos)
2. Capture screenshots of dashboard, settings, export, Lightroom
3. Design in Figma with device frames, headlines, annotations
4. Export as PNG (sRGB color space)
5. Upload to App Store Connect

---

## App Store Metadata

### App Information
- **Name:** Kull - AI Photo Culling
- **Subtitle:** AI-Powered Photo Selection
- **Primary Category:** Photo & Video
- **Secondary Category:** Productivity
- **Age Rating:** 4+ (No objectionable content)

### URLs
- **Privacy Policy:** https://kull.lander.media/privacy (TO DO: Host PRIVACY_POLICY.md)
- **Support URL:** https://kull.lander.media/support (TO DO: Create support page)
- **Marketing URL:** https://kull.lander.media

### Keywords (100 characters max)
```
photo culling,AI,Lightroom,wedding photographer,RAW,photography,image rating,photo selection,XMP,batch
```

### Description (4,000 characters)
See `/home/runner/workspace/docs/APP_STORE_DESCRIPTION.md` for full text.

**Highlights:**
- Stop wasting time sorting photos
- 1,000 photos rated in under 30 seconds
- Lightroom-ready XMP export
- Transparent pricing (2x provider costs)
- Multi-platform (macOS + iOS)

### Promotional Text (170 characters)
```
Transform hours of photo culling into seconds. Let AI rate your photoshoots instantly with accuracy that matches professional photographers.
```

---

## Code Signing Setup (TO DO)

**Reference:** `/home/runner/workspace/docs/CODE_SIGNING_NOTARIZATION.md`

### Certificates Needed
1. **iOS Distribution Certificate** - For App Store submission
2. **Mac App Distribution Certificate** - For Mac App Store
3. **Developer ID Application Certificate** - For macOS notarization (non-App Store)

### Provisioning Profiles Needed
1. **iOS App Store Profile** - Bundle ID: `media.lander.kull`
2. **macOS App Store Profile** - Bundle ID: `media.lander.kull.mac`

### Steps to Complete
1. Enroll in Apple Developer Program ($99/year) at https://developer.apple.com/programs/
2. Create App IDs in Certificates, Identifiers & Profiles
3. Generate certificates (Request CSR from Keychain Access)
4. Create provisioning profiles
5. Download and install in Xcode
6. Configure Xcode signing settings (see CODE_SIGNING_NOTARIZATION.md)

**IMPORTANT:** Before archiving for App Store, change entitlement:
```xml
<key>aps-environment</key>
<string>production</string>  <!-- Change from "development" -->
```

---

## TestFlight Beta Testing (OPTIONAL)

**Reference:** `/home/runner/workspace/docs/TESTFLIGHT_BETA_GUIDE.md`

### Benefits
- Test with real users before App Store launch
- Collect feedback and crash reports
- Iterate quickly (no App Review for internal testers)
- Build community of early adopters

### Setup Steps
1. Upload build to App Store Connect (same as App Store submission)
2. Answer Export Compliance questions
3. Add Internal Testers (up to 100) - immediate access
4. Create External Tester Groups (up to 10,000) - requires Beta App Review
5. Distribute builds and collect feedback

### Beta Timeline (Recommended)
- **Week 1-2:** Internal testing (10-20 team members)
- **Week 3-4:** External testing (50-100 early access photographers)
- **Month 2:** Scale to 500-1,000 testers, stabilize
- **Month 3:** Submit to App Store with confidence

---

## App Store Submission Checklist

**Reference:** `/home/runner/workspace/docs/APP_STORE_SUBMISSION_CHECKLIST.md`

### Pre-Submission (TO DO)
- [ ] Enroll in Apple Developer Program
- [ ] Generate code signing certificates
- [ ] Create provisioning profiles
- [ ] Design and add app icons (28 files)
- [ ] Capture and design screenshots (4 device sizes)
- [ ] Host privacy policy at https://kull.lander.media/privacy
- [ ] Create support page at https://kull.lander.media/support
- [ ] Create demo account (appstore-reviewer@lander.media) with $100 balance
- [ ] Prepare sample wedding shoot (50 photos, public Dropbox link)
- [ ] Update entitlement: `aps-environment` → `production`

### Build & Upload
- [ ] Clean build folder in Xcode
- [ ] Archive app (Product → Archive)
- [ ] Validate archive (check for errors/warnings)
- [ ] Upload to App Store Connect
- [ ] Wait for processing (10-60 minutes)
- [ ] Answer Export Compliance questions

### App Store Connect Configuration
- [ ] Create app record in App Store Connect
- [ ] Upload screenshots (iPhone, iPad, macOS)
- [ ] Set description, keywords, promotional text
- [ ] Configure pricing (Free with IAP or paid)
- [ ] Complete App Privacy questionnaire
- [ ] Add review information (demo account, test instructions)
- [ ] Attach build to version
- [ ] Submit for review

### Post-Submission
- [ ] Monitor review status (1-3 days typically)
- [ ] Respond to rejection if needed
- [ ] Release app manually or automatically
- [ ] Announce launch (email, social media, press)

---

## Privacy Compliance

**Reference:** `/home/runner/workspace/docs/PRIVACY_POLICY.md`

### Data Collected & Linked to User
- Email address (authentication)
- Device ID (UUID)
- Usage data (processing history)
- Financial info (subscription, transactions)

### Data NOT Collected
- Location
- Photos (processed in transit, never stored)
- Contacts
- Browsing history
- Health & fitness

### Compliance Certifications
- **GDPR** (EU): Right to access, rectification, erasure, data portability
- **CCPA** (California): Right to know, delete, opt-out of sale (we don't sell data)

### App Privacy Nutrition Label (App Store Connect)
Complete questionnaire based on PRIVACY_POLICY.md:
- Data types collected: Contact Info, Identifiers, Usage Data, Financial Info
- Data use: App Functionality, Analytics (opt-in), Personalization
- Data linked to user: YES (all types)
- Data used to track: NO

---

## Next Steps

### Immediate (Before Submission)
1. **Design App Icons** - Create master 1024x1024, generate all sizes
2. **Capture Screenshots** - Process sample shoot, capture UI, design marketing screenshots
3. **Enroll in Apple Developer Program** - $99/year, wait 1-2 days for approval
4. **Set Up Code Signing** - Generate certificates, create profiles, configure Xcode
5. **Host Privacy Policy** - Deploy PRIVACY_POLICY.md to https://kull.lander.media/privacy

### Short-Term (1-2 Weeks)
1. **TestFlight Beta** (Optional) - Invite 50-100 photographers, collect feedback
2. **Create Support Page** - FAQ, contact info, troubleshooting at https://kull.lander.media/support
3. **Prepare Press Kit** - Screenshots, demo video, press release for launch

### Launch Day
1. **Submit to App Store** - Follow APP_STORE_SUBMISSION_CHECKLIST.md
2. **Announce on Social Media** - Twitter, Instagram, LinkedIn
3. **Email Beta Testers** - Thank them, offer 50% discount code
4. **Submit to ProductHunt** - Build awareness

### Post-Launch (Week 1)
1. **Monitor Reviews** - Respond within 24 hours, address negative feedback
2. **Track Metrics** - Impressions, downloads, conversion rate in App Store Connect
3. **Fix Critical Bugs** - Monitor crashes, submit v1.0.1 update if needed

---

## Resources

### Documentation
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [App Store Connect Help](https://help.apple.com/app-store-connect/)
- [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [TestFlight Best Practices](https://developer.apple.com/testflight/best-practices/)

### Tools
- [Xcode](https://developer.apple.com/xcode/) - Latest version
- [Transporter](https://apps.apple.com/app/transporter/id1450874784) - Upload builds outside Xcode
- [Apple Design Resources](https://developer.apple.com/design/resources/) - Official templates

### Kull-Specific Docs
All located in `/home/runner/workspace/docs/`:
- PRIVACY_POLICY.md
- APP_STORE_DESCRIPTION.md
- APP_STORE_KEYWORDS.md
- APP_ICON_SPECIFICATIONS.md
- SCREENSHOT_SPECIFICATIONS.md
- APP_STORE_SUBMISSION_CHECKLIST.md
- CODE_SIGNING_NOTARIZATION.md
- TESTFLIGHT_BETA_GUIDE.md

---

## Contact

**Developer:** Steve Moraco
**Email:** steve@lander.media
**Company:** Lander Media LLC
**Website:** https://kull.lander.media

---

**Completion Status:** Documentation complete, assets pending (icons, screenshots)
**Next Agent:** Designer to create app icons and screenshots
**Estimated Time to Submission:** 1-2 weeks (after assets created)

---

**Last Updated:** November 18, 2025
