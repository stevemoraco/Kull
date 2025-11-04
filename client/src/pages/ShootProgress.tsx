import { useState, useEffect } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, Clock, Loader2, XCircle, Image as ImageIcon } from 'lucide-react';
import { ShootProgressData } from '@shared/types/sync';

export default function ShootProgress() {
  const [, params] = useRoute('/shoots/:shootId');
  const [, setLocation] = useLocation();
  const shootId = params?.shootId;

  const [progress, setProgress] = useState<ShootProgressData | null>(null);

  useWebSocket({
    onShootProgress: (data) => {
      if (data.shootId === shootId) {
        console.log('[ShootProgress] Progress update:', data);
        setProgress(data);
      }
    },
  });

  useEffect(() => {
    // If shoot is completed, redirect to report after 3 seconds
    if (progress?.status === 'completed') {
      const timer = setTimeout(() => {
        setLocation(`/shoots/${shootId}/report`);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [progress?.status, shootId, setLocation]);

  const getStatusIcon = () => {
    switch (progress?.status) {
      case 'queued':
        return <Clock className="h-5 w-5" />;
      case 'processing':
        return <Loader2 className="h-5 w-5 animate-spin" />;
      case 'completed':
        return <CheckCircle2 className="h-5 w-5" />;
      case 'failed':
        return <XCircle className="h-5 w-5" />;
      default:
        return <Clock className="h-5 w-5" />;
    }
  };

  const getStatusColor = () => {
    switch (progress?.status) {
      case 'queued':
        return 'bg-yellow-500';
      case 'processing':
        return 'bg-blue-500';
      case 'completed':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    switch (progress?.status) {
      case 'queued':
        return 'Queued';
      case 'processing':
        return 'Processing';
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      default:
        return 'Unknown';
    }
  };

  const progressPercentage = progress
    ? Math.round((progress.processedCount / progress.totalCount) * 100)
    : 0;

  const formatETA = (seconds?: number) => {
    if (!seconds) return 'Calculating...';
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  if (!shootId) {
    return (
      <div className="container max-w-4xl mx-auto py-8">
        <Alert>
          <AlertDescription>Invalid shoot ID</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => setLocation('/dashboard')}
          className="mb-4"
        >
          ← Back to Dashboard
        </Button>
        <h1 className="text-3xl font-bold">Shoot Progress</h1>
        <p className="text-muted-foreground mt-2">
          Track your image processing in real-time
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Processing Status</CardTitle>
              <CardDescription>Shoot ID: {shootId}</CardDescription>
            </div>
            <Badge className={getStatusColor()}>
              <div className="flex items-center gap-2">
                {getStatusIcon()}
                {getStatusText()}
              </div>
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {!progress ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                Waiting for progress updates...
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Start processing on your device to see live updates
              </p>
            </div>
          ) : (
            <>
              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Progress</span>
                  <span className="text-muted-foreground">
                    {progress.processedCount} of {progress.totalCount} images
                  </span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{progressPercentage}%</span>
                  {progress.eta && (
                    <span className="text-muted-foreground">
                      ETA: {formatETA(progress.eta)}
                    </span>
                  )}
                </div>
              </div>

              {/* Current Image */}
              {progress.currentImage && progress.status === 'processing' && (
                <div className="p-4 rounded-lg bg-muted">
                  <div className="flex items-center gap-3">
                    <ImageIcon className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Currently Processing</p>
                      <p className="text-sm text-muted-foreground">
                        {progress.currentImage}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Provider Info */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Processing with:</span>
                <Badge variant="outline">{progress.provider}</Badge>
              </div>

              {/* Error Message */}
              {progress.status === 'failed' && progress.errorMessage && (
                <Alert variant="destructive">
                  <AlertDescription>{progress.errorMessage}</AlertDescription>
                </Alert>
              )}

              {/* Completion Message */}
              {progress.status === 'completed' && (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    Processing complete! Redirecting to report...
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Real-time Sync Indicator */}
      <div className="text-center text-sm text-muted-foreground">
        <div className="inline-flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span>Real-time sync active</span>
        </div>
      </div>
    </div>
  );
}
