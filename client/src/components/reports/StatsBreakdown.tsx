import { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Star } from 'lucide-react';
import type { ShootReport } from '@/lib/reports';

interface StatsBreakdownProps {
  report: ShootReport;
}

export function StatsBreakdown({ report }: StatsBreakdownProps) {
  const stats = [
    { stars: 5, count: report.fiveStarCount, color: 'bg-yellow-400' },
    { stars: 4, count: report.fourStarCount, color: 'bg-yellow-300' },
    { stars: 3, count: report.threeStarCount, color: 'bg-gray-400' },
    { stars: 2, count: report.twoStarCount, color: 'bg-orange-400' },
    { stars: 1, count: report.oneStarCount, color: 'bg-red-400' },
  ];

  const maxCount = Math.max(...stats.map((s) => s.count));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Star Rating Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {stats.map((stat) => (
            <StatBar
              key={stat.stars}
              stars={stat.stars}
              count={stat.count}
              total={report.totalImages}
              maxCount={maxCount}
              color={stat.color}
            />
          ))}

          {/* Total */}
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between font-semibold">
              <span>Total Images</span>
              <span>{report.totalImages}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface StatBarProps {
  stars: number;
  count: number;
  total: number;
  maxCount: number;
  color: string;
}

function StatBar({ stars, count, total, maxCount, color }: StatBarProps) {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  const barWidth = maxCount > 0 ? (count / maxCount) * 100 : 0;
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (barRef.current) {
      // Animate bar width
      setTimeout(() => {
        if (barRef.current) {
          barRef.current.style.width = `${barWidth}%`;
        }
      }, 100);
    }
  }, [barWidth]);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-1">
          {Array.from({ length: stars }).map((_, i) => (
            <Star key={i} className="w-4 h-4 fill-current text-yellow-400" />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium">{count}</span>
          <span className="text-muted-foreground">
            ({percentage.toFixed(1)}%)
          </span>
        </div>
      </div>
      <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
        <div
          ref={barRef}
          className={`h-full ${color} transition-all duration-1000 ease-out rounded-full`}
          style={{ width: 0 }}
        />
      </div>
    </div>
  );
}
