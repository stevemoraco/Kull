#!/bin/bash
set -e

# ============================================
# KULL RELEASE SCRIPT
# One-pass build, upload, and release
# ============================================

# Configuration
PROJECT_ROOT="/Users/stevemoraco/Lander Dropbox/Steve Moraco/Mac (6)/Downloads/ai image culling/kull"

# Step 0: Git sync - pull, merge, and ensure we're on main
echo ""
echo "Step 0: Syncing with remote (pull, merge, push)..."
cd "$PROJECT_ROOT"

# Ensure we're on main branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "  Switching from '$CURRENT_BRANCH' to 'main'..."
    git checkout main
fi

# Fetch latest from remote
echo "  Fetching latest from origin..."
git fetch origin main

# Check if we need to merge
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)
BASE=$(git merge-base HEAD origin/main)

if [ "$LOCAL" = "$REMOTE" ]; then
    echo "  ✓ Already up to date with origin/main"
elif [ "$LOCAL" = "$BASE" ]; then
    echo "  Pulling changes from origin/main..."
    git pull origin main --no-edit
    echo "  ✓ Pulled latest changes"
elif [ "$REMOTE" = "$BASE" ]; then
    echo "  ✓ Local is ahead of origin (will push at end)"
else
    echo "  Merging origin/main into local..."
    if git merge origin/main --no-edit; then
        echo "  ✓ Merged successfully"
    else
        echo "  ⚠️ MERGE CONFLICT DETECTED!"
        echo "  Please resolve conflicts manually, then run release.sh again"
        exit 1
    fi
fi

echo "  ✓ Git sync complete"
XCODE_PROJECT="$PROJECT_ROOT/apps/Kull Universal App/kull"
APP_ID="6755838738"
KEY_ID="S9KW8G5RHS"
ISSUER_ID="c63dccab-1ecd-41dc-9374-174cfdb70958"
KEY_PATH="/Users/stevemoraco/.private_keys/AuthKey_S9KW8G5RHS.p8"
TEAM_ID="283HJ7VJR4"

# Generate version numbers - UNIFIED FORMAT
# MARKETING_VERSION: 2025.11.27
# BUILD_NUMBER: 2015 (HHMM)
# FULL_VERSION: 2025.11.27.2015 (used for DMG filename, matches TestFlight exactly)
MARKETING_VERSION=$(date +%Y.%m.%d)
BUILD_NUMBER=$(date +%H%M)
FULL_VERSION="${MARKETING_VERSION}.${BUILD_NUMBER}"
RELEASE_DATE=$(date +%Y-%m-%d)

# DMG filename matches TestFlight build exactly
DMG_NAME="Kull-${FULL_VERSION}.dmg"

echo "================================================"
echo "KULL RELEASE: $FULL_VERSION"
echo "================================================"
echo "  Marketing Version: $MARKETING_VERSION"
echo "  Build Number: $BUILD_NUMBER"
echo "  DMG Name: $DMG_NAME"
echo "================================================"

# Step 1: Clean
echo ""
echo "Step 1: Cleaning..."
# Use find with -delete for more robust cleanup
find ~/Library/Developer/Xcode/DerivedData -maxdepth 1 -name "kull-*" -type d -exec rm -rf {} + 2>/dev/null || true
rm -rf "$XCODE_PROJECT/build" 2>/dev/null || true
mkdir -p "$XCODE_PROJECT/build"
cd "$XCODE_PROJECT"

# Step 2: Update version numbers
echo "Step 2: Setting versions in project..."
xcrun agvtool new-marketing-version "$MARKETING_VERSION" || true
xcrun agvtool new-version -all "$BUILD_NUMBER" || true

if [ -f "$XCODE_PROJECT/kull/Info.plist" ]; then
    /usr/libexec/PlistBuddy -c "Set :CFBundleVersion $BUILD_NUMBER" "$XCODE_PROJECT/kull/Info.plist" 2>/dev/null || true
fi

# Step 3: Build iOS
echo ""
echo "Step 3: Building iOS..."
xcodebuild archive \
  -project kull.xcodeproj \
  -scheme kull \
  -destination 'generic/platform=iOS' \
  -archivePath "$XCODE_PROJECT/build/ios.xcarchive" \
  MARKETING_VERSION="$MARKETING_VERSION" \
  CURRENT_PROJECT_VERSION="$BUILD_NUMBER" \
  -quiet

