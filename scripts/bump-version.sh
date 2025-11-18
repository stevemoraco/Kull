#!/bin/bash
set -e

# Get version type from argument (major, minor, patch)
VERSION_TYPE=${1:-patch}

# Read current version from version.json
CURRENT_VERSION=$(node -p "require('./version.json').version")

# Parse version
IFS='.' read -ra VERSION_PARTS <<< "$CURRENT_VERSION"
MAJOR=${VERSION_PARTS[0]}
MINOR=${VERSION_PARTS[1]}
PATCH=${VERSION_PARTS[2]}

# Increment based on type
case $VERSION_TYPE in
  major)
    MAJOR=$((MAJOR + 1))
    MINOR=0
    PATCH=0
    ;;
  minor)
    MINOR=$((MINOR + 1))
    PATCH=0
    ;;
  patch)
    PATCH=$((PATCH + 1))
    ;;
  *)
    echo "Usage: $0 [major|minor|patch]"
    exit 1
    ;;
esac

NEW_VERSION="$MAJOR.$MINOR.$PATCH"

echo "Bumping version: $CURRENT_VERSION → $NEW_VERSION"

# Update version.json
cat > version.json << EOF
{
  "version": "$NEW_VERSION",
  "buildDate": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF

# Update Xcode project build settings
XCODE_PROJECT="apps/Kull Universal App/kull/kull.xcodeproj/project.pbxproj"

# Get current build number from project
CURRENT_BUILD=$(grep -m 1 "CURRENT_PROJECT_VERSION = " "$XCODE_PROJECT" | sed 's/.*= \([0-9]*\);/\1/')
NEW_BUILD=$((CURRENT_BUILD + 1))

# Create temporary file for sed operations
TEMP_FILE=$(mktemp)

# Update MARKETING_VERSION (version string) in all configurations
sed "s/MARKETING_VERSION = [0-9.]*;/MARKETING_VERSION = $NEW_VERSION;/g" "$XCODE_PROJECT" > "$TEMP_FILE"
mv "$TEMP_FILE" "$XCODE_PROJECT"

# Update CURRENT_PROJECT_VERSION (build number) in all configurations
sed "s/CURRENT_PROJECT_VERSION = [0-9]*;/CURRENT_PROJECT_VERSION = $NEW_BUILD;/g" "$XCODE_PROJECT" > "$TEMP_FILE"
mv "$TEMP_FILE" "$XCODE_PROJECT"

echo "✅ Version updated to $NEW_VERSION (build $NEW_BUILD)"
