# DMG Signing and Notarization Testing Guide

## Overview

This guide helps you test and verify that your DMG is properly signed and notarized **before** releasing it to users.

## Pre-Release Checklist

### 1. Verify Your Setup

**Run the setup verification script:**

```bash
cd "/Users/stevemoraco/Lander Dropbox/Steve Moraco/Mac (6)/Downloads/ai image culling/kull"
./scripts/check-notarization-setup.sh
```

**Expected Output:**

```
✓ Developer ID Application certificate found
✓ App Store Connect API key found
✓ Xcode command line tools installed
✓ notarytool available
✓ Connection to Apple notarization service successful
```

**If any checks fail:** See `CREATE_DEVELOPER_ID_CERTIFICATE.md` or `NOTARIZATION_SETUP.md`

---

### 2. Build and Sign a Test DMG

**Option A: Use the full release script (recommended)**

```bash
./scripts/release.sh
```

This will:
- Build the app
- Create the DMG
- Sign and notarize it automatically
- Copy it to `client/public/downloads/`

**Option B: Manual build for testing**

```bash
# Navigate to Xcode project
cd "apps/Kull Universal App/kull"

# Build the archive
xcodebuild archive \
  -project kull.xcodeproj \
  -scheme kull \
  -destination 'generic/platform=macOS' \
  -archivePath "build/test.xcarchive"

# Export with Developer ID
xcodebuild -exportArchive \
  -archivePath "build/test.xcarchive" \
  -exportPath "build/test-export" \
  -exportOptionsPlist "ExportOptions-DeveloperID.plist" \
  -allowProvisioningUpdates

# Create DMG
cd build/test-export
hdiutil create -volname "Kull Test" -srcfolder "kull.app" -ov -format UDZO "TestKull.dmg"

# Sign and notarize
cd ../../../..
./scripts/notarize-dmg.sh "apps/Kull Universal App/kull/build/test-export/TestKull.dmg"
```

---

### 3. Verify the DMG Signature

**Check if the DMG is signed:**

```bash
codesign --verify --verbose "Kull.dmg"
```

**Expected Output:**
```
Kull.dmg: valid on disk
Kull.dmg: satisfies its Designated Requirement
```

**Get detailed signature info:**

```bash
codesign -dvvv "Kull.dmg"
```

**Expected Output:**
```
Executable=/path/to/Kull.dmg
Identifier=com.apple.disk-image.Kull
Format=disk image
CodeDirectory v=...
Signature size=...
Authority=Developer ID Application: Stephen Moraco (283HJ7VJR4)
Authority=Developer ID Certification Authority
Authority=Apple Root CA
Timestamp=...
Info.plist=not bound
TeamIdentifier=283HJ7VJR4
Sealed Resources=none
Internal requirements count=1 size=...
```

**Look for:**
- ✓ `Authority=Developer ID Application: Stephen Moraco (283HJ7VJR4)`
- ✓ `Timestamp=...` (must be present)
- ✓ `TeamIdentifier=283HJ7VJR4`

---

### 4. Verify Notarization

**Check if the DMG is notarized:**

```bash
spctl --assess --type open --context context:primary-signature -v "Kull.dmg"
```

**Expected Output (Success):**
```
Kull.dmg: accepted
source=Notarized Developer ID
```

**Expected Output (Not Notarized):**
```
Kull.dmg: rejected
source=Developer ID
origin=Developer ID Application: Stephen Moraco (283HJ7VJR4)
```

**Check if notarization ticket is stapled:**

```bash
stapler validate "Kull.dmg"
```

**Expected Output (Success):**
```
Processing: Kull.dmg
The validate action worked!
```

**Expected Output (Not Stapled):**
```
Processing: Kull.dmg
The validate action failed! 65
```

---

### 5. Test on a Different Mac (Critical!)

**Why:** The Mac that built and signed the DMG has your Developer ID certificate in its keychain. Testing on a different Mac simulates a real user's experience.

**Method 1: Use a VM or different Mac**

1. Copy the DMG to another Mac (via USB, AirDrop, etc.)
2. Double-click the DMG
3. Observe the behavior:

**✓ Success:**
- DMG opens immediately
- No security warnings
- App can be dragged to Applications
- App launches normally

