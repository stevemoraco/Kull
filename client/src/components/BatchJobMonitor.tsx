import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Loader2,
  AlertCircle,
  Activity,
  CheckCircle,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import { useGroupedBatchJobs } from '@/hooks/useBatchJobs';
import { BatchJobCard } from './BatchJobCard';

export function BatchJobMonitor() {
  const [searchQuery, setSearchQuery] = useState('');
  const { data: groupedJobs, isLoading, error, refetch } = useGroupedBatchJobs();

  // Filter jobs based on search query
  const filterJobs = (jobs: any[]) => {
    if (!searchQuery.trim()) return jobs;

    const query = searchQuery.toLowerCase();
    return jobs.filter(
      (job) =>
        job.id.toLowerCase().includes(query) ||
        job.shootId.toLowerCase().includes(query) ||
        job.providerId.toLowerCase().includes(query)
    );
  };

  const filteredActive = filterJobs(groupedJobs?.active || []);
  const filteredCompleted = filterJobs(groupedJobs?.completed || []);
  const filteredFailed = filterJobs(groupedJobs?.failed || []);

  if (isLoading) {
    return (
      <Card className="p-8" data-testid="batch-monitor-loading">
        <div className="flex items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading batch jobs...</span>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-8" data-testid="batch-monitor-error">
        <div className="flex items-start gap-3 text-red-600">
          <AlertCircle className="w-5 h-5 mt-0.5" />
          <div>
            <div className="font-semibold mb-1">Failed to load batch jobs</div>
            <div className="text-sm">{error.message}</div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="mt-3"
              data-testid="button-retry-load"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  const totalJobs = (groupedJobs?.active.length || 0) +
                    (groupedJobs?.completed.length || 0) +
                    (groupedJobs?.failed.length || 0);

  if (totalJobs === 0) {
    return (
      <Card className="p-8" data-testid="batch-monitor-empty">
        <div className="text-center text-muted-foreground">
          <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <div className="font-semibold mb-1">No batch jobs yet</div>
          <div className="text-sm">
            Process photos in Economy mode to see batch jobs here
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6" data-testid="batch-monitor">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-1">Batch Jobs</h2>
          <p className="text-sm text-muted-foreground">
            Monitor your Economy mode batch processing jobs
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          data-testid="button-refresh-jobs"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by job ID, shoot ID, or provider..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
          data-testid="input-search-jobs"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="active" className="gap-2" data-testid="tab-active">
            <Loader2 className="w-4 h-4" />
            Active
            {filteredActive.length > 0 && (
              <Badge variant="default" className="ml-1">
                {filteredActive.length}
              </Badge>
            )}
          </TabsTrigger>

          <TabsTrigger value="completed" className="gap-2" data-testid="tab-completed">
            <CheckCircle className="w-4 h-4" />
            Completed
            {filteredCompleted.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {filteredCompleted.length}
              </Badge>
            )}
          </TabsTrigger>

          <TabsTrigger value="failed" className="gap-2" data-testid="tab-failed">
            <XCircle className="w-4 h-4" />
            Failed
            {filteredFailed.length > 0 && (
              <Badge variant="destructive" className="ml-1">
                {filteredFailed.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Active Jobs */}
        <TabsContent value="active" className="space-y-3 mt-4" data-testid="tab-content-active">
          {filteredActive.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <div className="text-sm">No active jobs</div>
            </div>
          ) : (
            filteredActive.map((job) => (
              <BatchJobCard key={job.id} job={job} />
            ))
          )}
        </TabsContent>

        {/* Completed Jobs */}
        <TabsContent value="completed" className="space-y-3 mt-4" data-testid="tab-content-completed">
          {filteredCompleted.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <div className="text-sm">No completed jobs</div>
            </div>
          ) : (
            filteredCompleted.map((job) => (
              <BatchJobCard key={job.id} job={job} />
            ))
          )}
        </TabsContent>

        {/* Failed Jobs */}
        <TabsContent value="failed" className="space-y-3 mt-4" data-testid="tab-content-failed">
          {filteredFailed.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <XCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <div className="text-sm">No failed jobs</div>
            </div>
          ) : (
            filteredFailed.map((job) => (
              <BatchJobCard key={job.id} job={job} />
            ))
          )}
        </TabsContent>
      </Tabs>
    </Card>
  );
}
