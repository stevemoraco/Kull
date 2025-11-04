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

// Helper to create default welcome message
const createWelcomeMessage = (): Message => ({
  id: '1',
  role: 'assistant',
  content: "Hi! I'm here to help you with Kull AI. Check out the [Dashboard](/dashboard) to download and get started, or ask me anything about installation, features, or how to use the app!",
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
      // Create initial session if none exist
      const initialSession: ChatSession = {
        id: Date.now().toString(),
        title: 'New Chat',
        messages: [createWelcomeMessage()],
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

  // Save current session ID to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('kull-current-session-id', currentSessionId);
  }, [currentSessionId]);

  // Save chat open state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('kull-chat-open', isOpen.toString());
  }, [isOpen]);

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

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

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
      content: '_Thinking..._',
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

                // Look for cutoff markers - be aggressive
                let cutoffIndex = fullContent.indexOf('␞');

                // Fallback: look for FOLLOW_UP_QUESTIONS (without requiring newline)
                if (cutoffIndex === -1) {
                  cutoffIndex = fullContent.indexOf('FOLLOW_UP_QUESTIONS:');
                }

                if (cutoffIndex !== -1) {
                  // Found cutoff! Set flag to stop processing further deltas
                  cutoffDetected = true;

                  // Extract clean content before cutoff
                  const cleanContent = fullContent.substring(0, cutoffIndex).trim();
                  const questionsSection = fullContent.substring(cutoffIndex);

                  // Extract follow-up questions
                  const followUpMatch = questionsSection.match(/(?:␞\s*)?FOLLOW_UP_QUESTIONS:\s*(.+?)(?:\n|$)/is);
                  if (followUpMatch) {
                    const newQuestions = followUpMatch[1]
                      .split('|')
                      .map((q: string) => q.trim())
                      .filter((q: string) => q.length > 0 && q.length < 200); // Sanity check

                    if (newQuestions.length > 0) {
                      setQuickQuestions(prev => {
                        const combined = [...prev, ...newQuestions];
                        return combined.slice(-8);
                      });
                    }
                  }

                  // Update message with clean content and stop
                  setMessages(prev =>
                    prev.map(msg =>
                      msg.id === assistantMessageId
                        ? { ...msg, content: cleanContent }
                        : msg
                    )
                  );
                  fullContent = cleanContent;
                } else {
                  // No cutoff yet, show all content
                  setMessages(prev =>
                    prev.map(msg =>
                      msg.id === assistantMessageId
                        ? { ...msg, content: fullContent }
                        : msg
                    )
                  );
                }
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
    "How do I install Kull AI?",
    "Which AI model is best?",
    "How does the rating system work?",
    "Can I cancel my trial?",
  ]);

  const [showSuggestions, setShowSuggestions] = useState(true);

  const handleNewSession = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [createWelcomeMessage()],
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
      "How do I install Kull AI?",
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
      "How do I install Kull AI?",
      "Which AI model is best?",
      "How does the rating system work?",
      "Can I cancel my trial?",
    ]);
  };

  const handleResetChat = () => {
    // Replace current session with fresh one
    setSessions(prevSessions => {
      const updated = prevSessions.map(session => {
        if (session.id === currentSessionId) {
          return {
            ...session,
            title: 'New Chat',
            messages: [createWelcomeMessage()],
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
      "How do I install Kull AI?",
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
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 left-4 md:bottom-6 md:left-6 h-14 w-14 rounded-full shadow-lg hover-elevate z-[9999]"
          size="icon"
          data-testid="button-open-chat"
          style={{ position: 'fixed' }}
        >
          <MessageCircle className="w-6 h-6" />
        </Button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div
          className="fixed bottom-4 left-4 md:bottom-6 md:left-6 w-[calc(100vw-2rem)] md:w-96 h-[calc(100vh-2rem)] md:h-[600px] max-h-[600px] bg-card border border-card-border rounded-2xl shadow-2xl flex flex-col z-[9999] overflow-hidden"
          style={{ position: 'fixed' }}
        >
          {/* Header */}
          <div className="bg-primary px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-bold text-primary-foreground">Kull Support</h3>
                <p className="text-xs text-primary-foreground/80">Has access to entire github repo & website backend, can answer any sales, technical, or support question instantly.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-primary-foreground hover:bg-primary-foreground/20 no-default-hover-elevate"
                    data-testid="button-chat-history"
                    title="Chat history"
                  >
                    <History className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
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
                size="icon"
                onClick={handleResetChat}
                className="text-primary-foreground hover:bg-primary-foreground/20 no-default-hover-elevate"
                data-testid="button-reset-chat"
                title="Reset chat"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="text-primary-foreground hover:bg-primary-foreground/20 no-default-hover-elevate"
                data-testid="button-close-chat"
              >
                <X className="w-5 h-5" />
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
                    {message.role === 'assistant'
                      ? renderMarkdown(message.content, handleLinkClick)
                      : <p className="whitespace-pre-wrap">{message.content}</p>
                    }
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

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl px-4 py-3 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Typing...</span>
                </div>
              </div>
            )}

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
