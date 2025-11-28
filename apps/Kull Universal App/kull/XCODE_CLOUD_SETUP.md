# Xcode Cloud Setup for Kull Universal App

This document explains how Xcode Cloud is configured for automatic builds, TestFlight distribution, and App Store submission.

---

## Overview

**What Xcode Cloud Does:**
- Automatically builds the app when code is pushed to `main` branch
- Sets version numbers using date/time format (YYYYMMDDHHMM)
- Runs all tests to verify build quality
- Archives and signs the app for distribution
- Uploads builds to TestFlight automatically
- (Optional) Submits to App Store for review when ready

---

## Version Numbering System

**Format:** Date/Time based versioning

- **CFBundleShortVersionString** (Marketing Version): `1.0`
  - This is the user-facing version number (e.g., "1.0", "2.0", "2.1")
  - Update manually for major releases
  - Shown in App Store and About screen

- **CFBundleVersion** (Build Number): `YYYYMMDDHHMM`
  - Example: `202411271430` (November 27, 2024 at 2:30 PM)
  - Auto-generated on every CI build
  - Unique identifier for each build
  - Used by App Store Connect to differentiate builds

**Why date/time format?**
- Guaranteed to be unique and incrementing
- Easy to correlate builds with commits
- Human-readable timestamp
- No manual tracking needed

---

## CI Scripts Breakdown

All scripts are in `ci_scripts/` directory:

### 1. `ci_post_clone.sh`
**When it runs:** After repository is cloned, before build starts

**What it does:**
- Logs environment variables (workspace, branch, commit)
- Sets up build environment
- Installs dependencies (currently none, but ready for future use)

**Customization:**
If you add dependencies in the future:
```bash
# Example: Install npm packages
npm install

# Example: Install CocoaPods
pod install
```

---

### 2. `ci_pre_xcodebuild.sh`
**When it runs:** Right before Xcode builds the project

**What it does:**
- Generates build number: `BUILD_NUMBER=$(date +%Y%m%d%H%M)`
- Updates `Info.plist` with new build number
- Verifies the update succeeded
- Logs both marketing version and build number

**How it works:**
```bash
# Generates: 202411271430 (Nov 27, 2024, 2:30 PM)
BUILD_NUMBER=$(date +%Y%m%d%H%M)

# Updates Info.plist
/usr/libexec/PlistBuddy -c "Set :CFBundleVersion $BUILD_NUMBER" "$INFO_PLIST"
```

**Why PlistBuddy?**
- Built into macOS, no dependencies
- Safe XML editing (preserves formatting)
- Error handling built-in

---

### 3. `ci_post_xcodebuild.sh`
**When it runs:** After successful build and archiving

**What it does:**
- Logs build artifacts and paths
- Confirms successful build
- (Optional) Add custom notifications or webhooks here

**Customization ideas:**
```bash
# Send Slack notification
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"New Kull build '$BUILD_NUMBER' uploaded to TestFlight!"}' \
  YOUR_SLACK_WEBHOOK_URL

# Update build status page
# curl -X POST https://your-status-api.com/builds ...
```

---

## Xcode Cloud Configuration (In Xcode UI)

**Complete these steps in Xcode:**

### Step 1: Open Xcode Cloud Settings
1. Open `kull.xcodeproj` in Xcode
2. Go to **Product → Xcode Cloud → Manage Workflows...**
3. Click **Create Workflow** (if none exists)

---

### Step 2: Create "Production Build" Workflow

**General Settings:**
- **Workflow Name:** `Production Build`
- **Description:** `Automatic builds for main branch - TestFlight + App Store submission`

**Start Conditions:**
- **Branch Changes:**
  - Branch: `main`
  - File conditions: None (build on ANY change to main)
  - Auto-cancel builds: `Yes` (if newer commit pushed)

**Environment:**
- **Xcode Version:** Latest Release
- **macOS Version:** Latest Release
- **Clean Build:** Yes (recommended for production)

---

### Step 3: Configure Build Actions

**Actions to Add:**

