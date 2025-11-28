# Quick Release Guide

## One Command to Rule Them All

```bash
cd /Users/stevemoraco/Lander\ Dropbox/Steve\ Moraco/Mac\ \(6\)/Downloads/ai\ image\ culling/kull
./scripts/release.sh
```

That's it! The script will:
- ✅ Build iOS & macOS
- ✅ Upload to TestFlight
- ✅ Configure public beta
- ✅ Create DMG
- ✅ Update website
- ✅ Commit & push

## Version Numbers (Auto-Generated)

- **Marketing**: `2025.11.27` (today's date)
- **Build**: `1827` (current time HHMM)
- **DMG**: `Kull-v2025-11-27-06-27-PM.dmg`

## What Happens

```
1. Clean build folders
2. Set version to 2025.11.27 (Build 1827)
3. Build iOS archive
4. Build macOS archive
5. Upload iOS to App Store Connect
6. Upload macOS to App Store Connect
7. Wait 90 seconds for processing
8. Add builds to "Public Testers" group
9. Submit for beta review
10. Build DMG for direct download
11. Update website download link
12. Git commit and push
```

## After Release

1. **Wait 5-60 minutes** for builds to process
2. **Check TestFlight**: [App Store Connect](https://appstoreconnect.apple.com/)
3. **Test DMG**: Download from https://kullai.com
4. **Share link**: https://testflight.apple.com/join/PtzCFZKb

## Troubleshooting

If something fails, see `RELEASE_INSTRUCTIONS.md` for:
- Manual step-by-step process
- Debugging common errors
- Re-running individual steps

## Files

- `release.sh` - Main automation script
- `testflight_setup.py` - TestFlight API configuration
- `ExportOptions-AppStore.plist` - iOS/macOS upload settings
- `ExportOptions-DeveloperID.plist` - DMG signing settings
