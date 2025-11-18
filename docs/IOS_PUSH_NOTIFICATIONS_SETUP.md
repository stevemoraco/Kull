# iOS Push Notifications Setup Guide

## Overview

This guide documents the iOS push notification implementation for the Kull Universal App. The system uses Apple Push Notification service (APNs) to deliver real-time notifications for shoot completion, device connections, and other events.

## Architecture

```
iOS App → Backend API → APNs → iOS Device
  (Token)    (Passthrough)   (Notification)
```

### Key Components

1. **NotificationService.swift** - iOS notification manager
2. **mobilePushAdapter.ts** - Backend APNs integration
3. **notifications.ts** - API routes for token registration
4. **deviceTokens table** - Database storage for push tokens
5. **SyncCoordinator** - Handles notification events in-app

## iOS Implementation

### NotificationService.swift

Located at: `/apps/Kull Universal App/kull/kull/NotificationService.swift`

**Responsibilities:**
- Request notification permissions on app launch
- Register device tokens with backend
- Handle incoming notifications
- Update app badge count
- Broadcast events to app via NotificationCenter

**Key Methods:**
```swift
func requestPermissions() async throws
func didRegisterForRemoteNotifications(deviceToken: Data)
func handleNotification(_ userInfo: [AnyHashable: Any])
func updateBadge(count: Int)
```

### Integration in kullApp.swift

The AppDelegate handles APNs callbacks:

```swift
// Request permissions on launch
func application(_ application: UIApplication,
                 didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey : Any]? = nil) -> Bool {
    UNUserNotificationCenter.current().delegate = self
    Task {
        try await NotificationService.shared.requestPermissions()
    }
    return true
}

// Register device token
func application(_ application: UIApplication,
                 didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
    NotificationService.shared.didRegisterForRemoteNotifications(deviceToken: deviceToken)
}

// Handle foreground notifications
func userNotificationCenter(_ center: UNUserNotificationCenter,
                            willPresent notification: UNNotification,
                            withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
    NotificationService.shared.handleNotification(notification.request.content.userInfo)
    completionHandler([.banner, .sound, .badge])
}

// Handle notification taps
func userNotificationCenter(_ center: UNUserNotificationCenter,
                            didReceive response: UNNotificationResponse,
                            withCompletionHandler completionHandler: @escaping () -> Void) {
    NotificationService.shared.handleNotification(response.notification.request.content.userInfo)
    completionHandler()
}
```

## Backend Implementation

### Database Schema

**deviceTokens table** (`shared/schema.ts`):
```typescript
export const deviceTokens = pgTable("device_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  deviceId: varchar("device_id").notNull(),
  deviceToken: text("device_token").notNull(), // APNs token
  platform: varchar("platform").notNull(), // 'ios' or 'android'
  isActive: boolean("is_active").default(true),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqueUserDevice: uniqueIndex("device_tokens_user_device_idx").on(table.userId, table.deviceId),
}));
```

**notificationPreferences table**:
```typescript
export const notificationPreferences = pgTable("notification_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique().references(() => users.id),
  shootComplete: boolean("shoot_complete").default(true),
  deviceConnection: boolean("device_connection").default(true),
  creditLow: boolean("credit_low").default(true),
  batchComplete: boolean("batch_complete").default(true),
  shootFailed: boolean("shoot_failed").default(true),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

### Storage Methods (`server/storage.ts`)

```typescript
async upsertDeviceToken(data: {
  userId: string;
  deviceId: string;
  deviceToken: string;
  platform: 'ios' | 'android';
  updatedAt: Date;
}): Promise<string>