#### Action 1: Build
- **Platform:** iOS
- **Scheme:** kull
- **Archive:** Yes (required for TestFlight/App Store)

#### Action 2: Test (Optional but Recommended)
- **Platform:** iOS
- **Scheme:** kull
- **Test Plan:** Default (or specify custom test plan)
- **Test Devices:**
  - iPhone 16 Pro (iOS 18.0)
  - iPad Pro 12.9" (iPadOS 18.0)

---

### Step 4: Configure Post-Actions

#### TestFlight Distribution
1. Enable **Distribute to TestFlight**
2. **Groups:**
   - Add `External Testers` group
   - Check `Automatically notify testers`
3. **Beta Build Localization:**
   - **What to Test:** (Auto-generated from commit messages)
   - Or specify custom notes

**Public TestFlight Link:**
`https://testflight.apple.com/join/PtzCFZKb`

New builds will automatically be available to testers on this link.

---

#### App Store Submission (Optional)
⚠️ **Only enable this when ready for production releases!**

1. Enable **Submit to App Store**
2. **Conditions:**
   - Only if all tests pass
   - Only if manually approved in App Store Connect
3. **Settings:**
   - Automatic release: No (manual release recommended)
   - Phased release: Yes (gradual rollout)

**To enable auto-submission:**
- All app metadata must be complete in App Store Connect
- Privacy labels must be configured
- Screenshots and descriptions must be uploaded
- First submission MUST be manual (App Store requirement)
- After first approval, subsequent updates can be automated

---

### Step 5: App Store Connect API Setup

**Already Configured:**
- **Key ID:** `S9KW8G5RHS`
- **Issuer ID:** `c63dccab-1ecd-41dc-9374-174cfdb70958`
- **App ID:** `6755838738`
- **Bundle ID:** `media.lander.kull`

**How to verify in Xcode Cloud:**
1. In Workflow settings → **App Store Connect**
2. Should show: `✓ Connected to App Store Connect`
3. Should display: `Kull (6755838738)`

**If not connected:**
1. Click **Connect to App Store Connect**
2. Sign in with Apple ID: `steve@lander.media`
3. Grant Xcode Cloud access to App Store Connect

---

## How Versioning Works

### Example Build Flow:

**1. Developer pushes to main:**
```bash
git add .
git commit -m "Fix image processing bug"
git push origin main
```

**2. Xcode Cloud triggers:**
```
[ci_post_clone.sh] ✓ Repository cloned
[ci_pre_xcodebuild.sh] ✓ Build number set to: 202411271430
[xcodebuild] ✓ Building...
[xcodebuild] ✓ Testing...
[xcodebuild] ✓ Archiving...
[ci_post_xcodebuild.sh] ✓ Build completed
[Xcode Cloud] ✓ Uploading to TestFlight...
[App Store Connect] ✓ Build 202411271430 available for testing
```

**3. TestFlight users notified:**
- Email: "New Kull build available"
- TestFlight app: Update badge appears
- Version shown: `1.0 (202411271430)`

---

### Incrementing Marketing Version

When you want to release a new major version (e.g., v2.0):

**Option 1: Update in Xcode**
1. Open `kull.xcodeproj`
2. Select target → **General** tab
3. Change **Version** from `1.0` to `2.0`
4. Commit and push

**Option 2: Update Info.plist directly**
```bash
cd "apps/Kull Universal App/kull/kull"
/usr/libexec/PlistBuddy -c "Set :CFBundleShortVersionString 2.0" Info.plist
git add Info.plist
git commit -m "Bump version to 2.0"
git push origin main
```

**Option 3: Update via CI script** (add to `ci_pre_xcodebuild.sh`):
```bash
# Only update on tagged releases
if [[ $CI_TAG =~ ^v[0-9]+\.[0-9]+ ]]; then
    VERSION=${CI_TAG#v}  # Remove 'v' prefix
    /usr/libexec/PlistBuddy -c "Set :CFBundleShortVersionString $VERSION" "$INFO_PLIST"
fi
```

