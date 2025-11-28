#!/bin/bash
# Test script for DMG upload/download system
# Requires: DEPLOY_SECRET environment variable
# Tests against: https://kullai.com

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m'

BASE_URL="https://kullai.com"

echo -e "${CYAN}=== DMG Upload/Download System Test ===${NC}"
echo ""

# Check DEPLOY_SECRET
if [ -z "${DEPLOY_SECRET:-}" ]; then
    echo -e "${RED}ERROR: DEPLOY_SECRET not set${NC}"
    echo "Usage: DEPLOY_SECRET=your-secret ./scripts/test-dmg-upload.sh"
    exit 1
fi

# Test 1: Check /api/download/list endpoint
echo -e "${YELLOW}Test 1: GET /api/download/list${NC}"
LIST_RESPONSE=$(curl -s "$BASE_URL/api/download/list")
echo "$LIST_RESPONSE" | head -c 500
echo ""
if echo "$LIST_RESPONSE" | grep -q "dmgs\|error"; then
    echo -e "${GREEN}✓ List endpoint responded${NC}"
else
    echo -e "${RED}✗ List endpoint failed${NC}"
fi
echo ""

# Test 2: Check /api/download/latest endpoint
echo -e "${YELLOW}Test 2: GET /api/download/latest${NC}"
LATEST_RESPONSE=$(curl -s "$BASE_URL/api/download/latest")
echo "$LATEST_RESPONSE" | head -c 500
echo ""
if echo "$LATEST_RESPONSE" | grep -q "macos\|ios\|error"; then
    echo -e "${GREEN}✓ Latest endpoint responded${NC}"
else
    echo -e "${RED}✗ Latest endpoint failed${NC}"
fi
echo ""

# Test 3: Create a small test file and upload (optional - requires a DMG)
echo -e "${YELLOW}Test 3: Upload test (requires DMG file)${NC}"
if [ -f "$1" ]; then
    DMG_FILE="$1"
    echo "Uploading: $DMG_FILE"
    UPLOAD_RESPONSE=$(curl -s -X POST "$BASE_URL/api/download/upload" \
        -F "dmg=@$DMG_FILE" \
        -F "secret=$DEPLOY_SECRET")
    echo "$UPLOAD_RESPONSE"
    if echo "$UPLOAD_RESPONSE" | grep -q "success\|version"; then
        echo -e "${GREEN}✓ Upload succeeded${NC}"
    else
        echo -e "${RED}✗ Upload failed${NC}"
    fi
else
    echo "No DMG file provided. Usage: ./scripts/test-dmg-upload.sh [path-to-dmg]"
    echo -e "${YELLOW}⚠ Skipping upload test${NC}"
fi
echo ""

# Test 4: Verify list updated after upload
echo -e "${YELLOW}Test 4: Verify list after upload${NC}"
LIST_RESPONSE=$(curl -s "$BASE_URL/api/download/list")
echo "$LIST_RESPONSE" | head -c 500
echo ""

echo -e "${CYAN}=== Test Complete ===${NC}"
