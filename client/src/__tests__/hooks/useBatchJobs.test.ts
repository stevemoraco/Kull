import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useBatchJobStatus, useBatchJobs, useGroupedBatchJobs, calculateETA, getProviderDisplayName } from '../useBatchJobs';
import type { ReactNode } from 'react';

// Mock useAuth hook
vi.mock('../useAuth', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id', email: 'test@example.com' },
    isAuthenticated: true,
  }),
}));

// Mock useWebSocket hook
vi.mock('../useWebSocket', () => ({
  useWebSocket: () => ({
    connectionStatus: 'connected',
    isConnected: true,
    isReconnecting: false,
  }),
}));

const mockBatchJob = {
  id: 'batch_test_123',
  userId: 'test-user-id',
  shootId: 'shoot_456',
  providerId: 'openai-gpt-5-nano',
  status: 'processing' as const,
  totalImages: 1000,
  processedImages: 234,
  mode: 'economy' as const,
  createdAt: new Date('2025-01-01T10:00:00Z').toISOString(),
  startedAt: new Date('2025-01-01T10:01:00Z').toISOString(),
};

const mockBatchJobStatus = {
  jobId: 'batch_test_123',
  status: 'processing' as const,
  totalImages: 1000,
  processedImages: 234,
  progress: 0.234,
  mode: 'economy' as const,
  createdAt: new Date('2025-01-01T10:00:00Z').toISOString(),
  startedAt: new Date('2025-01-01T10:01:00Z').toISOString(),
  providerId: 'openai-gpt-5-nano',
};

const mockCompletedJob = {
  ...mockBatchJob,
  status: 'completed' as const,
  processedImages: 1000,
  completedAt: new Date('2025-01-01T10:30:00Z').toISOString(),
};

const mockFailedJob = {
  ...mockBatchJob,
  status: 'failed' as const,
  error: 'Rate limit exceeded',
  completedAt: new Date('2025-01-01T10:15:00Z').toISOString(),
};

describe('useBatchJobStatus', () => {
  const originalFetch = global.fetch;
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = input.toString();
      if (url.includes('/api/batch/status/')) {
        return Promise.resolve(
          new Response(JSON.stringify(mockBatchJobStatus), { status: 200 })
        );
      }
      return Promise.reject(new Error(`Unexpected fetch to ${url}`));
    }) as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
    queryClient.clear();
  });

  it('fetches batch job status successfully', async () => {
    const { result } = renderHook(() => useBatchJobStatus('batch_test_123'), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockBatchJobStatus);
    expect(result.current.data?.status).toBe('processing');
    expect(result.current.data?.processedImages).toBe(234);
    expect(result.current.data?.totalImages).toBe(1000);
  });

  it('returns null when jobId is null', () => {
    const { result } = renderHook(() => useBatchJobStatus(null), { wrapper });

    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
  });

  it('handles API errors gracefully', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ error: 'Job not found' }), { status: 404 })
      )
    ) as typeof fetch;

    const { result } = renderHook(() => useBatchJobStatus('invalid_job_id'), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeTruthy();
  });
});

describe('useBatchJobs', () => {
  const originalFetch = global.fetch;
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = input.toString();
      if (url.includes('/api/batch/jobs')) {
        return Promise.resolve(
          new Response(JSON.stringify([mockBatchJob, mockCompletedJob, mockFailedJob]), {
            status: 200,
          })
        );
      }
      return Promise.reject(new Error(`Unexpected fetch to ${url}`));
    }) as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
    queryClient.clear();
  });

  it('fetches all batch jobs successfully', async () => {
    const { result } = renderHook(() => useBatchJobs(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(3);
    expect(result.current.data?.[0]).toEqual(mockBatchJob);
    expect(result.current.data?.[1]).toEqual(mockCompletedJob);
    expect(result.current.data?.[2]).toEqual(mockFailedJob);
  });
});

