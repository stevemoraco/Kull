import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle, X, Send, Loader2, RotateCcw } from 'lucide-react';
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

export function SupportChat() {
  // Persist chat open state
  const [isOpen, setIsOpen] = useState(() => {
    const stored = localStorage.getItem('kull-chat-open');
    return stored === 'true';
  });

  // Load messages from localStorage on mount
  const [messages, setMessages] = useState<Message[]>(() => {
    const stored = localStorage.getItem('kull-chat-messages');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Convert timestamp strings back to Date objects
        return parsed.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }));
      } catch (e) {
        console.error('Failed to parse stored messages:', e);
      }
    }
    // Default welcome message
    return [
      {
        id: '1',
        role: 'assistant',
        content: "Hi! I'm here to help you with Kull AI. Check out the [Dashboard](/dashboard) to download and get started, or ask me anything about installation, features, or how to use the app!",
        timestamp: new Date(),
      },
    ];
  });

  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('kull-chat-messages', JSON.stringify(messages));
  }, [messages]);

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

    try {
      const response = await apiRequest('POST', '/api/chat/message', {
        message: messageText.trim(),
        history: messages.slice(-5), // Send last 5 messages for context
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();

      // Parse follow-up questions if present (format: FOLLOW_UP_QUESTIONS: question1 | question2 | question3 | question4)
      let messageContent = data.message;
      const followUpMatch = data.message.match(/FOLLOW_UP_QUESTIONS:\s*([^\n]+)/i);
      if (followUpMatch) {
        const newQuestions = followUpMatch[1].split('|').map((q: string) => q.trim()).filter((q: string) => q.length > 0);
        if (newQuestions.length > 0) {
          setQuickQuestions(prev => [...prev, ...newQuestions]);
        }
        // Remove the follow-up questions marker from the displayed message
        messageContent = messageContent.replace(/FOLLOW_UP_QUESTIONS:\s*[^\n]+/gi, '').trim();
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: messageContent,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Auto-navigate to first link in response
      const linkMatch = messageContent.match(/\[([^\]]+)\]\(([^)]+)\)/);
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

  const handleResetChat = () => {
    // Clear messages
    const defaultMessage: Message = {
      id: '1',
      role: 'assistant',
      content: "Hi! I'm here to help you with Kull AI. Check out the [Dashboard](/dashboard) to download and get started, or ask me anything about installation, features, or how to use the app!",
      timestamp: new Date(),
    };
    setMessages([defaultMessage]);

    // Reset quick questions to defaults
    setQuickQuestions([
      "How do I install Kull AI?",
      "Which AI model is best?",
      "How does the rating system work?",
      "Can I cancel my trial?",
    ]);

    // Clear localStorage
    localStorage.setItem('kull-chat-messages', JSON.stringify([defaultMessage]));

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
                <h3 className="font-bold text-primary-foreground">Kull AI Support</h3>
                <p className="text-xs text-primary-foreground/80">Usually responds instantly</p>
              </div>
            </div>
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

          {/* Quick Questions (always visible) */}
          <div className="px-4 py-2 border-t border-border bg-muted/30">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Quick Questions:</p>
            <div className="flex flex-wrap gap-2">
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
