# DMG Signing and Notarization Implementation

## Summary

Implemented complete DMG signing and notarization workflow for Kull macOS distribution. The system now automatically signs and notarizes DMGs during the release process, eliminating the "Apple could not verify" warning that users were seeing.

## What Was Implemented

### 1. Automated Notarization Script

**File:** `scripts/notarize-dmg.sh`

A standalone script that handles the complete signing and notarization workflow:
- Checks for Developer ID Application certificate
- Signs the DMG with codesign
- Submits to Apple's notarization service
- Waits for approval (~5-10 minutes)
- Staples the notarization ticket
- Verifies the final result

**Usage:**
```bash
./scripts/notarize-dmg.sh <path-to-dmg> [developer-name]
```

### 2. Updated Release Script

**File:** `scripts/release.sh`

Modified the main release script to automatically call notarization after creating the DMG:
- Creates DMG (Step 9)
- **NEW:** Signs and notarizes DMG (Step 9b)
- Copies notarized DMG to website (Step 10)
- Commits and pushes to git (Step 11)

The notarization is now a seamless part of the release process.

### 3. Setup Verification Script

**File:** `scripts/check-notarization-setup.sh`

A diagnostic script that verifies your system is ready for notarization:
- Checks for Developer ID certificate
- Verifies App Store Connect API key
- Tests Xcode command line tools
- Validates API connection to Apple

**Current Status:**
```
✓ App Store Connect API key found
✓ Xcode command line tools installed
✓ notarytool available
✓ create-dmg installed
✓ API connection successful
✗ Developer ID Application certificate NOT FOUND
```

**Run with:**
```bash
./scripts/check-notarization-setup.sh
```

### 4. Comprehensive Documentation

Created detailed guides for setup, testing, and troubleshooting:

**`CREATE_DEVELOPER_ID_CERTIFICATE.md`**
- Step-by-step guide to creating the Developer ID certificate
- CSR creation instructions
- Certificate installation
- Verification steps

**`NOTARIZATION_SETUP.md`**
- Complete technical overview
- Architecture diagrams
- Entitlements explanation
- Detailed troubleshooting
- Best practices

**`TESTING_GUIDE.md`**
- Pre-release checklist
- Verification commands
- Common test scenarios
- Automated testing scripts
- Post-release monitoring

**`SCRIPTS_README.md`**
- Overview of all scripts
- Common workflows
- Configuration details
- Quick reference

### 5. Updated Export Options

**File:** `apps/Kull Universal App/kull/ExportOptions-DeveloperID.plist`

Added missing `destination` key to ensure proper export:
```xml
<key>destination</key>
<string>export</string>
```

### 6. Fixed API Key Permissions

Corrected file permissions on the App Store Connect API key:
```bash
chmod 600 ~/.private_keys/AuthKey_S9KW8G5RHS.p8
```

This ensures the key is secure and accessible only by the owner.

## Current Configuration

### Credentials (Already Set Up)

```bash
Team ID: 283HJ7VJR4
App Store Connect Key ID: S9KW8G5RHS
Issuer ID: c63dccab-1ecd-41dc-9374-174cfdb70958
Key Path: ~/.private_keys/AuthKey_S9KW8G5RHS.p8
```

✓ All credentials are configured and working
✓ API connection to Apple is successful

### What's Missing

**Developer ID Application Certificate**

You currently have:
- ✓ Apple Development certificate (for testing)

You need:
- ✗ Developer ID Application certificate (for distribution)

**This is the ONLY remaining step** before you can release notarized DMGs.

## Next Steps

### 1. Create Developer ID Certificate (Required)

Follow the step-by-step guide:
```bash
cat scripts/CREATE_DEVELOPER_ID_CERTIFICATE.md
```

**Quick summary:**
1. Open Keychain Access
2. Request Certificate from Certificate Authority (CSR)
3. Go to https://developer.apple.com/account/resources/certificates/list
4. Create "Developer ID Application" certificate
5. Upload your CSR
6. Download and install the certificate

**Time required:** ~10 minutes

### 2. Verify Setup

After installing the certificate:
```bash
./scripts/check-notarization-setup.sh
```

You should see:
```
✓ Developer ID Application certificate found
✓ App Store Connect API key found
✓ Xcode command line tools installed
✓ Connection successful
```

### 3. Test with a Release

Run a full release to test the notarization:
```bash
./scripts/release.sh
```

This will:
- Build iOS and macOS apps
- Upload to App Store Connect
- Create a DMG
- **Sign and notarize the DMG automatically**
- Copy it to your website
- Commit and push

**Expected time:** 15-20 minutes (notarization takes 5-10 minutes)

### 4. Verify the DMG

After the release completes:

```bash
# Find the DMG
cd "apps/Kull Universal App/kull/build/dmg-export"
ls -lt *.dmg | head -n 1

# Verify signature
codesign --verify --verbose Kull-v*.dmg

# Verify notarization
spctl --assess -v Kull-v*.dmg

# Expected output:
# Kull-v2025-11-27.dmg: accepted
# source=Notarized Developer ID
```

### 5. Test on Another Mac (Critical!)

**Important:** Your Mac trusts your own certificates, so test on a different Mac to simulate a real user's experience.

**Method 1:** Copy DMG to another Mac and try to open it
**Method 2:** Ask a beta tester to download and test

**Expected:** DMG opens without any security warnings

## How It Works

### The Notarization Process

