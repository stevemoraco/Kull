import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Copy, DollarSign, Clock, User, Bot } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import ReactMarkdown from "react-markdown";
import { useState, useMemo, useEffect } from "react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useToast } from "@/hooks/use-toast";
import type { AdminSessionUpdateData } from "@shared/types/sync";

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  tokensIn?: number;
  tokensOut?: number;
  cachedTokensIn?: number;
  newTokensIn?: number;
  cacheHitRate?: number;
  cost?: string;
  model?: string;
  fullPrompt?: string;
  userMessage?: string;
}

interface SessionDetail {
  id: string;
  title: string;
  userId?: string;
  userEmail?: string;
  ipAddress?: string;
  device?: string;
  browser?: string;
  city?: string;
  state?: string;
  country?: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
  totalCost: string;
}

interface SessionDetailViewProps {
  sessionId: string;
  onBack: () => void;
}

export function SessionDetailView({ sessionId, onBack }: SessionDetailViewProps) {
  const [expandedPromptIndex, setExpandedPromptIndex] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: session, isLoading } = useQuery<SessionDetail>({
    queryKey: [`/api/admin/chat-sessions/${sessionId}`],
  });

  // WebSocket handlers for live updates
  const wsHandlers = useMemo(() => ({
    onAdminSessionUpdate: (data: AdminSessionUpdateData) => {
      // Only refetch if this update is for the currently viewed session
      if (data.sessionId === sessionId) {
        console.log('[SessionDetailView] Received update for current session, refetching...');
        queryClient.invalidateQueries({
          queryKey: [`/api/admin/chat-sessions/${sessionId}`]
        });

        // Show toast notification
        toast({
          title: "New message received",
          description: data.userEmail ? `From ${data.userEmail}` : "Session updated",
          duration: 3000,
        });
      }
    }
  }), [sessionId, queryClient, toast]);

  // Connect to WebSocket with handlers
  const { isConnected } = useWebSocket(wsHandlers);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (isLoading) {
    return <div className="p-8">Loading conversation...</div>;
  }

  if (!session) {
    return <div className="p-8">Session not found</div>;
  }

  const totalMessages = session.messages.length;
  const userMessages = session.messages.filter(m => m.role === 'user').length;
  const assistantMessages = session.messages.filter(m => m.role === 'assistant').length;

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" onClick={onBack} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Sessions
        </Button>
        <h2 className="text-3xl font-bold tracking-tight">{session.title}</h2>
        <p className="text-muted-foreground">
          {session.userEmail || 'Anonymous User'} • {formatDistanceToNow(new Date(session.createdAt), { addSuffix: true })}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMessages}</div>
            <p className="text-xs text-muted-foreground">
              {userMessages} user, {assistantMessages} AI
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${session.totalCost}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Location</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              {[session.city, session.state, session.country].filter(Boolean).join(', ') || 'Unknown'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Platform</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              {session.browser} on {session.device}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Full Conversation</CardTitle>
          <CardDescription>
            Complete message history with prompts and costs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {session.messages.map((message, index) => (
            <div
              key={index}
              className={`space-y-3 ${message.role === 'assistant' ? 'bg-muted/30 p-4 rounded-lg' : ''}`}
            >
              <div className="flex items-center gap-2">
                {message.role === 'user' ? (
                  <User className="h-4 w-4" />
                ) : (
                  <Bot className="h-4 w-4" />
                )}
                <span className="font-semibold capitalize">{message.role}</span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
                </span>
                {message.cost && (
                  <>
                    <Badge variant="outline" className="ml-auto">
                      ${message.cost}
                    </Badge>
                    {message.tokensIn && message.tokensOut && (
                      <span className="text-xs text-muted-foreground">
                        {message.cachedTokensIn && message.cachedTokensIn > 0 ? (
                          <>
                            📦 {message.cachedTokensIn.toLocaleString()} cached ({message.cacheHitRate}%) +{' '}
                            {message.newTokensIn?.toLocaleString() || 0} new ↓ | {message.tokensOut.toLocaleString()} ↑
                          </>
                        ) : (
                          <>{message.tokensIn.toLocaleString()}↓ {message.tokensOut.toLocaleString()}↑</>
                        )}
                      </span>
                    )}
                    {message.model && (
                      <span className="text-xs text-muted-foreground font-mono">
                        {message.model}
                      </span>
                    )}
                  </>
                )}
              </div>

              <div className="prose prose-sm max-w-none">
                {message.role === 'user' ? (
                  <p className="whitespace-pre-wrap">{message.content}</p>
                ) : (
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                )}
              </div>

              {message.fullPrompt && (
                <div className="border-t pt-3 mt-3">
                  <div className="flex items-center justify-between mb-2">
                    <button
                      onClick={() => setExpandedPromptIndex(expandedPromptIndex === index ? null : index)}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      {expandedPromptIndex === index ? 'Hide' : 'Show'} Full Prompt (for debugging)
                    </button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(message.fullPrompt || '')}
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copy Prompt
                    </Button>
                  </div>
                  {expandedPromptIndex === index && (
                    <div className="bg-slate-950 text-slate-50 p-4 rounded text-xs font-mono overflow-x-auto max-h-96 overflow-y-auto">
                      <pre className="whitespace-pre-wrap break-words">{message.fullPrompt}</pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
