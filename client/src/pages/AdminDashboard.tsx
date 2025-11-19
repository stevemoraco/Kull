/**
 * Admin Dashboard - Provider Health Monitoring
 *
 * Real-time monitoring dashboard for all AI providers.
 * Shows health status, metrics, charts, and detailed logs.
 * Admin only - requires steve@lander.media authentication.
 */

import { useState } from 'react';
import { useProviderHealth, type ProviderMetrics } from '../hooks/useProviderHealth';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { format } from 'date-fns';

export default function AdminDashboard() {
  const { data, loading, error } = useProviderHealth();
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Loading provider health data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md p-6 bg-white rounded-lg shadow-lg">
          <h2 className="text-xl font-bold text-red-600 mb-2">Error Loading Health Data</h2>
          <p className="text-gray-700">{error.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">AI Provider Health Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Real-time monitoring of all AI provider performance and health metrics
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Last updated: {format(data.timestamp, 'PPpp')}
          </p>
        </div>

        {/* Overall Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Overall Health"
            value={`${data.overall.healthScore}%`}
            color={getHealthColor(data.overall.healthScore)}
            subtitle={`${data.overall.healthyProviders} healthy, ${data.overall.degradedProviders} degraded, ${data.overall.unhealthyProviders} unhealthy`}
          />
          <StatCard
            title="Active Requests"
            value={data.overall.totalActiveRequests.toString()}
            color="blue"
            subtitle="Currently processing"
          />
          <StatCard
            title="Requests Today"
            value={data.overall.totalRequestsToday.toLocaleString()}
            color="indigo"
            subtitle="Total processed"
          />
          <StatCard
            title="Cost Today"
            value={`$${data.overall.totalCostToday.toFixed(2)}`}
            color="green"
            subtitle="Provider costs"
          />
        </div>

        {/* Provider Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
          {data.providers.map((provider) => (
            <ProviderCard
              key={provider.provider}
              provider={provider}
              onClick={() => setSelectedProvider(provider.provider)}
              isSelected={selectedProvider === provider.provider}
            />
          ))}
        </div>

        {/* Detailed Provider View */}
        {selectedProvider && (
          <DetailedProviderView
            provider={data.providers.find(p => p.provider === selectedProvider)!}
            onClose={() => setSelectedProvider(null)}
          />
        )}
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  color: string;
  subtitle: string;
}

function StatCard({ title, value, color, subtitle }: StatCardProps) {
  const colorClasses = {
    green: 'bg-green-50 text-green-700 border-green-200',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200'
  }[color] || 'bg-gray-50 text-gray-700 border-gray-200';

  return (
    <div className={`p-6 rounded-lg border-2 ${colorClasses}`}>
      <h3 className="text-sm font-medium opacity-75">{title}</h3>
      <p className="text-3xl font-bold mt-2">{value}</p>
      <p className="text-xs mt-1 opacity-75">{subtitle}</p>
    </div>
  );
}

interface ProviderCardProps {
  provider: ProviderMetrics;
  onClick: () => void;
  isSelected: boolean;
}

function ProviderCard({ provider, onClick, isSelected }: ProviderCardProps) {
  const statusColors = {
    healthy: 'bg-green-100 border-green-500 text-green-800',
    degraded: 'bg-yellow-100 border-yellow-500 text-yellow-800',
    unhealthy: 'bg-red-100 border-red-500 text-red-800'
  };

  const statusColor = statusColors[provider.status];

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-lg shadow-md p-6 cursor-pointer transition-all hover:shadow-lg ${
        isSelected ? 'ring-2 ring-blue-500' : ''
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900 capitalize">{provider.provider}</h3>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold border-2 ${statusColor}`}>
          {provider.status.toUpperCase()}
        </span>
      </div>

      {/* Health Score */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-gray-600">Health Score</span>
          <span className="text-2xl font-bold text-gray-900">{provider.healthScore}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${
              provider.healthScore >= 90 ? 'bg-green-500' :
              provider.healthScore >= 70 ? 'bg-yellow-500' :
              'bg-red-500'
            }`}
            style={{ width: `${provider.healthScore}%` }}
          />
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <Metric label="Active" value={provider.activeRequests.toString()} />
        <Metric label="Requests" value={provider.requestsToday.toLocaleString()} />
        <Metric label="Success" value={`${provider.successRate.toFixed(1)}%`} />
        <Metric label="Latency" value={`${provider.avgLatency}ms`} />
        <Metric label="Rate Limits" value={provider.rateLimitHits.toString()} />
        <Metric label="Errors" value={provider.recentErrors.toString()} />
      </div>

      {/* Cost */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Cost Today</span>
          <span className="text-lg font-bold text-green-600">
            ${provider.costToday.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Last Error (if any) */}
      {provider.lastError && (
        <div className="mt-4 p-3 bg-red-50 rounded border border-red-200">
          <p className="text-xs font-medium text-red-800">Last Error:</p>
          <p className="text-xs text-red-600 mt-1 truncate">{provider.lastError}</p>
          {provider.lastErrorTime && (
            <p className="text-xs text-red-500 mt-1">
              {format(provider.lastErrorTime, 'PPpp')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

interface MetricProps {
  label: string;
  value: string;
}

function Metric({ label, value }: MetricProps) {
  return (
    <div>
      <p className="text-gray-500 text-xs">{label}</p>
      <p className="text-gray-900 font-semibold">{value}</p>
    </div>
  );
}

interface DetailedProviderViewProps {
  provider: ProviderMetrics;
  onClose: () => void;
}

function DetailedProviderView({ provider, onClose }: DetailedProviderViewProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 capitalize">
            {provider.provider} - Detailed Metrics
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              title="Health Score"
              value={`${provider.healthScore}%`}
              color={getHealthColor(provider.healthScore)}
              subtitle={provider.status}
            />
            <StatCard
              title="Uptime"
              value={`${provider.uptimePercentage.toFixed(1)}%`}
              color="green"
              subtitle="Last 24h"
            />
            <StatCard
              title="Avg Latency"
              value={`${provider.avgLatency}ms`}
              color={provider.avgLatency < 500 ? 'green' : provider.avgLatency < 1000 ? 'yellow' : 'red'}
              subtitle="Response time"
            />
            <StatCard
              title="Error Rate"
              value={`${provider.errorRate.toFixed(1)}%`}
              color={provider.errorRate < 1 ? 'green' : provider.errorRate < 5 ? 'yellow' : 'red'}
              subtitle="Failed requests"
            />
          </div>

          {/* Charts */}
          <div className="space-y-6">
            <ChartSection
              title="Request Volume (24h)"
              data={provider.requestHistory}
              dataKey="value"
              color="#3b82f6"
            />
            <ChartSection
              title="Cost Analysis (24h)"
              data={provider.costHistory}
              dataKey="value"
              color="#10b981"
              prefix="$"
            />
            <ChartSection
              title="Error Tracking (24h)"
              data={provider.errorHistory}
              dataKey="value"
              color="#ef4444"
            />
          </div>

          {/* Additional Metrics */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Metrics</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <DetailMetric label="Rate Limit Hits" value={provider.rateLimitHits.toString()} />
              <DetailMetric label="Rate Limit Proximity" value={`${provider.rateLimitProximity}%`} />
              <DetailMetric label="Recent Errors" value={provider.recentErrors.toString()} />
              <DetailMetric label="Active Requests" value={provider.activeRequests.toString()} />
              <DetailMetric label="Requests Today" value={provider.requestsToday.toLocaleString()} />
              <DetailMetric label="Success Rate" value={`${provider.successRate.toFixed(1)}%`} />
            </div>
          </div>

          {/* Last Error Details */}
          {provider.lastError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-red-800 mb-2">Last Error</h3>
              <p className="text-sm text-red-700 mb-2">{provider.lastError}</p>
              {provider.lastErrorTime && (
                <p className="text-xs text-red-600">
                  Occurred: {format(provider.lastErrorTime, 'PPpp')}
                </p>
              )}
            </div>
          )}

          {/* Last Downtime */}
          {provider.lastDowntime && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-yellow-800 mb-2">Last Downtime</h3>
              <p className="text-sm text-yellow-700">
                {format(provider.lastDowntime, 'PPpp')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white p-4 rounded border border-gray-200">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-lg font-bold text-gray-900">{value}</p>
    </div>
  );
}

interface ChartSectionProps {
  title: string;
  data: Array<{ timestamp: Date; value: number }>;
  dataKey: string;
  color: string;
  prefix?: string;
}

function ChartSection({ title, data, dataKey, color, prefix = '' }: ChartSectionProps) {
  const chartData = data.map(point => ({
    time: format(point.timestamp, 'HH:mm'),
    [dataKey]: point.value
  }));

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 12 }}
            interval="preserveStartEnd"
          />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip
            formatter={(value) => `${prefix}${value}`}
            labelFormatter={(label) => `Time: ${label}`}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            dot={false}
            name={title.split('(')[0].trim()}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function getHealthColor(score: number): 'green' | 'yellow' | 'red' {
  if (score >= 90) return 'green';
  if (score >= 70) return 'yellow';
  return 'red';
}
