# Offline Mode & Operation Queue Implementation

## Overview

This implementation provides full offline support for the Kull Universal App, allowing users to continue working when disconnected from the network. All operations are queued and automatically synchronized when connectivity is restored.

## Architecture

### Components

#### 1. CacheManager (`CacheManager.swift`)

The CacheManager is responsible for caching user data, credits, prompts, and reports locally for offline access.

**Features:**
- User profile caching
- Credit balance and summary caching
- Prompt marketplace data caching
- Shoot reports caching
- Image/thumbnail caching to disk
- Cache size tracking and management
- Cache staleness detection
- Thread-safe operations

**Usage:**
```swift
// Cache user data
let user = RemoteUser(id: "123", email: "user@example.com", ...)
CacheManager.shared.cacheUserProfile(user)

// Retrieve cached data
if let cachedUser = CacheManager.shared.getCachedUserProfile() {
    print("User: \(cachedUser.displayName)")
}

// Check cache freshness
if CacheManager.shared.isCacheStale(maxAgeSeconds: 3600) {
    // Refresh data from server
}
```

**Storage Strategy:**
- Simple data (user profile, credits, prompts): `UserDefaults`
- Large binary data (images, thumbnails): `FileManager` in caches directory
- Cache directory: `~/Library/Caches/KullCache/`

#### 2. OfflineOperationQueue (`OfflineOperationQueue.swift`)

The OfflineOperationQueue manages a persistent queue of operations that need to be synchronized with the backend when online.

**Supported Operations:**
- `votePrompt` - Vote on marketplace prompts
- `addFolder` - Add folder to sync list
- `removeFolder` - Remove folder from sync list
- `updateSettings` - Update user settings
- `purchaseCredits` - Confirm credit purchases
- `submitReport` - Submit shoot reports

**Features:**
- Persistent queue (survives app restarts)
- Automatic retry with exponential backoff
- Max retry limit (3 attempts)
- Operation ordering (FIFO)
- Retry tracking and error logging
- Operation statistics by type

**Usage:**
```swift
// Enqueue an operation
let payload = VotePromptPayload(promptId: "prompt123", score: 5)
try OfflineOperationQueue.shared.enqueue(type: .votePrompt, payload: payload)

// Sync when online (automatic via NetworkMonitor)
await OfflineOperationQueue.shared.syncWhenOnline()

// Check queue status
print("Pending operations: \(OfflineOperationQueue.shared.pendingOperationsCount)")
```

**Operation Flow:**
1. User performs action while offline
2. Operation is encoded and added to queue
3. Queue is persisted to UserDefaults
4. When network reconnects, NetworkMonitor triggers sync
5. Operations are executed in order
6. Successful operations are removed from queue
7. Failed operations are retried up to 3 times
8. After max retries, operations are removed with error logged

#### 3. NetworkMonitor (`NetworkMonitor.swift`)

The NetworkMonitor detects network connectivity changes and triggers automatic synchronization.

**Features:**
- Real-time connectivity monitoring using `NWPathMonitor`
- Connection type detection (WiFi, Cellular, Ethernet)
- Network quality estimation (offline, poor, moderate, good)
- Expensive/constrained connection detection
- Automatic sync trigger on reconnection
- Cache refresh when connection restored
- SwiftUI views for status display

**Usage:**
```swift
// Access shared instance
let monitor = NetworkMonitor.shared

// Check connection status
if monitor.isConnected {
    print("Connected via \(monitor.connectionDescription)")
}

// Check network quality
switch monitor.networkQuality {
case .offline:
    print("No connection")
case .poor:
    print("Limited connectivity")
case .moderate:
    print("Adequate connection")
case .good:
    print("Excellent connection")
}

// Manual sync trigger
monitor.triggerSync()
```

**Connection Types:**
- `wifi` - WiFi connection
- `cellular` - Cellular data
- `wiredEthernet` - Ethernet cable
- `other` - Other connection type
- `none` - No connection

**Network Quality Factors:**
- Offline: No connection
- Poor: Constrained connection (Data Saver mode)
- Moderate: Expensive connection (Cellular, metered)
- Good: Fast, unmetered connection

### UI Integration

#### macOS (MainWindow)

The macOS app displays:
- Network status indicator (WiFi icon with connection type)
- WebSocket sync status (bolt icon)
- Pending operations count
- Offline banner when disconnected
- Syncing progress indicator

**Visual States:**
1. **Online & Synced**: Green indicators, no banners
2. **Offline**: Orange WiFi icon, offline banner with operation count
3. **Syncing**: Blue progress bar showing sync in progress
4. **Failed**: Red indicators with error details

#### iOS/iPadOS (HomeView)

The iOS app displays:
- Network status banner at top
- Syncing indicator when operations are syncing
- WebSocket connection status
- Last sync timestamp
- Pending operations count

**Pull-to-refresh** triggers manual sync.

### Data Flow

```
┌─────────────┐
│  User Action│
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│ NetworkMonitor  │
│   isConnected?  │
└────────┬────────┘
         │
    ┌────┴────┐
    │ Online? │
    └─┬────┬──┘
      │    │
   No │    │ Yes
      │    │
      ▼    ▼
┌─────────────────┐  ┌────────────────┐
│ Enqueue to      │  │ Execute API    │
│ Operation Queue │  │ Call Directly  │
└─────────────────┘  └────────────────┘
      │
      │ Network reconnects
      ▼
┌─────────────────┐
│ Auto Sync Queue │
│ via Monitor     │
└─────────────────┘
      │
      ▼
┌────────────────┐
│ Execute Queued │
│ Operations     │
└────────────────┘
```