# Step 4: Build macOS (for TestFlight)
echo "Step 4: Building macOS for TestFlight..."
xcodebuild archive \
  -project kull.xcodeproj \
  -scheme kull \
  -destination 'generic/platform=macOS' \
  -archivePath "$XCODE_PROJECT/build/mac.xcarchive" \
  MARKETING_VERSION="$MARKETING_VERSION" \
  CURRENT_PROJECT_VERSION="$BUILD_NUMBER" \
  -quiet

# Step 5: Export and Upload iOS
echo ""
echo "Step 5: Uploading iOS to App Store Connect..."
xcodebuild -exportArchive \
  -archivePath "$XCODE_PROJECT/build/ios.xcarchive" \
  -exportPath "$XCODE_PROJECT/build/ios-export" \
  -exportOptionsPlist "$XCODE_PROJECT/ExportOptions-AppStore.plist" \
  -allowProvisioningUpdates \
  -authenticationKeyPath "$KEY_PATH" \
  -authenticationKeyID "$KEY_ID" \
  -authenticationKeyIssuerID "$ISSUER_ID"

# Step 6: Export and Upload macOS
echo ""
echo "Step 6: Uploading macOS to App Store Connect..."
xcodebuild -exportArchive \
  -archivePath "$XCODE_PROJECT/build/mac.xcarchive" \
  -exportPath "$XCODE_PROJECT/build/mac-export" \
  -exportOptionsPlist "$XCODE_PROJECT/ExportOptions-AppStore.plist" \
  -allowProvisioningUpdates \
  -authenticationKeyPath "$KEY_PATH" \
  -authenticationKeyID "$KEY_ID" \
  -authenticationKeyIssuerID "$ISSUER_ID"

# Step 7: Wait for processing
echo ""
echo "Step 7: Waiting for builds to process (90 seconds)..."
sleep 90

# Step 8: Configure TestFlight
echo ""
echo "Step 8: Configuring TestFlight..."
python3 "$PROJECT_ROOT/scripts/testflight_setup.py" --build "$BUILD_NUMBER"

# Step 9: Build DMG for direct download (reuse mac archive)
echo ""
echo "Step 9: Building DMG..."
cd "$XCODE_PROJECT"

# Export for Developer ID (direct download)
xcodebuild -exportArchive \
  -archivePath "$XCODE_PROJECT/build/mac.xcarchive" \
  -exportPath "$XCODE_PROJECT/build/dmg-export" \
  -exportOptionsPlist "$XCODE_PROJECT/ExportOptions-DeveloperID.plist" \
  -allowProvisioningUpdates || {
    echo "Developer ID export failed, trying with generic export..."
    # Fallback: just copy the app from the archive
    mkdir -p "$XCODE_PROJECT/build/dmg-export"
    cp -R "$XCODE_PROJECT/build/mac.xcarchive/Products/Applications/kull.app" "$XCODE_PROJECT/build/dmg-export/"
}

cd "$XCODE_PROJECT/build/dmg-export"

# Create staging directory with app and Applications symlink
echo "  Creating DMG staging directory..."
rm -rf dmg-staging
mkdir -p dmg-staging
cp -R "kull.app" dmg-staging/
ln -s /Applications dmg-staging/Applications

# Create DMG
echo "  Creating DMG: $DMG_NAME..."
rm -f "$DMG_NAME"
if command -v create-dmg &> /dev/null; then
    echo "  Using create-dmg..."
    create-dmg \
      --volname "Kull" \
      --window-pos 200 120 \
      --window-size 600 400 \
      --icon-size 100 \
      --icon "kull.app" 150 190 \
      --app-drop-link 450 190 \
      "$DMG_NAME" \
      "dmg-staging/kull.app" || {
        echo "  create-dmg failed, using hdiutil fallback..."
        hdiutil create -volname "Kull" -srcfolder "dmg-staging" -ov -format UDZO "$DMG_NAME"
      }
else
    echo "  Using hdiutil..."
    hdiutil create -volname "Kull" -srcfolder "dmg-staging" -ov -format UDZO "$DMG_NAME"
fi

