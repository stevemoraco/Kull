import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CalculatorProvider } from "@/contexts/CalculatorContext";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useToast } from "@/hooks/use-toast";
import { SupportChat } from "@/components/SupportChat";
import { hasPaidAccess, getAccessDenialReason } from "@/lib/accessControl";
import type { User } from "@shared/schema";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Home from "@/pages/Home";
import Checkout from "@/pages/Checkout";
import Dashboard from "@/pages/Dashboard";
import Admin from "@/pages/Admin";
import Credits from "@/pages/Credits";
import Privacy from "@/pages/Privacy";
import Terms from "@/pages/Terms";
import Refunds from "@/pages/Refunds";
import Support from "@/pages/Support";
import Contact from "@/pages/Contact";
import About from "@/pages/About";
import Download from "@/pages/Download";
import ShootProgress from "@/pages/ShootProgress";
import Marketplace from "@/pages/Marketplace";
import PromptDetail from "@/pages/PromptDetail";
import MyPrompts from "@/pages/MyPrompts";
import DeviceAuth from "@/pages/DeviceAuth";
import DeviceSessions from "@/pages/DeviceSessions";
import Reports from "@/pages/Reports";
import ReportDetail from "@/pages/ReportDetail";
import SharedReport from "@/pages/SharedReport";
import BatchJobs from "@/pages/BatchJobs";
import AdminUserDetail from "@/components/AdminUserDetail";
import AdminDashboard from "@/pages/AdminDashboard";

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const typedUser = user as User;
  const isAdmin = user?.email === 'steve@lander.media';
  const hasAccess = hasPaidAccess(typedUser);
  const { toast } = useToast();

  // Global WebSocket sync integration
  useWebSocket({
    onCreditUpdate: (data) => {
      console.log('[App] Credit update received:', data);
      // Refetch user balance
      queryClient.invalidateQueries({ queryKey: ['/api/credits/balance'] });

      // Show notification
      toast({
        title: data.change > 0 ? 'Credits Added' : 'Credits Used',
        description: `${data.change > 0 ? '+' : ''}${data.change} credits. New balance: ${data.newBalance}`,
      });
    },
    onPromptChange: (data) => {
      console.log('[App] Prompt change received:', data);
      // Refetch marketplace prompts
      queryClient.invalidateQueries({ queryKey: ['/api/prompts'] });
    },
    onDeviceConnected: (data) => {
      console.log('[App] Device connected:', data.deviceId);
      toast({
        title: 'Device Connected',
        description: `${data.deviceName || 'A device'} connected to your account`,
      });
    },
    onDeviceDisconnected: (data) => {
      console.log('[App] Device disconnected:', data.deviceId);
    },
  });

  // Debug logging
  console.log('[Router] Auth state:', {
    isAuthenticated,
    isLoading,
    userEmail: user?.email,
    isAdmin
  });

  return (
    <Switch>
      {/* Public pages accessible to all */}
      <Route path="/landing" component={Landing} />
      <Route path="/features" component={Landing} /> {/* Redirect /features to /landing */}
      <Route path="/about" component={About} />
      <Route path="/pricing" component={Dashboard} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/terms" component={Terms} />
      <Route path="/refunds" component={Refunds} />
      <Route path="/support" component={Support} />
      <Route path="/contact" component={Contact} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/checkout" component={Checkout} />
      <Route path="/download" component={Download} />

      {/* Marketplace routes - require paid access */}
      <Route path="/marketplace">
        {() => {
          if (isLoading) {
            return <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading...</p>
              </div>
            </div>;
          }
          if (!isAuthenticated) {
            window.location.href = '/landing';
            return null;
          }
          if (!hasAccess) {
            return <div className="min-h-screen flex items-center justify-center">
              <div className="text-center max-w-md mx-auto p-8">
                <h1 className="text-2xl font-bold mb-4">Paid Feature</h1>
                <p className="text-muted-foreground mb-6">{getAccessDenialReason(typedUser)}</p>
                <a href="/dashboard" className="inline-block px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
                  View Plans
                </a>
              </div>
            </div>;
          }
          return <Marketplace />;
        }}
      </Route>
      <Route path="/marketplace/:id">
        {(params) => {
          if (isLoading) {
            return <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading...</p>
              </div>
            </div>;
          }
          if (!isAuthenticated) {
            window.location.href = '/landing';
            return null;
          }
          if (!hasAccess) {
            return <div className="min-h-screen flex items-center justify-center">
              <div className="text-center max-w-md mx-auto p-8">
                <h1 className="text-2xl font-bold mb-4">Paid Feature</h1>
                <p className="text-muted-foreground mb-6">{getAccessDenialReason(typedUser)}</p>
                <a href="/dashboard" className="inline-block px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
                  View Plans
                </a>
              </div>
            </div>;
          }
          return <PromptDetail />;
        }}
      </Route>
      <Route path="/my-prompts">
        {() => {
          if (isLoading) {
            return <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading...</p>
              </div>
            </div>;
          }
          if (!isAuthenticated) {
            window.location.href = '/landing';
            return null;
          }
          if (!hasAccess) {
            return <div className="min-h-screen flex items-center justify-center">
              <div className="text-center max-w-md mx-auto p-8">
                <h1 className="text-2xl font-bold mb-4">Paid Feature</h1>
                <p className="text-muted-foreground mb-6">{getAccessDenialReason(typedUser)}</p>
                <a href="/dashboard" className="inline-block px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
                  View Plans
                </a>
              </div>
            </div>;
          }
          return <MyPrompts />;
        }}
      </Route>

      {/* Shoot progress page - require paid access */}
      <Route path="/shoots/:shootId">
        {() => {
          if (isLoading) {
            return <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading...</p>
              </div>
            </div>;
          }
          if (!isAuthenticated) {
            window.location.href = '/landing';
            return null;
          }
          if (!hasAccess) {
            return <div className="min-h-screen flex items-center justify-center">
              <div className="text-center max-w-md mx-auto p-8">
                <h1 className="text-2xl font-bold mb-4">Paid Feature</h1>
                <p className="text-muted-foreground mb-6">{getAccessDenialReason(typedUser)}</p>
                <a href="/dashboard" className="inline-block px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
                  View Plans
                </a>
              </div>
            </div>;
          }
          return <ShootProgress />;
        }}
      </Route>

      {/* Device authentication routes - accessible to all authenticated users */}
      {/* Device linking should work without paid access - payment checks happen at photo processing time */}
      <Route path="/device-auth" component={DeviceAuth} />
      <Route path="/settings/devices">
        {() => {
          if (isLoading) {
            return <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading...</p>
              </div>
            </div>;
          }
          if (!isAuthenticated) {
            window.location.href = '/landing';
            return null;
          }
          if (!hasAccess) {
            return <div className="min-h-screen flex items-center justify-center">
              <div className="text-center max-w-md mx-auto p-8">
                <h1 className="text-2xl font-bold mb-4">Paid Feature</h1>
                <p className="text-muted-foreground mb-6">{getAccessDenialReason(typedUser)}</p>
                <a href="/dashboard" className="inline-block px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
                  View Plans
                </a>
              </div>
            </div>;
          }
          return <DeviceSessions />;
        }}
      </Route>

      {/* Report routes - require paid access (except shared reports) */}
      <Route path="/reports/shared/:token" component={SharedReport} />
      <Route path="/reports/:id">
        {() => {
          if (isLoading) {
            return <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading...</p>
              </div>
            </div>;
          }
          if (!isAuthenticated) {
            window.location.href = '/landing';
            return null;
          }
          if (!hasAccess) {
            return <div className="min-h-screen flex items-center justify-center">
              <div className="text-center max-w-md mx-auto p-8">
                <h1 className="text-2xl font-bold mb-4">Paid Feature</h1>
                <p className="text-muted-foreground mb-6">{getAccessDenialReason(typedUser)}</p>
                <a href="/dashboard" className="inline-block px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
                  View Plans
                </a>
              </div>
            </div>;
          }
          return <ReportDetail />;
        }}
      </Route>
      <Route path="/reports">
        {() => {
          if (isLoading) {
            return <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading...</p>
              </div>
            </div>;
          }
          if (!isAuthenticated) {
            window.location.href = '/landing';
            return null;
          }
          if (!hasAccess) {
            return <div className="min-h-screen flex items-center justify-center">
              <div className="text-center max-w-md mx-auto p-8">
                <h1 className="text-2xl font-bold mb-4">Paid Feature</h1>
                <p className="text-muted-foreground mb-6">{getAccessDenialReason(typedUser)}</p>
                <a href="/dashboard" className="inline-block px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
                  View Plans
                </a>
              </div>
            </div>;
          }
          return <Reports />;
        }}
      </Route>

      {/* Credits page - require paid access */}
      <Route path="/credits">
        {() => {
          if (isLoading) {
            return <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading...</p>
              </div>
            </div>;
          }
          if (!isAuthenticated) {
            window.location.href = '/landing';
            return null;
          }
          if (!hasAccess) {
            return <div className="min-h-screen flex items-center justify-center">
              <div className="text-center max-w-md mx-auto p-8">
                <h1 className="text-2xl font-bold mb-4">Paid Feature</h1>
                <p className="text-muted-foreground mb-6">{getAccessDenialReason(typedUser)}</p>
                <a href="/dashboard" className="inline-block px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
                  View Plans
                </a>
              </div>
            </div>;
          }
          return <Credits />;
        }}
      </Route>

      {/* Batch Jobs page - require paid access */}
      <Route path="/batch-jobs">
        {() => {
          if (isLoading) {
            return <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading...</p>
              </div>
            </div>;
          }
          if (!isAuthenticated) {
            window.location.href = '/landing';
            return null;
          }
          if (!hasAccess) {
            return <div className="min-h-screen flex items-center justify-center">
              <div className="text-center max-w-md mx-auto p-8">
                <h1 className="text-2xl font-bold mb-4">Paid Feature</h1>
                <p className="text-muted-foreground mb-6">{getAccessDenialReason(typedUser)}</p>
                <a href="/dashboard" className="inline-block px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
                  View Plans
                </a>
              </div>
            </div>;
          }
          return <BatchJobs />;
        }}
      </Route>

      {/* Admin page - only for steve@lander.media */}
      {/* Render unconditionally but check auth inside the route */}
      <Route path="/admin">
        {() => {
          console.log('[Router] /admin route matched, checking admin access');
          console.log('[Router] isLoading:', isLoading, 'isAuthenticated:', isAuthenticated, 'user:', user);

          // Show loading state while auth is being checked
          if (isLoading) {
            console.log('[Router] Auth still loading, showing spinner');
            return <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading...</p>
              </div>
            </div>;
          }

          if (!isAuthenticated) {
            console.log('[Router] Not authenticated, redirecting to landing');
            window.location.href = '/landing';
            return null;
          }
          if (!isAdmin) {
            console.log('[Router] Not admin user (email:', user?.email, '), access denied');
            return <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
                <p className="text-muted-foreground">Admin access required</p>
                <p className="text-sm text-muted-foreground mt-2">Current user: {user?.email}</p>
                <p className="text-xs text-muted-foreground mt-1">Required: steve@lander.media</p>
              </div>
            </div>;
          }
          console.log('[Router] Admin access granted');
          return <Admin />;
        }}
      </Route>

      {/* Admin User Detail - only for steve@lander.media */}
      <Route path="/admin/user/:userId">
        {(params) => {
          if (isLoading) {
            return <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading...</p>
              </div>
            </div>;
          }

          if (!isAuthenticated || !isAdmin) {
            window.location.href = '/landing';
            return null;
          }

          return <AdminUserDetail />;
        }}
      </Route>

      {/* Admin Dashboard (Provider Health) - only for steve@lander.media */}
      <Route path="/admin/dashboard">
        {() => {
          if (isLoading) {
            return <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading...</p>
              </div>
            </div>;
          }

          if (!isAuthenticated || !isAdmin) {
            window.location.href = '/landing';
            return null;
          }

          return <AdminDashboard />;
        }}
      </Route>

      {/* Auth-conditional pages */}
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <Route path="/" component={Home} />
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <CalculatorProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
          <SupportChat />
        </TooltipProvider>
      </CalculatorProvider>
    </QueryClientProvider>
  );
}

export default App;