## Testing

### Test Coverage

Three comprehensive test suites provide 90%+ code coverage:

#### 1. CacheManagerTests (`CacheManagerTests.swift`)
- User profile caching/retrieval
- Credit balance caching
- Credit summary caching
- Prompts caching
- Reports caching
- Image caching to disk
- Cache metadata (last sync date)
- Cache staleness detection
- Clear operations (individual and all)
- Cache size calculation

#### 2. OfflineOperationQueueTests (`OfflineOperationQueueTests.swift`)
- Operation enqueueing
- Typed payload encoding/decoding
- Multiple operation handling
- Queue persistence across restarts
- Operation statistics (count, by type)
- Failed operation tracking
- Retry logic
- Queue ordering (FIFO)
- Edge cases (empty queue, many operations)

#### 3. NetworkMonitorTests (`NetworkMonitorTests.swift`)
- Network status detection
- Connection type detection
- Network quality estimation
- Expensive/constrained detection
- Manual sync triggering
- Singleton pattern verification
- Observable object conformance
- Performance benchmarks
- State consistency validation

### Running Tests

```bash
# Run all tests
xcodebuild test -scheme kull -destination 'platform=macOS'

# Run specific test suite
xcodebuild test -scheme kull -only-testing:kullTests/CacheManagerTests

# Run from Xcode
# Product > Test (⌘U)
```

## Performance Considerations

### Cache Performance
- **UserDefaults**: Fast for small data (<100KB)
- **File System**: Used for images/large data
- **Cache Size**: Monitor with `getCacheSize()` and clear periodically
- **Recommended Max Cache Age**: 1 hour (configurable)

### Network Monitoring
- **NWPathMonitor**: Lightweight, system-level monitoring
- **Update Frequency**: Real-time on connection changes
- **Battery Impact**: Minimal (system service)

### Operation Queue
- **Persistence**: Synchronous writes to UserDefaults
- **Sync Performance**: Sequential execution with async/await
- **Retry Strategy**: Exponential backoff (prevent server overload)
- **Max Queue Size**: No hard limit (monitor with `pendingOperationsCount`)

## Configuration

### Cache Expiry

Default: 1 hour (3600 seconds)

```swift
// Check if cache is stale (custom max age)
if CacheManager.shared.isCacheStale(maxAgeSeconds: 7200) { // 2 hours
    // Refresh data
}
```

### Retry Configuration

Default: 3 retries

```swift
// In OfflineOperationQueue.swift
private let maxRetries = 3  // Modify as needed
```

### Cache Directory

Default: `~/Library/Caches/KullCache/`

```swift
// In CacheManager.swift
private var cacheDirectory: URL {
    let cachesDirectory = fileManager.urls(for: .cachesDirectory, in: .userDomainMask).first!
    return cachesDirectory.appendingPathComponent("KullCache", isDirectory: true)
}
```

## Error Handling

### Network Errors
- API timeouts: Operation stays in queue, retries on next sync
- 401 Unauthorized: Token refresh attempted automatically
- 500 Server Error: Retried with exponential backoff

### Cache Errors
- Encoding failures: Logged, operation skipped
- Disk full: Old cache entries cleared automatically
- Corruption: Cache cleared and rebuilt

### Queue Errors
- Max retries exceeded: Operation removed, error logged
- Invalid payload: Operation removed immediately
- Sync failure: Queue preserved for next attempt

## Best Practices

### For Developers

1. **Always check network status** before expensive operations
2. **Queue write operations** when offline
3. **Cache read operations** for offline access
4. **Update cache** after successful API calls
5. **Monitor queue size** in debug builds
6. **Test offline scenarios** thoroughly

### For Users

1. **Offline work is seamless** - just use the app normally
2. **Queued operations** sync automatically when online
3. **Check pending count** in status bar
4. **Pull to refresh** to force sync (iOS)
5. **Clear cache** in settings if issues occur

## Troubleshooting

### Operations Not Syncing

1. Check network status in UI
2. Verify `NetworkMonitor.shared.isConnected` returns true
3. Check operation queue: `OfflineOperationQueue.shared.pendingOperationsCount`
4. Check logs for API errors
5. Try manual sync: `NetworkMonitor.shared.triggerSync()`

### Cache Not Working

1. Check cache size: `CacheManager.shared.getCacheSizeFormatted()`
2. Check last sync: `CacheManager.shared.getLastSyncDate()`
3. Clear cache: `CacheManager.shared.clearAllCache()`
4. Restart app to reload cache

### High Memory Usage

1. Check cache size and clear if needed
2. Monitor operation queue size
3. Reduce cache expiry time
4. Clear image cache more frequently

## Future Enhancements

### Planned Features
- [ ] Differential sync (only changed data)
- [ ] Compression for cached images
- [ ] Background sync (iOS 15+)
- [ ] Conflict resolution for concurrent edits
- [ ] Priority queue (urgent operations first)
- [ ] Bandwidth monitoring (pause heavy sync on cellular)
- [ ] User-configurable sync behavior

### API Integration Points
- `/api/device-auth/refresh` - Token refresh
- `/api/prompts/:id/vote` - Prompt voting
- `/api/settings` - Settings updates
- `/api/reports` - Report submission
- `/api/kull/credits/summary` - Credit sync

## Support

For issues or questions:
1. Check logs in Console.app (macOS) or Xcode Console
2. Review test suite for usage examples
3. Contact: steve@lander.media
4. File issues: [GitHub repo]

## License

Copyright © 2025 Kull. All rights reserved.
