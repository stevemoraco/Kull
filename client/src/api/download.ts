export interface VersionInfo {
  version: string;
  downloadUrl?: string;
  appStoreUrl?: string;
  testFlightUrl?: string;
  releaseNotes: string;
  releaseDate: string;
  fileSize?: string;
  minimumOS: string;
  features: string[];
}

export interface LatestVersions {
  macos: VersionInfo;
  ios: VersionInfo;
}

export interface ChangelogEntry {
  version: string;
  date: string;
  platform: string;
  notes: string[];
}

export async function getLatestVersions(): Promise<LatestVersions> {
  const response = await fetch('/api/download/latest');
  if (!response.ok) {
    throw new Error('Failed to fetch version information');
  }
  return response.json();
}

export async function getChangelog(): Promise<ChangelogEntry[]> {
  const response = await fetch('/api/download/changelog');
  if (!response.ok) {
    throw new Error('Failed to fetch changelog');
  }
  return response.json();
}

export async function trackDownload(platform: string, version: string): Promise<void> {
  try {
    await fetch('/api/download/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ platform, version }),
    });
  } catch (error) {
    // Don't throw - tracking failure shouldn't block downloads
    console.error('Failed to track download:', error);
  }
}
