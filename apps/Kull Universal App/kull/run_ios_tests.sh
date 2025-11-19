#!/bin/bash
#
# iOS/iPadOS Comprehensive Test Runner
# Runs all integration tests on iPhone 15 Pro Max, iPad Pro 12.9", and iPad mini
#

set -e

PROJECT_DIR="/home/runner/workspace/apps/Kull Universal App/kull"
PROJECT_FILE="$PROJECT_DIR/kull.xcodeproj"
SCHEME="kull"

echo "=================================================="
echo "iOS/iPadOS Device Testing Suite"
echo "=================================================="
echo ""

# Check if Xcode project exists
if [ ! -d "$PROJECT_FILE" ]; then
    echo "ERROR: Xcode project not found at $PROJECT_FILE"
    exit 1
fi

echo "Project file: $PROJECT_FILE"
echo "Scheme: $SCHEME"
echo ""

# Function to run tests on a specific simulator
run_tests_on_simulator() {
    local device_name=$1
    local platform=$2

    echo "=================================================="
    echo "Running tests on: $device_name"
    echo "=================================================="

    xcodebuild test \
        -project "$PROJECT_FILE" \
        -scheme "$SCHEME" \
        -destination "platform=$platform,name=$device_name" \
        -only-testing:kullTests/IOSDocumentPickerIntegrationTests \
        -only-testing:kullTests/IOSPushNotificationIntegrationTests \
        -only-testing:kullTests/IOSOfflineModeIntegrationTests \
        -only-testing:kullTests/IOSAccessibilityIntegrationTests \
        -only-testing:kullTests/IOSDeviceRotationIntegrationTests \
        -only-testing:kullTests/IPadMultitaskingIntegrationTests \
        -only-testing:kullTests/IOSMemoryMonitoringIntegrationTests \
        | xcpretty --color --simple

    local exit_code=${PIPESTATUS[0]}

    if [ $exit_code -eq 0 ]; then
        echo ""
        echo "✅ All tests PASSED on $device_name"
        echo ""
    else
        echo ""
        echo "❌ Tests FAILED on $device_name (exit code: $exit_code)"
        echo ""
        return $exit_code
    fi
}

# Test on iPhone 15 Pro Max
echo "Starting tests on iPhone 15 Pro Max..."
run_tests_on_simulator "iPhone 15 Pro Max" "iOS Simulator"
IPHONE_RESULT=$?

# Test on iPad Pro 12.9"
echo "Starting tests on iPad Pro 12.9\"..."
run_tests_on_simulator "iPad Pro (12.9-inch) (6th generation)" "iOS Simulator"
IPAD_PRO_RESULT=$?

# Test on iPad mini
echo "Starting tests on iPad mini..."
run_tests_on_simulator "iPad mini (6th generation)" "iOS Simulator"
IPAD_MINI_RESULT=$?

# Summary
echo "=================================================="
echo "Test Results Summary"
echo "=================================================="
echo ""
echo "iPhone 15 Pro Max:              $([ $IPHONE_RESULT -eq 0 ] && echo '✅ PASSED' || echo '❌ FAILED')"
echo "iPad Pro 12.9\" (6th gen):       $([ $IPAD_PRO_RESULT -eq 0 ] && echo '✅ PASSED' || echo '❌ FAILED')"
echo "iPad mini (6th gen):            $([ $IPAD_MINI_RESULT -eq 0 ] && echo '✅ PASSED' || echo '❌ FAILED')"
echo ""

# Exit with failure if any tests failed
if [ $IPHONE_RESULT -ne 0 ] || [ $IPAD_PRO_RESULT -ne 0 ] || [ $IPAD_MINI_RESULT -ne 0 ]; then
    echo "❌ Some tests FAILED"
    exit 1
else
    echo "✅ All tests PASSED on all devices!"
    exit 0
fi
