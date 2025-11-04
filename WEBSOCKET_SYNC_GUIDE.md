# WebSocket Real-Time Sync System

## Overview
Complete WebSocket-based real-time synchronization system for Kull AI. Enables bidirectional sync between native devices (iOS, macOS) and web application.

## Architecture

### Server Components
1. **WebSocket Server** (`/server/websocket.ts`)
   - Handles WebSocket connections on `/ws` path
   - Manages user connection pools
   - Broadcasts messages to user's devices
   - Implements keepalive ping/pong

2. **Sync Routes** (`/server/routes/sync.ts`)
   - HTTP endpoints to trigger sync events
   - POST `/api/sync/shoot-progress` - Broadcast shoot progress
   - POST `/api/sync/credit-update` - Broadcast credit changes
   - POST `/api/sync/prompt-change` - Broadcast marketplace updates
   - GET `/api/sync/status` - Health check

### Client Components
1. **WebSocket Service** (`/client/src/services/websocket.ts`)
   - Singleton WebSocket client
   - Auto-reconnection with exponential backoff
   - Connection status tracking
   - Type-safe message handling

2. **React Hooks**
   - `useWebSocket` - Connect and listen to sync events
   - `useShootProgress` - Track specific shoot progress

3. **UI Components**
   - `SyncIndicator` - Visual connection status indicator
   - `DeviceList` - Show connected devices
   - `ShootProgress` - Live progress page

## Usage

### Web App Integration

#### Global Sync (App.tsx)
```typescript
import { useWebSocket } from '@/hooks/useWebSocket';
import { queryClient } from './lib/queryClient';

function App() {
  useWebSocket({
    onCreditUpdate: (data) => {
      // Refetch balance
      queryClient.invalidateQueries({ queryKey: ['/api/credits/balance'] });

      // Show notification
      toast({
        title: data.change > 0 ? 'Credits Added' : 'Credits Used',
        description: `${data.change > 0 ? '+' : ''}${data.change} credits`,
      });
    },
    onPromptChange: (data) => {
      // Refetch marketplace
      queryClient.invalidateQueries({ queryKey: ['/api/prompts'] });
    },
    onDeviceConnected: (data) => {
      toast({
        title: 'Device Connected',
        description: `${data.deviceName} connected`,
      });
    },
  });

  return <RouterContent />;
}
```

#### Shoot Progress Tracking
```typescript
import { useShootProgress } from '@/hooks/useShootProgress';

function ShootProgressPage({ shootId }: { shootId: string }) {
  const { progress, isProcessing, progressPercentage } = useShootProgress(shootId);

  return (
    <div>
      <Progress value={progressPercentage} />
      <p>{progress?.currentImage}</p>
      <p>ETA: {progress?.eta}s</p>
    </div>
  );
}
```

#### Show Connected Devices
```typescript
import { DeviceList } from '@/components/DeviceList';

function SettingsPage() {
  return (
    <div>
      <h2>Your Devices</h2>
      <DeviceList />
    </div>
  );
}
```

#### Add Sync Indicator to Header
```typescript
import { SyncIndicator } from '@/components/SyncIndicator';

function Header() {
  return (
    <header>
      <Logo />
      <Nav />
      <SyncIndicator /> {/* Shows connection status */}
    </header>
  );
}
```

### Server-Side Triggers

#### Broadcast Shoot Progress
```typescript
// From native app or processing worker
fetch('/api/sync/shoot-progress', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user_123',
    shootId: 'shoot_456',
    status: 'processing',
    processedCount: 15,
    totalCount: 100,
    currentImage: 'IMG_0015.jpg',
    eta: 120, // seconds
    provider: 'Replicate',
  }),
});
```

#### Broadcast Credit Update
```typescript
// After credit purchase or deduction
fetch('/api/sync/credit-update', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user_123',
    newBalance: 500,
    change: 100, // positive for purchase, negative for deduction
    reason: 'Credit purchase',
  }),
});
```

#### Broadcast Prompt Change
```typescript
// After marketplace prompt update
fetch('/api/sync/prompt-change', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    promptId: 'prompt_789',
    action: 'voted', // 'created' | 'updated' | 'deleted' | 'voted'
    userIds: ['user_123', 'user_456'], // optional: specific users to notify
  }),
});
```

### Native App Integration

#### Connect to WebSocket
```typescript
// In native app (React Native, Swift, etc.)
const token = `${userId}:${deviceId}`; // Device token format
const ws = new WebSocket(`wss://kull.ai/ws?token=${token}`);

ws.onopen = () => {
  console.log('Connected to sync server');
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  handleSyncMessage(message);
};
```

#### Send Progress Updates
```typescript
// Native app sends progress while processing
ws.send(JSON.stringify({
  type: 'UPDATE_PROGRESS',
  payload: {
    shootId: 'shoot_456',
    status: 'processing',
    processedCount: 15,
    totalCount: 100,
    currentImage: 'IMG_0015.jpg',
    eta: 120,
    provider: 'Local',
  },
}));
```

#### Receive Credit Updates
```typescript
function handleSyncMessage(message: SyncMessage) {
  switch (message.type) {
    case 'CREDIT_UPDATE':
      // Update local balance display
      updateCreditBalance(message.data.newBalance);
      showNotification(`Credits updated: ${message.data.change}`);
      break;

    case 'DEVICE_CONNECTED':
      showNotification('Another device connected');
      break;
  }
}
```

## Message Types

### SHOOT_PROGRESS
```typescript
{
  type: 'SHOOT_PROGRESS',
  data: {
    shootId: string;
    status: 'queued' | 'processing' | 'completed' | 'failed';
    processedCount: number;
    totalCount: number;
    currentImage?: string;
    eta?: number; // seconds
    provider: string;
    errorMessage?: string;
  },
  timestamp: number,
  deviceId: string,
  userId: string,
}
```

### CREDIT_UPDATE
```typescript
{
  type: 'CREDIT_UPDATE',
  data: {
    userId: string;
    newBalance: number;
    change: number; // +100 for purchase, -10 for usage
    reason: string;
  },
  timestamp: number,
  deviceId: string,
  userId: string,
}
```

### DEVICE_CONNECTED / DEVICE_DISCONNECTED
```typescript
{
  type: 'DEVICE_CONNECTED',
  data: {
    deviceId: string;
    platform: string;
    deviceName: string;
    connectedAt: number;
  },
  timestamp: number,
  deviceId: string,
  userId: string,
}
```

## Authentication

### Web Apps
- Use session userId as token: `ws://host/ws?token=user_123`
- Token is validated against user session
- Auto-generated deviceId for web clients