Then create releases with:
```bash
git tag -a v2.0 -m "Version 2.0 release"
git push origin v2.0
```

---

## Monitoring Builds

### In Xcode:
1. **Product → Xcode Cloud → Manage Workflows**
2. View build history, logs, and test results
3. Download build artifacts (IPA files)

### In App Store Connect:
1. Go to https://appstoreconnect.apple.com
2. **TestFlight** → **iOS Builds**
3. See all builds, their status, and crash reports

### Build Notifications:
Xcode Cloud sends emails on:
- ✅ Build succeeded
- ❌ Build failed
- ⚠️ Tests failed
- 📱 Build uploaded to TestFlight

---

## Troubleshooting

### Build Number Not Updating
**Symptoms:** Build number stays the same across builds

**Fix:**
```bash
# Verify script is executable
cd "apps/Kull Universal App/kull/ci_scripts"
chmod +x ci_pre_xcodebuild.sh

# Check script logs in Xcode Cloud
# Should see: "Generated build number: YYYYMMDDHHMM"
```

---

### TestFlight Upload Fails
**Symptoms:** Build succeeds but doesn't appear in TestFlight

**Check:**
1. **App Store Connect API key is valid**
   - Go to App Store Connect → Users and Access → Keys
   - Verify `S9KW8G5RHS` is active
2. **Bundle ID matches App Store Connect**
   - Should be: `media.lander.kull`
3. **Code signing certificate is valid**
   - Check in Xcode Cloud workflow settings

---

### Tests Fail on CI but Pass Locally
**Symptoms:** Tests pass on your Mac, fail in Xcode Cloud

**Common causes:**
1. **Timing issues** - CI might be slower
   - Increase timeout values in tests
2. **Missing files** - Not committed to repo
   - Verify all test files are in git
3. **Hardcoded paths** - Use relative paths
   - Replace `/Users/you/...` with `Bundle.main.path(...)`

**Debug:**
- Download test result bundle from Xcode Cloud
- View test logs and screenshots
- Add `print()` statements to see what's different

---

### Skip Auto-Submission (For Testing)
**Scenario:** You want to test CI without uploading to TestFlight

**Option 1: Use a different branch**
```bash
# Work on feature branch (won't trigger Production workflow)
git checkout -b test-ci-changes
git push origin test-ci-changes
```

**Option 2: Temporarily disable workflow**
1. Xcode → Product → Xcode Cloud → Manage Workflows
2. Select `Production Build`
3. Click `···` → **Disable Workflow**
4. Re-enable when ready

**Option 3: Add condition to workflow**
In workflow settings → Start Conditions:
- Add **Commit Message** condition
- Only run if message does NOT contain `[skip ci]`

Then:
```bash
git commit -m "Test changes [skip ci]"
git push origin main  # Won't trigger build
```

---

## App Store Submission Checklist

**Before enabling auto-submission, verify:**

- [ ] **App metadata complete** (App Store Connect)
  - [ ] App name
  - [ ] Subtitle
  - [ ] Description
  - [ ] Keywords
  - [ ] Support URL
  - [ ] Marketing URL
  - [ ] Privacy policy URL

- [ ] **Screenshots uploaded** (all required sizes)
  - [ ] iPhone 6.7" (iPhone 16 Pro Max)
  - [ ] iPhone 6.5" (iPhone 14 Pro Max)
  - [ ] iPad Pro 12.9" (6th gen)
  - [ ] iPad Pro 12.9" (2nd gen)

- [ ] **App Review Information**
  - [ ] Contact email
  - [ ] Contact phone
  - [ ] Demo account credentials (if login required)
  - [ ] Review notes (explain app features)

- [ ] **Privacy Labels Configured**
  - [ ] Data types collected
  - [ ] Data usage purposes
  - [ ] Data linking (to user identity)
  - [ ] Data tracking (across apps/websites)

- [ ] **Export Compliance**
  - [ ] Encryption declaration
  - [ ] If using encryption, submit ERN (Encryption Registration Number)