async getDeviceTokens(userId: string): Promise<DeviceToken[]>
async getDeviceToken(userId: string, deviceId: string): Promise<DeviceToken | undefined>
async deleteDeviceToken(userId: string, deviceId: string): Promise<void>
async updateNotificationPreferences(userId: string, preferences: Partial<NotificationPreference>): Promise<void>
async getNotificationPreferences(userId: string): Promise<NotificationPreference | undefined>
```

### API Routes (`server/routes/notifications.ts`)

**POST /api/notifications/register**
- Registers device token with backend
- Requires JWT authentication
- Body: `{ deviceToken, deviceId, platform }`

**DELETE /api/notifications/unregister**
- Removes device token (on logout)
- Body: `{ deviceId }`

**GET /api/notifications/devices**
- Lists all registered devices for user

**POST /api/notifications/test**
- Sends test notification (debugging)
- Body: `{ deviceId, type }`

**PUT /api/notifications/preferences**
- Updates notification preferences
- Body: `{ shootComplete, deviceConnection, creditLow, ... }`

**GET /api/notifications/preferences**
- Retrieves user's notification preferences

### APNs Adapter (`server/services/adapters/mobilePushAdapter.ts`)

Uses `@parse/node-apn` library to send notifications.

**Configuration** (environment variables):
```bash
APNS_KEY_PATH=/path/to/AuthKey_XXXXXXXXXX.p8
APNS_KEY_ID=XXXXXXXXXX
APNS_TEAM_ID=XXXXXXXXXX
APNS_BUNDLE_ID=com.kull.app
NODE_ENV=production  # or development
```

**Notification Types:**

1. **shoot_complete**
   ```json
   {
     "type": "shoot_complete",
     "shootId": "shoot-123",
     "imageCount": 1247,
     "activeCount": 2
   }
   ```
   - Badge: activeCount
   - Title: "✅ Shoot Complete!"
   - Body: "1247 images processed and rated"

2. **device_connected**
   ```json
   {
     "type": "device_connected",
     "deviceName": "MacBook Pro",
     "deviceId": "device-123"
   }
   ```
   - Title: "🔗 Device Connected"
   - Body: "MacBook Pro is now synced"

3. **device_disconnected**
   ```json
   {
     "type": "device_disconnected",
     "deviceName": "iPhone 15 Pro",
     "deviceId": "device-456"
   }
   ```
   - Title: "⚠️ Device Disconnected"
   - Body: "iPhone 15 Pro is offline"

4. **credit_low**
   ```json
   {
     "type": "credit_low",
     "remaining": 100
   }
   ```
   - Title: "💳 Credits Running Low"
   - Body: "Only 100 credits remaining"

5. **shoot_failed**
   ```json
   {
     "type": "shoot_failed",
     "shootId": "shoot-789",
     "reason": "API rate limit exceeded"
   }
   ```
   - Title: "❌ Shoot Failed"
   - Body: "Processing failed: API rate limit exceeded"

6. **batch_complete**
   ```json
   {
     "type": "batch_complete",
     "batchId": "batch-555",
     "imageCount": 5000,
     "successCount": 4950
   }
   ```
   - Title: "✅ Batch Complete"
   - Body: "4950 of 5000 images processed"

## Xcode Project Setup

### Info.plist

Already configured with:
```xml
<key>UIBackgroundModes</key>
<array>
    <string>remote-notification</string>
