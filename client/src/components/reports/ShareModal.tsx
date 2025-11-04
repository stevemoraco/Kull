import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, Check, ExternalLink } from 'lucide-react';
import { useShareReport } from '@/hooks/useReports';
import { Skeleton } from '@/components/ui/skeleton';

interface ShareModalProps {
  reportId: string;
  reportName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ShareModal({
  reportId,
  reportName,
  isOpen,
  onClose,
}: ShareModalProps) {
  const [shareUrl, setShareUrl] = useState<string>('');
  const [expiresAt, setExpiresAt] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const shareReport = useShareReport();

  const handleGenerate = async () => {
    try {
      const result = await shareReport.mutateAsync({
        id: reportId,
        expiresIn: 7 * 24 * 60 * 60, // 7 days
      });
      setShareUrl(result.url);
      setExpiresAt(result.expiresAt);
    } catch (error) {
      console.error('Failed to generate share link:', error);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatExpiryDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Report</DialogTitle>
          <DialogDescription>
            Create a shareable link for "{reportName}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!shareUrl ? (
            <>
              <p className="text-sm text-muted-foreground">
                Generate a secure link that expires in 7 days. Anyone with the
                link can view this report.
              </p>
              <Button
                onClick={handleGenerate}
                disabled={shareReport.isPending}
                className="w-full"
              >
                {shareReport.isPending ? 'Generating...' : 'Generate Link'}
              </Button>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="share-url">Share Link</Label>
                <div className="flex gap-2">
                  <Input
                    id="share-url"
                    value={shareUrl}
                    readOnly
                    className="flex-1"
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={handleCopy}
                  >
                    {copied ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm">
                  <span className="font-medium">Expires:</span>{' '}
                  {formatExpiryDate(expiresAt)}
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => window.open(shareUrl, '_blank')}
                  className="flex-1 gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Preview
                </Button>
                <Button onClick={onClose} className="flex-1">
                  Done
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
