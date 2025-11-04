import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Cpu, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { CreditUsageSummary } from '@/api/credits';

interface UsageSummaryProps {
  summary: CreditUsageSummary | null;
  loading?: boolean;
}

const providerConfig: Record<string, { name: string; color: string }> = {
  'apple-intelligence': { name: 'Apple Intelligence', color: '#000000' },
  'gemini': { name: 'Google Gemini', color: '#4285F4' },
  'claude': { name: 'Anthropic Claude', color: '#D97757' },
  'openai': { name: 'OpenAI', color: '#10A37F' },
  'groq': { name: 'Groq', color: '#FF6B6B' },
  'grok': { name: 'Grok', color: '#1DA1F2' },
};

export function UsageSummary({ summary, loading }: UsageSummaryProps) {
  if (loading || !summary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Usage Summary</CardTitle>
          <CardDescription>Loading usage statistics...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-[200px] w-full" />
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const providerData = Object.entries(summary.byProvider || {}).map(([provider, data]) => ({
    provider,
    name: providerConfig[provider]?.name || provider,
    color: providerConfig[provider]?.color || '#888888',
    total: data.total / 100, // Convert to dollars
    count: data.count,
    lastUsed: data.lastUsed,
  })).sort((a, b) => b.total - a.total);

  const hasUsage = providerData.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Usage Summary</CardTitle>
        <CardDescription>
          Breakdown of AI provider usage
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-muted/50 space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              <span>Total Purchased</span>
            </div>
            <p className="text-2xl font-bold text-green-600">
              ${(summary.totalPurchased / 100).toFixed(2)}
            </p>
          </div>
          <div className="p-4 rounded-lg bg-muted/50 space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Cpu className="h-4 w-4" />
              <span>Total Spent</span>
            </div>
            <p className="text-2xl font-bold text-red-600">
              ${(summary.totalSpent / 100).toFixed(2)}
            </p>
          </div>
        </div>

        {hasUsage ? (
          <>
            {/* Bar chart */}
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={providerData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    className="text-xs"
                  />
                  <YAxis
                    label={{ value: 'Spent ($)', angle: -90, position: 'insideLeft' }}
                    className="text-xs"
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload[0]) return null;
                      const data = payload[0].payload;
                      return (
                        <div className="bg-background border rounded-lg shadow-lg p-3 space-y-1">
                          <p className="font-semibold">{data.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Spent: ${data.total.toFixed(2)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Requests: {data.count}
                          </p>
                          {data.lastUsed && (
                            <p className="text-xs text-muted-foreground">
                              Last used: {format(new Date(data.lastUsed), 'MMM d, yyyy')}
                            </p>
                          )}
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="total" radius={[8, 8, 0, 0]}>
                    {providerData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Provider list */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Provider Breakdown</h3>
              {providerData.map((provider) => (
                <div
                  key={provider.provider}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: provider.color }}
                    />
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">{provider.name}</span>
                      {provider.lastUsed && (
                        <span className="text-xs text-muted-foreground">
                          Last used {format(new Date(provider.lastUsed), 'MMM d, yyyy')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    <span className="font-mono font-medium">
                      ${provider.total.toFixed(2)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {provider.count} {provider.count === 1 ? 'request' : 'requests'}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-lg bg-muted/50 text-center">
              <p className="text-sm font-medium">
                Total spent: ${(summary.totalSpent / 100).toFixed(2)} across {providerData.reduce((sum, p) => sum + p.count, 0)} requests
              </p>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-full bg-muted">
                <Cpu className="h-8 w-8 text-muted-foreground" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              No usage data yet. Start using AI culling features to see your usage breakdown.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
