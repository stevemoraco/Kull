#!/bin/bash

# Xcode Cloud post-xcodebuild script
# This runs after successful build and archiving
# Used for custom actions like notifications, analytics, etc.

set -e

echo "=========================================="
echo "Kull CI: Post-Xcodebuild Script"
echo "=========================================="

# Log build artifacts
echo "Archive path: $CI_ARCHIVE_PATH"
echo "Product path: $CI_PRODUCT_PATH"
echo "Build number: $CI_BUILD_NUMBER"
echo "App version: $CI_APP_VERSION"

# Get the build number we set earlier
BUILD_NUMBER=$(date +%Y%m%d%H%M)
echo "Build completed successfully: $BUILD_NUMBER"

# Optional: You can add custom logic here
# Examples:
# - Send a Slack notification
# - Update a status page
# - Trigger additional automation

echo "=========================================="
echo "Build completed successfully!"
echo "This build will be uploaded to TestFlight"
echo "=========================================="