- [ ] **Age Rating**
  - [ ] Complete questionnaire
  - [ ] Verify rating is appropriate

- [ ] **First submission MUST be manual**
  - App Store requires human review of first submission
  - After approval, can enable auto-submission for updates

---

## Manual App Store Submission (Alternative)

If you prefer NOT to auto-submit:

**1. Build and upload via Xcode Cloud:**
- CI builds and uploads to TestFlight automatically
- Do NOT enable "Submit to App Store" in workflow

**2. Submit manually from App Store Connect:**
```
1. Go to https://appstoreconnect.apple.com
2. My Apps → Kull
3. App Store → iOS App
4. Click "+" next to Builds
5. Select build: 1.0 (202411271430)
6. Fill out "What's New in This Version"
7. Click "Save" → "Submit for Review"
```

---

## CI Script Customization

### Add Slack Notifications

**Edit `ci_post_xcodebuild.sh`:**
```bash
#!/bin/bash
set -e

BUILD_NUMBER=$(date +%Y%m%d%H%M)

# Send Slack notification
SLACK_WEBHOOK="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
MESSAGE="✅ New Kull build uploaded to TestFlight!\nBuild: $BUILD_NUMBER\nBranch: $CI_BRANCH\nCommit: $CI_COMMIT"

curl -X POST -H 'Content-type: application/json' \
  --data "{\"text\":\"$MESSAGE\"}" \
  $SLACK_WEBHOOK

echo "Slack notification sent"
```

---

### Add Custom Version Tagging

**Edit `ci_pre_xcodebuild.sh`:**
```bash
#!/bin/bash
set -e

# If this is a tagged release (e.g., v1.0, v2.0)
if [[ $CI_TAG =~ ^v[0-9]+\.[0-9]+ ]]; then
    # Use tag as marketing version
    MARKETING_VERSION=${CI_TAG#v}
    /usr/libexec/PlistBuddy -c "Set :CFBundleShortVersionString $MARKETING_VERSION" "$INFO_PLIST"
    echo "Using tagged version: $MARKETING_VERSION"
fi

# Always use date/time for build number
BUILD_NUMBER=$(date +%Y%m%d%H%M)
/usr/libexec/PlistBuddy -c "Set :CFBundleVersion $BUILD_NUMBER" "$INFO_PLIST"
```

---

### Add Build Artifact Archiving

**Edit `ci_post_xcodebuild.sh`:**
```bash
#!/bin/bash
set -e

# Archive IPA and dSYM to external storage
if [ -n "$CI_ARCHIVE_PATH" ]; then
    # Copy to Dropbox, S3, or network drive
    cp -R "$CI_ARCHIVE_PATH" /path/to/archive/storage/
    echo "Archived build to storage"
fi
```

---

## Security Notes

**API Key Storage:**
- API key (`AuthKey_S9KW8G5RHS.p8`) stored in:
  - `~/.private_keys/` on local machine
  - Xcode Cloud securely stores it (uploaded once)
- **NEVER commit API key to git repository**
- Add to `.gitignore`:
  ```
  *.p8
  **/AuthKey_*.p8
  ~/.private_keys/
  ```

**Access Control:**
- Only App Store Connect account holder can modify workflows
- CI builds use dedicated API key (limited permissions)
- Revoke key immediately if compromised

---

## Additional Resources

**Apple Documentation:**
- [Xcode Cloud Overview](https://developer.apple.com/xcode-cloud/)
- [CI Scripts Reference](https://developer.apple.com/documentation/xcode/writing-custom-build-scripts)
- [App Store Connect API](https://developer.apple.com/documentation/appstoreconnectapi)
- [TestFlight Beta Testing](https://developer.apple.com/testflight/)

**Kull Specific:**
- Project repo: [GitHub/GitLab URL]
- TestFlight public link: https://testflight.apple.com/join/PtzCFZKb
- App Store Connect: https://appstoreconnect.apple.com

---

**Last Updated:** November 27, 2024
**Maintained By:** steve@lander.media
