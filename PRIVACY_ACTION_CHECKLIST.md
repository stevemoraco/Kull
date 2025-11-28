# App Privacy Configuration - Action Checklist

## IMMEDIATE ACTION REQUIRED

App Privacy labels are BLOCKING app submission. Manual configuration required (API not supported).

---

## QUICK START (5-Minute Version)

### 1. Open App Store Connect Privacy Page
**Direct Link:** https://appstoreconnect.apple.com/apps/6755838738/appstore/appprivacy

### 2. Click "Get Started" or "Edit"

### 3. Add These 6 Data Types

Copy this reference while configuring:

```
1. EMAIL ADDRESS (Contact Info)
   - Data Use: App Functionality
   - Linked: YES | Tracking: NO

2. PHOTOS OR VIDEOS (User Content)
   - Data Use: App Functionality
   - Linked: NO ⚠️ | Tracking: NO

3. USER ID (Identifiers)
   - Data Use: App Functionality
   - Linked: YES | Tracking: NO

4. DEVICE ID (Identifiers)
   - Data Use: App Functionality
   - Linked: YES | Tracking: NO

5. PRODUCT INTERACTION (Usage Data)
   - Data Use: Analytics, App Functionality (BOTH)
   - Linked: YES | Tracking: NO

6. PURCHASE HISTORY (Financial Info)
   - Data Use: App Functionality
   - Linked: YES | Tracking: NO
```

### 4. Save and Verify

Check that all 6 types appear on the privacy summary page.

---

## DETAILED DOCUMENTATION

- **Quick Reference:** `PRIVACY_QUICK_REFERENCE.txt` (copy-paste friendly format)
- **Step-by-Step Guide:** `PRIVACY_CONFIGURATION_MANUAL_STEPS.md` (complete walkthrough)
- **API Investigation:** `APP_PRIVACY_API_INVESTIGATION.md` (why API doesn't work)

---

## VERIFICATION CHECKLIST

After configuration, confirm:

- [ ] All 6 data types are listed on privacy page
- [ ] Privacy policy URL shows: https://kull.foto/privacy
- [ ] No "Complete App Privacy" warning appears
- [ ] Can proceed to app submission

---

## WHY MANUAL CONFIGURATION?

**The App Store Connect API does NOT support privacy label configuration.**

After extensive testing of all possible API endpoints, Apple intentionally requires manual privacy configuration through the web interface. This is a known limitation as of 2025.

**Tested and Failed:**
- `/v1/apps/{appId}/appDataPrivacy` → 404
- `/v1/appInfos/{appInfoId}/privacyDetails` → 404
- `/v1/appDataUsages` → 404
- `/v1/appPrivacyConfigurations` → 404

**Apple's Reasoning:**
- Privacy declarations are legal commitments requiring human oversight
- Manual review ensures developer accountability
- Prevents automated systems from setting outdated/incorrect values

---

## TIME ESTIMATE

- **Quick entry (using this checklist):** 5-10 minutes
- **Careful review (using detailed guide):** 10-15 minutes
- **One-time setup:** Yes (persists across app updates)

---

## SUPPORT

If you encounter issues:
1. Verify you have "Admin" or "App Manager" role in App Store Connect
2. Check that https://kull.foto/privacy is accessible
3. Contact Apple Developer Support for technical issues

---

## CRITICAL NOTES

1. **Photos are NOT stored server-side**
   - Processed locally or temporarily
   - NOT linked to user identity
   - This is why "Linked to User: NO" for Photos/Videos

2. **All data is for app functionality only**
   - No third-party advertising
   - No cross-app tracking
   - No data selling

3. **This unblocks app submission**
   - Privacy labels are required before first submission
   - Once configured, they persist across updates
   - Only update if you change what data you collect

---

**Direct Link:** https://appstoreconnect.apple.com/apps/6755838738/appstore/appprivacy

**Estimated Time:** 5-15 minutes

**Status:** REQUIRED FOR SUBMISSION

---

**Created:** 2025-11-27  
**App ID:** 6755838738  
**Bundle ID:** media.lander.kull
