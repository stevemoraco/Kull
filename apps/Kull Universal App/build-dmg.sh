#!/bin/bash
#
# Build a professional DMG installer for Kull
#
# Usage: ./build-dmg.sh [path-to-app]
#
# If no app path provided, will look for built app in default Xcode location

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
RESOURCES_DIR="$SCRIPT_DIR/dmg-resources"

# Configuration
APP_NAME="Kull"
DMG_NAME="Kull-1.0.0"
VOLUME_NAME="Kull"
DMG_SIZE="200m"
WINDOW_WIDTH=660
WINDOW_HEIGHT=400

# Find the app
if [ -n "$1" ]; then
    APP_PATH="$1"
else
    # Try default Xcode build locations
    APP_PATH="$HOME/Library/Developer/Xcode/DerivedData/kull-*/Build/Products/Release/kull.app"
    APP_PATH=$(ls -d $APP_PATH 2>/dev/null | head -1)

    if [ -z "$APP_PATH" ] || [ ! -d "$APP_PATH" ]; then
        APP_PATH="$SCRIPT_DIR/kull/build/Release/kull.app"
    fi
fi

if [ ! -d "$APP_PATH" ]; then
    echo "Error: Could not find kull.app"
    echo "Either build the app first in Xcode, or provide path: ./build-dmg.sh /path/to/kull.app"
    exit 1
fi

echo "Using app: $APP_PATH"

# Output location
OUTPUT_DIR="$PROJECT_ROOT/client/public/downloads"
mkdir -p "$OUTPUT_DIR"

# Cleanup any existing DMG
rm -f "$OUTPUT_DIR/$DMG_NAME.dmg"
rm -rf "/tmp/$DMG_NAME-temp"

# Create temporary directory for DMG contents
TEMP_DIR="/tmp/$DMG_NAME-temp"
mkdir -p "$TEMP_DIR"

# Copy app to temp directory
echo "Copying app..."
cp -R "$APP_PATH" "$TEMP_DIR/$APP_NAME.app"

# Create Applications symlink
ln -s /Applications "$TEMP_DIR/Applications"

# Create temporary DMG
echo "Creating DMG..."
TEMP_DMG="/tmp/$DMG_NAME-temp.dmg"
rm -f "$TEMP_DMG"

hdiutil create -srcfolder "$TEMP_DIR" -volname "$VOLUME_NAME" -fs HFS+ \
    -fsargs "-c c=64,a=16,e=16" -format UDRW -size "$DMG_SIZE" "$TEMP_DMG"

# Mount the DMG
echo "Configuring DMG..."
DEVICE=$(hdiutil attach -readwrite -noverify "$TEMP_DMG" | egrep '^/dev/' | sed 1q | awk '{print $1}')
MOUNT_POINT="/Volumes/$VOLUME_NAME"

sleep 2

# Set volume icon
if [ -f "$RESOURCES_DIR/VolumeIcon.icns" ]; then
    cp "$RESOURCES_DIR/VolumeIcon.icns" "$MOUNT_POINT/.VolumeIcon.icns"
    SetFile -c icnC "$MOUNT_POINT/.VolumeIcon.icns"
    SetFile -a C "$MOUNT_POINT"
fi

# Use AppleScript to configure window appearance
echo "Setting up window appearance..."
osascript << EOF
tell application "Finder"
    tell disk "$VOLUME_NAME"
        open
        set current view of container window to icon view
        set toolbar visible of container window to false
        set statusbar visible of container window to false
        set bounds of container window to {100, 100, $((100 + WINDOW_WIDTH)), $((100 + WINDOW_HEIGHT))}

        set theViewOptions to the icon view options of container window
        set arrangement of theViewOptions to not arranged
        set icon size of theViewOptions to 100

        -- Position icons: app on left, Applications on right
        set position of item "$APP_NAME.app" of container window to {150, 200}
        set position of item "Applications" of container window to {500, 200}

        update without registering applications
        close
    end tell
end tell
EOF

# Wait for Finder to update
sleep 3

# Make sure window is closed
osascript -e "tell application \"Finder\" to close every window"

# Unmount
echo "Finalizing DMG..."
hdiutil detach "$DEVICE" -quiet

# Convert to compressed DMG
hdiutil convert "$TEMP_DMG" -format UDZO -imagekey zlib-level=9 -o "$OUTPUT_DIR/$DMG_NAME.dmg"

# Cleanup
rm -rf "$TEMP_DIR"
rm -f "$TEMP_DMG"

echo ""
echo "=========================================="
echo "DMG created successfully!"
echo "Output: $OUTPUT_DIR/$DMG_NAME.dmg"
echo "=========================================="
echo ""
echo "To remove the 'unidentified developer' warning:"
echo "1. Open Xcode and sign the app with your Developer ID"
echo "2. Run: codesign --deep --force --verify --verbose --sign \"Developer ID Application: Your Name\" kull.app"
echo "3. Notarize: xcrun notarytool submit $DMG_NAME.dmg --apple-id YOUR_APPLE_ID --password YOUR_APP_PASSWORD --team-id YOUR_TEAM_ID"
echo "4. Staple: xcrun stapler staple $DMG_NAME.dmg"
