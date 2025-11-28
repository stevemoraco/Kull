#!/bin/bash

# Xcode Cloud post-clone script
# This runs after the repository is cloned

echo "Kull post-clone script running..."

# Set version number from CI build number
if [ -n "$CI_BUILD_NUMBER" ]; then
    VERSION=$(date +"%Y.%m.%d")
    BUILD_NUMBER=$CI_BUILD_NUMBER
    
    # Update version in project
    cd "$CI_WORKSPACE/apps/Kull Universal App/kull"
    
    # Update marketing version and build number using PlistBuddy
    /usr/libexec/PlistBuddy -c "Set :CFBundleShortVersionString $VERSION" "$CI_WORKSPACE/apps/Kull Universal App/kull/kull/Info.plist" 2>/dev/null || true
    
    echo "Set version to: $VERSION ($BUILD_NUMBER)"
fi

echo "Post-clone complete"