</array>
```

### Entitlements (kull.entitlements)

Already configured with:
```xml
<key>aps-environment</key>
<string>development</string>
```

For production, change to `<string>production</string>`

### Push Notifications Capability

**Manual steps in Xcode:**
1. Open `kull.xcodeproj`
2. Select kull target
3. Go to "Signing & Capabilities" tab
4. Click "+ Capability"
5. Add "Push Notifications"
6. Add "Background Modes" (if not present)
   - Check "Remote notifications"

## Apple Developer Portal Setup

### 1. Create APNs Key

1. Go to [Apple Developer Portal](https://developer.apple.com/account/resources/authkeys/list)
2. Click "+" to create new key
3. Enter name: "Kull Push Notifications"
4. Check "Apple Push Notifications service (APNs)"
5. Click "Continue" → "Register"
6. **Download `.p8` file** (can only download once!)
7. Note the **Key ID** (10 characters)
8. Note your **Team ID** (10 characters, found in membership section)

### 2. Configure App ID

1. Go to [Identifiers](https://developer.apple.com/account/resources/identifiers/list)
2. Select your app ID (com.kull.app)
3. Enable "Push Notifications" capability
4. Click "Save"

### 3. Update Provisioning Profiles

After enabling push notifications:
1. Go to [Profiles](https://developer.apple.com/account/resources/profiles/list)
2. Delete existing profiles for the app
3. Xcode will automatically regenerate them with push enabled

## Environment Variables

Add to `.env` file:

```bash
# APNs Configuration
APNS_KEY_PATH=/path/to/AuthKey_XXXXXXXXXX.p8
APNS_KEY_ID=XXXXXXXXXX
APNS_TEAM_ID=XXXXXXXXXX
APNS_BUNDLE_ID=com.kull.app
```

**Never commit the .p8 file to version control!**

## Testing

### iOS Tests

Located at: `/apps/Kull Universal App/kull/kullTests/NotificationServiceTests.swift`

Run in Xcode:
```bash
cd "apps/Kull Universal App/kull"
xcodebuild test -scheme kull -destination 'platform=iOS Simulator,name=iPhone 15 Pro Max'
```

### Backend Tests

Located at: `/server/services/adapters/__tests__/mobilePushAdapter.test.ts`

Run with npm:
```bash
npm test -- mobilePushAdapter.test.ts
```

### Manual Testing

1. **Register Device:**
   ```bash
   curl -X POST http://localhost:5000/api/notifications/register \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "deviceToken": "YOUR_APNS_TOKEN",
       "deviceId": "test-device-123",
       "platform": "iOS"
     }'
   ```

2. **Send Test Notification:**
   ```bash
   curl -X POST http://localhost:5000/api/notifications/test \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "deviceId": "test-device-123",
       "type": "shoot_complete"
     }'
   ```

## Production Deployment

### 1. Update Entitlements

Change `kull.entitlements`:
```xml
<key>aps-environment</key>
<string>production</string>
```

### 2. Set Environment Variable

```bash
NODE_ENV=production
```

### 3. Upload .p8 Key to Server

Securely transfer the `.p8` file to your production server and update `APNS_KEY_PATH` to point to it.

### 4. Database Migration

Run database migration to create tables:
```bash
npm run db:push
```

This creates:
- `device_tokens` table
- `notification_preferences` table

## Troubleshooting

### iOS App Not Receiving Notifications

**Check:**
1. Permissions granted: `NotificationService.shared.permissionGranted == true`
2. Device token registered: `NotificationService.shared.deviceToken != nil`
3. App delegate methods called
4. Entitlements configured correctly
5. Push Notifications capability enabled in Xcode

**Logs:**
```swift
Logger.app.info("Permission granted: \(granted)")
Logger.app.info("Device token: \(token)")
```

### Backend Not Sending Notifications

**Check:**
1. APNs credentials configured: `APNS_KEY_PATH`, `APNS_KEY_ID`, `APNS_TEAM_ID`
2. `.p8` file exists at path
3. `NODE_ENV` set correctly (development/production)
4. Device token stored in database
5. Notification preferences allow the type

**Logs:**
```
[APNs] Initialized (production)
[APNs] Push sent to abcd…7890 - type=shoot_complete
```

### APNs Errors

**Common errors:**
- **BadDeviceToken**: Token is invalid or expired - user may have reinstalled app
- **DeviceTokenNotForTopic**: Bundle ID mismatch
- **Unregistered**: Device opted out of notifications
- **InvalidProviderToken**: .p8 key expired or incorrect

**Solution**: Delete token from database and re-register device.

## Security Considerations

1. **Device tokens are sensitive** - treat like passwords
2. **Never log full tokens** - use masked version (`abcd…7890`)
3. **Verify JWT tokens** - all API endpoints require authentication
4. **HTTPS only** - never send tokens over HTTP
5. **Rotate APNs keys** - Apple recommends rotating every 1-2 years
6. **Delete tokens on logout** - call `/api/notifications/unregister`

## Monitoring

### Metrics to Track

1. **Registration rate**: % of users who enable notifications
2. **Delivery rate**: % of notifications successfully delivered
3. **Error rate**: Track APNs errors by type
4. **Badge accuracy**: Ensure badge matches activeCount
5. **Permission denial**: Track how many users deny permissions

### Logging

All APNs activity is logged:
```
[APNs] Initialized (development)
[APNs] Push sent to abcd…7890 - type=shoot_complete
[APNs] Push failed for abcd…7890: BadDeviceToken
```

## Future Enhancements

1. **Rich Notifications**: Add images/videos to notifications
2. **Action Buttons**: "View Shoot" / "Dismiss" buttons
3. **Silent Notifications**: Background data sync
4. **Notification Groups**: Group by shoot ID
5. **Localization**: Multi-language support
6. **Analytics**: Track notification engagement
7. **A/B Testing**: Test notification copy/timing

## Resources

- [Apple Push Notifications Documentation](https://developer.apple.com/documentation/usernotifications)
- [APNs Provider API Reference](https://developer.apple.com/documentation/usernotifications/setting_up_a_remote_notification_server)
- [@parse/node-apn Library](https://github.com/parse-community/node-apn)
- [Kull Universal App Implementation Plan](/docs/UNIVERSAL_APP_IMPLEMENTATION_PLAN.md)
