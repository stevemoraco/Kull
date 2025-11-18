# WebSocket Real-Time Sync Implementation

## Overview

This document describes the WebSocket real-time sync implementation for the Kull Universal App (macOS, iOS, iPadOS).

## Implementation Date

November 18, 2025

## Architecture

### Components

1. **SyncMessageModels.swift** - Type-safe message models
2. **WebSocketService.swift** - Native URLSessionWebSocketTask client
3. **SyncCoordinator.swift** - State management and message handling
4. **AuthViewModel.swift** (updated) - Connects WebSocket on authentication
5. **kullApp.swift** (updated) - UI updates for connection status

### Message Flow

```
Native App → WebSocketService → Server
                ↓
         SyncCoordinator (handlers)
                ↓
           Published State
                ↓
              UI Updates
```

## Files Created

### 1. SyncMessageModels.swift

Location: `/home/runner/workspace/apps/Kull Universal App/kull/kull/SyncMessageModels.swift`

**Purpose**: Type-safe Swift models for WebSocket messages

**Key Types**:
- `SyncMessageType`: Enum of all message types (SHOOT_PROGRESS, CREDIT_UPDATE, etc.)
- `ShootStatus`: Enum for shoot processing states (queued, processing, completed, failed)
- `SyncMessage<T>`: Generic wrapper for all messages
- `ShootProgressPayload`: Real-time shoot progress updates
- `CreditUpdatePayload`: Credit balance changes
- `PromptChangePayload`: Marketplace prompt updates
- `DeviceConnectionPayload`: Multi-device sync notifications
- `AdminSessionUpdatePayload`: Admin-specific notifications
- `PingPayload`/`PongPayload`: Keepalive messages
- `WebSocketClientMessage<T>`: Client-to-server messages

**Features**:
- Full Codable conformance for JSON serialization
- Equatable conformance for testing
- Type-safe handler closures
- Computed properties (e.g., `ShootProgressPayload.progress`)

### 2. WebSocketService.swift

Location: `/home/runner/workspace/apps/Kull Universal App/kull/kull/WebSocketService.swift`

**Purpose**: Native WebSocket client using URLSessionWebSocketTask

**Key Features**:
- **Singleton pattern**: `WebSocketService.shared`
- **Connection management**: Connect/disconnect with userId:deviceId
- **Auto-reconnection**: Exponential backoff (1s → 2s → 4s → 8s → 16s → 32s → 60s)
- **Ping/Pong keepalive**: 30-second interval
- **Type-safe handlers**: Register handlers for specific message types
- **Environment switching**: Auto-reconnect when environment changes
- **Connection states**: disconnected, connecting, connected, reconnecting, failed

**Published Properties**:
- `isConnected: Bool` - Current connection status
- `lastSyncTime: Date?` - Last message received timestamp
- `connectionState: ConnectionState` - Detailed connection state

**Methods**:
- `connect(userId:deviceId:)` - Start WebSocket connection
- `disconnect()` - Close connection
- `registerHandler(for:handler:)` - Register type-safe message handler
- `send(type:payload:)` - Send message to server

**WebSocket URL Format**:
```
ws://localhost:5000/ws?token=userId:deviceId     (development)
wss://kullai.com/ws?token=userId:deviceId        (production)
```

### 3. SyncCoordinator.swift

Location: `/home/runner/workspace/apps/Kull Universal App/kull/kull/SyncCoordinator.swift`

**Purpose**: Centralized sync state management and message handling

**Key Features**:
- **Singleton pattern**: `SyncCoordinator.shared`
- **State tracking**: Active shoots, credit balance, connected devices
- **Auto-cleanup**: Removes completed shoots after 5 seconds
- **Notifications**: Posts NotificationCenter events for UI updates
- **Native notifications**: Shows system notifications for credit changes (macOS)

**Published Properties**:
- `activeShootProgress: [String: ShootProgressPayload]` - All active shoots
- `creditBalance: Int` - Current credit balance (real-time)
- `connectedDevices: [DeviceConnectionPayload]` - All connected devices
- `lastCreditUpdate: CreditUpdatePayload?` - Last credit change
- `lastPromptChange: PromptChangePayload?` - Last marketplace update

**Computed Properties**:
- `isAnyShooting: Bool` - Are any shoots processing?
- `totalImagesProcessing: Int` - Total images processed across all shoots
- `totalImagesToProcess: Int` - Total images to process across all shoots
- `overallProgress: Double` - Overall progress (0.0 to 1.0)

**Methods**:
- `start(userId:deviceId:)` - Start sync (connects WebSocket)
- `stop()` - Stop sync and clear state

**Registered Handlers**:
1. **Shoot Progress**: Updates `activeShootProgress`, auto-removes completed
2. **Credit Update**: Updates `creditBalance`, shows notification
3. **Prompt Change**: Updates `lastPromptChange`, posts NotificationCenter
4. **Device Connected**: Adds to `connectedDevices`
5. **Device Disconnected**: Removes from `connectedDevices`
6. **Admin Session Update**: Posts NotificationCenter for admin UI

