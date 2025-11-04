import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, FileSpreadsheet, Archive } from 'lucide-react';
import { downloadExport } from '@/lib/reports';

interface ExportDownloadsProps {
  reportId: string;
  exportLinks: string[];
}

export function ExportDownloads({ reportId, exportLinks }: ExportDownloadsProps) {
  if (!exportLinks || exportLinks.length === 0) {
    return null;
  }

  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'csv':
      case 'xlsx':
        return FileSpreadsheet;
      case 'zip':
        return Archive;
      default:
        return FileText;
    }
  };

  const getFileSize = (url: string) => {
    // In a real app, you'd fetch this from the backend
    return 'Ready';
  };

  const getFileName = (url: string) => {
    return url.split('/').pop() || url;
  };

  const handleDownload = (url: string) => {
    const filename = getFileName(url);
    downloadExport(reportId, filename);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Export Downloads</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {exportLinks.map((link, index) => {
            const filename = getFileName(link);
            const Icon = getFileIcon(filename);

            return (
              <div
                key={index}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{filename}</p>
                    <p className="text-xs text-muted-foreground">
                      {getFileSize(link)}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleDownload(link)}
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
