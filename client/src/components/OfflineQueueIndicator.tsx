/**
 * OfflineQueueIndicator.tsx
 *
 * Visual indicator for offline operations queue and sync status
 * Shows badge when operations are queued and provides detailed queue view
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  CloudOff,
  Cloud,
  RefreshCw,
  Clock,
  AlertCircle,
  Trash2,
  CheckCircle,
} from 'lucide-react';

// Queue operation types matching backend
type OperationType =
  | 'votePrompt'
  | 'addFolder'
  | 'removeFolder'
  | 'updateSettings'
  | 'purchaseCredits'
  | 'submitReport';

// Queued operation structure
interface QueuedOperation {
  id: string;
  type: OperationType;
  payload: any;
  createdAt: number;
  retryCount: number;
  lastError?: string;
}

// Queue state interface
interface QueueState {
  operations: QueuedOperation[];
  isSyncing: boolean;
  lastSyncDate: number | null;
}

// Operation type display names
const OPERATION_LABELS: Record<OperationType, string> = {
  votePrompt: 'Vote on Prompt',
  addFolder: 'Add Folder',
  removeFolder: 'Remove Folder',
  updateSettings: 'Update Settings',
  purchaseCredits: 'Purchase Credits',
  submitReport: 'Submit Report',
};

// LocalStorage key for queue persistence
const QUEUE_STORAGE_KEY = 'offline_operation_queue';
const MAX_RETRIES = 3;

export function OfflineQueueIndicator() {
  const [isOpen, setIsOpen] = useState(false);
  const [queue, setQueue] = useState<QueueState>({
    operations: [],
    isSyncing: false,
    lastSyncDate: null,
  });
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { toast } = useToast();

  // Load queue from localStorage on mount
  useEffect(() => {
    loadQueue();
  }, []);

  // Save queue to localStorage whenever it changes
  useEffect(() => {
    saveQueue();
  }, [queue]);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      console.log('[OfflineQueue] Network connected');
      setIsOnline(true);
      syncQueue();
    };

    const handleOffline = () => {
      console.log('[OfflineQueue] Network disconnected');
      setIsOnline(false);
      toast({
        title: 'You are offline',
        description: 'Changes will sync automatically when connection is restored',
        variant: 'default',
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load queue from localStorage
  const loadQueue = useCallback(() => {
    try {
      const stored = localStorage.getItem(QUEUE_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as QueueState;
        setQueue(parsed);
      }
    } catch (error) {
      console.error('[OfflineQueue] Failed to load queue:', error);
    }
  }, []);

  // Save queue to localStorage
  const saveQueue = useCallback(() => {
    try {
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
    } catch (error) {
      console.error('[OfflineQueue] Failed to save queue:', error);
    }
  }, [queue]);

  // Add operation to queue
  const enqueueOperation = useCallback((type: OperationType, payload: any) => {
    const operation: QueuedOperation = {
      id: crypto.randomUUID(),
      type,
      payload,
      createdAt: Date.now(),
      retryCount: 0,
    };

    setQueue((prev) => ({
      ...prev,
      operations: [...prev.operations, operation],
    }));

    console.log('[OfflineQueue] Enqueued operation:', type);
  }, []);

  // Remove operation from queue
  const removeOperation = useCallback((id: string) => {
    setQueue((prev) => ({
      ...prev,
      operations: prev.operations.filter((op) => op.id !== id),
    }));
  }, []);

  // Clear entire queue
  const clearQueue = useCallback(() => {
    setQueue({
      operations: [],
      isSyncing: false,
      lastSyncDate: queue.lastSyncDate,
    });

    toast({
      title: 'Queue cleared',
      description: 'All pending operations have been removed',
    });
  }, [queue.lastSyncDate]);

  // Execute a single operation
  const executeOperation = useCallback(async (operation: QueuedOperation) => {
    // Map operation types to API endpoints
    const endpointMap: Record<OperationType, { method: string; endpoint: (op: QueuedOperation) => string }> = {
      votePrompt: {
        method: 'POST',
        endpoint: (op) => `/api/prompts/${op.payload.promptId}/vote`,
      },
      addFolder: {
        method: 'POST',
        endpoint: () => '/api/sync/folders',
      },
      removeFolder: {
        method: 'DELETE',
        endpoint: (op) => `/api/sync/folders/${encodeURIComponent(op.payload.folderPath)}`,
      },
      updateSettings: {
        method: 'PUT',
        endpoint: () => '/api/settings',
      },
      purchaseCredits: {
        method: 'POST',
        endpoint: () => '/api/credits/purchase',
      },
      submitReport: {
        method: 'POST',
        endpoint: () => '/api/reports',
      },
    };

    const config = endpointMap[operation.type];
    const endpoint = config.endpoint(operation);

    const response = await fetch(endpoint, {
      method: config.method,
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: config.method !== 'DELETE' ? JSON.stringify(operation.payload) : undefined,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    console.log('[OfflineQueue] Successfully executed operation:', operation.type);
  }, []);

  // Sync all queued operations
  const syncQueue = useCallback(async () => {
    if (queue.isSyncing || queue.operations.length === 0 || !isOnline) {
      return;
    }

    console.log('[OfflineQueue] Starting sync of', queue.operations.length, 'operations');

    setQueue((prev) => ({ ...prev, isSyncing: true }));

    let successCount = 0;
    let failureCount = 0;
    const remainingOps: QueuedOperation[] = [];

    for (const operation of queue.operations) {
      try {
        await executeOperation(operation);
        successCount++;
      } catch (error) {
        console.error('[OfflineQueue] Failed to execute operation:', operation.type, error);
        failureCount++;

        // Update retry count
        const updatedOp = {
          ...operation,
          retryCount: operation.retryCount + 1,
          lastError: error instanceof Error ? error.message : 'Unknown error',
        };

        // Keep in queue if under max retries
        if (updatedOp.retryCount < MAX_RETRIES) {
          remainingOps.push(updatedOp);
        } else {
          console.warn('[OfflineQueue] Max retries reached for operation:', operation.type);
        }
      }
    }

    setQueue({
      operations: remainingOps,
      isSyncing: false,
      lastSyncDate: Date.now(),
    });

    // Show toast notification
    if (successCount > 0) {
      toast({
        title: 'Sync complete',
        description: `Successfully synced ${successCount} operation${successCount > 1 ? 's' : ''}${
          failureCount > 0 ? `, ${failureCount} failed` : ''
        }`,
        variant: successCount > 0 && failureCount === 0 ? 'default' : 'destructive',
      });
    } else if (failureCount > 0) {
      toast({
        title: 'Sync failed',
        description: `Failed to sync ${failureCount} operation${failureCount > 1 ? 's' : ''}`,
        variant: 'destructive',
      });
    }

    console.log('[OfflineQueue] Sync completed. Success:', successCount, 'Failed:', failureCount);
  }, [queue, isOnline, executeOperation]);

  // Manual sync trigger
  const handleManualSync = useCallback(async () => {
    if (!isOnline) {
      toast({
        title: 'Cannot sync',
        description: 'You are offline. Please check your connection.',
        variant: 'destructive',
      });
      return;
    }

    await syncQueue();
  }, [isOnline, syncQueue]);

  // Format timestamp
  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  const pendingCount = queue.operations.length;
  const hasErrors = queue.operations.some((op) => op.lastError);

  // Don't show indicator if no pending operations and online
  if (pendingCount === 0 && isOnline && !queue.isSyncing) {
    return null;
  }

  return (
    <>
      {/* Badge indicator */}
      <button
        onClick={() => setIsOpen(true)}
        className="relative flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-accent transition-colors"
        title={
          queue.isSyncing
            ? 'Syncing operations...'
            : !isOnline
            ? 'Offline - operations queued'
            : `${pendingCount} operation${pendingCount !== 1 ? 's' : ''} pending`
        }
      >
        {queue.isSyncing ? (
          <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
        ) : !isOnline ? (
          <CloudOff className="h-4 w-4 text-orange-500" />
        ) : (
          <Clock className="h-4 w-4 text-blue-500" />
        )}

        {pendingCount > 0 && (
          <Badge
            variant={hasErrors ? 'destructive' : 'secondary'}
            className="h-5 min-w-[20px] px-1.5"
          >
            {pendingCount}
          </Badge>
        )}

        <span className="text-xs text-muted-foreground hidden sm:inline">
          {queue.isSyncing ? 'Syncing...' : !isOnline ? 'Offline' : 'Pending'}
        </span>
      </button>

      {/* Queue details modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isOnline ? (
                <Cloud className="h-5 w-5 text-green-500" />
              ) : (
                <CloudOff className="h-5 w-5 text-orange-500" />
              )}
              Offline Queue
            </DialogTitle>
            <DialogDescription>
              {isOnline
                ? 'You are online. Operations will sync automatically.'
                : 'You are offline. Changes will sync when connection is restored.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Sync status */}
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                {queue.isSyncing ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
                    <span className="text-sm font-medium">Syncing operations...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">
                      {queue.lastSyncDate
                        ? `Last sync: ${formatTimestamp(queue.lastSyncDate)}`
                        : 'Not synced yet'}
                    </span>
                  </>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleManualSync}
                  disabled={!isOnline || queue.isSyncing || pendingCount === 0}
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Sync Now
                </Button>
                {pendingCount > 0 && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={clearQueue}
                    disabled={queue.isSyncing}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Clear All
                  </Button>
                )}
              </div>
            </div>

            {/* Queue items */}
            {pendingCount === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                <p className="text-sm">No pending operations</p>
              </div>
            ) : (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Queued Operations ({pendingCount})
                </h3>
                {queue.operations.map((operation) => (
                  <div
                    key={operation.id}
                    className="flex items-start gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">
                          {OPERATION_LABELS[operation.type]}
                        </span>
                        {operation.retryCount > 0 && (
                          <Badge variant="outline" className="text-xs">
                            Retry {operation.retryCount}/{MAX_RETRIES}
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatTimestamp(operation.createdAt)}
                      </div>
                      {operation.lastError && (
                        <div className="mt-2 flex items-start gap-1 text-xs text-destructive">
                          <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                          <span className="line-clamp-2">{operation.lastError}</span>
                        </div>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeOperation(operation.id)}
                      disabled={queue.isSyncing}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Hook for adding operations to queue (for use in other components)
export function useOfflineQueue() {
  const enqueue = useCallback((type: OperationType, payload: any) => {
    const stored = localStorage.getItem(QUEUE_STORAGE_KEY);
    const queue: QueueState = stored ? JSON.parse(stored) : { operations: [], isSyncing: false, lastSyncDate: null };

    const operation: QueuedOperation = {
      id: crypto.randomUUID(),
      type,
      payload,
      createdAt: Date.now(),
      retryCount: 0,
    };

    queue.operations.push(operation);
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));

    // Dispatch custom event to notify component
    window.dispatchEvent(new CustomEvent('queueUpdated'));

    console.log('[OfflineQueue] Operation enqueued:', type);
  }, []);

  return { enqueue };
}
