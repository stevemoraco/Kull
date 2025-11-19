import { useState } from 'react';
import { useRoute, Link } from 'wouter';
import { useReport, useDeleteReport } from '@/hooks/useReports';
import { ReportHero } from '@/components/reports/ReportHero';
import { StatsBreakdown } from '@/components/reports/StatsBreakdown';
import { TopSelectsGallery } from '@/components/reports/TopSelectsGallery';
import { NarrativeSummary } from '@/components/reports/NarrativeSummary';
import { ExportDownloads } from '@/components/reports/ExportDownloads';
import { ShareModal } from '@/components/reports/ShareModal';
import { XMPExportDialog } from '@/components/XMPExportDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { useLocation } from 'wouter';
import { Footer } from '@/components/Footer';

export default function ReportDetail() {
  const [, params] = useRoute('/reports/:id');
  const reportId = params?.id || '';
  const [, navigate] = useLocation();

  const { data: report, isLoading, error } = useReport(reportId);
  const deleteReport = useDeleteReport();

  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [xmpExportDialogOpen, setXmpExportDialogOpen] = useState(false);

  const handleDelete = async () => {
    try {
      await deleteReport.mutateAsync(reportId);
      navigate('/reports');
    } catch (error) {
      console.error('Failed to delete report:', error);
    }
  };

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
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 mx-auto text-destructive mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Report not found</h2>
          <p className="text-muted-foreground mb-6">
            {error?.message || 'The report you are looking for does not exist.'}
          </p>
          <Link href="/reports">
            <Button className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Reports
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
        onShare={() => setShareModalOpen(true)}
        onDelete={() => setDeleteDialogOpen(true)}
        onExportXmp={() => setXmpExportDialogOpen(true)}
      />

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Back Link */}
          <Link href="/reports">
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Reports
            </Button>
          </Link>

          {/* Stats Breakdown */}
          <StatsBreakdown report={report} />

          {/* Top Selects Gallery */}
          <TopSelectsGallery topSelects={report.topSelects} />

          {/* AI Narrative */}
          <NarrativeSummary
            narrative={report.narrative}
            provider={report.provider}
          />

          {/* Export Downloads */}
          {report.exportLinks && report.exportLinks.length > 0 && (
            <ExportDownloads
              reportId={report.id}
              exportLinks={report.exportLinks}
            />
          )}
        </div>
      </main>

      <Footer />

      {/* Share Modal */}
      <ShareModal
        reportId={report.id}
        reportName={report.shootName}
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
      />

      {/* XMP Export Dialog */}
      <XMPExportDialog
        reportId={report.id}
        reportName={report.shootName}
        totalImages={report.totalImages}
        isOpen={xmpExportDialogOpen}
        onClose={() => setXmpExportDialogOpen(false)}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the report for "{report.shootName}".
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Report
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
