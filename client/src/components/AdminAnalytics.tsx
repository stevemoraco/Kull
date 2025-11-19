/**
 * Admin Analytics Component
 *
 * Displays comprehensive aggregate analytics:
 * - Calculator metrics and distributions
 * - Conversation funnel visualization
 * - User engagement stats
 * - Trends over time
 */

import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  FunnelChart,
  Funnel,
  LabelList
} from 'recharts';
import { TrendingUp, Users, Calculator, MessageSquare, Clock, Target } from 'lucide-react';

interface AnalyticsData {
  dateRange: string;
  startDate: string | null;
  endDate: string;
  calculatorMetrics: {
    totalInteractions: number;
    averageShootsPerWeek: number;
    averageHoursPerShoot: number;
    averageBillableRate: number;
    percentageManuallyAdjusted: number;
    percentageClickedPresets: number;
    presetDistribution: Record<string, number>;
    shootsPerWeekDistribution: Record<string, number>;
    hoursPerShootDistribution: Record<string, number>;
    billableRateDistribution: Record<string, number>;
  };
  conversationMetrics: {
    totalSessions: number;
    averageMessagesPerSession: number;
    averageStepReached: number;
    conversionRate: number;
    reachedStep15Count: number;
    stepFunnel: Array<{ step: number; reached: number; droppedOff: number }>;
    maxStepDistribution: Record<string, number>;
  };
  engagementMetrics: {
    activeUsersCount: number;
    totalSessionsCreated: number;
    averageSessionDuration: number;
    repeatUserRate: number;
    repeatUserCount: number;
    totalUniqueUsers: number;
    deviceBreakdown: Record<string, number>;
    browserBreakdown: Record<string, number>;
    locationBreakdown: {
      countries: Record<string, number>;
      states: Record<string, number>;
    };
  };
  trendsOverTime: {
    dailyCalculatorInteractions: Array<{ date: string; count: number }>;
    dailySessions: Array<{ date: string; count: number }>;
    dailyConversions: Array<{ date: string; count: number }>;
  };
}

