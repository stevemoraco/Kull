#!/bin/bash
# Verify all prerequisites for release.sh are met

set +e  # Don't exit on error, we want to check everything

PROJECT_ROOT="/Users/stevemoraco/Lander Dropbox/Steve Moraco/Mac (6)/Downloads/ai image culling/kull"
XCODE_PROJECT="$PROJECT_ROOT/apps/Kull Universal App/kull"
KEY_PATH="$HOME/.private_keys/AuthKey_S9KW8G5RHS.p8"

echo "================================================"
echo "KULL RELEASE SETUP VERIFICATION"
echo "================================================"
echo ""

ERRORS=0

# Check Xcode
echo "1. Checking Xcode..."
if command -v xcodebuild &> /dev/null; then
    XCODE_VERSION=$(xcodebuild -version | head -n 1)
    echo "   ✅ $XCODE_VERSION"
else
    echo "   ❌ Xcode not found"
    ERRORS=$((ERRORS + 1))
fi

# Check Command Line Tools
echo "2. Checking Command Line Tools..."
if xcode-select -p &> /dev/null; then
    CLT_PATH=$(xcode-select -p)
    echo "   ✅ $CLT_PATH"
else
    echo "   ❌ Command Line Tools not installed"
    echo "      Run: xcode-select --install"
    ERRORS=$((ERRORS + 1))
fi

# Check create-dmg
echo "3. Checking create-dmg..."
if command -v create-dmg &> /dev/null; then
    echo "   ✅ $(which create-dmg)"
else
    echo "   ⚠️  create-dmg not found (will use hdiutil fallback)"
    echo "      Install with: brew install create-dmg"
fi

# Check Python 3
echo "4. Checking Python 3..."
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version)
    echo "   ✅ $PYTHON_VERSION"
else
    echo "   ❌ Python 3 not found"
    ERRORS=$((ERRORS + 1))
fi

# Check PyJWT
echo "5. Checking PyJWT..."
if python3 -c "import jwt" 2>/dev/null; then
    JWT_VERSION=$(python3 -c "import jwt; print(jwt.__version__)")
    echo "   ✅ PyJWT $JWT_VERSION"
else
    echo "   ❌ PyJWT not installed"
    echo "      Run: pip3 install pyjwt"
    ERRORS=$((ERRORS + 1))
fi

# Check requests
echo "6. Checking requests library..."
if python3 -c "import requests" 2>/dev/null; then
    echo "   ✅ requests installed"
else
    echo "   ❌ requests not installed"
    echo "      Run: pip3 install requests"
    ERRORS=$((ERRORS + 1))
fi

# Check API key
echo "7. Checking App Store Connect API Key..."
if [ -f "$KEY_PATH" ]; then
    echo "   ✅ $KEY_PATH"
    # Verify it's readable
    if [ -r "$KEY_PATH" ]; then
        echo "   ✅ Key is readable"
    else
        echo "   ❌ Key exists but not readable"
        echo "      Run: chmod 600 $KEY_PATH"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo "   ❌ API Key not found at $KEY_PATH"
    ERRORS=$((ERRORS + 1))
fi

# Check Xcode project
echo "8. Checking Xcode project..."
if [ -d "$XCODE_PROJECT/kull.xcodeproj" ]; then
    echo "   ✅ kull.xcodeproj found"
else
    echo "   ❌ Xcode project not found at $XCODE_PROJECT"
    ERRORS=$((ERRORS + 1))
fi

# Check Export Options
echo "9. Checking Export Options files..."
if [ -f "$XCODE_PROJECT/ExportOptions-AppStore.plist" ]; then
    echo "   ✅ ExportOptions-AppStore.plist"
else
    echo "   ❌ ExportOptions-AppStore.plist not found"
    ERRORS=$((ERRORS + 1))
fi

if [ -f "$XCODE_PROJECT/ExportOptions-DeveloperID.plist" ]; then
    echo "   ✅ ExportOptions-DeveloperID.plist"
else
    echo "   ❌ ExportOptions-DeveloperID.plist not found"
    ERRORS=$((ERRORS + 1))
fi

# Check Git
echo "10. Checking Git..."
if git -C "$PROJECT_ROOT" status &> /dev/null; then
    BRANCH=$(git -C "$PROJECT_ROOT" rev-parse --abbrev-ref HEAD)
    echo "   ✅ Git repository (branch: $BRANCH)"
else
    echo "   ❌ Not a git repository"
    ERRORS=$((ERRORS + 1))
fi

# Check scripts
echo "11. Checking release scripts..."
if [ -x "$PROJECT_ROOT/scripts/release.sh" ]; then
    echo "   ✅ release.sh (executable)"
else
    echo "   ❌ release.sh not executable"
    echo "      Run: chmod +x scripts/release.sh"
    ERRORS=$((ERRORS + 1))
fi

if [ -x "$PROJECT_ROOT/scripts/testflight_setup.py" ]; then
    echo "   ✅ testflight_setup.py (executable)"
else
    echo "   ❌ testflight_setup.py not executable"
    echo "      Run: chmod +x scripts/testflight_setup.py"
    ERRORS=$((ERRORS + 1))
fi

# Summary
echo ""
echo "================================================"
if [ $ERRORS -eq 0 ]; then
    echo "✅ ALL CHECKS PASSED!"
    echo "================================================"
    echo ""
    echo "Ready to release! Run:"
    echo "  ./scripts/release.sh"
    exit 0
else
    echo "❌ $ERRORS ERROR(S) FOUND"
    echo "================================================"
    echo ""
    echo "Fix the errors above before running release.sh"
    exit 1
fi
