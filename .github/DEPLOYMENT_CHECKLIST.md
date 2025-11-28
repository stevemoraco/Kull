# GitHub Actions Deployment Checklist

Use this checklist when deploying the automated DMG build system for the first time.

---

## Phase 1: Pre-Deployment (Local Setup)

### Certificate Preparation
- [ ] Open **Keychain Access** on your Mac
- [ ] Locate certificate: **"Developer ID Application: Your Name (283HJ7VJR4)"**
- [ ] Right-click certificate → **Export "Developer ID Application..."**
- [ ] Save as: `build_certificate.p12`
- [ ] Set password (remember this - it's `P12_PASSWORD`)
- [ ] Run: `base64 -i build_certificate.p12 -o build_certificate_base64.txt`
- [ ] Verify file created: `cat build_certificate_base64.txt | wc -l` (should be many lines)

### Apple ID Preparation
- [ ] Go to https://appleid.apple.com
- [ ] Sign in with your Apple Developer account
- [ ] Navigate to **Security** section
- [ ] Click **App-Specific Passwords**
- [ ] Generate new password, label: **"GitHub Actions - Kull DMG Build"**
- [ ] Copy password to secure note (you'll need it for `APPLE_ID_PASSWORD`)

### Team ID Verification
- [ ] Go to https://developer.apple.com/account
- [ ] Sign in
- [ ] Verify Team ID shows: **283HJ7VJR4**
- [ ] If different, update `ExportOptions.plist` with correct Team ID

---

## Phase 2: GitHub Secret Configuration

### Access GitHub Secrets
- [ ] Go to your GitHub repository
- [ ] Click **Settings** (top menu)
- [ ] Click **Secrets and variables** → **Actions**

### Add Secret #1: BUILD_CERTIFICATE_BASE64
- [ ] Click **New repository secret**
- [ ] Name: `BUILD_CERTIFICATE_BASE64`
- [ ] Value: Paste contents of `build_certificate_base64.txt`
- [ ] Click **Add secret**
- [ ] Verify secret appears in list

### Add Secret #2: P12_PASSWORD
- [ ] Click **New repository secret**
- [ ] Name: `P12_PASSWORD`
- [ ] Value: The password you used when exporting the certificate
- [ ] Click **Add secret**
- [ ] Verify secret appears in list

### Add Secret #3: KEYCHAIN_PASSWORD
- [ ] Run: `openssl rand -base64 32`
- [ ] Copy the output
- [ ] Click **New repository secret**
- [ ] Name: `KEYCHAIN_PASSWORD`
- [ ] Value: Paste the random password
- [ ] Click **Add secret**
- [ ] Verify secret appears in list

### Add Secret #4: APPLE_ID
- [ ] Click **New repository secret**
- [ ] Name: `APPLE_ID`
- [ ] Value: Your Apple Developer email (e.g., `developer@yourdomain.com`)
- [ ] Click **Add secret**
- [ ] Verify secret appears in list

### Add Secret #5: APPLE_ID_PASSWORD
- [ ] Click **New repository secret**
- [ ] Name: `APPLE_ID_PASSWORD`
- [ ] Value: The app-specific password you generated
- [ ] Click **Add secret**
- [ ] Verify secret appears in list

### Add Secret #6: APPLE_TEAM_ID
- [ ] Click **New repository secret**
- [ ] Name: `APPLE_TEAM_ID`
- [ ] Value: `283HJ7VJR4` (or your Team ID if different)
- [ ] Click **Add secret**
- [ ] Verify secret appears in list

### Verify All Secrets
- [ ] You should see exactly 6 secrets:
  - BUILD_CERTIFICATE_BASE64
  - P12_PASSWORD
  - KEYCHAIN_PASSWORD
  - APPLE_ID
  - APPLE_ID_PASSWORD
  - APPLE_TEAM_ID

---

## Phase 3: Repository Permissions

### Enable Workflow Permissions
- [ ] Still in **Settings**, scroll to **Actions** in left sidebar
- [ ] Click **General**
- [ ] Under **Workflow permissions**, select:
  - ✅ **Read and write permissions**
- [ ] Check: ✅ **Allow GitHub Actions to create and approve pull requests**
- [ ] Click **Save**

### Verify Branch Protection (if applicable)
- [ ] Click **Branches** in left sidebar
- [ ] If `main` has protection rules:
  - [ ] Ensure "Allow force pushes" includes "GitHub Actions"
  - [ ] Or disable branch protection for Actions bot

---

## Phase 4: First Deployment

### Push Implementation to Repository
- [ ] Run: `git status` (verify all new files are ready)
- [ ] Run: `git add .github/workflows/build-dmg.yml`
- [ ] Run: `git add "apps/Kull Universal App/kull/ExportOptions.plist"`
- [ ] Run: `git add server/routes/download.ts`
- [ ] Run: `git add client/src/pages/Home.tsx`
- [ ] Run: `git add GITHUB_ACTIONS_SETUP.md`
- [ ] Run: `git add QUICK_SETUP_CHECKLIST.md`
- [ ] Run: `git add GITHUB_ACTIONS_IMPLEMENTATION_SUMMARY.md`
- [ ] Run: `git add .github/DEPLOYMENT_CHECKLIST.md`
- [ ] Run: `git commit -m "Add GitHub Actions automated DMG build workflow"`
- [ ] Run: `git push origin main`

---

## Phase 5: Monitor First Build

### Watch Workflow Execution
- [ ] Go to **Actions** tab in GitHub
- [ ] Click on latest workflow run: **"Build and Release macOS DMG"**
- [ ] Watch each step execute (will take ~15-20 minutes)

### Expected Steps (all should show ✅)
- [ ] Checkout repository
- [ ] Set up Xcode
- [ ] Generate version number
- [ ] Install Apple Certificate
- [ ] Build macOS app
- [ ] Export app
- [ ] Install create-dmg
- [ ] Create DMG
- [ ] Notarize app (this takes ~5 minutes)
- [ ] Upload DMG to GitHub Release
- [ ] Copy DMG to client/public/downloads
- [ ] Update download route with new version
- [ ] Set up Node.js
- [ ] Install dependencies
- [ ] Build website
- [ ] Commit and push changes
- [ ] Clean up keychain

### If Workflow Fails
- [ ] Click on the failed step to see error details
- [ ] Common issues:
  - **Certificate error:** Re-check `BUILD_CERTIFICATE_BASE64` and `P12_PASSWORD`
  - **Notarization error:** Re-check `APPLE_ID` and `APPLE_ID_PASSWORD`
  - **Permission error:** Re-check workflow permissions in Settings → Actions
- [ ] See `GITHUB_ACTIONS_SETUP.md` → Troubleshooting section
- [ ] Fix the issue and re-run workflow (click **Re-run jobs**)

---

## Phase 6: Verify Results

### Check GitHub Release
- [ ] Go to **Releases** in repository
- [ ] Find newest release (e.g., `v2025.11.27.1430`)
- [ ] Verify DMG file is attached
- [ ] Download DMG to test

### Check Repository Changes
- [ ] Go to **Code** tab
- [ ] Check latest commit message: "Update DMG to version X.X.X.X"
- [ ] Click commit → verify files changed:
  - [ ] `client/public/downloads/Kull-v*.dmg` (new file)
  - [ ] `client/public/downloads/Kull-latest.dmg` (new file)
  - [ ] `server/routes/download.ts` (version updated)

### Check Website Update
- [ ] Build and deploy website: `npm run build`
- [ ] If deploying to production, push build
- [ ] Visit production website
- [ ] Check download section shows:
  - [ ] Correct version number
  - [ ] Working download button
  - [ ] DMG downloads successfully

### Test DMG Installation
- [ ] Download DMG from website
- [ ] Open DMG file
- [ ] Drag Kull.app to Applications
- [ ] Launch Kull from Applications
- [ ] Verify no Gatekeeper warnings (should open immediately)
- [ ] Verify app version in About window matches build version

---

## Phase 7: Ongoing Monitoring

### Set Up Notifications
- [ ] Go to **Settings** → **Notifications** in GitHub
- [ ] Enable notifications for:
  - [ ] Actions workflow failures
  - [ ] Release publications

### First Week Monitoring
- [ ] Day 1: Monitor next automated build
- [ ] Day 2: Verify automated commit happened
- [ ] Day 3: Test download from website
- [ ] Day 7: Review all workflow runs for patterns

### Monthly Checks
- [ ] Verify all secrets still valid
- [ ] Check notarization still working
- [ ] Review DMG file sizes (should be ~2 MB)
- [ ] Test download and install on clean Mac

---

## Phase 8: Documentation Handoff

### Team Onboarding
- [ ] Share `GITHUB_ACTIONS_SETUP.md` with team
- [ ] Share `QUICK_SETUP_CHECKLIST.md` for quick reference
- [ ] Add workflow details to team wiki/docs
- [ ] Document who has access to Apple Developer account

### Security Documentation
- [ ] Document secret rotation schedule (quarterly)
- [ ] Document certificate renewal process (yearly)
- [ ] Document backup procedures for certificates
- [ ] Document recovery process if secrets are lost

---

## Completion Checklist

### All Green? Deployment Successful!
- [x] All 6 GitHub Secrets configured
- [x] Workflow permissions set to read/write
- [x] First workflow run completed successfully
- [x] GitHub Release created with DMG
- [x] Repository updated with new DMG and version
- [x] Website shows correct version
- [x] DMG downloads and installs without warnings
- [x] Team notified and documentation shared

---

## Rollback Procedure (If Needed)

If deployment fails catastrophically:

1. **Disable Workflow**
   ```bash
   # Rename workflow to disable it
   git mv .github/workflows/build-dmg.yml .github/workflows/build-dmg.yml.disabled
   git commit -m "Disable automated DMG build temporarily"
   git push origin main
   ```

2. **Revert Code Changes**
   ```bash
   git revert HEAD~1
   git push origin main
   ```

3. **Delete Secrets**
   - Go to Settings → Secrets → Delete all 6 secrets

4. **Manual Build**
   - Build DMG locally using instructions in `GITHUB_ACTIONS_SETUP.md`
   - Upload manually to GitHub Releases
   - Update website manually

---

## Success! Next Steps

Once deployment is successful:
- ✅ Automated builds will run on every push to main
- ✅ No manual intervention needed for releases
- ✅ Website always shows latest version
- ✅ Users always download notarized, signed DMG

### Maintenance Schedule
- **Weekly:** Check Actions tab for any failures
- **Monthly:** Test full download → install flow
- **Quarterly:** Rotate app-specific password
- **Yearly:** Renew Developer ID certificate

---

**Deployment Date:** _______________
**Deployed By:** _______________
**First Build Version:** _______________
**Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Complete

---

## Questions or Issues?

See full documentation: `GITHUB_ACTIONS_SETUP.md`
Contact: steve@lander.media
