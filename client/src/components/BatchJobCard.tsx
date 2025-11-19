import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2,
  X,
  Download,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  type BatchJobStatus,
  calculateETA,
  getProviderDisplayName,
  useCancelBatchJob,
  useBatchJobResults,
} from '@/hooks/useBatchJobs';
import { formatDistanceToNow } from 'date-fns';

interface BatchJobCardProps {
  job: BatchJobStatus;
  onViewResults?: (jobId: string) => void;
}

export function BatchJobCard({ job, onViewResults }: BatchJobCardProps) {
  const [isExpanded, setIsExpanded] = useState(job.status === 'processing');
  const cancelMutation = useCancelBatchJob();
  const { data: results } = useBatchJobResults(
    job.status === 'completed' ? job.id : null
  );

  const progressPercentage = (job.processedImages / job.totalImages) * 100;
  const eta = calculateETA(job);

  const handleCancel = async () => {
    if (window.confirm('Are you sure you want to cancel this batch job?')) {
      await cancelMutation.mutateAsync(job.jobId);
    }
  };

  const handleDownloadResults = () => {
    if (results && onViewResults) {
      onViewResults(job.jobId);
    }
  };

  return (
    <Card className="p-4 hover:shadow-md transition-shadow" data-testid={`batch-job-card-${job.jobId}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3 flex-1">
          {/* Status Icon */}
          <div className="mt-1">
            {job.status === 'processing' && (
              <Loader2 className="w-5 h-5 text-blue-500 animate-spin" data-testid="icon-processing" />
            )}
            {job.status === 'completed' && (
              <CheckCircle className="w-5 h-5 text-green-500" data-testid="icon-completed" />
            )}
            {job.status === 'failed' && (
              <AlertCircle className="w-5 h-5 text-red-500" data-testid="icon-failed" />
            )}
          </div>

          {/* Job Info */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-foreground" data-testid="job-id">
                {job.jobId}
              </h3>
              <Badge variant={job.mode === 'economy' ? 'secondary' : 'default'} data-testid="job-mode">
                {job.mode === 'economy' ? 'Economy' : 'Fast'}
              </Badge>
              <Badge variant="outline" data-testid="job-provider">
                {getProviderDisplayName(job.providerId)}
              </Badge>
            </div>

            <div className="text-sm text-muted-foreground">
              {job.totalImages} images • Created{' '}
              {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {job.status === 'processing' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              disabled={cancelMutation.isPending}
              data-testid="button-cancel-job"
            >
              <X className="w-4 h-4" />
            </Button>
          )}

          {job.status === 'completed' && results && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownloadResults}
              data-testid="button-download-results"
            >
              <Download className="w-4 h-4" />
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            data-testid="button-toggle-expand"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="space-y-3 pt-3 border-t border-border" data-testid="expanded-details">
          {/* Progress Bar */}
          {job.status === 'processing' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground" data-testid="progress-text">
                  {job.processedImages} / {job.totalImages} ({Math.round(progressPercentage)}%)
                </span>
                {eta && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span data-testid="eta">{eta}</span>
                  </div>
                )}
              </div>
              <Progress value={progressPercentage} className="h-2" data-testid="progress-bar" />
            </div>
          )}

          {/* Completed Info */}
          {job.status === 'completed' && job.completedAt && (
            <div className="text-sm text-muted-foreground" data-testid="completed-info">
              Completed{' '}
              {formatDistanceToNow(new Date(job.completedAt), { addSuffix: true })}
              <div className="mt-1 font-medium text-foreground">
                Processed {job.processedImages} images successfully
              </div>
            </div>
          )}

          {/* Error Info */}
          {job.status === 'failed' && job.error && (
            <div
              className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-md"
              data-testid="error-message"
            >
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium mb-1">Error</div>
                  <div className="text-xs">{job.error}</div>
                </div>
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
            <div>
              <div className="font-medium mb-1">Created</div>
              <div>{new Date(job.createdAt).toLocaleString()}</div>
            </div>
            {job.startedAt && (
              <div>
                <div className="font-medium mb-1">Started</div>
                <div>{new Date(job.startedAt).toLocaleString()}</div>
              </div>
            )}
            {job.completedAt && (
              <div>
                <div className="font-medium mb-1">Completed</div>
                <div>{new Date(job.completedAt).toLocaleString()}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
