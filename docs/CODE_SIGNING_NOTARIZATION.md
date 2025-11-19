# Code Signing & Notarization Guide for Kull

## Overview

This guide covers code signing and notarization requirements for distributing Kull on macOS and iOS via the App Store and other channels.

## Prerequisites

### Apple Developer Account
- **Account Type:** Apple Developer Program ($99/year)
- **Enrolled Entity:** Lander Media LLC
- **Team ID:** [Your Team ID] (found in Membership section of Apple Developer portal)

### Development Tools
- **Xcode:** 15.0 or later
- **macOS:** 14.0 (Sonoma) or later
- **Command Line Tools:** Install via `xcode-select --install`

---

## Code Signing for iOS

### 1. Create App ID

1. Visit [Apple Developer Portal](https://developer.apple.com/account)
2. Navigate to **Certificates, Identifiers & Profiles**
3. Click **Identifiers** → **+** (Add)
4. Select **App IDs** → **Continue**
5. Configure App ID:
   - **Description:** Kull iOS App
   - **Bundle ID:** `media.lander.kull` (Explicit)
   - **Capabilities:**
     - Push Notifications
     - App Groups
     - iCloud (CloudKit)
     - Keychain Sharing
     - Background Modes
6. Click **Continue** → **Register**

### 2. Generate iOS Distribution Certificate

**One-time setup per Mac:**

1. Open **Keychain Access** on Mac
2. Menu: **Keychain Access → Certificate Assistant → Request a Certificate from a Certificate Authority**
3. Fill in:
   - **User Email Address:** steve@lander.media
   - **Common Name:** Lander Media LLC iOS Distribution
   - **CA Email Address:** (leave blank)
   - **Request is:** Saved to disk
4. Click **Continue** → Save `CertificateSigningRequest.certSigningRequest` to Desktop

**In Apple Developer Portal:**

1. Navigate to **Certificates** → **+** (Add)
2. Select **iOS Distribution** (for App Store and Ad Hoc)
3. Click **Continue**
4. Upload `CertificateSigningRequest.certSigningRequest`
5. Click **Continue** → **Download**
6. Double-click downloaded `.cer` file to install in Keychain

**Verify Installation:**

```bash
security find-identity -v -p codesigning
```

You should see: `"Apple Distribution: Lander Media LLC (TEAM_ID)"`

### 3. Create iOS Provisioning Profile

1. Navigate to **Profiles** → **+** (Add)
2. Select **App Store** (under Distribution)
3. Click **Continue**
4. Select App ID: `media.lander.kull`
5. Select Certificate: `Apple Distribution: Lander Media LLC`
6. Click **Continue** → **Generate**
7. Download profile: `Kull_iOS_App_Store.mobileprovision`
8. Double-click to install (automatically added to Xcode)

**Verify Installation:**

```bash
ls ~/Library/MobileDevice/Provisioning\ Profiles/
```

---

## Code Signing for macOS

### 1. Create macOS App ID

1. Navigate to **Identifiers** → **+** (Add)
2. Select **App IDs** → **Continue**
3. Platform: **macOS**
4. Configure App ID:
   - **Description:** Kull macOS App
   - **Bundle ID:** `media.lander.kull.mac` (Explicit)
   - **Capabilities:**
     - Push Notifications
     - App Groups
     - iCloud (CloudKit)
     - Keychain Sharing
     - Hardened Runtime (automatically enabled)
5. Click **Continue** → **Register**

### 2. Generate macOS Distribution Certificates

**Two certificates needed for macOS:**

#### A. Mac App Distribution (for Mac App Store)

1. Create CSR (same process as iOS)
2. Navigate to **Certificates** → **+** (Add)
3. Select **Mac App Distribution**
4. Upload CSR → Download → Install

#### B. Developer ID Application (for notarized DMG/PKG outside App Store)

1. Navigate to **Certificates** → **+** (Add)
2. Select **Developer ID Application**
3. Upload CSR → Download → Install

**Verify Installation:**

```bash
security find-identity -v -p codesigning
```

You should see:
- `"3rd Party Mac Developer Application: Lander Media LLC (TEAM_ID)"`
- `"Developer ID Application: Lander Media LLC (TEAM_ID)"`

### 3. Create macOS Provisioning Profile

1. Navigate to **Profiles** → **+** (Add)
2. Select **Mac App Store** (under Distribution)
3. Select App ID: `media.lander.kull.mac`
4. Select Certificate: `3rd Party Mac Developer Application`
5. Click **Continue** → **Generate**
6. Download: `Kull_macOS_App_Store.provisionprofile`
7. Double-click to install

---

## Xcode Project Configuration

### 1. Configure Signing in Xcode

1. Open `kull.xcodeproj` in Xcode
2. Select **kull** target
3. Navigate to **Signing & Capabilities** tab

**For Debug builds:**
- **Automatically manage signing:** ✅ Enabled
- **Team:** Lander Media LLC
- **Provisioning Profile:** Xcode Managed Profile

**For Release builds:**
- **Automatically manage signing:** ❌ Disabled (manual control)
- **Team:** Lander Media LLC
- **Provisioning Profile:** `Kull_iOS_App_Store` (iOS) or `Kull_macOS_App_Store` (macOS)
- **Signing Certificate:** `Apple Distribution` (iOS) or `3rd Party Mac Developer Application` (macOS)

### 2. Configure Build Settings

Navigate to **Build Settings** → Search for "Code Signing"

**Code Signing Identity:**
- **Debug:** Apple Development
- **Release:** Apple Distribution (iOS) or 3rd Party Mac Developer Application (macOS)

**Code Signing Style:**
- **Debug:** Automatic
- **Release:** Manual

**Development Team:**
- **All configurations:** [Your Team ID]

**Other Code Signing Flags:**
- **macOS only:** `--timestamp --options runtime`
- (Enables Hardened Runtime for notarization)

### 3. Configure Entitlements

**Verify `kull.entitlements` contains:**

```xml
<!-- App Sandbox (macOS) -->
<key>com.apple.security.app-sandbox</key>
<true/>

<!-- File Access -->
<key>com.apple.security.files.user-selected.read-write</key>
<true/>

<!-- Network -->
<key>com.apple.security.network.client</key>
<true/>

<!-- Hardened Runtime (macOS) -->
<key>com.apple.security.cs.allow-jit</key>
<false/>
<key>com.apple.security.cs.allow-unsigned-executable-memory</key>
<false/>
<key>com.apple.security.cs.disable-library-validation</key>
<false/>

<!-- Push Notifications -->
<key>aps-environment</key>
<string>production</string>  <!-- Change from "development" before release -->
```

**Update for Production:**

Before archiving for App Store:

1. Open `kull.entitlements`
2. Change `aps-environment` from `development` to `production`
3. Commit change to git

---

## Building & Archiving

### 1. Prepare for Archive

**Clean Build Folder:**
```bash
cd "/home/runner/workspace/apps/Kull Universal App/kull"
xcodebuild clean -project kull.xcodeproj -scheme kull -configuration Release
```

**Update Version Numbers:**

1. Select **kull** target → **General** → **Identity**
2. **Version:** 1.0 (user-facing, matches App Store listing)
3. **Build:** 1 (increment with each upload: 1, 2, 3...)

### 2. Archive via Xcode

**GUI Method:**

1. Xcode → Select target: **Any Mac (Apple Silicon, Intel)** or **Any iOS Device**
2. Menu: **Product → Archive** (Cmd+Shift+B to build Release, then Archive)
3. Wait for archive to complete (~5-10 minutes)
4. Xcode Organizer window opens automatically

**Command-Line Method:**

```bash
# iOS Archive
xcodebuild archive \
  -project kull.xcodeproj \
  -scheme kull \
  -destination 'generic/platform=iOS' \
  -archivePath "$PWD/build/kull-iOS.xcarchive" \
  -configuration Release

# macOS Archive
xcodebuild archive \
  -project kull.xcodeproj \
  -scheme kull \
  -destination 'generic/platform=macOS' \
  -archivePath "$PWD/build/kull-macOS.xcarchive" \
  -configuration Release
```

### 3. Validate Archive

**In Xcode Organizer:**

1. Select latest archive
2. Click **Validate App** button
3. Choose distribution method: **App Store Connect**
4. Select signing option:
   - **Automatically manage signing:** ✅ (Xcode re-signs with App Store profile)
   - OR manually select provisioning profile
5. Click **Next** → Wait for validation (~2-5 minutes)

**Fix Common Validation Errors:**

| Error | Fix |
|-------|-----|
| Missing or invalid entitlement | Check `kull.entitlements` matches App ID capabilities |
| Invalid provisioning profile | Regenerate profile in Apple Developer portal |
| App uses non-public API | Remove private framework usage, use public APIs only |
| Missing privacy usage description | Add `NSPhotoLibraryUsageDescription` to Info.plist |

### 4. Upload to App Store Connect

**In Xcode Organizer:**

1. Select validated archive
2. Click **Distribute App**
3. Choose **App Store Connect**
4. Select options:
   - **Upload:** ✅
   - **Include bitcode:** ❌ (deprecated as of Xcode 14)
   - **Upload your app's symbols:** ✅ (for crash reports)
   - **Manage version:** Automatically
5. Click **Upload**
6. Wait for upload to complete (~10-30 minutes)

**Verify Upload:**

1. Visit [App Store Connect](https://appstoreconnect.apple.com)
2. Select **Kull** → **Activity** tab
3. Build should show status: "Processing" → "Ready to Submit"
4. Processing takes 10-60 minutes

**Command-Line Upload:**

```bash
# Export IPA/PKG
xcodebuild -exportArchive \
  -archivePath "$PWD/build/kull-iOS.xcarchive" \
  -exportPath "$PWD/build/export" \
  -exportOptionsPlist ExportOptions.plist

# Upload via xcrun altool (deprecated, use Transporter instead)
xcrun altool --upload-app \
  -f "$PWD/build/export/kull.ipa" \
  -t ios \
  -u steve@lander.media \
  -p "@keychain:AC_PASSWORD"
```

**Or use Transporter app:**

1. Download [Transporter](https://apps.apple.com/us/app/transporter/id1450874784?mt=12) from Mac App Store
2. Drag `kull.ipa` (iOS) or `kull.pkg` (macOS) to Transporter
3. Click **Deliver** → Wait for upload

---

## macOS Notarization

**Required for:** Distribution outside Mac App Store (DMG, PKG, ZIP)

**Not required for:** Mac App Store submissions (automatically notarized by Apple)

### 1. Create App-Specific Password

1. Visit [Apple ID](https://appleid.apple.com)
2. Sign in with Apple Developer account
3. Navigate to **Security → App-Specific Passwords**
4. Click **Generate Password**
5. Label: `Kull Notarization`
6. Copy password (format: `xxxx-xxxx-xxxx-xxxx`)
7. Save to Keychain:

```bash
xcrun notarytool store-credentials "Kull-Notarization" \
  --apple-id steve@lander.media \
  --team-id [YOUR_TEAM_ID] \
  --password "xxxx-xxxx-xxxx-xxxx"
```

### 2. Notarize macOS App

**Step 1: Export and Code Sign**

```bash
# Export app from Xcode (Product → Archive → Distribute → Developer ID)
# Or manually code sign:
codesign --deep --force --verify --verbose \
  --sign "Developer ID Application: Lander Media LLC" \
  --options runtime \
  --entitlements kull.entitlements \
  kull.app
```

**Step 2: Create ZIP or DMG**

```bash
# Option A: ZIP (simpler)
ditto -c -k --keepParent kull.app kull.zip

# Option B: DMG (more professional)
hdiutil create -volname "Kull" -srcfolder kull.app -ov -format UDZO kull.dmg
```

**Step 3: Submit for Notarization**

```bash
xcrun notarytool submit kull.zip \
  --keychain-profile "Kull-Notarization" \
  --wait
```

Output:
```
Submitting kull.zip...
Submission ID: 12345678-1234-1234-1234-123456789012
Successfully uploaded file
  id: 12345678-1234-1234-1234-123456789012
  path: kull.zip

Waiting for processing to complete...
Current status: Accepted
```

**Step 4: Staple Notarization Ticket**

```bash
# Staple to app (for ZIP distribution)
xcrun stapler staple kull.app

# Or staple to DMG
xcrun stapler staple kull.dmg
```

**Verify Notarization:**

```bash
spctl -a -vv -t install kull.app
```

Output should show: `source=Notarized Developer ID`

### 3. Check Notarization Status

```bash
# Get submission ID from previous step
xcrun notarytool info 12345678-1234-1234-1234-123456789012 \
  --keychain-profile "Kull-Notarization"
```

**If rejected, view logs:**

```bash
xcrun notarytool log 12345678-1234-1234-1234-123456789012 \
  --keychain-profile "Kull-Notarization"
```

Common rejection reasons:
- **Missing Hardened Runtime:** Add `--options runtime` to codesign command
- **Unsigned frameworks:** Sign all embedded frameworks separately
- **Missing entitlements:** Ensure entitlements file is correct

---

## Code Signing Verification

### Verify iOS/macOS App Signature

```bash
# iOS IPA
codesign -dvvv kull.ipa

# macOS App Bundle
codesign -dvvv kull.app
```

**Expected output:**

```
Authority=Apple Distribution: Lander Media LLC (TEAM_ID)
Authority=Apple Worldwide Developer Relations Certification Authority
Authority=Apple Root CA
Signed Time=Nov 18, 2025 at 10:30:00 AM
```

### Verify Entitlements

```bash
codesign -d --entitlements - kull.app
```

**Expected output:**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.security.app-sandbox</key>
  <true/>
  <key>com.apple.security.files.user-selected.read-write</key>
  <true/>
  ...
</dict>
</plist>
```

### Verify Provisioning Profile

```bash
# Extract embedded provisioning profile
security cms -D -i kull.app/Contents/embedded.provisionprofile
```

**Check profile details:**
- **Team ID:** Matches your Apple Developer Team
- **App ID:** `media.lander.kull` or `media.lander.kull.mac`
- **Expiration:** Not expired
- **Entitlements:** Match `kull.entitlements`

---

## Troubleshooting

### Error: "No signing identity found"

**Cause:** Missing distribution certificate in Keychain

**Fix:**
1. Regenerate certificate in Apple Developer portal
2. Download `.cer` file
3. Double-click to install in Keychain
4. Restart Xcode

### Error: "Provisioning profile doesn't match entitlements"

**Cause:** App ID capabilities don't match entitlements file

**Fix:**
1. Visit Apple Developer portal → Identifiers
2. Edit App ID capabilities (enable Push Notifications, iCloud, etc.)
3. Regenerate provisioning profile
4. Download and install in Xcode

### Error: "Signature not valid for use in process using Library Validation"

**Cause:** Hardened Runtime entitlement missing

**Fix:**
1. Add to `kull.entitlements`:
   ```xml
   <key>com.apple.security.cs.disable-library-validation</key>
   <false/>
   ```
2. Re-archive and upload

### Error: "App Sandbox not enabled"

**Cause:** macOS app missing sandbox entitlement

**Fix:**
1. Add to `kull.entitlements`:
   ```xml
   <key>com.apple.security.app-sandbox</key>
   <true/>
   ```
2. Re-archive

### Error: "Notarization failed: The binary uses an SDK older than the 10.9 SDK"

**Cause:** Xcode version too old

**Fix:**
1. Update Xcode to latest version
2. Re-archive and resubmit for notarization

---

## Automation with Fastlane

**Install Fastlane:**

```bash
sudo gem install fastlane -NV
```

**Initialize in project:**

```bash
cd "/home/runner/workspace/apps/Kull Universal App/kull"
fastlane init
```

**Sample Fastfile:**

```ruby
default_platform(:ios)

platform :ios do
  desc "Build and upload to App Store Connect"
  lane :release do
    increment_build_number(xcodeproj: "kull.xcodeproj")
    build_app(scheme: "kull", configuration: "Release")
    upload_to_app_store(
      skip_metadata: false,
      skip_screenshots: false,
      submit_for_review: false
    )
  end
end

platform :mac do
  desc "Build and upload macOS app"
  lane :release do
    increment_build_number(xcodeproj: "kull.xcodeproj")
    build_mac_app(scheme: "kull", configuration: "Release")
    upload_to_app_store(
      platform: "osx",
      skip_metadata: false,
      skip_screenshots: false,
      submit_for_review: false
    )
  end
end
```

**Run Fastlane:**

```bash
# iOS
fastlane ios release

# macOS
fastlane mac release
```

---

## Certificate Renewal

**Expiration:**
- **Distribution Certificates:** Valid for 1 year
- **Provisioning Profiles:** Valid for 1 year
- **App-Specific Passwords:** Never expire (unless revoked)

**Renewal Process:**

1. **30 days before expiration:**
   - Create new CSR
   - Generate new certificate in Apple Developer portal
   - Download and install

2. **Update provisioning profiles:**
   - Regenerate profiles with new certificate
   - Download and install

3. **Re-archive app:**
   - Build new archive with updated certificate
   - Upload to App Store Connect

**Set Calendar Reminder:**
- Annual reminder: "Renew Apple Distribution Certificate"
- 30 days before expiration date

---

## Resources

**Apple Documentation:**
- [Code Signing Guide](https://developer.apple.com/library/archive/documentation/Security/Conceptual/CodeSigningGuide/)
- [Notarizing macOS Software](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution)
- [Hardened Runtime](https://developer.apple.com/documentation/security/hardened_runtime)

**Tools:**
- [Xcode](https://developer.apple.com/xcode/)
- [Transporter](https://apps.apple.com/us/app/transporter/id1450874784?mt=12)
- [Fastlane](https://fastlane.tools/)

---

**Last Updated:** November 18, 2025
