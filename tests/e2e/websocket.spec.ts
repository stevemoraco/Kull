import { test, expect } from '@playwright/test';
import WebSocket from 'ws';
import type { SyncMessage } from '@shared/types/sync';

test.describe('WebSocket Real-Time Sync E2E Tests', () => {
  const WS_URL = process.env.PLAYWRIGHT_BASE_URL?.replace('http', 'ws') || 'ws://localhost:5000';

  test('should reject connection without token', async () => {
    const ws = new WebSocket(`${WS_URL}/ws`);

    const closePromise = new Promise<{ code: number; reason: string }>((resolve) => {
      ws.on('close', (code, reason) => {
        resolve({ code, reason: reason.toString() });
      });
    });

    const result = await closePromise;
    expect(result.code).toBe(4001); // Custom close code for no token
  });

  test('should accept connection with valid token', async () => {
    const testUserId = `test-user-${Date.now()}`;
    const testDeviceId = `test-device-${Date.now()}`;
    const token = `${testUserId}:${testDeviceId}`;

    const ws = new WebSocket(`${WS_URL}/ws?token=${token}`);

    const openPromise = new Promise<void>((resolve, reject) => {
      ws.on('open', () => resolve());
      ws.on('error', reject);
      setTimeout(() => reject(new Error('Connection timeout')), 5000);
    });

    await openPromise;

    // Should receive DEVICE_CONNECTED message
    const messagePromise = new Promise<SyncMessage>((resolve) => {
      ws.on('message', (data) => {
        const message = JSON.parse(data.toString()) as SyncMessage;
        if (message.type === 'DEVICE_CONNECTED') {
          resolve(message);
        }
      });
    });

    const connectedMsg = await messagePromise;
    expect(connectedMsg.type).toBe('DEVICE_CONNECTED');
    expect(connectedMsg.deviceId).toBe(testDeviceId);
    expect(connectedMsg.userId).toBe(testUserId);

    ws.close();
  });

  test('should handle ping-pong messages', async () => {
    const testUserId = `test-user-${Date.now()}`;
    const testDeviceId = `test-device-${Date.now()}`;
    const token = `${testUserId}:${testDeviceId}`;

    const ws = new WebSocket(`${WS_URL}/ws?token=${token}`);

    await new Promise<void>((resolve, reject) => {
      ws.on('open', () => resolve());
      ws.on('error', reject);
      setTimeout(() => reject(new Error('Connection timeout')), 5000);
    });

    // Skip the initial DEVICE_CONNECTED message
    await new Promise<void>((resolve) => {
      ws.once('message', () => resolve());
    });

    // Send PING
    ws.send(JSON.stringify({ type: 'PING' }));

    // Wait for PONG
    const pongPromise = new Promise<SyncMessage>((resolve) => {
      ws.on('message', (data) => {
        const message = JSON.parse(data.toString()) as SyncMessage;
        if (message.type === 'PONG') {
          resolve(message);
        }
      });
    });

    const pongMsg = await pongPromise;
    expect(pongMsg.type).toBe('PONG');
    expect(pongMsg.timestamp).toBeGreaterThan(Date.now() - 5000);

    ws.close();
  });

  test('should broadcast progress updates to multiple devices', async () => {
    const testUserId = `test-user-${Date.now()}`;
    const device1Id = `device1-${Date.now()}`;
    const device2Id = `device2-${Date.now()}`;

    // Connect two devices for the same user
    const ws1 = new WebSocket(`${WS_URL}/ws?token=${testUserId}:${device1Id}`);
    const ws2 = new WebSocket(`${WS_URL}/ws?token=${testUserId}:${device2Id}`);

    // Wait for both to connect
    await Promise.all([
      new Promise<void>((resolve, reject) => {
        ws1.on('open', () => resolve());
        ws1.on('error', reject);
        setTimeout(() => reject(new Error('Connection timeout')), 5000);
      }),
      new Promise<void>((resolve, reject) => {
        ws2.on('open', () => resolve());
        ws2.on('error', reject);
        setTimeout(() => reject(new Error('Connection timeout')), 5000);
      }),
    ]);

    // Skip initial DEVICE_CONNECTED messages on both
    await Promise.all([
      new Promise<void>((resolve) => ws1.once('message', () => resolve())),
      new Promise<void>((resolve) => ws2.once('message', () => resolve())),
    ]);

    // Device 1 sends progress update
    const progressUpdate = {
      type: 'UPDATE_PROGRESS',
      payload: {
        shootId: 'shoot-123',
        status: 'processing',
        processedCount: 50,
        totalCount: 100,
        provider: 'openai',
      },
    };

    ws1.send(JSON.stringify(progressUpdate));

    // Both devices should receive SHOOT_PROGRESS message
    const device1ProgressPromise = new Promise<SyncMessage>((resolve) => {
      ws1.on('message', (data) => {
        const message = JSON.parse(data.toString()) as SyncMessage;
        if (message.type === 'SHOOT_PROGRESS') {
          resolve(message);
        }
      });
    });

    const device2ProgressPromise = new Promise<SyncMessage>((resolve) => {
      ws2.on('message', (data) => {
        const message = JSON.parse(data.toString()) as SyncMessage;
        if (message.type === 'SHOOT_PROGRESS') {
          resolve(message);
        }
      });
    });

    const [device1Progress, device2Progress] = await Promise.all([
      device1ProgressPromise,
      device2ProgressPromise,
    ]);

    // Verify both received the same progress update
    expect(device1Progress.type).toBe('SHOOT_PROGRESS');
    expect(device1Progress.data.shootId).toBe('shoot-123');
    expect(device1Progress.data.processedCount).toBe(50);

    expect(device2Progress.type).toBe('SHOOT_PROGRESS');
    expect(device2Progress.data.shootId).toBe('shoot-123');
    expect(device2Progress.data.processedCount).toBe(50);

    ws1.close();
    ws2.close();
  });

  test('should send DEVICE_DISCONNECTED when device closes connection', async () => {
    const testUserId = `test-user-${Date.now()}`;
    const device1Id = `device1-${Date.now()}`;
    const device2Id = `device2-${Date.now()}`;

    // Connect two devices
    const ws1 = new WebSocket(`${WS_URL}/ws?token=${testUserId}:${device1Id}`);
    const ws2 = new WebSocket(`${WS_URL}/ws?token=${testUserId}:${device2Id}`);

    // Wait for both to connect
    await Promise.all([
      new Promise<void>((resolve, reject) => {
        ws1.on('open', () => resolve());
        ws1.on('error', reject);
        setTimeout(() => reject(new Error('Connection timeout')), 5000);
      }),
      new Promise<void>((resolve, reject) => {
        ws2.on('open', () => resolve());
        ws2.on('error', reject);
        setTimeout(() => reject(new Error('Connection timeout')), 5000);
      }),
    ]);

    // Skip initial messages
    await Promise.all([
      new Promise<void>((resolve) => ws1.once('message', () => resolve())),
      new Promise<void>((resolve) => ws2.once('message', () => resolve())),
    ]);

    // Device 2 waits for disconnection message
    const disconnectPromise = new Promise<SyncMessage>((resolve) => {
      ws2.on('message', (data) => {
        const message = JSON.parse(data.toString()) as SyncMessage;
        if (message.type === 'DEVICE_DISCONNECTED') {
          resolve(message);
        }
      });
    });

    // Device 1 disconnects
    ws1.close();

    // Device 2 should receive DEVICE_DISCONNECTED
    const disconnectMsg = await disconnectPromise;
    expect(disconnectMsg.type).toBe('DEVICE_DISCONNECTED');
    expect(disconnectMsg.data.deviceId).toBe(device1Id);

    ws2.close();
  });

  test('should handle web session token format (no colon)', async () => {
    const testUserId = `web-user-${Date.now()}`;
    const token = testUserId; // Web format, no device ID

    const ws = new WebSocket(`${WS_URL}/ws?token=${token}`);

    const openPromise = new Promise<void>((resolve, reject) => {
      ws.on('open', () => resolve());
      ws.on('error', reject);
      setTimeout(() => reject(new Error('Connection timeout')), 5000);
    });

    await openPromise;

    // Should receive DEVICE_CONNECTED message
    const messagePromise = new Promise<SyncMessage>((resolve) => {
      ws.on('message', (data) => {
        const message = JSON.parse(data.toString()) as SyncMessage;
        if (message.type === 'DEVICE_CONNECTED') {
          resolve(message);
        }
      });
    });

    const connectedMsg = await messagePromise;
    expect(connectedMsg.type).toBe('DEVICE_CONNECTED');
    expect(connectedMsg.userId).toBe(testUserId);
    expect(connectedMsg.deviceId).toContain('web-'); // Auto-generated device ID

    ws.close();
  });

  test('should maintain connection with periodic pings', async () => {
    const testUserId = `test-user-${Date.now()}`;
    const testDeviceId = `test-device-${Date.now()}`;
    const token = `${testUserId}:${testDeviceId}`;

    const ws = new WebSocket(`${WS_URL}/ws?token=${token}`);

    await new Promise<void>((resolve, reject) => {
      ws.on('open', () => resolve());
      ws.on('error', reject);
      setTimeout(() => reject(new Error('Connection timeout')), 5000);
    });

    // Skip initial message
    await new Promise<void>((resolve) => {
      ws.once('message', () => resolve());
    });

    let pongCount = 0;
    ws.on('message', (data) => {
      const message = JSON.parse(data.toString()) as SyncMessage;
      if (message.type === 'PONG') {
        pongCount++;
      }
    });

    // Send multiple pings over time
    for (let i = 0; i < 3; i++) {
      ws.send(JSON.stringify({ type: 'PING' }));
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Wait a bit for all responses
    await new Promise((resolve) => setTimeout(resolve, 500));

    expect(pongCount).toBeGreaterThanOrEqual(3);

    ws.close();
  });

  test('should reject invalid token format', async () => {
    const ws = new WebSocket(`${WS_URL}/ws?token=`);

    const closePromise = new Promise<{ code: number }>((resolve) => {
      ws.on('close', (code) => {
        resolve({ code });
      });
    });

    const result = await closePromise;
    expect(result.code).toBe(4002); // Custom close code for invalid token
  });

  test('should handle multiple rapid connections and disconnections', async () => {
    const testUserId = `stress-user-${Date.now()}`;
    const connections: WebSocket[] = [];

    // Create 10 connections rapidly
    for (let i = 0; i < 10; i++) {
      const deviceId = `stress-device-${i}`;
      const ws = new WebSocket(`${WS_URL}/ws?token=${testUserId}:${deviceId}`);
      connections.push(ws);
    }

    // Wait for all to connect
    await Promise.all(
      connections.map(
        (ws) =>
          new Promise<void>((resolve, reject) => {
            ws.on('open', () => resolve());
            ws.on('error', reject);
            setTimeout(() => reject(new Error('Connection timeout')), 5000);
          })
      )
    );

    // All should be open
    expect(connections.every((ws) => ws.readyState === WebSocket.OPEN)).toBe(true);

    // Close all connections
    connections.forEach((ws) => ws.close());

    // Wait for all to close
    await Promise.all(
      connections.map(
        (ws) =>
          new Promise<void>((resolve) => {
            if (ws.readyState === WebSocket.CLOSED) {
              resolve();
            } else {
              ws.on('close', () => resolve());
            }
          })
      )
    );

    // All should be closed
    expect(connections.every((ws) => ws.readyState === WebSocket.CLOSED)).toBe(true);
  });
});
