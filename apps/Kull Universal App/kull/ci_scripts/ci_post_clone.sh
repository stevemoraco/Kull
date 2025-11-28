#!/bin/bash

# Xcode Cloud post-clone script
# This runs after the repository is cloned, before any build steps

set -e

echo "=========================================="
echo "Kull CI: Post-Clone Script"
echo "=========================================="

# Log environment info
echo "Workspace: $CI_WORKSPACE"
echo "Build Number: $CI_BUILD_NUMBER"
echo "Branch: $CI_BRANCH"
echo "Commit: $CI_COMMIT"

# Determine project directory
# In Xcode Cloud, CI_WORKSPACE is the repo root
# We need to navigate to the Xcode project location
if [ -d "$CI_WORKSPACE/apps/Kull Universal App/kull" ]; then
    PROJECT_DIR="$CI_WORKSPACE/apps/Kull Universal App/kull"
else
    # If already in project directory (e.g., during local testing)
    PROJECT_DIR="$CI_WORKSPACE"
fi

echo "Project directory: $PROJECT_DIR"
cd "$PROJECT_DIR"

# Install any dependencies if needed (currently none, but here for future use)
# Example: npm install (if we had Node dependencies)
# Example: pod install (if we used CocoaPods)

echo "Post-clone complete"
echo "=========================================="
