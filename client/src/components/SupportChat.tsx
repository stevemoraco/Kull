import { useState, useRef, useEffect, useCallback } from 'react';
import { flushSync } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageCircle, X, Send, Loader2, RotateCcw, History, Plus, ChevronDown, ChevronUp, Maximize2, Minimize2, Play, Pause, Search } from 'lucide-react';
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
import { useCalculator } from '@/contexts/CalculatorContext';
import { ConversationProgress } from '@/components/ConversationProgress';

// 🔊 CYBERPUNK NOTIFICATION SOUND - Web Audio API
function playCyberpunkDing() {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = audioContext.currentTime;
    
    // Create oscillators for that futuristic layered sound
    const osc1 = audioContext.createOscillator();
    const osc2 = audioContext.createOscillator();
    const osc3 = audioContext.createOscillator();
    
    // Gain nodes for volume control
    const gain1 = audioContext.createGain();
    const gain2 = audioContext.createGain();
    const gain3 = audioContext.createGain();
    const masterGain = audioContext.createGain();
    
    // Layer 1: High frequency ding (2000Hz -> 1500Hz)
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(2000, now);
    osc1.frequency.exponentialRampToValueAtTime(1500, now + 0.1);
    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    
    // Layer 2: Mid frequency (800Hz -> 600Hz)
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(800, now);
    osc2.frequency.exponentialRampToValueAtTime(600, now + 0.15);
    gain2.gain.setValueAtTime(0.2, now);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
    
    // Layer 3: Bass punch (200Hz -> 100Hz)
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(200, now);
    osc3.frequency.exponentialRampToValueAtTime(100, now + 0.08);
    gain3.gain.setValueAtTime(0.4, now);
    gain3.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    
    // Master volume - LOUD ASS
    masterGain.gain.setValueAtTime(0.8, now);
    
    // Connect the audio graph
    osc1.connect(gain1);
    osc2.connect(gain2);
    osc3.connect(gain3);
    
    gain1.connect(masterGain);
    gain2.connect(masterGain);
    gain3.connect(masterGain);
    masterGain.connect(audioContext.destination);
    
    // Play the sound
    osc1.start(now);
    osc2.start(now);
    osc3.start(now);
    
    // Stop after sound completes
    osc1.stop(now + 0.5);
    osc2.stop(now + 0.5);
    osc3.stop(now + 0.5);
    
    console.log('🔊 CYBERPUNK DING!');
  } catch (error) {
    console.error('Failed to play notification sound:', error);
  }
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ConversationState {
  questionsAsked: Array<{ step: number; question: string }>;
  questionsAnswered: Array<{ step: number; question: string; answer: string }>;
  currentStep: number;
  totalSteps: number;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  conversationState?: ConversationState;
  createdAt: Date;
  updatedAt: Date;
}

// Helper to transform raw URLs into markdown links (client-side safety check)
function transformRawUrlsToMarkdown(text: string): string {
  // Regex to find URLs that are NOT already part of markdown links
  // Negative lookbehind to avoid matching URLs inside [text](URL) format
  const urlRegex = /(?<!\]\()https?:\/\/[^\s)]+/g;

  return text.replace(urlRegex, (url) => {
    // Extract domain for link text
    try {
      const domain = new URL(url).hostname.replace('www.', '');
      console.warn('[Chat] ⚠️ Found raw URL, converting to markdown:', url);
      return `[${domain}](${url})`;
    } catch {
      console.warn('[Chat] ⚠️ Found malformed URL, converting to markdown:', url);
      return `[link](${url})`;
    }
  });
}