### 4. AuthViewModel.swift (Updated)

Location: `/home/runner/workspace/apps/Kull Universal App/kull/kull/AuthViewModel.swift`

**Changes**:
- Added `syncCoordinator: SyncCoordinator` dependency
- **`refreshSession()`**: Starts WebSocket sync after successful authentication
- **`pollLinking()`**: Starts WebSocket sync after device link approval
- **`logout()`**: Stops WebSocket sync before clearing credentials

**Flow**:
```
User authenticates → AuthViewModel.state = .signedIn
                  → SyncCoordinator.start(userId, deviceId)
                  → WebSocketService.connect(userId, deviceId)
                  → Real-time sync active
```

### 5. kullApp.swift (Updated)

Location: `/home/runner/workspace/apps/Kull Universal App/kull/kull/kullApp.swift`

**macOS Changes**:
- Added `@StateObject` observers for `WebSocketService` and `SyncCoordinator`
- **Connection status indicator**: Shows bolt icon (green) or warning icon (orange)
- **Credit balance sync**: Uses `syncCoordinator.creditBalance` for real-time updates
- **Active shoots section**: Shows progress bars for all active shoots with ETA

**iOS/iPadOS Changes**:
- Added `@StateObject` observers for `WebSocketService` and `SyncCoordinator`
- **Connection banner**: Full-width banner at top showing connection status
- **Last sync timestamp**: Shows time since last message received
- **Credit balance sync**: Uses `syncCoordinator.creditBalance` for real-time updates
- **Active shoots section**: Shows progress for all active shoots with ETA

## Tests Created

### 1. WebSocketServiceTests.swift

Location: `/home/runner/workspace/apps/Kull Universal App/kull/kullTests/WebSocketServiceTests.swift`

**Test Coverage**:
- Initial state verification
- Connection state transitions
- Handler registration (single, multiple, overwrite)
- Message type handlers
- Connection parameter validation
- Reconnection state tracking
- Environment change handling
- Ping/Pong payload structures
- Connection state equality
- Thread safety (concurrent handler registration)
- Message sending (with/without payload)
- Performance tests

**Total Tests**: 20+

### 2. SyncCoordinatorTests.swift

Location: `/home/runner/workspace/apps/Kull Universal App/kull/kullTests/SyncCoordinatorTests.swift`

**Test Coverage**:
- Initial state verification
- Start/stop functionality
- Shoot progress tracking
- isAnyShooting computed property
- Progress calculation (total images, overall progress)
- Credit balance updates
- Connected devices management
- Shoot status transitions
- Last update tracking
- State clearing on stop
- Performance tests

**Total Tests**: 25+

### 3. SyncMessageModelsTests.swift

Location: `/home/runner/workspace/apps/Kull Universal App/kull/kullTests/SyncMessageModelsTests.swift`

**Test Coverage**:
- SyncMessageType raw values and codability
- ShootStatus raw values and codability
- ShootProgressPayload progress calculation
- All payload Codable conformance
- All payload Equatable conformance
- PromptAction and AdminAction enums
- WebSocketClientMessageType
- SyncMessage generic wrapper
- GenericSyncMessage decoding
- Performance tests (encoding/decoding)

**Total Tests**: 30+

## Key Features

### 1. Real-Time Updates

Every image processed triggers a WebSocket message:
```swift
{
  "type": "SHOOT_PROGRESS",
  "data": {
    "shootId": "abc123",
    "processedCount": 247,
    "totalCount": 1000,
    "progress": 0.247,
    "currentImage": "IMG_2047.jpg",
    "eta": 45.2,
    "provider": "gpt-5-nano",
    "status": "processing"
  }
}
```

### 2. Auto-Reconnection

Exponential backoff with max 10 attempts:
- Attempt 1: 1 second
- Attempt 2: 2 seconds
- Attempt 3: 4 seconds
- Attempt 4: 8 seconds
- Attempt 5: 16 seconds
- Attempt 6: 32 seconds
- Attempts 7-10: 60 seconds

### 3. Ping/Pong Keepalive

- Sends PING every 30 seconds
- Server responds with PONG
- Connection terminated if no PONG received

### 4. Type Safety

All messages are type-safe with Swift generics:
```swift
service.registerHandler(for: .shootProgress) { (payload: ShootProgressPayload) in
    // Compiler-verified payload type
}
```

### 5. Multi-Device Sync

- Each device gets unique deviceId (persisted in UserDefaults)
- WebSocket token format: `userId:deviceId`
- Devices can see each other connect/disconnect
- Real-time updates across all devices

## Integration Points

### Backend Server

**WebSocket URL**: `/ws?token=userId:deviceId`

**Server Implementation**: `/home/runner/workspace/server/websocket.ts`

