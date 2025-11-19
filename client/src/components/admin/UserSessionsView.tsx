import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageSquare, Clock, DollarSign } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ChatSession {
  id: string;
  title: string;
  userId?: string;
  userEmail?: string;
  ipAddress?: string;
  messageCount: number;
  userMessageCount: number;
  assistantMessageCount: number;
  durationMinutes: number;
  totalCost: string;
  scriptStep?: number;
  device?: string;
  browser?: string;
  city?: string;
  state?: string;
  country?: string;
  createdAt: string;
  updatedAt: string;
  firstMessage?: string;
}

interface UserSessionsViewProps {
  userKey: string;
  userEmail?: string;
  onBack: () => void;
  onSessionClick: (sessionId: string) => void;
}

export function UserSessionsView({ userKey, userEmail, onBack, onSessionClick }: UserSessionsViewProps) {
  const { data: sessions, isLoading } = useQuery<ChatSession[]>({
    queryKey: [`/api/admin/chat-users/${userKey}/sessions`],
  });

  if (isLoading) {
    return <div className="p-8">Loading sessions...</div>;
  }

  const totalMessages = sessions?.reduce((sum, s) => sum + s.messageCount, 0) || 0;
  const totalCost = sessions?.reduce((sum, s) => sum + parseFloat(s.totalCost), 0) || 0;
  const totalDuration = sessions?.reduce((sum, s) => sum + s.durationMinutes, 0) || 0;

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" onClick={onBack} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to All Users
        </Button>
        <h2 className="text-3xl font-bold tracking-tight">
          Chat Sessions{userEmail && ` for ${userEmail}`}
        </h2>
        <p className="text-muted-foreground">
          All conversations from this user
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sessions?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMessages}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalCost.toFixed(4)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDuration}m</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sessions</CardTitle>
          <CardDescription>
            Showing {sessions?.length || 0} conversations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sessions?.map((session) => (
            <div
              key={session.id}
              className="flex items-start justify-between border-b pb-4 last:border-0"
            >
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-3">
                  <div className="font-medium">{session.title}</div>
                  {session.scriptStep && (
                    <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      Step {session.scriptStep}/15
                    </div>
                  )}
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  {session.firstMessage && (
                    <div className="italic">"{session.firstMessage}..."</div>
                  )}
                  <div className="flex items-center gap-4 flex-wrap">
                    <div>
                      <span className="font-medium">{session.messageCount}</span> messages
                    </div>
                    <div>
                      <span className="font-medium">${session.totalCost}</span> cost
                    </div>
                    <div>
                      <span className="font-medium">{session.durationMinutes}</span>m duration
                    </div>
                    <div>
                      {formatDistanceToNow(new Date(session.createdAt), { addSuffix: true })}
                    </div>
                  </div>
                  {(session.city || session.country) && (
                    <div className="text-xs">
                      {[session.city, session.state, session.country].filter(Boolean).join(', ')} • {session.browser} on {session.device}
                    </div>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSessionClick(session.id)}
              >
                View Messages →
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
