#!/bin/bash
set -e  # Exit on error

echo "🚀 Building Kull for macOS..."

cd "$(dirname "$0")/../apps/Kull Universal App/kull"

# Clean previous builds
rm -rf build/
mkdir -p build/

# Archive app
echo "📦 Archiving..."
xcodebuild archive \
  -scheme kull \
  -configuration Release \
  -destination 'generic/platform=macOS' \
  -archivePath build/Kull.xcarchive \
  DEVELOPMENT_TEAM=283HJ7VJR4

# Export app
echo "📤 Exporting..."
xcodebuild -exportArchive \
  -archivePath build/Kull.xcarchive \
  -exportPath build \
  -exportOptionsPlist ../../../scripts/ExportOptions-macOS.plist

echo "✅ macOS build complete: build/Kull.app"
