# GitHub Secrets Setup for Automated Releases

This document explains how to configure the GitHub secrets required for the automated release workflow.

## Required Secrets

Go to your repository: **Settings → Secrets and variables → Actions → New repository secret**

### 1. App Store Connect API Key

These are used for TestFlight uploads and DMG notarization.

| Secret Name | Value | How to Get It |
|-------------|-------|---------------|
| `APP_STORE_CONNECT_KEY_ID` | `S9KW8G5RHS` | Your API key ID from App Store Connect |
| `APP_STORE_CONNECT_ISSUER_ID` | `c63dccab-1ecd-41dc-9374-174cfdb70958` | Your issuer ID from App Store Connect |
| `APP_STORE_CONNECT_API_KEY_BASE64` | Base64-encoded .p8 file | See below |

**To get the base64-encoded API key:**
```bash
# On your Mac, run:
cat ~/.private_keys/AuthKey_S9KW8G5RHS.p8 | base64 | pbcopy
# This copies the base64 content to your clipboard
```

**To get or create an API key:**
1. Go to https://appstoreconnect.apple.com/access/integrations/api
2. Click "+" to create a new key
3. Name it (e.g., "CI/CD Release Key")
4. Select "Developer" role
5. Download the .p8 file (you can only download it once!)
6. Note the Key ID and Issuer ID shown on the page

### 2. Code Signing Certificates

You need TWO certificates:
- **Distribution Certificate** - For App Store/TestFlight uploads
- **Developer ID Certificate** - For DMG notarization (outside App Store)

| Secret Name | Value | How to Get It |
|-------------|-------|---------------|
| `BUILD_CERTIFICATE_BASE64` | Base64-encoded .p12 (Distribution) | Export from Keychain |
| `P12_PASSWORD` | Password for the .p12 file | You set this when exporting |
| `DEVELOPER_ID_CERTIFICATE_BASE64` | Base64-encoded .p12 (Developer ID) | Export from Keychain |
| `DEVELOPER_ID_PASSWORD` | Password for the Developer ID .p12 | You set this when exporting |
| `DEVELOPER_ID_NAME` | `Stephen Moraco` | Name on your Developer ID cert |
| `KEYCHAIN_PASSWORD` | Any random string | Used to create temp keychain in CI |

**To export a certificate from Keychain:**

1. Open **Keychain Access** on your Mac
2. Find the certificate (search for "Apple Distribution" or "Developer ID Application")
3. Right-click → **Export...**
4. Save as .p12 format, set a password
5. Base64 encode it:
```bash
base64 -i path/to/certificate.p12 | pbcopy
```

**If you don't have a Developer ID certificate:**
1. Go to https://developer.apple.com/account/resources/certificates/list
2. Click "+" to create new certificate
3. Select "Developer ID Application"
4. Follow the CSR instructions
5. Download and double-click to install in Keychain
6. Export as .p12 and base64 encode

### 3. Optional (Already Configured)

These are automatically available via GitHub:
- `GITHUB_TOKEN` - Automatically provided by GitHub Actions

## Quick Setup Commands

Run these on your Mac to get all the values:

```bash
# 1. API Key (base64)
echo "APP_STORE_CONNECT_API_KEY_BASE64:"
cat ~/.private_keys/AuthKey_S9KW8G5RHS.p8 | base64

echo ""
echo "APP_STORE_CONNECT_KEY_ID: S9KW8G5RHS"
echo "APP_STORE_CONNECT_ISSUER_ID: c63dccab-1ecd-41dc-9374-174cfdb70958"

# 2. List available certificates
echo ""
echo "Available signing certificates:"
security find-identity -v -p codesigning | grep -E "(Distribution|Developer ID)"
```

## Verification

After setting up secrets, you can verify by:

1. Go to **Actions** tab in your repository
2. Click on **Release - Build, Sign, Notarize, TestFlight** workflow
3. Click **Run workflow** → **Run workflow**
4. Watch the logs for any authentication errors

## Secrets Summary Table

| Secret | Required | Purpose |
|--------|----------|---------|
| `APP_STORE_CONNECT_KEY_ID` | Yes | API Key ID |
| `APP_STORE_CONNECT_ISSUER_ID` | Yes | API Issuer ID |
| `APP_STORE_CONNECT_API_KEY_BASE64` | Yes | API Key content |
| `BUILD_CERTIFICATE_BASE64` | Yes | Distribution cert for TestFlight |
| `P12_PASSWORD` | Yes | Password for distribution cert |
| `DEVELOPER_ID_CERTIFICATE_BASE64` | Yes | Dev ID cert for DMG signing |
| `DEVELOPER_ID_PASSWORD` | Yes | Password for Dev ID cert |
| `DEVELOPER_ID_NAME` | Yes | Name on Dev ID cert |
| `KEYCHAIN_PASSWORD` | Yes | Any random password |

## Current Values (for reference)

These are the known values - you still need to add the certificate data:

```
APP_STORE_CONNECT_KEY_ID = S9KW8G5RHS
APP_STORE_CONNECT_ISSUER_ID = c63dccab-1ecd-41dc-9374-174cfdb70958
DEVELOPER_ID_NAME = Stephen Moraco
TEAM_ID = 283HJ7VJR4 (embedded in workflow, not a secret)
```

## Troubleshooting

### "No signing certificate found"
- Make sure you exported the correct certificate as .p12
- Verify the base64 encoding is correct (no extra newlines)
- Check that P12_PASSWORD matches what you used when exporting

### "Notarization failed"
- Ensure DEVELOPER_ID_CERTIFICATE is a "Developer ID Application" cert, not just "Apple Development"
- Check that the API key has "Developer" role in App Store Connect
- Verify the app is properly signed with hardened runtime

### "Upload to App Store Connect failed"
- Verify APP_STORE_CONNECT_* values are correct
- Check that BUILD_CERTIFICATE is an "Apple Distribution" cert
- Ensure the app bundle ID matches what's registered in App Store Connect
