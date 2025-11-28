# Kull Release Scripts

This directory contains scripts for building, signing, and releasing Kull.

## Quick Start

### First Time Setup

1. **Check your setup:**
   ```bash
   ./check-notarization-setup.sh
   ```

2. **If you're missing the Developer ID certificate:**
   - Read: `CREATE_DEVELOPER_ID_CERTIFICATE.md`
   - Follow the step-by-step instructions
   - This is a one-time setup (certificate lasts 5 years)

3. **Once setup is complete, run:**
   ```bash
   ./release.sh
   ```

## Scripts Overview

### `release.sh` - Main Release Script

**What it does:**
- Builds iOS and macOS apps
- Uploads to App Store Connect
- Configures TestFlight
- Creates a notarized DMG for direct download
- Updates the website with the new download link
- Commits and pushes to git

**Usage:**
```bash
./release.sh
```

**Time:** ~10-15 minutes (including notarization)

**Output:**
- iOS build on TestFlight
- macOS build on TestFlight
- Signed and notarized DMG in `client/public/downloads/`

---

### `notarize-dmg.sh` - Sign and Notarize a DMG

**What it does:**
- Signs a DMG with your Developer ID certificate
- Submits it to Apple for notarization
- Waits for approval (~5-10 minutes)
- Staples the notarization ticket

**Usage:**
```bash
./notarize-dmg.sh <path-to-dmg> [developer-name]
```

**Example:**
```bash
./notarize-dmg.sh "Kull-v2025-11-27.dmg" "Stephen Moraco"
```

**When to use:**
- Manually notarize a DMG
- Test notarization before a release
- Re-notarize after making changes

---

### `check-notarization-setup.sh` - Verify Your Setup

**What it does:**
- Checks for Developer ID certificate
- Verifies App Store Connect API key
- Tests Xcode command line tools
- Tests connection to Apple's notarization service

**Usage:**
```bash
./check-notarization-setup.sh
```

**Output:**
- ✓ for each passing check
- ✗ for failures with instructions to fix

---

### `testflight_setup.py` - Configure TestFlight

**What it does:**
- Adds new builds to public TestFlight group
- Submits builds for beta app review
- Updates what-to-test notes

**Usage:**
Called automatically by `release.sh`. You rarely need to run this manually.

**Manual usage:**
```bash
python3 testflight_setup.py
```

## Documentation

### `NOTARIZATION_SETUP.md`

Comprehensive guide to DMG signing and notarization:
- Why notarization is required
- How the signing process works
- Architecture diagrams
- Detailed troubleshooting
- Testing procedures
- Best practices

**Read this if:**
- You're new to notarization
- You encounter notarization errors
- You want to understand the full process

---

### `CREATE_DEVELOPER_ID_CERTIFICATE.md`

Step-by-step guide to creating a Developer ID Application certificate:
- What it is and why you need it
- Creating a Certificate Signing Request (CSR)
- Requesting the certificate from Apple
- Installing and verifying it

**Read this if:**
- `check-notarization-setup.sh` shows "Developer ID certificate NOT FOUND"
- You're setting up on a new Mac
- Your certificate expired

## Common Workflows

### 1. Full Release (iOS + macOS + DMG)

```bash
# Check setup first
./check-notarization-setup.sh

# If all checks pass, release
./release.sh
```

### 2. Test Notarization Only

```bash
# Build a DMG manually first
cd "../apps/Kull Universal App/kull"
xcodebuild archive ...
xcodebuild -exportArchive ...
hdiutil create -volname "Kull" -srcfolder "kull.app" "TestKull.dmg"

# Notarize it
cd ../../../../scripts
./notarize-dmg.sh "../apps/Kull Universal App/kull/build/dmg-export/TestKull.dmg"
```

### 3. Re-release After Fixing a Bug

```bash
# Make your code changes
# Then run the full release
./release.sh

# This will create a new version with timestamp
# Example: 2025.11.27 (Build 1430)
```

### 4. Check Notarization History