export default function AdminAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | 'all'>('30d');

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/analytics/aggregate?dateRange=${dateRange}`);
      if (!response.ok) throw new Error('Failed to fetch analytics');
      const result = await response.json();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Analytics</h3>
        <p className="text-red-700">{error}</p>
        <button
          onClick={fetchAnalytics}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <div className="space-y-8">
      {/* Header with Date Range Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">User Analytics</h2>
          <p className="text-gray-600 mt-1">
            Aggregate insights from calculator interactions and conversations
          </p>
        </div>
        <div className="flex gap-2">
          {(['7d', '30d', 'all'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                dateRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {range === '7d' ? 'Last 7 Days' : range === '30d' ? 'Last 30 Days' : 'All Time'}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          icon={Users}
          title="Active Users"
          value={data.engagementMetrics.activeUsersCount}
          subtitle={`${data.engagementMetrics.totalUniqueUsers} unique users`}
          color="blue"
        />
        <MetricCard
          icon={Calculator}
          title="Calculator Interactions"
          value={data.calculatorMetrics.totalInteractions}
          subtitle={`${data.calculatorMetrics.percentageManuallyAdjusted.toFixed(1)}% manually adjusted`}
          color="green"
        />
        <MetricCard
          icon={MessageSquare}
          title="Conversations"
          value={data.conversationMetrics.totalSessions}
          subtitle={`${data.conversationMetrics.averageMessagesPerSession.toFixed(1)} avg messages`}
          color="indigo"
        />
        <MetricCard
          icon={Target}
          title="Conversion Rate"
          value={`${data.conversationMetrics.conversionRate.toFixed(1)}%`}
          subtitle={`${data.conversationMetrics.reachedStep15Count} reached step 15`}
          color="purple"
        />
      </div>

      {/* Calculator Metrics */}
      <Section title="Calculator Insights">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Averages */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Average Values</h3>
            <div className="space-y-4">
              <ValueBar
                label="Shoots per Week"
                value={data.calculatorMetrics.averageShootsPerWeek.toFixed(1)}
                max={10}
                current={data.calculatorMetrics.averageShootsPerWeek}
              />
              <ValueBar
                label="Hours per Shoot"
                value={data.calculatorMetrics.averageHoursPerShoot.toFixed(1)}
                max={8}
                current={data.calculatorMetrics.averageHoursPerShoot}
              />
              <ValueBar
                label="Billable Rate"
                value={`$${data.calculatorMetrics.averageBillableRate.toFixed(0)}/hr`}
                max={200}
                current={data.calculatorMetrics.averageBillableRate}
              />
            </div>
          </div>

          {/* Preset Distribution */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Preset Usage</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Less', value: data.calculatorMetrics.presetDistribution.less || 0 },
                    { name: 'More', value: data.calculatorMetrics.presetDistribution.more || 0 },
                    { name: 'None', value: data.calculatorMetrics.presetDistribution.none || 0 },
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {COLORS.map((color, index) => (
                    <Cell key={`cell-${index}`} fill={color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-600">
                {data.calculatorMetrics.percentageClickedPresets.toFixed(1)}% clicked presets
              </p>
            </div>
          </div>
        </div>

        {/* Value Distributions (Histograms) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <DistributionChart
            title="Shoots per Week"
            data={data.calculatorMetrics.shootsPerWeekDistribution}
          />
          <DistributionChart
            title="Hours per Shoot"
            data={data.calculatorMetrics.hoursPerShootDistribution}
          />
          <DistributionChart
            title="Billable Rate"
            data={data.calculatorMetrics.billableRateDistribution}
          />
        </div>
      </Section>

      {/* Conversation Funnel */}
      <Section title="Conversation Funnel Analysis">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Script Step Progression</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={data.conversationMetrics.stepFunnel}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="step" type="category" label={{ value: 'Script Step', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="reached" fill="#3b82f6" name="Reached Step" />
              <Bar dataKey="droppedOff" fill="#ef4444" name="Dropped Off" />
            </BarChart>
          </ResponsiveContainer>

          <div className="mt-6 grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-900">
                {data.conversationMetrics.averageStepReached.toFixed(1)}
              </p>
              <p className="text-sm text-gray-600">Average Step Reached</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">
                {data.conversationMetrics.conversionRate.toFixed(1)}%
              </p>
              <p className="text-sm text-gray-600">Conversion Rate (Step 15)</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600">
                {data.conversationMetrics.averageMessagesPerSession.toFixed(1)}
              </p>
              <p className="text-sm text-gray-600">Avg Messages/Session</p>
            </div>
          </div>
        </div>
      </Section>

      {/* Engagement Metrics */}
      <Section title="User Engagement">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Session Stats */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Session Statistics</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Total Sessions</p>
                <p className="text-2xl font-bold text-gray-900">{data.engagementMetrics.totalSessionsCreated}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Avg Duration</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Math.floor(data.engagementMetrics.averageSessionDuration / 60)}m {data.engagementMetrics.averageSessionDuration % 60}s
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Repeat User Rate</p>
                <p className="text-2xl font-bold text-green-600">
                  {data.engagementMetrics.repeatUserRate.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500">
                  {data.engagementMetrics.repeatUserCount} of {data.engagementMetrics.totalUniqueUsers} users
                </p>
              </div>
            </div>
          </div>

          {/* Device Breakdown */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Device Types</h3>
            <div className="space-y-2">
              {Object.entries(data.engagementMetrics.deviceBreakdown).map(([device, count]) => (
                <div key={device} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{device}</span>
                  <span className="text-sm font-semibold text-gray-900">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Browser Breakdown */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Browsers</h3>
            <div className="space-y-2">
              {Object.entries(data.engagementMetrics.browserBreakdown).map(([browser, count]) => (
                <div key={browser} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{browser}</span>
                  <span className="text-sm font-semibold text-gray-900">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* Trends Over Time */}
      <Section title="Trends Over Time">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                type="category"
                allowDuplicatedCategory={false}
              />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                data={data.trendsOverTime.dailyCalculatorInteractions}
                type="monotone"
                dataKey="count"
                stroke="#3b82f6"
                name="Calculator Interactions"
                strokeWidth={2}
              />
              <Line
                data={data.trendsOverTime.dailySessions}
                type="monotone"
                dataKey="count"
                stroke="#10b981"
                name="Chat Sessions"
                strokeWidth={2}
              />
              <Line
                data={data.trendsOverTime.dailyConversions}
                type="monotone"
                dataKey="count"
                stroke="#8b5cf6"
                name="Conversions"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Section>
    </div>
  );
}

// Helper Components

interface MetricCardProps {
  icon: React.ElementType;
  title: string;
  value: string | number;
  subtitle: string;
  color: string;
}

function MetricCard({ icon: Icon, title, value, subtitle, color }: MetricCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
  }[color] || 'bg-gray-50 text-gray-700 border-gray-200';

  return (
    <div className={`p-6 rounded-lg border-2 ${colorClasses}`}>
      <div className="flex items-center gap-3 mb-2">
        <Icon className="w-6 h-6" />
        <h3 className="text-sm font-medium opacity-75">{title}</h3>
      </div>
      <p className="text-3xl font-bold mt-2">{value}</p>
      <p className="text-xs mt-1 opacity-75">{subtitle}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">{title}</h2>
      {children}
    </div>
  );
}

function ValueBar({ label, value, max, current }: { label: string; value: string; max: number; current: number }) {
  const percentage = Math.min((current / max) * 100, 100);

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-gray-600">{label}</span>
        <span className="text-lg font-bold text-gray-900">{value}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3">
        <div
          className="h-3 rounded-full bg-blue-600 transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function DistributionChart({ title, data }: { title: string; data: Record<string, number> }) {
  const chartData = Object.entries(data).map(([range, count]) => ({
    range,
    count,
  }));

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h4 className="text-sm font-semibold text-gray-900 mb-3">{title}</h4>
      <ResponsiveContainer width="100%" height={150}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="range" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip />
          <Bar dataKey="count" fill="#3b82f6" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
