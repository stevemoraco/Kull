# WebSocket Sync - Quick Reference

## 🚀 Quick Start

### Connect from Web App
```typescript
import { useWebSocket } from '@/hooks/useWebSocket';

function MyComponent() {
  useWebSocket({
    onCreditUpdate: (data) => {
      console.log('Credits updated:', data.newBalance);
    },
  });
}
```

### Connect from Native App
```typescript
const ws = new WebSocket(`wss://kull.ai/ws?token=userId:deviceId`);
ws.onmessage = (e) => handleMessage(JSON.parse(e.data));
```

### Trigger Sync from Server
```bash
curl -X POST http://localhost:5000/api/sync/credit-update \
  -H "Content-Type: application/json" \
  -d '{"userId":"user_123","newBalance":1000,"change":100,"reason":"Test"}'
```

## 📡 Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| WS | `/ws?token=xxx` | WebSocket connection |
| POST | `/api/sync/shoot-progress` | Broadcast progress |
| POST | `/api/sync/credit-update` | Broadcast credits |
| POST | `/api/sync/prompt-change` | Broadcast prompts |
| GET | `/api/sync/status` | Health check |

## 🎯 Message Types

### Client Receives
- `SHOOT_PROGRESS` - Processing updates
- `CREDIT_UPDATE` - Balance changes
- `PROMPT_CHANGE` - Marketplace updates
- `DEVICE_CONNECTED` - Device online
- `DEVICE_DISCONNECTED` - Device offline
- `PONG` - Keepalive response

### Client Sends
- `PING` - Keepalive ping
- `UPDATE_PROGRESS` - Progress update

## 🔧 Components

```typescript
import { SyncIndicator } from '@/components/SyncIndicator';
import { DeviceList } from '@/components/DeviceList';
import { useShootProgress } from '@/hooks/useShootProgress';

// Show connection status
<SyncIndicator />

// Show connected devices
<DeviceList />

// Track shoot progress
const { progress, progressPercentage } = useShootProgress(shootId);
```

## 🎨 Connection Status

| Color | Status | Meaning |
|-------|--------|---------|
| 🟢 Green | connected | Synced |
| 🟡 Yellow | connecting | Connecting |
| 🟡 Yellow | reconnecting | Retrying |
| 🔴 Red | disconnected | Offline |

## 🧪 Test Commands

```javascript
// Test credit update (in browser console)
fetch('/api/sync/credit-update', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'YOUR_USER_ID',
    newBalance: 1000,
    change: 100,
    reason: 'Test'
  })
});

// Test shoot progress
fetch('/api/sync/shoot-progress', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'YOUR_USER_ID',
    shootId: 'test-123',
    status: 'processing',
    processedCount: 50,
    totalCount: 100,
    currentImage: 'IMG_0050.jpg',
    eta: 60,
    provider: 'Test'
  })
});

// Monitor WebSocket
const ws = new WebSocket('ws://localhost:5000/ws?token=test-user');
ws.onmessage = (e) => console.log('📨', JSON.parse(e.data));
```

## 📁 File Locations

```
server/
  websocket.ts              # WebSocket server
  routes/sync.ts            # Sync HTTP routes
  index.ts                  # Integration (modified)

client/src/
  services/websocket.ts     # WebSocket client
  hooks/
    useWebSocket.ts         # React hook
    useShootProgress.ts     # Progress hook
  components/
    SyncIndicator.tsx       # Status indicator
    DeviceList.tsx          # Device manager
  pages/
    ShootProgress.tsx       # Progress page
  App.tsx                   # Global integration

shared/types/
  sync.ts                   # Sync types
  device.ts                 # Device types
```

## 🔒 Token Formats

- **Web**: `userId` (e.g., `user_123`)
- **Device**: `userId:deviceId` (e.g., `user_123:iphone_456`)

## ⚙️ Configuration

```typescript
// Reconnection settings
maxReconnectAttempts: 10
reconnectDelay: Math.min(1000 * 2^n, 30000)

// Keepalive
pingInterval: 30000 // 30 seconds

// Connection
path: '/ws'
protocol: ws:// or wss://
```

## 🐛 Debugging

```javascript
// Check connection
wsService.getStatus() // 'connected' | 'disconnected' | 'connecting' | 'reconnecting'

// Monitor status changes
wsService.onStatusChange((status) => console.log('Status:', status));

// Enable verbose logs
localStorage.setItem('debug', 'ws:*');
```

## 📊 Health Check

```bash
# Check sync service
curl http://localhost:5000/api/sync/status

# Expected response
{"status":"ok","timestamp":1234567890,"service":"websocket-sync"}
```

## 🎭 Example: Full Integration

```typescript
import { useWebSocket } from '@/hooks/useWebSocket';
import { SyncIndicator } from '@/components/SyncIndicator';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

function App() {
  const { toast } = useToast();

  useWebSocket({
    onShootProgress: (data) => {
      console.log('Progress:', data);
    },
    onCreditUpdate: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/credits'] });
      toast({
        title: 'Credits Updated',
        description: `New balance: ${data.newBalance}`,
      });
    },
    onDeviceConnected: (data) => {
      toast({
        title: 'Device Connected',
        description: data.deviceName,
      });
    },
  });

  return (
    <div>
      <Header>
        <SyncIndicator />
      </Header>
      <Content />
    </div>
  );
}
```

## 🔗 Resources

- Full Guide: `WEBSOCKET_SYNC_GUIDE.md`
- Implementation Summary: `SYNC_IMPLEMENTATION_SUMMARY.md`
- Interactive Tester: `websocket-test.html`

## 💡 Tips

1. **Always check connection status** before sending messages
2. **Use deviceId** for device-specific targeting
3. **Include timestamp** in custom messages
4. **Handle reconnection** gracefully in UI
5. **Test with multiple tabs** to verify broadcasting
6. **Monitor logs** for connection issues
7. **Use health check** to verify service is running

## ⚠️ Common Issues

### WebSocket won't connect
- Check token is valid
- Verify `/ws` path is accessible
- Check for auth errors in console

### Messages not received
- Check connection status
- Verify userId matches
- Check server logs

### Reconnection fails
- Check network connectivity
- Verify max attempts not exceeded
- Clear browser cache

## 📞 Support

For issues or questions:
1. Check browser console for errors
2. Check server logs for WebSocket messages
3. Use `websocket-test.html` to debug
4. Review `WEBSOCKET_SYNC_GUIDE.md` for details

---

**Built by:** SYNC Agent
**Date:** 2025-11-04
**Status:** ✅ Production Ready
