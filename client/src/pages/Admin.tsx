import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { BarChart3, Send, Users, UserCheck, TrendingUp, Mail, Eye, MousePointerClick, MessageSquare, DollarSign } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { usePageTracking } from "@/hooks/usePageTracking";

interface Analytics {
  totalUsers: number;
  usersWithTrial: number;
  usersWithSubscription: number;
  totalReferrers: number;
  totalReferralsSent: number;
  totalReferralsCompleted: number;
  totalVisits: number;
  trialConversionRate: number;
  signupToTrialRate: number;
  visitToSignupRate: number;
  visitToCheckoutRate: number;
}

interface SupportAnalytics {
  totalQueries: number;
  totalCost: number;
  queriesByEmail: Array<{
    email: string;
    count: number;
    totalCost: number;
  }>;
  overTime: Array<{
    date: string;
    count: number;
    avgCost: number;
  }>;
}

export default function Admin() {
  usePageTracking('admin');
  const { toast } = useToast();
  const [testEmail, setTestEmail] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [timerange, setTimerange] = useState("all");

  const { data: analytics, isLoading } = useQuery<Analytics>({
    queryKey: ['/api/admin/analytics', { timerange }],
  });

  const { data: supportAnalytics, isLoading: isLoadingSupportAnalytics } = useQuery<SupportAnalytics>({
    queryKey: ['/api/admin/support-analytics', { timerange, days: 30 }],
  });

  const sendTestEmailMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/test-email", {
        templateName: selectedTemplate,
        testEmail,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Test Email Sent",
        description: `Email sent to ${testEmail}`,
      });
      setTestEmail("");
      setSelectedTemplate("");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Send Test Email",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const emailTemplates = [
    { value: "firstLoginWelcome", label: "First Login Welcome" },
    { value: "welcome5min", label: "Post-Checkout Welcome (5min)" },
    { value: "installCheck45min", label: "Installation Check (45min)" },
    { value: "trialEnding6hr", label: "Trial Ending Warning (6hr)" },
    { value: "trialEnding1hr", label: "Trial Ending Final (1hr)" },
    { value: "drip1_2hr", label: "Drip Campaign #1 (2hr)" },
    { value: "drip2_6hr", label: "Drip Campaign #2 (6hr)" },
    { value: "drip3_11hr", label: "Drip Campaign #3 (11hr)" },
    { value: "drip4_16hr", label: "Drip Campaign #4 (16hr)" },
    { value: "drip5_21hr", label: "Drip Campaign #5 (21hr)" },
    { value: "referralInvitation", label: "Referral Invitation" },
    { value: "referralConfirmation", label: "Referral Confirmation" },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2" data-testid="heading-admin">Admin Dashboard</h1>
            <p className="text-muted-foreground">Platform analytics and email template testing</p>
          </div>

          <div className="w-full md:w-48">
            <Select value={timerange} onValueChange={setTimerange}>
              <SelectTrigger data-testid="select-timerange">
                <SelectValue placeholder="Select timeframe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="24h">Last 24 Hours</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="90d">Last 90 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card data-testid="card-total-visits">
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Visits</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-visits">{analytics?.totalVisits || 0}</div>
              <p className="text-xs text-muted-foreground">Page views tracked</p>
            </CardContent>
          </Card>

          <Card data-testid="card-total-users">
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Signups</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-users">{analytics?.totalUsers || 0}</div>
              <p className="text-xs text-muted-foreground">
                {analytics?.visitToSignupRate || 0}% conversion from visits
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-trial-users">
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Checkouts</CardTitle>
              <MousePointerClick className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-trial-users">{analytics?.usersWithTrial || 0}</div>
              <p className="text-xs text-muted-foreground">
                {analytics?.visitToCheckoutRate || 0}% conversion from visits
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-paid-subscribers">
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Paid Subscribers</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-paid-subscribers">{analytics?.usersWithSubscription || 0}</div>
              <p className="text-xs text-muted-foreground">
                {analytics?.trialConversionRate || 0}% conversion from trial
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-referrers">
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Referrers</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-referrers">{analytics?.totalReferrers || 0}</div>
              <p className="text-xs text-muted-foreground">
                {analytics?.totalReferralsSent || 0} invites sent
              </p>
            </CardContent>
          </Card>
        </div>

        <Card data-testid="card-referral-stats">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Referral Statistics
            </CardTitle>
            <CardDescription>Detailed referral program metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Sent</p>
                <p className="text-2xl font-bold" data-testid="text-referrals-sent">{analytics?.totalReferralsSent || 0}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold" data-testid="text-referrals-completed">{analytics?.totalReferralsCompleted || 0}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completion Rate</p>
                <p className="text-2xl font-bold" data-testid="text-referrals-rate">
                  {analytics?.totalReferralsSent
                    ? Math.round((analytics.totalReferralsCompleted / analytics.totalReferralsSent) * 100)
                    : 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Support Analytics Section */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card data-testid="card-support-queries">
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Support Queries</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-queries">{supportAnalytics?.totalQueries || 0}</div>
              <p className="text-xs text-muted-foreground">Total chat messages</p>
            </CardContent>
          </Card>

          <Card data-testid="card-support-cost">
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Support Cost</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-cost">${supportAnalytics?.totalCost.toFixed(4) || '0.0000'}</div>
              <p className="text-xs text-muted-foreground">Total OpenAI API cost</p>
            </CardContent>
          </Card>
        </div>

        <Card data-testid="card-support-leaderboard">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Support Query Leaderboard
            </CardTitle>
            <CardDescription>Most active users ranked by query count</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingSupportAnalytics ? (
              <p className="text-muted-foreground">Loading support data...</p>
            ) : supportAnalytics?.queriesByEmail && supportAnalytics.queriesByEmail.length > 0 ? (
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-4 pb-2 text-sm font-medium text-muted-foreground border-b">
                  <div>Email</div>
                  <div className="text-right">Queries</div>
                  <div className="text-right">Cost</div>
                </div>
                {supportAnalytics.queriesByEmail.map((row, idx) => (
                  <div key={idx} className="grid grid-cols-3 gap-4 py-2 border-b last:border-0" data-testid={`leaderboard-row-${idx}`}>
                    <div className="truncate" title={row.email}>{row.email}</div>
                    <div className="text-right font-medium">{row.count}</div>
                    <div className="text-right font-medium">${row.totalCost.toFixed(4)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No support queries yet</p>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-support-chart">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Support Queries Over Time
            </CardTitle>
            <CardDescription>Daily query volume and average cost per query</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingSupportAnalytics ? (
              <p className="text-muted-foreground">Loading chart data...</p>
            ) : supportAnalytics?.overTime && supportAnalytics.overTime.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={supportAnalytics.overTime}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return `${date.getMonth() + 1}/${date.getDate()}`;
                    }}
                  />
                  <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                  <Tooltip
                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                    formatter={(value: number, name: string) => {
                      if (name === 'avgCost') return [`$${value.toFixed(6)}`, 'Avg Cost'];
                      return [value, 'Queries'];
                    }}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="count"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    name="queries"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="avgCost"
                    stroke="#10b981"
                    strokeWidth={2}
                    name="avgCost"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground">No data available for chart</p>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-email-testing">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Email Template Testing
            </CardTitle>
            <CardDescription>Send test emails to verify templates and formatting</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="template-select" className="text-sm font-medium">
                Select Template
              </label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger id="template-select" data-testid="select-template">
                  <SelectValue placeholder="Choose an email template" />
                </SelectTrigger>
                <SelectContent>
                  {emailTemplates.map((template) => (
                    <SelectItem key={template.value} value={template.value} data-testid={`option-${template.value}`}>
                      {template.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label htmlFor="test-email" className="text-sm font-medium">
                Test Email Address
              </label>
              <Input
                id="test-email"
                type="email"
                placeholder="steve@lander.media"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                data-testid="input-test-email"
              />
            </div>

            <Button
              onClick={() => sendTestEmailMutation.mutate()}
              disabled={!selectedTemplate || !testEmail || sendTestEmailMutation.isPending}
              className="w-full"
              data-testid="button-send-test-email"
            >
              {sendTestEmailMutation.isPending ? "Sending..." : "Send Test Email"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
