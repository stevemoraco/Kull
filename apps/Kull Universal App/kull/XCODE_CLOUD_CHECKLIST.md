# Xcode Cloud Setup Checklist

**Project:** Kull Universal App
**Date:** November 27, 2024
**Status:** ✅ CI Scripts Complete | ⏳ Xcode Configuration Pending

---

## Pre-Setup Verification

### ✅ Completed Items

- [x] **CI scripts created and tested**
  - [x] `ci_scripts/ci_post_clone.sh` (executable)
  - [x] `ci_scripts/ci_pre_xcodebuild.sh` (executable)
  - [x] `ci_scripts/ci_post_xcodebuild.sh` (executable)
  - [x] `ci_scripts/test_ci_scripts.sh` (test suite)
  - [x] All tests pass successfully

- [x] **Version numbering system implemented**
  - Format: `YYYYMMDDHHMM` (e.g., `202411271430`)
  - Auto-generated on every build
  - Tested and verified

- [x] **Documentation complete**
  - [x] `XCODE_CLOUD_SETUP.md` (14 KB - technical reference)
  - [x] `XCODE_CLOUD_QUICK_START.md` (10 KB - step-by-step guide)
  - [x] `XCODE_CLOUD_IMPLEMENTATION_SUMMARY.md` (9 KB - summary)
  - [x] `ci_scripts/xcode-cloud-workflow-reference.yml` (workflow config reference)

- [x] **App Store Connect credentials documented**
  - Key ID: `S9KW8G5RHS`
  - Issuer ID: `c63dccab-1ecd-41dc-9374-174cfdb70958`
  - App ID: `6755838738`
  - Bundle ID: `media.lander.kull`

---

## Xcode Cloud Setup (In Xcode UI)

### Step 1: Enable Xcode Cloud

- [ ] Open `kull.xcodeproj` in Xcode
- [ ] Go to Product → Xcode Cloud → Create Workflow
- [ ] Grant repository access
- [ ] Connect to App Store Connect (steve@lander.media)

**Estimated Time:** 5 minutes

---

### Step 2: Create Production Workflow

- [ ] Name workflow: `Production Build`
- [ ] Set description: `Automatic builds for main branch with TestFlight distribution`
- [ ] Configure environment:
  - [ ] Xcode Version: Latest Release
  - [ ] macOS Version: Latest Release
  - [ ] Clean Build: ✅ Enabled

**Estimated Time:** 3 minutes

---

### Step 3: Configure Start Conditions

- [ ] Add branch condition: `main`
- [ ] Enable auto-cancel outdated builds
- [ ] Leave file conditions empty (build on any change)

**Estimated Time:** 2 minutes

---

### Step 4: Configure Build Actions

#### Archive Action:
- [ ] Add Archive action
- [ ] Platform: iOS
- [ ] Scheme: kull
- [ ] Destination: Generic iOS Device

#### Test Action (Recommended):
- [ ] Add Test action
- [ ] Platform: iOS Simulator
- [ ] Add test destinations:
  - [ ] iPhone 16 Pro (iOS 18.0)
  - [ ] iPad Pro 12.9-inch (iPadOS 18.0)

**Estimated Time:** 5 minutes

---

### Step 5: Configure TestFlight Post-Action

- [ ] Add TestFlight post-action
- [ ] Enable automatic distribution
- [ ] Select group: `External Testers`
- [ ] Enable automatic notifications
- [ ] Verify public link: https://testflight.apple.com/join/PtzCFZKb

**Estimated Time:** 3 minutes

---

### Step 6: Verify Code Signing

- [ ] Select `kull` target
- [ ] Go to Signing & Capabilities
- [ ] Verify "Automatically manage signing" is enabled
- [ ] Verify Bundle ID: `media.lander.kull`
- [ ] Verify team is selected

**Estimated Time:** 2 minutes

---

### Step 7: Save and Trigger First Build

- [ ] Save workflow
- [ ] Trigger build:
  - [ ] **Option A:** Push commit to main branch
  - [ ] **Option B:** Product → Xcode Cloud → Start Build

**Estimated Time:** 1 minute

---

### Step 8: Monitor First Build

- [ ] Watch build in Xcode (Product → Xcode Cloud → Manage Workflows)
- [ ] Verify logs show:
  - [ ] `ci_post_clone.sh` executed
  - [ ] `ci_pre_xcodebuild.sh` set build number (YYYYMMDDHHMM)
  - [ ] Build succeeded
  - [ ] Tests passed
  - [ ] `ci_post_xcodebuild.sh` executed
  - [ ] Upload to TestFlight started

**Estimated Time:** 10-15 minutes (build time)

---

### Step 9: Verify TestFlight Upload

- [ ] Go to https://appstoreconnect.apple.com
- [ ] Navigate to TestFlight → iOS
- [ ] Find latest build (1.0 (YYYYMMDDHHMM))
- [ ] Wait for "Processing..." to complete
- [ ] Status changes to "Ready to Test"

**Estimated Time:** 5-10 minutes (Apple processing)

---

### Step 10: Test Build on Device

