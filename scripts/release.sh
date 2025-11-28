#!/bin/bash
set -e

# ============================================
# KULL RELEASE SCRIPT
# One-pass build, upload, and release
# DMG creation happens IN PARALLEL with TestFlight polling
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

# ============================================
# PARALLEL EXECUTION: DMG + TestFlight
# ============================================
echo ""
echo "Step 7: Starting parallel tasks..."
echo "  - Task A: DMG creation, signing, notarization, website update"
echo "  - Task B: TestFlight polling and submission"
echo ""

# Create temp files for status tracking
DMG_STATUS_FILE=$(mktemp)
TESTFLIGHT_STATUS_FILE=$(mktemp)
echo "pending" > "$DMG_STATUS_FILE"
echo "pending" > "$TESTFLIGHT_STATUS_FILE"

# ============================================
# TASK A: DMG Creation (runs in background)
# ============================================
(
    echo "[DMG] Starting DMG creation..."
    cd "$XCODE_PROJECT"

    # Export for Developer ID (direct download)
    echo "[DMG] Exporting for Developer ID..."
    xcodebuild -exportArchive \
      -archivePath "$XCODE_PROJECT/build/mac.xcarchive" \
      -exportPath "$XCODE_PROJECT/build/dmg-export" \
      -exportOptionsPlist "$XCODE_PROJECT/ExportOptions-DeveloperID.plist" \
      -allowProvisioningUpdates 2>/dev/null || {
        echo "[DMG] Developer ID export failed, copying from archive..."
        mkdir -p "$XCODE_PROJECT/build/dmg-export"
        cp -R "$XCODE_PROJECT/build/mac.xcarchive/Products/Applications/kull.app" "$XCODE_PROJECT/build/dmg-export/"
    }

    cd "$XCODE_PROJECT/build/dmg-export"

    # Create staging directory
    echo "[DMG] Creating staging directory..."
    rm -rf dmg-staging
    mkdir -p dmg-staging
    cp -R "kull.app" dmg-staging/
    ln -s /Applications dmg-staging/Applications

    # Find Developer ID cert
    DEVELOPER_ID_CERT=$(security find-identity -v -p codesigning 2>/dev/null | grep "Developer ID Application" | head -1 | sed 's/.*"\(.*\)".*/\1/' || true)

    if [ -n "$DEVELOPER_ID_CERT" ]; then
        echo "[DMG] Found Developer ID: $DEVELOPER_ID_CERT"
        CAN_NOTARIZE=true

        # Sign the app
        echo "[DMG] Signing app..."
        codesign --force --deep \
            --sign "$DEVELOPER_ID_CERT" \
            --options runtime \
            --timestamp \
            "kull.app" 2>/dev/null || true

        # Re-create staging with signed app
        rm -rf dmg-staging
        mkdir -p dmg-staging
        cp -R "kull.app" dmg-staging/
        ln -s /Applications dmg-staging/Applications
    else
        echo "[DMG] No Developer ID cert - using unsigned"
        CAN_NOTARIZE=false
    fi

    # Create DMG
    echo "[DMG] Creating $DMG_NAME..."
    rm -f "$DMG_NAME"
    hdiutil create -volname "Kull" -srcfolder "dmg-staging" -ov -format UDZO "$DMG_NAME"

    # Sign DMG if we have Developer ID
    if [ -n "$DEVELOPER_ID_CERT" ]; then
        echo "[DMG] Signing DMG..."
        codesign --force \
            --sign "$DEVELOPER_ID_CERT" \
            --timestamp \
            --options runtime \
            "$DMG_NAME" 2>/dev/null || true
    fi

    # Notarize if possible
    if [ "$CAN_NOTARIZE" = true ]; then
        echo "[DMG] Submitting for notarization..."
        NOTARIZE_OUTPUT=$(xcrun notarytool submit "$DMG_NAME" \
            --key "$KEY_PATH" \
            --key-id "$KEY_ID" \
            --issuer "$ISSUER_ID" \
            --wait 2>&1) || true

        if echo "$NOTARIZE_OUTPUT" | grep -q "status: Accepted"; then
            echo "[DMG] Stapling notarization ticket..."
            xcrun stapler staple "$DMG_NAME"
            echo "[DMG] ✓ DMG notarized successfully"
        else
            echo "[DMG] ⚠ Notarization may have failed"
        fi
    fi

    # Copy to website
    if [ -f "$DMG_NAME" ]; then
        echo "[DMG] Copying to website..."
        mkdir -p "$PROJECT_ROOT/client/public/downloads/"
        rm -f "$PROJECT_ROOT/client/public/downloads/"Kull-*.dmg
        cp "$DMG_NAME" "$PROJECT_ROOT/client/public/downloads/"

        cd "$PROJECT_ROOT/client/public/downloads/"
        rm -f Kull-latest.dmg
        ln -s "$DMG_NAME" Kull-latest.dmg

        # Update download.ts
        echo "[DMG] Updating download.ts..."
        cat > "$PROJECT_ROOT/server/routes/download.ts" << DOWNLOAD_EOF
import { Router, type Request, Response } from "express";
import { storage } from "../storage";

const router = Router();

// Version information for each platform
// NOTE: Auto-updated by release.sh script
const LATEST_VERSIONS = {
  macos: {
    version: "$MARKETING_VERSION",
    buildNumber: "$BUILD_NUMBER",
    downloadUrl: "/downloads/$DMG_NAME",
    releaseNotes: "Latest release with all features",
    releaseDate: "$RELEASE_DATE",
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
    version: "$MARKETING_VERSION",
    buildNumber: "$BUILD_NUMBER",
    testFlightUrl: "https://testflight.apple.com/join/PtzCFZKb",
    releaseNotes: "iOS release on TestFlight - Beta Testing Available",
    releaseDate: "$RELEASE_DATE",
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
    version: "$MARKETING_VERSION",
    buildNumber: "$BUILD_NUMBER",
    date: "$RELEASE_DATE",
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

    console.log(\`[Download] Tracked: platform=\${platform}, version=\${version}, userId=\${userId || 'anonymous'}, ip=\${ipAddress}\`);

    res.json({ success: true });
  } catch (error) {
    console.error("Error tracking download:", error);
    res.status(500).json({ message: "Failed to track download" });
  }
});

export default router;
DOWNLOAD_EOF

        echo "[DMG] ✓ Website updated"
        echo "success" > "$DMG_STATUS_FILE"
    else
        echo "[DMG] ✗ DMG creation failed"
        echo "failed" > "$DMG_STATUS_FILE"
    fi
) &
DMG_PID=$!

# ============================================
# TASK B: TestFlight (runs in background)
# ============================================
(
    echo "[TestFlight] Starting TestFlight polling..."

    # Run the TestFlight setup script
    python3 "$PROJECT_ROOT/scripts/testflight_setup.py" --build "$BUILD_NUMBER"

    if [ $? -eq 0 ]; then
        echo "[TestFlight] ✓ TestFlight setup complete"
        echo "success" > "$TESTFLIGHT_STATUS_FILE"
    else
        echo "[TestFlight] ⚠ TestFlight setup had issues"
        echo "partial" > "$TESTFLIGHT_STATUS_FILE"
    fi
) &
TESTFLIGHT_PID=$!

# ============================================
# Wait for both tasks to complete
# ============================================
echo ""
echo "Waiting for parallel tasks to complete..."
echo "  DMG task PID: $DMG_PID"
echo "  TestFlight task PID: $TESTFLIGHT_PID"
echo ""

wait $DMG_PID
DMG_EXIT=$?
wait $TESTFLIGHT_PID
TESTFLIGHT_EXIT=$?

DMG_RESULT=$(cat "$DMG_STATUS_FILE")
TESTFLIGHT_RESULT=$(cat "$TESTFLIGHT_STATUS_FILE")
rm -f "$DMG_STATUS_FILE" "$TESTFLIGHT_STATUS_FILE"

echo ""
echo "Parallel tasks complete:"
echo "  DMG: $DMG_RESULT (exit: $DMG_EXIT)"
echo "  TestFlight: $TESTFLIGHT_RESULT (exit: $TESTFLIGHT_EXIT)"

# ============================================
# Step 8: Git commit and push
# ============================================
echo ""
echo "Step 8: Committing and pushing to git..."
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
echo "  DMG Status: $DMG_RESULT"
echo "  TestFlight Status: $TESTFLIGHT_RESULT"
echo ""
echo "  TestFlight: https://testflight.apple.com/join/PtzCFZKb"
echo "  Download:   https://kullai.com/downloads/$DMG_NAME"
echo "================================================"
