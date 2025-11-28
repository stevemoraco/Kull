# DMG Signing and Notarization Setup Guide

## Overview

This guide explains how to set up code signing and notarization for Kull's DMG distribution. Notarization is required for users to open the DMG without security warnings on macOS 10.15+.

## Current Status

Your current setup:
- ✓ Team ID: 283HJ7VJR4
- ✓ App Store Connect API Key configured
- ⚠️ Missing: Developer ID Application certificate

## What You Need

### 1. Developer ID Application Certificate

This certificate is different from your App Store distribution certificate. It's specifically for distributing apps **outside** the Mac App Store.

**To create and install:**

1. Go to [Apple Developer Certificates](https://developer.apple.com/account/resources/certificates/list)
2. Click the "+" button to create a new certificate
3. Select **"Developer ID Application"**
4. Follow the instructions to create a Certificate Signing Request (CSR):
   - Open **Keychain Access** on your Mac
   - Menu: **Keychain Access > Certificate Assistant > Request a Certificate from a Certificate Authority**
   - Enter your email address
   - Select **"Saved to disk"**
   - Click **Continue** and save the CSR file
5. Upload the CSR file to Apple Developer portal
6. Download the certificate (.cer file)
7. Double-click the certificate to install it in Keychain

**Verify installation:**
```bash
security find-identity -v -p codesigning | grep "Developer ID Application"
```

You should see something like:
```
1) ABC123... "Developer ID Application: Stephen Moraco (283HJ7VJR4)"
```

### 2. App Store Connect API Key (Already Configured)

You already have this set up:
- Key ID: S9KW8G5RHS
- Issuer ID: c63dccab-1ecd-41dc-9374-174cfdb70958
- Key Path: ~/.private_keys/AuthKey_S9KW8G5RHS.p8

If you need to regenerate or create a new key:
1. Go to [App Store Connect API](https://appstoreconnect.apple.com/access/integrations/api)
2. Click "+" to create a new key
3. Give it a name (e.g., "Kull Notarization")
4. Select **"Developer"** role
5. Download the .p8 file
6. Save it to `~/.private_keys/AuthKey_[KEY_ID].p8`

## How It Works

### Signing Process

1. **App Signing** (during build)
   - Xcode automatically signs the app during the build process
   - Uses the Developer ID Application certificate
   - Applies hardened runtime entitlements

2. **DMG Signing** (after creation)
   - The `notarize-dmg.sh` script signs the DMG file
   - Uses the same Developer ID certificate
   - Enables runtime hardening with `--options runtime`

3. **Notarization** (Apple's malware scan)
   - DMG is uploaded to Apple's notarization service
   - Apple scans for malware and validates the signature
   - Usually takes 5-10 minutes

4. **Stapling** (attach approval ticket)
   - Downloads the notarization ticket from Apple
   - Embeds it in the DMG file
   - Allows offline verification (users don't need internet to verify)

### Architecture

```
release.sh
    │
    ├─> Build app with Xcode (Developer ID signing)
    │
    ├─> Export to .app bundle
    │
    ├─> Create DMG from .app
    │
    └─> Call notarize-dmg.sh
            │
            ├─> Sign DMG with codesign
            │
            ├─> Submit to Apple notarization
            │
            ├─> Wait for approval (~5-10 min)
            │
            └─> Staple notarization ticket
```

## Scripts

### 1. `notarize-dmg.sh`

Standalone script to sign and notarize a DMG.

**Usage:**
```bash
./scripts/notarize-dmg.sh <path-to-dmg> [developer-name]
```

**Example:**
```bash
./scripts/notarize-dmg.sh "Kull-v2025-11-27.dmg" "Stephen Moraco"
```

**What it does:**
1. Checks for Developer ID certificate
2. Signs the DMG with codesign
3. Verifies the signature
4. Submits to Apple notarization service
5. Waits for approval (with progress updates)
6. Staples the notarization ticket
7. Performs final verification

### 2. `release.sh` (Updated)

The main release script now automatically calls `notarize-dmg.sh` after creating the DMG.

**What changed:**
- Step 9b added: Sign and notarize DMG
- Graceful failure handling (continues if notarization fails)
- Better status messages with ✓ and ⚠️ symbols

## Testing

### Test Signing (Before Getting Developer ID Certificate)

If you don't have a Developer ID certificate yet, the script will:
- Use your existing development certificate
- Sign the DMG (but it won't be trusted for distribution)
- Skip notarization (requires Developer ID)
- Show warnings about what's missing

**To test:**
```bash
# Create a test DMG
cd "apps/Kull Universal App/kull/build/dmg-export"
hdiutil create -volname "Kull Test" -srcfolder "kull.app" -ov -format UDZO "TestKull.dmg"

# Try signing it
../../../../../../scripts/notarize-dmg.sh "TestKull.dmg"
```

### Test Notarization (After Getting Developer ID Certificate)

Once you have the certificate:

```bash
# Run the full release process
./scripts/release.sh
```

Or test just the notarization:

```bash
# Find the latest DMG
cd "apps/Kull Universal App/kull/build/dmg-export"
ls -lt *.dmg | head -n 1

# Notarize it
../../../../../../scripts/notarize-dmg.sh "Kull-v2025-11-27.dmg"
```

### Verify Notarization

After successful notarization:

```bash
# Check signature
codesign --verify --verbose "Kull-v2025-11-27.dmg"

# Check notarization
spctl --assess --type open --context context:primary-signature -v "Kull-v2025-11-27.dmg"

# Check stapled ticket
stapler validate "Kull-v2025-11-27.dmg"
```

Expected output:
```
Kull-v2025-11-27.dmg: accepted
source=Notarized Developer ID
```

## Troubleshooting

### "No Developer ID certificate found"

**Problem:** You need a Developer ID Application certificate.

**Solution:** Follow the steps in "What You Need" section above.

### "Notarization failed: Invalid"

**Problem:** The app or DMG doesn't meet Apple's requirements.

**Solution:**
1. Check the detailed error log:
   ```bash
   # Get submission ID from the error output
   xcrun notarytool log <submission-id> \
     --key ~/.private_keys/AuthKey_S9KW8G5RHS.p8 \
     --key-id S9KW8G5RHS \
     --issuer c63dccab-1ecd-41dc-9374-174cfdb70958
   ```

2. Common issues:
   - Missing hardened runtime
   - Invalid entitlements
   - Unsigned or incorrectly signed components
   - Invalid bundle identifier

### "Notarization timed out"

**Problem:** Apple's service is taking longer than expected.

**Solution:**
1. Check status manually:
   ```bash
   xcrun notarytool history \
     --key ~/.private_keys/AuthKey_S9KW8G5RHS.p8 \
     --key-id S9KW8G5RHS \
     --issuer c63dccab-1ecd-41dc-9374-174cfdb70958
   ```

2. Get specific submission info:
   ```bash
   xcrun notarytool info <submission-id> \
     --key ~/.private_keys/AuthKey_S9KW8G5RHS.p8 \
     --key-id S9KW8G5RHS \
     --issuer c63dccab-1ecd-41dc-9374-174cfdb70958
   ```

### "Signature invalid"

**Problem:** The DMG or app wasn't signed correctly.

**Solution:**
1. Check current signature:
   ```bash
   codesign -dvvv "Kull.dmg"
   ```

2. Re-sign with correct identity:
   ```bash
   codesign --force --sign "Developer ID Application: Stephen Moraco (283HJ7VJR4)" \
     --timestamp --options runtime "Kull.dmg"
   ```

### "App Store Connect API key not found"

**Problem:** The API key file is missing or in the wrong location.

**Solution:**
1. Check if file exists:
   ```bash
   ls -la ~/.private_keys/AuthKey_S9KW8G5RHS.p8
   ```

2. If missing, download it again from App Store Connect:
   - Go to [App Store Connect API](https://appstoreconnect.apple.com/access/integrations/api)
   - Download the key
   - Save to `~/.private_keys/AuthKey_S9KW8G5RHS.p8`
   - Set permissions: `chmod 600 ~/.private_keys/AuthKey_S9KW8G5RHS.p8`

## Entitlements

The app uses different entitlements for different builds:

### kull.entitlements (Universal)
- App Sandbox enabled
- Hardened runtime settings
- File access (user-selected)
- Network client access
- No debugging entitlements (production-safe)

### kull-mac.entitlements (macOS-specific)
- Minimal macOS-only entitlements
- App Sandbox enabled
- File access (user-selected)
- Network client access

**Important:** Both entitlement files have `com.apple.security.get-task-allow = false`, which is required for App Store and notarization.

## Best Practices

### 1. Always Test Before Release

```bash
# Build, sign, and notarize a test DMG
./scripts/release.sh

# Test on a different Mac (or VM) to verify
# - DMG opens without warnings
# - App launches successfully
# - No security prompts
```

### 2. Keep Certificates Valid

- Developer ID certificates expire after 5 years
- Check expiration: `security find-identity -v -p codesigning`
- Renew before expiration to avoid distribution interruptions

### 3. Monitor Notarization History

```bash
# Check recent notarizations
xcrun notarytool history \
  --key ~/.private_keys/AuthKey_S9KW8G5RHS.p8 \
  --key-id S9KW8G5RHS \
  --issuer c63dccab-1ecd-41dc-9374-174cfdb70958
```

### 4. Version Control

- Never commit certificates or API keys to git
- Keep API keys in `~/.private_keys/` (gitignored)
- Document the setup process (this file)

## References

- [Apple: Notarizing macOS Software Before Distribution](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution)
- [Apple: Customizing the Notarization Workflow](https://developer.apple.com/documentation/security/customizing_the_notarization_workflow)
- [Apple: Hardened Runtime](https://developer.apple.com/documentation/security/hardened_runtime)

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review notarization logs with `xcrun notarytool log`
3. Verify certificate and API key setup
4. Check Apple's developer forums for known issues

---

**Last Updated:** 2025-11-27
