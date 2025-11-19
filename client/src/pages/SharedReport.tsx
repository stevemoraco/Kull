import { useRoute, Link } from 'wouter';
import { useSharedReport } from '@/hooks/useReports';
import { ReportHero } from '@/components/reports/ReportHero';
import { StatsBreakdown } from '@/components/reports/StatsBreakdown';
import { TopSelectsGallery } from '@/components/reports/TopSelectsGallery';
import { NarrativeSummary } from '@/components/reports/NarrativeSummary';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, ExternalLink, Sparkles } from 'lucide-react';
import { Footer } from '@/components/Footer';

export default function SharedReport() {
  const [, params] = useRoute('/reports/shared/:token');
  const token = params?.token || '';

  const { data: report, isLoading, error } = useSharedReport(token);

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-12">
          <Skeleton className="h-12 w-64 mb-4" />
          <Skeleton className="h-6 w-48 mb-8" />
          <div className="space-y-8">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !report) {
    const isExpired = error?.message?.includes('expired');

    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <AlertTriangle className="w-16 h-16 mx-auto text-destructive mb-4" />
          <h2 className="text-2xl font-semibold mb-2">
            {isExpired ? 'Link Expired' : 'Report Not Found'}
          </h2>
          <p className="text-muted-foreground mb-6">
            {isExpired
              ? 'This shared link has expired. Please request a new link from the report owner.'
              : error?.message || 'The shared report you are looking for does not exist.'}
          </p>
          <Link href="/landing">
            <Button className="gap-2">
              <ExternalLink className="w-4 h-4" />
              Learn About Kull AI
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Hero Section */}
      <ReportHero
        report={report}
        onShare={() => {}}
        onDelete={() => {}}
        onExportXmp={() => {}}
        isShared={true}
      />

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* CTA Card */}
          <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-full">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-2">
                    Generate Your Own AI Reports
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Get AI-powered photo culling reports like this one for your
                    own shoots. Kull AI uses advanced AI to analyze and rate
                    your photos, saving you hours of manual work.
                  </p>
                  <Link href="/landing">
                    <Button className="gap-2">
                      <ExternalLink className="w-4 h-4" />
                      Get Started with Kull AI
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Breakdown */}
          <StatsBreakdown report={report} />

          {/* Top Selects Gallery */}
          <TopSelectsGallery topSelects={report.topSelects} />

          {/* AI Narrative */}
          <NarrativeSummary
            narrative={report.narrative}
            provider={report.provider}
          />

          {/* Footer CTA */}
          <Card className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
            <CardContent className="p-8 text-center">
              <h3 className="text-2xl font-bold mb-3">
                Ready to Transform Your Workflow?
              </h3>
              <p className="text-primary-foreground/90 mb-6 max-w-2xl mx-auto">
                Join thousands of photographers using Kull AI to streamline
                their photo culling process with AI-powered insights.
              </p>
              <Link href="/landing">
                <Button
                  size="lg"
                  variant="secondary"
                  className="gap-2 bg-white text-primary hover:bg-white/90"
                >
                  <Sparkles className="w-5 h-5" />
                  Start Your Free Trial
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
