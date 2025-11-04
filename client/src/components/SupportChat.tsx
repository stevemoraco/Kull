import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle, X, Send, Loader2, RotateCcw, History, Plus, ChevronDown, ChevronUp } from 'lucide-react';
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

// Helper to create placeholder welcome message (will be replaced by streamed greeting)
const createPlaceholderWelcomeMessage = (): Message => ({
  id: 'welcome-' + Date.now(),
  role: 'assistant',
  content: '__GENERATING_GREETING__', // Special marker for rendering
  timestamp: new Date(),
});

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
      // Create initial session with empty messages - greetings will be added via popover
      const initialSession: ChatSession = {
        id: 'main-session-' + Date.now().toString(),
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

  // Track current session ID
  const [currentSessionId, setCurrentSessionId] = useState<string>(() => {
    const stored = localStorage.getItem('kull-current-session-id');
    if (stored && sessions.find(s => s.id === stored)) {
      return stored;
    }
    return sessions[0]?.id || '';
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
      return updatedSessions;
    });
  };

  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [transcriptSent, setTranscriptSent] = useState(false);

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

  // Save current session ID to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('kull-current-session-id', currentSessionId);
  }, [currentSessionId]);

  // Save chat open state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('kull-chat-open', isOpen.toString());
  }, [isOpen]);

  // Define handleLinkClick early so it can be used in effects
  const handleLinkClick = (url: string) => {
    // Check if it's an internal link (starts with /)
    if (url.startsWith('/')) {
      // Check if it has a hash for scrolling
      if (url.includes('#')) {
        const [path, hash] = url.split('#');
        setLocation(path || '/');

        // Scroll to element after navigation
        setTimeout(() => {
          const element = document.getElementById(hash);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      } else {
        setLocation(url);
      }
      // Keep chat open for internal navigation
    } else {
      // External link - open in new tab
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  // Background greeting generation - runs every 30 seconds
  useEffect(() => {
    const generateBackgroundGreeting = async () => {
      try {
        const sessionContext = {
          userName: user?.firstName || null,
          userEmail: user?.email || null,
          isLoggedIn: !!user,
          currentPath: window.location.pathname,
          timeOnSite: Date.now() - (performance.timing?.navigationStart || Date.now()),
          scrollDepth: Math.round((window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100) || 0,
          visitedPages: sessionStorage.getItem('kull-visited-pages')?.split(',') || [window.location.pathname],
        };

        const response = await fetch('/api/chat/welcome', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ context: sessionContext }),
        });

        if (!response.ok) throw new Error('Failed to generate greeting');

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        if (!reader) throw new Error('No response stream');

        let fullContent = '';
        let cutoffDetected = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === 'delta' && data.content) {
                  if (cutoffDetected) continue;
                  fullContent += data.content;

                  // Check for cutoff
                  let cutoffIndex = fullContent.indexOf('␞');
                  if (cutoffIndex === -1) {
                    const followUpPattern = /\n\n?FOLLOW_UP_QUESTIONS:/;
                    const match = fullContent.match(followUpPattern);
                    if (match) cutoffIndex = match.index!;
                  }

                  if (cutoffIndex !== -1) {
                    cutoffDetected = true;
                    fullContent = fullContent.substring(0, cutoffIndex).trim();
                  }
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }

        if (fullContent) {
          if (!greetingGenerated) {
            // First generation: store for initial greeting
            setLatestGreeting(fullContent);
            setGreetingGenerated(true);

            // Show popover if chat is closed
            if (!isOpen) {
              setPopoverGreeting(fullContent);
              setShowGreetingPopover(true);

              // Auto-hide after 10 seconds
              setTimeout(() => {
                setShowGreetingPopover(false);
              }, 10000);
            }
          } else {
            // Subsequent generations
            const timeSinceLastUserMessage = Date.now() - lastUserMessageTimeRef.current;

            if (isOpen && timeSinceLastUserMessage > 20000 && messages.length > 0) {
              // Chat is open: add as new message to conversation
              const newMessage: Message = {
                id: 'context-' + Date.now(),
                role: 'assistant',
                content: fullContent,
                timestamp: new Date(),
              };

              setMessages(prev => [...prev, newMessage]);

              // Show toast notification
              const preview = fullContent.substring(0, 80) + (fullContent.length > 80 ? '...' : '');
              toast({
                title: 'New update from Kull',
                description: preview,
                duration: 5000,
              });

              // Navigate to first link in the update
              const linkMatch = fullContent.match(/\[([^\]]+)\]\(([^)]+)\)/);
              if (linkMatch) {
                handleLinkClick(linkMatch[2]);
              }
            } else if (!isOpen) {
              // Chat is closed: show popover instead
              setPopoverGreeting(fullContent);
              setShowGreetingPopover(true);

              // Auto-hide after 10 seconds
              setTimeout(() => {
                setShowGreetingPopover(false);
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
      if (greetingTimerRef.current) {
        clearInterval(greetingTimerRef.current);
      }
    };
  }, [user, toast, greetingGenerated, messages, handleLinkClick, setMessages, isOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

      // Navigate to first link in greeting
      const linkMatch = latestGreeting.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        handleLinkClick(linkMatch[2]);
      }
    }
  }, [isOpen, messages.length, latestGreeting, setMessages, handleLinkClick]);

      // Use pre-generated greeting if available
      if (latestGreeting) {
        setMessages(prev =>
          prev.map(msg =>
            msg.id === welcomeMessageId
              ? { ...msg, content: latestGreeting }
              : msg
          )
        );

        // Navigate to first link in greeting
        const linkMatch = latestGreeting.match(/\[([^\]]+)\]\(([^)]+)\)/);
        if (linkMatch) {
          handleLinkClick(linkMatch[2]);
        }
        return;
      }

      // Fallback: generate greeting if none available yet
      try {
        // Gather session context
        const sessionContext = {
          userName: user?.firstName || null,
          userEmail: user?.email || null,
          isLoggedIn: !!user,
          currentPath: window.location.pathname,
          timeOnSite: Date.now() - (performance.timing?.navigationStart || Date.now()), // milliseconds
          scrollDepth: Math.round((window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100) || 0,
          visitedPages: sessionStorage.getItem('kull-visited-pages')?.split(',') || [window.location.pathname],
        };

        const response = await fetch('/api/chat/welcome', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ context: sessionContext }),
        });

        if (!response.ok) {
          throw new Error('Failed to generate greeting');
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error('No response stream');
        }

        let fullContent = '';
        let cutoffDetected = false;
        let hasNavigated = false;

        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));

                if (data.type === 'delta' && data.content) {
                  if (cutoffDetected) continue;

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

                  // Look for cutoff markers
                  let cutoffIndex = -1;

                  // Try to find the Unicode marker ␞
                  cutoffIndex = fullContent.indexOf('␞');

                  // Fallback: look for FOLLOW_UP_QUESTIONS text
                  if (cutoffIndex === -1) {
                    const followUpPattern = /\n\n?FOLLOW_UP_QUESTIONS:/;
                    const match = fullContent.match(followUpPattern);
                    if (match) {
                      cutoffIndex = match.index!;
                    }
                  }

                  if (cutoffIndex !== -1) {
                    cutoffDetected = true;
                    const cleanContent = fullContent.substring(0, cutoffIndex).trim();
                    const questionsSection = fullContent.substring(cutoffIndex);

                    // Extract questions
                    const followUpMatch = questionsSection.match(/(?:␞\s*)?(?:\n\n?)?FOLLOW_UP_QUESTIONS:\s*(.+?)$/is);
                    if (followUpMatch) {
                      const questionsText = followUpMatch[1];
                      const newQuestions = questionsText
                        .split('|')
                        .map((q: string) => q.trim())
                        .filter((q: string) => q.length > 0 && q.length < 200);

                      if (newQuestions.length > 0) {
                        setQuickQuestions(prev => {
                          const combined = [...prev, ...newQuestions];
                          return combined.slice(-8);
                        });
                      }
                    }

                    setMessages(prev =>
                      prev.map(msg =>
                        msg.id === welcomeMessageId
                          ? { ...msg, content: cleanContent }
                          : msg
                      )
                    );
                    fullContent = cleanContent;

                    // Don't update the message anymore
                    continue;
                  }

                  // No cutoff yet, show all content
                  setMessages(prev =>
                    prev.map(msg =>
                      msg.id === welcomeMessageId
                        ? { ...msg, content: fullContent }
                        : msg
                    )
                  );
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }
      } catch (error) {
        console.error('Failed to generate welcome greeting:', error);
        // Fallback to simple greeting
        setMessages(prev =>
          prev.map(msg =>
            msg.id === welcomeMessageId
              ? { ...msg, content: "Hi! I'm here to help you with Kull. Ask me anything!" }
              : msg
          )
        );
      }
    };

    applyWelcomeGreeting();
  }, [currentSessionId, sessions, user, latestGreeting]);

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

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

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

                  // Extract follow-up questions - be more flexible with the pattern
                  const followUpMatch = questionsSection.match(/(?:␞\s*)?(?:\n\n?)?FOLLOW_UP_QUESTIONS:\s*(.+?)$/is);

                  if (followUpMatch) {
                    const questionsText = followUpMatch[1];
                    const newQuestions = questionsText
                      .split('|')
                      .map((q: string) => q.trim())
                      .filter((q: string) => q.length > 0 && q.length < 200);

                    console.log('[Chat] Extracted questions:', newQuestions);

                    if (newQuestions.length > 0) {
                      setQuickQuestions(prev => {
                        const combined = [...prev, ...newQuestions];
                        return combined.slice(-8);
                      });
                    }
                  }

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
      messages: [createPlaceholderWelcomeMessage()],
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
    // Replace current session with fresh one - force new ID to trigger greeting
    const newSessionId = Date.now().toString();

    setSessions(prevSessions => {
      const updated = prevSessions.map(session => {
        if (session.id === currentSessionId) {
          return {
            ...session,
            id: newSessionId, // New ID to force greeting regeneration
            title: 'New Chat',
            messages: [createPlaceholderWelcomeMessage()],
            updatedAt: new Date(),
          };
        }
        return session;
      });
      saveSessions(updated);
      return updated;
    });

    // Switch to new session ID to trigger greeting
    setCurrentSessionId(newSessionId);

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
          <Button
            onClick={() => {
              setIsOpen(true);
              setShowGreetingPopover(false); // Hide popover when opening chat
            }}
            className="fixed bottom-4 left-4 md:bottom-6 md:left-6 h-14 w-14 rounded-full shadow-lg hover-elevate z-[9999]"
            size="icon"
            data-testid="button-open-chat"
            style={{ position: 'fixed' }}
          >
            <MessageCircle className="w-6 h-6" />
          </Button>

          {/* Greeting Popover */}
          {showGreetingPopover && popoverGreeting && (
            <div
              className="fixed bottom-4 left-20 md:left-24 md:bottom-6 max-w-xs md:max-w-sm bg-card border border-border rounded-lg shadow-2xl p-4 z-[9999] animate-in slide-in-from-left-2 fade-in duration-300"
              style={{ position: 'fixed' }}
            >
              <button
                onClick={() => setShowGreetingPopover(false)}
                className="absolute top-2 right-2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="pr-6">
                <div className="flex items-start gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <MessageCircle className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">Kull Support</p>
                    <p className="text-xs text-muted-foreground">Just now</p>
                  </div>
                </div>
                <div className="text-sm text-foreground leading-relaxed">
                  {renderMarkdown(popoverGreeting, handleLinkClick)}
                </div>
                <button
                  onClick={() => {
                    setIsOpen(true);
                    setShowGreetingPopover(false);
                  }}
                  className="mt-3 text-xs text-purple-600 hover:text-purple-700 font-medium"
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
          className="fixed bottom-4 left-4 md:bottom-6 md:left-6 w-[calc(100vw-2rem)] md:w-96 h-[calc(100vh-2rem)] md:h-[600px] max-h-[600px] bg-card border border-card-border rounded-2xl shadow-2xl flex flex-col z-[9999] overflow-hidden"
          style={{ position: 'fixed' }}
        >
          {/* Header */}
          <div className="bg-primary px-4 py-3">
            {/* Title Row */}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-primary-foreground">Kull Support</h3>
                <p className="text-xs text-primary-foreground/80 leading-tight">Has access to entire github repo & website backend, can answer any sales, technical, or support question instantly.</p>
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
                Quick Questions ({quickQuestions.length})
              </p>
              {showSuggestions ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
            {showSuggestions && (
              <div className="px-4 pb-2 flex flex-wrap gap-2">
                {quickQuestions.map((question, idx) => (
                  <button
                    key={idx}
                    onClick={() => sendMessage(question)}
                    className="text-xs bg-background border border-border rounded-full px-3 py-1 hover-elevate active-elevate-2 text-foreground"
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
