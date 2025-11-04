import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle, X, Send, Loader2, RotateCcw, History, Plus, ChevronDown, ChevronUp, Maximize2, Minimize2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

// Helper function to render markdown with purple theme
function renderMarkdown(text: string, onLinkClick: (url: string) => void) {
  const lines = text.split('\n');
  const elements: JSX.Element[] = [];
  let key = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Headers
    if (line.startsWith('### ')) {
      elements.push(
        <h3 key={key++} className="text-lg font-bold text-purple-600 mt-3 mb-2">
          {parseInlineMarkdown(line.substring(4), onLinkClick, key)}
        </h3>
      );
      continue;
    }
    if (line.startsWith('## ')) {
      elements.push(
        <h2 key={key++} className="text-xl font-bold text-purple-700 mt-4 mb-2">
          {parseInlineMarkdown(line.substring(3), onLinkClick, key)}
        </h2>
      );
      continue;
    }
    if (line.startsWith('# ')) {
      elements.push(
        <h1 key={key++} className="text-2xl font-bold text-purple-800 mt-4 mb-3">
          {parseInlineMarkdown(line.substring(2), onLinkClick, key)}
        </h1>
      );
      continue;
    }

    // Blockquotes
    if (line.startsWith('> ')) {
      elements.push(
        <blockquote key={key++} className="border-l-4 border-purple-400 pl-4 italic text-purple-600 my-2">
          {parseInlineMarkdown(line.substring(2), onLinkClick, key)}
        </blockquote>
      );
      continue;
    }

    // Unordered lists
    if (line.match(/^[•\-*]\s/)) {
      elements.push(
        <div key={key++} className="flex gap-2 my-1">
          <span className="text-purple-500">•</span>
          <span>{parseInlineMarkdown(line.replace(/^[•\-*]\s/, ''), onLinkClick, key)}</span>
        </div>
      );
      continue;
    }

    // Empty lines
    if (line.trim() === '') {
      elements.push(<div key={key++} className="h-2" />);
      continue;
    }

    // Regular paragraphs
    elements.push(
      <p key={key++} className="my-1">
        {parseInlineMarkdown(line, onLinkClick, key)}
      </p>
    );
  }

  return elements;
}

