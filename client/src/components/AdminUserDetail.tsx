/**
 * Admin User Detail View
 *
 * Comprehensive single-user view showing everything about a user:
 * - Profile information
 * - Calculator values extracted from conversations
 * - Full chat history with script progress
 * - Activity timeline
 * - Engagement metrics
 */

import { useQuery } from '@tanstack/react-query';
import { useParams, useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  User,
  Mail,
  Calendar,
  MessageSquare,
  Activity,
  TrendingUp,
  Clock,
  DollarSign,
  Eye,
  Calculator,
  FileText,
  MapPin,
  Monitor,
  Zap,
  CheckCircle2,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface UserDetailData {
  user: {
    id: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    profileImageUrl: string | null;
    subscriptionTier: string | null;
    subscriptionStatus: string | null;
    trialStartedAt: Date | null;
    trialEndsAt: Date | null;
    trialConvertedAt: Date | null;
    specialOfferExpiresAt: Date | null;
    appInstalledAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  };
  chatSessions: Array<{
    id: string;
    title: string;
    messageCount: number;
    messages: any[];
    calculatorMentions: any[];
    createdAt: Date;
    updatedAt: Date;
    device: string | null;
    browser: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
  }>;
  supportQueries: any[];
  pageVisits: any[];
  activityTimeline: Array<{
    type: 'page_visit' | 'chat_session' | 'support_query';
    timestamp: Date;
    data: any;
  }>;
  calculatorValues: {
    shootsPerWeek: number | null;
    hoursPerShoot: number | null;
    billableRate: number | null;
    mentions: Array<{
      type: string;
      value: string;
      context: string;
      timestamp: Date;
    }>;
  };
  stats: {
    totalMessages: number;
    totalConversations: number;
    totalSupportCost: number;
    totalPageViews: number;
    engagementScore: number;
    firstActivity: Date;
    lastActivity: Date;
    daysSinceFirstActivity: number;
    daysSinceLastActivity: number;
  };
}

export default function AdminUserDetail() {
  const { userId } = useParams<{ userId: string }>();
  const [, setLocation] = useLocation();

  const { data, isLoading, error } = useQuery<UserDetailData>({
    queryKey: [`/api/admin/user/${userId}/details`],
    enabled: !!userId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" size="sm" onClick={() => setLocation('/admin')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Admin
            </Button>
          </div>
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
            <p className="mt-4 text-muted-foreground">Loading user details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" size="sm" onClick={() => setLocation('/admin')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Admin
            </Button>
          </div>
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive flex items-center gap-2">
                <XCircle className="h-5 w-5" />
                Error Loading User
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {error instanceof Error ? error.message : 'User not found'}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const getSubscriptionStatusColor = (status: string | null) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'trial':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'canceled':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'past_due':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getEngagementColor = (score: number) => {
    if (score >= 75) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getActivityTypeIcon = (type: string) => {
    switch (type) {
      case 'page_visit':
        return <Eye className="h-4 w-4" />;
      case 'chat_session':
        return <MessageSquare className="h-4 w-4" />;
      case 'support_query':
        return <FileText className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const calculatedSavings = data.calculatorValues.shootsPerWeek && data.calculatorValues.hoursPerShoot && data.calculatorValues.billableRate
    ? (data.calculatorValues.shootsPerWeek * data.calculatorValues.hoursPerShoot * data.calculatorValues.billableRate * 44)
    : null;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => setLocation('/admin')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Admin
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <User className="h-8 w-8" />
                {data.user.firstName || data.user.email || 'Unknown User'}
              </h1>
              <p className="text-muted-foreground mt-1">Complete user activity profile</p>
            </div>
          </div>
          <Badge className={`px-4 py-2 border-2 ${getSubscriptionStatusColor(data.user.subscriptionStatus)}`}>
            {data.user.subscriptionStatus?.toUpperCase() || 'NONE'}
          </Badge>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <StatCard
            icon={<TrendingUp className="h-5 w-5" />}
            label="Engagement"
            value={`${data.stats.engagementScore}%`}
            color={getEngagementColor(data.stats.engagementScore)}
          />
          <StatCard
            icon={<MessageSquare className="h-5 w-5" />}
            label="Conversations"
            value={data.stats.totalConversations.toString()}
            color="text-blue-600"
          />
          <StatCard
            icon={<FileText className="h-5 w-5" />}
            label="Messages"
            value={data.stats.totalMessages.toString()}
            color="text-purple-600"
          />
          <StatCard
            icon={<Eye className="h-5 w-5" />}
            label="Page Views"
            value={data.stats.totalPageViews.toString()}
            color="text-indigo-600"
          />
          <StatCard
            icon={<DollarSign className="h-5 w-5" />}
            label="Support Cost"
            value={`$${data.stats.totalSupportCost.toFixed(4)}`}
            color="text-green-600"
          />
          <StatCard
            icon={<Clock className="h-5 w-5" />}
            label="Last Active"
            value={`${data.stats.daysSinceLastActivity}d ago`}
            color="text-orange-600"
          />
        </div>

        {/* User Profile & Calculator Values */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Profile Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                User Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <InfoRow icon={<Mail />} label="Email" value={data.user.email || 'N/A'} />
              <InfoRow
                icon={<User />}
                label="Name"
                value={`${data.user.firstName || ''} ${data.user.lastName || ''}`.trim() || 'N/A'}
              />
              <InfoRow
                icon={<Calendar />}
                label="Joined"
                value={format(new Date(data.user.createdAt), 'PPP')}
              />
              <InfoRow
                icon={<Zap />}
                label="Subscription Tier"
                value={data.user.subscriptionTier || 'None'}
              />
              {data.user.trialStartedAt && (
                <InfoRow
                  icon={<Clock />}
                  label="Trial Started"
                  value={format(new Date(data.user.trialStartedAt), 'PPP')}
                />
              )}
              {data.user.appInstalledAt && (
                <InfoRow
                  icon={<CheckCircle2 />}
                  label="App Installed"
                  value={format(new Date(data.user.appInstalledAt), 'PPP')}
                />
              )}
            </CardContent>
          </Card>

          {/* Calculator Values */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Detected Calculator Values
              </CardTitle>
              <CardDescription>Extracted from conversation context</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-2xl font-bold text-primary">
                    {data.calculatorValues.shootsPerWeek || '-'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Shoots/Week</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-2xl font-bold text-primary">
                    {data.calculatorValues.hoursPerShoot || '-'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Hours/Shoot</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-2xl font-bold text-primary">
                    ${data.calculatorValues.billableRate || '-'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Hourly Rate</p>
                </div>
              </div>

              {calculatedSavings && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm font-medium text-green-800">Estimated Annual Value</p>
                  <p className="text-3xl font-bold text-green-600 mt-1">
                    ${calculatedSavings.toLocaleString()}
                  </p>
                  <p className="text-xs text-green-600 mt-1">Based on detected values</p>
                </div>
              )}

              {data.calculatorValues.mentions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Value Mentions:</p>
                  <ScrollArea className="h-32">
                    {data.calculatorValues.mentions.map((mention, idx) => (
                      <div key={idx} className="text-xs p-2 bg-muted rounded mb-2">
                        <Badge variant="outline" className="mb-1">{mention.type}</Badge>
                        <p className="text-muted-foreground truncate">{mention.context}</p>
                      </div>
                    ))}
                  </ScrollArea>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Conversation History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Conversation History ({data.chatSessions.length})
            </CardTitle>
            <CardDescription>All chat sessions with message counts and metadata</CardDescription>
          </CardHeader>
          <CardContent>
            {data.chatSessions.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No conversations yet</p>
            ) : (
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {data.chatSessions.map((session) => (
                    <Card key={session.id} className="border-2">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-base">{session.title}</CardTitle>
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <MessageSquare className="h-3 w-3" />
                                {session.messageCount} messages
                              </span>
                              {session.device && (
                                <span className="flex items-center gap-1">
                                  <Monitor className="h-3 w-3" />
                                  {session.device}
                                </span>
                              )}
                              {session.city && session.state && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {session.city}, {session.state}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right text-xs text-muted-foreground">
                            <p>{format(new Date(session.createdAt), 'PPP')}</p>
                            <p className="mt-1">{formatDistanceToNow(new Date(session.updatedAt), { addSuffix: true })}</p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-48">
                          <div className="space-y-2">
                            {session.messages.map((msg: any, idx: number) => (
                              <div
                                key={idx}
                                className={`p-2 rounded text-sm ${
                                  msg.role === 'user'
                                    ? 'bg-primary/10 ml-8'
                                    : 'bg-muted mr-8'
                                }`}
                              >
                                <p className="font-medium text-xs mb-1">
                                  {msg.role === 'user' ? 'User' : 'Assistant'}
                                </p>
                                <p className="text-xs line-clamp-2">{msg.content}</p>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Activity Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Activity Timeline
            </CardTitle>
            <CardDescription>Chronological view of all user actions</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              <div className="space-y-2">
                {data.activityTimeline.map((activity, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted transition-colors">
                    <div className="mt-1">{getActivityTypeIcon(activity.type)}</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm capitalize">
                          {activity.type.replace('_', ' ')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(activity.timestamp), 'PPp')}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {activity.type === 'page_visit' && `Visited: ${activity.data.page}`}
                        {activity.type === 'chat_session' && `Started: ${activity.data.title}`}
                        {activity.type === 'support_query' && `Asked: ${activity.data.message?.substring(0, 50)}...`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className={color}>{icon}</div>
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={`text-lg font-bold ${color}`}>{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-muted-foreground">{icon}</div>
      <div className="flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}