**✗ Failure:**
- Warning: "Apple could not verify..."
- User must go to System Settings to allow
- Gatekeeper blocks the app

**Method 2: Simulate a fresh user (on the same Mac)**

```bash
# Remove the quarantine attribute (added by browsers)
xattr -d com.apple.quarantine "Kull.dmg"

# Re-add it to simulate a download
xattr -w com.apple.quarantine "0001;63c8b5e1;Safari;" "Kull.dmg"

# Try to open it
open "Kull.dmg"
```

**Expected:** Opens without warnings

---

### 6. Verify App Inside DMG

After mounting the DMG, check the app itself:

```bash
# Mount the DMG
open "Kull.dmg"

# Check app signature
codesign --verify --verbose /Volumes/Kull/kull.app

# Check app notarization
spctl --assess --type execute --verbose /Volumes/Kull/kull.app
```

**Expected:**
```
/Volumes/Kull/kull.app: accepted
source=Notarized Developer ID
```

---

## Common Test Scenarios

### Scenario 1: "Apple could not verify" warning

**Problem:** DMG isn't signed or notarized correctly.

**Test:**
```bash
# Check signature
codesign --verify --verbose "Kull.dmg"

# Check notarization
spctl --assess -v "Kull.dmg"

# Check stapled ticket
stapler validate "Kull.dmg"
```

**Fix:**
```bash
# Re-sign and re-notarize
./scripts/notarize-dmg.sh "Kull.dmg"
```

---

### Scenario 2: App launches but is slow to open

**Problem:** Gatekeeper is verifying the app online (ticket not stapled).

**Test:**
```bash
# Check if ticket is stapled
stapler validate "Kull.dmg"
```

**Fix:**
```bash
# Staple the ticket
xcrun stapler staple "Kull.dmg"
```

---

### Scenario 3: "Damaged or incomplete" error

**Problem:** DMG was modified after signing.

**Test:**
```bash
# Verify integrity
hdiutil verify "Kull.dmg"
```

**Fix:**
```bash
# Re-create the DMG from scratch
# Don't modify the DMG after signing!
```

---

### Scenario 4: App is blocked even though DMG opened

**Problem:** App inside DMG isn't signed correctly.

**Test:**
```bash
# Mount DMG
open "Kull.dmg"

# Check app signature
codesign --verify --verbose /Volumes/Kull/kull.app

# Check app notarization
spctl --assess --type execute -v /Volumes/Kull/kull.app
```

**Fix:**
```bash
# App must be signed during build
# Check Xcode project signing settings
# Rebuild with Developer ID certificate
```

---

## Automated Testing Script

Create a quick test script:

```bash
#!/bin/bash
# test-dmg.sh - Quick DMG verification

DMG="$1"

if [ -z "$DMG" ]; then
    echo "Usage: $0 <path-to-dmg>"
    exit 1
fi

echo "Testing: $DMG"
echo ""

echo "1. Checking signature..."
if codesign --verify --verbose "$DMG" 2>&1 | grep -q "valid on disk"; then
    echo "   ✓ Signature valid"
else
    echo "   ✗ Signature invalid"
fi

echo ""
echo "2. Checking notarization..."
if spctl --assess --type open --context context:primary-signature -v "$DMG" 2>&1 | grep -q "accepted"; then
    echo "   ✓ Notarization valid"
else
    echo "   ✗ Not notarized"
fi

echo ""
echo "3. Checking stapled ticket..."
if stapler validate "$DMG" 2>&1 | grep -q "worked"; then
    echo "   ✓ Ticket stapled"
else
    echo "   ✗ Ticket not stapled"
fi

echo ""
echo "4. Opening DMG..."
open "$DMG"
```

**Usage:**
```bash
chmod +x test-dmg.sh
./test-dmg.sh "Kull.dmg"
```

---

## Verification Checklist

Before releasing to users, verify:

- [ ] DMG opens without security warnings
- [ ] App inside DMG is signed with Developer ID
- [ ] App inside DMG is notarized
- [ ] Notarization ticket is stapled
- [ ] Tested on a different Mac (or simulated fresh user)
- [ ] App launches and functions correctly
- [ ] No Gatekeeper warnings during launch
- [ ] Version number is correct in About dialog

