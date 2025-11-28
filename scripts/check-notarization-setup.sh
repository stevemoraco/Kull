#!/bin/bash

# ============================================
# NOTARIZATION SETUP VERIFICATION SCRIPT
# ============================================
# Checks if your system is ready for DMG notarization
# ============================================

echo "============================================"
echo "NOTARIZATION SETUP CHECK"
echo "============================================"
echo ""

# Configuration
TEAM_ID="283HJ7VJR4"
KEY_ID="S9KW8G5RHS"
ISSUER_ID="c63dccab-1ecd-41dc-9374-174cfdb70958"
KEY_PATH="$HOME/.private_keys/AuthKey_S9KW8G5RHS.p8"

ALL_GOOD=true

# Check 1: Developer ID certificate
echo "1. Checking for Developer ID Application certificate..."
if security find-identity -v -p codesigning | grep -q "Developer ID Application"; then
    CERT_NAME=$(security find-identity -v -p codesigning | grep "Developer ID Application" | head -n 1)
    echo "   ✓ Found: $CERT_NAME"
else
    echo "   ✗ NOT FOUND"
    echo "   You need to create a Developer ID Application certificate."
    echo "   See: scripts/NOTARIZATION_SETUP.md"
    ALL_GOOD=false
fi

echo ""

# Check 2: Any code signing certificate
echo "2. Checking for any code signing certificates..."
CERT_COUNT=$(security find-identity -v -p codesigning | grep -c "valid identit")
if [ "$CERT_COUNT" -gt 0 ]; then
    echo "   ✓ Found $CERT_COUNT valid certificate(s)"
    security find-identity -v -p codesigning | grep -v "valid identit" | sed 's/^/   /'
else
    echo "   ✗ No code signing certificates found"
    ALL_GOOD=false
fi

echo ""

# Check 3: App Store Connect API key
echo "3. Checking for App Store Connect API key..."
if [ -f "$KEY_PATH" ]; then
    echo "   ✓ Found: $KEY_PATH"
    # Check permissions
    PERMS=$(stat -f "%OLp" "$KEY_PATH")
    if [ "$PERMS" = "600" ]; then
        echo "   ✓ Permissions: $PERMS (secure)"
    else
        echo "   ⚠️  Permissions: $PERMS (should be 600)"
        echo "   Run: chmod 600 $KEY_PATH"
    fi
else
    echo "   ✗ NOT FOUND: $KEY_PATH"
    echo "   Download from: https://appstoreconnect.apple.com/access/integrations/api"
    ALL_GOOD=false
fi

echo ""

# Check 4: Xcode command line tools
echo "4. Checking for Xcode command line tools..."
if command -v codesign &> /dev/null && command -v xcrun &> /dev/null; then
    echo "   ✓ codesign: $(which codesign)"
    echo "   ✓ xcrun: $(which xcrun)"
    XCODE_PATH=$(xcode-select -p 2>/dev/null)
    if [ -n "$XCODE_PATH" ]; then
        echo "   ✓ Xcode path: $XCODE_PATH"
    else
        echo "   ⚠️  Xcode path not set"
        echo "   Run: sudo xcode-select --switch /Applications/Xcode.app"
    fi
else
    echo "   ✗ Xcode command line tools not installed"
    echo "   Run: xcode-select --install"
    ALL_GOOD=false
fi

echo ""

# Check 5: notarytool availability
echo "5. Checking for notarytool..."
if xcrun notarytool --version &> /dev/null; then
    VERSION=$(xcrun notarytool --version 2>&1)
    echo "   ✓ notarytool available: $VERSION"
else
    echo "   ✗ notarytool not available"
    echo "   Requires Xcode 13+ or Command Line Tools 13+"
    ALL_GOOD=false
fi

echo ""

# Check 6: create-dmg (optional)
echo "6. Checking for create-dmg (optional)..."
if command -v create-dmg &> /dev/null; then
    echo "   ✓ create-dmg: $(which create-dmg)"
else
    echo "   ⚠️  create-dmg not installed (optional, uses hdiutil fallback)"
    echo "   Install: brew install create-dmg"
fi

echo ""

# Check 7: Test notarytool connection
if [ -f "$KEY_PATH" ]; then
    echo "7. Testing App Store Connect API connection..."
    # Try to get recent history (with timeout)
    if timeout 10 xcrun notarytool history \
        --key "$KEY_PATH" \
        --key-id "$KEY_ID" \
        --issuer "$ISSUER_ID" \
        2>&1 | grep -q "Successfully received submission history"; then
        echo "   ✓ Connection successful"
    else
        # Try to get any response
        RESPONSE=$(timeout 10 xcrun notarytool history \
            --key "$KEY_PATH" \
            --key-id "$KEY_ID" \
            --issuer "$ISSUER_ID" 2>&1 || true)

        if echo "$RESPONSE" | grep -q "Invalid credentials"; then
            echo "   ✗ Invalid API credentials"
            echo "   Check KEY_ID and ISSUER_ID in the script"
            ALL_GOOD=false
        elif echo "$RESPONSE" | grep -q "No submission history"; then
            echo "   ✓ Connection successful (no previous submissions)"
        else
            echo "   ⚠️  Could not verify connection"
            echo "   Response: $RESPONSE"
        fi
    fi
else
    echo "7. Skipping API connection test (API key not found)"
fi

echo ""
echo "============================================"

if [ "$ALL_GOOD" = true ]; then
    echo "✓ ALL CHECKS PASSED"
    echo ""
    echo "Your system is ready for notarization!"
    echo ""
    echo "Next steps:"
    echo "1. Run: ./scripts/release.sh"
    echo "2. DMG will be automatically signed and notarized"
else
    echo "✗ SOME CHECKS FAILED"
    echo ""
    echo "Fix the issues above, then run this script again."
    echo ""
    echo "For detailed setup instructions, see:"
    echo "  scripts/NOTARIZATION_SETUP.md"
fi

echo "============================================"
