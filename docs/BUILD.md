# Build & Distribution Guide

## Prerequisites

- macOS 14+ (for building native apps)
- Xcode 15.2+
- Apple Developer account (Team ID: 283HJ7VJR4)
- Node.js 18+

## Local Development Builds

### Backend
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm test             # Run tests
```

### Native App (macOS)
```bash
cd apps/Kull\ Universal\ App/kull/
open kull.xcodeproj

# Or from command line:
xcodebuild -scheme kull -configuration Debug build
```

### Native App (iOS Simulator)
```bash
xcodebuild -scheme kull \
  -destination 'platform=iOS Simulator,name=iPhone 15 Pro' \
  build
```

## Production Builds

### macOS App
```bash
./scripts/build-mac.sh
# Output: apps/Kull Universal App/kull/build/Kull.app
```

### iOS App
```bash
./scripts/build-ios.sh
# Output: apps/Kull Universal App/kull/build/Kull.ipa
```

## Version Management

### Bump Version
```bash
./scripts/bump-version.sh patch   # 1.0.0 → 1.0.1
./scripts/bump-version.sh minor   # 1.0.1 → 1.1.0
./scripts/bump-version.sh major   # 1.1.0 → 2.0.0
```

### Tag Release
```bash
git add version.json apps/Kull\ Universal\ App/kull/kull/Info.plist
git commit -m "Bump version to $(cat version.json | grep version | cut -d'"' -f4)"
git tag "v$(cat version.json | grep version | cut -d'"' -f4)"
git push && git push --tags
```

## CI/CD

### GitHub Actions
- Automatically runs on push to main
- Tests backend (npm test)
- Tests native app (xcodebuild test)
- Builds macOS app
- Builds iOS app
- Uploads artifacts

### Artifacts
Access build artifacts from GitHub Actions:
1. Go to repository → Actions
2. Click on latest workflow run
3. Download artifacts (Kull-macOS, Kull-iOS)

## Distribution

### macOS
- Development: Share .app directly (sign for local distribution)
- Production: Create DMG, notarize, distribute via website or Mac App Store

### iOS
- Development: Install via Xcode or Test Flight
- Production: Submit to App Store via App Store Connect

## Code Signing

### Setup
1. Open Xcode preferences → Accounts
2. Add Apple ID with developer access
3. Xcode will automatically manage signing certificates

### Manual Signing
- Development team: 283HJ7VJR4
- Signing identity: Automatically managed by Xcode
- Provisioning profiles: Automatically managed

## Troubleshooting

### Build Fails
```bash
# Clean build folder
xcodebuild clean -scheme kull

# Or in Xcode: Product → Clean Build Folder (Cmd+Shift+K)
```

### Code Signing Issues
1. Check Xcode → Preferences → Accounts → View Details
2. Download manual profiles if needed
3. Ensure development team is correct in project settings

### Tests Fail
```bash
# Run specific test
xcodebuild test -scheme kull -only-testing:kullTests/KeychainManagerTests

# View test logs
xcodebuild test -scheme kull | xcpretty
```

## Build Script Reference

### build-mac.sh
Builds the macOS version of Kull:
- Cleans previous builds
- Archives the app with Release configuration
- Exports using ExportOptions-macOS.plist
- Output: `build/Kull.app`

### build-ios.sh
Builds the iOS version of Kull:
- Cleans previous builds
- Archives the app with Release configuration
- Exports IPA using ExportOptions-iOS.plist
- Output: `build/Kull.ipa`

### bump-version.sh
Updates version numbers across the project:
- Updates `version.json` with new version and timestamp
- Updates `CFBundleShortVersionString` in Info.plist
- Increments `CFBundleVersion` (build number) in Info.plist
- Accepts: major, minor, or patch (default: patch)

## File Locations

### Build Scripts
- `/home/runner/workspace/scripts/build-mac.sh`
- `/home/runner/workspace/scripts/build-ios.sh`
- `/home/runner/workspace/scripts/bump-version.sh`

### Export Options
- `/home/runner/workspace/scripts/ExportOptions-macOS.plist`
- `/home/runner/workspace/scripts/ExportOptions-iOS.plist`

### Version Tracking
- `/home/runner/workspace/version.json`

### CI/CD
- `/home/runner/workspace/.github/workflows/build-universal-app.yml`

### Xcode Project
- `/home/runner/workspace/apps/Kull Universal App/kull/kull.xcodeproj`
- `/home/runner/workspace/apps/Kull Universal App/kull/kull/Info.plist`

## Quick Reference

### Full Release Process
```bash
# 1. Bump version
./scripts/bump-version.sh minor

# 2. Commit version changes
git add version.json apps/Kull\ Universal\ App/kull/kull/Info.plist
git commit -m "Release v$(cat version.json | grep version | cut -d'"' -f4)"

# 3. Tag release
git tag "v$(cat version.json | grep version | cut -d'"' -f4)"

# 4. Push to trigger CI
git push && git push --tags

# 5. Download artifacts from GitHub Actions
# 6. Distribute builds
```

### Local Test Build
```bash
# Build both platforms
./scripts/build-mac.sh
./scripts/build-ios.sh

# Verify outputs
ls -lh "apps/Kull Universal App/kull/build/"
```

### Run All Tests
```bash
# Backend tests
npm test

# Native app tests
cd "apps/Kull Universal App/kull/"
xcodebuild test -scheme kull -destination 'platform=macOS'
```

## Best Practices

1. **Always bump version before release** - Use `bump-version.sh` to keep version numbers in sync
2. **Test locally first** - Run build scripts locally before pushing to CI
3. **Clean builds for release** - Always start with a clean build folder
4. **Tag releases** - Create git tags for all production releases
5. **Document changes** - Update CHANGELOG.md with each version bump
6. **Verify CI** - Check GitHub Actions passes before distributing builds
7. **Code signing** - Ensure signing certificates are up to date in Xcode

## Support

For issues with the build pipeline:
1. Check GitHub Actions logs for CI failures
2. Run builds locally to isolate environment issues
3. Verify Xcode and command-line tools are up to date
4. Check Apple Developer account status and certificates
