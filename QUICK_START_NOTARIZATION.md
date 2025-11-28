# Quick Start: DMG Notarization Setup

## Current Status

✅ **Almost Ready!** Everything is configured except one certificate.

## What You Need to Do (10 minutes)

### Step 1: Create Developer ID Certificate

1. **Open Keychain Access**
   - Go to `/Applications/Utilities/Keychain Access.app`

2. **Request Certificate**
   - Menu: `Keychain Access > Certificate Assistant > Request a Certificate from a Certificate Authority`
   - Email: `stephen@lander.media`
   - Common Name: `Stephen Moraco`
   - Request is: `Saved to disk`
   - Click `Continue` and save the file

3. **Create Certificate on Apple Developer Portal**
   - Go to: https://developer.apple.com/account/resources/certificates/list
   - Click `+` button
   - Select `Developer ID Application`
   - Upload the CSR file you just created
   - Download the certificate (.cer file)

4. **Install Certificate**
   - Double-click the downloaded .cer file
   - It will be added to your Keychain

### Step 2: Verify Setup

Run this command:

```bash
cd "/Users/stevemoraco/Lander Dropbox/Steve Moraco/Mac (6)/Downloads/ai image culling/kull"
./scripts/check-notarization-setup.sh
```

**Expected output:**
```
✓ Developer ID Application certificate found
✓ App Store Connect API key found
✓ Xcode command line tools installed
✓ Connection successful
```

### Step 3: Test It!

Run a release:

```bash
./scripts/release.sh
```

This will automatically:
- Build iOS and macOS apps
- Create a DMG
- **Sign and notarize the DMG** (automatic!)
- Update your website with the download link

**Time:** ~15-20 minutes (notarization takes 5-10 minutes)

---

## What's Already Done

✅ Notarization scripts created and integrated
✅ App Store Connect API key configured
✅ Xcode command line tools installed
✅ All documentation written
✅ Release script updated

## What Happens After You Create the Certificate

Once you create the Developer ID Application certificate:

1. **Every release will automatically produce a notarized DMG**
2. **Users can download and open the DMG without security warnings**
3. **No more manual intervention needed**

## Detailed Guides

If you need more information:

- **Certificate Setup:** `scripts/CREATE_DEVELOPER_ID_CERTIFICATE.md`
- **Full Documentation:** `scripts/NOTARIZATION_SETUP.md`
- **Testing Guide:** `scripts/TESTING_GUIDE.md`
- **Implementation Details:** `DMG_SIGNING_IMPLEMENTATION.md`

## Quick Reference

**Check setup:**
```bash
./scripts/check-notarization-setup.sh
```

**Full release:**
```bash
./scripts/release.sh
```

**Manually notarize a DMG:**
```bash
./scripts/notarize-dmg.sh "Kull.dmg"
```

**Verify a DMG:**
```bash
codesign --verify --verbose "Kull.dmg"
spctl --assess -v "Kull.dmg"
stapler validate "Kull.dmg"
```

---

**That's it!** Once you create the certificate (Step 1), everything else is automatic.
