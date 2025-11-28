#!/bin/bash
# ============================================
# DEVELOPER ID CERTIFICATE SETUP
# One-time setup for notarized DMG distribution
# ============================================

echo "============================================"
echo "DEVELOPER ID CERTIFICATE SETUP"
echo "============================================"
echo ""
echo "This script helps you create a Developer ID Application certificate"
echo "for notarized macOS app distribution outside the App Store."
echo ""

# Check if certificate already exists
EXISTING_CERT=$(security find-identity -v -p codesigning 2>/dev/null | grep "Developer ID Application" | head -1)

if [ -n "$EXISTING_CERT" ]; then
    echo "✓ Developer ID Application certificate already exists!"
    echo ""
    echo "$EXISTING_CERT"
    echo ""
    echo "You're all set! Run 'scripts/release.sh' to create notarized DMGs."
    exit 0
fi

echo "⚠ No Developer ID Application certificate found."
echo ""
echo "To create one, you have two options:"
echo ""
echo "============================================"
echo "OPTION 1: Xcode GUI (Recommended)"
echo "============================================"
echo ""
echo "1. Open Xcode > Settings (Cmd+,)"
echo "2. Go to 'Accounts' tab"
echo "3. Select your Apple ID"
echo "4. Click 'Manage Certificates...'"
echo "5. Click '+' and select 'Developer ID Application'"
echo "6. Wait for certificate to be created and downloaded"
echo ""
echo "Opening Xcode now..."
open -a Xcode

echo ""
echo "============================================"
echo "OPTION 2: Apple Developer Website"
echo "============================================"
echo ""
echo "1. Go to: https://developer.apple.com/account/resources/certificates/add"
echo "2. Select 'Developer ID Application'"
echo "3. Follow the wizard to create a CSR and download the certificate"
echo "4. Double-click the .cer file to install in Keychain"
echo ""
echo "Opening Safari to Apple Developer Portal..."
open "https://developer.apple.com/account/resources/certificates/list"

echo ""
echo "============================================"
echo "AFTER SETUP"
echo "============================================"
echo ""
echo "Once you have the certificate installed, verify with:"
echo "  security find-identity -v -p codesigning | grep 'Developer ID'"
echo ""
echo "Then run 'scripts/release.sh' and it will automatically use"
echo "the Developer ID certificate for fully notarized DMGs."
echo ""
echo "============================================"
