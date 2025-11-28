# Quick Setup Checklist - GitHub Actions DMG Build

## ✅ Prerequisites
- [ ] You have an Apple Developer account
- [ ] You have a valid Developer ID Application certificate
- [ ] You have access to the GitHub repository settings
- [ ] You have Xcode Command Line Tools installed locally

---

## 🔑 GitHub Secrets to Configure

Go to: **Repository → Settings → Secrets and variables → Actions**

### Required Secrets (6 total)

1. **BUILD_CERTIFICATE_BASE64**
   - Your Developer ID certificate encoded in base64
   - Get it: Export .p12 from Keychain → `base64 -i cert.p12`

2. **P12_PASSWORD**
   - Password used when exporting the certificate

3. **KEYCHAIN_PASSWORD**
   - Any random password
   - Generate: `openssl rand -base64 32`

4. **APPLE_ID**
   - Your Apple Developer email
   - Example: `developer@yourdomain.com`

5. **APPLE_ID_PASSWORD**
   - App-specific password from https://appleid.apple.com

6. **APPLE_TEAM_ID**
   - Your Team ID from https://developer.apple.com/account
   - Example: `283HJ7VJR4`

---

## 📝 Files Created/Modified

### New Files:
- ✅ `.github/workflows/build-dmg.yml` - GitHub Action workflow
- ✅ `apps/Kull Universal App/kull/ExportOptions.plist` - Xcode export settings
- ✅ `GITHUB_ACTIONS_SETUP.md` - Full documentation
- ✅ `QUICK_SETUP_CHECKLIST.md` - This file

### Modified Files:
- ✅ `server/routes/download.ts` - Added comment for auto-update
- ✅ `client/src/pages/Home.tsx` - Fetches version from API, dynamic download button

---

## 🚀 How to Trigger a Build

### Automatic (on push to main):
```bash
# Make any change to the Xcode project
cd "apps/Kull Universal App/kull"
# ... make changes ...
git add .
git commit -m "Update app"
git push origin main
```

### Manual (GitHub UI):
1. Go to **Actions** tab
2. Select **Build and Release macOS DMG**
3. Click **Run workflow** → **Run workflow**

---

## 📦 What Happens During Build

1. ✅ Checks out code
2. ✅ Generates version number (e.g., `2025.11.27.1430`)
3. ✅ Imports your code signing certificate
4. ✅ Builds macOS app with Xcode
5. ✅ Exports signed app
6. ✅ Creates DMG installer
7. ✅ Notarizes with Apple (~5 minutes)
8. ✅ Creates GitHub Release
9. ✅ Updates download page
10. ✅ Commits changes to repository

**Total Time:** ~15-20 minutes

---

## 🎯 Expected Results

After successful build:

1. **GitHub Release**
   - New release: `v2025.11.27.1430`
   - DMG attached: `Kull-v2025-11-27-02-30-PM.dmg`

2. **Updated Files (auto-committed)**
   - `client/public/downloads/Kull-v2025-11-27-02-30-PM.dmg`
   - `client/public/downloads/Kull-latest.dmg`
   - `server/routes/download.ts` (version updated)

3. **Website**
   - Download button points to new DMG
   - Version number displays correctly

---

## 🔍 Verification Steps

1. **Check GitHub Actions**
   ```
   Repository → Actions → Latest workflow run → ✅ Green checkmark
   ```

2. **Check Release**
   ```
   Repository → Releases → v2025.11.27.1430 → DMG file attached
   ```

3. **Check Commit**
   ```
   Repository → Recent commits → "Update DMG to version 2025.11.27.1430"
   ```

4. **Test Download**
   ```
   Visit: https://kullai.com
   Click: Download for Mac
   File downloads: Kull-v2025-11-27-02-30-PM.dmg
   ```

---

## 🐛 Common Issues & Quick Fixes

### Issue: "No code signing identity found"
**Fix:** Re-export certificate and update `BUILD_CERTIFICATE_BASE64` secret

### Issue: "Notarization failed"
**Fix:** Regenerate app-specific password at https://appleid.apple.com

### Issue: "Permission denied"
**Fix:** Verify `GITHUB_TOKEN` has write permissions (Settings → Actions → General)

### Issue: "DMG not created"
**Fix:** Check Xcode build logs in Actions tab

---

## 📚 Full Documentation

For detailed setup instructions, troubleshooting, and manual builds:
→ See **GITHUB_ACTIONS_SETUP.md**

---

## ⚡ Quick Commands

### Export Certificate (local):
```bash
# 1. Open Keychain Access
# 2. Find "Developer ID Application"
# 3. Right-click → Export
# 4. Save as build_certificate.p12
# 5. Encode:
base64 -i build_certificate.p12 | pbcopy
# Paste into BUILD_CERTIFICATE_BASE64 secret
```

### Generate Keychain Password:
```bash
openssl rand -base64 32 | pbcopy
# Paste into KEYCHAIN_PASSWORD secret
```

### Test Local Build:
```bash
cd "apps/Kull Universal App/kull"
xcodebuild -scheme kull -destination 'generic/platform=macOS' clean build
```

---

**Setup Time:** ~15 minutes
**First Build Time:** ~20 minutes
**Subsequent Builds:** ~15 minutes (automatic)

---

**Questions?** See full guide: `GITHUB_ACTIONS_SETUP.md`
