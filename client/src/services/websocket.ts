import { SyncMessage, SyncHandlers } from '@shared/types/sync';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

class WebSocketService {
  private ws: WebSocket | null = null;
  private handlers: SyncHandlers = {};
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private currentToken: string | null = null;
  private statusListeners: Set<(status: ConnectionStatus) => void> = new Set();
  private connectionStatus: ConnectionStatus = 'disconnected';

  private setStatus(status: ConnectionStatus) {
    this.connectionStatus = status;
    this.statusListeners.forEach(listener => listener(status));
  }

  public getStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  public onStatusChange(listener: (status: ConnectionStatus) => void) {
    this.statusListeners.add(listener);
    // Immediately call with current status
    listener(this.connectionStatus);

    return () => {
      this.statusListeners.delete(listener);
    };
  }

  connect(token: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('[WS Client] Already connected');
      return;
    }

    this.currentToken = token;
    this.setStatus('connecting');

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${window.location.host}/ws?token=${encodeURIComponent(token)}`;

    console.log('[WS Client] Connecting to WebSocket...');
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log('[WS Client] Connected successfully');
      this.reconnectAttempts = 0;
      this.setStatus('connected');
    };

    this.ws.onmessage = (event) => {
      try {
        const message: SyncMessage = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (err) {
        console.error('[WS Client] Failed to parse message:', err);
      }
    };

    this.ws.onerror = (error) => {
      console.error('[WS Client] WebSocket error:', error);
    };

    this.ws.onclose = (event) => {
      console.log('[WS Client] Disconnected:', event.code, event.reason);
      this.setStatus('disconnected');

      // Only attempt reconnect if we have a token and haven't exceeded max attempts
      if (this.currentToken) {
        this.attemptReconnect(this.currentToken);
      }
    };
  }

  disconnect() {
    console.log('[WS Client] Manually disconnecting');
    this.currentToken = null; // Clear token to prevent reconnection

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.setStatus('disconnected');
    this.reconnectAttempts = 0;
  }

  private attemptReconnect(token: string) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WS Client] Max reconnect attempts reached');
      this.setStatus('disconnected');
      return;
    }

    this.reconnectAttempts++;
    this.setStatus('reconnecting');

    // Exponential backoff with max delay of 30 seconds
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    console.log(`[WS Client] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    this.reconnectTimeout = setTimeout(() => {
      this.connect(token);
    }, delay);
  }

  private handleMessage(message: SyncMessage) {
    console.log('[WS Client] Received message:', message.type);

    switch (message.type) {
      case 'SHOOT_PROGRESS':
        this.handlers.onShootProgress?.(message.data);
        break;
      case 'CREDIT_UPDATE':
        this.handlers.onCreditUpdate?.(message.data);
        break;
      case 'PROMPT_CHANGE':
        this.handlers.onPromptChange?.(message.data);
        break;
      case 'DEVICE_CONNECTED':
        this.handlers.onDeviceConnected?.(message.data);
        break;
      case 'DEVICE_DISCONNECTED':
        this.handlers.onDeviceDisconnected?.(message.data);
        break;
      case 'ADMIN_SESSION_UPDATE':
        this.handlers.onAdminSessionUpdate?.(message.data);
        break;
      case 'PONG':
        // Keepalive response received
        console.log('[WS Client] Pong received');
        break;
      default:
        console.warn('[WS Client] Unknown message type:', message.type);
    }
  }

  on(handlers: SyncHandlers) {
    this.handlers = { ...this.handlers, ...handlers };
  }

  send(type: string, payload: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const message = { type, payload };
      this.ws.send(JSON.stringify(message));
      console.log('[WS Client] Sent:', type);
    } else {
      console.error('[WS Client] Cannot send, not connected. Status:', this.connectionStatus);
    }
  }

  ping() {
    this.send('PING', {});
  }

  // Send progress update from client (for native apps)
  sendProgress(shootId: string, progressData: any) {
    this.send('UPDATE_PROGRESS', { shootId, ...progressData });
  }
}

// Export singleton instance
export const wsService = new WebSocketService();
