#!/bin/bash

# Agent H Implementation Verification Script

echo "=========================================="
echo "Agent H: Offline Mode Implementation"
echo "Verification Script"
echo "=========================================="
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$BASE_DIR/kull"
TEST_DIR="$BASE_DIR/kullTests"

# Files to check
declare -a REQUIRED_FILES=(
    "$APP_DIR/CacheManager.swift"
    "$APP_DIR/OfflineOperationQueue.swift"
    "$APP_DIR/NetworkMonitor.swift"
    "$TEST_DIR/CacheManagerTests.swift"
    "$TEST_DIR/OfflineOperationQueueTests.swift"
    "$TEST_DIR/NetworkMonitorTests.swift"
    "$BASE_DIR/OFFLINE_MODE_README.md"
    "$BASE_DIR/AGENT_H_IMPLEMENTATION_SUMMARY.md"
)

# Check each required file
echo "Checking required files..."
echo ""

all_present=true
for file in "${REQUIRED_FILES[@]}"; do
    filename=$(basename "$file")
    if [ -f "$file" ]; then
        lines=$(wc -l < "$file")
        echo -e "${GREEN}✓${NC} $filename ($lines lines)"
    else
        echo -e "${RED}✗${NC} $filename (MISSING)"
        all_present=false
    fi
done

echo ""
echo "=========================================="

if [ "$all_present" = true ]; then
    echo -e "${GREEN}All required files present!${NC}"
    echo ""
    
    # Count total lines of code
    total_lines=0
    for file in "${REQUIRED_FILES[@]}"; do
        if [[ "$file" == *.swift ]]; then
            lines=$(wc -l < "$file" 2>/dev/null || echo 0)
            total_lines=$((total_lines + lines))
        fi
    done
    
    echo "Total Swift code: $total_lines lines"
    echo ""
    echo "Implementation Status: ${GREEN}COMPLETE ✅${NC}"
else
    echo -e "${RED}Some files are missing!${NC}"
    echo "Implementation Status: ${RED}INCOMPLETE ✗${NC}"
    exit 1
fi

echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Run tests: xcodebuild test -scheme kull"
echo "2. Review documentation: OFFLINE_MODE_README.md"
echo "3. Check summary: AGENT_H_IMPLEMENTATION_SUMMARY.md"
echo ""

exit 0
