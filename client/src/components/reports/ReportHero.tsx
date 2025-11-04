import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Share2, Trash2, Calendar, Zap } from 'lucide-react';
import type { ShootReport } from '@/lib/reports';

interface ReportHeroProps {
  report: ShootReport;
  onShare: () => void;
  onDelete: () => void;
  isShared?: boolean;
}

export function ReportHero({ report, onShare, onDelete, isShared }: ReportHeroProps) {
  const formattedDate = new Date(report.generatedAt).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="relative bg-gradient-to-br from-primary/10 via-primary/5 to-background border-b">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Metadata */}
          <div className="flex items-center gap-2 mb-4">
            <Badge variant="secondary" className="gap-1">
              <Calendar className="w-3 h-3" />
              {formattedDate}
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <Zap className="w-3 h-3" />
              {report.provider}
            </Badge>
            <Badge variant="outline">{report.creditCost} credits</Badge>
          </div>

          {/* Title */}
          <h1 className="text-4xl font-bold mb-6">{report.shootName}</h1>

          {/* Actions */}
          {!isShared && (
            <div className="flex gap-3">
              <Button onClick={onShare} variant="default" className="gap-2">
                <Share2 className="w-4 h-4" />
                Share Report
              </Button>
              <Button onClick={onDelete} variant="destructive" className="gap-2">
                <Trash2 className="w-4 h-4" />
                Delete Report
              </Button>
            </div>
          )}

          {isShared && (
            <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                You're viewing a shared report. Some features may be limited.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
