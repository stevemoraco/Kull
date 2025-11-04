export type Platform = 'macos' | 'ios' | 'ipados' | 'windows' | 'android' | 'other';

export function detectPlatform(): Platform {
  if (typeof window === 'undefined') return 'other';

  const ua = navigator.userAgent;

  // Check for iOS devices
  if (/iPhone/.test(ua)) return 'ios';
  if (/iPad/.test(ua)) return 'ipados';

  // Check for Mac
  if (/Mac/.test(ua) && !/iPhone|iPad/.test(ua)) return 'macos';

  // Check for Windows
  if (/Windows/.test(ua)) return 'windows';

  // Check for Android
  if (/Android/.test(ua)) return 'android';

  return 'other';
}

export function getPlatformLabel(platform: Platform): string {
  switch (platform) {
    case 'macos':
      return 'macOS';
    case 'ios':
      return 'iOS';
    case 'ipados':
      return 'iPadOS';
    case 'windows':
      return 'Windows';
    case 'android':
      return 'Android';
    default:
      return 'Unknown';
  }
}

export function getRecommendedPlatform(detected: Platform): 'macos' | 'ios' {
  // Map detected platforms to our available platforms
  switch (detected) {
    case 'macos':
      return 'macos';
    case 'ios':
    case 'ipados':
      return 'ios';
    case 'windows':
    case 'android':
    case 'other':
    default:
      // Default to macOS for desktop, iOS for mobile
      const isMobile = /Mobile|Android|iPhone|iPad/.test(navigator.userAgent);
      return isMobile ? 'ios' : 'macos';
  }
}
