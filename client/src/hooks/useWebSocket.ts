import { useEffect, useState } from 'react';
import { wsService, ConnectionStatus } from '../services/websocket';
import { SyncHandlers } from '@shared/types/sync';
import { useAuth } from './useAuth';

export function useWebSocket(handlers: SyncHandlers) {
  const { user, isAuthenticated } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');

  useEffect(() => {
    if (!isAuthenticated || !user) {
      console.log('[useWebSocket] Not authenticated, skipping WebSocket connection');
      return;
    }

    // Get token - try localStorage first (device token), fallback to user session
    let token = localStorage.getItem('device_token');
    if (!token && user.id) {
      // For web sessions, use userId as token (temporary until proper JWT is implemented)
      token = user.id;
    }

    if (!token) {
      console.warn('[useWebSocket] No token available for WebSocket connection');
      return;
    }

    console.log('[useWebSocket] Connecting to WebSocket');
    wsService.connect(token);
    wsService.on(handlers);

    // Subscribe to status changes
    const unsubscribe = wsService.onStatusChange(setConnectionStatus);

    // Ping every 30 seconds to keep connection alive
    const pingInterval = setInterval(() => {
      if (wsService.getStatus() === 'connected') {
        wsService.ping();
      }
    }, 30000);

    return () => {
      console.log('[useWebSocket] Cleaning up WebSocket connection');
      clearInterval(pingInterval);
      unsubscribe();
      wsService.disconnect();
    };
  }, [isAuthenticated, user?.id]); // Don't include handlers in deps to avoid reconnections

  // Update handlers when they change
  useEffect(() => {
    wsService.on(handlers);
  }, [handlers]);

  return {
    connectionStatus,
    isConnected: connectionStatus === 'connected',
    isReconnecting: connectionStatus === 'reconnecting',
  };
}
