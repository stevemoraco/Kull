#!/bin/bash

# Xcode Cloud pre-xcodebuild script
# This runs before Xcode builds the project
# Sets the build number to date/time format: YYYYMMDDHHMM

set -e

echo "=========================================="
echo "Kull CI: Pre-Xcodebuild Script"
echo "=========================================="

# Generate build number from date/time (format: YYYYMMDDHHMM)
BUILD_NUMBER=$(date +%Y%m%d%H%M)

echo "Generated build number: $BUILD_NUMBER"

# Determine project directory
if [ -d "$CI_WORKSPACE/apps/Kull Universal App/kull" ]; then
    PROJECT_DIR="$CI_WORKSPACE/apps/Kull Universal App/kull"
else
    PROJECT_DIR="$CI_WORKSPACE"
fi

# Path to Info.plist
INFO_PLIST="$PROJECT_DIR/kull/Info.plist"

# Verify Info.plist exists
if [ ! -f "$INFO_PLIST" ]; then
    echo "ERROR: Info.plist not found at $INFO_PLIST"
    exit 1
fi

# Update CFBundleVersion (build number) in Info.plist
echo "Updating CFBundleVersion to: $BUILD_NUMBER"
/usr/libexec/PlistBuddy -c "Set :CFBundleVersion $BUILD_NUMBER" "$INFO_PLIST"

# Verify the change
CURRENT_VERSION=$(/usr/libexec/PlistBuddy -c "Print :CFBundleVersion" "$INFO_PLIST")
echo "Verified CFBundleVersion is now: $CURRENT_VERSION"

# Log marketing version (CFBundleShortVersionString) for reference
MARKETING_VERSION=$(/usr/libexec/PlistBuddy -c "Print :CFBundleShortVersionString" "$INFO_PLIST" 2>/dev/null || echo "1.0")
echo "Marketing version (CFBundleShortVersionString): $MARKETING_VERSION"

echo "=========================================="
echo "Build version set successfully"
echo "Marketing Version: $MARKETING_VERSION"
echo "Build Number: $BUILD_NUMBER"
echo "=========================================="