### Native Apps
- Use device token format: `ws://host/ws?token=userId:deviceId`
- Token should be obtained via device auth flow
- Stable deviceId across app restarts

## Testing

### Test with Multiple Tabs
1. Open browser DevTools Console
2. Open app in 2+ tabs
3. Execute in Console:
```javascript
// Send test credit update
fetch('/api/sync/credit-update', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'YOUR_USER_ID', // Get from console logs
    newBalance: 1000,
    change: 100,
    reason: 'Test',
  }),
});
```
4. Should see notification in ALL tabs

### Test Shoot Progress
1. Navigate to `/shoots/test-shoot-123`
2. In another tab/window, trigger progress:
```javascript
fetch('/api/sync/shoot-progress', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'YOUR_USER_ID',
    shootId: 'test-shoot-123',
    status: 'processing',
    processedCount: 50,
    totalCount: 100,
    currentImage: 'IMG_0050.jpg',
    eta: 60,
    provider: 'Test',
  }),
});
```
3. Should see live progress updates

### Monitor WebSocket
```javascript
// In browser console
const ws = new WebSocket(`ws://localhost:5000/ws?token=YOUR_USER_ID`);
ws.onmessage = (e) => console.log('Received:', JSON.parse(e.data));
ws.onopen = () => console.log('Connected');
ws.onclose = () => console.log('Disconnected');
```

## Connection Status

The `SyncIndicator` component shows:
- 🟢 **Green (solid)**: Connected
- 🟡 **Yellow (pulsing)**: Connecting/Reconnecting
- 🔴 **Red (solid)**: Disconnected

## Reconnection Logic

- Max 10 reconnection attempts
- Exponential backoff: 2^n seconds (max 30s)
- Auto-reconnect after network issues
- Manual disconnect on logout

## Performance

- Ping/pong keepalive every 30 seconds
- Automatic cleanup of dead connections
- No message queuing (real-time only)
- Lightweight JSON messages

## Security

- Token-based authentication required
- Users only receive their own messages
- Device isolation enforced
- Rate limiting recommended (TODO)

## Future Enhancements

1. **Message Persistence**
   - Queue messages for offline devices
   - Deliver on reconnection

2. **Presence System**
   - User online/offline status
   - Typing indicators

3. **Room-based Broadcasting**
   - Project/shoot-specific channels
   - Team collaboration features

4. **Message Acknowledgment**
   - Confirm delivery
   - Retry failed sends

5. **Compression**
   - Compress large messages
   - Reduce bandwidth usage

## Troubleshooting

### WebSocket won't connect
- Check token is valid
- Verify user is authenticated
- Check browser console for errors
- Ensure `/ws` path is accessible

### Messages not received
- Check connection status (SyncIndicator)
- Verify userId matches
- Check server logs for broadcasts
- Test with `/api/sync/status` endpoint

### Reconnection failures
- Check network connectivity
- Verify server is running
- Clear browser cache
- Check for max attempts exceeded

## Files Created

### Backend
- `/server/websocket.ts` - WebSocket server
- `/server/routes/sync.ts` - HTTP sync triggers
- `/server/index.ts` - Integration (modified)

### Frontend
- `/client/src/services/websocket.ts` - WebSocket client
- `/client/src/hooks/useWebSocket.ts` - React hook
- `/client/src/hooks/useShootProgress.ts` - Progress hook
- `/client/src/components/SyncIndicator.tsx` - Status indicator
- `/client/src/components/DeviceList.tsx` - Device manager
- `/client/src/pages/ShootProgress.tsx` - Progress page
- `/client/src/App.tsx` - Global integration (modified)

### Types
- `/shared/types/sync.ts` - Sync message types (existing)
- `/shared/types/device.ts` - Device types (existing)

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| WS | `/ws?token=...` | WebSocket connection |
| POST | `/api/sync/shoot-progress` | Broadcast shoot progress |
| POST | `/api/sync/credit-update` | Broadcast credit changes |
| POST | `/api/sync/prompt-change` | Broadcast prompt updates |
| GET | `/api/sync/status` | Health check |

## Success Metrics

✅ All 10 files created
✅ TypeScript compiles without errors
✅ Server starts successfully
✅ WebSocket server initialized
✅ Sync routes registered
✅ No package dependency issues
✅ Complete documentation

## Next Steps

1. **Test with real users**
   - Monitor WebSocket connections
   - Track message delivery rates
   - Measure reconnection success

2. **Add monitoring**
   - Connection count metrics
   - Message throughput
   - Error rates

3. **Implement rate limiting**
   - Prevent message spam
   - Throttle reconnection attempts

4. **Add message persistence**
   - Store messages for offline devices
   - Deliver on reconnection

5. **Create admin dashboard**
   - View active connections
   - Monitor sync health
   - Debug connection issues
