#!/bin/bash

# Test CI Scripts Locally
# This script verifies all CI scripts work correctly before pushing to Xcode Cloud

set -e

echo "=========================================="
echo "Testing Kull CI Scripts"
echo "=========================================="

# Get the project directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "Project directory: $PROJECT_DIR"
echo ""

# Mock CI environment variables
export CI_WORKSPACE="$PROJECT_DIR"
export CI_BUILD_NUMBER="12345"
export CI_BRANCH="main"
export CI_COMMIT="abc123def456"
export CI_ARCHIVE_PATH="$PROJECT_DIR/build/archive"
export CI_PRODUCT_PATH="$PROJECT_DIR/build/kull.app"
export CI_APP_VERSION="1.0"

# Backup Info.plist
INFO_PLIST="$PROJECT_DIR/kull/Info.plist"
BACKUP_PLIST="$INFO_PLIST.backup"

if [ -f "$INFO_PLIST" ]; then
    cp "$INFO_PLIST" "$BACKUP_PLIST"
    echo "✅ Backed up Info.plist"
else
    echo "❌ ERROR: Info.plist not found at $INFO_PLIST"
    exit 1
fi

echo ""
echo "=========================================="
echo "Test 1: ci_post_clone.sh"
echo "=========================================="

if [ -x "$SCRIPT_DIR/ci_post_clone.sh" ]; then
    "$SCRIPT_DIR/ci_post_clone.sh"
    echo "✅ ci_post_clone.sh executed successfully"
else
    echo "❌ ci_post_clone.sh is not executable"
    exit 1
fi

echo ""
echo "=========================================="
echo "Test 2: ci_pre_xcodebuild.sh"
echo "=========================================="

if [ -x "$SCRIPT_DIR/ci_pre_xcodebuild.sh" ]; then
    "$SCRIPT_DIR/ci_pre_xcodebuild.sh"
    echo "✅ ci_pre_xcodebuild.sh executed successfully"

    # Verify build number was updated
    BUILD_NUMBER=$(/usr/libexec/PlistBuddy -c "Print :CFBundleVersion" "$INFO_PLIST")
    echo ""
    echo "Build number set to: $BUILD_NUMBER"

    if [[ $BUILD_NUMBER =~ ^[0-9]{12}$ ]]; then
        echo "✅ Build number format is correct (YYYYMMDDHHMM)"
    else
        echo "❌ ERROR: Build number format is incorrect: $BUILD_NUMBER"
        echo "   Expected: 12 digits (YYYYMMDDHHMM)"
        mv "$BACKUP_PLIST" "$INFO_PLIST"
        exit 1
    fi
else
    echo "❌ ci_pre_xcodebuild.sh is not executable"
    mv "$BACKUP_PLIST" "$INFO_PLIST"
    exit 1
fi

echo ""
echo "=========================================="
echo "Test 3: ci_post_xcodebuild.sh"
echo "=========================================="

if [ -x "$SCRIPT_DIR/ci_post_xcodebuild.sh" ]; then
    "$SCRIPT_DIR/ci_post_xcodebuild.sh"
    echo "✅ ci_post_xcodebuild.sh executed successfully"
else
    echo "❌ ci_post_xcodebuild.sh is not executable"
    mv "$BACKUP_PLIST" "$INFO_PLIST"
    exit 1
fi

echo ""
echo "=========================================="
echo "Test 4: Verify YAML Configuration"
echo "=========================================="

YAML_FILE="$SCRIPT_DIR/xcode-cloud-workflow-reference.yml"
if [ -f "$YAML_FILE" ]; then
    echo "✅ Workflow reference YAML exists"
    LINE_COUNT=$(wc -l < "$YAML_FILE")
    echo "   Lines: $LINE_COUNT"
else
    echo "⚠️  WARNING: Workflow reference YAML not found (not required)"
fi

echo ""
echo "=========================================="
echo "Restoring Info.plist"
echo "=========================================="

# Restore original Info.plist
mv "$BACKUP_PLIST" "$INFO_PLIST"
echo "✅ Restored original Info.plist"

echo ""
echo "=========================================="
echo "✅ ALL TESTS PASSED"
echo "=========================================="
echo ""
echo "CI scripts are ready for Xcode Cloud!"
echo ""
echo "Next steps:"
echo "1. Commit ci_scripts/ to git"
echo "2. Push to main branch"
echo "3. Configure Xcode Cloud workflow in Xcode"
echo "4. Trigger first build"
echo ""
echo "See: XCODE_CLOUD_QUICK_START.md for setup instructions"
echo "=========================================="
