# GitHub Actions Setup Guide - macOS DMG Build & Release

This guide explains how to set up the automated macOS DMG build and release workflow for the Kull Universal App.

## Overview

The GitHub Action workflow (`.github/workflows/build-dmg.yml`) automatically:

1. **Builds** the macOS app from source using Xcode
2. **Versions** it with a timestamp (e.g., `2025.11.27.1430`)
3. **Signs** the app with your Developer ID certificate
4. **Notarizes** the DMG with Apple
5. **Creates** a GitHub Release with the DMG file
6. **Updates** the download page with the new version
7. **Commits** changes back to the repository

## Workflow Triggers

The workflow runs automatically when:
- Code is pushed to the `main` branch
- Files in `apps/Kull Universal App/**` are changed
- The workflow file itself is modified

You can also trigger it manually:
- Go to **Actions** tab in GitHub
- Select **Build and Release macOS DMG**
- Click **Run workflow**

## Required GitHub Secrets

You must configure the following secrets in your GitHub repository:

### Code Signing Secrets

#### 1. `BUILD_CERTIFICATE_BASE64`
**Description:** Your Apple Developer ID Application certificate in base64 format

**How to get it:**
```bash
# Export certificate from Keychain
# 1. Open Keychain Access
# 2. Find "Developer ID Application: Your Name (TEAM_ID)"
# 3. Right-click → Export "Developer ID Application..."
# 4. Save as build_certificate.p12
# 5. Enter a password (remember this for P12_PASSWORD)

# Convert to base64
base64 -i build_certificate.p12 -o build_certificate_base64.txt

# Copy the contents of build_certificate_base64.txt to this secret
cat build_certificate_base64.txt | pbcopy
```

**Where to set:** Settings → Secrets and variables → Actions → New repository secret

---

#### 2. `P12_PASSWORD`
**Description:** The password you used when exporting the certificate

**How to get it:** This is the password you entered in step 1 above

**Where to set:** Settings → Secrets and variables → Actions → New repository secret

---

#### 3. `KEYCHAIN_PASSWORD`
**Description:** A temporary password for the build keychain (can be any secure string)

**How to get it:**
```bash
# Generate a random password
openssl rand -base64 32
```

**Where to set:** Settings → Secrets and variables → Actions → New repository secret

---

### Notarization Secrets

#### 4. `APPLE_ID`
**Description:** Your Apple ID email address (used for notarization)

**Example:** `developer@yourdomain.com`

**Where to set:** Settings → Secrets and variables → Actions → New repository secret

---

#### 5. `APPLE_ID_PASSWORD`
**Description:** An app-specific password for your Apple ID

**How to get it:**
1. Go to https://appleid.apple.com
2. Sign in with your Apple ID
3. Go to **Security** section
4. Under **App-Specific Passwords**, click **Generate Password**
5. Label: "GitHub Actions Notarization"
6. Copy the generated password

**Where to set:** Settings → Secrets and variables → Actions → New repository secret

---

#### 6. `APPLE_TEAM_ID`
**Description:** Your Apple Developer Team ID

**How to get it:**
1. Go to https://developer.apple.com/account
2. Sign in
3. Look for **Team ID** on the membership details page
4. Should be a 10-character alphanumeric string (e.g., `283HJ7VJR4`)

**Where to set:** Settings → Secrets and variables → Actions → New repository secret

---

### Summary Table

| Secret Name | Type | Example | Where to Find |
|-------------|------|---------|---------------|
| `BUILD_CERTIFICATE_BASE64` | Certificate | `MIIKpQIBAz...` | Keychain Access → Export certificate → base64 encode |
| `P12_PASSWORD` | Password | `YourSecureP@ssw0rd` | Password used when exporting certificate |
| `KEYCHAIN_PASSWORD` | Password | `RandomGeneratedPassword123` | Generate with `openssl rand -base64 32` |
| `APPLE_ID` | Email | `developer@yourdomain.com` | Your Apple Developer account email |
| `APPLE_ID_PASSWORD` | App-Specific Password | `abcd-efgh-ijkl-mnop` | https://appleid.apple.com → App-Specific Passwords |
| `APPLE_TEAM_ID` | Team ID | `283HJ7VJR4` | https://developer.apple.com/account |

---

## Setting Secrets in GitHub

1. Go to your repository on GitHub
2. Click **Settings** (top menu)
3. In left sidebar, click **Secrets and variables** → **Actions**
4. Click **New repository secret**
5. Enter the **Name** (e.g., `BUILD_CERTIFICATE_BASE64`)
6. Paste the **Value** (e.g., the base64-encoded certificate)
7. Click **Add secret**
8. Repeat for all 6 secrets

---

## Verification Steps

### 1. Check Secrets Are Set
Go to **Settings → Secrets and variables → Actions** and verify all 6 secrets are listed:
- ✅ BUILD_CERTIFICATE_BASE64
- ✅ P12_PASSWORD
- ✅ KEYCHAIN_PASSWORD
- ✅ APPLE_ID
- ✅ APPLE_ID_PASSWORD
- ✅ APPLE_TEAM_ID

### 2. Test the Workflow
1. Make a small change to any file in `apps/Kull Universal App/kull/`
2. Commit and push to `main`
3. Go to **Actions** tab
4. Watch the "Build and Release macOS DMG" workflow run

### 3. Check Output
If successful, you should see:
- ✅ Green checkmark on the workflow run
- ✅ New GitHub Release created (e.g., `v2025.11.27.1430`)
- ✅ DMG file attached to the release
- ✅ New commit updating `server/routes/download.ts` and `client/public/downloads/`

---

## Troubleshooting

### Error: "No code signing identity found"
**Cause:** Certificate not imported correctly

