import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, MapPin, Monitor, Globe, UserCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useLocation } from "wouter";

interface ChatUser {
  userKey: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  displayName: string;
  ipAddress?: string;
  isAnonymous: boolean;
  sessionCount: number;
  totalMessages: number;
  totalCost: string;
  avgCostPerMessage: string;
  avgTokensIn: number;
  avgTokensOut: number;
  avgCachedTokensIn: number;
  avgNewTokensIn: number;
  totalTokensIn: number;
  totalTokensOut: number;
  totalCachedTokensIn: number;
  totalNewTokensIn: number;
  cacheHitRate: number;
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
  const [, setLocation] = useLocation();
  const { data: users, isLoading } = useQuery<ChatUser[]>({
    queryKey: ['/api/admin/chat-users'],
    staleTime: 0, // Always fetch fresh data
  });

  if (isLoading) {
    return <div className="p-8">Loading users...</div>;
  }

  const totalSessions = users?.reduce((sum, u) => sum + u.sessionCount, 0) || 0;
  const totalMessages = users?.reduce((sum, u) => sum + u.totalMessages, 0) || 0;
  const totalCost = users?.reduce((sum, u) => sum + parseFloat(u.totalCost), 0) || 0;
  const avgCostPerMessage = totalMessages > 0
    ? (totalCost / totalMessages).toFixed(6)
    : '0.000000';

  // Calculate global token averages from totals (not average of averages)
  const globalTotalTokensIn = users?.reduce((sum, u) => sum + u.totalTokensIn, 0) || 0;
  const globalTotalTokensOut = users?.reduce((sum, u) => sum + u.totalTokensOut, 0) || 0;
  const globalTotalCachedTokensIn = users?.reduce((sum, u) => sum + u.totalCachedTokensIn, 0) || 0;
  const globalTotalNewTokensIn = globalTotalTokensIn - globalTotalCachedTokensIn;
  const globalCacheHitRate = globalTotalTokensIn > 0
    ? Math.round((globalTotalCachedTokensIn / globalTotalTokensIn) * 100)
    : 0;

  const avgTokensIn = totalMessages > 0
    ? Math.round(globalTotalTokensIn / totalMessages)
    : 0;
  const avgTokensOut = totalMessages > 0
    ? Math.round(globalTotalTokensOut / totalMessages)
    : 0;
  const avgCachedTokensIn = totalMessages > 0
    ? Math.round(globalTotalCachedTokensIn / totalMessages)
    : 0;
  const avgNewTokensIn = totalMessages > 0
    ? Math.round(globalTotalNewTokensIn / totalMessages)
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">User Activity Leaderboard</h2>
        <p className="text-muted-foreground">
          All users with conversations, messages, and costs - click to view full chat history
        </p>
      </div>

      {/* Cache Performance Summary */}
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📦 Prompt Cache Performance
          </CardTitle>
          <CardDescription>
            OpenAI prompt caching is reducing costs by caching static content (repo + instructions)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Cache Hit Rate</div>
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{globalCacheHitRate}%</div>
              <p className="text-xs text-muted-foreground mt-1">of input tokens served from cache</p>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Cached Tokens</div>
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                {globalTotalCachedTokensIn.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                avg {avgCachedTokensIn.toLocaleString()}/msg
              </p>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">New Tokens</div>
              <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                {globalTotalNewTokensIn.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                avg {avgNewTokensIn.toLocaleString()}/msg
              </p>
            </div>
          </div>
          <div className="pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              💰 <strong>Cost Savings:</strong> Cached tokens cost 90% less than new tokens, saving approximately{' '}
              <strong className="text-green-600 dark:text-green-400">
                ${((globalTotalCachedTokensIn / 1000000) * 0.0015 * 0.9).toFixed(2)}
              </strong>{' '}
              on this data set
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-5">
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
            <p className="text-xs text-muted-foreground">${avgCostPerMessage}/msg avg</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Tokens & Cache</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgTokensIn}↓ {avgTokensOut}↑</div>
            <p className="text-xs text-muted-foreground">
              📦 {avgCachedTokensIn} cached ({globalCacheHitRate}%) + {avgNewTokensIn} new
            </p>
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
                  <div className={`w-2 h-2 rounded-full ${user.isAnonymous ? 'bg-orange-500' : 'bg-green-500'}`} />
                  <div className="font-medium">
                    {user.isAnonymous ? (
                      <span className="text-foreground font-semibold">{user.displayName}</span>
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
                  {user.isAnonymous && user.ipAddress && <div className="text-xs">IP: {user.ipAddress}</div>}
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-1">
                      <span className="font-medium">{user.sessionCount}</span> sessions
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="font-medium">{user.totalMessages}</span> messages
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="font-medium">${user.totalCost}</span> (${user.avgCostPerMessage}/msg)
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="font-medium">{user.avgTokensIn}↓ {user.avgTokensOut}↑</span> tokens avg
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="font-medium">📦 {user.cacheHitRate}%</span> cache hit rate
                      <span className="text-muted-foreground">({user.avgCachedTokensIn} cached + {user.avgNewTokensIn} new)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      Last active {formatDistanceToNow(new Date(user.lastActivity), { addSuffix: true })}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                {user.userId && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setLocation(`/admin/user/${user.userId}`)}
                  >
                    <UserCircle className="h-4 w-4 mr-1" />
                    User Profile
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onUserClick(user.userKey, user.userEmail)}
                >
                  View Sessions →
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
