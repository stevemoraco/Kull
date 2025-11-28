# Xcode Cloud Quick Start Guide

**Complete these steps in Xcode to enable automatic builds and TestFlight distribution.**

---

## Prerequisites

- [x] Xcode 15+ installed
- [x] macOS 14+ (Sonoma or later)
- [x] Apple Developer Program membership (paid account)
- [x] App Store Connect access (steve@lander.media)
- [x] API Key created in App Store Connect
  - Key ID: `S9KW8G5RHS`
  - Issuer ID: `c63dccab-1ecd-41dc-9374-174cfdb70958`
  - Key file: `~/.private_keys/AuthKey_S9KW8G5RHS.p8`

---

## Step-by-Step Setup (15 minutes)

### 1. Open Project in Xcode

```bash
cd "/Users/stevemoraco/Lander Dropbox/Steve Moraco/Mac (6)/Downloads/ai image culling/kull/apps/Kull Universal App/kull"
open kull.xcodeproj
```

---

### 2. Configure App Store Connect Integration

**In Xcode menu:**
1. Click **Xcode** → **Settings** (or press `Cmd+,`)
2. Go to **Accounts** tab
3. Click **+** button → **Add Account**
4. Select **App Store Connect**
5. Sign in with: `steve@lander.media`
6. Enter password (or use Face ID/Touch ID)
7. Click **Done**

**Verify:**
- Should see "Steve Moraco" account listed
- Role should show as "Admin" or "Account Holder"

---

### 3. Enable Xcode Cloud

**In Xcode menu:**
1. Click **Product** → **Xcode Cloud** → **Create Workflow...**
2. Dialog appears: "Set Up Xcode Cloud"
3. Click **Get Started**

**Grant Repository Access:**
1. If using GitHub/GitLab:
   - Click **Grant Access**
   - Authorize Xcode Cloud in browser
2. If using local Git:
   - Xcode will handle automatically

---

### 4. Create Production Workflow

**Workflow Setup Screen:**

#### General Tab:
- **Workflow Name:** `Production Build`
- **Description:** `Automatic builds for main branch with TestFlight distribution`
- **Restrict Editing:** Unchecked (allow edits later)

#### Environment Tab:
- **Xcode Version:** Latest Release *(recommended)*
- **macOS Version:** Latest Release *(recommended)*
- **Clean Build:** ✅ Checked *(ensures fresh builds)*

---

### 5. Configure Start Conditions

**Click "Start Conditions" → Add Condition:**

#### Branch Changes:
1. Click **+ Add Branch**
2. **Branch:** `main`
3. **File and Folder Conditions:** Leave empty (build on any change)
4. **Auto-cancel Outdated Builds:** ✅ Checked

**Result:** Any push to `main` branch triggers a build.

---

### 6. Configure Build Actions

**Click "Actions" → Add Action:**

#### Action 1: Archive (Required for TestFlight)
1. Click **+ Add Action** → **Archive**
2. **Platform:** iOS
3. **Scheme:** kull *(auto-selected)*
4. **Destination:** Generic iOS Device

#### Action 2: Test (Highly Recommended)
1. Click **+ Add Action** → **Test**
2. **Platform:** iOS Simulator
3. **Scheme:** kull
4. **Destinations:** Click **+ Add Destination**
   - Add: `iPhone 16 Pro (iOS 18.0)`
   - Add: `iPad Pro 12.9-inch (iPadOS 18.0)`

**Why test?**
- Catches bugs before TestFlight upload
- Verifies app works on different devices
- Prevents bad builds from reaching testers

---

### 7. Configure Post-Actions

#### TestFlight Distribution:

1. Click **Post-Actions** tab
2. Click **+ Add Action** → **TestFlight**
3. **Settings:**
   - **Enable Distribution:** ✅ Checked
   - **Group:** Select `External Testers` *(or create new group)*
   - **Automatically Notify Testers:** ✅ Checked
   - **What to Test:** Leave default *(uses commit messages)*

**Public TestFlight Link:**
Builds will be available at: `https://testflight.apple.com/join/PtzCFZKb`

---

#### App Store Submission (Optional - Do NOT enable yet):

⚠️ **Skip this for now. Enable ONLY after:**
- First manual submission approved by Apple
- All metadata complete in App Store Connect
- You're ready for automatic production releases

When ready:
1. Click **+ Add Action** → **Submit to App Store**
2. **Release After Approval:** Manual (recommended)
3. **Phased Release:** ✅ Checked (gradual rollout)

---

### 8. Verify CI Scripts

**In Xcode Project Navigator:**
1. Expand project root
2. Look for `ci_scripts/` folder
3. Should contain:
   - ✅ `ci_post_clone.sh`
   - ✅ `ci_pre_xcodebuild.sh`
   - ✅ `ci_post_xcodebuild.sh`

**If missing:**
```bash
cd "/Users/stevemoraco/Lander Dropbox/Steve Moraco/Mac (6)/Downloads/ai image culling/kull/apps/Kull Universal App/kull"
ls -la ci_scripts/
```

All scripts should be executable (`-rwxr-xr-x`).

**If not executable:**
```bash
chmod +x ci_scripts/*.sh
git add ci_scripts/
git commit -m "Make CI scripts executable"
git push origin main
```

---

### 9. Configure Code Signing

**In Xcode:**
1. Select **kull** target (blue icon at top of project navigator)
2. Go to **Signing & Capabilities** tab
3. **Automatically manage signing:** ✅ Checked
4. **Team:** Select your Apple Developer team
5. **Bundle Identifier:** Should be `media.lander.kull`

**Verify:**
- Should show: ✅ "Signing Certificate: Apple Development"
- Should show: ✅ "Provisioning Profile: Xcode Managed Profile"