- [ ] Install TestFlight app on iPhone/iPad
- [ ] Open link: https://testflight.apple.com/join/PtzCFZKb
- [ ] Accept invite
- [ ] Download build
- [ ] Test core functionality:
  - [ ] App launches
  - [ ] Authentication works
  - [ ] No crashes

**Estimated Time:** 5 minutes

---

## Total Estimated Time: ~45 minutes

- Xcode UI configuration: 20 minutes
- First build: 15 minutes
- TestFlight verification: 10 minutes

---

## Optional: App Store Auto-Submission

**⚠️ Only complete after first manual submission approved!**

### Prerequisites:
- [ ] First app version manually submitted to App Store
- [ ] First version approved by Apple Review
- [ ] All app metadata complete
- [ ] Screenshots uploaded (all sizes)
- [ ] Privacy labels configured

### Configuration:
- [ ] Edit Production Build workflow
- [ ] Add post-action: Submit to App Store
- [ ] Configure settings:
  - [ ] Automatic release: No (manual recommended)
  - [ ] Phased release: Yes
  - [ ] Condition: Only if all tests pass

---

## Troubleshooting Checklist

### If Build Fails:

- [ ] Check Xcode Cloud logs (Product → Xcode Cloud → View Build)
- [ ] Verify CI scripts are executable:
  ```bash
  ls -la ci_scripts/*.sh
  # Should show: -rwxr-xr-x
  ```
- [ ] Check Info.plist exists at correct path
- [ ] Verify Bundle ID matches App Store Connect

### If Version Number Not Updating:

- [ ] Check `ci_pre_xcodebuild.sh` logs in Xcode Cloud
- [ ] Should see: "Generated build number: YYYYMMDDHHMM"
- [ ] Verify script has execute permissions
- [ ] Run local test: `./ci_scripts/test_ci_scripts.sh`

### If TestFlight Upload Fails:

- [ ] Verify App Store Connect API key is valid
  - Go to: App Store Connect → Users and Access → Keys
  - Check: `S9KW8G5RHS` is active
- [ ] Verify Bundle ID: `media.lander.kull`
- [ ] Check code signing certificate
- [ ] Review build logs for errors

---

## Post-Setup Tasks

### After First Successful Build:

- [ ] Monitor 2-3 builds to ensure consistency
- [ ] Verify version numbers increment correctly
- [ ] Confirm TestFlight uploads reliably
- [ ] Test on multiple devices

### Optional Enhancements:

- [ ] Add Slack notifications (edit `ci_post_xcodebuild.sh`)
- [ ] Create development workflow for feature branches
- [ ] Set up staging environment
- [ ] Configure automatic release notes from commits

---

## Quick Commands

### Test CI Scripts Locally:
```bash
cd "/Users/stevemoraco/Lander Dropbox/Steve Moraco/Mac (6)/Downloads/ai image culling/kull/apps/Kull Universal App/kull"
./ci_scripts/test_ci_scripts.sh
```

### Manually Update Marketing Version:
```bash
cd "kull/"
/usr/libexec/PlistBuddy -c "Set :CFBundleShortVersionString 2.0" Info.plist
git add Info.plist
git commit -m "Bump version to 2.0"
git push origin main
```

### Skip CI Build (include in commit message):
```bash
git commit -m "Update documentation [skip ci]"
git push origin main
```

---

## Documentation References

**Quick Start (Step-by-Step):**
`XCODE_CLOUD_QUICK_START.md`

**Complete Technical Reference:**
`XCODE_CLOUD_SETUP.md`

**Implementation Summary:**
`XCODE_CLOUD_IMPLEMENTATION_SUMMARY.md`

**This Checklist:**
`XCODE_CLOUD_CHECKLIST.md`

---

## Success Criteria

### ✅ Setup is Complete When:

1. **Workflow exists in Xcode Cloud**
   - Named "Production Build"
   - Triggered by main branch commits

2. **First build succeeds**
   - All tests pass
   - Archive created
   - No errors in logs

3. **Version numbering works**
   - Build number format: `YYYYMMDDHHMM`
   - Unique for each build
   - Visible in Xcode Cloud logs

4. **TestFlight upload works**
   - Build appears in App Store Connect
   - Status: "Ready to Test"
   - Available on public link

5. **App functions on device**
   - Installs via TestFlight
   - Launches successfully
   - Core features work

---

## Next Steps After Setup

1. **Commit CI scripts to repository**
   ```bash
   git add ci_scripts/
   git add XCODE_CLOUD*.md
   git commit -m "Add Xcode Cloud CI/CD configuration"
   git push origin main
   ```

2. **Follow Quick Start Guide**
   - Open `XCODE_CLOUD_QUICK_START.md`
   - Complete all 12 steps
   - Estimated time: 30 minutes

3. **Verify First Build**
   - Check all items in "Monitor First Build" section
   - Test on device via TestFlight

4. **Document Any Issues**
   - Note any deviations from expected behavior
   - Update documentation as needed
   - Report bugs to steve@lander.media

---

**Last Updated:** November 27, 2024
**Maintained By:** steve@lander.media
**Status:** Ready for Xcode UI configuration
