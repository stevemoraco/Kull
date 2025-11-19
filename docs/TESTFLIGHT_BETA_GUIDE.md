# TestFlight Beta Testing Guide for Kull

## Overview

TestFlight is Apple's platform for distributing pre-release versions of iOS and macOS apps to beta testers. This guide covers setup, distribution, and feedback collection for Kull's beta program.

## Prerequisites

- [ ] **Apple Developer Account** enrolled in Apple Developer Program ($99/year)
- [ ] **App Store Connect access** (appstoreconnect.apple.com)
- [ ] **Xcode 15.0+** installed on macOS
- [ ] **Code signing certificates** configured (see `/home/runner/workspace/docs/CODE_SIGNING_NOTARIZATION.md`)

---

## TestFlight Overview

### Two Types of Testers

**1. Internal Testers (Up to 100)**
- Members of your App Store Connect team
- No App Review required
- Builds available immediately after upload
- Ideal for: Development team, QA, close collaborators

**2. External Testers (Up to 10,000)**
- Anyone with email address (not on your team)
- Requires Beta App Review (1-2 days)
- Can be organized into groups (e.g., "Wedding Photographers," "Portrait Photographers")
- Ideal for: Beta community, early adopters, customer validation

### TestFlight Limits

| Limit | Value |
|-------|-------|
| Internal testers | 100 maximum |
| External testers | 10,000 maximum |
| Builds per version | 100 maximum (e.g., 1.0.1, 1.0.2, ..., 1.0.100) |
| Build expiration | 90 days after upload |
| Test period | No time limit (as long as builds are available) |
| Devices per tester | 30 devices maximum |

---

## Initial Setup

### 1. Upload First Build to TestFlight

**Via Xcode:**

1. Archive app: **Product → Archive** (Cmd+Shift+B)
2. In Organizer, select archive → **Distribute App**
3. Choose **TestFlight & App Store** (same upload process)
4. Select signing: **Automatically manage signing** ✅
5. Click **Upload**
6. Wait for upload (~10-30 minutes)

**Verify Upload:**