**For Distribution (Release builds):**
Xcode Cloud automatically manages release certificates. No action needed.

---

### 10. Save Workflow and Trigger First Build

**Save:**
1. Click **Save** in workflow editor
2. Close workflow window

**Trigger First Build:**

**Option A: Push to main branch**
```bash
# Make a small change (e.g., add comment to file)
echo "// Trigger CI" >> kull/kullApp.swift
git add .
git commit -m "Test Xcode Cloud integration"
git push origin main
```

**Option B: Manual trigger**
1. In Xcode: **Product** → **Xcode Cloud** → **Start Build...**
2. Select `Production Build` workflow
3. Select branch: `main`
4. Click **Start Build**

---

### 11. Monitor Build Progress

**In Xcode:**
1. **Product** → **Xcode Cloud** → **Manage Workflows...**
2. Click **Production Build** workflow
3. See build list with status:
   - 🔵 Running
   - ✅ Succeeded
   - ❌ Failed

**View Logs:**
1. Click on a build
2. See tabs:
   - **Summary** - Overall status
   - **Tests** - Test results
   - **Logs** - Full build logs (including CI scripts)
   - **Artifacts** - Download IPA files

**In App Store Connect:**
1. Go to https://appstoreconnect.apple.com
2. **TestFlight** → **iOS**
3. See new build appear (may take 5-10 minutes after Xcode shows success)

---

### 12. Verify TestFlight Build

**Check Build Status:**
1. App Store Connect → TestFlight → iOS
2. Find latest build (e.g., `1.0 (202411271430)`)
3. Status should be:
   - Processing... → Ready to Test

**Test the Build:**
1. Install TestFlight app on iPhone/iPad
2. Open TestFlight link: https://testflight.apple.com/join/PtzCFZKb
3. Accept invite
4. Download and test the build

**What to test:**
- App launches successfully
- Authentication works
- Core features functional
- No crashes

---

## Troubleshooting

### Build Fails Immediately

**Check:**
1. Repository access granted to Xcode Cloud
2. CI scripts are executable
3. Bundle identifier matches App Store Connect

**View logs:**
- Xcode Cloud → Build → Logs tab
- Look for errors in:
  - `post-clone` logs
  - `pre-xcodebuild` logs
  - `xcodebuild` logs

---

### Build Succeeds but Not in TestFlight

**Check:**
1. App Store Connect API key is valid
   - App Store Connect → Users and Access → Keys
   - Verify `S9KW8G5RHS` is active
2. Bundle ID matches exactly: `media.lander.kull`
3. Post-Action "TestFlight" is enabled in workflow

**Check email:**
- App Store Connect sends email when build is ready
- May take 5-10 minutes for processing

---

### Version Number Not Updating

**Check `ci_pre_xcodebuild.sh` logs:**
1. Xcode Cloud → Build → Logs
2. Expand `pre-xcodebuild` section
3. Should see:
   ```
   Generated build number: 202411271430
   Updated CFBundleVersion to: 202411271430
   ```

**If missing:**
- Verify script is executable: `ls -l ci_scripts/ci_pre_xcodebuild.sh`
- Should show: `-rwxr-xr-x`

---

### Tests Fail on CI but Pass Locally

**Common causes:**
1. **Timing differences** - CI may be slower
   - Add `sleep()` or increase timeouts
2. **Missing test data** - Not committed to repo
   - Verify test files are in git: `git status`
3. **Hardcoded paths** - Use relative paths
   - Replace absolute paths with `Bundle.main.path(...)`

**Debug:**
- Download test results bundle from Xcode Cloud
- Contains screenshots and logs

---

## Next Steps

After first successful build:

1. **Monitor for a few builds**
   - Ensure version numbering works consistently
   - Verify TestFlight uploads reliably

2. **Set up notifications**
   - Customize `ci_post_xcodebuild.sh` to send Slack/email notifications

3. **Configure App Store submission**
   - Complete app metadata in App Store Connect
   - Upload screenshots
   - Configure privacy labels
   - Submit first version MANUALLY
   - After approval, enable auto-submission

4. **Create additional workflows** (optional)
   - `Development` workflow for feature branches
   - `Staging` workflow for pre-release testing

---

## Useful Commands

**View CI script output:**
```bash
# Check if scripts are executable
ls -la ci_scripts/

# Test script locally
cd ci_scripts/
./ci_pre_xcodebuild.sh
```

**Manual version update:**
```bash
# Update marketing version (e.g., for major release)
cd kull/
/usr/libexec/PlistBuddy -c "Set :CFBundleShortVersionString 2.0" Info.plist

# Commit and push
git add Info.plist
git commit -m "Bump version to 2.0"
git push origin main
```

**Skip CI build:**
```bash
# Include [skip ci] in commit message
git commit -m "Update README [skip ci]"
git push origin main
# Won't trigger Xcode Cloud build
```

---

## Additional Resources

**Apple Documentation:**
- [Xcode Cloud Overview](https://developer.apple.com/xcode-cloud/)
- [Configuring Workflows](https://developer.apple.com/documentation/xcode/configuring-your-first-xcode-cloud-workflow)
- [Writing Custom Build Scripts](https://developer.apple.com/documentation/xcode/writing-custom-build-scripts)

**Kull Project:**
- Full documentation: `XCODE_CLOUD_SETUP.md`
- CI scripts: `ci_scripts/`
- TestFlight link: https://testflight.apple.com/join/PtzCFZKb

---

**Setup Complete! 🎉**

Xcode Cloud will now:
- ✅ Build on every push to `main`
- ✅ Run tests automatically
- ✅ Upload to TestFlight
- ✅ Version builds with date/time stamps

**Questions?** Contact: steve@lander.media
