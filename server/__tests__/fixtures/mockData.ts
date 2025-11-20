/**
 * Mock Data Fixtures for Integration Tests
 *
 * Contains realistic mock data for testing chat endpoints
 */

// Session context mock (for welcome endpoint)
export const mockSessionContext = {
  // User information
  userName: 'John Smith',
  userEmail: 'john@photographystudio.com',
  isLoggedIn: false,

  // Navigation
  currentPath: '/',
  currentUrl: 'https://kull.ai/',
  referrer: 'https://www.google.com/',
  queryParams: '',
  urlHash: '',
  visitedPages: ['/', '/pricing', '/features'],

  // Time & Activity
  timeOnSite: 120000, // 2 minutes
  timestamp: new Date().toISOString(),
  timezone: 'America/Los_Angeles',
  timezoneOffset: 480,
  scrollY: 1500,
  scrollDepth: 75,

  // Device & Display
  isMobile: false,
  isTablet: false,
  isTouchDevice: false,
  maxTouchPoints: 0,
  screenWidth: 1920,
  screenHeight: 1080,
  viewportWidth: 1920,
  viewportHeight: 969,
  pageWidth: 1920,
  pageHeight: 4500,
  devicePixelRatio: 2,
  screenColorDepth: 24,
  screenOrientation: 'landscape-primary',

  // Browser & System
  browserName: 'Chrome',
  browserVersion: '120.0.0.0',
  osName: 'macOS',
  osVersion: '14.2',
  platform: 'MacIntel',
  language: 'en-US',
  languages: 'en-US,en',
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  onLine: true,
  cookieEnabled: true,
  doNotTrack: 'null',

  // Hardware
  hardwareConcurrency: 8,
  deviceMemory: '8',
  webglVendor: 'Apple',
  webglRenderer: 'Apple M1',
  webglSupported: true,

  // Connection
  connectionType: '4g',
  connectionDownlink: '10',
  connectionRtt: '50',
  connectionSaveData: false,

  // Performance
  loadTime: '1250',
  domContentLoaded: '850',

  // Storage
  localStorageAvailable: true,
  sessionStorageAvailable: true,
};

// Calculator data mock
export const mockCalculatorData = {
  shootsPerWeek: 2,
  hoursPerShoot: 4,
  billableRate: 150,
  hasManuallyAdjusted: true,
  hasClickedPreset: false,
};

// Section history mock
export const mockSectionHistory = [
  { id: 'hero', title: 'Hero Section', totalTimeSpent: 15000 }, // 15s
  { id: 'calculator', title: 'ROI Calculator', totalTimeSpent: 45000 }, // 45s - most time
  { id: 'pricing', title: 'Pricing', totalTimeSpent: 20000 }, // 20s
  { id: 'features', title: 'Features', totalTimeSpent: 12000 }, // 12s
  { id: 'testimonials', title: 'Testimonials', totalTimeSpent: 8000 }, // 8s
];

// User activity mock
export const mockActivity = [
  {
    type: 'click' as const,
    target: 'button.cta-primary',
    value: 'Start Free Trial',
    timestamp: new Date(Date.now() - 60000).toISOString(), // 1 min ago
  },
  {
    type: 'hover' as const,
    target: '.pricing-card.professional',
    timestamp: new Date(Date.now() - 50000).toISOString(),
  },
  {
    type: 'input' as const,
    target: 'input#shoots-per-week',
    value: '2',
    timestamp: new Date(Date.now() - 40000).toISOString(),
  },
  {
    type: 'input' as const,
    target: 'input#hours-per-shoot',
    value: '4',
    timestamp: new Date(Date.now() - 35000).toISOString(),
  },
  {
    type: 'select' as const,
    target: 'p.value-prop',
    value: 'Save 176 hours per year',
    timestamp: new Date(Date.now() - 25000).toISOString(),
  },
  {
    type: 'click' as const,
    target: 'a.feature-link',
    value: 'Learn More About AI Culling',
    timestamp: new Date(Date.now() - 15000).toISOString(),
  },
  {
    type: 'hover' as const,
    target: 'button.chat-widget',
    timestamp: new Date(Date.now() - 5000).toISOString(),
  },
];

// Conversation history mock
export const mockHistory = [
  {
    role: 'assistant',
    content: 'hey! i noticed you were playing with the calculator - do you mind if i ask a few questions to figure out if you\'re a good fit for kull?',
  },
  {
    role: 'user',
    content: 'sure, go ahead',
  },
  {
    role: 'assistant',
    content: 'awesome! i see you\'re doing about 88 shoots/year — is that accurate?',
  },
  {
    role: 'user',
    content: 'yeah that\'s about right, maybe closer to 90',
  },
];

