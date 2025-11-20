/**
 * React Hook: useCacheMetrics
 *
 * Fetches prompt cache metrics from the admin API.
 * Polls every 5 seconds for real-time updates.
 */

import { useState, useEffect } from 'react';

export interface CacheMetrics {
  status: {
    isCached: boolean;
    sizeKB: number | null;
    timestamp: string | null;
  };
  metrics: {
    hits: number;
    misses: number;
    totalRetrievals: number;
    lastHitTime: number | null;
    lastMissTime: number | null;
    averageRetrievalTime: number;
    retrievalTimes: number[];
  };
  hitRate: string;
  avgRetrievalTime: string;
  lastHit: string | null;
  lastMiss: string | null;
}

export interface PromptCachingMetrics {
  totalRequests: number;
  cachedRequests: number;
  nonCachedRequests: number;
  cachedPercentage: string;
  totalInputTokens: string;
  cachedInputTokens: string;
  totalOutputTokens: string;
  tokensSaved: string;
  avgCachedTokensPerRequest: number;
  costSaved: string;
  totalCostWithoutCaching: string;
  actualCost: string;
  savingsPercentage: string;
  averageResponseTime: string;
  lastUpdated: string;
}

interface CacheMetricsData {
  cache: CacheMetrics | null;
  promptCaching: PromptCachingMetrics | null;
  loading: boolean;
  error: Error | null;
}

export function useCacheMetrics(
  pollInterval: number = 5000
): CacheMetricsData {
  const [data, setData] = useState<CacheMetricsData>({
    cache: null,
    promptCaching: null,
    loading: true,
    error: null,
  });

  const fetchMetrics = async () => {
    try {
      const [cacheRes, promptCachingRes] = await Promise.all([
        fetch('/api/admin/prompt-cache-metrics'),
        fetch('/api/admin/prompt-caching-savings'),
      ]);

      if (!cacheRes.ok || !promptCachingRes.ok) {
        throw new Error('Failed to fetch cache metrics');
      }

      const cacheData = await cacheRes.json();
      const promptCachingData = await promptCachingRes.json();

      setData({
        cache: cacheData.cache,
        promptCaching: promptCachingData.promptCaching,
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error('Error fetching cache metrics:', error);
      setData((prev) => ({
        ...prev,
        loading: false,
        error: error as Error,
      }));
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchMetrics();

    // Poll for updates
    const interval = setInterval(fetchMetrics, pollInterval);

    return () => clearInterval(interval);
  }, [pollInterval]);

  return data;
}
