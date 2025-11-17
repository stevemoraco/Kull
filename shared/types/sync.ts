// Real-time sync types for WebSocket communication between devices and server

export type SyncMessageType =
  | 'SHOOT_PROGRESS'
  | 'CREDIT_UPDATE'
  | 'PROMPT_CHANGE'
  | 'DEVICE_CONNECTED'
  | 'DEVICE_DISCONNECTED'
  | 'ADMIN_SESSION_UPDATE'
  | 'PING'
  | 'PONG';

export type ShootStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface SyncMessage<T = any> {
  type: SyncMessageType;
  data: T;
  timestamp: number;
  deviceId: string;
  userId?: string;
}

export interface ShootProgressData {
  shootId: string;
  status: ShootStatus;
  processedCount: number;
  totalCount: number;
  currentImage?: string;
  eta?: number; // seconds remaining
  provider: string;
  errorMessage?: string;
}

export interface CreditUpdateData {
  userId: string;
  newBalance: number;
  change: number; // positive or negative
  reason: string;
}

export interface PromptChangeData {
  promptId: string;
  action: 'created' | 'updated' | 'deleted' | 'voted';
}

export interface DeviceConnectionData {
  deviceId: string;
  platform: string;
  deviceName: string;
  connectedAt: number;
}

export interface AdminSessionUpdateData {
  sessionId: string;
  userId?: string;
  userEmail?: string;
  action: 'new_message' | 'session_updated';
  messageCount?: number;
}

export interface WebSocketClientMessage {
  type: 'SUBSCRIBE' | 'UNSUBSCRIBE' | 'UPDATE_PROGRESS' | 'PING';
  payload?: any;
}

export interface WebSocketServerMessage {
  type: SyncMessageType;
  payload: any;
  timestamp: number;
}

// Utility types for type-safe message handling
export type SyncHandler<T> = (data: T) => void | Promise<void>;

export interface SyncHandlers {
  onShootProgress?: SyncHandler<ShootProgressData>;
  onCreditUpdate?: SyncHandler<CreditUpdateData>;
  onPromptChange?: SyncHandler<PromptChangeData>;
  onDeviceConnected?: SyncHandler<DeviceConnectionData>;
  onDeviceDisconnected?: SyncHandler<DeviceConnectionData>;
  onAdminSessionUpdate?: SyncHandler<AdminSessionUpdateData>;
}
