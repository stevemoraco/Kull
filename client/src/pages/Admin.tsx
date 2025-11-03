import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { BarChart3, Send, Users, UserCheck, TrendingUp, Mail } from "lucide-react";

interface Analytics {
  totalUsers: number;
  usersWithTrial: number;
  usersWithSubscription: number;
  totalReferrers: number;
  totalReferralsSent: number;
  totalReferralsCompleted: number;
  trialConversionRate: number;
  signupToTrialRate: number;
}

export default function Admin() {
  const { toast } = useToast();
  const [testEmail, setTestEmail] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");

  const { data: analytics, isLoading } = useQuery<Analytics>({
    queryKey: ['/api/admin/analytics'],
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
        <div>
          <h1 className="text-3xl font-bold mb-2" data-testid="heading-admin">Admin Dashboard</h1>
          <p className="text-muted-foreground">Platform analytics and email template testing</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card data-testid="card-total-users">
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-users">{analytics?.totalUsers || 0}</div>
              <p className="text-xs text-muted-foreground">All signups</p>
            </CardContent>
          </Card>

          <Card data-testid="card-trial-users">
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Trial Users</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-trial-users">{analytics?.usersWithTrial || 0}</div>
              <p className="text-xs text-muted-foreground">
                {analytics?.signupToTrialRate || 0}% conversion from signup
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