**Message Types Handled**:
- SHOOT_PROGRESS (from server)
- CREDIT_UPDATE (from server)
- DEVICE_CONNECTED (from server)
- DEVICE_DISCONNECTED (from server)
- PROMPT_CHANGE (from server)
- ADMIN_SESSION_UPDATE (from server)
- PING (bidirectional)
- PONG (bidirectional)
- UPDATE_PROGRESS (from client to server)

### Environment Configuration

**Development**: `ws://localhost:5000/ws`
**Staging**: `wss://staging.kullai.com/ws`
**Production**: `wss://kullai.com/ws`

Configured in: `/home/runner/workspace/apps/Kull Universal App/kull/kull/EnvironmentConfig.swift`

### Keychain Integration

- Uses `KeychainManager.shared` from Agent D
- Stores ONLY JWT tokens (no provider API keys)
- Token format: access token (1 hour) + refresh token (30 days)

### Device ID

- Uses `DeviceIDManager.shared` from Agent D
- UUID persisted in UserDefaults
- Generated once per device
- Used in WebSocket authentication: `userId:deviceId`

## Usage Examples

### Registering a Handler

```swift
WebSocketService.shared.registerHandler(for: .shootProgress) { (payload: ShootProgressPayload) in
    print("Shoot \(payload.shootId): \(payload.processedCount)/\(payload.totalCount)")
    print("Progress: \(payload.progress * 100)%")
}
```

### Starting Sync

```swift
// In AuthViewModel after successful authentication
let userId = "user-123"
let deviceId = DeviceIDManager.shared.deviceID
SyncCoordinator.shared.start(userId: userId, deviceId: deviceId)
```

### Observing State in UI

```swift
@StateObject private var syncCoordinator = SyncCoordinator.shared
@StateObject private var webSocket = WebSocketService.shared

var body: some View {
    VStack {
        // Connection status
        HStack {
            Image(systemName: webSocket.isConnected ? "bolt.fill" : "exclamationmark.triangle")
            Text(webSocket.isConnected ? "Connected" : "Offline")
        }

        // Active shoots
        ForEach(Array(syncCoordinator.activeShootProgress.values), id: \.shootId) { progress in
            ProgressView(value: progress.progress)
            Text("\(progress.processedCount)/\(progress.totalCount)")
        }

        // Credit balance (real-time)
        Text("Credits: \(syncCoordinator.creditBalance)")
    }
}
```

## Acceptance Criteria

- [x] WebSocketService implemented with native URLSessionWebSocketTask
- [x] SyncCoordinator with type-safe handlers
- [x] AuthViewModel connects on login
- [x] macOS UI shows connection status
- [x] iOS UI shows connection status
- [x] Real-time progress updates work
- [x] Auto-reconnect with exponential backoff
- [x] Tests created (90%+ coverage target)

## Performance Considerations

- **Message Handling**: All handlers run on MainActor for thread-safety
- **Auto-Cleanup**: Completed shoots removed after 5 seconds to prevent memory growth
- **Efficient Updates**: Uses `@Published` for reactive UI updates
- **Ping Interval**: 30 seconds (balance between responsiveness and battery)

## Error Handling

- **Connection Failures**: Auto-reconnect with exponential backoff
- **Parse Errors**: Logged but don't crash app
- **Handler Errors**: Caught and logged, don't affect other handlers
- **Network Changes**: Environment change triggers reconnection

## Future Enhancements

1. **Offline Queue**: Queue messages sent while offline, send on reconnect
2. **Message Acknowledgment**: Server confirms message receipt
3. **Binary Messages**: Support binary data for efficiency
4. **Compression**: WebSocket compression for large payloads
5. **Metrics**: Track connection uptime, message counts, errors

## Testing

To run tests in Xcode:
```bash
cd "/home/runner/workspace/apps/Kull Universal App/kull"
xcodebuild test -scheme kull -destination 'platform=macOS'
```

Or use Xcode UI:
- Open `kull.xcodeproj`
- Press `Cmd+U` to run all tests
- Tests located in `kullTests/` directory

## Troubleshooting

### WebSocket Won't Connect

1. Check environment configuration (EnvironmentConfig.swift)
2. Verify server is running at correct URL
3. Check console logs for connection errors
4. Verify JWT tokens in Keychain

### Messages Not Received

1. Check handler registration
2. Verify message type matches server messages
3. Check console logs for parsing errors
4. Ensure MainActor context for UI updates

### Auto-Reconnect Not Working

1. Check `shouldReconnect` flag
2. Verify max reconnection attempts not exceeded
3. Check console logs for reconnection attempts
4. Ensure network connectivity

## Related Documentation

- Backend WebSocket: `/home/runner/workspace/server/websocket.ts`
- Sync Types: `/home/runner/workspace/shared/types/sync.ts`
- Auth Implementation: `/home/runner/workspace/apps/Kull Universal App/kull/kull/AuthViewModel.swift`
- Environment Config: `/home/runner/workspace/apps/Kull Universal App/kull/kull/EnvironmentConfig.swift`

## Support

For questions or issues:
- Email: steve@lander.media
- Check logs: Console.app → Search for "[WebSocket]" or "[SyncCoordinator]"
