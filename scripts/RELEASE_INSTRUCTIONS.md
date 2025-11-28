# Kull Release Script Instructions

## Overview

The `release.sh` script automates the entire release process for Kull in one pass:

1. ✅ Sets correct version numbers (marketing AND build)
2. ✅ Builds iOS archive
3. ✅ Builds macOS archive
4. ✅ Uploads iOS to App Store Connect / TestFlight
5. ✅ Uploads macOS to App Store Connect / TestFlight
6. ✅ Configures TestFlight (adds to public beta group, submits for review)
7. ✅ Builds DMG for direct download
8. ✅ Uploads DMG to Replit Object Storage via API
9. ✅ Commits and pushes to git

## Version Format

- **Marketing Version**: `2025.11.27` (date-based, shown to users)
- **Build Number**: `1827` (HHMM format, incrementing within day)
- **DMG Filename**: `Kull-v2025-11-27-06-27-PM.dmg`

## Prerequisites

### Required Software

1. **Xcode** (latest version)
   - Command Line Tools installed: `xcode-select --install`

2. **create-dmg** (for DMG creation)
   ```bash
   brew install create-dmg
   ```

3. **Python 3** with PyJWT
   ```bash
   pip3 install pyjwt requests
   ```

4. **App Store Connect API Key**
   - Location: `~/.private_keys/AuthKey_S9KW8G5RHS.p8`
   - Key ID: `S9KW8G5RHS`
   - Issuer ID: `c63dccab-1ecd-41dc-9374-174cfdb70958`

### Xcode Configuration

1. **Signing & Capabilities**
   - Automatic signing enabled
   - Team: Lander Ventures LLC (283HJ7VJR4)
   - iOS bundle ID: `media.lander.kull`
   - macOS bundle ID: `media.lander.kull`

2. **Version Control**
   - Project must use `MARKETING_VERSION` and `CURRENT_PROJECT_VERSION` build settings
   - Info.plist should reference `$(MARKETING_VERSION)` for `CFBundleShortVersionString`
   - Info.plist should reference `$(CURRENT_PROJECT_VERSION)` for `CFBundleVersion`

## Running a Release

### Quick Start

```bash
cd /Users/stevemoraco/Lander\ Dropbox/Steve\ Moraco/Mac\ \(6\)/Downloads/ai\ image\ culling/kull
./scripts/release.sh
```

The script will:
- Generate version numbers based on current date/time
- Clean build folders
- Build and upload both iOS and macOS
- Configure TestFlight
- Create DMG
- Update website
- Commit and push changes

### Expected Output

```
================================================
KULL RELEASE: 2025.11.27 (Build 1827)
================================================
Step 1: Cleaning...
Step 2: Setting versions in project...
  Marketing Version: 2025.11.27
  Build Number: 1827
Step 3: Building iOS...
Step 4: Building macOS...
Step 5: Uploading iOS to App Store Connect...
Step 6: Uploading macOS to App Store Connect...
Step 7: Waiting for builds to process (90 seconds)...
Step 8: Configuring TestFlight...
Step 9: Building DMG...
Step 10: Uploading to server...
Step 11: Committing and pushing...
================================================
RELEASE COMPLETE!
Version: 2025.11.27 (Build 1827)
DMG: Kull-v2025-11-27-06-27-PM.dmg
TestFlight: https://testflight.apple.com/join/PtzCFZKb
================================================
```

## Manual Steps After Release

### 1. Verify TestFlight (5-60 minutes after upload)

