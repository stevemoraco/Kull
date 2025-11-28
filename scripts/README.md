# Kull Release Scripts

Complete automation for building and releasing Kull to TestFlight and direct download.

## Quick Start

```bash
# Verify setup
./scripts/verify-release-setup.sh

# Run full release
./scripts/release.sh
```

## Files Overview

| File | Purpose |
|------|---------|
| `release.sh` | **Main release script** - Does everything in one pass |
| `testflight_setup.py` | Configures TestFlight via App Store Connect API |
| `fix-testflight.sh` | Re-run TestFlight setup if it fails |
| `verify-release-setup.sh` | Check all prerequisites before releasing |
| `QUICK_RELEASE.md` | One-page quick reference |
| `RELEASE_INSTRUCTIONS.md` | Complete documentation with troubleshooting |

## What `release.sh` Does

1. **Clean** - Remove old build artifacts
2. **Version** - Set marketing version (date) and build number (time)
3. **Build iOS** - Archive for App Store
4. **Build macOS** - Archive for App Store
5. **Upload iOS** - Send to App Store Connect
6. **Upload macOS** - Send to App Store Connect
7. **Wait** - Let builds process (90 seconds)
8. **TestFlight** - Configure public beta and submit for review
9. **DMG** - Build signed DMG for direct download
10. **Upload** - Upload DMG to Replit Object Storage via API
11. **Git** - Commit and push changes

## Version Format

- **Marketing Version**: `2025.11.27` (YYYY.MM.DD - shown to users)
- **Build Number**: `1827` (HHMM - incrementing within day)
- **DMG Filename**: `Kull-v2025-11-27-06-27-PM.dmg`

## Prerequisites

All checked by `verify-release-setup.sh`:

- ✅ Xcode 26.0+ with Command Line Tools
- ✅ create-dmg (brew install create-dmg)
- ✅ Python 3 with PyJWT and requests
- ✅ App Store Connect API key at `~/.private_keys/AuthKey_S9KW8G5RHS.p8`
- ✅ Xcode project configured with automatic signing
- ✅ Export options plists for App Store and Developer ID

## After Release

1. **Wait 5-60 minutes** for builds to process in App Store Connect
2. **Check TestFlight**: https://appstoreconnect.apple.com/apps/6755838738/testflight
3. **Test builds**: https://testflight.apple.com/join/PtzCFZKb
4. **Download DMG**: https://kullai.com (auto-updated)

## Troubleshooting

### TestFlight setup failed?
```bash
./scripts/fix-testflight.sh
```

### Build failed?
```bash
# Clean and try again
rm -rf ~/Library/Developer/Xcode/DerivedData/kull-*
./scripts/release.sh
```

### Need to run manually?
See `RELEASE_INSTRUCTIONS.md` for step-by-step commands.

## Support

For issues or questions: steve@lander.media

---

**Created**: 2025-11-27
**Last Updated**: 2025-11-27