---

## Monitoring Notarization Status

### Check Recent Submissions

```bash
xcrun notarytool history \
  --key ~/.private_keys/AuthKey_S9KW8G5RHS.p8 \
  --key-id S9KW8G5RHS \
  --issuer c63dccab-1ecd-41dc-9374-174cfdb70958
```

### Get Specific Submission Info

```bash
xcrun notarytool info <submission-id> \
  --key ~/.private_keys/AuthKey_S9KW8G5RHS.p8 \
  --key-id S9KW8G5RHS \
  --issuer c63dccab-1ecd-41dc-9374-174cfdb70958
```

### Get Detailed Error Log

```bash
xcrun notarytool log <submission-id> \
  --key ~/.private_keys/AuthKey_S9KW8G5RHS.p8 \
  --key-id S9KW8G5RHS \
  --issuer c63dccab-1ecd-41dc-9374-174cfdb70958
```

---

## Post-Release Monitoring

After releasing to users:

### 1. Monitor User Feedback

Watch for reports of:
- Security warnings when opening DMG
- App not launching
- Slow first launch (ticket not stapled)

### 2. Test Download Link

```bash
# Download from your website
curl -O "https://kull.lander.media/downloads/Kull-v2025-11-27.dmg"

# Verify it
./scripts/notarize-dmg.sh "Kull-v2025-11-27.dmg"
```

### 3. Check Certificate Expiration

```bash
security find-identity -v -p codesigning | grep "Developer ID Application"
```

Developer ID certificates expire after **5 years**. Renew before expiration!

---

## Troubleshooting Common Issues

### Issue: "Notarization timed out"

**Cause:** Apple's service is taking longer than expected (usually <10 minutes, but can take up to 24 hours).

**Check status:**
```bash
xcrun notarytool history \
  --key ~/.private_keys/AuthKey_S9KW8G5RHS.p8 \
  --key-id S9KW8G5RHS \
  --issuer c63dccab-1ecd-41dc-9374-174cfdb70958
```

**Wait and staple manually:**
```bash
xcrun stapler staple "Kull.dmg"
```

---

### Issue: "Signature invalid after modifying DMG"

**Cause:** You modified the DMG after signing (added a file, changed icon, etc.).

**Solution:** Re-sign from scratch:
```bash
./scripts/notarize-dmg.sh "Kull.dmg"
```

---

### Issue: "Works on my Mac but not on user's Mac"

**Cause:** Your Mac has the Developer ID certificate in its keychain, which implicitly trusts the signature.

**Solution:** Test on a different Mac or VM without your certificates.

---

## Best Practices

1. **Always test on a different Mac before releasing**
2. **Automate the process** (use `release.sh` instead of manual steps)
3. **Never modify a DMG after signing**
4. **Keep your Developer ID certificate secure**
5. **Monitor notarization history regularly**
6. **Set up alerts for certificate expiration**
7. **Keep detailed logs of each release**

---

## Quick Reference Commands

```bash
# Verify setup
./scripts/check-notarization-setup.sh

# Build, sign, and notarize
./scripts/release.sh

# Manually notarize a DMG
./scripts/notarize-dmg.sh "Kull.dmg"

# Check signature
codesign --verify --verbose "Kull.dmg"

# Check notarization
spctl --assess -v "Kull.dmg"

# Check stapled ticket
stapler validate "Kull.dmg"

# View detailed signature
codesign -dvvv "Kull.dmg"

# Check notarization history
xcrun notarytool history --key ~/.private_keys/AuthKey_S9KW8G5RHS.p8 --key-id S9KW8G5RHS --issuer c63dccab-1ecd-41dc-9374-174cfdb70958

# Get error log
xcrun notarytool log <submission-id> --key ~/.private_keys/AuthKey_S9KW8G5RHS.p8 --key-id S9KW8G5RHS --issuer c63dccab-1ecd-41dc-9374-174cfdb70958
```

---

**Need more help?**
- `NOTARIZATION_SETUP.md` - Complete notarization guide
- `CREATE_DEVELOPER_ID_CERTIFICATE.md` - Certificate setup
- `SCRIPTS_README.md` - Scripts overview