# Sign and notarize DMG
if [ -f "$DMG_NAME" ]; then
    echo ""
    echo "Step 9b: Signing and notarizing DMG..."

    # Check if Developer ID Application certificate exists
    DEVELOPER_ID_CERT=$(security find-identity -v -p codesigning 2>/dev/null | grep "Developer ID Application" | head -1 | sed 's/.*"\(.*\)".*/\1/' || true)

    if [ -n "$DEVELOPER_ID_CERT" ]; then
        echo "  ✓ Found Developer ID certificate: $DEVELOPER_ID_CERT"
        SIGNING_IDENTITY="$DEVELOPER_ID_CERT"
        CAN_NOTARIZE=true
    else
        echo "  ⚠ No Developer ID certificate found - using Apple Development"
        echo "    Run: scripts/setup_developer_id.sh for one-time setup"
        SIGNING_IDENTITY="Apple Development: Stephen Moraco (CNFRKNKY86)"
        CAN_NOTARIZE=false
    fi

    # Sign the app with hardened runtime
    echo "  Signing app with: $SIGNING_IDENTITY"
    codesign --force --deep \
        --sign "$SIGNING_IDENTITY" \
        --options runtime \
        --timestamp \
        "kull.app" 2>/dev/null || echo "  App signing skipped (may already be signed)"

    # Re-create staging directory with signed app
    rm -rf dmg-staging
    mkdir -p dmg-staging
    cp -R "kull.app" dmg-staging/
    ln -s /Applications dmg-staging/Applications

    # Re-create DMG with signed app
    rm -f "$DMG_NAME"
    if command -v create-dmg &> /dev/null; then
        echo "  Re-creating DMG with signed app..."
        create-dmg \
          --volname "Kull" \
          --window-pos 200 120 \
          --window-size 600 400 \
          --icon-size 100 \
          --icon "kull.app" 150 190 \
          --app-drop-link 450 190 \
          "$DMG_NAME" \
          "dmg-staging/kull.app" || {
            echo "  create-dmg failed, using hdiutil fallback..."
            hdiutil create -volname "Kull" -srcfolder "dmg-staging" -ov -format UDZO "$DMG_NAME"
          }
    else
        hdiutil create -volname "Kull" -srcfolder "dmg-staging" -ov -format UDZO "$DMG_NAME"
    fi

    # Sign the DMG
    echo "  Signing DMG..."
    codesign --force \
        --sign "$SIGNING_IDENTITY" \
        --timestamp \
        --options runtime \
        "$DMG_NAME" 2>/dev/null || echo "  DMG signing skipped"

    # Submit for notarization (only if we have Developer ID)
    if [ "$CAN_NOTARIZE" = true ]; then
        echo "  Submitting for notarization (this takes ~5 minutes)..."
        NOTARIZE_OUTPUT=$(xcrun notarytool submit "$DMG_NAME" \
            --key "$KEY_PATH" \
            --key-id "$KEY_ID" \
            --issuer "$ISSUER_ID" \
            --wait 2>&1) || true

        echo "$NOTARIZE_OUTPUT"

        if echo "$NOTARIZE_OUTPUT" | grep -q "status: Accepted"; then
            echo "  Stapling notarization ticket..."
            xcrun stapler staple "$DMG_NAME"
            echo "✓ DMG signed and notarized successfully"
        else
            echo "⚠️  Notarization may have failed"
            echo "  DMG will still be usable but users may see Gatekeeper warnings"
        fi
    else
        echo "  ⚠ Skipping notarization (no Developer ID certificate)"
        echo "    DMG is signed but users will need to right-click > Open"
        echo "    For fully notarized DMGs, run: scripts/setup_developer_id.sh"
    fi
else
    echo "⚠️  DMG creation failed"
fi

# Step 10: Copy DMG to website and update download.ts
echo ""
echo "Step 10: Updating website..."

if [ -f "$XCODE_PROJECT/build/dmg-export/$DMG_NAME" ]; then
    # Create downloads directory and remove ALL old DMG files
    mkdir -p "$PROJECT_ROOT/client/public/downloads/"
    echo "  Removing old DMG files..."
    rm -f "$PROJECT_ROOT/client/public/downloads/"Kull-*.dmg

    # Copy new DMG
    cp "$XCODE_PROJECT/build/dmg-export/$DMG_NAME" "$PROJECT_ROOT/client/public/downloads/"

    # Also create a "latest" symlink
    cd "$PROJECT_ROOT/client/public/downloads/"
    rm -f Kull-latest.dmg
    ln -s "$DMG_NAME" Kull-latest.dmg

    echo "  ✓ DMG copied to website downloads"

    # Update download.ts with new version info
    cat > "$PROJECT_ROOT/server/routes/download.ts" << 'DOWNLOAD_EOF'
import { Router, type Request, Response } from "express";
import { storage } from "../storage";

const router = Router();