**Solution:**
1. Verify `BUILD_CERTIFICATE_BASE64` is correct
2. Verify `P12_PASSWORD` matches the password used during export
3. Re-export certificate from Keychain and re-encode to base64

---

### Error: "Notarization failed"
**Cause:** Apple ID credentials incorrect or app-specific password expired

**Solution:**
1. Verify `APPLE_ID` is correct
2. Regenerate app-specific password at https://appleid.apple.com
3. Update `APPLE_ID_PASSWORD` secret with new password
4. Verify `APPLE_TEAM_ID` matches your developer account

---

### Error: "Invalid signature"
**Cause:** Team ID mismatch

**Solution:**
1. Check `ExportOptions.plist` has correct Team ID (`283HJ7VJR4`)
2. Verify your certificate matches this Team ID in Keychain Access
3. Update `APPLE_TEAM_ID` secret if needed

---

### Error: "xcrun: error: unable to find utility 'notarytool'"
**Cause:** Xcode version too old

**Solution:**
- The workflow uses `latest-stable` Xcode
- Ensure you're using Xcode 13+ for `notarytool` support
- Update workflow if you need a specific Xcode version

---

## How It Works

### 1. Version Generation
```yaml
VERSION=$(date -u +"%Y.%m.%d.%H%M")
# Example: 2025.11.27.1430
```

### 2. Build Process
- Archives the app with Xcode
- Sets `MARKETING_VERSION` to `1.0`
- Sets `CURRENT_PROJECT_VERSION` to the timestamp version

### 3. Export & Sign
- Exports using `ExportOptions.plist`
- Signs with Developer ID certificate
- Creates universal binary (Apple Silicon + Intel)

### 4. DMG Creation
- Uses `create-dmg` tool
- Creates installer with drag-to-Applications UI
- Names DMG: `Kull-v2025-11-27-02-30-PM.dmg`

### 5. Notarization
- Submits DMG to Apple for notarization
- Waits for approval (usually ~5 minutes)
- Staples notarization ticket to DMG

### 6. Release & Deploy
- Creates GitHub Release with version tag
- Uploads DMG to release
- Copies DMG to `client/public/downloads/`
- Updates `server/routes/download.ts` with new version
- Commits and pushes changes

---

## File Structure After Build

```
/
├── .github/
│   └── workflows/
│       └── build-dmg.yml              # Workflow definition
├── apps/
│   └── Kull Universal App/
│       └── kull/
│           ├── ExportOptions.plist    # Xcode export settings
│           └── build/                 # Build artifacts (not committed)
├── client/
│   └── public/
│       └── downloads/
│           ├── Kull-v2025-11-27-02-30-PM.dmg  # Versioned DMG
│           └── Kull-latest.dmg                # Symlink to latest
└── server/
    └── routes/
        └── download.ts                # Auto-updated with version info
```

---

## Manual Build (Local)

If you need to build locally instead of using GitHub Actions:

```bash
cd "apps/Kull Universal App/kull"

# Set version
VERSION=$(date -u +"%Y.%m.%d.%H%M")

# Archive
xcodebuild archive \
  -scheme kull \
  -destination 'generic/platform=macOS' \
  -archivePath build/kull.xcarchive \
  MARKETING_VERSION="1.0" \
  CURRENT_PROJECT_VERSION="$VERSION"

# Export
xcodebuild -exportArchive \
  -archivePath build/kull.xcarchive \
  -exportPath build/export \
  -exportOptionsPlist ExportOptions.plist

# Create DMG
create-dmg \
  --volname "Kull" \
  --window-pos 200 120 \
  --window-size 600 400 \
  --icon-size 100 \
  --icon "kull.app" 175 190 \
  --app-drop-link 425 190 \
  "Kull-v$(date -u +'%Y-%m-%d-%I-%M-%p').dmg" \
  "build/export/kull.app"

# Notarize (replace with your credentials)
xcrun notarytool submit \
  "Kull-v*.dmg" \
  --apple-id "your@email.com" \
  --password "your-app-specific-password" \
  --team-id "283HJ7VJR4" \
  --wait

# Staple
xcrun stapler staple "Kull-v*.dmg"
```

---

## Maintenance

### Updating the Workflow
- Edit `.github/workflows/build-dmg.yml`
- Changes take effect immediately on next push

### Rotating Secrets
If you need to rotate certificates or passwords:
1. Update the secret in GitHub Settings
2. Manually trigger the workflow to test
3. Delete old certificates from Keychain Access

### Changing Team ID
If your Team ID changes:
1. Update `ExportOptions.plist` → `teamID`
2. Update GitHub Secret `APPLE_TEAM_ID`
3. Re-export certificate with new Team ID
4. Update `BUILD_CERTIFICATE_BASE64` secret

---

## Security Notes

- **Never commit** certificates, passwords, or API keys to the repository
- **Never log** secret values in workflow steps
- GitHub Secrets are encrypted and only exposed during workflow runs
- Temporary keychain is deleted after build completes
- Certificate is only stored in memory during build

---

## Support

If you encounter issues:
1. Check the **Actions** tab for detailed logs
2. Review this guide's troubleshooting section
3. Verify all 6 secrets are correctly set
4. Test local build first to isolate issues
5. Contact steve@lander.media for assistance

---

## Related Files

- **Workflow:** `.github/workflows/build-dmg.yml`
- **Export Config:** `apps/Kull Universal App/kull/ExportOptions.plist`
- **Version API:** `server/routes/download.ts`
- **Download UI:** `client/src/pages/Home.tsx`
- **This Guide:** `GITHUB_ACTIONS_SETUP.md`

---

**Last Updated:** 2025-11-27
**Maintained By:** Kull Development Team
