import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useWebSocket } from './useWebSocket';
import { useAuth } from './useAuth';
import { useCallback, useEffect } from 'react';

export interface BatchJob {
  id: string;
  userId: string;
  shootId: string;
  providerId: string;
  status: 'processing' | 'completed' | 'failed';
  totalImages: number;
  processedImages: number;
  results?: any[];
  error?: string;
  providerJobId?: string;
  mode: 'fast' | 'economy';
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface BatchJobStatus {
  id: string; // Alias for jobId for compatibility
  jobId: string;
  status: 'processing' | 'completed' | 'failed';
  totalImages: number;
  processedImages: number;
  progress: number;
  mode: 'fast' | 'economy';
  providerId: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

/**
 * Hook for fetching status of a single batch job
 * Polls every 5 seconds for jobs in processing state
 */
export function useBatchJobStatus(jobId: string | null) {
  const { user } = useAuth();

  const query = useQuery<BatchJobStatus>({
    queryKey: ['batchJob', jobId],
    queryFn: async () => {
      if (!jobId) throw new Error('No job ID provided');

      const response = await fetch(`/api/batch/status/${jobId}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch batch job status');
      }

      return response.json();
    },
    enabled: !!jobId && !!user,
    // Poll every 5 seconds if job is processing
    refetchInterval: (query) => {
      if (!query.state.data) return false;
      return query.state.data.status === 'processing' ? 5000 : false;
    },
    // Keep retrying on errors for up to 6 hours
    retry: (failureCount) => failureCount < 720, // 720 * 5s = 1 hour
    retryDelay: (attemptIndex) => {
      // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 32s, 60s (max)
      return Math.min(1000 * Math.pow(2, attemptIndex), 60000);
    },
  });

  return query;
}

/**
 * Hook for fetching all batch jobs for the current user
 * Used for displaying job history in the monitor
 */
export function useBatchJobs() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery<BatchJob[]>({
    queryKey: ['batchJobs', user?.id],
    queryFn: async () => {
      const response = await fetch('/api/batch/jobs', {
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch batch jobs');
      }

      return response.json();
    },
    enabled: !!user,
    // Refetch every 10 seconds if there are any processing jobs
    refetchInterval: (query) => {
      if (!query.state.data) return false;
      const hasProcessingJobs = query.state.data.some((job: BatchJob) => job.status === 'processing');
      return hasProcessingJobs ? 10000 : false;
    },
  });

  // Listen for WebSocket updates
  useWebSocket({
    onShootProgress: useCallback((data: any) => {
      // Invalidate queries when we get progress updates
      queryClient.invalidateQueries({ queryKey: ['batchJobs'] });

      // Also invalidate specific job if we can determine the jobId
      // (in a real implementation, we'd need the jobId in the message)
      if (data.shootId) {
        queryClient.invalidateQueries({ queryKey: ['batchJob'] });
      }
    }, [queryClient]),
  });

  return query;
}

/**
 * Hook for cancelling a batch job
 */
export function useCancelBatchJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (jobId: string) => {
      const response = await fetch(`/api/batch/cancel/${jobId}`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to cancel batch job');
      }

      return response.json();
    },
    onSuccess: (_, jobId) => {
      // Invalidate queries after successful cancellation
      queryClient.invalidateQueries({ queryKey: ['batchJobs'] });
      queryClient.invalidateQueries({ queryKey: ['batchJob', jobId] });
    },
  });
}

/**
 * Hook for retrieving completed batch job results
 */
export function useBatchJobResults(jobId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['batchJobResults', jobId],
    queryFn: async () => {
      if (!jobId) throw new Error('No job ID provided');

      const response = await fetch(`/api/batch/results/${jobId}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch batch job results');
      }

      return response.json();
    },
    enabled: !!jobId && !!user,
  });
}

/**
 * Hook that groups batch jobs by status
 */
export function useGroupedBatchJobs() {
  const { data: jobs = [], ...query } = useBatchJobs();

  const grouped = {
    active: jobs.filter((job) => job.status === 'processing'),
    completed: jobs.filter((job) => job.status === 'completed'),
    failed: jobs.filter((job) => job.status === 'failed'),
  };

  return {
    ...query,
    data: grouped,
    jobs,
  };
}

/**
 * Calculate ETA based on current progress
 */
export function calculateETA(job: BatchJobStatus): string | null {
  if (job.status !== 'processing' || !job.startedAt) {
    return null;
  }

  const elapsedMs = Date.now() - new Date(job.startedAt).getTime();
  const processedImages = job.processedImages;
  const remainingImages = job.totalImages - processedImages;

  if (processedImages === 0) {
    // No images processed yet, can't estimate
    if (job.mode === 'economy') {
      return '10-30 minutes';
    }
    return 'Calculating...';
  }

  // Calculate average time per image
  const msPerImage = elapsedMs / processedImages;
  const remainingMs = msPerImage * remainingImages;

  // Convert to human-readable format
  const remainingSeconds = Math.ceil(remainingMs / 1000);

  if (remainingSeconds < 60) {
    return `${remainingSeconds}s`;
  } else if (remainingSeconds < 3600) {
    const minutes = Math.ceil(remainingSeconds / 60);
    return `${minutes}m`;
  } else {
    const hours = Math.floor(remainingSeconds / 3600);
    const minutes = Math.ceil((remainingSeconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
}

/**
 * Get provider display name
 */
export function getProviderDisplayName(providerId: string): string {
  const providerMap: Record<string, string> = {
    'openai-gpt-5': 'GPT-5',
    'openai-gpt-5-nano': 'GPT-5 Nano',
    'claude-haiku-4-5': 'Claude Haiku 4.5',
    'claude-sonnet-4-5': 'Claude Sonnet 4.5',
    'gemini-2-5-flash-lite': 'Gemini 2.5 Flash Lite',
    'gemini-2-5-pro': 'Gemini 2.5 Pro',
    'grok-2-vision': 'Grok 2 Vision',
    'kimi-k2-instruct': 'Kimi K2',
  };

  return providerMap[providerId] || providerId;
}

/**
 * Calculate cost for batch job
 * Uses 2x provider costs (50% margin)
 */
export function calculateJobCost(job: BatchJobStatus, providerPricing: Record<string, number>): string {
  const basePrice = providerPricing[job.providerId] || 0.004; // Default $0.004 per image
  const multiplier = job.mode === 'economy' ? 0.5 : 1.0; // Economy mode is 50% off provider cost
  const pricePerImage = basePrice * multiplier;
  const totalCost = job.totalImages * pricePerImage;

  return `$${totalCost.toFixed(2)}`;
}
