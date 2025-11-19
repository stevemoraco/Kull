import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface ScriptStepStats {
  step: number;
  count: number;
  description: string;
}

interface ScriptFunnelData {
  totalSessions: number;
  stepStats: ScriptStepStats[];
}

export function ScriptStepFunnelView() {
  const { data, isLoading } = useQuery<ScriptFunnelData>({
    queryKey: ['/api/admin/script-funnel'],
    staleTime: 30000, // Cache for 30 seconds
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sales Script Funnel Analysis</CardTitle>
          <CardDescription>Loading funnel data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.stepStats.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sales Script Funnel Analysis</CardTitle>
          <CardDescription>No conversation data available yet</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center">
            <p className="text-muted-foreground">No data to display</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const maxCount = Math.max(...data.stepStats.map(s => s.count));

  // Calculate drop-off percentages
  const funnelData = data.stepStats.map((stat, index) => {
    const percentage = data.totalSessions > 0
      ? Math.round((stat.count / data.totalSessions) * 100)
      : 0;

    const dropoff = index > 0 && data.stepStats[index - 1]
      ? data.stepStats[index - 1].count - stat.count
      : 0;

    const dropoffPercentage = index > 0 && data.stepStats[index - 1]
      ? Math.round((dropoff / data.stepStats[index - 1].count) * 100)
      : 0;

    return {
      ...stat,
      percentage,
      dropoff,
      dropoffPercentage,
    };
  });

  // Color scale from green (early steps) to red (late steps)
  const getBarColor = (step: number) => {
    if (step <= 5) return "hsl(142, 76%, 36%)"; // Green
    if (step <= 10) return "hsl(48, 96%, 53%)"; // Yellow
    return "hsl(217, 91%, 60%)"; // Blue
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>15-Step Sales Script Funnel</CardTitle>
        <CardDescription>
          Track how many conversations reach each step of the sales script - identify drop-off points
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Total Conversations</p>
            <p className="text-2xl font-bold">{data.totalSessions}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Reached Step 10+</p>
            <p className="text-2xl font-bold">
              {data.stepStats.filter(s => s.step >= 10).reduce((sum, s) => sum + s.count, 0)}
            </p>
            <p className="text-xs text-muted-foreground">
              {data.totalSessions > 0
                ? Math.round((data.stepStats.filter(s => s.step >= 10).reduce((sum, s) => sum + s.count, 0) / data.totalSessions) * 100)
                : 0}% of total
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Reached Step 13+ (Pricing)</p>
            <p className="text-2xl font-bold">
              {data.stepStats.filter(s => s.step >= 13).reduce((sum, s) => sum + s.count, 0)}
            </p>
            <p className="text-xs text-muted-foreground">
              {data.totalSessions > 0
                ? Math.round((data.stepStats.filter(s => s.step >= 13).reduce((sum, s) => sum + s.count, 0) / data.totalSessions) * 100)
                : 0}% of total
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Reached Step 15 (Close)</p>
            <p className="text-2xl font-bold">
              {data.stepStats.find(s => s.step === 15)?.count || 0}
            </p>
            <p className="text-xs text-muted-foreground">
              {data.totalSessions > 0
                ? Math.round(((data.stepStats.find(s => s.step === 15)?.count || 0) / data.totalSessions) * 100)
                : 0}% conversion
            </p>
          </div>
        </div>

        {/* Bar Chart */}
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={funnelData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="step"
                label={{ value: 'Script Step', position: 'insideBottom', offset: -5 }}
              />
              <YAxis label={{ value: 'Conversations', angle: -90, position: 'insideLeft' }} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload[0]) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-background border rounded-lg shadow-lg p-3 space-y-1">
                        <p className="font-semibold">Step {data.step}/15</p>
                        <p className="text-sm text-muted-foreground">{data.description}</p>
                        <p className="text-sm font-medium">{data.count} conversations ({data.percentage}%)</p>
                        {data.dropoff > 0 && (
                          <p className="text-sm text-red-600">
                            ↓ {data.dropoff} dropped off ({data.dropoffPercentage}%)
                          </p>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="count">
                {funnelData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(entry.step)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Step-by-Step Breakdown */}
        <div className="border rounded-lg divide-y max-h-[500px] overflow-y-auto">
          {funnelData.map((stat, index) => (
            <div key={stat.step} className="p-3 hover:bg-muted/50">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                      style={{ backgroundColor: getBarColor(stat.step) }}
                    >
                      {stat.step}
                    </div>
                    <div>
                      <p className="font-medium">{stat.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {stat.count} conversations ({stat.percentage}% of total)
                      </p>
                    </div>
                  </div>
                </div>
                {stat.dropoff > 0 && (
                  <div className="text-right">
                    <p className="text-sm font-medium text-red-600">
                      ↓ {stat.dropoff} dropped
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ({stat.dropoffPercentage}% drop-off)
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
