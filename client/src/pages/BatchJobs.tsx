import { BatchJobMonitor } from '@/components/BatchJobMonitor';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { usePageTracking } from '@/hooks/usePageTracking';
import { Link } from 'wouter';

export default function BatchJobs() {
  usePageTracking('batch-jobs');

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/">
            <button className="flex items-center gap-2 hover-elevate active-elevate-2 rounded-lg px-2 py-1 -ml-2 transition-all">
              <img src="/kull-logo.png" alt="Kull Logo" className="w-8 h-8 rounded-lg" />
              <span className="text-xl font-black text-foreground">Kull</span>
            </button>
          </Link>

          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <div className="pt-24 pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          <BatchJobMonitor />
        </div>
      </div>
    </div>
  );
}
