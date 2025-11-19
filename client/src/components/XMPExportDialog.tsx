/**
 * XMP Export Dialog Component
 *
 * Provides UI for exporting AI ratings as XMP sidecar files for Adobe Lightroom.
 * Displays progress, instructions, and download functionality.
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Download, FileDown, CheckCircle, AlertCircle, Lightbulb } from 'lucide-react';

interface XMPExportDialogProps {
  reportId: string;
  reportName: string;
  totalImages: number;
  isOpen: boolean;
  onClose: () => void;
}

type ExportState = 'idle' | 'downloading' | 'success' | 'error';

export function XMPExportDialog({
  reportId,
  reportName,
  totalImages,
  isOpen,
  onClose,
}: XMPExportDialogProps) {
  const [exportState, setExportState] = useState<ExportState>('idle');
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleExport = async () => {
    try {
      setExportState('downloading');
      setProgress(0);

      // Create download URL
      const url = `/api/xmp-export/${reportId}`;

      // Fetch the ZIP file
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Export failed with status ${response.status}`);
      }

      // Get total file count from response header
      const totalFiles = parseInt(response.headers.get('X-Total-Files') || '0', 10);

      // Read response as blob with progress tracking
      const reader = response.body?.getReader();
      const contentLength = parseInt(response.headers.get('Content-Length') || '0', 10);

      if (!reader) {
        throw new Error('Response body is not readable');
      }

      const chunks: Uint8Array[] = [];
      let receivedLength = 0;

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        chunks.push(value);
        receivedLength += value.length;

        // Update progress based on received bytes
        if (contentLength > 0) {
          const progressPercent = Math.min(95, (receivedLength / contentLength) * 100);
          setProgress(progressPercent);
        } else {
          // Fallback: estimate progress based on average file size
          const estimatedSize = totalFiles * 2000; // ~2KB per XMP file
          const progressPercent = Math.min(95, (receivedLength / estimatedSize) * 100);
          setProgress(progressPercent);
        }
      }

      // Combine chunks into single blob
      const blob = new Blob(chunks, { type: 'application/zip' });

      // Complete progress
      setProgress(100);

      // Trigger download
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${reportName}-xmp.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      // Success state
      setExportState('success');
    } catch (error) {
      console.error('XMP export error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to export XMP files');
      setExportState('error');
    }
  };

  const handleClose = () => {
    setExportState('idle');
    setProgress(0);
    setErrorMessage('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDown className="w-5 h-5" />
            Export to Adobe Lightroom
          </DialogTitle>
          <DialogDescription>
            Download XMP sidecar files to import AI ratings into Lightroom Classic
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Export Status */}
          {exportState === 'idle' && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <h4 className="font-semibold text-sm">What you'll get:</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• {totalImages} XMP sidecar files (one per image)</li>
                  <li>• Star ratings (1-5 stars)</li>
                  <li>• Color labels (red, yellow, green, blue, purple)</li>
                  <li>• Keywords and descriptions</li>
                  <li>• Detailed Kull AI scores (for future re-ranking)</li>
                  <li>• Import instructions (README file)</li>
                </ul>
              </div>

              <Alert>
                <Lightbulb className="h-4 w-4" />
                <AlertTitle>How to use</AlertTitle>
                <AlertDescription className="text-sm space-y-2 mt-2">
                  <p>
                    1. Extract the ZIP file next to your RAW image files
                  </p>
                  <p>
                    2. Ensure XMP files have the same base name as your RAW files:
                    <br />
                    <code className="text-xs bg-muted px-1 py-0.5 rounded">
                      IMG_1234.CR3 → IMG_1234.xmp
                    </code>
                  </p>
                  <p>
                    3. Open Adobe Lightroom Classic
                  </p>
                  <p>
                    4. Import the folder - Lightroom will automatically apply metadata
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    If ratings don't appear: Select all photos → Metadata → Read Metadata from Files
                  </p>
                </AlertDescription>
              </Alert>
            </div>
          )}

          {exportState === 'downloading' && (
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <Download className="w-12 h-12 mx-auto text-primary animate-pulse" />
                <p className="font-medium">Generating XMP files...</p>
                <p className="text-sm text-muted-foreground">
                  Processing {totalImages} images
                </p>
              </div>
              <Progress value={progress} className="w-full" />
              <p className="text-xs text-center text-muted-foreground">
                {Math.round(progress)}% complete
              </p>
            </div>
          )}

          {exportState === 'success' && (
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <CheckCircle className="w-12 h-12 mx-auto text-green-500" />
                <p className="font-medium">Export Complete!</p>
                <p className="text-sm text-muted-foreground">
                  {totalImages} XMP files downloaded successfully
                </p>
              </div>
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-900">Next steps</AlertTitle>
                <AlertDescription className="text-sm text-green-800">
                  <ol className="list-decimal list-inside space-y-1 mt-2">
                    <li>Extract the ZIP file next to your RAW images</li>
                    <li>Open Adobe Lightroom Classic</li>
                    <li>Import the folder with your RAW files</li>
                    <li>Ratings and metadata will appear automatically</li>
                  </ol>
                  <p className="mt-2 text-xs">
                    See the included README file for detailed instructions.
                  </p>
                </AlertDescription>
              </Alert>
            </div>
          )}

          {exportState === 'error' && (
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <AlertCircle className="w-12 h-12 mx-auto text-destructive" />
                <p className="font-medium">Export Failed</p>
                <p className="text-sm text-muted-foreground">{errorMessage}</p>
              </div>
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription className="text-sm">
                  {errorMessage || 'An unknown error occurred during export.'}
                  <br />
                  <br />
                  Please try again. If the problem persists, contact support.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </div>

        <DialogFooter>
          {exportState === 'idle' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleExport} className="gap-2">
                <Download className="w-4 h-4" />
                Download XMP Files
              </Button>
            </>
          )}

          {exportState === 'downloading' && (
            <Button variant="outline" disabled>
              Downloading...
            </Button>
          )}

          {(exportState === 'success' || exportState === 'error') && (
            <>
              {exportState === 'error' && (
                <Button variant="outline" onClick={handleExport}>
                  Try Again
                </Button>
              )}
              <Button onClick={handleClose}>Close</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
