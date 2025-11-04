import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, MapPin, Monitor, Globe } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ChatUser {
  userKey: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  ipAddress?: string;
  isAnonymous: boolean;
  sessionCount: number;
  totalMessages: number;
  totalCost: string;
  lastActivity: string;
  location: {
    city?: string;
    state?: string;
    country?: string;
  };
  device?: string;
  browser?: string;
}

interface ChatUsersViewProps {
  onUserClick: (userKey: string, userEmail?: string) => void;
}

export function ChatUsersView({ onUserClick }: ChatUsersViewProps) {
  const { data: users, isLoading } = useQuery<ChatUser[]>({
    queryKey: ['/api/admin/chat-users'],
  });

  if (isLoading) {
    return <div className="p-8">Loading users...</div>;
  }

  const totalSessions = users?.reduce((sum, u) => sum + u.sessionCount, 0) || 0;
  const totalMessages = users?.reduce((sum, u) => sum + u.totalMessages, 0) || 0;
  const totalCost = users?.reduce((sum, u) => sum + parseFloat(u.totalCost), 0) || 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">All Chat Histories</h2>
        <p className="text-muted-foreground">
          View every user who has chatted with the support AI
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSessions}</div>
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
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalCost.toFixed(4)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>
            Showing {users?.length || 0} users with chat history
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {users?.map((user) => (
            <div
              key={user.userKey}
              className="flex items-start justify-between border-b pb-4 last:border-0"
            >
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${user.isAnonymous ? 'bg-red-500' : 'bg-green-500'}`} />
                  <div className="font-medium">
                    {user.isAnonymous ? (
                      <span className="text-muted-foreground">Anonymous User</span>
                    ) : (
                      <div>
                        {user.userName && <div className="font-semibold">{user.userName}</div>}
                        <div className={user.userName ? 'text-sm text-muted-foreground' : ''}>{user.userEmail}</div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  {user.userId && <div className="text-xs">ID: {user.userId.slice(0, 12)}...</div>}
                  {user.ipAddress && <div>IP: {user.ipAddress}</div>}
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-1">
                      <span className="font-medium">{user.sessionCount}</span> sessions
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="font-medium">{user.totalMessages}</span> messages
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="font-medium">${user.totalCost}</span> cost
                    </div>
                    <div className="flex items-center gap-1">
                      Last active {formatDistanceToNow(new Date(user.lastActivity), { addSuffix: true })}
                    </div>
                  </div>
                  {(user.location.city || user.location.country) && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      <span>
                        {[user.location.city, user.location.state, user.location.country]
                          .filter(Boolean)
                          .join(', ')}
                      </span>
                    </div>
                  )}
                  {user.device && (
                    <div className="flex items-center gap-1">
                      <Monitor className="h-3 w-3" />
                      <span>{user.browser} on {user.device}</span>
                    </div>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onUserClick(user.userKey, user.userEmail)}
              >
                View All Sessions →
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
