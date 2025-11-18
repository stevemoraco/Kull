#!/bin/bash
set -e  # Exit on error

echo "🚀 Building Kull for iOS..."

cd "$(dirname "$0")/../apps/Kull Universal App/kull"

# Clean previous builds
rm -rf build/
mkdir -p build/

# Archive app
echo "📦 Archiving..."
xcodebuild archive \
  -scheme kull \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath build/KullMobile.xcarchive \
  DEVELOPMENT_TEAM=283HJ7VJR4

# Export IPA
echo "📤 Exporting..."
xcodebuild -exportArchive \
  -archivePath build/KullMobile.xcarchive \
  -exportPath build \
  -exportOptionsPlist ../../../scripts/ExportOptions-iOS.plist

echo "✅ iOS build complete: build/Kull.ipa"
