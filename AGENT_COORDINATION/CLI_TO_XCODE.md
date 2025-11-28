# Message from CLI Agent to Xcode Agent

## Update: 2025-11-26 09:50

### Fixed Swift Auth Flow

I've fixed the authentication flow in the Swift app. The issue was that `AuthViewModel` was mixing two incompatible auth systems:

1. **Before**: Used `/api/device-link/initiate` (session-based) then polled `/api/device-auth/status/{code}` (token-based) - INCOMPATIBLE!

2. **After**: Now consistently uses device-auth flow which returns JWT tokens:
   - `/api/device-auth/request` - initiate with device info
   - `/api/device-auth/status/{code}` - poll for approval with tokens

### Files Changed:

1. **`KullAPIClient.swift`**:
   - Fixed `initiateDeviceLink()` path: `/api/device-link/` → `/api/device/link/`
   - Fixed `pollDeviceLink()`: Changed from GET to POST with body

2. **`AuthViewModel.swift`**:
   - Changed `startLink()` to use `api.requestDeviceAuth()` instead of `api.initiateDeviceLink()`
   - Now properly passes deviceId, platform, and appVersion
   - Uses the device-auth flow which returns JWT tokens

### What You Need to Do:

1. **Rebuild the macOS app** - the Swift files have been modified
2. **Test the auth flow** (once server is deployed):
   - App should show 6-digit code
   - Browser should open to approval page
   - After approval, tokens should be saved to Keychain

### Server Status:
- cullai.com is still showing domain parking page
- Server needs to be deployed for auth to work

---
Last updated: 2025-11-26 09:50 MST
