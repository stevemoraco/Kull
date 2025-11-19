/**
 * useProviderHealth Hook
 *
 * Fetches and manages real-time provider health data from the admin API.
 * Automatically subscribes to WebSocket updates for real-time monitoring.
 */

import { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from './useWebSocket';
import type { ProviderHealthData } from '@shared/types/sync';

export interface ProviderMetrics {
  provider: string;
  healthScore: number;
  status: 'healthy' | 'degraded' | 'unhealthy';
  activeRequests: number;
  requestsToday: number;
  costToday: number;
  avgLatency: number;
  successRate: number;
  errorRate: number;
  rateLimitHits: number;
  rateLimitProximity: number;
  recentErrors: number;
  lastError: string | null;
  lastErrorTime: Date | null;
  requestHistory: Array<{ timestamp: Date; value: number }>;
  costHistory: Array<{ timestamp: Date; value: number }>;
  errorHistory: Array<{ timestamp: Date; value: number }>;
  uptimePercentage: number;
  lastDowntime: Date | null;
}

export interface ProviderHealthResponse {
  timestamp: Date;
  overall: {
    healthScore: number;
    healthyProviders: number;
    degradedProviders: number;
    unhealthyProviders: number;
    totalActiveRequests: number;
    totalRequestsToday: number;
    totalCostToday: number;
  };
  providers: ProviderMetrics[];
}

interface UseProviderHealthResult {
  data: ProviderHealthResponse | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch and subscribe to provider health updates
 */
export function useProviderHealth(): UseProviderHealthResult {
  const [data, setData] = useState<ProviderHealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch initial data
  const fetchHealth = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/ai/health', {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch health data: ${response.statusText}`);
      }

      const healthData = await response.json();

      // Convert date strings to Date objects
      const normalizedData: ProviderHealthResponse = {
        ...healthData,
        timestamp: new Date(healthData.timestamp),
        providers: healthData.providers.map((p: any) => ({
          ...p,
          lastErrorTime: p.lastErrorTime ? new Date(p.lastErrorTime) : null,
          lastDowntime: p.lastDowntime ? new Date(p.lastDowntime) : null,
          requestHistory: p.requestHistory.map((h: any) => ({
            timestamp: new Date(h.timestamp),
            value: h.value
          })),
          costHistory: p.costHistory.map((h: any) => ({
            timestamp: new Date(h.timestamp),
            value: h.value
          })),
          errorHistory: p.errorHistory.map((h: any) => ({
            timestamp: new Date(h.timestamp),
            value: h.value
          }))
        }))
      };

      setData(normalizedData);
    } catch (err) {
      console.error('[useProviderHealth] Fetch error:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, []);

  // Subscribe to WebSocket updates
  useWebSocket({
    onProviderHealth: (healthData: ProviderHealthData) => {
      console.log('[useProviderHealth] Received WebSocket update:', healthData);

      // Normalize the WebSocket data
      const normalizedData: ProviderHealthResponse = {
        timestamp: new Date(healthData.timestamp),
        overall: {
          healthScore: Math.round(
            healthData.providers.reduce((sum, p) => sum + p.healthScore, 0) / healthData.providers.length
          ),
          healthyProviders: healthData.providers.filter(p => p.status === 'healthy').length,
          degradedProviders: healthData.providers.filter(p => p.status === 'degraded').length,
          unhealthyProviders: healthData.providers.filter(p => p.status === 'unhealthy').length,
          totalActiveRequests: healthData.providers.reduce((sum, p) => sum + p.activeRequests, 0),
          totalRequestsToday: healthData.providers.reduce((sum, p) => sum + p.requestsToday, 0),
          totalCostToday: healthData.providers.reduce((sum, p) => sum + p.costToday, 0)
        },
        providers: healthData.providers.map(p => ({
          ...p,
          lastErrorTime: p.lastErrorTime ? new Date(p.lastErrorTime) : null,
          lastDowntime: p.lastDowntime ? new Date(p.lastDowntime) : null,
          requestHistory: p.requestHistory.map(h => ({
            timestamp: new Date(h.timestamp),
            value: h.value
          })),
          costHistory: p.costHistory.map(h => ({
            timestamp: new Date(h.timestamp),
            value: h.value
          })),
          errorHistory: p.errorHistory.map(h => ({
            timestamp: new Date(h.timestamp),
            value: h.value
          }))
        }))
      };

      setData(normalizedData);
    },
  });

  useEffect(() => {
    // Fetch initial data
    fetchHealth();

    // Auto-refresh every 10 seconds (fallback if WebSocket fails)
    const interval = setInterval(() => {
      fetchHealth();
    }, 10000);

    return () => {
      clearInterval(interval);
    };
  }, [fetchHealth]);

  return {
    data,
    loading,
    error,
    refetch: fetchHealth
  };
}

/**
 * Hook to fetch health data for a specific provider
 */
export function useProviderHealthDetail(provider: string): UseProviderHealthResult {
  const [data, setData] = useState<ProviderHealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchHealth = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/admin/ai/health/${provider}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch health data: ${response.statusText}`);
      }

      const result = await response.json();

      // Normalize the response to match the overall structure
      const normalizedData: ProviderHealthResponse = {
        timestamp: new Date(result.timestamp),
        overall: {
          healthScore: result.metrics.healthScore,
          healthyProviders: result.metrics.status === 'healthy' ? 1 : 0,
          degradedProviders: result.metrics.status === 'degraded' ? 1 : 0,
          unhealthyProviders: result.metrics.status === 'unhealthy' ? 1 : 0,
          totalActiveRequests: result.metrics.activeRequests,
          totalRequestsToday: result.metrics.requestsToday,
          totalCostToday: result.metrics.costToday
        },
        providers: [
          {
            ...result.metrics,
            lastErrorTime: result.metrics.lastErrorTime ? new Date(result.metrics.lastErrorTime) : null,
            lastDowntime: result.metrics.lastDowntime ? new Date(result.metrics.lastDowntime) : null,
            requestHistory: result.metrics.requestHistory.map((h: any) => ({
              timestamp: new Date(h.timestamp),
              value: h.value
            })),
            costHistory: result.metrics.costHistory.map((h: any) => ({
              timestamp: new Date(h.timestamp),
              value: h.value
            })),
            errorHistory: result.metrics.errorHistory.map((h: any) => ({
              timestamp: new Date(h.timestamp),
              value: h.value
            }))
          }
        ]
      };

      setData(normalizedData);
    } catch (err) {
      console.error('[useProviderHealthDetail] Fetch error:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [provider]);

  useEffect(() => {
    fetchHealth();

    // Refresh every 5 seconds
    const interval = setInterval(() => {
      fetchHealth();
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchHealth]);

  return {
    data,
    loading,
    error,
    refetch: fetchHealth
  };
}
