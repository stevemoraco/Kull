# KULL APP PRIVACY CONFIGURATION - MANUAL STEPS

## CRITICAL FINDING

**The App Store Connect API does NOT support privacy label configuration.**

After extensive testing, the following endpoints were tried and all failed:
- `/v1/apps/{appId}/appDataPrivacy` - Does not exist
- `/v1/apps/{appId}/dataPrivacyDetails` - Does not exist  
- `/v1/appInfos/{appInfoId}/privacyDetails` - Does not exist
- `/v1/appDataUsages` - Does not exist
- `/v1/appPrivacyConfigurations` - Does not exist

The appInfo resource only supports these relationships:
- ageRatingDeclaration
- appInfoLocalizations
- primaryCategory/secondaryCategory
- territoryAgeRatings

**This is a known limitation of the App Store Connect API as of 2025.**

---

## MANUAL CONFIGURATION REQUIRED

You MUST configure App Privacy labels manually through the web interface.

### Direct URL to Privacy Page

https://appstoreconnect.apple.com/apps/6755838738/appstore/appprivacy

### Step-by-Step Instructions

#### 1. Navigate to Privacy Section
- Go to: https://appstoreconnect.apple.com/apps/6755838738/appstore/appprivacy
- Or: App Store Connect → Apps → kull → App Privacy

#### 2. Start Privacy Configuration
- Click "Get Started" (if first time) or "Edit" (if updating)
- Answer: **"Yes, we collect data from this app"**

#### 3. Configure Each Data Type

You need to add **6 data types** for Kull:

---

### DATA TYPE 1: Email Address

**Steps:**
1. Click "+ Add" next to "Contact Info"
2. Select "Email Address"
3. Configure:
   - **Data Use:** App Functionality
   - **Linked to User:** YES
   - **Used for Tracking:** NO
4. Click "Next"

**Explanation:** Email is used for account authentication and login.

---

### DATA TYPE 2: Photos or Videos

**Steps:**
1. Click "+ Add" next to "User Content"
2. Select "Photos or Videos"
3. Configure:
   - **Data Use:** App Functionality
   - **Linked to User:** NO (Important: processed but not stored with identity)
   - **Used for Tracking:** NO
4. Click "Next"

**Explanation:** Photos are processed by AI for culling but are not stored server-side or linked to user identity. They remain on the user's device.

---

### DATA TYPE 3: User ID

**Steps:**
1. Click "+ Add" next to "Identifiers"
2. Select "User ID"
3. Configure:
   - **Data Use:** App Functionality
   - **Linked to User:** YES
   - **Used for Tracking:** NO
4. Click "Next"

**Explanation:** User ID is used for account management and authentication.

---

### DATA TYPE 4: Device ID

**Steps:**
1. Click "+ Add" next to "Identifiers"
2. Select "Device ID"
3. Configure:
   - **Data Use:** App Functionality
   - **Linked to User:** YES
   - **Used for Tracking:** NO
4. Click "Next"

**Explanation:** Device ID is used for multi-device authentication and sync coordination.

---

### DATA TYPE 5: Product Interaction

**Steps:**
1. Click "+ Add" next to "Usage Data"
2. Select "Product Interaction"
3. Configure:
   - **Data Use:** Analytics, App Functionality (select BOTH)
   - **Linked to User:** YES
   - **Used for Tracking:** NO
4. Click "Next"

**Explanation:** Product interactions are logged for analytics and to improve app functionality (e.g., shoot processing progress).

---

### DATA TYPE 6: Purchases

**Steps:**
1. Click "+ Add" next to "Financial Info"
2. Select "Purchase History"
3. Configure:
   - **Data Use:** App Functionality
   - **Linked to User:** YES
   - **Used for Tracking:** NO
4. Click "Next"

**Explanation:** Purchase history is used for billing and subscription management.

---

#### 4. Review and Save

After adding all 6 data types:
1. Review the summary screen
2. Ensure all 6 types are listed correctly
3. Click "Save" (top right)

#### 5. Verify Configuration

The privacy page should now show:
- **Contact Info:** Email Address
- **User Content:** Photos or Videos
- **Identifiers:** User ID, Device ID
- **Usage Data:** Product Interaction
- **Financial Info:** Purchase History

---

## VERIFICATION CHECKLIST

After configuration, verify:

- [ ] All 6 data types are listed on the privacy page
- [ ] Privacy policy URL is set to: https://kull.foto/privacy
- [ ] No "Complete App Privacy" warning appears
- [ ] App status shows privacy requirements as complete

---

## WHAT KULL DOES NOT COLLECT

For transparency, these data types are **NOT collected** by Kull:

- **Location:** No location tracking
- **Health & Fitness:** No health data
- **Financial Info (other than purchases):** No payment info, credit card info
- **Contacts:** No access to contacts
- **Browsing History:** No web browsing tracking
- **Search History:** No search query tracking
- **Sensitive Info:** No sensitive personal data
- **Diagnostics:** No crash/performance data collection (beyond Apple's default)

---

## CURRENT STATUS

**App Info ID:** 3e0ec5dc-52c3-4ea8-906a-d6f0e498f7ff  
**App ID:** 6755838738  
**Bundle ID:** media.lander.kull  
**Privacy Policy URL:** https://kull.foto/privacy (already configured)  
**App Store State:** PREPARE_FOR_SUBMISSION

**BLOCKING ISSUE:** Privacy labels MUST be configured before submission.

---

## TIME ESTIMATE

**Manual configuration time:** 10-15 minutes

This is a one-time setup. Once configured, privacy labels persist across app updates unless you change what data your app collects.

---

## ALTERNATIVE: Privacy Nutrition Label JSON (Not Currently Supported)

Apple has discussed a JSON-based privacy manifest (`PrivacyInfo.xcprivacy`) for Xcode projects, but this is for:
1. Third-party SDK disclosure (not app-level privacy)
2. Required API usage declarations
3. Does NOT replace App Store Connect privacy configuration

The manual web configuration is still required regardless of any Xcode privacy manifests.

---

## SUPPORT

If you encounter issues during manual configuration:
1. Ensure you have "Admin" or "App Manager" role in App Store Connect
2. Check that privacy policy URL is valid and accessible
3. Contact Apple Developer Support if technical issues persist

---

**Last Updated:** 2025-11-27  
**Tested Against:** App Store Connect API v1
