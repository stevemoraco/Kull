#!/bin/bash
set -e

# ============================================
# DMG SIGNING AND NOTARIZATION SCRIPT
# ============================================
# This script signs and notarizes a DMG for distribution
# outside the Mac App Store.
#
# Requirements:
# - Developer ID Application certificate installed
# - App Store Connect API key configured
# ============================================

# Configuration
TEAM_ID="283HJ7VJR4"
KEY_ID="S9KW8G5RHS"
ISSUER_ID="c63dccab-1ecd-41dc-9374-174cfdb70958"
# IMPORTANT: Use absolute path, NOT $HOME (which may not expand correctly in all contexts)
KEY_PATH="/Users/stevemoraco/.private_keys/AuthKey_S9KW8G5RHS.p8"

# Check arguments
if [ $# -lt 1 ]; then
    echo "Usage: $0 <path-to-dmg> [developer-id-name]"
    echo "Example: $0 Kull.dmg \"Stephen Moraco\""
    exit 1
fi

DMG_PATH="$1"
DEVELOPER_NAME="${2:-Stephen Moraco}"

if [ ! -f "$DMG_PATH" ]; then
    echo "Error: DMG file not found: $DMG_PATH"
    exit 1
fi

echo "============================================"
echo "NOTARIZING: $(basename "$DMG_PATH")"
echo "============================================"

# Step 1: Check for Developer ID certificate
echo ""
echo "Step 1: Checking for Developer ID certificate..."
CERT_NAME="Developer ID Application: $DEVELOPER_NAME ($TEAM_ID)"

if ! security find-identity -v -p codesigning | grep -q "Developer ID Application"; then
    echo ""
    echo "⚠️  WARNING: No Developer ID Application certificate found!"
    echo ""
    echo "You need to create and install a Developer ID certificate:"
    echo "1. Go to: https://developer.apple.com/account/resources/certificates/list"
    echo "2. Click '+' to create a new certificate"
    echo "3. Select 'Developer ID Application'"
    echo "4. Follow the instructions to create a Certificate Signing Request (CSR)"
    echo "5. Download and install the certificate"
    echo ""
    echo "Attempting to continue with available certificate..."

    # Try to find any valid certificate
    CERT_LINE=$(security find-identity -v -p codesigning | grep "Apple Development" | head -n 1)
    if [ -z "$CERT_LINE" ]; then
        echo "Error: No valid code signing certificates found at all!"
        exit 1
    fi

    # Extract certificate name
    CERT_NAME=$(echo "$CERT_LINE" | sed 's/.*"\(.*\)".*/\1/')
    echo "Using certificate: $CERT_NAME"
    echo ""
    echo "⚠️  NOTE: This will NOT work for distribution outside App Store!"
    echo "You MUST get a Developer ID certificate for public distribution."
fi

# Step 2: Sign the DMG
echo ""
echo "Step 2: Signing DMG..."
codesign --force \
  --sign "$CERT_NAME" \
  --timestamp \
  --options runtime \
  "$DMG_PATH"

if [ $? -eq 0 ]; then
    echo "✓ DMG signed successfully"
else
    echo "✗ Failed to sign DMG"
    exit 1
fi

# Step 3: Verify signature
echo ""
echo "Step 3: Verifying signature..."
codesign --verify --verbose "$DMG_PATH"
if [ $? -eq 0 ]; then
    echo "✓ Signature verified"
else
    echo "✗ Signature verification failed"
    exit 1
fi

# Step 4: Check if we can assess the signature
echo ""
echo "Step 4: Checking signature assessment..."
spctl --assess --type open --context context:primary-signature --verbose "$DMG_PATH" 2>&1 || {
    echo "⚠️  Signature assessment failed (expected for development certificates)"
    echo "This is OK for testing, but you NEED a Developer ID certificate for distribution"
}

# Step 5: Notarize
echo ""
echo "Step 5: Submitting for notarization..."
echo "This may take 5-10 minutes. Please wait..."

# Check if API key exists
if [ ! -f "$KEY_PATH" ]; then
    echo "Error: App Store Connect API key not found at: $KEY_PATH"
    echo ""
    echo "To set up the API key:"
    echo "1. Go to: https://appstoreconnect.apple.com/access/integrations/api"
    echo "2. Create a key with 'Developer' role"
    echo "3. Download the .p8 file"
    echo "4. Save it to: $KEY_PATH"
    exit 1
fi

# Submit for notarization
NOTARIZE_OUTPUT=$(xcrun notarytool submit "$DMG_PATH" \
  --key "$KEY_PATH" \
  --key-id "$KEY_ID" \
  --issuer "$ISSUER_ID" \
  --wait 2>&1)

echo "$NOTARIZE_OUTPUT"

if echo "$NOTARIZE_OUTPUT" | grep -q "status: Accepted"; then
    echo "✓ Notarization successful!"

    # Step 6: Staple the notarization ticket
    echo ""
    echo "Step 6: Stapling notarization ticket..."
    xcrun stapler staple "$DMG_PATH"

    if [ $? -eq 0 ]; then
        echo "✓ Notarization ticket stapled"
    else
        echo "✗ Failed to staple ticket (DMG may still be notarized)"
    fi

    # Step 7: Final verification
    echo ""
    echo "Step 7: Final verification..."
    spctl --assess --type open --context context:primary-signature -v "$DMG_PATH" 2>&1

    echo ""
    echo "============================================"
    echo "✓ DMG IS READY FOR DISTRIBUTION"
    echo "============================================"
    echo "File: $DMG_PATH"
    echo ""
    echo "Users will be able to open this DMG without security warnings."

elif echo "$NOTARIZE_OUTPUT" | grep -q "status: Invalid"; then
    echo "✗ Notarization failed: Invalid"
    echo ""
    echo "Getting detailed error log..."

    # Extract submission ID from output
    SUBMISSION_ID=$(echo "$NOTARIZE_OUTPUT" | grep "id:" | head -n 1 | awk '{print $2}')

    if [ -n "$SUBMISSION_ID" ]; then
        xcrun notarytool log "$SUBMISSION_ID" \
          --key "$KEY_PATH" \
          --key-id "$KEY_ID" \
          --issuer "$ISSUER_ID"
    fi

    exit 1
else
    echo "✗ Notarization failed with unexpected status"
    echo ""
    echo "Full output:"
    echo "$NOTARIZE_OUTPUT"
    exit 1
fi
