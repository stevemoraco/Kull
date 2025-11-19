/**
 * Provider Health Monitoring Service
 *
 * Tracks real-time health metrics for all AI providers:
 * - Response time (latency)
 * - Success rate
 * - Rate limit proximity
 * - Cost efficiency
 * - Uptime percentage
 * - Active requests
 * - Total requests/costs per day
 */

export interface ProviderMetrics {
  provider: string;
  healthScore: number; // 0-100
  status: 'healthy' | 'degraded' | 'unhealthy';

  // Real-time metrics
  activeRequests: number;
  requestsToday: number;
  costToday: number; // in dollars

  // Performance metrics
  avgLatency: number; // milliseconds
  successRate: number; // 0-100
  errorRate: number; // 0-100

  // Rate limiting
  rateLimitHits: number; // last 10 minutes
  rateLimitProximity: number; // 0-100 (how close to limit)

  // Errors
  recentErrors: number; // last 10 minutes
  lastError: string | null;
  lastErrorTime: Date | null;

  // Historical (24h)
  requestHistory: HistoricalDataPoint[];
  costHistory: HistoricalDataPoint[];
  errorHistory: HistoricalDataPoint[];

  // Uptime
  uptimePercentage: number; // 0-100
  lastDowntime: Date | null;
}

export interface HistoricalDataPoint {
  timestamp: Date;
  value: number;
}

interface RequestLog {
  provider: string;
  timestamp: Date;
  latency: number; // milliseconds
  success: boolean;
  cost: number; // dollars
  error?: string;
}

interface RateLimitHit {
  provider: string;
  timestamp: Date;
  retryAfter: number;
}

// In-memory storage (24 hours of data)
const requestLogs: RequestLog[] = [];
const rateLimitHits: RateLimitHit[] = [];
const activeRequestCount: Map<string, number> = new Map();
const dailyStats: Map<string, { requests: number; cost: number }> = new Map();
const downtimeLog: Map<string, Date[]> = new Map();

const PROVIDERS = ['anthropic', 'openai', 'google', 'grok', 'groq'];
const MAX_LOG_SIZE = 10000; // Keep last 10k requests
const HISTORY_WINDOW = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Log a request to a provider
 */
export function logRequest(
  provider: string,
  latency: number,
  success: boolean,
  cost: number,
  error?: string
) {
  const log: RequestLog = {
    provider,
    timestamp: new Date(),
    latency,
    success,
    cost,
    error
  };

  requestLogs.push(log);

  // Trim old logs
  if (requestLogs.length > MAX_LOG_SIZE) {
    requestLogs.shift();
  }

  // Update daily stats
  const key = `${provider}-${new Date().toISOString().split('T')[0]}`;
  const stats = dailyStats.get(key) || { requests: 0, cost: 0 };
  stats.requests++;
  stats.cost += cost;
  dailyStats.set(key, stats);

  // Track downtime if error
  if (!success) {
    const downtime = downtimeLog.get(provider) || [];
    downtime.push(new Date());
    downtimeLog.set(provider, downtime);
  }
}

/**
 * Log a rate limit hit
 */
export function logRateLimitHit(provider: string, retryAfter: number) {
  rateLimitHits.push({
    provider,
    timestamp: new Date(),
    retryAfter
  });

  // Trim old logs
  if (rateLimitHits.length > 1000) {
    rateLimitHits.shift();
  }
}

/**
 * Increment active request count
 */
export function incrementActiveRequests(provider: string) {
  const count = activeRequestCount.get(provider) || 0;
  activeRequestCount.set(provider, count + 1);
}

/**
 * Decrement active request count
 */
export function decrementActiveRequests(provider: string) {
  const count = activeRequestCount.get(provider) || 0;
  activeRequestCount.set(provider, Math.max(0, count - 1));
}

/**
 * Get current health metrics for a provider
 */