// Mock history with step advancement scenario
export const mockHistoryWithStepAdvancement = [
  {
    role: 'assistant',
    content: 'do you mind if i ask a few questions to figure out if you\'re a good fit for kull?',
  },
  {
    role: 'user',
    content: 'yes absolutely',
  },
];

// Mock history with vague answer (should NOT advance)
export const mockHistoryWithVagueAnswer = [
  {
    role: 'assistant',
    content: 'i see you\'re doing about 88 shoots/year — is that accurate?',
  },
  {
    role: 'user',
    content: 'maybe',
  },
];

// Recent activity (since last AI message) mock
export const mockRecentActivity = [
  {
    type: 'click' as const,
    target: 'button.pricing-cta',
    value: 'See Pricing',
    timestamp: new Date(Date.now() - 3000).toISOString(), // 3s ago
  },
  {
    type: 'select' as const,
    target: 'h2.pricing-headline',
    value: '$5,988/year - 30% off today',
    timestamp: new Date(Date.now() - 1000).toISOString(), // 1s ago
  },
];

// Page visits mock
export const mockPageVisits = [
  { path: '/', timestamp: new Date(Date.now() - 120000).toISOString(), duration: 45000 },
  { path: '/pricing', timestamp: new Date(Date.now() - 75000).toISOString(), duration: 30000 },
  { path: '/features', timestamp: new Date(Date.now() - 45000).toISOString(), duration: 20000 },
  { path: '/', timestamp: new Date(Date.now() - 25000).toISOString(), duration: 25000 },
];

// All sessions mock (for cross-session analysis)
export const mockAllSessions = [
  {
    sessionId: 'session-1',
    startTime: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    endTime: new Date(Date.now() - 86340000).toISOString(),
    totalTime: 60000,
    visitedPages: ['/', '/pricing'],
  },
  {
    sessionId: 'session-2',
    startTime: new Date(Date.now() - 43200000).toISOString(), // 12 hours ago
    endTime: new Date(Date.now() - 43140000).toISOString(),
    totalTime: 60000,
    visitedPages: ['/', '/features', '/pricing'],
  },
];

// Logged in user mock
export const mockLoggedInUser = {
  ...mockSessionContext,
  userName: 'Sarah Johnson',
  userEmail: 'sarah@weddingphotos.com',
  isLoggedIn: true,
};

// Mobile user mock
export const mockMobileContext = {
  ...mockSessionContext,
  isMobile: true,
  isTablet: false,
  isTouchDevice: true,
  maxTouchPoints: 5,
  screenWidth: 390,
  screenHeight: 844,
  viewportWidth: 390,
  viewportHeight: 750,
  devicePixelRatio: 3,
  browserName: 'Safari',
  osName: 'iOS',
  osVersion: '17.2',
  platform: 'iPhone',
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X)',
};

// No calculator data scenario
export const mockNoCalculatorData = null;

// Minimal section history (just arrived)
export const mockMinimalSectionHistory = [
  { id: 'hero', title: 'Hero Section', totalTimeSpent: 5000 }, // Just 5s
];

// Empty activity (no interactions yet)
export const mockEmptyActivity: any[] = [];

// Session with re-engagement scenario (long time since last message)
export const mockReEngagementScenario = {
  lastAiMessageTime: Date.now() - 300000, // 5 minutes ago
  currentTime: Date.now(),
};

// Complex calculator data (high-volume photographer)
export const mockHighVolumeCalculatorData = {
  shootsPerWeek: 6,
  hoursPerShoot: 3,
  billableRate: 250,
  hasManuallyAdjusted: true,
  hasClickedPreset: true,
};

// Session metrics mock
export const mockSessionMetrics = {
  timeOnSite: 120000,
  currentTime: Date.now(),
  lastAiMessageTime: Date.now() - 45000, // 45s ago
  scrollY: 1500,
  scrollDepth: 75,
};

// Mock request object builder
export const buildMockRequest = (overrides: any = {}) => ({
  body: {},
  headers: {
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'cf-connecting-ip': '192.168.1.100',
  },
  user: null,
  ...overrides,
});

// Mock authenticated request
export const buildAuthenticatedRequest = (overrides: any = {}) => ({
  ...buildMockRequest(overrides),
  user: {
    claims: {
      sub: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
    },
  },
});
