#!/bin/bash
# Quick script to re-run TestFlight configuration
# Use this if release.sh succeeded but TestFlight setup failed

set -e

PROJECT_ROOT="/Users/stevemoraco/Lander Dropbox/Steve Moraco/Mac (6)/Downloads/ai image culling/kull"

echo "================================================"
echo "KULL TESTFLIGHT FIX"
echo "Configuring TestFlight for latest builds..."
echo "================================================"

python3 "$PROJECT_ROOT/scripts/testflight_setup.py"

echo ""
echo "Done! Check App Store Connect for status:"
echo "https://appstoreconnect.apple.com/apps/6755838738/testflight"