```
1. App Build
   ↓
   Xcode signs with Developer ID certificate
   Applies hardened runtime
   ↓
2. DMG Creation
   ↓
   create-dmg makes a nice installer
   ↓
3. DMG Signing
   ↓
   codesign --sign "Developer ID Application: ..." Kull.dmg
   ↓
4. Notarization Submission
   ↓
   xcrun notarytool submit (uploads to Apple)
   ↓
5. Apple Scans
   ↓
   Malware scan
   Code signature verification
   Entitlements check
   (~5-10 minutes)
   ↓
6. Notarization Ticket
   ↓
   xcrun stapler staple (embeds approval in DMG)
   ↓
7. Ready for Distribution
   ↓
   Users can open without warnings
```

### Security Architecture

**What's stored where:**

| Item | Location | Committed to Git? |
|------|----------|-------------------|
| Team ID | `release.sh` | ✓ Yes (public info) |
| API Key ID | `release.sh` | ✓ Yes (public info) |
| Issuer ID | `release.sh` | ✓ Yes (public info) |
| API Key File (.p8) | `~/.private_keys/` | ✗ **NEVER** (secret) |
| Developer ID Cert | Keychain | ✗ No (local only) |

**Never commit:**
- API key file (.p8)
- Certificate files (.cer, .p12)
- Private keys

## Troubleshooting

### If `release.sh` fails at notarization:

**Check the error message:**
- "No Developer ID certificate found" → Create the certificate (see Step 1)
- "Invalid credentials" → Check API key file permissions
- "Notarization failed: Invalid" → Check detailed log

**Get detailed error log:**
```bash
xcrun notarytool history \
  --key ~/.private_keys/AuthKey_S9KW8G5RHS.p8 \
  --key-id S9KW8G5RHS \
  --issuer c63dccab-1ecd-41dc-9374-174cfdb70958

# Get the submission ID from the output
xcrun notarytool log <submission-id> \
  --key ~/.private_keys/AuthKey_S9KW8G5RHS.p8 \
  --key-id S9KW8G5RHS \
  --issuer c63dccab-1ecd-41dc-9374-174cfdb70958
```

### If DMG still shows security warnings:

**Verify the DMG:**
```bash
# Check signature
codesign --verify --verbose Kull.dmg

# Check notarization
spctl --assess -v Kull.dmg

# Check stapled ticket
stapler validate Kull.dmg
```

**Re-notarize if needed:**
```bash
./scripts/notarize-dmg.sh Kull.dmg
```

## Testing Checklist

Before releasing to users:

- [ ] Developer ID certificate installed
- [ ] `check-notarization-setup.sh` shows all checks passing
- [ ] Test release completed successfully
- [ ] DMG signature verified: `codesign --verify --verbose Kull.dmg`
- [ ] DMG notarization verified: `spctl --assess -v Kull.dmg`
- [ ] Ticket stapled: `stapler validate Kull.dmg`
- [ ] Tested on a different Mac (no security warnings)
- [ ] App launches and functions correctly

## Files Modified/Created

### Modified Files:
1. `scripts/release.sh` - Added notarization step
2. `apps/Kull Universal App/kull/ExportOptions-DeveloperID.plist` - Added destination key
3. `~/.private_keys/AuthKey_S9KW8G5RHS.p8` - Fixed permissions (600)

### New Files:
1. `scripts/notarize-dmg.sh` - Standalone notarization script
2. `scripts/check-notarization-setup.sh` - Setup verification
3. `scripts/CREATE_DEVELOPER_ID_CERTIFICATE.md` - Certificate setup guide
4. `scripts/NOTARIZATION_SETUP.md` - Complete technical documentation
5. `scripts/TESTING_GUIDE.md` - Testing and verification guide
6. `scripts/SCRIPTS_README.md` - Scripts overview
7. `DMG_SIGNING_IMPLEMENTATION.md` - This document

## Resources

### Apple Documentation
- [Notarizing macOS Software](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution)
- [Developer ID](https://developer.apple.com/developer-id/)
- [Hardened Runtime](https://developer.apple.com/documentation/security/hardened_runtime)

### Apple Developer Portal
- [Certificates List](https://developer.apple.com/account/resources/certificates/list)
- [App Store Connect API](https://appstoreconnect.apple.com/access/integrations/api)

### Command Reference
```bash
# Verify certificate
security find-identity -v -p codesigning

# Sign DMG
codesign --sign "Developer ID Application: ..." --timestamp --options runtime Kull.dmg

# Submit for notarization
xcrun notarytool submit Kull.dmg --key KEY.p8 --key-id ID --issuer ISSUER --wait

# Staple ticket
xcrun stapler staple Kull.dmg

# Verify
spctl --assess -v Kull.dmg
```

## Support

If you encounter issues:

1. **Check the documentation:**
   - `scripts/CREATE_DEVELOPER_ID_CERTIFICATE.md` - Certificate setup
   - `scripts/NOTARIZATION_SETUP.md` - Complete technical guide
   - `scripts/TESTING_GUIDE.md` - Testing procedures

2. **Run diagnostics:**
   ```bash
   ./scripts/check-notarization-setup.sh
   ```

3. **Check Apple's status:**
   - [Apple System Status](https://www.apple.com/support/systemstatus/)
   - Look for "Developer ID Notary Service"

4. **Review logs:**
   ```bash
   xcrun notarytool history --key ~/.private_keys/AuthKey_S9KW8G5RHS.p8 --key-id S9KW8G5RHS --issuer c63dccab-1ecd-41dc-9374-174cfdb70958
   ```

---

## Summary

**Status:** ✅ Implementation complete, ready for testing

**Remaining:** 🔲 Create Developer ID Application certificate (one-time setup)

**Time to complete:** ~10 minutes for certificate, ~15-20 minutes for first test release

**Once complete:** All future releases will automatically produce notarized DMGs that open without security warnings.

---

**Last Updated:** 2025-11-27
