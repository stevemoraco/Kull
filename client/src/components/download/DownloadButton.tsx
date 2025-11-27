import { Button } from "@/components/ui/button";
import { Download, Apple, Loader2 } from "lucide-react";
import { useState } from "react";
import { useDownloadTracking } from "@/hooks/useDownloadTracking";
import { useToast } from "@/hooks/use-toast";
import type { VersionInfo } from "@/api/download";

interface DownloadButtonProps {
  platform: 'macos' | 'ios';
  versionInfo: VersionInfo;
  variant?: 'default' | 'outline';
  size?: 'default' | 'lg';
  className?: string;
}

export function DownloadButton({
  platform,
  versionInfo,
  variant = 'default',
  size = 'lg',
  className = '',
}: DownloadButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { trackDownload } = useDownloadTracking();
  const { toast } = useToast();

  const handleDownload = async () => {
    setIsLoading(true);

    try {
      // Track the download
      await trackDownload(platform, versionInfo.version);

      // Show success toast
      toast({
        title: "Download Started",
        description: `Downloading Kull AI ${versionInfo.version} for ${platform === 'macos' ? 'macOS' : 'iOS'}`,
      });

      // Redirect to download URL, TestFlight, or App Store
      let url: string | undefined;
      if (platform === 'macos') {
        url = versionInfo.downloadUrl;
      } else {
        // Prefer TestFlight for iOS beta, otherwise App Store
        url = versionInfo.testFlightUrl || versionInfo.appStoreUrl;
      }

      if (url) {
        window.open(url, '_blank');
      }
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Error",
        description: "Failed to start download. Please try again.",
        variant: "destructive",
      });
    } finally {
      // Keep loading state for a moment to prevent double-clicks
      setTimeout(() => setIsLoading(false), 1000);
    }
  };

  const buttonContent = () => {
    if (platform === 'macos') {
      return (
        <>
          {isLoading ? (
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          ) : (
            <Apple className="w-5 h-5 mr-2" />
          )}
          Download for macOS
          {versionInfo.fileSize && (
            <span className="ml-2 text-xs opacity-80">({versionInfo.fileSize})</span>
          )}
        </>
      );
    } else {
      const isTestFlight = versionInfo.testFlightUrl && !versionInfo.appStoreUrl;
      return (
        <>
          {isLoading ? (
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          ) : (
            <Apple className="w-5 h-5 mr-2" />
          )}
          {versionInfo.testFlightUrl ? 'Join TestFlight Beta' : 'Get on App Store'}
        </>
      );
    }
  };

  return (
    <Button
      size={size}
      variant={variant}
      onClick={handleDownload}
      disabled={isLoading}
      className={`min-w-[280px] h-14 text-lg font-semibold ${className}`}
      data-testid={`download-button-${platform}`}
    >
      {buttonContent()}
    </Button>
  );
}
