/**
 * OfflineQueueIndicator.test.tsx
 *
 * Comprehensive tests for the OfflineQueueIndicator component
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OfflineQueueIndicator, useOfflineQueue } from '../components/OfflineQueueIndicator';

// Mock toast
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Mock UI components
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => (open ? <div data-testid="dialog">{children}</div> : null),
  DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: any) => <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }: any) => <div data-testid="dialog-title">{children}</div>,
  DialogDescription: ({ children }: any) => <div data-testid="dialog-description">{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant }: any) => (
    <span data-variant={variant}>{children}</span>
  ),
}));

// Constants for testing
const QUEUE_STORAGE_KEY = 'offline_operation_queue';

describe('OfflineQueueIndicator', () => {
  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();
    // Reset mocks
    vi.clearAllMocks();
    // Mock online status
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Visibility', () => {
    it('should not render when online with no pending operations', () => {
      const { container } = render(<OfflineQueueIndicator />);
      expect(container.firstChild).toBeNull();
    });

    it('should render when offline', () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      render(<OfflineQueueIndicator />);
      expect(screen.getByText('Offline')).toBeInTheDocument();
    });

    it('should render when there are pending operations', () => {
      // Add a pending operation to localStorage
      const queue = {
        operations: [
          {
            id: '123',
            type: 'votePrompt',
            payload: { promptId: 'p1', score: 5 },
            createdAt: Date.now(),
            retryCount: 0,
          },
        ],
        isSyncing: false,
        lastSyncDate: null,
      };
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));

      render(<OfflineQueueIndicator />);
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('Pending')).toBeInTheDocument();
    });

    it('should render when syncing', () => {
      const queue = {
        operations: [
          {
            id: '123',
            type: 'votePrompt',
            payload: {},
            createdAt: Date.now(),
            retryCount: 0,
          },
        ],
        isSyncing: true,
        lastSyncDate: null,
      };
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));

      render(<OfflineQueueIndicator />);
      expect(screen.getByText('Syncing...')).toBeInTheDocument();
    });
  });

  describe('Badge Display', () => {
    it('should show correct operation count', () => {
      const queue = {
        operations: [
          { id: '1', type: 'votePrompt', payload: {}, createdAt: Date.now(), retryCount: 0 },
          { id: '2', type: 'addFolder', payload: {}, createdAt: Date.now(), retryCount: 0 },
          { id: '3', type: 'removeFolder', payload: {}, createdAt: Date.now(), retryCount: 0 },
        ],
        isSyncing: false,
        lastSyncDate: null,
      };
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));

      render(<OfflineQueueIndicator />);
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should show destructive variant for failed operations', () => {
      const queue = {
        operations: [
          {
            id: '1',
            type: 'votePrompt',
            payload: {},
            createdAt: Date.now(),
            retryCount: 0,
            lastError: 'Network error',
          },
        ],
        isSyncing: false,
        lastSyncDate: null,
      };
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));

      render(<OfflineQueueIndicator />);
      const badge = screen.getByText('1');
      expect(badge).toHaveAttribute('data-variant', 'destructive');
    });
  });

  describe('Modal Interaction', () => {
    it('should open modal when clicked', async () => {
      const queue = {
        operations: [
          { id: '1', type: 'votePrompt', payload: {}, createdAt: Date.now(), retryCount: 0 },
        ],
        isSyncing: false,
        lastSyncDate: null,
      };
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));

      render(<OfflineQueueIndicator />);
      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByTestId('dialog')).toBeInTheDocument();
        expect(screen.getByTestId('dialog-title')).toHaveTextContent('Offline Queue');
      });
    });

    it('should display queue details in modal', async () => {
      const queue = {
        operations: [
          { id: '1', type: 'votePrompt', payload: {}, createdAt: Date.now(), retryCount: 0 },
          { id: '2', type: 'addFolder', payload: {}, createdAt: Date.now(), retryCount: 1 },
        ],
        isSyncing: false,
        lastSyncDate: null,
      };
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));

      render(<OfflineQueueIndicator />);
      fireEvent.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(screen.getByText('Vote on Prompt')).toBeInTheDocument();
        expect(screen.getByText('Add Folder')).toBeInTheDocument();
        expect(screen.getByText('Retry 1/3')).toBeInTheDocument();
      });
    });
  });

  describe('Offline/Online Transitions', () => {
    it('should show offline toast when going offline', async () => {
      render(<OfflineQueueIndicator />);

      // Simulate going offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });
      window.dispatchEvent(new Event('offline'));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'You are offline',
          description: 'Changes will sync automatically when connection is restored',
          variant: 'default',
        });
      });
    });

    it('should trigger sync when coming back online', async () => {
      // Setup offline queue with operations
      const queue = {
        operations: [
          { id: '1', type: 'votePrompt', payload: { promptId: 'p1', score: 5 }, createdAt: Date.now(), retryCount: 0 },
        ],
        isSyncing: false,
        lastSyncDate: null,
      };
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));

      // Mock fetch to succeed
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        } as Response)
      );

      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      render(<OfflineQueueIndicator />);

      // Simulate coming back online
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });
      window.dispatchEvent(new Event('online'));

      // Wait for sync to complete
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      }, { timeout: 2000 });
    });
  });

  describe('Sync Operations', () => {
    beforeEach(() => {
      global.fetch = vi.fn();
    });

    it('should sync operations successfully', async () => {
      const queue = {
        operations: [
          { id: '1', type: 'votePrompt', payload: { promptId: 'p1', score: 5 }, createdAt: Date.now(), retryCount: 0 },
        ],
        isSyncing: false,
        lastSyncDate: null,
      };
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      render(<OfflineQueueIndicator />);
      fireEvent.click(screen.getByRole('button'));

      await waitFor(() => {
        const syncButton = screen.getByText(/Sync Now/);
        fireEvent.click(syncButton);
      });

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Sync complete',
          })
        );
      });
    });

    it('should handle sync failures with retries', async () => {
      const queue = {
        operations: [
          { id: '1', type: 'votePrompt', payload: { promptId: 'p1', score: 5 }, createdAt: Date.now(), retryCount: 0 },
        ],
        isSyncing: false,
        lastSyncDate: null,
      };
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));

      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      render(<OfflineQueueIndicator />);
      fireEvent.click(screen.getByRole('button'));

      await waitFor(() => {
        const syncButton = screen.getByText(/Sync Now/);
        fireEvent.click(syncButton);
      });

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Sync failed',
          })
        );
      });
    });

    it('should remove operations after max retries', async () => {
      const queue = {
        operations: [
          { id: '1', type: 'votePrompt', payload: { promptId: 'p1', score: 5 }, createdAt: Date.now(), retryCount: 2 },
        ],
        isSyncing: false,
        lastSyncDate: null,
      };
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));

      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      render(<OfflineQueueIndicator />);
      fireEvent.click(screen.getByRole('button'));

      await waitFor(() => {
        const syncButton = screen.getByText(/Sync Now/);
        fireEvent.click(syncButton);
      });

      await waitFor(() => {
        // After max retries (3), operation should be removed
        const stored = localStorage.getItem(QUEUE_STORAGE_KEY);
        const storedQueue = stored ? JSON.parse(stored) : null;
        expect(storedQueue.operations).toHaveLength(0);
      });
    });
  });

  describe('Queue Management', () => {
    it('should clear all operations', async () => {
      const queue = {
        operations: [
          { id: '1', type: 'votePrompt', payload: {}, createdAt: Date.now(), retryCount: 0 },
          { id: '2', type: 'addFolder', payload: {}, createdAt: Date.now(), retryCount: 0 },
        ],
        isSyncing: false,
        lastSyncDate: null,
      };
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));

      render(<OfflineQueueIndicator />);
      fireEvent.click(screen.getByRole('button'));

      await waitFor(() => {
        const clearButton = screen.getByText(/Clear All/);
        fireEvent.click(clearButton);
      });

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Queue cleared',
          description: 'All pending operations have been removed',
        });

        const stored = localStorage.getItem(QUEUE_STORAGE_KEY);
        const storedQueue = stored ? JSON.parse(stored) : null;
        expect(storedQueue.operations).toHaveLength(0);
      });
    });

    it('should remove individual operations', async () => {
      const queue = {
        operations: [
          { id: '1', type: 'votePrompt', payload: {}, createdAt: Date.now(), retryCount: 0 },
          { id: '2', type: 'addFolder', payload: {}, createdAt: Date.now(), retryCount: 0 },
        ],
        isSyncing: false,
        lastSyncDate: null,
      };
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));

      render(<OfflineQueueIndicator />);
      fireEvent.click(screen.getByRole('button'));

      await waitFor(() => {
        const trashButtons = screen.getAllByRole('button');
        const removeButton = trashButtons.find(btn => btn.textContent?.includes('Trash'));
        if (removeButton) {
          fireEvent.click(removeButton);
        }
      });

      await waitFor(() => {
        const stored = localStorage.getItem(QUEUE_STORAGE_KEY);
        const storedQueue = stored ? JSON.parse(stored) : null;
        expect(storedQueue.operations).toHaveLength(1);
      });
    });
  });

  describe('useOfflineQueue hook', () => {
    it('should enqueue operations', () => {
      const TestComponent = () => {
        const { enqueue } = useOfflineQueue();
        return (
          <button onClick={() => enqueue('votePrompt', { promptId: 'p1', score: 5 })}>
            Enqueue
          </button>
        );
      };

      render(<TestComponent />);
      fireEvent.click(screen.getByText('Enqueue'));

      const stored = localStorage.getItem(QUEUE_STORAGE_KEY);
      const queue = stored ? JSON.parse(stored) : null;
      expect(queue.operations).toHaveLength(1);
      expect(queue.operations[0].type).toBe('votePrompt');
      expect(queue.operations[0].payload).toEqual({ promptId: 'p1', score: 5 });
    });
  });

  describe('Persistence', () => {
    it('should load queue from localStorage on mount', () => {
      const queue = {
        operations: [
          { id: '1', type: 'votePrompt', payload: {}, createdAt: Date.now(), retryCount: 0 },
        ],
        isSyncing: false,
        lastSyncDate: 1234567890,
      };
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));

      render(<OfflineQueueIndicator />);
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('should save queue to localStorage on changes', async () => {
      const { enqueue } = useOfflineQueue();
      enqueue('votePrompt', { promptId: 'p1', score: 5 });

      await waitFor(() => {
        const stored = localStorage.getItem(QUEUE_STORAGE_KEY);
        expect(stored).not.toBeNull();
        const queue = JSON.parse(stored!);
        expect(queue.operations).toHaveLength(1);
      });
    });

    it('should handle corrupted localStorage data gracefully', () => {
      localStorage.setItem(QUEUE_STORAGE_KEY, 'invalid json');

      // Should not crash
      expect(() => render(<OfflineQueueIndicator />)).not.toThrow();
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no operations', async () => {
      const queue = {
        operations: [],
        isSyncing: false,
        lastSyncDate: Date.now(),
      };
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));

      // Force it to render by going offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      render(<OfflineQueueIndicator />);
      fireEvent.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(screen.getByText('No pending operations')).toBeInTheDocument();
      });
    });
  });
});