describe('useGroupedBatchJobs', () => {
  const originalFetch = global.fetch;
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = input.toString();
      if (url.includes('/api/batch/jobs')) {
        return Promise.resolve(
          new Response(JSON.stringify([mockBatchJob, mockCompletedJob, mockFailedJob]), {
            status: 200,
          })
        );
      }
      return Promise.reject(new Error(`Unexpected fetch to ${url}`));
    }) as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
    queryClient.clear();
  });

  it('groups batch jobs by status', async () => {
    const { result } = renderHook(() => useGroupedBatchJobs(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.active).toHaveLength(1);
    expect(result.current.data?.completed).toHaveLength(1);
    expect(result.current.data?.failed).toHaveLength(1);

    expect(result.current.data?.active[0].status).toBe('processing');
    expect(result.current.data?.completed[0].status).toBe('completed');
    expect(result.current.data?.failed[0].status).toBe('failed');
  });
});

describe('calculateETA', () => {
  it('returns null for completed jobs', () => {
    const job = {
      ...mockBatchJobStatus,
      status: 'completed' as const,
    };

    expect(calculateETA(job)).toBeNull();
  });

  it('returns null for failed jobs', () => {
    const job = {
      ...mockBatchJobStatus,
      status: 'failed' as const,
    };

    expect(calculateETA(job)).toBeNull();
  });

  it('returns "Calculating..." when no images processed yet', () => {
    const job = {
      ...mockBatchJobStatus,
      processedImages: 0,
      mode: 'fast' as const,
    };

    expect(calculateETA(job)).toBe('Calculating...');
  });

  it('returns "10-30 minutes" for economy mode with no progress', () => {
    const job = {
      ...mockBatchJobStatus,
      processedImages: 0,
      mode: 'economy' as const,
    };

    expect(calculateETA(job)).toBe('10-30 minutes');
  });

  it('calculates ETA in seconds correctly', () => {
    const now = Date.now();
    const job = {
      ...mockBatchJobStatus,
      startedAt: new Date(now - 10000).toISOString(), // 10 seconds ago
      processedImages: 10,
      totalImages: 20,
    };

    const eta = calculateETA(job);
    expect(eta).toMatch(/\d+s/); // Should be around 10s
  });

  it('calculates ETA in minutes correctly', () => {
    const now = Date.now();
    const job = {
      ...mockBatchJobStatus,
      startedAt: new Date(now - 120000).toISOString(), // 2 minutes ago
      processedImages: 100,
      totalImages: 200,
    };

    const eta = calculateETA(job);
    expect(eta).toMatch(/\d+m/); // Should be around 2m
  });

  it('calculates ETA in hours correctly', () => {
    const now = Date.now();
    const job = {
      ...mockBatchJobStatus,
      startedAt: new Date(now - 7200000).toISOString(), // 2 hours ago
      processedImages: 1000,
      totalImages: 2000,
    };

    const eta = calculateETA(job);
    expect(eta).toMatch(/\d+h \d+m/); // Should be around 2h
  });
});

describe('getProviderDisplayName', () => {
  it('returns correct display name for known providers', () => {
    expect(getProviderDisplayName('openai-gpt-5')).toBe('GPT-5');
    expect(getProviderDisplayName('openai-gpt-5-nano')).toBe('GPT-5 Nano');
    expect(getProviderDisplayName('claude-haiku-4-5')).toBe('Claude Haiku 4.5');
    expect(getProviderDisplayName('claude-sonnet-4-5')).toBe('Claude Sonnet 4.5');
    expect(getProviderDisplayName('gemini-2-5-flash-lite')).toBe('Gemini 2.5 Flash Lite');
    expect(getProviderDisplayName('gemini-2-5-pro')).toBe('Gemini 2.5 Pro');
    expect(getProviderDisplayName('grok-2-vision')).toBe('Grok 2 Vision');
    expect(getProviderDisplayName('kimi-k2-instruct')).toBe('Kimi K2');
  });

  it('returns original providerId for unknown providers', () => {
    expect(getProviderDisplayName('unknown-provider')).toBe('unknown-provider');
  });
});