```bash
xcrun notarytool history \
  --key ~/.private_keys/AuthKey_S9KW8G5RHS.p8 \
  --key-id S9KW8G5RHS \
  --issuer c63dccab-1ecd-41dc-9374-174cfdb70958
```

### 5. Get Detailed Error Log

If notarization fails, get the submission ID from the error, then:

```bash
xcrun notarytool log <submission-id> \
  --key ~/.private_keys/AuthKey_S9KW8G5RHS.p8 \
  --key-id S9KW8G5RHS \
  --issuer c63dccab-1ecd-41dc-9374-174cfdb70958
```

## Configuration

All scripts use these credentials (stored in `release.sh`):

```bash
TEAM_ID="283HJ7VJR4"
KEY_ID="S9KW8G5RHS"
ISSUER_ID="c63dccab-1ecd-41dc-9374-174cfdb70958"
KEY_PATH="$HOME/.private_keys/AuthKey_S9KW8G5RHS.p8"
```

**Never commit the API key file to git!**

The key file should be at: `~/.private_keys/AuthKey_S9KW8G5RHS.p8`

## Troubleshooting

### "No Developer ID certificate found"

→ See: `CREATE_DEVELOPER_ID_CERTIFICATE.md`

### "Notarization failed: Invalid"

```bash
# Get the submission ID from the error output
xcrun notarytool log <submission-id> \
  --key ~/.private_keys/AuthKey_S9KW8G5RHS.p8 \
  --key-id S9KW8G5RHS \
  --issuer c63dccab-1ecd-41dc-9374-174cfdb70958

# Common causes:
# - App not signed with hardened runtime
# - Invalid entitlements
# - Missing or incorrect bundle identifier
```

### "API key not found"

```bash
# Check if file exists
ls -la ~/.private_keys/AuthKey_S9KW8G5RHS.p8

# If missing, download from:
# https://appstoreconnect.apple.com/access/integrations/api

# Fix permissions
chmod 600 ~/.private_keys/AuthKey_S9KW8G5RHS.p8
```

### "DMG has security warnings"

This means the DMG wasn't notarized correctly.

1. Check if it was signed:
   ```bash
   codesign -dvvv Kull.dmg
   ```

2. Check if it was notarized:
   ```bash
   spctl --assess --type open --context context:primary-signature -v Kull.dmg
   ```

3. Re-run notarization:
   ```bash
   ./notarize-dmg.sh Kull.dmg
   ```

## Version Numbers

Versions are auto-generated based on date/time:

```bash
MARKETING_VERSION=$(date +%Y.%m.%d)    # Example: 2025.11.27
BUILD_NUMBER=$(date +%H%M)             # Example: 1430
FRIENDLY_VERSION=$(date +"%Y-%m-%d-%I-%M-%p")  # Example: 2025-11-27-02-30-PM
```

This ensures:
- Every build has a unique version
- Easy to identify when a build was created
- Automatic version bumping (no manual intervention)

## File Outputs

After running `release.sh`:

```
apps/Kull Universal App/kull/build/
├── ios.xcarchive              # iOS build archive
├── mac.xcarchive              # macOS App Store build
├── dmg.xcarchive              # macOS Developer ID build
├── ios-export/                # Uploaded to App Store Connect
├── mac-export/                # Uploaded to App Store Connect
└── dmg-export/
    └── Kull-v2025-11-27-02-30-PM.dmg  # Notarized DMG

client/public/downloads/
└── Kull-v2025-11-27-02-30-PM.dmg      # Copied for website
```

## Resources

- [Apple: Notarizing macOS Software](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution)
- [Apple: Developer ID](https://developer.apple.com/developer-id/)
- [Apple: App Store Connect API](https://developer.apple.com/documentation/appstoreconnectapi)

---

**Need help?** Check the detailed guides:
- `NOTARIZATION_SETUP.md` - Full notarization documentation
- `CREATE_DEVELOPER_ID_CERTIFICATE.md` - Certificate setup guide
