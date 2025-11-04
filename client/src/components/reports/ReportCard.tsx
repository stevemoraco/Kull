import { Link } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, Image as ImageIcon } from 'lucide-react';
import type { ReportListItem } from '@/lib/reports';

interface ReportCardProps {
  report: ReportListItem;
}

export function ReportCard({ report }: ReportCardProps) {
  const formattedDate = new Date(report.generatedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <Link href={`/reports/${report.id}`}>
      <Card className="cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] group">
        <CardContent className="p-0">
          {/* Thumbnail */}
          <div className="relative aspect-[4/3] bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
            {report.thumbnailUrl ? (
              <img
                src={report.thumbnailUrl}
                alt={report.shootName}
                className="w-full h-full object-cover transition-transform group-hover:scale-110"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon className="w-16 h-16 text-gray-400" />
              </div>
            )}
            {/* Provider badge */}
            <Badge
              className="absolute top-2 right-2 bg-black/70 text-white"
              variant="secondary"
            >
              {report.provider}
            </Badge>
          </div>

          {/* Content */}
          <div className="p-4">
            <h3 className="font-semibold text-lg truncate mb-2">
              {report.shootName}
            </h3>
            <p className="text-sm text-muted-foreground mb-3">{formattedDate}</p>

            {/* Stats */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                <span className="text-muted-foreground">
                  {report.totalImages} images
                </span>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">{report.fiveStarCount}</span>
                </div>
              </div>
              <span className="text-xs text-muted-foreground">
                {report.creditCost} credits
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