1. Visit [App Store Connect](https://appstoreconnect.apple.com)
2. Select **Kull** → **TestFlight** tab
3. Build appears with status: "Processing" (10-60 minutes)
4. Once processed: "Missing Compliance" button appears

### 2. Answer Export Compliance

**Required for all builds uploaded to TestFlight/App Store:**

1. Click **Missing Compliance** button
2. Question: *"Is your app designed to use cryptography or does it contain or incorporate cryptography?"*
   - **Answer:** YES (HTTPS uses encryption)
3. Question: *"Does your app qualify for any of the exemptions provided in Category 5, Part 2 of the U.S. Export Administration Regulations?"*
   - **Answer:** YES (standard HTTPS encryption is exempt)
4. Question: *"Does your app use encryption that is exempt from regulations?"*
   - **Answer:** YES
5. Click **Submit**

**Automate Export Compliance (Optional):**

Add to `Info.plist` to skip questionnaire:

```xml
<key>ITSAppUsesNonExemptEncryption</key>
<false/>
```

### 3. Configure Test Information

**Navigate to: TestFlight → Test Information → Edit**

**Beta App Description:**
```
Kull is the world's fastest AI photo culling platform for professional photographers. Process thousands of photos in seconds with AI that understands technical quality, emotional moments, and what makes a keeper.

This is a beta version. Please report any bugs or feedback via the in-app feedback button or email steve@lander.media.

Key Features to Test:
• Photo import and folder selection
• AI processing with multiple model options (gpt-5-nano, claude-haiku-4.5, gemini-2.5-flash-lite)
• Real-time progress updates
• XMP file export for Lightroom
• Settings: Change AI model, processing mode (Default, Economy, Local)
• Multi-device sync (iOS companion with macOS app)

Known Issues:
• [List any known bugs here]

Thank you for testing Kull! Your feedback helps us build the best photo culling tool for photographers.
```

**Beta App Review Information:**
- **First Name:** Steve
- **Last Name:** Moraco
- **Phone:** [Your phone number]
- **Email:** steve@lander.media
- **Demo Account:** appstore-reviewer@lander.media
- **Demo Password:** [Generate secure password]
- **Notes:** "Demo account has $100 prepaid balance for testing. Sample wedding shoot (50 photos) available at [Dropbox link]. See testing instructions in Beta App Description."

**Feedback Email:**
- steve@lander.media

**Marketing URL:**
- https://kull.lander.media

**Privacy Policy URL:**
- https://kull.lander.media/privacy

**What to Test:**
```
1. Import Photos: Drag folder of RAW/JPEG images
2. Process Photos: Select "Default (Fast)" mode, click "Start Processing"
3. View Results: Check star ratings, color labels, quality metrics
4. Export XMP: Click "Export XMP," verify files created alongside photos
5. Open in Lightroom: Import photos into Lightroom, verify ratings appear
6. Settings: Change AI model (gpt-5-nano → claude-haiku-4.5), reprocess photos
7. Multi-device Sync: Install iOS companion, sign in, monitor progress from phone
```

---

## Adding Internal Testers

### Who to Add

- Development team members
- QA testers
- Designers
- Product managers
- Close collaborators who need immediate access

### Add Testers

1. **App Store Connect → Users and Access**
2. Click **"+"** to add user
3. Fill in:
   - **First Name:** [Name]
   - **Last Name:** [Name]
   - **Email:** [email@domain.com]
4. **Roles:** Check **Internal Tester** (minimum role)
5. Select **Apps:** Kull
6. Click **Invite**

**Tester receives email:**
- Subject: "You've been invited to test Kull"
- Link to install TestFlight app
- Link to download Kull beta

### Enable Internal Testing

1. **TestFlight → Internal Testing → iOS** (or macOS)
2. Click **"+"** next to Internal Testing
3. Select build to distribute
4. Check **Enable automatic distribution** (new builds auto-distribute to internal testers)
5. Click **Start Testing**

---

## Adding External Testers

### 1. Create Tester Groups

**Why groups:** Organize testers by segment, send targeted builds, analyze feedback by audience

**Create Groups:**

1. **TestFlight → External Testing → "+"**
2. **Group Name:** "Wedding Photographers"
3. **Enable automatic distribution:** ✅ (new builds auto-sent)
4. Click **Create**

**Recommended Groups:**

- **Wedding Photographers** (primary audience)
- **Portrait Photographers** (secondary audience)
- **Event Photographers** (conferences, concerts, sports)
- **Early Access** (VIP beta testers, influencers)
- **Bug Hunters** (technical users who report detailed bugs)

### 2. Add Testers to Groups

**Method A: Add Individual Testers**

1. Select group (e.g., "Wedding Photographers")
2. Click **"+"** next to Testers
3. Enter:
   - **Email:** tester@example.com
   - **First Name:** (optional)
   - **Last Name:** (optional)
4. Click **Add**
5. Tester receives email invite

**Method B: Import via CSV**

1. Create CSV file:
   ```csv
   Email,First Name,Last Name
   john@example.com,John,Smith
   jane@example.com,Jane,Doe
   ```
2. Select group → **Import Testers from CSV**
3. Upload CSV → Click **Import**

**Method C: Public Link**

1. Select group → **Enable Public Link**
2. Copy public link: `https://testflight.apple.com/join/ABC123XYZ`
3. Share on:
   - Twitter, Instagram, LinkedIn
   - Reddit (/r/WeddingPhotography, /r/AskPhotography)
   - Email newsletter
   - Blog post

**Public Link Best Practices:**
- Add tracking parameters: `?utm_source=twitter&utm_campaign=beta`
- Create short link: `kull.lander.media/beta` → redirects to TestFlight
- Monitor sign-ups in App Store Connect → TestFlight → [Group] → Testers

### 3. Submit for Beta App Review

**Required for External Testers ONLY (internal testers skip this step)**

1. Select group → **Submit for Review**
2. Wait for Beta App Review (1-2 days typically)
3. Statuses:
   - **Waiting for Review** (1-48 hours)
   - **In Review** (reviewing build, 1-12 hours)
   - **Ready to Test** (approved, testers can install)
   - **Rejected** (fix issues, resubmit)

**Common Rejection Reasons:**

| Rejection | Fix |
|-----------|-----|
| App crashes on launch | Test on physical device, ensure demo account works |
| Missing functionality | Ensure demo account can process photos, show value immediately |
| Privacy violation | Add all required `NSPhotoLibraryUsageDescription` keys |
| Incomplete test instructions | Add step-by-step guide in "What to Test" section |

---

## Distributing New Builds

### Increment Build Number

**Before archiving new build:**

1. Xcode → Select target → **General** → **Identity**
2. **Version:** 1.0 (keep same for same release)
3. **Build:** Increment (e.g., 1 → 2 → 3)

**Or via command line:**

```bash
agvtool next-version -all
```

### Upload New Build

1. Archive: **Product → Archive**
2. Distribute: **TestFlight & App Store**
3. Upload
4. Wait for processing (10-60 minutes)
5. Answer Export Compliance (if not automated)

### Notify Testers

**Automatic (Recommended):**
- If **Enable automatic distribution** is ON, testers receive push notification and email

**Manual:**
- Select build → **Notify Testers**
- Customize message:
  ```
  New Kull beta build available! (v1.0 build 5)

  What's New:
  • Fixed crash when processing RAW files
  • Added support for Fuji RAF format
  • Improved XMP export performance

  Please test and report any issues via the in-app feedback button.

  Thank you!
  - Kull Team
  ```

---

## Collecting Feedback

### In-App Feedback

**TestFlight automatically collects:**
- Crash reports
- Screenshots (testers can annotate and submit)
- Written feedback

**View Feedback:**

1. **App Store Connect → TestFlight → Feedback**
2. Filter by:
   - Build version
   - Tester group
   - Crash vs. feedback
3. Click feedback to view details:
   - Screenshot (if attached)
   - Device info (iPhone 14 Pro, iOS 17.2)
   - Written description

**Respond to Feedback:**
- Reply directly in App Store Connect
- Tester receives email notification with your response

### External Feedback Channels

**Email:**
- steve@lander.media
- Create dedicated alias: beta@lander.media

**Slack/Discord:**
- Create private beta tester channel
- Invite testers after they join TestFlight

**Survey (Optional):**
- Google Forms, Typeform, or SurveyMonkey
- Ask:
  - How satisfied are you with Kull? (1-10)
  - What's your biggest pain point?
  - What feature would you pay extra for?
  - Would you recommend Kull to other photographers? (NPS score)

### Crash Reports

**View Crash Reports:**

1. **App Store Connect → TestFlight → Crashes**
2. Click crash to view stack trace
3. Download `.crash` file for debugging

**Symbolicate Crashes (if needed):**

```bash
# Locate dSYM file
ls ~/Library/Developer/Xcode/Archives/

# Symbolicate crash
symbolicatecrash crash.crash /path/to/kull.app.dSYM > symbolicated.crash
```

**Prioritize Crashes:**
1. Crashes affecting >10% of testers (critical)
2. Crashes during core workflows (photo processing, XMP export)
3. Crashes on specific devices/iOS versions

---

## Managing Testers

### View Tester Status

**App Store Connect → TestFlight → [Group] → Testers**

**Tester Statuses:**
- **Invited** - Invite sent, not yet accepted
- **Installed** - TestFlight installed, beta not yet downloaded
- **Testing** - Beta app installed
- **Expired** - Build expired (90 days), need to upload new build

**Activity Metrics:**
- **Sessions:** Number of times tester opened app
- **Crashes:** Number of crashes experienced
- **Feedback:** Number of feedback submissions
- **Last Session:** Date/time of last app usage

### Remove Testers

**When to Remove:**
- Tester hasn't opened app in 30+ days
- Tester asked to be removed
- Tester is spamming feedback

**How to Remove:**

1. Select tester
2. Click **Remove from Group**
3. Confirm removal
4. Tester no longer receives new builds

**Tester can reinstall via public link (if enabled)**

---

## Beta Testing Best Practices

### 1. Start Small, Scale Gradually

**Week 1:** Internal testers only (10-20 people)
- Fix critical bugs before external release

**Week 2:** Invite 50-100 external testers (early access group)
- Collect initial feedback, iterate

**Week 3-4:** Open public link, scale to 500-1,000 testers
- Monitor crash rate, stabilize

**Month 2:** Scale to 2,000+ testers if stable

### 2. Communicate Frequently

**Weekly update email:**
```
Subject: Kull Beta Update - Build 12 Now Available

Hi Beta Testers,

New build released today! Here's what's new:

✅ Fixed:
• Crash when importing folders with 1,000+ photos
• XMP export failing on network drives

✨ New:
• Added support for Capture One sidecar files
• Dark mode for macOS app

🚧 Known Issues:
• iOS push notifications delayed (fix coming next week)

Please update to build 12 and test these features. Report issues via in-app feedback.

Thank you for your help making Kull better!

- Kull Team
```

### 3. Incentivize Testing

**Rewards for Active Testers:**
- **50% lifetime discount** for testers who submit 5+ feedback reports
- **Free year of Kull** for bug hunters who find critical issues
- **Shout-out on Twitter** for top contributors

**Gamification:**
- Leaderboard: Most active testers
- Badges: "Bug Hunter," "Feature Requester," "Power User"

### 4. Segment Feedback

**Tag feedback by category:**
- **Bug:** Something broken
- **Feature Request:** New functionality
- **UI/UX:** Design feedback
- **Performance:** Speed, latency issues
- **Crash:** App crashed

**Prioritize based on:**
1. Frequency (how many testers report same issue?)
2. Severity (does it block core workflow?)
3. Effort (how long to fix?)

---

## TestFlight Metrics & Analytics

### Key Metrics to Track

**Activation Rate:**
```
(Testers who installed beta / Testers invited) × 100%
```
**Benchmark:** 60-80% for internal testers, 30-50% for external testers

**Engagement Rate:**
```
(Testers with 5+ sessions / Total testers) × 100%
```
**Benchmark:** 40-60% for committed beta community

**Crash-Free Rate:**
```
(Sessions without crashes / Total sessions) × 100%
```
**Target:** >99% before App Store release

**Feedback Rate:**
```
(Testers who submitted feedback / Total testers) × 100%
```
**Benchmark:** 10-20% (higher is better)

### Export Tester Data

1. **App Store Connect → TestFlight → [Group]**
2. Click **Export Data** (top-right)
3. Download CSV with:
   - Tester email
   - Install status
   - Sessions
   - Crashes
   - Feedback count

**Analyze in spreadsheet:**
- Identify inactive testers (0 sessions) → Send reminder email
- Reward top testers (10+ sessions, 5+ feedback)

---

## Graduating from Beta to App Store

### Pre-Release Checklist

- [ ] **Crash-free rate >99%** (TestFlight → Crashes)
- [ ] **All critical bugs fixed** (no P0/P1 issues)
- [ ] **10+ positive feedback submissions** (validation)
- [ ] **No unresolved crashes** in last 3 builds
- [ ] **Beta testing for 2+ weeks** (sufficient time to find issues)

### Communicate with Beta Testers

**Email: "Kull Launching on App Store"**

```
Subject: 🎉 Kull is Launching on the App Store!

Hi Beta Testers,

Thank you for helping us make Kull the best AI photo culling tool for photographers. Your feedback was invaluable!

🚀 Kull is NOW LIVE on the App Store:
[App Store Link]

As a thank-you for beta testing, here's your exclusive reward:
🎁 50% OFF Lifetime Subscription (code: BETA50)
Expires: [30 days from now]

What's Next:
• Download the official version from the App Store
• Your beta data will NOT transfer (fresh start)
• TestFlight beta will remain active for 30 days, then sunset

Keep Sharing Feedback:
Email: steve@lander.media
Twitter: @KullApp

Thank you for being part of Kull's journey! 🙏

- Kull Team
```

### Sunset TestFlight Beta

**30 days after App Store launch:**

1. Stop distributing new builds to external testers
2. Keep internal testing active (for v1.1, v1.2 betas)
3. Archive TestFlight feedback for future reference

---

## Troubleshooting

### Issue: Testers not receiving invite email

**Cause:** Email in spam, incorrect email address, corporate email blocking

**Fix:**
1. Check spam folder
2. Resend invite: Select tester → **Resend Invite**
3. Try alternate email address
4. Use public link as backup

### Issue: "This build has expired"

**Cause:** TestFlight builds expire after 90 days

**Fix:**
1. Upload new build (same version, incremented build number)
2. Notify testers to update

### Issue: Beta App Review rejected

**Cause:** App crashes, missing functionality, incomplete instructions

**Fix:**
1. Read rejection reason in Resolution Center
2. Fix issues (add test instructions, fix crashes)
3. Upload new build
4. Resubmit for review (reply to Resolution Center)

### Issue: Low tester engagement

**Cause:** Unclear instructions, no incentive, forgot about beta

**Fix:**
1. Send reminder email with clear testing steps
2. Offer incentive (50% discount, free year)
3. Simplify testing: "Just import 10 photos and see what happens"

---

## Resources

**Apple Documentation:**
- [TestFlight Overview](https://developer.apple.com/testflight/)
- [TestFlight Best Practices](https://developer.apple.com/testflight/best-practices/)
- [Beta Testing](https://help.apple.com/app-store-connect/#/devdc42b26b8)

**Tools:**
- [TestFlight App (iOS)](https://apps.apple.com/app/testflight/id899247664)
- [Transporter (Upload Builds)](https://apps.apple.com/app/transporter/id1450874784)

**Community:**
- Reddit: /r/iOSBeta (beta testing tips)
- Twitter: @TestFlight (official updates)

---

**Last Updated:** November 18, 2025
