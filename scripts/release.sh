#!/bin/bash
set -e

# ============================================
# KULL RELEASE SCRIPT
# One-pass build, upload, and release
# DMG creation happens IN PARALLEL with TestFlight polling
# ============================================

# Configuration
PROJECT_ROOT="/Users/stevemoraco/Lander Dropbox/Steve Moraco/Mac (6)/Downloads/ai image culling/kull"

# Step 0: Environment check
echo ""
echo "Step 0: Checking environment..."
cd "$PROJECT_ROOT"

# Check for DEPLOY_SECRET
if [ -z "${DEPLOY_SECRET:-}" ]; then
    echo "  ⚠ DEPLOY_SECRET not set - DMG upload to server will be skipped"
    echo "  To enable DMG upload, set DEPLOY_SECRET environment variable"
    CAN_UPLOAD_DMG=false
else
    echo "  ✓ DEPLOY_SECRET is set"
    CAN_UPLOAD_DMG=true
fi
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
echo "  - Task A: DMG creation, signing, notarization, upload to server"
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

    # Create styled DMG (use /tmp to avoid Dropbox sync issues)
    echo "[DMG] Creating styled $DMG_NAME..."
    DMG_TEMP_DIR="/tmp/kull-dmg-$$"
    rm -rf "$DMG_TEMP_DIR"
    mkdir -p "$DMG_TEMP_DIR"

    # Copy files to temp
    cp -R "kull.app" "$DMG_TEMP_DIR/"
    mkdir -p "$DMG_TEMP_DIR/staging"
    cp -R "$DMG_TEMP_DIR/kull.app" "$DMG_TEMP_DIR/staging/"
    ln -s /Applications "$DMG_TEMP_DIR/staging/Applications"

    cd "$DMG_TEMP_DIR"
    rm -f temp.dmg final.dmg

    # Create a temporary read-write DMG first
    hdiutil create -volname "Kull" -srcfolder "staging" -ov -format UDRW temp.dmg

    # Mount it
    hdiutil attach temp.dmg -readwrite -noverify
    sleep 1

    # Apply styling with AppleScript
    echo "[DMG] Applying Finder styling..."
    osascript << 'APPLESCRIPT_EOF'
tell application "Finder"
    tell disk "Kull"
        open
        set current view of container window to icon view
        set toolbar visible of container window to false
        set statusbar visible of container window to false
        set bounds of container window to {100, 100, 640, 440}
        set theViewOptions to icon view options of container window
        set arrangement of theViewOptions to not arranged
        set icon size of theViewOptions to 128
        set background color of theViewOptions to {65535, 65535, 65535}
        -- Position icons: app on left, Applications on right
        set position of item "kull.app" of container window to {130, 170}
        set position of item "Applications" of container window to {410, 170}
        close
        open
        update without registering applications
        delay 2
        close
    end tell
end tell
APPLESCRIPT_EOF

    # Make sure Finder is done
    sleep 3

    # Unmount
    hdiutil detach "/Volumes/Kull" -force 2>/dev/null || true
    sleep 2

    # Convert to compressed read-only DMG
    hdiutil convert temp.dmg -format UDZO -o final.dmg

    # Move back to export directory
    cd "$XCODE_PROJECT/build/dmg-export"
    rm -f "$DMG_NAME"
    mv "$DMG_TEMP_DIR/final.dmg" "$DMG_NAME"
    rm -rf "$DMG_TEMP_DIR"

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

    # Upload DMG to server
    if [ -f "$DMG_NAME" ]; then
        echo "[DMG] DMG created successfully: $DMG_NAME"

        # Upload to server if DEPLOY_SECRET is set
        if [ "$CAN_UPLOAD_DMG" = true ]; then
            echo "[DMG] Uploading to server..."
            UPLOAD_RESPONSE=$(curl -X POST "https://kullai.com/api/download/upload" \
              -F "dmg=@${DMG_NAME}" \
              -F "secret=${DEPLOY_SECRET}" \
              --max-time 300 \
              --silent \
              --write-out "\nHTTP_STATUS:%{http_code}" 2>&1)

            HTTP_STATUS=$(echo "$UPLOAD_RESPONSE" | grep "HTTP_STATUS:" | cut -d':' -f2)

            if [ "$HTTP_STATUS" = "200" ]; then
                echo "[DMG] ✓ Upload successful"
                echo "success" > "$DMG_STATUS_FILE"
            else
                echo "[DMG] ✗ Upload failed (HTTP status: $HTTP_STATUS)"
                echo "$UPLOAD_RESPONSE" | grep -v "HTTP_STATUS:"
                echo "failed" > "$DMG_STATUS_FILE"
            fi
        else
            echo "[DMG] ⚠ Skipping upload (DEPLOY_SECRET not set)"
            echo "success_no_upload" > "$DMG_STATUS_FILE"
        fi
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
# Wait for both parallel tasks to complete
# ============================================
echo ""
echo "Waiting for parallel tasks to complete..."
echo "  DMG task PID: $DMG_PID"
echo "  TestFlight task PID: $TESTFLIGHT_PID"
echo ""

# Wait for DMG
wait $DMG_PID
DMG_EXIT=$?
DMG_RESULT=$(cat "$DMG_STATUS_FILE")
echo "  ✓ DMG task finished: $DMG_RESULT"

# Wait for TestFlight
wait $TESTFLIGHT_PID
TESTFLIGHT_EXIT=$?
TESTFLIGHT_RESULT=$(cat "$TESTFLIGHT_STATUS_FILE")
echo "  ✓ TestFlight finished: $TESTFLIGHT_RESULT"

# Cleanup temp files
rm -f "$DMG_STATUS_FILE" "$TESTFLIGHT_STATUS_FILE"

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
if [ "$DMG_RESULT" = "success" ]; then
    echo "  Download:   https://kullai.com/downloads/$DMG_NAME"
else
    echo "  Download:   DMG upload failed or skipped"
fi
echo "  Live Site:  https://kullai.com"
echo "================================================"
