import { trackDownload as apiTrackDownload } from "@/api/download";

export function useDownloadTracking() {
  const trackDownload = async (platform: string, version: string) => {
    try {
      await apiTrackDownload(platform, version);
    } catch (error) {
      console.error("Error tracking download:", error);
      // Don't throw - tracking failure shouldn't block downloads
    }
  };

  return { trackDownload };
}