// Helper to parse inline markdown (bold, italic, links, code)
function parseInlineMarkdown(text: string, onLinkClick: (url: string) => void, baseKey: number) {
  const parts: (string | JSX.Element)[] = [];
  let remaining = text;
  let key = baseKey * 1000;

  // Process links, bold, italic, code
  const patterns = [
    { regex: /\[([^\]]+)\]\(([^)]+)\)/, type: 'link' },
    { regex: /\*\*([^*]+)\*\*/, type: 'bold' },
    { regex: /\*([^*]+)\*/, type: 'italic' },
    { regex: /`([^`]+)`/, type: 'code' },
  ];

  while (remaining.length > 0) {
    let earliestMatch: { index: number; length: number; type: string; content: string; url?: string } | null = null;

    // Find earliest match
    for (const pattern of patterns) {
      const match = remaining.match(pattern.regex);
      if (match && (earliestMatch === null || match.index! < earliestMatch.index)) {
        earliestMatch = {
          index: match.index!,
          length: match[0].length,
          type: pattern.type,
          content: match[1],
          url: match[2],
        };
      }
    }

    if (!earliestMatch) {
      parts.push(remaining);
      break;
    }

    // Add text before match
    if (earliestMatch.index > 0) {
      parts.push(remaining.substring(0, earliestMatch.index));
    }

    // Add styled element
    switch (earliestMatch.type) {
      case 'link':
        parts.push(
          <button
            key={key++}
            onClick={(e) => {
              e.preventDefault();
              onLinkClick(earliestMatch!.url!);
            }}
            className="text-purple-600 hover:text-purple-700 underline cursor-pointer font-medium"
          >
            {earliestMatch.content}
          </button>
        );
        break;
      case 'bold':
        parts.push(
          <strong key={key++} className="font-bold text-purple-700">
            {earliestMatch.content}
          </strong>
        );
        break;
      case 'italic':
        parts.push(
          <em key={key++} className="italic text-purple-600">
            {earliestMatch.content}
          </em>
        );
        break;
      case 'code':
        parts.push(
          <code key={key++} className="bg-purple-100 text-purple-700 px-1 py-0.5 rounded text-sm font-mono">
            {earliestMatch.content}
          </code>
        );
        break;
    }

    remaining = remaining.substring(earliestMatch.index + earliestMatch.length);
  }

  return parts;
}

// Removed placeholder system - greetings now appear via popovers and are appended to conversation

// Helper to load sessions from localStorage
const loadSessions = (): ChatSession[] => {
  const stored = localStorage.getItem('kull-chat-sessions');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      return parsed.map((session: any) => ({
        ...session,
        createdAt: new Date(session.createdAt),
        updatedAt: new Date(session.updatedAt),
        messages: session.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        })),
      }));
    } catch (e) {
      console.error('Failed to parse stored sessions:', e);
    }
  }
  return [];
};

// Helper to save sessions to localStorage
const saveSessions = (sessions: ChatSession[]) => {
  localStorage.setItem('kull-chat-sessions', JSON.stringify(sessions));
};

// Helper to get user metadata for anonymous tracking
const getUserMetadata = async () => {
  try {
    // Detect device type
    const ua = navigator.userAgent;
    let device = 'Desktop';
    if (/mobile/i.test(ua)) device = 'Mobile';
    else if (/tablet|ipad/i.test(ua)) device = 'Tablet';

    // Detect browser
    let browser = 'Unknown';
    if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
    else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Edg')) browser = 'Edge';

    // Get location from IP (using ipapi.co free API)
    let location = { city: null, state: null, country: null };
    try {
      const response = await fetch('https://ipapi.co/json/');
      if (response.ok) {
        const data = await response.json();
        location = {
          city: data.city || null,
          state: data.region || null,
          country: data.country_name || null,
        };
      }
    } catch (e) {
      console.log('[Chat] Could not fetch location data');
    }

    return { device, browser, ...location };
  } catch (error) {
    console.error('[Chat] Error getting metadata:', error);
    return { device: null, browser: null, city: null, state: null, country: null };
  }
};

export function SupportChat() {
  // Persist chat open state
  const [isOpen, setIsOpen] = useState(() => {
    const stored = localStorage.getItem('kull-chat-open');
    return stored === 'true';
  });

  // Load all chat sessions
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const loadedSessions = loadSessions();
    if (loadedSessions.length === 0) {
      // Create initial persistent session with empty messages - greetings will be added via popover
      const initialSession: ChatSession = {
        id: 'main-session-persistent', // Fixed ID for persistence across page loads
        title: 'Chat with Kull',
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      saveSessions([initialSession]);
      return [initialSession];
    }
    return loadedSessions;
  });

  // Track current session ID - load from localStorage on mount
  const [currentSessionId, setCurrentSessionId] = useState<string>(() => {
    const loadedSessions = loadSessions();
    const stored = localStorage.getItem('kull-current-session-id');

    // Validate stored session ID exists in sessions
    if (stored && loadedSessions.find(s => s.id === stored)) {
      console.log('[Chat] Resuming session:', stored);
      return stored;
    }

    // Default to first session (or main-session-persistent)
    const defaultId = loadedSessions[0]?.id || 'main-session-persistent';
    console.log('[Chat] Starting new session:', defaultId);
    localStorage.setItem('kull-current-session-id', defaultId);
    return defaultId;
  });

  // Get current session
  const currentSession = sessions.find(s => s.id === currentSessionId);
  const messages = currentSession?.messages || [];

  const setMessages = (newMessages: Message[] | ((prev: Message[]) => Message[])) => {
    setSessions(prevSessions => {
      const updatedSessions = prevSessions.map(session => {
        if (session.id === currentSessionId) {
          const updatedMessages = typeof newMessages === 'function' ? newMessages(session.messages) : newMessages;

          // Generate title from first user message if still default
          let title = session.title;
          if (title === 'New Chat' && updatedMessages.length > 1) {
            const firstUserMsg = updatedMessages.find(m => m.role === 'user');
            if (firstUserMsg) {
              title = firstUserMsg.content.slice(0, 30) + (firstUserMsg.content.length > 30 ? '...' : '');
            }
          }

          return {
            ...session,
            messages: updatedMessages,
            title,
            updatedAt: new Date(),
          };
        }
        return session;
      });
      saveSessions(updatedSessions);
      
      // Also save to database immediately
      saveSessionsToDatabase(updatedSessions);
      
      return updatedSessions;
    });
  };

  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  // Function to save sessions to database
  const saveSessionsToDatabase = async (sessionsToSave: ChatSession[]) => {
    try {
      const metadata = await getUserMetadata();
      await apiRequest("POST", '/api/chat/sessions', { sessions: sessionsToSave, metadata });
      console.log('[Chat] Saved sessions to database');
    } catch (error) {
      console.error('[Chat] Failed to save sessions to database:', error);
    }
  };

  // Function to load and merge sessions from database
  const loadAndMergeSessions = async () => {
    try {
      const response = await apiRequest("GET", '/api/chat/sessions');
      const dbSessions = await response.json();
      const localSessions = loadSessions();
      
      // Create a map of all sessions by ID
      const sessionMap = new Map<string, ChatSession>();
      
      // Add database sessions first
      dbSessions.forEach((session: any) => {
        sessionMap.set(session.id, {
          ...session,
          createdAt: new Date(session.createdAt),
          updatedAt: new Date(session.updatedAt),
          messages: session.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          })),
        });
      });
      
      // Merge with local sessions (prefer newer updatedAt)
      localSessions.forEach(session => {
        const existing = sessionMap.get(session.id);
        if (!existing || new Date(session.updatedAt) > new Date(existing.updatedAt)) {
          sessionMap.set(session.id, session);
        }
      });
      
      const mergedSessions = Array.from(sessionMap.values())
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      
      if (mergedSessions.length > 0) {
        setSessions(mergedSessions);
        saveSessions(mergedSessions);
        // Also save back to DB to sync any local-only sessions
        await saveSessionsToDatabase(mergedSessions);
        console.log(`[Chat] Loaded and merged ${mergedSessions.length} sessions from database`);
      }
    } catch (error) {
      console.error('[Chat] Failed to load sessions from database:', error);
    }
  };

  // Auto-sync: Load from DB when user logs in
  useEffect(() => {
    if (user?.id) {
      console.log('[Chat] User logged in, syncing sessions from database...');
      loadAndMergeSessions();
    }
  }, [user?.id]); // Only trigger when user ID changes

  // Auto-save: Save to DB periodically (every 30 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      if (sessions.length > 0) {
        saveSessionsToDatabase(sessions);
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [sessions]);
  const [, setLocation] = useLocation();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [transcriptSent, setTranscriptSent] = useState(false);
  const [nextMessageIn, setNextMessageIn] = useState<number | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const lastAiMessageTimeRef = useRef<number>(Date.now()); // Track when AI last spoke

  // Store pre-generated greeting for initial use
  const [latestGreeting, setLatestGreeting] = useState<string | null>(null);
  const greetingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [greetingGenerated, setGreetingGenerated] = useState(false);
  const lastUserMessageTimeRef = useRef<number>(Date.now());

  // Greeting popover state (for showing when chat is closed)
  const [showGreetingPopover, setShowGreetingPopover] = useState(false);
  const [popoverGreeting, setPopoverGreeting] = useState<string>('');

  // Track page visits in sessionStorage for context
  useEffect(() => {
    const currentPath = window.location.pathname;
    const visited = sessionStorage.getItem('kull-visited-pages');
    const visitedArray = visited ? visited.split(',') : [];

    if (!visitedArray.includes(currentPath)) {
      visitedArray.push(currentPath);
      sessionStorage.setItem('kull-visited-pages', visitedArray.join(','));
    }
  }, []);

  // Track user interactions (clicks, hovers, typing, text selection)
  useEffect(() => {
    interface ActivityEvent {
      type: 'click' | 'hover' | 'input' | 'select';
      target: string;
      value?: string;
      timestamp: string;
    }

    // Get existing activity or initialize
    const getActivity = (): ActivityEvent[] => {
      try {
        const stored = sessionStorage.getItem('kull-user-activity');
        return stored ? JSON.parse(stored) : [];
      } catch {
        return [];
      }
    };

    const saveActivity = (activity: ActivityEvent[]) => {
      try {
        // Keep only last 100 events
        const trimmed = activity.slice(-100);
        sessionStorage.setItem('kull-user-activity', JSON.stringify(trimmed));
      } catch (e) {
        console.error('Failed to save activity:', e);
      }
    };

    // Track clicks with full element text content
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      let targetDesc = target.tagName.toLowerCase();

      // Add more context about what was clicked
      if (target.id) targetDesc += `#${target.id}`;
      if (target.className) {
        const classes = target.className.toString().split(' ').slice(0, 3).join('.');
        if (classes) targetDesc += `.${classes}`;
      }

      const href = target.closest('a')?.getAttribute('href');
      if (href) targetDesc += ` [href="${href}"]`;

      // Get the FULL text content of the clicked element (or innermost text)
      let elementText = target.textContent?.trim() || '';

      // If element is too large (like a whole section), try to get the most specific text
      if (elementText.length > 200) {
        // Try to find the most specific child with text
        const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
        let node;
        let closestText = '';
        while (node = walker.nextNode()) {
          const text = node.textContent?.trim();
          if (text && text.length > 0 && text.length < elementText.length) {
            closestText = text;
            break;
          }
        }
        elementText = closestText || elementText.substring(0, 200);
      }

      const activity = getActivity();
      activity.push({
        type: 'click',
        target: targetDesc,
        value: elementText.substring(0, 200), // Store the actual text content
        timestamp: new Date().toISOString(),
      });
      saveActivity(activity);
    };

    // Track hovers (throttled to avoid spam)
    let hoverTimeout: NodeJS.Timeout;
    const handleMouseOver = (e: MouseEvent) => {
      clearTimeout(hoverTimeout);
      hoverTimeout = setTimeout(() => {
        const target = e.target as HTMLElement;
        let targetDesc = target.tagName.toLowerCase();

        if (target.id) targetDesc += `#${target.id}`;
        if (target.className) {
          const classes = target.className.toString().split(' ').slice(0, 2).join('.');
          if (classes) targetDesc += `.${classes}`;
        }

        const text = target.textContent?.trim().substring(0, 30);
        if (text && text.length < 50) targetDesc += ` "${text}"`;

        const activity = getActivity();
        // Don't duplicate consecutive hovers on same element
        const lastEvent = activity[activity.length - 1];
        if (!lastEvent || lastEvent.type !== 'hover' || lastEvent.target !== targetDesc) {
          activity.push({
            type: 'hover',
            target: targetDesc,
            timestamp: new Date().toISOString(),
          });
          saveActivity(activity);
        }
      }, 500); // Only track if hover lasts 500ms
    };

    // Track typing in input fields
    const handleInput = (e: Event) => {
      const target = e.target as HTMLInputElement | HTMLTextAreaElement;
      let targetDesc = target.tagName.toLowerCase();

      if (target.id) targetDesc += `#${target.id}`;
      if (target.name) targetDesc += `[name="${target.name}"]`;
      if (target.placeholder) targetDesc += ` placeholder="${target.placeholder}"`;

      const activity = getActivity();
      activity.push({
        type: 'input',
        target: targetDesc,
        value: target.value.substring(0, 100), // Capture first 100 chars
        timestamp: new Date().toISOString(),
      });
      saveActivity(activity);
    };

    // Track text selection/highlighting
    const handleTextSelect = () => {
      const selection = window.getSelection();
      const selectedText = selection?.toString().trim();

      if (selectedText && selectedText.length > 3) { // Only track if meaningful selection
        const activity = getActivity();

        // Don't duplicate consecutive selections of same text
        const lastEvent = activity[activity.length - 1];
        if (lastEvent?.type === 'select' && lastEvent.value === selectedText) {
          return;
        }

        activity.push({
          type: 'select',
          target: 'text-selection',
          value: selectedText.substring(0, 300), // Store up to 300 chars
          timestamp: new Date().toISOString(),
        });
        saveActivity(activity);
      }
    };

    // Add event listeners
    document.addEventListener('click', handleClick, true);
    document.addEventListener('mouseover', handleMouseOver, true);
    document.addEventListener('input', handleInput, true);
    document.addEventListener('mouseup', handleTextSelect, true); // Track text selection
    document.addEventListener('keyup', handleTextSelect, true); // Track keyboard selection

    // Cleanup
    return () => {
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('mouseover', handleMouseOver, true);
      document.removeEventListener('input', handleInput, true);
      document.removeEventListener('mouseup', handleTextSelect, true);
      document.removeEventListener('keyup', handleTextSelect, true);
      clearTimeout(hoverTimeout);
    };
  }, []);

  // Save current session ID to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('kull-current-session-id', currentSessionId);
  }, [currentSessionId]);

  // Save chat open state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('kull-chat-open', isOpen.toString());
  }, [isOpen]);

  // Define handleLinkClick early so it can be used in effects
  // Memoize to prevent recreation on every render
  const handleLinkClick = useCallback((url: string) => {
    // Determine if URL is internal or external
    let isInternal = false;
    let pathToNavigate = url;

    if (url.startsWith('/')) {
      // Relative path - definitely internal
      isInternal = true;
      pathToNavigate = url;
    } else if (url.startsWith('http://') || url.startsWith('https://')) {
      // Full URL - check if it's same domain
      try {
        const urlObj = new URL(url);
        const currentHost = window.location.host; // e.g., "kullai.com" or "localhost:5000"

        if (urlObj.host === currentHost || urlObj.hostname === 'kullai.com' || urlObj.hostname === 'www.kullai.com') {
          isInternal = true;
          pathToNavigate = urlObj.pathname + urlObj.search + urlObj.hash;
        }
      } catch (e) {
        // Invalid URL, treat as external
        isInternal = false;
      }
    }

    if (isInternal) {
      // Internal navigation - same tab
      if (pathToNavigate.includes('#')) {
        const [path, hash] = pathToNavigate.split('#');
        setLocation(path || '/');

        // Scroll to element after navigation
        setTimeout(() => {
          const element = document.getElementById(hash);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      } else {
        setLocation(pathToNavigate);
      }
      // Keep chat open for internal navigation
    } else {
      // External link - open in new tab
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }, [setLocation]);

  // Background greeting generation - runs every 30 seconds
  // CRITICAL: Empty dependency array to prevent interval duplication
  useEffect(() => {
    let isActive = true; // Prevent state updates after unmount

    const generateBackgroundGreeting = async () => {
      if (!isActive) return; // Don't run if component unmounted

      try {
        // Detect device type
        const isMobile = /iPhone|iPad|iPod|Android|webOS|BlackBerry|Windows Phone/i.test(navigator.userAgent);
        const isTablet = /iPad|Android/i.test(navigator.userAgent) && window.innerWidth >= 768;
        const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

        // Parse user agent for browser and OS
        const ua = navigator.userAgent;
        let browserName = 'Unknown';
        let browserVersion = 'Unknown';
        let osName = 'Unknown';
        let osVersion = 'Unknown';

        // Browser detection
        if (ua.indexOf('Firefox') > -1) {
          browserName = 'Firefox';
          browserVersion = ua.match(/Firefox\/([0-9.]+)/)?.[1] || 'Unknown';
        } else if (ua.indexOf('Edg') > -1) {
          browserName = 'Edge';
          browserVersion = ua.match(/Edg\/([0-9.]+)/)?.[1] || 'Unknown';
        } else if (ua.indexOf('Chrome') > -1) {
          browserName = 'Chrome';
          browserVersion = ua.match(/Chrome\/([0-9.]+)/)?.[1] || 'Unknown';
        } else if (ua.indexOf('Safari') > -1) {
          browserName = 'Safari';
          browserVersion = ua.match(/Version\/([0-9.]+)/)?.[1] || 'Unknown';
        }

        // OS detection
        if (ua.indexOf('Windows NT 10.0') > -1) osName = 'Windows 10/11';
        else if (ua.indexOf('Windows NT') > -1) osName = 'Windows';
        else if (ua.indexOf('Mac OS X') > -1) {
          osName = 'macOS';
          osVersion = ua.match(/Mac OS X ([0-9_]+)/)?.[1]?.replace(/_/g, '.') || 'Unknown';
        }
        else if (ua.indexOf('Android') > -1) {
          osName = 'Android';
          osVersion = ua.match(/Android ([0-9.]+)/)?.[1] || 'Unknown';
        }
        else if (ua.indexOf('iPhone') > -1 || ua.indexOf('iPad') > -1) {
          osName = ua.indexOf('iPhone') > -1 ? 'iOS (iPhone)' : 'iOS (iPad)';
          osVersion = ua.match(/OS ([0-9_]+)/)?.[1]?.replace(/_/g, '.') || 'Unknown';
        }
        else if (ua.indexOf('Linux') > -1) osName = 'Linux';

        const currentUser = user; // Capture user state at time of execution
        const currentIsOpen = isOpen;
        const currentGreetingGenerated = greetingGenerated;

        const sessionContext = {
          // User info
          userName: currentUser?.firstName || null,
          userEmail: currentUser?.email || null,
          isLoggedIn: !!currentUser,

          // Navigation
          currentPath: window.location.pathname,
          currentUrl: window.location.href,
          referrer: document.referrer || 'Direct visit',
          queryParams: window.location.search,
          urlHash: window.location.hash,
          visitedPages: sessionStorage.getItem('kull-visited-pages')?.split(',') || [window.location.pathname],

          // Time tracking
          timeOnSite: Date.now() - (performance.timing?.navigationStart || Date.now()),
          timestamp: new Date().toISOString(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          timezoneOffset: new Date().getTimezoneOffset(),

          // Scroll behavior
          scrollY: window.scrollY,
          scrollX: window.scrollX,
          scrollDepth: Math.round((window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100) || 0,
          pageHeight: document.documentElement.scrollHeight,
          pageWidth: document.documentElement.scrollWidth,
          viewportHeight: window.innerHeight,
          viewportWidth: window.innerWidth,

          // Screen & Display
          screenWidth: window.screen.width,
          screenHeight: window.screen.height,
          screenAvailWidth: window.screen.availWidth,
          screenAvailHeight: window.screen.availHeight,
          screenColorDepth: window.screen.colorDepth,
          screenPixelDepth: window.screen.pixelDepth,
          devicePixelRatio: window.devicePixelRatio,
          screenOrientation: (window.screen.orientation?.type) || 'unknown',

          // Browser & System
          userAgent: navigator.userAgent,
          browserName,
          browserVersion,
          osName,
          osVersion,
          platform: navigator.platform,
          language: navigator.language,
          languages: navigator.languages?.join(', ') || navigator.language,
          cookieEnabled: navigator.cookieEnabled,
          doNotTrack: navigator.doNotTrack || 'unspecified',
          onLine: navigator.onLine,

          // Device type
          isMobile,
          isTablet,
          isDesktop: !isMobile && !isTablet,
          isTouchDevice,
          maxTouchPoints: navigator.maxTouchPoints || 0,

          // Hardware
          hardwareConcurrency: navigator.hardwareConcurrency || 'unknown',
          deviceMemory: (navigator as any).deviceMemory || 'unknown',

          // Connection
          connectionType: (navigator as any).connection?.effectiveType || 'unknown',
          connectionDownlink: (navigator as any).connection?.downlink || 'unknown',
          connectionRtt: (navigator as any).connection?.rtt || 'unknown',
          connectionSaveData: (navigator as any).connection?.saveData || false,

          // Performance
          loadTime: performance.timing?.loadEventEnd - performance.timing?.navigationStart || 'unknown',
          domContentLoaded: performance.timing?.domContentLoadedEventEnd - performance.timing?.navigationStart || 'unknown',

          // Storage
          localStorageAvailable: (() => {
            try { return !!window.localStorage; } catch { return false; }
          })(),
          sessionStorageAvailable: (() => {
            try { return !!window.sessionStorage; } catch { return false; }
          })(),

          // Media capabilities
          webglSupported: (() => {
            try {
              const canvas = document.createElement('canvas');
              return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
            } catch { return false; }
          })(),
          webglVendor: (() => {
            try {
              const canvas = document.createElement('canvas');
              const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
              if (gl) {
                const debugInfo = (gl as any).getExtension('WEBGL_debug_renderer_info');
                return debugInfo ? (gl as any).getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : 'unknown';
              }
            } catch { return 'unknown'; }
          })(),
          webglRenderer: (() => {
            try {
              const canvas = document.createElement('canvas');
              const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
              if (gl) {
                const debugInfo = (gl as any).getExtension('WEBGL_debug_renderer_info');
                return debugInfo ? (gl as any).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'unknown';
              }
            } catch { return 'unknown'; }
          })(),

          // Battery (if available)
          batteryLevel: 'unknown',
          batteryCharging: 'unknown',

          // User activity tracking
          userActivity: (() => {
            try {
              const stored = sessionStorage.getItem('kull-user-activity');
              return stored ? JSON.parse(stored) : [];
            } catch {
              return [];
            }
          })(),
        };

        // Get latest messages from state (not stale closure)
        let latestMessages: Message[] = [];
        setMessages(prev => {
          latestMessages = prev;
          return prev; // Don't modify
        });

        // Send ENTIRE chat history - all user and assistant messages
        const fullChatHistory = latestMessages.map(m => ({
          role: m.role,
          content: m.content,
          timestamp: m.timestamp,
        }));

        // Track timestamp of last AI message for activity delimiting
        const lastAiMessageTime = lastAiMessageTimeRef.current;

        console.log('[Chat] Sending welcome request with history:', fullChatHistory.length, 'messages');
        console.log('[Chat] Latest 3 messages:', fullChatHistory.slice(-3));
        console.log('[Chat] Last AI message was at:', new Date(lastAiMessageTime).toISOString());

        const response = await fetch('/api/chat/welcome', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            context: sessionContext,
            history: fullChatHistory,
            lastAiMessageTime: lastAiMessageTime,
            currentTime: Date.now(),
          }),
        });

        if (!response.ok) throw new Error('Failed to generate greeting');

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        if (!reader) throw new Error('No response stream');

        let fullContent = '';
        let chunkCount = 0;

        console.log('[Chat] Starting stream read...');

        while (true) {
          console.log('[Chat] Waiting for chunk...');
          const { done, value } = await reader.read();
          console.log('[Chat] Received chunk:', { done, valueLength: value?.length });

          if (done) {
            console.log('[Chat] Stream done, breaking loop');
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          chunkCount++;
          console.log(`[Chat] Chunk #${chunkCount}:`, chunk.substring(0, 100));

          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                console.log('[Chat] Parsed SSE data:', data);

                if (data.type === 'delta' && data.content) {
                  fullContent += data.content;
                  console.log('[Chat] Added delta, total length now:', fullContent.length);
                } else if (data.type === 'done') {
                  console.log('[Chat] Received done event');
                } else if (data.type === 'error') {
                  console.error('[Chat] Received error event:', data.message);
                }
              } catch (e) {
                console.error('[Chat] Failed to parse JSON:', line, e);
              }
            }
          }
        }

        console.log('[Chat] ===== GREETING STREAM COMPLETE =====');
        console.log('[Chat] Full content length:', fullContent.length);
        console.log('[Chat] Full content:', fullContent);
        console.log('[Chat] Is active?', isActive);

        if (fullContent && isActive) {
          // Parse next message timing and follow-up questions
          const nextMessageMatch = fullContent.match(/(?:␞\s*)?(?:\n\n?)?NEXT_MESSAGE:\s*(\d+)/i);
          const followUpMatch = fullContent.match(/(?:␞\s*)?(?:\n\n?)?FOLLOW_UP_QUESTIONS:\s*([^\n]+)/i);

          console.log('[Chat] NEXT_MESSAGE match:', nextMessageMatch);
          console.log('[Chat] FOLLOW_UP_QUESTIONS match:', followUpMatch);

          let cleanContent = fullContent;
          let nextMsgSeconds = 30; // Default

          // Remove ALL metadata from displayed content (cut at first ␞ or FOLLOW_UP_QUESTIONS)
          const cutoffIndex = fullContent.indexOf('␞');
          const followUpIndex = fullContent.search(/\n\n?FOLLOW_UP_QUESTIONS:/);

          console.log('[Chat] Cutoff index:', cutoffIndex);
          console.log('[Chat] FollowUp index:', followUpIndex);

          if (cutoffIndex !== -1) {
            cleanContent = fullContent.substring(0, cutoffIndex).trim();
          } else if (followUpIndex !== -1) {
            cleanContent = fullContent.substring(0, followUpIndex).trim();
          }

          console.log('[Chat] Clean content:', cleanContent);

          // Parse timing
          if (nextMessageMatch) {
            nextMsgSeconds = parseInt(nextMessageMatch[1], 10);
            console.log('[Chat] ✅ Parsed next message time:', nextMsgSeconds, 'seconds');
          } else {
            console.log('[Chat] ❌ No NEXT_MESSAGE found, using default 30s');
          }

          // Parse and display follow-up questions
          if (followUpMatch) {
            const questionsText = followUpMatch[1];
            const newQuestions = questionsText
              .split('|')
              .map((q: string) => q.trim())
              .filter((q: string) => q.length > 5 && q.length < 200);

            console.log('[Chat] Welcome greeting follow-up questions:', newQuestions);

            if (newQuestions.length > 0) {
              setQuickQuestions(newQuestions);
              setShowSuggestions(true);
            }
          } else {
            console.log('[Chat] No follow-up questions in welcome message');
          }

          console.log('[Chat] ===== SETTING STATE =====');
          console.log('[Chat] Generated greeting:', cleanContent.substring(0, 100));
          console.log('[Chat] Next message in:', nextMsgSeconds, 'seconds');
          console.log('[Chat] Greeting generated?', currentGreetingGenerated);
          console.log('[Chat] Chat open?', currentIsOpen);

          if (!currentGreetingGenerated) {
            // First generation: store for initial greeting
            console.log('[Chat] 🎉 First greeting - setting countdown to:', nextMsgSeconds);
            setLatestGreeting(cleanContent);
            setGreetingGenerated(true);
            setNextMessageIn(nextMsgSeconds);

            console.log('[Chat] First greeting - storing and showing countdown');

            // Show popover if chat is closed
            if (!currentIsOpen) {
              setPopoverGreeting(cleanContent);
              setShowGreetingPopover(true);

              // Auto-hide after 10 seconds
              setTimeout(() => {
                if (isActive) setShowGreetingPopover(false);
              }, 10000);
            } else {
              // Chat is open - add as first message
              const newMessage: Message = {
                id: 'context-' + Date.now(),
                role: 'assistant',
                content: cleanContent,
                timestamp: new Date(),
              };
              setMessages(prev => [...prev, newMessage]);
              lastAiMessageTimeRef.current = Date.now();
            }
          } else {
            // Subsequent generations
            const timeSinceLastUserMessage = Date.now() - lastUserMessageTimeRef.current;

            if (currentIsOpen && timeSinceLastUserMessage > 20000) {
              // Chat is open: add as new message to conversation
              const newMessage: Message = {
                id: 'context-' + Date.now(),
                role: 'assistant',
                content: cleanContent,
                timestamp: new Date(),
              };

              setMessages(prev => {
                console.log('[Chat] Adding greeting to messages, current count:', prev.length);
                return [...prev, newMessage];
              });
              setNextMessageIn(nextMsgSeconds);

              // Update last AI message time
              lastAiMessageTimeRef.current = Date.now();

              // Note: Welcome messages don't auto-navigate, only user chat responses do
              // No toast notifications - rely on popover when chat is closed
            } else if (!currentIsOpen) {
              // Chat is closed: show popover instead
              setPopoverGreeting(cleanContent);
              setShowGreetingPopover(true);
              setNextMessageIn(nextMsgSeconds);

              // Auto-hide after 10 seconds
              setTimeout(() => {
                if (isActive) setShowGreetingPopover(false);
              }, 10000);
            }
          }
        }
      } catch (error) {
        console.error('Background greeting generation failed:', error);
      }
    };

    // Generate immediately on mount
    generateBackgroundGreeting();

    // Then regenerate every 30 seconds
    greetingTimerRef.current = setInterval(generateBackgroundGreeting, 30000);

    return () => {
      isActive = false; // Mark as inactive to prevent state updates
      if (greetingTimerRef.current) {
        clearInterval(greetingTimerRef.current);
        greetingTimerRef.current = null;
      }
    };
  }, []); // EMPTY ARRAY - only run once on mount, never re-create interval

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Countdown effect
  useEffect(() => {
    if (nextMessageIn !== null && nextMessageIn > 0) {
      // Clear any existing countdown
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }

      // Start countdown
      countdownIntervalRef.current = setInterval(() => {
        setNextMessageIn(prev => {
          if (prev === null || prev <= 1) {
            if (countdownIntervalRef.current) {
              clearInterval(countdownIntervalRef.current);
              countdownIntervalRef.current = null;
            }
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    };
  }, [nextMessageIn]);

  // Reset inactivity timer on any message activity
  const resetInactivityTimer = () => {
    // Clear existing timer
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }

    // Only set timer if chat is open, user is logged in, and has messages
    if (isOpen && user && typeof user === 'object' && user !== null && 'email' in user && user.email && messages.length > 1 && !transcriptSent) {
      const userEmail = user.email as string;
      inactivityTimerRef.current = setTimeout(async () => {
        // Send transcript after 5 minutes of inactivity
        try {
          await apiRequest('POST', '/api/chat/send-transcript', {
            messages: messages.map(m => ({
              role: m.role,
              content: m.content,
              timestamp: m.timestamp.toISOString(),
            })),
            userEmail: userEmail,
          });
          setTranscriptSent(true);
          console.log('Chat transcript sent after 5 minutes of inactivity');
        } catch (error) {
          console.error('Failed to send chat transcript:', error);
        }
      }, 5 * 60 * 1000); // 5 minutes
    }
  };

  // Reset timer when messages change or chat opens
  useEffect(() => {
    resetInactivityTimer();
    
    // Cleanup on unmount
    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [messages, isOpen, user]);

  // Reset transcript sent flag when starting new session
  useEffect(() => {
    setTranscriptSent(false);
  }, [currentSessionId]);

  // Add greeting to conversation when chat is opened with empty messages
  useEffect(() => {
    if (isOpen && messages.length === 0 && latestGreeting) {
      const greetingMessage: Message = {
        id: 'greeting-' + Date.now(),
        role: 'assistant',
        content: latestGreeting,
        timestamp: new Date(),
      };

      setMessages([greetingMessage]);

      // Note: Welcome messages don't auto-navigate, only user chat responses do
    }
  }, [isOpen, messages.length, latestGreeting, setMessages]);


  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    // Track when user last sent a message
    lastUserMessageTimeRef.current = Date.now();

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    // Create placeholder assistant message with "Thinking..." indicator
    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '__THINKING__', // Special marker for rendering
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, assistantMessage]);

    try {
      const response = await fetch('/api/chat/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageText.trim(),
          history: messages.slice(-5), // Send last 5 messages for context
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response stream');
      }

      let fullContent = '';
      let firstTokenReceived = false;
      let cutoffDetected = false; // Flag to stop processing after cutoff
      let hasNavigated = false; // Flag to track if we've already navigated

      console.log('[Chat] Starting to read response stream for message:', assistantMessageId);

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          console.log('[Chat] Stream done. Total content length:', fullContent.length);
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              console.log('[Chat] Received event type:', data.type);

              if (data.type === 'delta' && data.content) {
                // Mark that we've received the first token
                firstTokenReceived = true;

                // If we already detected cutoff, ignore all further deltas
                if (cutoffDetected) {
                  continue;
                }

                fullContent += data.content;

                // Check for first link and navigate immediately
                if (!hasNavigated) {
                  const linkMatch = fullContent.match(/\[([^\]]+)\]\(([^)]+)\)/);
                  if (linkMatch) {
                    const url = linkMatch[2];
                    hasNavigated = true;
                    // Navigate immediately!
                    handleLinkClick(url);
                  }
                }

                // Look for cutoff markers - check for special character first, then plain text
                let cutoffIndex = -1;

                // Try to find the Unicode marker ␞
                cutoffIndex = fullContent.indexOf('␞');

                // Fallback: look for FOLLOW_UP_QUESTIONS text
                if (cutoffIndex === -1) {
                  // Look for patterns like "\n\nFOLLOW_UP_QUESTIONS" or just "FOLLOW_UP_QUESTIONS"
                  const followUpPattern = /\n\n?FOLLOW_UP_QUESTIONS:/;
                  const match = fullContent.match(followUpPattern);
                  if (match) {
                    cutoffIndex = match.index!;
                  }
                }

                if (cutoffIndex !== -1) {
                  // Found cutoff! Set flag to stop processing further deltas
                  cutoffDetected = true;

                  // Extract clean content before cutoff
                  const cleanContent = fullContent.substring(0, cutoffIndex).trim();
                  const questionsSection = fullContent.substring(cutoffIndex);

                  console.log('[Chat] CUTOFF DETECTED at index:', cutoffIndex);
                  console.log('[Chat] Clean content length:', cleanContent.length);
                  console.log('[Chat] Questions section:', questionsSection.substring(0, 100));

                  // Extract follow-up questions - look for the line after cutoff
                  const followUpMatch = questionsSection.match(/FOLLOW_UP_QUESTIONS:\s*([^\n]+)/i);

                  if (followUpMatch) {
                    const questionsText = followUpMatch[1];
                    const newQuestions = questionsText
                      .split('|')
                      .map((q: string) => q.trim())
                      .filter((q: string) => q.length > 5 && q.length < 200);

                    console.log('[Chat] Extracted follow-up questions:', newQuestions);

                    if (newQuestions.length > 0) {
                      setQuickQuestions(newQuestions);
                      setShowSuggestions(true); // Show them by default when new questions arrive
                    }
                  } else {
                    console.log('[Chat] No follow-up questions found in:', questionsSection);
                  }

                  // Extract next message timing - ALWAYS set a countdown
                  const nextMessageMatch = questionsSection.match(/(?:␞\s*)?(?:\n\n?)?NEXT_MESSAGE:\s*(\d+)/i);
                  let nextMsgSeconds = 45; // Default countdown
                  if (nextMessageMatch) {
                    nextMsgSeconds = parseInt(nextMessageMatch[1], 10);
                    console.log('[Chat] Next message in:', nextMsgSeconds, 'seconds');
                  } else {
                    console.log('[Chat] No NEXT_MESSAGE found, using default:', nextMsgSeconds, 'seconds');
                  }
                  // ALWAYS set the countdown
                  setNextMessageIn(nextMsgSeconds);

                  // Update message with clean content
                  setMessages(prev =>
                    prev.map(msg =>
                      msg.id === assistantMessageId
                        ? { ...msg, content: cleanContent }
                        : msg
                    )
                  );

                  // Update fullContent so subsequent checks use clean version
                  fullContent = cleanContent;

                  // Don't update the message anymore since we've detected cutoff
                  continue;
                }

                // No cutoff yet, show all content
                setMessages(prev =>
                  prev.map(msg =>
                    msg.id === assistantMessageId
                      ? { ...msg, content: fullContent }
                      : msg
                  )
                );
              } else if (data.type === 'error') {
                throw new Error(data.message || 'Stream error');
              } else if (data.type === 'done') {
                // Final cleanup - just in case
                if (!cutoffDetected) {
                  let cutoffIndex = fullContent.indexOf('␞');
                  if (cutoffIndex === -1) {
                    cutoffIndex = fullContent.indexOf('FOLLOW_UP_QUESTIONS:');
                  }

                  if (cutoffIndex !== -1) {
                    const cleanContent = fullContent.substring(0, cutoffIndex).trim();
                    setMessages(prev =>
                      prev.map(msg =>
                        msg.id === assistantMessageId
                          ? { ...msg, content: cleanContent }
                          : msg
                      )
                    );
                  }
                }
              }
            } catch (e) {
              // Skip invalid JSON lines
            }
          }
        }
      }

      // Auto-navigate to first link in response
      const linkMatch = fullContent.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        const url = linkMatch[2];
        // Small delay to let user see the response before navigating
        setTimeout(() => {
          handleLinkClick(url);
        }, 500);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send message. Please try again.',
        variant: 'destructive',
      });
      // Remove the failed assistant message
      setMessages(prev => prev.filter(msg => msg.id !== assistantMessageId));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendMessage(inputValue);
  };

  const [quickQuestions, setQuickQuestions] = useState<string[]>([
    "How do I install Kull?",
    "Which AI model is best?",
    "How does the rating system work?",
    "Can I cancel my trial?",
  ]);

  const [showSuggestions, setShowSuggestions] = useState(true);

  const handleNewSession = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setSessions(prev => {
      const updated = [newSession, ...prev];
      saveSessions(updated);
      return updated;
    });

    setCurrentSessionId(newSession.id);

    // Reset quick questions to defaults
    setQuickQuestions([
      "How do I install Kull?",
      "Which AI model is best?",
      "How does the rating system work?",
      "Can I cancel my trial?",
    ]);

    toast({
      title: 'New Chat Started',
      description: 'You can access your previous chats in the history.',
    });
  };

  const handleSwitchSession = (sessionId: string) => {
    setCurrentSessionId(sessionId);

    // Reset quick questions when switching
    setQuickQuestions([
      "How do I install Kull?",
      "Which AI model is best?",
      "How does the rating system work?",
      "Can I cancel my trial?",
    ]);
  };

  const handleResetChat = () => {
    // Clear messages in current session
    setSessions(prevSessions => {
      const updated = prevSessions.map(session => {
        if (session.id === currentSessionId) {
          return {
            ...session,
            title: 'New Chat',
            messages: [],
            updatedAt: new Date(),
          };
        }
        return session;
      });
      saveSessions(updated);
      return updated;
    });

    // Reset quick questions to defaults
    setQuickQuestions([
      "How do I install Kull?",
      "Which AI model is best?",
      "How does the rating system work?",
      "Can I cancel my trial?",
    ]);

    toast({
      title: 'Chat Reset',
      description: 'Your conversation has been cleared.',
    });
  };

  return (
    <>
      {/* Chat Button */}
      {!isOpen && (
        <>
          <div className="fixed bottom-4 left-4 md:bottom-6 md:left-6 z-[9999] flex flex-col items-center gap-1">
            <Button
              onClick={() => {
                setIsOpen(true);
                setShowGreetingPopover(false); // Hide popover when opening chat
              }}
              className="h-14 w-14 rounded-full shadow-lg hover-elevate"
              size="icon"
              data-testid="button-open-chat"
            >
              <MessageCircle className="w-6 h-6" />
            </Button>
            {nextMessageIn !== null && nextMessageIn > 0 && (
              <div className="bg-purple-600 text-white text-xs font-bold rounded-full px-2 py-0.5 shadow-md">
                {nextMessageIn}s
              </div>
            )}
          </div>

          {/* Greeting Popover */}
          {showGreetingPopover && popoverGreeting && (
            <div
              className="fixed bottom-4 left-20 md:left-24 md:bottom-6 max-w-[280px] md:max-w-[320px] bg-card border border-purple-200/50 rounded-2xl p-3 md:p-4 z-[9999] animate-in slide-in-from-left-2 fade-in duration-300"
              style={{
                position: 'fixed',
                boxShadow: '0 20px 60px -10px rgba(139, 92, 246, 0.3), 0 10px 30px -5px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(139, 92, 246, 0.1)',
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(250, 249, 255, 0.98) 100%)',
                backdropFilter: 'blur(12px)',
              }}
            >
              {/* Glow effect overlay */}
              <div
                className="absolute inset-0 rounded-2xl pointer-events-none"
                style={{
                  background: 'radial-gradient(circle at top left, rgba(139, 92, 246, 0.08) 0%, transparent 60%)',
                }}
              />

              <button
                onClick={() => setShowGreetingPopover(false)}
                className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 transition-colors z-10"
                aria-label="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              <div className="relative pr-6">
                <div className="flex items-start gap-2.5 mb-2">
                  <div
                    className="w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{
                      background: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)',
                      boxShadow: '0 4px 12px rgba(139, 92, 246, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
                    }}
                  >
                    <MessageCircle className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs md:text-sm font-semibold text-gray-800">Kull Support</p>
                    <p className="text-[10px] md:text-xs text-gray-500">Just now</p>
                  </div>
                </div>
                <div className="text-[11px] md:text-xs text-gray-700 leading-relaxed">
                  {renderMarkdown(popoverGreeting, handleLinkClick)}
                </div>
                <button
                  onClick={() => {
                    setIsOpen(true);
                    setShowGreetingPopover(false);
                  }}
                  className="mt-2.5 text-[10px] md:text-xs text-purple-600 hover:text-purple-700 font-semibold transition-colors"
                >
                  Open chat →
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div
          className={`fixed bg-card border border-card-border rounded-2xl shadow-2xl flex flex-col z-[9999] overflow-hidden transition-all duration-300 ${
            isFullscreen
              ? 'inset-4 md:inset-8'
              : 'bottom-4 left-4 md:bottom-6 md:left-6 w-[calc(100vw-2rem)] md:w-96 h-[calc(100vh-2rem)] md:h-[600px] max-h-[600px]'
          }`}
          style={{ position: 'fixed' }}
        >
          {/* Header */}
          <div className="bg-primary px-4 py-3">
            {/* Title Row */}
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center flex-shrink-0 relative">
                <MessageCircle className="w-5 h-5 text-primary-foreground" />
                {nextMessageIn !== null && nextMessageIn > 0 && (
                  <span className="absolute -top-1 -right-1 bg-white text-purple-600 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {nextMessageIn}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-primary-foreground">
                  Kull Support
                  {nextMessageIn !== null && nextMessageIn > 0 && (
                    <span className="ml-2 text-xs font-normal text-primary-foreground/70">
                      • Next message in {nextMessageIn}s
                    </span>
                  )}
                </h3>
                <p className="text-xs text-primary-foreground/80 leading-tight">Has access to entire github repo & website backend, can answer any sales, technical, or support question instantly.</p>
              </div>

              {/* Fullscreen button - desktop only, top corner */}
              <div className="hidden md:block flex-shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="text-primary-foreground hover:bg-primary-foreground/20 no-default-hover-elevate h-8 w-8"
                  data-testid="button-fullscreen-chat"
                >
                  {isFullscreen ? (
                    <Minimize2 className="w-4 h-4" />
                  ) : (
                    <Maximize2 className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Action Buttons Row */}
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-primary-foreground bg-primary-foreground/30 hover:bg-primary-foreground/40 no-default-hover-elevate"
                    data-testid="button-chat-history"
                  >
                    <History className="w-4 h-4 mr-1.5" />
                    <span className="text-xs font-medium">History</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 z-[10000]">
                  <DropdownMenuLabel>Chat History</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleNewSession} data-testid="button-new-chat">
                    <Plus className="w-4 h-4 mr-2" />
                    New Chat
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {sessions.length > 0 ? (
                    sessions
                      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                      .map((session) => (
                        <DropdownMenuItem
                          key={session.id}
                          onClick={() => handleSwitchSession(session.id)}
                          className={session.id === currentSessionId ? 'bg-accent' : ''}
                          data-testid={`session-${session.id}`}
                        >
                          <div className="flex flex-col gap-1 w-full">
                            <div className="font-medium truncate">{session.title}</div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(session.updatedAt).toLocaleDateString([], {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </div>
                        </DropdownMenuItem>
                      ))
                  ) : (
                    <DropdownMenuItem disabled>No chat history</DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetChat}
                className="text-primary-foreground bg-primary-foreground/30 hover:bg-primary-foreground/40 no-default-hover-elevate"
                data-testid="button-reset-chat"
              >
                <RotateCcw className="w-4 h-4 mr-1.5" />
                <span className="text-xs font-medium">Clear Chat</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="text-primary-foreground bg-primary-foreground/30 hover:bg-primary-foreground/40 no-default-hover-elevate"
                data-testid="button-close-chat"
              >
                <X className="w-4 h-4 mr-1.5" />
                <span className="text-xs font-medium">Close</span>
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground'
                  }`}
                  data-testid={`message-${message.role}`}
                >
                  <div className="text-sm">
                    {message.role === 'assistant' ? (
                      message.content === '__GENERATING_GREETING__' ? (
                        // Special rendering for greeting placeholder
                        <div className="flex items-start gap-3 border-l-4 border-purple-400 pl-3 py-1 bg-purple-50/50 rounded-r">
                          <Loader2 className="w-4 h-4 animate-spin text-purple-600 mt-0.5 flex-shrink-0" />
                          <span className="text-purple-700 italic">Generating your personalized greeting...</span>
                        </div>
                      ) : message.content === '__THINKING__' ? (
                        // Special rendering for thinking placeholder
                        <div className="flex items-start gap-3 border-l-4 border-purple-400 pl-3 py-1 bg-purple-50/50 rounded-r">
                          <Loader2 className="w-4 h-4 animate-spin text-purple-600 mt-0.5 flex-shrink-0" />
                          <span className="text-purple-700 italic">Thinking...</span>
                        </div>
                      ) : (
                        renderMarkdown(message.content, handleLinkClick)
                      )
                    ) : (
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    )}
                  </div>
                  <p className={`text-xs mt-2 ${
                    message.role === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                  }`}>
                    {new Date(message.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            ))}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Questions with toggle */}
          <div className="border-t border-border bg-muted/30">
            <button
              onClick={() => setShowSuggestions(!showSuggestions)}
              className="w-full px-4 py-2 flex items-center justify-between hover:bg-muted/50 transition-colors"
              data-testid="button-toggle-suggestions"
            >
              <p className="text-xs font-semibold text-muted-foreground">
                Suggested Questions ({quickQuestions.length})
              </p>
              {showSuggestions ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
            {showSuggestions && quickQuestions.length > 0 && (
              <div className="px-4 pb-2 flex flex-wrap gap-2">
                {quickQuestions.map((question, idx) => (
                  <button
                    key={idx}
                    onClick={() => sendMessage(question)}
                    disabled={isLoading}
                    className="text-xs bg-background border border-border rounded-full px-3 py-1 hover-elevate active-elevate-2 text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                    data-testid={`button-quick-question-${idx}`}
                  >
                    {question}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-4 border-t border-border bg-card">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 bg-background border border-border rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={isLoading}
                data-testid="input-chat-message"
              />
              <Button
                type="submit"
                size="icon"
                disabled={!inputValue.trim() || isLoading}
                className="rounded-full"
                data-testid="button-send-message"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