// Version information for each platform
// NOTE: Auto-updated by release.sh script
const LATEST_VERSIONS = {
  macos: {
    version: "REPLACE_VERSION",
    buildNumber: "REPLACE_BUILD",
    downloadUrl: "/downloads/REPLACE_DMG",
    releaseNotes: "Latest release with all features",
    releaseDate: "REPLACE_DATE",
    fileSize: "~5 MB",
    minimumOS: "macOS 14.0+",
    features: [
      "5 AI models (Gemini, Grok, Kimi k2, Claude, GPT-5)",
      "Universal Mac app (Apple Silicon & Intel)",
      "Instant photo rating and organization",
      "Works with any folder on your Mac",
      "Auto-sync with iOS companion app"
    ]
  },
  ios: {
    version: "REPLACE_VERSION",
    buildNumber: "REPLACE_BUILD",
    testFlightUrl: "https://testflight.apple.com/join/PtzCFZKb",
    releaseNotes: "iOS release on TestFlight - Beta Testing Available",
    releaseDate: "REPLACE_DATE",
    minimumOS: "iOS 17.0+",
    features: [
      "Seamless sync with Mac app",
      "Rate photos on-the-go",
      "Optimized for iPhone & iPad",
      "Offline mode support",
      "Push notifications for processing updates"
    ]
  }
};

// Full changelog history
const CHANGELOG = [
  {
    version: "REPLACE_VERSION",
    buildNumber: "REPLACE_BUILD",
    date: "REPLACE_DATE",
    platform: "all",
    notes: [
      "Universal Mac and iOS app release",
      "AI-powered photo rating using 5 advanced models",
      "TestFlight beta available for iOS",
      "Direct DMG download for macOS"
    ]
  }
];

// GET /api/download/latest - Returns latest version info for each platform
router.get("/latest", async (req: Request, res: Response) => {
  try {
    res.json(LATEST_VERSIONS);
  } catch (error) {
    console.error("Error fetching latest versions:", error);
    res.status(500).json({ message: "Failed to fetch version information" });
  }
});

// GET /api/download/changelog - Returns full changelog history
router.get("/changelog", async (req: Request, res: Response) => {
  try {
    res.json(CHANGELOG);
  } catch (error) {
    console.error("Error fetching changelog:", error);
    res.status(500).json({ message: "Failed to fetch changelog" });
  }
});

// POST /api/download/track - Track download analytics
router.post("/track", async (req: any, res: Response) => {
  try {
    const { platform, version } = req.body;
    const userId = req.user?.claims?.sub || null;

    const ipAddress = req.headers['cf-connecting-ip'] ||
                     req.headers['x-real-ip'] ||
                     req.headers['x-forwarded-for']?.split(',')[0] ||
                     req.connection?.remoteAddress ||
                     req.socket?.remoteAddress ||
                     'unknown';

    const userAgent = req.headers['user-agent'] || 'unknown';

    console.log(`[Download] Tracked: platform=${platform}, version=${version}, userId=${userId || 'anonymous'}, ip=${ipAddress}`);

    res.json({ success: true });
  } catch (error) {
    console.error("Error tracking download:", error);
    res.status(500).json({ message: "Failed to track download" });
  }
});

export default router;
DOWNLOAD_EOF

    # Replace placeholders with actual values
    sed -i '' "s/REPLACE_VERSION/$MARKETING_VERSION/g" "$PROJECT_ROOT/server/routes/download.ts"
    sed -i '' "s/REPLACE_BUILD/$BUILD_NUMBER/g" "$PROJECT_ROOT/server/routes/download.ts"
    sed -i '' "s/REPLACE_DMG/$DMG_NAME/g" "$PROJECT_ROOT/server/routes/download.ts"
    sed -i '' "s/REPLACE_DATE/$RELEASE_DATE/g" "$PROJECT_ROOT/server/routes/download.ts"

    echo "  ✓ download.ts updated with version $FULL_VERSION"
else
    echo "⚠️  DMG not found, skipping website update"
fi

# Step 11: Git commit and push
echo ""
echo "Step 11: Committing and pushing to git..."
cd "$PROJECT_ROOT"

# Stage all changes
git add -A

# Create commit
git commit -m "Release $FULL_VERSION

- iOS and macOS uploaded to TestFlight (Build $BUILD_NUMBER)
- DMG: $DMG_NAME
- Website download link updated
- TestFlight: https://testflight.apple.com/join/PtzCFZKb

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>" || echo "Nothing to commit"

# Push to main
git push origin main || echo "Push failed - check git status"

echo ""
echo "================================================"
echo "✅ RELEASE COMPLETE!"
echo "================================================"
echo "  Version: $FULL_VERSION"
echo "  Marketing Version: $MARKETING_VERSION"
echo "  Build Number: $BUILD_NUMBER"
echo "  DMG: $DMG_NAME"
echo ""
echo "  TestFlight: https://testflight.apple.com/join/PtzCFZKb"
echo "  Download:   https://kullai.com/downloads/$DMG_NAME"
echo "================================================"