// Helper function to render markdown with teal theme
function renderMarkdown(text: string, onLinkClick: (url: string) => void) {
  // First, transform any raw URLs to markdown links (safety check)
  const safeText = transformRawUrlsToMarkdown(text);
  const lines = safeText.split('\n');
  const elements: JSX.Element[] = [];
  let key = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Headers
    if (line.startsWith('### ')) {
      elements.push(
        <h3 key={key++} className="text-lg font-bold text-teal-600 mt-3 mb-2">
          {parseInlineMarkdown(line.substring(4), onLinkClick, key)}
        </h3>
      );
      continue;
    }
    if (line.startsWith('## ')) {
      elements.push(
        <h2 key={key++} className="text-xl font-bold text-teal-700 mt-4 mb-2">
          {parseInlineMarkdown(line.substring(3), onLinkClick, key)}
        </h2>
      );
      continue;
    }
    if (line.startsWith('# ')) {
      elements.push(
        <h1 key={key++} className="text-2xl font-bold text-teal-800 mt-4 mb-3">
          {parseInlineMarkdown(line.substring(2), onLinkClick, key)}
        </h1>
      );
      continue;
    }

    // Blockquotes
    if (line.startsWith('> ')) {
      elements.push(
        <blockquote key={key++} className="border-l-4 border-teal-400 pl-4 italic text-teal-600 my-2">
          {parseInlineMarkdown(line.substring(2), onLinkClick, key)}
        </blockquote>
      );
      continue;
    }

    // Unordered lists
    if (line.match(/^[•\-*]\s/)) {
      elements.push(
        <div key={key++} className="flex gap-2 my-1">
          <span className="text-teal-500">•</span>
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
            className="text-teal-600 hover:text-teal-700 underline cursor-pointer font-medium"
          >
            {earliestMatch.content}
          </button>
        );
        break;
      case 'bold':
        parts.push(
          <strong key={key++} className="font-bold text-teal-700">
            {earliestMatch.content}
          </strong>
        );
        break;
      case 'italic':
        parts.push(
          <em key={key++} className="italic text-teal-600">
            {earliestMatch.content}
          </em>
        );
        break;
      case 'code':
        parts.push(
          <code key={key++} className="bg-teal-100 text-teal-700 px-1 py-0.5 rounded text-sm font-mono">
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

// Helper to parse conversation state from messages
function parseConversationState(messages: Message[], currentState?: ConversationState): ConversationState {
  const questionsAsked: Array<{ step: number; question: string }> = [];
  const questionsAnswered: Array<{ step: number; question: string; answer: string }> = [];

  // Simple heuristic: AI messages ending with "?" are questions
  // User messages following questions are answers
  let stepCounter = 1;
  let lastQuestion: { step: number; question: string } | null = null;

  messages.forEach((message, index) => {
    if (message.role === 'assistant') {
      // Look for questions (messages ending with ?)
      const questionMatch = message.content.match(/([^.!?]*\?)/g);
      if (questionMatch && questionMatch.length > 0) {
        // Take the last question in the message
        const question = questionMatch[questionMatch.length - 1].trim();
        lastQuestion = { step: stepCounter, question };
        questionsAsked.push(lastQuestion);
        stepCounter++;
      }
    } else if (message.role === 'user' && lastQuestion) {
      // This is an answer to the last question
      questionsAnswered.push({
        ...lastQuestion,
        answer: message.content,
      });
      lastQuestion = null;
    }
  });

  return {
    questionsAsked,
    questionsAnswered,
    currentStep: questionsAnswered.length + 1,
    totalSteps: currentState?.totalSteps || 15,
  };
}

export function SupportChat() {
  // Get calculator context
  const calculatorContext = useCalculator();

  // Persist chat open state
  const [isOpen, setIsOpen] = useState(() => {
    const stored = localStorage.getItem('kull-chat-open');
    return stored === 'true';
  });

  // Load all chat sessions
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const loadedSessions = loadSessions();
    console.log(`[Chat] Initial load: ${loadedSessions.length} sessions from localStorage`);
    if (loadedSessions.length === 0) {
      // Create initial persistent session with empty messages - greetings will be added via popover
      const initialSession: ChatSession = {
        id: 'main-session-persistent', // Fixed ID for persistence across page loads
        title: 'Chat with Kull',
        messages: [],
        conversationState: {
          questionsAsked: [],
          questionsAnswered: [],
          currentStep: 1,
          totalSteps: 15,
        },
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

  // Track session start time for accurate session length calculation
  const [sessionStartTime, setSessionStartTime] = useState<number>(() => {
    const stored = localStorage.getItem('kull-session-start-time');
    if (stored) {
      return parseInt(stored, 10);
    }
    const now = Date.now();
    localStorage.setItem('kull-session-start-time', now.toString());
    return now;
  });

  // Get current session
  const currentSession = sessions.find(s => s.id === currentSessionId);
  const messages = currentSession?.messages || [];
  const conversationState = currentSession?.conversationState || {
    questionsAsked: [],
    questionsAnswered: [],
    currentStep: 1,
    totalSteps: 15,
  };

  const setMessages = (newMessages: Message[] | ((prev: Message[]) => Message[])) => {
    setSessions(prevSessions => {
      const updatedSessions = prevSessions.map(session => {
        if (session.id === currentSessionId) {
          const updatedMessages = typeof newMessages === 'function' ? newMessages(session.messages) : newMessages;

          // Parse conversation state from messages
          const newConversationState = parseConversationState(updatedMessages, session.conversationState);

          // ALWAYS generate title from most recent message (user or AI)
          let title = session.title;
          if (updatedMessages.length > 0) {
            // Get the most recent message (last in array) from user or assistant
            const recentMessages = [...updatedMessages].reverse();
            const lastMessage = recentMessages.find(m => m.role === 'user' || m.role === 'assistant');
            if (lastMessage) {
              // Clean the content - remove markdown links, format nicely
              let content = lastMessage.content;
              // Remove markdown links but keep the link text
              content = content.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
              // Remove other markdown
              content = content.replace(/[*_~`#]/g, '');
              // Take first 50 chars
              title = content.slice(0, 50).trim() + (content.length > 50 ? '...' : '');
            }
          }

          return {
            ...session,
            messages: updatedMessages,
            conversationState: newConversationState,
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

  // Debounced save to database - prevents rapid-fire saves
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const saveSessionsToDatabase = async (sessionsToSave: ChatSession[]) => {
    // Clear any pending save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Schedule save after 2 seconds of inactivity
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const metadata = await getUserMetadata();
        await apiRequest("POST", '/api/chat/sessions', { sessions: sessionsToSave, metadata });
        console.log('[Chat] Saved', sessionsToSave.length, 'sessions to database');
      } catch (error) {
        console.error('[Chat] Failed to save sessions to database:', error);
      }
    }, 2000);
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
        console.log(`[Chat] DB sessions: ${dbSessions.length}, Local: ${localSessions.length}, Merged: ${mergedSessions.length}`);
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
  const sessionsRef = useRef(sessions);
  useEffect(() => {
    sessionsRef.current = sessions;
  }, [sessions]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (sessionsRef.current.length > 0) {
        console.log('[Chat] Auto-save interval triggered');
        saveSessionsToDatabase(sessionsRef.current);
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, []); // Empty deps - only create interval once
  const [, setLocation] = useLocation();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatWindowRef = useRef<HTMLDivElement>(null);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [transcriptSent, setTranscriptSent] = useState(false);
  const [nextMessageIn, setNextMessageIn] = useState<number | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isProactiveMessagesPaused, setIsProactiveMessagesPaused] = useState(false);
  const [sessionSearchQuery, setSessionSearchQuery] = useState('');
  const isProactiveMessagesPausedRef = useRef(false); // Ref to access current pause state
  const lastAiMessageTimeRef = useRef<number>(Date.now()); // Track when AI last spoke

  // Store pre-generated greeting for initial use
  const [latestGreeting, setLatestGreeting] = useState<string | null>(null);
  const greetingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [greetingGenerated, setGreetingGenerated] = useState(false);
  const lastUserMessageTimeRef = useRef<number>(Date.now());

  // User activity tracking for proactive messages
  const lastActivityTimeRef = useRef<number>(Date.now());
  const [isTabVisible, setIsTabVisible] = useState(true);
  const isTabVisibleRef = useRef(true); // Ref to access current visibility state
  const notificationSoundRef = useRef<HTMLAudioElement | null>(null);

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

  // Track current section and scroll pauses for contextual awareness
  useEffect(() => {
    interface SectionData {
      id: string;
      title: string;
      fullText: string;
      timeEntered: number;
      totalTimeSpent: number;
    }

    let currentSection: string | null = null;
    let sectionEnterTime: number = Date.now();
    const sectionTimeSpent = new Map<string, number>();

    const getSectionData = (): SectionData[] => {
      try {
        const stored = sessionStorage.getItem('kull-section-tracking');
        return stored ? JSON.parse(stored) : [];
      } catch {
        return [];
      }
    };

    const saveSectionData = (data: SectionData[]) => {
      try {
        sessionStorage.setItem('kull-section-tracking', JSON.stringify(data));
      } catch (e) {
        console.error('Failed to save section data:', e);
      }
    };

    const saveCurrentSection = (sectionId: string, sectionTitle: string, sectionText: string) => {
      try {
        sessionStorage.setItem('kull-current-section', JSON.stringify({
          id: sectionId,
          title: sectionTitle,
          fullText: sectionText,
          timestamp: new Date().toISOString(),
        }));
      } catch (e) {
        console.error('Failed to save current section:', e);
      }
    };

    // Find all major sections on the page
    const sections = document.querySelectorAll('section, [data-section], main > div[id], main > div[class*="section"]');

    if (sections.length === 0) {
      console.log('[Section Tracking] No sections found on page');
      return;
    }

    // Intersection Observer to track which section is visible
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
            const section = entry.target as HTMLElement;
            const sectionId = section.id || section.dataset.section || section.className.split(' ')[0] || 'unknown';

            // Get section title (h1, h2, or first heading)
            const titleElement = section.querySelector('h1, h2, h3');
            const sectionTitle = titleElement?.textContent?.trim() || sectionId;

            // Get full text content of section
            const sectionText = section.textContent?.trim().substring(0, 2000) || ''; // Limit to 2000 chars

            // Track time spent in previous section
            if (currentSection && currentSection !== sectionId) {
              const timeSpent = Date.now() - sectionEnterTime;
              const existing = sectionTimeSpent.get(currentSection) || 0;
              sectionTimeSpent.set(currentSection, existing + timeSpent);

              // Save section data
              const sectionData = getSectionData();
              const existingSection = sectionData.find(s => s.id === currentSection);
              if (existingSection) {
                existingSection.totalTimeSpent += timeSpent;
              } else {
                sectionData.push({
                  id: currentSection,
                  title: sectionTitle,
                  fullText: sectionText,
                  timeEntered: sectionEnterTime,
                  totalTimeSpent: timeSpent,
                });
              }
              saveSectionData(sectionData.slice(-20)); // Keep last 20 sections
            }

            // Update current section
            currentSection = sectionId;
            sectionEnterTime = Date.now();
            saveCurrentSection(sectionId, sectionTitle, sectionText);

            console.log('[Section Tracking] Now viewing:', sectionTitle, `(${sectionId})`);
          }
        });
      },
      {
        threshold: [0.5], // Trigger when 50% of section is visible
        rootMargin: '-10% 0px -10% 0px', // Focus on center of viewport
      }
    );

    // Observe all sections
    sections.forEach((section) => observer.observe(section));

    // Cleanup
    return () => {
      observer.disconnect();

      // Save final time spent in current section
      if (currentSection) {
        const timeSpent = Date.now() - sectionEnterTime;
        const existing = sectionTimeSpent.get(currentSection) || 0;
        sectionTimeSpent.set(currentSection, existing + timeSpent);

        const sectionData = getSectionData();
        const existingSection = sectionData.find(s => s.id === currentSection);
        if (existingSection) {
          existingSection.totalTimeSpent += timeSpent;
        }
        saveSectionData(sectionData);
      }
    };
  }, []);

  // Save current session ID and reset session start time whenever session changes
  useEffect(() => {
    localStorage.setItem('kull-current-session-id', currentSessionId);

    // Reset session start time when switching to a new session
    const now = Date.now();
    setSessionStartTime(now);
    localStorage.setItem('kull-session-start-time', now.toString());
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

      // Check if proactive messages are paused (use ref to get current value)
      if (isProactiveMessagesPausedRef.current) {
        console.log('[Chat] Greeting generation skipped - proactive messages paused');
        return;
      }

      // Check if tab is visible (use ref to get current value)
      if (!isTabVisibleRef.current) {
        console.log('[Chat] Greeting generation skipped - tab not visible');
        return;
      }

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

        // Get current section for logging
        const currentSectionData = (() => {
          try {
            const stored = sessionStorage.getItem('kull-current-section');
            return stored ? JSON.parse(stored) : null;
          } catch {
            return null;
          }
        })();
        console.log('[Chat] Current section:', currentSectionData?.title || 'none');

        const response = await fetch('/api/chat/welcome', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include', // Include auth cookies
          body: JSON.stringify({
            context: sessionContext,
            history: fullChatHistory,
            lastAiMessageTime: lastAiMessageTime,
            currentTime: Date.now(),
            sessionId: currentSessionId,
            calculatorData: {
              shootsPerWeek: calculatorContext.shootsPerWeek,
              hoursPerShoot: calculatorContext.hoursPerShoot,
              billableRate: calculatorContext.billableRate,
              hasManuallyAdjusted: calculatorContext.hasManuallyAdjusted,
              hasClickedPreset: calculatorContext.hasClickedPreset,
            },
            // Current section and scroll behavior
            currentSection: (() => {
              try {
                const stored = sessionStorage.getItem('kull-current-section');
                return stored ? JSON.parse(stored) : null;
              } catch {
                return null;
              }
            })(),
            sectionHistory: (() => {
              try {
                const stored = sessionStorage.getItem('kull-section-tracking');
                return stored ? JSON.parse(stored) : [];
              } catch {
                return [];
              }
            })(),
          }),
        });

        if (!response.ok) throw new Error('Failed to generate greeting');

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        if (!reader) throw new Error('No response stream');

        let fullContent = '';
        let chunkCount = 0;
        let buffer = ''; // Buffer for incomplete SSE lines

        console.log('[Chat] Starting stream read...');

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          chunkCount++;

          // Add to buffer and split by lines
          buffer += chunk;
          const lines = buffer.split('\n');

          // Keep the last incomplete line in buffer
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));

                if (data.type === 'status' && data.message) {
                  console.log('[WELCOME STATUS]', data.message);
                  // Concatenate status messages so user sees timeline
                  flushSync(() => {
                    setLatestGreeting(prev => {
                      // Start fresh if we have actual content already (not status)
                      // Status emojis: 📤 📊 📝 ✅ 🤖 ⏳ 🗂️ ⚠️
                      const hasRealContent = prev &&
                        !prev.includes('📤') &&
                        !prev.includes('📊') &&
                        !prev.includes('📝') &&
                        !prev.includes('✅') &&
                        !prev.includes('🤖') &&
                        !prev.includes('⏳') &&
                        !prev.includes('🗂️') &&
                        !prev.includes('⚠️');

                      console.log('[WELCOME STATUS] Current greeting:', prev);
                      console.log('[WELCOME STATUS] hasRealContent:', hasRealContent);

                      if (hasRealContent) {
                        console.log('[WELCOME STATUS] Real content detected, starting fresh');
                        return data.message + '\n';
                      }
                      // Append to existing status messages
                      const newGreeting = (prev || '') + data.message + '\n';
                      console.log('[WELCOME STATUS] New greeting:', newGreeting);
                      return newGreeting;
                    });
                  });
                } else if (data.type === 'delta' && data.content) {
                  // Clear status messages when first real content arrives
                  if (fullContent.includes('📤') || fullContent.includes('📊') || fullContent.includes('📝') ||
                      fullContent.includes('✅') || fullContent.includes('🤖') || fullContent.includes('⏳') ||
                      fullContent.includes('🗂️') || fullContent.includes('⚠️')) {
                    fullContent = '';
                  }

                  fullContent += data.content;

                  // STREAM TO UI - update greeting in real-time with immediate flush
                  flushSync(() => {
                    setLatestGreeting(fullContent);
                  });
                } else if (data.type === 'done') {
                  // Track when AI last responded (welcome message)
                  lastAiMessageTimeRef.current = Date.now();
                } else if (data.type === 'error') {
                  console.error('[Chat] Stream error:', data.message);
                }
              } catch (e) {
                console.error('[Chat] Failed to parse SSE:', e);
              }
            }
          }
        }

        // Stream complete - minimal logging

        if (fullContent && isActive) {
          // Parse next message timing and follow-up questions
          const nextMessageMatch = fullContent.match(/(?:␞\s*)?(?:\n\n?)?NEXT_MESSAGE:\s*(\d+)/i);
          // Stop at newline, ␞, or NEXT_MESSAGE to prevent metadata leakage
          const followUpMatch = fullContent.match(/(?:␞\s*)?(?:\n\n?)?QUICK_REPLIES:\s*([^␞\n]+?)(?:\s*␞|\s*NEXT_MESSAGE|$)/i);

          let cleanContent = fullContent;
          let nextMsgSeconds = 30; // Default

          // Remove ALL metadata from displayed content (cut at first ␞ or QUICK_REPLIES)
          const cutoffIndex = fullContent.indexOf('␞');
          const followUpIndex = fullContent.search(/\n\n?QUICK_REPLIES:/);

          if (cutoffIndex !== -1) {
            cleanContent = fullContent.substring(0, cutoffIndex).trim();
          } else if (followUpIndex !== -1) {
            cleanContent = fullContent.substring(0, followUpIndex).trim();
          }

          // Parse timing
          if (nextMessageMatch) {
            nextMsgSeconds = parseInt(nextMessageMatch[1], 10);
          }

          // Parse and display follow-up questions
          if (followUpMatch) {
            const questionsText = followUpMatch[1].trim();
            const newQuestions = questionsText
              .split('|')
              .map((q: string) => q.trim())
              // Remove any trailing metadata that slipped through
              .map((q: string) => q.replace(/␞.*$/, '').replace(/NEXT_MESSAGE.*$/i, '').trim())
              .filter((q: string) => q.length > 5 && q.length < 200);

            if (newQuestions.length > 0) {
              setQuickQuestions(newQuestions);
              setShowSuggestions(true);
            }
          }

          if (!currentGreetingGenerated) {
            // First generation: store for initial greeting
            setLatestGreeting(cleanContent);
            setGreetingGenerated(true);
            setNextMessageIn(nextMsgSeconds);

            // 🔊 PLAY CYBERPUNK DING FOR NEW GREETING (only if tab is visible)
            if (isTabVisibleRef.current) {
              playCyberpunkDing();
            }

            // Show popover if chat is closed
            if (!currentIsOpen) {
              console.log('[Chat] Showing initial greeting popover - chat is closed');
              setPopoverGreeting(cleanContent);
              setShowGreetingPopover(true);

              // Auto-hide after 10 seconds
              setTimeout(() => {
                if (isActive) setShowGreetingPopover(false);
              }, 10000);
            } else {
              // Chat is open - DON'T send greeting immediately
              // User just opened chat, let them browse/read first
              console.log('[Chat] Initial greeting skipped - chat is open, waiting for user inactivity');
            }
          } else {
            // Subsequent generations
            const timeSinceLastUserMessage = Date.now() - lastUserMessageTimeRef.current;
            const timeSinceLastActivity = Date.now() - lastActivityTimeRef.current;
            const ONE_MINUTE = 60000; // 60 seconds in milliseconds

            // Double-check pause state before adding message (in case pause was activated during generation)
            if (isProactiveMessagesPausedRef.current) {
              console.log('[Chat] Greeting blocked - proactive messages paused');
              return;
            }

            // Only send greetings if user has been inactive for at least 1 minute
            const userIsInactive = timeSinceLastUserMessage > ONE_MINUTE && timeSinceLastActivity > ONE_MINUTE;

            if (!userIsInactive) {
              console.log('[Chat] Greeting blocked - user active recently (last message: ' +
                Math.round(timeSinceLastUserMessage / 1000) + 's ago, last activity: ' +
                Math.round(timeSinceLastActivity / 1000) + 's ago)');
              return;
            }

            // Only show greeting if chat is CLOSED
            // Don't interrupt user when chat is open - they're engaged!
            if (!currentIsOpen) {
              console.log('[Chat] Showing greeting popover - chat closed and user inactive for 1+ minute');
              // Chat is closed: show popover instead
              setPopoverGreeting(cleanContent);
              setShowGreetingPopover(true);
              setNextMessageIn(nextMsgSeconds);

              // Auto-hide after 10 seconds
              setTimeout(() => {
                if (isActive) setShowGreetingPopover(false);
              }, 10000);
            } else {
              console.log('[Chat] Greeting blocked - chat is open (user may be reading)');
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

  // Initialize notification sound
  useEffect(() => {
    // Create notification sound (simple beep using data URI)
    notificationSoundRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTcIGmm98OyfTgwOUqjk77RgGgU7k9n0zH4yBSh+zPLaizsKFlm46+yrWBgMSKXh9L50LAU0gdDy2Ik3CBpqvfDtoVAMDlOo5O+0YBoFO5PZ9M1+MgUofszy2os7ChZZuOvsq1gYDEil4fS+dCwFNIHQ8tiJNwgaarz07aFQDA5TqOTvtGAaBTuT2fTNfjIFKH3M8tqLOwoWWbjr7KtYGAxIpuH0vnQsBTSB0PLYiTcIGmq88O2hUAwOU6jk77RgGgU7k9n0zX4yBSh9zPLaizsKFlm46+yrWBgMSKbh9L50LAU0gdDy2Ik3CBpqvPDtoVAMDlOo5O+0YRoFO5PZ9M1+MgUofczy2os7ChZZuOvsq1gYDEim4fS+dCwFNIHQ8tiJNwgaarz07aFQDA5TqOTvtGEaBTuT2fTNfjIFKH3M8tqLOwoWWbjr7KtYGAxIpuH0vnQsBTSB0PLYiTcIGmq88O2hUAwOU6jk77RhGgU7k9n0zX4yBSh9zPLaizsKFlm46+yrWBgMSKbh9L50LAU0gdDy2Ik3CBpqvPDtoVAMDlOo5O+0YRoFO5PZ9M1+MgUofczy2os7ChZZuOvsq1gYDEim4fS+dCwFNIHQ8tiJNwgaarzw7aFQDA5TqOTvtGEaBTuT2fTNfjIFKH3M8tqLOwoWWbjr7KtYGAxIpuH0vnQsBTSB0PLYiTcIGmq88O2hUAwOU6jk77RhGgU7k9n0zX4yBSh9zPLaizsKFlm46+yrWBgMSKbh9L50LAU0gdDy2Ik3CBpqvPDtoVAMDlOo5O+0YRoFO5PZ9M1+MgUofczy2os7ChZZuOvsq1gYDEim4fS+dCwFNIHQ8tiJNwgaarzw7aFQDA5TqOTvtGEaBTuT2fTNfjIFKH3M8tqLOwoWWbjr7KtYGAxIpuH0vnQsBTSB0PLYiTcIGmq88O2hUAwOU6jk77RhGgU7k9n0zX4yBSh9zPLaizsKFlm46+yrWBgMSKbh9L50LAU=');
  }, []);

  // Keep refs in sync with state
  useEffect(() => {
    isProactiveMessagesPausedRef.current = isProactiveMessagesPaused;
  }, [isProactiveMessagesPaused]);

  useEffect(() => {
    isTabVisibleRef.current = isTabVisible;
  }, [isTabVisible]);

  // Track tab visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = !document.hidden;
      setIsTabVisible(visible);
      isTabVisibleRef.current = visible;
      console.log('[Chat] Tab visibility changed:', visible);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Track user activity (scroll, click, mousemove, keypress)
  useEffect(() => {
    const updateActivity = () => {
      lastActivityTimeRef.current = Date.now();
    };

    // Add listeners for various user interactions
    window.addEventListener('scroll', updateActivity);
    window.addEventListener('click', updateActivity);
    window.addEventListener('mousemove', updateActivity);
    window.addEventListener('keypress', updateActivity);
    window.addEventListener('touchstart', updateActivity);

    return () => {
      window.removeEventListener('scroll', updateActivity);
      window.removeEventListener('click', updateActivity);
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('keypress', updateActivity);
      window.removeEventListener('touchstart', updateActivity);
    };
  }, []);

  // Countdown effect with proactive message sending
  useEffect(() => {
    // Clear any existing countdown
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    // Don't start countdown if paused
    if (isProactiveMessagesPausedRef.current) {
      console.log('[Chat] Countdown not started - proactive messages paused');
      return;
    }

    if (nextMessageIn !== null && nextMessageIn > 0) {
      // Start countdown
      countdownIntervalRef.current = setInterval(() => {
        // Check pause state using ref (not stale state)
        if (isProactiveMessagesPausedRef.current) {
          console.log('[Chat] Countdown stopped - proactive messages paused');
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
          return;
        }

        setNextMessageIn(prev => {
          if (prev === null || prev <= 1) {
            if (countdownIntervalRef.current) {
              clearInterval(countdownIntervalRef.current);
              countdownIntervalRef.current = null;
            }

            // Check if we should send a proactive message
            const timeSinceActivity = Date.now() - lastActivityTimeRef.current;
            const timeSinceUserMessage = Date.now() - lastUserMessageTimeRef.current;
            const timeSinceAiMessage = Date.now() - lastAiMessageTimeRef.current;
            const ONE_MINUTE = 60 * 1000;
            const THIRTY_SECONDS = 30 * 1000;

            // Only send if:
            // 1. Tab is visible OR activity was within last minute
            // 2. Chat is open
            // 3. Not currently loading
            // 4. Proactive messages are not paused (use ref for current value)
            // 5. At least 30 seconds since last user message
            // 6. At least 30 seconds since last AI message
            const shouldSendProactive = (isTabVisible || timeSinceActivity < ONE_MINUTE)
              && isOpen
              && !isLoading
              && !isProactiveMessagesPausedRef.current
              && timeSinceUserMessage >= THIRTY_SECONDS
              && timeSinceAiMessage >= THIRTY_SECONDS;

            console.log('[Chat] Countdown reached 0. Should send proactive?', shouldSendProactive, {
              isTabVisible,
              timeSinceActivity: Math.round(timeSinceActivity / 1000) + 's',
              timeSinceUserMessage: Math.round(timeSinceUserMessage / 1000) + 's',
              timeSinceAiMessage: Math.round(timeSinceAiMessage / 1000) + 's',
              isOpen,
              isLoading,
              isPaused: isProactiveMessagesPausedRef.current
            });

            if (shouldSendProactive) {
              // Send proactive message - use empty string to trigger AI to continue conversation
              sendMessage('[Continue conversation naturally based on context]').then(() => {
                // 🔊 PLAY CYBERPUNK DING FOR PROACTIVE MESSAGE (only if tab is visible)
                if (isTabVisibleRef.current) {
                  playCyberpunkDing();
                }
              });
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
  }, [nextMessageIn, isTabVisible, isOpen, isLoading, isProactiveMessagesPaused]);

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
    if (!messageText.trim()) return;

    // Track when user last sent a message
    lastUserMessageTimeRef.current = Date.now();

    // CRITICAL FIX: Clear proactive message countdown when user sends a message
    // This prevents automated messages from interrupting active conversations
    setNextMessageIn(null);

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText.trim(),
      timestamp: new Date(),
    };

    // CRITICAL FIX: Add user message and capture FRESH state in one step
    // This ensures we get the absolute latest state including the new message
    let freshHistory: Message[] = [];
    setMessages(prev => {
      const updated = [...prev, userMessage];
      freshHistory = updated; // Capture fresh state
      return updated;
    });

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
      // Create an AbortController with 60 second timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.error('[Chat] Request timeout after 60 seconds');
      }, 60000);

      // Collect data to send
      const userActivity = JSON.parse(sessionStorage.getItem('kull-user-activity') || '[]');
      const pageVisits = JSON.parse(sessionStorage.getItem('kull-page-visits') || '[]');

      // Show client-side preparation status
      let historyTimestamp = 'now';
      try {
        const lastMsg = freshHistory[freshHistory.length - 1];
        if (lastMsg?.timestamp) {
          historyTimestamp = new Date(lastMsg.timestamp).toLocaleTimeString();
        }
      } catch (e) {
        historyTimestamp = 'now';
      }

      // Break down events by type
      const clicks = userActivity.filter((e: any) => e.type === 'click').length;
      const scrolls = userActivity.filter((e: any) => e.type === 'scroll').length;
      const hovers = userActivity.filter((e: any) => e.type === 'hover').length;
      const inputs = userActivity.filter((e: any) => e.type === 'input').length;
      const selects = userActivity.filter((e: any) => e.type === 'select').length;
      const eventBreakdown = userActivity.length > 0
        ? `${userActivity.length} events (${clicks} clicks, ${scrolls} scrolls, ${hovers} hovers, ${inputs} inputs, ${selects} selects)`
        : '0 events';

      flushSync(() => {
        setMessages(prev => {
          const updated = [...prev];
          const lastMsg = updated[updated.length - 1];
          if (lastMsg && lastMsg.role === 'assistant') {
            lastMsg.content = `📤 sending chat history (${freshHistory.length} msgs from ${historyTimestamp})...\n`;
            lastMsg.content += `📤 sending ${eventBreakdown}...\n`;
          }
          return updated;
        });
      });

      // DEEP RESEARCH LOGGING: Verify what we're sending
      const payload = {
        message: messageText.trim(),
        history: freshHistory, // ✅ Send FRESH history including the new user message!
        userActivity,
        pageVisits,
        allSessions: sessions, // Send ALL previous sessions for this user
        sessionId: currentSessionId,
        sessionStartTime, // For accurate session length calculation
        conversationState: conversationState, // Send current conversation progress
        calculatorData: {
          shootsPerWeek: calculatorContext.shootsPerWeek,
          hoursPerShoot: calculatorContext.hoursPerShoot,
          billableRate: calculatorContext.billableRate,
          hasManuallyAdjusted: calculatorContext.hasManuallyAdjusted,
          hasClickedPreset: calculatorContext.hasClickedPreset,
        },
        // Current section and scroll behavior
        currentSection: (() => {
          try {
            const stored = sessionStorage.getItem('kull-current-section');
            return stored ? JSON.parse(stored) : null;
          } catch {
            return null;
          }
        })(),
        sectionHistory: (() => {
          try {
            const stored = sessionStorage.getItem('kull-section-tracking');
            return stored ? JSON.parse(stored) : [];
          } catch {
            return [];
          }
        })(),
      };

      console.log('[DEEP RESEARCH] Sending to /api/chat/message:');
      console.log('  - message length:', messageText.trim().length);
      console.log('  - history:', freshHistory.length, 'messages (FRESH - captured at millisecond precision)');
      console.log('  - currentSection:', payload.currentSection?.title || 'none');
      console.log('  - sectionHistory:', payload.sectionHistory.length, 'sections visited');
      console.log('  - VERIFICATION: Last message in history IS the user message just sent:',
        freshHistory[freshHistory.length - 1]?.content === messageText.trim() ? '✅ YES' : '❌ NO - STALE!');
      console.log('  - history[0]:', freshHistory[0] ? JSON.stringify(freshHistory[0]).substring(0, 100) + '...' : 'N/A');
      console.log('  - history[last]:', freshHistory.length > 0 ? JSON.stringify(freshHistory[freshHistory.length - 1]).substring(0, 100) + '...' : 'N/A');
      console.log('  - payload size:', JSON.stringify(payload).length, 'chars');

      const response = await fetch('/api/chat/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        credentials: 'include', // Include auth cookies
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

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
      let buffer = ''; // Buffer for incomplete SSE lines

      console.log('[Chat] Starting to read response stream for message:', assistantMessageId);

      // Add stream timeout - if no data received for 30 seconds, abort
      let streamTimeoutId: NodeJS.Timeout | null = null;
      const resetStreamTimeout = () => {
        if (streamTimeoutId) clearTimeout(streamTimeoutId);
        streamTimeoutId = setTimeout(() => {
          console.error('[Chat] Stream timeout - no data received for 30 seconds');
          reader.cancel();
          throw new Error('Stream timeout - no response from server');
        }, 30000);
      };
      resetStreamTimeout();

      while (true) {
        const { done, value } = await reader.read();

        // Reset timeout on each chunk received
        if (streamTimeoutId) {
          clearTimeout(streamTimeoutId);
          streamTimeoutId = null;
        }

        if (done) {
          console.log('[Chat] Stream done. Total content length:', fullContent.length);
          if (streamTimeoutId) clearTimeout(streamTimeoutId);
          break;
        }

        // Reset timeout on each chunk - stream is still alive
        resetStreamTimeout();

        const chunk = decoder.decode(value, { stream: true });

        // Add to buffer and split by lines
        buffer += chunk;
        const lines = buffer.split('\n');

        // Keep the last incomplete line in buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'status' && data.message) {
                console.log('[STATUS UPDATE]', data.message);
                // Concatenate status messages to show full timeline
                flushSync(() => {
                  setMessages(prev => {
                    const updated = [...prev];
                    const lastMsg = updated[updated.length - 1];
                    if (lastMsg && lastMsg.role === 'assistant') {
                      // Check if content already has real text (not status or thinking marker)
                      // Status emojis: 📤 📊 📝 ✅ 🤖 ⏳ 🗂️ ⚠️
                      const isStatusOrThinking = !lastMsg.content ||
                        lastMsg.content === '__THINKING__' ||
                        lastMsg.content.includes('📤') ||
                        lastMsg.content.includes('📊') ||
                        lastMsg.content.includes('📝') ||
                        lastMsg.content.includes('✅') ||
                        lastMsg.content.includes('🤖') ||
                        lastMsg.content.includes('⏳') ||
                        lastMsg.content.includes('🗂️') ||
                        lastMsg.content.includes('⚙️') ||
                        lastMsg.content.includes('✨') ||
                        lastMsg.content.includes('⚠️');

                      console.log('[STATUS] Current content:', lastMsg.content);
                      console.log('[STATUS] isStatusOrThinking:', isStatusOrThinking);

                      if (!isStatusOrThinking) {
                        // Real content has started, ignore further status updates
                        console.log('[STATUS] Ignoring - real content detected');
                        return updated;
                      }

                      // Replace __THINKING__ with first status, or append to existing status
                      if (lastMsg.content === '__THINKING__') {
                        console.log('[STATUS] Replacing __THINKING__ with first status');
                        lastMsg.content = data.message + '\n';
                      } else {
                        console.log('[STATUS] Appending to existing status');
                        lastMsg.content = (lastMsg.content || '') + data.message + '\n';
                      }
                      console.log('[STATUS] New content:', lastMsg.content);
                    }
                    return updated;
                  });
                });
              } else if (data.type === 'delta' && data.content) {
                // Mark that we've received the first token
                if (!firstTokenReceived) {
                  firstTokenReceived = true;
                  // Clear status messages when real content starts
                  fullContent = '';
                }

                // If we already detected cutoff, ignore all further deltas
                if (cutoffDetected) {
                  continue;
                }

                fullContent += data.content;

                // Look for cutoff markers - check multiple patterns to ensure we catch metadata
                let cutoffIndex = -1;

                // Try multiple patterns to find where the metadata starts:
                // 1. Unicode marker ␞ (U+241E)
                const unicodeMarkerIdx = fullContent.indexOf('␞');

                // 2. QUICK_REPLIES with various formats (with or without newlines)
                const followUpPattern = /(?:\n\s*|\s+)QUICK_REPLIES:/i;
                const followUpMatch = fullContent.match(followUpPattern);
                const followUpIdx = followUpMatch ? followUpMatch.index! : -1;

                // 3. NEXT_MESSAGE without QUICK_REPLIES (in case AI skips that part)
                const nextMsgPattern = /(?:\n\s*|\s+)NEXT_MESSAGE:/i;
                const nextMsgMatch = fullContent.match(nextMsgPattern);
                const nextMsgIdx = nextMsgMatch ? nextMsgMatch.index! : -1;

                // Use the earliest occurrence of any marker
                const indices = [unicodeMarkerIdx, followUpIdx, nextMsgIdx].filter(idx => idx !== -1);
                if (indices.length > 0) {
                  cutoffIndex = Math.min(...indices);
                }

                if (cutoffIndex !== -1) {
                  // Found cutoff! Set flag to stop processing further deltas
                  cutoffDetected = true;

                  // Extract clean content before cutoff
                  const cleanContent = fullContent.substring(0, cutoffIndex).trim();
                  const questionsSection = fullContent.substring(cutoffIndex);

                  // Extract follow-up questions - look for the line after cutoff
                  // Stop at newline, ␞, or NEXT_MESSAGE
                  const followUpMatch = questionsSection.match(/QUICK_REPLIES:\s*([^␞\n]+?)(?:\s*␞|\s*NEXT_MESSAGE|$)/i);

                  if (followUpMatch) {
                    const questionsText = followUpMatch[1].trim();
                    const newQuestions = questionsText
                      .split('|')
                      .map((q: string) => q.trim())
                      // Remove any trailing metadata that slipped through
                      .map((q: string) => q.replace(/␞.*$/, '').replace(/NEXT_MESSAGE.*$/i, '').trim())
                      .filter((q: string) => q.length > 5 && q.length < 200);

                    if (newQuestions.length > 0) {
                      setQuickQuestions(newQuestions);
                      setShowSuggestions(true); // Show them by default when new questions arrive
                    }
                  }

                  // Extract next message timing - ALWAYS set a countdown
                  const nextMessageMatch = questionsSection.match(/(?:␞\s*)?(?:\n\n?)?NEXT_MESSAGE:\s*(\d+)/i);
                  let nextMsgSeconds = 45; // Default countdown
                  if (nextMessageMatch) {
                    nextMsgSeconds = parseInt(nextMessageMatch[1], 10);
                  }
                  // ALWAYS set the countdown
                  setNextMessageIn(nextMsgSeconds);

                  // Update message with clean content
                  flushSync(() => {
                    setMessages(prev =>
                      prev.map(msg =>
                        msg.id === assistantMessageId
                          ? { ...msg, content: cleanContent }
                          : msg
                      )
                    );
                  });

                  // Update fullContent so subsequent checks use clean version
                  fullContent = cleanContent;

                  // Don't update the message anymore since we've detected cutoff
                  continue;
                }

                // Check for first link and navigate immediately (before UI update to avoid race)
                if (!hasNavigated) {
                  const linkMatch = fullContent.match(/\[([^\]]+)\]\(([^)]+)\)/);
                  if (linkMatch) {
                    const url = linkMatch[2];
                    hasNavigated = true;
                    // Navigate immediately!
                    handleLinkClick(url);
                  }
                }

                // 🔥 UPDATE UI INCREMENTALLY AS DELTAS ARRIVE - force immediate rendering
                flushSync(() => {
                  setMessages(prev =>
                    prev.map(msg =>
                      msg.id === assistantMessageId
                        ? { ...msg, content: fullContent }
                        : msg
                    )
                  );
                });
              } else if (data.type === 'error') {
                throw new Error(data.message || 'Stream error');
              } else if (data.type === 'done') {
                // Track when AI last responded
                lastAiMessageTimeRef.current = Date.now();

                // 🔊 PLAY CYBERPUNK DING - MESSAGE COMPLETE (only if tab is visible)
                if (isTabVisibleRef.current) {
                  playCyberpunkDing();
                }

                // Final cleanup - check for metadata one last time
                if (!cutoffDetected) {
                  // Use the same robust detection as in the stream loop
                  const unicodeMarkerIdx = fullContent.indexOf('␞');
                  const followUpPattern = /(?:\n\s*|\s+)QUICK_REPLIES:/i;
                  const followUpMatch = fullContent.match(followUpPattern);
                  const followUpIdx = followUpMatch ? followUpMatch.index! : -1;
                  const nextMsgPattern = /(?:\n\s*|\s+)NEXT_MESSAGE:/i;
                  const nextMsgMatch = fullContent.match(nextMsgPattern);
                  const nextMsgIdx = nextMsgMatch ? nextMsgMatch.index! : -1;

                  const indices = [unicodeMarkerIdx, followUpIdx, nextMsgIdx].filter(idx => idx !== -1);
                  if (indices.length > 0) {
                    const cutoffIndex = Math.min(...indices);
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
              // Skip invalid JSON lines - only log if it's actually an error
              if (e instanceof Error) {
                console.error('[Chat] Parse error:', e.message);
              }
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
    } catch (error: any) {
      console.error('[Chat] Error in sendMessage:', error);

      // Determine error message based on error type
      let errorDescription = 'Failed to send message. Please try again.';
      if (error.name === 'AbortError') {
        errorDescription = 'Request timed out. The server took too long to respond.';
      } else if (error.message?.includes('timeout')) {
        errorDescription = 'No response from server. Please check your connection and try again.';
      }

      toast({
        title: 'Error',
        description: errorDescription,
        variant: 'destructive',
      });
      // Remove the failed assistant message
      setMessages(prev => prev.filter(msg => msg.id !== assistantMessageId));
    } finally {
      console.log('[Chat] sendMessage finally block, setting isLoading to false');
      setIsLoading(false);
    }
  };

  // Automated message sender for system events (calculator changes, etc.)
  const sendAutomatedMessage = useCallback(async (systemPrompt: string) => {
    // Only send if chat has been opened and user has interacted
    if (!isOpen || messages.length === 0) {
      console.log('[Chat] Skipping automated message - chat not active');
      return;
    }

    // Don't interrupt if already loading
    if (isLoading) {
      console.log('[Chat] Skipping automated message - already loading');
      return;
    }

    console.log('[Chat] Sending automated message:', systemPrompt);

    // Track as automated message
    lastAiMessageTimeRef.current = Date.now();

    // Create placeholder assistant message with "Thinking..." indicator
    const assistantMessageId = Date.now().toString();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '__THINKING__',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, assistantMessage]);
    setIsLoading(true);

    try {
      // Create an AbortController with 60 second timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.error('[Chat] Automated message timeout after 60 seconds');
      }, 60000);

      // Collect data to send
      const userActivity = JSON.parse(sessionStorage.getItem('kull-user-activity') || '[]');
      const pageVisits = JSON.parse(sessionStorage.getItem('kull-page-visits') || '[]');

      // Get fresh history
      let freshHistory: Message[] = [];
      setMessages(prev => {
        freshHistory = prev;
        return prev;
      });

      const payload = {
        message: systemPrompt, // System prompt for AI to acknowledge calculator change
        history: freshHistory,
        userActivity,
        pageVisits,
        allSessions: sessions,
        sessionId: currentSessionId,
        sessionStartTime,
        conversationState: conversationState,
        calculatorData: {
          shootsPerWeek: calculatorContext.shootsPerWeek,
          hoursPerShoot: calculatorContext.hoursPerShoot,
          billableRate: calculatorContext.billableRate,
          hasManuallyAdjusted: calculatorContext.hasManuallyAdjusted,
          hasClickedPreset: calculatorContext.hasClickedPreset,
        },
        currentSection: (() => {
          try {
            const stored = sessionStorage.getItem('kull-current-section');
            return stored ? JSON.parse(stored) : null;
          } catch {
            return null;
          }
        })(),
        sectionHistory: (() => {
          try {
            const stored = sessionStorage.getItem('kull-section-tracking');
            return stored ? JSON.parse(stored) : [];
          } catch {
            return [];
          }
        })(),
      };

      console.log('[Chat] Automated message payload prepared');

      const response = await fetch('/api/chat/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'credentials': 'include',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error('Failed to get automated response');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  fullContent += parsed.content;
                  flushSync(() => {
                    setMessages(prev => {
                      const updated = [...prev];
                      const lastMsg = updated[updated.length - 1];
                      if (lastMsg && lastMsg.role === 'assistant') {
                        lastMsg.content = fullContent;
                      }
                      return updated;
                    });
                  });
                }
              } catch (e) {
                console.error('[Chat] Error parsing automated message SSE:', e);
              }
            }
          }
        }
      }

      // Play notification sound for automated messages
      if (isTabVisibleRef.current) {
        playCyberpunkDing();
      }

      console.log('[Chat] Automated message completed:', fullContent.substring(0, 100) + '...');
    } catch (error: any) {
      console.error('[Chat] Error in sendAutomatedMessage:', error);
      // Remove the failed assistant message silently
      setMessages(prev => prev.filter(msg => msg.id !== assistantMessageId));
    } finally {
      setIsLoading(false);
    }
  }, [isOpen, messages.length, isLoading, sessions, currentSessionId, sessionStartTime, conversationState, calculatorContext]);

  // Listen for calculator changes and trigger automated AI acknowledgment
  useEffect(() => {
    const handleCalculatorChange = (values: { shootsPerWeek: number; hoursPerShoot: number; billableRate: number }) => {
      console.log('[Chat] Calculator values changed:', values);

      // Only trigger if chat is open and user has had at least 1 interaction
      if (messages.length > 0 && isOpen) {
        const annualShoots = values.shootsPerWeek * 44;
        const annualHours = annualShoots * values.hoursPerShoot;
        const annualRevenue = annualHours * values.billableRate;

        // Send system message to AI to acknowledge the change
        const systemPrompt = `[CALCULATOR UPDATE] User adjusted calculator values:
- ${annualShoots} shoots/year (${values.shootsPerWeek} per week)
- ${values.hoursPerShoot} hours per shoot
- $${values.billableRate}/hour billable rate
- ${annualHours.toFixed(0)} hours/year spent culling
- $${annualRevenue.toLocaleString()} annual revenue lost

Please acknowledge this change naturally in 1-2 sentences and relate it to our conversation.`;

        sendAutomatedMessage(systemPrompt);
      }
    };

    // Register the listener
    const unregister = calculatorContext.registerChangeListener(handleCalculatorChange);

    // Cleanup on unmount
    return () => {
      unregister();
    };
  }, [calculatorContext, messages.length, isOpen, sendAutomatedMessage]);

  // Click outside to close chat
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (chatWindowRef.current && !chatWindowRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    // Add a small delay to prevent immediate closing when opening
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

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

  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleNewSession = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
      conversationState: {
        questionsAsked: [],
        questionsAnswered: [],
        currentStep: 1,
        totalSteps: 15,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setSessions(prev => {
      const updated = [newSession, ...prev];
      saveSessions(updated);
      return updated;
    });

    setCurrentSessionId(newSession.id);

    // Reset quick replies to defaults
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

    // Reset quick replies when switching
    setQuickQuestions([
      "How do I install Kull?",
      "Which AI model is best?",
      "How does the rating system work?",
      "Can I cancel my trial?",
    ]);
  };

  const handleResetChat = () => {
    // Create a brand NEW session instead of clearing current one
    const newSessionId = String(Date.now());
    const newSession: ChatSession = {
      id: newSessionId,
      title: 'New Chat',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setSessions(prevSessions => {
      // Add new session to the list
      const updated = [...prevSessions, newSession];
      saveSessions(updated);
      return updated;
    });

    // Switch to the new session
    setCurrentSessionId(newSessionId);

    // Reset quick replies to defaults
    setQuickQuestions([
      "How do I install Kull?",
      "Which AI model is best?",
      "How does the rating system work?",
      "Can I cancel my trial?",
    ]);

    toast({
      title: 'New Chat Started',
      description: 'Previous conversation has been saved. Starting fresh!',
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
              <div className="bg-teal-600 text-white text-xs font-bold rounded-full px-2 py-0.5 shadow-md">
                {nextMessageIn}s
              </div>
            )}
          </div>

          {/* Greeting Popover */}
          {showGreetingPopover && popoverGreeting && (
            <div
              className="fixed bottom-4 left-20 md:left-24 md:bottom-6 max-w-[280px] md:max-w-[320px] bg-card border border-teal-200/50 rounded-2xl p-3 md:p-4 z-[9999] animate-in slide-in-from-left-2 fade-in duration-300"
              style={{
                position: 'fixed',
                boxShadow: '0 20px 60px -10px rgba(45, 212, 191, 0.3), 0 10px 30px -5px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(45, 212, 191, 0.1)',
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(240, 253, 250, 0.98) 100%)',
                backdropFilter: 'blur(12px)',
              }}
            >
              {/* Glow effect overlay */}
              <div
                className="absolute inset-0 rounded-2xl pointer-events-none"
                style={{
                  background: 'radial-gradient(circle at top left, rgba(20, 184, 166, 0.08) 0%, transparent 60%)',
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
                      background: 'linear-gradient(135deg, #14b8a6 0%, #5eead4 100%)',
                      boxShadow: '0 4px 12px rgba(20, 184, 166, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
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
                  className="mt-2.5 text-[10px] md:text-xs text-teal-600 hover:text-teal-700 font-semibold transition-colors"
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
          ref={chatWindowRef}
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
              <button
                onClick={() => setIsProactiveMessagesPaused(!isProactiveMessagesPaused)}
                className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center flex-shrink-0 relative hover:bg-primary-foreground/30 transition-colors cursor-pointer"
                title={isProactiveMessagesPaused ? "Resume proactive messages" : "Pause proactive messages"}
              >
                {isProactiveMessagesPaused ? (
                  <Play className="w-5 h-5 text-primary-foreground" />
                ) : (
                  <Pause className="w-5 h-5 text-primary-foreground" />
                )}
                {nextMessageIn !== null && nextMessageIn > 0 && !isProactiveMessagesPaused && (
                  <span className="absolute -top-1 -right-1 bg-white text-teal-600 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {nextMessageIn}
                  </span>
                )}
              </button>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-primary-foreground">
                  Kull Support
                  {nextMessageIn !== null && nextMessageIn > 0 && !isProactiveMessagesPaused && (
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
                <DropdownMenuContent align="end" className="w-80 max-h-[500px] z-[10000]">
                  <DropdownMenuLabel>Chat History ({sessions.length} total)</DropdownMenuLabel>
                  <DropdownMenuSeparator />

                  {/* Search Input */}
                  <div className="px-2 pb-2">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search conversations..."
                        value={sessionSearchQuery}
                        onChange={(e) => setSessionSearchQuery(e.target.value)}
                        className="pl-8 h-9"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>

                  <DropdownMenuItem onClick={handleNewSession} data-testid="button-new-chat">
                    <Plus className="w-4 h-4 mr-2" />
                    New Chat
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />

                  {/* Scrollable Session List */}
                  <div className="max-h-[350px] overflow-y-auto">
                    {sessions.length > 0 ? (
                      (() => {
                        const filteredSessions = sessions
                          .filter((session) =>
                            sessionSearchQuery.trim() === '' ||
                            session.title.toLowerCase().includes(sessionSearchQuery.toLowerCase()) ||
                            session.messages.some(m =>
                              m.content.toLowerCase().includes(sessionSearchQuery.toLowerCase())
                            )
                          )
                          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

                        return filteredSessions.length > 0 ? (
                          filteredSessions.map((session) => (
                            <DropdownMenuItem
                              key={session.id}
                              onClick={() => {
                                handleSwitchSession(session.id);
                                setSessionSearchQuery(''); // Clear search on select
                              }}
                              className={session.id === currentSessionId ? 'bg-accent' : ''}
                              data-testid={`session-${session.id}`}
                            >
                              <div className="flex flex-col gap-1 w-full">
                                <div className="font-medium truncate">{session.title}</div>
                                <div className="text-xs text-muted-foreground flex items-center justify-between">
                                  <span>
                                    {new Date(session.updatedAt).toLocaleDateString([], {
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </span>
                                  <span className="text-xs opacity-60">
                                    {session.messages.length} msg{session.messages.length !== 1 ? 's' : ''}
                                  </span>
                                </div>
                              </div>
                            </DropdownMenuItem>
                          ))
                        ) : (
                          <DropdownMenuItem disabled>
                            No sessions match "{sessionSearchQuery}"
                          </DropdownMenuItem>
                        );
                      })()
                    ) : (
                      <DropdownMenuItem disabled>No chat history</DropdownMenuItem>
                    )}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetChat}
                className="text-primary-foreground bg-primary-foreground/30 hover:bg-primary-foreground/40 no-default-hover-elevate"
                data-testid="button-reset-chat"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                <span className="text-xs font-medium">New Chat</span>
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

          {/* Conversation Progress - pinned to top */}
          {(conversationState.questionsAsked.length > 0 || conversationState.questionsAnswered.length > 0) && (
            <div className="sticky top-0 z-30">
              <ConversationProgress
                questionsAsked={conversationState.questionsAsked}
                questionsAnswered={conversationState.questionsAnswered}
                currentStep={conversationState.currentStep}
                totalSteps={conversationState.totalSteps}
              />
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background overscroll-contain">
            {/* Chat messages */}
            {messages
              .filter(m => !m.content.includes('[Continue conversation naturally based on context]'))
              .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
              .map((message) => (
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
                        <div className="flex items-start gap-3 border-l-4 border-teal-400 pl-3 py-1 bg-teal-50/50 rounded-r">
                          <Loader2 className="w-4 h-4 animate-spin text-teal-600 mt-0.5 flex-shrink-0" />
                          <span className="text-teal-700 italic">Generating your personalized greeting...</span>
                        </div>
                      ) : message.content === '__THINKING__' ||
                          message.content.includes('📤') ||
                          message.content.includes('📊') ||
                          message.content.includes('📝') ||
                          message.content.includes('✅') ||
                          message.content.includes('🤖') ||
                          message.content.includes('⏳') ||
                          message.content.includes('🗂️') ||
                          message.content.includes('⚙️') ||
                          message.content.includes('✨') ||
                          message.content.includes('⚠️') ? (
                        // Special rendering for status messages - LARGE, PROMINENT display
                        <div className="flex flex-col gap-2 border-l-4 border-teal-500 pl-4 py-3 bg-gradient-to-r from-teal-50 to-transparent rounded-r shadow-sm">
                          <div className="flex items-center gap-3">
                            <Loader2 className="w-5 h-5 animate-spin text-teal-600 flex-shrink-0" />
                            <span className="text-sm font-semibold text-teal-800">
                              {message.content === '__THINKING__' ? 'Preparing your response...' : 'Processing...'}
                            </span>
                          </div>
                          <div className="text-xs font-mono text-teal-700 whitespace-pre-wrap leading-relaxed pl-8">
                            {message.content === '__THINKING__'
                              ? 'Loading context from repository and building AI prompt...'
                              : message.content}
                          </div>
                        </div>
                      ) : message.content.length === 0 ? (
                        // Waiting for first token
                        <div className="flex items-start gap-3 border-l-4 border-blue-400 pl-3 py-1 bg-blue-50/50 rounded-r">
                          <Loader2 className="w-4 h-4 animate-spin text-blue-600 mt-0.5 flex-shrink-0" />
                          <span className="text-blue-700 italic">Streaming response...</span>
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

          {/* Quick Replies with toggle - dark aqua gradient, transparent when closed, scrollable when open */}
          <div className={`border-t ${showSuggestions ? 'border-slate-700/50 bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm' : 'border-transparent'}`}>
            <button
              onClick={() => setShowSuggestions(!showSuggestions)}
              className={`w-full px-4 py-3 flex items-center justify-between transition-all ${
                showSuggestions ? 'hover:bg-slate-700/30' : 'hover:bg-slate-800/20'
              }`}
              data-testid="button-toggle-suggestions"
            >
              <p className={`text-xs font-semibold ${showSuggestions ? 'text-cyan-300' : 'text-muted-foreground'}`}>
                Quick Replies ({quickQuestions.length})
              </p>
              {showSuggestions ? (
                <ChevronUp className="w-4 h-4 text-cyan-300" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
            {showSuggestions && quickQuestions.length > 0 && (
              <div className="px-4 pb-4 pt-2 max-h-40 overflow-y-auto flex flex-wrap gap-2">
                {quickQuestions.map((question, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      console.log('[Chat] Quick question clicked:', question);
                      sendMessage(question);
                    }}
                    className="text-xs bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white border border-cyan-400/30 rounded-full px-4 py-2 hover-elevate active-elevate-2 transition-all shadow-lg shadow-cyan-500/20"
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
                onChange={(e) => {
                  setInputValue(e.target.value);
                  // CRITICAL FIX: Pause automated messages when user is typing
                  // Update last activity time so proactive messages don't interrupt
                  lastActivityTimeRef.current = Date.now();
                  lastUserMessageTimeRef.current = Date.now();
                }}
                placeholder="Type your message..."
                className="flex-1 bg-background border border-border rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                data-testid="input-chat-message"
              />
              <Button
                type="submit"
                size="icon"
                disabled={!inputValue.trim()}
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
