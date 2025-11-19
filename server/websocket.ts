import { WebSocketServer, WebSocket } from 'ws';
import { SyncMessage, SyncMessageType } from '@shared/types/sync';
import type { Server } from 'http';
import { config } from './config/environment';

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  deviceId?: string;
  isAlive?: boolean;
}

export interface WebSocketService {
  broadcastToUser(userId: string, message: SyncMessage, excludeDeviceId?: string): void;
  sendToDevice(userId: string, deviceId: string, message: SyncMessage): void;
  broadcastToAdmins(message: SyncMessage): void;
}

// Global singleton for WebSocket service (set during initialization)
let globalWsService: WebSocketService | null = null;

export function setGlobalWsService(service: WebSocketService) {
  globalWsService = service;
}

export function getGlobalWsService(): WebSocketService | null {
  return globalWsService;
}

export function setupWebSocketServer(server: Server): WebSocketService {
  const wss = new WebSocketServer({ server, path: '/ws' });

  // Map of userId -> Set of WebSocket connections
  const userConnections = new Map<string, Set<AuthenticatedWebSocket>>();

  // PERFORMANCE FIX: Message batching for high-throughput scenarios
  const messageQueue = new Map<string, SyncMessage[]>();
  const BATCH_INTERVAL = 50; // ms - batch messages every 50ms
  let batchingEnabled = false; // Enable batching under high load

  console.log('[WebSocket] Server initialized on path /ws');

  wss.on('connection', async (ws: AuthenticatedWebSocket, req) => {
    console.log('[WS] New connection attempt');

    // Auth: Extract token from query or header
    const url = new URL(req.url!, `http://${req.headers.host}`);
    const token = url.searchParams.get('token') || req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      console.log('[WS] Connection rejected: No token provided');
      ws.close(4001, 'No token provided');
      return;
    }

    try {
      // Token format options:
      // 1. "userId:deviceId" for device apps
      // 2. Session token/userId for web apps
      let userId: string;
      let deviceId: string;

      // Check if it's a device token format (userId:deviceId)
      if (token.includes(':')) {
        const parts = token.split(':');
        userId = parts[0];
        deviceId = parts[1];
      } else {
        // For web sessions, use the token/userId directly
        // The token would be the user's session ID or user ID
        userId = token;
        deviceId = `web-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      }

      if (!userId) {
        throw new Error('Invalid token format');
      }

      ws.userId = userId;
      ws.deviceId = deviceId;
      ws.isAlive = true;

      // Add to user's connection pool
      if (!userConnections.has(ws.userId)) {
        userConnections.set(ws.userId, new Set());
      }
      userConnections.get(ws.userId)!.add(ws);

      console.log(`[WS] Client connected: userId=${ws.userId}, deviceId=${ws.deviceId}, total connections=${userConnections.get(ws.userId)!.size}`);

      // Send initial connection confirmation
      const connectedMsg: SyncMessage = {
        type: 'DEVICE_CONNECTED',
        data: {
          deviceId: ws.deviceId,
          timestamp: Date.now()
        },
        timestamp: Date.now(),
        deviceId: ws.deviceId!,
        userId: ws.userId,
      };
      ws.send(JSON.stringify(connectedMsg));

      // Notify other devices that this device connected
      broadcastToUser(ws.userId, connectedMsg, ws.deviceId);

      // Handle incoming messages
      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString());
          await handleClientMessage(ws, message);
        } catch (err) {
          console.error('[WS] Message parse error:', err);
        }
      });

      // Handle disconnect
      ws.on('close', () => {
        console.log(`[WS] Client disconnected: userId=${ws.userId}, deviceId=${ws.deviceId}`);

        if (ws.userId && userConnections.has(ws.userId)) {
          userConnections.get(ws.userId)!.delete(ws);
          if (userConnections.get(ws.userId)!.size === 0) {
            userConnections.delete(ws.userId);
          }

          // Notify other devices
          const disconnectedMsg: SyncMessage = {
            type: 'DEVICE_DISCONNECTED',
            data: {
              deviceId: ws.deviceId,
              timestamp: Date.now()
            },
            timestamp: Date.now(),
            deviceId: ws.deviceId!,
            userId: ws.userId,
          };
          broadcastToUser(ws.userId, disconnectedMsg);
        }

        // PERFORMANCE FIX: Clean up event listeners to prevent memory leaks
        ws.removeAllListeners('message');
        ws.removeAllListeners('error');
        ws.removeAllListeners('pong');
        ws.removeAllListeners('close');
      });

      // Handle errors
      ws.on('error', (error) => {
        console.error(`[WS] Error for userId=${ws.userId}:`, error);
      });

      // Ping/pong for keepalive
      ws.on('pong', () => {
        ws.isAlive = true;
      });

    } catch (err) {
      console.error('[WS] Auth failed:', err);
      ws.close(4002, 'Invalid token');
    }
  });

  // PERFORMANCE FIX: Message batching interval
  const batchInterval = setInterval(() => {
    if (messageQueue.size === 0) return;

    for (const [userId, messages] of Array.from(messageQueue.entries())) {
      if (messages.length === 0) continue;

      const connections = userConnections.get(userId);
      if (!connections) {
        messageQueue.delete(userId);
        continue;
      }

      // Send batched messages
      connections.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          // Send as a batch if batching is enabled and we have multiple messages
          if (batchingEnabled && messages.length > 1) {
            ws.send(JSON.stringify({
              type: 'BATCH',
              messages,
              timestamp: Date.now()
            }));
          } else {
            // Send individually if batching is disabled or single message
            messages.forEach(msg => ws.send(JSON.stringify(msg)));
          }
        }
      });

      // Clear queue for this user
      messageQueue.set(userId, []);
    }
  }, BATCH_INTERVAL);

  // Keepalive ping interval (30 seconds)
  const pingInterval = setInterval(() => {
    wss.clients.forEach((ws: any) => {
      if (ws.isAlive === false) {
        console.log('[WS] Terminating inactive connection');
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(pingInterval);
    clearInterval(batchInterval);
    messageQueue.clear();
    console.log('[WebSocket] Server closed');
  });

  // Broadcast helpers
  function broadcastToUser(userId: string, message: SyncMessage, excludeDeviceId?: string) {
    const connections = userConnections.get(userId);
    if (!connections) {
      console.log(`[WS] No connections found for userId=${userId}`);
      return;
    }

    // Send immediately (batching disabled by default for now - can be enabled for high-load scenarios)
    const msgStr = JSON.stringify(message);
    let sentCount = 0;

    connections.forEach(ws => {
      if (ws.deviceId !== excludeDeviceId && ws.readyState === WebSocket.OPEN) {
        ws.send(msgStr);
        sentCount++;
      }
    });

    console.log(`[WS] Broadcasted ${message.type} to ${sentCount} devices for userId=${userId}`);
  }

  function sendToDevice(userId: string, deviceId: string, message: SyncMessage) {
    const connections = userConnections.get(userId);
    if (!connections) {
      console.log(`[WS] No connections found for userId=${userId}`);
      return;
    }

    const msgStr = JSON.stringify(message);
    let sent = false;

    connections.forEach(ws => {
      if (ws.deviceId === deviceId && ws.readyState === WebSocket.OPEN) {
        ws.send(msgStr);
        sent = true;
      }
    });

    if (sent) {
      console.log(`[WS] Sent ${message.type} to device ${deviceId} for userId=${userId}`);
    } else {
      console.log(`[WS] Device ${deviceId} not found or not connected for userId=${userId}`);
    }
  }

  async function handleClientMessage(ws: AuthenticatedWebSocket, message: any) {
    console.log('[WS] Message from client:', message.type, 'userId:', ws.userId);

    switch (message.type) {
      case 'PING':
        ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
        break;

      case 'UPDATE_PROGRESS':
        // Client (native app) sends shoot progress update
        const progressMsg: SyncMessage = {
          type: 'SHOOT_PROGRESS',
          data: message.payload,
          timestamp: Date.now(),
          deviceId: ws.deviceId!,
          userId: ws.userId,
        };
        // Broadcast to all user's devices (including sender for confirmation)
        broadcastToUser(ws.userId!, progressMsg);
        break;

      default:
        console.warn('[WS] Unknown message type:', message.type);
    }
  }

  function broadcastToAdmins(message: SyncMessage) {
    // Broadcast to all admin users
    broadcastToUser(config.adminUserId, message);
  }

  const service = {
    broadcastToUser,
    sendToDevice,
    broadcastToAdmins,
  };

  // Set global singleton
  setGlobalWsService(service);

  return service;
}