export function getProviderMetrics(provider: string): ProviderMetrics {
  const now = Date.now();
  const tenMinutesAgo = now - 10 * 60 * 1000;
  const oneDayAgo = now - HISTORY_WINDOW;

  // Filter logs for this provider
  const providerLogs = requestLogs.filter(log =>
    log.provider === provider && log.timestamp.getTime() > oneDayAgo
  );

  const recentLogs = providerLogs.filter(log =>
    log.timestamp.getTime() > tenMinutesAgo
  );

  const providerRateLimits = rateLimitHits.filter(hit =>
    hit.provider === provider && hit.timestamp.getTime() > tenMinutesAgo
  );

  // Calculate metrics
  const totalRequests = providerLogs.length;
  const successfulRequests = providerLogs.filter(log => log.success).length;
  const failedRequests = totalRequests - successfulRequests;

  const avgLatency = totalRequests > 0
    ? providerLogs.reduce((sum, log) => sum + log.latency, 0) / totalRequests
    : 0;

  const successRate = totalRequests > 0
    ? (successfulRequests / totalRequests) * 100
    : 100;

  const errorRate = totalRequests > 0
    ? (failedRequests / totalRequests) * 100
    : 0;

  // Get today's stats
  const today = new Date().toISOString().split('T')[0];
  const todayKey = `${provider}-${today}`;
  const todayStats = dailyStats.get(todayKey) || { requests: 0, cost: 0 };

  // Recent errors
  const recentErrors = recentLogs.filter(log => !log.success);
  const lastError = recentErrors.length > 0
    ? recentErrors[recentErrors.length - 1]
    : null;

  // Calculate health score (0-100)
  let healthScore = 100;

  // Deduct for latency (every 100ms over 500ms = -5 points)
  if (avgLatency > 500) {
    healthScore -= Math.min(((avgLatency - 500) / 100) * 5, 30);
  }

  // Deduct for error rate (every 1% = -2 points)
  healthScore -= Math.min(errorRate * 2, 40);

  // Deduct for rate limits (each hit = -5 points)
  healthScore -= Math.min(providerRateLimits.length * 5, 30);

  healthScore = Math.max(0, Math.round(healthScore));

  // Determine status
  let status: 'healthy' | 'degraded' | 'unhealthy';
  if (healthScore >= 90) status = 'healthy';
  else if (healthScore >= 70) status = 'degraded';
  else status = 'unhealthy';

  // Calculate rate limit proximity (0-100)
  // This is a simplified calculation - real implementation would track actual rate limits
  const rateLimitProximity = Math.min((providerRateLimits.length / 10) * 100, 100);

  // Generate historical data points (hourly buckets for 24h)
  const requestHistory = generateHistoricalData(providerLogs, 'requests');
  const costHistory = generateHistoricalData(providerLogs, 'cost');
  const errorHistory = generateHistoricalData(providerLogs, 'errors');

  // Calculate uptime percentage
  const downtimes = downtimeLog.get(provider) || [];
  const recentDowntimes = downtimes.filter(d => d.getTime() > oneDayAgo);
  const uptimePercentage = totalRequests > 0
    ? Math.max(0, 100 - ((recentDowntimes.length / totalRequests) * 100))
    : 100;

  const lastDowntime = recentDowntimes.length > 0
    ? recentDowntimes[recentDowntimes.length - 1]
    : null;

  return {
    provider,
    healthScore,
    status,
    activeRequests: activeRequestCount.get(provider) || 0,
    requestsToday: todayStats.requests,
    costToday: todayStats.cost,
    avgLatency: Math.round(avgLatency),
    successRate: Math.round(successRate * 10) / 10,
    errorRate: Math.round(errorRate * 10) / 10,
    rateLimitHits: providerRateLimits.length,
    rateLimitProximity: Math.round(rateLimitProximity),
    recentErrors: recentErrors.length,
    lastError: lastError?.error || null,
    lastErrorTime: lastError?.timestamp || null,
    requestHistory,
    costHistory,
    errorHistory,
    uptimePercentage: Math.round(uptimePercentage * 10) / 10,
    lastDowntime
  };
}

/**
 * Get metrics for all providers
 */
export function getAllProviderMetrics(): ProviderMetrics[] {
  return PROVIDERS.map(provider => getProviderMetrics(provider));
}

/**
 * Generate historical data points from logs
 */
function generateHistoricalData(
  logs: RequestLog[],
  metric: 'requests' | 'cost' | 'errors'
): HistoricalDataPoint[] {
  const now = Date.now();
  const oneDayAgo = now - HISTORY_WINDOW;
  const hourInMs = 60 * 60 * 1000;

  const buckets: Map<number, number> = new Map();

  // Initialize 24 hourly buckets
  for (let i = 0; i < 24; i++) {
    const bucketTime = oneDayAgo + (i * hourInMs);
    buckets.set(bucketTime, 0);
  }

  // Populate buckets
  logs.forEach(log => {
    const logTime = log.timestamp.getTime();
    const hoursSinceStart = Math.floor((logTime - oneDayAgo) / hourInMs);
    const bucketTime = oneDayAgo + (hoursSinceStart * hourInMs);

    if (buckets.has(bucketTime)) {
      const currentValue = buckets.get(bucketTime)!;

      switch (metric) {
        case 'requests':
          buckets.set(bucketTime, currentValue + 1);
          break;
        case 'cost':
          buckets.set(bucketTime, currentValue + log.cost);
          break;
        case 'errors':
          buckets.set(bucketTime, currentValue + (log.success ? 0 : 1));
          break;
      }
    }
  });

  // Convert to array
  return Array.from(buckets.entries())
    .map(([timestamp, value]) => ({
      timestamp: new Date(timestamp),
      value: Math.round(value * 100) / 100
    }))
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

/**
 * Clean up old data (run periodically)
 */
export function cleanupOldData() {
  const now = Date.now();
  const oneDayAgo = now - HISTORY_WINDOW;

  // Remove old request logs
  while (requestLogs.length > 0 && requestLogs[0].timestamp.getTime() < oneDayAgo) {
    requestLogs.shift();
  }

  // Remove old rate limit hits
  while (rateLimitHits.length > 0 && rateLimitHits[0].timestamp.getTime() < oneDayAgo) {
    rateLimitHits.shift();
  }

  // Remove old daily stats
  const yesterday = new Date(now - HISTORY_WINDOW).toISOString().split('T')[0];
  const keysToDelete: string[] = [];
  dailyStats.forEach((_, key) => {
    const date = key.split('-').slice(1).join('-');
    if (date < yesterday) {
      keysToDelete.push(key);
    }
  });
  keysToDelete.forEach(key => dailyStats.delete(key));

  // Remove old downtime logs
  downtimeLog.forEach((downtimes, provider) => {
    const recentDowntimes = downtimes.filter((d: Date) => d.getTime() > oneDayAgo);
    if (recentDowntimes.length === 0) {
      downtimeLog.delete(provider);
    } else {
      downtimeLog.set(provider, recentDowntimes);
    }
  });
}

// Run cleanup every hour
setInterval(cleanupOldData, 60 * 60 * 1000);
