# iOS/iPadOS Testing Suite - Quick Reference

## 🚀 Quick Start

### Run All Tests (macOS only)
```bash
cd "/path/to/workspace/apps/Kull Universal App/kull"
./run_ios_tests.sh
```

### Or Use Xcode
```bash
open kull.xcodeproj
# Press ⌘U to run all tests
```

---

## 📊 Test Suite Overview

| Test Suite | Tests | Target | Key Features |
|------------|-------|--------|--------------|
| **IOSDocumentPicker** | 48 | All | File/folder selection, bookmarks |
| **IOSPushNotification** | 32 | All | Local notifications, APNs |
| **IOSOfflineMode** | 40 | All | Network, cache, offline queue |
| **IOSAccessibility** | 42 | All | Touch targets ≥44pt, VoiceOver |
| **IOSDeviceRotation** | 28 | All | Portrait ↔ landscape, layouts |
| **IPadMultitasking** | 35 | iPad | Split View, Slide Over |
| **IOSMemoryMonitoring** | 24 | All | <2GB for 1000 images |
| **TOTAL** | **249** | | |

---

## 🎯 Target Devices

- **iPhone 15 Pro Max** - 214 tests (excluding iPad multitasking)
- **iPad Pro 12.9"** - 249 tests (all tests)
- **iPad mini** - 249 tests (all tests)

---

## ✅ Success Criteria

### Memory
- [ ] <2GB for 1000 images
- [ ] No memory leaks

### Touch Targets
- [ ] All elements ≥44pt × 44pt
- [ ] Adequate spacing (≥8pt)

### Device Support
- [ ] All tests pass on iPhone 15 Pro Max
- [ ] All tests pass on iPad Pro 12.9"
- [ ] All tests pass on iPad mini

---

## 📁 File Locations

### Tests
```
kullTests/IntegrationTests/
├── IOSDocumentPickerIntegrationTests.swift
├── IOSPushNotificationIntegrationTests.swift
├── IOSOfflineModeIntegrationTests.swift
├── IOSAccessibilityIntegrationTests.swift
├── IOSDeviceRotationIntegrationTests.swift
├── IPadMultitaskingIntegrationTests.swift
└── IOSMemoryMonitoringIntegrationTests.swift
```

### Documentation
```
.
├── run_ios_tests.sh (test runner)
├── IOS_DEVICE_TESTING_GUIDE.md (detailed guide)
├── TEST_EXECUTION_REPORT.md (implementation report)
├── AGENT_25_COMPLETION_SUMMARY.md (completion summary)
└── QUICK_TEST_REFERENCE.md (this file)
```

---

## 🐛 Debugging

### View Test Results in Xcode
1. Open Test Navigator (⌘6)
2. Click test to see results
3. Click failure to see details

### Run Single Test
```bash
xcodebuild test \
  -project kull.xcodeproj \
  -scheme kull \
  -destination 'platform=iOS Simulator,name=iPhone 15 Pro Max' \
  -only-testing:kullTests/IOSMemoryMonitoringIntegrationTests/testMemoryUsageFor1000Images
```

### Check Memory
In Xcode:
1. Product → Profile
2. Select "Allocations" or "Leaks"
3. Run tests
4. Analyze memory graph

---

## 📈 Performance Targets

| Metric | Target |
|--------|--------|
| Initial memory | <200MB |
| 100 images | <300MB |
| 1000 images | **<2GB** |
| Touch targets | ≥44pt |
| Rotation layout | <100ms |

---

## ⚠️ Known Limitations

- **macOS required**: Tests need Xcode (not available on Linux)
- **Simulator only**: Some features can't be fully tested (APNs, true offline)
- **Performance**: Real device may differ from simulator

---

## 📞 Support

- **Detailed guide**: See `IOS_DEVICE_TESTING_GUIDE.md`
- **Full report**: See `TEST_EXECUTION_REPORT.md`
- **Summary**: See `AGENT_25_COMPLETION_SUMMARY.md`

---

**Last Updated**: 2025-11-18
**Total Tests**: 249
**Status**: ✅ Ready for execution