1. Open [App Store Connect](https://appstoreconnect.apple.com/)
2. Go to "Apps" → "Kull" → "TestFlight"
3. Verify both iOS and macOS builds appear under "Builds"
4. Check that builds are in "Public Testers" group
5. Confirm "Beta App Review" status is "Waiting for Review" or "In Review"

### 2. Verify Website Download (Immediate)

1. Visit https://kullai.com
2. Click "Download for Mac"
3. Verify DMG filename matches: `Kull-v2025-11-27-XX-XX-XM.dmg`
4. Verify version in download API: `curl https://kullai.com/api/download/latest`

### 3. Test DMG Installation

```bash
cd /Users/stevemoraco/Lander\ Dropbox/Steve\ Moraco/Mac\ \(6\)/Downloads/ai\ image\ culling/kull/client/public/downloads/
open Kull-v2025-11-27-*.dmg
# Drag app to Applications, test launch
```

### 4. Monitor TestFlight Beta Review

- **Timeline**: 1-24 hours (usually < 4 hours)
- **Email Notifications**: Watch for Apple emails about beta review
- **Status Check**: App Store Connect → TestFlight → Beta App Review

### 5. Share TestFlight Link

Once approved:
- iOS: https://testflight.apple.com/join/PtzCFZKb
- macOS: https://testflight.apple.com/join/PtzCFZKb

## Troubleshooting

### Build Fails

```bash
# Clean Xcode derived data manually
rm -rf ~/Library/Developer/Xcode/DerivedData/kull-*

# Verify Xcode scheme
cd /Users/stevemoraco/Lander\ Dropbox/Steve\ Moraco/Mac\ \(6\)/Downloads/ai\ image\ culling/kull/apps/Kull\ Universal\ App/kull
xcodebuild -list
```

### Upload Fails (401 Authentication Error)

Check API key:
```bash
ls -la ~/.private_keys/AuthKey_S9KW8G5RHS.p8
```

Verify key expiration:
```bash
python3 scripts/testflight_setup.py
```

### TestFlight Setup Fails

Run manually:
```bash
cd /Users/stevemoraco/Lander\ Dropbox/Steve\ Moraco/Mac\ \(6\)/Downloads/ai\ image\ culling/kull
python3 scripts/testflight_setup.py
```

Check output for specific errors (rate limits, permissions, etc.)

### DMG Creation Fails

Fallback to simple DMG:
```bash
cd /Users/stevemoraco/Lander\ Dropbox/Steve\ Moraco/Mac\ \(6\)/Downloads/ai\ image\ culling/kull/apps/Kull\ Universal\ App/kull/build/dmg-export
hdiutil create -volname "Kull" -srcfolder kull.app -ov -format UDZO Kull-v$(date +"%Y-%m-%d-%I-%M-%p").dmg
```

### Git Push Fails

```bash
# Check git status
git status

# Manually push
git push origin main
```

## Manual Release (Step-by-Step)

If the automated script fails, run steps manually:

### 1. Set Versions
```bash
cd /Users/stevemoraco/Lander\ Dropbox/Steve\ Moraco/Mac\ \(6\)/Downloads/ai\ image\ culling/kull/apps/Kull\ Universal\ App/kull
xcrun agvtool new-marketing-version $(date +%Y.%m.%d)
xcrun agvtool new-version -all $(date +%H%M)
```

### 2. Build iOS
```bash
xcodebuild archive \
  -project kull.xcodeproj \
  -scheme kull \
  -destination 'generic/platform=iOS' \
  -archivePath build/ios.xcarchive
```

### 3. Build macOS
```bash
xcodebuild archive \
  -project kull.xcodeproj \
  -scheme kull \
  -destination 'generic/platform=macOS' \
  -archivePath build/mac.xcarchive
```

### 4. Export & Upload iOS
```bash
xcodebuild -exportArchive \
  -archivePath build/ios.xcarchive \
  -exportPath build/ios-export \
  -exportOptionsPlist ExportOptions-AppStore.plist \
  -allowProvisioningUpdates \
  -authenticationKeyPath ~/.private_keys/AuthKey_S9KW8G5RHS.p8 \
  -authenticationKeyID S9KW8G5RHS \
  -authenticationKeyIssuerID c63dccab-1ecd-41dc-9374-174cfdb70958
```

### 5. Export & Upload macOS
```bash
xcodebuild -exportArchive \
  -archivePath build/mac.xcarchive \
  -exportPath build/mac-export \
  -exportOptionsPlist ExportOptions-AppStore.plist \
  -allowProvisioningUpdates \
  -authenticationKeyPath ~/.private_keys/AuthKey_S9KW8G5RHS.p8 \
  -authenticationKeyID S9KW8G5RHS \
  -authenticationKeyIssuerID c63dccab-1ecd-41dc-9374-174cfdb70958
```

### 6. Configure TestFlight
```bash
python3 scripts/testflight_setup.py
```

### 7. Build DMG
```bash
xcodebuild archive \
  -project kull.xcodeproj \
  -scheme kull \
  -destination 'generic/platform=macOS' \
  -archivePath build/dmg.xcarchive

xcodebuild -exportArchive \
  -archivePath build/dmg.xcarchive \
  -exportPath build/dmg-export \
  -exportOptionsPlist ExportOptions-DeveloperID.plist \
  -allowProvisioningUpdates

cd build/dmg-export
create-dmg --volname "Kull" \
  --window-pos 200 120 \
  --window-size 600 400 \
  --icon-size 100 \
  --icon "kull.app" 150 190 \
  --app-drop-link 450 190 \
  "Kull-v$(date +"%Y-%m-%d-%I-%M-%p").dmg" \
  "kull.app"
```

## Files Created/Modified

- **Created:**
  - `scripts/release.sh` - Main release automation script
  - `scripts/testflight_setup.py` - TestFlight API configuration
  - `apps/Kull Universal App/kull/ExportOptions-DeveloperID.plist` - DMG export settings
  - `scripts/RELEASE_INSTRUCTIONS.md` - This file

- **Modified by Script:**
  - `apps/Kull Universal App/kull/kull.xcodeproj/project.pbxproj` - Version numbers
- **Uploaded by Script:**
  - DMG uploaded to Replit Object Storage via `/api/download/upload`
- **Server Dynamic Handling:**
  - Download page automatically shows latest DMG from object storage
  - No manual version updates needed

## Support

For issues or questions:
- Email: steve@lander.media
- Check App Store Connect for detailed error messages
- Review Xcode build logs in `~/Library/Developer/Xcode/DerivedData/`
